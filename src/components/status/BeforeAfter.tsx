import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { Measure } from '../../core/types';
import {
  MEASURE_PRESETS,
  MeasurePoint,
  MeasurePreset,
  activeMeasures,
  formatMeasureValue,
  summarizeMeasure,
} from '../../core/measures';
import { daysBetween, formatDateBR, getTodayString } from '../../core/dateUtils';
import { SectionHeader, Segmented, Sheet } from '../ui/kit';
import { ArrowRight, Plus, TrendingDown, TrendingUp, X } from 'lucide-react';

const GOAL_OPTIONS: { id: Measure['goal']; label: string }[] = [
  { id: 'down', label: 'Menor é melhor' },
  { id: 'up', label: 'Maior é melhor' },
];

/** Aceita vírgula ou ponto como separador decimal. */
const parseValue = (text: string): number | null => {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(n) ? n : null;
};

const sinceLabel = (date: string, today: string): string => {
  const days = daysBetween(date, today);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
};

/** Linha de tendência mínima: só a forma do caminho, com o primeiro e o último ponto marcados. */
const Sparkline: React.FC<{ points: MeasurePoint[] }> = ({ points }) => {
  if (points.length < 2) return null;
  const width = 96;
  const height = 32;
  const pad = 4;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * (width - pad * 2),
    y: pad + (1 - (p.value - min) / span) * (height - pad * 2),
  }));
  const first = coords[0];
  const last = coords[coords.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden="true">
      <polyline
        points={coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')}
        fill="none"
        stroke="rgb(var(--ink-3))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={first.x} cy={first.y} r="3" fill="rgb(var(--ink-3))" />
      <circle cx={last.x} cy={last.y} r="4" fill="rgb(var(--ink))" stroke="rgb(var(--surface))" strokeWidth="2" />
    </svg>
  );
};

const MeasureCard: React.FC<{ measure: Measure; onOpen: () => void }> = ({ measure, onOpen }) => {
  const today = getTodayString();
  const { points, first, last, delta, improved } = summarizeMeasure(measure);
  const hasComparison = points.length >= 2 && first && last;
  const DeltaIcon = delta > 0 ? TrendingUp : TrendingDown;

  return (
    <button type="button" onClick={onOpen} className="card w-full p-5 text-left block">
      <div className="flex items-center justify-between gap-3">
        <div className="t-label truncate">{measure.label}</div>
        {hasComparison && delta !== 0 && (
          <span className={`inline-flex items-center gap-1 text-[13px] font-semibold tabular shrink-0 ${improved ? 'text-ok' : 'text-ink2'}`}>
            <DeltaIcon className="w-4 h-4" />
            {delta > 0 ? '+' : '−'}
            {formatMeasureValue(Math.abs(delta))} {measure.unit}
          </span>
        )}
      </div>

      {hasComparison ? (
        <div className="flex items-end justify-between gap-3 mt-3.5">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <span className="t-num text-xl text-ink3">{formatMeasureValue(first.value)}</span>
              <ArrowRight className="w-4 h-4 text-ink3 self-center shrink-0" />
              <span className="t-num text-[30px] text-ink">{formatMeasureValue(last.value)}</span>
              <span className="text-sm font-semibold text-ink3">{measure.unit}</span>
            </div>
            <div className="text-[13px] text-ink2 mt-2">
              {sinceLabel(first.date, today)} → {sinceLabel(last.date, today)}
            </div>
          </div>
          <Sparkline points={points} />
        </div>
      ) : last ? (
        <div className="mt-3.5">
          <div className="flex items-baseline gap-2">
            <span className="t-num text-[30px] text-ink">{formatMeasureValue(last.value)}</span>
            <span className="text-sm font-semibold text-ink3">{measure.unit}</span>
          </div>
          <div className="text-[13px] text-ink2 mt-2">Ponto de partida · {sinceLabel(last.date, today)}. Registre de novo para comparar.</div>
        </div>
      ) : (
        <div className="text-[13px] text-ink2 mt-3">Sem registros ainda. Toque para registrar o ponto de partida.</div>
      )}
    </button>
  );
};

