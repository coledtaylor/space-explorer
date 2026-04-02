---
description: Initialize a new project by mapping the codebase and creating reference files for Claude Code agents
allowed-tools: Read, Write, Bash, Task, Glob, Grep
---

<objective>

Initialize a new project by spawning parallel mapper agents to analyze the codebase and create structured reference files.

**Creates (via spawned agents):**
- `.project/codebase/STACK.md` — technology stack analysis
- `.project/codebase/STRUCTURE.md` — project directory layout
- `.project/codebase/CONVENTIONS.md` — code patterns and standards
- `.project/codebase/ARCHITECTURE.md` — system architecture overview

**After this command:** Run `/spec:new-feature` to create feature specifications.

</objective>

<execution_context>

- Project CLAUDE.md: @CLAUDE.md
- Current directory structure: !`find . -type f -name "*.json" -o -name "*.md" -o -name "*.csproj" -o -name "*.sln" -o -name "tsconfig*" -o -name "*.config.*" 2>/dev/null | head -50`
- Package files: !`cat package.json 2>/dev/null || echo "No package.json found"`
- Git info: !`git remote -v 2>/dev/null | head -2`

</execution_context>

<process>

## Phase 1: Setup

**MANDATORY FIRST STEP — Execute these checks before ANY user interaction:**

1. **Abort if project already initialized:**
   ```bash
   [ -d .project/codebase ] && echo "ERROR: Project already initialized. Codebase reference files exist." && exit 1
   ```

2. **Create the reference directory structure:**
   ```bash
   mkdir -p .project/codebase
   ```

**You MUST run all bash commands above using the Bash tool before proceeding.**

## Phase 2: Spawn Mapper Agents

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► SPAWNING CODEBASE MAPPERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Spawn 4 project-mapper agents in parallel using the Task tool:**

Each agent receives a focus area and writes its document directly to `.project/codebase/`.

### Agent 1: Stack Mapper
```
Task: project-mapper
model="opus"

Focus: stack

Analyze the technology stack and dependencies for this codebase.
Write your findings directly to `.project/codebase/STACK.md`.

Include:
- Languages and versions
- Runtime environment
- Frameworks (core, testing, build)
- Key dependencies with purposes
- Database and storage
- External integrations
- Platform requirements

Be thorough. Include file paths. Return only confirmation when complete.
```

### Agent 2: Structure Mapper
```
Task: project-mapper
model="opus"

Focus: structure

Analyze the directory layout and file organization for this codebase.
Write your findings directly to `.project/codebase/STRUCTURE.md`.

Include:
- Directory layout with purposes
- Key file locations (entry points, config, core logic, tests)
- Naming conventions for files and directories
- Where to add new code (features, components, utilities)
- Special directories (generated, not committed)

Be thorough. Include file paths. Return only confirmation when complete.
```

### Agent 3: Conventions Mapper
```
Task: project-mapper
model="opus"

Focus: conventions

Analyze the coding patterns and standards for this codebase.
Write your findings directly to `.project/codebase/CONVENTIONS.md`.

Include:
- Naming patterns (files, functions, variables, types)
- Code style (formatting, linting)
- Import organization and path aliases
- Error handling patterns
- Logging patterns
- Comment conventions
- Function and module design patterns
- Testing conventions (framework, organization, mocking)

Be thorough. Include file paths. Return only confirmation when complete.
```

### Agent 4: Architecture Mapper
```
Task: project-mapper
model="opus"

Focus: architecture

Analyze the system design and architecture for this codebase.
Write your findings directly to `.project/codebase/ARCHITECTURE.md`.

Include:
- System type (monolith, microservices, monorepo, library)
- Architectural layers with purposes and locations
- Data flow patterns
- Key abstractions and their implementations
- Entry points
- Error handling strategy
- Cross-cutting concerns (logging, validation, auth)

Be thorough. Include file paths. Return only confirmation when complete.
```

**IMPORTANT:** Spawn all 4 agents using the Task tool. They will run in parallel and write their documents directly. Wait for all agents to complete before proceeding.

## Phase 3: Verify and Complete

**After all agents complete:**

1. **Verify all files were created:**
   ```bash
   ls -la .project/codebase/
   ```

2. **Check file contents are non-empty:**
   ```bash
   wc -l .project/codebase/*.md
   ```

If any files are missing or empty, note which agents failed and report to user.

## Phase 4: Done

</process>

<output>

**Files written by spawned agents:**
- `.project/codebase/STACK.md` — written by stack mapper agent
- `.project/codebase/STRUCTURE.md` — written by structure mapper agent
- `.project/codebase/CONVENTIONS.md` — written by conventions mapper agent
- `.project/codebase/ARCHITECTURE.md` — written by architecture mapper agent

</output>

<success_criteria>

- [ ] .project/codebase/ directory created
- [ ] 4 project-mapper agents spawned successfully
- [ ] All 4 agents completed and returned confirmation
- [ ] STACK.md captures technologies with versions and file paths
- [ ] STRUCTURE.md maps directory layout with where-to-add guidance
- [ ] CONVENTIONS.md documents patterns with code examples
- [ ] ARCHITECTURE.md explains system design with layer locations
- [ ] All documents contain actual file paths (not placeholders)

</success_criteria>

<completion_report>

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► PROJECT INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Mapper Agent    Status    Document                         
-------------------------------------------------------------
 stack           ✓         `.project/codebase/STACK.md`     
 structure       ✓         `.project/codebase/STRUCTURE.md` 
 conventions     ✓         `.project/codebase/CONVENTIONS.md`
 architecture    ✓         `.project/codebase/ARCHITECTURE.md`

───────────────────────────────────────────────────────────────

## ▶ Next Steps

1. Review generated files and refine as needed
2. Run `/spec:new-feature [description]` to create a feature specification

───────────────────────────────────────────────────────────────
```

Report to the user:
1. Agent completion status (all 4 should succeed)
2. Line counts for each generated document
3. Any areas that need manual refinement
4. Suggested next steps

</completion_report>
