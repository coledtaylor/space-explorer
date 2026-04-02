---
description: Initialize workspace context by discovering and mapping multiple repos
allowed-tools: Read, Write, Bash, Task, Glob, Grep, AskUserQuestion
---

<objective>

Initialize workspace context by discovering repositories in the current directory, mapping each repo individually, then synthesizing cross-repo relationships.

**Creates (via spawned agents):**
- `.project/repos/{repo-name}/SUMMARY.md` — condensed repository summary for each discovered repo
- `.project/workspace/OVERVIEW.md` — workspace-level overview with shared stack and repo descriptions
- `.project/workspace/RELATIONSHIPS.md` — cross-repo dependencies, API calls, and data flow

**Prerequisites:** Run this command from a parent directory containing multiple project repositories.

**After this command:** Review the generated summaries and workspace documentation to understand both individual repos and cross-repo relationships.

</objective>

<execution_context>

- Project CLAUDE.md: @CLAUDE.md
- Current directory: !`pwd`
- Subdirectories: !`ls -1 -d */ 2>/dev/null | head -20`

</execution_context>

<process>

## Phase 1: Prerequisites and Discovery

**MANDATORY FIRST STEP — Execute before ANY user interaction:**

### 1.1 Check if already initialized

```bash
if [ -d .project/repos ]; then
  echo "WARNING: .project/repos/ already exists"
  echo "SHOULD_WARN=true"
else
  echo "SHOULD_WARN=false"
fi
```

If `.project/repos/` exists, use AskUserQuestion to confirm:
- header: "Workspace already initialized"
- question: "The .project/repos/ directory already exists. How would you like to proceed?"
- options:
  - "Re-scan and overwrite" — Delete existing summaries and re-map all repos
  - "Abort" — Stop without making changes

If "Abort" selected, stop execution and display: "Workspace initialization cancelled."

If "Re-scan and overwrite" selected, display: "Existing summaries will be overwritten." and proceed.

### 1.2 Discover repositories

Scan immediate subdirectories for project marker files:
- `.git` — Git repository
- `package.json` — Node.js project
- `go.mod` — Go module
- `Cargo.toml` — Rust project
- `pyproject.toml` — Python project (Poetry/PEP 517)
- `*.sln` — .NET solution
- `*.csproj` — .NET C# project

**Discovery script:**

```bash
# Scan immediate subdirectories for project markers
for dir in */; do
  dir=${dir%/}  # Remove trailing slash
  markers=""

  # Check for each marker type
  [ -d "$dir/.git" ] && markers="$markers .git"
  [ -f "$dir/package.json" ] && markers="$markers package.json"
  [ -f "$dir/go.mod" ] && markers="$markers go.mod"
  [ -f "$dir/Cargo.toml" ] && markers="$markers Cargo.toml"
  [ -f "$dir/pyproject.toml" ] && markers="$markers pyproject.toml"
  [ -n "$(find "$dir" -maxdepth 1 -name "*.sln" 2>/dev/null)" ] && markers="$markers *.sln"
  [ -n "$(find "$dir" -maxdepth 1 -name "*.csproj" 2>/dev/null)" ] && markers="$markers *.csproj"

  # If markers found, print directory and markers
  if [ -n "$markers" ]; then
    echo "$dir|$markers"
  fi
done
```

Parse the output to build a list of discovered repos with their markers.

### 1.3 Handle no projects found

If no projects discovered, display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► NO PROJECTS FOUND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No projects found in subdirectories.

Ensure you are running from a parent directory containing project repos.

