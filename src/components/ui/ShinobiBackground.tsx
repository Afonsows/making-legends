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

    // 1. Estrelas
    const stars = Array.from({ length: 65 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.65),
      radius: Math.random() * 1.4 + 0.4,
      alpha: Math.random() * 0.8 + 0.2,
      pulseSpeed: Math.random() * 0.03 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

    // 2. Brasas Vivas da Fogueira
    const embers = Array.from({ length: 40 }).map(() => ({
      x: 0,
      y: 0,
      size: Math.random() * 2.8 + 1,
      speedX: (Math.random() - 0.5) * 1.5,
      speedY: -Math.random() * 2.8 - 1.4,
      color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
      alpha: Math.random() * 0.9 + 0.3,
      life: Math.random() * 70 + 20,
      maxLife: 90,
    }));

    // 3. Pétalas de Sakura Noturna ao Vento
    const petals = Array.from({ length: 26 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 6 + 4,
      speedX: Math.random() * 1.5 + 0.8,
      speedY: Math.random() * 0.8 + 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      swingAngle: Math.random() * Math.PI * 2,
      swingSpeed: Math.random() * 0.02 + 0.01,
      alpha: Math.random() * 0.45 + 0.2,
    }));

    // 4. Orbes Flutuantes de Chakra
    const chakraMotes = Array.from({ length: 20 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 1.2,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: -Math.random() * 0.7 - 0.3,
      color: Math.random() > 0.5 ? '#06b6d4' : '#10b981',
      alpha: Math.random() * 0.55 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      const isMobile = width < 768;
      const groundY = height * 0.88;
      
      // Posição da Fogueira e do Shinobi (claramente visíveis e posicionados harmonicamente)
      const fireX = isMobile ? width * 0.55 : width * 0.38;
      const fireY = groundY - 8;
      const shinobiX = fireX - (isMobile ? 100 : 130);
      const shinobiY = groundY - 15;

      // ==========================================
      // 1. CÉU NOTURNO PROFUNDO
      // ==========================================
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#04060b');
      skyGrad.addColorStop(0.45, '#080c18');
      skyGrad.addColorStop(0.85, '#0f1424');
      skyGrad.addColorStop(1, '#05070e');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Estrelas cintilantes
      stars.forEach((star) => {
        const starAlpha = Math.max(0.1, star.alpha + Math.sin(frame * star.pulseSpeed + star.phase) * 0.35);
        ctx.fillStyle = `rgba(226, 232, 240, ${starAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // ==========================================
      // 2. LUA REALISTA COM CRATERAS & AURA
      // ==========================================
      const moonX = isMobile ? width * 0.82 : width * 0.78;
      const moonY = height * 0.22;
      const moonRadius = Math.min(width, height) * 0.08 + 32;

      // Aura Eterea Externa da Lua
      const moonOuterGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.8, moonX, moonY, moonRadius * 2.8);
      moonOuterGlow.addColorStop(0, 'rgba(219, 234, 254, 0.22)');
      moonOuterGlow.addColorStop(0.4, 'rgba(147, 197, 253, 0.08)');
      moonOuterGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = moonOuterGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Disco Principal da Lua
      const moonDisk = ctx.createRadialGradient(
        moonX - moonRadius * 0.3,
        moonY - moonRadius * 0.3,
        moonRadius * 0.1,
        moonX,
        moonY,
        moonRadius
      );
      moonDisk.addColorStop(0, '#ffffff');
      moonDisk.addColorStop(0.4, '#f8fafc');
      moonDisk.addColorStop(0.75, '#e2e8f0');
      moonDisk.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = moonDisk;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fill();

      // Crateras e Mares Lunares (Textura Realista Suave)
      ctx.save();
      ctx.clip(); // Limita as crateras ao círculo da lua

      const craters = [
        { x: moonX - moonRadius * 0.25, y: moonY - moonRadius * 0.15, rx: moonRadius * 0.28, ry: moonRadius * 0.22, rot: 0.3, opacity: 0.15 },
        { x: moonX + moonRadius * 0.35, y: moonY - moonRadius * 0.1, rx: moonRadius * 0.24, ry: moonRadius * 0.35, rot: -0.2, opacity: 0.18 },
        { x: moonX - moonRadius * 0.1, y: moonY + moonRadius * 0.4, rx: moonRadius * 0.32, ry: moonRadius * 0.2, rot: 0.1, opacity: 0.14 },
        { x: moonX + moonRadius * 0.2, y: moonY + moonRadius * 0.3, rx: moonRadius * 0.18, ry: moonRadius * 0.15, rot: 0.4, opacity: 0.16 },
        { x: moonX - moonRadius * 0.4, y: moonY + moonRadius * 0.1, rx: moonRadius * 0.12, ry: moonRadius * 0.12, rot: 0, opacity: 0.12 },
      ];

      craters.forEach((c) => {
        ctx.fillStyle = `rgba(100, 116, 139, ${c.opacity})`;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx, c.ry, c.rot, 0, Math.PI * 2);
        ctx.fill();
      });

      // Névoa translúcida sutil cruzando a lua
      const cloudOffset = (frame * 0.15) % (width + 200);
      const cloudGrad = ctx.createLinearGradient(moonX - moonRadius, moonY, moonX + moonRadius, moonY);
      cloudGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
      cloudGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.25)');
      cloudGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = cloudGrad;
      ctx.fillRect(moonX - moonRadius * 1.5, moonY - moonRadius * 0.3, moonRadius * 3, moonRadius * 0.6);

      ctx.restore();

      // ==========================================
      // 3. MONTANHAS & HORIZONTE
      // ==========================================
      ctx.fillStyle = '#060912';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height * 0.73);
      ctx.quadraticCurveTo(width * 0.3, height * 0.62, width * 0.55, height * 0.7);
      ctx.quadraticCurveTo(width * 0.8, height * 0.64, width, height * 0.69);
      ctx.lineTo(width, height);
      ctx.fill();

      // ==========================================
      // 4. SOLO & ILUMINAÇÃO DA FOGUEIRA
      // ==========================================
      ctx.fillStyle = '#080c16';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, groundY - 15);
      ctx.quadraticCurveTo(width * 0.4, groundY - 20, width * 0.8, groundY - 8);
      ctx.lineTo(width, groundY);
      ctx.lineTo(width, height);
      ctx.fill();

      // Pulso dinâmico de luz da fogueira refletindo no ambiente
      const fireFlicker = Math.sin(frame * 0.18) * 10 + Math.cos(frame * 0.32) * 6;
      const fireLightRadius = (isMobile ? 220 : 320) + fireFlicker;
      const fireGlow = ctx.createRadialGradient(fireX, fireY, 15, fireX, fireY, fireLightRadius);
      fireGlow.addColorStop(0, 'rgba(249, 115, 22, 0.55)');
      fireGlow.addColorStop(0.25, 'rgba(234, 179, 8, 0.28)');
      fireGlow.addColorStop(0.65, 'rgba(225, 29, 72, 0.1)');
      fireGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(fireX, fireY, fireLightRadius, 0, Math.PI * 2);
      ctx.fill();

      // Pedras ao redor da fogueira
      ctx.fillStyle = '#1c2438';
      [-26, -14, 0, 16, 28].forEach((offset, idx) => {
        ctx.beginPath();
        ctx.ellipse(fireX + offset, fireY + 14, 9, 5, (idx - 2) * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Troncos de madeira cruzados
      ctx.strokeStyle = '#2d1b0f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(fireX - 20, fireY + 10);
      ctx.lineTo(fireX + 20, fireY + 4);
      ctx.moveTo(fireX + 18, fireY + 10);
      ctx.lineTo(fireX - 18, fireY + 3);
      ctx.stroke();

      // ==========================================
      // 5. CHAMAS VIVAS DA FOGUEIRA
      // ==========================================
      const flameH = 38 + Math.sin(frame * 0.28) * 8 + Math.cos(frame * 0.45) * 5;

      // Chama externa (Vermelho Carmesim)
      ctx.fillStyle = 'rgba(225, 29, 72, 0.9)';
      ctx.beginPath();
      ctx.moveTo(fireX - 16, fireY + 8);
      ctx.quadraticCurveTo(fireX - 10 + Math.sin(frame * 0.2) * 5, fireY - flameH * 0.75, fireX, fireY - flameH);
      ctx.quadraticCurveTo(fireX + 10 - Math.cos(frame * 0.2) * 5, fireY - flameH * 0.75, fireX + 16, fireY + 8);
      ctx.closePath();
      ctx.fill();

      // Chama intermediária (Laranja Fogo)
      ctx.fillStyle = 'rgba(249, 115, 22, 0.95)';
      ctx.beginPath();
      ctx.moveTo(fireX - 12, fireY + 8);
      ctx.quadraticCurveTo(fireX - 6 + Math.cos(frame * 0.3) * 4, fireY - flameH * 0.65, fireX, fireY - flameH * 0.88);
      ctx.quadraticCurveTo(fireX + 6 - Math.sin(frame * 0.3) * 4, fireY - flameH * 0.65, fireX + 12, fireY + 8);
      ctx.closePath();
      ctx.fill();

      // Núcleo brilhante (Dourado / Branco)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(fireX - 7, fireY + 8);
      ctx.quadraticCurveTo(fireX, fireY - flameH * 0.45, fireX, fireY - flameH * 0.6);
      ctx.quadraticCurveTo(fireX, fireY - flameH * 0.45, fireX + 7, fireY + 8);
      ctx.closePath();
      ctx.fill();

      // ==========================================
      // 6. SHINOBI DETALHADO (ESTILO ANIME COM COLETE TÁTICO & ILUMINAÇÃO)
      // ==========================================
      const breathe = Math.sin(frame * 0.05) * 2;
      const scale = isMobile ? 1.15 : 1.35; // Escala bem visível

      ctx.save();
      ctx.translate(shinobiX, shinobiY);
      ctx.scale(scale, scale);

      // Sombra projetada no chão
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.ellipse(-15, 8, 35, 10, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Pedra onde está sentado
      ctx.fillStyle = '#141a29';
      ctx.beginPath();
      ctx.ellipse(-15, 2, 28, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Katana / Bainha apoiada ao lado
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-22, -35 + breathe);
      ctx.lineTo(-44, 6);
      ctx.stroke();

      // Cabo da Katana (Tsuka com enrolamento dourado)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-18, -42 + breathe);
      ctx.lineTo(-22, -35 + breathe);
      ctx.stroke();

      // PERNAS CRUZADAS / CALÇA ESCURA
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-24, 4);
      ctx.quadraticCurveTo(8, 7, 26, 4);
      ctx.quadraticCurveTo(28, -8, 18, -12);
      ctx.quadraticCurveTo(-6, -10, -26, -6);
      ctx.closePath();
      ctx.fill();

      // Faixas brancas nos tornozelos (Bandagens Shinobi)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(16, -4, 9, 6);
      ctx.fillRect(-22, -4, 9, 6);

      // COLETE TÁTICO SHINOBI (Verde Oliva / Cinza Tático estilo Jounin)
      const vestColor = '#27382b';
      const vestShadow = '#18241c';
      const vestHighlight = '#45614c';

      // Base do Tronco com Colete
      ctx.fillStyle = vestColor;
      ctx.beginPath();
      ctx.moveTo(-20, -8);
      ctx.quadraticCurveTo(-16, -38 + breathe, -6, -46 + breathe);
      ctx.quadraticCurveTo(14, -44 + breathe, 16, -20);
      ctx.quadraticCurveTo(20, -6, 14, 2);
      ctx.lineTo(-20, 2);
      ctx.closePath();
      ctx.fill();

      // Gola Alta Acolchoada do Colete Tático
      ctx.fillStyle = vestShadow;
      ctx.beginPath();
      ctx.moveTo(-12, -44 + breathe);
      ctx.lineTo(-4, -58 + breathe);
      ctx.lineTo(12, -54 + breathe);
      ctx.lineTo(8, -40 + breathe);
      ctx.closePath();
      ctx.fill();

      // Detalhe da borda da gola iluminada pelo fogo
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -40 + breathe);
      ctx.lineTo(12, -54 + breathe);
      ctx.stroke();

      // Bolsos Utilitários Frontais no Colete (Pouches)
      ctx.fillStyle = vestHighlight;
      // Bolso 1
      ctx.fillRect(4, -28 + breathe, 6, 10);
      ctx.strokeStyle = '#18241c';
      ctx.lineWidth = 1;
      ctx.strokeRect(4, -28 + breathe, 6, 10);
      // Bolso 2
      ctx.fillRect(11, -28 + breathe, 6, 10);
      ctx.strokeRect(11, -28 + breathe, 6, 10);

      // Zíper Central
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(2, -42 + breathe);
      ctx.lineTo(2, -10 + breathe);
      ctx.stroke();

      // BRAÇOS E MANGAS ESCURAS
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-8, -32 + breathe);
      ctx.quadraticCurveTo(10, -28 + breathe, 20, -14);
      ctx.quadraticCurveTo(14, -6, 2, -14);
      ctx.closePath();
      ctx.fill();

      // Luvas Shinobi com placa de metal
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(18, -12 + breathe, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(16, -14 + breathe, 4, 3); // Placa de ferro na luva

      // CABEÇA & ROSTO
      const headX = 2;
      const headY = -56 + breathe;

      // Pele do rosto
      ctx.fillStyle = '#e2b18a';
      ctx.beginPath();
      ctx.arc(headX, headY, 11, 0, Math.PI * 2);
      ctx.fill();

      // Olhos concentrados olhando calmamente para o fogo
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(headX + 4, headY - 1, 2.5, 1.2, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Sobrancelha estilizada
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(headX + 1, headY - 4);
      ctx.lineTo(headX + 7, headY - 3);
      ctx.stroke();

      // MÁSCARA SHINOBI (cobrindo do nariz até o pescoço)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(headX - 4, headY + 1);
      ctx.quadraticCurveTo(headX + 6, headY + 1, headX + 9, headY + 3);
      ctx.lineTo(headX + 7, headY + 12);
      ctx.lineTo(headX - 6, headY + 10);
      ctx.closePath();
      ctx.fill();

      // CABELO ESPETADO ESTILO ANIME (Prateado / Cinza Claro)
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      // Mechas espetadas dinâmicas
      ctx.moveTo(headX - 10, headY - 4);
      ctx.lineTo(headX - 18, headY - 12);
      ctx.lineTo(headX - 11, headY - 14);
      ctx.lineTo(headX - 16, headY - 24);
      ctx.lineTo(headX - 6, headY - 20);
      ctx.lineTo(headX - 4, headY - 30);
      ctx.lineTo(headX + 4, headY - 24);
      ctx.lineTo(headX + 12, headY - 28);
      ctx.lineTo(headX + 10, headY - 18);
      ctx.lineTo(headX + 18, headY - 16);
      ctx.lineTo(headX + 10, headY - 8);
      ctx.lineTo(headX + 14, headY + 2);
      ctx.lineTo(headX + 6, headY - 6);
      ctx.lineTo(headX - 2, headY - 6);
      ctx.closePath();
      ctx.fill();

      // Detalhes de sombra no cabelo
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(headX - 10, headY - 4);
      ctx.lineTo(headX - 14, headY - 16);
      ctx.lineTo(headX - 6, headY - 14);
      ctx.closePath();
      ctx.fill();

      // TESTEIRA SHINOBI (Faixa escura com placa protetora metálica)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(headX + 1, headY - 6, 11, 3.5, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Placa de ferro metálica na testeira
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(headX + 3, headY - 6, 5, 2.2, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Fita da testeira flutuando para trás no vento
      const ribbon1 = Math.sin(frame * 0.08) * 5;
      const ribbon2 = Math.cos(frame * 0.11) * 6;
      ctx.strokeStyle = '#e11d48'; // Carmesim
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(headX - 9, headY - 6);
      ctx.quadraticCurveTo(headX - 22, headY - 8 + ribbon1, headX - 38, headY - 4 + ribbon2);
      ctx.moveTo(headX - 9, headY - 5);
      ctx.quadraticCurveTo(headX - 20, headY - 2 + ribbon2, headX - 34, headY + 3 + ribbon1);
      ctx.stroke();

      // ILUMINAÇÃO CEL-SHADING DA FOGUEIRA NO SHINOBI (Brilho Quente Alaranjado)
      // Destaque nítido e visível no perfil frontal, colete e mechas do cabelo
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.9)'; // Amarelo Dourado
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      // Borda do queixo e máscara iluminada
      ctx.moveTo(headX + 5, headY + 2);
      ctx.lineTo(headX + 9, headY + 6);
      ctx.lineTo(headX + 8, headY + 12);
      // Borda frontal do colete
      ctx.moveTo(14, -40 + breathe);
      ctx.quadraticCurveTo(18, -25 + breathe, 20, -10);
      ctx.lineTo(24, 2);
      ctx.stroke();

      // Brilho alaranjado nas mechas frontais do cabelo
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(headX + 4, headY - 24);
      ctx.lineTo(headX + 12, headY - 28);
      ctx.lineTo(headX + 10, headY - 18);
      ctx.lineTo(headX + 18, headY - 16);
      ctx.stroke();

      ctx.restore();

      // ==========================================
      // 7. BRASAS & FAGULHAS FLUTUANTES DA FOGUEIRA
      // ==========================================
      embers.forEach((emb) => {
        if (emb.life <= 0) {
          emb.x = fireX + (Math.random() - 0.5) * 14;
          emb.y = fireY - 6;
          emb.life = emb.maxLife;
          emb.speedY = -Math.random() * 2.8 - 1.4;
          emb.speedX = (Math.random() - 0.5) * 1.8 + 0.4;
        }

        emb.x += emb.speedX;
        emb.y += emb.speedY;
        emb.life--;

        const emberAlpha = (emb.life / emb.maxLife) * emb.alpha;
        ctx.fillStyle = emb.color;
        ctx.globalAlpha = Math.max(0, emberAlpha);
        ctx.shadowColor = emb.color;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(emb.x, emb.y, emb.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });

      // ==========================================
      // 8. ORBES ESPIRITUAIS DE CHAKRA
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
      // 9. PÉTALAS DE SAKURA NOTURNA AO VENTO
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
      <canvas
        ref={canvasRef}
        className="w-full h-full block transition-opacity duration-1000"
        style={{ opacity }}
      />
      {/* Vinheta escura periférica para manter legibilidade sem ofuscar o shinobi */}
      <div className="absolute inset-0 bg-gradient-to-t from-shinobi-bg/80 via-transparent to-shinobi-bg/50 pointer-events-none" />
    </div>
  );
};
