/**
 * Efeitos de partículas com temática shinobi: folhas ao vento, pétalas,
 * faíscas de chakra, brasas e kanji.
 *
 * Motor próprio, de propósito simples e previsível:
 *  - desenha APENAS formas vetoriais (caminhos e texto) em um canvas 2D comum
 *    na thread principal — nada de ImageBitmap, OffscreenCanvas, worker ou
 *    padrões de imagem, que no Safari/iOS pintavam a tela de branco;
 *  - o canvas é limpo por inteiro a cada quadro e REMOVIDO da página assim
 *    que a última partícula some (ou se a aba for para segundo plano);
 *  - há teto de partículas e de duração, então um efeito nunca "trava" na tela.
 */

type Shape = 'leaf' | 'petal' | 'spark' | 'ember' | 'kanji';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  wind: number;
  rotation: number;
  spin: number;
  sway: number;
  swaySpeed: number;
  size: number;
  life: number;
  maxLife: number;
  shape: Shape;
  color: string;
}

interface EmitOptions {
  /** Origem em fração da tela (0–1). Funções permitem variar a cada partícula. */
  x: number | (() => number);
  y: number | (() => number);
  /** Direção em graus (0 = direita, 90 = para cima) e abertura do leque. */
  angle: number;
  spread: number;
  speed: [number, number]; // px/s
  gravity?: number; // px/s²
  drag?: number; // fração de velocidade perdida por segundo
  wind?: number; // aceleração horizontal constante (px/s²)
  life?: [number, number]; // segundos
  size?: [number, number]; // px
  shapes: Shape[];
  colors: string[];
}

interface Stream {
  options: EmitOptions;
  until: number;
  perSecond: number;
  carry: number;
}

const MAX_PARTICLES = 260;
const MAX_RUN_MS = 9000;
const LEAF_COLORS = ['#4d7c0f', '#65a30d', '#84cc16', '#a3e635', '#a16207'];
const AUTUMN_COLORS = ['#c2410c', '#ea580c', '#d97706', '#a16207'];
const PETAL_COLORS = ['#fb7185', '#fda4af', '#f43f5e'];
const CHAKRA_COLORS = ['#FF7A1A', '#eab308', '#06b6d4', '#18F689', '#FF1341'];
const EMBER_COLORS = ['#FF1341', '#FF7A1A', '#fbbf24', '#ffd700'];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let streams: Stream[] = [];
let frameId = 0;
let lastTime = 0;
let startedAt = 0;
let width = 0;
let height = 0;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const resolve = (value: number | (() => number)) => (typeof value === 'function' ? value() : value);

const canAnimate = () =>
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function resize() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function teardown() {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  particles = [];
  streams = [];
  window.removeEventListener('resize', resize);
  document.removeEventListener('visibilitychange', handleVisibility);
  canvas?.remove();
  canvas = null;
  ctx = null;
}

function handleVisibility() {
  if (document.hidden) teardown();
}

function ensureCanvas(): boolean {
  if (canvas && ctx) return true;
  const el = document.createElement('canvas');
  const context = el.getContext('2d');
  if (!context) return false;
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '200',
    background: 'transparent',
  });
  document.body.appendChild(el);
  canvas = el;
  ctx = context;
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', handleVisibility);
  return true;
}

function spawn(options: EmitOptions) {
  if (particles.length >= MAX_PARTICLES) return;
  const angle = ((options.angle + rand(-options.spread / 2, options.spread / 2)) * Math.PI) / 180;
  const speed = rand(options.speed[0], options.speed[1]);
  const shape = pick(options.shapes);
  const life = rand(...(options.life || [1.4, 2.2]));
  particles.push({
    x: resolve(options.x) * width,
    y: resolve(options.y) * height,
    vx: Math.cos(angle) * speed,
    vy: -Math.sin(angle) * speed,
    gravity: options.gravity ?? 700,
    drag: options.drag ?? 0.9,
    wind: options.wind ?? 0,
    rotation: rand(0, Math.PI * 2),
    spin: rand(-4, 4),
    sway: rand(0, Math.PI * 2),
    swaySpeed: rand(2, 5),
    size: rand(...(options.size || [7, 12])),
    life,
    maxLife: life,
    shape,
    color: shape === 'kanji' ? '#fbbf24' : pick(options.colors),
  });
}

