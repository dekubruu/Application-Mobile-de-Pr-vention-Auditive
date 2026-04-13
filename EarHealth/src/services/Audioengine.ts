/**
 * AudioEngine.ts
 * Moteur audio basé sur Web Audio API pour générer des tons sinusoïdaux
 * 
 * Compatible: Web, iOS (via WebView), Android (via WebView)
 * 
 * Utilisation dans React Web:
 * ```typescript
 * import AudioEngine from './AudioEngine';
 * 
 * const engine = new AudioEngine();
 * await engine.init();
 * engine.playTone(1000, 0.3); // 1000 Hz, volume 30%
 * engine.stopTone();
 * ```
 */

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  /**
   * Initialise l'AudioContext
   * IMPORTANT: Sur iOS/Safari, doit être appelé après une interaction utilisateur (tap/click)
   */
  async init(): Promise<void> {
    if (!this.audioContext) {
      // @ts-ignore - WebKit prefix pour Safari
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Sur iOS, l'AudioContext peut être en état 'suspended'
    // Il faut le réactiver après une interaction utilisateur
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Joue un ton sinusoïdal
   * @param frequency - Fréquence en Hz (ex: 1000 pour 1 kHz)
   * @param volume - Volume entre 0 et 1 (ex: 0.3 pour 30%)
   * @param duration - Durée en secondes (optionnel, par défaut 10s)
   */
  playTone(frequency: number, volume: number, duration: number = 10): void {
    if (!this.audioContext) {
      console.error('AudioContext not initialized. Call init() first.');
      return;
    }

    // Validation des paramètres
    if (frequency <= 0 || frequency > 24000) {
      console.error('Frequency must be between 0 and 24000 Hz');
      return;
    }

    if (volume < 0 || volume > 1) {
      console.error('Volume must be between 0 and 1');
      return;
    }

    // Stopper le son précédent si existe
    this.stopTone();

    // Créer un oscillateur (générateur de fréquence)
    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    // Configurer l'oscillateur
    this.oscillator.type = 'sine'; // Onde sinusoïdale pure
    this.oscillator.frequency.setValueAtTime(
      frequency,
      this.audioContext.currentTime
    );

    // Configurer le volume
    this.gainNode.gain.setValueAtTime(
      volume,
      this.audioContext.currentTime
    );

    // Connecter: oscillateur -> gain -> sortie audio
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    // Démarrer le son
    this.oscillator.start();

    // Arrêter automatiquement après la durée spécifiée
    this.oscillator.stop(this.audioContext.currentTime + duration);
  }

  /**
   * Arrête le son en cours
   */
  stopTone(): void {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch (e) {
        // L'oscillateur est déjà stoppé
      }
      this.oscillator = null;
    }
  }

  /**
   * Modifie le volume pendant que le son joue
   * @param volume - Nouveau volume entre 0 et 1
   */
  setVolume(volume: number): void {
    if (this.gainNode && this.audioContext) {
      if (volume < 0 || volume > 1) {
        console.error('Volume must be between 0 and 1');
        return;
      }

      this.gainNode.gain.setValueAtTime(
        volume,
        this.audioContext.currentTime
      );
    }
  }

  /**
   * Modifie la fréquence pendant que le son joue
   * @param frequency - Nouvelle fréquence en Hz
   */
  setFrequency(frequency: number): void {
    if (this.oscillator && this.audioContext) {
      if (frequency <= 0 || frequency > 24000) {
        console.error('Frequency must be between 0 and 24000 Hz');
        return;
      }

      this.oscillator.frequency.setValueAtTime(
        frequency,
        this.audioContext.currentTime
      );
    }
  }

  /**
   * Vérifie si un son est en cours de lecture
   */
  isPlaying(): boolean {
    return this.oscillator !== null;
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.stopTone();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export default AudioEngine;