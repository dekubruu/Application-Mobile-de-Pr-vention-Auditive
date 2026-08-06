import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { LargeSecureStore } from './secureStorage';

// On web, SecureStore doesn't exist and AsyncStorage's localStorage adapter
// crashes during SSR (Node.js) — fall back to a guarded localStorage adapter.
// On native, the session (JWT + refresh token) is encrypted at rest via
// SecureStore/Keychain-backed LargeSecureStore instead of plain AsyncStorage.
const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) => {
          if (typeof window === 'undefined') return Promise.resolve(null);
          return Promise.resolve(window.localStorage.getItem(key));
        },
        setItem: (key: string, value: string) => {
          if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          if (typeof window !== 'undefined') window.localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : new LargeSecureStore();

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
