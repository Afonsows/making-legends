/**
 * Sintetizador de áudio Web Audio API puro para efeitos sonoros Shinobi.
 * 100% offline, zero dependências externas de arquivos mp3.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Inicialização sob demanda após primeiro clique do usuário
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  private createNoiseBuffer(duration: number = 0.5): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Som de conclusão de missão: Corte de Katana Shinobi (Espada / Slash & Ressonância de Aço)
   */
  public playMissionComplete() {
    this.playKatanaSlash();
  }

  /**
   * Efeito Sonoro de Corte de Katana Shinobi (Corte veloz, atrito de lâmina e ressonância de aço puro)
   */
  public playKatanaSlash() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. O Vento do Corte (Whoosh da lâmina rasgando o ar)
    const noiseBuffer = this.createNoiseBuffer(0.25);
    if (noiseBuffer) {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.setValueAtTime(4.5, now);
      noiseFilter.frequency.setValueAtTime(1400, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(4800, now + 0.05);
      noiseFilter.frequency.exponentialRampToValueAtTime(800, now + 0.18);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.24, now + 0.03);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + 0.22);
    }

    // 2. O Ataque da Lâmina / Transiente de Corte Rápido (Zan!)
    const slashOsc = ctx.createOscillator();
    const slashGain = ctx.createGain();
    const slashFilter = ctx.createBiquadFilter();

    slashOsc.type = 'sawtooth';
    slashOsc.frequency.setValueAtTime(3600, now + 0.015);
    slashOsc.frequency.exponentialRampToValueAtTime(600, now + 0.09);

    slashFilter.type = 'bandpass';
    slashFilter.frequency.setValueAtTime(3000, now + 0.015);
    slashFilter.frequency.exponentialRampToValueAtTime(750, now + 0.09);
    slashFilter.Q.setValueAtTime(3.5, now + 0.015);

    slashGain.gain.setValueAtTime(0.001, now);
    slashGain.gain.setValueAtTime(0.001, now + 0.015);
    slashGain.gain.linearRampToValueAtTime(0.20, now + 0.035);
    slashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    slashOsc.connect(slashFilter);
    slashFilter.connect(slashGain);
    slashGain.connect(ctx.destination);

    slashOsc.start(now + 0.015);
    slashOsc.stop(now + 0.12);

    // 3. Ressonância Metálica de Aço Katana (O cantar da lâmina - "Shiiing...")
    const steelHarmonics = [
      { freq: 2093.00, gain: 0.18, decay: 0.65 }, // C7 (Tom fundamental do aço)
      { freq: 2101.00, gain: 0.14, decay: 0.60 }, // Leve batimento acústico da lâmina
      { freq: 3135.96, gain: 0.11, decay: 0.50 }, // G7 (Quinta harmônica)
      { freq: 4186.01, gain: 0.08, decay: 0.38 }, // C8 (Brilho da borda afiada)
      { freq: 6271.93, gain: 0.05, decay: 0.25 }, // G8 (Centelha metálica)
    ];

    steelHarmonics.forEach(({ freq, gain: targetGain, decay }) => {
      const ringOsc = ctx.createOscillator();
      const ringGainNode = ctx.createGain();

      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(freq, now + 0.025);

      ringGainNode.gain.setValueAtTime(0.001, now);
      ringGainNode.gain.setValueAtTime(0.001, now + 0.025);
      ringGainNode.gain.linearRampToValueAtTime(targetGain, now + 0.045);
      ringGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.045 + decay);

      ringOsc.connect(ringGainNode);
      ringGainNode.connect(ctx.destination);

      ringOsc.start(now + 0.025);
      ringOsc.stop(now + 0.05 + decay);
    });

    // 4. Peso Corporal do Golpe / Subgrave Tático Shinobi
    const impactOsc = ctx.createOscillator();
    const impactGain = ctx.createGain();

    impactOsc.type = 'sine';
    impactOsc.frequency.setValueAtTime(150, now + 0.02);
    impactOsc.frequency.exponentialRampToValueAtTime(35, now + 0.09);

    impactGain.gain.setValueAtTime(0.001, now);
    impactGain.gain.setValueAtTime(0.001, now + 0.02);
    impactGain.gain.linearRampToValueAtTime(0.18, now + 0.035);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    impactOsc.connect(impactGain);
    impactGain.connect(ctx.destination);

    impactOsc.start(now + 0.02);
    impactOsc.stop(now + 0.11);
  }

  /**
   * Som de subida de nível (Expansão de Chakra)
   */
  public playLevelUp() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // Acorde Maior Shinobi

    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startTime = now + index * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }

  /**
   * Som de impacto no boss (Lâmina / Golpe do Dojo)
   */
  public playBossHit() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Som de Sino Zen de Foco (Técnica de Concentração / Meditação)
   */
  public playZenBell() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, now); // Frequência Solfeggio 528Hz (Transformação)

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 2.8);
  }

  /**
   * Som de abertura de pergaminho
   */
  public playScrollOpen() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.1);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Som de clique suave de botão/seleção
   */
  public playButtonClick() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const soundFx = new SoundSynthesizer();
