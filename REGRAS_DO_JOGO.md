# 📜 Regras do Jogo — Making Legends

Referência rápida de como cada sistema funciona depois da revisão de arquitetura de novembro/2026.
Todos os números abaixo vêm do código (`src/core/*`) e são cobertos por testes (`npm test`).

---

## 1. Missões, XP e Ryō

| Rank | Esforço sugerido | XP base | Ryō base |
| :--: | :-- | --: | --: |
| E | < 5 min | 25 | 15 |
| D | 10–20 min | 50 | 35 |
| C | 30–45 min | 85 | 70 |
| B | 45–90 min | 140 | 130 |
| A | 2h+ | 220 | 220 |
| S | Desafio máximo | 350 | 400 |

- **Bônus de XP** (somados, nunca multiplicados entre si): relíquias equipadas (+15% a +40%), **Modo Elite** (+20%) e **Pílula de Soldado** (+25% no dia).
- **Bônus de Ryō**: sequência (+5% com 3 dias … +66% com 66 dias), patente (+5% Genin … +35% Kage) e metade do bônus das relíquias.
- **Desmarcar uma missão devolve exatamente o que ela deu** (XP, Ryō, XP do pilar e o dano no chefe). Editar o rank ou excluir uma missão concluída hoje também acerta a conta. Marcar/desmarcar várias vezes não gera nada extra.
- Recompensa só no **próprio dia**. Pelo detalhe do desafio dá para corrigir um dia passado (esqueci de marcar): a correção conta para a presença e para o desafio, mas não paga XP nem Ryō.

## 2. Dia Cumprido (presença)

- O dia conta como **Dia Cumprido** quando você soma **50% do XP base previsto** das missões do dia.
- A presença é **automática** — não existe mais botão manual.
- Ao cumprir o dia você recebe o **estipêndio da vila**: 40 Ryō + bônus de sequência e patente. Se desmarcar missões e cair abaixo de 50%, o estipêndio é estornado.

## 3. Sequência e Escudo de Chakra

- **Sequência** = Dias Cumpridos seguidos. O dia de hoje, ainda em andamento, nunca quebra a sequência.
- **Escudo de Chakra**: 1 por semana (segunda a domingo). Quando um dia termina sem ser cumprido e você tem uma sequência ativa, o escudo é usado automaticamente e a sequência **não quebra** (o dia protegido não soma, mas também não zera).
- Se um dia protegido depois se revelar cumprido (os dados chegaram de outro aparelho ou você corrigiu o dia), o escudo é **devolvido**.
- Escudos extras: relíquia *Pedra de Selamento Ancestral*, *Elixir de Ervas da Montanha* (loja) ou *Pergaminho de Proteção* (loja, 1 por semana).
- **Modo Elite**: sem escudos.

## 4. Desafios (modelo único, de 7 a 365 dias)

- **Todo desafio é do mesmo tipo** e vários podem correr ao mesmo tempo. Cada um tem os **seus próprios hábitos** (missões). Hábitos fora de desafio são **avulsos**.
- A tela **Hoje** mostra a meta do dia e, abaixo, **cada desafio em andamento com os hábitos dele**. Desafios que ainda vão começar aparecem com "Começa em N dias".
- Começa hoje, em uma data futura (até 30 dias) ou no passado (para registrar dias já feitos; esses dias não contam como falta).
- O dia N do desafio é sempre a data de início + (N − 1). Fases: Despertar, Forja e Mestria — cada uma com 1/3 da duração.
- **Dia cumprido no desafio** = metade do XP dos hábitos dele que valem naquele dia.
- **Falta** = um dia do desafio que **já terminou** sem ser cumprido. O dia de hoje nunca é falta, e o dia em que você cria o desafio (e os anteriores) também não.
- **Faltas não encerram o desafio**: elas aparecem no mapa, na semana ("2 faltas na semana 3") e pesam na **adesão** (% dos dias encerrados que foram cumpridos).
- **Modo Elite** (escolhido em cada desafio): +20% de XP, sem Escudo de Chakra e **a primeira falta encerra o desafio**. Se o dia da falta for corrigido (ou a marcação chegar de outro aparelho), o desafio **volta sozinho**.
- O desafio é **concluído depois do último dia** (o último dia é jogado). Recompensa: **+10 XP e +15 Ryō por dia de duração** (ex.: 66 dias = +660 XP e +990 Ryō).
- **Quando o desafio termina** (concluído, encerrado por você ou no Modo Elite), **os hábitos dele saem da tela Hoje**. O histórico continua no desafio, e dá para **começar outro com os mesmos hábitos** (cópia).
- No menu ⋯ do desafio: **Concluir agora** (sem bônus), **Encerrar** (abandonar), **Reabrir**, **Editar** e **Excluir** (desfaz os hábitos, as marcações e as recompensas daquele desafio — e só dele).
- **Retirar um hábito** que já tem histórico só o tira dos próximos dias; os dias em que ele contou continuam valendo. Sem histórico, ele é excluído.
- Pelo **mapa** do desafio dá para abrir qualquer dia e corrigir as marcações (conta para o desafio e para a sequência, sem XP nem Ryō).
- O Escudo de Chakra protege a **sequência**, não as faltas do desafio.

