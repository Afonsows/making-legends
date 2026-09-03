import React from 'react';
import { PillarId } from '../../theme/types';

interface RadarChartProps {
  stats: Record<PillarId, number>;
  maxStat?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ stats, maxStat = 500 }) => {
  // 5 pilares com ângulos calculados para pentágono regular (72 graus cada)
  const pillars: { id: PillarId; label: string; angle: number; color: string }[] = [
    { id: 'taijutsu', label: 'Taijutsu (Corpo)', angle: -90, color: '#FF1341' },
    { id: 'ninjutsu', label: 'Ninjutsu (Mente)', angle: -18, color: '#06b6d4' },
    { id: 'chakra', label: 'Chakra (Disciplina)', angle: 54, color: '#18F689' },
    { id: 'espirito', label: 'Espírito (Confiança)', angle: 126, color: '#eab308' },
    { id: 'genjutsu', label: 'Genjutsu (Foco)', angle: 198, color: '#8b5cf6' },
  ];

  const size = 260;
  const center = size / 2;
  const radius = 95;

  const getCoordinates = (angleInDegrees: number, distance: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: center + distance * Math.cos(angleInRadians),
      y: center + distance * Math.sin(angleInRadians),
    };
  };

  // Grade poligonal de fundo (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((level) => {
    const points = pillars
      .map((p) => {
        const coord = getCoordinates(p.angle, radius * level);
        return `${coord.x},${coord.y}`;
      })
      .join(' ');
    return points;
  });

  // Polígono dos dados do usuário
  const safeMax = Math.max(100, maxStat);
  const dataPoints = pillars
    .map((p) => {
      const val = stats[p.id] || 0;
      const normalizedRatio = Math.min(1.0, Math.max(0.15, val / safeMax));
      const coord = getCoordinates(p.angle, radius * normalizedRatio);
      return `${coord.x},${coord.y}`;
    })
    .join(' ');

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Círculo de fundo com aura */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="rgba(18, 22, 36, 0.85)"
          stroke="#232b45"
          strokeWidth="1"
        />

        {/* Polígonos de grade */}
        {gridPolygons.map((pts, idx) => (
          <polygon
            key={idx}
            points={pts}
            fill="transparent"
            stroke="rgba(148, 163, 184, 0.15)"
            strokeWidth="1"
            strokeDasharray={idx === 3 ? 'none' : '3 3'}
          />
        ))}

        {/* Linhas dos eixos */}
        {pillars.map((p, idx) => {
          const outerCoord = getCoordinates(p.angle, radius);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={outerCoord.x}
              y2={outerCoord.y}
              stroke="rgba(148, 163, 184, 0.2)"
              strokeWidth="1"
            />
          );
        })}

        {/* Polígono de Chakra do Usuário */}
        <polygon
          points={dataPoints}
          fill="rgba(6, 182, 212, 0.25)"
          stroke="#06b6d4"
          strokeWidth="2.5"
          className="transition-all duration-700 ease-out drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]"
        />

        {/* Vértices destacados com cores de cada pilar */}
        {pillars.map((p, idx) => {
          const val = stats[p.id] || 0;
          const normalizedRatio = Math.min(1.0, Math.max(0.15, val / safeMax));
          const pt = getCoordinates(p.angle, radius * normalizedRatio);
          return (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill={p.color}
              stroke="#0a0c12"
              strokeWidth="2"
              className="drop-shadow-[0_0_6px_currentColor]"
            />
          );
        })}
      </svg>

      {/* Rótulos temáticos em volta do radar */}
      <div className="grid grid-cols-2 gap-2 mt-2 w-full text-xs">
        {pillars.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-2 py-1 bg-shinobi-card/60 rounded border border-shinobi-border/60">
            <span className="flex items-center gap-1 font-medium" style={{ color: p.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.label.split(' ')[0]}
            </span>
            <span className="font-mono text-slate-300 font-bold">{stats[p.id] || 0} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
};
