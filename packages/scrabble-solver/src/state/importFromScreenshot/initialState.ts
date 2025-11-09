import { ImportStage } from '@scrabble-solver/types';

import type { ImportFromScreenshotState } from './types';

export const importFromScreenshotInitialState: ImportFromScreenshotState = {
  stage: ImportStage.Idle,
  imageDataUrl: null,
  progress: 0,
  result: null,
  edits: [],
  error: null,
};
