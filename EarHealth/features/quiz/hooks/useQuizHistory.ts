import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { quizService } from '../services/quiz.service';
import type { QuizSessionRow } from '../types/quiz.types';

// Compact list for the dashboard — not full pagination, mirrors the hearing
// test dashboard's "Derniers tests" cap.
const HISTORY_LIMIT = 10;

export interface UseQuizHistoryData {
  loading: boolean;
  entries: QuizSessionRow[];  // newest first
  refresh: () => void;
}

export function useQuizHistory(): UseQuizHistoryData {
  const { session }           = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<QuizSessionRow[]>([]);

  const load = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await quizService.getHistory(session.user.id, HISTORY_LIMIT);
      setEntries(rows);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  return { loading, entries, refresh: load };
}
