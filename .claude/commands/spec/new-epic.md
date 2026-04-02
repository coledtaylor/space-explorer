---
description: Create a new epic through iterative discussion
allowed-tools: Read, Write, Glob, Grep, Bash, Task
argument-hint: [description of the epic]
---

<objective>

Facilitate creation of epics through iterative discussion with the user, transforming vague ideas into structured project plans.

**Creates:**
- `.project/epics/NNNN-slug/EPIC.md` — Vision, context, scope boundaries
- `.project/epics/NNNN-slug/MILESTONES.md` — Concrete goals and deliverables

**Prerequisites:** Run `/spec:new-project` first to create codebase reference files.

**After this command:** Review EPIC.md and MILESTONES.md, then run `/spec:new-feature --epic NNNN` to create features from milestones, or run `/spec:revise-epic NNNN` to continue the discussion.

</objective>

<execution_context>

### Stage 1 (Minimal)

- Project CLAUDE.md: @CLAUDE.md
- Existing epics: !`ls -1 .project/epics 2>/dev/null || echo "No epics directory yet"`

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

2. **Determine the next epic number:**
   ```bash
   LAST=$(ls -1 .project/epics 2>/dev/null | grep -E '^[0-9]{4}' | sed 's/-.*//' | sort -n | tail -1)
   if [ -z "$LAST" ]; then
     NEXT="0001"
   else
     NEXT=$(printf "%04d" $((10#$LAST + 1)))
   fi
   echo "Next epic number: $NEXT"
   ```

**You MUST run all bash commands above using the Bash tool before proceeding.**

**If prerequisites fail:** Inform the user: "Please run `/spec:new-project` first to create codebase reference files." Stop execution.

## Phase 2: Parse Description and Generate Slug

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► NEW EPIC: PARSING REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The user has provided: `$ARGUMENTS`

**Parse the description:**
1. Extract the epic description from `$ARGUMENTS`
2. If no description provided, ask the user: "What epic would you like to create? Describe the high-level project vision or goal."

**Generate slug from description:**
1. Convert to lowercase
2. Replace spaces with hyphens
3. Remove non-alphanumeric characters (except hyphens)
4. Truncate to max 50 characters
5. Remove trailing hyphens

**Example transformations:**
- "Task Management System" → `task-management-system`
- "Customer Analytics Dashboard with ML" → `customer-analytics-dashboard-with-ml`
- "E-commerce Platform v2.0 Redesign" → `e-commerce-platform-v20-redesign`

## Phase 3: Create Epic Directory

```bash
mkdir -p .project/epics/NNNN-slug
```

Where `NNNN` is the auto-incremented number and `slug` is the generated slug.

## Phase 4: Spawn Epic Discusser Agent

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► NEW EPIC: FACILITATING DISCUSSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spawn the `epic-discusser` agent** using the Task tool with the following context:

```
<epic_context>

## Epic Details

- Epic ID: NNNN
- Epic Directory: .project/epics/NNNN-slug
- Initial Description: [Description from $ARGUMENTS]

## Codebase Context

Provide the content of:
- @.project/codebase/STACK.md
- @.project/codebase/STRUCTURE.md
- @.project/codebase/CONVENTIONS.md
- @.project/codebase/ARCHITECTURE.md

## Template Reference

The epic-discusser agent should reference this file for output structure:
- @.project/features/0001/phases/phase-1/TEMPLATES.md

</epic_context>

<output_requirements>

Write files to:
- `.project/epics/NNNN-slug/EPIC.md`
- `.project/epics/NNNN-slug/MILESTONES.md`

The agent will use AskUserQuestion for iterative discussion to extract goals from the initial description and produce structured output.

</output_requirements>
```

**Wait for agent to complete and return confirmation.**

## Phase 5: Done

</process>

<output>

- `.project/epics/NNNN-slug/EPIC.md`
- `.project/epics/NNNN-slug/MILESTONES.md`

</output>

<success_criteria>

- [ ] Prerequisites verified (codebase reference files exist)
- [ ] Epic number determined (auto-incremented)
- [ ] Slug generated from description
- [ ] Epic directory created at `.project/epics/NNNN-slug/`
- [ ] EPIC.md populated with vision, context, and scope
- [ ] MILESTONES.md populated with at least one milestone
- [ ] All sections filled through iterative discussion

</success_criteria>

<completion_report>

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► EPIC CREATED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Epic NNNN: [Epic Name from EPIC.md]**

 Artifact   Location
-------------------------------------------------
 Vision     `.project/epics/NNNN-slug/EPIC.md`
 Milestones `.project/epics/NNNN-slug/MILESTONES.md`

───────────────────────────────────────────────────────────────

## Summary

[Vision section from EPIC.md - 1-3 sentences]

- **Milestones:** [Count] defined
- **Status:** Active

───────────────────────────────────────────────────────────────

## ▶ Next Steps

1. Review EPIC.md for vision, context, and scope boundaries
2. Review MILESTONES.md for concrete goals and deliverables
3. Run `/spec:new-feature --epic NNNN` to create features from milestones
4. Or run `/spec:revise-epic NNNN` to continue discussion and refine the epic

───────────────────────────────────────────────────────────────
```

Report to the user:
1. Epic ID and directory location
2. Summary of vision (from EPIC.md)
3. Number of milestones created
4. Suggested next steps (review, create features, or revise)

</completion_report>
