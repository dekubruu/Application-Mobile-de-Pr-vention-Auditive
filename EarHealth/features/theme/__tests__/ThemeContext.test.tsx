import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { fakeSession, mockAuthModule, mockUseAuth } from '../../../test-utils/mockAuth';

jest.mock('@/features/auth/hooks/useAuth', () => mockAuthModule);
jest.mock('@/features/auth/services/profile.service', () => ({
  profileService: { purchaseTier: jest.fn(), setActiveTheme: jest.fn() },
}));

import { profileService } from '@/features/auth/services/profile.service';
import { ThemeProvider, useThemeColors } from '../ThemeContext';
import { TIER_PALETTES } from '../theme.constants';
import type { Profile } from '@/features/auth/types/auth.types';

const mockPurchaseTier = profileService.purchaseTier as jest.Mock;
const mockSetActiveTheme = profileService.setActiveTheme as jest.Mock;

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'u1', username: 'Alice', date_of_birth: null, gender: null,
    total_points: 500, owned_tiers: [], active_theme: 'default',
    created_at: 'now', updated_at: 'now',
    ...overrides,
  };
}

function renderThemeHook(session: any, profile: Profile | null, refreshProfile = jest.fn()) {
  mockUseAuth.mockReturnValue({ session, profile, loading: false, refreshProfile, signOut: jest.fn() });
  return renderHook(() => useThemeColors(), { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });
}

describe('ThemeProvider / useThemeColors — defaults', () => {
  beforeEach(() => {
    mockPurchaseTier.mockReset();
    mockSetActiveTheme.mockReset();
  });

  test('defaults to the "default" tier and its palette with no profile', () => {
    const { result } = renderThemeHook(null, null);
    expect(result.current.tier).toBe('default');
    expect(result.current.colors).toEqual(TIER_PALETTES.default);
    expect(result.current.ownedTiers).toEqual(['default']);
    expect(result.current.nextTier).toBe('bronze');
  });

  test('reads the active tier from the profile', () => {
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ active_theme: 'or', owned_tiers: ['bronze', 'argent', 'or'] }));
    expect(result.current.tier).toBe('or');
    expect(result.current.colors).toEqual(TIER_PALETTES.or);
  });

  test('falls back to "default" for an unrecognized/corrupted active_theme value', () => {
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ active_theme: 'platinum' }));
    expect(result.current.tier).toBe('default');
  });

  test('ownedTiers always includes "default" plus the profile’s owned_tiers, ignoring unknown values', () => {
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ owned_tiers: ['bronze', 'not-a-real-tier'] }));
    expect(result.current.ownedTiers).toEqual(['default', 'bronze']);
  });

  test('nextTier is null once every tier is owned', () => {
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ owned_tiers: ['bronze', 'argent', 'or'] }));
    expect(result.current.nextTier).toBeNull();
  });
});

describe('purchaseTier', () => {
  beforeEach(() => {
    mockPurchaseTier.mockReset();
    mockSetActiveTheme.mockReset();
  });

  test('fails with "not-authenticated" when there is no session', async () => {
    const { result } = renderThemeHook(null, null);
    await expect(result.current.purchaseTier('bronze')).resolves.toEqual({ ok: false, reason: 'not-authenticated' });
    expect(mockPurchaseTier).not.toHaveBeenCalled();
  });

  test('fails with "out-of-order" when the target is not the next purchasable tier', async () => {
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ owned_tiers: [] }));
    // nextTier is 'bronze'; attempting to buy 'or' directly should be rejected.
    await expect(result.current.purchaseTier('or')).resolves.toEqual({ ok: false, reason: 'out-of-order' });
    expect(mockPurchaseTier).not.toHaveBeenCalled();
  });

  test('fails with "insufficient-points" when the balance is below the tier cost', async () => {
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ total_points: 10, owned_tiers: [] }));
    await expect(result.current.purchaseTier('bronze')).resolves.toEqual({ ok: false, reason: 'insufficient-points' });
    expect(mockPurchaseTier).not.toHaveBeenCalled();
  });

  test('fails with "race-lost" when the service returns null (guarded update matched no row)', async () => {
    mockPurchaseTier.mockResolvedValue(null);
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ total_points: 500, owned_tiers: [] }));
    await expect(result.current.purchaseTier('bronze')).resolves.toEqual({ ok: false, reason: 'race-lost' });
  });

  test('succeeds, calls the service with the right payload, and refreshes the profile', async () => {
    mockPurchaseTier.mockResolvedValue(makeProfile({ owned_tiers: ['bronze'], total_points: 300 }));
    const refreshProfile = jest.fn();
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ total_points: 500, owned_tiers: [] }), refreshProfile);

    const outcome = await result.current.purchaseTier('bronze');

    expect(outcome).toEqual({ ok: true });
    expect(mockPurchaseTier).toHaveBeenCalledWith('u1', { cost: 200, currentPoints: 500, nextOwnedTiers: ['bronze'] });
    expect(refreshProfile).toHaveBeenCalled();
  });
});

describe('selectTier', () => {
  beforeEach(() => {
    mockPurchaseTier.mockReset();
    mockSetActiveTheme.mockReset();
    mockSetActiveTheme.mockResolvedValue(makeProfile());
  });

  test('does nothing without a session', async () => {
    const { result } = renderThemeHook(null, null);
    await result.current.selectTier('bronze');
    expect(mockSetActiveTheme).not.toHaveBeenCalled();
  });

  test('refuses to select a tier the user does not own', async () => {
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ owned_tiers: [] }));
    await result.current.selectTier('or');
    expect(mockSetActiveTheme).not.toHaveBeenCalled();
  });

  test('"default" can always be selected, even with no purchases', async () => {
    const refreshProfile = jest.fn();
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ owned_tiers: [] }), refreshProfile);
    await result.current.selectTier('default');
    expect(mockSetActiveTheme).toHaveBeenCalledWith('u1', 'default');
    expect(refreshProfile).toHaveBeenCalled();
  });

  test('selects an owned tier and refreshes the profile', async () => {
    const refreshProfile = jest.fn();
    const { result } = renderThemeHook(fakeSession('u1'), makeProfile({ owned_tiers: ['bronze'] }), refreshProfile);
    await result.current.selectTier('bronze');
    expect(mockSetActiveTheme).toHaveBeenCalledWith('u1', 'bronze');
    expect(refreshProfile).toHaveBeenCalled();
  });
});

describe('useThemeColors outside a ThemeProvider', () => {
  test('throws a clear error', () => {
    const { result } = renderHook(() => {
      try {
        return useThemeColors();
      } catch (e) {
        return e;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });
});
