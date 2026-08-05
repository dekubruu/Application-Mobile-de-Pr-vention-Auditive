import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeQueryResult, mockFrom, mockSupabase, resetSupabaseMock } from '../../../test-utils/supabaseMock';

jest.mock('@/src/utils/supabase', () => ({ supabase: mockSupabase }));

import { quizService } from '../services/quiz.service';
import type { QuizQuestionRow, QuizResult } from '../types/quiz.types';

function makeRow(overrides: Partial<QuizQuestionRow> = {}): QuizQuestionRow {
  return {
    id: 'q1',
    question: 'Combien de dB un concert atteint-il ?',
    category: 'noise',
    difficulty: 'easy',
    points: 10,
    explanation: null,
    quiz_options: [
      { id: 'o1', option_text: '60 dB', is_correct: false },
      { id: 'o2', option_text: '110 dB', is_correct: true },
    ],
    ...overrides,
  };
}

// ── Pure logic (via public entry points) ────────────────────────────────────

describe('quizService.fetchAllQuestions (normalize + shuffle)', () => {
  beforeEach(() => resetSupabaseMock());

  test('drops a question with fewer than 2 options', async () => {
    mockFrom.mockReturnValue(makeQueryResult({
      data: [makeRow({ quiz_options: [{ id: 'o1', option_text: 'only one', is_correct: true }] })],
      error: null,
    }));
    await expect(quizService.fetchAllQuestions()).resolves.toEqual([]);
  });

  test('drops a question with an invalid difficulty', async () => {
    mockFrom.mockReturnValue(makeQueryResult({
      data: [makeRow({ difficulty: 'extreme' as any })],
      error: null,
    }));
    await expect(quizService.fetchAllQuestions()).resolves.toEqual([]);
  });

  test('drops a question where no option is marked correct', async () => {
    mockFrom.mockReturnValue(makeQueryResult({
      data: [makeRow({ quiz_options: [
        { id: 'o1', option_text: 'a', is_correct: false },
        { id: 'o2', option_text: 'b', is_correct: false },
      ] })],
      error: null,
    }));
    await expect(quizService.fetchAllQuestions()).resolves.toEqual([]);
  });

  test('normalizes a valid row into a UI-ready Question, keeping the correct answer text aligned with its shuffled index', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: [makeRow()], error: null }));
    const [question] = await quizService.fetchAllQuestions();
    expect(question.id).toBe('q1');
    expect(question.answers[question.correct]).toBe('110 dB');
    expect(question.answers).toHaveLength(2);
  });

  test('throws on a Supabase error', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'boom' } }));
    await expect(quizService.fetchAllQuestions()).rejects.toEqual({ message: 'boom' });
  });

  test('returns an empty array when there is no data', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null }));
    await expect(quizService.fetchAllQuestions()).resolves.toEqual([]);
  });
});

describe('quizService.selectRandomQuestions', () => {
  const pool = [
    { id: '1', question: 'q1', answers: [], correct: 0, explanation: null, points: 10, category: 'noise' as const, difficulty: 'easy' as const },
    { id: '2', question: 'q2', answers: [], correct: 0, explanation: null, points: 20, category: 'anatomy' as const, difficulty: 'medium' as const },
    { id: '3', question: 'q3', answers: [], correct: 0, explanation: null, points: 30, category: 'noise' as const, difficulty: 'hard' as const },
  ];

  test('defaults to 10 questions but never returns more than the pool has', () => {
    expect(quizService.selectRandomQuestions(pool)).toHaveLength(3);
  });

  test('respects an explicit count', () => {
    expect(quizService.selectRandomQuestions(pool, { count: 2 })).toHaveLength(2);
  });

  test('filters by category', () => {
    const result = quizService.selectRandomQuestions(pool, { categories: ['anatomy'] });
    expect(result.map(q => q.id)).toEqual(['2']);
  });

  test('filters by difficulty', () => {
    const result = quizService.selectRandomQuestions(pool, { difficulties: ['hard'] });
    expect(result.map(q => q.id)).toEqual(['3']);
  });

  test('combining an unmatched category and difficulty yields an empty result, not an error', () => {
    const result = quizService.selectRandomQuestions(pool, { categories: ['anatomy'], difficulties: ['hard'] });
    expect(result).toEqual([]);
  });

  test('does not mutate the input pool', () => {
    const copy = [...pool];
    quizService.selectRandomQuestions(pool, { count: 1 });
    expect(pool).toEqual(copy);
  });
});

