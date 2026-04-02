---
description: Rubber duck brainstorming - explore ideas through conversation and web research, then suggest next steps
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, AskUserQuestion, Skill
argument-hint: "[optional initial idea or question]"
---

<objective>

A conversational "rubber duck" command for exploring ideas through dialogue and web research, then recommending the appropriate spec workflow.

**This is a conversation, not a task.** Unlike other spec commands, brainstorm:
- Creates NO files (no RESEARCH.md, no PLAN.md, no artifacts)
- Spawns NO agents (conversation maintains context across rounds)
- Uses web research as a PRIMARY tool (search proactively, not on request)
- Ends with a recommendation and optional execution

</objective>

<process>

## Phase 1: Opening

**Display welcome banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► BRAINSTORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Let's think through this together.
```

**If `$ARGUMENTS` provided:**
- Acknowledge the starting point: "Starting with: [arguments]"
- Move directly into exploration

**If no arguments:**
- Ask an open-ended question: "What are you thinking about building, fixing, or exploring?"

## Phase 2: Exploratory Dialogue (3-5+ rounds)

**Be a thinking partner, not an interrogator.** The goal is to help the user clarify their own thinking.

**Questions to explore:**
- What problem are you trying to solve?
- Who or what is affected by this?
- What would success look like?
- Have you tried anything already?
- What constraints are you working with?
- Is this part of something larger?

**Scope probing (assess naturally during conversation):**
- Trivial: Single file, obvious change
- Small: 1-3 tasks, clear scope
- Medium: Multiple files, some complexity
- Large: Multiple phases, architectural impact
- Epic: Multiple features, significant initiative

**Web research — use PROACTIVELY:**
- When technologies, APIs, or libraries come up → search for docs and best practices
- When patterns or approaches are discussed → search for examples
- When tradeoffs are mentioned → search for comparisons
- Share findings conversationally: "I looked into [topic] and found..."

**Codebase exploration (when relevant):**
- Use Read, Glob, Grep to understand existing code
- "Let me check how this is currently handled in your codebase..."

**Continue until clear on:**
- What the user wants to accomplish (the goal)
- Why it matters (the motivation)
- Rough scope (trivial / small / medium / large / epic)
- Key constraints or requirements

## Phase 3: Alignment Check

Before making a recommendation, confirm understanding.

**Use AskUserQuestion to verify:**

```
AskUserQuestion(
  questions: [{
    question: "Here's what I understand: [summary]. Does this capture what you're thinking?",
    header: "Aligned?",
    options: [
      { label: "Yes, that's right", description: "Move to recommendation" },
      { label: "Mostly, but...", description: "Add clarification" },
      { label: "Not quite", description: "Let's keep talking" }
    ],
    multiSelect: false
  }]
)
```

**If not aligned:** Return to Phase 2 for more exploration.

## Phase 4: Recommendation

Based on the conversation, recommend ONE workflow:

| Scope | Recommendation | When to Use |
|-------|----------------|-------------|
| Trivial | "Just implement directly" | Single file, obvious fix, no planning needed |
| Small | `/spec:quick [task]` | 1-3 tasks, clear scope, can be done quickly |
| Unclear | `/spec:research [description]` | Need to explore codebase first, scope uncertain |
| Medium/Large | `/spec:new-feature [name]` | Multiple phases, well-defined requirements |
| Epic | `/spec:new-epic` | Multiple features, significant initiative |

**Present the recommendation with reasoning:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on our conversation, I recommend: [workflow]

**Why:** [1-2 sentences explaining the reasoning]

**Command:** `/spec:[command] [arguments]`
```

## Phase 5: Action Selection

**Use AskUserQuestion to determine next step:**

```
AskUserQuestion(
  questions: [{
    question: "How would you like to proceed?",
    header: "Next step",
    options: [
      { label: "Execute this for me", description: "I'll run the recommended command now" },
      { label: "I'll run it myself", description: "Show me the command to copy" },
      { label: "Let's keep talking", description: "I have more questions or want to explore further" },
      { label: "Never mind", description: "End the conversation" }
    ],
    multiSelect: false
  }]
)
```

**Handle each response:**

### "Execute this for me"

Use the Skill tool to invoke the recommended command:

```
Skill(
  skill: "spec:quick",
  args: "[task description]"
)
```

Or for other commands:
- `Skill(skill: "spec:research", args: "[description]")`
- `Skill(skill: "spec:new-feature", args: "[name]")`
- `Skill(skill: "spec:new-epic", args: "")`

### "I'll run it myself"

Display the command for copying:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 READY TO RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/spec:[command] [arguments]

Copy and run when you're ready.
```

### "Let's keep talking"

Return to Phase 2 for more exploration.

### "Never mind"

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► BRAINSTORM ENDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No problem! Come back anytime you want to think something through.
```

</process>

<conversation_guidelines>

## Be a Thinking Partner

- Share your thinking process, don't just ask questions
- "I'm wondering if..." / "One thing that comes to mind..." / "This reminds me of..."
- Research proactively — don't wait to be asked
- Don't rush to recommendations — the value is in the conversation

## Web Research is Primary

This command emphasizes web research. Use it liberally:
- Search for documentation, APIs, best practices
- Fetch detailed pages when summaries aren't enough
- Share findings naturally: "I found that [technology] recommends..."

## Don't Create Files

Unlike other spec commands, brainstorm creates NO artifacts:
- No RESEARCH.md
- No PLAN.md
- No state files
- Pure conversation

## Keep It Natural

- Avoid robotic question-answer patterns
- React to what the user says
- Build on previous points
- It's okay to go on tangents if they're productive

</conversation_guidelines>

<constraints>

- **NO file creation** — This command produces no artifacts
- **NO agent spawning** — Conversation stays in main context
- **Use Skill tool for execution** — When user chooses "Execute this for me"
- **Research proactively** — Don't wait for permission to search
- **Maintain conversational flow** — Not an interrogation

</constraints>
