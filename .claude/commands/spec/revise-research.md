---
description: Revise research with additional feedback
allowed-tools: Read, Write, Glob, Grep, Bash, Task
argument-hint: "[id-or-slug] [revision feedback]"
---

<objective>

Revise existing research based on user feedback. Re-spawns the `codebase-researcher` agent with the existing research context plus revision instructions.

**Updates:**
- `.project/research/NNNN-slug/RESEARCH.md` — Revised human-readable analysis
- `.project/research/NNNN-slug/PROMPT.md` — Revised AI-optimized bootstrap

**Prerequisites:** Research must already exist at `.project/research/NNNN-*/`.

**After this command:** Review the revised RESEARCH.md, then either:
- Run `/spec:revise-research` again with more feedback
- Run `/spec:new-feature --use-research NNNN` to create a feature

</objective>

<execution_context>

### Stage 1 (Minimal)

- Project CLAUDE.md: @CLAUDE.md
- Existing research: !`ls -1 .project/research 2>/dev/null || echo "No research directory"`

### Stage 2 (Load for Researcher Agent)

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

2. **Verify `.project/research/` exists:**
   ```bash
   [ ! -d .project/research ] && echo "ERROR: No research directory found. Run /spec:research first." && exit 1
   ```

**You MUST run all bash commands above using the Bash tool before proceeding.**

**If prerequisites fail:** Inform the user of the missing prerequisite. Stop execution.

## Phase 2: Parse Arguments and Locate Research

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► REVISE RESEARCH: PARSING ARGUMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Input:** `$ARGUMENTS`

**Parse the arguments:**

1. Extract the research identifier (first argument) — can be:
   - Research ID: `0001`
   - Full slug: `0001-add-oauth-authentication`
   - Partial slug: `oauth` (matches first research containing this string)

2. Extract the revision feedback (remaining arguments after the identifier)

3. If no identifier provided, list available research and ask user to specify:
   ```bash
   ls -1 .project/research
   ```

4. If no revision feedback provided, ask the user: "What feedback would you like to incorporate into this research?"

**Locate the research directory:**

```bash
# Try exact match first (ID or full slug)
if [ -d ".project/research/$IDENTIFIER" ]; then
    RESEARCH_DIR=".project/research/$IDENTIFIER"
elif [ -d ".project/research/${IDENTIFIER}-"* ]; then
    RESEARCH_DIR=$(ls -d .project/research/${IDENTIFIER}-* 2>/dev/null | head -1)
else
    # Try partial match
    RESEARCH_DIR=$(ls -d .project/research/*${IDENTIFIER}* 2>/dev/null | head -1)
fi

if [ -z "$RESEARCH_DIR" ] || [ ! -d "$RESEARCH_DIR" ]; then
    echo "ERROR: Could not find research matching '$IDENTIFIER'"
    ls -1 .project/research
    exit 1
fi

echo "Found research directory: $RESEARCH_DIR"
```

**Verify required files exist:**

```bash
[ ! -f "$RESEARCH_DIR/RESEARCH.md" ] && echo "ERROR: RESEARCH.md not found in $RESEARCH_DIR" && exit 1
[ ! -f "$RESEARCH_DIR/PROMPT.md" ] && echo "ERROR: PROMPT.md not found in $RESEARCH_DIR" && exit 1
```

## Phase 3: Load Existing Research Content

**Read the existing research files:**

```bash
RESEARCH_CONTENT=$(cat "$RESEARCH_DIR/RESEARCH.md")
PROMPT_CONTENT=$(cat "$RESEARCH_DIR/PROMPT.md")
```

**Extract the original description from RESEARCH.md:**

The description is typically in the header or first section. Look for the title line or description field.

## Phase 4: Spawn Codebase Researcher Agent for Revision

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► REVISE RESEARCH: REFINING ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spawn the `codebase-researcher` agent** using the Task tool with `model="opus"` and the following context:

```
<revision_context>

## Revision Mode

You are REVISING existing research, not creating new research from scratch.

**Important guidelines:**
- Preserve the strategic exploration approach and honest assessment from your original analysis
- Maintain the dual-audience writing style (RESEARCH.md for humans, PROMPT.md for AI)
- Refine and enhance based on feedback, do not discard valid prior work
- You may explore additional areas of the codebase if the feedback suggests gaps
- Update both files to reflect the refinements

## Research Details

- Research Directory: {RESEARCH_DIR}
- Original Description: {extracted from RESEARCH.md}

## Revision Feedback

{User's revision feedback}

## Existing Research Content

<existing_research>
{RESEARCH_CONTENT}
</existing_research>

<existing_prompt>
{PROMPT_CONTENT}
</existing_prompt>

## Codebase Context

Provide the content of:
- @.project/codebase/STACK.md
- @.project/codebase/STRUCTURE.md
- @.project/codebase/CONVENTIONS.md
- @.project/codebase/ARCHITECTURE.md

</revision_context>

<output_requirements>

Update files at:
- `{RESEARCH_DIR}/RESEARCH.md`
- `{RESEARCH_DIR}/PROMPT.md`

At the end of the `## Notes` section in RESEARCH.md (create if not exists), add:
- [YYYY-MM-DD] Revised: {brief summary of revision feedback}

</output_requirements>
```

**Wait for agent to complete and return confirmation.**

## Phase 5: Done

</process>

<output>

- `{RESEARCH_DIR}/RESEARCH.md` (updated)
- `{RESEARCH_DIR}/PROMPT.md` (updated)

</output>

<success_criteria>

- [ ] Prerequisites verified (codebase and research directories exist)
- [ ] Research identifier parsed and directory located
- [ ] Revision feedback captured from arguments
- [ ] Existing RESEARCH.md and PROMPT.md content loaded
- [ ] Codebase researcher agent spawned with revision context
- [ ] RESEARCH.md updated with refined analysis
- [ ] PROMPT.md updated with refined AI bootstrap
- [ ] Revision note appended to Notes section

</success_criteria>

<completion_report>

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► RESEARCH REVISED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Research: {RESEARCH_DIR}**

 Artifact   Location
-------------------------------------------------
 Analysis   `{RESEARCH_DIR}/RESEARCH.md`
 Prompt     `{RESEARCH_DIR}/PROMPT.md`

───────────────────────────────────────────────────────────────

## Revision Summary

[Brief summary of what was changed based on feedback]

───────────────────────────────────────────────────────────────

## ▶ Next Steps

1. Review the revised RESEARCH.md
2. Either:
   - Run `/spec:revise-research {ID} [more feedback]` for additional refinement
   - Run `/clear` then `/spec:new-feature --use-research {NNNN}` to create a feature

───────────────────────────────────────────────────────────────
```

Report to the user:
1. Research directory location
2. Summary of revisions made
3. Next step options

</completion_report>
