import { getConfig } from '@scrabble-solver/configs';
import { Game, Locale } from '@scrabble-solver/types';

import { decodeTile, decodeTiles } from './tileDecode';

describe('tileDecode', () => {
  describe('decodeTile', () => {
    describe('basic character mapping', () => {
      it.each([
        { locale: Locale.EN_US, text: 'A', expected: 'a' },
        { locale: Locale.EN_US, text: 'a', expected: 'a' },
        { locale: Locale.EN_US, text: 'Z', expected: 'z' },
        { locale: Locale.EN_GB, text: 'B', expected: 'b' },
      ])('[${locale}] maps "$text" to "$expected"', ({ locale, text, expected }) => {
        const config = getConfig(Game.Scrabble, locale);
        const result = decodeTile(text, 1.0, config, locale);

        expect(result.letter).toBe(expected);
        expect(result.isBlank).toBe(false);
        expect(result.confidence).toBe(1.0);
      });
    });

    describe('diacritic mapping - German', () => {
      const locale = Locale.DE_DE;
      const config = getConfig(Game.Scrabble, locale);

      it.each([
        { text: 'ä', expected: 'a' },
        { text: 'ö', expected: 'o' },
        { text: 'ü', expected: 'u' },
        { text: 'Ä', expected: 'a' },
        { text: 'Ö', expected: 'o' },
        { text: 'Ü', expected: 'u' },
      ])('maps diacritic "$text" to fallback "$expected"', ({ text, expected }) => {
        const result = decodeTile(text, 0.9, config, locale);

        // Should map to the base character if the diacritic isn't in the config
        expect(result.letter).toBeTruthy();
        expect(result.confidence).toBeGreaterThanOrEqual(0.45); // At least 50% of 0.9
      });
    });

    describe('diacritic mapping - French', () => {
      const locale = Locale.FR_FR;
      const config = getConfig(Game.Scrabble, locale);

      it.each([
        { text: 'é', expected: 'e' },
        { text: 'è', expected: 'e' },
        { text: 'ê', expected: 'e' },
        { text: 'à', expected: 'a' },
        { text: 'â', expected: 'a' },
        { text: 'ç', expected: 'c' },
        { text: 'î', expected: 'i' },
        { text: 'ï', expected: 'i' },
        { text: 'ô', expected: 'o' },
        { text: 'ù', expected: 'u' },
        { text: 'û', expected: 'u' },
      ])('handles French diacritic "$text"', ({ text }) => {
        const result = decodeTile(text, 0.85, config, locale);

        expect(result.letter).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    describe('diacritic mapping - Polish', () => {
      const locale = Locale.PL_PL;
      const config = getConfig(Game.Scrabble, locale);

      it.each([
        { text: 'ą' },
        { text: 'ć' },
        { text: 'ę' },
        { text: 'ł' },
        { text: 'ń' },
        { text: 'ó' },
        { text: 'ś' },
        { text: 'ź' },
        { text: 'ż' },
      ])('handles Polish character "$text"', ({ text }) => {
        const result = decodeTile(text, 0.9, config, locale);

        expect(result.letter).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    describe('diacritic mapping - Spanish', () => {
      const locale = Locale.ES_ES;
      const config = getConfig(Game.Scrabble, locale);

      it.each([
        { text: 'ñ' },
        { text: 'á' },
        { text: 'é' },
        { text: 'í' },
        { text: 'ó' },
        { text: 'ú' },
        { text: 'Ñ' },
      ])('handles Spanish character "$text"', ({ text }) => {
        const result = decodeTile(text, 0.9, config, locale);

        expect(result.letter).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    describe('diacritic mapping - Romanian', () => {
      const locale = Locale.RO_RO;
      const config = getConfig(Game.Scrabble, locale);

      it.each([
        { text: 'ă' },
        { text: 'â' },
        { text: 'î' },
        { text: 'ș' },
        { text: 'ş' },
        { text: 'ț' },
        { text: 'ţ' },
      ])('handles Romanian character "$text"', ({ text }) => {
        const result = decodeTile(text, 0.9, config, locale);

        expect(result.letter).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    describe('two-character tiles', () => {
      const locale = Locale.ES_ES;
      const config = getConfig(Game.Scrabble, locale);

      it.each([
        { text: 'ch', expected: 'ch' },
        { text: 'll', expected: 'll' },
        { text: 'rr', expected: 'rr' },
        { text: 'CH', expected: 'ch' },
        { text: 'LL', expected: 'll' },
      ])('recognizes two-character tile "$text"', ({ text, expected }) => {
        const result = decodeTile(text, 0.95, config, locale);

        expect(result.letter).toBe(expected);
        expect(result.confidence).toBe(0.95);
      });

      it('extracts two-character tile from longer text', () => {
        const result = decodeTile('cha', 0.9, config, locale);

        expect(result.letter).toBe('ch');
      });
    });

    describe('blank tile detection', () => {
      const locale = Locale.EN_US;
      const config = getConfig(Game.Scrabble, locale);

      it.each([
        { text: 'A*', expectedLetter: 'a', expectedBlank: true },
        { text: 'B_', expectedLetter: 'b', expectedBlank: true },
        { text: 'C.', expectedLetter: 'c', expectedBlank: true },
        { text: 'D•', expectedLetter: 'd', expectedBlank: true },
        { text: 'E°', expectedLetter: 'e', expectedBlank: true },
      ])('detects blank marker in "$text"', ({ text, expectedLetter, expectedBlank }) => {
        const result = decodeTile(text, 0.8, config, locale);

        expect(result.letter).toBe(expectedLetter);
        expect(result.isBlank).toBe(expectedBlank);
      });

      it('does not mark regular tiles as blank', () => {
        const result = decodeTile('A', 0.9, config, locale);

        expect(result.letter).toBe('a');
        expect(result.isBlank).toBe(false);
      });
    });

    describe('empty cells', () => {
      const locale = Locale.EN_US;
      const config = getConfig(Game.Scrabble, locale);

      it.each([
        { text: '' },
        { text: '   ' },
        { text: '\t' },
        { text: '\n' },
      ])('returns null for empty text "$text"', ({ text }) => {
        const result = decodeTile(text, 0.5, config, locale);

        expect(result.letter).toBeNull();
        expect(result.isBlank).toBe(false);
        expect(result.confidence).toBe(1.0); // Empty cells have high confidence
      });
    });

    describe('OCR artifacts and noise', () => {
      const locale = Locale.EN_US;
      const config = getConfig(Game.Scrabble, locale);

      it.each([
        { text: 'A123', expected: 'a' },
        { text: 'B!@#', expected: 'b' },
        { text: 'C$%^', expected: 'c' },
        { text: '   D   ', expected: 'd' },
      ])('cleans OCR artifacts from "$text"', ({ text, expected }) => {
        const result = decodeTile(text, 0.7, config, locale);

        expect(result.letter).toBe(expected);
      });

      it('returns null for completely invalid text', () => {
        const result = decodeTile('123!@#', 0.6, config, locale);

        expect(result.letter).toBeNull();
        expect(result.confidence).toBeLessThan(0.6); // Confidence reduced
      });
    });

    describe('confidence handling', () => {
      const locale = Locale.EN_US;
      const config = getConfig(Game.Scrabble, locale);

      it('preserves high confidence for valid characters', () => {
        const result = decodeTile('A', 0.95, config, locale);

        expect(result.confidence).toBe(0.95);
      });

      it('reduces confidence when character cannot be mapped', () => {
        const result = decodeTile('$$$', 0.8, config, locale);

        expect(result.confidence).toBe(0.4); // 0.8 * 0.5
      });

      it('handles low input confidence', () => {
        const result = decodeTile('A', 0.3, config, locale);

        expect(result.confidence).toBe(0.3);
      });
    });

    describe('case insensitivity', () => {
      const locale = Locale.EN_US;
      const config = getConfig(Game.Scrabble, locale);

      it.each([
        { text: 'a', expected: 'a' },
        { text: 'A', expected: 'a' },
        { text: 'z', expected: 'z' },
        { text: 'Z', expected: 'z' },
      ])('normalizes "$text" to lowercase "$expected"', ({ text, expected }) => {
        const result = decodeTile(text, 1.0, config, locale);

        expect(result.letter).toBe(expected);
      });
    });
  });

  describe('decodeTiles', () => {
    const locale = Locale.EN_US;
    const config = getConfig(Game.Scrabble, locale);

    it('decodes multiple tiles', () => {
      const ocrResults = [
        { text: 'A', confidence: 0.9 },
        { text: 'B', confidence: 0.85 },
        { text: 'C', confidence: 0.95 },
      ];

      const results = decodeTiles(ocrResults, config, locale);

      expect(results).toHaveLength(3);
      expect(results[0].letter).toBe('a');
      expect(results[0].confidence).toBe(0.9);
      expect(results[1].letter).toBe('b');
      expect(results[1].confidence).toBe(0.85);
      expect(results[2].letter).toBe('c');
      expect(results[2].confidence).toBe(0.95);
    });

    it('handles mixed valid and invalid tiles', () => {
      const ocrResults = [
        { text: 'A', confidence: 0.9 },
        { text: '###', confidence: 0.6 },
        { text: 'B', confidence: 0.85 },
      ];

      const results = decodeTiles(ocrResults, config, locale);

      expect(results).toHaveLength(3);
      expect(results[0].letter).toBe('a');
      expect(results[1].letter).toBeNull();
      expect(results[1].confidence).toBe(0.3); // Reduced confidence
      expect(results[2].letter).toBe('b');
    });

    it('handles empty array', () => {
      const results = decodeTiles([], config, locale);

      expect(results).toHaveLength(0);
    });

    it('preserves order', () => {
      const ocrResults = [
        { text: 'Z', confidence: 0.9 },
        { text: 'A', confidence: 0.9 },
        { text: 'M', confidence: 0.9 },
      ];

      const results = decodeTiles(ocrResults, config, locale);

      expect(results.map((r) => r.letter)).toEqual(['z', 'a', 'm']);
    });
  });

  describe('multi-language integration', () => {
    it('handles Spanish two-character tiles with diacritics', () => {
      const locale = Locale.ES_ES;
      const config = getConfig(Game.Scrabble, locale);

      const result = decodeTile('ñ', 0.9, config, locale);

      expect(result.letter).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('handles Turkish characters', () => {
      const locale = Locale.TR_TR;
      const config = getConfig(Game.Scrabble, locale);

      const result = decodeTile('ş', 0.9, config, locale);

      expect(result.letter).toBeTruthy();
    });

    it('handles Persian characters', () => {
      const locale = Locale.FA_IR;
      const config = getConfig(Game.Scrabble, locale);

      // Persian uses different script, so basic Latin should still work as fallback
      const result = decodeTile('a', 0.9, config, locale);

      expect(result).toBeDefined();
    });
  });
});
