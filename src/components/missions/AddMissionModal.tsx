import React, { useState } from 'react';
import { Mission, TimeOfDay } from '../../core/types';
import { PillarId, MissionRank } from '../../theme/types';
import { useTheme } from '../../theme/ThemeContext';
import { X, Sparkles, Plus } from 'lucide-react';

interface AddMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Mission, 'id' | 'isCompletedToday' | 'completedDates' | 'order' | 'createdAt'>) => void;
  initialData?: Mission | null;
}

export const AddMissionModal: React.FC<AddMissionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const { theme } = useTheme();

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [pillarId, setPillarId] = useState<PillarId>(initialData?.pillarId || 'taijutsu');
  const [rank, setRank] = useState<MissionRank>(initialData?.rank || 'D');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(initialData?.timeOfDay || 'morning');

  if (!isOpen) return null;

  const currentRankInfo = theme.missionRanks[rank];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      pillarId,
      rank,
      xpReward: currentRankInfo.xpReward,
      timeOfDay,
      isCustom: true,
    });

    setTitle('');
    setDescription('');
    onClose();
  };

  const ranksList: MissionRank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
  const pillarsList: PillarId[] = ['taijutsu', 'ninjutsu', 'chakra', 'espirito', 'genjutsu'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-shinobi-card border border-shinobi-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-shinobi-border bg-shinobi-bg/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-shinobi-crimson/20 border border-shinobi-crimson/40 flex items-center justify-center text-shinobi-crimson">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-cinzel font-bold text-slate-100 text-base">
              {initialData ? 'Editar Missão Shinobi' : 'Forjar Nova Missão'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Título da Missão */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome da Missão / Hábito *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Treino de Força, 20 páginas de leitura, 45min Deep Work..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-shinobi-crimson transition-colors"
            />
          </div>

          {/* Descrição Opcional */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Instruções de Execução (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalhes específicos para não abrir margem para desculpas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-shinobi-crimson transition-colors resize-none"
            />
          </div>

          {/* Seleção de Pilar */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Pilar de Atributo Desenvolvido
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pillarsList.map((pId) => {
                const pillar = theme.pillars[pId];
                const isSelected = pillarId === pId;
                return (
                  <button
                    key={pId}
                    type="button"
                    onClick={() => setPillarId(pId)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-opacity-100 bg-shinobi-bg shadow-md'
                        : 'border-shinobi-border/60 bg-shinobi-bg/40 opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: isSelected ? pillar.color : undefined,
                    }}
                  >
                    <span className="text-lg">{pillar.badgeIcon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold" style={{ color: pillar.color }}>
                        {pillar.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {pillar.categoryLabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seleção de Dificuldade / Rank da Missão (E a S) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Grau de Dificuldade (Rank da Missão)
              </label>
              <span className="text-xs font-mono font-bold text-shinobi-gold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                +{currentRankInfo.xpReward} XP Base
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {ranksList.map((r) => {
                const rInfo = theme.missionRanks[r];
                const isSelected = rank === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRank(r)}
                    className={`flex flex-col items-center justify-center py-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-shinobi-bg shadow-md scale-105'
                        : 'border-shinobi-border/60 bg-shinobi-bg/40 opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: isSelected ? rInfo.color : undefined,
                      color: rInfo.color,
                    }}
                  >
                    <span className="font-mono font-bold text-sm">Rank {r}</span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                      +{rInfo.xpReward}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 italic">
              {currentRankInfo.label} — Tempo estimado: {currentRankInfo.recommendedTime}
            </p>
          </div>

          {/* Horário do Dia */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Momento do Dia Recomendado
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'morning', label: 'Manhã' },
                { id: 'afternoon', label: 'Tarde' },
                { id: 'evening', label: 'Noite' },
                { id: 'anytime', label: 'Livre' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeOfDay(t.id as TimeOfDay)}
                  className={`py-2 px-2 text-xs rounded-xl border text-center transition-all font-medium ${
                    timeOfDay === t.id
                      ? 'border-shinobi-crimson bg-shinobi-crimson/10 text-shinobi-crimson font-bold'
                      : 'border-shinobi-border/60 bg-shinobi-bg/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-shinobi-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-shinobi-crimson to-shinobi-crimsonGlow text-white text-xs font-bold rounded-xl shadow-glow-crimson hover:opacity-95 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {initialData ? 'Salvar Alterações' : 'Gravar no Pergaminho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
