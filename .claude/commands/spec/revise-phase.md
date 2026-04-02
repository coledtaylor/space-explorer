---
description: Revise a phase's PLAN.md with additional feedback
allowed-tools: Read, Write, Glob, Grep, Bash, Task
argument-hint: "[NNNN:N] [revision feedback]"
---

<objective>

Revise an existing phase's PLAN.md based on user feedback. Re-spawns the `phase-planner` agent with the existing plan context plus revision instructions.

**Updates:**
- `.project/features/NNNN/phases/phase-N/PLAN.md` — Revised execution plan

**Prerequisites:** Phase plan must already exist (run `/spec:plan` first).

**After this command:** Review the revised PLAN.md, then either:
- Run `/spec:revise-phase` again with more feedback
- Run `/spec:execute-phase` to begin implementation

</objective>

<execution_context>

### Stage 1 (Minimal)

- Project CLAUDE.md: @CLAUDE.md
- Existing features: !`ls -1 .project/features 2>/dev/null || echo "No features directory"`

### Stage 2 (Load for Planner Agent)

- Technology Stack: @.project/codebase/STACK.md
- Project Structure: @.project/codebase/STRUCTURE.md
- Code Conventions: @.project/codebase/CONVENTIONS.md
- Architecture Overview: @.project/codebase/ARCHITECTURE.md

</execution_context>

<process>

## Phase 1: Prerequisites Check

**MANDATORY FIRST STEP — Execute these checks before ANY user interaction:**

1. **Verify `.project/codebase/` exists:**
   ```bash
   [ ! -d .project/codebase ] && echo "ERROR: Please run /spec:new-project first to create codebase reference files." && exit 1
   ```

2. **Verify `.project/features/` exists:**
   ```bash
   [ ! -d .project/features ] && echo "ERROR: No features directory found. Run /spec:new-feature first." && exit 1
   ```

**You MUST run all bash commands above using the Bash tool before proceeding.**

**If prerequisites fail:** Inform the user of the missing prerequisite. Stop execution.

## Phase 2: Parse Arguments and Locate Phase

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► REVISE PHASE: PARSING ARGUMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Input:** `$ARGUMENTS`

**Parse the arguments:**

1. Extract the phase identifier — can be:
   - Combined format: `0001:2` (feature 0001, phase 2)
   - Phase only: `2` (uses latest/highest feature)
   - With feature ID: `0001 2` (space-separated)

2. Extract the revision feedback (remaining arguments after the identifier)

3. If no phase identifier provided, ask user:
   - List available features: `ls -1 .project/features`
   - Ask: "Which feature and phase would you like to revise? (format: NNNN:N)"

4. If no revision feedback provided, ask the user: "What feedback would you like to incorporate into this phase plan?"

**Resolve feature and phase:**

```bash
# Parse NNNN:N format
if echo "$IDENTIFIER" | grep -qE '^[0-9]{4}:[0-9]+$'; then
    FEATURE_ID=$(echo "$IDENTIFIER" | cut -d: -f1)
    PHASE_NUM=$(echo "$IDENTIFIER" | cut -d: -f2)
elif echo "$IDENTIFIER" | grep -qE '^[0-9]+$'; then
    # Just a number - use as phase, detect latest feature
    PHASE_NUM="$IDENTIFIER"
    FEATURE_ID=$(ls -1 .project/features 2>/dev/null | sort -r | head -1)
fi

FEATURE_DIR=".project/features/$FEATURE_ID"
PHASE_DIR="$FEATURE_DIR/phases/phase-$PHASE_NUM"
PLAN_PATH="$PHASE_DIR/PLAN.md"

echo "Feature: $FEATURE_ID"
echo "Phase: $PHASE_NUM"
echo "Plan path: $PLAN_PATH"
```

**Verify required files exist:**

```bash
[ ! -d "$FEATURE_DIR" ] && echo "ERROR: Feature directory not found: $FEATURE_DIR" && exit 1
[ ! -f "$FEATURE_DIR/ROADMAP.md" ] && echo "ERROR: ROADMAP.md not found in $FEATURE_DIR" && exit 1
[ ! -f "$PLAN_PATH" ] && echo "ERROR: PLAN.md not found at $PLAN_PATH. Run /spec:plan first." && exit 1
```

