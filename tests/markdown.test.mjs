import test from 'node:test';
import assert from 'node:assert/strict';

import { renderMarkdown } from '../src/lib/markdown.js';

test('renderMarkdown supports headings, images, code blocks, and tables', () => {
  const html = renderMarkdown(
    '# Title\n\n![alt](image.png)\n\n```js\nconst a = 1;\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |',
    'Paper/demo/note.md'
  );

  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<img[^>]+src=\"Paper\/demo\/image\.png\"/);
  assert.match(html, /<pre><code class=\"language-js\">/);
  assert.match(html, /<table>/);
});

test('renderMarkdown resolves emphasis, blockquotes, and links', () => {
  const html = renderMarkdown(
    '> quote\n\nA **bold** [link](https://example.com)',
    'Paper/demo/note.md'
  );

  assert.match(html, /<blockquote>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /href=\"https:\/\/example\.com\"/);
});
