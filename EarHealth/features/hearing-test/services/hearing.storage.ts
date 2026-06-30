// ─────────────────────────────────────────────────────────────────────────────
// AsyncStorage primitives for the hearing-test feature.
//
// Pattern copied (intentionally NOT extracted/shared) from quiz.storage.ts so
// the two features evolve independently — separate key namespaces, separate
// mutex instances, separate single-flight guards.
//
// Invariants:
//   1. Keys are namespaced under `@earhealth/hearing:`.
//   2. All read helpers return `null` on absence/corruption — they NEVER throw.
//   3. Write helpers ARE allowed to throw — a write failure is unexpected
//      enough that the caller decides what to do.
//   4. Mutations of the queue are serialized by a module-level promise chain
//      (withQueueLock) so concurrent enqueue/remove can't lose updates.
//   5. Top-level shape is re-validated on read (defensive against schema drift
//      across app versions).
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Test-type discriminator + payload shapes ────────────────────────────────
// These shapes are what gets persisted into hearing_test_results.payload (JSONB).
// The runtime hooks (usePureToneTest, useHighFrequencyTest) own the mapping
// from their internal result types into these shapes.

export type HearingTestType = 'ptt' | 'hfrt';

export interface PTTPayload {
  ears: {
    ear:        'left' | 'right';
    thresholds: { freq: number; db: number }[];
    avgDb:      number;
  }[];
}

export interface HFRTPayload {
  maxFrequencyHz: number;
  interpretation: string;
  // Enriched fields (all optional → backward-compatible with rows queued by
  // older builds, and the isHFRTPayload guard only requires the two above).
  reliable?:         boolean;
  reversals?:        number;
  durationMs?:       number;
  hitCeiling?:       boolean;
  noResponse?:       boolean;
  ageAtTest?:        number;
  expectedForAgeHz?: number;
  // `interpretation` always holds the ABSOLUTE quality label (stable vocabulary).
  // The age-relative phrase, when computable, is stored separately so the column
  // semantics never depend on whether a birth date was present at save time.
  relativeToAge?:    string;
  relative?:         'above' | 'typical' | 'below';
}

export type HearingPayload = PTTPayload | HFRTPayload;

// ── Pending result (queued before persistence) ───────────────────────────────

export interface PendingHearingResult {
  id:            string;            // client-generated UUID, stable across retries
  user_id:       string;
  test_type:     HearingTestType;
  payload:       HearingPayload;
  overall_score: number;            // 0-100, derived at save time
  queued_at:     string;            // ISO timestamp
}

// ── Save status surfaced by the hook to the UI ──────────────────────────────
//   idle    : nothing yet
//   saving  : network attempt in progress
//   saved   : row confirmed in Supabase
//   queued  : enqueued locally, network unavailable — will retry on flush
//   error   : catastrophic (e.g. AsyncStorage unavailable) — data NOT persisted
export type HearingSaveStatus = 'idle' | 'saving' | 'saved' | 'queued' | 'error';

export interface HearingResilientSaveOutcome {
  status: 'synced' | 'queued';
  id:     string;
}

export interface HearingFlushOutcome {
  flushed:   number;
  remaining: number;
  skipped:   boolean;
}

// ── Key namespacing ─────────────────────────────────────────────────────────

const KEY_PREFIX        = '@earhealth/hearing:';
const KEY_PENDING_QUEUE = `${KEY_PREFIX}pending_results`;

// ── Generic safe read/write ─────────────────────────────────────────────────

async function safeReadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function safeWriteJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function safeRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* swallow — idempotent intent */
  }
}

// ── Queue mutex ─────────────────────────────────────────────────────────────
// Module-local mutex (instance distinct from the quiz mutex). Serializes the
// read-modify-write sequence inside enqueuePendingResult/removePendingResult
// so a foreground flush interleaved with an inline save cannot lose updates.

let queueMutex: Promise<void> = Promise.resolve();
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueMutex.then(fn, fn);
  queueMutex = run.then(() => undefined, () => undefined);
  return run;
}

// ── Validation guards ──────────────────────────────────────────────────────

function isHearingTestType(v: unknown): v is HearingTestType {
  return v === 'ptt' || v === 'hfrt';
}

function isPTTPayload(v: unknown): v is PTTPayload {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.ears)) return false;
  return o.ears.every(e => {
    if (!e || typeof e !== 'object') return false;
    const r = e as Record<string, unknown>;
    if (r.ear !== 'left' && r.ear !== 'right') return false;
    if (typeof r.avgDb !== 'number') return false;
    if (!Array.isArray(r.thresholds)) return false;
    return r.thresholds.every(t => {
      if (!t || typeof t !== 'object') return false;
      const s = t as Record<string, unknown>;
      return typeof s.freq === 'number' && typeof s.db === 'number';
    });
  });
}

function isHFRTPayload(v: unknown): v is HFRTPayload {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.maxFrequencyHz === 'number' && typeof o.interpretation === 'string';
}

function isPendingHearingResult(v: unknown): v is PendingHearingResult {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.id            !== 'string') return false;
  if (typeof o.user_id       !== 'string') return false;
  if (!isHearingTestType(o.test_type))     return false;
  if (typeof o.overall_score !== 'number') return false;
  if (typeof o.queued_at     !== 'string') return false;
  if (o.test_type === 'ptt' && !isPTTPayload(o.payload))  return false;
  if (o.test_type === 'hfrt' && !isHFRTPayload(o.payload)) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending queue
// ─────────────────────────────────────────────────────────────────────────────

export async function listPendingResults(): Promise<PendingHearingResult[]> {
  const raw = await safeReadJSON<unknown>(KEY_PENDING_QUEUE);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPendingHearingResult);
}

export function enqueuePendingResult(p: PendingHearingResult): Promise<void> {
  return withQueueLock(async () => {
    const existing = await listPendingResults();
    // De-dupe by id — an interrupted write-through call could otherwise
    // re-enqueue an item that's already there.
    if (existing.some(e => e.id === p.id)) return;
    existing.push(p);
    await safeWriteJSON(KEY_PENDING_QUEUE, existing);
  });
}

export function removePendingResult(id: string): Promise<void> {
  return withQueueLock(async () => {
    const existing = await listPendingResults();
    const next = existing.filter(e => e.id !== id);
    if (next.length === existing.length) return;
    if (next.length === 0) {
      await safeRemove(KEY_PENDING_QUEUE);
    } else {
      await safeWriteJSON(KEY_PENDING_QUEUE, next);
    }
  });
}
