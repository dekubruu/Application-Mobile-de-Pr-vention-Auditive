import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/src/utils/supabase';
import type { Profile } from '@/features/auth/types/auth.types';
import type { QuizSessionRow } from '@/features/quiz/types/quiz.types';

// Hearing-test row shape as exported (subset of `hearing_test_results`).
// `payload` is the raw JSONB column, included as-is per the export contract.
interface HearingExportRow {
  id: string;
  test_type: string;
  payload: unknown;
  overall_score: number | null;
  created_at: string;
}

export interface UserExport {
  exportedAt: string;
  app: 'EarHealth';
  profile: Profile | null;
  quizSessions: QuizSessionRow[];
  hearingTests: HearingExportRow[];
}

export type ExportResult = { status: 'shared' } | { status: 'unavailable' };

// READ-ONLY. Fetches every row the current user owns across the three tables.
// RLS guarantees the user can only read their own rows; the .eq(user_id/id)
// filters mirror that contract on the client. Throws on any Supabase error so
// the caller can surface a network/error Alert.
export async function buildUserExport(userId: string): Promise<UserExport> {
  const [profileRes, quizRes, hearingRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('hearing_test_results')
      .select('id, test_type, payload, overall_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (quizRes.error) throw quizRes.error;
  if (hearingRes.error) throw hearingRes.error;

  return {
    exportedAt: new Date().toISOString(),
    app: 'EarHealth',
    profile: (profileRes.data ?? null) as Profile | null,
    quizSessions: (quizRes.data ?? []) as QuizSessionRow[],
    hearingTests: (hearingRes.data ?? []) as HearingExportRow[],
  };
}

// Builds the JSON, writes it to the cache directory, then opens the native
// share sheet. Returns { status: 'unavailable' } if sharing isn't supported on
// the device (caller shows an Alert). Any fetch/write error propagates.
export async function exportUserData(userId: string): Promise<ExportResult> {
  const data = await buildUserExport(userId);

  const dateStr = new Date().toISOString().split('T')[0];
  const file = new File(Paths.cache, `earhealth-export-${dateStr}.json`);
  // Re-export on the same day reuses the same filename — clear any stale file
  // first so create() never throws on an existing path.
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    return { status: 'unavailable' };
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Exporter mes données EarHealth',
    UTI: 'public.json',
  });

  return { status: 'shared' };
}
