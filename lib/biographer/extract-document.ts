/**
 * Client-side document extraction.
 *
 * Do NOT import this from server components or API routes — it uses
 * browser APIs (FileReader) and lazy-loaded browser bundles (mammoth, pdfjs-dist).
 *
 * Supported:  .txt  .md  .docx  .pdf (text-layer only)
 */

export type ExtractionResult = {
  text: string;
  wordCount: number;
  filename: string;
};

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md', '.docx', '.pdf']);

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(
        new ExtractionError(
          `Could not read "${file.name}". The file may be corrupt or use an unsupported encoding.`,
        ),
      );
    reader.readAsText(file, 'utf-8');
  });
}

async function extractPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ');
    pageTexts.push(pageText);
  }

  const text = pageTexts.join('\n').trim();
  if (!text) {
    throw new ExtractionError(
      `"${file.name}" appears to be a scanned or image-only PDF — there is no text layer to extract. ` +
      `Please export it as .docx or .txt from your word processor and try again.`,
    );
  }
  return text;
}

async function extractDocx(file: File): Promise<string> {
  // Dynamic import keeps mammoth out of the SSR bundle.
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  if (!result.value.trim()) {
    throw new ExtractionError(
      `No text could be extracted from "${file.name}". The document may be empty or image-only.`,
    );
  }
  return result.value;
}

/**
 * Extract plain text from an uploaded File.
 *
 * Throws ExtractionError (user-friendly message) on any failure so the
 * caller can display it directly without wrapping.
 */
export async function extractDocument(file: File): Promise<ExtractionResult> {
  const ext = getExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new ExtractionError(
      `"${file.name}" is not a supported file type. Please upload a .txt, .md, .docx, or .pdf file.`,
    );
  }

  let text: string;

  if (ext === '.txt' || ext === '.md') {
    text = await readAsText(file);
  } else if (ext === '.pdf') {
    text = await extractPdf(file);
  } else {
    // ext === '.docx'
    text = await extractDocx(file);
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new ExtractionError(
      `"${file.name}" appears to be empty. Please check the file and try again.`,
    );
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  return { text: trimmed, filename: file.name, wordCount };
}
