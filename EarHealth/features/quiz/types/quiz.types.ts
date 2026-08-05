export type QuizCategory   = 'anatomy' | 'general' | 'prevention' | 'protection' | 'noise';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
// The difficulty a session was launched with — 'mixed' means no filter (any
// question difficulty), distinct from a per-question QuizDifficulty.
export type SessionDifficulty = QuizDifficulty | 'mixed';

// ── Normalized question (UI-ready) ─────────────────────────────────────────────
export interface Question {
  id:          string;
  question:    string;
  answers:     string[];
  correct:     number;          // index of the correct answer in `answers`
  explanation: string | null;
  points:      number;
  category:    QuizCategory;
  difficulty:  QuizDifficulty;
}

// ── Per-answer feedback recorded during a session ─────────────────────────────
export interface AnsweredQuestion {
  questionId:    string;
  isCorrect:     boolean;
  pointsEarned:  number;
  selectedIndex: number;
}

// ── Session summary (for results screen / future persistence) ─────────────────
export interface QuizResult {
  totalQuestions:  number;
  correctCount:    number;
  incorrectCount:  number;
  pointsTotal:     number;
  pointsMax:       number;
  answers:         AnsweredQuestion[];
  difficulty:      SessionDifficulty;
}

// ── Service filter options (extension hooks for themed quizzes) ───────────────
export interface QuizFetchOptions {
  count?:        number;
  categories?:   QuizCategory[];
  difficulties?: QuizDifficulty[];
}

// ── Raw Supabase shape (internal — only used by the service) ──────────────────
export interface QuizQuestionRow {
  id:          string;
  question:    string;
  category:    string;
  difficulty:  string;
  points:      number;
  explanation: string | null;
  quiz_options: {
    id:          string;
    option_text: string;
    is_correct:  boolean;
  }[];
}

// ── Persisted session row (matches `quiz_sessions` table) ────────────────────
export interface QuizSessionRow {
  id:              string;
  user_id:         string;
  created_at:      string;
  total_questions: number;
  correct_count:   number;
  incorrect_count: number;
  points_earned:   number;
  points_max:      number;
  // Nullable: absent on rows saved before the `difficulty` column existed.
  difficulty?:     SessionDifficulty | null;
}

// ── Aggregated stats shown on the dashboard ──────────────────────────────────
export interface QuizStats {
  sessionsPlayed:   number;
  totalAnswered:    number;
  totalCorrect:     number;
  totalPoints:      number;     // sum of points_earned across sessions
  accuracyPct:      number;     // 0–100, integer
  bestSessionPct:   number;     // best single-session accuracy 0–100
  bestSessionPoints: number;    // best single-session points_earned
  lastSessionDate:  string | null; // ISO
}

// ── Pending session: persisted locally before reaching Supabase ───────────────
// Idempotency: id is generated client-side ONCE (Crypto.randomUUID) and reused
// for every retry until the row is successfully upserted.
export interface PendingQuizSession {
  id:              string;       // stable client UUID
  user_id:         string;
  total_questions: number;
  correct_count:   number;
  incorrect_count: number;
  points_earned:   number;
  points_max:      number;
  difficulty:      SessionDifficulty;
  queued_at:       string;       // ISO timestamp (set at enqueue time)
}

// ── Save status surfaced by the hook to the UI ────────────────────────────────
//   idle    : nothing yet
//   saving  : network attempt in progress
//   saved   : row confirmed in Supabase
//   queued  : enqueued locally, network unavailable — will retry on flush
//   error   : catastrophic (e.g. AsyncStorage unavailable) — data NOT persisted
export type QuizSaveStatus = 'idle' | 'saving' | 'saved' | 'queued' | 'error';

// ── Result of saveQuizSessionResilient ────────────────────────────────────────
export interface ResilientSaveOutcome {
  status: 'synced' | 'queued';
  id:     string;
}

// ── Result of flushPendingSessions ────────────────────────────────────────────
export interface FlushOutcome {
  flushed:   number;   // sessions successfully persisted in this run
  remaining: number;   // sessions still in the queue after this run
  skipped:   boolean;  // true if a flush was already in flight (single-flight)
}
