import { supabase } from '@/src/utils/supabase';
import type { ThemeTier } from '../theme.constants';

export const themeService = {
  // Atomic on the DB side (purchase_theme() runs the points deduction and the
  // theme_unlocks insert in one transaction) — see
  // supabase/migrations/20260806_theme_unlocks.sql. Throws with message
  // 'insufficient_points' if the balance dropped below cost between the
  // client's read and this call (stale read / concurrent purchase).
  async purchaseTier(theme: ThemeTier, cost: number): Promise<void> {
    const { error } = await supabase.rpc('purchase_theme', {
      target_theme: theme,
      target_cost:  cost,
    });
    if (error) throw new Error(error.message);
  },
};
