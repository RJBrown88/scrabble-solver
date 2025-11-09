/**
 * OCR Worker wrapper using Tesseract.js
 * Lazy-loads Tesseract and processes images in a Web Worker
 */

import type { ImportStage, Locale } from '@scrabble-solver/types';

// Tesseract.js types
interface TesseractWorker {
  recognize: (image: string) => Promise<TesseractResult>;
  terminate: () => Promise<void>;
}

interface TesseractResult {
  data: {
    text: string;
    words: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
    lines: Array<{
      text: string;
      confidence: number;
      words: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
      }>;
    }>;
  };
}

interface TesseractModule {
  createWorker: (options?: { logger?: (info: ProgressInfo) => void }) => Promise<TesseractWorker>;
}

interface ProgressInfo {
  status: string;
  progress: number;
}

/**
 * Map locale to Tesseract language code
 */
const LOCALE_TO_TESSERACT_LANG: Record<Locale, string> = {
  'de-DE': 'deu',
  'en-GB': 'eng',
  'en-US': 'eng',
  'es-ES': 'spa',
  'fa-IR': 'fas',
  'fr-FR': 'fra',
  'pl-PL': 'pol',
  'ro-RO': 'ron',
  'tr-TR': 'tur',
};

let tesseractModule: TesseractModule | null = null;
let currentWorker: TesseractWorker | null = null;

/**
 * Lazy-load Tesseract.js module
 */
async function loadTesseract(): Promise<TesseractModule> {
  if (tesseractModule) {
    return tesseractModule;
  }

  // Dynamic import to avoid including in main bundle
  const Tesseract = await import('tesseract.js');
  tesseractModule = Tesseract as unknown as TesseractModule;

  return tesseractModule;
}

/**
 * OCR processing options
 */
export interface OcrOptions {
  /** Image to process (data URL or canvas) */
  image: string | HTMLCanvasElement;
  /** Locale for language selection */
  locale: Locale;
  /** Progress callback */
  onProgress?: (progress: number, stage: ImportStage) => void;
}

/**
 * OCR result
 */
export interface OcrResult {
  /** Detected text */
  text: string;
  /** Individual words with confidence and bounding boxes */
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  /** Lines of text */
  lines: Array<{
    text: string;
    confidence: number;
    words: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
  }>;
}

/**
 * Perform OCR on an image using Tesseract
 */
export async function performOcr(options: OcrOptions): Promise<OcrResult> {
  const { image, locale, onProgress } = options;

  // Load Tesseract
  const Tesseract = await loadTesseract();

  // Get language code
  const lang = LOCALE_TO_TESSERACT_LANG[locale];

  // Create worker with progress logger
  const worker = await Tesseract.createWorker({
    logger: (info: ProgressInfo) => {
      if (onProgress) {
        // Map Tesseract progress (0-1) to percentage (0-100)
        const progress = Math.floor(info.progress * 100);
        onProgress(progress, 'recognizing-tiles' as ImportStage);
      }
    },
  });

  // Store reference to terminate later
  currentWorker = worker;

  try {
    // Recognize text
    const result = await worker.recognize(image);

    return {
      text: result.data.text,
      words: result.data.words,
      lines: result.data.lines,
    };
  } finally {
    // Clean up worker
    await worker.terminate();
    currentWorker = null;
  }
}

/**
 * Terminate any active OCR worker
 */
export async function terminateOcrWorker(): Promise<void> {
  if (currentWorker) {
    await currentWorker.terminate();
    currentWorker = null;
  }
}

/**
 * Check if OCR worker is currently active
 */
export function isOcrWorkerActive(): boolean {
  return currentWorker !== null;
}
