/**
 * @jest-environment jsdom
 */

import { detectGrid, extractCell, isCellEmpty, preprocessImage } from './gridDetect';

// Helper to create test ImageData
function createTestImageData(width: number, height: number, fill: number = 255): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  // Fill with specified color (default white)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill; // R
    data[i + 1] = fill; // G
    data[i + 2] = fill; // B
    data[i + 3] = 255; // A (always opaque)
  }

  return new ImageData(data, width, height);
}

// Helper to set a pixel color
function setPixel(imageData: ImageData, x: number, y: number, r: number, g: number, b: number, a = 255): void {
  const idx = (y * imageData.width + x) * 4;
  imageData.data[idx] = r;
  imageData.data[idx + 1] = g;
  imageData.data[idx + 2] = b;
  imageData.data[idx + 3] = a;
}

// Helper to get pixel color
function getPixel(imageData: ImageData, x: number, y: number): { r: number; g: number; b: number; a: number } {
  const idx = (y * imageData.width + x) * 4;
  return {
    r: imageData.data[idx],
    g: imageData.data[idx + 1],
    b: imageData.data[idx + 2],
    a: imageData.data[idx + 3],
  };
}

describe('gridDetect', () => {
  describe('detectGrid', () => {
    it('detects grid bounds with 5% padding', async () => {
      const imageData = createTestImageData(1000, 1000);
      const expectedRows = 15;
      const expectedCols = 15;

      const result = await detectGrid({ imageData, expectedRows, expectedCols });

      // 5% padding on each side
      expect(result.corners.topLeft).toEqual({ x: 50, y: 50 });
      expect(result.corners.topRight).toEqual({ x: 950, y: 50 });
      expect(result.corners.bottomLeft).toEqual({ x: 50, y: 950 });
      expect(result.corners.bottomRight).toEqual({ x: 950, y: 950 });
    });

    it('calculates correct grid dimensions', async () => {
      const imageData = createTestImageData(1000, 1000);
      const expectedRows = 15;
      const expectedCols = 15;

      const result = await detectGrid({ imageData, expectedRows, expectedCols });

      expect(result.width).toBe(900); // 1000 - 2*50
      expect(result.height).toBe(900);
    });

    it('calculates cell size correctly', async () => {
      const imageData = createTestImageData(1000, 1000);
      const expectedRows = 15;
      const expectedCols = 15;

      const result = await detectGrid({ imageData, expectedRows, expectedCols });

      expect(result.cellSize.width).toBe(60); // 900 / 15
      expect(result.cellSize.height).toBe(60);
    });

    it('handles non-square grids', async () => {
      const imageData = createTestImageData(1200, 800);
      const expectedRows = 10;
      const expectedCols = 20;

      const result = await detectGrid({ imageData, expectedRows, expectedCols });

      // Grid: 1200 * 0.9 = 1080, 800 * 0.9 = 720
      expect(result.width).toBe(1080);
      expect(result.height).toBe(720);
      expect(result.cellSize.width).toBe(54); // 1080 / 20
      expect(result.cellSize.height).toBe(72); // 720 / 10
    });

    it('handles rectangular images', async () => {
      const imageData = createTestImageData(1920, 1080);
      const expectedRows = 15;
      const expectedCols = 15;

      const result = await detectGrid({ imageData, expectedRows, expectedCols });

      expect(result.corners.topLeft).toEqual({ x: 96, y: 54 });
      expect(result.width).toBe(1728); // 1920 * 0.9
      expect(result.height).toBe(972); // 1080 * 0.9
    });

    it('returns high confidence for MVP implementation', async () => {
      const imageData = createTestImageData(1000, 1000);
      const expectedRows = 15;
      const expectedCols = 15;

      const result = await detectGrid({ imageData, expectedRows, expectedCols });

      expect(result.confidence).toBe(0.9);
    });

    it('handles small images', async () => {
      const imageData = createTestImageData(300, 300);
      const expectedRows = 15;
      const expectedCols = 15;

      const result = await detectGrid({ imageData, expectedRows, expectedCols });

      expect(result.width).toBe(270);
      expect(result.height).toBe(270);
      expect(result.cellSize.width).toBe(18);
      expect(result.cellSize.height).toBe(18);
    });

    it('handles Super Scrabble dimensions', async () => {
      const imageData = createTestImageData(2000, 2000);
      const expectedRows = 21; // Super Scrabble is 21x21
      const expectedCols = 21;

      const result = await detectGrid({ imageData, expectedRows, expectedCols });

      expect(result.cellSize.width).toBeCloseTo(85.71, 1); // 1800 / 21
      expect(result.cellSize.height).toBeCloseTo(85.71, 1);
    });
  });

  describe('extractCell', () => {
    it('extracts cell at correct position', () => {
      const imageData = createTestImageData(300, 300);
      const grid = {
        corners: {
          topLeft: { x: 15, y: 15 },
          topRight: { x: 285, y: 15 },
          bottomLeft: { x: 15, y: 285 },
          bottomRight: { x: 285, y: 285 },
        },
        width: 270,
        height: 270,
        cellSize: { width: 18, height: 18 }, // 270 / 15
        confidence: 0.9,
      };

      const cellData = extractCell(imageData, grid, 0, 0);

      expect(cellData.width).toBe(18);
      expect(cellData.height).toBe(18);
    });

    it('extracts cell from middle of grid', () => {
      const imageData = createTestImageData(300, 300, 128);
      const grid = {
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

      // Set a specific color in the target cell
      for (let y = 100; y < 120; y++) {
        for (let x = 100; x < 120; x++) {
          setPixel(imageData, x, y, 255, 0, 0); // Red
        }
      }

      // Extract cell at row 5, col 5 (100-120 pixel range)
      const cellData = extractCell(imageData, grid, 5, 5);

      // Verify the cell contains the red pixels
      const topLeftPixel = getPixel(cellData, 0, 0);
      expect(topLeftPixel.r).toBe(255);
      expect(topLeftPixel.g).toBe(0);
      expect(topLeftPixel.b).toBe(0);
    });

    it('extracts all corners correctly', () => {
      const imageData = createTestImageData(200, 200);
      const grid = {
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 200, y: 0 },
          bottomLeft: { x: 0, y: 200 },
          bottomRight: { x: 200, y: 200 },
        },
        width: 200,
        height: 200,
        cellSize: { width: 20, height: 20 }, // 10x10 grid
        confidence: 0.9,
      };

      // Top-left cell (0, 0)
      const topLeft = extractCell(imageData, grid, 0, 0);
      expect(topLeft.width).toBe(20);
      expect(topLeft.height).toBe(20);

      // Bottom-right cell (9, 9)
      const bottomRight = extractCell(imageData, grid, 9, 9);
      expect(bottomRight.width).toBe(20);
      expect(bottomRight.height).toBe(20);
    });

    it('handles cells at grid boundaries', () => {
      const imageData = createTestImageData(150, 150);
      const grid = {
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

      const cellData = extractCell(imageData, grid, 14, 14);

      expect(cellData.width).toBe(10);
      expect(cellData.height).toBe(10);
    });

    it('preserves pixel data correctly', () => {
      const imageData = createTestImageData(100, 100, 0); // Black background
      const grid = {
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 100, y: 0 },
          bottomLeft: { x: 0, y: 100 },
          bottomRight: { x: 100, y: 100 },
        },
        width: 100,
        height: 100,
        cellSize: { width: 10, height: 10 },
        confidence: 0.9,
      };

      // Create a pattern in cell (3, 3) - pixels 30-40
      for (let y = 30; y < 40; y++) {
        for (let x = 30; x < 40; x++) {
          setPixel(imageData, x, y, 100, 150, 200, 255);
        }
      }

      const cellData = extractCell(imageData, grid, 3, 3);

      // Check that the color is preserved
      const pixel = getPixel(cellData, 5, 5);
      expect(pixel.r).toBe(100);
      expect(pixel.g).toBe(150);
      expect(pixel.b).toBe(200);
      expect(pixel.a).toBe(255);
    });
  });

  describe('preprocessImage', () => {
    it('converts color image to grayscale', () => {
      const imageData = createTestImageData(10, 10, 0);

      // Set a red pixel
      setPixel(imageData, 5, 5, 255, 0, 0);

      const processed = preprocessImage(imageData);

      // Red pixel (255, 0, 0) -> grayscale ~76 -> enhanced to 0 (below 128 threshold)
      const pixel = getPixel(processed, 5, 5);
      expect(pixel.r).toBe(0);
      expect(pixel.g).toBe(0);
      expect(pixel.b).toBe(0);
    });

    it('enhances contrast with binary thresholding', () => {
      const imageData = createTestImageData(10, 10, 0);

      // Light gray pixel (above threshold)
      setPixel(imageData, 3, 3, 200, 200, 200);
      // Dark gray pixel (below threshold)
      setPixel(imageData, 7, 7, 50, 50, 50);

      const processed = preprocessImage(imageData);

      // Light gray should become white
      const lightPixel = getPixel(processed, 3, 3);
      expect(lightPixel.r).toBe(255);
      expect(lightPixel.g).toBe(255);
      expect(lightPixel.b).toBe(255);

      // Dark gray should become black
      const darkPixel = getPixel(processed, 7, 7);
      expect(darkPixel.r).toBe(0);
      expect(darkPixel.g).toBe(0);
      expect(darkPixel.b).toBe(0);
    });

    it('preserves alpha channel', () => {
      const imageData = createTestImageData(5, 5, 128);
      setPixel(imageData, 2, 2, 100, 100, 100, 200); // Semi-transparent

      const processed = preprocessImage(imageData);

      const pixel = getPixel(processed, 2, 2);
      expect(pixel.a).toBe(200); // Alpha preserved
    });

    it('uses luminosity method for grayscale conversion', () => {
      const imageData = createTestImageData(5, 5, 0);

      // Green should have higher luminosity due to 0.587 weight
      setPixel(imageData, 1, 1, 0, 200, 0);

      const processed = preprocessImage(imageData);

      // 0.587 * 200 = 117.4, below 128 threshold -> black
      const pixel = getPixel(processed, 1, 1);
      expect(pixel.r).toBe(0);
    });

    it('handles fully white image', () => {
      const imageData = createTestImageData(10, 10, 255);

      const processed = preprocessImage(imageData);

      // All pixels should remain white
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          const pixel = getPixel(processed, x, y);
          expect(pixel.r).toBe(255);
          expect(pixel.g).toBe(255);
          expect(pixel.b).toBe(255);
        }
      }
    });

    it('handles fully black image', () => {
      const imageData = createTestImageData(10, 10, 0);

      const processed = preprocessImage(imageData);

      // All pixels should remain black
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          const pixel = getPixel(processed, x, y);
          expect(pixel.r).toBe(0);
          expect(pixel.g).toBe(0);
          expect(pixel.b).toBe(0);
        }
      }
    });
  });

  describe('isCellEmpty', () => {
    it('detects white cell as empty', () => {
      const imageData = createTestImageData(20, 20, 255);

      expect(isCellEmpty(imageData)).toBe(true);
    });

    it('detects very light cell as empty', () => {
      const imageData = createTestImageData(20, 20, 240);

      expect(isCellEmpty(imageData)).toBe(true);
    });

    it('detects dark cell as not empty', () => {
      const imageData = createTestImageData(20, 20, 100);

      expect(isCellEmpty(imageData)).toBe(false);
    });

    it('detects cell with text as not empty', () => {
      const imageData = createTestImageData(20, 20, 255);

      // Add some dark pixels (simulating text)
      for (let x = 8; x < 12; x++) {
        for (let y = 8; y < 12; y++) {
          setPixel(imageData, x, y, 0, 0, 0);
        }
      }

      // Average brightness should drop below 230 threshold
      expect(isCellEmpty(imageData)).toBe(false);
    });

    it('handles threshold at boundary (230)', () => {
      // Create image with average brightness exactly at 230
      const imageData = createTestImageData(10, 10, 230);

      // Should be considered empty (>230)
      expect(isCellEmpty(imageData)).toBe(false);

      // Just above threshold
      const brightImage = createTestImageData(10, 10, 231);
      expect(isCellEmpty(brightImage)).toBe(true);
    });

    it('handles small cells', () => {
      const imageData = createTestImageData(5, 5, 255);

      expect(isCellEmpty(imageData)).toBe(true);
    });

    it('handles large cells', () => {
      const imageData = createTestImageData(100, 100, 50);

      expect(isCellEmpty(imageData)).toBe(false);
    });

    it('calculates average brightness correctly with mixed pixels', () => {
      const imageData = createTestImageData(10, 10, 255);

      // Fill half with black pixels
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 10; x++) {
          setPixel(imageData, x, y, 0, 0, 0);
        }
      }

      // Average: (255 * 50 + 0 * 50) / 100 = 127.5
      expect(isCellEmpty(imageData)).toBe(false);
    });
  });
});
