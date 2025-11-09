/**
 * Grid detection and perspective correction
 * Finds the Scrabble board grid in a screenshot
 */

export interface GridCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

export interface DetectedGrid {
  corners: GridCorners;
  width: number;
  height: number;
  cellSize: { width: number; height: number };
  confidence: number;
}

/**
 * Grid detection options
 */
export interface GridDetectionOptions {
  /** Image to process */
  imageData: ImageData;
  /** Expected grid dimensions */
  expectedRows: number;
  expectedCols: number;
}

/**
 * Detect grid in image using edge detection and Hough transform
 * Simplified implementation for MVP
 */
export async function detectGrid(options: GridDetectionOptions): Promise<DetectedGrid> {
  const { imageData, expectedRows, expectedCols } = options;

  // For MVP: Assume image is well-framed and grid fills most of the image
  // More sophisticated detection can be added later
  const padding = 0.05; // 5% padding assumption

  const imageWidth = imageData.width;
  const imageHeight = imageData.height;

  // Estimate grid bounds (simplified)
  const gridX = Math.floor(imageWidth * padding);
  const gridY = Math.floor(imageHeight * padding);
  const gridWidth = Math.floor(imageWidth * (1 - 2 * padding));
  const gridHeight = Math.floor(imageHeight * (1 - 2 * padding));

  const corners: GridCorners = {
    topLeft: { x: gridX, y: gridY },
    topRight: { x: gridX + gridWidth, y: gridY },
    bottomLeft: { x: gridX, y: gridY + gridHeight },
    bottomRight: { x: gridX + gridWidth, y: gridY + gridHeight },
  };

  const cellWidth = gridWidth / expectedCols;
  const cellHeight = gridHeight / expectedRows;

  return {
    corners,
    width: gridWidth,
    height: gridHeight,
    cellSize: {
      width: cellWidth,
      height: cellHeight,
    },
    // Confidence is high since we're assuming well-framed image
    confidence: 0.9,
  };
}

/**
 * Extract cell image from grid
 */
export function extractCell(
  imageData: ImageData,
  grid: DetectedGrid,
  row: number,
  col: number,
): ImageData {
  const { corners, cellSize } = grid;

  // Calculate cell position
  const x = Math.floor(corners.topLeft.x + col * cellSize.width);
  const y = Math.floor(corners.topLeft.y + row * cellSize.height);
  const width = Math.floor(cellSize.width);
  const height = Math.floor(cellSize.height);

  // Extract cell data
  const cellData = new ImageData(width, height);

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const srcX = x + dx;
      const srcY = y + dy;

      if (srcX >= 0 && srcX < imageData.width && srcY >= 0 && srcY < imageData.height) {
        const srcIdx = (srcY * imageData.width + srcX) * 4;
        const dstIdx = (dy * width + dx) * 4;

        cellData.data[dstIdx] = imageData.data[srcIdx]; // R
        cellData.data[dstIdx + 1] = imageData.data[srcIdx + 1]; // G
        cellData.data[dstIdx + 2] = imageData.data[srcIdx + 2]; // B
        cellData.data[dstIdx + 3] = imageData.data[srcIdx + 3]; // A
      }
    }
  }

  return cellData;
}

/**
 * Apply perspective correction to grid
 * Simplified implementation for MVP
 */
export function applyPerspectiveCorrection(
  imageData: ImageData,
  corners: GridCorners,
  outputWidth: number,
  outputHeight: number,
): ImageData {
  // For MVP: Assume grid is already roughly aligned
  // Return original image data scaled to output dimensions

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Draw image scaled
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) {
    throw new Error('Could not get temp canvas context');
  }

  tempCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(tempCanvas, 0, 0, outputWidth, outputHeight);

  return ctx.getImageData(0, 0, outputWidth, outputHeight);
}

/**
 * Preprocess image for better OCR
 */
export function preprocessImage(imageData: ImageData): ImageData {
  const processed = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  );

  // Convert to grayscale and increase contrast
  for (let i = 0; i < processed.data.length; i += 4) {
    const r = processed.data[i];
    const g = processed.data[i + 1];
    const b = processed.data[i + 2];

    // Grayscale using luminosity method
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Simple contrast enhancement
    const enhanced = gray < 128 ? 0 : 255;

    processed.data[i] = enhanced;
    processed.data[i + 1] = enhanced;
    processed.data[i + 2] = enhanced;
    // Alpha stays the same
  }

  return processed;
}

/**
 * Check if cell appears to be empty
 */
export function isCellEmpty(imageData: ImageData): boolean {
  // Calculate average brightness
  let totalBrightness = 0;
  const pixelCount = imageData.width * imageData.height;

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];

    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;
  }

  const avgBrightness = totalBrightness / pixelCount;

  // If very bright (close to white), likely empty
  return avgBrightness > 230;
}
