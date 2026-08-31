import React, { useEffect, useRef } from 'react';

interface ShinobiBackgroundProps {
  opacity?: number;
}

export const ShinobiBackground: React.FC<ShinobiBackgroundProps> = ({ opacity = 1 }) => {
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

    // 1. Brasas Vivas Subindo da Fogueira
    const embersCount = width < 768 ? 25 : 45;
    const embers = Array.from({ length: embersCount }).map(() => ({
      x: 0,
      y: 0,
      size: Math.random() * 2.8 + 1,
      speedX: (Math.random() - 0.5) * 1.6 + 0.3,
      speedY: -Math.random() * 2.5 - 1.2,
      color: Math.random() > 0.4 ? '#f59e0b' : Math.random() > 0.2 ? '#ef4444' : '#fbbf24',
      alpha: Math.random() * 0.9 + 0.3,
      life: Math.random() * 70 + 20,
      maxLife: 90,
    }));

    // 2. Fagulhas de Chakra Roxo / Sombra Mística (Estilo Solo Leveling / Shinobi)
    const purpleWisps = Array.from({ length: 22 }).map(() => ({
      x: 0,
      y: 0,
      size: Math.random() * 3.5 + 1.5,
      speedX: (Math.random() - 0.5) * 0.8 + 0.2,
      speedY: -Math.random() * 1.2 - 0.4,
      color: Math.random() > 0.5 ? '#a855f7' : '#c084fc',
      alpha: Math.random() * 0.7 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    // 3. Pétalas de Sakura Noturna ao Vento
    const petals = Array.from({ length: 24 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 5 + 3.5,
      speedX: Math.random() * 1.5 + 0.7,
      speedY: Math.random() * 0.8 + 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      swingAngle: Math.random() * Math.PI * 2,
      swingSpeed: Math.random() * 0.02 + 0.01,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Localização aproximada da fogueira e do shinobi na imagem de fundo
      const isMobile = width < 768;
      const fireX = width * (isMobile ? 0.35 : 0.33);
      const fireY = height * (isMobile ? 0.85 : 0.82);
      const shinobiX = width * (isMobile ? 0.65 : 0.62);
      const shinobiY = height * (isMobile ? 0.62 : 0.58);

      // ==========================================
      // 1. ILUMINAÇÃO DINÂMICA DA FOGUEIRA
      // ==========================================
      const fireFlicker = Math.sin(frame * 0.2) * 12 + Math.cos(frame * 0.35) * 8;
      const fireRadius = (isMobile ? 180 : 260) + fireFlicker;

      const fireGlow = ctx.createRadialGradient(fireX, fireY, 15, fireX, fireY, fireRadius);
      fireGlow.addColorStop(0, 'rgba(251, 146, 60, 0.22)');
      fireGlow.addColorStop(0.35, 'rgba(234, 179, 8, 0.12)');
      fireGlow.addColorStop(0.7, 'rgba(225, 29, 72, 0.04)');
      fireGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(fireX, fireY, fireRadius, 0, Math.PI * 2);
      ctx.fill();

      // ==========================================
      // 2. BRASAS & FAGULHAS DA FOGUEIRA
      // ==========================================
      embers.forEach((emb) => {
        if (emb.life <= 0) {
          emb.x = fireX + (Math.random() - 0.5) * 50;
          emb.y = fireY - 10 + (Math.random() - 0.5) * 20;
          emb.life = emb.maxLife;
          emb.speedY = -Math.random() * 2.8 - 1.2;
          emb.speedX = (Math.random() - 0.5) * 1.5 + 0.4;
        }

        emb.x += emb.speedX;
        emb.y += emb.speedY;
        emb.life--;

        const emberAlpha = (emb.life / emb.maxLife) * emb.alpha;
        ctx.fillStyle = emb.color;
        ctx.globalAlpha = Math.max(0, emberAlpha);
        ctx.shadowColor = emb.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(emb.x, emb.y, emb.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });

      // ==========================================
      // 3. AURA DE CHAKRA ROXO / SOMBRA FLUTUANTE
      // ==========================================
      purpleWisps.forEach((wisp, idx) => {
        wisp.pulse += 0.03;
        const radiusOffset = 45 + (idx % 5) * 15;
        const angle = frame * 0.02 + idx;

        const wx = shinobiX + Math.cos(angle) * radiusOffset;
        const wy = shinobiY + Math.sin(angle) * (radiusOffset * 0.8) - 15;

        const dynAlpha = Math.max(0.05, wisp.alpha + Math.sin(wisp.pulse) * 0.2);

        ctx.save();
        ctx.fillStyle = wisp.color;
        ctx.globalAlpha = dynAlpha;
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(wx, wy, wisp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ==========================================
      // 4. PÉTALAS DE SAKURA NOTURNA AO VENTO
      // ==========================================
      petals.forEach((petal) => {
        petal.swingAngle += petal.swingSpeed;
        petal.rotation += petal.rotSpeed;
        petal.x += petal.speedX + Math.sin(petal.swingAngle) * 0.9;
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

        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(petal.size, -petal.size * 0.6, petal.size * 1.5, 0);
        ctx.quadraticCurveTo(petal.size, petal.size * 0.6, 0, 0);
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
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Imagem de Fundo Anime em Alta Resolução */}
      <div 
        className="absolute inset-0 bg-cover bg-center sm:bg-[center_top] transform scale-105 transition-transform duration-1000"
        style={{
          backgroundImage: `url('/images/shinobi-campfire-anime.jpg')`,
          filter: 'brightness(0.72) contrast(1.1)',
        }}
      />

      {/* Camada de Partículas & Fogo Animado em Loop */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ opacity }}
      />

      {/* Gradiente sutil para garantir legibilidade dos textos centrais */}
      <div className="absolute inset-0 bg-gradient-to-t from-shinobi-bg via-shinobi-bg/40 to-shinobi-bg/60 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none opacity-40" />
    </div>
  );
};
