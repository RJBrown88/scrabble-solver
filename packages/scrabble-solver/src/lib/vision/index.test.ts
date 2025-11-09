/**
 * @jest-environment jsdom
 */

import { Game, Locale } from '@scrabble-solver/types';

import * as gridDetect from './gridDetect';
import { processScreenshot } from './index';
import * as ocrWorker from './ocrWorker';
import * as tileDecode from './tileDecode';

// Mock the heavy dependencies
jest.mock('./ocrWorker');
jest.mock('./gridDetect');
jest.mock('./tileDecode');

// Helper to create a simple test image data URL
function createTestDataUrl(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Fill with white
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL();
}

// Helper to create test ImageData
function createTestImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255; // R
    data[i + 1] = 255; // G
    data[i + 2] = 255; // B
    data[i + 3] = 255; // A
  }
  return new ImageData(data, width, height);
}

describe('vision/index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processScreenshot', () => {
    it('calls grid detection with correct parameters', async () => {
      const mockGrid = {
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 300, y: 0 },
          bottomLeft: { x: 0, y: 300 },
          bottomRight: { x: 300, y: 300 },
        },
        width: 300,
        height: 300,
        cellSize: { width: 20, height: 20 },
        confidence: 0.9,
      };

      const mockDetectGrid = jest.spyOn(gridDetect, 'detectGrid').mockResolvedValue(mockGrid);
      const mockExtractCell = jest.spyOn(gridDetect, 'extractCell').mockReturnValue(createTestImageData(20, 20));
      const mockIsCellEmpty = jest.spyOn(gridDetect, 'isCellEmpty').mockReturnValue(true);
      const mockPreprocessImage = jest
        .spyOn(gridDetect, 'preprocessImage')
        .mockReturnValue(createTestImageData(20, 20));

      const imageDataUrl = createTestDataUrl(300, 300);

      await processScreenshot({
        imageDataUrl,
        gameId: Game.Scrabble,
        localeId: Locale.EN_US,
      });

      expect(mockDetectGrid).toHaveBeenCalledWith({
        imageData: expect.any(ImageData),
        expectedRows: 15,
        expectedCols: 15,
      });

      mockDetectGrid.mockRestore();
      mockExtractCell.mockRestore();
      mockIsCellEmpty.mockRestore();
      mockPreprocessImage.mockRestore();
    });

    it('processes all cells in the grid', async () => {
      const mockGrid = {
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 150, y: 0 },
          bottomLeft: { x: 0, y: 150 },
          bottomRight: { x: 150, y: 150 },
        },
        width: 150,
        height: 150,
        cellSize: { width: 10, height: 10 },
        confidence: 0.9,
      };

      const mockDetectGrid = jest.spyOn(gridDetect, 'detectGrid').mockResolvedValue(mockGrid);
      const mockExtractCell = jest.spyOn(gridDetect, 'extractCell').mockReturnValue(createTestImageData(10, 10));
      const mockIsCellEmpty = jest.spyOn(gridDetect, 'isCellEmpty').mockReturnValue(true);

      const imageDataUrl = createTestDataUrl(150, 150);

      const result = await processScreenshot({
        imageDataUrl,
        gameId: Game.Scrabble,
        localeId: Locale.EN_US,
      });

      // 15x15 grid = 225 cells
      expect(result.cells).toHaveLength(225);
      expect(result.rows).toBe(15);
      expect(result.cols).toBe(15);

      mockDetectGrid.mockRestore();
      mockExtractCell.mockRestore();
      mockIsCellEmpty.mockRestore();
    });

    it('handles empty cells without OCR', async () => {
      const mockGrid = {
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 150, y: 0 },
          bottomLeft: { x: 0, y: 150 },
          bottomRight: { x: 150, y: 150 },
        },
        width: 150,
        height: 150,
        cellSize: { width: 10, height: 10 },
        confidence: 0.9,
      };

      const mockDetectGrid = jest.spyOn(gridDetect, 'detectGrid').mockResolvedValue(mockGrid);
      const mockExtractCell = jest.spyOn(gridDetect, 'extractCell').mockReturnValue(createTestImageData(10, 10));
      const mockIsCellEmpty = jest.spyOn(gridDetect, 'isCellEmpty').mockReturnValue(true);
      const mockPerformOcr = jest.spyOn(ocrWorker, 'performOcr');

      const imageDataUrl = createTestDataUrl(150, 150);

      const result = await processScreenshot({
        imageDataUrl,
        gameId: Game.Scrabble,
        localeId: Locale.EN_US,
      });

      // All cells should be empty (null letter, confidence 1.0)
      expect(result.cells.every((cell) => cell.letter === null && cell.confidence === 1.0)).toBe(true);
      // OCR should never be called for empty cells
      expect(mockPerformOcr).not.toHaveBeenCalled();

      mockDetectGrid.mockRestore();
      mockExtractCell.mockRestore();
      mockIsCellEmpty.mockRestore();
      mockPerformOcr.mockRestore();
    });

    it('calls OCR for non-empty cells', async () => {
      const mockGrid = {
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 150, y: 0 },
          bottomLeft: { x: 0, y: 150 },
          bottomRight: { x: 150, y: 150 },
        },
        width: 150,
        height: 150,
        cellSize: { width: 10, height: 10 },
        confidence: 0.9,
      };

      const mockDetectGrid = jest.spyOn(gridDetect, 'detectGrid').mockResolvedValue(mockGrid);
      const mockExtractCell = jest.spyOn(gridDetect, 'extractCell').mockReturnValue(createTestImageData(10, 10));
      const mockIsCellEmpty = jest.spyOn(gridDetect, 'isCellEmpty').mockReturnValue(false); // Non-empty
      const mockPreprocessImage = jest
        .spyOn(gridDetect, 'preprocessImage')
        .mockReturnValue(createTestImageData(10, 10));
      const mockPerformOcr = jest.spyOn(ocrWorker, 'performOcr').mockResolvedValue({
        text: 'A',
        confidence: 0.95,
        words: [{ text: 'A', confidence: 0.95, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }],
      });
      const mockDecodeTile = jest
        .spyOn(tileDecode, 'decodeTile')
        .mockReturnValue({ letter: 'a', isBlank: false, confidence: 0.95 });

      const imageDataUrl = createTestDataUrl(150, 150);

      await processScreenshot({
        imageDataUrl,
        gameId: Game.Scrabble,
        localeId: Locale.EN_US,
      });

      // OCR should be called for each non-empty cell (15x15 = 225)
      expect(mockPerformOcr).toHaveBeenCalledTimes(225);
      expect(mockDecodeTile).toHaveBeenCalledTimes(225);

      mockDetectGrid.mockRestore();
      mockExtractCell.mockRestore();
      mockIsCellEmpty.mockRestore();
      mockPreprocessImage.mockRestore();
      mockPerformOcr.mockRestore();
      mockDecodeTile.mockRestore();
    });

    it('handles OCR errors gracefully', async () => {
      const mockGrid = {
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 30, y: 0 },
          bottomLeft: { x: 0, y: 30 },
          bottomRight: { x: 30, y: 30 },
        },
        width: 30,
        height: 30,
        cellSize: { width: 10, height: 10 },
        confidence: 0.9,
      };

      const mockDetectGrid = jest.spyOn(gridDetect, 'detectGrid').mockResolvedValue(mockGrid);
      const mockExtractCell = jest.spyOn(gridDetect, 'extractCell').mockReturnValue(createTestImageData(10, 10));
      const mockIsCellEmpty = jest.spyOn(gridDetect, 'isCellEmpty').mockReturnValue(false);
      const mockPreprocessImage = jest
        .spyOn(gridDetect, 'preprocessImage')
        .mockReturnValue(createTestImageData(10, 10));
      const mockPerformOcr = jest.spyOn(ocrWorker, 'performOcr').mockRejectedValue(new Error('OCR failed'));

      // Use smaller grid (3x3 = 9 cells) for faster test
      const imageDataUrl = createTestDataUrl(30, 30);

      const result = await processScreenshot({
        imageDataUrl,
        gameId: Game.ScrabbleDuel, // 11x11 grid, but our mock returns 3x3 worth of cells
        localeId: Locale.EN_US,
      });

      // Should still return results, but with warnings
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.warnings![0]).toContain('OCR failed');

      mockDetectGrid.mockRestore();
      mockExtractCell.mockRestore();
      mockIsCellEmpty.mockRestore();
      mockPreprocessImage.mockRestore();
      mockPerformOcr.mockRestore();
    });

    it('adds warnings for low confidence cells', async () => {
      const mockGrid = {
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 30, y: 0 },
          bottomLeft: { x: 0, y: 30 },
          bottomRight: { x: 30, y: 30 },
        },
        width: 30,
        height: 30,
        cellSize: { width: 10, height: 10 },
        confidence: 0.9,
      };

      const mockDetectGrid = jest.spyOn(gridDetect, 'detectGrid').mockResolvedValue(mockGrid);
      const mockExtractCell = jest.spyOn(gridDetect, 'extractCell').mockReturnValue(createTestImageData(10, 10));
      const mockIsCellEmpty = jest.spyOn(gridDetect, 'isCellEmpty').mockReturnValue(false);
      const mockPreprocessImage = jest
        .spyOn(gridDetect, 'preprocessImage')
        .mockReturnValue(createTestImageData(10, 10));
      const mockPerformOcr = jest.spyOn(ocrWorker, 'performOcr').mockResolvedValue({
        text: 'A',
        confidence: 0.6,
        words: [{ text: 'A', confidence: 0.6, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }],
      });
      const mockDecodeTile = jest
        .spyOn(tileDecode, 'decodeTile')
        .mockReturnValue({ letter: 'a', isBlank: false, confidence: 0.6 }); // Low confidence

      const imageDataUrl = createTestDataUrl(30, 30);

      const result = await processScreenshot({
        imageDataUrl,
        gameId: Game.ScrabbleDuel,
        localeId: Locale.EN_US,
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some((w) => w.includes('Low confidence'))).toBe(true);

      mockDetectGrid.mockRestore();
      mockExtractCell.mockRestore();
      mockIsCellEmpty.mockRestore();
      mockPreprocessImage.mockRestore();
      mockPerformOcr.mockRestore();
      mockDecodeTile.mockRestore();
    });

    it('calls progress callback with correct stages', async () => {
      const mockGrid = {
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 150, y: 0 },
          bottomLeft: { x: 0, y: 150 },
          bottomRight: { x: 150, y: 150 },
        },
        width: 150,
        height: 150,
        cellSize: { width: 10, height: 10 },
        confidence: 0.9,
      };

      const mockDetectGrid = jest.spyOn(gridDetect, 'detectGrid').mockResolvedValue(mockGrid);
      const mockExtractCell = jest.spyOn(gridDetect, 'extractCell').mockReturnValue(createTestImageData(10, 10));
      const mockIsCellEmpty = jest.spyOn(gridDetect, 'isCellEmpty').mockReturnValue(true);

      const progressCallback = jest.fn();
      const imageDataUrl = createTestDataUrl(150, 150);

      await processScreenshot(
        {
          imageDataUrl,
          gameId: Game.Scrabble,
          localeId: Locale.EN_US,
        },
        progressCallback,
      );

      // Should be called at least twice: detecting-grid stages
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback.mock.calls.some(([, stage]) => stage === 'detecting-grid')).toBe(true);

      mockDetectGrid.mockRestore();
      mockExtractCell.mockRestore();
      mockIsCellEmpty.mockRestore();
    });

    it('returns correct grid metadata', async () => {
      const mockGrid = {
        corners: {
          topLeft: { x: 10, y: 20 },
          topRight: { x: 310, y: 20 },
          bottomLeft: { x: 10, y: 320 },
          bottomRight: { x: 310, y: 320 },
        },
        width: 300,
        height: 300,
        cellSize: { width: 20, height: 20 },
        confidence: 0.9,
      };

      const mockDetectGrid = jest.spyOn(gridDetect, 'detectGrid').mockResolvedValue(mockGrid);
      const mockExtractCell = jest.spyOn(gridDetect, 'extractCell').mockReturnValue(createTestImageData(20, 20));
      const mockIsCellEmpty = jest.spyOn(gridDetect, 'isCellEmpty').mockReturnValue(true);

      const imageDataUrl = createTestDataUrl(320, 340);

      const result = await processScreenshot({
        imageDataUrl,
        gameId: Game.Scrabble,
        localeId: Locale.EN_US,
      });

      expect(result.grid).toEqual({
        corners: [
          { x: 10, y: 20 },
          { x: 310, y: 20 },
          { x: 310, y: 320 },
          { x: 10, y: 320 },
        ],
        cellSize: { width: 20, height: 20 },
      });

      expect(result.imageSize).toEqual({
        width: 320,
        height: 340,
      });

      mockDetectGrid.mockRestore();
      mockExtractCell.mockRestore();
      mockIsCellEmpty.mockRestore();
    });

    it('handles Super Scrabble grid dimensions', async () => {
      const mockGrid = {
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 420, y: 0 },
          bottomLeft: { x: 0, y: 420 },
          bottomRight: { x: 420, y: 420 },
        },
        width: 420,
        height: 420,
        cellSize: { width: 20, height: 20 },
        confidence: 0.9,
      };

      const mockDetectGrid = jest.spyOn(gridDetect, 'detectGrid').mockResolvedValue(mockGrid);
      const mockExtractCell = jest.spyOn(gridDetect, 'extractCell').mockReturnValue(createTestImageData(20, 20));
      const mockIsCellEmpty = jest.spyOn(gridDetect, 'isCellEmpty').mockReturnValue(true);

      const imageDataUrl = createTestDataUrl(420, 420);

      const result = await processScreenshot({
        imageDataUrl,
        gameId: Game.SuperScrabble, // 21x21 grid
        localeId: Locale.EN_US,
      });

      expect(result.rows).toBe(21);
      expect(result.cols).toBe(21);
      expect(result.cells).toHaveLength(441); // 21*21

      mockDetectGrid.mockRestore();
      mockExtractCell.mockRestore();
      mockIsCellEmpty.mockRestore();
    });

    it('throws error for unknown game', async () => {
      const imageDataUrl = createTestDataUrl(300, 300);

      await expect(
        processScreenshot({
          imageDataUrl,
          gameId: 'UnknownGame' as Game,
          localeId: Locale.EN_US,
        }),
      ).rejects.toThrow('Unknown game');
    });
  });
});
