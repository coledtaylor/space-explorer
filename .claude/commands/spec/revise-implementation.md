---
description: Revise implemented code based on user feedback
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
argument-hint: "[NNNN:N] [revision feedback]"
---

<objective>

Revise actual code that was implemented in a phase based on user feedback. This command has full context of what was intended (ROADMAP, PLAN) AND what was built (actual code files).

**Key insight:** First implementation is a probe — this command enables graceful correction after seeing the results.

**Updates:**
- Actual code files that were created/modified during the phase
- `.project/features/NNNN/phases/phase-N/PLAN.md` — Revision note added
- `.project/features/NNNN/STATE.md` — Revision logged in Decisions Log

**Prerequisites:** Phase must have been executed (tasks completed in PLAN.md).

**After this command:** Review the changes, then either:
- Run `/spec:revise-implementation` again with more feedback
- Continue to next phase with `/spec:execute-phase`

</objective>

<execution_context>

### Stage 1 (Minimal)

- Project CLAUDE.md: @CLAUDE.md
- Existing features: !`ls -1 .project/features 2>/dev/null || echo "No features directory"`

### Stage 2 (Load for Executor Agent)

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
 SPEC ► REVISE IMPLEMENTATION: PARSING ARGUMENTS
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

4. If no revision feedback provided, ask the user: "What changes would you like to make to the implementation?"

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
STATE_PATH="$FEATURE_DIR/STATE.md"
ROADMAP_PATH="$FEATURE_DIR/ROADMAP.md"

echo "Feature: $FEATURE_ID"
echo "Phase: $PHASE_NUM"
echo "Plan path: $PLAN_PATH"
```

**Verify phase was executed:**

```bash
[ ! -d "$FEATURE_DIR" ] && echo "ERROR: Feature directory not found: $FEATURE_DIR" && exit 1
[ ! -f "$PLAN_PATH" ] && echo "ERROR: PLAN.md not found at $PLAN_PATH. Run /spec:plan first." && exit 1

# Check if any tasks are marked complete in PLAN.md
if ! grep -q '\[x\]' "$PLAN_PATH" 2>/dev/null; then
    echo "WARNING: No completed tasks found in PLAN.md. Run /spec:execute-phase first."
fi
```

## Phase 3: Load Comprehensive Context

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► REVISE IMPLEMENTATION: LOADING CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Read all context files:**

```bash
# Feature context
ROADMAP_CONTENT=$(cat "$ROADMAP_PATH")
PLAN_CONTENT=$(cat "$PLAN_PATH")
STATE_CONTENT=$(cat "$STATE_PATH" 2>/dev/null || echo "No state file")

# Codebase context
STACK_CONTENT=$(cat .project/codebase/STACK.md)
CONVENTIONS_CONTENT=$(cat .project/codebase/CONVENTIONS.md 2>/dev/null || echo "")
```

**Extract file paths from PLAN.md `<files>` blocks:**

Parse the PLAN.md to identify all files that were created or modified during execution:

```bash
# Extract files from <files> blocks in PLAN.md
grep -A 20 '<files>' "$PLAN_PATH" | grep -E '^\s*[-*]?\s*\S+\.\w+' | sed 's/^[[:space:]]*[-*]*//' | tr -d '`'
```

**Read the actual code files:**

For each file path extracted from the plan, read the current content. These are the files that will be revised.

```
File: {path1}
Content: {Read file content}

File: {path2}
Content: {Read file content}
...
```

## Phase 4: Spawn Phase Executor Agent for Revision

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► REVISE IMPLEMENTATION: MAKING CHANGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spawn the `phase-executor` agent** using the Task tool with `model="sonnet"` and revision mode context:

```
<revision_context>

## REVISION MODE

**CRITICAL: This is REVISION, not new implementation.**

You are making targeted changes to existing code based on user feedback. Do NOT re-implement from scratch.

**Revision guidelines:**
- Make minimal, targeted changes to address the feedback
- Preserve working code that doesn't need to change
- Follow existing patterns and conventions in the code
- Test your changes against the original verification criteria
- Document what you changed and why

