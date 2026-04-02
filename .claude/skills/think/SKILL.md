---
name: think
description: Lightweight deliberate reasoning before making changes. Invoke when you want more thought behind quick iterations without full planning overhead.
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
---

# Think-First Protocol

Pause and reason before acting. **Scale your thinking to the size of the change.**

## When This Skill is Active

The user has explicitly asked for more deliberate reasoning. They're doing quick, iterative work but want you to think a bit harder — not plan formally, not create files, just be more intentional.

## Core Behavior

### 1. Proportional Reasoning

Match thinking effort to change complexity:

| Change Size | Reasoning Effort |
|---|---|
| Rename, typo, formatting | None — just do it |
| Small edit with clear intent | One sentence: "Doing X because Y" |
| Choice between approaches | Brief comparison: "X vs Y — going with X because..." |
| Structural change | Short analysis: what exists, what changes, why this approach |
| Touching multiple files | Explain the ripple: what each file change accomplishes |

**Don't over-think trivial changes. Don't under-think structural ones.**

### 2. Proactive Research

When you're not 100% certain about something — search instead of guessing:

- API or library behavior you're not sure about → quick web search
- How something is currently used in the codebase → grep/glob before changing
- Best practice for a pattern → search for it

Share findings naturally: "Checked the docs — turns out X supports Y natively, so we don't need the workaround."

### 3. Surface Tradeoffs

When multiple valid approaches exist, name them briefly:

```
Going with X here. Considered Y (simpler but less flexible)
and Z (more robust but overkill for this). X fits because [reason].
```

Don't write an essay. One or two sentences is enough. The point is to make the reasoning visible so the user can course-correct if they disagree.

### 4. Scope Awareness

If a tweak is growing into something bigger, say so early:

- "This is touching more files than expected — still want me to continue inline or step back?"
- "This change has implications for [other area] — want to address that now or separately?"
- "This started as a tweak but it's really a small refactor — want to keep going or use /spec:quick?"

Don't escalate prematurely. Flag when the scope has genuinely shifted, not on every minor ripple.

### 5. Stay Conversational

This is not a formal process. No banners, no structured phases, no checkpoints. Just:

- Think out loud briefly before non-obvious changes
- Research when uncertain
- Surface choices instead of silently making them
- Flag scope shifts when they happen

## What This Skill is NOT

- **Not a planning tool** — No files created, no formal structure
- **Not a checkpoint system** — Don't stop and wait for approval on every change
- **Not always-on** — Only active when the user explicitly invokes it
- **Not a substitute for `/spec:quick`** — If the task clearly needs a plan, suggest escalating

## Integration with Other Skills

Think pairs naturally with:

- **incremental-implementation** — Think provides the reasoning, incremental provides the execution discipline
- **checkpoint-execution** — If think identifies growing scope, checkpoints handle the pause points

## Anti-Patterns

- Reasoning paragraph before a one-line change
- Asking "should I proceed?" after every observation
- Turning every tradeoff into a formal options list
- Researching things you already know well
- Creating files or artifacts of any kind
