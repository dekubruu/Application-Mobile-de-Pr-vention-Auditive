export type QuizCategory   = 'anatomy' | 'general' | 'prevention' | 'protection' | 'noise';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

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
}

// ── Aggregated stats shown on the dashboard ──────────────────────────────────
export interface QuizStats {
  sessionsPlayed:   number;
  totalAnswered:    number;
  totalCorrect:     number;
  totalPoints:      number;     // sum of points_earned across sessions
  accuracyPct:      number;     // 0–100, integer
  bestSessionPct:   number;     // best single-session accuracy 0–100
  lastSessionDate:  string | null; // ISO
}
