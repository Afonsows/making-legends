import React, { useState } from 'react';
import { useHabitStore } from '../../state/useHabitStore';
import { useUserStore } from '../../state/useUserStore';
import { getLevelProgress } from '../../core/xpEngine';
import { syncService } from '../../services/syncService';
import { supabase } from '../../services/supabase';
import { soundFx } from '../../utils/audio';
import { 
  X, 
  History, 
  RotateCcw, 
  CheckCircle2, 
  Coins, 
  Sparkles, 
  Trash2,
  Filter
} from 'lucide-react';

interface MissionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MissionHistoryModal: React.FC<MissionHistoryModalProps> = ({ isOpen, onClose }) => {
  const { missionLogs, missions, recalibrateFromMissions, clearLogs } = useHabitStore();
  const { profile } = useUserStore();

  const [recalibrateNotice, setRecalibrateNotice] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<'all' | 'completed' | 'reverted' | 'synced'>('all');

  if (!isOpen) return null;

  const handleRecalibrate = async () => {
    const result = recalibrateFromMissions();
    soundFx.playScrollOpen();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const targetUserId = session?.user?.id || profile.id;
      if (targetUserId) {
        const freshProfile = useUserStore.getState().profile;
        await syncService.pushUserProfile(freshProfile, targetUserId);
      }
    } catch (err) {
      console.warn('Recalibrado localmente.', err);
    }

    setRecalibrateNotice(`Ficha recalculada e sincronizada: ${result.totalXp} XP Total, Nível ${result.level} e ${result.ryo} Ryō.`);
    setTimeout(() => {
      setRecalibrateNotice(null);
    }, 4000);
  };

  const completedTodayMissions = missions.filter((m) => m.isCompletedToday);
  const calculatedXp = completedTodayMissions.reduce((acc, m) => acc + m.xpReward, 0);
  const calculatedRyo = completedTodayMissions.reduce((acc, m) => acc + (m.ryoReward || 25), 0);
  const correspondingLevel = getLevelProgress(calculatedXp).currentLevel;

  const filteredLogs = filterAction === 'all' 
    ? missionLogs 
    : missionLogs.filter((l) => l.action === filterAction);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-shinobi-gold/60 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-shinobi-gold/20 border border-shinobi-gold/40 flex items-center justify-center text-shinobi-gold">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-slate-100 text-base sm:text-lg">
                Histórico & Auditoria de Missões
              </h3>
              <p className="text-[11px] text-slate-400">
                Auditoria de conclusões, estornos e sincronização de XP/Ryō
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Card de Resumo de Auditoria com Botão de Sincronização */}
          <div className="pergaminho-bg rounded-2xl border border-shinobi-gold/40 p-4 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-shinobi-gold" />
                  Conferência de Missões de Hoje vs Ficha
                </span>
                <p className="text-[11px] text-slate-400">
                  Verifique se o seu XP e Ryō batem com o que foi concluído hoje.
                </p>
              </div>

              <button
                onClick={handleRecalibrate}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition-all flex items-center gap-1.5 self-start sm:self-auto"
                title="Recalcular e sincronizar automaticamente XP, Ryō e Nível"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Sincronizar / Recalibrar Ficha</span>
              </button>
            </div>

            {recalibrateNotice && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{recalibrateNotice}</span>
              </div>
            )}

            {/* Grid dos Números Reais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Missões Concluídas</span>
                <span className="font-bold text-slate-100 font-mono text-sm">
                  {completedTodayMissions.length} / {missions.length}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">XP Real Calculado</span>
                <span className="font-bold text-shinobi-gold font-mono text-sm">
                  {calculatedXp} XP
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Ryō Real Calculado</span>
                <span className="font-bold text-amber-300 font-mono text-sm">
                  {calculatedRyo} Ryō
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Nível Correspondente</span>
                <span className="font-bold text-cyan-400 font-mono text-sm">
                  Nv. {correspondingLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Filtros do Histórico */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtrar:
              </span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'completed', label: 'Concluídas' },
                { id: 'reverted', label: 'Desmarcadas' },
                { id: 'synced', label: 'Sincronizações' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterAction(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    filterAction === f.id
                      ? 'bg-shinobi-gold text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {missionLogs.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Deseja limpar os registros visuais do histórico?')) {
                    clearLogs();
                  }
                }}
                className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 font-mono transition-colors"
                title="Limpar histórico visual"
              >
                <Trash2 className="w-3 h-3" /> Limpar Registros
              </button>
            )}
          </div>

          {/* Lista de Registros */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all ${
                    log.action === 'completed'
                      ? 'bg-emerald-950/25 border-emerald-500/30'
                      : log.action === 'reverted'
                      ? 'bg-rose-950/25 border-rose-500/30'
                      : 'bg-cyan-950/25 border-cyan-500/30'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                        log.action === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : log.action === 'reverted'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        {log.action === 'completed' ? 'Concluída' : log.action === 'reverted' ? 'Desmarcada' : 'Sincronizado'}
                      </span>
                      <span className="font-semibold text-slate-200 truncate">
                        {log.missionTitle}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0 font-mono font-bold text-xs">
                    <span className={log.xp >= 0 ? 'text-shinobi-gold' : 'text-rose-400'}>
                      {log.xp >= 0 ? `+${log.xp}` : log.xp} XP
                    </span>
                    <span className={log.ryo >= 0 ? 'text-amber-300' : 'text-rose-400'}>
                      {log.ryo >= 0 ? `+${log.ryo}` : log.ryo} Ryō
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs bg-slate-950/60 rounded-2xl border border-slate-800">
                Nenhum registro encontrado no histórico. Conclua ou desmarque missões para auditar as ações em tempo real.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
