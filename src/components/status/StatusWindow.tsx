import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useTheme } from '../../theme/ThemeContext';
import { getLevelProgress } from '../../core/xpEngine';
import { getDefaultRyoReward } from '../../core/ryoEngine';
import { evaluateProtocolStatus } from '../../core/streakEngine';
import { soundFx } from '../../utils/audio';
import { 
  Shield, 
  Flame, 
  Sparkles, 
  Award, 
  Zap, 
  AlertTriangle, 
  Edit, 
  Check,
  Lock,
  ChevronRight,
  User,
  Mail,
  Phone,
  Save,
  CheckCircle2,
  Cloud,
  Coins,
  History, 
  RotateCcw, 
  BarChart3, 
  Sliders,
  Map,
  PackageOpen,
  Backpack,
  Swords,
  BookOpen,
  FlaskConical,
  ShoppingBag
} from 'lucide-react';
import { allGameItems } from '../../core/itemsData';
import { EditProfileModal } from '../modals/EditProfileModal';
import { ProfileOverview } from './ProfileOverview';
import { Segmented } from '../ui/kit';
import { ShopPanel } from './ShopPanel';
import { ChallengeMapModal } from '../modals/ChallengeMapModal';
import { ChallengeHistoryModal } from '../modals/ChallengeHistoryModal';

interface StatusWindowProps {
  onOpenAvatarCustomizer?: () => void;
}