## Feature Details

- Feature ID: {FEATURE_ID}
- Phase Number: {PHASE_NUM}
- Feature Directory: {FEATURE_DIR}

## Revision Feedback

{User's revision feedback}

## Original Intent (ROADMAP.md)

<roadmap>
{ROADMAP_CONTENT}
</roadmap>

## What Was Planned (PLAN.md)

<plan>
{PLAN_CONTENT}
</plan>

## What Was Executed (STATE.md)

<state>
{STATE_CONTENT}
</state>

## Current Code (What Was Built)

{For each file extracted from PLAN.md:}

<file path="{file_path}">
{file_content}
</file>

## Codebase Context

<stack>
{STACK_CONTENT}
</stack>

<conventions>
{CONVENTIONS_CONTENT}
</conventions>

</revision_context>

<output_requirements>

## Code Changes

Make the targeted code changes based on the revision feedback. Use Edit tool for modifications, Write tool only if creating new files.

## Documentation Updates

After making code changes:

1. **Update PLAN.md** — Add revision note at the end:
   ```
   ---
   ## Revision History
   - [YYYY-MM-DD] Implementation revised: {brief summary of changes made}
   ```

2. **Update STATE.md** — Add entry to Decisions Log:
   ```
   | [YYYY-MM-DD] | Implementation revision | {brief summary of feedback} | Implemented |
   ```

## Completion Report

Return a structured summary:
- Files modified: [list]
- Changes made: [brief description of each change]
- Verification: [confirm original verify criteria still pass]

</output_requirements>

<constraints>

- **Scope:** Only modify files related to the feedback. Do not refactor unrelated code.
- **Verification:** After changes, confirm the original `<verify>` criteria from PLAN.md still pass.
- **Documentation:** Always update PLAN.md and STATE.md to record the revision.
- **2-Attempt Rule:** If a change fails twice, stop and report the issue.

</constraints>
```

**Wait for agent to complete and return confirmation.**

## Phase 5: Done

</process>

<output>

- Code files modified based on feedback
- `{PLAN_PATH}` (revision note added)
- `{STATE_PATH}` (revision logged in Decisions Log)

</output>

<success_criteria>

- [ ] Prerequisites verified (codebase and features directories exist)
- [ ] Phase identifier parsed (feature ID and phase number resolved)
- [ ] Revision feedback captured from arguments
- [ ] Phase execution verified (tasks were completed)
- [ ] Comprehensive context loaded (ROADMAP, PLAN, STATE, actual code)
- [ ] File paths extracted from PLAN.md `<files>` blocks
- [ ] Actual code files read for revision context
- [ ] Phase executor agent spawned in REVISION mode
- [ ] Targeted code changes made based on feedback
- [ ] PLAN.md updated with revision history
- [ ] STATE.md updated with revision decision log entry
- [ ] Original verification criteria confirmed

</success_criteria>

<completion_report>

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► IMPLEMENTATION REVISED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Feature {FEATURE_ID} - Phase {PHASE_NUM}**

## Files Modified

- `{file1}` — {what changed}
- `{file2}` — {what changed}

## Documentation Updated

- `{PLAN_PATH}` — Revision history added
- `{STATE_PATH}` — Decision logged

───────────────────────────────────────────────────────────────

## Revision Summary

[Summary of changes made based on feedback]

## Verification

[Confirmation that original verify criteria still pass]

───────────────────────────────────────────────────────────────

## ▶ Next Steps

1. Review the code changes
2. Either:
   - Run `/spec:revise-implementation {NNNN}:{N} [more feedback]` for additional refinement
   - Run `/clear` then `/spec:execute-phase {NNNN}:{N+1}` to continue to next phase
   - Run `/spec:complete-feature {NNNN}` if all phases are done

───────────────────────────────────────────────────────────────
```

Report to the user:
1. Files modified and what changed
2. Documentation updates made
3. Verification status
4. Next step options

</completion_report>
