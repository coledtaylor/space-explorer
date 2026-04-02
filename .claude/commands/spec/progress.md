---
name: spec:progress
description: Show spec progress across phases and tasks under `.project/features/NNNN/`. Use to see what's done, what's blocked, and the next actionable task.
argument-hint: [feature-id]
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - SlashCommand
---

<objective>
Display a clear, scannable overview of spec implementation progress showing all phases, tasks, and completion status.

Provide instant visibility into:
- What phases exist for a feature
- Which tasks are complete vs pending vs blocked
- Overall progress percentage
- Next actionable task
</objective>


<process>

<step name="locate">
**Locate feature directory:**

```
IF argument provided as 4-digit feature ID (e.g., "0001"):
    target = .project/features/{argument}/
ELSE:
    target = .project/features/{highest-numbered-directory}/
```

**Validation:**

1. Verify `.project/features/` directory exists
2. Verify target feature directory exists
3. Verify `phases/` subdirectory exists

If any validation fails:

```
PROGRESS: Cannot Display
================================================================

Error: [specific missing item]

Required structure:
  .project/
    features/
      NNNN/
        ROADMAP.md
        phases/
          phase-N/
            PLAN.md

Run `/new-feature` to create a feature specification.
================================================================
```

Exit.
</step>

<step name="scan">
**Scan all phases:**

Use Glob to find all `PLAN.md` files: `.project/features/*/phases/*/PLAN.md`

**Discovery Process:**

1. List all `phase-*` directories under the feature
2. Sort numerically (phase-1, phase-2, phase-3, ...)
3. Read each `PLAN.md` file

**Extract Phase Metadata:**

For each phase, extract from PLAN.md header:
- Phase number and name (from `# Phase N: [Name]`)
- Status line (from `> Status: [status]`)
</step>

<step name="parse">
**Parse tasks:**

Scan each PLAN.md for task entries:

```
- [ ] **[TASK-N.X]** [Title]     → Pending
- [x] **[TASK-N.X]** [Title]     → Complete
```

Also detect:
- `Blocked by:` field for blocked status
- `Estimate:` field for sizing (S/M/L)

**Task States:**

| Checkbox | Blocked By | Status |
|----------|------------|--------|
| `[ ]` | None | Pending |
| `[ ]` | Has incomplete blockers | Blocked |
| `[x]` | Any | Complete |

**Task Counting Patterns:**

Use Grep for portability:

- Completed tasks regex: `^\s*- \[x\] \*\*\[TASK-`
- Pending tasks regex: `^\s*- \[ \] \*\*\[TASK-`

Count matches from the Grep results (rather than shell `grep -c`).
</step>

<step name="calculate">
**Calculate progress:**

**Metrics to Compute:**

| Metric | Calculation |
|--------|-------------|
| Total Tasks | Count all task entries |
| Completed | Count `[x]` checkboxes |
| Pending | Count `[ ]` with no blockers |
| Blocked | Count `[ ]` with incomplete blockers |
| Progress % | (Completed / Total) * 100 |

**Phase-Level Metrics:**

For each phase:
- Task count
- Completion count
- Phase status (Not Started / In Progress / Complete)
</step>

<step name="report">
**Present status report:**

```
SPEC PROGRESS
================================================================

Feature: NNNN - [Feature Name]
Updated: YYYY-MM-DD HH:MM

================================================================
OVERALL PROGRESS
================================================================

[##########..........] 50% Complete

| Metric     | Count |
|------------|-------|
| Total      | 20    |
| Complete   | 10    |
| Pending    | 6     |
| Blocked    | 4     |

================================================================
PHASE BREAKDOWN
================================================================

PHASE 1: [Phase Name]                              [COMPLETE]
------------------------------------------------------------------
  [x] TASK-1.1  Create user model
  [x] TASK-1.2  Add repository interface
  [x] TASK-1.3  Implement repository
  [x] TASK-1.4  Write unit tests

PHASE 2: [Phase Name]                            [IN PROGRESS]
------------------------------------------------------------------
  [x] TASK-2.1  Create API controller
  [x] TASK-2.2  Add endpoint routing
  [ ] TASK-2.3  Implement validation          <- NEXT
  [ ] TASK-2.4  Add error handling               [blocked by 2.3]

PHASE 3: [Phase Name]                            [NOT STARTED]
------------------------------------------------------------------
  [ ] TASK-3.1  Build UI component               [blocked by 2.4]
  [ ] TASK-3.2  Add state management             [blocked by 3.1]
  [ ] TASK-3.3  Connect to API                   [blocked by 3.2]
  [ ] TASK-3.4  Write integration tests          [blocked by 3.3]

================================================================
NEXT ACTION
================================================================

Next Task: TASK-2.3 - Implement validation
Run: /execute-task TASK-2.3

================================================================
```