// ── Async / Supabase-backed ──────────────────────────────────────────────────

describe('quizService.saveQuizSessionResilient', () => {
  beforeEach(async () => {
    resetSupabaseMock();
    await AsyncStorage.clear();
  });

  const result: QuizResult = {
    totalQuestions: 10,
    correctCount: 7,
    incorrectCount: 3,
    pointsTotal: 140,
    pointsMax: 200,
    answers: [],
    difficulty: 'mixed',
  };

  test('returns "synced" when the upsert succeeds', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null }));
    const outcome = await quizService.saveQuizSessionResilient('u1', result);
    expect(outcome.status).toBe('synced');
    expect(mockFrom).toHaveBeenCalledWith('quiz_sessions');
  });

  test('returns "queued" and the session becomes flushable once the network recovers', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'offline' } }));
    const outcome = await quizService.saveQuizSessionResilient('u1', result);
    expect(outcome.status).toBe('queued');

    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null }));
    const flush = await quizService.flushPendingSessions('u1');
    expect(flush.flushed).toBe(1);
    expect(flush.remaining).toBe(0);
  });
});

describe('quizService.flushPendingSessions', () => {
  beforeEach(async () => {
    resetSupabaseMock();
    await AsyncStorage.clear();
  });

  test('returns skipped=false and does no work with no user id', async () => {
    await expect(quizService.flushPendingSessions(null)).resolves.toEqual({ flushed: 0, remaining: 0, skipped: false });
  });

  test('only flushes sessions for the given user, leaving others in "remaining"', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'offline' } }));
    const r: QuizResult = { totalQuestions: 10, correctCount: 5, incorrectCount: 5, pointsTotal: 50, pointsMax: 100, answers: [], difficulty: 'easy' };
    await quizService.saveQuizSessionResilient('user-a', r);
    await quizService.saveQuizSessionResilient('user-b', r);

    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null }));
    const outcome = await quizService.flushPendingSessions('user-a');
    expect(outcome.flushed).toBe(1);
    expect(outcome.remaining).toBe(1);
  });

  test('a second concurrent call is skipped (single-flight)', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: null }));
    const [first, second] = await Promise.all([
      quizService.flushPendingSessions('u1'),
      quizService.flushPendingSessions('u1'),
    ]);
    const results = [first, second];
    expect(results.some(r => r.skipped)).toBe(true);
  });
});

