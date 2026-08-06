import { supabase } from '@/src/utils/supabase';

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(
    email: string,
    password: string,
    username: string,
    date_of_birth: string,
    gender: string,
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, date_of_birth, gender } },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Permanently deletes the current user's account and, via DB-level cascade
  // FKs, every row of their data (profile, test results, quiz history,
  // unlocked themes). Runs server-side (Edge Function) because it needs the
  // service_role key, which must never ship in the mobile app. The function
  // scopes the deletion to the caller's own verified session — no user id is
  // ever sent from the client.
  async deleteAccount(): Promise<void> {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) throw error;
  },
};
