---
description: Archive spec features by moving `.project/features/NNNN/` into `.project/archive/NNNN/`. Use when a feature is 100% complete, or to force-archive a specific feature ID.
argument-hint: [feature-id]
allowed-tools: Read, Glob, Grep, Bash
---

# Spec Complete Feature

Archive completed features to remove them from active working context. Moves feature directories from `.project/features/` to `.project/archive/`.

## Core Purpose

- Clean up completed work from active features directory
- Reduce context noise for agents working on other features
- Preserve completed feature history in archive
- Validate completion status before archiving

## Usage

```
/complete-feature           # Archive ALL 100% complete features
/complete-feature 0001      # Archive specific feature by ID
```

---

## Phase 1: Parse Arguments

### Argument Resolution

```
IF argument provided as 4-digit feature ID (e.g., "0001"):
    mode = SINGLE
    target_id = argument
ELSE IF no argument:
    mode = ALL
    target_id = null
```

### Validate Base Structure

1. Verify `.project/features/` directory exists
2. If archiving all: scan for feature directories
3. If archiving single: verify target feature exists

If validation fails:

```
COMPLETE FEATURE: Cannot Archive
================================================================

Error: [specific missing item]

Required structure:
  .project/
    features/
      NNNN/
        ROADMAP.md
        phases/
          phase-N/
            PLAN.md

No features found to archive.
================================================================
```

---

## Phase 2: Scan for Completion Status

### For Single Feature Mode

**Step 1: Check STATE.md Phase Progress (fast path)**

1. Read `STATE.md` in `.project/features/{target_id}/`
2. Parse the Phase Progress table
3. Check if ALL phases show `✅ Complete` status
4. If any phase is not complete (`⬜ Pending`, `🔄 In Progress`, etc.), feature is incomplete

**Step 2: Verify with PLAN.md task counts (detailed check)**

1. Read all `PLAN.md` files in `.project/features/{target_id}/phases/*/`
2. Count total tasks: `- [ ] **[TASK-` and `- [x] **[TASK-` patterns
3. Count completed tasks: `- [x] **[TASK-` patterns
4. Calculate completion percentage

### For All Features Mode

1. List all directories in `.project/features/`
2. For each feature directory:
   - First check STATE.md Phase Progress table (fast path)
   - If all phases show `✅ Complete`, verify with PLAN.md scan
   - Calculate completion percentage
3. Filter to only 100% complete features

### Completion Detection

A feature is 100% complete when BOTH conditions are met:
- **STATE.md check**: All phases in Phase Progress table show `✅ Complete`
- **PLAN.md check**: Every task checkbox is marked `[x]` (no `[ ]` remain)

The dual-check ensures:
- STATE.md provides fast detection of incomplete features
- PLAN.md provides authoritative task-level verification

### STATE.md Phase Progress Table Format

The Phase Progress table uses these status indicators:

| Status | Meaning |
|--------|---------|
| `⬜ Pending` | Phase not started |
| `🔄 In Progress` | Phase currently executing |
| `✅ Complete` | Phase fully complete |
| `❌ Failed` | Phase failed, needs intervention |
| `⏸️ Blocked` | Phase blocked by dependency |

Example STATE.md Phase Progress table:
```markdown
| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: Core | ✅ Complete | 2026-01-15 | 2026-01-15 |
| Phase 2: API | ✅ Complete | 2026-01-16 | 2026-01-17 |
| Phase 3: UI | ⬜ Pending | — | — |
```

### Grep Patterns

Prefer `Grep` for portability (instead of shell `grep`). Example patterns:

**For incomplete tasks:**
- Path: `.project/features/NNNN/phases/`
- Regex: `^\s*- \[ \] \*\*\[TASK-`

**For complete phases in STATE.md:**
- Path: `.project/features/NNNN/STATE.md`
- Regex: `✅ Complete`

