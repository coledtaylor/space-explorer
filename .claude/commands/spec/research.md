---
description: Research a feature or bug before creating a specification
allowed-tools: Read, Write, Glob, Grep, Bash, Task
argument-hint: [description of what to research]
---

<objective>

Explore the codebase to assess feasibility, scope, and complexity before creating a feature specification.

**Creates:**
- `.project/research/NNNN-slug/RESEARCH.md` — Human-readable scope/complexity analysis
- `.project/research/NNNN-slug/PROMPT.md` — AI-optimized bootstrap for `spec:new-feature --use-research NNNN`

**Prerequisites:** Run `/spec:new-project` first to create codebase reference files.

**After this command:** Review RESEARCH.md, then run `/spec:new-feature --use-research NNNN` to create a feature using the research findings.

</objective>

<execution_context>

### Stage 1 (Minimal)

- Project CLAUDE.md: @CLAUDE.md
- Existing research: !`ls -1 .project/research 2>/dev/null || echo "No research directory yet"`

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

2. **Determine the next research number:**
   ```bash
   LAST=$(ls -1 .project/research 2>/dev/null | grep -E '^[0-9]{4}' | sed 's/-.*//' | sort -n | tail -1)
   if [ -z "$LAST" ]; then
     NEXT="0001"
   else
     NEXT=$(printf "%04d" $((10#$LAST + 1)))
   fi
   echo "Next research number: $NEXT"
   ```

**You MUST run all bash commands above using the Bash tool before proceeding.**

**If prerequisites fail:** Inform the user: "Please run `/spec:new-project` first to create codebase reference files." Stop execution.

## Phase 2: Parse Description and Generate Slug

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► RESEARCH: PARSING REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The user has provided: `$ARGUMENTS`

**Parse the description:**
1. Extract the research description from `$ARGUMENTS`
2. If no description provided, ask the user: "What would you like to research? Describe the feature, bug, or investigation."

**Generate slug from description:**
1. Convert to lowercase
2. Replace spaces with hyphens
3. Remove non-alphanumeric characters (except hyphens)
4. Truncate to max 50 characters
5. Remove trailing hyphens

**Example transformations:**
- "Add OAuth 2.0 authentication" → `add-oauth-20-authentication`
- "Fix login bug when session expires" → `fix-login-bug-when-session-expires`
- "Investigate performance issues in dashboard API endpoints" → `investigate-performance-issues-in-dashboard-api`

## Phase 3: Create Research Directory

```bash
mkdir -p .project/research/NNNN-slug
```

Where `NNNN` is the auto-incremented number and `slug` is the generated slug.

## Phase 4: Spawn Codebase Researcher Agent

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► RESEARCH: EXPLORING CODEBASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spawn the `codebase-researcher` agent** using the Task tool with `model="opus"` and the following context:

```
<researcher_context>

## Research Details

- Research ID: NNNN
- Research Directory: .project/research/NNNN-slug
- Description: [Description from $ARGUMENTS]

## Codebase Context

Provide the content of:
- @.project/codebase/STACK.md
- @.project/codebase/STRUCTURE.md
- @.project/codebase/CONVENTIONS.md
- @.project/codebase/ARCHITECTURE.md

</researcher_context>

<output_requirements>

Write files to:
- `.project/research/NNNN-slug/RESEARCH.md`
- `.project/research/NNNN-slug/PROMPT.md`

</output_requirements>
```

**Wait for agent to complete and return confirmation.**

## Phase 5: Done

</process>

<output>

- `.project/research/NNNN-slug/RESEARCH.md`
- `.project/research/NNNN-slug/PROMPT.md`

</output>

<success_criteria>

- [ ] Prerequisites verified (codebase reference files exist)
- [ ] Research number determined (auto-incremented)
- [ ] Slug generated from description
- [ ] Research directory created at `.project/research/NNNN-slug/`
- [ ] RESEARCH.md populated with scope and complexity analysis
- [ ] PROMPT.md populated with AI-optimized feature bootstrap
- [ ] All placeholder sections filled with actual analysis

</success_criteria>

<completion_report>

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► RESEARCH COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Research NNNN: [Description]**

 Artifact   Location
-------------------------------------------------
 Analysis   `.project/research/NNNN-slug/RESEARCH.md`
 Prompt     `.project/research/NNNN-slug/PROMPT.md`

───────────────────────────────────────────────────────────────

## Summary

[Brief summary from RESEARCH.md]

- **Complexity:** [Low/Medium/High]
- **Files Affected:** [Count]
- **Key Risks:** [Top 1-2 risks]

───────────────────────────────────────────────────────────────

## ▶ Next Steps

1. Review the RESEARCH.md for detailed findings
2. Run `/clear` to clear the context
3. Run `/spec:new-feature --use-research NNNN` to create a feature specification

───────────────────────────────────────────────────────────────
```

Report to the user:
1. Research ID and directory location
2. Summary of findings (complexity, scope, risks)
3. Suggested next step

</completion_report>
