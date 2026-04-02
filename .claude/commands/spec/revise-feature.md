---
description: Revise a feature's ROADMAP.md with additional feedback
allowed-tools: Read, Write, Glob, Grep, Bash, Task
argument-hint: "[NNNN] [revision feedback]"
---

<objective>

Revise an existing feature's ROADMAP.md based on user feedback. Re-spawns the `feature-roadmapper` agent with the existing roadmap context plus revision instructions.

**Updates:**
- `.project/features/NNNN/ROADMAP.md` — Revised feature roadmap
- `.project/features/NNNN/STATE.md` — Revision logged in Decisions Log

**Prerequisites:** Feature must already exist at `.project/features/NNNN/`.

**After this command:** Review the revised ROADMAP.md, then either:
- Run `/spec:revise-feature` again with more feedback
- Run `/spec:plan` to create phase execution plans

</objective>

<execution_context>

### Stage 1 (Minimal)

- Project CLAUDE.md: @CLAUDE.md
- Existing features: !`ls -1 .project/features 2>/dev/null || echo "No features directory"`

### Stage 2 (Load for Roadmapper Agent)

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

## Phase 2: Parse Arguments and Locate Feature

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► REVISE FEATURE: PARSING ARGUMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Input:** `$ARGUMENTS`

**Parse the arguments:**

1. Extract the feature identifier (first argument) — can be:
   - Feature ID: `0001`
   - Partial match: `oauth` (matches first feature directory containing this string)

2. Extract the revision feedback (remaining arguments after the identifier)

3. If no identifier provided, list available features and ask user to specify:
   ```bash
   ls -1 .project/features
   ```

4. If no revision feedback provided, ask the user: "What feedback would you like to incorporate into this feature's roadmap?"

**Locate the feature directory:**

```bash
# Try exact match first (full 4-digit ID)
if [ -d ".project/features/$IDENTIFIER" ]; then
    FEATURE_DIR=".project/features/$IDENTIFIER"
else
    # Try partial match
    FEATURE_DIR=$(ls -d .project/features/*${IDENTIFIER}* 2>/dev/null | head -1)
fi

if [ -z "$FEATURE_DIR" ] || [ ! -d "$FEATURE_DIR" ]; then
    echo "ERROR: Could not find feature matching '$IDENTIFIER'"
    ls -1 .project/features
    exit 1
fi

echo "Found feature directory: $FEATURE_DIR"
```

**Verify required files exist:**

```bash
[ ! -f "$FEATURE_DIR/ROADMAP.md" ] && echo "ERROR: ROADMAP.md not found in $FEATURE_DIR" && exit 1
```

## Phase 3: Load Existing Feature Content

**Read the existing feature files:**

```bash
ROADMAP_CONTENT=$(cat "$FEATURE_DIR/ROADMAP.md")
STATE_CONTENT=$(cat "$FEATURE_DIR/STATE.md" 2>/dev/null || echo "No state file")
```

**Extract the feature name from ROADMAP.md:**

The feature name is typically in the title (first `#` header).

## Phase 4: Spawn Feature Roadmapper Agent for Revision

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► REVISE FEATURE: REFINING ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spawn the `feature-roadmapper` agent** using the Task tool with `model="opus"` and the following context:

```
<revision_context>

## Revision Mode

You are REVISING an existing feature roadmap, not creating a new one from scratch.

**Important guidelines:**
- Preserve valid prior work and phase structure where appropriate
- Refine and enhance based on feedback
- You may reorganize phases if the feedback indicates structural issues
- Update success criteria and scope boundaries as needed
- Maintain consistency with codebase context

## Feature Details

- Feature Directory: {FEATURE_DIR}
- Feature Name: {extracted from ROADMAP.md}

## Revision Feedback

{User's revision feedback}

## Existing Roadmap Content

<existing_roadmap>
{ROADMAP_CONTENT}
</existing_roadmap>

## Existing State (if any)

<existing_state>
{STATE_CONTENT}
</existing_state>

## Codebase Context

Provide the content of:
- @.project/codebase/STACK.md
- @.project/codebase/STRUCTURE.md
- @.project/codebase/CONVENTIONS.md
- @.project/codebase/ARCHITECTURE.md

</revision_context>

<output_requirements>

Update files at:
- `{FEATURE_DIR}/ROADMAP.md`

Also update `{FEATURE_DIR}/STATE.md` Decisions Log to record the revision:
- Add entry: `[YYYY-MM-DD] Roadmap revised: {brief summary of revision feedback}`

</output_requirements>
```

**Wait for agent to complete and return confirmation.**

## Phase 5: Done

</process>

<output>

- `{FEATURE_DIR}/ROADMAP.md` (updated)
- `{FEATURE_DIR}/STATE.md` (revision logged)

</output>

<success_criteria>

- [ ] Prerequisites verified (codebase and features directories exist)
- [ ] Feature identifier parsed and directory located
- [ ] Revision feedback captured from arguments
- [ ] Existing ROADMAP.md content loaded
- [ ] Feature roadmapper agent spawned with revision context
- [ ] ROADMAP.md updated with refined phases and goals
- [ ] STATE.md updated with revision decision log entry

</success_criteria>

<completion_report>

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► FEATURE REVISED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Feature: {FEATURE_DIR}**

 Artifact   Location
-------------------------------------------------
 Roadmap    `{FEATURE_DIR}/ROADMAP.md`
 State      `{FEATURE_DIR}/STATE.md`

───────────────────────────────────────────────────────────────

## Revision Summary

[Brief summary of what was changed based on feedback]

───────────────────────────────────────────────────────────────

## ▶ Next Steps

1. Review the revised ROADMAP.md
2. Either:
   - Run `/spec:revise-feature {ID} [more feedback]` for additional refinement
   - Run `/clear` then `/spec:plan {NNNN}` to create phase execution plans

───────────────────────────────────────────────────────────────
```

Report to the user:
1. Feature directory location
2. Summary of revisions made
3. Next step options

</completion_report>
