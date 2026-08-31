import confetti from 'canvas-confetti';

export function triggerLevelUpConfetti() {
  const duration = 2.5 * 1000;
  const animationEnd = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#e11d48', '#eab308', '#06b6d4', '#10b981', '#8b5cf6']
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#e11d48', '#eab308', '#06b6d4', '#10b981', '#8b5cf6']
    });

    if (Date.now() < animationEnd) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

export function triggerMissionConfetti() {
  confetti({
    particleCount: 35,
    spread: 60,
    origin: { y: 0.8 },
    colors: ['#06b6d4', '#10b981', '#eab308']
  });
}

export function triggerBossDefeatedConfetti() {
  confetti({
    particleCount: 100,
    spread: 100,
    origin: { y: 0.5 },
    colors: ['#e11d48', '#fbbf24', '#f43f5e', '#ffd700']
  });
}
