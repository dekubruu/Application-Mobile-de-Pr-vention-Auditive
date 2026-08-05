import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../services/quiz.service', () => ({
  quizService: {
    fetchAllQuestions: jest.fn(),
    selectRandomQuestions: jest.fn(),
    saveQuizSessionResilient: jest.fn(),
    recordCorrectQuestions: jest.fn(),
  },
}));
jest.mock('../services/quiz.storage', () => ({
  getCachedQuestions: jest.fn(),
  setCachedQuestions: jest.fn(),
}));

import { quizService } from '../services/quiz.service';
import { getCachedQuestions, setCachedQuestions } from '../services/quiz.storage';
import { useQuiz } from '../hooks/useQuiz';
import type { Question } from '../types/quiz.types';

const mockFetchAll = quizService.fetchAllQuestions as jest.Mock;
const mockSelect = quizService.selectRandomQuestions as jest.Mock;
const mockSave = quizService.saveQuizSessionResilient as jest.Mock;
const mockRecordCorrect = quizService.recordCorrectQuestions as jest.Mock;
const mockGetCached = getCachedQuestions as jest.Mock;
const mockSetCached = setCachedQuestions as jest.Mock;

function makeQuestion(id: string, correctIndex = 0, points = 10): Question {
  return {
    id, question: `Q ${id}`, answers: ['a', 'b'], correct: correctIndex,
    explanation: null, points, category: 'noise', difficulty: 'easy',
  };
}

describe('useQuiz — start() question loading', () => {
  beforeEach(() => {
    mockFetchAll.mockReset();
    mockSelect.mockReset();
    mockSave.mockReset();
    mockRecordCorrect.mockReset();
    mockGetCached.mockReset();
    mockSetCached.mockReset();
    mockGetCached.mockResolvedValue(null);
    mockSetCached.mockResolvedValue(undefined);
  });

  test('an insufficient cache falls through to a live fetch that populates the cache', async () => {
    mockGetCached.mockResolvedValue({ questions: [makeQuestion('cached')], cachedAt: 'now' });
    mockSelect.mockImplementation((pool: Question[]) => pool); // pass-through: cached pool too small (1 < 10)
    mockFetchAll.mockResolvedValue([makeQuestion('a'), makeQuestion('b')]);

    const { result } = renderHook(() => useQuiz({ count: 10 }));
    await act(async () => { await result.current.start(); });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockFetchAll).toHaveBeenCalled();
    expect(mockSetCached).toHaveBeenCalled();
  });

  test('a sufficient cache starts immediately without a live fetch on the critical path', async () => {
    const cachedPool = Array.from({ length: 10 }, (_, i) => makeQuestion(`c${i}`));
    mockGetCached.mockResolvedValue({ questions: cachedPool, cachedAt: 'now' });
    mockSelect.mockImplementation((pool: Question[]) => pool);
    mockFetchAll.mockResolvedValue(cachedPool); // background revalidation call

    const { result } = renderHook(() => useQuiz({ count: 10 }));
    await act(async () => { await result.current.start(); });

    expect(result.current.status).toBe('ready');
    expect(result.current.totalQuestions).toBe(10);
  });

  test('surfaces an error when the live fetch returns an empty pool and there is no cache', async () => {
    mockFetchAll.mockResolvedValue([]);

    const { result } = renderHook(() => useQuiz());
    await act(async () => { await result.current.start(); });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/Aucune question/);
  });

  test('falls back to a non-empty cached subset when the live fetch throws (offline)', async () => {
    mockGetCached.mockResolvedValue({ questions: [makeQuestion('offline1')], cachedAt: 'now' });
    mockSelect.mockImplementation((pool: Question[]) => pool);
    mockFetchAll.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useQuiz({ count: 10 }));
    await act(async () => { await result.current.start(); });

    expect(result.current.status).toBe('ready');
    expect(result.current.totalQuestions).toBe(1);
  });

  test('surfaces the network error when both the live fetch and the cache are unavailable', async () => {
    mockGetCached.mockResolvedValue(null);
    mockFetchAll.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useQuiz());
    await act(async () => { await result.current.start(); });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('network down');
  });
});

