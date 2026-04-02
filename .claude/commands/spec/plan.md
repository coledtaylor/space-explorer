---
description: Break down a feature's ROADMAP.md phases into detailed PLAN.md files by spawning planner agents
allowed-tools: Read, Write, Bash, Glob, Grep, Task
argument-hint: "[feature-id] [--force] [--phase N] [--no-review]"
---

<objective>
Transform high-level phases from a feature's ROADMAP.md into detailed, executable PLAN.md files.

**Orchestrator role:** Parse arguments, validate feature, extract phases from ROADMAP.md, spawn one planner agent per phase, collect results, present summary.

**Why subagents:** Planning burns context fast. Each phase gets a fresh planner agent with full context budget. Orchestrator maintains state between agents.

**One agent per phase:** The planner agent creates ONE PLAN.md. This command spawns N planner agents for N phases.
</objective>

<context>
Feature ID: $ARGUMENTS (optional - auto-detects highest-numbered feature if not provided)

**Flags:**
- `--force` — Overwrite existing PLAN.md files
- `--phase N` — Plan only phase N (skip others)
- `--no-review` — Skip plan review with user (review enabled by default)

**Project structure:**
- Features live in `.project/features/NNNN/`
- Each feature has a `ROADMAP.md` with phases
- Plans are written to `.project/features/NNNN/phases/phase-N/PLAN.md`
</context>

<process>

## 1. Validate Environment

```bash
ls .project/codebase/ 2>/dev/null
```

**If `.project/codebase/` not found:** Error - "Run `/spec:new-project` first to create codebase reference files."

**If `.project/features/` not found:** Error - "Run `/spec:new-feature` first to create a feature specification."

## 2. Parse Arguments

Extract from $ARGUMENTS:
- Feature ID (4-digit number like "0001")
- `--force` flag to overwrite existing plans
- `--phase N` flag to plan single phase
- `--no-review` flag to skip plan review (review enabled by default)

**If no feature ID:** Detect highest-numbered feature directory.

```bash
ls -1 .project/features/ | sort -r | head -1
```

## 3. Validate Feature

```bash
ls .project/features/${FEATURE_ID}/ROADMAP.md 2>/dev/null
```

**If not found:** Error with available features list.

**If found:** Read ROADMAP.md to extract feature name and phases.

## 4. Extract Phases from ROADMAP.md

Read the target feature's ROADMAP.md.

**Phase detection patterns:**
- `### Phase 1: [Name]`
- `### Phase 2: [Name]`
- `## Phase N - [Name]`
- `## Step N: [Name]`

**For each phase, extract:**

| Field           | Source                          |
|-----------------|---------------------------------|
| Phase Number    | Numeric identifier (1, 2, 3...) |
| Phase Name      | Title after colon/dash          |
| Description     | Content under phase heading     |
| Mentioned Files | File paths referenced           |
| Dependencies    | Other phases this depends on    |

Store phases in memory for orchestration loop.

## 5. Check Existing Plans

```bash
ls .project/features/${FEATURE_ID}/phases/phase-*/PLAN.md 2>/dev/null
```

**If plans exist AND `--force` NOT set:**
- Display: `Existing plans found. Use --force to regenerate.`
- List existing plan files
- Offer: 1) Add missing phases only, 2) Force regenerate all, 3) Abort

## 6. Create Directory Structure

```bash
mkdir -p .project/features/${FEATURE_ID}/phases/phase-1
mkdir -p .project/features/${FEATURE_ID}/phases/phase-2
# ... for each phase
```

## 7. Read Context Files

Read and store minimal context for planner agent prompts. Large context files (STACK.md, STRUCTURE.md, CONVENTIONS.md) will be passed as paths for planners to read themselves.

```bash
# Core context for prompt construction
ROADMAP_CONTENT=$(cat .project/features/${FEATURE_ID}/ROADMAP.md)

# Feature context if exists
STATE_CONTENT=$(cat .project/features/${FEATURE_ID}/STATE.md 2>/dev/null)
```

## 8. Parallel Planning Execution

Spawn all planner agents in parallel (one per phase, or one if `--phase N` specified).

### 8a. Build All Planner Prompts

For each phase to be planned, construct a prompt referencing context file paths:

```markdown
<planning_context>
Feature: {feature_id} - {feature_name}
Phase: {phase_number} - {phase_name}
Phase Description: {phase_description_from_roadmap}

Technology Stack: Read from `.project/codebase/STACK.md`
Project Structure: Read from `.project/codebase/STRUCTURE.md`
Code Conventions: Read from `.project/codebase/CONVENTIONS.md` (if exists)
Full Roadmap: {roadmap_content}
Feature State: {state_content}
</planning_context>

<output_requirements>
Write PLAN.md to: .project/features/{feature_id}/phases/phase-{N}/PLAN.md

Include: Objective, Must-haves (goal-backward), 2-3 tasks max (15-30 min each), Each task has <files>, <action>, <verify>, <done>, Dependency graph with sequences, Verification checklist

Use the Write tool to create PLAN.md.
</output_requirements>

<constraints>
Plan ONE phase only | Stay under 50% context budget | Specific tasks (no clarification needed) | Exact file paths
</constraints>
```

