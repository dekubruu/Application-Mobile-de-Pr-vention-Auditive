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
      class AudioEngine {
        constructor() {
          this.audioContext = null;
          this.oscillator = null;
          this.gainNode = null;
        }

        async init() {
          if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          }
          if (this.audioContext.state === 'suspended') {
            try {
              await this.audioContext.resume();
            } catch (error) {
              console.warn('AudioContext resume failed', error);
            }
          }
        }

        playTone(frequency, volume) {
          if (!this.audioContext) {
            console.error('AudioContext not initialized');
            return;
          }
          this.stopTone();
          this.oscillator = this.audioContext.createOscillator();
          this.gainNode = this.audioContext.createGain();
          this.oscillator.type = 'sine';
          this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
          this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
          this.oscillator.connect(this.gainNode);
          this.gainNode.connect(this.audioContext.destination);
          this.oscillator.start();
          this.oscillator.stop(this.audioContext.currentTime + 10);
        }

        stopTone() {
          if (this.oscillator) {
            try { this.oscillator.stop(); } catch (e) {}
            this.oscillator = null;
          }
        }

        setVolume(volume) {
          if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
          }
        }
      }

      const audioEngine = new AudioEngine();

      function postAudioReady() {
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'audio_ready' }));
        }
      }

      window.initAudio = async () => {
        try { await audioEngine.init(); } catch (error) { console.warn('Audio init failed', error); }
        postAudioReady();
      };

      window.playTone = (frequency, volume) => { audioEngine.playTone(frequency, volume); };
      window.stopTone = () => { audioEngine.stopTone(); };
      window.setVolume = (volume) => { audioEngine.setVolume(volume); };

      window.onerror = (message, source, lineno, colno, error) => { postAudioReady(); };

      window.onload = () => {
        window.initAudio().catch((error) => {
          console.warn('Audio init failed on load', error);
          postAudioReady();
        });
      };
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
