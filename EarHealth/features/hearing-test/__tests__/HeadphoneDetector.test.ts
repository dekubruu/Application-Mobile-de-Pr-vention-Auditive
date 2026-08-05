import { detectFromLabels } from '../services/HeadphoneDetector';

describe('detectFromLabels', () => {
  test('returns disconnected/unknown for an empty label list', () => {
    expect(detectFromLabels([])).toEqual({
      connected: false,
      type: 'unknown',
      label: null,
      headsetId: null,
    });
  });

  test('recognizes AirPods Pro specifically over the generic "airpods" pattern', () => {
    const result = detectFromLabels(['AirPods Pro (2nd generation)']);
    // NOTE: `label` comes back null here — a real quirk in detectFromLabels:
    // it matches the mixed-case input against the pre-lowercased `pattern`
    // via a second, case-sensitive `.includes()` call, so `label` only
    // survives for inputs that happen to already be all-lowercase. See the
    // final report's "design issues found" section.
    expect(result).toEqual({
      connected: true,
      type: 'airpods',
      label: null,
      headsetId: 'airpods_pro2',
    });
  });

  test('recognizes plain AirPods', () => {
    const result = detectFromLabels(['AirPods']);
    expect(result.type).toBe('airpods');
    expect(result.headsetId).toBe('airpods3');
  });

  test('is case-insensitive', () => {
    const result = detectFromLabels(['SONY WH-1000XM5']);
    expect(result.connected).toBe(true);
    expect(result.headsetId).toBe('sony_wh1000xm5');
  });

  test('matches on a substring within a longer device label', () => {
    const result = detectFromLabels(['Bluetooth Headset (Bose QC45)']);
    expect(result.headsetId).toBe('bose_qc45');
  });

  test('falls back to type "wired" with no headsetId for a generic wired pattern', () => {
    const result = detectFromLabels(['Wired Headphone']);
    // Same case-sensitivity quirk as above — label is null for mixed-case input.
    expect(result).toEqual({
      connected: true,
      type: 'wired',
      label: null,
      headsetId: null,
    });
  });

  test('preserves the label when the input is already all-lowercase (matches the case-sensitive re-scan)', () => {
    const result = detectFromLabels(['wired headphone']);
    expect(result.label).toBe('wired headphone');
  });

  test('falls back to generic bluetooth for labels present but matching no known pattern', () => {
    const result = detectFromLabels(['Unknown Device XYZ']);
    expect(result).toEqual({
      connected: true,
      type: 'bluetooth',
      label: 'Unknown Device XYZ',
      headsetId: null,
    });
  });

  test('checks patterns in declaration order — first match wins', () => {
    // "headset" appears after "headphone"/"earphone" in LABEL_MAP; a label
    // containing only "headset" should match the headset (bluetooth) entry.
    const result = detectFromLabels(['Generic Headset']);
    expect(result.type).toBe('bluetooth');
  });

  test('joins multiple labels and matches against the combined text', () => {
    const result = detectFromLabels(['Microphone', 'AirPods Max']);
    expect(result.headsetId).toBe('airpods_max');
  });
});
