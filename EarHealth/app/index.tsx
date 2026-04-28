import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Delay navigation to ensure the layout is mounted
    const timeout = setTimeout(() => {
      router.replace('/test');
    }, 0);

    return () => clearTimeout(timeout);
  }, [router]);

  return null;
}