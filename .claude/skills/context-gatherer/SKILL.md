---
name: context-gatherer
description: Identifies and gathers project context from documentation directories and files. Use when starting work on a project, feature, or task to understand the codebase, architecture, planning state, and conventions. Supports multiple spec-driven frameworks.
allowed-tools: Read, Grep, Glob, Bash
---

# Context Gatherer Protocol

Before starting any significant work, **gather relevant context** from the project's documentation structure.

## Purpose

Projects often contain structured documentation in well-known locations. Multiple spec-driven development frameworks exist, each with their own conventions. This skill helps you systematically discover and load context regardless of which framework (or combination) the project uses:

- **claude-spec** — `.project/` structure with features, roadmaps, and plans
- **spec-kit** (GitHub) — `.specify/` structure with constitution, specs, and memory
- **get-shit-done** (GSD) — `.planning/` structure with research, plans, and summaries

## Context Discovery Process

```
┌─────────────────────────────────────────────┐
│  1. SCAN for context directories/files      │
├─────────────────────────────────────────────┤
│  2. DETECT which framework(s) are in use    │
├─────────────────────────────────────────────┤
│  3. IDENTIFY what context is available      │
├─────────────────────────────────────────────┤
│  4. PRIORITIZE based on current task        │
├─────────────────────────────────────────────┤
│  5. LOAD relevant context files             │
├─────────────────────────────────────────────┤
│  6. SUMMARIZE key findings                  │
└─────────────────────────────────────────────┘
```

## Known Context Locations

Run the discovery script to identify available context:

```bash
# Unix/Linux/Mac
bash ~/.claude/skills/context-gatherer/scripts/discover-context.sh .

# Windows PowerShell
powershell -File ~/.claude/skills/context-gatherer/scripts/discover-context.ps1 .
```

### Framework Detection

The discovery script automatically detects which framework(s) are present:

| Indicator | Framework | What it means |
|-----------|-----------|---------------|
| `.project/` exists | claude-spec | Features, roadmaps, state tracking |
| `.specify/` exists | spec-kit | Constitution, specs, plans, tasks |
| `.planning/` + `PROJECT.md` | get-shit-done | Research, plans, summaries, verification |
| `memory/` with `constitution.md` | spec-kit (legacy layout) | Governance and memory files |

Multiple frameworks can coexist. Load context from all detected sources.

### Primary Context Sources (Universal)

| Location     | Purpose                                      | Priority    |
|--------------|----------------------------------------------|-------------|
| `CLAUDE.md`  | Root agent instructions, project conventions | Critical |
| `AGENTS.md`  | Agent definitions and capabilities           | Critical |
| `.claude/`   | Claude Code configuration and skills         | High     |
| `README.md`  | Project overview                             | Medium   |
| `docs/`      | General documentation                        | Medium   |
| `.github/`   | CI/CD, templates, workflows                  | Low      |

### claude-spec Context Sources

| Location | Purpose | Priority |
|----------|---------|----------|
| `.project/codebase/` | Architecture, conventions, stack analysis | High |
| `.project/features/NNNN/ROADMAP.md` | Feature goals and phase descriptions | High |
| `.project/features/NNNN/STATE.md` | Execution progress, decisions, blockers | High |
| `.project/features/NNNN/phases/N/PLAN.md` | Task definitions with files, actions, verification | High |
| `.project/features/NNNN/phases/N/VERIFICATION.md` | Goal verification reports | Medium |

### spec-kit Context Sources

| Location | Purpose | Priority |
|----------|---------|----------|
| `.specify/memory/constitution.md` | Non-negotiable project principles and governance | Critical |
| `.specify/memory/` | Persistent context across sessions | High |
| `.specify/specs/NNN-feature/spec.md` | Feature specification and requirements | High |
| `.specify/specs/NNN-feature/plan.md` | Technical implementation plan | High |
| `.specify/specs/NNN-feature/tasks.md` | Actionable task breakdown | High |
| `.specify/templates/` | Command and document templates | Medium |
| `.specify/scripts/` | Automation scripts | Low |
| `memory/constitution.md` | Constitution (legacy/root layout) | Critical |
| `memory/` | Memory files (legacy/root layout) | High |
| `specs/` | Specs directory (legacy/root layout) | High |

### get-shit-done (GSD) Context Sources

