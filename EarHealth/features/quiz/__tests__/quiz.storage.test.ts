import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enqueuePendingSession,
  getCachedQuestions,
  getCachedStats,
  listPendingSessions,
  removePendingSession,
  setCachedQuestions,
  setCachedStats,
} from '../services/quiz.storage';
import type { PendingQuizSession, Question, QuizStats } from '../types/quiz.types';

const QUEUE_KEY = '@earhealth/quiz:pending_sessions';
const QUESTIONS_KEY = '@earhealth/quiz:questions_cache';

const validSession: PendingQuizSession = {
  id: 's1',
  user_id: 'u1',
  total_questions: 10,
  correct_count: 8,
  incorrect_count: 2,
  points_earned: 80,
  points_max: 100,
  difficulty: 'easy',
  queued_at: '2026-01-01T00:00:00.000Z',
};

const validQuestion: Question = {
  id: 'q1',
  question: 'Question ?',
  answers: ['a', 'b'],
  correct: 0,
  explanation: null,
  points: 10,
  category: 'noise',
  difficulty: 'easy',
};

const validStats: QuizStats = {
  sessionsPlayed: 1,
  totalAnswered: 10,
  totalCorrect: 8,
  totalPoints: 80,
  accuracyPct: 80,
  bestSessionPct: 80,
  bestSessionPoints: 80,
  lastSessionDate: '2026-01-01',
  totalQuestionsInApp: 60,
  correctDistinct: 5,
};

describe('quiz.storage — pending sessions queue', () => {
  beforeEach(() => AsyncStorage.clear());

  test('listPendingSessions returns [] with nothing stored', async () => {
    await expect(listPendingSessions()).resolves.toEqual([]);
  });

  test('listPendingSessions returns [] for corrupted JSON', async () => {
    await AsyncStorage.setItem(QUEUE_KEY, '{not json');
    await expect(listPendingSessions()).resolves.toEqual([]);
  });

  test('listPendingSessions filters invalid entries but keeps valid ones', async () => {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([validSession, { bogus: true }]));
    await expect(listPendingSessions()).resolves.toEqual([validSession]);
  });

  test('listPendingSessions backfills a missing `difficulty` with "mixed" (pre-migration entries)', async () => {
    const { difficulty, ...legacy } = validSession;
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([legacy]));
    const result = await listPendingSessions();
    expect(result[0].difficulty).toBe('mixed');
  });

  test('enqueuePendingSession de-dupes by id', async () => {
    await enqueuePendingSession(validSession);
    await enqueuePendingSession({ ...validSession, points_earned: 999 });
    const result = await listPendingSessions();
    expect(result).toHaveLength(1);
    expect(result[0].points_earned).toBe(80);
  });

  test('removePendingSession removes only the matching id and clears the key once empty', async () => {
    await enqueuePendingSession(validSession);
    await removePendingSession('s1');
    await expect(listPendingSessions()).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(QUEUE_KEY)).resolves.toBeNull();
  });

  test('concurrent enqueue calls are serialized (no lost updates)', async () => {
    const sessions = Array.from({ length: 5 }, (_, i) => ({ ...validSession, id: `s${i}` }));
    await Promise.all(sessions.map(s => enqueuePendingSession(s)));
    const result = await listPendingSessions();
    expect(result).toHaveLength(5);
  });
});

describe('quiz.storage — questions cache', () => {
  beforeEach(() => AsyncStorage.clear());

  test('getCachedQuestions returns null with nothing stored', async () => {
    await expect(getCachedQuestions()).resolves.toBeNull();
  });

  test('setCachedQuestions is a no-op for an empty array (never poisons the cache)', async () => {
    await setCachedQuestions([]);
    await expect(AsyncStorage.getItem(QUESTIONS_KEY)).resolves.toBeNull();
  });

  test('round-trips a valid questions list', async () => {
    await setCachedQuestions([validQuestion]);
    const cached = await getCachedQuestions();
    expect(cached?.questions).toEqual([validQuestion]);
    expect(typeof cached?.cachedAt).toBe('string');
  });

  test('returns null when every cached question fails validation', async () => {
    await AsyncStorage.setItem(QUESTIONS_KEY, JSON.stringify({ questions: [{ bogus: true }], cachedAt: 'now' }));
    await expect(getCachedQuestions()).resolves.toBeNull();
  });

  test('filters out invalid entries while keeping valid ones', async () => {
    await AsyncStorage.setItem(QUESTIONS_KEY, JSON.stringify({ questions: [validQuestion, { bogus: true }], cachedAt: 'now' }));
    const cached = await getCachedQuestions();
    expect(cached?.questions).toEqual([validQuestion]);
  });
});

describe('quiz.storage — stats cache', () => {
  beforeEach(() => AsyncStorage.clear());

  test('getCachedStats returns null with no userId', async () => {
    await expect(getCachedStats('')).resolves.toBeNull();
  });

  test('getCachedStats returns null with nothing stored', async () => {
    await expect(getCachedStats('u1')).resolves.toBeNull();
  });

  test('round-trips valid stats for a given user', async () => {
    await setCachedStats('u1', validStats);
    const cached = await getCachedStats('u1');
    expect(cached?.stats).toEqual(validStats);
  });

  test('keys are namespaced per user — user A cannot read user B’s cache', async () => {
    await setCachedStats('user-a', validStats);
    await expect(getCachedStats('user-b')).resolves.toBeNull();
  });

  test('setCachedStats is a no-op with no userId', async () => {
    await setCachedStats('', validStats);
    // No key should have been written for an empty user id.
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some(k => k.startsWith('@earhealth/quiz:stats_cache:'))).toBe(false);
  });

  test('rejects a cached stats object missing the newer coverage fields (forces a refetch)', async () => {
    const { totalQuestionsInApp, correctDistinct, ...legacyStats } = validStats;
    await AsyncStorage.setItem(
      '@earhealth/quiz:stats_cache:u1',
      JSON.stringify({ stats: legacyStats, cachedAt: 'now' }),
    );
    await expect(getCachedStats('u1')).resolves.toBeNull();
  });
});
