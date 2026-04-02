# Context Locations Reference

This document provides detailed information about each context location that agents should check.

## Critical Context (Always Read)

### CLAUDE.md

**Location:** `./CLAUDE.md` (project root)

**Purpose:** The primary instruction file for Claude agents working in this project.

**Contains:**
- Project conventions and coding standards
- Technology stack preferences
- Forbidden patterns or anti-patterns
- Workflow instructions
- Links to other important documentation

**When to read:** Always, before any work begins.

**Example structure:**
```markdown
# Project Name

## Overview
Brief description of the project.

## Tech Stack
- Language: TypeScript
- Framework: React
- Testing: Jest

## Conventions
- Use functional components
- Prefer named exports
- Always write tests

## Forbidden
- No class components
- No any types
```

---

### Agents.md

**Location:** `./Agents.md` or `./agents.md`

**Purpose:** Defines available specialized agents and their capabilities.

**Contains:**
- Agent names and descriptions
- Agent capabilities and tools
- When to delegate to specific agents
- Agent configuration

**When to read:** When you need to delegate work or understand available capabilities.

---

### .claude/

**Location:** `./.claude/`

**Purpose:** Claude Code configuration directory.

**Contains:**
- `skills/` — Custom skill definitions
- `commands/` — Custom slash commands
- `agents/` — Subagent definitions
- `settings.json` — Local settings

**When to read:** When working with Claude Code features or custom workflows.

---

## High Priority Context

### .project/

**Location:** `./.project/`

**Purpose:** Project metadata and architecture documentation.

**Common contents:**
- `architecture.md` — System architecture overview
- `decisions/` — Architecture Decision Records (ADRs)
- `stack.md` — Technology stack details
- `structure.md` — Directory structure explanation
- `glossary.md` — Project-specific terminology

**When to read:** When understanding the big picture or making architectural changes.

---

### .planning/

**Location:** `./.planning/` or `./planning/`

**Purpose:** Active planning state and decision tracking.

**Common contents:**
- `current-phase.md` — What phase the project is in
- `roadmap.md` — Feature roadmap
- `features/` — Individual feature plans
- `decisions/` — Planning decisions
- `backlog.md` — Pending work items

**When to read:** When starting new work or understanding current project state.

**Example structure:**
```
.planning/
├── current-phase.md      # "Phase 2: Core Features"
├── roadmap.md            # Q1-Q4 feature timeline
├── features/
│   ├── auth.md           # Authentication feature spec
│   ├── api.md            # API feature spec
│   └── dashboard.md      # Dashboard feature spec
└── decisions/
    └── 001-database.md   # Why we chose PostgreSQL
```

---

## Medium Priority Context

### spec/

**Location:** `./spec/` or `./specs/`

**Purpose:** Detailed feature specifications.

**Common contents:**
- Feature requirement documents
- API specifications
- User story definitions
- Acceptance criteria
- Wireframes or mockups (referenced)

**When to read:** When implementing a specific feature.

---

### docs/

**Location:** `./docs/` or `./documentation/`

**Purpose:** General project documentation.

**Common contents:**
- API documentation
- User guides
- Developer guides
- Deployment documentation
- Troubleshooting guides

**When to read:** When you need reference material or are documenting changes.

---

## Low Priority Context

### README.md

**Location:** `./README.md`

**Purpose:** Project overview and getting started guide.

**Contains:**
- Project description
- Installation instructions
- Basic usage examples
- Links to further documentation

**When to read:** For initial project orientation.

---

### .github/

**Location:** `./.github/`

**Purpose:** GitHub-specific configuration.

**Contains:**
- `workflows/` — CI/CD pipeline definitions
- `CODEOWNERS` — Code ownership rules
- `ISSUE_TEMPLATE/` — Issue templates
- `PULL_REQUEST_TEMPLATE.md` — PR template

**When to read:** When working with CI/CD or understanding project processes.

---

### CONTRIBUTING.md

**Location:** `./CONTRIBUTING.md`

**Purpose:** Contribution guidelines.

**Contains:**
- How to contribute
- Code style requirements
- PR process
- Testing requirements

**When to read:** Before making contributions (especially in open source).

---

### ARCHITECTURE.md

**Location:** `./ARCHITECTURE.md`

**Purpose:** High-level architecture documentation.

**Contains:**
- System components
- Data flow diagrams
- Integration points
- Deployment architecture

**When to read:** When understanding system design.

---

## Context in Other Files

Beyond these directories, context may exist in:

| File | Contains |
|------|----------|
| `package.json` | Node.js dependencies, scripts |
| `pyproject.toml` | Python project config |
| `Cargo.toml` | Rust project config |
| `*.csproj` | .NET project config |
| `Makefile` | Build tasks and shortcuts |
| `docker-compose.yml` | Service architecture |
| `.env.example` | Environment variables |

---

## Creating Missing Context

If critical context is missing, consider creating it:

### Minimal CLAUDE.md

```markdown
# [Project Name]

## Tech Stack
- [Language]
- [Framework]
- [Database]

## Conventions
- [Key convention 1]
- [Key convention 2]

## Getting Started
```bash
[install command]
[run command]
```
```

### Minimal .planning/current-phase.md

```markdown
# Current Phase

**Phase:** [Name]
**Started:** [Date]
**Goal:** [One-line goal]

## Active Work
- [ ] [Task 1]
- [ ] [Task 2]

## Completed
- [x] [Done task]
```
