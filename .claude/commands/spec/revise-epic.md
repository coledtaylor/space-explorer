---
description: Revise an epic with additional discussion
allowed-tools: Read, Write, Glob, Grep, Bash, Task
argument-hint: "[id-or-slug] [revision feedback]"
---

<objective>

Revise existing epic based on user feedback. Re-spawns the `epic-discusser` agent with the existing epic context plus revision instructions.

**Updates:**
- `.project/epics/NNNN-slug/EPIC.md` — Revised vision, context, and scope
- `.project/epics/NNNN-slug/MILESTONES.md` — Revised goals and deliverables
- `.project/epics/NNNN-slug/DISCUSSION.md` — Updated discussion log (created if first revision)

**Prerequisites:** Epic must already exist at `.project/epics/NNNN-*/`.

**After this command:** Review the revised EPIC.md and MILESTONES.md, then either:
- Run `/spec:revise-epic` again with more feedback
- Run `/spec:new-feature --epic NNNN` to create features from milestones

</objective>

<execution_context>

### Stage 1 (Minimal)

- Project CLAUDE.md: @CLAUDE.md
- Existing epics: !`ls -1 .project/epics 2>/dev/null || echo "No epics directory"`

### Stage 2 (Load for Epic Discusser Agent)

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

2. **Verify `.project/epics/` exists:**
   ```bash
   [ ! -d .project/epics ] && echo "ERROR: No epics directory found. Run /spec:new-epic first." && exit 1
   ```

**You MUST run all bash commands above using the Bash tool before proceeding.**

**If prerequisites fail:** Inform the user of the missing prerequisite. Stop execution.

## Phase 2: Parse Arguments and Locate Epic

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC > REVISE EPIC: PARSING ARGUMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Input:** `$ARGUMENTS`

**Parse the arguments:**

1. Extract the epic identifier (first argument) — can be:
   - Epic ID: `0001`
   - Full slug: `0001-task-management-system`
   - Partial slug: `task` (matches first epic containing this string)

2. Extract the revision feedback (remaining arguments after the identifier)

3. If no identifier provided, list available epics and ask user to specify:
   ```bash
   ls -1 .project/epics
   ```

4. If no revision feedback provided, ask the user: "What feedback would you like to incorporate into this epic?"

**Locate the epic directory:**

```bash
# Try exact match first (ID or full slug)
if [ -d ".project/epics/$IDENTIFIER" ]; then
    EPIC_DIR=".project/epics/$IDENTIFIER"
elif [ -d ".project/epics/${IDENTIFIER}-"* ]; then
    EPIC_DIR=$(ls -d .project/epics/${IDENTIFIER}-* 2>/dev/null | head -1)
else
    # Try partial match
    EPIC_DIR=$(ls -d .project/epics/*${IDENTIFIER}* 2>/dev/null | head -1)
fi

if [ -z "$EPIC_DIR" ] || [ ! -d "$EPIC_DIR" ]; then
    echo "ERROR: Could not find epic matching '$IDENTIFIER'"
    ls -1 .project/epics
    exit 1
fi

echo "Found epic directory: $EPIC_DIR"
```

**Verify required files exist:**

```bash
[ ! -f "$EPIC_DIR/EPIC.md" ] && echo "ERROR: EPIC.md not found in $EPIC_DIR" && exit 1
[ ! -f "$EPIC_DIR/MILESTONES.md" ] && echo "ERROR: MILESTONES.md not found in $EPIC_DIR" && exit 1
```

## Phase 3: Load Existing Epic Content

**Read the existing epic files:**

```bash
EPIC_CONTENT=$(cat "$EPIC_DIR/EPIC.md")
MILESTONES_CONTENT=$(cat "$EPIC_DIR/MILESTONES.md")
```

**Check for existing discussion log:**

