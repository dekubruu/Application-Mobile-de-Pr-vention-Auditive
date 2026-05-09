import { supabase } from '@/src/utils/supabase';
import type { Profile } from '../types/auth.types';

export const profileService = {
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'username' | 'date_of_birth' | 'gender'>>,
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },
};