export const StatusWindow: React.FC<StatusWindowProps> = () => {
  const { 
    profile, 
    toggleHardMode, 
    equipItem, 
    unequipItem, 
    getEquippedItems,
    updateProfile,
    isChallengeMapModalOpen,
    openChallengeMapModal,
    closeChallengeMapModal,
    isChallengeHistoryModalOpen,
    openChallengeHistoryModal,
    closeChallengeHistoryModal,
    openStartChallengeModal
  } = useUserStore();
  const { missionLogs, recalibrateFromMissions, missions } = useHabitStore();
  const { getRankByLevel, theme } = useTheme();

  const protocolStatus = evaluateProtocolStatus(profile, missions);
  const hasActiveChallenge = protocolStatus.hasActiveChallenge;

  // Sub-abas do Pergaminho de Status
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'inventory' | 'shop' | 'history'>('stats');
  const [inventoryCategory, setInventoryCategory] = useState<'all' | 'gear' | 'relic' | 'scroll' | 'elixir'>('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const rankInfo = getRankByLevel(profile.level);
  const { currentLevel, currentLevelXp, nextLevelXpThreshold, progressPercent } = getLevelProgress(profile.totalXp);
  const equippedList = getEquippedItems();

  const avatarDisplay = profile.avatarConfig.customEmoji || (profile.gender === 'female' ? '🥷‍♀️' : (rankInfo.badge === '🌱' ? '🥷' : rankInfo.badge));

  const [recalibrateNotice, setRecalibrateNotice] = useState<string | null>(null);
  const [eliteNotice, setEliteNotice] = useState<string | null>(null);
  const completedDays = Object.values(profile.dayLog || {}).filter((d) => d.completed).length;

  const handleRecalibrate = () => {
    const result = recalibrateFromMissions();
    soundFx.playScrollOpen();
    setRecalibrateNotice(`Ficha verificada: ${result.totalXp} XP, Nível ${result.level}, ${result.ryo} Ryō. Nível, patente, sequência e mochila foram conferidos — nada foi apagado.`);
    setTimeout(() => {
      setRecalibrateNotice(null);
    }, 4000);
  };

  return (
    <div className="pb-nav pt-2 px-4 space-y-6">
      <Segmented
        options={[
          { id: 'stats', label: 'Resumo' },
          { id: 'inventory', label: 'Mochila' },
          { id: 'shop', label: 'Loja' },
          { id: 'history', label: 'Histórico' },
        ]}
        value={activeSubTab}
        onChange={setActiveSubTab}
      />

      {activeSubTab === 'stats' && (
        <ProfileOverview
          onEditProfile={() => setIsEditModalOpen(true)}
          onOpenInventory={() => setActiveSubTab('inventory')}
        />
      )}

      {/* SUB-ABA 2: INVENTÁRIO & MOCHILA SHINOBI */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Cabeçalho da Mochila */}
          <div className="pergaminho-bg rounded-2xl border border-shinobi-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold font-bold border border-shinobi-gold/40">
                  Mochila de Relíquias Shinobi
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {profile.inventory.length} Relíquias Desbloqueadas
                </span>
              </div>
              <h2 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                <span>Inventário & Equipamentos de Batalha</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Equipe relíquias para receber bônus passivos de XP em pilares específicos, dano no duelo e escudos.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <Zap className="w-4 h-4 text-shinobi-gold" />
              <div className="text-xs">
                <div className="font-bold text-slate-200">{equippedList.length} Ativas</div>
                <div className="text-[10px] text-slate-400">Slots ocupados</div>
              </div>
            </div>
          </div>

          {/* 1. PAINEL DE SLOTS DE EQUIPAMENTO ATIVO (4 SLOTS TEMÁTICOS) */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-cinzel text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-shinobi-gold" />
                Slots de Equipamento Ativo (Máx. 1 por Tipo)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {equippedList.length} / 4 Slots Ocupados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { type: 'gear', label: 'Equipamento', icon: Swords, color: '#f43f5e' },
                { type: 'relic', label: 'Relíquia', icon: Sparkles, color: '#eab308' },
                { type: 'scroll', label: 'Pergaminho', icon: BookOpen, color: '#06b6d4' },
                { type: 'elixir', label: 'Elixir', icon: FlaskConical, color: '#10b981' },
              ].map((slot) => {
                const SlotIcon = slot.icon;
                const equippedInSlot = equippedList.find((item) => item.type === slot.type);

                return (
                  <div
                    key={slot.type}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      equippedInSlot
                        ? 'bg-slate-950 border-shinobi-gold/60 '
                        : 'bg-slate-950/60 border-dashed border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                        <span className="flex items-center gap-1 font-bold uppercase" style={{ color: slot.color }}>
                          <SlotIcon className="w-3 h-3" /> {slot.label}
                        </span>
                        {equippedInSlot ? (
                          <span className="text-emerald-400 font-bold">ATIVO</span>
                        ) : (
                          <span className="text-slate-600">LIVRE</span>
                        )}
                      </div>

                      {equippedInSlot ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{equippedInSlot.icon}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-100 truncate">
                                {equippedInSlot.name}
                              </div>
                              <div className="text-[10px] text-shinobi-gold font-mono uppercase">
                                {equippedInSlot.rarity}
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-500/30">
                            ✨ +{equippedInSlot.buffValue}% {equippedInSlot.targetPillar ? equippedInSlot.targetPillar.toUpperCase() : equippedInSlot.buffType.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                      ) : (
                        <div className="py-3 text-center">
                          <SlotIcon className="w-6 h-6 mx-auto text-slate-700 mb-1" />
                          <p className="text-[11px] text-slate-500">Slot vazio</p>
                        </div>
                      )}
                    </div>

                    {equippedInSlot && (
                      <button
                        onClick={() => unequipItem(equippedInSlot.id)}
                        className="mt-3 w-full py-1.5 text-[10px] font-mono font-bold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900 border border-rose-800/60 rounded-xl transition-colors"
                      >
                        Desequipar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. GRADE DA MOCHILA (ITENS CONQUISTADOS) */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-cinzel text-base font-bold text-slate-100 flex items-center gap-2">
                  <PackageOpen className="w-4 h-4 text-shinobi-gold" />
                  Itens Guardados na Mochila ({profile.inventory.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Clique em "Equipar" para ativar os efeitos da relíquia no seu guerreiro.
                </p>
              </div>

              {/* Filtros de Tipo */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'gear', label: '⚔️ Equipamentos' },
                  { id: 'relic', label: '🔮 Relíquias' },
                  { id: 'scroll', label: '📜 Pergaminhos' },
                  { id: 'elixir', label: '🧪 Elixires' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setInventoryCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      inventoryCategory === cat.id
                        ? 'bg-shinobi-gold text-slate-950 border-shinobi-gold font-bold '
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {profile.inventory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Sua mochila está vazia. Derrote adversários na Arena de Duelo para forjar relíquias!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {profile.inventory
                  .map((id) => allGameItems[id])
                  .filter(Boolean)
                  .filter((item) => inventoryCategory === 'all' || item.type === inventoryCategory)
                  .map((item) => {
                    const isEquipped = profile.equippedItems.includes(item.id);

                    const rarityColors: Record<string, string> = {
                      common: 'border-slate-600 text-slate-300 bg-slate-800/40',
                      rare: 'border-cyan-500/60 text-cyan-300 bg-cyan-950/30',
                      epic: 'border-purple-500/60 text-purple-300 bg-purple-950/30',
                      legendary: 'border-amber-500/80 text-amber-300 bg-amber-950/40 ',
                    };

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative ${
                          isEquipped
                            ? 'bg-slate-950 border-shinobi-gold/80 scale-[1.01]'
                            : 'bg-slate-950/90 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                              rarityColors[item.rarity] || rarityColors.common
                            }`}>
                              {item.rarity}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              {item.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 mb-2">
                            <span className="text-3xl">{item.icon}</span>
                            <div>
                              <h4 className="font-cinzel text-sm font-bold text-slate-100">
                                {item.name}
                              </h4>
                              {item.targetPillar && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Pilar: {item.targetPillar.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-400 italic mb-3">
                            "{item.description}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <div className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-between">
                            <span>Efeito do Buff:</span>
                            <span>+{item.buffValue}% {item.targetPillar ? item.targetPillar.toUpperCase() : item.buffType.replace('_', ' ').toUpperCase()}</span>
                          </div>

                          {isEquipped ? (
                            <div className="w-full py-2 bg-shinobi-gold/20 border border-shinobi-gold/60 text-shinobi-gold text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Equipado no Guerreiro</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                soundFx.playButtonClick();
                                equipItem(item.id);
                              }}
                              className="w-full py-2 bg-shinobi-crimson hover:opacity-90 text-onaccent font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>Equipar neste Slot</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 3. CATÁLOGO DE RELÍQUIAS DO MUNDO SHINOBI (A CONQUISTAR) */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-cinzel text-base font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-shinobi-gold" />
                  Catálogo de Relíquias ({Object.keys(allGameItems).length})
                </h3>
                <p className="text-xs text-slate-400">
                  Relíquias caem dos chefes da Arena ou são vendidas no Mercado da Vila.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.values(allGameItems).map((item) => {
                const isOwned = profile.inventory.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isOwned
                        ? 'bg-slate-950 border-emerald-500/40 text-slate-200'
                        : 'bg-slate-950/50 border-slate-800 opacity-60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl">{item.icon}</span>
                      {isOwned ? (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Desbloqueado
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> {item.shopPrice ? `Loja • ${item.shopPrice} Ryō` : 'Arena de Duelo'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-100">{item.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{item.description}</div>
                    <div className="text-[10px] font-mono font-bold text-shinobi-gold mt-2">
                      Buff: +{item.buffValue}% {item.buffType.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: LOJA */}
      {activeSubTab === 'shop' && <ShopPanel />}

      {/* SUB-ABA 3: HISTÓRICO DE MISSÕES & LOGS DE XP/RYŌ */}
      {activeSubTab === 'history' && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-shinobi-gold" />
                Histórico & Logs de Missões
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Auditoria de todas as ações de conclusão, estornos e ganhos de XP e Ryō.
              </p>
            </div>

            <button
              onClick={handleRecalibrate}
              className="px-4 py-2.5 bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
              title="Confere nível, patente, sequência e mochila sem apagar nenhum progresso"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>Verificar Ficha</span>
            </button>
          </div>

          {recalibrateNotice && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/60 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in ">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{recalibrateNotice}</span>
            </div>
          )}

          {/* Seção dos Desafios e Ciclos */}
          <div className="pergaminho-bg rounded-2xl border border-shinobi-gold/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-cinzel text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-shinobi-gold" />
                  {hasActiveChallenge && profile.activeChallenge
                    ? `${profile.activeChallenge.title || 'Desafio dos 66 Dias'} — Ciclo Atual #${profile.activeChallenge.cycleNumber || 1}`
                    : 'Desafio — Nenhum Ciclo em Andamento'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {profile.challengeHistory?.length || 0} ciclos arquivados no histórico • {hasActiveChallenge && profile.activeChallenge ? `Meta de ${profile.activeChallenge.targetDays} dias • Regra de no máximo 1 falta/semana` : 'Aguardando você iniciar um novo desafio personalizado'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {hasActiveChallenge ? (
                  <button
                    onClick={openChallengeMapModal}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-shinobi-gold border border-shinobi-gold/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Mapa da Jornada</span>
                  </button>
                ) : (
                  <button
                    onClick={openStartChallengeModal}
                    className="px-3.5 py-1.5 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 "
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Iniciar Desafio</span>
                  </button>
                )}

                <button
                  onClick={openChallengeHistoryModal}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Área de Histórico</span>
                </button>
              </div>
            </div>
          </div>

          {/* Estatísticas da jornada */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs ">
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Dias Cumpridos</span>
              <span className="font-bold text-shinobi-orange font-mono text-sm">{completedDays}</span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Missões Concluídas</span>
              <span className="font-bold text-shinobi-gold font-mono text-sm">{profile.missionsCompletedTotal || 0}</span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Chefes Derrotados</span>
              <span className="font-bold text-rose-300 font-mono text-sm">{profile.bossesDefeated || 0} / 30</span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Recorde de Sequência</span>
              <span className="font-bold text-cyan-400 font-mono text-sm">{profile.bestStreak} dias</span>
            </div>
          </div>

          {/* Lista de Registros do Histórico */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {missionLogs.length > 0 ? (
              missionLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                    log.action === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : log.action === 'reverted'
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-cyan-950/20 border-cyan-500/30'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono uppercase ${
                        log.action === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : log.action === 'reverted'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {log.action === 'completed' ? 'Concluída' : log.action === 'reverted' ? 'Desmarcada' : 'Sincronizado'}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {log.missionTitle}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 font-mono font-bold">
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
              <div className="text-center py-10 text-slate-400 text-xs bg-shinobi-bg/40 rounded-xl border border-shinobi-border/40">
                Nenhum registro no histórico de missões ainda. Marque ou desmarque missões para gerar logs em tempo real.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Dedicado de Edição de Perfil e Avatar */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
};
