import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { syncService } from '../../services/syncService';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { X, Mail, Lock, Sparkles, User, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { email?: string; id?: string } | null;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
}) => {
  const { profile } = useUserStore();
  const { missions } = useHabitStore();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: profile.name || 'Aspirante Shinobi',
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Faz o primeiro sync do progresso local para a nuvem
          await syncService.pushUserProfile(profile, data.user.id);
          await syncService.pushMissions(missions, data.user.id);
          soundFx.playLevelUp();
          setMessage({
            text: 'Conta criada com sucesso! Seus dados e sequências estão sincronizados na nuvem.',
            type: 'success',
          });
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          await syncService.pullUserData(data.user.id);
          soundFx.playLevelUp();
          setMessage({
            text: 'Login realizado! Seu progresso foi restaurado.',
            type: 'success',
          });
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setMessage({
        text: errorObj.message || 'Erro ao processar autenticação.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 my-auto relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Making Legends" className="w-6 h-6 rounded-md border border-shinobi-crimson/50 shadow-glow-crimson object-cover" />
            <h3 className="font-cinzel text-base font-bold text-slate-100">
              {currentUser ? 'Conta Shinobi Conectada' : 'Salvar Progresso na Nuvem'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SE JÁ ESTIVER LOGADO */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="bg-shinobi-bg p-4 rounded-xl border border-shinobi-border space-y-2 text-xs">
              <div className="flex items-center gap-2 text-shinobi-jade font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Sincronização em Tempo Real Ativa
              </div>
              <p className="text-slate-300">
                Logado como: <strong>{currentUser.email}</strong>
              </p>
              <p className="text-slate-400 text-[11px]">
                Seu progresso do protocolo dos 66 dias, duelos e hábitos estão salvos com segurança no Supabase.
              </p>
            </div>

            <button
              onClick={onLogout}
              className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/50 text-rose-400 hover:text-rose-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Desconectar desta conta
            </button>
          </div>
        ) : (
          /* FORMULÁRIO DE LOGIN / CADASTRO */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-1 bg-shinobi-bg p-1 rounded-xl border border-shinobi-border">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'signup'
                    ? 'bg-shinobi-gold text-shinobi-bg shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Criar Nova Conta
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'login'
                    ? 'bg-shinobi-gold text-shinobi-bg shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Já Tenho Conta
              </button>
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500 text-rose-300'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-shinobi-gold transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo de 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-shinobi-gold transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-shinobi-crimson to-shinobi-crimsonGlow text-white font-bold text-xs rounded-xl shadow-glow-crimson hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Sincronizando com o Supabase...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{mode === 'signup' ? 'Cadastrar & Sincronizar' : 'Entrar na Conta'}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
