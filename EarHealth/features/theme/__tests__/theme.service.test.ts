import { mockRpc, mockSupabase, resetSupabaseMock } from '../../../test-utils/supabaseMock';

jest.mock('@/src/utils/supabase', () => ({ supabase: mockSupabase }));

import { themeService } from '../services/theme.service';

describe('themeService.purchaseTier', () => {
  beforeEach(() => resetSupabaseMock());

  test('calls the purchase_theme RPC with the tier and cost', async () => {
    mockRpc.mockResolvedValue({ data: [{ total_points: 300 }], error: null });

    await themeService.purchaseTier('bronze', 200);

    expect(mockRpc).toHaveBeenCalledWith('purchase_theme', { target_theme: 'bronze', target_cost: 200 });
  });

  test('resolves without throwing on success', async () => {
    mockRpc.mockResolvedValue({ data: [{ total_points: 300 }], error: null });
    await expect(themeService.purchaseTier('bronze', 200)).resolves.toBeUndefined();
  });

  test('throws with the "insufficient_points" message when the DB function rejects the purchase', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'insufficient_points' } });
    await expect(themeService.purchaseTier('or', 600)).rejects.toThrow('insufficient_points');
  });

  test('throws on any other RPC error (e.g. network failure)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'network error' } });
    await expect(themeService.purchaseTier('bronze', 200)).rejects.toThrow('network error');
  });
});
