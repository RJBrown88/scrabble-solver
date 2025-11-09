import { type PayloadAction } from '@reduxjs/toolkit';
import { Board, Cell, ImportStage, Tile } from '@scrabble-solver/types';
import { call, put, select, takeLatest } from 'redux-saga/effects';

import type { ProcessScreenshotResult } from 'lib/vision';
import { processScreenshot } from 'lib/vision';

import { boardSlice } from '../board';
import { selectConfig, selectLocale } from '../settings';

import { importFromScreenshotSlice } from './slice';
import { selectImportEdits, selectImportImageDataUrl, selectImportResult } from './selectors';

// Can't conveniently type generators for sagas yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGenerator = Generator<any, any, any>;

/**
 * Handle the image processing workflow
 */
function* onStartProcessing(): AnyGenerator {
  try {
    const imageDataUrl = yield select(selectImportImageDataUrl);
    const config = yield select(selectConfig);
    const locale = yield select(selectLocale);

    if (!imageDataUrl) {
      throw new Error('No image uploaded');
    }

    // Update progress: detecting grid
    yield put(
      importFromScreenshotSlice.actions.updateProgress({
        progress: 10,
        stage: ImportStage.DetectingGrid,
      }),
    );

    // Process screenshot with progress callbacks
    const result: ProcessScreenshotResult = yield call(
      processScreenshot,
      {
        imageDataUrl,
        gameId: config.game,
        localeId: locale,
      },
      // Progress callback
      function* (progress: number, stage: ImportStage) {
        yield put(
          importFromScreenshotSlice.actions.updateProgress({
            progress,
            stage,
          }),
        );
      },
    );

    // Processing complete
    yield put(importFromScreenshotSlice.actions.processingComplete({ result }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during processing';
    yield put(importFromScreenshotSlice.actions.processingFailed({ error: errorMessage }));
  }
}

/**
 * Apply imported cells to current board (merge)
 */
function* onApplyToBoard(): AnyGenerator {
  const result = yield select(selectImportResult);
  const edits = yield select(selectImportEdits);

  if (!result) {
    return;
  }

  // Merge OCR results with user edits
  const cells = [...result.cells];
  edits.forEach((edit) => {
    const cellIndex = edit.row * result.cols + edit.col;
    if (cellIndex >= 0 && cellIndex < cells.length) {
      cells[cellIndex] = {
        ...cells[cellIndex],
        letter: edit.letter,
        isBlank: edit.isBlank,
      };
    }
  });

  // Apply non-empty cells to board
  cells.forEach((cell) => {
    if (cell.letter !== null) {
      yield put(
        boardSlice.actions.changeCellValue({
          x: cell.col,
          y: cell.row,
          value: cell.letter,
        }),
      );

      if (cell.isBlank) {
        yield put(
          boardSlice.actions.toggleCellIsBlank({
            x: cell.col,
            y: cell.row,
          }),
        );
      }
    }
  });

  // Reset import state
  yield put(importFromScreenshotSlice.actions.reset());
}

/**
 * Replace entire board with imported cells
 */
function* onReplaceBoard(): AnyGenerator {
  const result = yield select(selectImportResult);
  const edits = yield select(selectImportEdits);
  const config = yield select(selectConfig);

  if (!result) {
    return;
  }

  // Create new board
  const newBoard = Board.create(result.cols, result.rows);

  // Merge OCR results with user edits
  const cells = [...result.cells];
  edits.forEach((edit) => {
    const cellIndex = edit.row * result.cols + edit.col;
    if (cellIndex >= 0 && cellIndex < cells.length) {
      cells[cellIndex] = {
        ...cells[cellIndex],
        letter: edit.letter,
        isBlank: edit.isBlank,
      };
    }
  });

  // Populate board
  cells.forEach((cell, index) => {
    const row = Math.floor(index / result.cols);
    const col = index % result.cols;

    if (cell.letter !== null) {
      const tile = new Tile({
        character: cell.letter,
        isBlank: cell.isBlank || false,
      });

      newBoard.updateCell(col, row, (existingCell) => {
        return new Cell({
          ...existingCell,
          isEmpty: false,
          tile,
        });
      });
    }
  });

  // Replace board
  yield put(boardSlice.actions.change(newBoard));

  // Reset import state
  yield put(importFromScreenshotSlice.actions.reset());
}

/**
 * Root saga for import from screenshot
 */
export function* importFromScreenshotSaga(): AnyGenerator {
  yield takeLatest(importFromScreenshotSlice.actions.startProcessing.type, onStartProcessing);
  yield takeLatest(importFromScreenshotSlice.actions.applyToBoard.type, onApplyToBoard);
  yield takeLatest(importFromScreenshotSlice.actions.replaceBoard.type, onReplaceBoard);
}
