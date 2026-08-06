import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LargeSecureStore } from '../secureStorage';

describe('LargeSecureStore', () => {
  let store: LargeSecureStore;

  beforeEach(async () => {
    store = new LargeSecureStore();
    await AsyncStorage.clear();
  });

  test('round-trips a value through setItem/getItem', async () => {
    await store.setItem('session', 'plain-text-session-blob');
    await expect(store.getItem('session')).resolves.toBe('plain-text-session-blob');
  });

  test('handles a large payload (bigger than SecureStore\'s ~2048-byte limit)', async () => {
    const large = JSON.stringify({ access_token: 'x'.repeat(3000), user: { id: 'u1' } });
    await store.setItem('session', large);
    await expect(store.getItem('session')).resolves.toBe(large);
  });

  test('never stores the plaintext value in AsyncStorage', async () => {
    await store.setItem('session', 'super-secret-jwt');
    const raw = await AsyncStorage.getItem('session');
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('super-secret-jwt');
  });

  test('stores the AES key in SecureStore, not in AsyncStorage', async () => {
    await store.setItem('session', 'value');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('session', expect.any(String));
  });

  test('returns null for a key that was never set', async () => {
    await expect(store.getItem('missing')).resolves.toBeNull();
  });

  test('returns null when the ciphertext exists but the SecureStore key was cleared', async () => {
    await store.setItem('session', 'value');
    await SecureStore.deleteItemAsync('session');
    await expect(store.getItem('session')).resolves.toBeNull();
  });

  test('removeItem clears both the ciphertext and the encryption key', async () => {
    await store.setItem('session', 'value');
    await store.removeItem('session');

    await expect(store.getItem('session')).resolves.toBeNull();
    expect(await AsyncStorage.getItem('session')).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('session');
  });

  test('overwriting a key with a new value replaces the old one entirely', async () => {
    await store.setItem('session', 'first-value');
    await store.setItem('session', 'second-value');

    await expect(store.getItem('session')).resolves.toBe('second-value');
  });

  test('two different keys are encrypted independently', async () => {
    await store.setItem('a', 'value-a');
    await store.setItem('b', 'value-b');

    await expect(store.getItem('a')).resolves.toBe('value-a');
    await expect(store.getItem('b')).resolves.toBe('value-b');
  });
});
