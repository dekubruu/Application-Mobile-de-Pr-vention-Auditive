import { makeQueryResult, mockFrom, mockSupabase, resetSupabaseMock } from '../../../test-utils/supabaseMock';

jest.mock('@/src/utils/supabase', () => ({ supabase: mockSupabase }));

import { profileService } from '../services/profile.service';
import type { Profile } from '../types/auth.types';

const baseProfile: Profile = {
  id: 'u1',
  username: 'Alice',
  date_of_birth: '2000-01-01',
  gender: 'female',
  total_points: 500,
  owned_tiers: ['bronze'],
  active_theme: 'bronze',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('profileService.getProfile', () => {
  beforeEach(() => resetSupabaseMock());

  test('returns the profile row on success', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: baseProfile, error: null }));
    await expect(profileService.getProfile('u1')).resolves.toEqual(baseProfile);
  });

  test('throws the Supabase error (e.g. row not found)', async () => {
    const error = { message: 'no rows' };
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error }));
    await expect(profileService.getProfile('missing')).rejects.toEqual(error);
  });
});

describe('profileService.updateProfile', () => {
  beforeEach(() => resetSupabaseMock());

  test('sends only the provided fields plus updated_at', async () => {
    const builder = makeQueryResult({ data: { ...baseProfile, username: 'Bob' }, error: null });
    mockFrom.mockReturnValue(builder);

    await profileService.updateProfile('u1', { username: 'Bob' });

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'Bob', updated_at: expect.any(String) }),
    );
  });

  test('throws on a Supabase error', async () => {
    const error = { message: 'constraint violation' };
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error }));
    await expect(profileService.updateProfile('u1', { username: 'x' })).rejects.toEqual(error);
  });
});

describe('profileService.purchaseTier', () => {
  beforeEach(() => resetSupabaseMock());

  test('deducts the cost from currentPoints and appends the new tier', async () => {
    const builder = makeQueryResult({ data: { ...baseProfile, total_points: 300 }, error: null });
    mockFrom.mockReturnValue(builder);

    const result = await profileService.purchaseTier('u1', { cost: 200, currentPoints: 500, nextOwnedTiers: ['bronze', 'argent'] });

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ total_points: 300, owned_tiers: ['bronze', 'argent'] }),
    );
    expect(builder.gte).toHaveBeenCalledWith('total_points', 200);
    expect(result).toEqual({ ...baseProfile, total_points: 300 });
  });

  test('returns null (not a throw) when the guarded update matches no row (race lost / insufficient balance)', async () => {
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error: { message: 'no rows returned' } }));
    const result = await profileService.purchaseTier('u1', { cost: 999_999, currentPoints: 500, nextOwnedTiers: ['bronze'] });
    expect(result).toBeNull();
  });
});

describe('profileService.setActiveTheme', () => {
  beforeEach(() => resetSupabaseMock());

  test('updates active_theme and returns the profile', async () => {
    const updated = { ...baseProfile, active_theme: 'or' };
    mockFrom.mockReturnValue(makeQueryResult({ data: updated, error: null }));
    await expect(profileService.setActiveTheme('u1', 'or')).resolves.toEqual(updated);
  });

  test('throws on a Supabase error', async () => {
    const error = { message: 'boom' };
    mockFrom.mockReturnValue(makeQueryResult({ data: null, error }));
    await expect(profileService.setActiveTheme('u1', 'or')).rejects.toEqual(error);
  });
});