(If you do use shell tools, adapt commands to the user's environment.)

---

## Phase 3: Verify Before Archiving

### For 100% Complete Features

Proceed directly to archiving.

### For Incomplete Features (Single Mode Only)

If user requests archiving a feature that is NOT 100% complete:

```
COMPLETE FEATURE: Confirmation Required
================================================================

Feature 0001 is NOT fully complete.

Current Status:
  [########............] 40% Complete

  | Metric   | Count |
  |----------|-------|
  | Total    | 10    |
  | Complete | 4     |
  | Pending  | 6     |

Incomplete Tasks:
  - [ ] TASK-2.3  Implement validation
  - [ ] TASK-2.4  Add error handling
  - [ ] TASK-3.1  Build UI component
  - [ ] TASK-3.2  Add state management
  - [ ] TASK-3.3  Connect to API
  - [ ] TASK-3.4  Write integration tests

================================================================
WARNING: Archiving incomplete features may lose track of pending work.
================================================================

Reply 'yes' to archive anyway, or 'no' to cancel.
================================================================
```

**STOP and wait for user confirmation before proceeding.**

---

## Phase 4: Create Archive Directory

### Directory Structure

```
.project/
  features/          # Active features
    0001/
    0002/
  archive/           # Completed features (create if missing)
    0001/
```

### Create Archive Directory

```bash
mkdir -p .project/archive
```

---

## Phase 5: Move Feature to Archive

### Move Command

For each feature being archived:

```bash
mv .project/features/NNNN .project/archive/NNNN
```

### Verify Move Success

After moving, verify:
1. Source directory no longer exists: `.project/features/NNNN`
2. Target directory exists: `.project/archive/NNNN`
3. All files transferred (check file count matches)

---

## Phase 6: Generate Report

### Single Feature Archive Output

```
FEATURE ARCHIVED
================================================================

Feature: 0001 - [Feature Name]
Archived: YYYY-MM-DD HH:MM

================================================================
ARCHIVE SUMMARY
================================================================

| Metric          | Value                         |
|-----------------|-------------------------------|
| Feature ID      | 0001                          |
| Feature Name    | [Name from ROADMAP.md]        |
| Phases          | N                             |
| Total Tasks     | NN                            |
| Completion      | 100%                          |
| Previous Path   | .project/features/0001/       |
| Archive Path    | .project/archive/0001/        |

================================================================

Feature 0001 has been archived.
It will no longer appear in active feature lists.

To view archived features: ls .project/archive/
To restore: mv .project/archive/0001 .project/features/0001

================================================================
```

### Multiple Features Archive Output

```
FEATURES ARCHIVED
================================================================

Archived: YYYY-MM-DD HH:MM
Features Processed: N

================================================================
ARCHIVED FEATURES
================================================================

| Feature | Name                    | Phases | Tasks | Status   |
|---------|-------------------------|--------|-------|----------|
| 0001    | User Authentication     | 4      | 16    | Archived |
| 0003    | API Rate Limiting       | 2      | 8     | Archived |
| 0005    | Dashboard Widgets       | 3      | 12    | Archived |

================================================================
SUMMARY
================================================================

| Metric              | Value |
|---------------------|-------|
| Features Archived   | 3     |
| Total Phases        | 9     |
| Total Tasks         | 36    |
| Active Remaining    | 2     |

================================================================

Archived features moved to: .project/archive/
They will no longer appear in active feature lists.

To view archived features: ls .project/archive/
To restore a feature: mv .project/archive/NNNN .project/features/NNNN

================================================================
```

### No Features to Archive Output

```
COMPLETE FEATURE: Nothing to Archive
================================================================

No 100% complete features found.

Active Features:
| Feature | Name                | Progress |
|---------|---------------------|----------|
| 0002    | Payment Processing  | 75%      |
| 0004    | Email Notifications | 50%      |

Complete features before archiving, or specify a feature ID
to force-archive an incomplete feature:

  /complete-feature 0002

================================================================
```

---

## Error Handling

| Scenario | Output |
|----------|--------|
| No features directory | "No features found. Run `/new-feature` first." |
| Feature ID not found | "Feature {NNNN} not found. Available: {list}" |
| Archive directory creation fails | "Failed to create archive directory. Check permissions." |
| Move operation fails | "Failed to move feature {NNNN}. Error: {details}" |
| Feature already in archive | "Feature {NNNN} is already archived." |

### Move Failure Recovery

If move fails mid-operation:

```
COMPLETE FEATURE: Archive Failed
================================================================

Error moving feature 0001 to archive.

Error: [specific error message]

Current State:
  Source exists: Yes/No
  Target exists: Yes/No

Recovery Options:
A) Retry the archive operation
B) Manually move: mv .project/features/0001 .project/archive/0001
C) Check file permissions and disk space

No changes have been made to other features.
================================================================
```

---

## Implementation Notes

### Efficient Completion Check

Use grep to quickly determine completion status:

Prefer tool-based counting for portability:

1. Use `Grep` to locate task lines:
   - Total tasks regex: `^\s*- \[[ x]\] \*\*\[TASK-`
   - Completed tasks regex: `^\s*- \[x\] \*\*\[TASK-`
2. Count matches from the Grep results.

(Only use shell pipelines like `grep | wc -l` when you specifically know a POSIX shell is available.)

### Feature Name Extraction

Extract feature name from ROADMAP.md:

```bash
# First heading in ROADMAP.md typically contains feature name
head -5 .project/features/NNNN/ROADMAP.md | grep "^# "
```

### Safe Move Operation

1. Verify source exists before moving
2. Create archive directory if needed
3. Perform move
4. Verify target exists after move
5. Report success or failure

---

## Critical Rules

1. **ALWAYS verify completion status** before archiving without confirmation
2. **NEVER archive incomplete features silently** - require explicit user confirmation
3. **ALWAYS create archive directory** if it doesn't exist
4. **VERIFY move success** - confirm source removed and target created
5. **PRESERVE all feature content** - move entire directory, not individual files
6. **REPORT clear summary** - user must know exactly what was archived
7. **PROVIDE restore instructions** - user should know how to undo if needed

---

## Integration with Other Commands

This command complements:
- `/progress` - Check completion status before archiving
- `/new-feature` - Creates features that will eventually be archived
- `/execute-task` - Completes tasks toward 100%
- `/execute-phase` - Completes phases toward 100%

Typical workflow:
1. `/progress` - Verify feature is 100% complete
2. `/complete-feature 0001` - Archive the completed feature
3. Continue working on remaining active features
