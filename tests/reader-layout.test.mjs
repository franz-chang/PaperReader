import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('reader layout uses a dedicated viewport shell instead of a sticky overlay topbar', async () => {
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.shell-reader\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\);[\s\S]*height:\s*100dvh;[\s\S]*overflow:\s*hidden;/,
    'reader shell should reserve a dedicated top row and lock scrolling to inner panes'
  );

  assert.doesNotMatch(
    css,
    /\.reader-topbar\s*\{[\s\S]*position:\s*sticky;/,
    'reader topbar should not remain a sticky overlay above the paper iframe'
  );
});
