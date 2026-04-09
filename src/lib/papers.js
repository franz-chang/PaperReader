function normalizeQuery(value) {
  return value.trim().toLowerCase();
}

export function parseRoute(hash) {
  if (hash.startsWith('#/paper/')) {
    return {
      name: 'reader',
      slug: decodeURIComponent(hash.slice('#/paper/'.length))
    };
  }

  return { name: 'library' };
}

export function filterAndSortPapers(papers, state) {
  const search = normalizeQuery(state.search ?? '');
  const level1 = state.level1 ?? '';
  const level2 = state.level2 ?? '';
  const sort = state.sort ?? 'updated';

  const filtered = papers.filter((paper) => {
    const matchesSearch =
      !search ||
      normalizeQuery(paper.title).includes(search) ||
      normalizeQuery(paper.categoryPath ?? '').includes(search);
    const matchesLevel1 = !level1 || paper.categoryLevel1 === level1;
    const matchesLevel2 = !level2 || paper.categoryLevel2 === level2;
    return matchesSearch && matchesLevel1 && matchesLevel2;
  });

  return filtered.sort((left, right) => {
    if (sort === 'title') {
      return left.title.localeCompare(right.title, 'en');
    }

    if (sort === 'category') {
      const categoryCompare = `${left.categoryLevel1} ${left.categoryLevel2}`.localeCompare(
        `${right.categoryLevel1} ${right.categoryLevel2}`,
        'en'
      );
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      return left.title.localeCompare(right.title, 'en');
    }

    const updatedCompare = (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '');
    if (updatedCompare !== 0) {
      return updatedCompare;
    }

    return left.title.localeCompare(right.title, 'en');
  });
}

export function getAdjacentPaperSlugs(papers, activeSlug) {
  const index = papers.findIndex((paper) => paper.slug === activeSlug);

  if (index === -1) {
    return { previous: null, next: null };
  }

  return {
    previous: papers[index - 1]?.slug ?? null,
    next: papers[index + 1]?.slug ?? null
  };
}

export function buildCategoryMap(papers) {
  const level1Map = new Map();

  for (const paper of papers) {
    if (!level1Map.has(paper.categoryLevel1)) {
      level1Map.set(paper.categoryLevel1, new Set());
    }
    if (paper.categoryLevel2) {
      level1Map.get(paper.categoryLevel1).add(paper.categoryLevel2);
    }
  }

  return [...level1Map.entries()]
    .map(([name, children]) => ({
      name,
      children: [...children].sort((left, right) => left.localeCompare(right, 'en'))
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
}

export function findPaperBySlug(papers, slug) {
  return papers.find((paper) => paper.slug === slug) ?? null;
}
