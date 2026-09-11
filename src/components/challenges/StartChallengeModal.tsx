import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { Mission, TimeOfDay } from '../../core/types';
import { PillarId, MissionRank } from '../../theme/types';
import { getTodayString, formatDateBR } from '../../core/streakEngine';
import { 
  X, 
  Sparkles, 
  Flame, 
  Calendar, 
  Check, 
  Plus, 
  Trash2, 
  Clock, 
  Target,
  Layers,
  Info
} from 'lucide-react';

interface StartChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const durationPresets = [
  { days: 21, label: '21 Dias', tag: 'Hábito Inicial' },
  { days: 30, label: '30 Dias', tag: 'Foco Mensal' },
  { days: 45, label: '45 Dias', tag: 'Forja Média' },
  { days: 66, label: '66 Dias', tag: '⭐ Neurociência UCL (Padrão)' },
  { days: 90, label: '90 Dias', tag: 'Mestria Trimestral' },
];

const pillarsList: { id: PillarId; label: string; icon: string; color: string }[] = [
  { id: 'taijutsu', label: 'Taijutsu (Corpo)', icon: '🥋', color: 'text-rose-400' },
  { id: 'ninjutsu', label: 'Ninjutsu (Mente)', icon: '📜', color: 'text-cyan-400' },
  { id: 'chakra', label: 'Chakra (Disciplina)', icon: '⚡', color: 'text-emerald-400' },
  { id: 'espirito', label: 'Espírito (Confiança)', icon: '🛡️', color: 'text-amber-400' },
  { id: 'genjutsu', label: 'Genjutsu (Foco)', icon: '👁️', color: 'text-purple-400' },
];

