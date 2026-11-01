/**
 * Sintetizador de efeitos sonoros Shinobi — 100% Web Audio API, sem arquivos externos.
 *
 * Paleta sonora inspirada na música tradicional japonesa (sem copiar nenhuma obra):
 *  - Koto: corda dedilhada (síntese Karplus-Strong) na escala pentatônica "In" (Miyako-bushi)
 *  - Taiko: tambor grave com queda de afinação
 *  - Hyoshigi: claves de madeira que anunciam o início de algo
 *  - Shakuhachi: flauta de bambu soprada (seno + sopro filtrado + vibrato)
 *  - Sino de templo e gongo: parciais inarmônicas com cauda longa
 *  - Katana, kunai e fumaça: ruído filtrado com envelopes rápidos
 */

// Escala "In" em Ré (D, Eb, G, A, Bb) — som clássico de filmes e animes de ninja
const IN_SCALE = [146.83, 155.56, 196.0, 220.0, 233.08, 293.66, 311.13, 392.0, 440.0, 466.16, 587.33, 622.25, 783.99, 880.0];

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private soundEnabled = true;
  private kotoCache = new Map<string, AudioBuffer>();
  private noiseCache: AudioBuffer | null = null;

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (!enabled && this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => undefined);
    }
  }

  public isEnabled() {
    return this.soundEnabled;
  }

  // ─────────────────────────────────────────────────────────
  // Infraestrutura
  // ─────────────────────────────────────────────────────────

  private ready(): AudioContext | null {
    if (!this.soundEnabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();

      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.2;

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(compressor);
      compressor.connect(this.ctx.destination);

      // Reverb de sala de madeira (dojo) gerado proceduralmente
      const convolver = this.ctx.createConvolver();
      convolver.buffer = this.createImpulse(1.8, 2.6);
      this.reverbSend = this.ctx.createGain();
      this.reverbSend.gain.value = 0.28;
      this.reverbSend.connect(convolver);
      convolver.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }

  private createImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return impulse;
  }

  private noise(): AudioBuffer {
    const ctx = this.ctx!;
    if (!this.noiseCache) {
      const length = ctx.sampleRate * 2;
      this.noiseCache = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noiseCache.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noiseCache;
  }

  /** Conecta um nó à saída (seco) e opcionalmente ao reverb. */
  private out(node: AudioNode, wet = 0) {
    node.connect(this.master!);
    if (wet > 0 && this.reverbSend) {
      const send = this.ctx!.createGain();
      send.gain.value = wet;
      node.connect(send);
      send.connect(this.reverbSend);
    }
  }

  private env(gain: GainNode, t: number, peak: number, attack: number, decay: number) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  // ─────────────────────────────────────────────────────────
  // Instrumentos
  // ─────────────────────────────────────────────────────────

  /** Koto — corda dedilhada por Karplus-Strong. */
  private koto(freq: number, t: number, volume = 0.32, duration = 1.6, wet = 0.35) {
    const ctx = this.ctx!;
    const cacheKey = `${freq.toFixed(2)}_${duration}`;
    let buffer = this.kotoCache.get(cacheKey);
    if (!buffer) {
      const sr = ctx.sampleRate;
      const length = Math.floor(sr * duration);
      buffer = ctx.createBuffer(1, length, sr);
      const out = buffer.getChannelData(0);
      const period = Math.max(2, Math.round(sr / freq));
      const ring = new Float32Array(period);
      // Excitação: ruído suavizado (palheta de marfim do koto)
      let prev = 0;
      for (let i = 0; i < period; i++) {
        const r = Math.random() * 2 - 1;
        prev = prev * 0.45 + r * 0.55;
        ring[i] = prev;
      }
      let idx = 0;
      const damping = 0.4985 + Math.min(0.0012, freq / 900000);
      for (let i = 0; i < length; i++) {
        const next = (idx + 1) % period;
        const sample = ring[idx];
        ring[idx] = (ring[idx] + ring[next]) * damping;
        out[i] = sample;
        idx = next;
      }
      this.kotoCache.set(cacheKey, buffer);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const tone = ctx.createBiquadFilter();
    tone.type = 'peaking';
    tone.frequency.value = freq * 3;
    tone.gain.value = 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(tone);
    tone.connect(gain);
    this.out(gain, wet);
    src.start(t);
    src.stop(t + duration);
  }

  /** Taiko — tambor grave com o "estalo" da pele. */
  private taiko(t: number, volume = 0.55, pitch = 95) {
    const ctx = this.ctx!;
    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(pitch * 1.6, t);
    body.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + 0.35);
    const bodyGain = ctx.createGain();
    this.env(bodyGain, t, volume, 0.005, 0.55);
    body.connect(bodyGain);
    this.out(bodyGain, 0.25);
    body.start(t);
    body.stop(t + 0.6);

    const skin = ctx.createBufferSource();
    skin.buffer = this.noise();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.12);
    const skinGain = ctx.createGain();
    this.env(skinGain, t, volume * 0.5, 0.002, 0.12);
    skin.connect(lp);
    lp.connect(skinGain);
    this.out(skinGain, 0.15);
    skin.start(t, Math.random());
    skin.stop(t + 0.15);
  }

  /** Hyoshigi — estalo seco de claves de madeira. */
  private woodClap(t: number, volume = 0.4, freq = 2100) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 6;
    const g = ctx.createGain();
    this.env(g, t, volume, 0.001, 0.07);
    src.connect(bp);
    bp.connect(g);
    this.out(g, 0.4);
    src.start(t, Math.random());
    src.stop(t + 0.09);

    const tone = ctx.createOscillator();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(freq * 0.62, t);
    const tg = ctx.createGain();
    this.env(tg, t, volume * 0.55, 0.001, 0.05);
    tone.connect(tg);
    this.out(tg, 0.3);
    tone.start(t);
    tone.stop(t + 0.07);
  }

  /** Shakuhachi — flauta de bambu com sopro e vibrato. */
  private shakuhachi(freq: number, t: number, duration: number, volume = 0.16, slideFrom = 0.95) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * slideFrom, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.12);

    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.setValueAtTime(0, t);
    vibratoDepth.gain.linearRampToValueAtTime(freq * 0.012, t + duration * 0.6);
    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(osc.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.09);
    g.gain.setValueAtTime(volume, t + duration * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    this.out(g, 0.45);

    const breath = ctx.createBufferSource();
    breath.buffer = this.noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 2;
    bp.Q.value = 1.4;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.linearRampToValueAtTime(volume * 0.55, t + 0.05);
    bg.gain.exponentialRampToValueAtTime(volume * 0.12, t + 0.3);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    breath.connect(bp);
    bp.connect(bg);
    this.out(bg, 0.45);

    osc.start(t);
    vibrato.start(t);
    breath.start(t, Math.random());
    osc.stop(t + duration);
    vibrato.stop(t + duration);
    breath.stop(t + duration);
  }

  /** Sino de templo — parciais inarmônicas. */
  private templeBell(freq: number, t: number, volume = 0.22, duration = 3.2) {
    const ctx = this.ctx!;
    [
      { r: 1, g: 1, d: 1 },
      { r: 2.76, g: 0.45, d: 0.6 },
      { r: 5.4, g: 0.25, d: 0.35 },
      { r: 8.93, g: 0.12, d: 0.2 },
      { r: 0.5, g: 0.35, d: 1.1 },
    ].forEach(({ r, g, d }) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * r;
      const gain = ctx.createGain();
      this.env(gain, t, volume * g, 0.004, duration * d);
      osc.connect(gain);
      this.out(gain, 0.5);
      osc.start(t);
      osc.stop(t + duration * d + 0.05);
    });
  }

  /** Gongo — grave, metálico e longo. */
  private gong(t: number, volume = 0.3) {
    const ctx = this.ctx!;
    [55, 82.4, 113.1, 147.6, 196.3].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f * 1.01, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 1.5);
      const g = ctx.createGain();
      this.env(g, t, volume / (i + 1.4), 0.02, 2.6 - i * 0.3);
      osc.connect(g);
      this.out(g, 0.55);
      osc.start(t);
      osc.stop(t + 2.8);
    });
  }

  /** Whoosh — lâmina, kunai ou movimento rápido. */
  private whoosh(t: number, from: number, to: number, duration: number, volume = 0.22, q = 3) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(to, t + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(volume, t + duration * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(bp);
    bp.connect(g);
    this.out(g, 0.15);
    src.start(t, Math.random());
    src.stop(t + duration + 0.02);
  }

  /** "Puf" de fumaça — jutsu de substituição / clone se desfazendo. */
  private smokePoof(t: number, volume = 0.35) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + 0.35);
    const g = ctx.createGain();
    this.env(g, t, volume, 0.008, 0.38);
    src.connect(lp);
    lp.connect(g);
    this.out(g, 0.35);
    src.start(t, Math.random());
    src.stop(t + 0.42);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(140, t);
    thump.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    const tg = ctx.createGain();
    this.env(tg, t, volume * 0.6, 0.004, 0.14);
    thump.connect(tg);
    this.out(tg);
    thump.start(t);
    thump.stop(t + 0.16);
  }

  /** Brilho metálico (moedas, lâmina cantando). */
  private ping(freq: number, t: number, volume = 0.12, decay = 0.4) {
    const ctx = this.ctx!;
    [1, 2.01, 3.03].forEach((r, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * r;
      const g = ctx.createGain();
      this.env(g, t, volume / (i + 1), 0.002, decay / (i * 0.6 + 1));
      osc.connect(g);
      this.out(g, 0.3);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    });
  }

  private arpeggio(indexes: number[], t: number, step: number, volume = 0.3) {
    indexes.forEach((idx, i) => this.koto(IN_SCALE[idx], t + i * step, volume));
  }

  // ─────────────────────────────────────────────────────────
  // Efeitos públicos
  // ─────────────────────────────────────────────────────────

  /** Missão concluída: corte de katana + nota de koto. */
  public playMissionComplete() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    this.whoosh(t, 1500, 5200, 0.16, 0.34, 4);
    this.whoosh(t + 0.05, 4200, 900, 0.14, 0.22, 3);
    this.ping(2093, t + 0.06, 0.1, 0.5);
    this.koto(IN_SCALE[8], t + 0.1, 0.4, 1.2);
    this.koto(IN_SCALE[10], t + 0.18, 0.34, 1.4);
  }

  /** Missão desmarcada: lâmina voltando à bainha. */
  public playMissionUndo() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    this.whoosh(t, 3200, 700, 0.22, 0.14, 2.5);
    this.koto(IN_SCALE[4], t + 0.05, 0.16, 0.9);
  }

  /** Dia Cumprido: claves de madeira + arpejo de koto + puf de fumaça. */
  public playDayComplete() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    this.woodClap(t, 0.42);
    this.woodClap(t + 0.16, 0.42);
    this.arpeggio([5, 6, 7, 8, 9, 10], t + 0.34, 0.085, 0.26);
    this.taiko(t + 0.34, 0.4, 90);
    this.smokePoof(t + 0.9, 0.22);
  }

  /** Novo nível: koto ascendente + taiko. */
  public playLevelUp() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    this.taiko(t, 0.5);
    this.arpeggio([3, 5, 7, 8, 10, 12], t + 0.05, 0.075, 0.28);
    this.templeBell(587.33, t + 0.5, 0.12, 2.2);
  }

  /** Nova patente: rufar de taiko + shakuhachi + gongo. */
  public playRankUp() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    [0, 0.14, 0.28, 0.36, 0.44].forEach((d, i) => this.taiko(t + d, 0.38 + i * 0.05, 85 + i * 4));
    this.gong(t + 0.6, 0.28);
    this.shakuhachi(IN_SCALE[8], t + 0.65, 0.7, 0.15);
    this.shakuhachi(IN_SCALE[10], t + 1.3, 1.1, 0.15, 0.97);
    this.arpeggio([7, 8, 10, 12, 13], t + 0.7, 0.09, 0.22);
  }

  /** Golpe no adversário. */
  public playBossHit() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.12;
    this.whoosh(t, 900, 2800, 0.09, 0.16, 2);
    this.taiko(t + 0.07, 0.45, 70);
  }

  /** Golpe crítico: impacto pesado + clangor metálico. */
  public playCriticalHit() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.12;
    this.whoosh(t, 700, 4200, 0.1, 0.22, 2);
    this.taiko(t + 0.08, 0.6, 60);
    this.ping(1318.5, t + 0.08, 0.11, 0.7);
    this.ping(1760, t + 0.1, 0.08, 0.5);
  }

  /** Adversário derrotado. */
  public playBossDefeated() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    this.taiko(t, 0.55, 80);
    this.taiko(t + 0.18, 0.6, 72);
    this.gong(t + 0.35, 0.3);
    this.arpeggio([5, 7, 8, 10, 12, 13], t + 0.45, 0.08, 0.24);
  }

  /** Pergaminho se desenrolando. */
  public playScrollOpen() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    for (let i = 0; i < 4; i++) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise();
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2400 + i * 400;
      const g = ctx.createGain();
      this.env(g, t + i * 0.035, 0.08, 0.004, 0.05);
      src.connect(hp);
      hp.connect(g);
      this.out(g, 0.2);
      src.start(t + i * 0.035, Math.random());
      src.stop(t + i * 0.035 + 0.07);
    }
    this.koto(IN_SCALE[7], t + 0.05, 0.12, 0.8);
  }

  /** Clique suave de madeira. */
  public playButtonClick() {
    const ctx = this.ready();
    if (!ctx) return;
    this.woodClap(ctx.currentTime + 0.005, 0.34, 2600);
  }

  /** Sino zen (Pomodoro e meditação). */
  public playZenBell() {
    const ctx = this.ready();
    if (!ctx) return;
    this.templeBell(392, ctx.currentTime + 0.01, 0.24, 4);
  }

  /** Escudo de Chakra protegendo a sequência. */
  public playShield() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    this.whoosh(t, 300, 2400, 0.45, 0.18, 1.5);
    this.ping(1174.7, t + 0.3, 0.08, 0.9);
    this.ping(1568, t + 0.38, 0.07, 0.9);
    this.koto(IN_SCALE[10], t + 0.32, 0.16, 1.4);
  }

  /** Compra na loja: moedas tilintando. */
  public playPurchase() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    this.ping(2637, t, 0.09, 0.25);
    this.ping(3136, t + 0.07, 0.08, 0.3);
    this.ping(3951, t + 0.14, 0.07, 0.45);
    this.woodClap(t + 0.22, 0.18, 1800);
  }

  /** Ação bloqueada. */
  public playError() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    this.woodClap(t, 0.36, 700);
    this.woodClap(t + 0.11, 0.32, 560);
  }

  /** Início de desafio: claves + shakuhachi. */
  public playChallengeStart() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    this.woodClap(t, 0.4);
    this.woodClap(t + 0.22, 0.4);
    this.taiko(t + 0.44, 0.5);
    this.shakuhachi(IN_SCALE[7], t + 0.5, 0.55, 0.16);
    this.shakuhachi(IN_SCALE[8], t + 1.0, 0.45, 0.16, 0.98);
    this.shakuhachi(IN_SCALE[10], t + 1.4, 1.2, 0.17, 0.96);
  }

  /** Desafio concluído: fanfarra completa. */
  public playChallengeComplete() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    [0, 0.2, 0.4, 0.52, 0.64, 0.76].forEach((d, i) => this.taiko(t + d, 0.4 + i * 0.04, 80 + i * 3));
    this.gong(t + 0.9, 0.32);
    this.arpeggio([5, 7, 8, 10, 12, 13, 12, 13], t + 0.95, 0.1, 0.24);
    this.shakuhachi(IN_SCALE[10], t + 1.0, 1.6, 0.16);
    this.templeBell(587.33, t + 1.9, 0.14, 3);
  }

  /** Desafio encerrado por faltas. */
  public playChallengeFailed() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    this.shakuhachi(IN_SCALE[8], t, 0.6, 0.15, 1.02);
    this.shakuhachi(IN_SCALE[6], t + 0.55, 0.6, 0.14, 1.03);
    this.shakuhachi(IN_SCALE[4], t + 1.1, 1.4, 0.13, 1.04);
    this.gong(t + 1.1, 0.22);
  }

  /** Compatibilidade com o código antigo. */
  public playKatanaSlash() {
    this.playMissionComplete();
  }
}

export const soundFx = new SoundSynthesizer();
