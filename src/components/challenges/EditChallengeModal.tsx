import React, { useState } from 'react';
import { useChallengeStore } from '../../state/useChallengeStore';
import { useChallengeView } from '../../state/challengeSelectors';
import { UserChallenge } from '../../core/types';
import { MAX_CHALLENGE_DAYS, MIN_CHALLENGE_DAYS } from '../../core/challenges';
import { getTodayString } from '../../core/dateUtils';
import { Sheet, Switch } from '../ui/kit';

interface EditChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: UserChallenge | null;
}

const DURATIONS = [21, 30, 40, 66, 90];

/** Editar nome, descrição, duração, início e Modo Elite de um desafio. */
export const EditChallengeModal: React.FC<EditChallengeModalProps> = ({ isOpen, onClose, challenge }) => {
  const updateChallenge = useChallengeStore((s) => s.updateChallenge);
  const view = useChallengeView(challenge?.id || null);
  const [title, setTitle] = useState(challenge?.title || '');
  const [description, setDescription] = useState(challenge?.description || '');
  const [days, setDays] = useState(String(challenge?.targetDays || 30));
  const [startDate, setStartDate] = useState(challenge?.startDate || getTodayString());
  const [elite, setElite] = useState(Boolean(challenge?.isEliteMode));
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !challenge || !view) return null;
  const { stats } = view;
  const started = stats.state !== 'scheduled';
  // Ligar o Modo Elite com faltas já registradas encerraria o desafio na hora
  const eliteLocked = !challenge.isEliteMode && stats.daysMissed > 0;

  const save = () => {
    const target = Math.round(Number(days));
    if (!title.trim()) return setError('Dê um nome ao desafio.');
    if (!Number.isFinite(target) || target < MIN_CHALLENGE_DAYS || target > MAX_CHALLENGE_DAYS)
      return setError(`A duração vai de ${MIN_CHALLENGE_DAYS} a ${MAX_CHALLENGE_DAYS} dias.`);
    if (stats.dayNumber > target) return setError(`O desafio já está no dia ${stats.dayNumber}; a duração não pode ser menor.`);
    updateChallenge(challenge.id, {
      title,
      description,
      targetDays: target,
      ...(started ? {} : { startDate }),
      isEliteMode: elite,
    });
    onClose();
  };

  return (
    <Sheet
      isOpen
      onClose={onClose}
      title="Editar desafio"
      subtitle={challenge.title}
      zIndex={130}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
            Cancelar
          </button>
          <button type="button" onClick={save} className="btn btn-primary flex-1">
            Salvar
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <label className="block">
          <span className="t-label">Nome</span>
          <input className="field mt-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className="t-label">Descrição</span>
          <input
            className="field mt-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
          />
        </label>
        <div>
          <span className="t-label">Duração</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(String(d))}
                className={`chip ${Number(days) === d ? 'chip-on' : ''}`}
              >
                {d} dias
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              min={MIN_CHALLENGE_DAYS}
              max={MAX_CHALLENGE_DAYS}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="field !w-24 !h-9"
              aria-label="Duração em dias"
            />
          </div>
        </div>
        {!started && (
          <label className="block">
            <span className="t-label">Início</span>
            <input type="date" className="field mt-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
        )}
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-ink">Modo Elite</div>
            <p className="text-[13px] text-ink2 mt-0.5 leading-snug">
              {eliteLocked
                ? 'Só pode ser ligado em um desafio sem faltas.'
                : '+20% de XP, sem Escudo de Chakra, e qualquer falta encerra o desafio.'}
            </p>
          </div>
          <Switch checked={elite} label="Modo Elite" onChange={(next) => (!eliteLocked || !next) && setElite(next)} />
        </div>
        {error && <p className="text-[13px] text-accent">{error}</p>}
      </div>
    </Sheet>
  );
};
