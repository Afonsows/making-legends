import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useTheme } from '../../theme/ThemeContext';
import { soundFx } from '../../utils/audio';
import { ShinobiBackground } from '../ui/ShinobiBackground';
import { supabase } from '../../services/supabase';
import { syncService } from '../../services/syncService';
import { 
  Sparkles, 
  ChevronRight, 
  Check, 
  ShieldCheck, 
  Flame, 
  Zap, 
  Lock, 
  ArrowRight,
  User,
  Mail,
  Phone,
  Key,
  LogIn,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface OnboardingQuizProps {
  onFinishOnboarding: () => void;
}

export const OnboardingQuiz: React.FC<OnboardingQuizProps> = ({ onFinishOnboarding }) => {
  const { completeOnboarding } = useUserStore();
  const { setCustomMissionList, missions } = useHabitStore();
  const { theme } = useTheme();

  // Estados do Quiz
  const [step, setStep] = useState<number>(1);
  const [selectedGoal, setSelectedGoal] = useState('all');
  const [screenTimeLevel, setScreenTimeLevel] = useState('high');
  const [workoutFrequency, setWorkoutFrequency] = useState('low');
  const [readingHabit, setReadingHabit] = useState('medium');
  const [biggestObstacle, setBiggestObstacle] = useState('procrastination');

  // Estados de Cadastro
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userWhatsapp, setUserWhatsapp] = useState('');
  const [userPassword, setUserPassword] = useState('');

  // Estados de Autenticação / Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Estados de Login Direto
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const totalSteps = 6;

  const handleNext = () => {
    soundFx.playScrollOpen();
    setErrorMessage(null);

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Passo 6: Submeter Cadastro Real no Supabase
      handleRegisterAndComplete();
    }
  };

  // Formatação de WhatsApp
  const formatWhatsapp = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return cleaned.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  // Cadastro Real com Supabase Auth e RLS
  const handleRegisterAndComplete = async () => {
    if (!userName.trim()) {
      setErrorMessage('Por favor, informe seu nome ou codinome shinobi.');
      return;
    }
    if (!userEmail.trim() || !userEmail.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido para sua conta.');
      return;
    }
    if (!userWhatsapp.trim() || userWhatsapp.replace(/\D/g, '').length < 10) {
      setErrorMessage('Por favor, informe seu WhatsApp com DDD.');
      return;
    }
    if (!userPassword || userPassword.length < 6) {
      setErrorMessage('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Cria o usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: userEmail.trim(),
        password: userPassword,
        options: {
          data: {
            name: userName.trim(),
            whatsapp: userWhatsapp.replace(/\D/g, ''),
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setErrorMessage('Este e-mail já está cadastrado. Clique em "Já possuo uma conta" abaixo para entrar.');
        } else {
          setErrorMessage(error.message);
        }
        setIsLoading(false);
        return;
      }

      const user = data.user;
      if (user) {
        // 2. Atualiza estado local do usuário
        completeOnboarding(userName.trim());

        // 3. Sincroniza dados iniciais no Supabase PostgreSQL
        const updatedProfile = useUserStore.getState().profile;
        await syncService.pushUserProfile(updatedProfile, user.id);
        await syncService.pushMissions(missions, user.id);
      }

      soundFx.playLevelUp();
      onFinishOnboarding();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Login Direto para Usuários Existentes
  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMessage('Preencha e-mail e senha.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        setErrorMessage('Credenciais incorretas ou conta não encontrada.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Baixa os dados da conta da nuvem
        await syncService.pullUserData(data.user.id);
        soundFx.playLevelUp();
        onFinishOnboarding();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-shinobi-bg text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Fundo Shinobi Animado em Loop: Fogueira, Shinobi, Lua Cheia, Brasas e Sakura */}
      <ShinobiBackground opacity={1} />

      <div className="w-full max-w-xl relative z-10 space-y-6">
        {/* Header da Academia */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-shinobi-card/90 border border-shinobi-gold/40 text-shinobi-gold text-xs font-mono font-bold shadow-glow-gold/20">
            <span>🥷</span> Avaliação de Aptidão da Academia Shinobi
          </div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Forje Sua Lenda em 66 Dias
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Baseado no protocolo científico de neuroplasticidade de Phillippa Lally (UCL).
          </p>
        </div>

        {/* MODAL / ABA DE LOGIN DIRETO PARA QUEM JÁ TEM CONTA */}
        {showLoginModal ? (
          <div className="bg-slate-950/85 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative overflow-hidden shinobi-gradient-border">
            <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
              <h2 className="font-cinzel text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <LogIn className="w-4 h-4 text-shinobi-gold" />
                Acessar Minha Conta
              </h2>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setErrorMessage(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Voltar ao Quiz
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleDirectLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="seuemail@exemplo.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-shinobi-gold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" /> Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="Sua senha secreta"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-shinobi-gold"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-shinobi-crimson to-shinobi-crimsonGlow text-white font-bold text-xs rounded-xl shadow-glow-crimson hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conectando à nuvem...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar no Dojo</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* FLUXO DO QUIZ (Passos 1 a 6) */
          <div className="bg-slate-950/85 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden shinobi-gradient-border">
            {/* Barra de Progresso do Quiz */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Passo {step} de {totalSteps}</span>
                <span className="text-shinobi-gold">{Math.round((step / totalSteps) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-shinobi-crimson to-shinobi-gold transition-all duration-300 rounded-full"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Mensagem de Erro se houver */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

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

            {/* PASSO 3: FREQUÊNCIA DE TREINO */}
            {step === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  3. Qual a sua frequência atual de atividade física?
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'low', label: 'Sedentário ou menos de 2x na semana', icon: '🍃' },
                    { id: 'medium', label: 'Regular: Treino 2 a 4x na semana com oscilações', icon: '⚔️' },
                    { id: 'high', label: 'Atleta consistente: Treino 5x+ e quero avançar na forja física', icon: '🔥' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setWorkoutFrequency(opt.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        workoutFrequency === opt.id
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

            {/* PASSO 4: HÁBITO DE LEITURA E CONHECIMENTO */}
            {step === 4 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  4. Como está seu hábito diário de absorção de livros e estudos?
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'low', label: 'Raro: Não leio quase nada nos últimos meses', icon: '📭' },
                    { id: 'medium', label: 'Inconstante: Leio alguns dias, mas perco o ritmo facilmente', icon: '📖' },
                    { id: 'high', label: 'Diário: Leio todos os dias e busco aplicar o conhecimento', icon: '🏮' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setReadingHabit(opt.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        readingHabit === opt.id
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

            {/* PASSO 6: CADASTRO COMPLETO DO GUERREIRO (NOME, EMAIL, WHATSAPP, SENHA) */}
            {step === 6 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100">
                    6. Forje a sua Ficha de Aspirante Shinobi
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Seus dados permitirão sincronizar seu progresso, subir de patente e acessar em qualquer dispositivo.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Nome */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-shinobi-gold" /> Nome ou Codinome Shinobi
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Afonso, Marcus, Sombra Noturna..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-shinobi-gold transition-colors"
                    />
                  </div>

                  {/* E-mail */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-shinobi-chakra" /> E-mail (Para Login e Recuperação)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="seuemail@exemplo.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-shinobi-gold transition-colors"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp com DDD
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="(11) 99999-9999"
                      value={userWhatsapp}
                      onChange={(e) => setUserWhatsapp(formatWhatsapp(e.target.value))}
                      className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-shinobi-gold transition-colors"
                    />
                  </div>

                  {/* Senha */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-shinobi-crimson" /> Senha de Acesso (mínimo 6 dígitos)
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-shinobi-gold transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-shinobi-border">
              {/* Link para quem já tem conta */}
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(true);
                  setErrorMessage(null);
                }}
                className="text-xs text-slate-400 hover:text-shinobi-gold flex items-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Já possui uma conta? <strong>Entrar</strong></span>
              </button>

              {/* Botão de Avanço / Criação de Conta */}
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-shinobi-crimson to-shinobi-crimsonGlow text-white font-bold text-xs rounded-xl shadow-glow-crimson hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Forjando Ficha Shinobi...</span>
                  </>
                ) : (
                  <>
                    <span>{step === totalSteps ? 'Criar Conta & Iniciar Protocolo' : 'Próxima Avaliação'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
