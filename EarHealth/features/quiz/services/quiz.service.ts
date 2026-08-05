import * as Crypto from 'expo-crypto';
import { supabase } from '@/src/utils/supabase';
import {
  enqueuePendingSession,
  listPendingSessions,
  removePendingSession,
} from './quiz.storage';
import type {
  FlushOutcome,
  PendingQuizSession,
  Question,
  QuizCategory,
  QuizDifficulty,
  QuizFetchOptions,
  QuizQuestionRow,
  QuizResult,
  QuizSessionRow,
  QuizStats,
  ResilientSaveOutcome,
  SessionDifficulty,
} from '../types/quiz.types';

const DEFAULT_COUNT       = 10;
const VALID_DIFFICULTIES  = new Set<QuizDifficulty>(['easy', 'medium', 'hard']);

// ── Module-level single-flight guard for flushPendingSessions ───────────────
// Prevents the AuthProvider's foreground flush from racing with the in-line
// flush kicked off by saveQuizSessionResilient.
let flushInFlight = false;

// ── Fisher-Yates shuffle (unbiased, in place on a copy) ─────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Normalize a raw DB row into a UI-ready Question ─────────────────────────
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

// ── Private: persist a session row idempotently via upsert + DO NOTHING ────
// Critical: ignoreDuplicates: true → INSERT ... ON CONFLICT DO NOTHING. The
// `bump_profile_points` trigger only fires on AFTER INSERT, so a no-op upsert
// (when the id already exists) does NOT re-bump total_points. This is the
// foundation of the no-double-count guarantee.
async function persistSession(payload: {
  id:              string;
  user_id:         string;
  total_questions: number;
  correct_count:   number;
  incorrect_count: number;
  points_earned:   number;
  points_max:      number;
  difficulty:      SessionDifficulty;
}): Promise<void> {
  const { error } = await supabase
    .from('quiz_sessions')
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public service
// ─────────────────────────────────────────────────────────────────────────────

export const quizService = {
  // ── Question fetch (raw, unfiltered) ──
  // Used by useQuiz to populate the cache. Filters are applied client-side
  // via selectRandomQuestions so the cache stays usable across difficulty
  // selections.
  async fetchAllQuestions(): Promise<Question[]> {
    const { data, error } = await supabase
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

    if (error) throw error;

    const rows = (data ?? []) as unknown as QuizQuestionRow[];
    return rows
      .map(normalize)
      .filter((q): q is Question => q !== null);
  },

  // ── Pure: filter + shuffle + slice ──
  // No I/O. Safe to call on cached data while offline.
  selectRandomQuestions(pool: Question[], opts: QuizFetchOptions = {}): Question[] {
    const count = opts.count ?? DEFAULT_COUNT;

    let filtered = pool;
    if (opts.categories?.length) {
      const set = new Set(opts.categories);
      filtered = filtered.filter(q => set.has(q.category));
    }
    if (opts.difficulties?.length) {
      const set = new Set(opts.difficulties);
      filtered = filtered.filter(q => set.has(q.difficulty));
    }

    return shuffle(filtered).slice(0, count);
  },

  // ── Backwards-compatible composite ──
  // Used in places that want "fetch + select" in one shot, without caching.
  // useQuiz.start() does NOT use this — it splits the two steps to drive
  // the stale-while-revalidate behavior.
  async fetchRandomQuestions(opts: QuizFetchOptions = {}): Promise<Question[]> {
    const pool = await this.fetchAllQuestions();
    return this.selectRandomQuestions(pool, opts);
  },

  // ── Resilient session save ──
  //
  // Guarantee: the session is durable BEFORE any network call. If the app is
  // killed between gameEnded and the response from Supabase, the row will be
  // re-pushed by the next flush (app launch or foreground return).
  //
  // Idempotency: the `id` is generated ONCE here. On retry, we use the same id
  // and rely on persistSession's `ON CONFLICT DO NOTHING` to no-op against the
  // `bump_profile_points` trigger.
  //
  // Errors:
  //   - AsyncStorage failure (enqueue throws)  → THROWN to caller. Hook sets
  //     saveStatus='error'. This is the only catastrophic path.
  //   - Network/Supabase failure (persist throws) → CAUGHT, returns 'queued'.
  //     The row stays in the local queue and the next flush will retry.
  async saveQuizSessionResilient(
    userId: string,
    result: QuizResult,
  ): Promise<ResilientSaveOutcome> {
    const id = Crypto.randomUUID();

    const payload: PendingQuizSession = {
      id,
      user_id:         userId,
      total_questions: result.totalQuestions,
      correct_count:   result.correctCount,
      incorrect_count: result.incorrectCount,
      points_earned:   result.pointsTotal,
      points_max:      result.pointsMax,
      difficulty:      result.difficulty,
      queued_at:       new Date().toISOString(),
    };

    // 1) Durability first: AsyncStorage write must succeed before we touch the
    //    network. If this throws, the caller treats it as an error (no fake
    //    "saved" status without persistence anywhere).
    await enqueuePendingSession(payload);

    // 2) Try to push immediately. Don't throw on network failure — that's the
    //    whole point of the queue.
    try {
      await persistSession({
        id:              payload.id,
        user_id:         payload.user_id,
        total_questions: payload.total_questions,
        correct_count:   payload.correct_count,
        incorrect_count: payload.incorrect_count,
        points_earned:   payload.points_earned,
        points_max:      payload.points_max,
        difficulty:      payload.difficulty,
      });
    } catch {
      // Network unreachable, Supabase 5xx, RLS hiccup — keep the row queued.
      return { status: 'queued', id };
    }

    // 3) Persistence succeeded. Removing the queue entry is best-effort: if it
    //    fails (transient AsyncStorage hiccup), the next flush will retry and
    //    `ON CONFLICT DO NOTHING` makes the duplicate upsert a server-side
    //    no-op. We do NOT want to mis-report 'queued' here — the data is in
    //    Supabase.
    await removePendingSession(id).catch(() => { /* will be cleaned up by next flush */ });
    return { status: 'synced', id };
  },

  // ── Flush the queue ──
  //
  // Single-flight: a second concurrent call returns immediately with skipped=true
  // (no work done, no error). This prevents the AppState foreground trigger from
  // racing with an inline flush attempted by saveQuizSessionResilient.
  //
  // Scope: only sessions whose user_id matches `currentUserId` are processed.
  // Other items remain in the queue (multi-user-on-device safety).
  //
  // Errors per session are NEVER propagated — failed items stay queued for the
  // next attempt. The function only throws if AsyncStorage itself is unreadable
  // (the initial listPendingSessions); callers should fire-and-forget.
  async flushPendingSessions(currentUserId: string | null): Promise<FlushOutcome> {
    if (flushInFlight) {
      return { flushed: 0, remaining: 0, skipped: true };
    }
    if (!currentUserId) {
      return { flushed: 0, remaining: 0, skipped: false };
    }

    flushInFlight = true;
    try {
      const all     = await listPendingSessions();
      const mine    = all.filter(s => s.user_id === currentUserId);
      const others  = all.length - mine.length;

      let flushed = 0;
      let stillPending = 0;

      for (const session of mine) {
        try {
          await persistSession({
            id:              session.id,
            user_id:         session.user_id,
            total_questions: session.total_questions,
            correct_count:   session.correct_count,
            incorrect_count: session.incorrect_count,
            points_earned:   session.points_earned,
            points_max:      session.points_max,
            difficulty:      session.difficulty,
          });
          // Success (or PK-conflict no-op) → drop from queue.
          await removePendingSession(session.id);
          flushed++;
        } catch {
          // Network/Supabase failed for this row. Keep it for next time.
          stillPending++;
        }
      }

      return {
        flushed,
        remaining: stillPending + others,
        skipped:   false,
      };
    } finally {
      flushInFlight = false;
    }
  },

  // ── Aggregated stats for the dashboard ──
  // Consumers (useQuizStats) layer caching around it.
  async fetchStats(userId: string): Promise<QuizStats> {
    const [sessionsResult, coverage] = await Promise.all([
      supabase
        .from('quiz_sessions')
        .select('total_questions, correct_count, points_earned, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      this.getQuestionCoverage(userId),
    ]);

    const { data, error } = sessionsResult;
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
        bestSessionPoints: 0,
        lastSessionDate: null,
        ...coverage,
      };
    }

    let totalAnswered = 0;
    let totalCorrect  = 0;
    let totalPoints   = 0;
    let bestPct       = 0;
    let bestPoints    = 0;

    for (const r of rows) {
      totalAnswered += r.total_questions;
      totalCorrect  += r.correct_count;
      totalPoints   += r.points_earned;
      const pct = r.total_questions > 0
        ? Math.round((r.correct_count / r.total_questions) * 100)
        : 0;
      if (pct > bestPct) bestPct = pct;
      if (r.points_earned > bestPoints) bestPoints = r.points_earned;
    }

    return {
      sessionsPlayed:  rows.length,
      totalAnswered,
      totalCorrect,
      totalPoints,
      accuracyPct: totalAnswered > 0
        ? Math.round((totalCorrect / totalAnswered) * 100)
        : 0,
      bestSessionPct:  bestPct,
      bestSessionPoints: bestPoints,
      lastSessionDate: rows[0].created_at,
      ...coverage,
    };
  },

  // ── Distinct-question coverage ──
  // totalQuestionsInApp = size of the live question bank (quiz_questions).
  // correctDistinct = how many distinct questions this user has ever answered
  // correctly at least once (quiz_question_progress), independent of how many
  // times a question was replayed across sessions.
  //
  // Soft-fails to 0 rather than throwing: this is a secondary, display-only
  // stat, so a missing table (e.g. the migration hasn't been run yet) or an
  // RLS hiccup must not take down the rest of the dashboard (sessions,
  // points, best score), which don't depend on it.
  async getQuestionCoverage(userId: string): Promise<{ totalQuestionsInApp: number; correctDistinct: number }> {
    const [totalResult, correctResult] = await Promise.all([
      supabase.from('quiz_questions').select('id', { count: 'exact', head: true }),
      supabase.from('quiz_question_progress').select('question_id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    if (totalResult.error) {
      console.warn('[quizService] getQuestionCoverage: quiz_questions count failed:', totalResult.error.message);
    }
    if (correctResult.error) {
      console.warn('[quizService] getQuestionCoverage: quiz_question_progress count failed:', correctResult.error.message);
    }
    return {
      totalQuestionsInApp: totalResult.error ? 0 : (totalResult.count ?? 0),
      correctDistinct:     correctResult.error ? 0 : (correctResult.count ?? 0),
    };
  },

  // ── Best-effort: record which questions were answered correctly ──
  // Not resilience-queued like session saves: this is a display-only coverage
  // stat, not points/currency, so a missed write on a flaky connection just
  // means that question's "first correct" credit is picked up next time it's
  // answered correctly. `ON CONFLICT DO NOTHING` keeps a question's credit
  // permanent once earned, even if a later replay gets it wrong.
  async recordCorrectQuestions(userId: string, questionIds: string[]): Promise<void> {
    if (questionIds.length === 0) return;
    const rows = questionIds.map(question_id => ({ user_id: userId, question_id }));
    const { error } = await supabase
      .from('quiz_question_progress')
      .upsert(rows, { onConflict: 'user_id,question_id', ignoreDuplicates: true });
    if (error) throw error;
  },

  // ── Per-attempt history (for the "Derniers quiz" list) ──
  // Distinct from fetchStats' aggregate — individual rows, newest first.
  // No cache layer (unlike stats): the list is short and cheap to refetch, and
  // consumers can retry via refresh().
  async getHistory(userId: string, limit = 10): Promise<QuizSessionRow[]> {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('id, user_id, created_at, total_questions, correct_count, incorrect_count, points_earned, points_max, difficulty')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[quizService] getHistory failed:', error.message);
      return [];
    }
    return (data ?? []) as QuizSessionRow[];
  },
};
