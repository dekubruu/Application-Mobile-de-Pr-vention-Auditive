import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// On web, AsyncStorage uses window.localStorage which crashes during SSR (Node.js).
// This adapter guards against that and falls back to localStorage in the browser.
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
    : AsyncStorage;

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
