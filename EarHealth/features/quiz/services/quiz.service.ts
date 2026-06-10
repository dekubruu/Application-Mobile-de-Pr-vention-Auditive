import { supabase } from '@/src/utils/supabase';
import type {
  Question,
  QuizCategory,
  QuizDifficulty,
  QuizFetchOptions,
  QuizQuestionRow,
  QuizResult,
  QuizSessionRow,
  QuizStats,
} from '../types/quiz.types';

const DEFAULT_COUNT       = 10;
const VALID_DIFFICULTIES  = new Set<QuizDifficulty>(['easy', 'medium', 'hard']);

// ── Fisher-Yates shuffle (unbiased, in place) ────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Normalize a raw row into a UI-ready Question ─────────────────────────────
// Shuffles options to avoid "correct answer is always B" bias.
function normalize(row: QuizQuestionRow): Question | null {
  if (!row.quiz_options || row.quiz_options.length < 2) return null;
  if (!VALID_DIFFICULTIES.has(row.difficulty as QuizDifficulty)) return null;

  const shuffledOpts = shuffle(row.quiz_options);
  const correctIdx   = shuffledOpts.findIndex(o => o.is_correct);
  if (correctIdx < 0) return null;

  return {
    id:          row.id,
    question:    row.question,
    answers:     shuffledOpts.map(o => o.option_text),
    correct:     correctIdx,
    explanation: row.explanation,
    points:      row.points,
    category:    row.category as QuizCategory,
    difficulty:  row.difficulty as QuizDifficulty,
  };
}

export const quizService = {
  // Fetch a randomized set of questions from Supabase.
  // Filters are applied server-side; shuffle + count are applied client-side
  // (cheaper than ORDER BY RANDOM() and avoids row-count pressure on the DB).
  async fetchRandomQuestions(opts: QuizFetchOptions = {}): Promise<Question[]> {
    const count = opts.count ?? DEFAULT_COUNT;

    let query = supabase
      .from('quiz_questions')
      .select(`
        id,
        question,
        category,
        difficulty,
        points,
        explanation,
        quiz_options (
          id,
          option_text,
          is_correct
        )
      `);

    if (opts.categories?.length) {
      query = query.in('category', opts.categories);
    }
    if (opts.difficulties?.length) {
      query = query.in('difficulty', opts.difficulties);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows       = (data ?? []) as unknown as QuizQuestionRow[];
    const normalized = rows.map(normalize).filter((q): q is Question => q !== null);
    return shuffle(normalized).slice(0, count);
  },

  // Persist a completed session. The DB trigger `bump_profile_points` will
  // automatically increment profiles.total_points by points_earned.
  async saveQuizSession(userId: string, result: QuizResult): Promise<void> {
    const { error } = await supabase.from('quiz_sessions').insert({
      user_id:         userId,
      total_questions: result.totalQuestions,
      correct_count:   result.correctCount,
      incorrect_count: result.incorrectCount,
      points_earned:   result.pointsTotal,
      points_max:      result.pointsMax,
    });
    if (error) throw error;
  },

  // Aggregate stats for the dashboard.
  // We pull all rows for the user (a single user's quiz history is tiny — at
  // most a few hundred rows in years of play), and aggregate client-side.
  async fetchStats(userId: string): Promise<QuizStats> {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('total_questions, correct_count, points_earned, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as Pick<
      QuizSessionRow,
      'total_questions' | 'correct_count' | 'points_earned' | 'created_at'
    >[];

    if (rows.length === 0) {
      return {
        sessionsPlayed:  0,
        totalAnswered:   0,
        totalCorrect:    0,
        totalPoints:     0,
        accuracyPct:     0,
        bestSessionPct:  0,
        lastSessionDate: null,
      };
    }

    let totalAnswered  = 0;
    let totalCorrect   = 0;
    let totalPoints    = 0;
    let bestPct        = 0;

    for (const r of rows) {
      totalAnswered += r.total_questions;
      totalCorrect  += r.correct_count;
      totalPoints   += r.points_earned;
      const pct = r.total_questions > 0
        ? Math.round((r.correct_count / r.total_questions) * 100)
        : 0;
      if (pct > bestPct) bestPct = pct;
    }

    return {
      sessionsPlayed:  rows.length,
      totalAnswered,
      totalCorrect,
      totalPoints,
      accuracyPct:     totalAnswered > 0
        ? Math.round((totalCorrect / totalAnswered) * 100)
        : 0,
      bestSessionPct:  bestPct,
      lastSessionDate: rows[0].created_at, // already sorted desc
    };
  },
};
