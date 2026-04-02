---
description: Refresh the .project/codebase files after significant project changes
argument-hint: "[--full]"
allowed-tools: Read, Write, Bash, Task, Glob, Grep
---

<objective>

Refresh `.project/codebase/` files by spawning parallel mapper agents to re-analyze the codebase and update reference files.

**When to use:**
- After significant code changes (major refactoring, new modules)
- After dependency updates (package.json, *.csproj, requirements.txt)
- After architecture evolution (new services, changed patterns)
- Periodically to keep reference files current

**Updates (via spawned agents):**
- `.project/codebase/STACK.md` — technology stack analysis
- `.project/codebase/STRUCTURE.md` — project directory layout
- `.project/codebase/CONVENTIONS.md` — code patterns and standards
- `.project/codebase/ARCHITECTURE.md` — system architecture overview

**Flags:**
- `--full` — Force complete refresh of all files, even if no changes detected

</objective>

<execution_context>

- Project CLAUDE.md: @CLAUDE.md
- Current directory structure: !`find . -type f -name "*.json" -o -name "*.md" -o -name "*.csproj" -o -name "*.sln" -o -name "tsconfig*" -o -name "*.config.*" 2>/dev/null | head -50`
- Package files: !`cat package.json 2>/dev/null || echo "No package.json found"`
- Git info: !`git remote -v 2>/dev/null | head -2`

</execution_context>

<process>

## Phase 1: Validate Environment

**MANDATORY FIRST STEP — Execute these checks before ANY user interaction:**

1. **Verify project is initialized:**
   ```bash
   [ ! -d .project/codebase ] && echo "ERROR: Project not initialized. Run /spec:new-project first." && exit 1
   ```

2. **Check which files exist:**
   ```bash
   ls -la .project/codebase/
   ```

3. **Analyze recent changes (unless --full):**
   ```bash
   git diff --stat HEAD~10 2>/dev/null | tail -30
   ```

**You MUST run all bash commands above using the Bash tool before proceeding.**

## Phase 2: Read Existing Files

Read current `.project/codebase/` files to pass to mapper agents as context:

```bash
STACK_CONTENT=$(cat .project/codebase/STACK.md 2>/dev/null || echo "")
STRUCTURE_CONTENT=$(cat .project/codebase/STRUCTURE.md 2>/dev/null || echo "")
CONVENTIONS_CONTENT=$(cat .project/codebase/CONVENTIONS.md 2>/dev/null || echo "")
ARCHITECTURE_CONTENT=$(cat .project/codebase/ARCHITECTURE.md 2>/dev/null || echo "")
```

Store these for inclusion in agent prompts.

## Phase 3: Spawn Mapper Agents

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► REFRESHING CODEBASE MAPPERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spawn 4 project-mapper agents in parallel using the Task tool:**

Each agent receives a focus area, the existing file content, and updates the document in `.project/codebase/`.

### Agent 1: Stack Mapper
```
Task: project-mapper
model="opus"

Focus: stack
Mode: refresh

Re-analyze the technology stack and dependencies for this codebase.
Update `.project/codebase/STACK.md` with current state.

**Existing content to update:**
{STACK_CONTENT}

**Instructions:**
- Preserve any `<!-- manual -->` ... `<!-- /manual -->` sections unchanged
- Add changelog entry at top: `- YYYY-MM-DD: Refreshed - [summary of changes]`
- Update versions, add new dependencies, remove deprecated ones
- Keep accurate file paths

Include:
- Languages and versions
- Runtime environment
- Frameworks (core, testing, build)
- Key dependencies with purposes
- Database and storage
- External integrations
- Platform requirements

Be thorough. Include file paths. Return summary of changes made.
```

### Agent 2: Structure Mapper
```
Task: project-mapper
model="opus"

Focus: structure
Mode: refresh

Re-analyze the directory layout and file organization for this codebase.
Update `.project/codebase/STRUCTURE.md` with current state.

**Existing content to update:**
{STRUCTURE_CONTENT}

**Instructions:**
- Preserve any `<!-- manual -->` ... `<!-- /manual -->` sections unchanged
- Add changelog entry at top: `- YYYY-MM-DD: Refreshed - [summary of changes]`
- Add new directories, remove deleted ones, update descriptions
- Keep accurate file paths

Include:
- Directory layout with purposes
- Key file locations (entry points, config, core logic, tests)
- Naming conventions for files and directories
- Where to add new code (features, components, utilities)
- Special directories (generated, not committed)

Be thorough. Include file paths. Return summary of changes made.
```

