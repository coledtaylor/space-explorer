---
name: checkpoint-execution
description: Enforces mandatory user checkpoints during multi-step agent tasks. Use during multi-file or multi-milestone work to pause for user approval at key checkpoints.
allowed-tools: Read, Grep, Glob
---

# Checkpoint Execution Protocol

Stop running autonomously. **Pause at every checkpoint and wait for user approval before continuing.**

## Critical Rules

1. **NEVER implement more than one milestone without user approval**
2. **ALWAYS show your plan before executing**
3. **STOP and report when hitting uncertainty** — don't guess
4. **SUMMARIZE changes at each checkpoint** with file:line references
5. **NEVER attempt the same fix more than 2 times** — escalate to user

## Error Loop Protection

**MANDATORY**: Track and limit fix attempts to prevent infinite debugging loops.

### The 2-Attempt Rule

When encountering an error during implementation:

| Attempt | Action |
|---------|--------|
| 1st | Try to fix. If it fails, try ONE alternative approach. |
| 2nd | If still failing, **MANDATORY STOP**. Do not try again. |

### What Counts as "Same Error"

- Same error message or error code
- Same file/line failing validation
- Same test failing
- Logically equivalent issue (e.g., different syntax error in same function)

### Error Tracking Template

Maintain a mental log during implementation:

```
Error: [Error type/message]
Attempt 1: [What I tried] → [Result]
Attempt 2: [What I tried] → [Result]
→ STOP: Escalating to user
```

### Mandatory Escalation Checkpoint

After 2 failed attempts, you MUST stop and present:

```
## 🛑 CHECKPOINT: Error Loop Detected — Human Input Required

### Error
```
[Exact error message]
```

### What I Tried
| Attempt | Approach | Result |
|---------|----------|--------|
| 1 | [Description of first fix] | ❌ [Why it failed] |
| 2 | [Description of second fix] | ❌ [Why it failed] |

### Analysis
- **Root cause hypothesis:** [Your best guess]
- **Why fixes didn't work:** [What you learned]
- **Blocking factor:** [What's preventing resolution]

### Options for User
A) **Provide guidance** — Tell me what to try next
B) **Take over** — Handle this manually, I'll continue with other tasks
C) **Skip** — Mark as known issue and proceed without fixing
D) **Investigate** — I'll gather more diagnostic info (specify what)

### Context Dump
<details>
<summary>Relevant code and logs</summary>

[Include relevant snippets, stack traces, or diagnostic output]

</details>

⏸️ **HARD STOP** — I will NOT attempt another fix without your direction.
```

### Prohibited Behaviors

- ❌ **Retry loop** — Trying same fix 3+ times
- ❌ **Variation loop** — Trying minor variations of failed approach (counts as same attempt)
- ❌ **Silent retry** — Retrying without documenting the attempt
- ❌ **Hope-driven development** — "Maybe this time it will work"
- ❌ **Scope expansion** — Rewriting large sections to "fix" a small error
- ❌ **Ignoring errors** — Continuing to next task with broken code

### Early Warning Signs

Stop BEFORE hitting 2 attempts if you notice:

- The same error keeps appearing in different forms
- Each fix creates a new error (whack-a-mole)
- You're not sure WHY the fix should work
- The fix requires changing code you don't fully understand
- You're tempted to "try something" without a clear hypothesis

When in doubt: **STOP and ASK**.

---

## Checkpoint Milestones

Every multi-step task MUST pause at these milestones:

### Milestone 1: Analysis Complete
After understanding the codebase and requirements:

```
## ✅ CHECKPOINT: Analysis Complete

### What I Found
- [Key findings about codebase structure]
- [Relevant existing patterns/code]
- [Dependencies and constraints]

### Proposed Approach
1. [Step 1 description]
2. [Step 2 description]
...

### Files I'll Modify
| File | Change Type | Reason |
|------|-------------|--------|
| path/to/file.cs | Create | New service class |
| path/to/other.ts | Modify | Add import and usage |

### Estimated Scope
- Files: X new, Y modified
- Complexity: Low/Medium/High

⏸️ WAITING FOR APPROVAL — Reply 'continue' or provide feedback
```

### Milestone 2: After Each Implementation Unit
After implementing each logical unit (1-3 files max):

```
## ✅ CHECKPOINT: [Unit Name] Implemented

### Changes Made
| File:Line | Change | Status |
|-----------|--------|--------|
| src/Services/UserService.cs:1-45 | Created service | ✅ Compiles |
| src/Models/User.cs:12 | Added property | ✅ Compiles |

### Validation
- Compiles: Yes/No
- Tests pass: Yes/No/N/A
- Lint clean: Yes/No

### Next Unit
[Description of next implementation unit]

⏸️ WAITING FOR APPROVAL — Reply 'continue', 'show code', or provide feedback
```

### Milestone 3: Before Integration/Wiring
Before connecting components or making breaking changes:

```
## ✅ CHECKPOINT: Ready to Integrate

### Components Built
1. [Component A] — status
2. [Component B] — status

### Integration Plan
- [How components will be connected]
- [Breaking changes if any]
- [Rollback approach]

⏸️ WAITING FOR APPROVAL — This step may break existing functionality
```

### Milestone 4: Task Complete
After all implementation:

```
## ✅ CHECKPOINT: Task Complete

### Summary
| Metric | Value |
|--------|-------|
| Files created | X |
| Files modified | Y |
| Tests added | Z |
| Build status | Pass/Fail |

### What Was Built
[2-3 sentence summary]

### How to Test
[Commands to run/test the feature]

### Known Limitations
- [Any shortcuts taken]
- [Future improvements needed]

✅ COMPLETE — Ready for review or further instructions
```

## Uncertainty Protocol

If you encounter ANY of these, STOP immediately and ask:

- Ambiguous requirements
- Multiple valid approaches (present options)
- Missing dependencies or configuration
- Existing code that conflicts with requirements
- Security-sensitive operations
- Database schema changes
- External API integrations

Format:

```
## ⚠️ CHECKPOINT: Clarification Needed

### Question
[Specific question]

### Options (if applicable)
A) [Option A with tradeoffs]
B) [Option B with tradeoffs]

### My Recommendation
[Which option and why]

⏸️ WAITING FOR DIRECTION
```

## Token Budget Awareness

Monitor your progress and alert when:
- Task is taking longer than expected
- You've made 5+ file changes without checkpoint
- You're about to start a large refactor

```
## ⚠️ CHECKPOINT: Scope Check

This task is larger than initially estimated.

### Completed
- [What's done]

### Remaining  
- [What's left]

### Recommendation
[Continue / Break into smaller tasks / Get more direction]

⏸️ WAITING — Should I continue or adjust approach?
```

## Anti-Patterns (DO NOT DO)

- ❌ Implementing entire features without pausing  
- ❌ Making assumptions when requirements are unclear  
- ❌ Modifying more than 3 files without a checkpoint  
- ❌ Skipping validation steps (compile, test, lint)  
- ❌ Starting implementation before showing analysis  
- ❌ Continuing after encountering errors without reporting
- ❌ **Attempting the same fix more than twice** — HARD RULE
- ❌ **Debugging in circles** — If you tried it already, don't try it again
- ❌ **Blind fixing** — Making changes without understanding the root cause  

## Integration with Sub-Agents

When delegating to sub-agents, enforce checkpoints:

1. Sub-agent completes → checkpoint before next sub-agent
2. Never run more than 2 sub-agents in parallel without consolidation checkpoint
3. Each sub-agent result must be validated before proceeding

**Remember: The user WANTS to be involved. Pausing is not slowing down — it's preventing costly rework.**

