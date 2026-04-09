import { renderMarkdown } from './lib/markdown.js';
import {
  buildCategoryMap,
  filterAndSortPapers,
  findPaperBySlug,
  getAdjacentPaperSlugs,
  parseRoute
} from './lib/papers.js';
import {
  DEFAULT_READER_PREFERENCES,
  buildPdfViewerSrc,
  clampNoteScale,
  clampReaderSplit,
  sanitizeReaderPreferences
} from './lib/reader.js';

const READER_PREFERENCES_KEY = 'paperreader:reader-preferences';

const app = document.querySelector('#app');

const state = {
  papers: [],
  route: parseRoute(window.location.hash || '#/'),
  status: 'loading',
  error: '',
  search: '',
  level1: '',
  level2: '',
  sort: 'updated',
  readerNavOpen: false,
  noteCache: new Map(),
  readerPreferences: loadReaderPreferences()
};

bootstrap();

window.addEventListener('hashchange', () => {
  state.route = parseRoute(window.location.hash || '#/');
  state.readerNavOpen = false;
  maybeLoadRouteNote();
  render();
});

app.addEventListener('input', (event) => {
  const target = event.target;

  if (target.matches('[data-search-input]')) {
    state.search = target.value;
    render();
  }
});

app.addEventListener('change', (event) => {
  const target = event.target;

  if (target.matches('[data-sort-select]')) {
    state.sort = target.value;
    render();
    return;
  }

  if (target.matches('[data-pdf-zoom-select]')) {
    updateReaderPreferences({ pdfZoom: target.value });
  }
});

app.addEventListener('click', async (event) => {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) {
    return;
  }

  const { action, value, level1 = '', level2 = '' } = actionTarget.dataset;

  if (action === 'set-level1') {
    state.level1 = value;
    state.level2 = '';
    render();
    return;
  }

  if (action === 'set-level2') {
    state.level1 = level1;
    state.level2 = level2;
    render();
    return;
  }

  if (action === 'clear-filters') {
    state.search = '';
    state.level1 = '';
    state.level2 = '';
    state.sort = 'updated';
    render();
    return;
  }

  if (action === 'toggle-reader-nav') {
    state.readerNavOpen = !state.readerNavOpen;
    render();
    return;
  }

  if (action === 'close-reader-nav') {
    state.readerNavOpen = false;
    render();
    return;
  }

  if (action === 'note-scale-up') {
    updateReaderPreferences({ noteScale: clampNoteScale(state.readerPreferences.noteScale + 0.1) });
    return;
  }

  if (action === 'note-scale-down') {
    updateReaderPreferences({ noteScale: clampNoteScale(state.readerPreferences.noteScale - 0.1) });
    return;
  }

  if (action === 'note-scale-reset') {
    updateReaderPreferences({ noteScale: DEFAULT_READER_PREFERENCES.noteScale });
    return;
  }

  if (action === 'toggle-browser-fullscreen') {
    await toggleReaderFullscreen();
  }
});

app.addEventListener('pointerdown', (event) => {
  const resizer = event.target.closest('[data-reader-resizer]');
  if (!resizer) {
    return;
  }

  startReaderResize(event);
});

app.addEventListener('keydown', (event) => {
  const resizer = event.target.closest('[data-reader-resizer]');
  if (!resizer) {
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    updateReaderPreferences({ split: clampReaderSplit(state.readerPreferences.split - 3) });
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    updateReaderPreferences({ split: clampReaderSplit(state.readerPreferences.split + 3) });
  }
});

async function bootstrap() {
  try {
    const response = await fetch('./data/papers.json');
    if (!response.ok) {
      throw new Error(`Failed to load papers.json (${response.status})`);
    }

    const payload = await response.json();
    state.papers = payload.papers ?? [];
    state.status = 'ready';
    maybeLoadRouteNote();
  } catch (error) {
    state.status = 'error';
    state.error = error instanceof Error ? error.message : String(error);
  }

  render();
}

