import {
  DB_DISPLAY_OFFSET,
  dbToVolume,
  formatFrequency,
  getCategoryBg,
  getCategoryColor,
  getCategoryLabel,
  getHearingCapacityPercent,
  getHearingCategory,
  getTestSummary,
  hfrtBadge,
  hfrtFrequencyCategory,
  pttBadge,
  toDisplayDb,
} from '../constants/hearing-test.constants';
import type { HearingCategory } from '../types/hearing-test.types';

describe('dbToVolume', () => {
  test('reaches the maximum gain (1.0) at or above the reference level', () => {
    expect(dbToVolume(60)).toBeCloseTo(1.0);
    expect(dbToVolume(80)).toBe(1.0); // clamped
  });

  test('never returns exactly 0 (floors at the inaudible-gain constant)', () => {
    expect(dbToVolume(-100)).toBeGreaterThan(0);
    expect(dbToVolume(-100)).toBeCloseTo(0.00005);
  });

  test('is monotonically increasing with dB', () => {
    expect(dbToVolume(0)).toBeLessThan(dbToVolume(30));
    expect(dbToVolume(30)).toBeLessThan(dbToVolume(60));
  });
});

describe('toDisplayDb / DB_DISPLAY_OFFSET', () => {
  test('shifts the internal scale by the display offset', () => {
    expect(toDisplayDb(0)).toBe(DB_DISPLAY_OFFSET);
    expect(toDisplayDb(-20)).toBe(0);
    expect(toDisplayDb(80)).toBe(100);
  });

  test('rounds fractional internal values', () => {
    expect(toDisplayDb(10.4)).toBe(30);
    expect(toDisplayDb(10.6)).toBe(31);
  });
});

describe('getHearingCapacityPercent', () => {
  test('perfect threshold (0 internal dB → 20 displayed) reads as 80%', () => {
    expect(getHearingCapacityPercent(0)).toBe(80);
  });

  test('clamps to 0 for thresholds worse than 100 displayed dB', () => {
    expect(getHearingCapacityPercent(200)).toBe(0);
  });

  test('clamps to 100 for thresholds better than 0 displayed dB', () => {
    expect(getHearingCapacityPercent(-100)).toBe(100);
  });
});

describe('getHearingCategory thresholds', () => {
  test.each<[number, HearingCategory]>([
    [0, 'normal'],
    [20, 'normal'],
    [21, 'mild'],
    [40, 'mild'],
    [41, 'moderate'],
    [60, 'moderate'],
    [61, 'severe'],
    [120, 'severe'],
  ])('%i dB → %s', (db, expected) => {
    expect(getHearingCategory(db)).toBe(expected);
  });
});

describe('getCategoryLabel / getCategoryColor / getCategoryBg', () => {
  const categories: HearingCategory[] = ['normal', 'mild', 'moderate', 'severe'];

  test('every category has a non-empty label, color, and background', () => {
    for (const cat of categories) {
      expect(getCategoryLabel(cat).length).toBeGreaterThan(0);
      expect(getCategoryColor(cat)).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(getCategoryBg(cat)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('each category maps to a distinct color', () => {
    const colors = categories.map(getCategoryColor);
    expect(new Set(colors).size).toBe(categories.length);
  });
});

describe('pttBadge', () => {
  test('normal range produces the "Audition normale" badge', () => {
    expect(pttBadge(10).label).toBe('Audition normale');
  });

  test('severe range produces the "Perte importante" badge', () => {
    expect(pttBadge(70).label).toBe('Perte importante');
  });

  test('badge color matches the category color', () => {
    expect(pttBadge(10).color).toBe(getCategoryColor('normal'));
  });
});

describe('hfrtFrequencyCategory / hfrtBadge', () => {
  test('hfrtFrequencyCategory never disagrees with pttBadge-style category colors', () => {
    const cat = hfrtFrequencyCategory(17_000); // Excellente band → 'normal'
    expect(cat).toBe('normal');
  });

  test('hfrtBadge uses the generic label when no interpretation string is given', () => {
    expect(hfrtBadge(17_000).label).toBe('Perception des aigus');
  });

  test('hfrtBadge maps a known interpretation to its explicit label', () => {
    expect(hfrtBadge(17_000, 'Excellente').label).toBe('Aigus excellents');
  });

  test('hfrtBadge falls back to a lowercased generic label for an unknown interpretation string', () => {
    expect(hfrtBadge(17_000, 'Mystère').label).toBe('Aigus mystère');
  });
});

describe('getTestSummary', () => {
  test.each<HearingCategory>(['normal', 'mild', 'moderate', 'severe'])(
    'returns a non-empty status and interpretation for %s',
    (cat) => {
      const summary = getTestSummary(cat);
      expect(summary.status.length).toBeGreaterThan(0);
      expect(summary.interpretation.length).toBeGreaterThan(0);
    },
  );
});

describe('formatFrequency', () => {
  test('formats sub-1000 Hz values in Hz', () => {
    expect(formatFrequency(500)).toBe('500 Hz');
  });

  test('formats 1000+ Hz values in kHz', () => {
    expect(formatFrequency(1000)).toBe('1 kHz');
    expect(formatFrequency(4000)).toBe('4 kHz');
  });
});
