import { useEffect, useState } from 'react';
import { supabase } from '@/src/utils/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const useProfileData = () => {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [testsCount, setTestsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!session) {
      setLoadingStats(false);
      return;
    }
    // Count completed hearing tests (both PTT and HFRT) for this user.
    // The legacy 'hearing_tests' table name was a stale reference.
    supabase
      .from('hearing_test_results')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .in('test_type', ['ptt', 'hfrt'])
      .then(({ count }) => {
        setTestsCount(count ?? 0);
        setLoadingStats(false);
      });
  }, [session]);

  const daysSinceJoined = profile
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000),
      )
    : 0;

  return { profile, session, testsCount, daysSinceJoined, loadingStats, refreshProfile, signOut };
};
