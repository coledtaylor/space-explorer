---
description: Quick workflow for small tasks. Creates a plan or executes it.
allowed-tools: Read, Write, Glob, Grep, Bash, Task
argument-hint: "[task description] [--use-research NNNN] [--execute] [--clean]"
---

<objective>
To handle small tasks quickly without the overhead of full feature planning.
Two modes:
1. **Planning (Default):** Researches the request and creates a plan in `.project/quick/`.
2. **Execution (`--execute`):** Executes the plan in `.project/quick/`.
</objective>

<process>

## Argument Parsing

**Check flags:**
- `--execute`: Plan and execute (or execute existing plan if no task description provided)
- `--clean`: Remove existing `.project/quick` directory before starting
- `--use-research NNNN`: Use pre-analyzed research context from `/spec:research`

**Input:** `$ARGUMENTS`

**Parse `--use-research` flag (if provided):**

Check if `$ARGUMENTS` contains `--use-research NNNN`:
- Extract the research ID (NNNN)
- Verify the research directory exists: `.project/research/NNNN-*/PROMPT.md`
- If research ID provided but not found, inform user and stop: "Research NNNN not found. Run `/spec:research` first or check the research ID."

```bash
# Find research directory matching the ID
RESEARCH_ID=$(echo "$ARGUMENTS" | grep -oE '\-\-use-research\s+[0-9]+' | grep -oE '[0-9]+')
if [ -n "$RESEARCH_ID" ]; then
  RESEARCH_DIR=$(ls -d .project/research/${RESEARCH_ID}-* 2>/dev/null | head -1)
  if [ -n "$RESEARCH_DIR" ] && [ -f "$RESEARCH_DIR/PROMPT.md" ]; then
    echo "Research found: $RESEARCH_DIR"
    RESEARCH_CONTEXT=$(cat "$RESEARCH_DIR/PROMPT.md")
  else
    echo "ERROR: Research $RESEARCH_ID not found."
    echo "Run '/spec:research' first or check the research ID."
    exit 1
  fi
fi
```

## Mode 1: Planning Only (No --execute flag)

**Default behavior:** Plan and stop for user review.

1.  **Check for existing plan:**
    ```bash
    if [ -f .project/quick/PLAN.md ]; then
        echo "ERROR: A quick plan already exists at .project/quick/PLAN.md"
        echo "Options:"
        echo "  - Review the plan and run '/spec:quick --execute' to execute it"
        echo "  - Run '/spec:quick [new task description] --clean' to create a new plan"
        exit 1
    fi
    ```

2.  **Setup:**
    ```bash
    mkdir -p .project/quick
    ```

3.  **Spawn Planner:**

    If research context is available (from `--use-research` flag), include it in the prompt:
    ```
    Task(
      subagent_type="quick-planner",
      model="opus",
      prompt="Research the request: '{task_description}'. Create a plan at .project/quick/PLAN.md.

<research_context>
{RESEARCH_CONTEXT}

NOTE: This is a QUICK PLAN (1-3 tasks maximum), not a full feature. Use the research to understand scope and files, but create only a small, focused plan for the immediate request. If the scope is too large for a quick plan, note this in your summary.
</research_context>",
      description="Quick plan: {task_description}"
    )
    ```

    If no research context, use the standard prompt:
    ```
    Task(
      subagent_type="quick-planner",
      model="opus",
      prompt="Research the request: '{task_description}'. Create a plan at .project/quick/PLAN.md.",
      description="Quick plan: {task_description}"
    )
    ```
    Wait for the planner agent to complete before proceeding.

4.  **Report completion:**
    ```
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     SPEC ► QUICK PLAN CREATED ✓
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    Plan created at: .project/quick/PLAN.md

    Next steps:
      1. Review the plan
      2. Run '/spec:quick --execute' to execute it
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ```

## Mode 2: Execution (--execute flag)

**Two behaviors:**
- If task description provided: Plan and execute immediately
- If no task description: Execute existing plan

### Case A: Task Description + --execute (Plan and Execute)

1.  **Clean if requested:**
    ```bash
    if [[ "$ARGUMENTS" == *"--clean"* ]]; then
        rm -rf .project/quick
    fi
    ```

2.  **Check for existing plan (unless cleaning):**
    ```bash
    if [ -f .project/quick/PLAN.md ] && [[ "$ARGUMENTS" != *"--clean"* ]]; then
        echo "ERROR: A quick plan already exists. Use --clean to overwrite."
        exit 1
    fi
    ```

3.  **Setup:**
    ```bash
    mkdir -p .project/quick
    ```

4.  **Spawn Planner:**

    If research context is available (from `--use-research` flag), include it in the prompt:
    ```
    Task(
      subagent_type="quick-planner",
      model="opus",
      prompt="Research the request: '{task_description}'. Create a plan at .project/quick/PLAN.md.

<research_context>
{RESEARCH_CONTEXT}

NOTE: This is a QUICK PLAN (1-3 tasks maximum), not a full feature. Use the research to understand scope and files, but create only a small, focused plan for the immediate request. If the scope is too large for a quick plan, note this in your summary.
</research_context>",
      description="Quick plan: {task_description}"
    )
    ```

    If no research context, use the standard prompt:
    ```
    Task(
      subagent_type="quick-planner",
      model="opus",
      prompt="Research the request: '{task_description}'. Create a plan at .project/quick/PLAN.md.",
      description="Quick plan: {task_description}"
    )
    ```
    **Wait for the planner agent to complete before proceeding.**

5.  **Read plan content and spawn Executor:**

    Read the plan file contents before spawning — `@` syntax does not work across Task boundaries:
    ```bash
    PLAN_CONTENT=$(cat .project/quick/PLAN.md)
    ```

    ```
    Task(
      subagent_type="quick-executor",
      model="sonnet",
      prompt="Execute all tasks in the following plan.\n\n<plan>\n{PLAN_CONTENT}\n</plan>",
      description="Quick execute: {task_description}"
    )
    ```

6.  **Report result based on executor output:**

    Parse the executor's return message and display the appropriate banner (see Completion Banners below).

### Case B: --execute Only (Execute Existing Plan)

1.  **Check for plan:**
    ```bash
    if [ ! -f .project/quick/PLAN.md ]; then
        echo "ERROR: No quick plan found."
        echo "Run '/spec:quick [task description]' to create a plan first."
        exit 1
    fi
    ```

2.  **Read plan content and spawn Executor:**

    Read the plan file contents before spawning:
    ```bash
    PLAN_CONTENT=$(cat .project/quick/PLAN.md)
    ```

    ```
    Task(
      subagent_type="quick-executor",
      model="sonnet",
      prompt="Execute all tasks in the following plan.\n\n<plan>\n{PLAN_CONTENT}\n</plan>",
      description="Quick execute"
    )
    ```

3.  **Report result based on executor output:**

    Parse the executor's return message and display the appropriate banner (see Completion Banners below).

</process>

<completion_banners>

## Completion Banners

After the executor returns, display the appropriate banner based on the result:

**Success (executor returns `QUICK COMPLETE`):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► QUICK EXECUTION COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{Tasks completed, files modified, and validation summary from executor report}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Blocked (executor returns `QUICK BLOCKED`):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEC ► QUICK EXECUTION BLOCKED ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{Blocker details, attempts made, and recommendation from executor report}

Options:
  - Fix the issue manually, then run '/spec:quick --execute' to retry
  - Run '/spec:quick [new task description] --clean' to start over

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</completion_banners>