## 4.1 Quadro de operação (desafio personalizado em formato de quadro)

Para rotinas com muitas tarefas por dia (ex.: **Operação Afiliado · 40 dias**). Criado em *Desafios → + → Quadro de operação*.

- O quadro tem **seções**: *lista* (uma tarefa por linha) ou *tabela* (linhas × colunas, ex.: vídeo × rede social). Seções completas se fecham sozinhas.
- Tudo é editável em **Editar quadro**: seções, linhas, colunas, cor, atributo que recebe o XP, tarefas **extra** (dão recompensa mas não entram na meta) e **dias da semana** de cada linha (ex.: revisão só no domingo).
- **Dia cumprido** = marcar a **meta do dia** (padrão 80%, ajustável) das tarefas obrigatórias.
- Recompensas (só no próprio dia, estornáveis ao desmarcar): **+5 XP e +3 Ryō por tarefa**, **+25 XP e +15 Ryō por seção completa** e **+60 XP e +40 Ryō pelo dia cumprido** (seção e dia também causam dano no chefe).
- Dias passados podem ser corrigidos pelo seletor de dia ou pelo mapa: contam para o desafio, sem XP nem Ryō.
- Indicadores: dia N, fase (Despertar, Forja e Mestria), dias cumpridos, sequência (hoje em andamento não quebra), adesão média e **datas marcantes** com contagem regressiva.
- O quadro é um desafio como os outros (encerrar, reabrir, excluir, Modo Elite, bônus de conclusão), mas a meta do dia dele é por tarefas e não entra na meta de XP da sequência.
- Marcações de dois aparelhos no mesmo dia se juntam célula a célula (vale a mudança mais recente de cada tarefa).
- Regras em `src/core/board.ts` (testes em `src/tests/board.test.ts`).

## 5. Níveis e patentes

Curva contínua (custo do nível *n* ≈ 220 × n^0,75). Com ~400 XP por dia:

| Patente | Nível | Tempo aproximado |
| :-- | --: | :-- |
| 学 Aspirante | 1 | início |
| 下忍 Genin | 5 | ~5 dias |
| 中忍 Chunin | 12 | ~3 semanas |
| 上忍 Jonin | 22 | ~1 desafio de 66 dias |
| 暗部 Anbu | 35 | ~5 meses |
| 三忍 Sannin | 50 | ~9 meses |
| 影 Kage | 66 | ~15 meses (menos com relíquias e bônus) |

Cada novo nível paga **50 + 10 × nível** Ryō. (Antes, chegar a Kage levaria cerca de 41 anos.)

## 6. Duelo

- O XP final de cada missão vira dano no **primeiro chefe ainda de pé** (mesmo se você estiver vendo outro na Arena).
- Ponto fraco do chefe: +35% de dano. Crítico: 15% de chance, ×1,5. Relíquias de dano somam.
- Derrotar um chefe dá **50 + 20 × nível do chefe** Ryō e sua relíquia. Se você já tiver a relíquia, o ferreiro paga **100 + 15 × nível** Ryō extra.
- Desmarcar a missão que derrotou um chefe devolve a vida dele, a relíquia e o Ryō da vitória.

## 7. Ferramentas do Dojo (limites diários de recompensa)