function draw(c: CanvasRenderingContext2D, p: Particle) {
  const fade = Math.min(1, p.life / (p.maxLife * 0.35));
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.rotation);
  c.globalAlpha = Math.max(0, fade);
  c.fillStyle = p.color;
  const s = p.size;

  if (p.shape === 'leaf') {
    // Folha: corpo alongado com nervura central (vira de lado conforme balança)
    c.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(p.sway)));
    c.beginPath();
    c.moveTo(-s, 0);
    c.quadraticCurveTo(0, -s * 0.75, s, 0);
    c.quadraticCurveTo(0, s * 0.75, -s, 0);
    c.fill();
    c.strokeStyle = 'rgba(20, 40, 10, 0.5)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-s * 0.85, 0);
    c.lineTo(s * 0.85, 0);
    c.stroke();
  } else if (p.shape === 'petal') {
    c.scale(1, 0.6 + 0.4 * Math.abs(Math.cos(p.sway)));
    c.beginPath();
    c.moveTo(0, -s * 0.9);
    c.bezierCurveTo(s * 0.8, -s * 0.5, s * 0.6, s * 0.7, 0, s * 0.9);
    c.bezierCurveTo(-s * 0.6, s * 0.7, -s * 0.8, -s * 0.5, 0, -s * 0.9);
    c.fill();
  } else if (p.shape === 'spark') {
    // Estrela de 4 pontas (faísca de chakra / shuriken)
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? s : s * 0.35;
      const a = (i * Math.PI) / 4;
      if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
  } else if (p.shape === 'kanji') {
    c.rotate(-p.rotation); // o kanji cai sempre legível
    c.font = `${Math.round(s * 2.4)}px "Yuji Syuku", "Noto Serif JP", serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('完', 0, 0);
  } else {
    c.beginPath();
    c.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function tick(time: number) {
  if (!canvas || !ctx) return;
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
  lastTime = time;

  // Fontes contínuas (ex.: folhas entrando pela lateral)
  streams = streams.filter((stream) => {
    if (time > stream.until) return false;
    stream.carry += stream.perSecond * dt;
    while (stream.carry >= 1) {
      spawn(stream.options);
      stream.carry -= 1;
    }
    return true;
  });

  ctx.clearRect(0, 0, width, height);
  particles = particles.filter((p) => {
    p.life -= dt;
    if (p.life <= 0 || p.y > height + 60 || p.x < -80 || p.x > width + 80) return false;
    const damping = Math.max(0, 1 - p.drag * dt);
    p.vx = (p.vx + p.wind * dt) * damping;
    p.vy = (p.vy + p.gravity * dt) * damping;
    p.sway += p.swaySpeed * dt;
    p.x += (p.vx + Math.sin(p.sway) * 28) * dt;
    p.y += p.vy * dt;
    p.rotation += p.spin * dt;
    draw(ctx!, p);
    return true;
  });

  const expired = time - startedAt > MAX_RUN_MS;
  if ((particles.length === 0 && streams.length === 0) || expired) {
    teardown();
    return;
  }
  frameId = requestAnimationFrame(tick);
}

function start() {
  if (frameId) return;
  lastTime = performance.now();
  startedAt = lastTime;
  frameId = requestAnimationFrame(tick);
}

function burst(count: number, options: EmitOptions) {
  if (!canAnimate() || document.hidden || !ensureCanvas()) return;
  for (let i = 0; i < count; i++) spawn(options);
  start();
}

function stream(durationMs: number, perSecond: number, options: EmitOptions) {
  if (!canAnimate() || document.hidden || !ensureCanvas()) return;
  streams.push({ options, until: performance.now() + durationMs, perSecond, carry: 0 });
  start();
  // Um novo efeito durante outro renova o tempo máximo de execução
  startedAt = performance.now();
}

// ─────────────────────────────────────────────────────────────
// Efeitos
// ─────────────────────────────────────────────────────────────

/** Missão concluída: rajada curta de folhas. */
export function triggerMissionConfetti() {
  burst(16, {
    x: 0.5,
    y: 0.78,
    angle: 90,
    spread: 80,
    speed: [320, 560],
    gravity: 620,
    drag: 1.1,
    wind: 60,
    life: [1.1, 1.8],
    size: [7, 11],
    shapes: ['leaf'],
    colors: LEAF_COLORS,
  });
}

/** Dia Cumprido: folhas atravessando a tela com o vento. */
export function triggerDayCompleteConfetti() {
  stream(1400, 55, {
    x: -0.04,
    y: () => rand(0.45, 0.8),
    angle: 18,
    spread: 44,
    speed: [380, 620],
    gravity: 150,
    drag: 0.35,
    wind: 180,
    life: [1.8, 2.6],
    size: [8, 13],
    shapes: ['leaf', 'leaf', 'petal'],
    colors: [...LEAF_COLORS, ...AUTUMN_COLORS],
  });
}

/** Subida de nível / patente: faíscas de chakra e folhas dos dois lados. */
export function triggerLevelUpConfetti() {
  const side = (x: number, angle: number): EmitOptions => ({
    x,
    y: 0.74,
    angle,
    spread: 55,
    speed: [420, 760],
    gravity: 780,
    drag: 0.7,
    life: [1.3, 2.1],
    size: [5, 9],
    shapes: ['spark', 'spark', 'leaf'],
    colors: CHAKRA_COLORS,
  });
  stream(1800, 34, side(0, 62));
  stream(1800, 34, side(1, 118));
}

/** Chefe derrotado: explosão de brasas e pétalas. */
export function triggerBossDefeatedConfetti() {
  burst(80, {
    x: 0.5,
    y: 0.5,
    angle: 90,
    spread: 360,
    speed: [180, 640],
    gravity: 520,
    drag: 1.2,
    life: [1.2, 2.2],
    size: [4, 8],
    shapes: ['ember', 'ember', 'spark'],
    colors: EMBER_COLORS,
  });
  burst(18, {
    x: 0.5,
    y: 0.46,
    angle: 90,
    spread: 200,
    speed: [220, 480],
    gravity: 380,
    drag: 0.9,
    life: [1.8, 2.8],
    size: [8, 12],
    shapes: ['petal'],
    colors: PETAL_COLORS,
  });
}

/** Desafio concluído: chuva de folhas, pétalas e o kanji de "completo". */
export function triggerChallengeCompleteConfetti() {
  stream(3000, 48, {
    x: () => rand(0, 1),
    y: -0.05,
    angle: 270,
    spread: 70,
    speed: [90, 260],
    gravity: 260,
    drag: 0.5,
    wind: 30,
    life: [2.4, 3.6],
    size: [7, 12],
    shapes: ['leaf', 'leaf', 'petal', 'petal', 'spark', 'kanji'],
    colors: [...LEAF_COLORS, ...PETAL_COLORS, '#fbbf24'],
  });
}
