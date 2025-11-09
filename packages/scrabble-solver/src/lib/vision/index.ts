/**
 * Vision processing orchestrator
 * Coordinates grid detection, OCR, and tile decoding
 */

import { games } from '@scrabble-solver/configs';
import type { Game, ImportCell, ImportResult, ImportStage, Locale } from '@scrabble-solver/types';

import { detectGrid, extractCell, isCellEmpty, preprocessImage } from './gridDetect';
import { performOcr } from './ocrWorker';
import { decodeTile } from './tileDecode';

export type { DecodedTile } from './tileDecode';
export type { DetectedGrid, GridCorners } from './gridDetect';
export type { OcrOptions, OcrResult } from './ocrWorker';

export interface ProcessScreenshotOptions {
  /** Image as data URL */
  imageDataUrl: string;
  /** Game type */
  gameId: Game;
  /** Locale for OCR language */
  localeId: Locale;
}

export interface ProcessScreenshotResult extends ImportResult {}

/**
 * Convert data URL to ImageData
 */
async function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}

/**
 * Convert ImageData to data URL
 */
function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

/**
 * Process screenshot and extract board state
 */
export async function processScreenshot(
  options: ProcessScreenshotOptions,
  progressCallback?: (progress: number, stage: ImportStage) => void | Generator,
): Promise<ProcessScreenshotResult> {
  const { imageDataUrl, gameId, localeId } = options;

  // Find config
  const config = Object.values(games).find((c) => c.game === gameId);
  if (!config) {
    throw new Error(`Unknown game: ${gameId}`);
  }

  const rows = config.boardHeight;
  const cols = config.boardWidth;

  // Convert image to ImageData
  if (progressCallback) {
    const result = progressCallback(5, 'detecting-grid');
    if (result && typeof result === 'object' && 'next' in result) {
      // It's a generator, yield
      // @ts-expect-error Generator yield
      yield result;
    }
  }

  const imageData = await dataUrlToImageData(imageDataUrl);

  // Detect grid
  if (progressCallback) {
    const result = progressCallback(10, 'detecting-grid');
    if (result && typeof result === 'object' && 'next' in result) {
      // @ts-expect-error Generator yield
      yield result;
    }
  }

  const grid = await detectGrid({
    imageData,
    expectedRows: rows,
    expectedCols: cols,
  });

  // Process each cell
  const cells: ImportCell[] = [];
  const warnings: string[] = [];

  let processedCells = 0;
  const totalCells = rows * cols;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Extract cell image
      const cellImageData = extractCell(imageData, grid, row, col);

      // Check if empty
      if (isCellEmpty(cellImageData)) {
        cells.push({
          row,
          col,
          letter: null,
          isBlank: false,
          confidence: 1.0,
        });
        processedCells++;
        continue;
      }

      // Preprocess for OCR
      const processedCell = preprocessImage(cellImageData);
      const cellDataUrl = imageDataToDataUrl(processedCell);

      try {
        // Perform OCR on cell
        const ocrResult = await performOcr({
          image: cellDataUrl,
          locale: localeId,
          onProgress: (ocrProgress) => {
            // Calculate overall progress: grid detection (10%) + OCR (90%)
            const cellProgress = (processedCells + ocrProgress / 100) / totalCells;
            const overallProgress = 10 + cellProgress * 90;

            if (progressCallback) {
              const result = progressCallback(Math.floor(overallProgress), 'recognizing-tiles');
              if (result && typeof result === 'object' && 'next' in result) {
                // @ts-expect-error Generator yield
                yield result;
              }
            }
          },
        });

        // Get best word/character
        const bestWord = ocrResult.words[0];
        const text = bestWord?.text || '';
        const confidence = bestWord?.confidence || 0;

        // Decode tile
        const decoded = decodeTile(text, confidence, config, localeId);

        cells.push({
          row,
          col,
          letter: decoded.letter,
          isBlank: decoded.isBlank,
          confidence: decoded.confidence,
        });

        // Add warning if low confidence and not empty
        if (decoded.letter && decoded.confidence < 0.7) {
          warnings.push(`Low confidence for cell (${row}, ${col}): "${decoded.letter}"`);
        }
      } catch (error) {
        // OCR failed for this cell
        cells.push({
          row,
          col,
          letter: null,
          isBlank: false,
          confidence: 0,
        });

        warnings.push(`OCR failed for cell (${row}, ${col}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      processedCells++;
    }
  }

  return {
    rows,
    cols,
    cells,
    warnings: warnings.length > 0 ? warnings : undefined,
    imageSize: {
      width: imageData.width,
      height: imageData.height,
    },
    grid: {
      corners: [
        { x: grid.corners.topLeft.x, y: grid.corners.topLeft.y },
        { x: grid.corners.topRight.x, y: grid.corners.topRight.y },
        { x: grid.corners.bottomRight.x, y: grid.corners.bottomRight.y },
        { x: grid.corners.bottomLeft.x, y: grid.corners.bottomLeft.y },
      ],
      cellSize: grid.cellSize,
    },
  };
}

// Export individual utilities
export { detectGrid, extractCell, isCellEmpty, preprocessImage } from './gridDetect';
export { performOcr, terminateOcrWorker, isOcrWorkerActive } from './ocrWorker';
export { decodeTile, decodeTiles } from './tileDecode';