```bash
if [ -f "$EPIC_DIR/DISCUSSION.md" ]; then
    DISCUSSION_CONTENT=$(cat "$EPIC_DIR/DISCUSSION.md")
else
    DISCUSSION_CONTENT=""
fi
```

**Extract the epic name from EPIC.md:**

The epic name is typically in the header or first section. Look for the title line or name field.

## Phase 4: Spawn Epic Discusser Agent for Revision

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC > REVISE EPIC: CONTINUING DISCUSSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spawn the `epic-discusser` agent** using the Task tool with the following context:

```
<revision_context>

## Revision Mode

You are REVISING an existing epic, not creating a new epic from scratch.

**Important guidelines:**
- Preserve valid prior work — do not discard decisions already made
- The user wants to refine or expand the epic, not start over
- You may ask clarifying questions using AskUserQuestion if the feedback is unclear
- Update EPIC.md and MILESTONES.md to reflect the refinements
- Create or update DISCUSSION.md to log this revision session

## Epic Details

- Epic Directory: {EPIC_DIR}
- Epic Name: {extracted from EPIC.md}

## Revision Feedback

{User's revision feedback}

## Existing Epic Content

<existing_epic>
{EPIC_CONTENT}
</existing_epic>

<existing_milestones>
{MILESTONES_CONTENT}
</existing_milestones>

<existing_discussion>
{DISCUSSION_CONTENT or "No prior discussion log."}
</existing_discussion>

## Codebase Context

Provide the content of:
- @.project/codebase/STACK.md
- @.project/codebase/STRUCTURE.md
- @.project/codebase/CONVENTIONS.md
- @.project/codebase/ARCHITECTURE.md

</revision_context>

<output_requirements>

Update files at:
- `{EPIC_DIR}/EPIC.md`
- `{EPIC_DIR}/MILESTONES.md`
- `{EPIC_DIR}/DISCUSSION.md` (create if not exists)

In DISCUSSION.md, append a new revision entry:
```markdown
## Revision: [YYYY-MM-DD]

**Feedback:** {brief summary of revision feedback}

**Changes Made:**
- [List of changes to EPIC.md]
- [List of changes to MILESTONES.md]
```

</output_requirements>
```

**Wait for agent to complete and return confirmation.**

## Phase 5: Done

</process>

<output>

- `{EPIC_DIR}/EPIC.md` (updated)
- `{EPIC_DIR}/MILESTONES.md` (updated)
- `{EPIC_DIR}/DISCUSSION.md` (created or updated)

</output>

<success_criteria>

- [ ] Prerequisites verified (codebase and epics directories exist)
- [ ] Epic identifier parsed and directory located
- [ ] Revision feedback captured from arguments or user prompt
- [ ] Existing EPIC.md and MILESTONES.md content loaded
- [ ] Existing DISCUSSION.md content loaded (if present)
- [ ] Epic discusser agent spawned with revision context
- [ ] EPIC.md updated with refined vision/scope
- [ ] MILESTONES.md updated with refined goals/deliverables
- [ ] DISCUSSION.md created or updated with revision entry

</success_criteria>

<completion_report>

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC > EPIC REVISED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Epic: {EPIC_DIR}**

 Artifact     Location
-------------------------------------------------
 Epic         `{EPIC_DIR}/EPIC.md`
 Milestones   `{EPIC_DIR}/MILESTONES.md`
 Discussion   `{EPIC_DIR}/DISCUSSION.md`

-----------------------------------------------------------

## Revision Summary

[Brief summary of what was changed based on feedback]

-----------------------------------------------------------

## Next Steps

1. Review the revised EPIC.md and MILESTONES.md
2. Either:
   - Run `/spec:revise-epic {ID} [more feedback]` for additional refinement
   - Run `/clear` then `/spec:new-feature --epic {NNNN}` to create features from milestones

-----------------------------------------------------------
```

Report to the user:
1. Epic directory location
2. Summary of revisions made
3. Next step options

</completion_report>
