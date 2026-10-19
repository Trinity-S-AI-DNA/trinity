import type { Block } from '../types'

// Course 11, queen-and-hive: 27 widgets, each running the fn bodies of a gHashTag/t27 specs/queen or
// specs/automation spec compiled to wasm (999 scripts/t27-logic.mjs, then scripts/widget-logic.mjs). The
// figure was drawn from the compiled review-jam.t27 the hive-jam widget runs: jam_case over all 512
// combinations of its 9 facts, coloured by jam_is_queens_turn.

export const body: Block[] = [
  {
    "kind": "p",
    "text": "Course 11 of t27.ai is out: the Queen and the hive. It tells how this project builds itself. An issue becomes a task for a bee, the bee writes a .t27 spec, a reviewer bee checks it, it merges, and the site regenerates. The Queen who runs that loop is not a black box: her rules live in gHashTag/t27 specs/queen and specs/automation as specs with numeric tests. The course has 27 lessons in 9 modules, each opening with a question, and each widget answers it with the spec's own fn bodies compiled to WebAssembly."
  },
  {
    "kind": "h",
    "text": "Nine modules, twenty-seven widgets"
  },
  {
    "kind": "table",
    "head": [
      "Module",
      "Widgets",
      "Specs"
    ],
    "rows": [
      [
        "The task",
        "hive-shape, hive-boundary, hive-task-filter",
        "queen/shaping, queen/tasks"
      ],
      [
        "Who goes next",
        "hive-aging, hive-rank, hive-review-first",
        "queen/priority, queen/review_first"
      ],
      [
        "A bee's life",
        "hive-lifecycle, hive-ship, hive-drain",
        "queen/dispatch, queen/hive, queen/drain"
      ],
      [
        "The reviewer bee",
        "hive-reviewers, hive-revisit, hive-gate",
        "queen/reviewer, queen/merger_gate"
      ],
      [
        "The review jam",
        "hive-jam, hive-jam-action, hive-master-red",
        "automation/review-jam, queen/merger_gate"
      ],
      [
        "Keys",
        "hive-key-error, hive-key-rest, hive-next-key",
        "queen/key_failover"
      ],
      [
        "Credit and money",
        "hive-credit, hive-price, hive-burn",
        "automation/queen-contributor-keys, automation/token-wallet"
      ],
      [
        "Agents among themselves",
        "hive-called, hive-chain, hive-cooldown",
        "automation/agent-hive-group"
      ],
      [
        "Night and the board",
        "hive-night, hive-column, hive-cell",
        "automation/card-chat-night-watch, queen/dispatch, queen/hive"
      ]
    ]
  },
  {
    "kind": "p",
    "text": "The pictures are the rules in motion: a kanban card that lands in the column a spec fn names, a review gate that opens or stays shut, a state machine whose illegal events grey out, a ship that flies home and fades over 2400 ms, a pool of keys where the next free one gets a ring, a ladder of agents that falls silent at depth 3, a cooldown clock, and comb cells that flash gold, amber, red or grey."
  },
  {
    "kind": "h",
    "text": "Where a stuck pull request lands"
  },
  {
    "kind": "p",
    "text": "review-jam.t27 sorts a pull request that will not move into one of 10 cases, and the earliest rule that matches wins. The figure runs its compiled jam_case on every one of the 512 combinations of its 9 facts. Half of them, 256, are unmeasured, because a PR the Queen could not read is never reported as free; 128 are a draft or fresh PR, and only 2 are no jam at all. jam_is_queens_turn says 318 of the 512 are the Queen's move."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 720 284' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='jam_case over all 512 combinations of 9 facts: unmeasured 256, draft or fresh 128, stacked on open 64, conflicting 32, labeled not merged 16, refused then pushed 4, refused not fixed 4, noise red 4, no reviewer 2, none 2' style='width:100%;height:auto;font-family:inherit'><text x='182' y='30' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>1. unmeasured</text><rect x='190' y='17' width='460.0' height='18' rx='4' fill='#e0a800'/><text x='656.0' y='30' fill='currentColor' font-size='13'>256</text><text x='182' y='54' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>2. draft or fresh</text><rect x='190' y='41' width='230.0' height='18' rx='4' fill='#7d8f89'/><text x='426.0' y='54' fill='currentColor' font-size='13'>128</text><text x='182' y='78' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>3. stacked on open</text><rect x='190' y='65' width='115.0' height='18' rx='4' fill='#7d8f89'/><text x='311.0' y='78' fill='currentColor' font-size='13'>64</text><text x='182' y='102' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>4. conflicting</text><rect x='190' y='89' width='57.5' height='18' rx='4' fill='#e0a800'/><text x='253.5' y='102' fill='currentColor' font-size='13'>32</text><text x='182' y='126' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>5. labeled not merged</text><rect x='190' y='113' width='28.8' height='18' rx='4' fill='#e0a800'/><text x='224.8' y='126' fill='currentColor' font-size='13'>16</text><text x='182' y='150' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>6. refused then pushed</text><rect x='190' y='137' width='7.2' height='18' rx='4' fill='#e0a800'/><text x='203.2' y='150' fill='currentColor' font-size='13'>4</text><text x='182' y='174' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>7. refused not fixed</text><rect x='190' y='161' width='7.2' height='18' rx='4' fill='#e0a800'/><text x='203.2' y='174' fill='currentColor' font-size='13'>4</text><text x='182' y='198' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>8. noise red</text><rect x='190' y='185' width='7.2' height='18' rx='4' fill='#e0a800'/><text x='203.2' y='198' fill='currentColor' font-size='13'>4</text><text x='182' y='222' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>9. no reviewer</text><rect x='190' y='209' width='3.6' height='18' rx='4' fill='#e0a800'/><text x='199.6' y='222' fill='currentColor' font-size='13'>2</text><text x='182' y='246' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>10. none</text><rect x='190' y='233' width='3.6' height='18' rx='4' fill='#7d8f89'/><text x='199.6' y='246' fill='currentColor' font-size='13'>2</text><text x='190' y='274' fill='currentColor' fill-opacity='0.7' font-size='12'>of 512 combinations of the 9 facts; gold: the Queen's turn</text></svg>",
    "caption": "jam_case of review-jam.t27 over all 512 combinations of its 9 facts, rules in their order of priority, computed by the compiled spec the hive-jam widget runs. Gold bars are cases jam_is_queens_turn gives to the Queen."
  },
  {
    "kind": "h",
    "text": "How the specs got into the browser"
  },
  {
    "kind": "p",
    "text": "No widget copies a rule. scripts/t27-logic.mjs of 999-multibots-telegraf runs t27c gen on a spec, builds the Zig with Zig 0.16 for wasm32 and writes a module with one function per spec fn, and scripts/widget-logic.mjs puts it beside the widget with a byte-identical copy of the spec. On t27 master, 137 of the 139 specs in the three folders ran green and 1302 fns lowered. review-jam found two bugs in that door, fixed in 999#4020: a param named case, which TypeScript refuses, and a bool read with all 32 bits, which made jam_is_queens_turn answer true for none."
  },
  {
    "kind": "h",
    "text": "What it does not show"
  },
  {
    "kind": "ul",
    "items": [
      "No widget reads the live Queen: every input is what the reader sets, and the measured numbers are the ones the specs record, such as 29 dispatches waiting on 2026-10-18.",
      "Lesson 26 shows a finding of dispatch.t27 as it stands: once an issue is closed, the public board draws every finished claim as done.",
      "The game widgets are flat sketches of the 3D game at app.t27.ai/game, not the game itself."
    ]
  },
  {
    "kind": "h",
    "text": "Try it"
  },
  {
    "kind": "ul",
    "items": [
      "Course: t27.ai/learn/queen-and-hive/",
      "t27.ai/widgets/hive-jam/, t27.ai/widgets/hive-next-key/, t27.ai/widgets/hive-chain/, t27.ai/widgets/hive-cell/",
      "Specs: gHashTag/t27 specs/queen/ and specs/automation/"
    ]
  }
]

