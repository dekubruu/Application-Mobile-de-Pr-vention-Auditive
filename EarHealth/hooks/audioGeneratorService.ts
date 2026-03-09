// services/audioGeneratorService.ts
/**
 * Service de génération audio en temps réel
 * Génère des fréquences pures à partir de Web Audio API
 * Compatible avec React Native Web et Expo Web
 */

export class AudioGeneratorService {
  private static audioContext: AudioContext | null = null;
  private static oscillator: OscillatorNode | null = null;
  private static gainNode: GainNode | null = null;
  private static isPlaying: boolean = false;

  /**
   * Initialiser l'AudioContext
   */
  static initAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error(
          'Web Audio API non supportée. Utilisez un navigateur moderne.'
        );
      }

      this.audioContext = new AudioContextClass();
    }

    return this.audioContext;
  }

  /**
   * Jouer une fréquence pure
   * @param frequency Fréquence en Hz
   * @param volume Volume 0-1 (default: 0.2)
   * @returns Promise qui se résout quand le son est joué
   */
  static playFrequency(frequency: number, volume: number = 0.2): void {
    try {
      // Initialiser si nécessaire
      if (!this.audioContext) {
        this.initAudioContext();
      }

      // Si un son joue déjà, l'arrêter
      if (this.isPlaying) {
        this.stopFrequency();
      }

      const ctx = this.audioContext!;

      // Créer oscillateur (onde sinusoïdale pure)
      this.oscillator = ctx.createOscillator();
      this.gainNode = ctx.createGain();

      // Configuration
      this.oscillator.type = 'sine'; // Onde sinusoïdale pure
      this.oscillator.frequency.value = frequency;
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume)); // Clamp 0-1

      // Connecter les nœuds
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);

      // Jouer
      this.oscillator.start();
      this.isPlaying = true;

      //console.log(` Son joué: ${frequency}Hz, Volume: ${volume}`);
    } catch (error) {
      console.error('Erreur lors de la lecture du son:', error);
    }
  }

  /**
   * Arrêter le son en cours
   */
  static stopFrequency(): void {
    try {
      if (this.oscillator && this.isPlaying) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
        this.isPlaying = false;
        //console.log(' Son arrêté');
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du son:', error);
      this.isPlaying = false;
    }
  }

  /**
   * Changer le volume du son en cours
   * @param volume Volume 0-1
   */
  static setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Vérifier si un son est en cours
   */
  static getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Tester l'audio (jouer 1000Hz pendant 1 sec)
   */
  static async testAudio(): Promise<void> {
    this.playFrequency(1000, 0.2);
    return new Promise(resolve => {
      setTimeout(() => {
        this.stopFrequency();
        resolve();
      }, 1000);
    });
  }
}