## Phase 3: Load Existing Content

**Read the existing files:**

```bash
PLAN_CONTENT=$(cat "$PLAN_PATH")
ROADMAP_CONTENT=$(cat "$FEATURE_DIR/ROADMAP.md")
STATE_CONTENT=$(cat "$FEATURE_DIR/STATE.md" 2>/dev/null || echo "No state file")
```

**Extract phase details from ROADMAP.md:**

Find the section for this phase to understand its goals and success criteria.

## Phase 4: Spawn Phase Planner Agent for Revision

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► REVISE PHASE: REFINING PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spawn the `phase-planner` agent** using the Task tool with `model="opus"` and the following context:

```
<revision_context>

## Revision Mode

You are REVISING an existing phase plan, not creating a new one from scratch.

**Important guidelines:**
- Preserve valid prior work and task structure where appropriate
- Refine task descriptions, file lists, and verification steps based on feedback
- You may reorganize tasks or adjust sequences if the feedback indicates issues
- Maintain the goal-backward methodology (Must-Haves, Observable Truths)
- Keep tasks within the 15-30 min execution time target
- Stay within 50% context budget for execution

## Phase Details

- Feature ID: {FEATURE_ID}
- Phase Number: {PHASE_NUM}
- Plan Path: {PLAN_PATH}

## Revision Feedback

{User's revision feedback}

## Existing Plan Content

<existing_plan>
{PLAN_CONTENT}
</existing_plan>

## Roadmap Context (Phase Goals)

<roadmap>
{ROADMAP_CONTENT}
</roadmap>

## Feature State (if any)

<state>
{STATE_CONTENT}
</state>

## Codebase Context

Provide the content of:
- @.project/codebase/STACK.md
- @.project/codebase/STRUCTURE.md
- @.project/codebase/CONVENTIONS.md
- @.project/codebase/ARCHITECTURE.md

</revision_context>

<output_requirements>

Update the plan file at: `{PLAN_PATH}`

The revised plan must maintain:
- Objective (what and why)
- Must-haves (goal-backward methodology)
- 2-3 tasks max (each 15-30 min Claude execution time)
- Each task has: <files>, <action>, <verify>, <done>
- Dependency graph with execution sequences
- Verification checklist

Add a revision note at the end of the plan:
```
---
## Revision History
- [YYYY-MM-DD] Revised: {brief summary of revision feedback}
```

</output_requirements>
```

**Wait for agent to complete and return confirmation.**

## Phase 5: Done

</process>

<output>

- `{PLAN_PATH}` (updated)

</output>

<success_criteria>

- [ ] Prerequisites verified (codebase and features directories exist)
- [ ] Phase identifier parsed (feature ID and phase number resolved)
- [ ] Revision feedback captured from arguments
- [ ] Existing PLAN.md content loaded
- [ ] ROADMAP.md loaded for phase goal context
- [ ] Phase planner agent spawned with revision context
- [ ] PLAN.md updated with refined tasks and approach
- [ ] Revision note appended to plan

</success_criteria>

<completion_report>

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► PHASE PLAN REVISED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Feature {FEATURE_ID} - Phase {PHASE_NUM}**

 Artifact   Location
-------------------------------------------------
 Plan       `{PLAN_PATH}`

───────────────────────────────────────────────────────────────

## Revision Summary

[Brief summary of what was changed based on feedback]

───────────────────────────────────────────────────────────────

## ▶ Next Steps

1. Review the revised PLAN.md
2. Either:
   - Run `/spec:revise-phase {NNNN}:{N} [more feedback]` for additional refinement
   - Run `/clear` then `/spec:execute-phase {NNNN}:{N}` to begin implementation

───────────────────────────────────────────────────────────────
```

Report to the user:
1. Plan file location
2. Summary of revisions made
3. Next step options

</completion_report>