export const ruBody: Block[] = [
  {
    "kind": "p",
    "text": "Вышел курс 11 на t27.ai: Королева и улей. Он рассказывает, как этот проект строит себя сам. Задача становится работой для пчелы, пчела пишет спеку .t27, пчела-ревьюер её проверяет, спеку сливают, и сайт пересобирается. Королева, которая ведёт этот цикл, не чёрный ящик: её правила лежат в gHashTag/t27 specs/queen и specs/automation спеками с числовыми тестами. В курсе 27 уроков в 9 модулях, каждый открывается вопросом, и каждый виджет отвечает на него телами fn самой спеки, скомпилированными в WebAssembly."
  },
  {
    "kind": "h",
    "text": "Девять модулей, двадцать семь виджетов"
  },
  {
    "kind": "table",
    "head": [
      "Модуль",
      "Виджеты",
      "Спеки"
    ],
    "rows": [
      [
        "Задача",
        "hive-shape, hive-boundary, hive-task-filter",
        "queen/shaping, queen/tasks"
      ],
      [
        "Кто следующий",
        "hive-aging, hive-rank, hive-review-first",
        "queen/priority, queen/review_first"
      ],
      [
        "Жизнь пчелы",
        "hive-lifecycle, hive-ship, hive-drain",
        "queen/dispatch, queen/hive, queen/drain"
      ],
      [
        "Пчела-ревьюер",
        "hive-reviewers, hive-revisit, hive-gate",
        "queen/reviewer, queen/merger_gate"
      ],
      [
        "Затор ревью",
        "hive-jam, hive-jam-action, hive-master-red",
        "automation/review-jam, queen/merger_gate"
      ],
      [
        "Ключи",
        "hive-key-error, hive-key-rest, hive-next-key",
        "queen/key_failover"
      ],
      [
        "Заслуги и деньги",
        "hive-credit, hive-price, hive-burn",
        "automation/queen-contributor-keys, automation/token-wallet"
      ],
      [
        "Агенты между собой",
        "hive-called, hive-chain, hive-cooldown",
        "automation/agent-hive-group"
      ],
      [
        "Ночь и доска",
        "hive-night, hive-column, hive-cell",
        "automation/card-chat-night-watch, queen/dispatch, queen/hive"
      ]
    ]
  },
  {
    "kind": "p",
    "text": "Картинки — это правила в движении: карточка канбана, которая попадает в колонку, названную функцией спеки, ворота ревью, которые открываются или остаются закрытыми, автомат состояний, где недопустимые события сереют, корабль, который летит домой и гаснет за 2400 мс, пул ключей, где следующий свободный получает кольцо, лестница агентов, которая замолкает на глубине 3, часы паузы и ячейки сот, вспыхивающие золотым, янтарным, красным или серым."
  },
  {
    "kind": "h",
    "text": "Куда попадает застрявший пулл-реквест"
  },
  {
    "kind": "p",
    "text": "review-jam.t27 относит пулл-реквест, который не движется, к одному из 10 случаев, и побеждает правило, совпавшее раньше остальных. На рисунке скомпилированная jam_case перебирает все 512 сочетаний её 9 фактов. Половина, 256, — unmeasured, потому что PR, который Королева не смогла прочитать, никогда не считается свободным; 128 — черновик или свежий PR, и всего 2 — вовсе не затор. jam_is_queens_turn говорит, что 318 из 512 — ход Королевы."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 720 284' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='jam_case на всех 512 сочетаниях 9 фактов: unmeasured 256, draft or fresh 128, stacked on open 64, conflicting 32, labeled not merged 16, refused then pushed 4, refused not fixed 4, noise red 4, no reviewer 2, none 2' style='width:100%;height:auto;font-family:inherit'><text x='182' y='30' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>1. unmeasured</text><rect x='190' y='17' width='460.0' height='18' rx='4' fill='#e0a800'/><text x='656.0' y='30' fill='currentColor' font-size='13'>256</text><text x='182' y='54' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>2. draft or fresh</text><rect x='190' y='41' width='230.0' height='18' rx='4' fill='#7d8f89'/><text x='426.0' y='54' fill='currentColor' font-size='13'>128</text><text x='182' y='78' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>3. stacked on open</text><rect x='190' y='65' width='115.0' height='18' rx='4' fill='#7d8f89'/><text x='311.0' y='78' fill='currentColor' font-size='13'>64</text><text x='182' y='102' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>4. conflicting</text><rect x='190' y='89' width='57.5' height='18' rx='4' fill='#e0a800'/><text x='253.5' y='102' fill='currentColor' font-size='13'>32</text><text x='182' y='126' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>5. labeled not merged</text><rect x='190' y='113' width='28.8' height='18' rx='4' fill='#e0a800'/><text x='224.8' y='126' fill='currentColor' font-size='13'>16</text><text x='182' y='150' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>6. refused then pushed</text><rect x='190' y='137' width='7.2' height='18' rx='4' fill='#e0a800'/><text x='203.2' y='150' fill='currentColor' font-size='13'>4</text><text x='182' y='174' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>7. refused not fixed</text><rect x='190' y='161' width='7.2' height='18' rx='4' fill='#e0a800'/><text x='203.2' y='174' fill='currentColor' font-size='13'>4</text><text x='182' y='198' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>8. noise red</text><rect x='190' y='185' width='7.2' height='18' rx='4' fill='#e0a800'/><text x='203.2' y='198' fill='currentColor' font-size='13'>4</text><text x='182' y='222' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>9. no reviewer</text><rect x='190' y='209' width='3.6' height='18' rx='4' fill='#e0a800'/><text x='199.6' y='222' fill='currentColor' font-size='13'>2</text><text x='182' y='246' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>10. none</text><rect x='190' y='233' width='3.6' height='18' rx='4' fill='#7d8f89'/><text x='199.6' y='246' fill='currentColor' font-size='13'>2</text><text x='190' y='274' fill='currentColor' fill-opacity='0.7' font-size='12'>из 512 сочетаний 9 фактов; золотые — ход Королевы</text></svg>",
    "caption": "jam_case из review-jam.t27 на всех 512 сочетаниях её 9 фактов, правила в порядке приоритета; посчитано скомпилированной спекой, которую исполняет виджет hive-jam. Золотые полосы — случаи, которые jam_is_queens_turn отдаёт Королеве."
  },
  {
    "kind": "h",
    "text": "Как спеки попали в браузер"
  },
  {
    "kind": "p",
    "text": "Ни один виджет не копирует правило. scripts/t27-logic.mjs из 999-multibots-telegraf запускает t27c gen на спеке, собирает Zig через Zig 0.16 под wasm32 и пишет модуль с функцией на каждую fn спеки, а scripts/widget-logic.mjs кладёт его рядом с виджетом вместе с побайтной копией спеки. На master t27 из 139 спек трёх папок 137 прошли зелёными, и 1302 fn собрались. review-jam нашла в этой обвязке две ошибки, исправленные в 999#4020: параметр с именем case, который TypeScript не принимает, и bool, прочитанный всеми 32 битами, из-за чего jam_is_queens_turn отвечала true для none."
  },
  {
    "kind": "h",
    "text": "Чего это не показывает"
  },
  {
    "kind": "ul",
    "items": [
      "Ни один виджет не читает живую Королеву: все входы задаёт читатель, а измеренные числа — те, что записаны в спеках, например 29 запусков в ожидании на 2026-10-18.",
      "Урок 26 показывает находку dispatch.t27 как есть: когда задача закрыта, публичная доска рисует любое завершённое притязание как готовое.",
      "Игровые виджеты — плоские наброски 3D-игры на app.t27.ai/game, а не сама игра."
    ]
  },
  {
    "kind": "h",
    "text": "Попробовать"
  },
  {
    "kind": "ul",
    "items": [
      "Курс: t27.ai/learn/queen-and-hive/",
      "t27.ai/widgets/hive-jam/, t27.ai/widgets/hive-next-key/, t27.ai/widgets/hive-chain/, t27.ai/widgets/hive-cell/",
      "Спеки: gHashTag/t27 specs/queen/ и specs/automation/"
    ]
  }
]
