import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { ImportCellEdit, ImportResult, ImportStage } from '@scrabble-solver/types';

import { importFromScreenshotInitialState } from './initialState';

export const importFromScreenshotSlice = createSlice({
  initialState: importFromScreenshotInitialState,
  name: 'importFromScreenshot',
  reducers: {
    /** Upload an image to process */
    uploadImage: (state, action: PayloadAction<{ imageDataUrl: string }>) => {
      state.imageDataUrl = action.payload.imageDataUrl;
      state.stage = ImportStage.Upload;
      state.error = null;
      state.result = null;
      state.edits = [];
      state.progress = 0;
    },

    /** Start processing the uploaded image */
    startProcessing: (state) => {
      state.stage = ImportStage.DetectingGrid;
      state.progress = 0;
      state.error = null;
    },

    /** Update processing progress */
    updateProgress: (state, action: PayloadAction<{ progress: number; stage?: ImportStage }>) => {
      state.progress = action.payload.progress;
      if (action.payload.stage) {
        state.stage = action.payload.stage;
      }
    },

    /** Processing completed successfully */
    processingComplete: (state, action: PayloadAction<{ result: ImportResult }>) => {
      state.result = action.payload.result;
      state.stage = ImportStage.Preview;
      state.progress = 100;
      state.error = null;
    },

    /** Processing failed */
    processingFailed: (state, action: PayloadAction<{ error: string }>) => {
      state.error = action.payload.error;
      state.stage = ImportStage.Error;
      state.progress = 0;
    },

    /** Edit a detected cell */
    editCell: (state, action: PayloadAction<ImportCellEdit>) => {
      const { row, col } = action.payload;
      const existingIndex = state.edits.findIndex((edit) => edit.row === row && edit.col === col);

      if (existingIndex >= 0) {
        state.edits[existingIndex] = action.payload;
      } else {
        state.edits.push(action.payload);
      }
    },

    /** Apply imported cells to board (saga will handle) */
    applyToBoard: () => {
      // Saga handles this
    },

    /** Replace entire board with imported cells (saga will handle) */
    replaceBoard: () => {
      // Saga handles this
    },

    /** Cancel and reset the import flow */
    cancel: (state) => {
      return importFromScreenshotInitialState;
    },

    /** Reset to initial state */
    reset: () => {
      return importFromScreenshotInitialState;
    },
  },
});