| Ferramenta | Recompensa | Limite |
| :-- | :-- | :-- |
| Refeição | +10 XP Taijutsu, +8 Ryō | 3 por dia |
| Treino | +35 XP Taijutsu, +25 Ryō | 3 por dia |
| Sono | +20 XP Taijutsu, +15 Ryō | 1 por dia |
| Água (8 copos) | +25 XP Taijutsu, +15 Ryō | 1 por dia (estorna se remover copo) |
| Selo de Bloqueio | +30 XP Chakra, +20 Ryō | 1 por dia |
| Pomodoro | 1,4 XP Genjutsu por minuto | 6 sessões por dia |
| Meditação | 8 XP Chakra por minuto | 30 min por dia |

Registrar além do limite continua salvando os dados, só não paga XP. O Pomodoro continua contando ao trocar de aba.

## 8. Mercado da Vila (loja)

- **Pílula de Soldado** — 600 Ryō — +25% de XP até o fim do dia (1 por dia).
- **Pergaminho de Proteção** — 900 Ryō — +1 Escudo de Chakra na semana (1 por semana, indisponível no Modo Elite).
- Equipamentos permanentes: Kunai de Aço Polido (2.500), Elixir de Ervas da Montanha (4.500), Bandana do Juramento (6.000), Pergaminho das Cinco Naturezas (9.000).

## 9. Pergaminhos de Ensinamento e Liga

- Pergaminhos liberam pelo total de **Dias Cumpridos** da sua vida no app — nunca são perdidos ao começar um desafio novo.
- A **Liga Semanal** é real: sua divisão depende dos Dias Cumpridos da semana, e o rival é você mesmo na semana anterior.

## 10. Dados e sincronização

- Tudo funciona offline (salvo no aparelho). Com conta, cada sincronização **baixa, mescla e só então envia** — um aparelho nunca sobrescreve o progresso feito em outro:
  - XP e Ryō: soma do que cada aparelho ganhou (e do que foi desfeito);
  - missões marcadas: união, respeitando o que foi desmarcado;
  - dias: um Dia Cumprido em qualquer aparelho vale em todos — nunca vira falta;
  - nome, avatar, preferências e textos: vale a edição mais recente;
  - reset completo: o mais recente zera todos os aparelhos.
- Ao abrir o app (ou na virada do dia), **nenhum dia é fechado antes de os dados da nuvem chegarem**. Sem internet, o app decide com o que tem e se corrige quando a conexão voltar.
- A sincronização acontece ao abrir, ao voltar para o app, ~1 s depois de qualquer alteração e ao sair.
- Dados antigos são migrados automaticamente na primeira abertura, preservando XP, Ryō, nível e histórico. O antigo "desafio principal" vira um desafio comum com as missões dentro dele; se ele tinha sido encerrado pela antiga regra de faltas, volta a ficar em andamento.
  - desafios: por desafio — definição e decisões (encerrar, reabrir) da edição mais recente; nenhum desafio criado em um aparelho some pelo outro.

## 11. Como o sistema é construído (para manutenção)

A regra de ouro: **nada é somado "na mão" nem decidido no momento em que o app abriu.** Tudo é recalculado a partir de fatos, por funções puras e testadas.

| Módulo (`src/core`) | Responsabilidade |
| :-- | :-- |
| `ledger.ts` | Livro-razão: cada ganho ou gasto é um lançamento com chave única. XP, nível, patente e Ryō são **derivados** dele. |
| `dayLog.ts` | Registro diário: um dia é calculado pelas missões marcadas. Dia passado só melhora, nunca piora sozinho. |
| `streak.ts` | Sequência e Escudo de Chakra. |
| `challenges.ts` | Desafios: estado (em curso, concluído, encerrado), dia, faltas, adesão e mapa **calculados** das marcações; conversão do formato antigo; mesclagem. |
| `cycle.ts` | Leitura dos ciclos do formato antigo. |
| `progression.ts` | `reconcileProgression`: o **único** lugar que decide dias, escudos e sequência. |
| `syncMerge.ts` | Regras de mesclagem entre aparelhos. |

- Os stores (`src/state`) só guardam dados e chamam `reconcile()` depois de qualquer mudança. Rodar `reconcile()` várias vezes não altera nada.
- `src/services/syncService.ts` só transporta dados; as regras ficam em `syncMerge.ts`.
- Testes (`npm test`): regras puras (`engines`, `progression`, `challenges`, `board`), stores com viagem no tempo (`stores`) e dois aparelhos sincronizando contra uma nuvem em memória (`sync`).
