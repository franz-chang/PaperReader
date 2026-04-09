# PaperReader Static Site Design

**Date:** 2026-04-09
**Status:** Approved in chat, pending file review
**Project Type:** GitHub Pages compatible static website

## Goal

Build a static website for managing and reading papers stored under `Paper/`, with a clear global library view and a focused dual-pane reader view that shows the paper PDF on the left and `note.md` on the right.

## Product Direction

The site will use a `Dashboard + Reading Studio` structure:

- `Library` view for browsing the whole collection
- `Reader` view for dual-pane reading

This direction is preferred over a visual shelf or a permanent three-pane file-manager layout because it balances overview, switching speed, and reading quality.

## Users and Primary Jobs

Primary user is a single researcher maintaining a local paper collection that can also be deployed to GitHub Pages.

Core jobs:

- See the whole paper collection at a glance
- Filter papers by directory-based research categories
- Search any paper quickly by title
- Open any paper and read the PDF alongside the notes
- Move across related papers without losing context

## Constraints

- Must work as a pure static site
- Must be deployable to GitHub Pages
- `note.md` is read-only in the website
- Website cannot scan the filesystem at runtime
- Existing `Paper/` directory structure should remain usable as-is

## Information Architecture

### 1. Library View

Purpose: provide a complete and readable overview of the paper collection.

Sections:

- Top summary strip with total paper count, category count, and recent updates
- Left filter rail with first-level and second-level directory categories
- Top search and sort controls
- Main grid of paper cards

Each paper card shows:

- Paper title
- Category path
- Note status
- PDF status
- Last modified time
- Entry point to open the reader view

### 2. Reader View

Purpose: provide a focused side-by-side reading workflow.

Layout:

- Sticky top bar with title, category path, back-to-library action, previous/next controls
- Left pane for embedded PDF viewing
- Right pane for rendered Markdown notes
- Optional quick-switch drawer to jump between papers without returning to the library

Responsive behavior:

- Desktop and tablet: two columns, PDF wider than notes
- Small screens: stacked layout, PDF first and notes second

## Visual Direction

Theme: `Research Atelier`

Design traits:

- Warm paper-toned background instead of flat white
- Deep ink text color for long-form reading comfort
- Moss green accent for filters, links, and status highlights
- Expressive serif for large headings and refined sans-serif for interface text
- Card surfaces and sectional backgrounds that feel like a curated research desk rather than an admin dashboard

## Interaction Design

### Library Interactions

- Persistent left-side filtering by category
- Fuzzy text search on paper titles
- Sort by title, category, and recent updates
- Hover and focus states that clearly indicate click targets
- Card badges for `Has Note`, `Missing Note`, `Has PDF`, `Missing PDF`

### Reader Interactions

- Independent scrolling in PDF and note panes
- Sticky top toolbar always visible
- Direct links to open the PDF in a new tab
- Fast previous/next paper switching
- Quick-switch drawer or compact list for in-reader navigation

## Technical Architecture

The implementation will use static generation plus a client-side single-page app with hash routing.

### Source of Truth

The `Paper/` directory remains the source collection. Each paper folder may contain:

- one PDF file
- one `note.md`
- optional supporting assets such as images

### Build-Time Indexing

A build script will scan `Paper/` and generate a static data file such as `data/papers.json`.

Each paper record includes:

- `slug`
- `title`
- `categoryLevel1`
- `categoryLevel2`
- `categoryPath`
- `pdfPath`
- `notePath`
- `hasPdf`
- `hasNote`
- `updatedAt`

Slug generation must be stable and URL-safe.

### Frontend Runtime

The frontend will:

- load `data/papers.json`
- render the library view with filters, search, and sorting
- resolve `#/paper/<slug>` to a reader view
- fetch and render the corresponding `note.md`
- embed or link to the corresponding PDF

### Routing

Use hash routing:

- `#/` for library
- `#/paper/<slug>` for reader

This avoids refresh-related 404 problems on GitHub Pages.

### Content Rendering

- PDF uses browser-native embedding with a fallback link
- `note.md` is fetched as text and rendered to HTML in the browser
- Markdown rendering must support headings, lists, code blocks, blockquotes, tables, and links

## Error Handling

### Collection-Level Errors

- If `data/papers.json` is missing or fails to load, show a clear state explaining that the index must be generated before deployment or local preview

### Per-Paper Errors

- If a PDF is missing, show an empty-state panel in the PDF area
- If `note.md` is missing, show an empty-state note panel
- If Markdown parsing fails, fall back to raw text rendering instead of breaking the page
- If embedded PDF rendering is unsupported, show a clear "open PDF in new tab" action

## Testing Strategy

### Build-Side Verification

- Confirm the scan script handles current nested category structure
- Confirm filenames with spaces work correctly
- Confirm generated JSON contains valid relative paths
- Confirm slug generation is deterministic

### Frontend Verification

- Search returns expected papers
- Filters combine correctly with search and sort
- Hash route navigation works for direct loads and in-app transitions
- Reader view loads the correct PDF and note content
- Missing-note and missing-PDF states render correctly

### Manual Acceptance

Use several existing papers across categories to verify:

- Library overview readability
- Category filtering behavior
- Reader dual-pane layout
- Previous/next navigation
- Mobile stacked layout

## Scope

Included in this implementation:

- Library overview page
- Search
- Category filtering
- Sorting
- Reader view with PDF + note dual-pane layout
- Markdown rendering
- Previous/next paper navigation
- Static index generation script
- GitHub Pages compatibility

Explicitly out of scope:

- In-browser note editing
- Authentication
- Sync across devices
- Full-text PDF indexing
- Tagging or bookmarking systems

## Deliverables

- Static website source files
- Build script for generating the paper index
- Generated data contract for paper metadata
- Documentation for local preview/build/deployment flow

## Open Decisions Resolved

- Deployment target: pure static hosting, including GitHub Pages
- Notes behavior: read-only display
- Site structure: dashboard library + dual-pane reader
- Runtime model: generated static index, no runtime filesystem scanning

## Implementation Notes

- Because the current workspace is not a git repository, the spec can be written locally but cannot be committed in this workspace state
- The eventual implementation should preserve compatibility with the current paper-folder naming scheme, including spaces in file and folder names
