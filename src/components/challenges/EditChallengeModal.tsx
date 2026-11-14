import React, { useState, useEffect } from 'react';
import { useChallengeStore } from '../../state/useChallengeStore';
import { useUserStore } from '../../state/useUserStore';
import { UserChallenge } from '../../core/types';
import { soundFx } from '../../utils/audio';
import {
  X,
  Target,
  Sparkles,
  Save,
  Trash2,
  AlertCircle,
  Skull,
  Calendar,
} from 'lucide-react';

interface EditChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: UserChallenge | null;
  onDeleted?: () => void;
}

const durationPresets = [
  { days: 21, label: '21 Dias' },
  { days: 30, label: '30 Dias' },
  { days: 45, label: '45 Dias' },
  { days: 66, label: '66 Dias' },
  { days: 90, label: '90 Dias' },
  { days: 365, label: '365 Dias' },
];

export const EditChallengeModal: React.FC<EditChallengeModalProps> = ({
  isOpen,
  onClose,
  challenge,
  onDeleted,
}) => {
  const { updateChallenge, deleteChallenge } = useChallengeStore();
  const { profile, updateActiveChallenge, deleteActiveChallenge } = useUserStore();

  const isOfficial = challenge?.isOfficial66 || challenge?.id === 'challenge_official_66';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [targetDays, setTargetDays] = useState<number>(66);
  const [customDaysInput, setCustomDaysInput] = useState<string>('66');
  const [isEliteMode, setIsEliteMode] = useState<boolean>(false);
  const [status, setStatus] = useState<'active' | 'completed' | 'paused'>('active');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && challenge) {
      if (isOfficial && profile.activeChallenge) {
        setTitle(profile.activeChallenge.title || challenge.title);
        setDescription(challenge.description || '');
        setTargetDays(profile.activeChallenge.targetDays || challenge.targetDays || 66);
        setCustomDaysInput(String(profile.activeChallenge.targetDays || challenge.targetDays || 66));
        setIsEliteMode(Boolean(profile.activeChallenge.isEliteMode || profile.isHardModeEnabled));
        setStatus('active');
      } else {
        setTitle(challenge.title);
        setDescription(challenge.description || '');
        setCategory(challenge.category || 'Transformação');
        setTargetDays(challenge.targetDays || 66);
        setCustomDaysInput(String(challenge.targetDays || 66));
        setStatus((challenge.status as 'active' | 'completed' | 'paused') || 'active');
      }
      setErrorMessage(null);
    }
  }, [isOpen, challenge, isOfficial, profile.activeChallenge, profile.isHardModeEnabled]);

  if (!isOpen || !challenge) return null;

  const handleSelectDaysPreset = (days: number) => {
    setTargetDays(days);
    setCustomDaysInput(String(days));
    setErrorMessage(null);
  };

  const handleCustomDaysChange = (val: string) => {
    setCustomDaysInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      setTargetDays(parsed);
      if (parsed < 7) {
        setErrorMessage('Duração mínima recomendada é de 7 dias.');
      } else {
        setErrorMessage(null);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Por favor, informe o título do desafio.');
      return;
    }
    if (targetDays < 7) {
      setErrorMessage('A duração mínima é de 7 dias.');
      return;
    }

    if (isOfficial) {
      updateActiveChallenge({
        title: title.trim(),
        targetDays,
        isEliteMode,
      });
    } else {
      updateChallenge(challenge.id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        targetDays,
        status,
      });
    }

    soundFx.playButtonClick();
    onClose();
  };

  const handleDelete = () => {
    if (isOfficial) {
      if (
        window.confirm(
          'Excluir o desafio ativo? As marcações, os dias cumpridos e as recompensas (XP e Ryō) obtidos desde o início dele serão desfeitos. Esta ação não pode ser revertida.'
        )
      ) {
        deleteActiveChallenge();
        soundFx.playMissionUndo();
        onClose();
        if (onDeleted) onDeleted();
      }
    } else {
      if (
        window.confirm(
          `Deseja realmente excluir o desafio "${challenge.title}"? Todos os hábitos associados serão removidos.`
        )
      ) {
        deleteChallenge(challenge.id);
        soundFx.playMissionUndo();
        onClose();
        if (onDeleted) onDeleted();
      }
    }
  };

  return (
    <div className="modal-overlay z-[120] bg-slate-950/80 animate-in fade-in duration-200">
      <div className="liquid-glass-card bg-slate-900/90 border border-shinobi-gold/60 w-full max-w-xl rounded-2xl overflow-hidden flex flex-col modal-panel my-auto relative z-[121]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-shinobi-gold/20 border border-shinobi-gold/40 flex items-center justify-center text-shinobi-gold">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-slate-100">
                {isOfficial ? 'Editar Desafio Principal' : 'Editar Desafio Personalizado'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {isOfficial ? 'Ajuste o título, duração e modo do ciclo ativo' : 'Manipule livremente as configurações deste desafio'}
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-cinzel">
              <Sparkles className="w-3.5 h-3.5 text-shinobi-gold" />
              Nome do Desafio
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Desafio 66 Dias de Mestria"
              required
              className="w-full bg-slate-950/80 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-shinobi-gold transition-colors"
            />
          </div>

          {/* Duração / Dias */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-cinzel">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              Duração da Jornada ({targetDays} Dias)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {durationPresets.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => handleSelectDaysPreset(p.days)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-mono font-bold border transition-all ${
                    targetDays === p.days
                      ? 'bg-shinobi-gold text-slate-950 border-shinobi-gold '
                      : 'bg-slate-950/60 text-slate-300 border-white/10 hover:border-slate-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400 font-mono">Ou dias personalizados:</span>
              <input
                type="number"
                min={7}
                max={365}
                value={customDaysInput}
                onChange={(e) => handleCustomDaysChange(e.target.value)}
                className="w-24 bg-slate-950/80 border border-white/20 rounded-xl px-2.5 py-1 text-xs text-center font-mono font-bold text-shinobi-gold focus:outline-none focus:border-shinobi-gold"
              />
              <span className="text-[11px] text-slate-400 font-mono">dias</span>
            </div>
          </div>

          {/* Descrição e Categoria (Apenas Custom) */}
          {!isOfficial && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 font-cinzel">
                  Descrição / Objetivo
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qual transformação você busca alcançar com este desafio?"
                  className="w-full bg-slate-950/80 border border-white/20 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-shinobi-gold transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 font-cinzel">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Saúde, Estudos, Hábitos..."
                    className="w-full bg-slate-950/80 border border-white/20 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-shinobi-gold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 font-cinzel">
                    Status do Desafio
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'completed' | 'paused')}
                    className="w-full bg-slate-950/80 border border-white/20 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-shinobi-gold"
                  >
                    <option value="active">Ativo (Em Andamento)</option>
                    <option value="completed">Concluído</option>
                    <option value="paused">Aguardando / Pausado</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Modo Elite (Apenas Oficial) */}
          {isOfficial && (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-rose-500/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300 font-cinzel">
                  <Skull className="w-3.5 h-3.5 text-rose-400" />
                  Modo Elite (Morte Súbita)
                </div>
                <p className="text-[11px] text-slate-400">
                  Sem escudos e sem tolerância: qualquer falta na semana encerra o ciclo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEliteMode(!isEliteMode)}
                className={`w-12 h-6 rounded-full transition-colors p-0.5 relative shrink-0 ${
                  isEliteMode ? 'bg-rose-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    isEliteMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Área de Exclusão Perigosa */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3.5 py-2 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 border border-rose-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isOfficial ? 'Excluir / Cancelar Desafio Ativo' : 'Excluir Este Desafio'}</span>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-shinobi-gold text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
