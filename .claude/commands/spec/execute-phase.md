---
description: Execute all tasks in a feature phase using sequence-based parallel execution
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
argument-hint: "<phase-number> [--commit] [--gaps-only] [--no-verify]"
---

<objective>
Execute all tasks in a feature phase using sequence-based parallel execution.

**State-driven execution:** Read STATE.md to determine current position instead of scanning task files. STATE.md is the single source of truth for progress, decisions, and blockers.

Orchestrator stays lean: read state, load plan, spawn subagents per sequence, update state, collect results. Each subagent loads fresh context and handles its own task execution.

Context budget: ~15% orchestrator, 100% fresh per subagent.
</objective>

<execution_context>
@CLAUDE.md
@.project/features/{NNNN}/STATE.md (primary - determines current position)
@.project/codebase/STACK.md (only if needed)
</execution_context>

<context>
Phase: $ARGUMENTS

**Flags:**
- `--commit` — Create git commits for each task (default: no commits)
- `--gaps-only` — Execute only incomplete tasks that were previously blocked or failed
- `--no-verify` — Skip goal verification after execution (verification enabled by default)

@.project/features/{NNNN}/STATE.md
@.project/codebase/STACK.md
</context>

<model_assignments>
## Agent Model Assignments

Fixed model assignments for spawned agents:

| Agent          | Model  |
|----------------|--------|
| phase-executor | sonnet |
| task-verifier  | haiku  |
</model_assignments>

<prerequisites>
## Prerequisites Check

1. **Verify `.project/codebase/` exists**
   ```bash
   ls .project/codebase/ 2>/dev/null
   ```
   - If missing: "Run `/spec:new-project` first to create codebase reference files."
   - Stop execution if missing

2. **Verify `.project/features/` exists**
   ```bash
   ls .project/features/ 2>/dev/null
   ```
   - If missing: "Run `/spec:new-feature` first to create a feature specification."
   - Stop execution if missing
</prerequisites>

<process>
## Execution Process

### 1. Read Feature State

Read STATE.md to determine current position. Extract: Current Phase, Phase Status, Last Completed Task, Blockers, Decisions. If phase already complete, skip to next incomplete phase or report feature complete.

### 2. Resolve Target Phase

Parse `$ARGUMENTS`: If "NNNN:N" pattern, extract feature_id and phase_num. If single number, use STATE.md feature + provided phase. If empty, use STATE.md current feature and phase.

Parse flags: `--commit` sets commit_enabled=true, `--gaps-only` filters incomplete tasks, `--no-verify` skips verification.

### 3. Load Phase Plan

Read PLAN.md for target phase. Extract: Tasks (from `### Task N:` headers), Sequence assignments (from task definitions or inferred from dependencies), Files, Verification steps.

### 4. Detect Phase Complexity

Count tasks and unique files from PLAN.md. If tasks <= 3 AND files < 5: simple mode (single executor, inline verify). Otherwise: complex mode (parallel executors, dedicated verifier).

**Report to user:**
```
Phase complexity: {simple/complex}
- Tasks: {TASK_COUNT}
- Files: {FILE_COUNT}
- Execution: {single-executor/parallel}
- Verification: {inline/dedicated-verifier}
```

Store `phase_mode` variable for routing in steps 5 and 8.

### 5. Group by Sequence

Use pre-assigned sequences from PLAN.md if available. Otherwise, compute from dependencies (Sequence 1: no blockers, Sequence 2: depends on Sequence 1, etc.). Report sequence structure to user.

### 6. Execute Sequences

**Execution mode depends on phase complexity detected in step 4.**

#### Simple Phases (single-executor mode)

For simple phases (tasks <= 3 AND files < 5): Spawn ONE executor with all tasks, pass `inline_verify: true`, wait for completion, update STATE.md, skip separate verifier.

#### Complex Phases (parallel mode)

For complex phases (tasks > 2 OR files >= 3): Spawn `phase-executor` for each task in sequence (parallel), wait for completion, update STATE.md, proceed to next sequence, spawn separate verifier after all tasks complete (step 9).

### 7. Update STATE.md

Parse executor returns (terse pipe-delimited format: `DONE|BLOCKED|FAILED | TASK-N.X | {file_count} files | {blocker/error}`).

Update STATE.md tables: Current Status (phase, status, last completed, blocker), Phase Progress (all phases with status/dates), Task Progress (task, status, sequence, duration). Track timestamps and durations.

### 8. Mark Phase Complete

When all tasks complete: Update STATE.md phase status to `✅ Complete`, record completion timestamp, commit STATE.md with phase metadata.

### 9. Verify Phase Goal (unless --no-verify)

**Verification is conditional on phase complexity and flags.**

**Skip verification if:**
- `--no-verify` flag is set, OR
- Phase mode is "simple" (inline verification was already done in step 6)

**Run dedicated verifier if:**
- `--no-verify` flag NOT set, AND
- Phase mode is "complex"

#### 9a. Simple Phase Verification

Verification was performed inline. Display "Phase verification: ✓ INLINE" and continue to step 10.

#### 9b. Complex Phase Verification

Spawn task-verifier to verify phase goal achievement.

Build verifier prompt with feature ID, phase number, phase goal (from ROADMAP.md), PLAN.md content, and STATE.md content. Instruct to verify goal achievement using goal-backward methodology.

Spawn: `Task(prompt=verifier_prompt, subagent_type="task-verifier", model="haiku", description="Verify Phase {N} goal achievement")`

Handle return: If passed, proceed. If gaps found, record in STATE.md and route to gap closure (Route C).