describe('useQuiz — answering and session end', () => {
  beforeEach(() => {
    mockFetchAll.mockReset();
    mockSelect.mockReset();
    mockSave.mockReset();
    mockRecordCorrect.mockReset();
    mockGetCached.mockReset();
    mockSetCached.mockReset();
    mockGetCached.mockResolvedValue(null);
    mockSetCached.mockResolvedValue(undefined);
    mockSave.mockResolvedValue({ status: 'synced', id: 'sess-1' });
    mockRecordCorrect.mockResolvedValue(undefined);
  });

  async function startWithTwoQuestions() {
    const questions = [makeQuestion('q1', 0, 10), makeQuestion('q2', 0, 20)];
    mockFetchAll.mockResolvedValue(questions);
    mockSelect.mockImplementation((pool: Question[]) => pool);

    const { result } = renderHook(() => useQuiz({ count: 2, userId: 'u1' }));
    await act(async () => { await result.current.start(); });
    return result;
  }

  test('selecting the correct answer marks isCorrect and awards the question’s points', async () => {
    const result = await startWithTwoQuestions();

    act(() => { result.current.selectAnswer(0); }); // correct index is 0

    expect(result.current.selectedAnswer).toBe(0);
    expect(result.current.showExplanation).toBe(true);
    expect(result.current.result.correctCount).toBe(1);
    expect(result.current.result.pointsTotal).toBe(10);
  });

  test('selecting a wrong answer awards no points and marks it incorrect', async () => {
    const result = await startWithTwoQuestions();

    act(() => { result.current.selectAnswer(1) }); // wrong (correct is 0)

    expect(result.current.result.incorrectCount).toBe(1);
    expect(result.current.result.pointsTotal).toBe(0);
  });

  test('selecting an answer twice for the same question is a no-op', async () => {
    const result = await startWithTwoQuestions();

    act(() => { result.current.selectAnswer(0); });
    act(() => { result.current.selectAnswer(1); }); // ignored — already answered

    expect(result.current.result.answers).toHaveLength(1);
  });

  test('goNext does nothing until an answer is selected', async () => {
    const result = await startWithTwoQuestions();
    act(() => { result.current.goNext(); });
    expect(result.current.questionIndex).toBe(0);
  });

  test('advancing past the last question sets gameEnded and triggers a resilient save', async () => {
    const result = await startWithTwoQuestions();

    act(() => { result.current.selectAnswer(0); });
    act(() => { result.current.goNext(); });
    expect(result.current.questionIndex).toBe(1);

    act(() => { result.current.selectAnswer(0); });
    act(() => { result.current.goNext(); });

    await waitFor(() => expect(result.current.gameEnded).toBe(true));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith('u1', expect.objectContaining({ totalQuestions: 2, correctCount: 2, pointsTotal: 30 })));
    await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
  });

  test('records only the correctly-answered question ids for coverage tracking', async () => {
    const result = await startWithTwoQuestions();

    act(() => { result.current.selectAnswer(0); }); // q1 correct
    act(() => { result.current.goNext(); });
    act(() => { result.current.selectAnswer(1); }); // q2 wrong
    act(() => { result.current.goNext(); });

    await waitFor(() => expect(mockRecordCorrect).toHaveBeenCalledWith('u1', ['q1']));
  });

  test('does not attempt to save when there is no userId', async () => {
    const questions = [makeQuestion('q1', 0, 10)];
    mockFetchAll.mockResolvedValue(questions);
    mockSelect.mockImplementation((pool: Question[]) => pool);

    const { result } = renderHook(() => useQuiz({ count: 1 })); // no userId
    await act(async () => { await result.current.start(); });

    act(() => { result.current.selectAnswer(0); });
    act(() => { result.current.goNext(); });

    await waitFor(() => expect(result.current.gameEnded).toBe(true));
    expect(mockSave).not.toHaveBeenCalled();
  });

  test('reset() returns to idle and clears session state', async () => {
    const result = await startWithTwoQuestions();
    act(() => { result.current.reset(); });

    expect(result.current.status).toBe('idle');
    expect(result.current.totalQuestions).toBe(0);
    expect(result.current.gameEnded).toBe(false);
  });
});
