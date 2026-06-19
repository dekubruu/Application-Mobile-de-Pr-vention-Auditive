import type { HearingCategory } from '../types/hearing-test.types';

// ── dB → volume conversion ───────────────────────────────────────────────────
// Reference level used to map a presentation dB value to a Web Audio gain in
// [DB_FLOOR_GAIN, 1.0]. The floor was historically 0.002 (~-54 dBFS) which is
// still audible on a sensitive ear with a moderately loud system volume —
// users with good hearing could detect tones the staircase considered "0 dB"
// and the algorithm would never converge. The new floor (~-86 dBFS) is below
// the perceptual threshold of typical consumer headsets at moderate volume.
const DB_REFERENCE  = 60;       // vol = 10^((db - 60) / 20)
const DB_FLOOR_GAIN = 0.00005;  // ~-86 dBFS, practically inaudible

export function dbToVolume(db: number): number {
  return Math.min(1.0, Math.max(DB_FLOOR_GAIN, Math.pow(10, (db - DB_REFERENCE) / 20)));
}

// ── Display offset ──────────────────────────────────────────────────────────
// Internal PTT scale runs from -20 to 80 dB. End users find negative dB
// values counter-intuitive on a non-clinical app, so we shift the rendered
// value by +20 to get a 0..100 scale at the UI boundary ONLY.
//
// MUST NOT be applied to:
//   • the algorithm (PTTAlgorithm, dbToVolume calls)
//   • the persisted JSONB payload
//   • calculateHearingScore / getHearingCategory / dbColor (all calibrated
//     on the internal scale)
//   • delta computations (e.g. left.avgDb - right.avgDb — offset cancels out)
//   • AudiogramChart.dbToY coordinate math (consumes internal Y_LINES)
//
// MUST be applied to:
//   • Every <Text>{value}</Text> that renders a PTT dB number to the user.
//
// The displayed unit stays "dB" (never "dB HL" — the scale is uncalibrated).
export const DB_DISPLAY_OFFSET = 20;

export function toDisplayDb(internalDb: number): number {
  return Math.round(internalDb + DB_DISPLAY_OFFSET);
}

// ── Hearing category thresholds (relative dB scale, device-dependent) ────────
export const DB_NORMAL_MAX   = 20;
export const DB_MILD_MAX     = 40;
export const DB_MODERATE_MAX = 60;

export function getHearingCategory(avgDb: number): HearingCategory {
  if (avgDb <= DB_NORMAL_MAX)   return 'normal';
  if (avgDb <= DB_MILD_MAX)     return 'mild';
  if (avgDb <= DB_MODERATE_MAX) return 'moderate';
  return 'severe';
}

export function getCategoryLabel(cat: HearingCategory): string {
  switch (cat) {
    case 'normal':   return 'Normale';
    case 'mild':     return 'Légère';
    case 'moderate': return 'Modérée';
    case 'severe':   return 'Significative';
  }
}

export function getCategoryColor(cat: HearingCategory): string {
  switch (cat) {
    case 'normal':   return '#15803D';
    case 'mild':     return '#0B7285';
    case 'moderate': return '#B45309';
    case 'severe':   return '#B91C1C';
  }
}

export function getCategoryBg(cat: HearingCategory): string {
  switch (cat) {
    case 'normal':   return '#DCFCE7';
    case 'mild':     return '#E0F2F7';
    case 'moderate': return '#FEF3C7';
    case 'severe':   return '#FEE2E2';
  }
}

export function getTestSummary(cat: HearingCategory): { status: string; interpretation: string } {
  switch (cat) {
    case 'normal':
      return {
        status: 'Normale',
        interpretation: 'Audition dans la norme sur cet appareil. Réponses obtenues à faible volume.',
      };
    case 'mild':
      return {
        status: 'Légère',
        interpretation: 'Légère difficulté détectée. Les sons doux peuvent être manqués.',
      };
    case 'moderate':
      return {
        status: 'Modérée',
        interpretation: 'Difficulté modérée. Consultez un audiologiste pour un bilan complet.',
      };
    case 'severe':
      return {
        status: 'Significative',
        interpretation: 'Difficulté significative. Une consultation audiologique est recommandée.',
      };
  }
}

export function formatFrequency(hz: number): string {
  return hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`;
}

// ── WebView audio bridge (iOS / Android) ─────────────────────────────────────
// Uses Web Audio API oscillator — zero allocation per presentation, no WAV blobs.
// Fade-in/out on every tone eliminates click artifacts.
// channel: 'left' → L only, 'right' → R only, 'both' → center.
export const WEBVIEW_AUDIO_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
    <script>
      function sendToRN(data) {
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      }

      var _ctx    = null;
      var _osc    = null;
      var _gain   = null;
      var _panner = null;

      function getCtx() {
        if (!_ctx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          _ctx = new AC();
        }
        if (_ctx.state === 'suspended') { _ctx.resume(); }
        return _ctx;
      }

      function stopCurrent() {
        if (_gain && _ctx) {
          try {
            _gain.gain.setValueAtTime(_gain.gain.value, _ctx.currentTime);
            _gain.gain.linearRampToValueAtTime(0, _ctx.currentTime + 0.025);
          } catch(e) {}
        }
        var osc = _osc;
        _osc = null;
        if (osc) {
          setTimeout(function() {
            try { osc.disconnect(); } catch(e) {}
            try { osc.stop(); } catch(e) {}
          }, 40);
        }
        if (_panner) { try { _panner.disconnect(); } catch(e) {} _panner = null; }
        if (_gain)   { try { _gain.disconnect();   } catch(e) {} _gain   = null; }
      }

      window.playTone = function(frequency, volume, channel) {
        try {
          var ctx = getCtx();
          if (!ctx) { sendToRN({ type: 'play_failed', reason: 'no_audio_context' }); return; }

          stopCurrent();

          var osc  = ctx.createOscillator();
          var gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.value = frequency;

          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(Math.min(1, Math.max(0, volume)), ctx.currentTime + 0.025);

          if (ctx.createStereoPanner) {
            var panner = ctx.createStereoPanner();
            panner.pan.value = channel === 'left' ? -1 : channel === 'right' ? 1 : 0;
            osc.connect(panner);
            panner.connect(gain);
            _panner = panner;
          } else {
            var merger     = ctx.createChannelMerger(2);
            var leftGain   = ctx.createGain();
            var rightGain  = ctx.createGain();
            leftGain.gain.value  = channel === 'right' ? 0 : 1;
            rightGain.gain.value = channel === 'left'  ? 0 : 1;
            osc.connect(leftGain);
            osc.connect(rightGain);
            leftGain.connect(merger,  0, 0);
            rightGain.connect(merger, 0, 1);
            merger.connect(gain);
          }

          gain.connect(ctx.destination);
          osc.start();

          _osc  = osc;
          _gain = gain;
        } catch(e) {
          sendToRN({ type: 'play_failed', reason: e && e.message ? e.message : 'error' });
        }
      };

      window.stopTone = function() {
        stopCurrent();
      };

      window.setVolume = function(volume) {
        audioEl.volume = Math.min(1, Math.max(0, volume));
      };

      window.onload = function() { sendToRN({ type: 'audio_ready' }); };
      window.onerror = function() { sendToRN({ type: 'audio_ready' }); };
    <\/script>
  </body>
</html>
`;
