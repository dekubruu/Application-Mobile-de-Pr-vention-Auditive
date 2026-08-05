import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { profileService } from '@/features/auth/services/profile.service';
import { TIER_COST, TIER_ORDER, TIER_PALETTES, type ThemeTier, type TierPalette } from './theme.constants';

type PurchaseResult =
  | { ok: true }
  | { ok: false; reason: 'not-authenticated' | 'out-of-order' | 'insufficient-points' | 'race-lost' };

interface ThemeContextValue {
  tier:         ThemeTier;
  colors:       TierPalette;
  ownedTiers:   ThemeTier[];
  // Next tier purchasable given what's already owned, or null once everything is owned.
  nextTier:     ThemeTier | null;
  purchaseTier: (tier: ThemeTier) => Promise<PurchaseResult>;
  selectTier:   (tier: ThemeTier) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function parseTier(value: string | undefined | null): ThemeTier | null {
  return value != null && (TIER_ORDER as string[]).includes(value) ? (value as ThemeTier) : null;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, refreshProfile } = useAuth();

  const ownedTiers = useMemo<ThemeTier[]>(() => {
    const fromProfile = (profile?.owned_tiers ?? [])
      .map(parseTier)
      .filter((t): t is ThemeTier => t !== null);
    return ['default', ...fromProfile];
  }, [profile?.owned_tiers]);

  const tier = parseTier(profile?.active_theme) ?? 'default';
  const colors = TIER_PALETTES[tier];

  const nextTier = useMemo<ThemeTier | null>(() => {
    const highestIndex = Math.max(...ownedTiers.map(t => TIER_ORDER.indexOf(t)));
    return TIER_ORDER[highestIndex + 1] ?? null;
  }, [ownedTiers]);

  const purchaseTier = useCallback(async (target: ThemeTier): Promise<PurchaseResult> => {
    if (!session || !profile) return { ok: false, reason: 'not-authenticated' };
    if (target !== nextTier) return { ok: false, reason: 'out-of-order' };
    const cost = TIER_COST[target];
    if (profile.total_points < cost) return { ok: false, reason: 'insufficient-points' };

    const result = await profileService.purchaseTier(session.user.id, {
      cost,
      currentPoints:  profile.total_points,
      nextOwnedTiers: [...(profile.owned_tiers ?? []), target],
    });
    if (!result) return { ok: false, reason: 'race-lost' };
    await refreshProfile();
    return { ok: true };
  }, [session, profile, nextTier, refreshProfile]);

  const selectTier = useCallback(async (target: ThemeTier) => {
    if (!session) return;
    if (target !== 'default' && !ownedTiers.includes(target)) return;
    await profileService.setActiveTheme(session.user.id, target);
    await refreshProfile();
  }, [session, ownedTiers, refreshProfile]);

  const value = useMemo<ThemeContextValue>(
    () => ({ tier, colors, ownedTiers, nextTier, purchaseTier, selectTier }),
    [tier, colors, ownedTiers, nextTier, purchaseTier, selectTier],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeColors = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeColors must be used within ThemeProvider');
  return ctx;
};
