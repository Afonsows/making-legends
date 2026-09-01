import React, { useState, useEffect } from 'react';
import { useToolStore, bookSummariesList } from '../../state/useToolStore';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { soundFx } from '../../utils/audio';
import { getTodayString } from '../../core/streakEngine';
import { 
  Utensils, 
  Timer, 
  BookOpen, 
  Wind, 
  Lock, 
  Dumbbell, 
  Moon, 
  Droplet,
  Plus, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Sparkles,
  ChevronRight,
  Flame
} from 'lucide-react';

type ActiveTool = 'nutrition' | 'pomodoro' | 'books' | 'meditation' | 'seallock' | 'workout' | 'body' | null;

export const ToolsHub: React.FC = () => {
  const { 
    nutritionLogs, 
    currentCalorieTarget, 
    currentProteinTarget,
    addMeal, 
    setNutritionTargets,
    pomodoroSessionsCompletedToday, 
    incrementPomodoroSession,
    meditationMinutesToday, 
    logMeditationSession,
    sealLockActive, 
    setSealLock,
    bodyJournal, 
    addWaterGlass, 
    removeWaterGlass, 
    logSleep,
    trainingLogs, 
    addTrainingLog 
  } = useToolStore();

  const { addXp, addRyo } = useUserStore();
  const { theme } = useTheme();

  const [activeTool, setActiveTool] = useState<ActiveTool>('nutrition');

  // Estado Pomodoro
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [isPomoRunning, setIsPomoRunning] = useState(false);
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');

  // Estado Meditação
  const [breathPhase, setBreathPhase] = useState<'Inspire' | 'Segure' | 'Expire' | 'Vazio'>('Inspire');
  const [breathSeconds, setBreathSeconds] = useState(4);
  const [isMeditating, setIsMeditating] = useState(false);
  const [meditationElapsed, setMeditationElapsed] = useState(0);

  // Formulário de Refeição
  const [mealName, setMealName] = useState('');
  const [mealCals, setMealCals] = useState('');
  const [mealProtein, setMealProtein] = useState('');

  // Formulário de Treino
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseCategory, setExerciseCategory] = useState<'forca' | 'resistencia' | 'mobilidade' | 'artes_marciais'>('forca');
  const [exerciseSets, setExerciseSets] = useState('3');
  const [exerciseReps, setExerciseReps] = useState('12 repetições');

  // Formulário de Sono
  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(4);

  const todayStr = getTodayString();
  const todayNutri = nutritionLogs[todayStr] || {
    caloriesConsumed: 0,
    proteinGrams: 0,
    meals: []
  };
  const todayBody = bodyJournal[todayStr] || {
    waterGlasses: 4,
    sleepHours: 7,
    sleepQuality: 4
  };

  // Timer Pomodoro Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPomoRunning && pomoSeconds > 0) {
      interval = setInterval(() => {
        setPomoSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isPomoRunning && pomoSeconds === 0) {
      soundFx.playZenBell();
      if (pomoMode === 'work') {
        incrementPomodoroSession();
        addXp(60, 'genjutsu');
        setPomoMode('break');
        setPomoSeconds(5 * 60);
      } else {
        setPomoMode('work');
        setPomoSeconds(25 * 60);
      }
      setIsPomoRunning(false);
    }
    return () => clearInterval(interval);
  }, [isPomoRunning, pomoSeconds, pomoMode]);

  // Meditação 4-4-4-4 Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMeditating) {
      interval = setInterval(() => {
        setMeditationElapsed((prev) => prev + 1);
        setBreathSeconds((prev) => {
          if (prev <= 1) {
            // Ciclo 4x4
            setBreathPhase((current) => {
              if (current === 'Inspire') return 'Segure';
              if (current === 'Segure') return 'Expire';
              if (current === 'Expire') return 'Vazio';
              return 'Inspire';
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isMeditating]);

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    const cals = parseInt(mealCals, 10) || 0;
    const protein = parseInt(mealProtein, 10) || 0;

    addMeal({
      name: mealName.trim(),
      calories: cals,
      protein: protein,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    addXp(15, 'taijutsu');
    addRyo(10);
    setMealName('');
    setMealCals('');
    setMealProtein('');
  };

  const handleAddWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseName.trim()) return;

    addTrainingLog({
      exerciseName: exerciseName.trim(),
      category: exerciseCategory,
      sets: parseInt(exerciseSets, 10) || 3,
      repsOrMinutes: exerciseReps,
      rpeIntensity: 8
    });

    addXp(40, 'taijutsu');
    addRyo(30);
    soundFx.playMissionComplete();
    setExerciseName('');
  };

  const handleSaveSleep = () => {
    logSleep(sleepHours, sleepQuality);
    addXp(20, 'taijutsu');
    addRyo(15);
    soundFx.playMissionComplete();
  };

  const toolsList: { id: ActiveTool; name: string; icon: React.ComponentType<{ className?: string }>; color: string; desc: string }[] = [
    { id: 'nutrition', name: 'Diário de Nutrição', icon: Utensils, color: '#f43f5e', desc: 'Controle de calorias e proteínas do guerreiro' },
    { id: 'pomodoro', name: 'Técnica de Concentração', icon: Timer, color: '#8b5cf6', desc: 'Timer Pomodoro Shinobi de foco profundo' },
    { id: 'books', name: 'Pergaminhos de Conhecimento', icon: BookOpen, color: '#06b6d4', desc: 'Resumos práticos de alta performance' },
    { id: 'meditation', name: 'Meditação do Chakra', icon: Wind, color: '#10b981', desc: 'Respiração tática 4-4-4-4 e foco zen' },
    { id: 'seallock', name: 'Selo de Bloqueio', icon: Lock, color: '#eab308', desc: 'Compromisso de foco e desintoxicação digital' },
    { id: 'workout', name: 'Registro de Treinamento', icon: Dumbbell, color: '#e11d48', desc: 'Registro de séries e exercícios de Taijutsu' },
    { id: 'body', name: 'Diário do Corpo', icon: Droplet, color: '#38bdf8', desc: 'Rastreador de hidratação e qualidade de sono' },
  ];

  return (
    <div className="pb-24 pt-3 max-w-4xl mx-auto px-4 space-y-4">
      {/* Header do Hub */}
      <div className="pergaminho-bg rounded-2xl border border-shinobi-border p-4 shadow-xl">
        <h2 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>7 Mini-Ferramentas Shinobi</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Instrumentos práticos de apoio para disciplina, mente, corpo e recuperação.
        </p>

        {/* Menu de Seleção das 7 Ferramentas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mt-3">
          {toolsList.map((tool) => {
            const Icon = tool.icon;
            const isSelected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all shadow-md ${
                  isSelected
                    ? 'bg-slate-900 shadow-xl scale-105 font-bold'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white'
                }`}
                style={{
                  borderColor: isSelected ? tool.color : undefined,
                  color: isSelected ? tool.color : undefined
                }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] text-center font-semibold line-clamp-1">
                  {tool.name.split(' ')[0]} {tool.name.split(' ')[1]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da Ferramenta Ativa */}

      {/* 1. DIÁRIO DE NUTRIÇÃO */}
      {activeTool === 'nutrition' && (
        <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-rose-500" />
              <h3 className="font-cinzel text-base font-bold text-slate-100">
                Diário de Nutrição do Guerreiro
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Hoje: {todayNutri.caloriesConsumed} / {currentCalorieTarget} kcal
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Medidores de Calorias e Proteína */}
            <div className="bg-shinobi-bg p-4 rounded-xl border border-shinobi-border space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Calorias Consumidas</span>
                  <span className="font-mono text-rose-400 font-bold">{todayNutri.caloriesConsumed} / {currentCalorieTarget} kcal</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (todayNutri.caloriesConsumed / currentCalorieTarget) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Proteína Forjada</span>
                  <span className="font-mono text-shinobi-gold font-bold">{todayNutri.proteinGrams} / {currentProteinTarget}g</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-shinobi-gold rounded-full transition-all"
                    style={{ width: `${Math.min(100, (todayNutri.proteinGrams / currentProteinTarget) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Adicionar Refeição */}
            <form onSubmit={handleAddMeal} className="bg-shinobi-bg p-4 rounded-xl border border-shinobi-border space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200">Registrar Refeição Rápida</h4>
              <input
                type="text"
                placeholder="Ex: Ovos, frango com arroz, shake de proteína..."
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                className="w-full bg-shinobi-card border border-shinobi-border rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Calorias (kcal)"
                  value={mealCals}
                  onChange={(e) => setMealCals(e.target.value)}
                  className="bg-shinobi-card border border-shinobi-border rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                />
                <input
                  type="number"
                  placeholder="Proteína (g)"
                  value={mealProtein}
                  onChange={(e) => setMealProtein(e.target.value)}
                  className="bg-shinobi-card border border-shinobi-border rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Refeição (+15 XP Taijutsu)
              </button>
            </form>
          </div>

          {/* Lista de Refeições */}
          {todayNutri.meals.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-300">Refeições de Hoje</h4>
              {todayNutri.meals.map((meal, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-shinobi-bg border border-shinobi-border text-xs">
                  <span className="font-semibold text-slate-200">{meal.name}</span>
                  <div className="flex items-center gap-3 font-mono text-slate-400">
                    <span>{meal.calories} kcal</span>
                    <span className="text-shinobi-gold">{meal.protein}g prot</span>
                    <span className="text-[10px] text-slate-500">{meal.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. TÉCNICA DE CONCENTRAÇÃO (POMODORO) */}
      {activeTool === 'pomodoro' && (
        <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-6 text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <Timer className="w-6 h-6 text-purple-400" />
            <h3 className="font-cinzel text-lg font-bold text-slate-100">
              Técnica de Concentração (Pomodoro Shinobi)
            </h3>
          </div>

          <div className="flex justify-center gap-2">
            <button
              onClick={() => {
                setPomoMode('work');
                setPomoSeconds(25 * 60);
                setIsPomoRunning(false);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                pomoMode === 'work' && pomoSeconds === 25 * 60
                  ? 'bg-purple-600 text-white shadow-glow-violet'
                  : 'bg-shinobi-bg border border-shinobi-border text-slate-400'
              }`}
            >
              Foco 25min
            </button>
            <button
              onClick={() => {
                setPomoMode('work');
                setPomoSeconds(50 * 60);
                setIsPomoRunning(false);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                pomoMode === 'work' && pomoSeconds === 50 * 60
                  ? 'bg-purple-600 text-white shadow-glow-violet'
                  : 'bg-shinobi-bg border border-shinobi-border text-slate-400'
              }`}
            >
              Foco Mestre 50min
            </button>
            <button
              onClick={() => {
                setPomoMode('break');
                setPomoSeconds(5 * 60);
                setIsPomoRunning(false);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                pomoMode === 'break'
                  ? 'bg-emerald-600 text-white shadow-glow-jade'
                  : 'bg-shinobi-bg border border-shinobi-border text-slate-400'
              }`}
            >
              Descanso 5min
            </button>
          </div>

          {/* Relógio Gigante */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-56 h-56 rounded-full bg-shinobi-bg border-4 border-purple-500/40 flex flex-col items-center justify-center shadow-glow-violet/30">
              <span className="font-mono text-5xl font-bold tracking-tight text-slate-100">
                {String(Math.floor(pomoSeconds / 60)).padStart(2, '0')}:
                {String(pomoSeconds % 60).padStart(2, '0')}
              </span>
              <span className="text-xs text-purple-400 font-mono mt-1 uppercase tracking-widest">
                {pomoMode === 'work' ? 'Sessão de Foco' : 'Descanso Zen'}
              </span>
            </div>
          </div>

          {/* Controles do Timer */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                soundFx.playZenBell();
                setIsPomoRunning(!isPomoRunning);
              }}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl shadow-glow-violet transition-all flex items-center gap-2"
            >
              {isPomoRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPomoRunning ? 'Pausar Foco' : 'Iniciar Foco'}
            </button>
            <button
              onClick={() => {
                setIsPomoRunning(false);
                setPomoSeconds(pomoMode === 'work' ? 25 * 60 : 5 * 60);
              }}
              className="p-3 bg-shinobi-bg border border-shinobi-border text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Sessões de Foco completas hoje: <span className="font-bold text-shinobi-gold">{pomodoroSessionsCompletedToday}</span> (+60 XP Genjutsu por sessão)
          </div>
        </div>
      )}

      {/* 3. PERGAMINHOS DE CONHECIMENTO */}
      {activeTool === 'books' && (
        <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h3 className="font-cinzel text-base font-bold text-slate-100">
                Pergaminhos de Conhecimento (Resumos IA)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {bookSummariesList.length} Obras Sintetizadas
            </span>
          </div>

          <div className="space-y-4">
            {bookSummariesList.map((book) => (
              <div key={book.id} className="bg-shinobi-bg border border-shinobi-border p-4 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{book.coverEmoji}</span>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{book.title}</h4>
                      <p className="text-xs text-slate-400">Por {book.author} • {book.readTime}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 italic bg-shinobi-card/60 p-2.5 rounded-lg border border-shinobi-border/60">
                  💡 Tese Central: {book.coreThesis}
                </p>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-cyan-400 uppercase font-mono">Jutsus Práticos para Executar:</div>
                  {book.keyJutsus.map((jutsu, jIdx) => (
                    <div key={jIdx} className="bg-shinobi-card p-2.5 rounded-lg border border-shinobi-border/80 text-xs">
                      <div className="font-bold text-slate-200">{jutsu.rule}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{jutsu.explanation}</div>
                      <div className="text-emerald-400 font-semibold text-[11px] mt-1 flex items-center gap-1">
                        <span>⚡ Ação Imediata:</span> {jutsu.actionableStep}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MEDITAÇÃO DO CHAKRA */}
      {activeTool === 'meditation' && (
        <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-6 text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <Wind className="w-6 h-6 text-emerald-400" />
            <h3 className="font-cinzel text-lg font-bold text-slate-100">
              Meditação do Chakra (Respiração 4-4-4-4)
            </h3>
          </div>

          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Técnica samurai de controle do sistema nervoso: 4s Inspire, 4s Segure, 4s Expire, 4s Vazio.
          </p>

          {/* Animação Circular de Respiração */}
          <div className="relative inline-flex items-center justify-center">
            <div className={`w-52 h-52 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-1000 ${
              breathPhase === 'Inspire'
                ? 'scale-110 border-emerald-400 bg-emerald-950/30 shadow-glow-jade'
                : breathPhase === 'Segure'
                ? 'scale-110 border-amber-400 bg-amber-950/30 shadow-glow-gold'
                : breathPhase === 'Expire'
                ? 'scale-90 border-cyan-400 bg-cyan-950/30 shadow-glow-chakra'
                : 'scale-85 border-slate-600 bg-slate-900'
            }`}>
              <span className="font-cinzel text-2xl font-bold text-slate-100">{breathPhase}</span>
              <span className="font-mono text-4xl font-bold text-slate-200 mt-1">{breathSeconds}s</span>
            </div>
          </div>

          {/* Controles de Meditação */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                soundFx.playZenBell();
                setIsMeditating(!isMeditating);
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-glow-jade transition-all flex items-center gap-2"
            >
              {isMeditating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isMeditating ? 'Pausar Respiração' : 'Iniciar Respiração Guiada'}
            </button>

            {meditationElapsed > 60 && (
              <button
                onClick={() => {
                  const minutes = Math.floor(meditationElapsed / 60);
                  logMeditationSession(minutes);
                  addXp(minutes * 20, 'chakra');
                  addRyo(minutes * 15);
                  soundFx.playLevelUp();
                  setMeditationElapsed(0);
                  setIsMeditating(false);
                }}
                className="px-4 py-3 bg-shinobi-gold text-shinobi-bg font-bold text-xs rounded-xl shadow-glow-gold transition-all"
              >
                Concluir Sessão (+{Math.floor(meditationElapsed / 60) * 20} XP, +{Math.floor(meditationElapsed / 60) * 15} Ryō)
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. SELO DE BLOQUEIO (APP LOCK / SCREEN TIME) */}
      {activeTool === 'seallock' && (
        <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 mx-auto flex items-center justify-center text-2xl shadow-glow-gold">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          <h3 className="font-cinzel text-lg font-bold text-slate-100">
            Selo de Bloqueio & Desintoxicação Digital
          </h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Ative o selo para firmar um compromisso inegociável de foco. Bloqueie notificações, redes sociais e tempo de tela passivo durante a janela de treino.
          </p>

          <div className="bg-shinobi-bg p-4 rounded-xl border border-shinobi-border max-w-md mx-auto text-left space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <Check className="w-4 h-4 text-shinobi-jade" /> Modo Não Perturbe ativado no smartphone
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <Check className="w-4 h-4 text-shinobi-jade" /> Aparelho guardado fora do campo de visão
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <Check className="w-4 h-4 text-shinobi-jade" /> Compromisso de não abrir redes sociais até as 18h
            </div>
          </div>

          <button
            onClick={() => {
              setSealLock(!sealLockActive, 60);
              if (!sealLockActive) {
                soundFx.playMissionComplete();
                addXp(30, 'chakra');
                addRyo(20);
              }
            }}
            className={`px-6 py-3 font-bold text-xs rounded-xl transition-all ${
              sealLockActive
                ? 'bg-rose-600 text-white'
                : 'bg-shinobi-gold text-shinobi-bg shadow-glow-gold'
            }`}
          >
            {sealLockActive ? 'Desativar Selo de Bloqueio' : 'Ativar Selo de Bloqueio (+30 XP, +20 Ryō)'}
          </button>
        </div>
      )}

      {/* 6. REGISTRO DE TREINAMENTO (TAIJUTSU) */}
      {activeTool === 'workout' && (
        <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-rose-500" />
              <h3 className="font-cinzel text-base font-bold text-slate-100">
                Registro de Treinamento (Taijutsu)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {trainingLogs.length} Treinos Registrados
            </span>
          </div>

          {/* Formulário de Exercício */}
          <form onSubmit={handleAddWorkout} className="bg-shinobi-bg p-4 rounded-xl border border-shinobi-border space-y-3">
            <h4 className="text-xs font-bold text-slate-200">Registrar Série de Treino</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Nome do Exercício (ex: Barra Fixa, Agachamento, Corrida)..."
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                className="bg-shinobi-card border border-shinobi-border rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <select
                value={exerciseCategory}
                onChange={(e) => setExerciseCategory(e.target.value as unknown as typeof exerciseCategory)}
                className="bg-shinobi-card border border-shinobi-border rounded-lg px-3 py-2 text-xs text-slate-100"
              >
                <option value="forca">Treino de Força / Calistenia</option>
                <option value="resistencia">Resistência / Corrida</option>
                <option value="mobilidade">Mobilidade & Alongamento</option>
                <option value="artes_marciais">Artes Marciais / Luta</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Séries (ex: 4)"
                value={exerciseSets}
                onChange={(e) => setExerciseSets(e.target.value)}
                className="bg-shinobi-card border border-shinobi-border rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <input
                type="text"
                placeholder="Reps ou Minutos (ex: 12 reps ou 30 min)"
                value={exerciseReps}
                onChange={(e) => setExerciseReps(e.target.value)}
                className="bg-shinobi-card border border-shinobi-border rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar Série (+40 XP Taijutsu)
            </button>
          </form>

          {/* Histórico Recente de Treinos */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300">Treinos Recentes</h4>
            {trainingLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-2.5 rounded-lg bg-shinobi-bg border border-shinobi-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-100">{log.exerciseName}</span>
                  <span className="text-[10px] text-slate-400 ml-2">({log.category.toUpperCase()})</span>
                </div>
                <div className="font-mono text-shinobi-gold">
                  {log.sets} séries × {log.repsOrMinutes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. DIÁRIO DO CORPO (SONO & ÁGUA) */}
      {activeTool === 'body' && (
        <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
            <div className="flex items-center gap-2">
              <Droplet className="w-5 h-5 text-cyan-400" />
              <h3 className="font-cinzel text-base font-bold text-slate-100">
                Diário do Corpo (Hidratação & Sono)
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hidratação */}
            <div className="bg-shinobi-bg p-4 rounded-xl border border-shinobi-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200">Hidratação Diária</span>
                </div>
                <span className="font-mono text-cyan-400 font-bold text-xs">
                  {todayBody.waterGlasses * 250}ml / 2500ml ({todayBody.waterGlasses} copos)
                </span>
              </div>

              {/* Copos Visuais */}
              <div className="grid grid-cols-5 gap-2 py-2">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const isFilled = idx < todayBody.waterGlasses;
                  return (
                    <button
                      key={idx}
                      onClick={() => (isFilled ? removeWaterGlass() : addWaterGlass())}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        isFilled
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-glow-chakra'
                          : 'bg-slate-800/40 border-slate-700 text-slate-600'
                      }`}
                    >
                      💧
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between gap-2">
                <button
                  onClick={addWaterGlass}
                  className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  +1 Copo (250ml)
                </button>
                <button
                  onClick={removeWaterGlass}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-lg hover:text-white"
                >
                  -1
                </button>
              </div>
            </div>

            {/* Sono */}
            <div className="bg-shinobi-bg p-4 rounded-xl border border-shinobi-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">Registro de Sono</span>
                </div>
                <span className="font-mono text-indigo-400 font-bold text-xs">
                  {todayBody.sleepHours}h ({todayBody.sleepQuality}★)
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Horas Dormidas: {sleepHours}h
                </label>
                <input
                  type="range"
                  min="4"
                  max="11"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Qualidade do Descanso:</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSleepQuality(star as unknown as typeof sleepQuality)}
                      className={`flex-1 py-1 text-xs rounded border ${
                        sleepQuality >= star
                          ? 'border-indigo-400 bg-indigo-950/40 text-indigo-300'
                          : 'border-slate-800 text-slate-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveSleep}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Salvar Sono (+20 XP Taijutsu)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