export const StartChallengeModal: React.FC<StartChallengeModalProps> = ({ isOpen, onClose }) => {
  const { profile, startChallenge } = useUserStore();
  const { missions: currentStoreMissions } = useHabitStore();

  const nextCycleNumber = (profile.challengeHistory?.length || 0) + 1;
  const todayStr = getTodayString();

  // Estados do Desafio
  const [targetDays, setTargetDays] = useState<number>(66);
  const [customDaysInput, setCustomDaysInput] = useState<string>('66');
  const [title, setTitle] = useState<string>(`Desafio 66 Dias — Ciclo #${nextCycleNumber}`);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [isCustomStartDate, setIsCustomStartDate] = useState<boolean>(false);

  // Lista de Missões que farão parte do Desafio
  const [selectedMissions, setSelectedMissions] = useState<Mission[]>([]);
  const [isAddingNewMission, setIsAddingNewMission] = useState<boolean>(false);

  // Nova Missão Rápida
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionPillar, setNewMissionPillar] = useState<PillarId>('chakra');
  const [newMissionRank, setNewMissionRank] = useState<MissionRank>('D');
  const [newMissionTime, setNewMissionTime] = useState<TimeOfDay>('anytime');

  // Inicializa com as missões existentes no store
  useEffect(() => {
    if (isOpen) {
      setSelectedMissions([...currentStoreMissions]);
      setTitle(`Desafio ${targetDays} Dias — Ciclo #${nextCycleNumber}`);
      setStartDate(todayStr);
      setIsCustomStartDate(false);
      setIsAddingNewMission(false);
    }
  }, [isOpen, nextCycleNumber, todayStr]);

  if (!isOpen) return null;

  const handleSelectPresetDays = (days: number) => {
    setTargetDays(days);
    setCustomDaysInput(String(days));
    setTitle(`Desafio ${days} Dias — Ciclo #${nextCycleNumber}`);
  };

  const handleCustomDaysChange = (val: string) => {
    setCustomDaysInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setTargetDays(parsed);
      setTitle(`Desafio ${parsed} Dias — Ciclo #${nextCycleNumber}`);
    }
  };

  const handleRemoveMissionCompletely = (missionId: string) => {
    if (selectedMissions.length <= 1) {
      alert('Seu desafio precisa ter pelo menos 1 missão diária selecionada!');
      return;
    }
    setSelectedMissions(selectedMissions.filter((m) => m.id !== missionId));
  };

  const handleAddNewMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionTitle.trim()) return;

    const rankRewards: Record<MissionRank, { xp: number; ryo: number }> = {
      E: { xp: 25, ryo: 15 },
      D: { xp: 50, ryo: 35 },
      C: { xp: 85, ryo: 70 },
      B: { xp: 140, ryo: 130 },
      A: { xp: 220, ryo: 200 },
      S: { xp: 350, ryo: 320 },
    };

    const newM: Mission = {
      id: `mis_custom_${Date.now()}`,
      title: newMissionTitle.trim(),
      pillarId: newMissionPillar,
      rank: newMissionRank,
      xpReward: rankRewards[newMissionRank].xp,
      ryoReward: rankRewards[newMissionRank].ryo,
      timeOfDay: newMissionTime,
      isCompletedToday: false,
      completedDates: [],
      isCustom: true,
      order: selectedMissions.length + 1,
      createdAt: new Date().toISOString(),
    };

    setSelectedMissions([...selectedMissions, newM]);
    setNewMissionTitle('');
    setIsAddingNewMission(false);
  };

  const handleConfirmStart = () => {
    if (selectedMissions.length === 0) {
      alert('Por favor, selecione ao menos 1 missão para acompanhar no seu desafio.');
      return;
    }

    startChallenge({
      title,
      targetDays,
      startDate: isCustomStartDate ? startDate : todayStr,
      missions: selectedMissions,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-shinobi-gold/80 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto relative z-[101]">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-950/60 via-slate-950 to-slate-950 border-b border-shinobi-gold/30 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-shinobi-gold/20 border-2 border-shinobi-gold flex items-center justify-center text-shinobi-gold shadow-glow-gold flex-shrink-0">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-shinobi-gold/15 text-shinobi-gold text-[10px] font-mono font-bold border border-shinobi-gold/40">
                <Sparkles className="w-3 h-3" />
                <span>FORJA DO NOVO CICLO • PERSONALIZAÇÃO LIVRE</span>
              </div>
              <h3 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100 mt-0.5">
                Monte e Inicie Seu Desafio
              </h3>
              <p className="text-xs text-slate-400">
                O desafio só começa a contar a partir do momento em que você confirmar estar pronto.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Seção 1: Configuração Básica e Título */}
          <div className="space-y-3">
            <label className="font-bold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
              <Target className="w-4 h-4 text-shinobi-gold" />
              <span>1. Nome do Seu Desafio</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Desafio 66 Dias — Ciclo #1"
              className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-semibold focus:outline-none focus:border-shinobi-gold transition-colors"
            />
          </div>

          {/* Seção 2: Duração do Desafio */}
          <div className="space-y-3">
            <label className="font-bold text-slate-200 flex items-center justify-between text-xs uppercase tracking-wider font-mono">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-shinobi-gold" />
                <span>2. Duração do Desafio</span>
              </span>
              <span className="text-shinobi-gold font-bold">{targetDays} Dias Selecionados</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {durationPresets.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => handleSelectPresetDays(preset.days)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    targetDays === preset.days
                      ? 'bg-amber-950/40 border-shinobi-gold shadow-glow-gold/30 text-slate-100'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold font-mono text-sm text-slate-100">{preset.label}</div>
                  <div className="text-[10px] text-shinobi-gold/90 mt-0.5">{preset.tag}</div>
                </button>
              ))}

              {/* Opção Customizada */}
              <div className="p-3 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-mono">Personalizado:</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customDaysInput}
                    onChange={(e) => handleCustomDaysChange(e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-shinobi-gold"
                  />
                  <span className="text-slate-400 font-mono text-xs">dias</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 3: Data de Início */}
          <div className="space-y-3">
            <label className="font-bold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
              <Clock className="w-4 h-4 text-shinobi-gold" />
              <span>3. Data de Início</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomStartDate(false);
                  setStartDate(todayStr);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  !isCustomStartDate
                    ? 'bg-emerald-950/30 border-emerald-500/80 text-emerald-300 shadow-glow-jade/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                    <span>⚡ Começar Hoje</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                      {formatDateBR(todayStr)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">O Dia 1 começa hoje</div>
                </div>
                {!isCustomStartDate && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => setIsCustomStartDate(true)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isCustomStartDate
                    ? 'bg-amber-950/30 border-shinobi-gold text-amber-300 shadow-glow-gold/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                    <span>📅 Definir Outro Dia</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Começar em data futura</div>
                </div>
                {isCustomStartDate && <Check className="w-4 h-4 text-amber-400 stroke-[3]" />}
              </button>
            </div>

            {isCustomStartDate && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                <span className="text-slate-400 text-xs">Data de início:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-shinobi-gold font-mono"
                />
              </div>
            )}
          </div>

          {/* Seção 4: Missões & Hábitos do Desafio */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
                <Layers className="w-4 h-4 text-shinobi-gold" />
                <span>4. Missões Diárias do Desafio ({selectedMissions.length})</span>
              </label>

              <button
                type="button"
                onClick={() => setIsAddingNewMission(!isAddingNewMission)}
                className="text-[11px] font-bold text-shinobi-gold hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingNewMission ? 'Fechar Criação' : 'Criar Nova Missão'}</span>
              </button>
            </div>

            {/* Formulário Rápido para Criar Nova Missão */}
            {isAddingNewMission && (
              <form onSubmit={handleAddNewMission} className="p-4 rounded-2xl bg-slate-950 border-2 border-shinobi-gold/60 space-y-3 animate-in fade-in">
                <div className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-shinobi-gold" />
                  <span>Adicionar Missão Personalizada ao Desafio</span>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Nome da missão (ex: 30min de Leitura, Meditação...)"
                  value={newMissionTitle}
                  onChange={(e) => setNewMissionTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-shinobi-gold"
                />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Pilar:</span>
                    <select
                      value={newMissionPillar}
                      onChange={(e) => setNewMissionPillar(e.target.value as PillarId)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    >
                      {pillarsList.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Dificuldade (Rank):</span>
                    <select
                      value={newMissionRank}
                      onChange={(e) => setNewMissionRank(e.target.value as MissionRank)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    >
                      <option value="E">Rank E (Básico)</option>
                      <option value="D">Rank D (Padrão)</option>
                      <option value="C">Rank C (Médio)</option>
                      <option value="B">Rank B (Avançado)</option>
                      <option value="A">Rank A (Elite)</option>
                      <option value="S">Rank S (Lendário)</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Horário:</span>
                    <select
                      value={newMissionTime}
                      onChange={(e) => setNewMissionTime(e.target.value as TimeOfDay)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    >
                      <option value="anytime">Qualquer Hora</option>
                      <option value="morning">Manhã</option>
                      <option value="afternoon">Tarde</option>
                      <option value="evening">Noite</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewMission(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-shinobi-gold to-amber-500 text-slate-950 text-xs font-bold shadow-glow-gold"
                  >
                    Salvar e Incluir
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Missões com Seleção e Remoção */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedMissions.map((m) => {
                const pillarInfo = pillarsList.find((p) => p.id === m.pillarId);
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{pillarInfo?.icon || '📜'}</span>
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <span>{m.title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-shinobi-gold font-bold">
                            Rank {m.rank}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className={pillarInfo?.color}>{pillarInfo?.label}</span>
                          <span>•</span>
                          <span>+{m.xpReward} XP</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMissionCompletely(m.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-rose-950/30 transition-colors"
                      title="Remover do desafio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dica / Aviso de Regra de Negócio */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-shinobi-gold/30 flex items-start gap-2.5 text-[11px] text-slate-300">
            <Info className="w-4 h-4 text-shinobi-gold flex-shrink-0 mt-0.5" />
            <span>
              Ao confirmar o início, o Desafio entrará oficialmente no <strong>Dia 1</strong>. Cada dia precisará de pelo menos 50% de XP das missões para confirmar presença.
            </span>
          </div>
        </div>

        {/* Footer / Ações de Confirmação */}
        <div className="p-5 sm:p-6 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-bold transition-colors text-center text-xs"
          >
            Decidir Depois / Deixar em Espera
          </button>

          <button
            type="button"
            onClick={handleConfirmStart}
            className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-shinobi-gold via-amber-400 to-emerald-400 hover:opacity-95 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-glow-gold transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Flame className="w-4 h-4 stroke-[2.5]" />
            <span>Confirmar e Iniciar Desafio ⚡</span>
          </button>
        </div>
      </div>
    </div>
  );
};