describe('quizService.fetchStats', () => {
  beforeEach(() => resetSupabaseMock());

  function mockTables(sessions: { data: unknown; error: unknown }, totalQuestions: number, correctDistinct: number) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quiz_sessions') return makeQueryResult(sessions);
      if (table === 'quiz_questions') return makeQueryResult({ data: null, error: null, count: totalQuestions });
      if (table === 'quiz_question_progress') return makeQueryResult({ data: null, error: null, count: correctDistinct });
      throw new Error(`unexpected table ${table}`);
    });
  }

  test('returns all-zero stats plus coverage when the user has no sessions', async () => {
    mockTables({ data: [], error: null }, 60, 0);
    const stats = await quizService.fetchStats('u1');
    expect(stats.sessionsPlayed).toBe(0);
    expect(stats.totalPoints).toBe(0);
    expect(stats.totalQuestionsInApp).toBe(60);
    expect(stats.correctDistinct).toBe(0);
  });

  test('aggregates totals, accuracy, and best-session values across sessions', async () => {
    mockTables({
      data: [
        { total_questions: 10, correct_count: 8, points_earned: 160, created_at: '2026-02-01' },
        { total_questions: 10, correct_count: 5, points_earned: 90, created_at: '2026-01-01' },
      ],
      error: null,
    }, 60, 5);

    const stats = await quizService.fetchStats('u1');
    expect(stats.sessionsPlayed).toBe(2);
    expect(stats.totalAnswered).toBe(20);
    expect(stats.totalCorrect).toBe(13);
    expect(stats.totalPoints).toBe(250);
    expect(stats.accuracyPct).toBe(65); // 13/20
    expect(stats.bestSessionPct).toBe(80);
    expect(stats.bestSessionPoints).toBe(160);
    expect(stats.lastSessionDate).toBe('2026-02-01'); // newest-first row
    expect(stats.totalQuestionsInApp).toBe(60);
    expect(stats.correctDistinct).toBe(5);
  });

  test('throws when the sessions query itself errors', async () => {
    mockTables({ data: null, error: { message: 'boom' } }, 60, 0);
    await expect(quizService.fetchStats('u1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('quizService.getQuestionCoverage', () => {
  beforeEach(() => resetSupabaseMock());

  test('returns the counts from both tables on success', async () => {
    mockFrom.mockImplementation((table: string) =>
      table === 'quiz_questions'
        ? makeQueryResult({ data: null, error: null, count: 60 })
        : makeQueryResult({ data: null, error: null, count: 12 }),
    );
    await expect(quizService.getQuestionCoverage('u1')).resolves.toEqual({
      totalQuestionsInApp: 60,
      correctDistinct: 12,
    });
  });

  test('soft-fails to 0 (not a throw) when the progress table is missing', async () => {
    mockFrom.mockImplementation((table: string) =>
      table === 'quiz_questions'
        ? makeQueryResult({ data: null, error: null, count: 60 })
        : makeQueryResult({ data: null, error: { message: 'relation does not exist' } }),
    );
    await expect(quizService.getQuestionCoverage('u1')).resolves.toEqual({
      totalQuestionsInApp: 60,
      correctDistinct: 0,
    });
  });

  test('soft-fails both counts to 0 when both queries error', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'down' } }));
    await expect(quizService.getQuestionCoverage('u1')).resolves.toEqual({
      totalQuestionsInApp: 0,
      correctDistinct: 0,
    });
  });
});

describe('quizService.recordCorrectQuestions', () => {
  beforeEach(() => resetSupabaseMock());

  test('does not call Supabase at all for an empty list', async () => {
    await quizService.recordCorrectQuestions('u1', []);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('upserts one row per question id', async () => {
    const builder = makeQueryResult({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    await quizService.recordCorrectQuestions('u1', ['q1', 'q2']);

    expect(builder.upsert).toHaveBeenCalledWith(
      [{ user_id: 'u1', question_id: 'q1' }, { user_id: 'u1', question_id: 'q2' }],
      { onConflict: 'user_id,question_id', ignoreDuplicates: true },
    );
  });

  test('throws on a Supabase error', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'boom' } }));
    await expect(quizService.recordCorrectQuestions('u1', ['q1'])).rejects.toEqual({ message: 'boom' });
  });
});

describe('quizService.getHistory', () => {
  beforeEach(() => resetSupabaseMock());

  test('returns rows on success', async () => {
    const rows = [{ id: 's1', user_id: 'u1', created_at: 'now', total_questions: 10, correct_count: 8, incorrect_count: 2, points_earned: 80, points_max: 100, difficulty: 'easy' }];
    mockFrom.mockReturnValue(makeQueryResult({ data: rows, error: null }));
    await expect(quizService.getHistory('u1')).resolves.toEqual(rows);
  });

  test('returns an empty array (not a throw) on error', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'boom' } }));
    await expect(quizService.getHistory('u1')).resolves.toEqual([]);
  });
});
