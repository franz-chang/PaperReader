import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildPdfViewerSrc,
  clampNoteScale,
  clampReaderSplit
} from '../src/lib/reader.js';

test('buildPdfViewerSrc appends the selected zoom mode to the PDF iframe url', () => {
  assert.equal(buildPdfViewerSrc('Paper/demo/example.pdf', '125'), 'Paper/demo/example.pdf#view=FitH&zoom=125');
  assert.equal(
    buildPdfViewerSrc('Paper/demo/example.pdf', 'page-width'),
    'Paper/demo/example.pdf#view=FitH&zoom=page-width'
  );
});

test('reader controls clamp split ratio and note scale to readable ranges', () => {
  assert.equal(clampReaderSplit(20), 35);
  assert.equal(clampReaderSplit(72), 72);
  assert.equal(clampReaderSplit(90), 78);
  assert.equal(clampNoteScale(0.5), 0.85);
  assert.equal(clampNoteScale(1.2), 1.2);
  assert.equal(clampNoteScale(2.4), 1.8);
});

test('reader CSS uses the full viewport width instead of a centered narrow shell', async () => {
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /\.shell-reader\s*\{[\s\S]*width:\s*100vw;[\s\S]*max-width:\s*none;[\s\S]*margin:\s*0;/,
    'reader shell should span the full viewport'
  );
});
