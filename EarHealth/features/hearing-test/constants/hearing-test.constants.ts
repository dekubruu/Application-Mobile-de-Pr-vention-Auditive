import type { HearingCategory } from '../types/hearing-test.types';

// ── Test frequencies (Hz) — standard audiometric order ───────────────────────
export const TEST_FREQUENCIES = [1000, 2000, 4000, 500, 250, 8000];

// ── Hughson-Westlake algorithm ────────────────────────────────────────────────
// "Down 10, Up 5" rule. Threshold = mean of last 2–3 reversal points.
export const HW_START_DB          = 40;
export const HW_DOWN_STEP         = 10;
export const HW_UP_STEP           = 5;
export const HW_MIN_DB            = 0;
export const HW_MAX_DB            = 80;
export const HW_REVERSAL_COUNT    = 3;
export const HW_MAX_PRESENTATIONS = 24;
export const HW_DB_REFERENCE      = 60; // vol = 10^((db - 60) / 20), clamped [0.002, 1.0]

// ── Anti-cheat / timing ───────────────────────────────────────────────────────
export const SILENT_TRIAL_PROBABILITY  = 0.10; // 10 % of trials have no tone
export const MIN_RESPONSE_INTERVAL_MS  = 300;  // debounce rapid taps
export const TONE_START_GUARD_MS       = 200;  // ignore responses < 200ms after tone starts
export const FALSE_POSITIVE_WARN_RATIO = 0.40; // warn if > 40 % of silent trials triggered
export const ISI_MIN_MS                = 500;  // inter-stimulus interval minimum
export const ISI_MAX_MS                = 1200; // inter-stimulus interval maximum

// ── Channel validation ────────────────────────────────────────────────────────
export const CV_FREQUENCY    = 1000;
export const CV_VOLUME       = 0.3;
export const CV_MAX_ATTEMPTS = 2;

// ── Ambient noise thresholds ──────────────────────────────────────────────────
export const AMBIENT_OK_DB   = 40; // below this: perfect
export const AMBIENT_WARN_DB = 55; // 40–55: warning, > 55: loud

// ── Result interpretation (relative dB scale, device-dependent) ───────────────
export const DB_NORMAL_MAX   = 20;
export const DB_MILD_MAX     = 40;
export const DB_MODERATE_MAX = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function dbToVolume(db: number): number {
  return Math.min(1.0, Math.max(0.002, Math.pow(10, (db - HW_DB_REFERENCE) / 20)));
}

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
        if (_gain && _ctx) {
          _gain.gain.setValueAtTime(Math.min(1, Math.max(0, volume)), _ctx.currentTime);
        }
      };

      window.onload = function() {
        sendToRN({ type: 'audio_ready' });
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          navigator.mediaDevices.enumerateDevices().then(function(devices) {
            var labels = [];
            for (var i = 0; i < devices.length; i++) {
              var d = devices[i];
              if ((d.kind === 'audiooutput' || d.kind === 'audioinput') && d.label && d.label.length > 0) {
                labels.push(d.label.toLowerCase());
              }
            }
            if (labels.length > 0) {
              sendToRN({ type: 'headset_detected', labels: labels });
            }
          }).catch(function() {});
        }
      };
      window.onerror = function() { sendToRN({ type: 'audio_ready' }); };
    <\/script>
  </body>
</html>
`;