Store all prompts in memory for batch spawning.

### 8b. Display Progress Banner

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PLANNING ► SPAWNING {N} PLANNER AGENTS IN PARALLEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Phase 1: {Phase Name}
◆ Phase 2: {Phase Name}
◆ Phase 3: {Phase Name}
...

Planners are independent and will run simultaneously.
```

### 8c. Spawn All Planner Agents in Parallel

Execute a single batch of parallel Task calls:

```
[
  Task(
    prompt=planner_prompt_phase_1,
    subagent_type="planner",
    model="opus",
    description="Plan Phase 1: {Phase Name}"
  ),
  Task(
    prompt=planner_prompt_phase_2,
    subagent_type="planner",
    model="opus",
    description="Plan Phase 2: {Phase Name}"
  ),
  Task(
    prompt=planner_prompt_phase_3,
    subagent_type="planner",
    model="opus",
    description="Plan Phase 3: {Phase Name}"
  ),
  ...
]
```

**All planners execute concurrently.** Each reads ROADMAP.md and writes its own phase's PLAN.md. No planner depends on another planner's output.

### 8d. Collect Results

After all planners complete, collect results for each phase. On success: store "PLAN.md created". On error: store error details for summary.

### 8e. Display Per-Phase Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PLANNING RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Phase 1: {Phase Name} — PLAN.md created
✓ Phase 2: {Phase Name} — PLAN.md created
✗ Phase 3: {Phase Name} — Error: {error message}
```

**If any phase failed:**
- Offer: 1) Retry failed phases, 2) Continue with successful phases, 3) Abort

## 9. Plan Review (unless --no-review)

**If `--no-review` flag NOT set (default behavior):**

Spawn plan-verifier agent to review plans with user. Verifier summarizes what will change, highlights high-impact modifications, and confirms user is ready.

**Verifier prompt:** Include feature ID, feature name, phases planned count, and PLAN.md content for each phase. Instruct to review and confirm.

**Spawn:** `Task(prompt=verifier_prompt, subagent_type="plan-verifier", model="haiku", description="Review plans for Feature {NNNN}")`

**Handle return:** If confirmed: proceed. If aborted: note preference. If questions pending: wait.

**If `--no-review` flag IS set:** Skip review, proceed to final status.

## 10. Present Final Status

After all phases planned (and reviewed if applicable), display summary.

</process>

<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PLANNING COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature: {NNNN} - {Feature Name}
Phases Planned: {N}

| Phase | Name   | Tasks | Status    |
|-------|--------|-------|-----------|
| 1     | {Name} | {N}   | ✓ Planned |
| 2     | {Name} | {N}   | ✓ Planned |
| 3     | {Name} | {N}   | ✓ Planned |

Files Created:
- .project/features/{NNNN}/phases/phase-1/PLAN.md
- .project/features/{NNNN}/phases/phase-2/PLAN.md
- .project/features/{NNNN}/phases/phase-3/PLAN.md

## ▶ Next Up

/spec:execute-phase {NNNN}:1

</offer_next>

<error_handling>

| Scenario                     | Action                                                                            |
|------------------------------|-----------------------------------------------------------------------------------|
| `.project/codebase/` missing | "Run `/spec:new-project` first to create codebase reference files."              |
| `.project/features/` missing | "Run `/spec:new-feature` first to create a feature specification."               |
| Feature ID not found         | "Feature {arg} not found. Available: {list}."                                     |
| ROADMAP.md missing           | "Feature {NNNN} has no ROADMAP.md. Create one with `/spec:new-feature`."         |
| No phases detected           | "Could not detect phases in ROADMAP.md. Ensure `### Phase N: Name` format."      |
| Plans exist (no --force)     | "Plans already exist. Use `--force` to regenerate or `--phase N` for specific."  |
| Planner agent fails          | Log error, offer retry/skip/abort                                                 |

</error_handling>

<success_criteria>
- [ ] `.project/codebase/` validated
- [ ] `.project/features/` validated  
- [ ] Feature ID resolved (argument or auto-detect)
- [ ] ROADMAP.md found and parsed
- [ ] Phases extracted from roadmap
- [ ] Phase directories created
- [ ] Planner agent spawned for each phase
- [ ] PLAN.md created for each phase
- [ ] Plan review completed with user (unless --no-review)
- [ ] User sees progress between agent spawns
- [ ] Summary displayed with next steps
</success_criteria>
