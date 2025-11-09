/**
 * OCR confidence score ranging from 0 (no confidence) to 1 (certain)
 */
export type OcrConfidence = number;

/**
 * A single cell detected during screenshot import
 */
export interface ImportCell {
  /** Row index (0-based) */
  row: number;
  /** Column index (0-based) */
  col: number;
  /** Detected letter/character, null if empty */
  letter: string | null;
  /** Whether this tile is marked as blank */
  isBlank?: boolean;
  /** OCR confidence for this detection (0-1) */
  confidence: OcrConfidence;
}

/**
 * Result of OCR processing on a screenshot
 */
export interface ImportResult {
  /** Number of rows detected */
  rows: number;
  /** Number of columns detected */
  cols: number;
  /** All cells in row-major order */
  cells: ImportCell[];
  /** Optional warnings about quality or detection issues */
  warnings?: string[];
  /** Original image dimensions */
  imageSize: {
    width: number;
    height: number;
  };
  /** Grid detection metadata */
  grid?: {
    /** Corner coordinates in original image */
    corners: Array<{ x: number; y: number }>;
    /** Detected cell size in pixels */
    cellSize: { width: number; height: number };
  };
}

/**
 * Request to process a screenshot
 */
export interface ImportRequest {
  /** Image as data URL (data:image/png;base64,...) */
  imageDataUrl: string;
  /** Game identifier matching configs */
  gameId: string;
  /** Locale identifier (en-GB, pl-PL, etc.) */
  localeId: string;
}

/**
 * Processing stage for import flow
 */
export enum ImportStage {
  Idle = 'idle',
  Upload = 'upload',
  DetectingGrid = 'detecting-grid',
  RecognizingTiles = 'recognizing-tiles',
  Preview = 'preview',
  Error = 'error',
}

/**
 * Edit made to an imported cell
 */
export interface ImportCellEdit {
  row: number;
  col: number;
  letter: string | null;
  isBlank: boolean;
}
