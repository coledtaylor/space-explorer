---
name: progress-reporter
description: Standardize progress updates during long-running work. Use to keep the user informed, surface blockers, and manage token/time budgets.
allowed-tools: Read, Grep, Glob
---

# Progress Reporter Protocol

Keep the user informed. **Silence is not golden — it's a sign something is wrong.**

## Reporting Frequency

| Task Duration | Report Every |
|---------------|--------------|
| < 2 minutes | Start + End |
| 2-10 minutes | Every 2-3 actions |
| > 10 minutes | Every major step |

## Status Indicators

Use these consistently:

| Icon | Meaning |
|------|---------|
| 🔄 | In progress |
| ✅ | Completed successfully |
| ❌ | Failed |
| ⏸️ | Paused, waiting for input |
| ⚠️ | Warning, needs attention |
| 🔍 | Analyzing/researching |
| 🛠️ | Building/implementing |
| 🧪 | Testing/validating |

## Progress Report Templates

### Task Start
```markdown
## 🔄 Starting: [Task Name]

**Objective:** [One-line description]

**Approach:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Estimated scope:** [X files, Y changes]

---
```

### Progress Update (during task)
```markdown
## 🔄 Progress: [Task Name]

| Phase | Status |
|-------|--------|
| Analysis | ✅ Complete |
| Design | ✅ Complete |
| Implementation | 🔄 In progress (3/7 units) |
| Testing | ⏳ Pending |
| Integration | ⏳ Pending |

**Current:** Implementing UserService (unit 3 of 7)

**Completed this update:**
- ✅ Created User entity
- ✅ Added IUserRepository interface
- 🔄 UserService in progress

**Next:** Complete UserService, then UserController

---
```

### Milestone Complete
```markdown
## ✅ Milestone: [Milestone Name]

**Duration:** ~X minutes

**Deliverables:**
| Item | Files | Status |
|------|-------|--------|
| User entity | 1 | ✅ |
| User service | 2 | ✅ |
| Unit tests | 1 | ✅ |

**Validation:**
- Build: ✅ Passing
- Tests: ✅ 5/5 passing
- Lint: ✅ No warnings

**Ready for:** [Next milestone or user review]

---
```

### Task Complete
```markdown
## ✅ Complete: [Task Name]

### Summary
| Metric | Value |
|--------|-------|
| Files created | X |
| Files modified | Y |
| Lines added | ~Z |
| Tests added | N |
| Build status | ✅ |
| Test status | ✅ |

### What Was Built
[2-3 sentence description]

### Files Changed
<details>
<summary>Click to expand (X files)</summary>

| File | Change |
|------|--------|
| src/Models/User.cs | Created |
| src/Services/UserService.cs | Created |
| ... | ... |

</details>

### How to Verify
```bash
[Commands to test the implementation]
```

### Potential Follow-ups
- [ ] [Optional improvement 1]
- [ ] [Optional improvement 2]
```

## Token Budget Awareness

### Tracking Heuristics

Monitor these signals that you're consuming too many tokens:

1. **File count** — Edited >10 files without checkpoint
2. **Iteration count** — Made >5 attempts at same problem  
3. **Uncertainty** — Asked yourself "I think this might work" >2 times
4. **Scope creep** — Task grew beyond original description
5. **Time** — Been working >10 minutes without user interaction

### Budget Warning Template
```markdown
## ⚠️ Token Budget Check

**Task:** [Original task description]

**Progress:**
- Started: [What was requested]
- Current: [What I'm now doing]
- Completed: [X]% 

**Concern:** [Why I'm pausing]
- [ ] Task larger than expected
- [ ] Hit unexpected complexity  
- [ ] Multiple failed attempts
- [ ] Scope has expanded
- [ ] Need clarification

**Options:**
A) **Continue as-is** — Estimated [Y] more steps
B) **Reduce scope** — Deliver [partial feature] now, rest later
C) **Get guidance** — [Specific question]

**My recommendation:** [A/B/C] because [reason]

**⏸️ WAITING — How should I proceed?**
```

### Scope Creep Alert
```markdown
## ⚠️ Scope Expansion Detected

**Original request:**
> [Quote original task]

**What I've discovered needs to happen:**
1. [Originally requested item] ✅
2. [Additional item discovered] ⚠️ NEW
3. [Another additional item] ⚠️ NEW

**Impact:**
- Original estimate: ~X files, Y changes
- Revised estimate: ~A files, B changes

**Options:**
A) **Full scope** — Do everything, larger token cost
B) **Original only** — Skip new items, may have issues
C) **Phased** — Original now, new items as follow-up task

**⏸️ WAITING — Which approach?**
```

## Error Reporting

When something goes wrong, report immediately:

```markdown
## ❌ Error Encountered

**Task:** [What I was trying to do]

**Error:**
```
[Error message or description]
```

**Analysis:**
- **Cause:** [Why this happened]
- **Impact:** [What this blocks]
- **Recoverable:** Yes/No

**Options:**
A) [Fix attempt 1]
B) [Alternative approach]
C) [Skip and continue with workaround]

**⏸️ WAITING — How should I handle this?**
```

## Sub-Agent Coordination Reports

When orchestrating multiple agents:

```markdown
## 🔄 Orchestration Status

| Agent | Task | Status | Output |
|-------|------|--------|--------|
| @agent-code-archaeologist | Analyze codebase | ✅ Complete | Found MVC pattern |
| @agent-csharp-expert | Implement service | 🔄 Running | — |
| @agent-react-component-architect | Build UI | ⏳ Queued | — |

**Current:** csharp-expert implementing UserService

**Blockers:** None

**Next checkpoint:** After csharp-expert completes

---
```

## Communication Principles

1. **Be specific** — "Created UserService.cs with 3 methods" not "Made progress"
2. **Be honest** — Report failures immediately, don't hide issues
3. **Be concise** — Use tables and bullets, not paragraphs
4. **Be actionable** — Always include "what's next" or "what I need"
5. **Be predictable** — Use consistent formats so users can skim

## Anti-Patterns

❌ **Radio silence** — Working for 5+ minutes with no update  
❌ **Wall of text** — Dumping unformatted logs or code  
❌ **Vague status** — "Working on it" without specifics  
❌ **Hidden failures** — Continuing after errors without reporting  
❌ **Over-reporting** — Update after every single line of code  
❌ **Burying the lede** — Important info hidden in paragraphs  

**Visibility builds trust. Trust enables autonomy. Autonomy with checkpoints = optimal results.**

