import confetti from 'canvas-confetti';

/**
 * Efeitos de partículas com temática shinobi: folhas ao vento, shurikens,
 * pétalas e kanji — em vez do confete genérico de festa.
 */

type Shape = confetti.Shape;
const shapeCache = new Map<string, Shape>();

function textShape(text: string, scalar = 2): Shape | null {
  const key = `${text}_${scalar}`;
  if (shapeCache.has(key)) return shapeCache.get(key)!;
  try {
    const fn = (confetti as unknown as { shapeFromText?: (o: { text: string; scalar: number }) => Shape }).shapeFromText;
    if (!fn) return null;
    const shape = fn({ text, scalar });
    shapeCache.set(key, shape);
    return shape;
  } catch {
    return null;
  }
}

function shapes(...texts: string[]): Shape[] | undefined {
  const list = texts.map((t) => textShape(t)).filter(Boolean) as Shape[];
  return list.length ? list : undefined;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Missão concluída: rajada curta de folhas. */
export function triggerMissionConfetti() {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: 14,
    spread: 70,
    startVelocity: 26,
    gravity: 0.7,
    drift: 0.6,
    ticks: 140,
    origin: { y: 0.75 },
    scalar: 1.4,
    shapes: shapes('🍃'),
    colors: ['#18F689', '#FF7A1A', '#eab308'],
  });
}

/** Dia Cumprido: folhas atravessando a tela com o vento. */
export function triggerDayCompleteConfetti() {
  if (prefersReducedMotion()) return;
  const leafShapes = shapes('🍃', '🍂');
  const end = Date.now() + 1400;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 20,
      spread: 40,
      startVelocity: 38,
      gravity: 0.5,
      drift: 1.2,
      ticks: 220,
      origin: { x: -0.05, y: 0.55 + Math.random() * 0.2 },
      scalar: 1.5,
      shapes: leafShapes,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** Subida de nível / patente: shurikens e faíscas de chakra dos dois lados. */
export function triggerLevelUpConfetti() {
  if (prefersReducedMotion()) return;
  const end = Date.now() + 2200;
  const starShapes = shapes('✦', '🍃');
  const colors = ['#FF7A1A', '#eab308', '#06b6d4', '#18F689', '#FF1341'];
  const frame = () => {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.72 }, colors, shapes: starShapes, scalar: 1.2 });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.72 }, colors, shapes: starShapes, scalar: 1.2 });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** Chefe derrotado: explosão de brasas e pétalas. */
export function triggerBossDefeatedConfetti() {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: 90,
    spread: 110,
    startVelocity: 40,
    origin: { y: 0.5 },
    colors: ['#FF1341', '#FF7A1A', '#fbbf24', '#ffd700'],
  });
  confetti({ particleCount: 18, spread: 140, startVelocity: 30, origin: { y: 0.45 }, scalar: 1.6, shapes: shapes('🌸', '✦') });
}

/** Desafio concluído: chuva de folhas, pétalas e o kanji de "completo". */
export function triggerChallengeCompleteConfetti() {
  if (prefersReducedMotion()) return;
  const end = Date.now() + 3000;
  const celebration = shapes('🍃', '🌸', '完', '✦');
  const frame = () => {
    confetti({ particleCount: 4, angle: 90, spread: 160, startVelocity: 20, gravity: 0.6, origin: { x: Math.random(), y: -0.1 }, scalar: 1.6, shapes: celebration, ticks: 260 });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