### Agent 3: Conventions Mapper
```
Task: project-mapper
model="opus"

Focus: conventions
Mode: refresh

Re-analyze the coding patterns and standards for this codebase.
Update `.project/codebase/CONVENTIONS.md` with current state.

**Existing content to update:**
{CONVENTIONS_CONTENT}

**Instructions:**
- Preserve any `<!-- manual -->` ... `<!-- /manual -->` sections unchanged
- Add changelog entry at top: `- YYYY-MM-DD: Refreshed - [summary of changes]`
- Add newly discovered patterns, note deprecated ones
- Update examples if patterns have evolved

Include:
- Naming patterns (files, functions, variables, types)
- Code style (formatting, linting)
- Import organization and path aliases
- Error handling patterns
- Logging patterns
- Comment conventions
- Function and module design patterns
- Testing conventions (framework, organization, mocking)

Be thorough. Include file paths. Return summary of changes made.
```

### Agent 4: Architecture Mapper
```
Task: project-mapper
model="opus"

Focus: architecture
Mode: refresh

Re-analyze the system design and architecture for this codebase.
Update `.project/codebase/ARCHITECTURE.md` with current state.

**Existing content to update:**
{ARCHITECTURE_CONTENT}

**Instructions:**
- Preserve any `<!-- manual -->` ... `<!-- /manual -->` sections unchanged
- Add changelog entry at top: `- YYYY-MM-DD: Refreshed - [summary of changes]`
- Add new services/modules, update changed responsibilities
- Update diagrams if architecture has changed

Include:
- System type (monolith, microservices, monorepo, library)
- Architectural layers with purposes and locations
- Data flow patterns
- Key abstractions and their implementations
- Entry points
- Error handling strategy
- Cross-cutting concerns (logging, validation, auth)

Be thorough. Include file paths. Return summary of changes made.
```

**IMPORTANT:** Spawn all 4 agents using the Task tool. They will run in parallel and update their documents directly. Wait for all agents to complete before proceeding.

## Phase 4: Verify and Complete

**After all agents complete:**

1. **Verify all files still exist:**
   ```bash
   ls -la .project/codebase/
   ```

2. **Check file contents are non-empty:**
   ```bash
   wc -l .project/codebase/*.md
   ```

If any files are missing or empty, note which agents failed and report to user.

</process>

<output>

**Files updated by spawned agents:**
- `.project/codebase/STACK.md` — updated by stack mapper agent
- `.project/codebase/STRUCTURE.md` — updated by structure mapper agent
- `.project/codebase/CONVENTIONS.md` — updated by conventions mapper agent
- `.project/codebase/ARCHITECTURE.md` — updated by architecture mapper agent

</output>

<success_criteria>

- [ ] .project/codebase/ directory exists
- [ ] 4 project-mapper agents spawned successfully
- [ ] All 4 agents completed and returned change summaries
- [ ] STACK.md updated with current versions and dependencies
- [ ] STRUCTURE.md updated with current directory layout
- [ ] CONVENTIONS.md updated with current patterns
- [ ] ARCHITECTURE.md updated with current design
- [ ] All `<!-- manual -->` sections preserved unchanged
- [ ] Changelog entries added to each updated file
- [ ] All documents contain actual file paths (not placeholders)

</success_criteria>

<completion_report>

Present completion with change summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► PROJECT REFRESHED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Mapper Agent    Status    Changes                          
-------------------------------------------------------------
 stack           ✓         [summary from agent]             
 structure       ✓         [summary from agent]             
 conventions     ✓         [summary from agent]             
 architecture    ✓         [summary from agent]             

───────────────────────────────────────────────────────────────

**Preserved Manual Sections:**
- [List any <!-- manual --> sections that were preserved]

**Files Updated:**
- `.project/codebase/STACK.md`
- `.project/codebase/STRUCTURE.md`
- `.project/codebase/CONVENTIONS.md`
- `.project/codebase/ARCHITECTURE.md`

───────────────────────────────────────────────────────────────
```

If no changes were needed (agents report no updates):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► PROJECT CURRENT ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All `.project/codebase/` files are up to date.

Last verified: YYYY-MM-DD

───────────────────────────────────────────────────────────────
```

</completion_report>
