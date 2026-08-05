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

  // Spends points to unlock a color tier. Guarded with `.gte('total_points', cost)`
  // so the update is a no-op (0 rows matched → PostgREST error on .single()) if the
  // balance dropped below the cost between read and write, preventing a negative
  // balance from a stale client-side read.
  async purchaseTier(
    userId: string,
    params: { cost: number; currentPoints: number; nextOwnedTiers: string[] },
  ): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        total_points: params.currentPoints - params.cost,
        owned_tiers: params.nextOwnedTiers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .gte('total_points', params.cost)
      .select()
      .single();
    if (error) return null;
    return data as Profile;
  },

  async setActiveTheme(userId: string, activeTheme: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ active_theme: activeTheme, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },
};
