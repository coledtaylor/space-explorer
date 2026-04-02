---
description: Create a new feature specification with auto-numbered directory and ROADMAP.md
allowed-tools: Read, Write, Glob, Grep, Bash, AskUserQuestion, Task
argument-hint: [feature-name-or-description] [--use-research NNNN] [--epic NNNN]
---

<objective>

Create a new feature specification directory with a comprehensive ROADMAP.md that guides implementation.

**Creates:**
- `.project/features/NNNN/ROADMAP.md` — feature implementation plan
- `.project/features/NNNN/STATE.md` — feature execution state and progress tracking
- When linked to epic, updates epic's MILESTONES.md with feature reference

**Prerequisites:** Run `/spec:new-project` first to create codebase reference files.

**After this command:** Review the ROADMAP.md and run `/spec:execute-phase 1` to begin implementation.

</objective>

<execution_context>

### Stage 1 (Minimal)

- Project CLAUDE.md: @CLAUDE.md
- Existing features: !`ls -1 .project/features 2>/dev/null || echo "No features directory yet"`

### Stage 2 (Load Only When Writing ROADMAP.md)

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

2. **Determine the next feature number:**
   ```bash
   LAST=$(ls -1 .project/features 2>/dev/null | grep -E '^[0-9]{4}$' | sort -n | tail -1)
   if [ -z "$LAST" ]; then
     NEXT="0001"
   else
     NEXT=$(printf "%04d" $((10#$LAST + 1)))
   fi
   echo "Next feature number: $NEXT"
   ```

3. **Parse `--use-research` flag (if provided):**

   Parse `--use-research NNNN` flag; verify `.project/research/NNNN-*/PROMPT.md` exists. If not found: inform user and stop.

4. **Parse `--epic` flag (if provided):**

   Check if `$ARGUMENTS` contains `--epic NNNN`:
   - Extract the epic ID (NNNN)
   - Verify the epic directory exists: `.project/epics/NNNN-*/EPIC.md`
   - If epic ID provided but not found, inform user and stop: "Epic NNNN not found. Run `/spec:new-epic` first."
   - Store epic directory path for later use

   ```bash
   # Find epic directory matching the ID
   EPIC_DIR=$(ls -d .project/epics/NNNN-* 2>/dev/null | head -1)
   if [ -n "$EPIC_DIR" ] && [ -f "$EPIC_DIR/EPIC.md" ]; then
     echo "Epic found: $EPIC_DIR"
   else
     echo "ERROR: Epic NNNN not found"
   fi
   ```

**You MUST run all bash commands above using the Bash tool before proceeding.**

**If prerequisites fail:** Inform the user: "Please run `/spec:new-project` first to create codebase reference files." Stop execution.

## Phase 2: Gather Requirements

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► GATHERING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The user has provided: `$ARGUMENTS`

### If `--use-research` Flag Provided

When research context is available, use it as the primary requirements source:

1. **Read the PROMPT.md file:**
   ```
   Read: .project/research/NNNN-slug/PROMPT.md
   ```

2. **Display research summary:** Show description, file counts, complexity, and success criteria from PROMPT.md.

3. **Confirm with user using AskUserQuestion:**
   - header: "Use research?"
   - question: "The research provides pre-analyzed requirements. How would you like to proceed?"
   - options:
     - "Use research as-is" — Create feature using research findings directly
     - "Review and adjust" — Let me add or modify requirements
     - "Start fresh" — Ignore research and gather requirements normally

4. **If "Use research as-is":** Extract requirements from PROMPT.md and skip to Phase 3. **Important:** The phases defined in the research must be preserved in the ROADMAP.md — do not re-derive or reorganize them.

5. **If "Review and adjust":** Present the research findings, then ask targeted questions about any areas marked as "Open Questions" in PROMPT.md.

6. **If "Start fresh":** Continue with normal requirements gathering below.

### Standard Requirements Gathering (No Research)

**Analyze context before asking questions:**

Before asking anything, analyze:
1. **User's input:** Parse `$ARGUMENTS` for feature name, keywords, implied scope
2. **Codebase context:** Review STACK.md, STRUCTURE.md, ARCHITECTURE.md to understand what exists
3. **Existing features:** Check `.project/features/**/ROADMAP` and `.project/archive/**/ROADMAP` to understand what's already built
4. **Identify ambiguities:** What's unclear or could be interpreted multiple ways?

**Generate intelligent questions using AskUserQuestion:**

Based on your analysis, use AskUserQuestion to clarify ambiguities and fill gaps. Generate options that are specific to what the user mentioned and what you know about the codebase.

**Question generation principles:**

- Interpret their words with codebase-specific options
- Propose concrete implementations based on stack
- Surface likely scope decisions
- Always include "Other" option

**Follow threads:** Each answer triggers deeper AskUserQuestion calls based on selection, codebase context, common patterns, and edge cases.

