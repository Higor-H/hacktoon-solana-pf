/**
 * Síntese de áudio realista dos efeitos sonoros da Urna Eletrônica Brasileira
 * Utiliza a Web Audio API nativa para operação 100% offline com zero latência.
 */

class UrnaAudioService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Bip curto de digitação do teclado numérico (1000 Hz)
   */
  playKeypress(): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      console.warn('Erro ao tocar som de tecla:', e);
    }
  }

  /**
   * Som de alerta ao teclar CORRIGE ou dígito inválido
   */
  playAlert(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Dois bips curtos mais graves
      [0, 0.09].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now + delay);

        gain.gain.setValueAtTime(0.12, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.07);
      });
    } catch (e) {
      console.warn('Erro ao tocar som de alerta:', e);
    }
  }

  /**
   * O lendário som de CONFIRMAÇÃO DA URNA DO TSE ("Pi-Pi-Pi-PÓ!")
   * Quatro tons ascendentes em frequência precisa com sustentação no último tom.
   */
  playConfirm(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Frequências e durações oficiais aproximadas da urna eletrônica
      const tones = [
        { freq: 587, duration: 0.12, start: 0.0 },   // D5
        { freq: 740, duration: 0.12, start: 0.13 },  // F#5
        { freq: 880, duration: 0.12, start: 0.26 },  // A5
        { freq: 1174, duration: 0.95, start: 0.39 }, // D6 (o clássico tom final sustentado)
      ];

      tones.forEach(({ freq, duration, start }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle'; // Timbre característico do buzzer da urna
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.28, now + start);
        if (start >= 0.35) {
          // Último tom decai suavemente no final
          gain.gain.setValueAtTime(0.28, now + start + duration - 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
        } else {
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      });
    } catch (e) {
      console.warn('Erro ao tocar som de confirmação:', e);
    }
  }
}

export const urnaAudio = new UrnaAudioService();
