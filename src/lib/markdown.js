function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", '&#39;');
}

function normalizePath(pathValue) {
  return pathValue.replaceAll('\\', '/');
}

function isExternalTarget(target) {
  return /^(?:[a-z]+:)?\/\//i.test(target) || target.startsWith('mailto:') || target.startsWith('#');
}

function resolveRelativeTarget(notePath, target) {
  if (!target || isExternalTarget(target) || target.startsWith('/')) {
    return target;
  }

  const normalizedNotePath = normalizePath(notePath);
  const baseSegments = normalizedNotePath.split('/').slice(0, -1);
  const targetSegments = normalizePath(target).split('/');
  const combined = [...baseSegments];

  for (const segment of targetSegments) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      combined.pop();
      continue;
    }
    combined.push(segment);
  }

  return combined.join('/');
}

function renderInline(text, notePath) {
  const tokens = [];
  let tokenIndex = 0;
  const pushToken = (html) => {
    const key = `@@TOKEN_${tokenIndex++}@@`;
    tokens.push([key, html]);
    return key;
  };

  let rendered = escapeHtml(text);

  rendered = rendered.replace(/`([^`]+)`/g, (_, code) => pushToken(`<code>${escapeHtml(code)}</code>`));
  rendered = rendered.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, target) => {
    const resolved = resolveRelativeTarget(notePath, target.trim());
    return pushToken(
      `<img src="${escapeAttribute(resolved)}" alt="${escapeAttribute(alt)}" loading="lazy" />`
    );
  });
  rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, target) => {
    const resolved = resolveRelativeTarget(notePath, target.trim());
    const external = isExternalTarget(resolved);
    const rel = external ? ' rel="noreferrer noopener"' : '';
    const targetAttr = external ? ' target="_blank"' : '';
    return pushToken(
      `<a href="${escapeAttribute(resolved)}"${targetAttr}${rel}>${escapeHtml(label)}</a>`
    );
  });
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  rendered = rendered.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  for (const [token, html] of tokens) {
    rendered = rendered.replace(token, html);
  }

  return rendered;
}

function collectUntil(lines, startIndex, predicate) {
  const values = [];
  let index = startIndex;

  while (index < lines.length && predicate(lines[index], index)) {
    values.push(lines[index]);
    index += 1;
  }

  return { values, nextIndex: index };
}

function isTableSeparator(line) {
  return /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(line);
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function renderMarkdown(markdown, notePath = '') {
  const lines = markdown.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    const text = paragraph.join('\n').trim();
    if (text) {
      blocks.push(`<p>${renderInline(text, notePath)}</p>`);
    }
    paragraph = [];
  };

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      flushParagraph();
      const language = trimmed.slice(3).trim();
      const codeLines = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push(
        `<pre><code class="language-${escapeAttribute(language || 'plain')}">${escapeHtml(
          codeLines.join('\n')
        )}</code></pre>`
      );
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInline(headingMatch[2], notePath)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      const { values, nextIndex } = collectUntil(lines, index, (candidate) => /^\s*>\s?/.test(candidate));
      const nested = values.map((candidate) => candidate.replace(/^\s*>\s?/, '')).join('\n');
      blocks.push(`<blockquote>${renderMarkdown(nested, notePath)}</blockquote>`);
      index = nextIndex;
      continue;
    }

    if (
      index + 1 < lines.length &&
      trimmed.includes('|') &&
      isTableSeparator(lines[index + 1])
    ) {
      flushParagraph();
      const header = splitTableRow(lines[index]);
      const rows = [];
      index += 2;

      while (index < lines.length && lines[index].trim().includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      const thead = `<thead><tr>${header
        .map((cell) => `<th>${renderInline(cell, notePath)}</th>`)
        .join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${renderInline(cell, notePath)}</td>`).join('')}</tr>`
        )
        .join('')}</tbody>`;

      blocks.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);

    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      const ordered = Boolean(orderedMatch);
      const matcher = ordered ? /^\d+\.\s+(.*)$/ : /^[-*]\s+(.*)$/;
      const { values, nextIndex } = collectUntil(lines, index, (candidate) => matcher.test(candidate.trim()));
      const tag = ordered ? 'ol' : 'ul';
      const items = values
        .map((candidate) => candidate.trim().match(matcher)?.[1] ?? '')
        .map((item) => `<li>${renderInline(item, notePath)}</li>`)
        .join('');
      blocks.push(`<${tag}>${items}</${tag}>`);
      index = nextIndex;
      continue;
    }

    paragraph.push(trimmed);
    index += 1;
  }

  flushParagraph();
  return blocks.join('\n');
}
