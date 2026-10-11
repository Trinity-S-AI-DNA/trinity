import type { Block } from '../types'

// Course 3 exists because a reader who finished courses 1 and 2 has a chip, a
// compiler and a board, and no verdict. The lesson list, module lines and the
// numbers below come from specs/course/verify-hardware.t27 and the widgets'
// own recordings; the counts are the catalog's constants (4 courses, 27
// lessons each, 113 gallery casts).

export const body: Block[] = [
  {
    "kind": "p",
    "text": "Course 3 is live: Verifying hardware with t27, 27 lessons in 9 modules of 3, and like its three siblings every lesson opens one working widget and one t27 spec the reader can run in the player. Course 1 taught the flow from spec to chip, course 2 the numbers AI chips store; this one answers the question both left open: how do you know the design works? Testbenches, waveforms, vectors, cosimulation, coverage, formal, mutation, sign-off -- in that order, each step with a receipt."
  },
  {
    "kind": "h",
    "text": "The nine modules"
  },
  {
    "kind": "table",
    "head": [
      "Module",
      "Title",
      "The question it answers"
    ],
    "rows": [
      ["1", "Why verify", "Designs that compile and are still wrong; the golden model; the plan written before the code"],
      ["2", "Testbenches", "Stimulus, expectation, checks and a verdict in one spec"],
      ["3", "Waveforms", "Reading a VCD as text, debugging a real measured bug, diffing two runs"],
      ["4", "Conformance vectors", "Inputs with the answer recorded beside them, where the compiler can reach them"],
      ["5", "Cosimulation", "Spec, simulator and board brought to one answer on the bench"],
      ["6", "Coverage", "What the tests touched, bit by bit, arc by arc -- and what the number hides"],
      ["7", "Formal", "Assertions checked every cycle, bounded search, honest induction"],
      ["8", "Mutation", "Break the design on purpose and count what the tests caught"],
      ["9", "Sign-off", "One command, every receipt, a verdict you can show"]
    ]
  },
  {
    "kind": "h",
    "text": "Every number was measured"
  },
  {
    "kind": "p",
    "text": "The widgets are recordings of real tool runs, and the lesson texts use only numbers those recordings or the named spec show. The UART link that asked for 115,200 baud and got 115,385 on the wire -- a +0.16 % divider error invisible in code and obvious in the capture, while 3,000,000 divides exactly and the wire agrees. The 31 of 1,428 merged specs whose seals record no output, on 16 specs, 3 of them unnamed by the ledger that owes them a name. The 367 pull requests that arrived in 14 days, 11 of which deleted tests or asserts, one deleting all 26 tests in its file with nothing failing. A course about verification does not get to cite numbers it cannot show."
  },
  {
    "kind": "terminal",
    "src": "term/tri-fpga-wire/session.cast",
    "share": "https://t27.ai/term/tri-fpga-wire/",
    "title": "tri fpga-wire · the baud rate actually on the wire",
    "caption": "tri fpga-wire on the bench's CP2102N, plugged in with no hub: 115,200 requested puts 115,385 on the wire (+0.16 %), 921,600 puts 923,077, and 3,000,000 is exact. 6.5 s."
  },
  {
    "kind": "terminal",
    "src": "term/t27-tri-seals/session.cast",
    "share": "https://t27.ai/term/t27-tri-seals/",
    "title": "tri seals: hollow seals that pass every check",
    "caption": "tri seals hollow on the t27 tree: 31 of 1,428 seals record no generated output, on 16 distinct specs, and 3 of those are missing from the ledger that records the debt. 4.9 s."
  },
  {
    "kind": "h",
    "text": "A new spec: coverage.t27"
  },
  {
    "kind": "p",
    "text": "Lesson 16 needed a coverage model, and there was none, so it was written where specs live -- gHashTag/t27, specs/fpga/coverage.t27 -- and the site serves a vendored copy for the lesson. It models line, toggle, FSM state and FSM transition points with hit counters, integer percentages that return 0 when nothing was measured, and illegal transitions that must stay at 0 hits; it carries 26 tests and 4 invariants of its own, in the flat-arrays style of its siblings simulator.t27 and vcd_trace.t27."
  },
  {
    "kind": "h",
    "text": "What the gallery paid for it"
  },
  {
    "kind": "p",
    "text": "A course needs 27 framable widgets that no other lesson in any course uses. The gallery had 96 casts and almost all of them spoken for, so 17 recordings of real tool runs -- conformance sweeps, self-test runs, seal audits, a census recount, mutation and test-touch counts -- were cast and shelved in the two categories they belong to, and each became exactly one lesson's main widget. The gallery spec now declares 113 widgets, and its tests pin the shelf anchors so the fpga, compiler and game runs stay contiguous."
  },
  {
    "kind": "h",
    "text": "What it does not do"
  },
  {
    "kind": "ul",
    "items": [
      "The in-browser runner compiles each lesson spec on all 7 backends but cannot execute testbench test blocks yet (trinity#1477); the lessons show recorded t27c output instead of working around it.",
      "Three lesson specs named in the issue did not compile clean under the browser compiler (discarded statements and a typecheck failure); those lessons open clean siblings that teach the same step.",
      "specs/fpga/coverage.t27 is written in gHashTag/t27 and lands there in its own PR; until then the site serves the vendored copy, and the vendored-manifest check does not yet know the new file."
    ]
  },
  {
    "kind": "h",
    "text": "Try it"
  },
  {
    "kind": "ul",
    "items": [
      "Course 3, Verifying hardware with t27: t27.ai/learn/verify-hardware/",
      "In the app: t27.ai/#/verify-hardware",
      "The course spec: t27.ai/learn/verify-hardware.t27"
    ]
  },
  {
    "kind": "h",
    "text": "Correction, 2026-10-10"
  },
  {
    "kind": "p",
    "text": "The app address above opened nothing from 2026-10-07 to 2026-10-10. The router listed course addresses by hand and held 4 of the 7 courses, so \"Next course\" at the end of GoldenFloat led to #/verify-hardware, which had no route; clocks-and-cdc and buses-and-peripherals had none either. The share pages under learn/ were never affected. The router, the starfield and the menu now take every course address from one list that scripts/course-from-spec.mjs writes from specs/course/courses.t27, and the same check fails when a course has no menu entry."
  }
]

