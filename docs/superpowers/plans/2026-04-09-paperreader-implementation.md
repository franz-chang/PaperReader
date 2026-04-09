# PaperReader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Pages compatible static paper library and dual-pane reader for the existing `Paper/` collection.

**Architecture:** Use a zero-dependency static site with browser ES modules, a build-time index generator that scans `Paper/`, and a hash-routed reader UI that loads PDFs and rendered Markdown notes on demand. Keep data generation and UI logic separate so build and runtime behavior can be tested independently.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Node.js built-in test runner

---

### Task 1: Create the project scaffold and failing tests

**Files:**
- Create: `package.json`
- Create: `tests/generate-papers-index.test.mjs`
- Create: `tests/papers.test.mjs`
- Create: `tests/markdown.test.mjs`

- [ ] **Step 1: Write the failing build-index tests**
- [ ] **Step 2: Write the failing UI state tests**
- [ ] **Step 3: Write the failing Markdown renderer tests**
- [ ] **Step 4: Create the package manifest and run tests to confirm RED**

Run: `npm test`
Expected: FAIL because the implementation files do not exist yet

### Task 2: Implement index generation and make build tests pass

**Files:**
- Create: `scripts/generate-papers-index.mjs`
- Create: `data/.gitkeep`
- Test: `tests/generate-papers-index.test.mjs`

- [ ] **Step 1: Implement slug generation and record collection**
- [ ] **Step 2: Add the CLI entry that scans `Paper/` and writes `data/papers.json`**
- [ ] **Step 3: Run the focused tests and verify GREEN**
- [ ] **Step 4: Generate the real paper index**

### Task 3: Implement shared UI logic and Markdown rendering

**Files:**
- Create: `src/lib/papers.js`
- Create: `src/lib/markdown.js`
- Test: `tests/papers.test.mjs`
- Test: `tests/markdown.test.mjs`

- [ ] **Step 1: Implement route parsing, filtering, sorting, and adjacent navigation**
- [ ] **Step 2: Implement the Markdown renderer and note-asset resolution**
- [ ] **Step 3: Run the shared-logic test suite**

### Task 4: Build the static UI shell and reader experience

**Files:**
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles.css`
- Modify: `data/papers.json`

- [ ] **Step 1: Create the HTML shell**
- [ ] **Step 2: Implement the library and reader rendering flow**
- [ ] **Step 3: Style the dashboard and dual-pane reader**
- [ ] **Step 4: Rebuild the real index and verify runtime assets exist**

### Task 5: Add usage documentation and run final verification

**Files:**
- Create: `README.md`
- Test: `tests/generate-papers-index.test.mjs`
- Test: `tests/papers.test.mjs`
- Test: `tests/markdown.test.mjs`

- [ ] **Step 1: Document build, local preview, and deployment workflow**
- [ ] **Step 2: Run the full automated verification**
- [ ] **Step 3: Run the real data build again after all code changes**
