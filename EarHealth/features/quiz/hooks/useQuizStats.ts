import { useCallback, useEffect, useState } from 'react';
import { quizService } from '../services/quiz.service';
import type { QuizStats } from '../types/quiz.types';

type Status = 'loading' | 'ready' | 'error';

export function useQuizStats(userId: string | null | undefined) {
  const [stats, setStats]   = useState<QuizStats | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStats(null);
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const s = await quizService.fetchStats(userId);
      setStats(s);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.');
      setStatus('error');
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, status, error, refresh };
}
