import React, { useEffect, useMemo, useState } from 'react';
import { useChallengeStore, HabitDraft } from '../../state/useChallengeStore';
import { useHabitStore, getRankRewards } from '../../state/useHabitStore';
import { useUserStore } from '../../state/useUserStore';
import { useChallengeViews, useLooseMissions } from '../../state/challengeSelectors';
import { useTheme } from '../../theme/ThemeContext';
import { BOARD_TEMPLATES } from '../../core/board';
import { MAX_CHALLENGE_DAYS, MIN_CHALLENGE_DAYS, getChallengeCompletionReward } from '../../core/challenges';
import { addDaysToDateString, getTodayString } from '../../core/dateUtils';
import { Mission } from '../../core/types';
import { MissionRank, PillarId } from '../../theme/types';
import { Segmented, Sheet, Switch, pillarColor } from '../ui/kit';
import { Plus, X } from 'lucide-react';

const DURATIONS = [21, 30, 40, 66, 90];
const PILLARS: PillarId[] = ['taijutsu', 'ninjutsu', 'chakra', 'espirito', 'genjutsu'];
const RANKS: MissionRank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

const draftFrom = (m: Mission): HabitDraft => ({
  title: m.title,
  description: m.description,
  pillarId: m.pillarId,
  rank: m.rank,
  xpReward: m.xpReward,
  ryoReward: m.ryoReward,
  timeOfDay: m.timeOfDay,
  isCustom: true,
});

const newDraft = (title: string, pillarId: PillarId, rank: MissionRank): HabitDraft => {
  const r = getRankRewards(rank);
  return { title, pillarId, rank, xpReward: r.xp, ryoReward: r.ryo, timeOfDay: 'anytime', isCustom: true };
};

/**
 * Novo desafio. Desafio de hábitos (o padrão) ou quadro de operação.
 * Os hábitos podem vir de outro desafio (copiados) ou dos avulsos (passam a pertencer a este).
 */