### 10. Offer Next Steps

Route based on execution and verification status (see `<offer_next>`).

**Note on discoveries:** Auto-fix bugs, security/correctness gaps, and blocking issues immediately. Only architectural changes require user approval.
</process>

<sequence_execution>
## Sequence-Based Parallel Execution

**Pass file paths to executors.** Each executor reads the files it needs. Do not inline file contents into prompts.

All tasks in a sequence run in parallel. Task tool blocks until all complete.

**No polling.** No background agents. No loops checking status.
</sequence_execution>

<task_delegation>
## Task Delegation Format

When delegating to `phase-executor` subagent, include:

- Task ID, title, and full description from PLAN.md
- Target files (from task's Files field)
- Files to read: PLAN.md, STATE.md, STACK.md, CONVENTIONS.md (if creating new files)
- Inline verify flag (true for simple phases, false for complex)
- Commit enabled flag
- Constraints: stay within scope, report blockers, log decisions
</task_delegation>

<failure_handling>
## Handle Failures

When task fails: Log in STATE.md Blockers & Issues table, do NOT retry automatically (2-attempt rule), mark dependent tasks as blocked, continue with independent tasks, report summary.

Update STATE.md: Add blocker to Blockers & Issues, mark task as ❌ Failed in Task Progress, mark dependent tasks as ⏸️ Blocked.
</failure_handling>

<offer_next>
## Route Based on Status

Output this markdown directly (not as a code block). Route based on execution and verification status:

| Execution Status | Verification Status    | Route                       |
|------------------|------------------------|-----------------------------|
| all tasks done   | `passed` + more phases | Route A (next phase)        |
| all tasks done   | `passed` + last phase  | Route B (feature complete)  |
| all tasks done   | `gaps_found`           | Route C (verification gaps) |
| tasks failed     | N/A                    | Route D (recovery options)  |

---

**Route A: Phase complete and verified, more phases remain**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► PHASE {N} COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature {NNNN} - Phase {N}: {Name}
{X} tasks executed | Goal verification: ✓ PASSED

## ▶ Next Up

Phase {N+1}: {Name} — {Description from ROADMAP}

/spec:execute-phase {N+1}
```

---

**Route B: Phase complete, feature finished**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► FEATURE COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature {NNNN}: {Feature Name}
{N} phases completed | All goals verified ✓

## ▶ Next Up

/spec:complete-feature {NNNN}
```

---

**Route C: Verification gaps found — goal not fully achieved**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► PHASE {N} VERIFICATION GAPS ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase {N}: {Name}
Tasks: {X}/{Y} complete | Goal verification: ⚠ GAPS FOUND
Score: {N}/{M} must-haves verified

Report: .project/features/{NNNN}/phases/phase-{N}/VERIFICATION.md

Gaps Blocking Goal Achievement:
{List gaps from VERIFICATION.md}

## ▶ Next Up

/spec:execute-phase {N} --gaps-only
```

---

**Route D: Execution failure — recovery options**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► EXECUTION PAUSED ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Failed Task: [TASK-N.X] [Title]

Error: {Error message}

Impact:
- Blocked tasks: {list}
- Remaining independent tasks: {list}

Options:
A) Fix manually and re-run `/spec:execute-phase`
B) Skip and continue with independent tasks
C) Abort phase and review STATE.md

Progress: {X} of {Y} tasks complete
```

</offer_next>


<commit_rules>
## Commit Guidelines

Commits only created when `--commit` flag passed.

**Per-Task:** Stage modified files, commit with `{type}({phase}-{task}): {task-name}` (types: feat, fix, test, refactor, perf, chore), record hash in STATE.md.

**Phase Completion:** Stage STATE.md and PLAN.md, commit with `docs({phase}): complete {phase-name} phase`.

**NEVER use `git add .` or `git add -A`.** Always stage files individually.

When commit NOT enabled: Skip all git operations; changes remain uncommitted.
</commit_rules>

<error_reference>
## Error Handling Reference

| Scenario                 | Action                                                                           |
|--------------------------|----------------------------------------------------------------------------------|
| STATE.md not found       | "Feature STATE.md not found. Run `/spec:new-feature` first."                     |
| PLAN.md not found        | "Phase {N} not planned. Run `/spec:plan {feature_id}` first."                    |
| Phase already complete   | "Phase {N} is already complete. Try `/spec:execute-phase {N+1}` for next phase." |
| All phases complete      | "All phases complete for feature {NNNN}. Run `/spec:complete-feature`."          |
| Agent not available      | Fall back to generic Task execution                                              |
| Build fails after task   | Mark task failed in STATE.md, continue with independent tasks                    |
| Circular dependency      | Report: "Circular dependency detected: TASK-X -> TASK-Y -> TASK-X"               |
| Task has unknown blocker | Report: "Unknown blocking task {ID}. Check PLAN.md for typos."                   |
</error_reference>

<success_criteria>
- [ ] All incomplete tasks in phase executed
- [ ] Each task marked complete in STATE.md Task Progress table
- [ ] Phase status updated in STATE.md Phase Progress table
- [ ] Performance metrics recorded (duration per task)
- [ ] Decisions logged in STATE.md Decisions Log
- [ ] Phase goal verified (inline for simple phases, dedicated verifier for complex phases, unless --no-verify)
- [ ] VERIFICATION.md created with findings (complex phases only, unless --no-verify)
- [ ] Files committed per commit rules (if --commit flag passed)
- [ ] User informed of next steps
</success_criteria>

Begin execution now. Start by reading STATE.md to determine current position.

