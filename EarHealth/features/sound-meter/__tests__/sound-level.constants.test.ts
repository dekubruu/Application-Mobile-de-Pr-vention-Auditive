import {
  RISK_THRESHOLD_DB,
  SOUND_LEVEL_CATEGORIES,
  getSoundLevelCategory,
} from '../constants/sound-level.constants';

describe('getSoundLevelCategory', () => {
  test('returns "Silencieux" for very low levels', () => {
    expect(getSoundLevelCategory(0).label).toBe('Silencieux');
    expect(getSoundLevelCategory(40).label).toBe('Silencieux');
  });

  test('returns "Modéré" just above the silent threshold', () => {
    expect(getSoundLevelCategory(41).label).toBe('Modéré');
  });

  test('returns "Attention" around the 70-85 dB range', () => {
    expect(getSoundLevelCategory(80).label).toBe('Attention');
  });

  test('returns "Nocif" at the NIOSH/WHO risk threshold', () => {
    expect(getSoundLevelCategory(RISK_THRESHOLD_DB + 1).label).toBe('Nocif');
  });

  test('returns "Dangereux" for extreme levels beyond the highest bracket', () => {
    expect(getSoundLevelCategory(150).label).toBe('Dangereux');
  });

  test('falls back to the last (most severe) category for a level beyond all max values', () => {
    // 999 is the highest `max`; anything above it exercises the ?? fallback.
    expect(getSoundLevelCategory(10_000)).toBe(SOUND_LEVEL_CATEGORIES[SOUND_LEVEL_CATEGORIES.length - 1]);
  });

  test('categories are ordered ascending by their max boundary', () => {
    const maxValues = SOUND_LEVEL_CATEGORIES.map(c => c.max);
    expect(maxValues).toEqual([...maxValues].sort((a, b) => a - b));
  });
});
