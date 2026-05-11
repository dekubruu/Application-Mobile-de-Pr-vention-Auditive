import { Slot, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuthContext } from '@/features/auth/context/AuthContext';

function NavigationGuard() {
  const { session, loading } = useAuthContext();
  const router = useRouter();
  const segments = useSegments();
  const rootNavState = useRootNavigationState();

  useEffect(() => {
    // Wait for navigation container to be fully mounted
    if (!rootNavState?.key) return;
    if (loading) return;

    const seg0            = (segments as string[])[0];
    const inAuth          = seg0 === '(auth)';
    const inTabs          = seg0 === '(tabs)';
    const inHearingTest   = seg0 === 'hearing-test';

    if (!session && !inAuth) {
      router.replace('/(auth)/login' as any);
    } else if (session && !inTabs && !inHearingTest) {
      router.replace('/(tabs)/test' as any);
    }
  }, [rootNavState?.key, session, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGuard />
    </AuthProvider>
  );
}
