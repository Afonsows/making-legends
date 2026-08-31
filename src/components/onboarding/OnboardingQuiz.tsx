import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useTheme } from '../../theme/ThemeContext';
import { soundFx } from '../../utils/audio';
import { ShinobiBackground } from '../ui/ShinobiBackground';
import { 
  Sparkles, 
  ChevronRight, 
  Check, 
  ShieldCheck, 
  Flame, 
  Zap, 
  Lock,
  ArrowRight,
  Gift
} from 'lucide-react';

interface OnboardingQuizProps {
  onFinishOnboarding: () => void;
}

export const OnboardingQuiz: React.FC<OnboardingQuizProps> = ({ onFinishOnboarding }) => {
  const { completeOnboarding } = useUserStore();
  const { setCustomMissionList } = useHabitStore();
  const { theme } = useTheme();

  const [step, setStep] = useState<number>(1);
  const [userName, setUserName] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('all');
  const [screenTimeLevel, setScreenTimeLevel] = useState('high');
  const [workoutFrequency, setWorkoutFrequency] = useState('low');
  const [readingHabit, setReadingHabit] = useState('medium');
  const [biggestObstacle, setBiggestObstacle] = useState('procrastination');

  // Estado da Paywall
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [showPaywall, setShowPaywall] = useState(false);

  const totalSteps = 6;

  const handleNext = () => {
    soundFx.playScrollOpen();
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Exibe a Prévia do Pergaminho Personalizado
      setShowPaywall(true);
    }
  };

  const handleConfirmSubscriptionOrTrial = () => {
    soundFx.playLevelUp();
    completeOnboarding(userName || 'Shinobi Lendário');
    onFinishOnboarding();
  };

  return (
    <div className="min-h-screen bg-shinobi-bg text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Fundo Shinobi Animado em Loop: Fogueira, Shinobi, Lua Nova e Sakura */}
      <ShinobiBackground opacity={1} />

      <div className="w-full max-w-xl relative z-10 space-y-6">
        {/* Header da Academia */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-shinobi-card border border-shinobi-gold/40 text-shinobi-gold text-xs font-mono font-bold shadow-glow-gold/20">
            <span>🥷</span> Avaliação de Aptidão da Academia Shinobi
          </div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Forje Sua Lenda em 66 Dias
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Baseado no protocolo científico de neuroplasticidade de Phillippa Lally (UCL).
          </p>
        </div>

        {/* FLUXO DO QUIZ (Passos 1 a 6) */}
        {!showPaywall ? (
          <div className="bg-shinobi-card/90 backdrop-blur-xl border border-shinobi-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden shinobi-gradient-border">
            {/* Barra de Progresso do Quiz */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Pergunta {step} de {totalSteps}</span>
                <span className="text-shinobi-gold">{Math.round((step / totalSteps) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-shinobi-crimson to-shinobi-gold transition-all duration-300 rounded-full"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* PASSO 1: OBJETIVO CENTRAL */}
            {step === 1 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  1. Qual é o seu objetivo primordial nos próximos 66 dias?
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'all', label: 'Equilíbrio Total nos 5 Pilares (Corpo, Mente, Foco, Disciplina, Espírito)', icon: '🌟' },
                    { id: 'body', label: 'Dominar o Taijutsu: Físico forte, postura e vigor inabalável', icon: '🥋' },
                    { id: 'focus', label: 'Dominar o Genjutsu: Deep work, foco implacável e zero procrastinação', icon: '🎯' },
                    { id: 'mind', label: 'Dominar o Ninjutsu: Leitura diária, novos conhecimentos e projetos', icon: '📜' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedGoal(opt.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        selectedGoal === opt.id
                          ? 'border-shinobi-gold bg-shinobi-gold/10 font-semibold'
                          : 'border-shinobi-border bg-shinobi-bg/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASSO 2: TEMPO DE TELA E DISTRAÇÃO */}
            {step === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  2. Como você avalia seu nível de distração digital hoje?
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'high', label: 'Alto: Perco mais de 2 a 4 horas por dia em feeds e redes sociais', icon: '📱' },
                    { id: 'medium', label: 'Moderado: Consigo focar, mas caio em distrações com frequência', icon: '⏳' },
                    { id: 'low', label: 'Controlado: Tenho boa disciplina, mas quero atingir nível de elite', icon: '⚡' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setScreenTimeLevel(opt.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        screenTimeLevel === opt.id
                          ? 'border-shinobi-crimson bg-shinobi-crimson/10 font-semibold'
                          : 'border-shinobi-border bg-shinobi-bg/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASSO 3: TAIJUTSU / ATIVIDADE FÍSICA */}
            {step === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  3. Com que frequência você treina seu corpo atualmente?
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'low', label: 'Sedentário ou menos de 1x por semana (Preciso recomeçar do zero)', icon: '🌱' },
                    { id: 'medium', label: '2 a 3 vezes por semana (Quero mais consistência e intensidade)', icon: '⚔️' },
                    { id: 'high', label: '4+ vezes por semana (Já tenho rotina, quero hiperfoco e postura)', icon: '🔥' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setWorkoutFrequency(opt.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        workoutFrequency === opt.id
                          ? 'border-shinobi-jade bg-shinobi-jade/10 font-semibold'
                          : 'border-shinobi-border bg-shinobi-bg/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASSO 4: NINJUTSU / LEITURA */}
            {step === 4 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  4. Como está seu hábito diário de leitura e estudo?
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'zero', label: 'Quase zero: Não leio um livro do início ao fim há meses', icon: '📖' },
                    { id: 'medium', label: 'Esporádico: Leio quando lembro, sem meta fixa de páginas', icon: '📜' },
                    { id: 'high', label: 'Consistente: Leio diariamente e busco aplicar o conhecimento', icon: '💡' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setReadingHabit(opt.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        readingHabit === opt.id
                          ? 'border-cyan-400 bg-cyan-950/30 font-semibold'
                          : 'border-shinobi-border bg-shinobi-bg/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASSO 5: MAIOR OBSTÁCULO */}
            {step === 5 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  5. Qual tem sido o seu maior inimigo nos hábitos passados?
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'procrastination', label: 'Atrito inicial: Adio o começo até o dia acabar', icon: '🛑' },
                    { id: 'streak_break', label: 'Desmotivação pós-falha: Falho 1 dia e desisto da semana toda', icon: '💔' },
                    { id: 'no_game', label: 'Falta de motivação: Apps tradicionais de hábitos são chatos e burocráticos', icon: '🥱' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setBiggestObstacle(opt.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        biggestObstacle === opt.id
                          ? 'border-amber-400 bg-amber-950/30 font-semibold'
                          : 'border-shinobi-border bg-shinobi-bg/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASSO 6: NOME DO GUERREIRO */}
            {step === 6 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  6. Como devemos chamar sua lenda no Pergaminho de Status?
                </h3>
                <p className="text-xs text-slate-400">
                  Digite seu nome real ou um codinome shinobi de treinamento.
                </p>
                <input
                  type="text"
                  placeholder="Ex: Marcus, Afonso, Sombra de Ferro..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-shinobi-gold transition-colors"
                />
              </div>
            )}

            {/* Botão de Avanço */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-shinobi-crimson to-shinobi-crimsonGlow text-white font-bold text-xs rounded-xl shadow-glow-crimson hover:opacity-95 transition-all flex items-center gap-2"
              >
                <span>{step === totalSteps ? 'Gerar Pergaminho de Missão' : 'Próxima Avaliação'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* PRÉVIA DO PERGAMINHO DE MISSÃO + PAYWALL TRANSPARENTE */
          <div className="space-y-4">
            {/* O Pergaminho de Missão Gerado */}
            <div className="pergaminho-bg border border-shinobi-gold/60 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-shinobi-gold">
                    PLANO PERSONALIZADO DE 66 DIAS
                  </span>
                  <h2 className="font-cinzel text-lg font-bold text-slate-100">
                    Pergaminho de {userName || 'Aspirante'}
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-shinobi-card border border-shinobi-gold flex items-center justify-center text-lg shadow-glow-gold/30">
                  🌱
                </div>
              </div>

              <p className="text-xs text-slate-300">
                Seu programa de treinamento foi forjado sob medida para eliminar o atrito inicial e conduzir você ao rank <strong>Kage</strong>:
              </p>

              {/* Prévia das Missões Iniciais */}
              <div className="space-y-2">
                {[
                  { title: 'Treino de Taijutsu (30 min)', pillar: 'Taijutsu (Corpo)', rank: 'C', xp: '+85 XP', badge: '🥋' },
                  { title: 'Leitura Focada dos Pergaminhos (15 min)', pillar: 'Ninjutsu (Mente)', rank: 'D', xp: '+50 XP', badge: '📜' },
                  { title: 'Sessão de Deep Work sem Redes Sociais (45 min)', pillar: 'Genjutsu (Foco)', rank: 'B', xp: '+140 XP', badge: '🎯' },
                  { title: 'Despertar Sem Telas & 500ml de Água', pillar: 'Chakra (Disciplina)', rank: 'E', xp: '+25 XP', badge: '⚡' },
                ].map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-shinobi-card/80 border border-shinobi-border text-xs">
                    <div className="flex items-center gap-2">
                      <span>{m.badge}</span>
                      <span className="font-semibold text-slate-200">{m.title}</span>
                    </div>
                    <span className="font-mono text-[10px] text-shinobi-gold font-bold bg-shinobi-gold/10 px-2 py-0.5 rounded">
                      {m.xp}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-shinobi-card p-3 rounded-xl border border-shinobi-border text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-shinobi-jade font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Escudo Semanal Ativo: 1 falha permitida por semana sem zerar o protocolo
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Flame className="w-3.5 h-3.5 text-rose-500" /> Duelo contra o Boss #1 pronto para receber dano diário
                </div>
              </div>
            </div>

            {/* PAYWALL TRANSPARENTE COM PREÇO VISÍVEL E SEM PEGADINHAS */}
            <div className="bg-shinobi-card border border-shinobi-border rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-shinobi-jade bg-shinobi-jade/10 px-2.5 py-0.5 rounded-full border border-shinobi-jade/30">
                  7 DIAS DE TESTE TOTALMENTE GRATUITO
                </span>
                <h3 className="font-cinzel text-lg font-bold text-slate-100">
                  Escolha Seu Acesso ao Treinamento
                </h3>
                <p className="text-xs text-slate-400">
                  Cancele quando quiser com 1 clique. Preço 100% transparente.
                </p>
              </div>

              {/* Seleção de Planos (Mensal vs Anual) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Plano Anual (Mais Popular) */}
                <button
                  onClick={() => setSelectedPlan('annual')}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    selectedPlan === 'annual'
                      ? 'border-shinobi-gold bg-shinobi-gold/10 shadow-glow-gold/30'
                      : 'border-shinobi-border bg-shinobi-bg/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  <span className="absolute -top-2.5 right-3 bg-shinobi-gold text-shinobi-bg text-[9px] font-bold px-2 py-0.5 rounded-full">
                    ECONOMIZE 50%
                  </span>
                  <div className="font-bold text-slate-100 text-xs">Plano Anual Shinobi</div>
                  <div className="text-lg font-mono font-bold text-shinobi-gold mt-1">
                    R$ 14,90 <span className="text-[11px] font-normal text-slate-400">/ mês</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Cobrado anualmente (R$ 178,80/ano) após os 7 dias grátis.
                  </div>
                </button>

                {/* Plano Mensal */}
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedPlan === 'monthly'
                      ? 'border-shinobi-gold bg-shinobi-gold/10 shadow-glow-gold/30'
                      : 'border-shinobi-border bg-shinobi-bg/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="font-bold text-slate-100 text-xs">Plano Mensal</div>
                  <div className="text-lg font-mono font-bold text-slate-100 mt-1">
                    R$ 29,90 <span className="text-[11px] font-normal text-slate-400">/ mês</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Flexibilidade total, renovação mensal sem fidelidade.
                  </div>
                </button>
              </div>

              {/* Botão de Ativação do Teste */}
              <button
                onClick={handleConfirmSubscriptionOrTrial}
                className="w-full py-3.5 bg-gradient-to-r from-shinobi-crimson to-shinobi-crimsonGlow hover:opacity-95 text-white font-bold text-sm rounded-xl shadow-glow-crimson transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Iniciar Meus 7 Dias Grátis & Desbloquear</span>
              </button>

              <div className="text-center">
                <button
                  onClick={handleConfirmSubscriptionOrTrial}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-colors"
                >
                  Continuar com versão gratuita limitada (3 missões diárias)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
