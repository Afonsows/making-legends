import React, { useEffect, useRef } from 'react';

interface ShinobiBackgroundProps {
  opacity?: number;
  showNinjaDash?: boolean;
}

export const ShinobiBackground: React.FC<ShinobiBackgroundProps> = ({
  opacity = 0.4,
  showNinjaDash = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // 1. Partículas de Chakra / Brasas
    const particlesCount = width < 768 ? 25 : 55;
    const particles = Array.from({ length: particlesCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.4 - 0.2,
      speedY: -Math.random() * 0.6 - 0.2,
      color: Math.random() > 0.6 ? '#e11d48' : Math.random() > 0.3 ? '#eab308' : '#06b6d4',
      alpha: Math.random() * 0.7 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      angle: Math.random() * Math.PI * 2,
    }));

    // 2. Pétalas de Cerejeira Noturna / Folhas ao Vento
    const petalsCount = width < 768 ? 12 : 22;
    const petals = Array.from({ length: petalsCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 6 + 4,
      speedX: Math.random() * 1.2 + 0.6,
      speedY: Math.random() * 0.8 + 0.4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      swingAngle: Math.random() * Math.PI * 2,
      swingSpeed: Math.random() * 0.03 + 0.01,
      alpha: Math.random() * 0.4 + 0.2,
    }));

    // 3. Névoa Noturna Fluida (Mist Layers)
    const mistLayers = [
      { x: 0, speed: 0.15, yRatio: 0.75, opacity: 0.12, scale: 1.2 },
      { x: width / 2, speed: 0.25, yRatio: 0.85, opacity: 0.18, scale: 1.0 },
    ];

    // 4. Ninja Dash Silhouette (Ocasional salto em silhueta no telhado)
    let ninjaState: {
      active: boolean;
      x: number;
      y: number;
      speedX: number;
      speedY: number;
      trail: { x: number; y: number; alpha: number }[];
      timer: number;
    } = {
      active: false,
      x: -50,
      y: height * 0.7,
      speedX: 14,
      speedY: -2,
      trail: [],
      timer: 120, // Primeiros frames antes do salto
    };

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // --- FUNDO: Gradiente Noturno & Lua de Sangue Velada ---
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#07090e');
      bgGrad.addColorStop(0.5, '#0b0e18');
      bgGrad.addColorStop(1, '#0e1220');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Lua de Sangue Mística no Horizonte
      const moonX = width * 0.75;
      const moonY = height * 0.22;
      const moonRadius = Math.min(width, height) * 0.14;

      // Glow da Lua
      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.2, moonX, moonY, moonRadius * 2.2);
      moonGlow.addColorStop(0, 'rgba(225, 29, 72, 0.15)');
      moonGlow.addColorStop(0.5, 'rgba(234, 179, 8, 0.06)');
      moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Disco da Lua
      const moonDisk = ctx.createRadialGradient(moonX - moonRadius * 0.3, moonY - moonRadius * 0.3, moonRadius * 0.1, moonX, moonY, moonRadius);
      moonDisk.addColorStop(0, 'rgba(254, 243, 199, 0.18)');
      moonDisk.addColorStop(0.7, 'rgba(244, 63, 94, 0.14)');
      moonDisk.addColorStop(1, 'rgba(15, 23, 42, 0.2)');
      ctx.fillStyle = moonDisk;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fill();

      // --- CAMADA DE MONTANHAS & TELHADOS DE DOJO (Silhuetas Distantes) ---
      ctx.fillStyle = '#06080e';
      ctx.beginPath();
      ctx.moveTo(0, height);
      // Montanhas
      ctx.lineTo(0, height * 0.82);
      ctx.quadraticCurveTo(width * 0.25, height * 0.68, width * 0.5, height * 0.8);
      ctx.quadraticCurveTo(width * 0.75, height * 0.72, width, height * 0.78);
      ctx.lineTo(width, height);
      ctx.fill();

      // Telhado Pagoda / Templo Shinobi em Silhueta
      ctx.fillStyle = '#04060a';
      const roofY = height * 0.84;
      ctx.beginPath();
      ctx.moveTo(0, height);
      // Silhueta de telhado japonês com beirais curvos
      ctx.lineTo(0, roofY + 20);
      ctx.quadraticCurveTo(width * 0.2, roofY - 25, width * 0.4, roofY + 15);
      ctx.quadraticCurveTo(width * 0.65, roofY - 35, width * 0.9, roofY + 10);
      ctx.lineTo(width, roofY + 5);
      ctx.lineTo(width, height);
      ctx.fill();

      // Bambus e Galhos de Pinheiro nos cantos
      ctx.strokeStyle = '#040508';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Bambu esquerdo
      ctx.moveTo(30, height);
      ctx.quadraticCurveTo(45, height * 0.5, 35, 0);
      ctx.moveTo(60, height);
      ctx.quadraticCurveTo(55, height * 0.6, 65, 0);
      ctx.stroke();

      // --- NÉVOA DINÂMICA HORIZONTAL ---
      mistLayers.forEach((mist) => {
        mist.x += mist.speed;
        if (mist.x > width) mist.x = -width * 0.5;

        const mistGrad = ctx.createRadialGradient(
          mist.x,
          height * mist.yRatio,
          10,
          mist.x,
          height * mist.yRatio,
          width * 0.6
        );
        mistGrad.addColorStop(0, `rgba(148, 163, 184, ${mist.opacity})`);
        mistGrad.addColorStop(0.8, `rgba(15, 23, 42, ${mist.opacity * 0.4})`);
        mistGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = mistGrad;
        ctx.fillRect(0, height * (mist.yRatio - 0.2), width, height * 0.4);
      });

      // --- NINJA SILHOUETTE DASH (A cada ~12-18 segundos) ---
      if (showNinjaDash) {
        if (!ninjaState.active) {
          ninjaState.timer--;
          if (ninjaState.timer <= 0) {
            ninjaState.active = true;
            ninjaState.x = -60;
            ninjaState.y = height * (Math.random() * 0.15 + 0.72);
            ninjaState.speedX = Math.random() * 4 + 12;
            ninjaState.speedY = -Math.random() * 3 - 1;
            ninjaState.trail = [];
          }
        } else {
          // Atualiza física do salto
          ninjaState.x += ninjaState.speedX;
          ninjaState.y += ninjaState.speedY;
          ninjaState.speedY += 0.08; // Gravidade suave

          // Guarda rastro de sombra
          if (frame % 2 === 0) {
            ninjaState.trail.push({
              x: ninjaState.x,
              y: ninjaState.y,
              alpha: 0.35,
            });
          }

          // Desenha rastro de sombra
          ninjaState.trail.forEach((t) => {
            t.alpha -= 0.02;
            if (t.alpha > 0) {
              ctx.save();
              ctx.fillStyle = `rgba(225, 29, 72, ${t.alpha * 0.4})`;
              ctx.beginPath();
              ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          });
          ninjaState.trail = ninjaState.trail.filter((t) => t.alpha > 0);

          // Desenha Silhueta do Shinobi no ar (vetor estilizado ágil)
          ctx.save();
          ctx.translate(ninjaState.x, ninjaState.y);
          ctx.fillStyle = '#06080e';
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 1.2;

          // Corpo estilizado em pose aerodinâmica
          ctx.beginPath();
          ctx.ellipse(0, 0, 10, 5, Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();
          // Cabeça com fita/bandana
          ctx.beginPath();
          ctx.arc(8, -4, 4, 0, Math.PI * 2);
          ctx.fill();
          // Faixa da testeira esvoaçando
          ctx.beginPath();
          ctx.moveTo(6, -4);
          ctx.quadraticCurveTo(-2, -6 + Math.sin(frame * 0.3) * 3, -12, -8);
          ctx.stroke();

          ctx.restore();

          // Se saiu da tela
          if (ninjaState.x > width + 100) {
            ninjaState.active = false;
            ninjaState.timer = Math.floor(Math.random() * 300 + 400); // 7 a 12 segundos
          }
        }
      }

      // --- PARTÍCULAS DE CHAKRA / BRASAS FLUTUANTES ---
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.angle += p.pulseSpeed;

        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const dynamicAlpha = Math.max(0.1, p.alpha + Math.sin(p.angle) * 0.25);

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = dynamicAlpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- PÉTALAS DE SAKURA NOTURNA AO VENTO ---
      petals.forEach((petal) => {
        petal.swingAngle += petal.swingSpeed;
        petal.rotation += petal.rotSpeed;
        petal.x += petal.speedX + Math.sin(petal.swingAngle) * 0.8;
        petal.y += petal.speedY;

        if (petal.y > height + 20) {
          petal.y = -20;
          petal.x = Math.random() * width;
        }
        if (petal.x > width + 20) {
          petal.x = -20;
        }

        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rotation);
        ctx.globalAlpha = petal.alpha;

        // Desenho da pétala suave
        ctx.fillStyle = '#be123c';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(petal.size, -petal.size * 0.5, petal.size * 1.5, 0);
        ctx.quadraticCurveTo(petal.size, petal.size * 0.5, 0, 0);
        ctx.fill();

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [showNinjaDash]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block transition-opacity duration-1000"
        style={{ opacity }}
      />
      {/* Vinheta escura periférica para focar o conteúdo central */}
      <div className="absolute inset-0 bg-gradient-to-t from-shinobi-bg via-transparent to-shinobi-bg/60 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none opacity-50" />
    </div>
  );
};
