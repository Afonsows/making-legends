import { ThemeConfig } from './types';

export const shinobiTheme: ThemeConfig = {
  id: 'shinobi',
  displayName: 'Caminho Shinobi (Original)',
  vocabulary: {
    appName: 'Making Legends',
    statusWindow: 'Pergaminho de Status',
    missionScroll: 'Pergaminho de Missão',
    duelMode: 'Duelo Shinobi',
    hardMode: 'Modo Elite (Treino Extremo)',
    dailyCards: 'Pergaminhos de Ensinamento',
    streakUnit: 'Dias de Treinamento',
    shieldName: 'Escudo de Chakra',
    villageHub: 'Dojo Central',
    levelUpMessage: 'Seu Chakra expandiu! Novo nível alcançado!',
    duelVictoryMessage: 'Adversário dominado! Recompensas forjadas no pergaminho!'
  },
  pillars: {
    taijutsu: {
      id: 'taijutsu',
      name: 'Taijutsu',
      categoryLabel: 'Corpo',
      description: 'Treino físico, postura, atividade e vigor corporal',
      color: '#e11d48', // Crimson
      iconName: 'Flame',
      badgeIcon: '🥋'
    },
    ninjutsu: {
      id: 'ninjutsu',
      name: 'Ninjutsu',
      categoryLabel: 'Mente',
      description: 'Leitura, estudo, aquisição de habilidades e retenção',
      color: '#06b6d4', // Cyan Chakra
      iconName: 'BookOpen',
      badgeIcon: '📜'
    },
    chakra: {
      id: 'chakra',
      name: 'Controle de Chakra',
      categoryLabel: 'Disciplina',
      description: 'Constância, rotina inegociável, cumprimento de prazos',
      color: '#10b981', // Jade
      iconName: 'Zap',
      badgeIcon: '⚡'
    },
    espirito: {
      id: 'espirito',
      name: 'Espírito',
      categoryLabel: 'Confiança',
      description: 'Superação, coragem, autoconfiança e resiliência',
      color: '#eab308', // Gold
      iconName: 'Shield',
      badgeIcon: '🛡️'
    },
    genjutsu: {
      id: 'genjutsu',
      name: 'Genjutsu',
      categoryLabel: 'Foco',
      description: 'Deep work, concentração imersiva, meditação e presença',
      color: '#8b5cf6', // Mystic Violet
      iconName: 'Target',
      badgeIcon: '👁️'
    }
  },
  ranks: {
    aspirante: {
      id: 'aspirante',
      name: 'Aspirante de Academia',
      minLevel: 1,
      description: 'O início da jornada. O corpo e a mente ainda aprendem os primeiros fundamentos.',
      badge: '🌱',
      titleColor: '#94a3b8'
    },
    genin: {
      id: 'genin',
      name: 'Genin',
      minLevel: 5,
      description: 'Primeiros passos firmes. Hábitos diários começam a criar raízes sólidas.',
      badge: '🗡️',
      titleColor: '#38bdf8'
    },
    chunin: {
      id: 'chunin',
      name: 'Chunin',
      minLevel: 12,
      description: 'Liderança pessoal e disciplina comprovada sob pressão.',
      badge: '⚔️',
      titleColor: '#34d399'
    },
    jonin: {
      id: 'jonin',
      name: 'Jonin',
      minLevel: 22,
      description: 'Mestria sobre os próprios impulsos. A curva exige consistência diária inabalável.',
      badge: '🎖️',
      titleColor: '#fbbf24'
    },
    anbu: {
      id: 'anbu',
      name: 'Anbu',
      minLevel: 35,
      description: 'Guerreiro das sombras. Disciplina silenciosa, sem necessidade de validação externa.',
      badge: '🎭',
      titleColor: '#f43f5e'
    },
    sannin: {
      id: 'sannin',
      name: 'Sannin',
      minLevel: 50,
      description: 'Lenda viva entre os shinobi. Força, mente e espírito em harmonia absoluta.',
      badge: '🐉',
      titleColor: '#c084fc'
    },
    kage: {
      id: 'kage',
      name: 'Kage',
      minLevel: 66,
      description: 'O ápice da maestria. A lenda definitiva foi forjada através dos 66 dias.',
      badge: '👑',
      titleColor: '#e11d48'
    }
  },
  missionRanks: {
    E: {
      rank: 'E',
      label: 'Rank E (Básico)',
      xpReward: 25,
      recommendedTime: '< 5 min',
      color: '#94a3b8',
      borderColor: 'border-slate-600'
    },
    D: {
      rank: 'D',
      label: 'Rank D (Regular)',
      xpReward: 50,
      recommendedTime: '10–20 min',
      color: '#38bdf8',
      borderColor: 'border-cyan-600'
    },
    C: {
      rank: 'C',
      label: 'Rank C (Focado)',
      xpReward: 85,
      recommendedTime: '30–45 min',
      color: '#34d399',
      borderColor: 'border-emerald-600'
    },
    B: {
      rank: 'B',
      label: 'Rank B (Avançado)',
      xpReward: 140,
      recommendedTime: '45–90 min',
      color: '#fbbf24',
      borderColor: 'border-amber-500'
    },
    A: {
      rank: 'A',
      label: 'Rank A (Mestre)',
      xpReward: 220,
      recommendedTime: '2h+',
      color: '#f43f5e',
      borderColor: 'border-rose-500'
    },
    S: {
      rank: 'S',
      label: 'Rank S (Lendário)',
      xpReward: 350,
      recommendedTime: 'Desafio Máximo',
      color: '#c084fc',
      borderColor: 'border-purple-500'
    }
  },
  protocolPhases: {
    1: {
      phaseIndex: 1,
      name: 'Despertar',
      daysRange: 'Dias 1–22',
      tagline: 'Desconstrução de padrões limitantes e ignição do chakra interior',
      quote: 'A maior batalha de um shinobi não é contra o inimigo, mas contra a inércia.',
      focus: 'Foco na regularidade simples e não quebrar a sequência inicial.'
    },
    2: {
      phaseIndex: 2,
      name: 'Forja',
      daysRange: 'Dias 23–44',
      tagline: 'Instalação profunda da rotina na mente subconsciente',
      quote: 'O ferro não se transforma em lâmina sem passar pelo calor da forja.',
      focus: 'Aumento da intensidade e resistência mental nas missões de Rank B e A.'
    },
    3: {
      phaseIndex: 3,
      name: 'Mestria',
      daysRange: 'Dias 45–66',
      tagline: 'Integração definitiva e automatização do novo estilo de vida',
      quote: 'A disciplina já não é um esforço; tornou-se sua própria natureza.',
      focus: 'Consolidação do rank Kage e identidade inabalável.'
    }
  },
  adversariesCount: 30
};
