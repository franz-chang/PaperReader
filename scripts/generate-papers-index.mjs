import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PAPER_DIR = path.join(ROOT_DIR, 'Paper');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const OUTPUT_PATH = path.join(DATA_DIR, 'papers.json');

function normalizeToPosix(value) {
  return value.split(path.sep).join('/');
}

function slugifyPart(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function makePaperSlug(relativePaperDir) {
  return normalizeToPosix(relativePaperDir)
    .split('/')
    .map(slugifyPart)
    .filter(Boolean)
    .join('__');
}

function sortByName(values) {
  return [...values].sort((left, right) => left.localeCompare(right, 'en'));
}

function buildRecord(relativeDir, files) {
  const segments = normalizeToPosix(relativeDir).split('/');
  const categorySegments = segments.slice(0, -1);
  const pdfFiles = sortByName(files.filter((file) => file.toLowerCase().endsWith('.pdf')));
  const noteFile = files.find((file) => file.toLowerCase() === 'note.md') ?? null;

  return {
    slug: makePaperSlug(relativeDir),
    title: segments.at(-1),
    categoryLevel1: categorySegments[0] ?? '',
    categoryLevel2: categorySegments[1] ?? '',
    categoryPath: categorySegments.join(' / '),
    directoryPath: `Paper/${normalizeToPosix(relativeDir)}`,
    pdfPath: pdfFiles[0] ? `Paper/${normalizeToPosix(path.posix.join(relativeDir, pdfFiles[0]))}` : '',
    notePath: noteFile ? `Paper/${normalizeToPosix(path.posix.join(relativeDir, noteFile))}` : '',
    hasPdf: Boolean(pdfFiles[0]),
    hasNote: Boolean(noteFile),
    updatedAt: null
  };
}

export function collectPaperRecords(relativeFiles) {
  const grouped = new Map();

  for (const file of relativeFiles) {
    const normalized = normalizeToPosix(file);
    const dirname = path.posix.dirname(normalized);
    const basename = path.posix.basename(normalized);

    if (dirname === '.' || !dirname) {
      continue;
    }

    if (!grouped.has(dirname)) {
      grouped.set(dirname, []);
    }

    grouped.get(dirname).push(basename);
  }

  return [...grouped.entries()]
    .map(([relativeDir, files]) => buildRecord(relativeDir, files))
    .filter((record) => record.hasPdf || record.hasNote)
    .sort((left, right) => {
      const categoryCompare = left.categoryPath.localeCompare(right.categoryPath, 'en');
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      return left.title.localeCompare(right.title, 'en');
    });
}

async function walkFiles(directory, relativeBase = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = relativeBase ? path.join(relativeBase, entry.name) : entry.name;

    if (entry.isDirectory()) {
      results.push(...(await walkFiles(absolutePath, relativePath)));
    } else if (entry.isFile()) {
      results.push(relativePath);
    }
  }

  return results;
}

export async function buildPaperIndex(options = {}) {
  const paperDir = options.paperDir ?? PAPER_DIR;
  const relativeFiles = await walkFiles(paperDir);
  const records = collectPaperRecords(relativeFiles);

  await Promise.all(
    records.map(async (record) => {
      const targets = [record.pdfPath, record.notePath].filter(Boolean);
      const timestamps = await Promise.all(
        targets.map(async (target) => {
          const stats = await fs.stat(path.join(ROOT_DIR, target));
          return stats.mtimeMs;
        })
      );

      record.updatedAt = new Date(Math.max(...timestamps)).toISOString();
    })
  );

  return records.sort((left, right) => {
    const updatedCompare = right.updatedAt.localeCompare(left.updatedAt);
    if (updatedCompare !== 0) {
      return updatedCompare;
    }
    return left.title.localeCompare(right.title, 'en');
  });
}

export async function writePaperIndex(outputPath = OUTPUT_PATH) {
  const papers = await buildPaperIndex();
  const payload = {
    generatedAt: new Date().toISOString(),
    paperCount: papers.length,
    papers
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const payload = await writePaperIndex();
  console.log(`Generated ${payload.paperCount} papers to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
}
