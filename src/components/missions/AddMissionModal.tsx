import React, { useState, useEffect } from 'react';
import { Mission, TimeOfDay } from '../../core/types';
import { PillarId, MissionRank } from '../../theme/types';
import { useTheme } from '../../theme/ThemeContext';
import { X, Sparkles, Plus, Edit3 } from 'lucide-react';

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
  const { theme, getPillar, getMissionRankInfo } = useTheme();

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [pillarId, setPillarId] = useState<PillarId>(initialData?.pillarId || 'taijutsu');
  const [rank, setRank] = useState<MissionRank>(initialData?.rank || 'D');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(initialData?.timeOfDay || 'morning');

  // Sincroniza o formulário sempre que o modal abre ou initialData muda
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setPillarId(initialData.pillarId || 'taijutsu');
      setRank(initialData.rank || 'D');
      setTimeOfDay(initialData.timeOfDay || 'morning');
    } else {
      setTitle('');
      setDescription('');
      setPillarId('taijutsu');
      setRank('D');
      setTimeOfDay('morning');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const currentRankInfo = theme.missionRanks[rank] || theme.missionRanks.D;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      pillarId,
      rank,
      xpReward: currentRankInfo.xpReward,
      ryoReward: currentRankInfo.ryoReward,
      timeOfDay,
      isCustom: initialData ? (initialData.isCustom ?? true) : true,
    });

    onClose();
  };

  const ranksList: MissionRank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
  const pillarsList: PillarId[] = ['taijutsu', 'ninjutsu', 'chakra', 'espirito', 'genjutsu'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pb-24 sm:pb-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700/90 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-shinobi-border bg-shinobi-bg/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-shinobi-crimson/20 border border-shinobi-crimson/40 flex items-center justify-center text-shinobi-crimson">
              {initialData ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
        </div>        {/* Formulário com Scroll Interno */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Título da Missão */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Nome da Missão / Hábito *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Treino de Força, 20 páginas de leitura, 45min Deep Work..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-shinobi-crimson transition-colors"
            />
          </div>

          {/* Descrição Opcional */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              Instruções de Execução (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalhes específicos para não abrir margem para desculpas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-shinobi-crimson transition-colors resize-none"
            />
          </div>

          {/* Seleção de Pilar */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              Pilar de Atributo Desenvolvido
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pillarsList.map((pId) => {
                const pillar = getPillar(pId);
                const isSelected = pillarId === pId;
                return (
                  <button
                    key={pId}
                    type="button"
                    onClick={() => setPillarId(pId)}
                    className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all text-left ${
                      isSelected
                        ? 'border-opacity-100 bg-slate-950 shadow-md font-bold'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                    }`}
                    style={{
                      borderColor: isSelected ? pillar.color : undefined,
                      color: isSelected ? pillar.color : undefined,
                    }}
                  >
                    <span>{pillar.badgeIcon}</span>
                    <span className="truncate">{pillar.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seleção de Rank / Dificuldade */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="block text-xs font-bold text-slate-200">
                Rank de Esforço & Dificuldade
              </label>
              <div className="flex items-center gap-2 text-xs font-mono font-bold">
                <span style={{ color: currentRankInfo.color }}>
                  +{currentRankInfo.xpReward} XP
                </span>
                <span className="text-amber-300">
                  🪙 +{currentRankInfo.ryoReward} Ryō
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({currentRankInfo.recommendedTime})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              {ranksList.map((r) => {
                const rInfo = getMissionRankInfo(r);
                const isSelected = rank === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRank(r)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                      isSelected
                        ? 'border-opacity-100 bg-slate-950 shadow-md scale-105'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                    }`}
                    style={{
                      borderColor: isSelected ? rInfo.color : undefined,
                      color: isSelected ? rInfo.color : undefined,
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horário do Dia */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              Janela de Horário Recomendada
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'morning', label: 'Manhã', icon: '🌅' },
                { id: 'afternoon', label: 'Tarde', icon: '☀️' },
                { id: 'evening', label: 'Noite', icon: '🌙' },
                { id: 'anytime', label: 'Livre', icon: '⚡' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeOfDay(t.id as TimeOfDay)}
                  className={`py-2 px-1 rounded-xl text-xs flex flex-col sm:flex-row items-center justify-center gap-1 border transition-all ${
                    timeOfDay === t.id
                      ? 'border-shinobi-gold bg-slate-950 text-shinobi-gold font-bold shadow-md'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="text-[11px]">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer com Botões de Ação Fixos */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-gradient-to-r from-shinobi-crimson to-rose-600 text-white text-xs font-bold rounded-xl shadow-glow-crimson hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{initialData ? 'Salvar Alterações' : 'Gravar no Pergaminho'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
