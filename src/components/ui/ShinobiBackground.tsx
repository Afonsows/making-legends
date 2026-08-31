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

    const isMobile = width < 768;

    // 1. Brasas Vivas e Quentes da Fogueira subindo e espalhando pelo ambiente
    const embersCount = isMobile ? 50 : 90;
    const embers = Array.from({ length: embersCount }).map(() => ({
      x: 0,
      y: 0,
      size: Math.random() * 2.8 + 0.8,
      speedX: (Math.random() - 0.35) * 2.2 + 0.5,
      speedY: -Math.random() * 2.6 - 1.0,
      color: Math.random() > 0.45 ? '#fbbf24' : Math.random() > 0.2 ? '#f97316' : '#ef4444',
      alpha: Math.random() * 0.9 + 0.3,
      life: Math.random() * 80 + 20,
      maxLife: 100,
    }));

    // 2. Orbes de Chakra Espiritual e Sombra Mística (Roxo Solo Leveling, Ciano Shinobi & Dourado)
    const chakraCount = isMobile ? 30 : 55;
    const chakraMotes = Array.from({ length: chakraCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.8 + 1.2,
      speedX: (Math.random() - 0.5) * 0.6 + 0.2,
      speedY: -Math.random() * 0.9 - 0.3,
      color: Math.random() > 0.5 ? '#c084fc' : Math.random() > 0.25 ? '#06b6d4' : '#eab308',
      alpha: Math.random() * 0.65 + 0.25,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.03 + 0.015,
    }));

    // 3. Pétalas de Sakura Noturna ao Vento (Camadas de profundidade / Parallax)
    const petalsCount = isMobile ? 35 : 65;
    const petals = Array.from({ length: petalsCount }).map(() => {
      const isForeground = Math.random() > 0.75;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: isForeground ? Math.random() * 4 + 6 : Math.random() * 3 + 3,
        speedX: (isForeground ? 1.8 : 1.2) + Math.random() * 0.8,
        speedY: (isForeground ? 1.0 : 0.6) + Math.random() * 0.4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        swingAngle: Math.random() * Math.PI * 2,
        swingSpeed: Math.random() * 0.025 + 0.01,
        alpha: isForeground ? Math.random() * 0.4 + 0.4 : Math.random() * 0.3 + 0.2,
        color: Math.random() > 0.3 ? '#e11d48' : '#be123c',
      };
    });

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      const fireX = width * (width < 768 ? 0.35 : 0.33);
      const fireY = height * (width < 768 ? 0.84 : 0.81);

      // ==========================================
      // 1. ILUMINAÇÃO SUTIL DA FOGUEIRA NO AMBIENTE
      // ==========================================
      const fireFlicker = Math.sin(frame * 0.15) * 12 + Math.cos(frame * 0.28) * 8;
      const fireRadius = (width < 768 ? 200 : 280) + fireFlicker;

      const fireGlow = ctx.createRadialGradient(fireX, fireY, 15, fireX, fireY, fireRadius);
      fireGlow.addColorStop(0, 'rgba(251, 146, 60, 0.25)');
      fireGlow.addColorStop(0.3, 'rgba(234, 179, 8, 0.12)');
      fireGlow.addColorStop(0.7, 'rgba(225, 29, 72, 0.04)');
      fireGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(fireX, fireY, fireRadius, 0, Math.PI * 2);
      ctx.fill();

      // ==========================================
      // 2. BRASAS & FAGULHAS VIVAS DA FOGUEIRA
      // ==========================================
      embers.forEach((emb) => {
        if (emb.life <= 0) {
          emb.x = fireX + (Math.random() - 0.5) * 60;
          emb.y = fireY - 10 + (Math.random() - 0.5) * 20;
          emb.life = emb.maxLife;
          emb.speedY = -Math.random() * 2.8 - 1.2;
          emb.speedX = (Math.random() - 0.4) * 2.0 + 0.6;
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
      // 3. ORBES DE CHAKRA ESPIRITUAL PELO AMBIENTE
      // ==========================================
      chakraMotes.forEach((mote) => {
        mote.pulse += mote.pulseSpeed;
        mote.x += mote.speedX;
        mote.y += mote.speedY;

        if (mote.y < -20) {
          mote.y = height + 20;
          mote.x = Math.random() * width;
        }
        if (mote.x > width + 20) {
          mote.x = -20;
        }

        const dynAlpha = Math.max(0.1, mote.alpha + Math.sin(mote.pulse) * 0.25);

        ctx.save();
        ctx.fillStyle = mote.color;
        ctx.globalAlpha = dynAlpha;
        ctx.shadowColor = mote.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ==========================================
      // 4. PÉTALAS DE SAKURA NOTURNA AO VENTO
      // ==========================================
      petals.forEach((petal) => {
        petal.swingAngle += petal.swingSpeed;
        petal.rotation += petal.rotSpeed;
        petal.x += petal.speedX + Math.sin(petal.swingAngle) * 1.1;
        petal.y += petal.speedY;

        if (petal.y > height + 25) {
          petal.y = -25;
          petal.x = Math.random() * width;
        }
        if (petal.x > width + 25) {
          petal.x = -25;
        }

        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rotation);
        ctx.globalAlpha = petal.alpha;

        ctx.fillStyle = petal.color;
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
          filter: 'brightness(0.8) contrast(1.1)',
        }}
      />

      {/* Camada Rica de Pétalas de Sakura, Brasas Vivas e Orbes de Chakra em Loop */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ opacity }}
      />

      {/* Gradiente sutil para manter legibilidade e contraste absoluto dos textos */}
      <div className="absolute inset-0 bg-gradient-to-t from-shinobi-bg/85 via-shinobi-bg/35 to-shinobi-bg/55 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none opacity-30" />
    </div>
  );
};