/** Painel de uma medida: novo registro, direção da melhora, histórico e exclusão. */
const MeasureSheet: React.FC<{ measure: Measure | null; onClose: () => void }> = ({ measure, onClose }) => {
  const { logMeasure, removeMeasureEntry, updateMeasure, deleteMeasure } = useUserStore();
  const today = getTodayString();
  const [value, setValue] = useState('');
  const [date, setDate] = useState(today);

  if (!measure) return null;
  const points = [...summarizeMeasure(measure).points].reverse();
  const parsed = parseValue(value);

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed === null || !date || date > today) return;
    logMeasure(measure.id, parsed, date);
    setValue('');
    setDate(today);
  };

  const handleDelete = () => {
    if (window.confirm(`Excluir a medida "${measure.label}" e todos os registros dela?`)) {
      deleteMeasure(measure.id);
      onClose();
    }
  };

  return (
    <Sheet isOpen onClose={onClose} title={measure.label} subtitle={`Em ${measure.unit}`}>
      <div className="space-y-6">
        <form onSubmit={handleLog}>
          <div className="t-label mb-2.5">Novo registro</div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Valor em ${measure.unit}`}
              aria-label={`Valor em ${measure.unit}`}
              className="field flex-1 min-w-0"
            />
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Data do registro"
              className="field !w-auto shrink-0"
            />
          </div>
          <button type="submit" disabled={parsed === null} className="btn btn-primary w-full mt-2.5">
            Registrar
          </button>
        </form>

        <div>
          <div className="t-label mb-2.5">O que conta como melhora</div>
          <Segmented options={GOAL_OPTIONS} value={measure.goal} onChange={(goal) => updateMeasure(measure.id, { goal })} />
        </div>

        <div>
          <div className="t-label">Histórico</div>
          {points.length === 0 ? (
            <p className="text-[13px] text-ink2 mt-3">Nenhum registro ainda.</p>
          ) : (
            <ul className="divide-y divide-line">
              {points.map((p) => (
                <li key={p.date} className="flex items-center gap-3 py-2.5">
                  <span className="text-sm text-ink2 tabular flex-1">{formatDateBR(p.date)}</span>
                  <span className="text-[15px] font-semibold text-ink tabular">
                    {formatMeasureValue(p.value)} <span className="font-normal text-ink3">{measure.unit}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMeasureEntry(measure.id, p.date)}
                    className="icon-btn !w-8 !h-8 -mr-2"
                    aria-label={`Remover registro de ${formatDateBR(p.date)}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" onClick={handleDelete} className="btn btn-ghost w-full !text-accent">
          Excluir medida
        </button>
      </div>
    </Sheet>
  );
};

/** Painel para criar uma medida, com sugestões prontas. */
const NewMeasureSheet: React.FC<{ isOpen: boolean; onClose: () => void; preset?: MeasurePreset }> = ({ isOpen, onClose, preset }) => {
  const addMeasure = useUserStore((s) => s.addMeasure);
  const [label, setLabel] = useState(preset?.label || '');
  const [unit, setUnit] = useState(preset?.unit || '');
  const [goal, setGoal] = useState<Measure['goal']>(preset?.goal || 'down');
  const [value, setValue] = useState('');

  const applyPreset = (p: MeasurePreset) => {
    setLabel(p.label);
    setUnit(p.unit);
    setGoal(p.goal);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !unit.trim()) return;
    addMeasure({ label, unit, goal, value: parseValue(value) ?? undefined });
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Nova medida" subtitle="Registre hoje o ponto de partida; o depois vem com o tempo.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5">
          {MEASURE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className={`chip !h-8 ${label === p.label ? 'chip-on' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="O que medir"
            aria-label="Nome da medida"
            className="field flex-1 min-w-0"
            maxLength={40}
            required
          />
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unidade"
            aria-label="Unidade"
            className="field !w-28 shrink-0"
            maxLength={12}
            required
          />
        </div>
        <Segmented options={GOAL_OPTIONS} value={goal} onChange={setGoal} />
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Valor de hoje (ponto de partida)"
          aria-label="Valor de hoje"
          className="field"
        />
        <button type="submit" className="btn btn-primary w-full">
          Criar medida
        </button>
      </form>
    </Sheet>
  );
};

/** "Antes e depois" no Perfil: cada medida mostra de onde saiu e onde está. */
export const BeforeAfterSection: React.FC = () => {
  const measuresMap = useUserStore((s) => s.profile.measures);
  const measures = activeMeasures(measuresMap);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newPreset, setNewPreset] = useState<MeasurePreset | 'blank' | null>(null);
  const openMeasure = openId ? measures.find((m) => m.id === openId) || null : null;

  return (
    <section>
      <SectionHeader title="Antes e depois" meta={measures.length || undefined}>
        <button type="button" onClick={() => setNewPreset('blank')} className="icon-btn !bg-ink !text-bg" aria-label="Nova medida">
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </SectionHeader>

      {measures.length > 0 ? (
        <div className="mt-2 space-y-2.5">
          {measures.map((measure) => (
            <MeasureCard key={measure.id} measure={measure} onOpen={() => setOpenId(measure.id)} />
          ))}
        </div>
      ) : (
        <div className="card mt-2 p-5">
          <p className="text-[15px] font-semibold text-ink">Guarde seu ponto de partida</p>
          <p className="text-[13px] text-ink2 mt-1 leading-snug">
            Registre um número hoje e de novo daqui a algumas semanas. A diferença é a prova de que você mudou.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-4">
            {MEASURE_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setNewPreset(p)} className="chip !h-8 hover:text-ink">
                <Plus className="w-3.5 h-3.5" />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {openMeasure && <MeasureSheet key={openMeasure.id} measure={openMeasure} onClose={() => setOpenId(null)} />}
      {newPreset && (
        <NewMeasureSheet
          key={newPreset === 'blank' ? 'blank' : newPreset.label}
          isOpen
          onClose={() => setNewPreset(null)}
          preset={newPreset === 'blank' ? undefined : newPreset}
        />
      )}
    </section>
  );
};
