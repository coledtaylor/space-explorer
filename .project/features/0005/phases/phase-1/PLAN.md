# Feature Plan: Phaser 4 Migration - Phase 1

## Objective

Establish the new project structure with Vite + TypeScript + Phaser 4, and restore the codebase to a known-good pre-landing state for reference.

**Purpose:** Create the foundation for the Phaser 4 migration with a working build pipeline and hot reload, while preserving the original JavaScript codebase as reference.

**Output:** A working Vite dev server running Phaser 4 with a placeholder scene, TypeScript strict mode enabled, and git history reset to pre-feature-0004 state.

## Must-Haves (Goal-Backward)

### Observable Truths
- Running `npm run dev` starts a Vite dev server with hot reload
- Browser shows a Phaser 4 game canvas with a visible placeholder scene
- TypeScript compilation passes with strict mode (no `any` types, all strict checks enabled)
- Running `npm run build` produces a production bundle in `dist/`
- Git log shows efed945 as HEAD (feature 0004 commits reverted)
- Original `js/` directory preserved as reference (not deleted)

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `package.json` | npm scripts and dependencies | `dev`, `build`, `preview` scripts |
| `tsconfig.json` | TypeScript strict configuration | compiler options |
| `vite.config.ts` | Vite build configuration | defineConfig |
| `index.html` | Updated entry point for Vite | script module to src/main.ts |
| `src/main.ts` | Phaser game bootstrap | game instance |
| `src/scenes/BootScene.ts` | Placeholder scene | BootScene class |

### Key Links
| From | To | Via |
|------|-----|-----|
| `index.html` | `src/main.ts` | `<script type="module" src="/src/main.ts">` |
| `src/main.ts` | `src/scenes/BootScene.ts` | Phaser scene registration |
| `vite.config.ts` | TypeScript compilation | Vite's esbuild integration |

## Dependency Graph
```
Task 1 (needs nothing) -> creates: git state at efed945
Task 2 (needs Task 1)  -> creates: package.json, tsconfig.json, vite.config.ts, index.html, src/main.ts, src/scenes/BootScene.ts
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Revert Feature 0004 Commits
**Type:** auto
**Sequence:** 1
**Status:** Complete
Completed: 2026-04-02

<files>
(git revert operation - affects js/main.js, js/landing.js, js/surface.js, css/style.css, index.html)
</files>

<action>
Revert the 6 feature-0004 commits to restore the codebase to efed945 (pre-landing state). Use `git revert` in reverse chronological order (newest first) to create a clean revert history:
1. 099de32 - wire launch into game loop
2. 4336584 - implement launch mechanics
3. ef8d3a1 - add surface interaction panel
4. d85e66c - add landing zoom, surface horizon
5. ae12856 - wire landing HUD into game loop
6. 0f6ed05 - create landing module

Alternatively, use `git revert --no-commit HEAD~6..HEAD` then commit once with a summary message. The goal is efed945's code state with clean history.
</action>

<verify>
1. Git state: `git log --oneline -1` shows a revert commit with efed945's content
2. Files reverted: `js/landing.js` and `js/surface.js` should not exist
3. Main.js restored: `js/main.js` should not contain landing/surface logic (grep for "landing" returns minimal or no matches)
4. Game runs: Opening index.html in browser shows working flight gameplay (no landing features)
</verify>

<done>
Feature 0004 commits reverted; codebase matches efed945 state; git history is clean with revert commit(s)
</done>

---

### Task 2: Initialize Vite + TypeScript + Phaser 4 Project
**Type:** auto
**Sequence:** 2
**Status:** Complete
Completed: 2026-04-02

<files>
package.json
tsconfig.json
vite.config.ts
index.html
src/main.ts
src/scenes/BootScene.ts
</files>

<action>
Initialize the Phaser 4 project with Vite and TypeScript:

1. Create `package.json` with:
   - Dependencies: `phaser@^4.0.0-rc.7`
   - DevDependencies: `typescript@^5.0.0`, `vite@^5.0.0`
   - Scripts: `dev` (vite), `build` (vite build), `preview` (vite preview)

2. Create `tsconfig.json` with strict mode:
   - `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
   - `target: "ES2020"`, `module: "ESNext"`, `moduleResolution: "bundler"`
   - `include: ["src"]`

3. Create `vite.config.ts`:
   - Basic Vite config for TypeScript project
   - No special plugins needed initially

4. Modify `index.html`:
   - Keep existing structure but add Vite script entry: `<script type="module" src="/src/main.ts"></script>`
   - Remove or comment out the old `js/main.js` module script
   - Preserve the canvas element and UI overlay structure

5. Create `src/main.ts`:
   - Import Phaser
   - Import BootScene
   - Create Phaser.Game instance with config: AUTO renderer, 1280x720 size, scene: [BootScene]

6. Create `src/scenes/BootScene.ts`:
   - Extend Phaser.Scene
   - In `create()`: Add a text object "Space Explorer - Phaser 4" centered on screen
   - Add a starfield-style background (dark blue fill)
   - No preload() needed for placeholder

Run `npm install` after creating package.json.
</action>

<verify>
1. Dependencies installed: `node_modules/phaser` directory exists
2. TypeScript compiles: `npx tsc --noEmit` exits with code 0
3. Dev server runs: `npm run dev` starts server on localhost (typically :5173)
4. Game renders: Browser shows Phaser canvas with "Space Explorer - Phaser 4" text and dark background
5. Hot reload works: Modify BootScene text, save, browser updates without manual refresh
6. Production build: `npm run build` creates `dist/` with bundled assets
</verify>

<done>
Vite dev server runs with hot reload; Phaser 4 canvas renders placeholder scene; TypeScript strict mode passes; production build works
</done>

## Verification Checklist
- [x] Git HEAD shows revert of feature 0004 (efed945 content)
- [x] Original `js/` directory preserved (not deleted)
- [x] `npm run dev` starts Vite dev server
- [ ] Browser shows Phaser 4 canvas with placeholder text (requires manual browser check)
- [x] `npx tsc --noEmit` passes with no errors
- [x] `npm run build` produces `dist/` bundle
- [ ] Hot reload works (change BootScene, see update in browser) (requires manual browser check)

## Success Criteria

Phase 1 is complete when:
1. Feature 0004 commits are reverted and git log confirms efed945 content
2. Running `npm run dev` starts Vite dev server with hot reload on localhost
3. Browser displays Phaser 4 game canvas with visible placeholder scene (text + background)
4. TypeScript compilation passes with strict mode enabled (no errors from `tsc --noEmit`)
5. Running `npm run build` produces a production bundle in `dist/`
6. Original `js/` directory remains intact as reference for future phases