function loadReaderPreferences() {
  try {
    const raw = window.localStorage.getItem(READER_PREFERENCES_KEY);
    if (!raw) {
      return { ...DEFAULT_READER_PREFERENCES };
    }
    return sanitizeReaderPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_READER_PREFERENCES };
  }
}

function saveReaderPreferences() {
  try {
    window.localStorage.setItem(READER_PREFERENCES_KEY, JSON.stringify(state.readerPreferences));
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function updateReaderPreferences(partialPreferences, { rerender = true } = {}) {
  state.readerPreferences = sanitizeReaderPreferences({
    ...state.readerPreferences,
    ...partialPreferences
  });
  saveReaderPreferences();

  if (rerender) {
    render();
  } else {
    applyReaderPreferencesToDom();
  }
}

function startReaderResize(event) {
  const layout = app.querySelector('[data-reader-layout]');
  if (!layout) {
    return;
  }

  event.preventDefault();

  const updateFromPointer = (clientX) => {
    const bounds = layout.getBoundingClientRect();
    const usableWidth = Math.max(bounds.width - 16, 1);
    const offsetX = clientX - bounds.left;
    const split = clampReaderSplit((offsetX / usableWidth) * 100);
    updateReaderPreferences({ split }, { rerender: false });
  };

  updateFromPointer(event.clientX);

  const onPointerMove = (moveEvent) => {
    updateFromPointer(moveEvent.clientX);
  };

  const stopResize = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopResize);
    window.removeEventListener('pointercancel', stopResize);
    saveReaderPreferences();
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopResize);
  window.addEventListener('pointercancel', stopResize);
}