export const ruBody: Block[] = [
  {
    "kind": "p",
    "text": "Появился курс 3: «Проверка железа с t27», 27 уроков в 9 модулях по 3, и, как у его трёх предшественников, в каждом уроке открывается один работающий виджет и один spec t27, который читатель может запустить в плеере. Курс 1 учил потоку от spec до чипа, курс 2 -- числам, которые хранят ИИ-чипы; этот отвечает на вопрос, который оба оставили открытым: откуда вы знаете, что дизайн работает? Тестбенчи, временные диаграммы, векторы, косимуляция, покрытие, формальные методы, мутации, приёмка -- в этом порядке, и у каждого шага есть квитанция."
  },
  {
    "kind": "h",
    "text": "Девять модулей"
  },
  {
    "kind": "table",
    "head": [
      "Модуль",
      "Название",
      "Вопрос, на который он отвечает"
    ],
    "rows": [
      ["1", "Зачем проверять", "Дизайны, которые компилируются и всё равно ошибаются; золотая модель; план, записанный до кода"],
      ["2", "Тестбенчи", "Стимулы, ожидания, проверки и вердикт в одном spec"],
      ["3", "Временные диаграммы", "VCD как текст, отладка настоящего измеренного бага, сравнение двух прогонов"],
      ["4", "Векторы соответствия", "Входы с ответом, записанным рядом, там, откуда их достанет компилятор"],
      ["5", "Косимуляция", "Spec, симулятор и плата, приведённые к одному ответу на стенде"],
      ["6", "Покрытие", "Чего коснулись тесты, бит за битом, дуга за дугой -- и что прячет число"],
      ["7", "Формальные методы", "Ассерты, проверяемые каждый такт; ограниченный поиск; честная индукция"],
      ["8", "Мутации", "Ломайте дизайн нарочно и считайте, что заметили тесты"],
      ["9", "Приёмка", "Одна команда, все квитанции, вердикт, который можно показать"]
    ]
  },
  {
    "kind": "h",
    "text": "Каждое число измерено"
  },
  {
    "kind": "p",
    "text": "Виджеты -- это записи настоящих прогонов инструментов, а тексты уроков используют только числа, которые показывают эти записи или названный в них spec. Линк UART, запросивший 115,200 бод и получивший на проводе 115,385 -- ошибку делителя +0.16 %, невидимую в коде и очевидную в захвате; 3,000,000 делится нацело, и провод согласен. 31 из 1,428 слитых spec, чьи печати не записывают вывода, на 16 spec, и 3 из них не названы журналом, который им это имя должен. 367 pull request'ов, пришедших за 14 дней, из которых 11 удалили тесты или ассерты, а один удалил все 26 тестов своего файла -- и ничего не упало. Курс о проверке не имеет права цитировать числа, которые не может показать."
  },
  {
    "kind": "terminal",
    "src": "term/tri-fpga-wire/session.cast",
    "share": "https://t27.ai/term/tri-fpga-wire/",
    "title": "tri fpga-wire · the baud rate actually on the wire",
    "caption": "tri fpga-wire на CP2102N стенда, подключённом без хаба: запрос 115,200 даёт на проводе 115,385 (+0.16 %), 921,600 даёт 923,077, а 3,000,000 — ровно. 6,5 с."
  },
  {
    "kind": "terminal",
    "src": "term/t27-tri-seals/session.cast",
    "share": "https://t27.ai/term/t27-tri-seals/",
    "title": "tri seals: hollow seals that pass every check",
    "caption": "tri seals hollow на дереве t27: 31 печать из 1,428 не записывает сгенерированный вывод, за ними 16 разных спек, и 3 из них нет в реестре, где записан этот долг. 4,9 с."
  },
  {
    "kind": "h",
    "text": "Новый spec: coverage.t27"
  },
  {
    "kind": "p",
    "text": "Уроку 16 понадобилась модель покрытия, её не было -- и она написана там, где живут спеки: gHashTag/t27, specs/fpga/coverage.t27, а сайт отдаёт уроку вендоренную копию. Она моделирует точки строк, переключений, состояний и переходов автоматов со счётчиками срабатываний, целочисленные проценты, возвращающие 0, когда ничего не измерено, и запретные переходы, обязанные остаться на нуле срабатываний; в ней 26 тестов и 4 инварианта, в стиле плоских массивов, как у соседей simulator.t27 и vcd_trace.t27."
  },
  {
    "kind": "h",
    "text": "Чем за это заплатила галерея"
  },
  {
    "kind": "p",
    "text": "Курсу нужно 27 виджетов с отдельными страницами, которых не использует ни один урок ни одного курса. В галерее было 96 карточек, и почти все были заняты, поэтому 17 записей настоящих прогонов инструментов -- прогон соответствия, самопроверки, аудит печатей, пересчёт переписи, подсчёт мутаций и test-touch -- стали карточками на двух полках, которым они принадлежат, и каждая стала главным виджетом ровно одного урока. Теперь spec галереи объявляет 113 виджетов, а его тесты закрепляют якоря полок, чтобы прогоны fpga, compiler и game оставались непрерывными."
  },
  {
    "kind": "h",
    "text": "Чего он не делает"
  },
  {
    "kind": "ul",
    "items": [
      "Исполнитель в браузере компилирует spec каждого урока всеми 7 бэкендами, но пока не исполняет тест-блоки тестбенчей (trinity#1477); уроки показывают записанный вывод t27c, а не обходят это.",
      "Три spec урока, названных в задаче, не собирались чисто браузерным компилятором (отброшенные инструкции и ошибка типизации); эти уроки открывают чистых соседей, которые учат тому же шагу.",
      "specs/fpga/coverage.t27 написан в gHashTag/t27 и попадает туда отдельным PR; до тех пор сайт отдаёт вендоренную копию, и проверка вендоренного манифеста о новом файле ещё не знает."
    ]
  },
  {
    "kind": "h",
    "text": "Попробовать"
  },
  {
    "kind": "ul",
    "items": [
      "Курс 3, «Проверка железа с t27»: t27.ai/ru/learn/verify-hardware/",
      "В приложении: t27.ai/#/verify-hardware",
      "Spec курса: t27.ai/learn/verify-hardware.t27"
    ]
  },
  {
    "kind": "h",
    "text": "Поправка, 10.10.2026"
  },
  {
    "kind": "p",
    "text": "Адрес в приложении выше с 07.10 по 10.10.2026 не открывал ничего. Маршрутизатор перечислял адреса курсов вручную и знал 4 курса из 7, поэтому «Следующий курс» в конце GoldenFloat вёл на #/verify-hardware, у которого не было маршрута; у clocks-and-cdc и buses-and-peripherals тоже. Страницы для ссылок в learn/ это не задело. Теперь маршрутизатор, звёздный фон и меню берут адреса всех курсов из одного списка, который scripts/course-from-spec.mjs пишет из specs/course/courses.t27, и та же проверка падает, если у курса нет пункта меню."
  }
]
