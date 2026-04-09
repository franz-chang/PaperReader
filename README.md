# PaperReader

PaperReader is a static paper library and reading studio for the `Paper/` directory in this workspace.

## Features

- Dashboard-style library overview for the whole paper collection
- Search, sorting, and directory-based filtering
- Dual-pane reader with PDF on the left and `note.md` on the right
- Hash routing that works on GitHub Pages
- Build-time index generation from the existing `Paper/` tree

## Project Structure

- `Paper/`: source paper collection
- `data/papers.json`: generated index used by the frontend
- `scripts/generate-papers-index.mjs`: index generator
- `src/`: browser-side application code
- `tests/`: Node test suite

## Usage

### 1. Regenerate the paper index

```bash
npm run build:data
```

This scans the `Paper/` directory and writes `data/papers.json`.

### 2. Run tests

```bash
npm test
```

### 3. Preview locally

Serve the project root with any static server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

This site is designed for pure static hosting.

For GitHub Pages:

1. Commit the website files together with `Paper/` and `data/papers.json`
2. Make sure `npm run build:data` has been run before deploying
3. Publish the repository root or the chosen Pages output directory as a static site

Because the app uses hash routing, direct refreshes on reader URLs still work on GitHub Pages.

## Notes

- When you add or update papers, rerun `npm run build:data`
- If a paper has no `note.md`, the reader will show an empty note state
- If embedded PDF preview fails in a browser, use the “新标签打开” link in the reader