| Location | Purpose | Priority |
|----------|---------|----------|
| `PROJECT.md` | Project vision, always loaded during sessions | Critical |
| `REQUIREMENTS.md` | Scoped requirements with phase traceability | High |
| `ROADMAP.md` | Milestone phases and completion status | High |
| `STATE.md` | Decisions, blockers, position across sessions | High |
| `.planning/research/` | Ecosystem knowledge (stack, features, pitfalls) | High |
| `.planning/{phase}-CONTEXT.md` | Implementation decisions per phase | High |
| `.planning/{phase}-{N}-PLAN.md` | Atomic task plans with XML structure | High |
| `.planning/{phase}-{N}-SUMMARY.md` | Execution summaries per task | Medium |
| `.planning/{phase}-VERIFICATION.md` | Phase verification results | Medium |
| `.planning/{phase}-UAT.md` | User acceptance testing results | Medium |
| `.planning/quick/` | Ad-hoc task plans and summaries | Medium |
| `.planning/todos/` | Captured ideas for future work | Low |
| `.planning/config.json` | Project settings (mode, depth, models) | Low |
| `HANDOFF.md` | Session transition context | High |

### Context File Patterns

Within these directories, look for:

| Pattern            | Contains                    |
|--------------------|-----------------------------|
| `*.md`             | Documentation, specs, plans |
| `SKILL.md`         | Skill definitions           |
| `*.yml` / `*.yaml` | Configuration, workflows    |
| `*.json`           | Configuration, metadata     |
| `index.*`          | Entry points / summaries    |
| `README.*`         | Directory overviews         |
| `constitution.md`  | Project governance (spec-kit) |
| `STATE.md`         | Session state (claude-spec, GSD) |
| `ROADMAP.md`       | Phase overview (claude-spec, GSD) |
| `PROJECT.md`       | Project vision (GSD) |
| `HANDOFF.md`       | Session handoff (GSD) |

## Context Loading Strategy

### For New Projects
Load everything in this order:
1. `CLAUDE.md` — Understand conventions
2. `AGENTS.md` — Know available agents
3. Framework-specific governance:
   - claude-spec: `.project/codebase/` files
   - spec-kit: `.specify/memory/constitution.md` (or `memory/constitution.md`)
   - GSD: `PROJECT.md` + `REQUIREMENTS.md`
4. `README.md` — Project purpose

### For Feature Work
Focus on relevant context:
1. `CLAUDE.md` — Always load first
2. Current planning state:
   - claude-spec: `.project/features/NNNN/STATE.md` + `ROADMAP.md`
   - spec-kit: `.specify/specs/NNN-feature/spec.md` + `plan.md`
   - GSD: `STATE.md` + `ROADMAP.md` + `.planning/{phase}-CONTEXT.md`
3. Feature specifications and plans
4. Related source directories

### For Bug Fixes
Target specific areas:
1. `CLAUDE.md` — Conventions
2. Related test files
3. Error logs / stack traces
4. Relevant verification reports (any framework)

### For Session Resumption
When picking up where a previous session left off:
1. `STATE.md` or `HANDOFF.md` — Where things stand
2. Active phase plans — What was in progress
3. Verification/summary files — What was completed

## Context Summary Template

After gathering context, create a summary:

```markdown
## Context Summary

**Project:** [Name from README or CLAUDE.md]
**Framework(s):** [claude-spec | spec-kit | GSD | custom | none detected]

### Key Conventions
- [Convention 1 from CLAUDE.md]
- [Convention 2 from constitution.md if spec-kit]

### Current State
- **Planning Phase:** [From STATE.md, .planning/, or .specify/]
- **Active Features:** [List]
- **Known Blockers:** [Any documented issues]

### Relevant Specs
- [Spec 1]: [Brief description]
- [Spec 2]: [Brief description]

### Agent Capabilities
- [Agent 1]: [What it does]
- [Agent 2]: [What it does]
```

## Integration with Other Skills

Context gathering should precede:
- **incremental-implementation** — Know conventions before coding
- **checkpoint-execution** — Understand milestone structure
- **progress-reporter** — Know what to report on

## Best Practices

1. **Always check CLAUDE.md first** — It contains critical instructions
2. **Check for governance docs** — `constitution.md` (spec-kit) or `PROJECT.md` (GSD) set non-negotiable rules
3. **Don't load everything** — Be selective based on task
4. **Note missing context** — Identify gaps for the user
5. **Cache findings** — Summarize once, reference throughout task
6. **Update context** — If you create docs, add them to appropriate locations
7. **Respect framework conventions** — Don't mix file layouts across frameworks

## Troubleshooting

### No Context Found
If discovery finds no context directories:
1. You may be in a new/unconfigured project
2. Check if context is in non-standard locations
3. Ask user where project documentation lives

### Multiple Frameworks Detected
If more than one framework is present:
1. Check which is actively maintained (recent file modifications)
2. Look for CLAUDE.md instructions specifying the preferred workflow
3. Ask user which framework is primary if unclear

### Too Much Context
If context exceeds practical limits:
1. Prioritize by task relevance
2. Read summaries/indexes first
3. Load detailed files only when needed

### Conflicting Context
If multiple files give conflicting information:
1. Prefer `CLAUDE.md` over other sources
2. Prefer `constitution.md` for governance decisions (spec-kit)
3. Prefer newer files over older
4. Ask user to clarify if critical
