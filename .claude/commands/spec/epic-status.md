---
name: spec:epic-status
description: Show epic progress across milestones and linked features
allowed-tools: Read, Glob, Grep, Bash
argument-hint: [epic-id-or-slug]
---

<objective>

Display progress across an epic's milestones, showing which milestones have linked features and the completion state of each feature.

**Provides:**
- Overall epic progress percentage
- Milestone breakdown with linked feature status
- Feature completion states (Not Started / In Progress / Complete)
- Next action suggestions for unlinked milestones

</objective>

<process>

## Step 1: Locate Epic

**Parse the identifier:**

Accept epic ID (0001), full slug (0001-task-management), or partial slug (task).

```bash
# If no identifier provided, find most recent epic
ls -1 .project/epics 2>/dev/null | sort -r | head -1
```

**Validation:**

1. Verify `.project/epics/` directory exists
2. Find matching epic directory:
   - If 4-digit ID: match `.project/epics/NNNN-*/`
   - If full slug: match `.project/epics/{slug}/`
   - If partial: match `.project/epics/*{partial}*/`
3. Verify `EPIC.md` exists in the directory

**If not found:**

```
EPIC STATUS: Cannot Display
================================================================

Error: Epic not found

Available epics:
  0001 - [epic-slug-1]
  0002 - [epic-slug-2]

Run `/spec:new-epic` to create a new epic.
================================================================
```

Exit.

</step>

## Step 2: Load Epic Files

**Read epic context:**

1. Read `EPIC.md` for:
   - Epic name (from title)
   - Status field
   - Last updated date

2. Read `MILESTONES.md` for:
   - Milestone list with:
     - Milestone number and name
     - Goal description
     - Linked Feature ID (or "Not yet created")
     - Status

</step>

## Step 3: Gather Feature Status

**For each milestone with a linked feature:**

1. Parse the Linked Feature field to get feature ID
2. If feature ID exists (not "Not yet created"):
   - Read `.project/features/{feature-id}/STATE.md`
   - Extract current phase and status
   - Determine completion state:
     - **COMPLETE** — All phases complete
     - **Phase X/Y** — In progress with phase count
     - **NOT STARTED** — No phases started
3. If feature not found (stale link):
   - Mark as "Feature not found (stale link)"

</step>

## Step 4: Calculate Progress

**Compute metrics:**

| Metric | Calculation |
|--------|-------------|
| Total Milestones | Count all milestones in MILESTONES.md |
| With Features | Count milestones with linked feature ID |
| Features Complete | Count linked features with status "Complete" |
| Progress % | (Features Complete / Total Milestones) * 100 |

**Milestone status logic:**

| Linked Feature | Feature Status | Milestone Status |
|----------------|----------------|------------------|
| Not yet created | N/A | NOT STARTED |
| Feature ID | Complete | COMPLETE |
| Feature ID | In Progress | IN PROGRESS |
| Feature ID | Not Started | NOT STARTED |

</step>

## Step 5: Display Status Report

**Format output following progress.md pattern:**

```
EPIC STATUS
================================================================

Epic: NNNN - [Epic Name]
Updated: YYYY-MM-DD HH:MM

================================================================
OVERALL PROGRESS
================================================================

[##########..........] 50% Complete

| Metric              | Count |
|---------------------|-------|
| Milestones          | 4     |
| With Features       | 2     |
| Features Complete   | 1     |

================================================================
MILESTONE BREAKDOWN
================================================================

MILESTONE 1: [Milestone Name]                        [COMPLETE]
------------------------------------------------------------------
  Goal: [Single sentence goal]
  Feature: 0001 - [Feature Name]                     [COMPLETE]

MILESTONE 2: [Milestone Name]                      [IN PROGRESS]
------------------------------------------------------------------
  Goal: [Single sentence goal]
  Feature: 0002 - [Feature Name]                   [Phase 2/3]

MILESTONE 3: [Milestone Name]                      [NOT STARTED]
------------------------------------------------------------------
  Goal: [Single sentence goal]
  Feature: Not yet created

MILESTONE 4: [Milestone Name]                      [NOT STARTED]
------------------------------------------------------------------
  Goal: [Single sentence goal]
  Feature: 0003 - [Feature Name]                   [NOT STARTED]

================================================================
NEXT ACTION
================================================================

Next: Create feature for Milestone 3
Run: /spec:new-feature --epic NNNN "implement [milestone goal]"

================================================================
```

**Progress Bar Generation:**

Use ASCII progress bar with 20 segments:

```
0%   [....................]
25%  [#####...............]
50%  [##########..........]
75%  [###############.....]
100% [####################]
```

**Status Badges:**

| Status | Badge |
|--------|-------|
| Complete | `[COMPLETE]` |
| In Progress | `[IN PROGRESS]` |
| Not Started | `[NOT STARTED]` |

**Feature Line Format:**

```
Linked:       Feature: NNNN - [Name]                 [status]
Not linked:   Feature: Not yet created
Stale:        Feature: NNNN - (not found)            [STALE LINK]
```

</step>

## Step 6: Determine Next Action

**Route based on status:**

| Condition | Next Action |
|-----------|-------------|
| Milestone without feature | Create feature for that milestone |
| All milestones have features, some incomplete | Continue work on in-progress feature |
| All features complete | Epic complete - celebrate! |

**Route A: Milestone needs feature**

```
================================================================
NEXT ACTION
================================================================

Next: Create feature for Milestone N
Run: /spec:new-feature --epic NNNN "implement [milestone goal]"

================================================================
```

**Route B: Features in progress**

```
================================================================
NEXT ACTION
================================================================

Next: Continue Feature NNNN - [Feature Name]
Run: /spec:progress NNNN

================================================================
```

**Route C: All complete**

```
================================================================
EPIC COMPLETE
================================================================

All milestones implemented!

Consider:
- Archive with `/spec:complete-feature` for each feature
- Document lessons learned
- Plan follow-up epics

================================================================
```

</step>

</process>

<success_criteria>

- [ ] Epic located and validated (by ID, full slug, or partial slug)
- [ ] EPIC.md and MILESTONES.md loaded successfully
- [ ] All milestones scanned with status determined
- [ ] Linked features checked for completion via STATE.md
- [ ] Progress percentage calculated correctly
- [ ] Visual progress bar reflects completion percentage
- [ ] Milestone breakdown shows all milestones with feature status
- [ ] Next action suggested based on current state

</success_criteria>

<edge_cases>

| Scenario | Output |
|----------|--------|
| No epics directory | "No epics found. Run `/spec:new-epic` first." |
| Epic not found | List available epics with IDs |
| No MILESTONES.md | "Epic has no milestones. Run `/spec:revise-epic` to add milestones." |
| Feature not found (stale link) | Show "[STALE LINK]" and suggest updating MILESTONES.md |
| All milestones complete | Show celebration message and suggest archiving |
| No identifier provided | Show most recent epic status |

</edge_cases>

<related_commands>

| Command | Relationship |
|---------|--------------|
| `/spec:new-epic` | Creates epics to track with this command |
| `/spec:new-feature --epic` | Creates features linked to epic milestones |
| `/spec:progress` | Shows detailed progress for individual features |
| `/spec:revise-epic` | Modifies epic milestones |

</related_commands>
