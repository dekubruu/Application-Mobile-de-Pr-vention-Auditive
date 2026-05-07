export const FREQUENCY_START = 1000;
export const FREQUENCY_MAX = 24000;
export const FREQUENCY_PRECISION_THRESHOLD = 200;
export const ASCENDING_PHASE_DOUBLE_UNTIL = 8000;
export const ASCENDING_PHASE_STEP = 2000;
export const DEFAULT_VOLUME = 0.2;
export const DEFAULT_UPPER_BOUND = 24000;

export const THRESHOLD_EXCELLENT = 8000;
export const THRESHOLD_GOOD = 12000;
export const THRESHOLD_ACCEPTABLE = 16000;

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

      // Generates a PCM sine wave as a WAV data URI.
      // Uses <audio> element instead of AudioContext — avoids the iOS WKWebView
      // restriction where AudioContext.resume() requires a real user gesture but
      // injectJavaScript() does not qualify as one.
      // mediaPlaybackRequiresUserAction={false} on the WebView component is what
      // allows audio.play() to succeed from injectJavaScript on iOS.
      function generateSineWaveURI(frequency, durationSec) {
        var sampleRate = 44100;
        var numSamples = Math.floor(sampleRate * durationSec);
        var buf = new ArrayBuffer(44 + numSamples * 2);
        var v = new DataView(buf);
        function w(off, str) { for (var i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i)); }
        w(0, 'RIFF'); v.setUint32(4, 36 + numSamples * 2, true);
        w(8, 'WAVE'); w(12, 'fmt ');
        v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
        v.setUint16(32, 2, true); v.setUint16(34, 16, true);
        w(36, 'data'); v.setUint32(40, numSamples * 2, true);
        for (var i = 0; i < numSamples; i++) {
          v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * frequency * i / sampleRate) * 32767), true);
        }
        var bytes = new Uint8Array(buf);
        var binary = '';
        for (var i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
        }
        return 'data:audio/wav;base64,' + btoa(binary);
      }

      var audioEl = document.createElement('audio');
      audioEl.setAttribute('playsinline', '');
      audioEl.loop = true;
      audioEl.onerror = function() { sendToRN({ type: 'play_failed', reason: 'audio_error' }); };

      window.playTone = function(frequency, volume) {
        audioEl.src = generateSineWaveURI(frequency, 3);
        audioEl.volume = Math.min(1, Math.max(0, volume));
        audioEl.load();
        audioEl.play().catch(function(err) {
          sendToRN({ type: 'play_failed', reason: err && err.message ? err.message : 'rejected' });
        });
      };

      window.stopTone = function() {
        audioEl.pause();
        audioEl.currentTime = 0;
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

export function getTestSummary(threshold: number): { status: string; interpretation: string } {
  if (threshold <= THRESHOLD_EXCELLENT) {
    return {
      status: '✓ Excellent',
      interpretation:
        'Votre audition est excellente. Vous pouvez détecter des fréquences élevées typiques de jeunes oreilles.',
    };
  }
  if (threshold <= THRESHOLD_GOOD) {
    return {
      status: '✓ Bon',
      interpretation: 'Votre audition est bonne. Seuil auditif normal pour un adulte.',
    };
  }
  if (threshold <= THRESHOLD_ACCEPTABLE) {
    return {
      status: '⚠️ Acceptable',
      interpretation:
        'Perte auditive légère détectée. Vous avez une difficulté à entendre les hautes fréquences.',
    };
  }
  return {
    status: '⚠️ Perte détectée',
    interpretation:
      'Perte auditive importante détectée. Consultez un audiologiste pour un diagnostic complet.',
  };
}
