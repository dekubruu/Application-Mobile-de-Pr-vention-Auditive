import { useCallback, useEffect, useRef, useState } from 'react';
import { quizService } from '../services/quiz.service';
import {
  getCachedQuestions,
  setCachedQuestions,
} from '../services/quiz.storage';
import type {
  AnsweredQuestion,
  Question,
  QuizFetchOptions,
  QuizResult,
  QuizSaveStatus,
  SessionDifficulty,
} from '../types/quiz.types';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export interface UseQuizArgs extends QuizFetchOptions {
  /** If true, questions are fetched on mount. Default: false (caller triggers with start()). */
  autoLoad?: boolean;
  /** User id used to persist sessions. If null/undefined, sessions are NOT saved. */
  userId?:   string | null;
  /** The difficulty selection the session was launched with (as picked in the
   *  UI, before it's resolved into a `difficulties` filter array). Persisted
   *  alongside the result so history rows can show it. */
  difficultyChoice?: SessionDifficulty;
  /** Optional callback fired after a save attempt (synced OR queued). */
  onSaved?:  () => void;
}

export function useQuiz(args: UseQuizArgs = {}) {
  const {
    autoLoad = false,
    count,
    categories,
    difficulties,
    userId,
    difficultyChoice = 'mixed',
    onSaved,
  } = args;

  const [status, setStatus]                 = useState<Status>('idle');
  const [error, setError]                   = useState<string | null>(null);
  const [questions, setQuestions]           = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex]   = useState(0);
  const [answers, setAnswers]               = useState<AnsweredQuestion[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExpl]      = useState(false);
  const [gameEnded, setGameEnded]           = useState(false);
  const [saveStatus, setSaveStatus]         = useState<QuizSaveStatus>('idle');

  const savedRef    = useRef(false);
  const onSavedRef  = useRef(onSaved);
  onSavedRef.current = onSaved;

  // ── Load (or reload) questions ──
  // Stale-while-revalidate:
  //   1. If a cached pool exists, kick off the quiz immediately using it, then
  //      refresh the cache in the background (silent, no UI impact).
  //   2. Otherwise, do a live fetch. On success, cache it.
  //   3. If both cache and live fetch are unavailable, surface the error.
  const start = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setQuestions([]);
    setQuestionIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowExpl(false);
    setGameEnded(false);
    setSaveStatus('idle');
    savedRef.current = false;

    const selectorOpts: QuizFetchOptions = { count, categories, difficulties };
    const desiredCount = count ?? 10;

    // Step 1: try the cache for instant start.
    // The cache may legitimately contain fewer questions matching the active
    // filter than the user asked for (e.g. cached during 'mixed' then user
    // picks 'hard'). We treat "matches < desiredCount" as a soft miss and
    // attempt a live fetch first, with the cached subset as fallback when
    // offline.
    const cached = await getCachedQuestions();
    let cachedSelected: ReturnType<typeof quizService.selectRandomQuestions> = [];
    if (cached) {
      cachedSelected = quizService.selectRandomQuestions(cached.questions, selectorOpts);
      if (cachedSelected.length >= desiredCount) {
        // Cache is sufficient — start immediately + revalidate in background.
        setQuestions(cachedSelected);
        setStatus('ready');

        quizService
          .fetchAllQuestions()
          .then(pool => { if (pool.length > 0) return setCachedQuestions(pool); })
          .catch(() => { /* offline / network issue: keep the existing cache */ });

        return;
      }
      // Cache exists but insufficient for the requested filter+count.
      // Fall through to live fetch; we'll fall BACK to cachedSelected if the
      // network is unavailable so the user can still play offline.
    }

    // Step 2: live fetch
    try {
      const pool = await quizService.fetchAllQuestions();
      if (pool.length === 0) {
        setError('Aucune question disponible pour le moment.');
        setStatus('error');
        return;
      }

      // Cache for next time (best-effort).
      setCachedQuestions(pool).catch(() => { /* AsyncStorage hiccup, non-fatal */ });

      const selected = quizService.selectRandomQuestions(pool, selectorOpts);
      if (selected.length === 0) {
        setError('Aucune question disponible pour le moment.');
        setStatus('error');
        return;
      }

      setQuestions(selected);
      setStatus('ready');
    } catch (err) {
      // Live fetch failed — if we have a non-empty cached subset (even if
      // smaller than desired), prefer playing it offline over failing hard.
      if (cachedSelected.length > 0) {
        setQuestions(cachedSelected);
        setStatus('ready');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Erreur réseau inconnue.';
      setError(msg);
      setStatus('error');
    }
  }, [count, categories, difficulties]);

  // ── Reset back to idle (used to return to dashboard) ──
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setQuestions([]);
    setQuestionIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowExpl(false);
    setGameEnded(false);
    setSaveStatus('idle');
    savedRef.current = false;
  }, []);

  useEffect(() => {
    if (autoLoad) start();
  }, [autoLoad, start]);

  // ── Per-question actions ──
  const currentQuestion = questions[questionIndex];

  const selectAnswer = useCallback((answerIndex: number) => {
    if (!currentQuestion) return;
    if (selectedAnswer !== null) return;

    const isCorrect    = answerIndex === currentQuestion.correct;
    const pointsEarned = isCorrect ? currentQuestion.points : 0;

    setSelectedAnswer(answerIndex);
    setShowExpl(true);
    setAnswers(prev => [
      ...prev,
      {
        questionId:    currentQuestion.id,
        isCorrect,
        pointsEarned,
        selectedIndex: answerIndex,
      },
    ]);
  }, [currentQuestion, selectedAnswer]);

  const goNext = useCallback(() => {
    if (selectedAnswer === null) return;

    if (questionIndex < questions.length - 1) {
      setQuestionIndex(i => i + 1);
      setSelectedAnswer(null);
      setShowExpl(false);
    } else {
      setGameEnded(true);
    }
  }, [questionIndex, questions.length, selectedAnswer]);

  // ── Derived: session result ──
  const result: QuizResult = {
    totalQuestions: questions.length,
    correctCount:   answers.filter(a => a.isCorrect).length,
    incorrectCount: answers.filter(a => !a.isCorrect).length,
    pointsTotal:    answers.reduce((sum, a) => sum + a.pointsEarned, 0),
    pointsMax:      questions.reduce((sum, q) => sum + q.points, 0),
    answers,
    difficulty:     difficultyChoice,
  };

  // ── Auto-save when the game ends ──
  // saveQuizSessionResilient guarantees durability before any network call:
  // the session is enqueued to AsyncStorage, then a Supabase upsert is
  // attempted with `ON CONFLICT DO NOTHING`. The next AppState→active or app
  // launch will flush whatever stayed queued.
  useEffect(() => {
    if (!gameEnded)             return;
    if (savedRef.current)       return;
    if (!userId)                return;
    if (questions.length === 0) return;

    savedRef.current = true;
    setSaveStatus('saving');

    quizService
      .saveQuizSessionResilient(userId, result)
      .then((outcome) => {
        setSaveStatus(outcome.status === 'synced' ? 'saved' : 'queued');
        onSavedRef.current?.();
      })
      .catch(() => {
        // Catastrophic: AsyncStorage couldn't enqueue. Allow a manual retry
        // by clearing savedRef so re-toggling gameEnded would retry.
        savedRef.current = false;
        setSaveStatus('error');
      });

    // Best-effort, not queued (see recordCorrectQuestions doc) — a missed
    // write here doesn't lose points, just delays this question's coverage
    // credit until it's next answered correctly.
    const correctIds = result.answers.filter(a => a.isCorrect).map(a => a.questionId);
    quizService.recordCorrectQuestions(userId, correctIds)
      .catch((err) => console.warn('[useQuiz] recordCorrectQuestions failed:', err?.message ?? err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameEnded, userId]);

  return {
    // status
    status,
    error,
    saveStatus,

    // session
    currentQuestion,
    questionIndex,
    totalQuestions: questions.length,
    selectedAnswer,
    showExplanation,
    gameEnded,
    result,

    // actions
    start,
    reset,
    restart: start,
    retry:   start,
    selectAnswer,
    goNext,
  };
}
