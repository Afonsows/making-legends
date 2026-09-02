import React, { useState } from 'react';
import { useChallengeStore } from '../../state/useChallengeStore';
import { PillarId } from '../../theme/types';
import { 
  X, 
  Sparkles, 
  Flame, 
  Target, 
  Plus, 
  Trash2, 
  Calendar, 
  Check, 
  AlertCircle,
  Clock,
  Award
} from 'lucide-react';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DurationSuggestion {
  days: number;
  label: string;
  badge?: string;
  isPopular?: boolean;
  color: string;
}

export const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createChallenge } = useChallengeStore();

  const suggestions: DurationSuggestion[] = [
    { days: 21, label: 'Hábito Básico', color: 'from-blue-600/30 to-blue-900/30 border-blue-500/50' },
    { days: 40, label: 'Transformação', color: 'from-purple-600/30 to-purple-900/30 border-purple-500/50' },
    { 
      days: 66, 
      label: 'Formação de Hábito', 
      badge: '⭐ MAIS POPULAR', 
      isPopular: true, 
      color: 'from-amber-500/30 via-shinobi-gold/30 to-amber-700/30 border-shinobi-gold' 
    },
    { days: 90, label: 'Trimestre Épico', color: 'from-cyan-600/30 to-cyan-900/30 border-cyan-500/50' },
    { days: 365, label: 'Ano Lendário', color: 'from-emerald-600/30 to-emerald-900/30 border-emerald-500/50' },
    { days: 1000, label: 'Mestria Absoluta', color: 'from-rose-600/30 to-rose-900/30 border-rose-500/50' },
  ];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Disciplina & Foco');
  const [targetDays, setTargetDays] = useState<number>(66);
  const [customDaysInput, setCustomDaysInput] = useState<string>('66');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lista de hábitos a serem inseridos no novo desafio
  const [habitsList, setHabitsList] = useState<{ title: string; description: string; color: string; pillarId: PillarId }[]>([
    { title: 'Hábito Principal', description: 'Meta diária prioritária', color: '#10b981', pillarId: 'chakra' },
  ]);

  if (!isOpen) return null;

  const handleSelectSuggestion = (days: number) => {
    setTargetDays(days);
    setCustomDaysInput(String(days));
    setIsCustomMode(false);
    setErrorMessage(null);
  };

  const handleCustomDaysChange = (val: string) => {
    setCustomDaysInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setTargetDays(num);
      if (num < 21) {
        setErrorMessage('O desafio deve ter no mínimo 21 dias para formação de hábito.');
      } else {
        setErrorMessage(null);
      }
    }
  };

  const handleAddHabitField = () => {
    setHabitsList([
      ...habitsList,
      {
        title: `Hábito #${habitsList.length + 1}`,
        description: 'Executar diariamente sem falhar',
        color: '#06b6d4',
        pillarId: 'ninjutsu',
      },
    ]);
  };

  const handleRemoveHabitField = (index: number) => {
    if (habitsList.length <= 1) return;
    setHabitsList(habitsList.filter((_, idx) => idx !== index));
  };

  const handleUpdateHabitField = (index: number, field: string, value: string) => {
    const updated = [...habitsList];
    updated[index] = { ...updated[index], [field]: value };
    setHabitsList(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Digite um título para o seu desafio.');
      return;
    }

    if (targetDays < 21) {
      setErrorMessage('Cada desafio tem de ser feito com no mínimo 21 dias.');
      return;
    }

    const filteredHabits = habitsList
      .filter((h) => h.title.trim().length > 0)
      .map((h) => ({
        title: h.title.trim(),
        description: h.description.trim(),
        color: h.color,
        pillarId: h.pillarId,
      }));

    const result = createChallenge({
      title: title.trim(),
      description: description.trim(),
      targetDays,
      category,
      initialHabits: filteredHabits.length > 0 ? filteredHabits : undefined,
    });

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="liquid-glass-card bg-slate-900/45 backdrop-blur-2xl border border-white/20 w-full max-w-2xl rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.35)] flex flex-col max-h-[90vh] my-auto relative z-[101]">
        {/* Sheen superior */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/60 via-shinobi-gold/50 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/30 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-white/[0.02] backdrop-blur-xl relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-shinobi-gold/20 border border-shinobi-gold/40 flex items-center justify-center text-shinobi-gold">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-slate-100 text-base sm:text-lg flex items-center gap-2">
                <span>Criar Novo Desafio</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Defina sua meta de transformação com no mínimo 21 dias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Mensagem de Erro / Alerta */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-500 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Título e Categoria */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Nome do Desafio <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Desafio 21 Dias de Foco Total, Protocolo 90 Dias..."
                required
                className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-shinobi-gold transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Descrição ou Motivação
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qual o objetivo central deste desafio? Qual a transformação esperada?"
                rows={2}
                className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-shinobi-gold transition-colors resize-none"
              />
            </div>
          </div>

          {/* Seleção de Duração em Dias com Sugestões */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-shinobi-gold" />
                <span>Duração do Desafio (Mínimo 21 dias)</span>
              </label>
              <span className="text-xs font-mono font-bold text-shinobi-gold">
                {targetDays} dias selecionados
              </span>
            </div>

            {/* Grid de Sugestões: 21, 40, 66 (Popular), 90, 365, 1000 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {suggestions.map((sug) => {
                const isSelected = targetDays === sug.days && !isCustomMode;
                return (
                  <button
                    key={sug.days}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug.days)}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[74px] select-none active:scale-[0.98] ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-500/25 via-shinobi-gold/20 to-slate-900 border-2 border-shinobi-gold text-slate-100 shadow-glow-gold/40 scale-[1.02]'
                        : `bg-slate-950/70 border-slate-800 hover:border-slate-600 text-slate-300 hover:bg-slate-900`
                    }`}
                  >
                    {/* Badge do 66 Dias: Mais Popular */}
                    {sug.badge && (
                      <span className="absolute top-1.5 right-1.5 bg-gradient-to-r from-amber-500 to-shinobi-gold text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md animate-pulse">
                        {sug.badge}
                      </span>
                    )}

                    <div className="space-y-0.5">
                      <span className="font-mono text-base sm:text-lg font-extrabold text-slate-100 flex items-center gap-1">
                        {sug.days} <span className="text-[11px] text-slate-400 font-normal">dias</span>
                      </span>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {sug.label}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-shinobi-gold font-bold font-mono">
                        <Check className="w-3 h-3 stroke-[3]" /> Selecionado
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Opção de Duração Personalizada (>= 21) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Ou digite quantos dias quiser (mínimo 21):
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Validação: ≥ 21 dias
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="21"
                  max="5000"
                  value={customDaysInput}
                  onChange={(e) => {
                    setIsCustomMode(true);
                    handleCustomDaysChange(e.target.value);
                  }}
                  className="w-32 bg-slate-900 border-2 border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-shinobi-gold focus:outline-none focus:border-shinobi-gold transition-colors"
                />
                <span className="text-xs text-slate-400">
                  dias corridos de acompanhamento
                </span>
              </div>
            </div>
          </div>

          {/* Seção de Missões / Hábitos Iniciais do Desafio */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Missões / Hábitos do Desafio ({habitsList.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Cada hábito terá régua de 7 dias e matriz de consistência de 6 meses
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddHabitField}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-shinobi-gold border border-shinobi-gold/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Hábito
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {habitsList.map((habit, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5"
                >
                  <input
                    type="color"
                    value={habit.color}
                    onChange={(e) => handleUpdateHabitField(idx, 'color', e.target.value)}
                    className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer flex-shrink-0"
                    title="Escolha a cor do indicador"
                  />

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={habit.title}
                      onChange={(e) => handleUpdateHabitField(idx, 'title', e.target.value)}
                      placeholder="Nome do hábito (Ex: Leitura)"
                      required
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-shinobi-gold"
                    />

                    <input
                      type="text"
                      value={habit.description}
                      onChange={(e) => handleUpdateHabitField(idx, 'description', e.target.value)}
                      placeholder="Meta (Ex: Ler 15 min por dia)"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-shinobi-gold"
                    />
                  </div>

                  {habitsList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHabitField(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer com Ações */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] backdrop-blur-xl -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Iniciar Desafio ({targetDays} Dias)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
