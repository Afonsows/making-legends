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

    // 1. Estrelas Cintilantes no Céu
    const stars = Array.from({ length: 60 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.6),
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.8 + 0.2,
      pulseSpeed: Math.random() * 0.03 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

    // 2. Brasas Vivas da Fogueira
    const embers = Array.from({ length: 35 }).map(() => ({
      x: 0,
      y: 0,
      size: Math.random() * 2.5 + 1,
      speedX: (Math.random() - 0.5) * 1.2,
      speedY: -Math.random() * 2.5 - 1.2,
      color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
      alpha: Math.random() * 0.9 + 0.3,
      life: Math.random() * 60 + 20,
      maxLife: 80,
    }));

    // 3. Pétalas de Sakura Noturna ao Vento
    const petals = Array.from({ length: 24 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 6 + 4,
      speedX: Math.random() * 1.4 + 0.8,
      speedY: Math.random() * 0.7 + 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      swingAngle: Math.random() * Math.PI * 2,
      swingSpeed: Math.random() * 0.02 + 0.01,
      alpha: Math.random() * 0.45 + 0.2,
    }));

    // 4. Orbes Flutuantes de Chakra
    const chakraMotes = Array.from({ length: 18 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 1.2,
      speedX: (Math.random() - 0.5) * 0.6,
      speedY: -Math.random() * 0.8 - 0.3,
      color: Math.random() > 0.5 ? '#06b6d4' : '#10b981',
      alpha: Math.random() * 0.6 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Posicionamento dinâmico da cena (Fogueira e Shinobi)
      // No desktop: canto inferior esquerdo/centro; no mobile: posicionado estrategicamente na base
      const isMobile = width < 768;
      const groundY = height * 0.88;
      const fireX = isMobile ? width * 0.35 : width * 0.25;
      const fireY = groundY - 10;
      const shinobiX = fireX - (isMobile ? 75 : 95);
      const shinobiY = groundY - 5;

      // ==========================================
      // 1. CÉU NOTURNO & GRADIENTE ATMOSFÉRICO
      // ==========================================
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#05070c');
      skyGrad.addColorStop(0.5, '#0a0d18');
      skyGrad.addColorStop(0.85, '#111628');
      skyGrad.addColorStop(1, '#070911');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Estrelas piscando suavemente
      stars.forEach((star) => {
        const starAlpha = Math.max(0.1, star.alpha + Math.sin(frame * star.pulseSpeed + star.phase) * 0.35);
        ctx.fillStyle = `rgba(226, 232, 240, ${starAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // ==========================================
      // 2. LUA NOVA MÍSTICA (CRESCENT MOON COM AURA)
      // ==========================================
      const moonX = isMobile ? width * 0.8 : width * 0.78;
      const moonY = height * 0.2;
      const moonRadius = Math.min(width, height) * 0.085 + 25;

      // Aura Mística da Lua
      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.3, moonX, moonY, moonRadius * 3);
      moonGlow.addColorStop(0, 'rgba(6, 182, 212, 0.18)');
      moonGlow.addColorStop(0.4, 'rgba(234, 179, 8, 0.08)');
      moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Desenho do Crescente da Lua Mística
      ctx.save();
      ctx.fillStyle = '#fef3c7';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0.2 * Math.PI, 1.8 * Math.PI, false);
      ctx.arc(moonX + moonRadius * 0.45, moonY - moonRadius * 0.1, moonRadius * 0.85, 1.7 * Math.PI, 0.3 * Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // ==========================================
      // 3. MONTANHAS & SILHUETAS DISTANTES
      // ==========================================
      // Cordilheira de montanhas distantes
      ctx.fillStyle = '#070a14';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height * 0.72);
      ctx.quadraticCurveTo(width * 0.25, height * 0.62, width * 0.5, height * 0.7);
      ctx.quadraticCurveTo(width * 0.75, height * 0.64, width, height * 0.68);
      ctx.lineTo(width, height);
      ctx.fill();

      // Silhueta de Torii / Templo na Colina distante
      const toriiX = isMobile ? width * 0.82 : width * 0.65;
      const toriiY = height * 0.67;
      ctx.fillStyle = '#04060b';
      // Pilares do Torii
      ctx.fillRect(toriiX, toriiY, 3, 18);
      ctx.fillRect(toriiX + 16, toriiY, 3, 18);
      // Viga superior curva
      ctx.beginPath();
      ctx.moveTo(toriiX - 5, toriiY + 2);
      ctx.quadraticCurveTo(toriiX + 8, toriiY - 2, toriiX + 24, toriiY + 2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#04060b';
      ctx.stroke();

      // ==========================================
      // 4. SOLO ROCHOSO & ACAMPAMENTO
      // ==========================================
      ctx.fillStyle = '#080c16';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, groundY - 15);
      ctx.quadraticCurveTo(width * 0.4, groundY - 25, width * 0.8, groundY - 10);
      ctx.lineTo(width, groundY);
      ctx.lineTo(width, height);
      ctx.fill();

      // Brilho quente da fogueira refletindo no chão
      const fireFlicker = Math.sin(frame * 0.15) * 8 + Math.cos(frame * 0.28) * 5;
      const fireLightRadius = (isMobile ? 180 : 250) + fireFlicker;
      const fireGlow = ctx.createRadialGradient(fireX, fireY, 10, fireX, fireY, fireLightRadius);
      fireGlow.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
      fireGlow.addColorStop(0.3, 'rgba(234, 179, 8, 0.22)');
      fireGlow.addColorStop(0.7, 'rgba(225, 29, 72, 0.08)');
      fireGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(fireX, fireY, fireLightRadius, 0, Math.PI * 2);
      ctx.fill();

      // Pedras ao redor da fogueira
      ctx.fillStyle = '#181e2e';
      [-22, -12, 0, 14, 24].forEach((offset, idx) => {
        ctx.beginPath();
        ctx.ellipse(fireX + offset, fireY + 12, 8, 4.5, (idx - 2) * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Troncos de madeira cruzados
      ctx.strokeStyle = '#29180c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(fireX - 16, fireY + 8);
      ctx.lineTo(fireX + 16, fireY + 4);
      ctx.moveTo(fireX + 14, fireY + 8);
      ctx.lineTo(fireX - 14, fireY + 3);
      ctx.stroke();

      // ==========================================
      // 5. CHAMAS ANIMADAS DA FOGUEIRA
      // ==========================================
      const flameHeight = 32 + Math.sin(frame * 0.25) * 6 + Math.cos(frame * 0.4) * 4;

      // Chama externa (Vermelho / Carmesim)
      ctx.fillStyle = 'rgba(225, 29, 72, 0.85)';
      ctx.beginPath();
      ctx.moveTo(fireX - 14, fireY + 6);
      ctx.quadraticCurveTo(fireX - 8 + Math.sin(frame * 0.2) * 4, fireY - flameHeight * 0.7, fireX, fireY - flameHeight);
      ctx.quadraticCurveTo(fireX + 8 - Math.cos(frame * 0.2) * 4, fireY - flameHeight * 0.7, fireX + 14, fireY + 6);
      ctx.closePath();
      ctx.fill();

      // Chama média (Laranja quente)
      ctx.fillStyle = 'rgba(249, 115, 22, 0.92)';
      ctx.beginPath();
      ctx.moveTo(fireX - 10, fireY + 6);
      ctx.quadraticCurveTo(fireX - 5 + Math.cos(frame * 0.3) * 3, fireY - flameHeight * 0.6, fireX, fireY - flameHeight * 0.85);
      ctx.quadraticCurveTo(fireX + 5 - Math.sin(frame * 0.3) * 3, fireY - flameHeight * 0.6, fireX + 10, fireY + 6);
      ctx.closePath();
      ctx.fill();

      // Núcleo da chama (Amarelo brilhante / Branco)
      ctx.fillStyle = 'rgba(254, 240, 138, 0.98)';
      ctx.beginPath();
      ctx.moveTo(fireX - 6, fireY + 6);
      ctx.quadraticCurveTo(fireX, fireY - flameHeight * 0.4, fireX, fireY - flameHeight * 0.55);
      ctx.quadraticCurveTo(fireX, fireY - flameHeight * 0.4, fireX + 6, fireY + 6);
      ctx.closePath();
      ctx.fill();

      // ==========================================
      // 6. O SHINOBI (SENTADO DIANTE DO FOGO)
      // ==========================================
      // Respiração suave do Shinobi
      const breathe = Math.sin(frame * 0.05) * 1.5;

      ctx.save();
      ctx.translate(shinobiX, shinobiY);

      // Sombra projetada pelo fogo atrás do Shinobi
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(-15, 5, 30, 8, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Pedra / Tronco onde o Shinobi está apoiado
      ctx.fillStyle = '#0f1422';
      ctx.beginPath();
      ctx.ellipse(-12, 0, 26, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Katana descansando nas costas / bainha apoiada
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-18, -32 + breathe);
      ctx.lineTo(-40, 4);
      ctx.stroke();

      // Cabo da Katana (Tsuka com detalhe de ouro)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, -38 + breathe);
      ctx.lineTo(-18, -32 + breathe);
      ctx.stroke();

      // CORPO DO SHINOBI (Silhueta escura com iluminação de fogo na frente)
      // Pernas cruzadas em meditação
      ctx.fillStyle = '#090d18';
      ctx.beginPath();
      ctx.moveTo(-20, 2);
      ctx.quadraticCurveTo(5, 5, 22, 2);
      ctx.quadraticCurveTo(26, -10, 16, -14);
      ctx.quadraticCurveTo(-5, -12, -22, -8);
      ctx.closePath();
      ctx.fill();

      // Tronco / Túnica Shinobi (com respiração sutil)
      ctx.beginPath();
      ctx.moveTo(-18, -10);
      ctx.quadraticCurveTo(-14, -34 + breathe, -6, -42 + breathe);
      ctx.quadraticCurveTo(12, -40 + breathe, 14, -20);
      ctx.quadraticCurveTo(18, -8, 12, 0);
      ctx.lineTo(-18, 0);
      ctx.closePath();
      ctx.fill();

      // Braços repousados sobre os joelhos olhando para a chama
      ctx.beginPath();
      ctx.moveTo(-8, -26 + breathe);
      ctx.quadraticCurveTo(8, -22 + breathe, 18, -12);
      ctx.quadraticCurveTo(12, -6, 2, -12);
      ctx.closePath();
      ctx.fill();

      // Cabeça / Máscara Shinobi inclinada contemplando o fogo
      ctx.beginPath();
      ctx.arc(2, -48 + breathe, 9.5, 0, Math.PI * 2);
      ctx.fill();

      // Testeira / Faixa Shinobi com pontas esvoaçando com o vento
      ctx.fillStyle = '#060a14';
      ctx.beginPath();
      ctx.ellipse(2, -50 + breathe, 10, 3, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Pontas da fita da testeira flutuando para trás
      const ribbonWave1 = Math.sin(frame * 0.08) * 4;
      const ribbonWave2 = Math.cos(frame * 0.1) * 5;
      ctx.strokeStyle = '#e11d48'; // Fita Carmesim
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-7, -49 + breathe);
      ctx.quadraticCurveTo(-20, -52 + ribbonWave1, -34, -46 + ribbonWave2);
      ctx.moveTo(-7, -48 + breathe);
      ctx.quadraticCurveTo(-18, -44 + ribbonWave2, -30, -38 + ribbonWave1);
      ctx.stroke();

      // ILUMINAÇÃO DE BORDA DA FOGUEIRA NO SHINOBI (Rim Light Quente)
      // Dá contraste e faz o Shinobi ser perfeitamente visível mesmo sendo dark!
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      // Contorno iluminado no peito e joelhos
      ctx.moveTo(12, -46 + breathe);
      ctx.quadraticCurveTo(15, -34 + breathe, 16, -18);
      ctx.quadraticCurveTo(22, -10, 22, 2);
      ctx.stroke();

      // Contorno iluminado no perfil do rosto/máscara
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(2, -48 + breathe, 9.5, -0.3 * Math.PI, 0.4 * Math.PI);
      ctx.stroke();

      ctx.restore();

      // ==========================================
      // 7. BRASAS & FAGULHAS FLUTUANTES DA FOGUEIRA
      // ==========================================
      embers.forEach((emb) => {
        if (emb.life <= 0) {
          emb.x = fireX + (Math.random() - 0.5) * 12;
          emb.y = fireY - 5;
          emb.life = emb.maxLife;
          emb.speedY = -Math.random() * 2.5 - 1.2;
          emb.speedX = (Math.random() - 0.5) * 1.5 + 0.3; // Sopradas levemente pelo vento
        }

        emb.x += emb.speedX;
        emb.y += emb.speedY;
        emb.life--;

        const emberAlpha = (emb.life / emb.maxLife) * emb.alpha;
        ctx.fillStyle = emb.color;
        ctx.globalAlpha = Math.max(0, emberAlpha);
        ctx.shadowColor = emb.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(emb.x, emb.y, emb.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });

      // ==========================================
      // 8. ORBES DE CHAKRA ESPIRITUAL
      // ==========================================
      chakraMotes.forEach((mote) => {
        mote.x += mote.speedX;
        mote.y += mote.speedY;
        mote.pulse += 0.03;

        if (mote.y < -20) mote.y = height + 20;
        if (mote.x < -20) mote.x = width + 20;
        if (mote.x > width + 20) mote.x = -20;

        const dynAlpha = Math.max(0.1, mote.alpha + Math.sin(mote.pulse) * 0.25);
        ctx.save();
        ctx.fillStyle = mote.color;
        ctx.globalAlpha = dynAlpha;
        ctx.shadowColor = mote.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ==========================================
      // 9. PÉTALAS DE SAKURA AO VENTO NOTURNO
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

        // Pétala com curvatura natural
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
      <canvas
        ref={canvasRef}
        className="w-full h-full block transition-opacity duration-1000"
        style={{ opacity }}
      />
      {/* Vinheta escura periférica para manter foco e contraste nos textos do quiz */}
      <div className="absolute inset-0 bg-gradient-to-t from-shinobi-bg/90 via-transparent to-shinobi-bg/60 pointer-events-none" />
    </div>
  );
};