**Progress Bar Generation:**

Use ASCII progress bar with 20 segments:

```
0%   [....................]
25%  [#####...............]
50%  [##########..........]
75%  [###############.....]
100% [####################]
```

**Status Badges:**

| Status | Badge |
|--------|-------|
| Complete | `[COMPLETE]` |
| In Progress | `[IN PROGRESS]` |
| Not Started | `[NOT STARTED]` |
| Blocked | `[BLOCKED]` |

**Task Line Format:**

```
Complete:   [x] TASK-N.X  [Title]
Pending:    [ ] TASK-N.X  [Title]          <- NEXT (if first unblocked)
Blocked:    [ ] TASK-N.X  [Title]             [blocked by N.Y]
```
</step>

<step name="route">
**Determine next action:**

**Next Task Detection:**

Find first unblocked pending task:
1. Scan phases in order (phase-1, phase-2, ...)
2. In each phase, find first `- [ ] **[TASK-`
3. Check if task has `Blocked by:` field
4. If blocked, check if blockers are complete
5. First unblocked pending task is "NEXT"

**Route based on status:**

| Condition | Meaning | Action |
|-----------|---------|--------|
| Pending tasks exist | Work to do | Show next task with `/execute-task` |
| All tasks complete | Phase done | Celebrate and suggest review |
| All blocked | Dependency issue | Highlight blockers |

---

**Route A: Tasks pending**

```
---

## ▶ Next Up

**TASK-N.X: [Task Title]** — [task description]

`/execute-task TASK-N.X`

---
```

---

**Route B: All complete**

```
---

## 🎉 All Tasks Complete

All {N} tasks finished!

Feature implementation finished.
Ready for review and deployment.

---
```

---

**Route C: All blocked**

```
---

## ⚠ All Tasks Blocked

No executable tasks available.
Review blockers and resolve dependencies.

---
```

</step>

<step name="edge_cases">
**Handle edge cases:**

| Scenario | Output |
|----------|--------|
| No features directory | "No features found. Run `/new-feature` first." |
| Feature not found | "Feature {NNNN} not found. Available: {list}" |
| No phases directory | "Feature {NNNN} has no phases. Run `/plan` first." |
| No PLAN.md files | "No plan files found. Run `/plan {NNNN}` to create them." |
| All tasks complete | Show 100% with celebration message |
</step>

<step name="compact_output">
**For quick status checks, support a compact view:**

```
PROGRESS: 0001 - [Feature Name]
=================================
Phase 1: [####] 4/4 COMPLETE
Phase 2: [##..] 2/4 IN PROGRESS  <- Current
Phase 3: [....] 0/4 NOT STARTED
=================================
Total: 50% (10/20 tasks)
Next: TASK-2.3
```
</step>

</process>


<success_criteria>

- [ ] Feature directory located and validated
- [ ] All phases scanned with accurate task counts
- [ ] Progress percentage calculated correctly
- [ ] Blocked tasks clearly identified with blockers shown
- [ ] Next actionable task highlighted with `<- NEXT`
- [ ] Visual progress bar reflects completion percentage
- [ ] Smart routing to appropriate next command
- [ ] Clear error messages for missing structure

</success_criteria>


<related_commands>

| Command | Relationship |
|---------|--------------|
| `/execute-task` | Shows what to execute next |
| `/execute-phase` | Shows phase-level status |
| `/plan` | Prerequisite for having tasks to track |

**When to invoke progress:**
- Before starting work (orientation)
- After completing tasks (verification)
- When reporting to stakeholders (summary)

</related_commands>


<critical_rules>

1. **ALWAYS show all phases** — Even empty/future phases provide context
2. **CLEARLY mark blocked tasks** — Users need to know what's stuck
3. **HIGHLIGHT next action** — Make it obvious what to do next
4. **USE consistent formatting** — Scannable output is key
5. **INCLUDE percentages** — Quick mental model of progress
6. **SORT by phase order** — Logical flow of implementation

</critical_rules>
