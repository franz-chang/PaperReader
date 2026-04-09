import test from 'node:test';
import assert from 'node:assert/strict';

import { collectPaperRecords, makePaperSlug } from '../scripts/generate-papers-index.mjs';

test('makePaperSlug creates a stable slug from the relative paper path', () => {
  const slug = makePaperSlug('Knowledge edit/Meta-learning/MEND - Fast Model Editing at Scale');
  assert.equal(slug, 'knowledge-edit__meta-learning__mend-fast-model-editing-at-scale');
});

test('collectPaperRecords finds pdf and note files from nested paper folders', () => {
  const records = collectPaperRecords([
    'Knowledge edit/Meta-learning/MEND - Fast Model Editing at Scale/Fast Model Editing at Scale.pdf',
    'Knowledge edit/Meta-learning/MEND - Fast Model Editing at Scale/note.md'
  ]);

  assert.equal(records.length, 1);
  assert.equal(records[0].hasPdf, true);
  assert.equal(records[0].hasNote, true);
  assert.equal(records[0].title, 'MEND - Fast Model Editing at Scale');
});

test('collectPaperRecords keeps categoryLevel2 empty when a paper lives directly under level1', () => {
  const records = collectPaperRecords([
    'Generative recommend/MiniOneRec - An Open-Source Framework for Scaling Generative Recommendation/note.md'
  ]);

  assert.equal(records[0].categoryLevel1, 'Generative recommend');
  assert.equal(records[0].categoryLevel2, '');
  assert.equal(
    records[0].title,
    'MiniOneRec - An Open-Source Framework for Scaling Generative Recommendation'
  );
});
