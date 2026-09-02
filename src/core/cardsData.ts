import { TeachingCard } from './types';

export const teachingCards: TeachingCard[] = [
  // Dia 1: Taijutsu (Corpo) - Comum
  {
    id: 'card_tai_01',
    title: 'A Lâmina é o Próprio Corpo',
    pillarId: 'taijutsu',
    wisdom: 'O guerreiro não busca armas externas antes de dominar seu próprio veículo biológico. A postura e a respiração são os primeiros golpes.',
    actionTip: 'Realize 15 minutos de mobilidade ou caminhada consciente hoje sem o celular.',
    concept: 'Condicionamento Físico & Postura',
    unlockedDay: 1,
    rarity: 'common',
    kanji: '体',
    sealName: 'Selo da Postura Primordial',
  },

  // Dia 2: Ninjutsu (Mente) - Comum
  {
    id: 'card_nin_01',
    title: 'A Mente que Tudo Absorve',
    pillarId: 'ninjutsu',
    wisdom: 'Dez páginas lidas com atenção profunda superam cem horas de consumo passivo. O conhecimento aplicado é o verdadeiro jutsu.',
    actionTip: 'Leia pelo menos 15 minutos de um livro instrutivo e anote 1 insight acionável.',
    concept: 'Leitura Ativa & Retenção',
    unlockedDay: 2,
    rarity: 'common',
    kanji: '忍',
    sealName: 'Selo da Absorção Ativa',
  },

  // Dia 3: Chakra (Disciplina) - Comum
  {
    id: 'card_cha_01',
    title: 'A Regra dos Dois Minutos',
    pillarId: 'chakra',
    wisdom: 'O início de um hábito é a parte mais pesada. Reduza o atrito inicial para que seu chakra comece a fluir naturalmente.',
    actionTip: 'Execute o primeiro passo da sua tarefa mais difícil em menos de 120 segundos.',
    concept: 'Eliminação de Atrito',
    unlockedDay: 3,
    rarity: 'common',
    kanji: '気',
    sealName: 'Selo do Impulso Inicial',
  },

  // Dia 4: Espírito (Confiança) - Comum
  {
    id: 'card_esp_01',
    title: 'Ação Precede a Motivação',
    pillarId: 'espirito',
    wisdom: 'O novato espera a vontade surgir para agir. O veterano age para que o fogo do espírito se acenda durante a marcha.',
    actionTip: 'Não espere estar inspirado. Comece mesmo com 1% de energia.',
    concept: 'Autoiniciativa',
    unlockedDay: 4,
    rarity: 'common',
    kanji: '志',
    sealName: 'Selo da Faísca Interior',
  },

  // Dia 5: Genjutsu (Foco) - Comum
  {
    id: 'card_gen_01',
    title: 'O Escudo Contra as Ilusões',
    pillarId: 'genjutsu',
    wisdom: 'O mundo moderno lança genjutsus contínuos: notificações, feeds infinitos e distrações passageiras. Silencie o ruído.',
    actionTip: 'Coloque o smartphone em outro cômodo durante sua próxima sessão de 25 minutos.',
    concept: 'Higiene Digital & Foco',
    unlockedDay: 5,
    rarity: 'common',
    kanji: '幻',
    sealName: 'Selo do Silêncio Exterior',
  },

  // Dia 8: Taijutsu (Corpo) - Raro
  {
    id: 'card_tai_02',
    title: 'Resistência Sob Tensão',
    pillarId: 'taijutsu',
    wisdom: 'O músculo só cresce quando confrontado com a resistência. O cansaço passageiro é o preço da vitalidade duradoura.',
    actionTip: 'Termine seu treino com 1 série a mais de esforço focado.',
    concept: 'Sobrecarga Progressiva',
    unlockedDay: 8,
    rarity: 'rare',
    kanji: '剛',
    sealName: 'Selo da Tensão Invicta',
  },

  // Dia 12: Ninjutsu (Mente) - Raro
  {
    id: 'card_nin_02',
    title: 'O Princípio da Síntese',
    pillarId: 'ninjutsu',
    wisdom: 'Se você não consegue explicar um conceito com palavras simples a um aspirante, você ainda não o domina por completo.',
    actionTip: 'Explique para si mesmo em voz alta o que você aprendeu hoje.',
    concept: 'Técnica de Feynman',
    unlockedDay: 12,
    rarity: 'rare',
    kanji: '知',
    sealName: 'Selo da Clareza Verbal',
  },

  // Dia 15: Chakra (Disciplina) - Raro
  {
    id: 'card_cha_02',
    title: 'A Regra da Não-Interrupção',
    pillarId: 'chakra',
    wisdom: 'Nunca falhe dois dias seguidos. Um dia perdido é um acidente biológico; dois dias seguidos é o início de um novo hábito negativo.',
    actionTip: 'Se o dia estiver caótico, cumpra ao menos a versão mínima (Rank E) de cada missão.',
    concept: 'Consistência Não-Linear',
    unlockedDay: 15,
    rarity: 'rare',
    kanji: '律',
    sealName: 'Selo do Fluxo Contínuo',
  },

  // Dia 18: Taijutsu (Corpo) - Lendário
  {
    id: 'card_tai_03',
    title: 'O Sono dos Mestres',
    pillarId: 'taijutsu',
    wisdom: 'Durante o descanso noturno, as fibras se reconstroem e o chakra se purifica. Quem não domina o sono, perde antes de começar.',
    actionTip: 'Desligue telas 45 minutos antes de dormir hoje à noite.',
    concept: 'Recuperação & Higiene do Sono',
    unlockedDay: 18,
    rarity: 'legendary',
    kanji: '休',
    sealName: 'Selo da Regeneração Sagrada',
  },

  // Dia 20: Espírito (Confiança) - Raro
  {
    id: 'card_esp_02',
    title: 'O Desconforto como Bússola',
    pillarId: 'espirito',
    wisdom: 'Onde há desconforto voluntário e produtivo, é exatamente onde você deve avançar. Ali reside a sua próxima evolução.',
    actionTip: 'Faça aquela ligação ou tarefa desconfortável que você está adiando.',
    concept: 'Exposição Voluntária',
    unlockedDay: 20,
    rarity: 'rare',
    kanji: '勇',
    sealName: 'Selo da Marcha Noturna',
  },

  // Dia 22: Genjutsu (Foco) - Raro
  {
    id: 'card_gen_02',
    title: 'O Estado de Vácuo (Deep Work)',
    pillarId: 'genjutsu',
    wisdom: '90 minutos de foco monástico e indivisível geram mais impacto do que 8 horas de multitarefa fragmentada.',
    actionTip: 'Bloqueie uma janela matinal de 45 minutos para seu projeto mais importante.',
    concept: 'Trabalho Profundo',
    unlockedDay: 22,
    rarity: 'rare',
    kanji: '鏡',
    sealName: 'Selo do Santuário Mental',
  },

  // Dia 25: Ninjutsu (Mente) - Lendário
  {
    id: 'card_nin_03',
    title: 'A Biblioteca Mental',
    pillarId: 'ninjutsu',
    wisdom: 'Conhecimentos interconectados geram intuição tática. Conecte o que aprendeu com suas metas de vida.',
    actionTip: 'Revise suas anotações da semana por 10 minutos.',
    concept: 'Modelos Mentais',
    unlockedDay: 25,
    rarity: 'legendary',
    kanji: '智',
    sealName: 'Selo dos Cem Arquivos',
  },

  // Dia 33: Chakra (Disciplina) - Lendário
  {
    id: 'card_cha_03',
    title: 'A Forja dos 66 Dias',
    pillarId: 'chakra',
    wisdom: 'A neuroplasticidade cerebral leva cerca de 66 dias para transformar esforço consciente em trilha neural automática.',
    actionTip: 'Observe como hábitos do dia 1 já exigem metade da força de vontade hoje.',
    concept: 'Automatização Neural (UCL)',
    unlockedDay: 33,
    rarity: 'legendary',
    kanji: '極',
    sealName: 'Selo da Neuro-Metamorfose',
  },

  // Dia 40: Espírito (Confiança) - Lendário
  {
    id: 'card_esp_03',
    title: 'A Identidade Forjada',
    pillarId: 'espirito',
    wisdom: 'Você não é seus erros passados. Você é o padrão de ações que decide sustentar hoje.',
    actionTip: 'Declare sua intenção como guerreiro diante do seu próprio espelho.',
    concept: 'Mudança de Identidade',
    unlockedDay: 40,
    rarity: 'legendary',
    kanji: '覇',
    sealName: 'Selo do Soberano Interno',
  },

  // Dia 48: Genjutsu (Foco) - Lendário
  {
    id: 'card_gen_03',
    title: 'A Presença Suprema',
    pillarId: 'genjutsu',
    wisdom: 'A ansiedade vive no amanhã; o remorso vive no ontem. O poder do golpe só existe no milésimo de segundo do agora.',
    actionTip: 'Faça 3 minutos de respiração consciente antes de iniciar qualquer trabalho complexo.',
    concept: 'Mindfulness Tático',
    unlockedDay: 48,
    rarity: 'legendary',
    kanji: '禅',
    sealName: 'Selo do Instante Eterno',
  },
];
