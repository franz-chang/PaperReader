import test from 'node:test';
import assert from 'node:assert/strict';

import { filterAndSortPapers, getAdjacentPaperSlugs, parseRoute } from '../src/lib/papers.js';

test('filterAndSortPapers filters by search and category', () => {
  const result = filterAndSortPapers(
    [
      {
        slug: 'a',
        title: 'ROME',
        categoryLevel1: 'Knowledge edit',
        categoryLevel2: 'Locate-then-edit',
        updatedAt: '2026-04-09T00:00:00.000Z'
      },
      {
        slug: 'b',
        title: 'MiniOneRec',
        categoryLevel1: 'Generative recommend',
        categoryLevel2: '',
        updatedAt: '2026-04-08T00:00:00.000Z'
      }
    ],
    { search: 'rome', level1: 'Knowledge edit', level2: '', sort: 'title' }
  );

  assert.deepEqual(
    result.map((item) => item.slug),
    ['a']
  );
});

test('getAdjacentPaperSlugs returns previous and next neighbors', () => {
  const neighbors = getAdjacentPaperSlugs([{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }], 'b');
  assert.deepEqual(neighbors, { previous: 'a', next: 'c' });
});

test('parseRoute resolves the hash route for the reader view', () => {
  assert.deepEqual(parseRoute('#/paper/demo-slug'), { name: 'reader', slug: 'demo-slug' });
  assert.deepEqual(parseRoute('#/'), { name: 'library' });
});
