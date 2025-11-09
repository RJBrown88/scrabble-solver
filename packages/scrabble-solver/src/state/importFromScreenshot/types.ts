import type { ImportCellEdit, ImportResult, ImportStage } from '@scrabble-solver/types';

export interface ImportFromScreenshotState {
  /** Current stage of the import flow */
  stage: ImportStage;
  /** Base64 image data URL */
  imageDataUrl: string | null;
  /** Processing progress (0-100) */
  progress: number;
  /** OCR processing result */
  result: ImportResult | null;
  /** User edits to detected cells */
  edits: ImportCellEdit[];
  /** Error message if processing failed */
  error: string | null;
}
