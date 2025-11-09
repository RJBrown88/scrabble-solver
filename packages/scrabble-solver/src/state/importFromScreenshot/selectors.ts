import { createSelector } from '@reduxjs/toolkit';
import type { ImportCell } from '@scrabble-solver/types';

import type { RootState } from '../types';

export const selectImportFromScreenshotState = (state: RootState) => state.importFromScreenshot;

export const selectImportStage = createSelector(
  selectImportFromScreenshotState,
  (importState) => importState.stage,
);

export const selectImportImageDataUrl = createSelector(
  selectImportFromScreenshotState,
  (importState) => importState.imageDataUrl,
);

export const selectImportProgress = createSelector(
  selectImportFromScreenshotState,
  (importState) => importState.progress,
);

export const selectImportResult = createSelector(
  selectImportFromScreenshotState,
  (importState) => importState.result,
);

export const selectImportEdits = createSelector(
  selectImportFromScreenshotState,
  (importState) => importState.edits,
);

export const selectImportError = createSelector(
  selectImportFromScreenshotState,
  (importState) => importState.error,
);

/** Get cells with confidence below threshold */
export const selectLowConfidenceCells = createSelector(
  selectImportResult,
  (result): ImportCell[] => {
    if (!result) {
      return [];
    }

    const LOW_CONFIDENCE_THRESHOLD = 0.7;
    return result.cells.filter((cell) => cell.letter !== null && cell.confidence < LOW_CONFIDENCE_THRESHOLD);
  },
);

/** Get merged cells (OCR result + user edits) */
export const selectMergedCells = createSelector(
  [selectImportResult, selectImportEdits],
  (result, edits) => {
    if (!result) {
      return [];
    }

    const cells = [...result.cells];

    // Apply edits
    edits.forEach((edit) => {
      const cellIndex = edit.row * result.cols + edit.col;
      if (cellIndex >= 0 && cellIndex < cells.length) {
        cells[cellIndex] = {
          ...cells[cellIndex],
          letter: edit.letter,
          isBlank: edit.isBlank,
          confidence: 1.0, // User edit = 100% confidence
        };
      }
    });

    return cells;
  },
);

/** Check if import is in progress */
export const selectIsImportInProgress = createSelector(
  selectImportStage,
  (stage) => stage === 'detecting-grid' || stage === 'recognizing-tiles',
);

/** Check if ready to apply */
export const selectCanApplyImport = createSelector(
  [selectImportStage, selectImportResult],
  (stage, result) => stage === 'preview' && result !== null,
);