Keep asking until you understand: core problem, users/usage, success criteria, scope boundaries, dependencies, edge cases, and constraints.

**Decision gate:**

When you have enough context to write a solid roadmap, use AskUserQuestion:

- header: "Ready to proceed?"
- question: "I have a clear picture of what you're building. Ready to create the roadmap?"
- options:
  - "Create roadmap" — Let's move forward
  - "I have more to add" — Ask me more questions

If "I have more to add" — ask what areas need more detail, then continue with targeted AskUserQuestion calls.

Loop until "Create roadmap" selected.

## Phase 3: Create Feature Directory

```bash
mkdir -p .project/features/NNNN
```

## Phase 4: Spawn Feature Roadmapper Agent

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► CREATING ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spawn the `feature-roadmapper` agent** using the Task tool with `model="opus"` and the following context:

```
<roadmapper_context>

## Feature Details

- Feature ID: NNNN
- Feature Name: [Name from conversation]
- Feature Directory: .project/features/NNNN

## User Requirements

[Summary of requirements gathered in Phase 2]
- Problem being solved
- Target users
- Key acceptance criteria
- Known constraints or dependencies

## Codebase Context

Provide the content of:
- @.project/codebase/STACK.md
- @.project/codebase/STRUCTURE.md
- @.project/codebase/CONVENTIONS.md
- @.project/codebase/ARCHITECTURE.md

</roadmapper_context>

<research_context>
<!-- Include this block ONLY if --use-research was provided -->

## Pre-Analyzed Research

Research ID: NNNN
Research Directory: .project/research/NNNN-slug/

[Include full contents of PROMPT.md here]

**IMPORTANT — Phase Structure:**
- Use research phases DIRECTLY as the ROADMAP.md phase structure
- Do NOT re-derive phases from requirements
- Preserve the categorical domain boundaries from research
- Success criteria can be refined, but phase boundaries must match research
- Each phase in research represents a self-contained domain (implementation + verification)

</research_context>

<epic_context>
<!-- Include this block ONLY if --epic was provided -->

## Linked Epic

Epic ID: NNNN
Epic Directory: .project/epics/NNNN-slug/

**IMPORTANT — ROADMAP.md Header:**
- Add `Epic: NNNN` field to the ROADMAP.md header metadata (after Status field)
- Example:
  > Created: YYYY-MM-DD
  > Status: Draft
  > Epic: NNNN

</epic_context>

<output_requirements>

Write files to:
- `.project/features/NNNN/ROADMAP.md`
- `.project/features/NNNN/STATE.md`

</output_requirements>
```

**Wait for agent to complete and return structured summary.**

## Phase 4.5: Update Epic MILESTONES.md (if --epic provided)

**Only execute this phase if `--epic` flag was provided.**

After the roadmapper completes, update the epic's MILESTONES.md with the new feature reference:

1. **Read the epic's MILESTONES.md:**
   ```
   Read: .project/epics/NNNN-slug/MILESTONES.md
   ```

2. **Determine which milestone this feature implements:**
   - Parse the feature name/description against milestone goals
   - If a clear match is found, use that milestone
   - If unclear, use AskUserQuestion to ask the user:
     - header: "Link to milestone"
     - question: "Which milestone does this feature implement?"
     - options: [List each milestone with its goal]

3. **Update the milestone's Linked Feature field:**
   - Find the milestone section in MILESTONES.md
   - Update `| Linked Feature | Not yet created |` to `| Linked Feature | NNNN |` (the new feature ID)
   - Write the updated MILESTONES.md

4. **Confirm the link:**
   ```
   Epic NNNN linked: Feature NNNN now implements Milestone M
   ```

## Phase 5: Done

</process>

<output>

- `.project/features/NNNN/ROADMAP.md`
- `.project/features/NNNN/STATE.md`

</output>

<success_criteria>

- [ ] Prerequisites verified (codebase reference files exist)
- [ ] Feature number determined (auto-incremented)
- [ ] Feature directory created at `.project/features/NNNN/`
- [ ] ROADMAP.md populated with comprehensive but realistic plan
- [ ] STATE.md initialized for progress tracking
- [ ] All placeholder sections filled with actual analysis
- [ ] Tasks broken into small, actionable items
- [ ] File paths reference actual project structure

</success_criteria>

<completion_report>

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► FEATURE CREATED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature NNNN: [Feature Name]
Phases: [N] | Ready to implement ✓

Files:
- .project/features/NNNN/ROADMAP.md
- .project/features/NNNN/STATE.md

## ▶ Next Up

<!-- Show this line ONLY if --epic was provided -->
**Linked to Epic NNNN** (Milestone M)

───────────────────────────────────────────────────────────────
Phase 1: [Phase Name] — [Goal from ROADMAP.md]

1. Review ROADMAP.md and refine as needed
2. Run `/clear` to clear context
3. Run `/spec:plan` to create execution plan
```

</completion_report>
