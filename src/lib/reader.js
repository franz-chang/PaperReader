const READER_SPLIT_MIN = 35;
const READER_SPLIT_MAX = 78;
const NOTE_SCALE_MIN = 0.85;
const NOTE_SCALE_MAX = 1.8;
const PDF_ZOOM_OPTIONS = new Set(['page-width', '100', '125', '150', '175', '200']);

export const DEFAULT_READER_PREFERENCES = {
  split: 62,
  noteScale: 1,
  pdfZoom: 'page-width'
};

export function clampReaderSplit(value) {
  return Math.min(READER_SPLIT_MAX, Math.max(READER_SPLIT_MIN, Math.round(value)));
}

export function clampNoteScale(value) {
  return Math.min(NOTE_SCALE_MAX, Math.max(NOTE_SCALE_MIN, Number(value.toFixed(2))));
}

export function normalizePdfZoom(value) {
  return PDF_ZOOM_OPTIONS.has(String(value)) ? String(value) : DEFAULT_READER_PREFERENCES.pdfZoom;
}

export function buildPdfViewerSrc(pdfPath, zoom = DEFAULT_READER_PREFERENCES.pdfZoom) {
  return `${pdfPath}#view=FitH&zoom=${encodeURIComponent(normalizePdfZoom(zoom))}`;
}

export function sanitizeReaderPreferences(raw = {}) {
  return {
    split: clampReaderSplit(raw.split ?? DEFAULT_READER_PREFERENCES.split),
    noteScale: clampNoteScale(raw.noteScale ?? DEFAULT_READER_PREFERENCES.noteScale),
    pdfZoom: normalizePdfZoom(raw.pdfZoom ?? DEFAULT_READER_PREFERENCES.pdfZoom)
  };
}
