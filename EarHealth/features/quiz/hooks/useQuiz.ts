import { useCallback, useEffect, useRef, useState } from 'react';
import { quizService } from '../services/quiz.service';
import type {
  AnsweredQuestion,
  Question,
  QuizFetchOptions,
  QuizResult,
} from '../types/quiz.types';

type Status     = 'idle' | 'loading' | 'ready' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseQuizArgs extends QuizFetchOptions {
  /** If true, questions are fetched on mount. Default: false (caller triggers with start()). */
  autoLoad?: boolean;
  /** User id used to persist sessions. If null/undefined, sessions are NOT saved. */
  userId?:   string | null;
  /** Optional callback fired once a session has been successfully saved. */
  onSaved?:  () => void;
}

export function useQuiz(args: UseQuizArgs = {}) {
  const {
    autoLoad = false,
    count,
    categories,
    difficulties,
    userId,
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
  const [saveStatus, setSaveStatus]         = useState<SaveStatus>('idle');

  const savedRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // ── Load (or reload) questions ──
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

    try {
      const qs = await quizService.fetchRandomQuestions({ count, categories, difficulties });
      if (qs.length === 0) {
        setError('Aucune question disponible pour le moment.');
        setStatus('error');
        return;
      }
      setQuestions(qs);
      setStatus('ready');
    } catch (err) {
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

  // ── Auto-load on mount if requested ──
  useEffect(() => {
    if (autoLoad) start();
  }, [autoLoad, start]);

  // ── Per-question actions ──
  const currentQuestion = questions[questionIndex];

  const selectAnswer = useCallback((answerIndex: number) => {
    if (!currentQuestion) return;
    if (selectedAnswer !== null) return;          // ignore repeated taps

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
    if (selectedAnswer === null) return;          // can't skip without answering

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
  };

  // ── Auto-save when the game ends (idempotent via savedRef) ──
  useEffect(() => {
    if (!gameEnded)         return;
    if (savedRef.current)   return;
    if (!userId)            return;
    if (questions.length === 0) return;

    savedRef.current = true;
    setSaveStatus('saving');

    quizService
      .saveQuizSession(userId, result)
      .then(() => {
        setSaveStatus('saved');
        onSavedRef.current?.();
      })
      .catch(() => {
        savedRef.current = false; // allow manual retry
        setSaveStatus('error');
      });
    // We intentionally depend only on gameEnded — `result` is derived each render
    // and we don't want to re-save when answers ref-changes during the finish frame.
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
