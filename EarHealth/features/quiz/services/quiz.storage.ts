// ─────────────────────────────────────────────────────────────────────────────
// AsyncStorage primitives for the quiz feature.
//
// Design invariants:
//   1. Keys are namespaced under `@earhealth/quiz:` to avoid collision with
//      Supabase auth keys (sb-...-auth-token) and any future feature.
//   2. All read helpers return `null` on absence / corruption — they NEVER throw.
//      Callers can treat "no cache" and "corrupt cache" identically.
//   3. Write helpers ARE allowed to throw (caller will surface a real error) —
//      a write failure is genuinely unexpected and not recoverable silently.
//   4. Values are JSON-stringified. Schema is enforced by TS at the boundaries;
//      we re-validate the top-level shape on read (Array.isArray / object check)
//      to defend against partial writes or schema drift across app versions.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  PendingQuizSession,
  Question,
  QuizStats,
} from '../types/quiz.types';

const KEY_PREFIX = '@earhealth/quiz:';

const KEY_PENDING_QUEUE   = `${KEY_PREFIX}pending_sessions`;
const KEY_QUESTIONS_CACHE = `${KEY_PREFIX}questions_cache`;
const keyStatsCache = (userId: string) => `${KEY_PREFIX}stats_cache:${userId}`;

// ── Generic safe read/write ─────────────────────────────────────────────────

async function safeReadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted or unreadable — treat as absent.
    return null;
  }
}

async function safeWriteJSON(key: string, value: unknown): Promise<void> {
  // Let writes throw — a caller decides what to do.
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function safeRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* swallow: idempotent intent */
  }
}

// ── Queue mutex ─────────────────────────────────────────────────────────────
// CRITICAL: AsyncStorage has no transactions. Without serialization, the
// read-modify-write pattern in enqueue/remove can lose updates if the AppState
// foreground flush interleaves with an inline save during recovery — the very
// scenario the queue exists to protect against.
//
// We serialize all writers via a single promise chain. Reads (listPending) are
// allowed to run unsynchronized: the worst-case stale read is a duplicate
// upsert attempt, which `ON CONFLICT DO NOTHING` makes a server-side no-op.
let queueMutex: Promise<void> = Promise.resolve();
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  // Chain regardless of previous outcome so one failure doesn't block forever.
  const run = queueMutex.then(fn, fn);
  queueMutex = run.then(() => undefined, () => undefined);
  return run;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending sessions queue
// ─────────────────────────────────────────────────────────────────────────────

function isPendingSession(v: unknown): v is PendingQuizSession {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id              === 'string' &&
    typeof o.user_id         === 'string' &&
    typeof o.total_questions === 'number' &&
    typeof o.correct_count   === 'number' &&
    typeof o.incorrect_count === 'number' &&
    typeof o.points_earned   === 'number' &&
    typeof o.points_max      === 'number' &&
    typeof o.queued_at       === 'string'
  );
}

export async function listPendingSessions(): Promise<PendingQuizSession[]> {
  const raw = await safeReadJSON<unknown>(KEY_PENDING_QUEUE);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPendingSession);
}

export function enqueuePendingSession(s: PendingQuizSession): Promise<void> {
  return withQueueLock(async () => {
    const existing = await listPendingSessions();
    // De-dupe by id (a write-through call that was interrupted mid-save could
    // otherwise re-enqueue an item that's already there).
    if (existing.some(e => e.id === s.id)) return;
    existing.push(s);
    await safeWriteJSON(KEY_PENDING_QUEUE, existing);
  });
}

export function removePendingSession(id: string): Promise<void> {
  return withQueueLock(async () => {
    const existing = await listPendingSessions();
    const next = existing.filter(s => s.id !== id);
    if (next.length === existing.length) return;
    if (next.length === 0) {
      await safeRemove(KEY_PENDING_QUEUE);
    } else {
      await safeWriteJSON(KEY_PENDING_QUEUE, next);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Questions cache (unfiltered pool — filter is applied at consumption time)
// ─────────────────────────────────────────────────────────────────────────────

export interface QuestionsCacheEnvelope {
  questions: Question[];
  cachedAt:  string;
}

function isQuestion(v: unknown): v is Question {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id          === 'string' &&
    typeof o.question    === 'string' &&
    Array.isArray(o.answers) &&
    o.answers.every(a => typeof a === 'string') &&
    typeof o.correct     === 'number' &&
    (o.explanation === null || typeof o.explanation === 'string') &&
    typeof o.points      === 'number' &&
    typeof o.category    === 'string' &&
    typeof o.difficulty  === 'string'
  );
}

export async function getCachedQuestions(): Promise<QuestionsCacheEnvelope | null> {
  const raw = await safeReadJSON<unknown>(KEY_QUESTIONS_CACHE);
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.cachedAt !== 'string') return null;
  if (!Array.isArray(o.questions)) return null;
  const questions = o.questions.filter(isQuestion);
  if (questions.length === 0) return null;
  return { questions, cachedAt: o.cachedAt };
}

export async function setCachedQuestions(questions: Question[]): Promise<void> {
  if (questions.length === 0) return; // do not poison the cache with an empty pool
  const envelope: QuestionsCacheEnvelope = {
    questions,
    cachedAt: new Date().toISOString(),
  };
  await safeWriteJSON(KEY_QUESTIONS_CACHE, envelope);
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats cache (per user — different keys per userId to avoid cross-user leaks)
// ─────────────────────────────────────────────────────────────────────────────

export interface StatsCacheEnvelope {
  stats:    QuizStats;
  cachedAt: string;
}

function isQuizStats(v: unknown): v is QuizStats {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.sessionsPlayed  === 'number' &&
    typeof o.totalAnswered   === 'number' &&
    typeof o.totalCorrect    === 'number' &&
    typeof o.totalPoints     === 'number' &&
    typeof o.accuracyPct     === 'number' &&
    typeof o.bestSessionPct  === 'number' &&
    (o.lastSessionDate === null || typeof o.lastSessionDate === 'string')
  );
}

export async function getCachedStats(userId: string): Promise<StatsCacheEnvelope | null> {
  if (!userId) return null;
  const raw = await safeReadJSON<unknown>(keyStatsCache(userId));
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.cachedAt !== 'string') return null;
  if (!isQuizStats(o.stats)) return null;
  return { stats: o.stats, cachedAt: o.cachedAt };
}

export async function setCachedStats(userId: string, stats: QuizStats): Promise<void> {
  if (!userId) return;
  const envelope: StatsCacheEnvelope = {
    stats,
    cachedAt: new Date().toISOString(),
  };
  await safeWriteJSON(keyStatsCache(userId), envelope);
}
