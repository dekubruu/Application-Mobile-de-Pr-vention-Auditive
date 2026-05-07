/**
 * AudioEngine.ts
 * Web Audio API wrapper for generating pure sine wave tones.
 * Compatible with Web (direct) and iOS/Android (via WebView bridge).
 *
 * Usage on Web:
 * ```typescript
 * const engine = new AudioEngine();
 * await engine.init();
 * engine.playTone(1000, 0.3); // 1000 Hz, 30% volume
 * engine.stopTone();
 * ```
 */
export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  /** Must be called after a user interaction (iOS/Safari requirement). */
  async init(): Promise<void> {
    if (!this.audioContext) {
      // @ts-ignore — WebKit prefix for Safari
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  playTone(frequency: number, volume: number, duration: number = 10): void {
    if (!this.audioContext) {
      console.error('AudioContext not initialized. Call init() first.');
      return;
    }
    if (frequency <= 0 || frequency > 24000) {
      console.error('Frequency must be between 0 and 24000 Hz');
      return;
    }
    if (volume < 0 || volume > 1) {
      console.error('Volume must be between 0 and 1');
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
    this.oscillator.stop(this.audioContext.currentTime + duration);
  }

  stopTone(): void {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch (e) {
        // already stopped
      }
      this.oscillator = null;
    }
  }

  setVolume(volume: number): void {
    if (this.gainNode && this.audioContext) {
      if (volume < 0 || volume > 1) {
        console.error('Volume must be between 0 and 1');
        return;
      }
      this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }
  }

  setFrequency(frequency: number): void {
    if (this.oscillator && this.audioContext) {
      if (frequency <= 0 || frequency > 24000) {
        console.error('Frequency must be between 0 and 24000 Hz');
        return;
      }
      this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    }
  }

  isPlaying(): boolean {
    return this.oscillator !== null;
  }

  dispose(): void {
    this.stopTone();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export default AudioEngine;