export const CreateChallengeModal: React.FC = () => {
  const { isStartChallengeModalOpen: isOpen, startChallengeSource, closeStartChallengeModal } = useUserStore();
  const { createChallenge, createBoardChallenge } = useChallengeStore();
  const missions = useHabitStore((s) => s.missions);
  const { all } = useChallengeViews();
  const loose = useLooseMissions();
  const { getPillar } = useTheme();

  const today = getTodayString();
  const [kind, setKind] = useState<'habits' | 'board'>('habits');
  const [title, setTitle] = useState('');
  const [days, setDays] = useState('30');
  const [startMode, setStartMode] = useState<'today' | 'date'>('today');
  const [startDate, setStartDate] = useState(today);
  const [elite, setElite] = useState(false);
  const [source, setSource] = useState<string>('new');
  const [drafts, setDrafts] = useState<HabitDraft[]>([]);
  const [moveIds, setMoveIds] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPillar, setNewPillar] = useState<PillarId>('chakra');
  const [newRank, setNewRank] = useState<MissionRank>('D');
  const [error, setError] = useState<string | null>(null);

  // Origens possíveis dos hábitos: desafios com hábitos e os avulsos
  const sources = useMemo(
    () => [
      { id: 'new', label: 'Começar do zero' },
      ...(loose.length > 0 ? [{ id: 'loose', label: `Avulsos (${loose.length})` }] : []),
      ...all
        .filter((v) => v.challenge.format !== 'board' && v.habits.length > 0)
        .map((v) => ({ id: v.challenge.id, label: v.challenge.title })),
    ],
    [all, loose.length]
  );

  const applySource = (id: string) => {
    setSource(id);
    if (id === 'loose') {
      setDrafts([]);
      setMoveIds(loose.map((m) => m.id));
      return;
    }
    setMoveIds([]);
    const from = all.find((v) => v.challenge.id === id);
    setDrafts(from ? from.habits.map(draftFrom) : []);
    if (from) {
      setDays(String(from.challenge.targetDays));
      setElite(Boolean(from.challenge.isEliteMode));
    }
  };

  // Ao abrir: limpa e aplica a origem pedida (fim de um desafio, primeiro acesso…)
  useEffect(() => {
    if (!isOpen) return;
    setKind('habits');
    setTitle('');
    setDays('30');
    setStartMode('today');
    setStartDate(today);
    setElite(false);
    setError(null);
    setNewTitle('');
    applySource(startChallengeSource && sources.some((s) => s.id === startChallengeSource) ? startChallengeSource : 'new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const target = Math.round(Number(days));
  const reward = getChallengeCompletionReward(Number.isFinite(target) ? target : 0);
  const moved = missions.filter((m) => moveIds.includes(m.id));
  const total = drafts.length + moved.length;

  const addDraft = () => {
    if (!newTitle.trim()) return;
    setDrafts((list) => [...list, newDraft(newTitle.trim(), newPillar, newRank)]);
    setNewTitle('');
  };

  const submit = () => {
    if (!Number.isFinite(target) || target < MIN_CHALLENGE_DAYS || target > MAX_CHALLENGE_DAYS)
      return setError(`A duração vai de ${MIN_CHALLENGE_DAYS} a ${MAX_CHALLENGE_DAYS} dias.`);
    const res = createChallenge({
      title: title.trim() || `Desafio ${target} dias`,
      targetDays: target,
      startDate: startMode === 'today' ? today : startDate,
      isEliteMode: elite,
      habits: drafts,
      moveMissionIds: moveIds,
    });
    if (!res.success) return setError(res.error || 'Não foi possível criar o desafio.');
    closeStartChallengeModal();
  };

  return (
    <Sheet
      isOpen
      onClose={closeStartChallengeModal}
      title="Novo desafio"
      subtitle="Ele roda junto com os que já estão em andamento"
      zIndex={110}
      footer={
        kind === 'habits' ? (
          <button type="button" onClick={submit} className="btn btn-primary w-full">
            Começar desafio · {total} {total === 1 ? 'hábito' : 'hábitos'}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <Segmented
          options={[
            { id: 'habits', label: 'Hábitos' },
            { id: 'board', label: 'Quadro de operação' },
          ]}
          value={kind}
          onChange={setKind}
        />

        {kind === 'board' ? (
          <div className="space-y-2.5">
            <p className="text-[13px] text-ink2 leading-snug">
              Para rotinas com muitas tarefas por dia: seções em lista ou tabela que se fecham sozinhas. Começa hoje e é todo editável.
            </p>
            {BOARD_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  createBoardChallenge(t.id);
                  closeStartChallengeModal();
                }}
                className="card w-full p-4 text-left hover:border-ink3"
              >
                <span className="block text-[15px] font-semibold text-ink">
                  {t.icon} {t.title}
                </span>
                <span className="block text-[13px] text-ink2 mt-1 leading-snug">{t.subtitle}</span>
                <span className="block text-xs text-ink3 mt-2 tabular">{t.targetDays} dias · começa hoje</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <label className="block">
              <span className="t-label">Nome</span>
              <input
                className="field mt-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Desafio ${Number.isFinite(target) ? target : 30} dias`}
              />
            </label>

            <div>
              <span className="t-label">Duração</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {DURATIONS.map((d) => (
                  <button key={d} type="button" onClick={() => setDays(String(d))} className={`chip ${target === d ? 'chip-on' : ''}`}>
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

            <div>
              <span className="t-label">Início</span>
              <Segmented
                className="mt-2"
                options={[
                  { id: 'today', label: 'Hoje' },
                  { id: 'date', label: 'Escolher data' },
                ]}
                value={startMode}
                onChange={setStartMode}
              />
              {startMode === 'date' && (
                <>
                  <input
                    type="date"
                    className="field mt-2"
                    value={startDate}
                    max={addDaysToDateString(today, 30)}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <p className="text-xs text-ink3 mt-1.5">
                    Data no passado serve para registrar dias já feitos; esses dias não contam como falta.
                  </p>
                </>
              )}
            </div>

            <div>
              <span className="t-label">Hábitos</span>
              {sources.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5 mt-2">
                  {sources.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => applySource(s.id)}
                      className={`chip shrink-0 max-w-[14rem] ${source === s.id ? 'chip-on' : ''}`}
                    >
                      <span className="truncate">{s.id === 'new' || s.id === 'loose' ? s.label : `Copiar de ${s.label}`}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="card mt-3 divide-y divide-line overflow-hidden">
                {moved.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pillarColor(m.pillarId) }} />
                    <span className="text-[15px] font-semibold text-ink flex-1 min-w-0 truncate">{m.title}</span>
                    <span className="text-xs text-ink3 shrink-0">avulso → este desafio</span>
                    <button
                      type="button"
                      className="icon-btn !w-8 !h-8 -mr-2"
                      aria-label={`Tirar ${m.title}`}
                      onClick={() => setMoveIds((ids) => ids.filter((id) => id !== m.id))}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {drafts.map((d, i) => (
                  <div key={`${d.title}_${i}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pillarColor(d.pillarId) }} />
                    <span className="text-[15px] font-semibold text-ink flex-1 min-w-0 truncate">{d.title}</span>
                    <span className="text-xs text-ink3 shrink-0 tabular">
                      {getPillar(d.pillarId).categoryLabel} · {d.xpReward} XP
                    </span>
                    <button
                      type="button"
                      className="icon-btn !w-8 !h-8 -mr-2"
                      aria-label={`Tirar ${d.title}`}
                      onClick={() => setDrafts((list) => list.filter((_, j) => j !== i))}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="px-4 py-3 space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      className="field flex-1"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addDraft();
                        }
                      }}
                      placeholder="Novo hábito (ex.: Leitura 20 min)"
                    />
                    <button type="button" onClick={addDraft} className="icon-btn !bg-ink !text-bg shrink-0" aria-label="Adicionar hábito">
                      <Plus className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {PILLARS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPillar(p)}
                        className={`chip !h-8 shrink-0 ${newPillar === p ? 'chip-on' : ''}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: pillarColor(p) }} />
                        {getPillar(p).categoryLabel}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-ink3 mr-1">Esforço</span>
                    {RANKS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewRank(r)}
                        className={`chip !h-8 !px-2.5 ${newRank === r ? 'chip-on' : ''}`}
                        title={`${getRankRewards(r).xp} XP`}
                      >
                        {r}
                      </button>
                    ))}
                    <span className="text-xs text-ink3 ml-auto tabular whitespace-nowrap shrink-0">{getRankRewards(newRank).xp} XP</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-ink">Modo Elite</div>
                <p className="text-[13px] text-ink2 mt-0.5 leading-snug">
                  +20% de XP, sem Escudo de Chakra, e qualquer falta encerra o desafio. Sem ele, faltas só pesam na adesão.
                </p>
              </div>
              <Switch checked={elite} label="Modo Elite" onChange={setElite} />
            </div>

            <p className="text-xs text-ink3 leading-snug">
              Cada dia conta como cumprido com metade do XP dos hábitos dele. Ao chegar ao fim: +{reward.xp} XP e +{reward.ryo} Ryō.
            </p>
            {error && <p className="text-[13px] text-accent">{error}</p>}
          </>
        )}
      </div>
    </Sheet>
  );
};
