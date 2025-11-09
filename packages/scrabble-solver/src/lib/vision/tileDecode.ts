/**
 * Tile decoding - maps OCR output to game tiles
 * Handles diacritics, blanks, and multi-character tiles
 */

import type { Config, Locale } from '@scrabble-solver/types';

/**
 * Decoded tile information
 */
export interface DecodedTile {
  /** The character (or null if empty) */
  letter: string | null;
  /** Whether this is a blank tile */
  isBlank: boolean;
  /** Confidence in the decoding (0-1) */
  confidence: number;
}

/**
 * Normalize OCR text to match tile characters
 */
function normalizeText(text: string, locale: Locale): string {
  // Trim and convert to lowercase
  let normalized = text.trim().toLowerCase();

  // Remove common OCR artifacts
  normalized = normalized.replace(/[^a-zäöüßàâçéèêëîïôùûüÿœæąćęłńóśźżşţîâăñïóúáéíčďěňřšťůýž]/gi, '');

  return normalized;
}

/**
 * Detect if a tile appears to be marked as blank
 * Blank tiles often have visual markers (asterisk, underline, etc.)
 */
function detectBlankMarker(rawText: string): boolean {
  // Common blank markers
  const blankMarkers = ['*', '_', '.', '•', '°'];

  return blankMarkers.some((marker) => rawText.includes(marker));
}

/**
 * Map diacritics and special characters
 */
const DIACRITIC_MAP: Record<string, string[]> = {
  // German
  ä: ['a', 'ae'],
  ö: ['o', 'oe'],
  ü: ['u', 'ue'],
  ß: ['ss', 'b'],

  // French
  à: ['a'],
  â: ['a'],
  ç: ['c'],
  é: ['e'],
  è: ['e'],
  ê: ['e'],
  ë: ['e'],
  î: ['i'],
  ï: ['i'],
  ô: ['o'],
  ù: ['u'],
  û: ['u'],
  ÿ: ['y'],
  œ: ['oe'],
  æ: ['ae'],

  // Polish
  ą: ['a'],
  ć: ['c'],
  ę: ['e'],
  ł: ['l'],
  ń: ['n'],
  ó: ['o'],
  ś: ['s'],
  ź: ['z'],
  ż: ['z'],

  // Romanian
  ă: ['a'],
  â: ['a'],
  î: ['i'],
  ș: ['s'],
  ş: ['s'],
  ț: ['t'],
  ţ: ['t'],

  // Spanish
  ñ: ['n'],
  á: ['a'],
  é: ['e'],
  í: ['i'],
  ó: ['o'],
  ú: ['u'],

  // Czech/Slovak
  č: ['c'],
  ď: ['d'],
  ě: ['e'],
  ň: ['n'],
  ř: ['r'],
  š: ['s'],
  ť: ['t'],
  ů: ['u'],
  ý: ['y'],
  ž: ['z'],
};

/**
 * Try to map OCR text to a valid tile character
 */
function mapToTileCharacter(text: string, config: Config): string | null {
  if (!text) {
    return null;
  }

  const normalized = text.toLowerCase();

  // Direct match
  if (config.hasCharacter(normalized)) {
    return normalized;
  }

  // Try first character
  if (normalized.length > 0) {
    const firstChar = normalized[0];
    if (config.hasCharacter(firstChar)) {
      return firstChar;
    }

    // Try diacritic alternatives
    if (firstChar in DIACRITIC_MAP) {
      for (const alt of DIACRITIC_MAP[firstChar]) {
        if (config.hasCharacter(alt)) {
          return alt;
        }
      }
    }
  }

  // Check for two-character tiles
  if (normalized.length >= 2) {
    const twoChar = normalized.substring(0, 2);
    if (config.twoCharacterTiles.includes(twoChar)) {
      return twoChar;
    }
  }

  // No match found
  return null;
}

/**
 * Decode OCR text to a tile
 */
export function decodeTile(rawText: string, confidence: number, config: Config, locale: Locale): DecodedTile {
  // Check for blank marker
  const isBlank = detectBlankMarker(rawText);

  // Normalize text
  const normalized = normalizeText(rawText, locale);

  // Empty cell
  if (!normalized) {
    return {
      letter: null,
      isBlank: false,
      confidence: 1.0,
    };
  }

  // Map to tile character
  const letter = mapToTileCharacter(normalized, config);

  // Calculate final confidence
  // Reduce confidence if we couldn't map the character
  const finalConfidence = letter ? confidence : confidence * 0.5;

  return {
    letter,
    isBlank,
    confidence: finalConfidence,
  };
}

/**
 * Batch decode multiple tiles
 */
export function decodeTiles(
  ocrResults: Array<{ text: string; confidence: number }>,
  config: Config,
  locale: Locale,
): DecodedTile[] {
  return ocrResults.map((result) => decodeTile(result.text, result.confidence, config, locale));
}
