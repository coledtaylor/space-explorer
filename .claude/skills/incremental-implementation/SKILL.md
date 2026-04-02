---
name: incremental-implementation
description: Implement changes in small, verifiable units. Use for any code change (new code, refactor, bugfix) to validate each chunk before moving on.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Incremental Implementation Protocol

Build features in **small, verified steps**. Never write large amounts of code without validation.

## Core Principle

**One logical unit → Validate → Report → Next unit**

A "logical unit" is:
- A single class or module (max ~100 lines)
- A single function with its tests
- A single API endpoint
- A configuration change
- A single component

## Implementation Cycle

```
┌─────────────────────────────────────────────┐
│  1. PLAN the unit (show user)               │
├─────────────────────────────────────────────┤
│  2. IMPLEMENT the unit (1-3 files max)      │
├─────────────────────────────────────────────┤
│  3. VALIDATE immediately                    │
│     • Compile/build                         │
│     • Run relevant tests                    │
│     • Lint check                            │
├─────────────────────────────────────────────┤
│  4. REPORT results to user                  │
├─────────────────────────────────────────────┤
│  5. WAIT for approval if checkpoint reached │
└─────────────────────────────────────────────┘
         ↓ (repeat for next unit)
```

## Validation Commands by Stack

### .NET / C#
```bash
# After each unit
dotnet build --no-restore
dotnet test --no-build --filter "FullyQualifiedName~UnitName"
```

### React / TypeScript
```bash
# After each unit
npm run build 2>&1 | head -50
npm run lint -- --max-warnings 0
npm test -- --testPathPattern="ComponentName" --watchAll=false
```

### SQL
```bash
# Validate syntax (example for SQL Server)
sqlcmd -S localhost -d database -Q "SET PARSEONLY ON; $(cat migration.sql)"
```

Always check the project for existing validation scripts first:
- `package.json` scripts
- `Makefile` targets  
- `.github/workflows` for CI commands
- `README.md` for build instructions

## Unit Size Limits

| Type | Max Lines | Max Files | Must Include |
|------|-----------|-----------|--------------|
| Model/Entity | 50 | 1 | Validation attributes |
| Service class | 100 | 1 | Interface + implementation |
| API endpoint | 75 | 2 | Controller + DTO |
| React component | 100 | 2 | Component + types |
| Database migration | 50 | 1 | Up + Down scripts |
| Test file | 150 | 1 | Happy path + edge cases |

**If a unit exceeds these limits, break it down further.**

## Implementation Report Format

After each unit:

```markdown
### Unit: [Name]

**Files Changed:**
| File | Lines | Change |
|------|-------|--------|
| src/Services/IUserService.cs | 1-15 | Created interface |
| src/Services/UserService.cs | 1-45 | Created implementation |

**Validation Results:**
```bash
$ dotnet build
Build succeeded. 0 Warning(s) 0 Error(s)

$ dotnet test --filter "UserServiceTests"
Passed! 3 tests passed.
```

**Status:** ✅ Ready for next unit

**Next:** Implement UserController endpoint
```

## Error Handling

When validation fails, STOP and report:

```markdown
### ❌ Unit: [Name] — Validation Failed

**Error:**
```
CS1002: ; expected at line 23
```

**Analysis:**
[What went wrong]

**Fix Options:**
A) [Quick fix]
B) [Alternative approach]

**⏸️ WAITING — How should I proceed?**
```

Never proceed to the next unit with failing validation.

## Dependency Order

Implement in this order to minimize integration issues:

1. **Models/Entities** — Data structures first
2. **Interfaces** — Contracts before implementations
3. **Services/Business Logic** — Core functionality
4. **Data Access** — Repositories, DB context
5. **API/Controllers** — External interfaces
6. **UI Components** — Frontend last
7. **Integration/Wiring** — Connect everything
8. **Tests** — Throughout, but especially at end

## Anti-Patterns

❌ **God commit** — Implementing entire feature in one go  
❌ **Blind coding** — Writing code without checking existing patterns  
❌ **Test later** — Skipping tests until "it works"  
❌ **Hope it compiles** — Not running build after changes  
❌ **Copy-pasta** — Duplicating code instead of extracting  
❌ **Magic numbers** — Hardcoding values without constants  

## Chunking Examples

### Feature: User Authentication

**Wrong approach:**
```
Task: Implement user authentication
→ Write 500 lines across 10 files
→ Hope it works
→ Debug for hours
```

**Correct approach:**
```
Unit 1: User entity + migration ✓ (validate)
Unit 2: IAuthService interface ✓ (validate)  
Unit 3: AuthService implementation ✓ (validate)
Unit 4: JWT token generation ✓ (validate)
Unit 5: Login endpoint ✓ (validate)
Unit 6: Auth middleware ✓ (validate)
Unit 7: Protected endpoint test ✓ (validate)
Unit 8: Integration tests ✓ (validate)
```

### Feature: Data Table Component

**Wrong approach:**
```
Task: Create DataTable with sorting, filtering, pagination
→ Write 400-line component
→ It doesn't work
→ Can't figure out why
```

**Correct approach:**
```
Unit 1: Basic table rendering ✓ (validate)
Unit 2: Column definitions + types ✓ (validate)
Unit 3: Sorting functionality ✓ (validate)
Unit 4: Filtering functionality ✓ (validate)
Unit 5: Pagination controls ✓ (validate)
Unit 6: Loading/empty states ✓ (validate)
Unit 7: Storybook stories ✓ (validate)
```

## Integration with Checkpoints

This skill works with `checkpoint-execution`:

- After **every 2-3 units**: Mini checkpoint (report only)
- After **each milestone**: Full checkpoint (wait for approval)
- On **any error**: Immediate checkpoint

**Small steps + validation = reliable implementation + lower token usage**

