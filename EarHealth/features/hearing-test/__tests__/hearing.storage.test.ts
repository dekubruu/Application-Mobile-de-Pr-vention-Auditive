import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enqueuePendingResult,
  listPendingResults,
  removePendingResult,
  type PendingHearingResult,
} from '../services/hearing.storage';

const KEY = '@earhealth/hearing:pending_results';

const validPttResult: PendingHearingResult = {
  id: 'r1',
  user_id: 'u1',
  test_type: 'ptt',
  payload: { ears: [{ ear: 'left', avgDb: 20, thresholds: [{ freq: 500, db: 20 }] }] },
  overall_score: 80,
  queued_at: '2026-01-01T00:00:00.000Z',
};

const validHfrtResult: PendingHearingResult = {
  id: 'r2',
  user_id: 'u1',
  test_type: 'hfrt',
  payload: { maxFrequencyHz: 15_000, interpretation: 'Bonne' },
  overall_score: 70,
  queued_at: '2026-01-01T00:00:00.000Z',
};

describe('listPendingResults', () => {
  beforeEach(() => AsyncStorage.clear());

  test('returns an empty array when nothing is stored', async () => {
    await expect(listPendingResults()).resolves.toEqual([]);
  });

  test('returns an empty array for corrupted (non-JSON) storage instead of throwing', async () => {
    await AsyncStorage.setItem(KEY, 'not valid json{{{');
    await expect(listPendingResults()).resolves.toEqual([]);
  });

  test('returns an empty array when the stored value is not an array', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ not: 'an array' }));
    await expect(listPendingResults()).resolves.toEqual([]);
  });

  test('filters out entries that fail shape validation, keeping valid ones', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify([validPttResult, { garbage: true }, 42, null]));
    const result = await listPendingResults();
    expect(result).toEqual([validPttResult]);
  });

  test('rejects a ptt entry whose payload matches the hfrt shape and vice versa', async () => {
    const mismatched = { ...validPttResult, test_type: 'hfrt' as const };
    await AsyncStorage.setItem(KEY, JSON.stringify([mismatched]));
    await expect(listPendingResults()).resolves.toEqual([]);
  });

  test('returns both valid ptt and hfrt entries', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify([validPttResult, validHfrtResult]));
    await expect(listPendingResults()).resolves.toEqual([validPttResult, validHfrtResult]);
  });
});

describe('enqueuePendingResult', () => {
  beforeEach(() => AsyncStorage.clear());

  test('adds a new entry to an empty queue', async () => {
    await enqueuePendingResult(validPttResult);
    await expect(listPendingResults()).resolves.toEqual([validPttResult]);
  });

  test('de-dupes by id — re-enqueuing the same id is a no-op', async () => {
    await enqueuePendingResult(validPttResult);
    await enqueuePendingResult({ ...validPttResult, overall_score: 999 }); // same id, different payload
    const result = await listPendingResults();
    expect(result).toHaveLength(1);
    expect(result[0].overall_score).toBe(80); // original entry wins, not overwritten
  });

  test('appends distinct ids without disturbing existing entries', async () => {
    await enqueuePendingResult(validPttResult);
    await enqueuePendingResult(validHfrtResult);
    const result = await listPendingResults();
    expect(result).toHaveLength(2);
  });
});

describe('removePendingResult', () => {
  beforeEach(() => AsyncStorage.clear());

  test('removes the matching entry by id', async () => {
    await enqueuePendingResult(validPttResult);
    await enqueuePendingResult(validHfrtResult);

    await removePendingResult('r1');

    await expect(listPendingResults()).resolves.toEqual([validHfrtResult]);
  });

  test('is a no-op when the id does not exist', async () => {
    await enqueuePendingResult(validPttResult);
    await removePendingResult('does-not-exist');
    await expect(listPendingResults()).resolves.toEqual([validPttResult]);
  });

  test('clears the underlying storage key entirely once the queue becomes empty', async () => {
    await enqueuePendingResult(validPttResult);
    await removePendingResult('r1');
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });

  test('is a safe no-op on an already-empty queue', async () => {
    await expect(removePendingResult('anything')).resolves.toBeUndefined();
  });
});
