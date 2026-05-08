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
};
