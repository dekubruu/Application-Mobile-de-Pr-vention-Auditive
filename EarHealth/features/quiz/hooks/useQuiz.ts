import { useState } from 'react';
import { QUIZ_QUESTIONS } from '../data/quiz-questions';

export const useQuiz = () => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[questionIndex];
  const totalQuestions = QUIZ_QUESTIONS.length;

  const handleAnswer = (answerIndex: number) => {
    if (answerIndex === currentQuestion.correct) {
      setScore((prev) => prev + 1);
    }
    if (questionIndex < totalQuestions - 1) {
      setQuestionIndex((prev) => prev + 1);
    } else {
      setGameEnded(true);
    }
  };

  const resetGame = () => {
    setQuestionIndex(0);
    setScore(0);
    setGameEnded(false);
  };

  return {
    currentQuestion,
    questionIndex,
    totalQuestions,
    score,
    gameEnded,
    handleAnswer,
    resetGame,
  };
};