async function toggleReaderFullscreen() {
  const target = app.querySelector('[data-reader-fullscreen-target]');
  if (!target || !document.fullscreenEnabled) {
    return;
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await target.requestFullscreen();
}

function maybeLoadRouteNote() {
  if (state.route.name !== 'reader') {
    return;
  }

  const paper = findPaperBySlug(state.papers, state.route.slug);
  if (!paper?.notePath || state.noteCache.has(paper.notePath)) {
    return;
  }

  state.noteCache.set(paper.notePath, { status: 'loading', html: '' });

  fetch(paper.notePath)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load note (${response.status})`);
      }

      const markdown = await response.text();
      state.noteCache.set(paper.notePath, {
        status: 'ready',
        html: renderMarkdown(markdown, paper.notePath)
      });
    })
    .catch((error) => {
      state.noteCache.set(paper.notePath, {
        status: 'error',
        html: `<pre>${escapeHtml(error instanceof Error ? error.message : String(error))}</pre>`
      });
    })
    .finally(() => {
      render();
    });
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', '&quot;');
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function computeStats(papers) {
  const noteCount = papers.filter((paper) => paper.hasNote).length;
  const level1Count = new Set(papers.map((paper) => paper.categoryLevel1)).size;
  const level2Count = new Set(
    papers.filter((paper) => paper.categoryLevel2).map((paper) => `${paper.categoryLevel1}/${paper.categoryLevel2}`)
  ).size;

  return {
    total: papers.length,
    noteCoverage: papers.length ? Math.round((noteCount / papers.length) * 100) : 0,
    level1Count,
    level2Count
  };
}

function render() {
  document.title =
    state.route.name === 'reader'
      ? `${findPaperBySlug(state.papers, state.route.slug)?.title ?? 'Paper'} · PaperReader`
      : 'PaperReader';

  if (state.status === 'loading') {
    app.innerHTML = renderLoadingView();
    return;
  }

  if (state.status === 'error') {
    app.innerHTML = renderErrorView();
    return;
  }

  if (state.route.name === 'reader') {
    app.innerHTML = renderReaderView();
    applyReaderPreferencesToDom();
    return;
  }

  app.innerHTML = renderLibraryView();
}

function applyReaderPreferencesToDom() {
  const layout = app.querySelector('[data-reader-layout]');
  const noteBody = app.querySelector('.pane-body--note');
  const noteScaleValue = app.querySelector('[data-note-scale-value]');

  if (layout) {
    layout.style.gridTemplateColumns = `minmax(0, ${state.readerPreferences.split}fr) 16px minmax(0, ${100 - state.readerPreferences.split}fr)`;
  }

  if (noteBody) {
    noteBody.style.setProperty('--reader-note-scale', String(state.readerPreferences.noteScale));
  }

  if (noteScaleValue) {
    noteScaleValue.textContent = `${Math.round(state.readerPreferences.noteScale * 100)}%`;
  }
}

function renderLoadingView() {
  return `
    <main class="shell shell-loading">
      <div class="loading-card">
        <div class="eyebrow">PaperReader</div>
        <h1>Building your reading desk...</h1>
        <p>正在加载论文索引和阅读工作台。</p>
      </div>
    </main>
  `;
}

function renderErrorView() {
  return `
    <main class="shell shell-error">
      <div class="error-card">
        <div class="eyebrow">Index Missing</div>
        <h1>无法加载论文索引</h1>
        <p>请先运行 <code>npm run build:data</code> 生成 <code>data/papers.json</code>，再用静态服务器预览网站。</p>
        <pre>${escapeHtml(state.error)}</pre>
      </div>
    </main>
  `;
}

function renderLibraryView() {
  const stats = computeStats(state.papers);
  const categoryMap = buildCategoryMap(state.papers);
  const filteredPapers = filterAndSortPapers(state.papers, state);

  return `
    <main class="shell shell-library">
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">Research Atelier</div>
          <h1>PaperReader</h1>
          <p class="hero-text">
            在一个静态站点里管理整套论文库。首页负责总览与检索，阅读页负责 PDF 与笔记对照。
          </p>
        </div>
        <div class="hero-stats">
          <article class="stat-card">
            <span class="stat-label">Papers</span>
            <strong>${stats.total}</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">Top-Level Fields</span>
            <strong>${stats.level1Count}</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">Subfields</span>
            <strong>${stats.level2Count}</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">Notes Coverage</span>
            <strong>${stats.noteCoverage}%</strong>
          </article>
        </div>
      </section>

      <section class="library-layout">
        <aside class="filter-panel">
          <div class="filter-panel__sticky">
            <div class="panel-header">
              <div>
                <div class="eyebrow">Filters</div>
                <h2>按研究脉络浏览</h2>
              </div>
              <button class="ghost-button" data-action="clear-filters">重置</button>
            </div>

            <label class="search-field">
              <span>搜索标题</span>
              <input
                type="search"
                placeholder="例如 ROME / MiniOneRec"
                value="${escapeAttribute(state.search)}"
                data-search-input
              />
            </label>

            <label class="sort-field">
              <span>排序</span>
              <select data-sort-select>
                <option value="updated" ${state.sort === 'updated' ? 'selected' : ''}>最近更新</option>
                <option value="title" ${state.sort === 'title' ? 'selected' : ''}>标题 A-Z</option>
                <option value="category" ${state.sort === 'category' ? 'selected' : ''}>分类</option>
              </select>
            </label>

            <div class="category-block">
              <button
                class="category-pill ${state.level1 === '' ? 'is-active' : ''}"
                data-action="set-level1"
                data-value=""
              >
                全部论文
              </button>
            </div>

            ${categoryMap
              .map((category) => {
                const isLevel1Active = state.level1 === category.name;
                return `
                  <div class="category-block">
                    <button
                      class="category-pill ${isLevel1Active && !state.level2 ? 'is-active' : ''}"
                      data-action="set-level1"
                      data-value="${escapeAttribute(category.name)}"
                    >
                      ${category.name}
                    </button>
                    <div class="subcategory-list ${isLevel1Active ? 'is-open' : ''}">
                      ${category.children
                        .map(
                          (child) => `
                            <button
                              class="subcategory-pill ${
                                state.level1 === category.name && state.level2 === child ? 'is-active' : ''
                              }"
                              data-action="set-level2"
                              data-level1="${escapeAttribute(category.name)}"
                              data-level2="${escapeAttribute(child)}"
                            >
                              ${child}
                            </button>
                          `
                        )
                        .join('')}
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </aside>

        <section class="library-main">
          <div class="library-toolbar">
            <div>
              <div class="eyebrow">Collection</div>
              <h2>${filteredPapers.length} / ${state.papers.length} papers visible</h2>
            </div>
            <p class="muted">按标题搜索、按目录筛选，然后进入双栏阅读。</p>
          </div>

          <div class="paper-grid">
            ${
              filteredPapers.length
                ? filteredPapers.map(renderPaperCard).join('')
                : `
                    <article class="empty-card">
                      <h3>没有匹配结果</h3>
                      <p>试试清空搜索或切换到其他分类。</p>
                    </article>
                  `
            }
          </div>
        </section>
      </section>
    </main>
  `;
}

function renderPaperCard(paper) {
  return `
    <article class="paper-card">
      <div class="paper-card__meta">
        <span class="paper-path">${paper.categoryPath}</span>
        <span class="paper-date">${formatDate(paper.updatedAt)}</span>
      </div>
      <h3>${paper.title}</h3>
      <div class="badge-row">
        <span class="badge ${paper.hasPdf ? 'badge-ok' : 'badge-missing'}">${paper.hasPdf ? 'Has PDF' : 'Missing PDF'}</span>
        <span class="badge ${paper.hasNote ? 'badge-ok' : 'badge-missing'}">${paper.hasNote ? 'Has Note' : 'Missing Note'}</span>
      </div>
      <a class="card-link" href="#/paper/${encodeURIComponent(paper.slug)}">Read Paper</a>
    </article>
  `;
}

function renderReaderView() {
  const paper = findPaperBySlug(state.papers, state.route.slug);

  if (!paper) {
    return `
      <main class="shell shell-error">
        <div class="error-card">
          <div class="eyebrow">Not Found</div>
          <h1>这篇论文不存在</h1>
          <p>当前链接没有对应到已生成的论文索引项。</p>
          <a class="primary-button" href="#/">返回论文库</a>
        </div>
      </main>
    `;
  }

  const siblingPapers = filterAndSortPapers(state.papers, {
    search: '',
    level1: paper.categoryLevel1,
    level2: paper.categoryLevel2,
    sort: 'title'
  });
  const neighbors = getAdjacentPaperSlugs(siblingPapers, paper.slug);
  const noteState = paper.notePath ? state.noteCache.get(paper.notePath) : null;
  const noteScalePercent = Math.round(state.readerPreferences.noteScale * 100);

  return `
    <main class="shell shell-reader" data-reader-fullscreen-target>
      <header class="reader-topbar">
        <div class="reader-topbar__main">
          <a class="back-link" href="#/">← 返回论文库</a>
          <div>
            <div class="eyebrow">${paper.categoryPath}</div>
            <h1>${paper.title}</h1>
          </div>
        </div>
        <div class="reader-topbar__actions">
          <a class="ghost-button" href="#/paper/${encodeURIComponent(neighbors.previous ?? paper.slug)}" ${
            neighbors.previous ? '' : 'aria-disabled="true" tabindex="-1"'
          }>上一篇</a>
          <a class="ghost-button" href="#/paper/${encodeURIComponent(neighbors.next ?? paper.slug)}" ${
            neighbors.next ? '' : 'aria-disabled="true" tabindex="-1"'
          }>下一篇</a>
          <button class="ghost-button" data-action="toggle-browser-fullscreen">全屏模式</button>
          <button class="ghost-button" data-action="toggle-reader-nav">快速切换</button>
        </div>
      </header>

      <section class="reader-layout" data-reader-layout>
        <div class="reader-pane reader-pane--pdf">
          <div class="pane-header">
            <div>
              <div class="eyebrow">Paper PDF</div>
              <h2>原文阅读</h2>
            </div>
            <div class="pane-tools">
              <label class="inline-select">
                <span>PDF 缩放</span>
                <select data-pdf-zoom-select>
                  ${renderPdfZoomOption('page-width', '适应宽度')}
                  ${renderPdfZoomOption('100', '100%')}
                  ${renderPdfZoomOption('125', '125%')}
                  ${renderPdfZoomOption('150', '150%')}
                  ${renderPdfZoomOption('175', '175%')}
                  ${renderPdfZoomOption('200', '200%')}
                </select>
              </label>
              ${
                paper.hasPdf
                  ? `<a class="ghost-button" href="${paper.pdfPath}" target="_blank" rel="noreferrer noopener">新标签打开</a>`
                  : ''
              }
            </div>
          </div>
          <div class="pane-body pane-body--pdf">
            ${
              paper.hasPdf
                ? `<iframe title="${escapeAttribute(paper.title)} PDF" src="${buildPdfViewerSrc(
                    paper.pdfPath,
                    state.readerPreferences.pdfZoom
                  )}"></iframe>`
                : `
                    <div class="empty-state">
                      <h3>PDF 不存在</h3>
                      <p>这个条目已经建立，但当前目录中没有找到 PDF 文件。</p>
                    </div>
                  `
            }
          </div>
        </div>

        <button
          class="reader-resizer"
          type="button"
          data-reader-resizer
          aria-label="调整论文与笔记宽度"
          title="拖动以调整论文与笔记宽度"
        >
          <span></span>
        </button>

        <div class="reader-pane reader-pane--note">
          <div class="pane-header">
            <div>
              <div class="eyebrow">Markdown Note</div>
              <h2>阅读笔记</h2>
            </div>
            <div class="pane-tools">
              <div class="zoom-controls">
                <button class="ghost-button" data-action="note-scale-down">A-</button>
                <span class="zoom-value" data-note-scale-value>${noteScalePercent}%</span>
                <button class="ghost-button" data-action="note-scale-up">A+</button>
              </div>
              <button class="ghost-button" data-action="note-scale-reset">重置字号</button>
            </div>
          </div>
          <div class="pane-body pane-body--note">
            ${renderNotePane(paper, noteState)}
          </div>
        </div>
      </section>

      <aside class="reader-drawer ${state.readerNavOpen ? 'is-open' : ''}">
        <div class="reader-drawer__backdrop" data-action="close-reader-nav"></div>
        <div class="reader-drawer__panel">
          <div class="drawer-header">
            <div>
              <div class="eyebrow">Quick Switch</div>
              <h2>${paper.categoryLevel2 || paper.categoryLevel1}</h2>
            </div>
            <button class="ghost-button" data-action="close-reader-nav">关闭</button>
          </div>
          <div class="drawer-list">
            ${siblingPapers
              .map(
                (item) => `
                  <a
                    class="drawer-link ${item.slug === paper.slug ? 'is-active' : ''}"
                    href="#/paper/${encodeURIComponent(item.slug)}"
                  >
                    <span>${item.title}</span>
                    <small>${item.hasNote ? 'Has Note' : 'Missing Note'}</small>
                  </a>
                `
              )
              .join('')}
          </div>
        </div>
      </aside>
    </main>
  `;
}

function renderPdfZoomOption(value, label) {
  return `<option value="${value}" ${
    state.readerPreferences.pdfZoom === value ? 'selected' : ''
  }>${label}</option>`;
}

function renderNotePane(paper, noteState) {
  if (!paper.hasNote) {
    return `
      <div class="empty-state">
        <h3>还没有 note.md</h3>
        <p>这篇论文可以先读原文，之后再补阅读笔记。</p>
      </div>
    `;
  }

  if (!noteState || noteState.status === 'loading') {
    return `
      <div class="empty-state empty-state--loading">
        <h3>正在加载笔记</h3>
        <p>Markdown 内容读取后会渲染在这里。</p>
      </div>
    `;
  }

  if (noteState.status === 'error') {
    return `
      <div class="empty-state">
        <h3>笔记加载失败</h3>
        <p>已降级显示错误信息，原始 note.md 文件仍然保留在 Paper 目录中。</p>
        ${noteState.html}
      </div>
    `;
  }

  return `<article class="markdown-body">${noteState.html}</article>`;
}
