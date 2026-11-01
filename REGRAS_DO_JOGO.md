# 📜 Regras do Jogo — Making Legends

Referência rápida de como cada sistema funciona depois da revisão de novembro/2026.
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
- Missões só podem ser marcadas **no próprio dia**.

## 2. Dia Cumprido (presença)

- O dia conta como **Dia Cumprido** quando você soma **50% do XP base previsto** das missões do dia.
- A presença é **automática** — não existe mais botão manual.
- Ao cumprir o dia você recebe o **estipêndio da vila**: 40 Ryō + bônus de sequência e patente. Se desmarcar missões e cair abaixo de 50%, o estipêndio é estornado.

## 3. Sequência e Escudo de Chakra

- **Sequência** = Dias Cumpridos seguidos. O dia de hoje, ainda em andamento, nunca quebra a sequência.
- **Escudo de Chakra**: 1 por semana (segunda a domingo). Quando um dia termina sem ser cumprido e você tem uma sequência ativa, o escudo é usado automaticamente e a sequência **não quebra** (o dia protegido não soma, mas também não zera).
- Escudos extras: relíquia *Pedra de Selamento Ancestral*, *Elixir de Ervas da Montanha* (loja) ou *Pergaminho de Proteção* (loja, 1 por semana).
- **Modo Elite**: sem escudos.

## 4. Desafio (ciclo de 21 a 365 dias)

- Começa hoje ou em uma data futura (até 30 dias). Nunca no passado.
- O dia N do desafio é sempre a data de início + (N − 1).
- **Regra semanal**: 1 falta por semana do desafio é tolerada; **a 2ª falta na mesma semana encerra o ciclo**. No **Modo Elite**, qualquer falta encerra.
- O Escudo de Chakra protege a **sequência**, não as faltas do desafio.
- O desafio é **concluído depois do último dia** (o último dia é jogado). Recompensa: **+10 XP e +15 Ryō por dia de duração** (ex.: 66 dias = +660 XP e +990 Ryō).
- O Modo Elite é escolhido no início e fica travado até o desafio terminar.
- Fases: Despertar, Forja e Mestria — cada uma com 1/3 da duração escolhida.

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

- Tudo funciona offline (salvo no aparelho). Com conta, a sincronização com a nuvem é agrupada (1,5 s após a última ação), vence o lado mais recente e as datas de conclusão das missões são sempre unidas.
- Dados antigos são migrados automaticamente na primeira abertura. Faltas registradas **antes** da atualização não encerram o desafio em andamento.