Marker files checked:
- .git (Git repository)
- package.json (Node.js)
- go.mod (Go)
- Cargo.toml (Rust)
- pyproject.toml (Python)
- *.sln (. NET solution)
- *.csproj (.NET C# project)

───────────────────────────────────────────────────────────────
```

Stop execution.

## Phase 2: User Confirmation

**Display discovered repos:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► DISCOVERED REPOSITORIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Repository           Markers Detected
──────────────────────────────────────────────────────
 [repo-1]             [.git, package.json]
 [repo-2]             [.git, go.mod]
 [repo-3]             [.git, Cargo.toml]
 ...

Found [N] repositories.

───────────────────────────────────────────────────────────────
```

**Confirm with user using AskUserQuestion:**

- header: "Include all repos?"
- question: "Found [N] repositories. How would you like to proceed?"
- options:
  - "Include all [N] repos" — Map all discovered repositories
  - "Let me exclude some" — I'll select which repos to include
  - "Cancel" — Stop without making changes

### If "Include all [N] repos" selected:
Proceed to Phase 3 with all discovered repos.

### If "Let me exclude some" selected:
Use iterative AskUserQuestion to let user exclude repos:

```
For each discovered repo, ask:

AskUserQuestion:
- header: "Include {repo-name}?"
- question: "Include {repo-name} in workspace mapping? (Detected: {markers})"
- options:
  - "Include" — Map this repository
  - "Exclude" — Skip this repository
```

Build a final list of included repos.

### If "Cancel" selected:
Display: "Workspace initialization cancelled." and stop execution.

## Phase 3: Per-Repo Mapping

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► MAPPING REPOSITORIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Spawning workspace-project-mapper agents for [N] repositories...

───────────────────────────────────────────────────────────────
```

### 3.1 Create output directories

For each included repo:

```bash
mkdir -p .project/repos/{repo-name}
```

### 3.2 Spawn mapper agents in parallel

For each included repo, spawn one `workspace-project-mapper` agent using the Task tool:

```
Task: workspace-project-mapper
model="opus"

**Repo Name:** {repo-name}
**Repo Path:** {absolute-path-to-repo}
**Output Path:** .project/repos/{repo-name}/SUMMARY.md

Explore this repository and write a condensed summary (~100-150 lines) to the output path.

Include all 7 sections:
1. Purpose (2-3 sentences: what this repo does, who it serves)
2. Tech Stack (languages, frameworks, key dependencies)
3. Key Entry Points (main files, CLI entry, API routes -- with file paths)
4. Project Structure (condensed directory tree, key directories only)
5. Key Abstractions (important types, patterns, architectural concepts)
6. Unique Conventions (anything that differs from standard patterns)
7. API Surface / Public Interface (what this repo exposes to other repos or users)

Be concise. Include file paths. Return only confirmation when complete.
```

**IMPORTANT:** Spawn ALL agents in parallel using multiple Task calls. Wait for all agents to complete before proceeding.

## Phase 4: Verify and Report

**After all agents complete:**

### 4.1 Verify all files created

```bash
echo "Verifying SUMMARY.md files..."
ls -la .project/repos/*/SUMMARY.md 2>/dev/null
```

### 4.2 Check file contents are non-empty

```bash
echo "Checking line counts..."
wc -l .project/repos/*/SUMMARY.md
```

If any files are missing or empty, note which repos failed and report to user.

### 4.3 Display intermediate report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► PER-REPO MAPPING COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Repository           Status    Document
──────────────────────────────────────────────────────────────
 [repo-1]             ✓         `.project/repos/{repo-1}/SUMMARY.md`
 [repo-2]             ✓         `.project/repos/{repo-2}/SUMMARY.md`
 [repo-3]             ✓         `.project/repos/{repo-3}/SUMMARY.md`
 ...

───────────────────────────────────────────────────────────────

**[N] repositories mapped successfully.**

Each repository now has a condensed SUMMARY.md with:
- Purpose and tech stack
- Key entry points and structure
- Unique conventions
- Public interface / API surface

Proceeding to workspace synthesis...

───────────────────────────────────────────────────────────────
```

**Report details:**
- Total repos discovered
- Total repos included (after user selection)
- Line count for each SUMMARY.md
- Any repos that failed mapping

## Phase 5: Workspace Synthesis

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► SYNTHESIZING WORKSPACE RELATIONSHIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing cross-repo patterns and dependencies...

───────────────────────────────────────────────────────────────
```

### 5.1 Create workspace directory

```bash
mkdir -p .project/workspace
```

### 5.2 Spawn workspace-relationship-mapper agent

Spawn the `workspace-relationship-mapper` agent using the Task tool:

```
Task: workspace-relationship-mapper
model="opus"

**Repos Mapped:** [list of repo names from the included repos list]

Read all `.project/repos/*/SUMMARY.md` files and synthesize cross-repo relationships.

Write two documents to `.project/workspace/`:

1. **OVERVIEW.md** (~60-100 lines):
   - Shared technology stack across repos
   - Overall workspace purpose/description
   - 2-3 sentence description of each repo

2. **RELATIONSHIPS.md** (~80-120 lines):
   - Cross-repo API calls/dependencies
   - Shared types/schemas/contracts
   - Data flow patterns between repos
   - Deployment dependencies and ordering

Use Glob to discover SUMMARY.md files dynamically. Read all summaries before writing. Return only confirmation when complete.
```

Wait for the agent to complete.

### 5.3 Verify workspace documents created

```bash
echo "Verifying workspace documents..."
ls -la .project/workspace/OVERVIEW.md .project/workspace/RELATIONSHIPS.md 2>/dev/null
```

### 5.4 Check file contents are non-empty

```bash
echo "Checking line counts..."
wc -l .project/workspace/OVERVIEW.md .project/workspace/RELATIONSHIPS.md
```

If any files are missing or empty, report to user.

## Phase 6: Final Report

### 6.1 Display completion report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► WORKSPACE INITIALIZATION COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Per-Repo Summaries

 Repository           Status    Document
──────────────────────────────────────────────────────────────
 [repo-1]             ✓         `.project/repos/{repo-1}/SUMMARY.md` ([N] lines)
 [repo-2]             ✓         `.project/repos/{repo-2}/SUMMARY.md` ([N] lines)
 [repo-3]             ✓         `.project/repos/{repo-3}/SUMMARY.md` ([N] lines)
 ...

## Workspace Synthesis

 Document                Status    Path
──────────────────────────────────────────────────────────────
 OVERVIEW.md             ✓         `.project/workspace/OVERVIEW.md` ([N] lines)
 RELATIONSHIPS.md        ✓         `.project/workspace/RELATIONSHIPS.md` ([N] lines)

───────────────────────────────────────────────────────────────

## Summary

**Repositories analyzed:** [N]
**Per-repo summaries:** [N] SUMMARY.md files
**Workspace documents:** 2 (OVERVIEW.md, RELATIONSHIPS.md)

───────────────────────────────────────────────────────────────

## What Was Created

**Per-Repo Analysis:**
Each repository has a SUMMARY.md with:
- Purpose and tech stack
- Key entry points and structure
- Unique conventions
- Public interface / API surface

**Workspace Synthesis:**
- **OVERVIEW.md** — Shared stack, workspace purpose, repo descriptions
- **RELATIONSHIPS.md** — Cross-repo dependencies, API calls, data flow, deployment order

───────────────────────────────────────────────────────────────

## Next Steps

1. Review `.project/workspace/OVERVIEW.md` for workspace-level understanding
2. Review `.project/workspace/RELATIONSHIPS.md` for cross-repo dependencies
3. Review individual `.project/repos/{repo-name}/SUMMARY.md` files for repo-specific details
4. Use this context when planning features that span multiple repos

───────────────────────────────────────────────────────────────
```

**Report details:**
- Total repos discovered and included
- Line count for each SUMMARY.md
- Line count for OVERVIEW.md and RELATIONSHIPS.md
- Any files that failed creation
- Clear summary of what was created and why it's useful

## Phase 7: Done

</process>

<output>

**Files written by spawned agents:**

**Per-Repo Mapping:**
- `.project/repos/{repo-name}/SUMMARY.md` — written by workspace-project-mapper agent for each included repo

**Workspace Synthesis:**
- `.project/workspace/OVERVIEW.md` — written by workspace-relationship-mapper agent (shared stack, workspace purpose, repo descriptions)
- `.project/workspace/RELATIONSHIPS.md` — written by workspace-relationship-mapper agent (cross-repo dependencies, API calls, data flow, deployment order)

</output>

<success_criteria>

**Per-Repo Mapping:**
- [ ] `.project/repos/` directory created or re-scan confirmed
- [ ] Subdirectories scanned for all 7 marker file types
- [ ] Zero-repos-found handled gracefully with clear message
- [ ] Discovered repos displayed in formatted table
- [ ] User confirmation via AskUserQuestion for repo selection
- [ ] Output directories created for each included repo
- [ ] workspace-project-mapper agents spawned in parallel via Task tool
- [ ] All agents completed and returned confirmation
- [ ] All SUMMARY.md files created and non-empty

**Workspace Synthesis:**
- [ ] `.project/workspace/` directory created
- [ ] workspace-relationship-mapper agent spawned via Task tool
- [ ] Agent discovered all SUMMARY.md files via Glob
- [ ] OVERVIEW.md created and non-empty
- [ ] RELATIONSHIPS.md created and non-empty

**Completion:**
- [ ] Final report includes per-repo summary table with line counts
- [ ] Final report includes workspace document table with line counts
- [ ] Next steps clearly guide user to review outputs

</success_criteria>

<completion_report>

Present completion with full workspace status (see Phase 6.1 above for format).

Report to the user:
1. Number of repos discovered and included (after user selection)
2. Per-repo mapper agent completion status with line counts for each SUMMARY.md
3. Workspace synthesis completion status with line counts for OVERVIEW.md and RELATIONSHIPS.md
4. Any files that failed creation (repos or workspace documents)
5. Summary of what was created and its purpose
6. Next steps for reviewing and using the workspace context

</completion_report>
