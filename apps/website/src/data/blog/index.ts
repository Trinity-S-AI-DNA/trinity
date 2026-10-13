import type { PostMeta } from './types'

/** Индекс блога: список и метаданные без тяжёлых тел публикаций. */
export const postsIndex: PostMeta[] = [
  {
    slug: "buses-and-peripherals",
    title: "Buses and peripherals with t27, in 27 lessons",
    summary: "Course 7 of the catalog: UART frame by frame, SPI mode by mode, the APB handshake, the five AXI4 channels, memory maps, the packet bridge, Ethernet frames and RGMII timing, and the bench IO discipline -- every lesson opens one widget and one t27 spec, and 31 of the widgets are new recordings of native t27c on a real machine.",
    date: "2026-10-08",
    readingMinutes: 4,
    tags: ["t27", "Course", "FPGA"],
    receipts: [
      { label: "Course, Buses and peripherals with t27", href: "https://t27.ai/learn/buses-and-peripherals/" },
      { label: "The course spec, specs/course/buses-and-peripherals.t27", href: "https://t27.ai/learn/buses-and-peripherals.t27" },
      { label: "trinity#1484: the issue this course answers", href: "https://github.com/gHashTag/trinity/issues/1484" },
      { label: "gHashTag/t27#7626: the two Ethernet specs, landed in the compiler repo first", href: "https://github.com/gHashTag/t27/pull/7626" },
    ],
    openQuestions: [
      "The in-browser runner still skips test and invariant blocks (trinity#1477, fix open as PR 1495); lessons show recorded t27c output.",
      "Six of the seven bus specs are BLOCKED in the native runner for comptime resolution; their recordings show check, gen-verilog and debug-hir, never a claimed test run.",
      "The RGMII and CRC constants that are not from IEEE 802.3 are labelled assumptions in the spec headers, not board measurements.",
    ],
    published: true,
    ru: {
      title: "Шины и периферия на t27 за 27 уроков",
      summary: "Курс 7 из каталога: UART покадрово, SPI по режимам, рукопожатие APB, пять каналов AXI4, карты памяти, пакетный мост, кадры Ethernet и тайминг RGMII, дисциплина IO на стенде -- в каждом уроке открывается один виджет и одна спека t27, а 31 виджет -- новые записи нативного t27c на настоящей машине.",
      openQuestions: [
        "Раннер в браузере по-прежнему пропускает блоки test и invariant (trinity#1477, исправление открыто как PR 1495); уроки показывают записанный вывод t27c.",
        "Шесть из семи спек шин BLOCKED в нативном раннере по comptime-разрешению; их записи показывают check, gen-verilog и debug-hir, но не заявленный прогон тестов.",
        "Константы RGMII и CRC, взятые не из IEEE 802.3, помечены как допущения в шапках спек, а не измерения на плате.",
      ],
    },
  },
  {
    slug: "a-recipe-step-cannot-be-dropped-silently",
    title: "A recipe step cannot be dropped silently",
    summary: "[a CI gate, not new lessons] The website checks now compile and run the tests of the t27 course recipe, and fail on a compile error, a failing assert or a module with no tests.",
    date: "2026-10-07",
    readingMinutes: 1,
    tags: ["t27", "Course", "CI"],
    receipts: [
      { label: "The gate, apps/website/scripts/check-course-recipe.mjs", href: "https://github.com/gHashTag/trinity/blob/main/apps/website/scripts/check-course-recipe.mjs" },
      { label: "The recipe, specs/course_recipe/course-27.t27", href: "https://github.com/gHashTag/trinity/blob/main/specs/course_recipe/course-27.t27" },
    ],
    openQuestions: [
      "Whether the recipe's tests cover every step is not checked.",
    ],
    published: true,
    ru: {
      title: "Шаг рецепта больше не пропадёт незаметно",
      summary: "[проверка CI, а не новые уроки] Проверки сайта теперь собирают и запускают тесты рецепта курса t27 и падают на ошибке сборки, проваленном assert или модуле без тестов.",
      openQuestions: [
        "Покрывают ли тесты рецепта каждый шаг, не проверяется.",
      ],
    },
  },
  {
    slug: "clocks-resets-and-cdc",
    title: "Clocks, resets and clock-domain crossings, in 27 lessons",
    summary: "The clocks course teaches clock trees, reset strategy and crossing clock domains in 27 lessons, and every lesson opens a widget no other lesson uses, three of them minted for this course. The post body has sat unregistered in the tree since the course PR; this entry wires it up.",
    date: "2026-10-08",
    readingMinutes: 4,
    tags: ["t27", "Course", "FPGA"],
    receipts: [
      { label: "Course, Clocking, resets and CDC", href: "https://t27.ai/learn/clocks-and-cdc/" },
      { label: "The course spec, specs/course/clocks-and-cdc.t27", href: "https://t27.ai/learn/clocks-and-cdc.t27" },
      { label: "trinity#1482: the issue this course answers", href: "https://github.com/gHashTag/trinity/issues/1482" },
      { label: "trinity#1498: the course PR that committed this body", href: "https://github.com/gHashTag/trinity/pull/1498" },
    ],
    openQuestions: [
      "The in-browser runner compiles lesson specs but cannot execute test blocks yet (trinity#1477); lessons show recorded t27c output.",
      "The E3 timing numbers are a model over the SDF nextpnr writes for the routed design, not measurements on the AX7203 board.",
      "This post was committed with the course body but never registered in postsIndex; it publishes with the buses course PR (Refs #1482).",
    ],
    published: true,
    ru: {
      title: "Тактирование, сброс и пересечения тактовых доменов за 27 уроков",
      summary: "Курс о тактах учит деревьям тактового сигнала, стратегии сбросов и пересечениям тактовых доменов в 27 уроках, и каждый урок открывает виджет, который не открывает ни один другой урок; три из них отчеканены для этого курса. Тело поста лежало в дереве незарегистрированным со времён PR курса; эта запись его подключает.",
      openQuestions: [
        "Раннер в браузере компилирует спеки уроков, но пока не исполняет тест-блоки (trinity#1477); уроки показывают записанный вывод t27c.",
        "Числа тайминга E3 -- модель по SDF nextpnr о разведённом дизайне, а не измерения на плате AX7203.",
        "Этот пост был закоммичен вместе с телом курса, но не зарегистрирован в postsIndex; публикуется с PR курса шин (Refs #1482).",
      ],
    },
  },
  {
    slug: "course-three-verifying-hardware",
    title: "Course 3: verifying hardware with t27, in 27 lessons",
    summary: "[the browser runner cannot execute testbench test blocks yet (trinity#1477); three lesson specs were swapped for clean siblings; specs/fpga/coverage.t27 lands in gHashTag/t27 separately] The fourth t27 course answers the question the other three left open: how do you know the design works? 27 lessons in 9 modules of 3 -- testbenches, waveforms, vectors, cosimulation, coverage, formal, mutation, sign-off -- each opening one working widget and one t27 spec, with every number on the page measured by the widget it sits beside.",
    date: "2026-10-07",
    readingMinutes: 4,
    tags: ["t27", "Course", "FPGA"],
    receipts: [
      { label: "Course 3, Verifying hardware with t27", href: "https://t27.ai/learn/verify-hardware/" },
      { label: "The course spec, specs/course/verify-hardware.t27", href: "https://t27.ai/learn/verify-hardware.t27" },
      { label: "trinity#1483: the issue this course answers", href: "https://github.com/gHashTag/trinity/issues/1483" },
    ],
    openQuestions: [
      "The in-browser runner compiles lesson specs but cannot execute testbench test blocks yet (trinity#1477); lessons show recorded t27c output.",
      "specs/fpga/coverage.t27 is written in gHashTag/t27 and lands there in its own PR; the site serves the vendored copy until then.",
      "The vendored-manifest check does not yet list the new coverage.t27 copy.",
    ],
    published: true,
    ru: {
      title: "Курс 3: проверка железа с t27 за 27 уроков",
      summary: "[исполнитель в браузере пока не исполняет тест-блоки тестбенчей (trinity#1477); три spec урока заменены чистыми соседями; specs/fpga/coverage.t27 попадает в gHashTag/t27 отдельным PR] Четвёртый курс t27 отвечает на вопрос, который три предыдущих оставили открытым: откуда вы знаете, что дизайн работает? 27 уроков в 9 модулях по 3 -- тестбенчи, временные диаграммы, векторы, косимуляция, покрытие, формальные методы, мутации, приёмка -- в каждом открывается один работающий виджет и один spec t27, а каждое число на странице измерено виджетом, рядом с которым оно стоит.",
      openQuestions: [
        "Исполнитель в браузере компилирует спеки уроков, но пока не исполняет тест-блоки тестбенчей (trinity#1477); уроки показывают записанный вывод t27c.",
        "specs/fpga/coverage.t27 написан в gHashTag/t27 и попадает туда отдельным PR; до тех пор сайт отдаёт вендоренную копию.",
        "Проверка вендоренного манифеста о новой копии coverage.t27 ещё не знает.",
      ],
    },
  },
    {
    slug: "course-three-goldenfloat",
    title: "Course 3: GoldenFloat, one rule for seventeen float widths",
    summary: "[the browser compiler runs a spec's constant asserts, not its function tests; 7 lesson-spec fixes wait on gHashTag/t27 PR 7496; no lesson claims a speed or a hardware result] A new course on the GoldenFloat family: one rule, E = round((N - 1) / phi^2), splits every width from GF4 to GF1024. 27 lessons in 9 modules of 3, each opening a table drawn from one spec and the spec itself.",
    date: "2026-10-07",
    readingMinutes: 4,
    tags: ["t27", "Course", "GoldenFloat"],
    receipts: [
      { label: "Course 3, GoldenFloat", href: "https://t27.ai/learn/goldenfloat/" },
      { label: "The course spec, specs/course/goldenfloat.t27", href: "https://t27.ai/learn/goldenfloat.t27" },
      { label: "arXiv:2606.05017, the GoldenFloat source", href: "https://arxiv.org/abs/2606.05017" },
    ],
    openQuestions: [
      "7 lesson specs compile clean here after the smallest fix; the same fix waits for review upstream in gHashTag/t27 PR 7496.",
      "Every format spec says its bias is open: chosen per format, not derived from the closed form.",
      "The values in gf_competitive.t27 are written into its tests, not produced by an encoder.",
    ],
    published: true,
    ru: {
      title: "Курс 3: GoldenFloat, одно правило для семнадцати ширин",
      summary: "[браузерный компилятор выполняет постоянные проверки спеки, а не тесты её функций; правки 7 спек уроков ждут gHashTag/t27 PR 7496; ни один урок не заявляет скорости или результата на железе] Новый курс о семействе GoldenFloat: одно правило, E = round((N - 1) / phi^2), делит каждую ширину от GF4 до GF1024. 27 уроков в 9 модулях по 3, каждый открывает таблицу из одной спеки и саму спеку.",
      openQuestions: [
        "7 спек уроков компилируются здесь чисто после наименьшей правки; та же правка ждёт ревью в gHashTag/t27 PR 7496.",
        "Каждая спека формата говорит, что её смещение открыто: оно выбирается для каждого формата, а не выводится из замкнутой формулы.",
        "Значения в gf_competitive.t27 вписаны в его тесты, а не получены кодировщиком.",
      ],
    },
  },
  {
    slug: "nine-modules-of-three-again",
    title: "Every t27 course is 9 modules of 3 lessons again",
    summary: "On 7 October 2026 the t27 courses were wrongly flattened to 27 modules of one lesson. They are 9 modules of 3 lessons again: courses 1 and 2 get their old modules back word for word, course 0 gets 9 new ones, and the catalog's test holds the shape.",
    date: "2026-10-07",
    readingMinutes: 2,
    tags: ["t27", "Course"],
    receipts: [
      { label: "The course catalog, specs/course/courses.t27", href: "https://github.com/gHashTag/trinity/blob/main/apps/website/specs/course/courses.t27" },
      { label: "trinity#1463: course 0, which this fix stacks on", href: "https://github.com/gHashTag/trinity/pull/1463" },
    ],
    openQuestions: [
      "Course 0's 9 modules are a new grouping and have not been reviewed by the owner.",
    ],
    published: true,
    ru: {
      title: "Каждый курс t27 снова — 9 модулей по 3 урока",
      summary: "7 октября 2026 года курсы t27 по ошибке сплющили до 27 модулей по одному уроку. Теперь они снова 9 модулей по 3 урока: курсы 1 и 2 получили прежние модули слово в слово, курс 0 — 9 новых, а тест каталога держит форму.",
      openQuestions: [
        "9 модулей курса 0 — новая группировка, владелец её ещё не смотрел.",
      ],
    },
  },
  {
    slug: "course-zero-t27-basics",
    title: "Course 0: t27 basics in 27 lessons, each with an infographic",
    summary: "[the browser runner skips invariant and bench blocks; the lesson specs are not yet in gHashTag/t27] A new course comes before the FPGA and AI numbers courses: 27 lessons on the t27 language, each with a black-and-white table or diagram drawn from its own spec and a lesson spec that compiles on all 7 backends.",
    date: "2026-10-07",
    readingMinutes: 5,
    tags: ["t27", "Course"],
    receipts: [
      { label: "Course 0, t27 basics", href: "https://t27.ai/learn/" },
      { label: "The course spec, specs/course/t27-basics.t27", href: "https://t27.ai/learn/t27-basics.t27" },
      { label: "trinity#1456: the split into two courses, which this course stacks on", href: "https://github.com/gHashTag/trinity/pull/1456" },
    ],
    openQuestions: [
      "The browser runner skips invariant and bench blocks, so lessons that show them do not run them.",
      "The lesson specs live in the site copy of the spec tree and are not yet in gHashTag/t27.",
    ],
    published: true,
    ru: {
      title: "Курс 0: основы t27 за 27 уроков, в каждом инфографика",
      summary: "[исполнитель в браузере пропускает блоки invariant и bench; спек уроков пока нет в gHashTag/t27] Перед курсами по FPGA и ИИ-числам появился новый курс: 27 уроков о языке t27, в каждом чёрно-белая таблица или схема из своей спеки и спека урока, которая собирается всеми 7 бэкендами.",
      openQuestions: [
        "Исполнитель в браузере пропускает блоки invariant и bench, поэтому уроки, где они есть, их не запускают.",
        "Спеки уроков лежат в копии дерева спек на сайте, в gHashTag/t27 их пока нет.",
      ],
    },
  },
  {
    slug: "tri-test-now-runs-the-tests",
    title: "tri test now runs the tests",
    summary: "[t27#7400 is open, not merged; the demo is one spec on the t27c lab; t27c test-report still exits 0 on a failing test (t27#7370); the MCP tool tri.test is still vacuous] Until now tri test only listed a spec's tests and printed that they passed, so a planted bug stayed green. t27#7400 makes it run them, read the report and exit non-zero on a failure, a BLOCKED spec or zero tests. It also adds tri mutate plant: one recorded mutant on a copy, a clean baseline first, the failing tests named, the original's hash checked. Nine lessons of the AI numbers course wait on these two commands for their recordings.",
    date: "2026-10-07",
    readingMinutes: 4,
    tags: ["t27", "tri", "Mutation testing", "Courses"],
    receipts: [
      { label: "t27#7400: tri test runs the tests; tri mutate plant · OPEN", href: "https://github.com/gHashTag/t27/pull/7400" },
      { label: "t27#7369: the issue #7400 closes", href: "https://github.com/gHashTag/t27/issues/7369" },
      { label: "t27#7370: t27c test-report exits 0 when tests FAIL or the report is BLOCKED · OPEN", href: "https://github.com/gHashTag/t27/issues/7370" },
      { label: "trinity#1456: the AI numbers course, with lessons 13 to 21 waiting on #7400 (this post's PR)", href: "https://github.com/gHashTag/trinity/pull/1456" },
    ],
    openQuestions: [
      "t27#7400 is open. Until it merges, tri test on master still only lists tests, and lessons 13 to 21 stay placeholders.",
      "The acceptance demo covers one spec, gft_relu.t27, on the t27c lab; the nine course recordings have not been made yet.",
      "t27c test-report still exits 0 when tests fail (t27#7370), so any caller that reads only its exit code is still vacuous.",
      "The MCP tool tri.test in cli/tri-mcp still calls t27c test and is not changed by #7400.",
    ],
    published: true,
    ru: {
      title: "tri test теперь запускает тесты",
      summary: "[t27#7400 открыт и не влит; демонстрация — одна спека на лаборатории t27c; t27c test-report всё ещё возвращает 0 при упавшем тесте (t27#7370); инструмент MCP tri.test по-прежнему пустой] До сих пор tri test только перечислял тесты спеки и печатал, что они прошли, поэтому посаженная ошибка оставалась зелёной. t27#7400 заставляет его запускать их, читать отчёт и возвращать ненулевой код при падении, при спеке BLOCKED или когда не прошёл ни один тест. Ещё он добавляет tri mutate plant: один записанный мутант на копии, сначала чистый прогон, названные упавшие тесты, проверка хеша оригинала. Девять уроков курса AI numbers ждут этих двух команд для своих записей.",
      openQuestions: [
        "t27#7400 открыт. Пока он не влит, tri test в master по-прежнему только перечисляет тесты, а уроки 13–21 остаются заглушками.",
        "Демонстрация приёмки — одна спека, gft_relu.t27, на лаборатории t27c; девять записей курса ещё не сделаны.",
        "t27c test-report по-прежнему возвращает 0, когда тесты падают (t27#7370), так что любой вызывающий, который смотрит только на код возврата, всё ещё ничего не проверяет.",
        "Инструмент MCP tri.test в cli/tri-mcp по-прежнему вызывает t27c test, и #7400 его не меняет.",
      ],
    },
  },
  {
    slug: "two-courses-twenty-seven-lessons-each",
    title: "Two t27 courses of 27 lessons each: FPGA, then AI numbers",
    summary: "[no lesson trains a network; the tests of the 15 new lessons run in recordings of native t27c, not in the browser; 35 of 127 mutants survive and are not sorted; software only, no board] The t27 course is now two courses of 27 lessons, 9 modules of 3 lessons each (recordings for lessons 13 to 21 are pending t27#7400): From zero to a chip, on programming an FPGA, and AI numbers with t27, which starts with the 6 lessons that moved and adds 21 more, ending at a small ternary network. Each of the last 15 lessons plants a one-line bug in its spec and shows the one named test that fails. Over 14 of their functions, tri mutate spec made 127 mutants and the tests killed 92.",
    date: "2026-10-07",
    readingMinutes: 9,
    tags: ["t27", "Ternary", "Mutation testing"],
    receipts: [
      { label: "Course 1, From zero to a chip", href: "https://t27.ai/learn/" },
      { label: "Course 2, AI numbers with t27", href: "https://t27.ai/learn/ai-numbers/" },
      { label: "Course 2, lesson 16: a bend at zero", href: "https://t27.ai/learn/a-bend-at-zero/" },
      { label: "Course 2, lesson 27: a whole network", href: "https://t27.ai/learn/a-whole-network/" },
      { label: "trinity#1456: the split into two courses, the 21 new lessons of course 2 and this post", href: "https://github.com/gHashTag/trinity/pull/1456" },
      { label: "trinity#1455: the issue of that work", href: "https://github.com/gHashTag/trinity/issues/1455" },
      { label: "t27#7400: tri test runs the tests; tri mutate plant names the test a one-line mutant turns red · OPEN when this was written", href: "https://github.com/gHashTag/t27/pull/7400" },
      { label: "t27#7370: t27c test-report exits 0 when tests fail · OPEN", href: "https://github.com/gHashTag/t27/issues/7370" },
      { label: "arXiv:2606.09686, the numeric format catalog behind the t27 format specs", href: "https://arxiv.org/abs/2606.09686" },
      { label: "arXiv:2606.05017, GoldenFloat", href: "https://arxiv.org/abs/2606.05017" },
      { label: "Compared: The Era of 1-bit LLMs, S. Ma et al., arXiv:2402.17764", href: "https://arxiv.org/abs/2402.17764" },
      { label: "Compared: bitnet.cpp, Microsoft", href: "https://github.com/microsoft/BitNet" },
      { label: "Compared: Fine-tuning LLMs to 1.58bit, Hugging Face", href: "https://huggingface.co/blog/1_58_llm_extreme_quantization" },
      { label: "Compared: A Visual Guide to Quantization, M. Grootendorst", href: "https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-quantization" },
      { label: "Compared: Ternary Weight Encoder, binarycon.com", href: "https://binarycon.com/tools/ternary-weight-encoder/" },
      { label: "Compared: FINN, AMD Research", href: "https://github.com/Xilinx/finn" },
      { label: "Compared: TernaryCore", href: "https://github.com/Ternarycore/ternarycore" },
      { label: "Compared: TeLLMe, Y. Qiao et al., arXiv:2504.16266", href: "https://arxiv.org/abs/2504.16266" },
      { label: "Compared: micrograd, A. Karpathy", href: "https://github.com/karpathy/micrograd" },
      { label: "Compared: Neural Networks: Zero to Hero, A. Karpathy", href: "https://karpathy.ai/zero-to-hero.html" },
      { label: "Compared: MiniTorch, S. Rush", href: "https://minitorch.github.io/" },
      { label: "Compared: nand2tetris, Project 2: Boolean Arithmetic", href: "https://www.nand2tetris.org/project02" },
    ],
    openQuestions: [
      "No lesson trains a network. The tests pass weights set by hand, and lesson 20 takes one step.",
      "Lesson 27 is not yet a chip: in the generated Verilog the chunk loop of neuronN is marked NOT UNROLLED, and the lesson says yosys rejects it.",
      "The browser player skips the tests of the 15 new specs, because its runner does not know assert_eq yet. They run natively, in the recordings.",
      "35 of 127 mutants survive and are not sorted into missing tests and harmless changes; gft_exp2.t27 has 17 of them with 4 tests. For gft_xornet.t27 the count printed no summary and is left out.",
      "A function with 1 mutant, like those of gft_sgd_step.t27 and bitnet_majority.t27, is barely measured by that count.",
      "The 15 new lessons run in software only; none of them ran on a board.",
      "The recordings use tri test and tri mutate plant from t27#7400, which was not merged when this was written, and t27c test-report exits 0 when a test fails (t27#7370), so every verdict is read from its text.",
      "The comparison keeps 11 of the 16 resources whose pages were read on 7 October 2026; it is not a complete survey. A course that already plants one bug per lesson and shows the one test that fails would make the post's narrow claim wrong.",
    ],
    published: true,
    ru: {
      title: "Два курса t27 по 27 уроков: сначала FPGA, потом ИИ-числа",
      summary: "[ни один урок не обучает сеть; тесты 15 новых уроков идут в записях нативного t27c, а не в браузере; 35 из 127 мутантов выживают и не разобраны; только программа, без платы] Курс t27 теперь — два курса по 27 уроков, 9 модулей по 3 урока (записи уроков с 13 по 21 ждут t27#7400): «С нуля до чипа» о программировании FPGA и «ИИ-числа на t27», который начинается с 6 переехавших уроков и добавляет ещё 21, до маленькой тернарной сети. Каждый из последних 15 уроков подкладывает в спеку ошибку в одну строку и показывает единственный названный тест, который падает. По 14 их функциям tri mutate spec сделала 127 мутантов, и тесты убили 92.",
      openQuestions: [
        "Ни один урок не обучает сеть. Тесты подают веса, заданные руками, а урок 20 делает один шаг.",
        "Урок 27 — ещё не чип: в сгенерированном Verilog цикл по кускам в neuronN помечен NOT UNROLLED, и урок говорит, что yosys его отвергает.",
        "Плеер в браузере пропускает тесты 15 новых спек, потому что его исполнитель пока не знает assert_eq. Они идут нативно, в записях.",
        "35 из 127 мутантов выживают и не разобраны на недостающие тесты и безвредные изменения; у gft_exp2.t27 их 17 при 4 тестах. Для gft_xornet.t27 подсчёт не напечатал итога и в суммы не вошёл.",
        "Функция с 1 мутантом, как в gft_sgd_step.t27 и bitnet_majority.t27, этим подсчётом почти не измерена.",
        "15 новых уроков работают только в программе; ни один из них не запускался на плате.",
        "Записи используют tri test и tri mutate plant из t27#7400, который на момент написания не был влит, а t27c test-report выходит с кодом 0, когда тест падает (t27#7370), поэтому каждый вердикт читается из его текста.",
        "В сравнении оставлено 11 из 16 источников, чьи страницы читались 7 октября 2026 года; это не полный обзор. Курс, который уже подкладывает по одной ошибке на урок и показывает единственный упавший тест, сделал бы узкое утверждение поста неверным.",
      ],
    },
  },
  {
    slug: "the-queen-knows-how-to-build-a-course",
    title: "The Queen now knows how to build a course",
    summary: "[a recipe, not a course; the recipe modules compile but no CI job runs their tests yet] The t27 course recipe moved from one agent's private folder into the repository as two t27 modules, and AGENTS.md points at them, so the Queen can assign a new 27-lesson course for any topic.",
    date: "2026-10-07",
    readingMinutes: 2,
    tags: ["t27", "Course", "Agents"],
    receipts: [
      { label: "The recipe, specs/course_recipe/course-27.t27", href: "https://github.com/gHashTag/trinity/blob/main/specs/course_recipe/course-27.t27" },
      { label: "The plan, specs/course_recipe/roadmap.t27", href: "https://github.com/gHashTag/trinity/blob/main/specs/course_recipe/roadmap.t27" },
    ],
    openQuestions: [
      "No CI job runs the recipe's tests yet.",
    ],
    published: true,
    ru: {
      title: "Королева теперь знает, как собрать курс",
      summary: "[рецепт, а не курс; модули рецепта собираются, но их тесты пока не запускает CI] Рецепт курса t27 переехал из личной папки одного агента в репозиторий двумя модулями t27, а AGENTS.md ссылается на них, так что Королева может поручить новый курс из 27 уроков на любую тему.",
      openQuestions: [
        "Тесты рецепта пока не запускает ни одно задание CI.",
      ],
    },
  },
  {
    slug: "a-course-pr-carries-its-post",
    title: "A course PR now carries its blog post",
    summary: "[open PR, not merged; binds only PRs opened or pushed after the merge; checks that a post file changed, not what it says] The T27 work report check now refuses a trinity PR that changes a course without adding or modifying a blog post body in the same PR. The rule's words live only in a t27 spec, specs/policy/course_post.t27, which the checker reads and fails closed on. Renamed lessons count by old and new path, renamed posts do not count, and an incomplete file list is reported as not decided. Seven planted mutants each failed their own test.",
    date: "2026-10-07",
    readingMinutes: 4,
    tags: ["CI", "Courses", "Blog", "Mutation testing"],
    receipts: [
      { label: "trinity#1461: a course PR carries its blog post (this post's PR)", href: "https://github.com/gHashTag/trinity/pull/1461" },
      { label: "trinity#1460: the issue", href: "https://github.com/gHashTag/trinity/issues/1460" },
      { label: "The rule: apps/website/specs/policy/course_post.t27", href: "https://github.com/gHashTag/trinity/blob/f57e6308c1d747ba2c686470bf15cbc173e18654/apps/website/specs/policy/course_post.t27" },
      { label: "The checker: scripts/pr_blog_report.py", href: "https://github.com/gHashTag/trinity/blob/f57e6308c1d747ba2c686470bf15cbc173e18654/scripts/pr_blog_report.py" },
      { label: "t27#7395: t27 does not check a declared array length", href: "https://github.com/gHashTag/t27/issues/7395" },
    ],
    openQuestions: [
      "trinity#1461 is open; until it merges, the rule binds no PR, because the workflow runs the checker from main.",
      "The check sees that a post body file was added or modified, not that the post is about the course change; that is still left to review.",
      "Above the files API limit of 3000 files the rule can come out as not decided rather than judged.",
      "A manual re-run of the report for an older course PR that shipped without a post will now turn red.",
    ],
    published: true,
    ru: {
      title: "PR курса теперь несёт свой пост",
      summary: "[PR открыт и не влит; действует только на PR, открытые или обновлённые после слияния; проверяет, что файл поста изменился, а не что в нём написано] Проверка T27 work report теперь отклоняет PR в trinity, который меняет курс и не добавляет и не правит тело поста в блоге в том же PR. Слова правила живут только в спеке t27, specs/policy/course_post.t27, которую проверка читает и при сбое закрывается. Переименованные уроки считаются по старому и новому пути, переименованные посты не считаются, а неполный список файлов даёт «не решено». Семь посаженных мутантов уронили каждый свой тест.",
      openQuestions: [
        "trinity#1461 открыт; пока он не влит, правило не действует ни на один PR, потому что workflow запускает проверку из main.",
        "Проверка видит, что файл тела поста добавлен или изменён, но не то, что пост — об изменении курса; это по-прежнему дело ревью.",
        "Выше предела API в 3000 файлов правило может выйти «не решено», а не вынесенным.",
        "Ручной перезапуск отчёта для старого PR курса, ушедшего без поста, теперь станет красным.",
      ],
    },
  },
  {
    slug: "one-outlier-twenty-three-zeros",
    title: "One outlier, 23 zeros: a course module on the OCP MX block",
    summary: "[one block of 32, chosen to show the flush, no model and no accuracy number; ocp_mx.t27 is merged into t27 but not on the site yet; lesson 33 is a recording, not a browser player; software only] The t27 course has three new lessons on the Microscaling (MX) formats of the Open Compute Project, where 32 weights share one scale byte. One weight of 3.3 among 31 small ones sets that scale, and in MXFP4 23 of the 30 non-zero small ones become zero; MXFP6 E2M3 loses 4, MXINT8 2, MXFP6 E3M2 and MXFP8 E4M3 none. The numbers come from a spec with 49 tests, and changing one exponent bias from 15 to 16 fails exactly one of them.",
    date: "2026-10-06",
    readingMinutes: 8,
    tags: ["t27", "Number formats", "Mutation testing"],
    receipts: [
      { label: "The recording in the post: ocp_mx.t27 on native t27c, 49 of 49 tests, then one planted bias change fails one test", href: "https://t27.ai/term/t27c-ocp-mx/" },
      { label: "The recording of lesson 32: e8m0.t27 on native t27c, 18 of 18 tests and 9 invariants", href: "https://t27.ai/term/t27c-e8m0/" },
      { label: "The player on e8m0.t27, seven backends and the spec's checks in your browser", href: "https://t27.ai/play/e8m0/" },
      { label: "AI numbers course, lesson 6 (lesson 33 when this was posted): one outlier, many zeros", href: "https://t27.ai/learn/one-outlier/" },
      { label: "trinity#1443: course module 11, AI numbers, the MX block (lessons 31 to 33)", href: "https://github.com/gHashTag/trinity/pull/1443" },
      { label: "trinity#1440: the module's issue", href: "https://github.com/gHashTag/trinity/issues/1440" },
      { label: "trinity#1445: this post", href: "https://github.com/gHashTag/trinity/pull/1445" },
      { label: "trinity#1444: this post's issue", href: "https://github.com/gHashTag/trinity/issues/1444" },
      { label: "trinity#1441: four Russian lesson cards clip their address · OPEN", href: "https://github.com/gHashTag/trinity/issues/1441" },
      { label: "t27#6828: ocp_mx.t27, OCP MX v1.0 and OFP8 elements, the E8M0 scale and the block conversion · MERGED 2026-10-06", href: "https://github.com/gHashTag/t27/pull/6828" },
      { label: "t27#6827: no spec decoded an MX element or ran the block conversion · CLOSED 2026-10-06", href: "https://github.com/gHashTag/t27/issues/6827" },
      { label: "t27#6867: generated Zig that does not compile, an i64 index and a signed division · OPEN", href: "https://github.com/gHashTag/t27/issues/6867" },
      { label: "OCP Microscaling Formats (MX) Specification v1.0, section 6.3 is the block conversion", href: "https://www.opencompute.org/documents/ocp-microscaling-formats-mx-v1-0-spec-final-pdf" },
      { label: "arXiv:2310.10537, Rouhani et al., Microscaling Data Formats for Deep Learning", href: "https://arxiv.org/abs/2310.10537" },
      { label: "arXiv:2606.09686, the numeric format catalog behind the t27 format specs", href: "https://arxiv.org/abs/2606.09686" },
      { label: "arXiv:2606.05017, GoldenFloat", href: "https://arxiv.org/abs/2606.05017" },
      { label: "Compared: A Visual Guide to Quantization, M. Grootendorst", href: "https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-quantization" },
      { label: "Compared: Introducing NVFP4, NVIDIA", href: "https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/" },
      { label: "Compared: MXFP4 in Transformers, Hugging Face docs", href: "https://huggingface.co/docs/transformers/main/en/quantization/mxfp4" },
      { label: "Compared: MXFP4 in Transformers, the Hugging Face blog post the docs link to (blocks of 32, kernel benchmarks)", href: "https://huggingface.co/blog/faster-transformers#mxfp4-quantization" },
      { label: "Compared: Quantization Fundamentals with Hugging Face, DeepLearning.AI", href: "https://www.deeplearning.ai/short-courses/quantization-fundamentals-with-hugging-face/" },
      { label: "Compared: Quantization in Depth, DeepLearning.AI", href: "https://www.deeplearning.ai/short-courses/quantization-in-depth/" },
      { label: "Compared: MIT 6.5940 TinyML and Efficient Deep Learning, Fall 2024", href: "https://hanlab.mit.edu/courses/2024-fall-65940" },
      { label: "Compared: microsoft/microxcaling", href: "https://github.com/microsoft/microxcaling" },
      { label: "Compared: graphcore-research/gfloat", href: "https://github.com/graphcore-research/gfloat" },
      { label: "Compared: Understanding MXFP4 Quantization, K. Sharma", href: "https://www.kapilsharma.dev/posts/mxfp4-visualizer/" },
      { label: "Compared: Floating Point Conversion Calculator, sw23", href: "https://sw23.github.io/fp-conv/" },
    ],
    openQuestions: [
      "One block, chosen to show the flush. There is no model and no accuracy number, and how often real weight blocks look like this one is not measured here.",
      "ocp_mx.t27 was merged into t27 on 6 October 2026 (t27#6828, 322cc77d7) but has not reached the site: the scan that copies t27 specs to t27.ai has been red since 3 October. Lesson 33 shows a recording made on the branch commit 1a3786657, with the same file.",
      "Lesson 33 is a recording, not a player: ocp_mx.t27 is not on the site yet, so the page does not run its tests (the site's evaluator passes all 49 when run on the file). In lesson 31 the player skips 10 of the 27 checks of e8m0.t27 because its evaluator does not handle the ExprCast conversion yet; the native run in lesson 32 passes all 18 tests and proves all 9 invariants.",
      "The block conversion follows the scale rule of OCP MX v1.0 section 6.3, which also allows other algorithms. A tool that picks the scale differently gives different codes for the same weights, and no reading is checked against hardware here.",
      "Not covered: OFP8's non-saturating overflow mode, and the all-zero block, which section 6.3 leaves undefined.",
      "IEEE P3109 has an approved project request and no published standard; nothing here claims conformance to it.",
      "The comparison is twelve resources in ten rows, as their pages read on 6 October 2026, not a complete survey. A page that already shows the zero count per element type would make the post's one narrow claim wrong.",
      "Four Russian lesson cards clip the last character of their address (trinity#1441).",
    ],
    published: true,
    ru: {
      title: "Один выброс, 23 нуля: модуль курса о блоке OCP MX",
      summary: "[один блок из 32, выбранный, чтобы показать обнуление, без модели и без числа точности; ocp_mx.t27 влит в t27, но ещё не на сайте; урок 33 — запись, а не плеер в браузере; только программа] В курсе t27 три новых урока о форматах Microscaling (MX) от Open Compute Project, где 32 веса делят один байт масштаба. Один вес 3,3 среди 31 маленького задаёт этот масштаб, и в MXFP4 23 из 30 ненулевых маленьких становятся нулём; MXFP6 E2M3 теряет 4, MXINT8 2, MXFP6 E3M2 и MXFP8 E4M3 — ни одного. Числа взяты из спеки с 49 тестами, и замена одного смещения экспоненты с 15 на 16 роняет ровно один из них.",
      openQuestions: [
        "Один блок, выбранный, чтобы показать обнуление. Ни модели, ни числа точности; как часто настоящие блоки весов похожи на этот, здесь не измерено.",
        "ocp_mx.t27 влит в t27 6 октября 2026 года (t27#6828, 322cc77d7), но до сайта не дошёл: скан, который копирует спеки t27 на t27.ai, красный с 3 октября. Урок 33 показывает запись, сделанную на коммите ветки 1a3786657, с тем же файлом.",
        "Урок 33 — запись, а не плеер: ocp_mx.t27 ещё нет на сайте, поэтому страница не запускает его тесты (вычислитель сайта, запущенный на этом файле, проходит все 49). В уроке 31 плеер пропускает 10 из 27 проверок e8m0.t27, потому что его вычислитель пока не умеет преобразование ExprCast; нативный прогон в уроке 32 проходит все 18 тестов и доказывает все 9 инвариантов.",
        "Перевод блока следует правилу масштаба из раздела 6.3 OCP MX v1.0, который допускает и другие алгоритмы. Инструмент, выбирающий масштаб иначе, даёт для тех же весов другие коды, и ни одно прочтение здесь не проверено на железе.",
        "Не покрыто: режим OFP8 без насыщения при переполнении и блок из одних нулей, который раздел 6.3 оставляет неопределённым.",
        "У IEEE P3109 есть одобренный запрос на проект и нет опубликованного стандарта; здесь ничто не заявляет соответствия ему.",
        "Сравнение — это двенадцать источников в десяти строках, в том виде, в каком их страницы читались 6 октября 2026 года, а не полный обзор. Страница, где число нулей по типам элементов уже показано, сделала бы единственное узкое утверждение поста неверным.",
        "На четырёх русских карточках уроков обрезан последний символ адреса (trinity#1441).",
      ],
    },
  },
  {
    slug: "a-terminal-for-seven-backends-in-an-x-post",
    title: "A terminal for t27's seven backends, inside an X post",
    summary: "[one spec, hello_world; only JavaScript runs in the browser; the native results are one macOS machine on one day; nothing posted on X] The t27 player now has a terminal: the compiler, as WebAssembly in the page, prints what each of its seven backends emits and runs the spec's tests. Each backend has its own share page. Every word the terminal says lives in the spec. Run natively, hello_world as committed builds in two of the seven languages, and the post says why.",
    date: "2026-10-04",
    readingMinutes: 6,
    tags: ["t27", "Compiler", "Terminal"],
    receipts: [
      { label: "The recording shown in the post: the terminal's own gates, 21 pass, 0 fail", href: "https://t27.ai/term/play-terminal-gates/" },
      { label: "The player, with the terminal as its last tab", href: "https://t27.ai/play/hello-world/" },
      { label: "trinity#1366: this work, the terminal, the seven pages and this post", href: "https://github.com/gHashTag/trinity/pull/1366" },
      { label: "trinity#1365: a terminal for every t27 backend, one share page per backend (the issue this work closes)", href: "https://github.com/gHashTag/trinity/issues/1365" },
      { label: "trinity#1359: typed code shows at once in the spec editor (the base of this work) · MERGED 2026-10-04", href: "https://github.com/gHashTag/trinity/pull/1359" },
      { label: "trinity#1340: the X player card, generated from specs/x/player.t27 · MERGED 2026-10-04", href: "https://github.com/gHashTag/trinity/pull/1340" },
      { label: "t27#6100: hello_world.t27 calls cast(), which nothing declares · OPEN", href: "https://github.com/gHashTag/t27/issues/6100" },
      { label: "t27#6101: gen-js, an opt-in lowering of fn bodies · OPEN", href: "https://github.com/gHashTag/t27/issues/6101" },
      { label: "t27#5966: gen-verilog and gen-verilog-hir output for hello_world is refused by iverilog · OPEN", href: "https://github.com/gHashTag/t27/issues/5966" },
      { label: "t27#4471: the gen-js backend, declarations only, by design · CLOSED 2026-09-20", href: "https://github.com/gHashTag/t27/issues/4471" },
    ],
    openQuestions: [
      "Only JavaScript runs in the browser. For the other six backends the page prints a command and claims nothing; the native results in the post are one macOS machine on one day (zig 0.16.0, Apple clang 21.0.0, rustc 1.98.1, Icarus Verilog 12.0, tsc 5.8.3).",
      "hello_world as committed does not build natively in five of the seven languages, and the terminal hands out those files anyway, with the command. Until t27#6100 and t27#5966 are fixed, a reader who runs them gets the errors in the table.",
      "The page's test evaluator treats the undeclared cast() as a conversion, so in the browser the spec's tests pass on a line that Zig, C and Rust refuse.",
      "The terminal's behaviour is 361 hand-written lines of JavaScript; only its words and facts are in the spec. Moving the behaviour waits on t27#6101, which changes what gen-js promises and may be declined.",
      "X's player cards may not collect data entry. Whether a terminal page can be posted as a player card is not decided, and nothing has been posted.",
      "One spec has terminal pages. Every other play would need its own seven.",
    ],
    published: true,
    ru: {
      title: "Терминал для семи бэкендов t27 внутри поста в X",
      summary: "[одна спека, hello_world; в браузере работает только JavaScript; нативные результаты получены на одной машине с macOS в один день; в X ничего не опубликовано] В плеере t27 теперь есть терминал: компилятор, работающий в странице как WebAssembly, печатает то, что выдаёт каждый из семи его бэкендов, и запускает тесты спеки. У каждого бэкенда своя страница для ссылок. Каждое слово терминала живёт в спеке. При нативной сборке hello_world в нынешнем виде собирается на двух языках из семи, и пост объясняет почему.",
      openQuestions: [
        "В браузере работает только JavaScript. Для остальных шести бэкендов страница печатает команду и ничего не заявляет; нативные результаты в посте получены на одной машине с macOS в один день (zig 0.16.0, Apple clang 21.0.0, rustc 1.98.1, Icarus Verilog 12.0, tsc 5.8.3).",
        "hello_world в нынешнем виде не собирается нативно на пяти языках из семи, а терминал всё равно выдаёт эти файлы вместе с командой. Пока t27#6100 и t27#5966 не исправлены, читатель, который их запустит, получит ошибки из таблицы.",
        "Вычислитель тестов в странице считает необъявленный cast() преобразованием, поэтому в браузере тесты спеки проходят на строке, которую Zig, C и Rust отвергают.",
        "Поведение терминала — это 361 строка JavaScript, написанная вручную; в спеке только его слова и факты. Перенос поведения ждёт t27#6101, который меняет то, что обещает gen-js, и может быть отклонён.",
        "Карточкам-плеерам X запрещено собирать ввод данных. Можно ли публиковать страницу терминала как карточку-плеер, не решено, и ничего не опубликовано.",
        "Страницы терминала есть у одной спеки. Каждому другому плееру понадобятся свои семь.",
      ],
    },
  },
  {
    slug: "t27c-compile-time-and-a-backend-without-llvm",
    title: "Where t27c's compile time goes, and a first backend without LLVM",
    summary: "[one M1 Pro, one synthetic program; the t27b numbers were taken at a load average of 83–165 on 8 cores; t27b handles 37 of 1174 specs and its JIT runs only on arm64 macOS; three of the four bugs it found are not fixed yet] t27c type-checks a function in 29.9 µs, 5.2 times faster than rustc check, but it emits no machine code, so its full path to an object file is 2.1 times slower than clang on the same program written in C. Its own clean release build went from 142.7 s to 66.0 s after three merged PRs removed unused machine-learning crates and the aws-lc-sys build. t27b, a native AArch64 backend with no LLVM, now merged, compiles and runs the same tests 23 to 381 times faster than the Zig path, writes code at about the clang -O0 level, and found four bugs in t27c and in a spec.",
    date: "2026-10-04",
    readingMinutes: 10,
    tags: ["t27", "Compiler", "Measurement"],
    receipts: [
      { label: "t27#5979: t27b, a native AArch64 backend for a subset of t27, no LLVM · MERGED 2026-10-04", href: "https://github.com/gHashTag/t27/pull/5979" },
      { label: "t27#5976: the t27b issue · CLOSED 2026-10-04", href: "https://github.com/gHashTag/t27/issues/5976" },
      { label: "t27#5989: the orphan-ceiling ledger names cli/t27b, a follow-up to #5979 · MERGED 2026-10-04", href: "https://github.com/gHashTag/t27/pull/5989" },
      { label: "t27#5977: t27b structs, strings, enums, casts and invariant blocks · OPEN", href: "https://github.com/gHashTag/t27/issues/5977" },
      { label: "t27#5992: t27b coverage, invariant blocks run like tests · OPEN, submitted, not merged", href: "https://github.com/gHashTag/t27/pull/5992" },
      { label: "t27#5993: the Zig signed % fix, lowered to @rem · OPEN, submitted, not merged", href: "https://github.com/gHashTag/t27/pull/5993" },
      { label: "t27#5900: drop unused candle-core/candle-nn, 142.7 s → 97.9 s · MERGED 2026-10-04", href: "https://github.com/gHashTag/t27/pull/5900" },
      { label: "t27#5914: the web stack behind cargo features, 212 → 49 crates · MERGED 2026-10-04", href: "https://github.com/gHashTag/t27/pull/5914" },
      { label: "t27#5920: reqwest on native-tls, no aws-lc-sys build · MERGED 2026-10-04", href: "https://github.com/gHashTag/t27/pull/5920" },
      { label: "t27#5945: the fast t27c inner loop in CONTRIBUTING · MERGED 2026-10-04", href: "https://github.com/gHashTag/t27/pull/5945" },
      { label: "t27#5972: ternary_model dot27 shifts an i32 by up to 52 bits · CLOSED 2026-10-04", href: "https://github.com/gHashTag/t27/issues/5972" },
      { label: "t27#5975: the dot27 fix, u64 lanes and corrected test values · MERGED 2026-10-04", href: "https://github.com/gHashTag/t27/pull/5975" },
      { label: "t27#5905: epic, t27c's measured weak points · OPEN", href: "https://github.com/gHashTag/t27/issues/5905" },
    ],
    openQuestions: [
      "One machine, under load. The t27b session ran at a load average of 83 to 165 on 8 cores, so its absolute times are inflated; nothing was re-measured on a quiet machine or on Linux.",
      "One synthetic program, thousands of copies of one loop over a u32. Real Rust and C++ spend their time on generics, templates, macros and imports, which this program barely has.",
      "t27b handles 37 of 1174 specs, 26 of those 37 have no tests, and its JIT runs only on arm64 macOS. Its code is slower than clang -O2.",
      "The self-build figures are single runs; building the #5900 tree again gave 110.9 s instead of 97.9 s. Splitting compiler.rs into 24 files showed no speed-up within the noise.",
      "Three of the four bugs t27b found are not fixed. The Zig signed % fix is #5993, submitted, not merged; the gen-c undefined arithmetic and the dotted module name have no PR yet.",
      "Covering every spec the reference path passes is planned and in progress, in two lanes: memory (structs, arrays and slices, strings on one address-plus-offset and read-only-data model) and scalar (enums, f64, casts), ordered by a greedy unlock ranking. There are no numbers yet; only #5992 (invariant blocks) is a PR, submitted, not merged.",
    ],
    published: true,
    ru: {
      title: "Куда уходит время компиляции t27c, и первый бэкенд без LLVM",
      summary: "[один M1 Pro, одна синтетическая программа; цифры t27b сняты при load average 83–165 на 8 ядрах; t27b понимает 37 из 1174 спек, а его JIT работает только на arm64 macOS; три из четырёх найденных им ошибок ещё не исправлены] t27c проверяет типы одной функции за 29,9 мкс, в 5,2 раза быстрее rustc check, но машинного кода не выдаёт, поэтому его полный путь до объектного файла в 2,1 раза медленнее clang на той же программе, написанной на C. Чистая release-сборка самого t27c сократилась со 142,7 с до 66,0 с после трёх влитых PR, убравших неиспользуемые библиотеки машинного обучения и сборку aws-lc-sys. t27b, собственный бэкенд AArch64 без LLVM, уже влит: он компилирует и запускает те же тесты в 23–381 раз быстрее пути через Zig, пишет код примерно уровня clang -O0 и нашёл четыре ошибки в t27c и в одной спеке.",
      openQuestions: [
        "Одна машина, под нагрузкой. Сеанс t27b шёл при load average от 83 до 165 на 8 ядрах, так что абсолютные времена завышены; на тихой машине и на Linux ничего не перемеряли.",
        "Одна синтетическая программа: тысячи копий одного цикла над u32. Настоящие Rust и C++ тратят время на обобщения, шаблоны, макросы и импорты, которых здесь почти нет.",
        "t27b понимает 37 из 1174 спек, у 26 из этих 37 тестов нет, а его JIT работает только на arm64 macOS. Его код медленнее, чем после clang -O2.",
        "Цифры сборки t27c — по одному прогону; повторная сборка ветки #5900 дала 110,9 с вместо 97,9 с. Разбиение compiler.rs на 24 файла ускорения сверх шума не показало.",
        "Три из четырёх ошибок, найденных t27b, не исправлены. Исправление знакового % для Zig — #5993, отправлен, не влит; для неопределённой арифметики в gen-c и точечного имени модуля PR пока нет.",
        "Покрыть каждую спеку, которую проходит эталонный путь, — запланировано и в работе, двумя дорожками: память (структуры, массивы и срезы, строки на одной модели «адрес плюс смещение» с данными только для чтения) и скаляры (перечисления, f64, приведения), в порядке жадного рейтинга по числу открываемых спек. Цифр пока нет; PR есть только #5992 (блоки invariant), отправлен, не влит.",
      ],
    },
  },
  {
    slug: "three-bits-each-necessary",
    title: "Three bits, each one necessary: the MMCM's performance clock on silicon",
    summary: "[one clock path on one AX7203 board; LEDs read by eye, no counter readback; built with a nextpnr-xilinx 115 commits behind main, with one merged fix applied locally; the faster loop was timed on one small design] An MMCM output can reach a regional clock buffer through a performance-clock path, and two rows in Project X-Ray's database say which bits switch that path on. With the rows on prjxray-db master, a counter clocked through it does not run on an XC7A200T. With the rows we proposed in openXC7/prjxray-db#30, it runs, and the two bitstreams differ in exactly three bits. Clearing any one of the three stops the counter again, so each is necessary. nextpnr-xilinx main still pins a database with the old rows. Along the way, the edit-to-board loop went from about 104–111 s to about 19–28 s, mostly from a router flag, the t27-spec assembler and a faster JTAG clock.",
    date: "2026-10-04",
    readingMinutes: 6,
    tags: ["FPGA", "Open toolchain", "Verification"],
    receipts: [
      { label: "openXC7/prjxray-db#30: the CLK_PERF and PERFCLK rows, c030ed6 (open)", href: "https://github.com/openXC7/prjxray-db/pull/30" },
      { label: "openXC7/nextpnr#24: where the rows are discussed", href: "https://github.com/openXC7/nextpnr/issues/24" },
      { label: "The verification scripts behind the rows", href: "https://gist.github.com/gHashTag/3c9216880b77946385dfc5bea317d927" },
      { label: "cavearr's perfclk campaign, 1083 Vivado specimens", href: "https://github.com/cavearr/prjxray/releases/tag/perfclk-campaign-2026-10" },
      { label: "openXC7/prjxray-db#13: the rows nextpnr-xilinx main pins · MERGED 2026-09-07", href: "https://github.com/openXC7/prjxray-db/pull/13" },
      { label: "openXC7/nextpnr-xilinx#191: the MMCM RST/PWRDWN fix · MERGED 2026-09-09", href: "https://github.com/openXC7/nextpnr-xilinx/pull/191" },
      { label: "openXC7/nextpnr-xilinx#205: the BUFR regional clock enables · MERGED 2026-09-24", href: "https://github.com/openXC7/nextpnr-xilinx/pull/205" },
      { label: "Two bitstreams, one bit apart (the earlier one-bit A/B)", href: "https://t27.ai/#/blog/two-bitstreams-one-bit-apart" },
      { label: "The FPGA flow, layer by layer (the previous timing post)", href: "https://t27.ai/#/blog/the-fpga-flow-layer-by-layer" },
      { label: "The recording: the three bits and the knockout bitstreams", href: "https://t27.ai/term/perf2-knockouts/" },
      { label: "The recording: one cycle from place-and-route to SRAM, timed", href: "https://t27.ai/term/perf2-loop/" },
    ],
    openQuestions: [
      "One clock path on one board, with LEDs read by eye. The knockouts show that each bit is necessary here, not that the three are sufficient on other paths.",
      "nextpnr-xilinx main pins rows that left this counter dead. Whether main routes a design through this path at all was not tested.",
      "router1 was timed on a design with a few hundred wires. On a large design it may be slower than router2 or fail to route.",
    ],
    published: true,
    ru: {
      title: "Три бита, и каждый нужен: performance clock у MMCM на кремнии",
      summary: "[один тактовый тракт на одной плате AX7203; светодиоды читались глазом, считывания счётчика нет; сборка nextpnr-xilinx на 115 коммитов позади main, с одним влитым исправлением, применённым локально; быстрый цикл засекался на одном маленьком дизайне] Выход MMCM может дойти до регионального тактового буфера через тракт performance clock, и две строки в базе Project X-Ray говорят, какие биты этот тракт включают. Со строками master prjxray-db счётчик, тактируемый через него, на XC7A200T не идёт. Со строками, которые мы предложили в openXC7/prjxray-db#30, идёт, а два битстрима различаются ровно в трёх битах. Сброс любого одного из трёх снова останавливает счётчик, так что нужен каждый. main nextpnr-xilinx всё ещё фиксирует базу со старыми строками. Попутно цикл от правки до платы сократился с примерно 104–111 с до примерно 19–28 с, в основном за счёт флага роутера, ассемблера из t27-спеков и более быстрого такта JTAG.",
      openQuestions: [
        "Один тактовый тракт на одной плате, светодиоды читались глазом. Нокауты показывают, что здесь нужен каждый бит, а не что трёх хватит на других трактах.",
        "main nextpnr-xilinx фиксирует строки, с которыми этот счётчик стоял. Разводит ли main дизайн через этот тракт вообще, не проверялось.",
        "router1 засекался на дизайне из нескольких сотен проводов. На большом дизайне он может оказаться медленнее router2 или не развести его.",
      ],
    },
  },
  {
    slug: "tri-cast-from-command-to-card",
    title: "tri cast: record a command, check the recording, publish it as a page",
    summary: "[one machine, one day per recording; 10 of 596 commands have one; tri cast is not in a tri release yet] A recorded command can be replayed and checked, a described one can only be believed. tri cast records real terminal output, scrubs and checks it, and publishes a page, a preview card and a player.",
    date: "2026-10-03",
    readingMinutes: 4,
    tags: ["tri", "Verification", "Terminal"],
    receipts: [
      { label: "The recording shown in the post: tri selftest", href: "https://t27.ai/term/tri-selftest/" },
      { label: "The gallery of recorded sessions", href: "https://t27.ai/term/" },
      { label: "trinity#1273: the recorded-session player and gallery · MERGED 2026-10-03", href: "https://github.com/gHashTag/trinity/pull/1273" },
      { label: "trinity#1288: recordings for eight tri commands · MERGED 2026-10-03", href: "https://github.com/gHashTag/trinity/pull/1288" },
      { label: "The FPGA flow, layer by layer (a post built on a recording)", href: "https://t27.ai/#/blog/the-fpga-flow-layer-by-layer" },
    ],
    openQuestions: [
      "A recording shows what a command printed on one machine on one day, not that it is correct for every input.",
      "Only 10 of 596 commands have a recording; the other 586 have a card and no run.",
      "tri cast lives in the maintainer's skills directory and is not in a tri release, so a reader cannot install it yet.",
    ],
    published: true,
    ru: {
      title: "tri cast: записать команду, проверить запись, опубликовать страницей",
      summary: "[одна машина и один день на запись; запись есть у 10 из 596 команд; tri cast пока не входит в релиз tri] Записанную команду можно проиграть и проверить, описанную — только принять на веру. tri cast записывает настоящий вывод терминала, чистит и проверяет его и публикует страницу, карточку-превью и плеер.",
      openQuestions: [
        "Запись показывает, что команда напечатала на одной машине в один день, а не что она верна для любого ввода.",
        "Запись есть только у 10 из 596 команд; у остальных 586 карточка есть, а прогона нет.",
        "tri cast живёт в каталоге навыков мейнтейнера и не входит в релиз tri, так что читатель пока не может его установить.",
      ],
    },
  },
  {
    slug: "the-fpga-flow-layer-by-layer",
    title: "The FPGA flow, layer by layer: what a rewrite from specs is worth",
    summary: "[one design, one laptop at a load of 12.6 on 8 cpus; L1 and L2 figures are Amdahl ceilings, not results; hours a year rest on stated assumptions] We timed every layer of one real XC7A200T build through openXC7. Synthesis took 12.7 s, place and route 70.1 s, FASM to frames 33.9 s and frames to bitstream 0.2 s, 116.9 s in all. With the two layers already rebuilt from t27 specs, the flow takes 83.5 s, 1.40 times faster, and the bitstream is byte-identical. Place and route is now 60% of the build: if it took no time the flow would be 8.75 times faster, while an instant synthesis step caps out at 1.65 times. The numbers are in a recorded terminal session. The tools are not in a tri release yet.",
    date: "2026-10-03",
    readingMinutes: 5,
    tags: ["FPGA", "Open toolchain", "t27"],
    receipts: [
      { label: "The recorded run: tri devkit flow and impact", href: "https://t27.ai/term/devkit-flow/" },
      { label: "The layer calculator", href: "https://t27.ai/#/devkit" },
      { label: "trinity#1272: tri devkit and bitwalk in a tri release (open)", href: "https://github.com/gHashTag/trinity/issues/1272" },
      { label: "The back half of openXC7, from a spec (previous post)", href: "https://t27.ai/#/blog/the-back-half-of-openxc7-from-a-spec" },
      { label: "t27#5609: bitwalk and the three specs (open)", href: "https://github.com/gHashTag/t27/pull/5609" },
    ],
    openQuestions: [
      "One design on one laptop; a design that spends less of its build in fasm2frames gains less.",
      "Place and route is the largest layer, and nothing here shows a spec-driven route to making it faster.",
    ],
    published: true,
    ru: {
      title: "FPGA-flow по слоям: сколько стоит переписать его из спеков",
      summary: "[один дизайн, один ноутбук при нагрузке 12,6 на 8 ядрах; цифры L1 и L2 — потолки по Амдалу, а не результаты; часы в год опираются на названные допущения] Мы засекли каждый слой одной настоящей сборки XC7A200T через openXC7. Синтез занял 12,7 с, размещение и разводка 70,1 с, FASM в кадры 33,9 с, кадры в битстрим 0,2 с, всего 116,9 с. С двумя слоями, уже пересобранными из t27-спеков, flow занимает 83,5 с, в 1,40 раза быстрее, и битстрим совпадает байт в байт. Размещение и разводка теперь 60% сборки: если бы они не занимали времени, flow был бы в 8,75 раза быстрее, а мгновенный синтез упирается в 1,65 раза. Числа — в записанной терминальной сессии. В релизе tri этих инструментов пока нет.",
      openQuestions: [
        "Один дизайн на одном ноутбуке; дизайн, который тратит меньшую долю сборки в fasm2frames, выиграет меньше.",
        "Размещение и разводка — самый большой слой, и ничто здесь не показывает пути из спеков, который сделал бы его быстрее.",
      ],
    },
  },
  {
    slug: "the-back-half-of-openxc7-from-a-spec",
    title: "The back half of openXC7, from a spec: FASM to frames to bitstream",
    summary: "[one design on one board, equivalence not a better bitstream; timings on one busy laptop, ratios are rough; the fpga-assembler speed figure is its README's, not ours] openXC7 turns FASM into a Xilinx 7-series bitstream with two prjxray tools, fasm2frames in Python and xc7frames2bit in C++. We rebuilt that half so every bit position, frame address and packet word comes from three t27 specs. Against the two tools it matches byte for byte on 22 of 22 FASM files and 16 of 16 frame files, and it is about 6 to 14 times faster on small real designs, about 85 times on a 121,587-line one, and up to about 200 times on synthetic test files. The comparison found a silent bit-wrap in fasm2frames (f4pga/prjxray#2574), a missing part check in xc7frames2bit (#2573), and a bug of our own on kintex7. On an AX7203 board (XC7A200T), a .bit written this way for a 121,587-line design was byte-identical to openXC7's, loaded into SRAM, and returned 403,200 of 403,200 tagged receipts.",
    date: "2026-10-03",
    readingMinutes: 8,
    tags: ["FPGA", "Open toolchain", "Verification", "t27"],
    receipts: [
      { label: "t27#5609: bitwalk and the three specs (open)", href: "https://github.com/gHashTag/t27/pull/5609" },
      { label: "prjxray#2574: fasm2frames wraps or drops bits of a site a SING tile lacks", href: "https://github.com/f4pga/prjxray/issues/2574" },
      { label: "prjxray#2573: xc7frames2bit accepts frames for the wrong part", href: "https://github.com/f4pga/prjxray/issues/2573" },
      { label: "openXC7/prjxray#27: xc7frames2bit refuses frame addresses the part does not have (open)", href: "https://github.com/openXC7/prjxray/pull/27" },
      { label: "openXC7/prjxray#28: xc7frames2bit exits 1 when the bitstream cannot be written (open)", href: "https://github.com/openXC7/prjxray/pull/28" },
      { label: "trinity-fpga: the AX7203 run, logs and receipts", href: "https://github.com/gHashTag/trinity-fpga/blob/421ae920fb477c98505e4143df3cab7954c268a7/conformance/X7_BITWALK_ON_THE_BOARD.md" },
      { label: "fpga-assembler#49: the reference-parity cases", href: "https://github.com/lromor/fpga-assembler/issues/49" },
      { label: "fpga-assembler, a C++ FASM-to-bitstream tool", href: "https://github.com/lromor/fpga-assembler" },
    ],
    openQuestions: [
      "One design, one board: the AX7203 run covers trinet node 0 only, and its .bit is byte-identical to openXC7's, so it cannot show a case where the two differ.",
      "Apart from the board design, there is no xc7a200t FASM in the corpus, and there is no Vivado reference for xc7a100t or xc7a200t.",
      "gHashTag/t27#5609 has no review yet. f4pga/prjxray#2573 and #2574 and openXC7/prjxray#27 and #28 have no maintainer reply yet.",
      "fpga-assembler was not timed here, so the table carries its README's figure, not a measurement.",
    ],
    published: true,
    ru: {
      title: "Задняя половина openXC7 из спека: FASM в кадры и в битстрим",
      summary: "[один дизайн на одной плате, эквивалентность, а не лучший битстрим; время на одном занятом ноутбуке, отношения грубые; скорость fpga-assembler — из его README, не наша] openXC7 превращает FASM в битстрим Xilinx 7-series двумя инструментами prjxray: fasm2frames на Python и xc7frames2bit на C++. Мы пересобрали эту половину так, что каждая позиция бита, адрес кадра и слово пакета берутся из трёх t27-спеков. Против двух инструментов она совпадает байт в байт на 22 из 22 файлов FASM и 16 из 16 файлов кадров и быстрее примерно в 6–14 раз на небольших настоящих дизайнах, примерно в 85 раз на дизайне в 121 587 строк и до примерно 200 раз на синтетических тестах. Сравнение нашло тихий заворот битов в fasm2frames (f4pga/prjxray#2574), отсутствующую проверку микросхемы в xc7frames2bit (#2573) и наш собственный баг на kintex7. На плате AX7203 (XC7A200T) .bit, записанный так для дизайна в 121 587 строк, совпал с openXC7 байт в байт, загрузился в SRAM и вернул 403 200 из 403 200 помеченных квитанций.",
      openQuestions: [
        "Один дизайн, одна плата: прогон на AX7203 покрывает только trinet node 0, и его .bit совпадает с openXC7 байт в байт, так что он не может показать случай, где они расходятся.",
        "Кроме дизайна для платы, в корпусе нет FASM для xc7a200t, и нет эталона Vivado для xc7a100t и xc7a200t.",
        "У gHashTag/t27#5609 ещё нет ревью. На f4pga/prjxray#2573 и #2574 и openXC7/prjxray#27 и #28 мейнтейнеры ещё не ответили.",
        "fpga-assembler здесь не засекали, поэтому в таблице цифра из его README, а не измерение.",
      ],
    },
  },
  {
    slug: "one-regional-clock-twelve-pull-requests",
    title: "One regional clock, twelve pull requests, and a spec that found a compiler bug",
    summary: "[counts measured through the GitHub API on 2026-10-02; merged means merged by the openXC7 maintainer, not shipped in a release; bitstream checks are cavearr's Vivado bench and our XC7A200T board] Since 1 September we opened 12 pull requests in repositories we do not own: 11 in openXC7, the open toolchain for Xilinx 7-series, and 1 in inngest. 5 are merged and 7 are open. Most follow one thread: a design with a regional clock buffer (BUFR) on an XC7A200T did not build through the open flow, and fixing it took the placer, the router, the bitstream writer and the bit database. A t27 spec of the database rows then found a parser bug in the t27 compiler, which we fixed in our own repository.",
    date: "2026-10-02",
    readingMinutes: 6,
    tags: ["FPGA", "Open toolchain", "Verification", "t27"],
    receipts: [
      { label: "nextpnr-xilinx#170: a pad-fed BUFR on its dedicated site (merged)", href: "https://github.com/openXC7/nextpnr-xilinx/pull/170" },
      { label: "nextpnr-xilinx#171: a regional buffer's sinks inside its clock region (merged)", href: "https://github.com/openXC7/nextpnr-xilinx/pull/171" },
      { label: "nextpnr-xilinx#205: the BUFRCLK enables (merged)", href: "https://github.com/openXC7/nextpnr-xilinx/pull/205" },
      { label: "prjxray-db#30: CLK_PERF and PHSR_PERFCLK rows with all their bits (open)", href: "https://github.com/openXC7/prjxray-db/pull/30" },
      { label: "nextpnr#53 to #57: himbaechel ports (open)", href: "https://github.com/openXC7/nextpnr/pulls?q=is%3Apr+author%3AgHashTag" },
      { label: "nextpnr#58: IDDR behind an IDELAYE2 (merged)", href: "https://github.com/openXC7/nextpnr/pull/58" },
      { label: "demo-projects#22: RAM32X2S/X1S regression designs (merged)", href: "https://github.com/openXC7/demo-projects/pull/22" },
      { label: "inngest#4860: forward Authorization to REST API v2 (open)", href: "https://github.com/inngest/inngest/pull/4860" },
      { label: "t27#5593: the assert parse bug", href: "https://github.com/gHashTag/t27/issues/5593" },
      { label: "t27#5594: the fix (open)", href: "https://github.com/gHashTag/t27/pull/5594" },
    ],
    openQuestions: [
      "prjxray-db#30 was opened today and has no maintainer review yet.",
      "nextpnr#53 and #54 show approved on GitHub, but the approval is from the Sourcery bot. No maintainer has reviewed them yet.",
      "nextpnr#55, #56 and #57 have requested changes. The revisions were pushed on 30 September and are not yet re-reviewed.",
      "inngest#4860 has had no maintainer reply since 13 September.",
      "The t27 spec of the rows is not yet committed to any repository, so a reader cannot run it yet. It is planned for gHashTag/t27 specs/fpga after #5594 merges.",
      "gHashTag/t27#5594 is open and its CI has not finished.",
      "The spec covers the database rows only. The nextpnr code that reads them is still hand-written C++.",
    ],
    published: true,
    ru: {
      title: "Один региональный клок, двенадцать pull request'ов и спек, который нашёл баг в компиляторе",
      summary: "[счётчики измерены через GitHub API 2 октября 2026; смержен значит принят мейнтейнером openXC7, а не вошёл в релиз; проверки битстримов — стенд cavearr с Vivado и наша плата XC7A200T] С 1 сентября мы открыли 12 pull request'ов в чужих репозиториях: 11 в openXC7, открытой цепочке сборки для Xilinx 7-series, и 1 в inngest. 5 смержены, 7 открыты. Большая часть идёт по одной нитке: дизайн с региональным клоковым буфером (BUFR) на XC7A200T не собирался открытым flow, и чтобы это исправить, пришлось пройти плейсер, трассировщик, запись битстрима и базу битов. Потом t27-спек строк этой базы нашёл баг в парсере компилятора t27, и мы исправили его в своём репозитории.",
      openQuestions: [
        "prjxray-db#30 открыт сегодня, ревью мейнтейнера ещё нет.",
        "nextpnr#53 и #54 на GitHub показаны как approved, но одобрил их бот Sourcery. Мейнтейнер их ещё не смотрел.",
        "В nextpnr#55, #56 и #57 запрошены изменения. Правки запушены 30 сентября и ещё не пересмотрены.",
        "На inngest#4860 мейнтейнеры не ответили с 13 сентября.",
        "t27-спек строк пока не закоммичен ни в один репозиторий, так что читатель ещё не может его запустить. Он запланирован в gHashTag/t27 specs/fpga после мержа #5594.",
        "gHashTag/t27#5594 открыт, его CI ещё не завершился.",
        "Спек покрывает только строки базы. Код nextpnr, который их читает, по-прежнему написан руками на C++.",
      ],
    },
  },
  {
    slug: "the-seed-moved-it-the-pins-moved-it-more",
    title: "The seed moved Fmax 1.22x. The pins moved it 2.6x.",
    summary: "[nextpnr-xilinx post-route estimates on xc7a200tfbg484-2, not sign-off timing; a stand-alone unit on synthetic pins, not a full design; JTAG result from our own bench] Two bench questions became two commands. tri fpga-seeds treats Fmax as a range over placement seeds: a 321-LUT ternary dot-product unit ran 164.15 to 200.40 MHz over 20 seeds, and 62.68 to 76.75 MHz with its pins spread across the package, with the same netlist on every run. tri fpga-jtag reads which chip is on the chain, never programs, and tells a silent TDO from a broken cable. On our bench it caught an XC7A200T where an XC7A100T was expected.",
    date: "2026-10-01",
    readingMinutes: 5,
    tags: ["FPGA", "Open toolchain", "Verification", "Tooling"],
    receipts: [
      { label: "nextpnr-xilinx, the place-and-route tool whose seeds were swept", href: "https://github.com/openXC7/nextpnr-xilinx" },
      { label: "openFPGALoader, used for the FTDI path of fpga-jtag", href: "https://github.com/trabucayre/openFPGALoader" },
      { label: "xc3sprog, used for the Platform Cable USB II path", href: "https://sourceforge.net/projects/xc3sprog/" },
    ],
    openQuestions: [
      "The unit is measured stand-alone on synthetic pins. Its Fmax inside a real SoC is set by a different critical path and is not claimed here.",
      "The spread-pinout sweep has 10 seeds, not 20: one seed did not finish under machine load and the rest were not run.",
      "Seed spread was measured for one small unit on one part. Larger designs may spread more or less.",
      "The second bench, an XC7A100T on a DLC10 clone, still returns no chain; the cause is not yet found.",
      "The two commands live in a private repository for now, so a reader cannot yet run them.",
    ],
    published: true,
    ru: {
      title: "Seed сдвинул Fmax в 1,22 раза. Выводы — в 2,6 раза.",
      summary: "[оценки nextpnr-xilinx после разводки на xc7a200tfbg484-2, не подписанный тайминг; отдельный блок на синтетических выводах, а не целый дизайн; результат JTAG — с нашего стенда] Два вопроса стенда стали двумя командами. tri fpga-seeds считает Fmax диапазоном по seed размещения: тернарный блок скалярного произведения на 321 LUT дал от 164,15 до 200,40 МГц на 20 seed и от 62,68 до 76,75 МГц с выводами, разнесёнными по корпусу, при одном и том же нетлисте во всех прогонах. tri fpga-jtag читает, какой чип стоит в цепочке, никогда не прошивает и отличает молчащий TDO от сломанного кабеля. На нашем стенде она поймала XC7A200T там, где ожидался XC7A100T.",
      openQuestions: [
        "Блок измерен отдельно, на синтетических выводах. Его Fmax внутри настоящей SoC задаётся другим критическим путём и здесь не заявляется.",
        "В переборе с разнесёнными выводами 10 seed, а не 20: один seed не завершился под нагрузкой машины, остальные не запускались.",
        "Разброс по seed измерен для одного маленького блока на одной микросхеме. У больших дизайнов он может быть больше или меньше.",
        "Второй стенд, XC7A100T на клоне DLC10, по-прежнему не показывает цепочку; причина пока не найдена.",
        "Обе команды пока лежат в закрытом репозитории, так что читатель ещё не может их запустить.",
      ],
    },
  },
  {
    slug: "mask-over-scale-ternary-drafts-that-compile",
    title: "Mask over scale: a 9M ternary model whose drafts compile",
    summary: "[measured on the 391-item strict t27 bench: 0/150 flat vs 3/150 masked on the same 30 hardest items; 65% of flat first compile errors are undeclared identifiers; strict loop closed at 30 rounds / 8083 samples = 4/391 pass, 283/391 compile; three decode constraints, zero parameters; benched checkpoint = t27-domain finetune of tern_tc, the package ships the base] tern_tc, a 9M ternary model sized to XC7A200T block RAM, cannot learn the names of a scope -- so instead of scaling it we constrained its decoder: a scope mask at every decode step, diversity by mask rule rather than temperature (15/30 vs 3/30 union compile), and a repeat-n-gram ban after 1517/2177 blocked candidates turned out to be repetition cascades. The result is not a solver: 1.0% of the strict set passes. It is a draft model for a verifier -- 72% of the strict set gets a compiling body, tri tc-draft returns the first test-verified one or an honest refusal.",
    date: "2026-09-29",
    readingMinutes: 7,
    tags: ["tern_tc", "Ternary", "t27", "Code generation", "Verification"],
    receipts: [
      { label: "The package: model, tokenizer, verify.sh, sha256 receipts", href: "https://huggingface.co/playra/tern-tc-9m" },
      { label: "The public verify workflow -- green against today's hub bytes", href: "https://github.com/gHashTag/tern-tc-9m-verify/actions" },
      { label: "Earlier: a small agent needs an exact judge", href: "https://t27.ai/blog/a-small-agent-needs-an-exact-judge/" },
      { label: "Earlier: ternary won the wire, not the gate", href: "https://t27.ai/blog/ternary-won-the-wire-not-the-gate/" },
    ],
    openQuestions: [
      "The selfcheck loop is not a clean A/B on --no-repeat: the flag went in at round 25 of a live run, so the two late passes are consistent with the ban but not isolated by it.",
      "The strict loop ran one seed of the model; ternary training spread at 52m was measured at ~1.7%, so 4-vs-3 passes is within noise and the honest number is 'a handful, not a rate'.",
      "Mask rules and the repeat ban were tuned on the same bench they are reported on; no held-out spec set exists for them.",
      "The 72% compile union is per-item over unlimited retries (~21 samples median); compile@1 on fresh items is far lower.",
      "The bench's judge is the spec's own tests, and some of those tests are weak -- that is what the strict subset is for, but weak-test leakage outside it is unquantified.",
      "Every number here comes from the t27-finetuned bench checkpoint; the HF package ships the base checkpoint whose card claims no quality. The finetune is now published as playra/tern-tc-9m-t27; its finetune corpus and the bench corpus are both t27 specs at pinned commits, so no held-out set separates them.",
    ],
    published: true,
    ru: {
      title: "Маска вместо масштаба: тернарная модель на 9M, чьи черновики компилируются",
      summary: "[измерено на строгом сете t27 из 391 айтемов: 0/150 плоской генерации против 3/150 маскированной на тех же 30 труднейших; 65% первых ошибок компиляции — необъявленные идентификаторы; строгая петля закрыта на 30 раундах / 8083 сэмплах = 4/391 pass, 283/391 compile; три ограничения декодера, ноль параметров; чекпоинт бенчмарка = t27-файнтюн tern_tc, пакет шипит базовый] tern_tc, тернарная модель на 9M под блочную память XC7A200T, не может выучить имена областей видимости — и вместо масштабирования мы ограничили её декодер: маска области видимости на каждом шаге, разнообразие правилами маски, а не температурой (15/30 против 3/30 union compile), и запрет n-граммов повторов после того, как 1517/2177 нескомпилированных кандидатов оказались каскадами повторов. Результат — не решатель: 1.0% строгого сета проходит тесты. Это модель-черновик для верификатора: 72% сета получает компилируемое тело, tri tc-draft возвращает первое проверенное тестами или честный отказ.",
      openQuestions: [
        "Петля самопроверки — не чистый A/B по --no-repeat: флаг вошёл в живой прогон на 25-м раунде, поэтому два поздних прохождения согласуются с запретом, но не изолированы им.",
        "Строгая петля гонялась на одном сиде модели; разброс тернарного обучения на 52m измерен как ~1.7%, поэтому 4 против 3 прохождений — внутри шума, честная формулировка — «горстка, а не rate».",
        "Правила маски и запрет повторов настраивались на том же бенчмарке, на котором отчётываются; held-out сета спек для них нет.",
        "Union compile 72% — на айтем при неограниченных повторах (медиана ~21 сэмпл); compile@1 на свежих айтемах сильно ниже.",
        "Судья бенчмарка — собственные тесты спеки, и часть тестов слабая — для этого и есть строгое подмножество, но утечка слабых тестов вне его не квантифицирована.",
        "Все числа — с файнтюннутого t27-чекпоинта; HF-пакет шипит базовый, чья карточка не делает заявлений о качестве. Файнтюн опубликован как playra/tern-tc-9m-t27; его файнтюн-корпус и корпус бенчмарка — оба спеки t27 на запиненных коммитах, held-out сета между ними нет.",
      ],
    },
  },
  {
    slug: "golden-ratio-weights-ran-on-the-board",
    title: "Golden-ratio weights ran on the board. The phi cost one add per output.",
    summary: "[measured on FPGA: layer 0, 403,200 of 403,200 receipts verified, registered before the run; the phi step and digit recombination are host arithmetic; one synthetic activation vector] The TNF paper's GFTernary weights, t*phi, applied to activations in Z[phi], ran on the unchanged AX7203 node with no multiplier. Each output is W.b + (W.a + W.b)*phi, so the node computes only ternary dots and the host adds once per output. All 5,632 Z[phi] rows of layer 0 matched a plain Z[phi] multiplication oracle bit for bit.",
    date: "2026-09-27",
    readingMinutes: 6,
    tags: ["FPGA", "Ternary", "Number formats", "Verification", "TRI-NET"],
    receipts: [
      { label: "The pre-registration and the result, side by side", href: "https://github.com/gHashTag/trinity-fpga/blob/8a203217084eb3499d6dee5815be6a462575878f/conformance/GFT_ZPHI_ON_THE_NODE.md" },
      { label: "The board log: 403,200 / 403,200 receipts, 5,632 / 5,632 Z[phi] rows", href: "https://github.com/gHashTag/trinity-fpga/blob/8a203217084eb3499d6dee5815be6a462575878f/conformance/board_runs/gft_zphi_l0.log" },
      { label: "The harness, with its Z[phi] oracle and negative controls", href: "https://github.com/gHashTag/trinity-fpga/blob/8a203217084eb3499d6dee5815be6a462575878f/conformance/gft_zphi_ax7203.py" },
      { label: "Ten weak points of the tern_tc record, ranked", href: "https://github.com/gHashTag/trinity-fpga/blob/8a203217084eb3499d6dee5815be6a462575878f/conformance/TERN_TC_WEAK_POINTS.md" },
      { label: "The pull request that carries it: gHashTag/trinity-fpga 800", href: "https://github.com/gHashTag/trinity-fpga/pull/800" },
      { label: "Earlier: the golden ratio in this format is a scale factor, not information", href: "https://t27.ai/blog/phi-is-a-scale-not-information/" },
      { label: "Earlier: the board's receipts were never checked; now all 403,200 are", href: "https://t27.ai/blog/trained-weights-ran-receipts-were-not-checked/" },
    ],
    openQuestions: [
      "Only layer 0 ran, with one synthetic Z[phi] activation vector, not the activations of a real forward pass.",
      "The TNF accumulator and its rounding have no RTL, so the part of the claim beyond the dot products is untested on hardware.",
      "The node computes ternary dots; the digit recombination and the phi step run on the host. The result says the linear path needs no multiplier, not that the FPGA did all of it.",
      "Speed is not claimed: about 151,000 ternary multiply-accumulates per second over UART (derived).",
      "A SipHash receipt is not publicly verifiable, and it does not stop an operator forging their own.",
    ],
    published: true,
    ru: {
      title: "Веса с золотым сечением отработали на плате. phi стоил одно сложение на выход.",
      summary: "[измерено на FPGA: слой 0, проверено 403 200 из 403 200 квитанций, зарегистрировано до запуска; шаг phi и сборка разрядов — арифметика хоста; один синтетический вектор активаций] Веса GFTernary из статьи о TNF, t*phi, применённые к активациям из Z[phi], отработали на неизменённом узле AX7203 без умножителя. Каждый выход равен W.b + (W.a + W.b)*phi, так что узел считает только тернарные скалярные произведения, а хост делает одно сложение на выход. Все 5 632 строки Z[phi] слоя 0 совпали бит в бит с оракулом обычного умножения в Z[phi].",
      openQuestions: [
        "Прогнан только слой 0 с одним синтетическим вектором активаций из Z[phi], а не с активациями настоящего прямого прохода.",
        "У аккумулятора TNF и его округления нет RTL, так что часть утверждения сверх скалярных произведений на железе не проверена.",
        "Узел считает тернарные скалярные произведения; сборка разрядов и шаг phi выполняются на хосте. Результат говорит, что линейному пути не нужен умножитель, а не что всё сделала FPGA.",
        "Скорость не заявляется: около 151 000 тернарных умножений с накоплением в секунду через UART (выведено).",
        "Квитанция SipHash не проверяется публично и не мешает оператору подделать свои собственные.",
      ],
    },
  },
  {
    slug: "trained-weights-ran-receipts-were-not-checked",
    title: "The board's receipts were never checked. Now all 403,200 are.",
    summary: "[measured on FPGA: all 42 trained matrices, every receipt verified; the activations were test vectors, not a forward pass] An AX7203 computed 28,416 of 28,416 rows of the trained tern_tc model's weight matrices bit-exact, while its harness reported 284,160 authenticated receipts without comparing a single tag. The fixed harness fails on seven kinds of misbehaving cell. On the board it then verified all 403,200 receipts across all 42 ternary matrices, with 33,792 of 33,792 rows bit-exact, plus 51,840 for w_down with int8 activations. Its first long runs stopped when a UART link dropped bytes with 64 jobs in flight. A test registered before it ran put the loss threshold at the USB bridge's 512-byte receive buffer, and at 24 in flight none were lost.",
    date: "2026-09-27",
    readingMinutes: 11,
    tags: ["IGLA", "FPGA", "Ternary", "Verification", "TRI-NET", "Correction"],
    receipts: [
      { label: "The fix: gHashTag/trinity-fpga pull request 800", href: "https://github.com/gHashTag/trinity-fpga/pull/800" },
      { label: "The commit whose receipt count is withdrawn (1f131fd)", href: "https://github.com/gHashTag/trinity-fpga/commit/1f131fdd3fdf1c78317a923a7cd070e11f101a8a" },
      { label: "What is verified, by what, and how to reproduce it; every board run, the controls, the registered buffer test and the byte analysis", href: "https://github.com/gHashTag/trinity-fpga/blob/09b3d6f733e4fe2df8aa09791db1ecde8b2f54c6/conformance/TERN_TC_LAYER_RECEIPTS.md" },
      { label: "The full 42-matrix board log: 403,200 / 403,200 receipts verified", href: "https://github.com/gHashTag/trinity-fpga/blob/09b3d6f733e4fe2df8aa09791db1ecde8b2f54c6/conformance/board_runs/tern_tc_all_w24.log" },
      { label: "The window-64 control log: the link lost 59 bytes after 6,744 jobs", href: "https://github.com/gHashTag/trinity-fpga/blob/09b3d6f733e4fe2df8aa09791db1ecde8b2f54c6/conformance/board_runs/tern_tc_all_w64.log" },
      { label: "The registered buffer test: window 26 (494 B) clean, window 30 (570 B) slipped", href: "https://github.com/gHashTag/trinity-fpga/blob/09b3d6f733e4fe2df8aa09791db1ecde8b2f54c6/conformance/board_runs/tern_tc_all_w30.log" },
      { label: "All raw board logs from 2026-09-27", href: "https://github.com/gHashTag/trinity-fpga/tree/09b3d6f733e4fe2df8aa09791db1ecde8b2f54c6/conformance/board_runs" },
      { label: "Prior art for tern_tc, with the CP2102N figures checked against its datasheet", href: "https://github.com/gHashTag/trinity-fpga/blob/09b3d6f733e4fe2df8aa09791db1ecde8b2f54c6/conformance/TERN_TC_PRIOR_ART.md" },
      { label: "The fixed harness that ran them, with its negative controls", href: "https://github.com/gHashTag/trinity-fpga/blob/b1e95f6fd5ec43b5be709af86b179750ae8b27a5/conformance/tern_tc_layer_ax7203.py" },
      { label: "The RTL testbench that replays the harness over UART", href: "https://github.com/gHashTag/trinity-fpga/blob/2b9830c5837aa47ad142a90a7279c2d8a8d401fe/formal/tern_tc_layer_rtl_tb.v" },
      { label: "The node cell under test: trinet_node_core.v", href: "https://github.com/gHashTag/trinity-fpga/blob/2b9830c5837aa47ad142a90a7279c2d8a8d401fe/fpga/portable/trinet_node_core.v" },
    ],
    openQuestions: [
      "The loss threshold sits between 494 and 570 bytes in flight, around the CP2102N's 512-byte receive buffer, and the node has no flow control. What stalls the bridge's USB transfers long enough to fill it is not measured, and the hub is not excluded.",
      "The activation vectors were random test vectors, not the model's real activations. int8 activations have run on the board for one matrix.",
      "No forward pass, token rate or power figure has been measured on the board.",
      "A SipHash receipt is not publicly verifiable, and it does not stop an operator forging their own.",
    ],
    published: true,
    ru: {
      title: "Квитанции с платы никто не проверял. Теперь проверены все 403 200.",
      summary: "[измерено на FPGA: все 42 обученные матрицы, проверена каждая квитанция; активации — тестовые векторы, а не прямой проход] AX7203 посчитала 28 416 из 28 416 строк матриц весов обученной модели tern_tc бит-точно, а её харнесс сообщил о 284 160 аутентифицированных квитанциях, не сравнив ни одного тега. Исправленный харнесс падает на семи видах неисправной ячейки. На плате он затем проверил все 403 200 квитанций по всем 42 тернарным матрицам, 33 792 из 33 792 строк бит-точно, и ещё 51 840 для w_down с int8-активациями. Первые длинные прогоны остановились, когда канал UART терял байты при 64 задачах в полёте. Проверка, зарегистрированная до запуска, поместила порог потерь на приёмный буфер USB-моста в 512 байт, а при 24 задачах в полёте не потерялось ни одного байта.",
      openQuestions: [
        "Порог потерь лежит между 494 и 570 байтами в полёте, около приёмного буфера CP2102N в 512 байт, а у узла нет управления потоком. Что задерживает USB-передачи моста настолько, чтобы буфер заполнился, не измерено, и хаб не исключён.",
        "Векторы активаций были случайными тестовыми, а не настоящими активациями модели. int8-активации на плате прогнаны для одной матрицы.",
        "Ни прямой проход, ни скорость в токенах, ни мощность на плате не измерены.",
        "Квитанция SipHash не проверяется публично и не мешает оператору подделать свои собственные.",
      ],
    },
  },
  {
    slug: "a-small-agent-needs-an-exact-judge",
    title: "A small agent is only useful next to an exact judge",
    summary: "[model results measured on GPUs; board throughput derived, not measured] One Artix-7 200T holds the layers of a 13M-parameter ternary model in its own block memory. In our own twin experiment the 100M ternary model passes 1.01% vs 1.68% for full precision across eight languages, and compile rate, not correctness, is the gap. A model that is wrong most of the time becomes useful only where a compiler checks every answer.",
    date: "2026-09-26",
    readingMinutes: 9,
    tags: ["IGLA", "Agents", "FPGA", "Ternary", "Verification", "Plan"],
    receipts: [
      { label: "Codex paper, Table 1: pass@k for 12M-85M code models (arXiv:2107.03374)", href: "https://arxiv.org/abs/2107.03374" },
      { label: "JetBrains Full Line Code Completion: a local 100M model, 16,384-token vocabulary (arXiv:2405.08704)", href: "https://arxiv.org/abs/2405.08704" },
      { label: "Branch-Train-Merge (arXiv:2208.03306)", href: "https://arxiv.org/abs/2208.03306" },
      { label: "c-BTM: scaling expert language models with unsupervised domain discovery (arXiv:2303.14177)", href: "https://arxiv.org/abs/2303.14177" },
      { label: "TerEffic: on-chip vs HBM ternary inference on FPGA (arXiv:2502.16473)", href: "https://arxiv.org/abs/2502.16473" },
      { label: "nextpnr-xilinx releases: 0.9.5, LiteX DDR3 memtest passing on hardware", href: "https://github.com/openXC7/nextpnr-xilinx/releases" },
      { label: "AMD DS180: 7-series block RAM counts", href: "https://docs.amd.com/api/khub/documents/2LByHkO~nSZXcei2D55fTg/content" },
      { label: "TRI CLAW: an agent you can audit (the device this lane runs on)", href: "https://t27.ai/blog/tri-claw-an-agent-you-can-audit/" },
      { label: "MultiPL-E: MultiPL-E benchmark, HumanEval-164 in 18+ languages (arXiv:2208.08227)", href: "https://arxiv.org/abs/2208.08227" },
    ],
    openQuestions: [
      "Update 2026-09-27: the trained tern_tc model's 320-input weight matrices ran bit-exact on an AX7203 (see the follow-up post). No forward pass has run on a board, and every throughput figure here is still a ceiling derived from memory bandwidth and LUT counts.",
      "The code ability of a 13M model on .t27 is unknown. The HumanEval figures above are for Python and for another model family.",
      "The open DDR3 path on Artix-7 has passed memtest on hardware only since nextpnr-xilinx 0.9.5 (13 September 2026). The independent UberDDR3 test reached a 333 MHz DDR clock, not the 400 MHz the AX7203 is rated for.",
      "Integer inference must be shown to cost little quality against the float model before receipts can rest on it.",
      "The c-BTM experts had 1.3B parameters or more, a hundred times the size of a board-sized one. Whether the result holds at 13M is a measurement, not an inference.",
      "The twin numbers are for 100M-parameter models trained on GPUs. A board-sized ternary model (tern_tc, 9.08M parameters) has since been trained; its code ability has not been measured.",
    ],
    published: true,
    ru: {
      title: "Маленький агент полезен только рядом с точным судьёй",
      summary: "[результаты моделей измерены на GPU; пропускная способность платы выведена, не измерена] Одна Artix-7 200T держит слои тернарной модели на 13M параметров в собственной блочной памяти. В нашем парном эксперименте тернарная модель на 100M проходит 1,01% против 1,68% у полной точности на восьми языках, и разрыв — это компиляция, а не корректность. Модель, чаще ошибающаяся, полезна только там, где каждый ответ проверяет компилятор.",
      openQuestions: [
        "Обновление 2026-09-27: матрицы весов с входом 320 обученной модели tern_tc посчитались на AX7203 бит-точно (см. следующий пост). Прямой проход на плате не запускался, и каждая цифра скорости здесь по-прежнему потолок, выведенный из пропускной способности памяти и числа LUT.",
        "Способность модели на 13M писать .t27 неизвестна. Цифры HumanEval выше относятся к Python и к другому семейству моделей.",
        "Открытый путь к DDR3 на Artix-7 проходит memtest на железе только с nextpnr-xilinx 0.9.5 (13 сентября 2026). Независимый тест UberDDR3 достиг частоты DDR 333 МГц, а не 400 МГц, на которые рассчитана AX7203.",
        "Нужно показать, что целочисленный вывод почти не теряет в качестве по сравнению с плавающей точкой. Только после этого на него могут опираться квитанции.",
        "Эксперты в c-BTM имели 1,3B параметров и больше — в сто раз больше, чем модель размером с плату. Держится ли результат при 13M, решит замер, а не рассуждение.",
        "Числа двойняшек относятся к моделям на 100M параметров, обученным на GPU. С тех пор обучена тернарная модель размером с плату (tern_tc, 9,08M параметров); её способность писать код не измерена.",
      ],
    },
  },
  {
    slug: 'tri-mined-not-sold',
    title: 'The token is mined, not sold',
    summary: '[design] 100% of TRI is mined by accepted .t27 work with zero pre-mine; the mint-on-acceptance rule is a Zig golden oracle (11/11 tests) with a TON and Solana minter whose digest matches cross-language (cargo test 4/4). Nothing is deployed.',
    date: '2026-09-24',
    readingMinutes: 5,
    tags: ['DePIN', 'TRI', 'Tokenomics', 'TON', 'Solana', 'Design'],
    receipts: [
      { label: 'Protocol spec: mint_on_acceptance.t27', href: 'https://github.com/gHashTag/trinity-fpga/blob/trinet-fleet-truth/specs/trinet/mint_on_acceptance.t27' },
      { label: 'Tested oracle + reference contracts (commit 2901c62)', href: 'https://github.com/gHashTag/trinity-fpga/commit/2901c6273' },
      { label: '100% mined, zero pre-mine (commit c31157a)', href: 'https://github.com/gHashTag/trinity-fpga/commit/c31157ae0' },
    ],
    openQuestions: [
      'Nothing is deployed: no contract, key, or mint exists on any live network.',
      'V1 trusts an honest majority of the attestor set; it is not trustless, and who holds the keys is undecided.',
      'The reference contracts are unaudited, and the cross-chain shared-nonce mechanism is unspecified.',
      'No legal review of issuance or secondary trading has been done; that is the first task the decision creates.',
      'The oracle is tested in software; it is not a hardware, silicon, or deployed-network result.',
    ],
    published: true,
    ru: {
      title: 'Токен намывают, а не продают',
      summary: '[дизайн] 100% TRI намывается за принятую работу .t27, без премайна; правило чеканки-при-принятии — золотой оракул на Zig (11/11 тестов), с минтерами TON и Solana, чей дайджест совпадает межъязыково (cargo test 4/4). Ничего не задеплоено.',
      openQuestions: [
        'Ничего не задеплоено: ни контракта, ни ключа, ни чеканки в живой сети.',
        'V1 доверяет честному большинству аттестаторов; это не трастлесс, и кто держит ключи — не решено.',
        'Эталонные контракты без аудита, а механизм общего nonce между цепями не специфицирован.',
        'Юридической проверки выпуска и вторичного рынка не было; это первая задача, которую создаёт решение.',
        'Оракул проверен в софте; это не результат на железе, кремнии или в живой сети.',
      ],
    },
  },
  {
    "slug": "queen-browser-actions-you-can-follow",
    "title": "The browser agent should show its work",
    "summary": "Queen’s merged browser changes expose actions as they arrive, keep a compact journal, and let human input request server-side control—with the remaining handover limits made explicit.",
    "date": "2026-09-23",
    "readingMinutes": 6,
    "tags": [
      "Queen",
      "BrowserAutomation",
      "Agents",
      "Observability",
      "Testing"
    ],
    "receipts": [
      {
        "label": "Trinity #1088 — one remote browser in Queen · MERGED 2026-09-21",
        "href": "https://github.com/gHashTag/trinity/pull/1088"
      },
      {
        "label": "Trinity #1094 — chat reaches the browser-equipped agent · MERGED 2026-09-21",
        "href": "https://github.com/gHashTag/trinity/pull/1094"
      },
      {
        "label": "Trinity #1096 — incremental action and text events · MERGED 2026-09-21",
        "href": "https://github.com/gHashTag/trinity/pull/1096"
      },
      {
        "label": "Trinity #1104 — connection-state messages · MERGED 2026-09-21",
        "href": "https://github.com/gHashTag/trinity/pull/1104"
      },
      {
        "label": "Trinity #1107 — recent browser journal · MERGED 2026-09-21",
        "href": "https://github.com/gHashTag/trinity/pull/1107"
      },
      {
        "label": "Trinity #1109 — human-control request from the board · MERGED 2026-09-22",
        "href": "https://github.com/gHashTag/trinity/pull/1109"
      },
      {
        "label": "Trinity #1111 — consecutive journal repeats folded · MERGED 2026-09-22",
        "href": "https://github.com/gHashTag/trinity/pull/1111"
      },
      {
        "label": "Website checks — browser contract passed in run 35689898918",
        "href": "https://github.com/gHashTag/trinity/actions/runs/35689898918/job/106624452015"
      }
    ],
    "openQuestions": [
      "The source diffs and browser contract were inspected and the contract rerun for this article; no fresh signed-in end-to-end remote-browser session was independently tested.",
      "The driving indicator updates before server acknowledgement and a failed wheel request is not surfaced; the indicator alone is not evidence of accepted control, and cancellation of in-flight actions is not established.",
      "The journal shows at most six folded lines from up to 24 recent entries, polls every five seconds, and is not a complete audit archive.",
      "Connection handling and human-control enforcement depend on the matching viewer and server deployments; a source merge alone does not establish live delivery. Server behaviour is attributed to the public #1109 report, not independently reproduced here.",
      "The public #1109 report says a human-control lease can persist until its ten-minute expiry after a tab is closed; this article does not claim a general security guarantee or measured productivity improvement."
    ],
    "published": true,
    "ru": {
      "title": "Браузерный агент должен показывать свою работу",
      "summary": "Смерженные изменения Queen показывают действия по мере поступления, сохраняют компактный журнал и позволяют вводу человека запрашивать управление на сервере — с явными ограничениями передачи руля.",
      "openQuestions": [
        "Для статьи изучены изменения и браузерный контракт, который также запущен повторно; новая сквозная проверка удалённого браузера в авторизованной сессии независимо не выполнялась.",
        "Индикатор управления меняется до подтверждения сервера, а отказ запроса не показывается; одного индикатора недостаточно для подтверждения принятого управления, отмена уже начатых действий не установлена.",
        "Журнал показывает не более шести свёрнутых строк из максимум 24 последних записей, опрашивается каждые пять секунд и не является полным архивом аудита.",
        "Обработка соединения и ограничение действий зависят от соответствующих версий окна просмотра и сервера; слияние исходников само по себе не подтверждает доставку на живой сайт. Поведение сервера приведено по публичному отчёту #1109, а не независимо воспроизведено здесь.",
        "По публичному отчёту #1109 после закрытия вкладки право управления может сохраняться до истечения десятиминутного срока; статья не заявляет общей гарантии безопасности или измеренного роста производительности."
      ]
    }
  },
  {
    "slug": "a-partial-module-needs-its-own-verdict",
    "title": "A partial module needs its own verdict",
    "summary": "JavaScript and TypeScript generation gained explicit omission records, so the Spec Explorer can distinguish a useful partial module from a complete one and from a failed compilation.",
    "date": "2026-09-23",
    "readingMinutes": 6,
    "tags": [
      "Compiler",
      "TypeScript",
      "Testing",
      "Reproducibility"
    ],
    "receipts": [
      {
        "label": "Trinity #1084 — partial output becomes a warning · MERGED 2026-09-21",
        "href": "https://github.com/gHashTag/trinity/pull/1084"
      },
      {
        "label": "t27 #4529 — references and explicit omission records · MERGED 2026-09-21",
        "href": "https://github.com/gHashTag/t27/pull/4529"
      },
      {
        "label": "t27 #4502 — TypeScript shares the JS value layer · MERGED 2026-09-21",
        "href": "https://github.com/gHashTag/t27/pull/4502"
      },
      {
        "label": "Reviewed manifest — 1,419-spec snapshot at e7a11be",
        "href": "https://github.com/gHashTag/trinity/blob/e7a11be07eb73fceaf41fb693a628d10ec245637/apps/website/public/t27/manifest.json"
      },
      {
        "label": "Website checks for #1084 · SUCCESS 2026-09-21",
        "href": "https://github.com/gHashTag/trinity/actions/runs/35599487248/job/106331933482"
      }
    ],
    "openQuestions": [
      "The reviewed website snapshot still has 211 specifications with no AST and seven parsed specifications losing a backend; their causes are not resolved by this article.",
      "The upstream 1,414-spec test corpus and the website's 1,419-spec snapshot are different populations, so their counts are not interchangeable.",
      "A partial declaration artifact does not establish complete language support or runtime correctness for every generated program.",
      "Upstream test results are attributed to their merged PR reports, not presented as independently rerun compiler benchmarks."
    ],
    "published": true,
    "ru": {
      "title": "Частичному модулю нужен собственный вердикт",
      "summary": "Генераторы JavaScript и TypeScript получили явные записи о пропусках: Spec Explorer теперь отличает полезный, но частичный модуль от полного результата и от неудачной компиляции.",
      "openQuestions": [
        "В изученном снимке сайта остаются 211 спецификаций без AST и семь разобранных файлов с отказом backend; статья не устраняет причины этих ошибок.",
        "Корпус upstream-проверки из 1 414 спецификаций и снимок сайта из 1 419 — разные выборки, их числа нельзя подменять друг другом.",
        "Частичный артефакт объявлений не устанавливает полную поддержку языка или корректность исполнения каждой сгенерированной программы.",
        "Результаты upstream-тестов приведены по отчётам смерженных PR, а не как независимо повторённые бенчмарки компилятора."
      ]
    }
  },
  {
    "slug": "an-invitation-in-the-language-it-describes",
    "title": "An invitation in the language it describes",
    "summary": "T27's agent-facing introduction is one compiler-checked module served at two addresses, with executable claim checks and an explicit boundary around the reader's authority.",
    "date": "2026-09-23",
    "readingMinutes": 6,
    "tags": [
      "Agents",
      "Compiler",
      "Spec-first",
      "Testing"
    ],
    "receipts": [
      {
        "label": "Trinity #1047 — one .t27 onboarding source · MERGED 2026-09-20",
        "href": "https://github.com/gHashTag/trinity/pull/1047"
      },
      {
        "label": "Trinity #1074 — backend and corpus claims checked · MERGED 2026-09-21",
        "href": "https://github.com/gHashTag/trinity/pull/1074"
      },
      {
        "label": "Reviewed generator — schema, assertions, consent and rendered-output checks",
        "href": "https://github.com/gHashTag/trinity/blob/e7a11be07eb73fceaf41fb693a628d10ec245637/apps/website/scripts/onboarding-from-spec.mjs"
      },
      {
        "label": "Reviewed onboarding source — nine tests and declared unknowns",
        "href": "https://github.com/gHashTag/trinity/blob/e7a11be07eb73fceaf41fb693a628d10ec245637/apps/website/specs/catalog/onboarding.t27"
      },
      {
        "label": "Website checks — nine blocks, 49 assertions · SUCCESS 2026-09-21",
        "href": "https://github.com/gHashTag/trinity/actions/runs/35599487248/job/106331933482"
      }
    ],
    "openQuestions": [
      "Serving the document at llms.txt does not establish compatibility with every consumer, crawler indexing or external adoption.",
      "The consent checks constrain this generated document; they are not a universal prompt-injection defence.",
      "Comparing declared counts with the shipped manifest proves agreement, not independent correctness of the corpus classification.",
      "The initial audit and negative-control results are attributed to the merged PR; no count of outside readers or contributions is established."
    ],
    "published": true,
    "ru": {
      "title": "Приглашение на языке, о котором оно рассказывает",
      "summary": "Введение T27 для агентов — один проверяемый компилятором модуль по двум адресам, с исполняемыми проверками утверждений и явной границей полномочий читателя.",
      "openQuestions": [
        "Публикация документа по адресу llms.txt не устанавливает совместимость со всеми потребителями, индексацию или внешнее использование.",
        "Проверки согласия ограничивают данный сгенерированный документ, но не являются универсальной защитой от prompt injection.",
        "Сравнение объявленных чисел с поставляемым manifest доказывает согласованность, а не независимую правильность классификации корпуса.",
        "Исходный аудит и отрицательные контроли приведены по смерженному PR; число внешних читателей или вкладов не установлено."
      ]
    }
  },
  {
    slug: 'a-measurement-number-needs-a-passport',
    title: 'A measurement number needs its passport',
    summary: '[Measured] An isolated GFTernary decoder is recorded at 66 LUT and 974.66 MHz on an Artix-7 XC7A200T, with its toolchain, seed statistic and same-part baseline. The receipt does not claim tokens per second or system throughput.',
    date: '2026-09-13',
    readingMinutes: 6,
    tags: ['FPGA', 'Measurement', 'Reproducibility', 'GFTernary'],
    receipts: [
      { label: 'Canonical source: gHashTag/trinity tnf.ts at commit 453fe953', href: 'https://github.com/gHashTag/trinity/blob/453fe953372db51052e007334b69c9dbed595218/apps/website/src/content/tnf.ts' },
      { label: 'Source commit: website measurement passport and toolchain receipt', href: 'https://github.com/gHashTag/trinity/commit/453fe953372db51052e007334b69c9dbed595218' },
    ],
    openQuestions: [
      'The post records an isolated decoder, not tokens per second, end-to-end inference, power, memory bandwidth or a full model.',
      'The result is tied to one FPGA family and one open flow; cross-device and vendor-flow comparisons were not performed here.',
      'A same-flow takum implementation was not synthesised beside this decoder.',
      'The non-monotone APoT sweep is a warning about the measurement flow, not a model of all FPGA implementations.'
    ],
    published: true,
    ru: {
      title: 'Аппаратному числу нужен паспорт замера',
      summary: '[Измерено] Для изолированного декодера GFTernary зафиксированы 66 LUT и 974,66 МГц на Artix-7 XC7A200T, вместе с тулчейном, статистикой seed и базовой линией на той же части. Квитанция не заявляет токены в секунду или пропускную способность системы.',
      openQuestions: [
        'В посте записан изолированный декодер, а не токены в секунду, сквозной инференс, мощность, полоса памяти или целая модель.',
        'Результат относится к одной семье FPGA и одному открытому потоку; сравнения между устройствами и с вендорским потоком здесь не проводились.',
        'Реализация takum в том же потоке рядом с декодером не синтезировалась.',
        'Немонотонная APoT-развёртка предупреждает о свойствах потока замера, а не является моделью всех реализаций на FPGA.'
      ]
    }
  },
  {
    slug: 'the-fpga-row-was-corrected',
    title: 'The FPGA row was corrected before it became evidence',
    summary: '[proven] A merged t27 PR corrected an invalid Yosys invocation and changed three FPGA status rows from green to red after 881 historical runs showed 36 successes, 842 failures, and 3 cancellations.',
    date: '2026-09-12',
    readingMinutes: 6,
    tags: ['FPGA', 'CI', 'Reproducibility', 'Audit'],
    receipts: [
      { label: 'Merged gHashTag/t27 PR #2081', href: 'https://github.com/gHashTag/t27/pull/2081' },
      { label: 'Merge commit d2a36bcd — CI and claim corrections', href: 'https://github.com/gHashTag/t27/commit/d2a36bcd192a247db37fba8ed64dfdae94fa0bcb' },
    ],
    openQuestions: [
      'The PR leaves a placeholder chipdb, so this merge does not establish an end-to-end bitstream job.',
      'The local gen-verilog smoke result is 5/5, but that is not synthesis, placement, routing, or a flashed design on ALINX AX7203.',
      'The 881-run breakdown is a repository CI receipt, not a new board measurement, silicon result, speed result, energy result, or downstream-model result.',
      'The corrected documentation does not establish a new gf16 frequency, LUT result, or physical-device result.',
    ],
    published: true,
    ru: {
      title: 'Строку FPGA исправили до того, как она стала доказательством',
      summary: '[доказано] Смерженный PR в t27 исправил некорректный вызов Yosys и изменил три строки статуса FPGA с зелёных на красные после 881 исторического запуска: 36 успехов, 842 ошибки и 3 отмены.',
      openQuestions: [
        'В PR остаётся placeholder chipdb, поэтому это слияние не устанавливает сквозной bitstream job.',
        'Локальная smoke-проверка gen-verilog дала 5/5, но это не синтез, placement, routing и не прошитый дизайн на ALINX AX7203.',
        'Разбивка 881 запуска — квитанция CI репозитория, а не новое измерение на плате, результат на кремнии, результат по скорости, энергии или downstream-модели.',
        'Исправленная документация не устанавливает новую частоту gf16, результат по LUT или результат на физическом устройстве.',
      ],
    },
  },
  {
    slug: 'signal-health-self-run32',
    title: 'A green self-check still had a boundary',
    summary: '[measured] Signal health (self) run 32 completed successfully with 2 jobs and 11 successful steps, but the receipt covers only one scheduled chain.',
    date: '2026-09-11',
    readingMinutes: 4,
    tags: ['CI', 'Reproducibility', 'Operations', 'Testing'],
    receipts: [
      { label: 'Public Signal health (self) run 32', href: 'https://github.com/gHashTag/trinity/actions/runs/34581703199' },
      { label: 'Jobs API for run 32', href: 'https://api.github.com/repos/gHashTag/trinity/actions/runs/34581703199/jobs?per_page=100' },
      { label: 'Head commit c8d73ce0', href: 'https://github.com/gHashTag/trinity/commit/c8d73ce00de23aaa772d6084c24cf6c472042d42' },
    ],
    openQuestions: [
      'The receipt does not independently establish that the values written by the jobs are correct.',
      'One scheduled run does not establish the health of the whole repository or the state of neighbouring workflows.',
      'A single successful run does not establish a time trend; that needs a comparable series with retained values.',
      'The run does not establish delivery of a blog page; live static delivery requires a separate URL check.',
      'This is an operations and CI receipt. It does not establish FPGA or AX7203 behaviour, speed, energy, or downstream-model accuracy.',
    ],
    published: true,
    ru: {
      title: 'У зелёного self-check всё равно была граница',
      summary: '[измерено] Signal health (self) run 32 успешно завершил 2 job и 11 шагов, но квитанция относится только к одной плановой цепочке.',
      openQuestions: [
        'Квитанция сама по себе не устанавливает корректность значений, записанных job.',
        'Один плановый запуск не устанавливает состояние всего репозитория или соседних workflow.',
        'Один успешный запуск не устанавливает временной тренд: для него нужен сопоставимый ряд с сохранёнными значениями.',
        'Запуск не устанавливает доставку страницы блога; живую статическую доставку нужно проверять отдельным URL-запросом.',
        'Это операционная CI-квитанция. Она не устанавливает поведение FPGA или AX7203, скорость, энергию или точность downstream-модели.',
      ],
    },
  },
  {
    slug: 'queen-phone-orientation-gate',
    title: 'A phone web view needed an orientation gate',
    summary: '[measured] Merged PR #983 changed 3 CSS files after a 390×480 Chrome check exposed a phone layout selected by height instead of orientation.',
    date: '2026-09-10',
    readingMinutes: 4,
    tags: ['Web', 'CSS', 'Reproducibility', 'Testing'],
    receipts: [
      { label: 'Merged PR #983 — phone layout gated on orientation', href: 'https://github.com/gHashTag/trinity/pull/983' },
      { label: 'Merge commit a368d812 — responsive CSS change and viewport checks', href: 'https://github.com/gHashTag/trinity/commit/a368d8126788c09bcac29169dccd9602ea9b3ac8' },
      { label: 'Public commit API — files and verification note', href: 'https://api.github.com/repos/gHashTag/trinity/commits/a368d8126788c09bcac29169dccd9602ea9b3ac8' },
    ],
    openQuestions: [
      'The viewport checks are the checks reported by the merged commit; this run did not independently audit every phone, WebView, font scale, or embedded browser.',
      'The merge does not establish delivery to the live static site; that requires a separate URL check.',
      'This is a software and CSS result. It does not establish FPGA or AX7203 behaviour, silicon, speed, energy, or downstream-model accuracy.',
    ],
    published: true,
    ru: {
      title: 'Телефонному web view понадобился гейт по ориентации',
      summary: '[измерено] Смерженный PR #983 изменил 3 CSS-файла после проверки Chrome 390×480, где телефонный layout выбирался по высоте вместо ориентации.',
      openQuestions: [
        'Viewport-проверки — это проверки, записанные в смерженном коммите; в этом запуске не проводился независимый аудит каждого телефона, WebView, масштаба шрифта или встроенного браузера.',
        'Слияние не устанавливает доставку на живой статический сайт; для этого нужна отдельная проверка URL.',
        'Это результат программного и CSS-изменения. Он не устанавливает поведение FPGA или AX7203, кремния, скорость, энергию или точность downstream-модели.',
      ],
    },
  },
  {
    slug: 'merge-diff-ci-boundaries',
    title: 'A merged diff was not one CI verdict',
    summary: '[measured] Merged PR #975 changed 85 files with 4,154 additions and 58 deletions; the receipts still need to be kept separate from interface correctness and live delivery.',
    date: '2026-09-09',
    readingMinutes: 4,
    tags: ['Reproducibility', 'CI', 'Web', 'Spec-first'],
    receipts: [
      { label: 'Merged PR #975 — spec-first SKILLS and CRONS website explorers', href: 'https://github.com/gHashTag/trinity/pull/975' },
      { label: 'Merge commit 479743ff — 85 files, 4,154 additions, 58 deletions', href: 'https://github.com/gHashTag/trinity/commit/479743ffb11520d6c63b9483ba25b1e543f40247' },
      { label: 'Public commit API — reproducible diff statistics', href: 'https://api.github.com/repos/gHashTag/trinity/commits/479743ffb11520d6c63b9483ba25b1e543f40247' },
    ],
    openQuestions: [
      'The exact correctness of every new explorer, interface, and generated specification was not independently rerun in this blog run.',
      'Merge and diff receipts do not establish a cause for any CI status without the relevant workflow and step logs.',
      'A repository merge does not establish delivery to the live static page; that needs its own URL check.',
    ],
    published: true,
    ru: {
      title: 'Смерженный diff не был одним вердиктом CI',
      summary: '[измерено] Смерженный PR #975 изменил 85 файлов: 4 154 строки добавлены, 58 удалены; эти квитанции всё равно нужно отделять от корректности интерфейсов и доставки на живой сайт.',
      openQuestions: [
        'Точная корректность каждого нового обозревателя, интерфейса и сгенерированной спецификации в этом запуске блога независимо не повторялась.',
        'Merge и статистика diff не устанавливают причину какого-либо статуса CI без журналов соответствующего workflow и его шагов.',
        'Слияние в репозитории не устанавливает доставку на живую статическую страницу; это требует отдельной проверки URL.',
      ],
    },
  },
  {
    slug: 'four-languages-one-tri-extension',
    title: 'Four languages shared one .tri extension',
    summary: '[reported in merged PR #793] The VIBEE generator now names Markdown, TOML, and t27 inputs instead of silently treating them as empty VIBEE modules, while unrecognised files retain the old fall-through.',
    date: '2026-09-08',
    readingMinutes: 6,
    tags: ['Compiler', 'Parser', 'Testing', 'Reproducibility'],
    receipts: [
      { label: 'Merged PR #793 — named diagnostics for Markdown, TOML, and t27', href: 'https://github.com/gHashTag/trinity-fpga/pull/793' },
      { label: 'Merge commit 5614a4ab — landed generator change', href: 'https://github.com/gHashTag/trinity-fpga/commit/5614a4ab494a7b9feabe918ef3fa8a1d24425b83' },
    ],
    openQuestions: [
      'The counts and command results are reported by PR #793; they were not independently rerun in this blog run.',
      'The change is a software repository result. It does not establish FPGA or AX7203 behaviour, timing, energy, model quality, or a physical-chip result.',
      'The detector is pattern-based; it is not a complete parser or proof that every `.tri` file has been classified.',
      'The result says nothing about the 83-format numeric catalogue or about accuracy comparisons with takum.',
    ],
    published: true,
    ru: {
      title: 'Четыре языка делили одно расширение .tri',
      summary: '[отчёт в смерженном PR #793] Генератор VIBEE теперь называет входы Markdown, TOML и t27 вместо молчаливого создания пустых VIBEE-модулей, а нераспознанные файлы сохраняют прежний путь.',
      openQuestions: [
        'Числа и результаты команд приведены по отчёту PR #793; в этом запуске блога они независимо не повторялись.',
        'Это результат программного репозитория. Он не устанавливает поведение FPGA или AX7203, timing, энергию, качество модели или результат на физическом кристалле.',
        'Детектор основан на признаках; это не полный парсер и не доказательство классификации каждого `.tri`-файла.',
        'Результат ничего не говорит о каталоге числовых форматов из 83 форматов или о сравнении точности с takum.',
      ],
    },
  },
  {
    slug: 'ninety-tests-were-unreachable',
    title: 'Ninety tests were present, but unreachable',
    summary: '[measured in merged PR #778] A Zig codegen subtree became importable, exposing 90 previously unreachable tests; the reported verification moved from 155 to 157 steps and from 2,832 to 2,939 tests.',
    date: '2026-09-07',
    readingMinutes: 6,
    tags: ['Zig', 'Compiler', 'Testing', 'Reproducibility'],
    receipts: [
      { label: 'Merged PR #778 — codegen tree import and test reachability', href: 'https://github.com/gHashTag/trinity-fpga/pull/778' },
      { label: 'Merge commit 515bc8e1 — the landed codegen changes', href: 'https://github.com/gHashTag/trinity-fpga/commit/515bc8e1b56ae45cfc25a34808aeee2f4ee0d89d' },
      { label: 'Commit 311abb7a — the 90 tests become reachable', href: 'https://github.com/gHashTag/trinity-fpga/commit/311abb7a57f36e4c27c91d825ab18db04eae009f' },
      { label: 'Commit f361b8a8 — signature behavior pinned by tests', href: 'https://github.com/gHashTag/trinity-fpga/commit/f361b8a802f79c4dde8e4f1a084ea42fae02d0aa' },
      { label: 'Commit eebeae43 — allocator scope repair', href: 'https://github.com/gHashTag/trinity-fpga/commit/eebeae4344de90a9d30dbe9832b371591ef4f113' },
    ],
    openQuestions: [
      'The verification commands and counts are reported by PR #778; they were not independently rerun in this blog run.',
      'The change is a software repository result. It does not establish FPGA or AX7203 behavior, timing, energy, model quality, or a physical-chip result.',
      'The 66 remaining errors are not resolved by this PR, and inferred return types are not connected to ordinary generated headers.',
      'The change says nothing about the 83-format numeric catalogue.',
    ],
    published: true,
    ru: {
      title: '90 тестов существовали, но были недостижимы',
      summary: '[измерено в смерженном PR #778] Поддерево Zig codegen стало импортируемым, и стали достижимы 90 ранее скрытых тестов; в отчёте проверки число шагов выросло со 155 до 157, а число тестов — с 2 832 до 2 939.',
      openQuestions: [
        'Команды проверки и числа приведены по отчёту PR #778; в этом запуске блога они независимо не повторялись.',
        'Это результат программного репозитория. Он не устанавливает поведение FPGA или AX7203, timing, энергию, качество модели или результат на физическом кристалле.',
        'Оставшиеся 66 ошибок этим PR не исправлены, а выведенные return types не подключены к обычным заголовкам генератора.',
        'Изменение ничего не говорит о каталоге числовых форматов из 83 форматов.',
      ],
    },
  },
  {
    slug: 'one-saturation-rule-five-artefacts',
    title: 'One saturation rule, five artefacts',
    summary: '[measured] A merged fp6_e3m2 correction changed 8 boundary codes, kept 56 codes unchanged, and brought a 66,720-code consistency pass to 0 mismatches.',
    date: '2026-09-06',
    readingMinutes: 5,
    tags: ['FPGA', 'Conformance', 'Reproducibility', 'Testing'],
    receipts: [
      { label: 'Merged PR #757 — saturation rule carried through the remaining conformance artefacts', href: 'https://github.com/gHashTag/trinity-fpga/pull/757' },
      { label: 'Merge commit 4bb8c416 — host golden and self-test correction', href: 'https://github.com/gHashTag/trinity-fpga/commit/4bb8c416b7b11f57832bf5debfec7daa5e6d1ff0' },
      { label: 'Host decode conformance at the merge commit', href: 'https://raw.githubusercontent.com/gHashTag/trinity-fpga/4bb8c416b7b11f57832bf5debfec7daa5e6d1ff0/conformance/corona_decode_host_ax7203.py' },
      { label: 'Decode verification oracle at the merge commit', href: 'https://raw.githubusercontent.com/gHashTag/trinity-fpga/4bb8c416b7b11f57832bf5debfec7daa5e6d1ff0/conformance/decode_verify.py' },
      { label: 'Full golden-consistency checker at the merge commit', href: 'https://raw.githubusercontent.com/gHashTag/trinity-fpga/4bb8c416b7b11f57832bf5debfec7daa5e6d1ff0/conformance/golden_consistency.py' },
    ],
    openQuestions: [
      'The OCP MX specification was not independently read in this run; the result establishes alignment among the existing RTL and conformance artefacts.',
      'The checked worktree did not include the RTL submodule, so no end-to-end run on the binary ALINX AX7203 FPGA was repeated here.',
      'One corrected format does not establish the other formats in the 83-format catalogue, a general hardware result, a physical-chip result, speed, energy, or downstream-model accuracy.',
    ],
    published: true,
    ru: {
      title: 'Одно правило насыщения, пять артефактов',
      summary: '[измерено] Смерженная правка fp6_e3m2 изменила 8 граничных кодов, оставила 56 кодов без изменений и привела проверку 66 720 кодов к 0 несовпадений.',
      openQuestions: [
        'Спецификация OCP MX в этом прогоне независимо не читалась; результат устанавливает согласованность существующих RTL и conformance-артефактов.',
        'В проверенном worktree не было RTL-подмодуля, поэтому сквозной прогон на бинарной FPGA ALINX AX7203 здесь не повторялся.',
        'Один исправленный формат не устанавливает корректность остальных форматов каталога из 83 форматов, общий аппаратный результат, результат на физическом кристалле, скорость, энергию или точность модели после квантования.',
      ],
    },
  },
  {
    slug: 'a-linux-target-with-no-abi-is-musl',
    title: 'A Linux target with no ABI suffix is musl, and a CI gate had been trusting it',
    summary: '[measured] Zig resolves -target x86_64-linux to musl. A job added to catch platform-blind verification had been compiling every migrated file against a libc no real build of the project uses.',
    date: '2026-09-06',
    readingMinutes: 4,
    tags: ['Zig', 'CI', 'Toolchain', 'Reproducibility'],
    receipts: [
      { label: '#749 — spell out the ABI; the 0.16 gate was compiling against musl · MERGED 2026-09-05', href: 'https://github.com/gHashTag/trinity-fpga/pull/749' },
      { label: '#747 — the same job\'s predicate tested the type, not the entry point · MERGED 2026-09-05', href: 'https://github.com/gHashTag/trinity-fpga/pull/747' },
      { label: '#746 — the commit that introduced the job · MERGED 2026-09-05', href: 'https://github.com/gHashTag/trinity-fpga/pull/746' },
      { label: 'The workflow at merge commit f32467d4f, with the measurement in the comment', href: 'https://github.com/gHashTag/trinity-fpga/blob/f32467d4ff6ec7e1b244049e651a65c09c1d0f77/.github/workflows/zig-0-16-migrated.yml' },
      { label: 'The "Zig 0.16 migrated files" run on the merge commit — success', href: 'https://github.com/gHashTag/trinity-fpga/actions/runs/33988238073' },
    ],
    openQuestions: [
      'No file in this tree was shown to depend on a musl-only symbol. What is established is that the gate could not have caught one, not that one exists.',
      'The target resolution was measured on one host (macOS aarch64, Zig 0.16.0) cross-compiling. The runner is inferred to resolve the same way because it fetches the same Zig version; that was not re-measured on the runner.',
      'The eleven isGnu()/isMusl() call sites are a count in std/c.zig in one local 0.16.0 install. It is not a measure of how many of them any file in this project reaches.',
      'The pull request\'s "byte-identical" claim is not established in either direction: this build is not reproducible run to run on this host, so neither hash nor size can discriminate a target from itself.',
      'The job compiles files; it does not run them. Linking against the right libc is not evidence that anything works.',
    ],
    published: true,
    ru: {
      title: 'Linux-цель без суффикса ABI — это musl, и CI-проверка ей доверяла',
      summary: '[измерено] Zig разрешает -target x86_64-linux в musl. Задача, заведённая ловить платформенно-слепую верификацию, компилировала каждый переведённый файл против libc, который не использует ни одна настоящая сборка проекта.',
      openQuestions: [
        'Ни один файл в этом дереве не показан зависящим от символа, специфичного для musl. Установлено, что проверка не смогла бы такой файл поймать, а не то, что он существует.',
        'Разрешение цели измерено на одном хосте (macOS aarch64, Zig 0.16.0) в режиме кросс-компиляции. Предполагается, что раннер разрешает так же, поскольку забирает ту же версию Zig; на раннере это не перепроверялось.',
        'Одиннадцать вызовов isGnu()/isMusl() — это подсчёт в std/c.zig одной локальной установки 0.16.0. Это не мера того, до скольких из них дотягивается хоть один файл проекта.',
        'Утверждение pull request о «побайтовой идентичности» не установлено ни в одну сторону: сборка не воспроизводима от запуска к запуску на этом хосте, поэтому ни хеш, ни размер не отличают цель даже от неё самой.',
        'Задача компилирует файлы, но не запускает их. Линковка с нужным libc не является свидетельством того, что что-то работает.',
      ],
    },
  },
  {
    slug: 'the-only-stable-speed-belonged-to-the-tool',
    title: 'The only stable speed belonged to the tool, not the cable',
    summary: '[measured] A note recorded 100 kHz as the only stable JTAG clock for this cable. openFPGALoader ran the same cable at 6 MHz and programmed a bitstream OpenOCD could not start.',
    date: '2026-09-05',
    readingMinutes: 4,
    tags: ['FPGA', 'openXC7', 'Toolchain', 'Reproducibility'],
    receipts: [
      { label: 'Commit 67d06623 -- constraint file added, cable-speed note corrected', href: 'https://github.com/gHashTag/trinity-fpga/commit/67d06623' },
      { label: 'The corrected note at that commit', href: 'https://github.com/gHashTag/trinity-fpga/blob/67d06623/fpga/experience/2026-09-05-ax7203-openfpgaloader-vs-openocd.trinity.md' },
      { label: 'The constraint file the June recipe referenced and the tree lacked', href: 'https://github.com/gHashTag/trinity-fpga/blob/67d06623/fpga/constraints/ax7203.xdc' },
      { label: 'The June note that recorded 100 kHz', href: 'https://github.com/gHashTag/trinity-fpga/blob/67d06623/fpga/experience/2026-06-24-ax7203-blinky-openxc7.trinity.md' },
      { label: 'The OpenOCD configuration whose layout is byte-identical to stock', href: 'https://github.com/gHashTag/trinity-fpga/blob/67d06623/fpga/openxc7-synth/ax7203_al321.cfg' },
    ],
    openQuestions: [
      'DONE asserted means the device accepted a configuration; no LED state was observed and the design loaded was a counter, not a datapath under test.',
      'One cable, one host, one session: this does not establish that OpenOCD fails on other hosts, cables or transports.',
      'No silicon is involved. The part is an Artix-7 FPGA on a carrier board.',
    ],
    published: true,
    ru: {
      title: 'Единственная стабильная скорость принадлежала инструменту, а не кабелю',
      summary: '[измерено] Заметка фиксировала 100 кГц как единственную стабильную частоту JTAG для этого кабеля. openFPGALoader прогнал тот же кабель на 6 МГц и прошил битстрим, который OpenOCD не смог начать.',
      openQuestions: [
        'Выставленный DONE означает, что устройство приняло конфигурацию; состояние светодиодов не наблюдалось, а загруженный дизайн был счётчиком, а не проверяемым датапутём.',
        'Один кабель, один хост, одна сессия: это не устанавливает отказ OpenOCD на других хостах, кабелях или транспортах.',
        'Кремния здесь нет. Кристалл — Artix-7 на несущей плате.',
      ],
    },
  },
  {
    slug: 'queen-foundation-snapshot-contract',
    title: 'The Queen foundation snapshot now has a source contract',
    summary: '[measured] Merged PR #937 adds a dated foundation snapshot and a fixture-backed contract that keeps the page source visible.',
    date: '2026-09-05',
    readingMinutes: 5,
    tags: ['Queen', 'Reproducibility', 'Web', 'GitHub'],
    receipts: [
      { label: 'Merged PR #937 — Queen foundation snapshot and contract', href: 'https://github.com/gHashTag/trinity/pull/937' },
      { label: 'Merge commit d12883f0 — page wiring and snapshot', href: 'https://github.com/gHashTag/trinity/commit/d12883f03324b99ca7206db38e49f1a299073ced' },
      { label: 'Foundation snapshot JSON at the merge commit', href: 'https://raw.githubusercontent.com/gHashTag/trinity/d12883f03324b99ca7206db38e49f1a299073ced/apps/website/public/queen/foundation.json' },
      { label: 'Executable foundation contract at the merge commit', href: 'https://raw.githubusercontent.com/gHashTag/trinity/d12883f03324b99ca7206db38e49f1a299073ced/apps/website/qa/queen-foundation-contract.mjs' },
      { label: 'CI run on the merge commit', href: 'https://github.com/gHashTag/trinity/actions/runs/33972650656' },
    ],
    openQuestions: [
      'The server route /queen/public-foundation is not established as live by this merge; the contract records a route 404 as a wire-stage condition and uses the file fallback.',
      'A dated repository snapshot does not independently prove that the underlying GitHub ledger is complete or current.',
      'The change does not establish a deployed honeycomb interaction, production deployment, performance, FPGA hardware, a crystal, speed, energy, or downstream-model result.',
    ],
    published: true,
    ru: {
      title: 'Снимок основания Queen получил контракт источника',
      summary: '[измерено] Смерженный PR #937 добавляет датированный снимок основания и контракт с фикстурой, который делает источник данных страницы видимым.',
      openQuestions: [
        'Работа серверного маршрута /queen/public-foundation не установлена этим merge; контракт записывает 404 маршрута как состояние wire-этапа и использует резервный файл.',
        'Датированный снимок репозитория сам по себе не доказывает полноту или актуальность исходного журнала GitHub.',
        'Изменение не устанавливает развёрнутую интерактивность honeycomb, production deploy, производительность, FPGA-железо, кристалл, скорость, энергию или результат для модели.',
      ],
    },
  },
  {
    slug: 'one-more-reading-then-it-cleared',
    title: 'One more reading, then it cleared',
    summary: 'A disk-halt monitor built to require two consecutive recovery readings before clearing got its first real test on a genuine crisis, not a synthetic one, three days after being written.',
    date: '2026-09-05',
    readingMinutes: 6,
    tags: ['Zig', 'Tooling', 'Reliability', 'Automation'],
    receipts: [
      { label: 'trinity-fpga@cc00a282d — the original three tripwires (disk, drift, decision-gridlock) · 2026-09-04', href: 'https://github.com/gHashTag/trinity-fpga/commit/cc00a282df7d6dded97da7a1694e8a1303598486' },
      { label: 'trinity-fpga@7193c740 — hysteresis and flap detection added, 49 tests · 2026-09-05', href: 'https://github.com/gHashTag/trinity-fpga/commit/7193c7409048ee37cfcb45561f79fec429361684' },
      { label: 'trinity-fpga@360ce4c1 — the real crisis, and the first live proof · 2026-09-05', href: 'https://github.com/gHashTag/trinity-fpga/commit/360ce4c1fed0d1261a6d8f0439425c6b24bfbe30' },
    ],
    openQuestions: [
      'The confirmation count (2 readings) and the flap window (20 iterations) and threshold (3 episodes) are defaults, not tuned against incident data -- there have only been three halt episodes total across this run, not enough to calibrate against.',
      'The third crisis\'s root cause and recovery were never identified. Something outside this loop\'s own visibility -- most likely a reboot or an OS-level cache clear -- resolved it. This post shows the state machine behaved correctly against a real reading, not that the underlying disk problem is understood or fixed.',
      'Flap detection has not actually fired during real operation in this run. It is tested against seeded synthetic data in a scratch copy of the state file, not against a real flapping sequence, because the three real halt episodes so far are spread too far apart in iteration count to cross the default threshold.',
      'A detected flap currently only prints a warning and persists the episode history -- it does not yet write a formal, durable anomaly record. That is a deliberate, smaller scope than the original ask, not an oversight.',
    ],
    published: true,
    ru: {
      title: 'Ещё одно показание, и вердикт снялся',
      summary: 'Монитор остановки диска, требующий два подряд идущих восстановительных показания перед снятием, получил первую настоящую проверку на реальном кризисе, а не на синтетическом, спустя три дня после написания.',
      openQuestions: [
        'Число подтверждений (2 показания), окно флаппинга (20 итераций) и порог (3 эпизода) — значения по умолчанию, не откалиброванные по данным реальных инцидентов: за весь прогон было всего три эпизода остановки, этого недостаточно для калибровки.',
        'Первопричина третьего кризиса и его восстановление так и не были установлены. Что-то вне видимости этого цикла — вероятнее всего перезагрузка или очистка кэша на уровне ОС — разрешило его. Этот текст показывает, что машина состояний повела себя верно на реальном показании, а не то, что основная дисковая проблема понята или решена.',
        'Обнаружение флаппинга ни разу не сработало в реальной работе за этот прогон. Оно проверено на засеянных синтетических данных в черновой копии файла состояния, а не на настоящей флаппящей последовательности, потому что три реальных эпизода остановки пока разнесены по номерам итераций слишком далеко, чтобы пересечь порог по умолчанию.',
        'Обнаруженный флаппинг сейчас только печатает предупреждение и сохраняет историю эпизодов — он ещё не пишет формальную, долговременную запись аномалии. Это осознанно более узкий охват, чем исходная просьба, а не недосмотр.',
      ],
    },
  },
  {
    slug: 'clara-proposal-submitted-not-reviewed',
    title: 'CLARA: submitted, non-conforming, and not reviewed on the merits',
    summary: '[measured] Merged PR #892 changed one README file with two additions and two deletions, correcting the project record from “never submitted” to submitted, administratively non-conforming, and not reviewed on the merits.',
    date: '2026-09-03',
    readingMinutes: 4,
    tags: ['Documentation', 'Reproducibility', 'Self-critique', 'CLARA'],
    receipts: [
      { label: 'Merged PR #892 — corrected CLARA submission status', href: 'https://github.com/gHashTag/trinity/pull/892' },
      { label: 'Merge commit 67fd7e26 — README diff', href: 'https://github.com/gHashTag/trinity/commit/67fd7e26a8613937a926b68ee32de887aa393350' },
      { label: 'README at the merge commit', href: 'https://github.com/gHashTag/trinity/blob/67fd7e26a8613937a926b68ee32de887aa393350/README.md' },
    ],
    openQuestions: [
      'GitHub is not an independent DARPA registry; the repository record does not independently verify an external receipt or agency decision.',
      'The diff does not establish an award, funding, endorsement, merits review, or ongoing engagement.',
      'The correction is documentation only and does not establish performance, assurance, hardware, speed, energy, or downstream-model results.',
    ],
    published: true,
    ru: {
      title: 'CLARA: заявка подана, но не прошла административное соответствие',
      summary: '[измерено] Смерженный PR #892 изменил один README: добавил две строки и удалил две, исправив запись с «никогда не подан» на «подан, не соответствует административным требованиям и не рассмотрен по существу».',
      openQuestions: [
        'GitHub не является независимым реестром DARPA; запись репозитория сама по себе не подтверждает внешнюю квитанцию или решение ведомства.',
        'Дифф не устанавливает награду, финансирование, одобрение, рассмотрение по существу или продолжающееся взаимодействие.',
        'Правка относится только к документации и не устанавливает результатов по производительности, assurance, железу, скорости, энергии или качеству модели после квантования.',
      ],
    },
  },
  {
    slug: 'queen-review-lifecycle-queues',
    title: 'PR #888 made review ownership explicit',
    summary: 'Merged PR #888 adds four explicit review states in a 5-file diff, while separate CI receipts show that merge state and delivery status are different facts.',
    date: '2026-09-02',
    readingMinutes: 5,
    tags: ['Review', 'CI', 'GitHub Actions', 'Queen'],
    receipts: [
      { label: 'PR #888 — merged review lifecycle change', href: 'https://github.com/gHashTag/trinity/pull/888' },
      { label: 'Merge commit 6a4d6fb0', href: 'https://github.com/gHashTag/trinity/commit/6a4d6fb07670f99f16e4ffb67a12dee42caac3df' },
      { label: 'Executable review lifecycle model', href: 'https://github.com/gHashTag/trinity/blob/main/apps/website/src/pages/queenReviewLifecycle.ts' },
      { label: 'Queen review lifecycle contract', href: 'https://github.com/gHashTag/trinity/blob/main/apps/website/qa/queen-review-lifecycle-contract.mjs' },
      { label: 'CI on the merge SHA', href: 'https://github.com/gHashTag/trinity/actions/runs/33596673499' },
      { label: 'Codegen Validation on the merge SHA', href: 'https://github.com/gHashTag/trinity/actions/runs/33596672649' },
      { label: 'Website checks on the merge SHA', href: 'https://github.com/gHashTag/trinity/actions/runs/33596670941' },
      { label: 'Site live gate on the merge SHA', href: 'https://github.com/gHashTag/trinity/actions/runs/33596669091' },
    ],
    openQuestions: [
      'Delivery of PR #888 to the live site is not proven: the Site live gate and manual deploy stopped separately.',
      'The causes of the KOSCHEI and S³AI Brain stops are not established beyond the named steps.',
      'Correctness of every Queen route, the user-facing behavior of all queues, and the completeness of the public ledger are not established.',
      'This is a repository and CI result, not a measurement of FPGA hardware, a crystal, speed, energy, or downstream model quality.',
    ],
    published: true,
    ru: {
      title: 'PR #888 сделал владение ревью явным',
      summary: 'Смерженный PR #888 добавляет четыре явных состояния ревью в диффе на 5 файлов, а отдельные свидетельства CI показывают, что состояние merge и доставка — разные факты.',
      openQuestions: [
        'Доставка PR #888 на живой сайт не доказана: Site live gate и ручной deploy остановились по отдельности.',
        'Причины остановок KOSCHEI и S³AI Brain за пределами названных шагов не установлены.',
        'Корректность каждого маршрута Queen, поведение всех очередей для пользователя и полнота публичного реестра не установлены.',
        'Это результат репозитория и CI, а не измерение FPGA, кристалла, скорости, энергии или качества модели после квантования.',
      ],
    },
  },
  {
    "slug": "two-bitstreams-one-bit-apart",
    "title": "Two bitstreams, one bit apart",
    "summary": "A proposed row in the Xilinx bitstream database had been unverifiable for eighteen months. Two 22.7 MB bitstreams differing in a single bit settle it on silicon: with the bit an LED blinks, without it the counter is frozen.",
    "date": "2026-09-01",
    "readingMinutes": 8,
    "tags": [
      "FPGA",
      "openXC7",
      "Project X-Ray",
      "Hardware"
    ],
    "receipts": [
      {
        "label": "nextpnr-xilinx #149 — the measurement, with the failed attempts · OPEN",
        "href": "https://github.com/openXC7/nextpnr-xilinx/issues/149#issuecomment-5494347759"
      },
      {
        "label": "nextpnr-xilinx #149 — the divide ladder, four points · OPEN",
        "href": "https://github.com/openXC7/nextpnr-xilinx/issues/149#issuecomment-5496565529"
      },
      {
        "label": "nextpnr-xilinx #170 — pad-fed BUFR to its dedicated site · OPEN, submitted upstream, CI green 3/3",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/170"
      },
      {
        "label": "nextpnr-xilinx #171 — regional buffer sinks kept in their clock region · OPEN, submitted upstream, CI green 3/3",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/171"
      },
      {
        "label": "nextpnr-xilinx #172 — MMCM-fed buffers cannot be assembled: PERFCLK rows missing · OPEN",
        "href": "https://github.com/openXC7/nextpnr-xilinx/issues/172"
      },
      {
        "label": "prjxray-db #1 — the eight candidate rows, by AdamLee7 · CLOSED 2026-08-14",
        "href": "https://github.com/openXC7/prjxray-db/pull/1"
      }
    ],
    "openQuestions": [
      "One row of the eight is measured. BUFRCLK0 (00_23), BUFRCLK1 (01_23) and BUFRCLK3 (01_31) rest on a frame-pattern argument and nothing else. The index follows which BUFR site the clock pad maps to, and this board has exactly one clock-capable oscillator, so varying it is not possible here.",
      "Both patches are OPEN, not merged. CI is green and no maintainer has reviewed them yet. Nothing in this post should be read as upstream acceptance.",
      "#170 may be the wrong patch. A fork has fixed the same bug with one line since April 2025, and I measured identical placement from it. I disclosed that on the pull request and offered to close mine; the maintainers have not chosen.",
      "An LED separates divide ratios of 2, 4 and 8. It would not separate 8 from 7. D1, D3, D5, D6 and D7 were never tested — the doubling steps were picked precisely because an eye can call them without argument.",
      "MMCM-fed regional buffers still cannot be assembled at all: two mux legs have no segbits, and the cause is a specimen gap needing Vivado runs on someone else's bench, not a fix I can make.",
      "Nothing here is independently replicated. One board, one operator reading an LED, one evening. The method is cheap enough that a second party could check it in about half an hour per bit, and until someone does that is the standing of it."
    ],
    "published": true,
    "ru": {
      "title": "Две прошивки, различие в один бит",
      "summary": "Предложенная строка в базе прошивок Xilinx полтора года оставалась непроверяемой. Две прошивки по 22.7 МБ, различающиеся одним битом, закрывают вопрос на кремнии: с битом светодиод мигает, без него счётчик стоит.",
      "openQuestions": [
        "Проверена одна строка из восьми. BUFRCLK0 (00_23), BUFRCLK1 (01_23) и BUFRCLK3 (01_31) держатся на узоре кадров и больше ни на чём. Индекс определяется тем, на какой site BUFR выводит тактовый пад, а тактовый генератор на этой плате ровно один, так что менять индекс здесь нечем.",
        "Обе правки ОТКРЫТЫ, не слиты. CI зелёный, но ни один сопровождающий их пока не смотрел. Ничто в этом тексте не следует читать как принятие в проект.",
        "Правка #170 может оказаться лишней. Форк чинит ту же ошибку одной строкой с апреля 2025 года, и я измерил, что размещение выходит то же. Я написал об этом в запросе и предложил закрыть свой; сопровождающие ещё не выбрали.",
        "Светодиод различает деление на 2, 4 и 8. Деление на 8 от деления на 7 он бы не отличил. Ступени D1, D3, D5, D6 и D7 не проверялись — удваивающиеся выбраны именно потому, что их глаз называет без спора.",
        "Региональные буферы, питаемые от MMCM, по-прежнему не собираются в прошивку вовсе: у двух ножек мультиплексора нет битов в базе, а причина — нехватка образцов, требующая прогонов Vivado на чужом стенде, а не правки, которую могу сделать я.",
        "Ничто здесь не воспроизведено независимо. Одна плата, один человек, смотрящий на светодиод, один вечер. Метод достаточно дёшев, чтобы вторая сторона проверила его примерно за полчаса на бит, и до тех пор таково его положение."
      ]
    }
  },
  {
    slug: 'one-commit-nine-workflow-outcomes',
    title: 'One commit, nine workflow outcomes',
    summary: 'A public GitHub Actions snapshot for commit 442bcda8bc50fe555de9d463bfd34b247c5995a5 records 9 runs: 8 push-triggered runs split into 4 successes and 4 failures, plus 1 issue-triggered failure; job evidence shows distinct stopping points rather than a shared cause.',
    date: '2026-09-01',
    readingMinutes: 6,
    tags: ['CI', 'GitHub Actions', 'Testing', 'Self-critique'],
    receipts: [
      { label: 'Public GitHub Actions run list for gHashTag/trinity', href: 'https://api.github.com/repos/gHashTag/trinity/actions/runs?per_page=20' },
      { label: 'Shared head commit 442bcda8bc50fe555de9d463bfd34b247c5995a5', href: 'https://github.com/gHashTag/trinity/commit/442bcda8bc50fe555de9d463bfd34b247c5995a5' },
      { label: 'Website checks run 33514093916 and Jobs API', href: 'https://github.com/gHashTag/trinity/actions/runs/33514093916' },
      { label: 'KOSCHEI Production Deploy run 33514093804 and Jobs API', href: 'https://github.com/gHashTag/trinity/actions/runs/33514093804' },
      { label: 'S³AI Brain CI run 33514093881 and Jobs API', href: 'https://github.com/gHashTag/trinity/actions/runs/33514093881' },
      { label: 'Dev-enforcement run 33514092205 and its public Jobs API', href: 'https://github.com/gHashTag/trinity/actions/runs/33514092205' },
    ],
    openQuestions: [
      'The 4 push failures and the issue-triggered failure do not have an established common cause; the shared head commit is not causal evidence.',
      'A successful Site live gate does not prove that Website checks, the whole pipeline, or production is healthy.',
      'Skipped is not a successful execution, and 0 jobs does not expose an internal stopping step.',
    ],
    published: true,
    ru: {
      title: 'Один коммит, девять исходов workflow',
      summary: 'Публичный срез GitHub Actions для коммита 442bcda8bc50fe555de9d463bfd34b247c5995a5 фиксирует 9 запусков: 8 запусков push разделились на 4 success и 4 failure, ещё 1 отказ был вызван событием issue; Jobs API показывает разные точки остановки, а не общую причину.',
      openQuestions: [
        'Для 4 отказов push и отказа workflow, вызванного issue, общая причина не установлена; общий head-коммит не является причинным доказательством.',
        'Успешный Site live gate не доказывает исправность Website checks, всего конвейера или production.',
        'Skipped не означает успешное выполнение, а 0 job не раскрывает внутренний шаг остановки.',
      ],
    },
  },
  {
    slug: 'tri-claw-an-agent-you-can-audit',
    title: 'TRI CLAW: an agent you can audit',
    summary: 'Three dies that never reached the foundry become three gateware layers on the most-studied FPGA family: attestation at boot, a BLAKE3 receipt per action, a ternary engine with an empty DSP column. The agent-in-a-box exists; the verifiable device exists; the intersection is empty.',
    date: '2026-08-31',
    readingMinutes: 8,
    tags: ['TRI CLAW', 'Product', 'FPGA', 'Ternary', 'Verification', 'Self-critique'],
    receipts: [
      { label: 'TeLLMe — ternary LLM accelerator on edge FPGAs (arXiv:2504.16266)', href: 'https://arxiv.org/abs/2504.16266' },
      { label: 'TerEffic — highly efficient ternary LLM inference on FPGA (arXiv:2502.16473)', href: 'https://arxiv.org/abs/2502.16473' },
      { label: 'Hummingbird+ — FPGA 2026, from research prototype to edge product', href: 'https://dl.acm.org/doi/10.1145/3748173.3779189' },
      { label: 'BitNet b1.58 2B4T technical report (arXiv:2504.12285)', href: 'https://arxiv.org/abs/2504.12285' },
      { label: 'Precursor on Crowd Supply — the verifiable-device precedent', href: 'https://www.crowdsupply.com/sutajio-kosagi/precursor' },
      { label: 'tt-trinity-phi / euler / gamma — the three dies, RTL and GDS CI', href: 'https://github.com/gHashTag/tt-trinity-phi' },
      { label: 'TRI-NET triad deposition — DOI 10.5281/zenodo.19227877', href: 'https://doi.org/10.5281/zenodo.19227877' },
    ],
    openQuestions: [
      'No measured tokens-per-second on the target Artix-7 200T yet; every published edge number is from other parts and transfers to nothing.',
      'A 2B ternary model does not fit on-chip (~475 MB of weights); v1 targets 0.1-0.7B and the DDR-bound decode path is unmeasured.',
      'The agent loop needs a host core; its shape (softcore vs companion) is undecided.',
      'The triad silicon does not exist; the product is gateware on a stock board.',
      'The "claw" name space is crowded and the trademark question is unchecked.',
    ],
    published: true,
    ru: {
      title: 'TRI CLAW: агент, которого можно проверить',
      summary: 'Три кристалла, не доехавшие до фабрики, становятся тремя слоями гейтвера на самом изученном семействе FPGA: аттестация при загрузке, BLAKE3-квитанция на каждое действие, тернарный двигатель с пустой колонкой DSP. Агент-в-коробке существует; проверяемое устройство существует; пересечение пусто.',
      openQuestions: [
        'Измеренных токенов-в-секунду на целевом Artix-7 200T нет; опубликованные edge-числа сняты на других кристаллах и не переносятся.',
        'Тернарная модель 2B не помещается on-chip (~475 МБ весов); v1 целится в 0.1-0.7B, тракт декода через DDR не измерен.',
        'Агентному циклу нужно хост-ядро; его форма (softcore или компаньон) не выбрана.',
        'Кремния триады не существует; продукт — гейтвер на серийной плате.',
        'Пространство имён «claw» занято, товарный знак не проверен.',
      ],
    },
  },
  {
    slug: 'real-value-in-integer-container',
    title: 'A real value must not travel in an integer container',
    summary: 'A merged Verilog-emitter fix moved one simulation case from 5 PASSED / 6 FAILED to 11 PASSED while syntax acceptance stayed at 380 files, showing why form and numerical-meaning gates must be separate.',
    date: '2026-08-31',
    readingMinutes: 7,
    tags: ['Verilog', 'Simulation', 'Compiler', 'Testing'],
    receipts: [
      { label: 'gHashTag/t27 PR #2991 — merged fix for real values in integer containers', href: 'https://github.com/gHashTag/t27/pull/2991' },
      { label: 'Merge commit 9adbb691', href: 'https://github.com/gHashTag/t27/commit/9adbb69109bd9a72f74ff17e610cb9bf55c24930' },
      { label: 'The targeted Verilog simulation test', href: 'https://github.com/gHashTag/t27/blob/9adbb69109bd9a72f74ff17e610cb9bf55c24930/bootstrap/tests/verilog_real_arithmetic.rs' },
    ],
    openQuestions: [
      'Correctness of all real-valued operations, all specifications, and every backend was not established.',
      'The result does not measure speed, FPGA area, energy, or downstream model quality.',
      'Verilog real is simulation-only; this icarus-simulate result is not a synthesis result.',
      'The five killed mutations show that the selected tests catch these variants, not that unseen variants cannot survive.',
    ],
    published: true,
    ru: {
      title: 'Вещественное значение не должно проходить через целочисленный контейнер',
      summary: 'Смерженная правка генератора Verilog перевела один симуляционный сценарий с 5 PASSED / 6 FAILED на 11 PASSED, а синтаксическая приемка осталась на 380 файлах — поэтому гейты формы и численного смысла должны быть раздельными.',
      openQuestions: [
        'Корректность всех вещественных операций, всех спецификаций и каждого бэкенда не установлена.',
        'Скорость, площадь FPGA, энергия и качество модели после квантования не измерялись.',
        'Тип Verilog real предназначен только для симуляции; результат icarus-simulate не является результатом синтеза.',
        'Пять убитых мутаций показывают, что выбранные тесты ловят эти варианты, но не доказывают, что невидимые варианты не выживут.',
      ],
    },
  },
  {
    slug: 'features-that-change-no-bits',
    title: '179 features that change no bits, and one routing choice that did',
    summary: 'A parity report between two Xilinx place-and-route trees ranked its own work items backwards: the 179 missing BRAM features were zero-codepoints, and the blocker that kept a bitstream off a board produced no feature-count delta at all.',
    date: '2026-08-31',
    readingMinutes: 7,
    tags: ['openXC7', 'FPGA', 'Bitstream', 'Upstream', 'Measurement'],
    receipts: [
      { label: 'openXC7/nextpnr-xilinx #165 — the parity report itself · OPEN', href: 'https://github.com/openXC7/nextpnr-xilinx/issues/165' },
      { label: 'openXC7/nextpnr-xilinx #165 — the retraction of the BRAM item, 2026-08-28', href: 'https://github.com/openXC7/nextpnr-xilinx/issues/165#issuecomment-5456497915' },
      { label: 'openXC7/nextpnr-xilinx #165 — the Sonata board results, 2026-08-30', href: 'https://github.com/openXC7/nextpnr-xilinx/issues/165#issuecomment-5471151263' },
      { label: 'openXC7/nextpnr #1 — a route through the BUFR datapath obliges a BUFR · MERGED 2026-08-29', href: 'https://github.com/openXC7/nextpnr/pull/1' },
      { label: 'openXC7/prjxray-db #7 — artix7 HCLK_IOI3 rows and the DMUX default position · MERGED 2026-08-26', href: 'https://github.com/openXC7/prjxray-db/pull/7' },
      { label: 'openXC7/nextpnr-xilinx #168 — place a pad-fed BUFIO on a site its pad can reach · OPEN', href: 'https://github.com/openXC7/nextpnr-xilinx/pull/168' },
      { label: 'openXC7/nextpnr-xilinx #149 — BUFIO is not packed, HCLK_L enables never emitted · OPEN', href: 'https://github.com/openXC7/nextpnr-xilinx/issues/149' },
    ],
    openQuestions: [
      'Not one measurement in this post is mine. The parity table and both corrections are cavearr’s work in #165; the board run is jrrk2’s, on his own Sonata. I opened and read the artefacts; I reproduced nothing in them.',
      'One board, one die (xc7a50tcsg324), one design class. A blinky says the clock arrives and the fabric toggles. It says nothing about whether a himbaechel LiteX DDR3 bitstream runs on silicon, and nobody has tried.',
      'The hold-analysis policy is unchanged: the port still exits 1 on hold violations computed from a single DEFAULT speed grade with combinational-only cell timing, after writing the FASM. Whether it should warn instead is an open question in the thread, not a decision.',
      'fmax remains incomparable across the two trees. A one-LUT, one-FF design reports 2865 MHz on 0.9.3 and 1044 MHz on the port, so no quality-of-result claim between them is supported by anything published so far.',
      'The BRAM address cascade the port does emit and 0.9.3 never does (CASCOUT_ARD_ACTIVE ×34, CASCOUT_BWR_ACTIVE ×19 in the LiteX design) is legal and accepted by fasm2frames, but has not been checked against a Vivado golden and has not been seen on silicon.',
      'The regional clock path was routed around, not fixed. #168 and #149 are open, and a pad-fed BUFIO still cannot be placed on a site its pad can reach.',
    ],
    published: true,
    ru: {
      title: '179 фич, которые не меняют ни бита, и одно решение маршрутизации, которое меняло',
      summary: 'Отчёт о паритете двух деревьев place-and-route для Xilinx отранжировал собственные задачи наоборот: 179 недостающих фич BRAM оказались нулевыми кодовыми точками, а блокер, не пускавший битстрим на плату, не давал в счётчиках фич никакой разницы.',
      openQuestions: [
        'Ни одно измерение в этом посте не моё. Таблица паритета и обе поправки — работа cavearr в #165; прогон на плате — jrrk2, на его собственной Sonata. Я открыл и прочитал артефакты; я ничего в них не воспроизвёл.',
        'Одна плата, один кристалл (xc7a50tcsg324), один класс дизайна. Blinky говорит, что клок доходит и фабрика переключается. Он ничего не говорит о том, работает ли на кремнии битстрим LiteX DDR3 от порта, — этого никто не пробовал.',
        'Политика анализа hold не изменилась: порт по-прежнему завершается с кодом 1 при нарушениях hold, посчитанных по единственному скоростному градусу DEFAULT и чисто комбинационным задержкам ячеек, уже после записи FASM. Должен ли он вместо этого предупреждать — открытый вопрос в треде, а не решение.',
        'fmax по-прежнему несопоставим между двумя деревьями. Дизайн из одного LUT и одного триггера показывает 2865 МГц на 0.9.3 и 1044 МГц на порте, так что ни одно утверждение о качестве результата между ними опубликованным пока не подкреплено.',
        'Каскад адресов BRAM, который порт выдаёт, а 0.9.3 не выдаёт никогда (CASCOUT_ARD_ACTIVE ×34, CASCOUT_BWR_ACTIVE ×19 в дизайне LiteX), легален и принимается fasm2frames, но не сверялся с эталоном Vivado и не проверялся на кремнии.',
        'Региональный путь клока обошли, а не починили. #168 и #149 открыты, и BUFIO, питаемый падом, по-прежнему нельзя поставить на сайт, до которого этот пад дотягивается.',
      ],
    },
  },
  {
    slug: 'physical-width-changed-the-question',
    title: 'Physical width changed the question',
    summary: 'A committed-oracle comparison exposed a nominal-width error: TNF16 labelled as 16 bits occupies 19 physical bits, so the table now matches containers before comparing lattices.',
    date: '2026-08-23',
    readingMinutes: 7,
    tags: ['Number formats', 'Conformance', 'Measurement', 'Self-critique'],
    receipts: [
      { label: 'gHashTag/trinity-fpga PR #727 — W991/W992 merged', href: 'https://github.com/gHashTag/trinity-fpga/pull/727' },
      { label: 'W991 committed measurement table', href: 'https://github.com/gHashTag/trinity-fpga/blob/main/research/arxiv_tnf/measurements/compare_w991.json' },
      { label: 'Merge commit 78987a4', href: 'https://github.com/gHashTag/trinity-fpga/commit/78987a4e0757de47b4ab6e9a2a9d486180e688f4' },
    ],
    openQuestions: [
      'Whether matching physical width changes a workload-level choice is not measured. W991 compares the representation lattice only.',
      'No LUT, timing, energy, or board measurement follows from this table. Those are separate artifacts and remain open.',
      'The local step at 1.0 does not summarize the extreme behaviour of a tapered format, so it must not be read as a whole-range accuracy claim.',
      'The comparison is with posit for the committed lattice table; no accuracy comparison with takum is made here, and no claim about a preferred format is supported.'
    ],
    published: true,
    ru: {
      title: 'Физическая ширина изменила вопрос',
      summary: 'Сравнение по зафиксированным оракулам обнаружило ошибку номинальной ширины: TNF16, помеченный как 16-битный, занимает 19 физических бит, поэтому сначала сопоставляются контейнеры, а потом решётки значений.',
      openQuestions: [
        'Изменит ли сопоставление по физической ширине выбор для реальной нагрузки — не измерено. W991 сравнивает только решётку представления.',
        'Из этой таблицы не следуют замеры LUT, тайминга, энергии или платы. Это отдельные артефакты, и вопрос остаётся открытым.',
        'Локальный шаг при 1.0 не описывает крайние зоны tapered-формата, поэтому его нельзя читать как утверждение о точности на всём диапазоне.',
        'В таблице решётка сопоставлена с posit; сравнение точности с takum здесь не проводится, и предпочтительный формат не выбирается.'
      ]
    }
  },
  {
    slug: 'nobodys-example',
    title: "Nobody's example",
    summary: 'A gate\'s negative control is written by someone who plants the fault it is meant to catch. That one sentence explains almost everything a boundary-mutation operator found in a suite three other operators had already scoured.',
    date: '2026-08-23',
    readingMinutes: 8,
    tags: ['CI', 'Mutation testing', 'Test design', 'Measurement'],
    receipts: [
      { label: 'gHashTag/t27 #2503 -- the boundary operator, and the first number that counted docstrings', href: 'https://github.com/gHashTag/t27/pull/2503' },
      { label: 'gHashTag/t27 #2504 -- three boundaries closed, one classification corrected', href: 'https://github.com/gHashTag/t27/pull/2504' },
      { label: 'gHashTag/t27 #2507 -- the last six, and what they had in common', href: 'https://github.com/gHashTag/t27/pull/2507' },
    ],
    openQuestions: [
      'Whether a fifth operator family finds more is not established. Four were tried, nothing enumerates the set, and three of the four found a defect in the tool asking the question rather than in the code asked about.',
      'The claim that degeneracy explains the yield is an argument from six cases in one repository, not a measurement across projects. It predicts that other suites have the same hole; that prediction is untested here.',
      'Two survivors are called proven equivalences on the strength of two enclosing guards. The proof is short and stated in the source, but it is a reading of the code, not an exhaustive check of the input space.',
      '"No mutant survives" is not "the gates are correct". Nothing here measures whether a gate checks the property anyone wanted it to check.',
    ],
    published: true,
    ru: {
      title: 'Ничьи примеры',
      summary: 'Негативный контроль гейта пишет тот, кто сажает дефект, который контроль должен поймать. Эта одна фраза объясняет почти всё, что граничный оператор мутаций нашёл в наборе, уже вычищенном тремя другими.',
      openQuestions: [
        'Найдёт ли что-нибудь пятое семейство операторов — не установлено. Испробованы четыре, множество ничем не перечислено, и три из четырёх нашли дефект в самом задающем вопрос инструменте, а не в коде, о котором спрашивали.',
        'Утверждение, что вырожденность объясняет урожай, — довод от шести случаев в одном репозитории, а не измерение по проектам. Оно предсказывает такую же дыру в других наборах; это предсказание здесь не проверено.',
        'Два выживших названы доказанными эквивалентностями на основании двух охранников. Доказательство коротко и записано в исходнике, но это чтение кода, а не исчерпывающая проверка пространства входов.',
        '«Ни один мутант не выживает» — не то же, что «гейты верны». Ничто здесь не измеряет, проверяет ли гейт то свойство, которое от него хотели.',
      ],
    },
  },
  {
    "slug": "the-silence-was-a-saturated-readout",
    "title": "A background loop broke for months, and no amount of watching could have caught it",
    "summary": "Seven timed loops logged nothing on an empty tick. That is not an oversight in monitoring — it is the same theorem that kills a sticky-OR readout: the observation is identically constant across the hypotheses, so it carries exactly zero bits.",
    "date": "2026-08-12",
    "readingMinutes": 6,
    "tags": [
      "information theory",
      "observability",
      "production",
      "measurement"
    ],
    "receipts": [
      {
        "label": "the fix, merged 2026-08-12",
        "href": "https://github.com/gHashTag/woody-weed-bot/pull/74"
      },
      {
        "label": "the earlier readout theorem",
        "href": "https://t27.ai/#/blog/readout-that-cannot-be-misread"
      }
    ],
    "openQuestions": [
      "The information argument is exact only where the readout is saturated. Near-saturation is answered below and was verified numerically; the closed form is second-order and already drifts 1.2% at a gap of 0.08, and for dependent observations the 1/d² cost is a lower bound rather than the value.",
      "Whether the deployed fix works is not yet established. It merged 2026-08-12 06:30 UTC; the loops it instruments tick every four and six hours, so the first evidence arrives after this was written.",
      "The unification is a claim about two failures I have in hand. Whether every silent-failure class has this shape is not shown, and I would expect counterexamples where the observation is noisy rather than constant.",
      "No claim is made about how common this is in other codebases. Seven of seven loops in one project is a fact about that project."
    ],
    "published": true,
    "ru": {
      "title": "Фоновый цикл ломался месяцами, и никакое наблюдение не могло его поймать",
      "summary": "Семь таймерных циклов ничего не писали при пустом тике. Это не упущение мониторинга — это та же теорема, что убивает показание sticky-OR: наблюдение тождественно постоянно по гипотезам и потому несёт ровно ноль бит.",
      "openQuestions": [
        "Информационный довод точен лишь там, где показание насыщено. Приближённое насыщение разобрано ниже и проверено численно; замкнутая форма — второго порядка и уже при зазоре 0.08 отклоняется на 1.2%, а для зависимых наблюдений 1/d² есть нижняя оценка, а не значение.",
        "Работает ли развёрнутая правка, пока не установлено. Она влита 2026-08-12 06:30 UTC, а циклы, которые она снабжает строкой, тикают раз в четыре и шесть часов — первое свидетельство появится после написания этого текста.",
        "Объединение — утверждение о двух отказах, которые у меня на руках. Что всякий класс тихих отказов имеет такую форму, не показано; контрпримеры ожидаемы там, где наблюдение шумное, а не постоянное.",
        "О распространённости в других кодовых базах не утверждается ничего. Семь циклов из семи в одном проекте — факт об этом проекте."
      ]
    }
  },
  {
    "slug": "twenty-merged-in-three-days",
    "title": "Twenty patches merged upstream in three days",
    "summary": "On 2026-08-09 my own notes said six patches were open and none had been merged. By 2026-08-11 openXC7 had merged twenty. The interesting part is not the number — it is that I did not know it until I ran the query.",
    "date": "2026-08-12",
    "readingMinutes": 4,
    "tags": [
      "openXC7",
      "upstream",
      "measurement"
    ],
    "receipts": [
      {
        "label": "openXC7/nextpnr-xilinx — merged PRs by gHashTag",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pulls?q=is%3Apr+author%3AgHashTag+is%3Amerged"
      },
      {
        "label": "the three still open",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pulls?q=is%3Apr+author%3AgHashTag+is%3Aopen"
      }
    ],
    "openQuestions": [
      "Counted by API on 2026-08-12 with is:merged over openXC7/nextpnr-xilinx. Merge dates are the repository’s, not mine.",
      "Twenty merges is a count of accepted patches, not of impact. Several are one-line diagnostics; the number does not weight them.",
      "Why the burst happened over exactly those three days is upstream’s business and not visible from the outside. I am reporting the dates, not explaining them.",
      "Three PRs remain open (#119, #120, #129). Whether they land is not predicted here."
    ],
    "published": true,
    "ru": {
      "title": "Двадцать патчей слито апстримом за три дня",
      "summary": "2026-08-09 в моих заметках стояло: шесть патчей открыты, ни один не слит. К 2026-08-11 openXC7 слил двадцать. Занятно не число, а то, что я не знал его, пока не запустил запрос.",
      "openQuestions": [
        "Посчитано по API 2026-08-12 запросом is:merged по openXC7/nextpnr-xilinx. Даты слияний — репозитория, не мои.",
        "Двадцать слияний — счёт принятых патчей, а не влияния. Некоторые из них однострочные диагностики; число их не взвешивает.",
        "Почему всплеск пришёлся ровно на эти три дня — дело апстрима и снаружи не видно. Я сообщаю даты, а не объясняю их.",
        "Три PR остаются открытыми (#119, #120, #129). Сядут ли они, здесь не предсказывается."
      ]
    }
  },
  {
    "slug": "energy-asymmetry-activations",
    "title": "Half of your activations are negative. They carry 1.8% of the energy",
    "summary": "Post-activation tensors are half negative by count and 1.8–6.2% by energy, while weights are symmetric on both measures — which decides how a 4-bit alphabet should spend its codes.",
    "date": "2026-08-11",
    "readingMinutes": 6,
    "tags": [
      "Quantisation",
      "Transformers",
      "Numeric formats",
      "4-bit"
    ],
    "receipts": [
      {
        "label": "The measurement, with the table",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/main/research/block/ENERGY_ASYMMETRY_2026-08-09.md"
      },
      {
        "label": "The comparison it predicts (BlockDialect, DialectFP4)",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/main/research/block/ASYM_VS_BLOCKDIALECT_2026-08-09.md"
      },
      {
        "label": "DialectFP4, the competitor — arXiv:2501.01144",
        "href": "https://arxiv.org/abs/2501.01144"
      }
    ],
    "openQuestions": [
      "Measured on SmolLM2-135M and Qwen2.5-0.5B only. Two small models is not a general result, and nothing here shows the ratio holds at 7B or beyond.",
      "The energy share is reported for GELU and SiLU/SwiGLU. Other activations were not measured, and ReLU is trivially 0% because it has no negative outputs at all.",
      "The advantage on activations (1.17×–1.46×) comes with a loss on weights (0.94×). Whether a mixed alphabet — asymmetric for activations, symmetric for weights — is worth its control cost in hardware has not been measured."
    ],
    "published": true,
    "ru": {
      "title": "Энергия активаций несимметрична, и это не свойство данных",
      "summary": "Стоимость положительной и отрицательной половины активаций различается устойчиво и в одну сторону. Асимметрия переживает смену данных, значит принадлежит представлению, а не входу.",
      "openQuestions": [
        "Измерено на прогонах серии HSLM, восстановленных 2026-04-20 обходом истории git; числа их, не перемеряны.",
        "Асимметрия наблюдалась на нескольких наборах данных. «Несколько» — не «любые»: класс входов, на котором она исчезает, не установлен.",
        "Механизм не предъявлен. Правдоподобны и несимметричное кодирование нуля, и поведение функции активации у нуля, и порядок округления — этими данными их не различить.",
        "Практический выигрыш от учёта асимметрии не измерен. Известно, что она есть, а не то, что на ней можно сэкономить."
      ]
    }
  },
  {
    "slug": "phi-identity-machine-checked",
    "title": "phi^2 + 1/phi^2 = 3, checked every way I could think of",
    "summary": "An exact identity, six proof steps machine-verified, and a search over 1,476,000 candidates that found no other root — plus what the identity does not license.",
    "date": "2026-08-11",
    "readingMinutes": 5,
    "tags": [
      "Mathematics",
      "Golden ratio",
      "Verification",
      "Ternary"
    ],
    "receipts": [
      {
        "label": "The proof, all six steps",
        "href": "https://github.com/gHashTag/trinity/blob/main/docs/docs/math-foundations/proofs.md"
      },
      {
        "label": "Lucas numbers L(2n) — the family this belongs to (OEIS A000032)",
        "href": "https://oeis.org/A000032"
      },
      {
        "label": "Euclid, Elements VI, Definition 3 — where the ratio is first defined",
        "href": "https://mathcs.clarku.edu/~djoyce/java/elements/bookVI/defVI3.html"
      }
    ],
    "openQuestions": [
      "Сhecked 2026-08-11 with sympy, mpmath at 60/210/1000 digits, and a 1,476,000-candidate numerical net. The identity itself is Euclid’s; only the verification is dated here.",
      "This is the n=1 case of the standard Lucas identity phi^(2n) + phi^(-2n) = L(2n). It is textbook mathematics, cited here rather than claimed — Euclid defined the ratio and the identity follows from its quadratic.",
      "Landing on a small integer is guaranteed, not surprising: every even power gives one. phi^2+phi^-2 through phi^16+phi^-16 are 3, 7, 18, 47, 123, 322, 843, 2207.",
      "That the result is 3 and that ternary arithmetic uses radix 3 is not a connection this identity establishes. No mechanism links L(2) to a radix, and treating the coincidence as evidence would be a separate claim needing separate support."
    ],
    "published": true,
    "ru": {
      "title": "Тождество золотого сечения, проверенное машиной",
      "summary": "φ² + 1/φ² = 3 — тождество, на котором стоит вся арифметика проекта. Доказательство проверено ассистентом, а не мной: там, где число лежит в основании, вера в него не считается.",
      "openQuestions": [
        "Проверено машиной 2026-08-11 в Lean; предмет проверки — доказательство, не реализация.",
        "Тождество точно в Z[φ] и приблизительно в любом формате с плавающей точкой. Насколько приблизительно — вопрос формата, а не тождества, и здесь он не отвечен.",
        "Машинная проверка исключает ошибку в выводе. Она не исключает того, что доказано не то утверждение, которое нужно; формулировку читал человек.",
        "Что из арифметики проекта опирается на это тождество, а что лишь соседствует с ним, отдельно не размечено."
      ]
    }
  },
  {
    "slug": "readout-that-cannot-be-misread",
    "title": "Four rules for a measurement rig whose readout cannot be misread",
    "summary": "A readout whose mapping to state is unestablished is not an instrument — four rules written after a week of hardware debugging where the rig lied and the design was fine.",
    "date": "2026-08-11",
    "readingMinutes": 6,
    "tags": [
      "FPGA",
      "Hardware",
      "Debugging",
      "Measurement"
    ],
    "receipts": [
      {
        "label": "The rules, with the failures that produced each",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/main/docs/HW_CAMPAIGN_AX7203_2026_07_30.md"
      },
      {
        "label": "The Ethernet build these rules were written during",
        "href": "https://t27.ai/#/blog/open-gigabit-ethernet-artix7"
      }
    ],
    "openQuestions": [
      "The rules come from the AX7203 bring-up campaign of 2026-07-30, written down as each failure occurred. Published 2026-08-11.",
      "These come from one board (AX7203, Artix-7) and one week. They are habits that survived a specific set of mistakes, not a general methodology, and rules 1 and 3 in particular assume a readout with few indicators.",
      "Rule 4 (A/B/A) costs a third run every time. Whether that is worth it depends on how expensive a run is; on a fast build it obviously is, on a six-hour synthesis it is a judgement call not made here."
    ],
    "published": true,
    "ru": {
      "title": "Показание, которое нельзя прочесть неверно",
      "summary": "Sticky-OR по окну несёт ровно ноль бит, если окно заведомо содержит высокий отсчёт. Средство стоит одного регистра: AND рядом с OR даёт строку, которая не может случиться.",
      "openQuestions": [
        "Взято из наладки AX7203 2026-07-30, где показание уже было построено неверно. Опубликовано 2026-08-11.",
        "Результат про ноль информации точен там, где насыщение гарантировано. Где не гарантировано, взаимная информация мала, а не нулевая, и насколько мала — зависит от частоты события.",
        "Пара OR/AND различает три состояния и не различает, как часто происходит переключение. Для частоты нужен счётчик, а не флаг.",
        "Невозможная строка проверяет тракт чтения и синхронизацию домена. Она не проверяет, что окно выбрано верно."
      ]
    }
  },
  {
    "slug": "frame-length-margin-law",
    "title": "Timing margin grows as the square root of a logarithm, and nothing accumulates",
    "summary": "A frame-length margin law derived from extreme-value statistics, and the accumulation story it refutes — which would predict a 12.9x eye violation on frames that pass.",
    "date": "2026-08-11",
    "readingMinutes": 7,
    "tags": [
      "FPGA",
      "Ethernet",
      "RGMII",
      "Timing",
      "Statistics"
    ],
    "receipts": [
      {
        "label": "The derivation, with the source theorems it leans on",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/main/docs/HW_CAMPAIGN_AX7203_2026_07_30.md"
      },
      {
        "label": "The build this was derived during",
        "href": "https://t27.ai/#/blog/open-gigabit-ethernet-artix7"
      }
    ],
    "openQuestions": [
      "The law was derived during the same 2026-07-30 bring-up campaign; the frame figures are from that campaign’s measurements. Published 2026-08-11.",
      "The law assumes per-edge phase errors are i.i.d. with a symmetric distribution. Real jitter has correlated components — supply noise, thermal drift — and the i.i.d. assumption is what makes the extreme-value argument work. Where correlation is strong the law is optimistic and by how much has not been measured here.",
      "The Gaussian form is an asymptotic approximation to the inverse CDF. It is accurate in the tail regime that matters for frame error rates, and it is not exact.",
      "This explains why long frames pass. It is not a design rule for closing timing, and using it as one would be reading a statistical bound as an engineering margin."
    ],
    "published": true,
    "ru": {
      "title": "Закон запаса по длине кадра",
      "summary": "Запас, при котором кадр ещё принимается, падает не с длиной, а с её логарифмом. Подгонка по четырём точкам, и она предсказала пятую до того, как её измерили.",
      "openQuestions": [
        "Четыре точки, пятая — предсказание, подтверждённое после. Четырёх точек мало для закона; это подгонка, названная подгонкой.",
        "Логарифмическая форма взята потому, что она прямая в полулогарифмических осях, а не потому, что выведена из механизма. Механизм остаётся открытым.",
        "Измерено на одном стенде AX7203 с одним коммутатором. Перенос на другое железо не проверялся.",
        "Закон говорит, где кадр перестаёт приниматься, и ничего не говорит о том, почему именно там."
      ]
    }
  },
  {
    "slug": "fifteen-merged-nine-credited",
    "title": "Fifteen merged, nine credited: what upstream contribution actually looks like",
    "summary": "I had written down five merged PRs and zero attributed commits. Re-measured through the API: fifteen merged, eight open, nine commits carrying my name — and the gap is worth naming precisely rather than as an absence.",
    "date": "2026-08-11",
    "readingMinutes": 5,
    "tags": [
      "Open source",
      "FPGA",
      "openXC7",
      "Attribution"
    ],
    "receipts": [
      {
        "label": "The merged PRs — run the query yourself",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pulls?q=is%3Apr+author%3AgHashTag+is%3Amerged"
      },
      {
        "label": "PR #133 — say which pin is wrong when a diff pair is const",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/133"
      },
      {
        "label": "PR #130 — emit OLOGIC IS_CLKDIV_INVERTED for OSERDESE2",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/130"
      }
    ],
    "openQuestions": [
      "These counts are for openXC7/nextpnr-xilinx alone, measured 2026-08-11. Other repositories were not counted and the ratio there may differ.",
      "Commit attribution is measured by GitHub’s author field, which follows the email in the commit. A merged PR whose commits were squashed under a maintainer’s name will not appear, and that is one of the mechanisms this post is about — so the nine is a floor, not a ceiling.",
      "Nothing here measures whether the gap is deliberate, and no maintainer is doing anything unusual. Squash-merge is the default on most projects."
    ],
    "published": true,
    "ru": {
      "title": "Пятнадцать смержено, девять атрибутировано: как выглядит вклад в чужой проект",
      "summary": "У меня было записано: пять смерженных PR и ноль атрибутированных коммитов. Перемерил через API: пятнадцать смержено, восемь открыто, девять коммитов несут моё имя — и оставшийся зазор стоит называть точно, а не как отсутствие.",
      "openQuestions": [
        "Счёт только по openXC7/nextpnr-xilinx, измерено 2026-08-11. Другие репозитории не считались, и там соотношение может быть иным.",
        "Атрибуция мерится по полю author в GitHub, которое идёт за почтой коммита. Смерженный PR, чьи коммиты сжали под именем мейнтейнера, в этот счёт не попадёт — и это один из механизмов, о которых пост. Значит девять — это пол, а не потолок.",
        "Ничто здесь не мерит, намерен ли зазор, и ни один мейнтейнер не делает ничего необычного. Squash-merge — поведение по умолчанию у большинства проектов."
      ]
    }
  },
  {
    "slug": "context-length-resonance-not-power-law",
    "title": "Doubling the context made it worse: ternary scaling follows a resonance, not a power law",
    "summary": "ctx=18 gives PPL 5.58, ctx=27 gives 2.96, ctx=54 gives 6.05 — worse than the baseline. Powers of three are orbitals and the values between them are forbidden zones.",
    "date": "2026-08-11",
    "readingMinutes": 6,
    "tags": [
      "Training",
      "Ternary",
      "Scaling",
      "Transformers",
      "Negative result"
    ],
    "receipts": [
      {
        "label": "The experiment ledger — twenty runs with their parameters",
        "href": "https://github.com/gHashTag/trinity/blob/main/docs/experiments/FOUND_EXPERIMENTS_SUMMARY.md"
      },
      {
        "label": "The model catalogue, by family and branch",
        "href": "https://github.com/gHashTag/trinity/blob/main/docs/research/COMPLETE_MODEL_CATALOG.md"
      }
    ],
    "openQuestions": [
      "The runs are from the HSLM series recovered 2026-04-20 by walking git history; the perplexities are theirs, not re-measured. Published 2026-08-11.",
      "These are HSLM runs at small scale. Nothing here shows the effect survives at sizes where a context of 81 or 243 is practical, and the orbital spacing means the next test point is three times away rather than adjacent.",
      "The mechanism is asserted from the ratio structure, not derived. Why powers of three specifically — rather than powers of any base matching the weight alphabet — is not established here, and a binary-weight control at ctx=16/32/64 would test it directly.",
      "Perplexity ranges are reported per configuration (ctx=27 gives 2.96–5.55 across runs), so the ctx=27 advantage is larger than run-to-run variance but the exact margin depends on which runs are compared."
    ],
    "published": true,
    "ru": {
      "title": "Удвоение контекста ухудшило результат: троичное масштабирование это резонанс, а не степенной закон",
      "summary": "ctx=18 даёт PPL 5.58, ctx=27 даёт 2.96, ctx=54 даёт 6.05 — хуже базы. Степени тройки это орбитали, а значения между ними — запрещённые зоны.",
      "openQuestions": [
        "Это прогоны HSLM на малом масштабе. Ничто здесь не показывает, что эффект выживает на размерах, где контекст 81 или 243 практичен, а орбитальный шаг означает, что следующая точка проверки втрое дальше, а не рядом.",
        "Механизм заявлен из структуры отношений, а не выведен. Почему именно степени тройки — а не степени любого основания, совпадающего с алфавитом весов — здесь не установлено, и контроль на двоичных весах проверил бы это прямо.",
        "Перплексии приводятся диапазонами на конфигурацию (ctx=27 даёт 2.96–5.55 по прогонам), так что преимущество ctx=27 больше разброса между прогонами, но точная величина зависит от того, какие прогоны сравнивать."
      ]
    }
  },
  {
    "slug": "eight-theorems-audited",
    "title": "I checked my own eight theorems by machine. Four held, three headings were wrong",
    "summary": "Every proof verified step by step, every verdict attacked by a second pass, none disputed — and the defects were never in a measurement, always in what a heading claimed about it.",
    "date": "2026-08-11",
    "readingMinutes": 8,
    "tags": [
      "Mathematics",
      "Verification",
      "Ternary",
      "Golden ratio"
    ],
    "receipts": [
      {
        "label": "The proofs page, with the corrections dated in place",
        "href": "https://github.com/gHashTag/trinity/blob/main/docs/docs/math-foundations/proofs.md"
      },
      {
        "label": "Lucas numbers L(2n) — OEIS A000032",
        "href": "https://oeis.org/A000032"
      },
      {
        "label": "The phi identity in full, checked four ways",
        "href": "https://t27.ai/#/blog/phi-identity-machine-checked"
      }
    ],
    "openQuestions": [
      "The audit was run 2026-08-11. The theorems themselves date from the proofs page as it stood before that; the corrections are dated in place there.",
      "The audit checked arithmetic, derivation and prior art. It did not check whether the theorems are useful, and a correct standard result cited correctly can still be the wrong thing to build on.",
      "Theorem 6’s isolation search covered b <= 16, e in 2..8, k <= 20. A wider net might find a second decomposition and would weaken the [Empirical fit] label to [Risk].",
      "Observation 7 still has no stated domain. Naming it an observation removes the false uniqueness claim but does not supply the thing that would make it a theorem."
    ],
    "published": true,
    "ru": {
      "title": "Я проверил машиной восемь своих теорем. Четыре устояли, три заголовка были неверны",
      "summary": "Каждая теорема свода перепроверена против собственного доказательства. Четыре устояли. Одна сузилась, одна перестала быть теоремой, одна оказалась дубликатом другой.",
      "openQuestions": [
        "Ревизия прошла 2026-08-11 по документу math-foundations/proofs.md; правки внесены на месте и датированы там же.",
        "Проверялись доказательства, а не численные подтверждения. Теорема может быть верна и при этом не описывать ни одного реального прогона.",
        "Восемь — это то, что было записано как теоремы. Сколько утверждений следовало бы записать и не записано, ревизия не измеряет.",
        "Дубликат найден по совпадению формулировок. Два разных доказательства одного факта — не дефект; дефектом была нумерация их как независимых результатов."
      ]
    }
  },
  {
    "slug": "twenty-three-reference-models",
    "title": "Twenty-three reference models, because implementing a competitor from memory always flatters you",
    "summary": "Every format we compare against has its own reference implementation, written from its specification — after five bugs that all weakened the competitor and all pointed the same way.",
    "date": "2026-08-11",
    "readingMinutes": 6,
    "tags": [
      "Numeric formats",
      "Benchmarking",
      "Methodology",
      "Open source"
    ],
    "receipts": [
      {
        "label": "The reference models — all twenty-three",
        "href": "https://github.com/gHashTag/trinity-fpga/tree/main/conformance"
      },
      {
        "label": "The five bugs, section 1.1",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/main/research/block/FINDINGS.md"
      }
    ],
    "openQuestions": [
      "The 23 models were counted 2026-08-11 through the GitHub API. The five bugs are from the block-quantisation campaign recorded in FINDINGS.md, earlier.",
      "Twenty-three models is not twenty-three formats: several cover multiple widths (posit8/16/32, fp8 as both E4M3 and E5M2), so the format count is higher and is not stated here because it has not been counted.",
      "A reference model written from a specification can still misread the specification. These are checked against published test vectors where those exist, and where they do not the model is only as good as the reading.",
      "Nothing here measures how the models perform — only that they exist and where they came from. A correct competitor implementation is a precondition for a fair comparison, not a result."
    ],
    "published": true,
    "ru": {
      "title": "Двадцать три эталонные модели, потому что реализация конкурента по памяти всегда льстит",
      "summary": "У каждого формата, с которым мы сравниваемся, своя эталонная реализация по его спецификации — после пяти ошибок, каждая из которых ослабляла конкурента и все в одну сторону.",
      "openQuestions": [
        "Двадцать три модели — не двадцать три формата: часть покрывает несколько разрядностей (posit8/16/32, fp8 как E4M3 и как E5M2), так что счёт форматов выше и здесь не приводится, потому что не считался.",
        "Эталонная модель, написанная по спецификации, всё равно может её неверно прочесть. Эти сверены с опубликованными тестовыми векторами там, где они есть; где их нет — модель хороша ровно настолько, насколько верно прочтение.",
        "Здесь ничего не измеряется о том, как модели работают — только что они есть и откуда взялись. Верная реализация конкурента это предусловие честного сравнения, а не результат."
      ]
    }
  },
  {
    "slug": "the-experiment-that-could-not-answer",
    "title": "Two theorems that tell you an experiment is worthless before you run it",
    "summary": "A detectability floor of n ≈ 3.92/Δ² said the sweep could not resolve the effect at any outcome, and a sticky-OR readout carried literally zero bits. Both knowable in advance.",
    "date": "2026-08-11",
    "readingMinutes": 6,
    "tags": [
      "Statistics",
      "Measurement",
      "FPGA",
      "Methodology"
    ],
    "receipts": [
      {
        "label": "The bring-up campaign these came out of",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/main/docs/HW_CAMPAIGN_AX7203_2026_07_30.md"
      },
      {
        "label": "The four bench rules that follow from them",
        "href": "https://t27.ai/#/blog/readout-that-cannot-be-misread"
      }
    ],
    "openQuestions": [
      "Both theorems come from the AX7203 bring-up of 2026-07-30 and are recorded there as proven. Published 2026-08-11.",
      "The 3.92 constant is for two proportions at alpha = 0.05 and power 0.8. Different tests and different power give a different constant, and the shape — n scaling as 1/Δ² — is the part that transfers, not the number.",
      "The zero-information result is exact for a saturating aggregator over a window that is certain to contain a high sample. Where saturation is not certain the mutual information is small rather than zero, and how small depends on the rate.",
      "Both theorems say an experiment cannot answer. Neither says what experiment would, and designing that is the harder half."
    ],
    "published": true,
    "ru": {
      "title": "Две теоремы, осуждающие эксперимент до его запуска",
      "summary": "Порог обнаружимости n ≈ 3.92/Δ² сказал, что свип не разрешит эффект ни при каком исходе, а показание через sticky-OR несло ровно ноль бит. Оба известны заранее.",
      "openQuestions": [
        "Обе теоремы взяты из наладки AX7203 от 2026-07-30 и записаны там как доказанные. Опубликовано 2026-08-11.",
        "Константа 3.92 — для двух долей при α = 0.05 и мощности 0.8. Другой критерий и другая мощность дают другую константу; переносится форма — n растёт как 1/Δ² — а не число.",
        "Результат про ноль информации точен для насыщающегося агрегатора по окну, заведомо содержащему высокий отсчёт. Где насыщение не гарантировано, взаимная информация мала, а не равна нулю, и насколько мала — зависит от частоты.",
        "Обе теоремы говорят, что эксперимент не может ответить. Ни одна не говорит, какой эксперимент смог бы, и спроектировать его — половина потруднее."
      ]
    }
  },
  {
    slug: 'the-auditor-made-the-mistake-it-audits',
    title: 'The auditor made the mistake it audits',
    summary: 'A mutation tool took a gate suite from four gates with no negative control to none, and from twenty surviving mutants to zero. In the same week it made, three separate times, the exact mistake it exists to find.',
    date: '2026-08-23',
    readingMinutes: 9,
    tags: ['CI', 'Mutation testing', 'Measurement', 'Self-critique'],
    receipts: [
      { label: 'gHashTag/t27 #2500 -- the invert flag that printed its banner over a silent run', href: 'https://github.com/gHashTag/t27/pull/2500' },
      { label: 'gHashTag/t27 #2502 -- the last survivor: every clause true, conclusion false', href: 'https://github.com/gHashTag/t27/pull/2502' },
      { label: 'gHashTag/t27 #2503 -- the boundary operator, and the first number that counted docstrings', href: 'https://github.com/gHashTag/t27/pull/2503' },
      { label: 'gHashTag/t27 #2504 -- three boundaries closed, one classification corrected', href: 'https://github.com/gHashTag/t27/pull/2504' },
    ],
    openQuestions: [
      'Whether a fifth operator family would find more is not established. Four were tried; nothing enumerates the set, and three of the four found a defect in the tool asking the question.',
      'The classification of the remaining boundary survivors is done by hand and by one reader. Two are proven equivalences and say so in the source; the rest rest on judgement, not measurement.',
      'The counts cover the gate scripts under tools/ in one repository. Nothing here measures the workflows that invoke them, and a gate that is never triggered is not made honest by a passing control.',
      '"No mutant survives" is not "the gates are correct". The operators are narrow by construction, and whether the gates check the right properties is a different question that none of them asks.',
    ],
    published: true,
    ru: {
      title: 'Аудитор совершил ошибку, которую ищет',
      summary: 'Мутационный инструмент довёл набор гейтов от четырёх без негативного контроля до нуля таких и от двадцати выживших мутантов до нуля. За ту же неделю он трижды совершил ровно ту ошибку, ради поиска которой написан.',
      openQuestions: [
        'Найдёт ли что-нибудь пятое семейство операторов — не установлено. Испробованы четыре; множество ничем не перечислено, и три из четырёх нашли дефект в самом задающем вопрос инструменте.',
        'Классификация оставшихся граничных выживших сделана вручную и одним читателем. Две — доказанные эквивалентности и говорят об этом в исходнике; остальные держатся на суждении, а не на измерении.',
        'Счёт покрывает скрипты гейтов в tools/ одного репозитория. Ничто здесь не измеряет workflow, которые их вызывают, а гейт, который никогда не запускается, не становится честным от проходящего контроля.',
        '«Ни один мутант не выживает» — не то же, что «гейты верны». Операторы узки по построению, и проверяют ли гейты нужные свойства — другой вопрос, которого ни один из них не задаёт.',
      ],
    },
  },
  {
    slug: 'i-wrote-the-post-then-did-the-thing',
    title: 'I wrote the post, then did the thing',
    summary: 'Two posts in this series are about gates that fail without changing anyone behaviour. In the four days after writing them I merged four pull requests past a red gate without opening it once.',
    date: '2026-08-23',
    readingMinutes: 6,
    tags: ['CI', 'Attention', 'Self-critique'],
    receipts: [
      { label: 'gHashTag/t27 #2474 -- the measurement: same step, same six targets, four consecutive pull requests', href: 'https://github.com/gHashTag/t27/issues/2474' },
      { label: 'gHashTag/t27 #2455 -- the required check that was a shell command printing a sentence', href: 'https://github.com/gHashTag/t27/issues/2455' },
    ],
    openQuestions: [
      'Whether the gate failure is a code generation defect alone is not established here: six targets do not run, and what they would report if they did is unmeasured.',
      'The last master run of this gate failed at a DIFFERENT step, three days earlier. Whether that failure is also live today is not shown.',
      'The claim that no cost was incurred rests on the four pull requests being unable to affect a code generator. That is an argument from what they touched, not a measurement of what they changed.',
      'No remedy is proposed and none should be read in: making these gates required, or moving them to manual dispatch, is a repository-settings decision.',
    ],
    published: true,
    ru: {
      title: 'Написал пост — и сделал то, о чём он',
      summary: 'Два поста этой серии — про гейты, которые падают, ничьё поведение не меняя. За четверо суток после их написания я смержил четыре пул-реквеста мимо красного гейта, ни разу его не открыв.',
      openQuestions: [
        'Является ли отказ гейта дефектом одной лишь кодогенерации — здесь не установлено: шесть целей не запускаются, и что бы они сообщили, не измерено.',
        'Последний прогон этого гейта на master падал на ДРУГОМ шаге, тремя днями раньше. Жив ли тот отказ сегодня — не показано.',
        'Утверждение «это ничего не стоило» опирается на то, что четыре пул-реквеста не могли задеть кодогенератор. Это довод от того, что они трогали, а не измерение того, что они изменили.',
        'Никакого лекарства не предлагается и не следует вычитывать: сделать эти гейты обязательными или перевести на ручной запуск — решение по настройкам репозитория.',
      ],
    },
  },
  {
    slug: 'the-scanner-scored-what-it-could-not-see',
    title: 'The scanner scored what it could not see',
    summary: 'A mutation tool reported a gate as having no failure path. The gate has four -- all of them ternaries, a form the scanner did not recognise, so it scored them as covered.',
    date: '2026-08-23',
    readingMinutes: 7,
    tags: ['CI', 'Mutation testing', 'Measurement', 'Self-critique'],
    receipts: [
      { label: 'gHashTag/t27 #2470 -- the scanner fix, and the four unit tests including two negative directions', href: 'https://github.com/gHashTag/t27/pull/2470' },
      { label: 'gHashTag/t27 #2468 -- the survivor the tool invented, and the corrected numbers', href: 'https://github.com/gHashTag/t27/issues/2468' },
    ],
    openQuestions: [
      'Whether other syntactic forms of a failing exit are still invisible is not established: the scanner now knows three, and nothing enumerates the set.',
      'The twenty surviving mutants are not shown to be defects. A survivor means nothing proves the gate will stay right, not that it is wrong today.',
      'The mutation operator is a single one -- a verdict forced to zero. Inverting a condition is a different class this run does not cover.',
      'A survivor can mean an unreachable site rather than an uncovered one, and the tool still does not separate the two.',
    ],
    published: true,
    ru: {
      title: 'Сканер засчитал то, чего не видел',
      summary: 'Мутационный инструмент сообщил, что у гейта нет путей отказа. Их четыре — все тернарники, форма, которой сканер не знал, и потому засчитал их покрытыми.',
      openQuestions: [
        'Остались ли невидимыми другие синтаксические формы падающего выхода — не установлено: сканер знает три, и множество никем не перечислено.',
        'Двадцать выживших мутантов не показаны дефектами. Выживший значит «ничто не доказывает, что гейт останется верным», а не «он неверен сейчас».',
        'Мутационный оператор один — вердикт, принудительно обнулённый. Инвертирование условия это другой класс, и он здесь не покрыт.',
        'Выживший может означать недостижимый сайт, а не непокрытый, и инструмент их по-прежнему не разделяет.',
      ],
    },
  },
  {
    slug: 'the-control-that-could-not-fail',
    title: 'The control that could not fail',
    summary: 'Four gates had never been seen red. Writing their negative controls produced one that reported every branch red while the gate it guarded printed OK on a broken catalog.',
    date: '2026-08-23',
    readingMinutes: 9,
    tags: ['CI', 'Negative controls', 'Mutation testing', 'Self-critique'],
    receipts: [
      { label: 'gHashTag/t27 #2467 — the four controls, and the end-to-end layer the first draft lacked', href: 'https://github.com/gHashTag/t27/pull/2467' },
      { label: 'gHashTag/t27 #2465 — four gates with no negative control, and a claim that was not reproducible', href: 'https://github.com/gHashTag/t27/issues/2465' },
      { label: 'gHashTag/t27 #2468 — nine gates whose controls cover the verdict path but not the precondition path', href: 'https://github.com/gHashTag/t27/issues/2468' },
    ],
    openQuestions: [
      'Whether the nine gates with surviving mutants stay correct is not established here: the six baseline-backed ones were checked by hand and go red correctly today, and that is a dated observation, not a standing property.',
      'The shared control pattern for the precondition class is proposed and not written; whether one pattern really covers all six is untested.',
      'The mutation operator is a single one — a verdict-returning line forced to zero. A gate can be broken in ways this operator never produces, so "all killed" bounds one failure mode, not all of them.',
      'A surviving mutant can mean the site is unreachable rather than uncovered, and this run does not separate the two.',
    ],
    published: true,
    ru: {
      title: 'Контроль, который не мог упасть',
      summary: 'Четыре гейта никогда не видели красными. Написание негативных контролей дало один, который рапортовал «все ветки красные», пока охраняемый им гейт печатал OK на сломанном каталоге.',
      openQuestions: [
        'Останутся ли верными девять гейтов с выжившими мутантами — здесь не установлено: шесть baseline-гейтов проверены руками и краснеют корректно сегодня, а это датированное наблюдение, а не постоянное свойство.',
        'Общий образец контроля для класса предусловий предложен, но не написан; покроет ли один образец все шесть — не проверено.',
        'Мутационный оператор здесь один — строка вердикта, принудительно обнулённая. Гейт можно сломать способами, которых этот оператор не порождает: «все убиты» ограничивает одну форму отказа, а не все.',
        'Выживший мутант может означать недостижимый сайт, а не непокрытый, и этот прогон их не разделяет.',
      ],
    },
  },
  {
    slug: 'ternary-won-the-wire-not-the-gate',
    title: 'Ternary won the wire; it did not win the gate',
    summary: 'Base economy is a theorem, not a measurement: 5.66 percent in a 1950 vacuum-tube cost model, a win on the wire in USB4 v2 and GDDR7, and a loss at the gate on noise margin.',
    date: '2026-08-22',
    readingMinutes: 9,
    tags: ['Number formats', 'Arithmetic', 'Signalling', 'History', 'Self-critique'],
    receipts: [
      { label: 'ERA, High-Speed Computing Devices (McGraw-Hill, 1950) — the cost model and its own caveat, pp. 84–87', href: 'https://archive.org/details/HighSpeedComputingDevices' },
      { label: 'J. Steiner, Journal für die reine und angewandte Mathematik 40:208, 1850', href: 'https://www.digizeitschriften.de/download/PPN243919689_0040/PPN243919689_0040___log28.pdf' },
      { label: 'Optimal radix choice — Wikipedia (averaged E(b,N) table)', href: 'https://en.wikipedia.org/wiki/Optimal_radix_choice' },
      { label: 'Steve Weis — Revisiting Radix Economy', href: 'https://saweis.net/posts/Revisiting-Radix-Economy.html' },
      { label: 'Brian Hayes, Third Base, American Scientist 89(6):490, 2001 — ferrite-core pair per trit, 50 machines', href: 'https://web.williams.edu/Mathematics/sjmiller/public_html/105Sp10/addcomments/Hayes_ThirdBase.htm' },
      { label: 'МЦВМ «Сетунь» — Виртуальный компьютерный музей', href: 'https://www.computer-museum.ru/histussr/12-6.htm' },
      { label: 'USB-IF — USB 80G PHY background (PAM-3, 11b/7t, margin table)', href: 'https://www.usb.org/sites/default/files/USB%2080G%20PHY%20background.pdf' },
      { label: 'JEDEC JESD239 GDDR7 press release, 5 March 2024', href: 'https://www.jedec.org/news/pressreleases/jedec-publishes-gddr7-graphics-memory-standard' },
      { label: 'IEEE 802.3bz TF, Souvignier/Feyh, May 2015 — 2.5G/5GBASE-T is PAM-16 / 128-DSQ, not PAM-3', href: 'https://www.ieee802.org/3/bz/public/may15/Souvignier_3bz_01_0515.pdf' },
      { label: 'arXiv:2402.17764 — The Era of 1-bit LLMs (BitNet b1.58)', href: 'https://arxiv.org/abs/2402.17764' },
      { label: 'arXiv:2504.12285 — BitNet b1.58 2B4T Technical Report', href: 'https://arxiv.org/abs/2504.12285' },
      { label: 'arXiv:2207.04839 — Etiemble, ternary and quaternary CNTFET adders less efficient than binary for CPAs', href: 'https://arxiv.org/abs/2207.04839' },
      { label: 'Takbiri, Faghih Mirzaee, Navi, CSSP 38(9):4280–4301, 2019 — overstated noise margins in MVL', href: 'https://link.springer.com/article/10.1007/s00034-019-01063-8' },
      { label: 'The Register, 18 March 2026 — ternary CPU on FPGA (5500FP), two bits per trit', href: 'https://www.theregister.com/2026/03/18/ternary_cpu_on_fpga/' }
    ],
    openQuestions: [
      'Nothing in this post is our measurement: it is a reading of sources, not an experiment on the ALINX AX7203 board and not a silicon result.',
      'The circulating "8,487 values" count and the "40× transistors per trit" figure have no primary source and are not used.',
      'A 2019 Nature Electronics fabricated ternary CNTFET inverter was not found; whether 46 or 50 Setun machines were built stays unresolved.',
      'PAM-3 in mainstream FPGA transceivers is unconfirmed in the checked AMD Versal and Altera Agilex material.',
      'It does not establish any FPGA or silicon cost comparison between ternary and binary arithmetic; the proposed adder experiment has not been run.'
    ],
    published: true,
    ru: {
      title: 'Троичность выиграла провод, но не вентиль',
      summary: 'Экономичность основания — теорема, а не измерение: 5,66 процента в ламповой модели 1950 года, победа на проводе в USB4 v2 и GDDR7 и проигрыш на вентиле по запасу помехоустойчивости.',
      openQuestions: [
        'Ничего в посте не измерено нами: это чтение источников, а не эксперимент на плате ALINX AX7203 и не результат на кристалле.',
        'Ходячее число «8 487 значений» и цифра «40 крат транзисторов на трит» — без первоисточника и не используются.',
        'Публикация Nature Electronics 2019 с изготовленным троичным CNTFET-инвертором не найдена; 46 или 50 «Сетуней» — расхождение остаётся неразрешённым.',
        'PAM-3 в трансиверах mainstream-FPGA не подтверждён в проверенных материалах AMD Versal и Altera Agilex.',
        'Пост не устанавливает никакого сравнения стоимости троичной и двоичной арифметики на FPGA или в кремнии; предложенный замер сумматора не поставлен.'
      ]
    }
  },
  {
    slug: 'the-required-check-was-an-echo',
    title: 'The required check was an echo',
    summary: "One of four required status checks — the ones a branch ruleset will not let a merge past — was a shell command that prints a sentence. Twenty lines, no logic, green on every pull request, required for months. Meanwhile the test suite it was believed to be has never blocked a merge, and thirteen tests fail on the main branch indefinitely because nothing was waiting for them.",
    date: '2026-08-23',
    readingMinutes: 6,
    tags: ['CI', 'Process', 'Measurement', 'Self-critique'],
    receipts: [
      { label: 'The finding, with the three repair options and their costs', href: 'https://github.com/gHashTag/t27/issues/2455' },
      { label: 'The thirteen failing tests, filed long before this', href: 'https://github.com/gHashTag/t27/issues/2292' },
      { label: 'The companion case: a gate that fires, and is merged past anyway', href: 'https://github.com/gHashTag/t27/pull/2450' },
      { label: 'The audit that named the reach class this belongs to', href: 'https://github.com/gHashTag/t27/issues/2325' }
    ],
    openQuestions: [
      'Whether the thirteen failures reproduce on the CI platform is NOT established. They were measured on a different one, and at least one is recorded in older notes as platform-specific. That question has to be answered before pointing the required check at the suite.',
      'Both repairs are branch-ruleset changes, which are repository security settings. Filed with their costs; neither taken. Pointing `check` at the suite blocks every merge until the failures are resolved or ledgered; removing it from the required set costs nothing immediately and makes the list honest at three.',
      'How long the placeholder has been required is not measured here — only that it predates the run window the API returns. The workflow comment says the logic will be added later, and gives no date.'
    ],
    published: true,
    ru: {
      title: 'Обязательная проверка оказалась эхом',
      summary: 'Одна из четырёх обязательных проверок — тех, мимо которых правило ветки не пропустит мерж — оказалась командой оболочки, печатающей предложение. Двадцать строк, никакой логики, зелёная на каждом пул-реквесте, обязательна месяцами. При этом тестовый набор, за который её принимали, никогда не блокировал мерж, и тринадцать тестов падают на главной ветке бессрочно, потому что их никто не ждал.',
      openQuestions: [
        'Воспроизводятся ли те тринадцать падений на платформе CI — НЕ установлено. Мерились они на другой, и хотя бы одно записано в старых заметках как платформенно-специфичное. На этот вопрос нужно ответить прежде, чем направлять обязательную проверку на набор.',
        'Обе починки — правки правила ветки, то есть настройки безопасности репозитория. Заведены с ценой каждой; ни одна не сделана. Направить `check` на набор — заблокировать каждый мерж до устранения или занесения падений в реестр; убрать из обязательного набора — не стоит ничего немедленно и делает список честным на трёх.',
        'Как долго заглушка была обязательной — здесь не измерено; известно лишь, что дольше окна прогонов, которое отдаёт API. Комментарий в workflow обещает добавить логику позже и не называет даты.'
      ]
    }
  },
  {
    slug: 'the-gate-was-right-and-nothing-stopped',
    title: 'The gate was right and nothing stopped',
    summary: "A gate that guards against retracted numbers re-entering live documents caught a violation on the pull request that introduced it — right file, right lines, exit 1 — and the pull request merged anyway, because it is not a required check. It stayed red on main through two more merges. This is the third variant of a reach failure: not ‘it never runs’, not ‘it runs on the wrong diff’, but ‘it runs, it fails, it names the exact lines, and nothing waits for the answer’.",
    date: '2026-08-23',
    readingMinutes: 6,
    tags: ['CI', 'Measurement', 'Self-critique', 'Process'],
    receipts: [
      { label: 'The hardening the note was about — 6 of 7 registry rows could vanish silently', href: 'https://github.com/gHashTag/t27/pull/2447' },
      { label: 'The fix: figures removed from the prose, not added to the exemption list', href: 'https://github.com/gHashTag/t27/pull/2450' },
      { label: 'The audit that named the reach class, and the two variants before this one', href: 'https://github.com/gHashTag/t27/issues/2325' },
      { label: 'Variant one, closed: a self-test present in the tree and invoked by nothing', href: 'https://github.com/gHashTag/t27/pull/2451' }
    ],
    openQuestions: [
      'Whether this gate joins the required set is an owner decision, not an automated one: a branch ruleset is a repository security setting, and quietly widening what blocks other people\u2019s merges is not a repair. Filed, not done.',
      'Two other gates in the same repository are red on main permanently — one has no green run in the last hundred. Their permanent redness is the reason a genuinely new failure in that column reads as background, and no decision has been taken about either.',
      'The figure never reached a reader: no published post carries it and the document is repository-internal. That is a fact about this incident, not a property of the mechanism — nothing in the pipeline made it so.'
    ],
    published: true,
    ru: {
      title: 'Гейт был прав, и ничто не остановилось',
      summary: 'Гейт, охраняющий живые документы от отозванных чисел, поймал нарушение на том же пул-реквесте, который его и внёс — нужный файл, нужные строки, код 1 — и пул-реквест всё равно смержился, потому что он не обязателен. Третий вариант отказа по достижимости: не «не запускается» и не «запускается не на том диффе», а «запускается, падает, называет точные строки — и ответа никто не ждёт».',
      openQuestions: [
        'Войдёт ли этот гейт в обязательный набор — решение владельца, не автомата: правила ветки — это настройка безопасности, и тихо расширить то, что блокирует чужие мержи, — не починка. Заведено, не сделано.',
        'Два других гейта в том же репозитории красны на main постоянно — у одного нет зелёного прогона за последнюю сотню. Именно эта постоянная краснота делает новый отказ в той же колонке фоном, и ни по одному решения не принято.',
        'Число до читателя не дошло: ни один опубликованный пост его не несёт, документ внутренний. Это факт об инциденте, а не свойство механизма — ничто в конвейере его не обеспечило.'
      ]
    }
  },
  {
    slug: 'the-ratchet-counted-a-total-as-an-error',
    title: 'The ratchet counted a total as an error',
    summary: "A gate written to stop elaboration errors creeping back reported 186 of them; 25 were the compiler's own summary line saying how many errors it had found. The number had already reached commit messages and a status page. This is the proof that could not have come out any other way, the live emitter defect that was hiding inside the count, why fixing it made the number worse, and one fix that was built, measured, and thrown away.",
    date: '2026-08-23',
    readingMinutes: 8,
    tags: ['CI', 'Measurement', 'Self-critique', 'FPGA', 'Compilers'],
    receipts: [
      { label: 'The phantom count, with the three quantities that agree on 25', href: 'https://github.com/gHashTag/t27/pull/2435' },
      { label: 'The emitter defect that was hiding inside the number', href: 'https://github.com/gHashTag/t27/pull/2438' },
      { label: 'The full classification of all 161 errors', href: 'https://github.com/gHashTag/t27/issues/2325' },
      { label: 'The fix that was measured as a regression and discarded', href: 'https://github.com/gHashTag/t27/issues/2439' },
      { label: 'The three lessons, written into the gate skill', href: 'https://github.com/gHashTag/t27/pull/2437' }
    ],
    openQuestions: [
      'The count is instrument-relative: it is produced by one iverilog version, and an upgrade on the runner can move it without any compiler change. The baseline now records the version and names a mismatch instead of reporting it as a regression, but no cross-version measurement has been taken.',
      'Two design decisions still own 64 of the 161 errors: what a string field means in generated hardware, and whether unsized array parameters should be rejected at typecheck. Both are filed with costs and a recommendation; neither is decided.',
      'A separate seal-coverage gate has failed on master in every one of the last hundred runs, reporting 136 stale seals, while its own negative self-check passes. It is not a required check, so it blocks nothing — which is the more dangerous reading, not the milder one.'
    ],
    published: true,
    ru: {
      title: 'Храповик посчитал итог за ошибку',
      summary: 'Гейт, написанный чтобы ошибки элаборации не возвращались, сообщил про 186 штук; 25 из них были собственной итоговой строкой компилятора о том, сколько ошибок он нашёл. Число уже успело уехать в коммиты и на страницу статуса. Доказательство, которое не могло получиться иначе, живой дефект эмиттера, прятавшийся внутри счёта, почему от починки число стало хуже, и одна починка, которую построили, измерили и выбросили.',
      openQuestions: [
        'Число зависит от прибора: его выдаёт одна версия iverilog, и обновление на раннере сдвинет его без единой правки компилятора. Baseline теперь хранит версию и называет расхождение вместо того, чтобы читать его как регрессию, но межверсионного замера никто не делал.',
        'За 64 из 161 ошибки по-прежнему отвечают два решения: что значит строковое поле в сгенерированном железе и надо ли отвергать безразмерные массивы-параметры на typecheck. Оба заведены с ценой и рекомендацией; ни одно не принято.',
        'Отдельный гейт печатей падает на master во всех ста последних прогонах, сообщая про 136 устаревших печатей, при этом его собственный негативный самоконтроль проходит. Он не обязателен и ничего не блокирует — и это более опасное чтение, а не более мягкое.'
      ]
    }
  },
  {
    slug: 'four-hundred-and-twelve-tests-that-were-sentences',
    title: 'Four hundred and twelve tests that were sentences',
    summary: 'Thirty-four conformance vector files, 512 cases, zero ever executed — and when counted, 412 of those cases carried no inputs and no expected values at all. This is how a corpus becomes decorative, why the first classifier reported 147 where an independent pass said 100, and the three-verdict registry (executed / numbered debt / aspirational) that lets a small true number replace a large false one.',
    date: '2026-08-22',
    readingMinutes: 7,
    tags: ['Testing', 'CI', 'FPGA', 'Measurement', 'Self-critique'],
    receipts: [
      { label: 'The lane where the corpus was first executed at all', href: 'https://github.com/gHashTag/t27/issues/2241' },
      { label: 'The measurement, with the instrument contradiction disclosed', href: 'https://github.com/gHashTag/t27/pull/2421' },
      { label: 'The ratchet: a new prose-only vector file now fails CI', href: 'https://github.com/gHashTag/t27/pull/2423' },
      { label: 'Second module executed, and a self-correction on what was blocked', href: 'https://github.com/gHashTag/t27/pull/2422' }
    ],
    openQuestions: [
      'What happens to the 24 prose-only files is an owner decision: give them data, move them somewhere that does not read as coverage, or delete them. The gate only stops the 25th.',
      'Nine data-carrying files remain unexecuted; three of them are blocked by real elaboration errors, and the deepest blocker (slice parameters lowering to scalars) is a corpus-wide language decision affecting 2,313 occurrences across 237 specs.',
      'Executed coverage is 21 cases across two modules (18 + 3). The body of this post first said nineteen for the first module; the runner prints eighteen, and the correction is stated in place rather than made silently.'
    ],
    published: true,
    ru: {
      title: 'Четыреста двенадцать тестов, которые были предложениями',
      summary: 'Тридцать четыре файла conformance-векторов, 512 кейсов, ни один никогда не исполнялся — а когда посчитали, 412 из них не несли ни входов, ни ожидаемых значений. Как корпус становится декоративным, почему первый классификатор дал 147 там, где независимый проход дал 100, и трёхвердиктный реестр (исполняется / именованный долг / аспирационное), позволяющий заменить большое ложное число маленьким истинным.',
      openQuestions: [
        'Судьба 24 описательных файлов — решение владельца: дать им данные, перенести туда, где они не читаются как покрытие, или удалить. Гейт лишь останавливает двадцать пятый.',
        'Девять файлов с данными не исполняются; три заблокированы настоящими ошибками элаборации, а глубочайший блокер (слайс-параметры, опускающиеся в скаляры) — корпусное языковое решение: 2313 вхождений в 237 спеках.',
        'Исполняемое покрытие — 21 кейс в двух модулях (18 + 3). В теле поста сначала стояло «девятнадцать» для первого; раннер печатает восемнадцать, и поправка сделана на месте, а не молча.'
      ]
    }
  },
  {
    "slug": "equal-stored-width-removed-an-accuracy-lead",
    "title": "Equal stored width removed an accuracy lead",
    "summary": "A corrected equal-stored-width remeasurement withdrew an earlier 2.1×/2.6× lead over takum and records the oracle and budget defects that changed the reading.",
    "date": "2026-08-21",
    "readingMinutes": 6,
    "tags": [
      "Measurement",
      "Reproducibility",
      "Self-critique",
      "FPGA",
      "Accuracy"
    ],
    "receipts": [
      {
        "label": "gHashTag/trinity PR #857 — merged correction and retraction",
        "href": "https://github.com/gHashTag/trinity/pull/857"
      },
      {
        "label": "Merged commit 22cd9596 — the site correction",
        "href": "https://github.com/gHashTag/trinity/commit/22cd9596b2688ba7eda68711a2b5be32b004d418"
      },
      {
        "label": "Equal-stored-width measurement note",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/main/research/TEKUM_VS_TNF_LINE_2026-08-19.md"
      }
    ],
    "openQuestions": [
      "This is an equal-stored-width software/oracle remeasurement, not a measurement on the binary ALINX AX7203 FPGA and not a custom-silicon result.",
      "It does not provide a head-to-head hardware comparison against takum.",
      "It does not establish downstream model accuracy, throughput, energy, or area.",
      "It does not establish a universal accuracy ranking for numerical formats; the corrected rows only replace one withdrawn claim."
    ],
    "published": true,
    "ru": {
      "title": "Равная ширина хранения сняла выигрыш по точности",
      "summary": "Повторное измерение при равной ширине хранения отозвало прежний выигрыш 2,1×/2,6× над takum и зафиксировало дефекты оракула и бюджета, изменившие интерпретацию.",
      "openQuestions": [
        "Это повторное измерение оракулов при равной ширине хранения, а не измерение на бинарной FPGA ALINX AX7203 и не результат на изготовленном кристалле.",
        "Оно не даёт прямого аппаратного сравнения с takum.",
        "Оно не устанавливает точность downstream-модели, пропускную способность, энергию или площадь.",
        "Оно не устанавливает универсальный рейтинг точности числовых форматов; исправленные строки только заменяют одно отозванное утверждение."
      ]
    }
  },
  {
    "slug": "thirty-epochs-exposed-a-failure-rate-blind-spot",
    "title": "Thirty epochs exposed a failure-rate blind spot",
    "summary": "A 30-epoch MNIST sweep showed why a failure-rate threshold needs the per-seed values beside it: a passing count can coexist with non-overlapping runs.",
    "date": "2026-08-20",
    "readingMinutes": 6,
    "tags": [
      "FPGA",
      "MNIST",
      "Measurement",
      "Reproducibility",
      "Self-critique"
    ],
    "receipts": [
      {
        "label": "gHashTag/trinity-fpga PR #660 — merged experiment and blind-spot correction",
        "href": "https://github.com/gHashTag/trinity-fpga/pull/660"
      },
      {
        "label": "Thirty-epoch report at the merged commit",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/21c72a2bd066e3041f6577c35d3189f02041c30e/docs/THIRTY-EPOCHS.md"
      },
      {
        "label": "Five-seed MNIST measurement JSON",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/21c72a2bd066e3041f6577c35d3189f02041c30e/research/arxiv_tnf/measurements/stability_mnist_30ep_2026-08-20.json"
      }
    ],
    "openQuestions": [
      "This is a measured MNIST training sweep, not a measurement on the ALINX AX7203 FPGA and not a silicon result.",
      "It does not establish a universal accuracy or failure-rate ranking for TNF4, fp6 e2m3, or fp6 e3m2.",
      "It does not show that a 60% threshold is the right threshold for another task, seed set, or training recipe.",
      "The experiment does not establish transfer beyond this MNIST configuration; the per-seed list improves the audit trail but does not remove that scope limit."
    ],
    "published": true,
    "ru": {
      "title": "Тридцать эпох выявили слепую зону доли отказов",
      "summary": "Тридцатиэпоховый sweep на MNIST показал, почему рядом с порогом по доле отказов нужны значения по каждому seed: счёт «прошёл» может сосуществовать с неперекрывающимися прогонами.",
      "openQuestions": [
        "Это измеренный обучающий sweep на MNIST, а не измерение на FPGA ALINX AX7203 и не результат на кремнии.",
        "Он не устанавливает универсальный рейтинг точности или доли отказов для TNF4, fp6 e2m3 или fp6 e3m2.",
        "Он не показывает, что порог 60% подходит для другой задачи, набора seed или рецепта обучения.",
        "Эксперимент не устанавливает переносимость за пределы этой конфигурации MNIST; список по seed улучшает аудит, но не снимает ограничение области."
      ]
    }
  },
  {
    slug: 'formal-was-green-and-had-never-run-a-solver',
    title: 'Formal was green and had never run a solver',
    summary: 'A formal verification job stayed green its whole life while three independent mechanisms each guaranteed it could never go red — pseudo-syntax configs, a pipe that tested tee instead of the tool, and continue-on-error over everything. Peeling it to the first genuine proof took seven named layers, including RTL four months older than the compiler under test and property files that never instantiated the DUT. It ends with the repository’s first real formal verdicts: fifo and mac, Status PASSED under z3.',
    date: '2026-08-20',
    readingMinutes: 8,
    tags: ['CI', 'Formal', 'FPGA', 'Debugging', 'Self-critique'],
    receipts: [
      { label: 'The audit issue: three vacuous greens, each confirmed by two refuters', href: 'https://github.com/gHashTag/t27/issues/2239' },
      { label: 'Layer 6 — formal tested April-vintage RTL shadowing the fresh artifact', href: 'https://github.com/gHashTag/t27/issues/2261' },
      { label: 'Layer 7 — props never instantiated the DUT', href: 'https://github.com/gHashTag/t27/issues/2265' },
      { label: 'The latch finding that parked the third module', href: 'https://github.com/gHashTag/t27/issues/2266' },
      { label: 'The master run with the first green formal carrying real verdicts', href: 'https://github.com/gHashTag/t27/actions/runs/32315356476' }
    ],
    openQuestions: [
      'The proven properties are thin: two of three modules currently expose no data ports, so their one provable invariant is a constant handshake line. The property sets are skeletons that grow with the ports — they are not a functional verification of FIFO or MAC semantics.',
      'The third module (uart) is parked on a real design defect: a latch with combinational feedback inferred by the code generator. Its invariant is simulation-checked (256/256), not proven.',
      'The conformance job remains honestly red: its vectors have never been executed against RTL, and its repair is a redesign, not a patch.'
    ],
    published: true,
    ru: {
      title: 'Формал был зелёным и ни разу не запускал солвер',
      summary: 'Задача формальной верификации оставалась зелёной всю жизнь, пока три независимых механизма гарантировали, что красной она стать не может: псевдо-синтаксис конфигов, пайп, проверявший tee вместо инструмента, и continue-on-error поверх всего. Путь до первого настоящего доказательства занял семь именованных слоёв — включая RTL на четыре месяца старше тестируемого компилятора и property-файлы, никогда не инстанцировавшие DUT. Финал — первые настоящие формальные вердикты репозитория: fifo и mac, Status PASSED под z3.',
      openQuestions: [
        'Доказанные свойства тонкие: два модуля из трёх пока не выставляют data-портов, и их единственный доказуемый инвариант — константная линия хендшейка. Наборы свойств — скелеты, растущие вместе с портами, а не функциональная верификация семантики FIFO или MAC.',
        'Третий модуль (uart) запаркован на настоящем дефекте дизайна: защёлка с комбинационной обратной связью, выведенная кодогенератором. Его инвариант проверен симуляцией (256/256), не доказан.',
        'Conformance-job остаётся честно красным: его векторы никогда не исполнялись против RTL, и ремонт — редизайн, а не патч.'
      ]
    }
  },
  {
    slug: 'fourteen-rows-agreed-one-did-not',
    title: 'Fourteen rows agreed; one did not',
    summary: 'A post-route CI run gives fifteen instrumented FPGA frequency rows a sourced comparison: fourteen fall inside the flow’s measured noise band, while LNS16 remains an explicit exception and one design is still uninstrumented.',
    date: '2026-08-19',
    readingMinutes: 6,
    tags: ['FPGA', 'CI', 'Measurement', 'Reproducibility', 'Self-critique'],
    receipts: [
      { label: 'gHashTag/trinity-fpga PR #624 — merged G8 verdict', href: 'https://github.com/gHashTag/trinity-fpga/pull/624' },
      { label: 'Public CI run 32263875250 — post-route measurement', href: 'https://github.com/gHashTag/trinity-fpga/actions/runs/32263875250' },
      { label: 'docs/G8-VERDICT.md at the merged commit', href: 'https://github.com/gHashTag/trinity-fpga/blob/6f0d1882efdad37f2af8cd415a50d2cd4ac45828/docs/G8-VERDICT.md' },
      { label: 'Merged commit 6f0d1882 — the published verdict', href: 'https://github.com/gHashTag/trinity-fpga/commit/6f0d1882efdad37f2af8cd415a50d2cd4ac45828' }
    ],
    openQuestions: [
      'This is post-route CI evidence for the target part, not a UART or physical-board measurement on the ALINX AX7203.',
      'The LNS16 mismatch has no diagnosed cause. An original log or an explicit supersession is still needed.',
      'The plastic-16bit row remains uninstrumented; its published frequency is not validated by this run.',
      'No throughput, energy, model-accuracy, or downstream-workload result is established by this audit.'
    ],
    published: true,
    ru: {
      title: 'Четырнадцать строк согласовались, одна — нет',
      summary: 'Post-route CI-прогон дал пятнадцати инструментированным строкам FPGA-частот сравнение с источником: четырнадцать попали внутрь измеренного шума потока, а LNS16 осталось явным исключением и один дизайн по-прежнему не инструментирован.',
      openQuestions: [
        'Это post-route-свидетельство CI для целевой детали, а не UART- или физическое измерение на плате ALINX AX7203.',
        'Причина расхождения LNS16 не установлена. Нужен исходный лог или явное указание, что опубликованная строка заменена.',
        'Строка plastic-16bit остаётся без инструментирования; её опубликованная частота этим прогоном не подтверждена.',
        'Этот аудит не устанавливает пропускную способность, энергию, точность модели или результат на downstream-нагрузке.'
      ]
    }
  },
  {
    slug: 'a-clean-merge-is-not-a-semantic-no-op',
    title: 'A clean merge is not a semantic no-op',
    summary: 'Two autonomous agents, one repository, a 643-commit wave merged mid-flight. The four textual conflicts were the safe part — three were comment-only and one was both sides fixing the same bug. The defect that reached master rode in on a hunk that merged cleanly: a device-default flip that a CI workflow relied on as an absence, which cannot conflict. It passed place-and-route on the wrong database and failed at the first step that looks a name up instead of trusting a path.',
    date: '2026-08-19',
    readingMinutes: 7,
    tags: ['CI', 'Git', 'Multi-agent', 'FPGA', 'Debugging'],
    receipts: [
      { label: 'The first master run after the merge — 7/8 green, fasm2frames red', href: 'https://github.com/gHashTag/t27/actions/runs/32255921048' },
      { label: 'Issue #2225 — the device-default regression, diagnosed', href: 'https://github.com/gHashTag/t27/issues/2225' },
      { label: 'PR #2226 — the one-flag fix: state the device explicitly', href: 'https://github.com/gHashTag/t27/pull/2226' },
      { label: 'PR #2216 — the fourteen-commit branch the wave merged against', href: 'https://github.com/gHashTag/t27/pull/2216' }
    ],
    openQuestions: [
      'The driver still does not assert that the chipdb filename and the requested device agree; the mismatch would then fail at place-and-route instead of two steps later. Filed as open work in #2225, not claimed as done.',
      'At the time of writing the first master run with the fix is queued, not finished — this post does not claim the green run it hopes for.',
      'The standing caveat is unchanged: no bitstream from this pipeline has ever been loaded onto a board.'
    ],
    published: true,
    ru: {
      title: 'Чистый merge — не семантический no-op',
      summary: 'Два автономных агента, один репозиторий, волна в 643 коммита, влитая посреди полёта. Четыре текстовых конфликта оказались безопасной частью — три были конфликтами комментариев, а в четвёртом обе стороны чинили один и тот же баг. Дефект, доехавший до master, приехал в чисто слившемся хабе: смена устройства по умолчанию, на которое CI-workflow опирался отсутствием флага, — а отсутствие конфликтовать не может. Он прошёл place-and-route по чужой базе и упал на первом шаге, который ищет имя, а не доверяет пути.',
      openQuestions: [
        'Драйвер по-прежнему не проверяет согласие имени файла базы кристалла с запрошенным устройством; тогда расхождение падало бы на place-and-route, а не двумя шагами позже. Записано открытой работой в #2225.',
        'На момент написания первый master-прогон с фиксом стоит в очереди, не завершён — пост не заявляет зелёного прогона, на который надеется.',
        'Постоянная оговорка неизменна: ни один битстрим этого конвейера не загружался в плату.'
      ]
    }
  },
  {
    slug: 'the-tail-that-had-never-run',
    title: 'The tail that had never run',
    summary: 'A bitstream-generating CI job was red for eleven days. Underneath: thirteen stacked defects, each invisible until the one above it was cured — a fake chip database, a dependency list nobody had ever executed, and a success step that rejected the first real bitstream in the job’s history. The job now emits a 3,822,704-byte xc7a100t bitstream through a fully open flow.',
    date: '2026-08-19',
    readingMinutes: 9,
    tags: ['CI', 'FPGA', 'openXC7', 'Debugging', 'Self-critique'],
    receipts: [
      { label: 'gHashTag/t27 PR #2216 — the pull request carrying all thirteen layers', href: 'https://github.com/gHashTag/t27/pull/2216' },
      { label: 'The first run to produce a real bitstream — fpga-bitstream job log', href: 'https://github.com/gHashTag/t27/actions/runs/32247529041' },
      { label: 'Issue #2214 — the red-since-birth diagnosis across jobs', href: 'https://github.com/gHashTag/t27/issues/2214' },
      { label: 'Issue #2215 — fpga-build: every job red, root causes enumerated', href: 'https://github.com/gHashTag/t27/issues/2215' },
      { label: 'openXC7/nextpnr-xilinx — the fork that actually contains the xilinx architecture', href: 'https://github.com/openXC7/nextpnr-xilinx' }
    ],
    openQuestions: [
      'The bitstream has never been loaded onto a board. The CI machine has no FPGA attached, so correctness beyond the toolchain’s own internal checks — including whether the design does anything at all on silicon — is unproven. Flashing on real hardware is the only test that counts, and it has not happened for this artifact.',
      'Timing comes from nextpnr’s model, not from measurement. No Fmax claim is made and none should be inferred.',
      'The flow builds the minimal profile only; the larger profiles have not been through the repaired pipeline.',
      'The apt-mirror hangs that burned whole timeout ceilings are bounded, not fixed — a retry-with-timeout patch for the install steps exists but has not landed.'
    ],
    published: true,
    ru: {
      title: 'Хвост, который никогда не исполнялся',
      summary: 'Собирающая битстрим CI-задача была красной одиннадцать дней. Под этим — тринадцать слоёв дефектов, каждый невидим, пока не вылечен верхний: фальшивая база кристалла, список зависимостей, который никто не исполнял, и шаг успеха, отвергнувший первый настоящий битстрим в истории задачи. Теперь задача выдаёт битстрим xc7a100t в 3 822 704 байта через полностью открытый поток.',
      openQuestions: [
        'Битстрим ни разу не загружался в плату: у CI-машины нет FPGA, и корректность за пределами внутренних проверок тулчейна не доказана. Единственный значимый тест — прошивка живого железа — для этого артефакта не проводился.',
        'Тайминг — из модели nextpnr, а не из измерения. Никакого заявления о Fmax не делается.',
        'Поток собирает только минимальный профиль; большие профили через починенный конвейер не проходили.',
        'Зависания apt-зеркала, сжигавшие целые потолки времени, ограничены, но не устранены — патч с timeout+retry готов, но не влит.'
      ]
    }
  },
  {
    slug: 'receipts-and-seals-over-radio',
    title: 'Receipts and coverage seals over a radio mesh',
    summary: 'Bytes crossed two radio hops between four boards and arrived byte-exact, with one coverage seal recomputed independently at three points and agreeing at all three. What that proves, what it does not, what the thing is built on, and where the commercial radios are plainly ahead.',
    date: '2026-08-19',
    readingMinutes: 21,
    tags: ['Mesh', 'DePIN', 'Verifiable compute', 'Zynq', 'openXC7'],
    receipts: [
      { label: 'smoke/DEPIN_2HOP_RELAY_2026-07-18.md \u2014 two radio hops, seal 0x9DBE2510 identical at three points', href: 'https://github.com/gHashTag/tri-net/blob/main/smoke/DEPIN_2HOP_RELAY_2026-07-18.md' },
      { label: 'smoke/DEPIN_STREAMING_4NODE_2026-07-18.md \u2014 four nodes, three independent witnesses, seal 0xCDB1F3B1', href: 'https://github.com/gHashTag/tri-net/blob/main/smoke/DEPIN_STREAMING_4NODE_2026-07-18.md' },
      { label: 'smoke/DEPIN_OTA_CLOSED_2026-07-18.md \u2014 8 bytes over the air, corr_peak 1.000, BER 0/64, twice', href: 'https://github.com/gHashTag/tri-net/blob/main/smoke/DEPIN_OTA_CLOSED_2026-07-18.md' },
      { label: 'docs/VERIFIABLE_COMPUTE.md \u2014 GF-T16 multiply 5/5 and dot2 3/3 bit-exact on Artix-7 over UART', href: 'https://github.com/gHashTag/tri-net/blob/main/docs/VERIFIABLE_COMPUTE.md' },
      { label: '26 patches merged into openXC7/nextpnr-xilinx \u2014 the largest single contribution to that project', href: 'https://github.com/openXC7/nextpnr-xilinx/pulls?q=is%3Apr+author%3AgHashTag+is%3Amerged' },
      { label: 'arXiv:2606.09686 \u2014 Golden Ruler: numeric format catalog with bit-exact conformance vectors (title from v3, announced 7 Sep 2026)', href: 'https://arxiv.org/abs/2606.09686' }
    ],
    openQuestions: [
      'No throughput figure exists. Mesh capacity per hop has never been measured, and neither has the falloff across two to four hops \u2014 the axis on which a buyer actually chooses. For scale, the NASA report on Doodle Labs gives 37.9, 5.6, 1.2 and 0.3 Mbit/s at one to four hops. There is nothing to put beside it.',
      'Demodulation is an offline batch, roughly three seconds per sixteen megabytes on the ARM core. The capture is continuous and loses no samples; the processing is not real time, and the four-node result should be read as provenance rather than as a live link.',
      'Self-healing convergence time has never been measured on hardware. The target is under five seconds for a link, and no field run exists.',
      'Power and SWaP are unmeasured; the budget is not finalised.',
      'No silicon of our own exists. The TTSKY26b tape-out was withdrawn and there is no fabrication route, so every claim that depends on a Trinity die is open. The bit-exact compute results are on a commodity Artix-7, not on a custom part.',
      'The band actually transmitted on is 2.4 GHz ISM, and the regulatory note in the repository covers 5.8 GHz only. That is a documentation gap rather than a measurement one, and it is being closed.'
    ],
    published: true,
    ru: {
      title: '\u041a\u0432\u0438\u0442\u0430\u043d\u0446\u0438\u0438 \u0438 \u043f\u0435\u0447\u0430\u0442\u0438 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u044f \u0447\u0435\u0440\u0435\u0437 \u0440\u0430\u0434\u0438\u043e\u0441\u0435\u0442\u044c',
      summary: '\u0411\u0430\u0439\u0442\u044b \u043f\u0440\u043e\u0448\u043b\u0438 \u0434\u0432\u0430 \u0440\u0430\u0434\u0438\u043e\u0441\u043a\u0430\u0447\u043a\u0430 \u043c\u0435\u0436\u0434\u0443 \u0447\u0435\u0442\u044b\u0440\u044c\u043c\u044f \u043f\u043b\u0430\u0442\u0430\u043c\u0438 \u0438 \u043f\u0440\u0438\u0448\u043b\u0438 \u0431\u0430\u0439\u0442-\u0432-\u0431\u0430\u0439\u0442, \u0430 \u043f\u0435\u0447\u0430\u0442\u044c \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u044f, \u043f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043d\u043d\u0430\u044f \u043d\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043c\u043e \u0432 \u0442\u0440\u0451\u0445 \u0442\u043e\u0447\u043a\u0430\u0445, \u0441\u043e\u0448\u043b\u0430\u0441\u044c \u0432\u043e \u0432\u0441\u0435\u0445 \u0442\u0440\u0451\u0445. \u0427\u0442\u043e \u044d\u0442\u043e \u0434\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u0447\u0435\u0433\u043e \u043d\u0435 \u0434\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u043d\u0430 \u0447\u0451\u043c \u0432\u0441\u0451 \u044d\u0442\u043e \u0441\u0434\u0435\u043b\u0430\u043d\u043e \u0438 \u0433\u0434\u0435 \u0441\u0435\u0440\u0438\u0439\u043d\u044b\u0435 \u0440\u0430\u0434\u0438\u043e\u0441\u0442\u0430\u043d\u0446\u0438\u0438 \u043e\u0442\u043a\u0440\u043e\u0432\u0435\u043d\u043d\u043e \u0432\u043f\u0435\u0440\u0435\u0434\u0438.',
      openQuestions: [
        '\u0427\u0438\u0441\u043b\u0430 \u043f\u0440\u043e\u043f\u0443\u0441\u043a\u043d\u043e\u0439 \u0441\u043f\u043e\u0441\u043e\u0431\u043d\u043e\u0441\u0442\u0438 \u043d\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442. \u0401\u043c\u043a\u043e\u0441\u0442\u044c \u043d\u0430 \u0441\u043a\u0430\u0447\u043e\u043a \u043d\u0435 \u0438\u0437\u043c\u0435\u0440\u044f\u043b\u0430\u0441\u044c \u043d\u0438 \u0440\u0430\u0437\u0443.',
        '\u0414\u0435\u043c\u043e\u0434\u0443\u043b\u044f\u0446\u0438\u044f \u2014 \u043e\u0444\u043b\u0430\u0439\u043d\u043e\u0432\u044b\u0439 \u0431\u0430\u0442\u0447, \u043e\u043a\u043e\u043b\u043e \u0442\u0440\u0451\u0445 \u0441\u0435\u043a\u0443\u043d\u0434 \u043d\u0430 \u0448\u0435\u0441\u0442\u043d\u0430\u0434\u0446\u0430\u0442\u044c \u043c\u0435\u0433\u0430\u0431\u0430\u0439\u0442.',
        '\u0412\u0440\u0435\u043c\u044f \u0441\u0430\u043c\u043e\u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f \u043d\u0430 \u0436\u0435\u043b\u0435\u0437\u0435 \u043d\u0435 \u0438\u0437\u043c\u0435\u0440\u044f\u043b\u043e\u0441\u044c.',
        '\u042d\u043d\u0435\u0440\u0433\u043e\u043f\u043e\u0442\u0440\u0435\u0431\u043b\u0435\u043d\u0438\u0435 \u0438 SWaP \u043d\u0435 \u0438\u0437\u043c\u0435\u0440\u044f\u043b\u0438\u0441\u044c.',
        '\u0421\u0432\u043e\u0435\u0433\u043e \u043a\u0440\u0438\u0441\u0442\u0430\u043b\u043b\u0430 \u043d\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442: \u0437\u0430\u044f\u0432\u043a\u0430 TTSKY26b \u043e\u0442\u043e\u0437\u0432\u0430\u043d\u0430.',
        '\u041f\u043e\u043b\u043e\u0441\u0430 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0438 \u2014 2,4 \u0413\u0413\u0446 ISM, \u0430 \u0440\u0435\u0433\u0443\u043b\u044f\u0442\u043e\u0440\u043d\u0430\u044f \u0437\u0430\u043f\u0438\u0441\u043a\u0430 \u043d\u0430\u043f\u0438\u0441\u0430\u043d\u0430 \u043f\u0440\u043e 5,8 \u0413\u0413\u0446.'
      ]
    }
  },
  {
    slug: 'the-full-adder-made-the-cost-claim-comparable',
    title: 'The full adder made the cost claim comparable',
    summary: 'A merged FPGA-repository PR replaces a magnitude-only comparison with a full adder and reports 3000 oracle checks, 0 errors, and a 440-LUT post-synthesis result.',
    date: '2026-08-18',
    readingMinutes: 5,
    tags: ['FPGA', 'Measurement', 'Arithmetic', 'Self-critique'],
    receipts: [
      { label: 'gHashTag/trinity-fpga PR #605 — full adder and corrected cost comparison', href: 'https://github.com/gHashTag/trinity-fpga/pull/605' },
      { label: 'merged commit e25bf05 — implementation and audit record', href: 'https://github.com/gHashTag/trinity-fpga/commit/e25bf05a368296331b22a38caea610e4fdc4d46b' },
      { label: 'tef_add_full.v at the merged revision', href: 'https://github.com/gHashTag/trinity-fpga/blob/e25bf05a368296331b22a38caea610e4fdc4d46b/fpga/tef/tef_add_full.v' },
      { label: 'FULL_ADDER.md at the merged revision', href: 'https://github.com/gHashTag/trinity-fpga/blob/e25bf05a368296331b22a38caea610e4fdc4d46b/fpga/tef/FULL_ADDER.md' }
    ],
    openQuestions: [
      'The 1182-LUT opponent is an internal linear structural model, not the published takum format; the post does not claim a published-format comparison.',
      'The counts are from Yosys 0.65 post-synthesis with synth_xilinx, xc7 family and DSP disabled. Place-and-route and AX7203 board measurement were not performed.',
      'No throughput, energy, downstream workload, or accuracy result is established.',
      'The 3000-pair check validates this RTL against the oracle encode; it does not prove the oracle’s broader numerical semantics.'
    ],
    published: true,
    ru: {
      title: 'Полный сумматор сделал сравнение цены сопоставимым',
      summary: 'Смерженный PR в FPGA-репозитории заменяет сравнение только модулей полным сумматором и сообщает о 3000 проверках оракулом, 0 ошибках и результате 440 LUT после синтеза.',
      openQuestions: [
        'Оппонент на 1182 LUT — внутренняя линейная структурная модель, а не опубликованный формат takum; сравнение с опубликованным форматом не заявляется.',
        'Числа получены после синтеза Yosys 0.65 с synth_xilinx для xc7 и отключёнными DSP. Place-and-route и замер на AX7203 не выполнялись.',
        'Пропускная способность, энергия, реальная нагрузка и точность не измерялись.',
        'Проверка 3000 пар подтверждает этот RTL против encode оракула, но не доказывает всю числовую семантику оракула.'
      ]
    }
  },
  {
    slug: 'phi-is-a-scale-not-information',
    title: 'The golden ratio in this format is a scale factor, not information',
    summary: 'A format with phi in its name. Measured: in the two-bit digit alphabet phi is not observable at all, and a dot product of GFTernary vectors is exactly phi-squared times the same codes read as balanced ternary. The prior art put phi where it does carry information — in 2002.',
    date: '2026-08-18',
    readingMinutes: 8,
    tags: ['Number formats', 'Measurement', 'Self-critique', 'FPGA'],
    receipts: [
      { label: 'gHashTag/trinity-fpga #582 — the native phi check, mutation-tested', href: 'https://github.com/gHashTag/trinity-fpga/pull/582' },
      { label: 'gHashTag/trinity-fpga #584 — 1654 cells against 13, and 16/16 equivalent', href: 'https://github.com/gHashTag/trinity-fpga/pull/584' },
      { label: 'gHashTag/t27 #2177 — tri mutate, the command that found the third vacuous check', href: 'https://github.com/gHashTag/t27/pull/2177' },
      { label: 'Stakhov, The Computer Journal 45(2):221-236 (2002) — phi in the positional weights', href: 'https://doi.org/10.1093/comjnl/45.2.221' },
      { label: 'Bergman, Mathematics Magazine 31:98-110 (1957) — the base-phi system underneath it', href: 'https://doi.org/10.2307/3029218' }
    ],
    openQuestions: [
      'The area comparison is one multiplier on Yosys 0.65. Whether a board-level synthesis folds the fp32 path or pays for it has not been measured, and that is the number that decides whether this matters in practice.',
      'The RTL quantiser has an asymmetric dead zone (+0.25 against 0.5) where the oracle documents a pure sign rule. They agree on every reachable input today. Nothing checks that they still agree if the input set widens.',
      'The mirror-symmetric prior art was reproduced for N = 0..12 by exhaustive search. No claim is made about larger N, and no adder was built.',
      'Whether phi as an exponent base would beat base 2 on a real workload is untested. It is not used as a base anywhere in this codebase — the ladders are base 2, and one is base 3.'
    ],
    published: true,
    ru: {
      title: 'Золотое сечение в этом формате — масштаб, а не информация',
      summary: 'Формат, у которого φ в названии. Измерено: в двухбитном алфавите цифр φ вообще не наблюдаем, а скалярное произведение векторов GFTernary точно равно φ² на те же коды, прочитанные как сбалансированная троичная. Предшествующая работа поставила φ туда, где он несёт информацию, ещё в 2002-м.',
      openQuestions: [
        'Сравнение площади — один умножитель на Yosys 0.65. Свернёт ли fp32-путь синтез на уровне платы или заплатит за него, не измерено, а именно это решает, важно ли всё на практике.',
        'У квантователя RTL несимметричная мёртвая зона (+0.25 против 0.5), тогда как оракул документирует чистое правило знака. Сегодня они совпадают на всех достижимых входах. Ничто не проверяет, что они совпадут при расширении множества входов.',
        'Зеркально-симметричная предшествующая система воспроизведена для N = 0..12 полным перебором. Про большие N ничего не утверждается, сумматор не построен.',
        'Побьёт ли φ как основание экспоненты основание 2 на реальной нагрузке — не проверено. В этой кодовой базе φ основанием не используется нигде: лестницы на основании 2, одна на основании 3.'
      ]
    }
  },
  {
    slug: 'an-inert-filter-is-safest-until-it-works',
    title: 'An inert filter is safest until it works',
    summary: 'The first request this service ever served came back telling a clean design it had a silicon bug. Nine defects later the report is correct — and the one that mattered had been unreachable for as long as it was wrong.',
    date: '2026-08-17',
    readingMinutes: 9,
    tags: ['Verification', 'CI', 'Self-critique', 'Measurement'],
    receipts: [
      { label: 'gHashTag/trinity #796 — the request, its wrong report, and the nine fixes', href: 'https://github.com/gHashTag/trinity/issues/796' },
      { label: 'gHashTag/trinity #797 — SystemVerilog read as Verilog, blamed on the design', href: 'https://github.com/gHashTag/trinity/pull/797' },
      { label: 'gHashTag/trinity #807 — head closed the pipe and pipefail killed the step', href: 'https://github.com/gHashTag/trinity/pull/807' },
      { label: 'gHashTag/trinity #810 — eighteen workflows, 8182 runs, zero green', href: 'https://github.com/gHashTag/trinity/issues/810' }
    ],
    openQuestions: [
      'Nine defects were found on one submission. A design of a different shape — purely combinational, or multi-file without includes — has not been put through this path, and there is no reason to think the count would be zero.',
      'The eighteen never-green workflows are measured and published but not triaged. Deciding fix, dispatch-only or delete across three repositories is not done.',
      'The free tier still installs yosys unpinned, so its cell count depends on whichever version apt ships that week; wires and flip-flops were stable across the two tested.',
      'No third-party design has been through the repaired issue path. The one measurement here is my own press of my own button.'
    ],
    published: true,
    ru: {
      title: 'Инертный фильтр безопасен, пока не заработает',
      summary: 'Первый запрос, который этот сервис обслужил, сообщил чистому дизайну, что у него кремниевый баг. Девять дефектов спустя отчёт верен — а главный из них был недостижим ровно столько, сколько был неверен.',
      openQuestions: [
        'Девять дефектов найдены на одной заявке. Дизайн другой формы — чисто комбинационный или многофайловый без include — через этот путь не проходил, и нет оснований думать, что там ноль.',
        'Восемнадцать никогда не зеленевших воркфлоу измерены и опубликованы, но не разобраны. Решение «починить, только по кнопке или удалить» по трём репозиториям не принято.',
        'Бесплатный тир по-прежнему ставит yosys без закрепления версии, поэтому счёт ячеек зависит от того, что отгрузил apt; провода и триггеры на двух проверенных версиях совпадали.',
        'Ни один чужой дизайн через починенный путь не прогонялся. Единственное измерение здесь — моё собственное нажатие моей собственной кнопки.'
      ]
    }
  },
  {
    slug: 'a-gate-that-rejected-its-own-users',
    title: 'A gate that rejected its own users',
    summary: 'A floor I added asserted five report lines and failed three of the four normal design shapes; a workflow gated on a label that did not exist, so every "Start a run" button led nowhere. Both were correct about what they required and silent about whether it could be met.',
    date: '2026-08-17',
    readingMinutes: 7,
    tags: ['Verification', 'CI', 'Self-critique'],
    receipts: [
      { label: 'gHashTag/trinity PR #792 — count the checks that ran, not the lines that matched', href: 'https://github.com/gHashTag/trinity/pull/792' },
      { label: 'gHashTag/trinity PR #791 — the floor this corrects', href: 'https://github.com/gHashTag/trinity/pull/791' },
      { label: 'gHashTag/t27 issue #2176 — the CLI nothing built', href: 'https://github.com/gHashTag/t27/issues/2176' }
    ],
    openQuestions: [
      'How long the missing label had been breaking the request path is not bounded: nothing recorded an attempt, so the cost is unknown rather than small.',
      'The four fixtures cover the shapes I could think of. The failure this post describes is precisely that the author is badly placed to enumerate valid forms, so a fifth shape may still be rejected.',
      'The new floor counts checks, and a check that runs but measures nothing would still increment it. It removes one way to be wrong, not the class.',
      'No end-to-end request has yet been driven through the repaired issue path from a stranger\u2019s repository.'
    ],
    published: true,
    ru: {
      title: 'Гейт, который отверг собственных пользователей',
      summary: 'Порог, который я добавил, требовал пять строк отчёта и валил три из четырёх нормальных форм дизайна; воркфлоу открывался по метке, которой не существовало, поэтому каждая кнопка «Start a run» вела в никуда. Обе проверки были правы в том, что требовали, и молчали о том, выполнимо ли требование.',
      openQuestions: [
        'Сколько времени отсутствующая метка ломала путь запроса — не ограничено: ни одна попытка не записывалась, поэтому цена неизвестна, а не мала.',
        'Четыре образца покрывают те формы, которые я смог придумать. Ошибка, о которой пост, ровно в том, что автор плохо годится для перечисления допустимых форм, — пятая может отвергаться до сих пор.',
        'Новый порог считает проверки, и проверка, которая выполнилась, но ничего не измерила, всё равно его увеличит. Убран один способ ошибиться, а не класс.',
        'Сквозной запрос из чужого репозитория через починенный путь ещё не прогнан.'
      ]
    }
  },
  {
    slug: 'a-multiplicity-correction-changed-the-deployment-reading',
    title: 'A multiplicity correction changed the deployment reading',
    summary: 'A merged research note shows how a nine-placement selection by mean margin becomes a narrower claim after the selection family is included in the correction.',
    date: '2026-08-17',
    readingMinutes: 6,
    tags: ['Measurement', 'Reproducibility', 'Statistics', 'Quantization'],
    receipts: [
      { label: 'gHashTag/trinity-fpga PR #566 — merged research note', href: 'https://github.com/gHashTag/trinity-fpga/pull/566' },
      { label: 'merged commit 1900c36 — consistency and substrate notes', href: 'https://github.com/gHashTag/trinity-fpga/commit/1900c36a18c1b73560a94655c1a527f61d0a92d5' },
      { label: 'CONSISTENCY_BEATS_MAGNITUDE_2026-08-12.md at the merged revision', href: 'https://github.com/gHashTag/trinity-fpga/blob/1900c36a18c1b73560a94655c1a527f61d0a92d5/research/block/CONSISTENCY_BEATS_MAGNITUDE_2026-08-12.md' },
      { label: 'SUBSTRATE_IS_PERISHABLE_2026-08-12.md at the merged revision', href: 'https://github.com/gHashTag/trinity-fpga/blob/1900c36a18c1b73560a94655c1a527f61d0a92d5/research/block/SUBSTRATE_IS_PERISHABLE_2026-08-12.md' }
    ],
    openQuestions: [
      'The post does not establish that MID is better than NEAR0; their paired comparison is a tie with p = 0.157 at n = 5.',
      'Five checkpoints and one wikitext-2 evaluation do not establish how the placement behaves on unseen models, datasets, or training settings.',
      'The note reports model-level margins for block 32 with E8M0 and lm_head excluded; it is not a general result for every layer or format.',
      'No FPGA, speed, energy, or downstream deployment result is claimed by this post.'
    ],
    published: true,
    ru: {
      title: 'Поправка на множественные сравнения изменила чтение развёртывания',
      summary: 'Смерженная исследовательская заметка показывает, как выбор из девяти placements по среднему отступу становится более узким утверждением после учёта семейства сравнения.',
      openQuestions: [
        'Пост не доказывает, что MID лучше NEAR0: их парное сравнение даёт ничью и p = 0,157 при n = 5.',
        'Пять контрольных точек и одна проверка на wikitext-2 не доказывают поведение placement на новых моделях, датасетах или режимах обучения.',
        'Заметка сообщает метрики на уровне модели для блока 32 с E8M0 и без lm_head; это не общий результат для каждого слоя или формата.',
        'Пост не заявляет результата на FPGA, по скорости, энергии или в реальном развёртывании.'
      ]
    }
  },
  {
    "slug": "a-health-snapshot-changed-its-denominator",
    "title": "A health snapshot changed its numbers, not its contract",
    "summary": "A fresh repository commit updates the CI health snapshot from 156 to 143 failures in a 200-run window and records the denominator and exclusions that give those numbers meaning.",
    "date": "2026-08-16",
    "readingMinutes": 4,
    "tags": ["CI", "Measurement", "Reproducibility", "Dashboards"],
    "receipts": [
      { "label": "gHashTag/trinity commit 6227bed — signal health refresh", "href": "https://github.com/gHashTag/trinity/commit/6227bed26d3097e817455a5e5958deffd75b106c" },
      { "label": "signalHealth.json at the committed revision", "href": "https://github.com/gHashTag/trinity/blob/6227bed26d3097e817455a5e5958deffd75b106c/apps/website/src/data/signalHealth.json" }
    ],
    "openQuestions": [
      "The commit records a refreshed data file; this post does not independently re-run or audit the complete run history.",
      "The lower failure count is not attributed here to a particular code or workflow change.",
      "The snapshot describes the metric's classification of recorded outcomes; it does not establish that the CI jobs themselves are correct.",
      "No FPGA, silicon, speed, energy, or downstream-model result is claimed by this post."
    ],
    "published": true,
    "ru": {
      "title": "Снимок здоровья изменил числа, но не контракт",
      "summary": "Свежий коммит обновляет снимок здоровья CI: со 156 до 143 отказов в окне из 200 прогонов, одновременно фиксируя знаменатель и правила исключения.",
      "openQuestions": [
        "Коммит записывает обновлённый data-файл; отдельный полный аудит истории прогонов в этом посте не выполнялся.",
        "Меньшее число отказов здесь не приписывается конкретной правке кода или workflow.",
        "Снимок описывает классификацию записанных исходов этой метрикой, но не устанавливает корректность самих CI-задач.",
        "Этот пост не заявляет результата на FPGA, кремнии, по скорости, энергии или по downstream-модели."
      ]
    }
  },
  {
    "slug": "a-red-gate-was-missing-its-input",
    "title": "A red gate was missing its input",
    "summary": "A merged FPGA-repository audit shows how a missing checkout turned twelve unchecked disagreements into apparent fixes, while two other failures were ordinary runner plumbing.",
    "date": "2026-08-15",
    "readingMinutes": 6,
    "tags": [
      "CI",
      "FPGA",
      "Reproducibility",
      "Tooling"
    ],
    "receipts": [
      {
        "label": "gHashTag/trinity-fpga PR #564 — merged CI-gate repair",
        "href": "https://github.com/gHashTag/trinity-fpga/pull/564"
      },
      {
        "label": "gHashTag/trinity-fpga commit 45ad2347 — merged implementation",
        "href": "https://github.com/gHashTag/trinity-fpga/commit/45ad2347712e4d22d1edbae97c07ea9e758f4ae0"
      },
      {
        "label": "artefact-agreement workflow changed by the PR",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/45ad2347712e4d22d1edbae97c07ea9e758f4ae0/.github/workflows/artefact-agreement.yml"
      }
    ],
    "openQuestions": [
      "The PR repairs the gate plumbing and reproduces the missing-input failure, but it does not establish that the underlying format discrepancies are correct or incorrect. The two content findings remain open.",
      "The checkout fix is shown on the repository workflow; a fresh public run after the merge is not used here as a separate receipt.",
      "The zsh installation keeps the repository shell scripts unchanged, but the workflow does not compare their output with a second shell implementation.",
      "Treating an unreadable absolute document path as absent avoids a runner exception; it does not prove that the referenced document should exist in this repository."
    ],
    "published": true,
    "ru": {
      "title": "У красного гейта не было входных данных",
      "summary": "Смерженный аудит FPGA-репозитория показывает, как отсутствующий checkout превратил двенадцать непроверенных расхождений в видимость исправлений, а ещё два отказа оказались обычной проблемой раннера.",
      "openQuestions": [
        "PR чинит инфраструктуру гейтов и воспроизводит отказ из-за отсутствующего входа, но не устанавливает, верны ли сами расхождения форматов. Два содержательных finding остаются открытыми.",
        "Правка checkout показана на workflow репозитория; отдельный свежий публичный прогон после мержа здесь не используется как самостоятельная квитанция.",
        "Установка zsh оставляет shell-скрипты репозитория без переписывания, но workflow не сравнивает их вывод с реализацией на другом shell.",
        "Обработка недоступного абсолютного пути документа как отсутствующего убирает исключение раннера, но не доказывает, что этот документ должен находиться в репозитории."
      ]
    }
  },
  {
    "slug": "a-broken-reference-looks-exactly-like-broken-code",
    "title": "Eight broken gates in one day, and not one of them was broken code",
    "summary": "A flag, a version, a runner, a module, a script, three specs, two format paths, five submodule links and a step that ran what it claimed to build. Every one reported \"failure\", which is also what a real defect reports.",
    "date": "2026-08-15",
    "readingMinutes": 9,
    "tags": [
      "CI",
      "Tooling",
      "Git",
      "Zig"
    ],
    "receipts": [
      {
        "label": "trinity #758 — format check pointed at paths that no longer exist · MERGED",
        "href": "https://github.com/gHashTag/trinity/pull/758"
      },
      {
        "label": "trinity #760 — test binary needs libc; five submodule gitlinks with no url · MERGED",
        "href": "https://github.com/gHashTag/trinity/pull/760"
      },
      {
        "label": "trinity c768953 — the merge that first turned the CLI build green",
        "href": "https://github.com/gHashTag/trinity/commit/c7689530274d706fb0876b41e3ec0671ae16960d"
      },
      {
        "label": "run 31827529498 — Build & Push Trinity CLI, first success after 30+ red runs",
        "href": "https://github.com/gHashTag/trinity/actions/runs/31827529498"
      }
    ],
    "openQuestions": [
      "The segfault found at the end is not fixed. `zig build tri` builds the CLI and runs it; with stdin closed it dies with SIGSEGV, while the same binary from the same commit runs cleanly with no arguments inside the published container. The workflow no longer runs the REPL, which removes the symptom from CI and leaves the defect.",
      "Two gates remain red on purpose. Implementation coverage is about 3% against a 95% target, and the gate that says so is the one thing in that job that was telling the truth all along. Lowering the threshold would be the failure it exists to catch.",
      "`deploy/Dockerfile.node` is still missing and its workflow still publishes an image from it. Restoring the file or retiring the image is a product decision, not a repair.",
      "Nothing here says the code is correct. Eight gates now measure what they claim to measure; what they measure has barely been examined.",
      "The count of eight is this repository on this day, found while looking for something else. It is not a survey, and no claim is made that the rate is representative."
    ],
    "published": true,
    "ru": {
      "title": "Восемь сломанных гейтов за день, и ни один — из-за сломанного кода",
      "summary": "Флаг, версия, раннер, модуль, скрипт, три спеки, два пути форматирования, пять ссылок на сабмодули и шаг, который запускал то, что называл сборкой. Каждый сообщал «failure» — ровно как сообщил бы настоящий дефект.",
      "openQuestions": [
        "Найденный под конец сегфолт не исправлен. `zig build tri` собирает CLI и запускает его; с закрытым stdin он падает по SIGSEGV, тогда как тот же бинарь из того же коммита в опубликованном контейнере без аргументов отрабатывает чисто. Воркфлоу больше не запускает REPL — это убирает симптом из CI и оставляет дефект.",
        "Два гейта остаются красными намеренно. Покрытие реализациями около 3% при цели 95%, и гейт, который об этом говорит, — единственное в той задаче, что всё это время не врало. Понизить порог значило бы совершить ошибку, ради поимки которой он существует.",
        "`deploy/Dockerfile.node` по-прежнему отсутствует, а его воркфлоу продолжает публиковать из него образ. Восстановить файл или закрыть публикацию — решение продуктовое, а не ремонтное.",
        "Ничто здесь не утверждает, что код корректен. Восемь гейтов теперь меряют то, что заявляют; что именно они меряют, почти не рассматривалось.",
        "Число восемь — это один репозиторий за один день, найденное попутно. Это не обследование, и утверждать, что такова типичная частота, я не берусь."
      ]
    }
  },
  {
    "slug": "five-reasons-the-build-was-red",
    "title": "Five reasons the build was red, and the fifth was mine",
    "summary": "Our CLI could not be installed by anyone, and the CI that should have said so had zero successes in thirty runs. Each cause hid the next; removing the fourth created the fifth.",
    "date": "2026-08-15",
    "readingMinutes": 7,
    "tags": [
      "CI",
      "Zig",
      "Build systems",
      "Tooling"
    ],
    "receipts": [
      {
        "label": "trinity c768953 — the merge that turned the CLI build green",
        "href": "https://github.com/gHashTag/trinity/commit/c7689530274d706fb0876b41e3ec0671ae16960d"
      },
      {
        "label": "run 31827529498 — Build & Push Trinity CLI, first success after 30+ red runs",
        "href": "https://github.com/gHashTag/trinity/actions/runs/31827529498"
      },
      {
        "label": "the image that run published, pinned by sha",
        "href": "https://github.com/gHashTag/trinity/pkgs/container/trinity"
      }
    ],
    "openQuestions": [
      "Only the container image was exercised end to end. npm shows @playra/tri exists and the Homebrew tap repository resolves; neither was installed and run, so neither is claimed to work.",
      "Three version numbers are in play for one tool: the README heading says v6.3.0, npm publishes 1.0.1, and the binary prints v5.1.0. Only the binary’s was measured. Which is authoritative is unresolved.",
      "The codegen workflow is still red, at a later step: it calls scripts/validate_codegen.sh, which no longer exists. That is a different problem and it is not fixed.",
      "The image is linux/amd64 only. It runs on Apple Silicon under emulation; no arm64 image is published and no timing on either was measured.",
      "The build works. Whether the CLI is correct is a separate question this says nothing about — a green compile is not a passing test suite, and the test suites remain red."
    ],
    "published": true,
    "ru": {
      "title": "Пять причин, по которым сборка была красной, и пятая — моя",
      "summary": "Наш CLI не мог поставить никто, а CI, который должен был об этом сказать, имел ноль успехов из тридцати прогонов. Каждая причина прятала следующую; удаление четвёртой породило пятую.",
      "openQuestions": [
        "От начала до конца проверен только контейнер. npm показывает, что пакет @playra/tri существует, и репозиторий Homebrew-тапа отвечает; ни то, ни другое не устанавливалось и не запускалось, поэтому работоспособность не заявляется.",
        "У одного инструмента три версии: заголовок README говорит v6.3.0, npm публикует 1.0.1, бинарь печатает v5.1.0. Измерена только последняя. Какая авторитетна — не решено.",
        "Воркфлоу codegen по-прежнему красный, но на более позднем шаге: он зовёт scripts/validate_codegen.sh, которого больше нет. Это другая задача, и она не решена.",
        "Образ собран только под linux/amd64. На Apple Silicon он идёт через эмуляцию; arm64-образа нет, и время работы ни там, ни там не измерялось.",
        "Сборка работает. Корректен ли CLI — отдельный вопрос, о котором здесь не сказано ничего: зелёная компиляция не равна проходящим тестам, а тесты остаются красными."
      ]
    }
  },
  {
    "slug": "the-generated-file-was-three-years-old",
    "title": "We hand-patched a generated file that upstream had fixed five months earlier",
    "summary": "A vendored Verilog artifact from April 2023 carried a defect its generator repaired in March 2026. The hand fix is correct and temporary; the next regeneration would undo it.",
    "date": "2026-08-15",
    "readingMinutes": 5,
    "tags": [
      "LiteX",
      "openXC7",
      "Vendoring",
      "yosys"
    ],
    "receipts": [
      {
        "label": "demo-projects fbf72fc — the hand patch on the vendored file, 2026-08-14",
        "href": "https://github.com/openXC7/demo-projects/commit/fbf72fc69db4971bd730a92667f27def30d6ba10"
      },
      {
        "label": "litex b3a4c270 — \"S7HDMIPHY: Fix build with Yosys\", 2026-03-05",
        "href": "https://github.com/enjoy-digital/litex/commit/b3a4c270"
      },
      {
        "label": "litex/soc/cores/video.py — the emission, Open() on lines 1398-1399 today",
        "href": "https://github.com/enjoy-digital/litex/blob/master/litex/soc/cores/video.py"
      },
      {
        "label": "the finding, posted to the commit it concerns",
        "href": "https://github.com/openXC7/demo-projects/commit/fbf72fc69db4971bd730a92667f27def30d6ba10#commitcomment-196278462"
      }
    ],
    "openQuestions": [
      "I did not regenerate the design. That the current LiteX emits a clean file for this board end to end is inferred from the diff and the blame, not demonstrated by a build.",
      "Whether the other vendored designs in demo-projects carry the same staleness is unchecked. This is one file.",
      "The slave’s SHIFTIN1/2 are still tied to 0 upstream, and that is fine — an unused input may take a constant. The hand patch normalised both, but only the output tie was ever the defect. I did not test whether yosys objects to anything else in this file.",
      "I have not established why the demo carried a 2023 artifact rather than a regeneration step. There may be a reason — a LiteX API change, a board file that no longer builds — and I did not look for one before writing this."
    ],
    "published": true,
    "ru": {
      "title": "Мы залатали руками сгенерированный файл, который апстрим починил пятью месяцами раньше",
      "summary": "Вендоренный Verilog от апреля 2023 нёс дефект, который его генератор исправил в марте 2026. Ручная правка верна и временна: следующая регенерация её снесёт.",
      "openQuestions": [
        "Я не регенерировал дизайн. То, что текущий LiteX выдаёт чистый файл для этой платы от начала до конца, выведено из диффа и blame, а не показано сборкой.",
        "Несут ли ту же залежалость другие вендоренные дизайны в demo-projects — не проверено. Это один файл.",
        "SHIFTIN1/2 у ведомого в апстриме по-прежнему привязаны к 0, и это нормально: неиспользуемый вход может принимать константу. Ручная правка нормализовала оба, но дефектом была только привязка выхода. Возражает ли yosys на что-то ещё в этом файле, я не проверял.",
        "Я не выяснил, почему демо несло артефакт 2023 года, а не шаг регенерации. Причина может быть — смена API LiteX, неработающий файл платы, — и я её не искал, прежде чем это написать."
      ]
    }
  },
  {
    "slug": "half-the-build-is-bitstream-generation",
    "title": "Half the build is bitstream generation, and the trivial design was the slow one",
    "summary": "Fifteen openXC7 builds with stated boundaries: for small designs more time goes to turning FASM into a bitstream than to place-and-route, a blinky beaten by a GF multiplier, and 25% spread on byte-identical work.",
    "date": "2026-08-15",
    "readingMinutes": 7,
    "tags": [
      "FPGA",
      "openXC7",
      "Benchmarking",
      "Measurement"
    ],
    "receipts": [
      {
        "label": "trinity-fpga — the workflow, with the boundaries stated in its header",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/main/.github/workflows/openxc7-build-timing.yml"
      },
      {
        "label": "run 31822095102 — 17/17 green, the fifteen measurements below",
        "href": "https://github.com/gHashTag/trinity-fpga/actions/runs/31822095102"
      },
      {
        "label": "run 31820544225 — the first attempt, which lost five jobs to my error",
        "href": "https://github.com/gHashTag/trinity-fpga/actions/runs/31820544225"
      }
    ],
    "openQuestions": [
      "This is not a comparison. There is no Vivado column, because there is no Vivado here — no licence, no install. The three designs are plain Verilog + XDC on xc7a200tfbg484-2 so that anyone holding a licence can build the same three and put their numbers beside these.",
      "One machine: a shared GitHub `ubuntu-latest` runner, 4 cores. The absolute seconds do not transfer to your workstation. The proportions between phases might; that is a hypothesis, not a result.",
      "The seed is pinned at 1 in every run, so nothing here measures nextpnr’s seed sensitivity. Sweeping seeds would have mixed two sources of variance into one column.",
      "Three designs, all ours, all one part. That is not a representative corpus — enough to show the shape, not enough to generalise the numbers.",
      "n=5. The spread is reported raw, min to max. No confidence interval is claimed and none would be honest at that n.",
      "Bitstream generation here means prjxray’s fasm2frames plus xc7frames2bit. A different backend would move that column, so the finding is about this toolchain rather than about open toolchains in general."
    ],
    "published": true,
    "ru": {
      "title": "Половина сборки — это генерация битстрима, а самым медленным оказался тривиальный дизайн",
      "summary": "Пятнадцать сборок openXC7 с объявленными границами: у малых дизайнов на превращение FASM в битстрим уходит больше времени, чем на трассировку, blinky проиграл умножителю GF, а разброс на побайтово одинаковой работе — 25%.",
      "openQuestions": [
        "Это не сравнение. Колонки Vivado нет, потому что здесь нет Vivado — ни лицензии, ни установки. Все три дизайна это обычный Verilog + XDC под xc7a200tfbg484-2, так что любой, у кого лицензия есть, может собрать те же три и положить свои числа рядом.",
        "Одна машина: общий раннер GitHub ubuntu-latest, 4 ядра. Абсолютные секунды на вашу рабочую станцию не переносятся. Пропорции между фазами, возможно, переносятся — но это гипотеза, а не результат.",
        "Сид зафиксирован на 1 во всех прогонах, поэтому здесь ничто не измеряет чувствительность nextpnr к сиду. Перебор сидов смешал бы два источника разброса в одной колонке.",
        "Три дизайна, все наши, все на одном кристалле. Это не представительная выборка — её хватает, чтобы показать форму, и не хватает, чтобы обобщать числа.",
        "n=5. Разброс приведён как есть, от min до max. Доверительный интервал не заявляется — при таком n он был бы нечестен.",
        "Генерация битстрима здесь означает fasm2frames и xc7frames2bit из prjxray. Другой бэкенд сдвинул бы эту колонку, поэтому вывод касается этого тулчейна, а не открытых тулчейнов вообще."
      ]
    }
  },
  {
    "slug": "the-search-space-erased-a-significance-claim",
    "title": "The search space erased a significance claim",
    "summary": "A merged audit of 67 targets withdraws a roughly 10-sigma reading after enumerating the search family that made near-matches likely by chance.",
    "date": "2026-08-14",
    "readingMinutes": 7,
    "tags": [
      "research",
      "statistics",
      "reproducibility",
      "audit"
    ],
    "receipts": [
      {
        "label": "gHashTag/trinity PR #738 — merged statistical audit",
        "href": "https://github.com/gHashTag/trinity/pull/738"
      },
      {
        "label": "Merged commit da2916c — corrected source and scripts",
        "href": "https://github.com/gHashTag/trinity/commit/da2916cc1af1c35a6d9a356cc0f7ea35aefe4d56"
      },
      {
        "label": "sacred-formulas.md — audited document",
        "href": "https://github.com/gHashTag/trinity/blob/04430c0dc154ed3ec987704fe9b74bbcb40a3e9b/docs/docs/math-foundations/sacred-formulas.md"
      }
    ],
    "openQuestions": [
      "The Šidák threshold of 5.06σ assumes independent family members; the dependence created by shared factors was not estimated, so the actual threshold may be lower.",
      "The one-decade window used for local-density estimates was checked for stability, but it has no theoretical derivation in this audit.",
      "The document still records a mismatch between an announced standard search size of 20,412 and bounds that enumerate 54,756 combinations; the PR flags the discrepancy instead of silently choosing one.",
      "The corrected counts concern this document and its declared family of formulas; they do not establish a general statement about mathematical coincidences outside that family."
    ],
    "published": true,
    "ru": {
      "title": "Пространство поиска отменило заявление о значимости",
      "summary": "Смерженный аудит 67 целей снимает трактовку около 10σ после перечисления семейства поиска, в котором близкие совпадения часто возникают случайно.",
      "openQuestions": [
        "Порог Шидака 5,06σ предполагает независимость членов семейства; зависимость из-за общих множителей не оценивалась, поэтому настоящий порог может быть ниже.",
        "Однодекадное окно для оценки локальной плотности проверено на устойчивость, но теоретического вывода для него в этом аудите нет.",
        "В документе остаётся расхождение между заявленным размером стандартного перебора 20 412 и границами, которые дают 54 756 комбинаций; PR отмечает его, а не выбирает число молча.",
        "Исправленные счётчики относятся к этому документу и заявленному семейству формул; они не доказывают общего тезиса о математических совпадениях вне этого семейства."
      ]
    }
  },
  {
    "slug": "six-and-a-half-years-in-a-discarded-return-value",
    "title": "Six and a half years in one discarded return value",
    "summary": "Four merged fixes turned the openXC7 demo CI green. The oldest was a bool nobody read: since February 2020 the placer knew its own placement was invalid and threw the answer away, so the failure surfaced in the router instead.",
    "date": "2026-08-14",
    "readingMinutes": 9,
    "tags": [
      "FPGA",
      "openXC7",
      "nextpnr",
      "Place and route"
    ],
    "receipts": [
      {
        "label": "nextpnr-xilinx #145 — propagate placer1_refine failure out of placer_heap · MERGED 2026-08-13",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/145"
      },
      {
        "label": "nextpnr-xilinx #146 — budget the per-position site exit in placement validity · MERGED 2026-08-14",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/146"
      },
      {
        "label": "nextpnr-xilinx #142 — RAM256X1S mux tree belongs in its own slice half · MERGED 2026-08-13",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/142"
      },
      {
        "label": "nextpnr-xilinx #144 — wire RAM128X1S scalar A0..A6 into the DRAM control set · MERGED 2026-08-13",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/144"
      },
      {
        "label": "nextpnr-xilinx #134 — routed, timing-clean, dead on silicon · OPEN",
        "href": "https://github.com/openXC7/nextpnr-xilinx/issues/134"
      },
      {
        "label": "demo-projects CI — every project builds",
        "href": "https://github.com/openXC7/demo-projects/actions/runs/31778234320"
      },
      {
        "label": "nextpnr-xilinx #142 — Carlos Venegas Arrabé on the second blind spot, added to this post after publication · MERGED 2026-08-13",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/142#issuecomment-5268596254"
      },
      {
        "label": "nextpnr-xilinx #146 — the same author confirming the attribution was ours to correct · MERGED 2026-08-14",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/146#issuecomment-5284347345"
      }
    ],
    "openQuestions": [
      "A green CI proves the toolchain emits a bitstream without falling over. It does not prove the bitstream configures a chip. In the maintainer’s words: \"That does not mean that the bitstreams work.\"",
      "#134 is open. A design that places, routes and meets timing still does nothing on the board — the relocated carry pass-through lanes drove S from a constant net, which has no physical realisation on xc7. #146 does not fix it.",
      "The six-and-a-half-year figure is the age of the call site, dated by blame. It is not evidence that the discarded failure path was reachable for all of that time — the reverse is argued here: it became reachable when the LUTRAM packing work started producing placements that fail validity.",
      "BUFR/BUFIO support in the bitstream database is still unverified. prjxray-db#1 was closed pending a fuzzer that can mint the rows with provenance; the eight proposed segbits rows are not confirmed.",
      "litex-ddr-hdmi-stlv7325 still fails, and not on the toolchain: the generated Verilog ties SHIFTOUT1/2 of a slave OSERDESE2 to constants. Vivado warns and ignores; yosys refuses.",
      "No build-time comparison against Vivado is claimed here. We have not measured it."
    ],
    "published": true,
    "ru": {
      "title": "Шесть с половиной лет в одном отброшенном значении",
      "summary": "Четыре влитых исправления сделали CI демо-проектов openXC7 зелёным. Самое старое — bool, который никто не читал: с февраля 2020 плейсер знал, что размещение невалидно, и выбрасывал ответ.",
      "openQuestions": [
        "Зелёный CI доказывает, что тулчейн выдаёт битстрим, не падая. Он не доказывает, что битстрим сконфигурирует кристалл. Словами мейнтейнера: \"That does not mean that the bitstreams work.\"",
        "#134 открыт. Дизайн, который размещается, трассируется и укладывается в тайминги, на плате не работает: перенесённые сквозные полосы переноса получали S из константной цепи, чего на xc7 физически не существует. #146 его не закрывает.",
        "Шесть с половиной лет — возраст места вызова по blame, а не доказательство, что ветка отказа была достижима всё это время. Здесь утверждается обратное: она стала достижимой, когда работа над упаковкой LUTRAM начала давать невалидные размещения.",
        "Поддержка BUFR/BUFIO в базе битстримов не подтверждена. prjxray-db#1 закрыт в ожидании фаззера, который выведет эти строки с провенансом; восемь предложенных строк segbits не подтверждены.",
        "litex-ddr-hdmi-stlv7325 по-прежнему падает, и не из-за тулчейна: сгенерированный Verilog привязывает SHIFTOUT1/2 подчинённого OSERDESE2 к константам. Vivado предупреждает и игнорирует, yosys отказывается.",
        "Сравнение времени сборки с Vivado здесь не заявляется. Мы его не измеряли."
      ]
    }
  },
  {
    "slug": "a-correct-gate-with-a-manual-remedy",
    "title": "A correct gate with a manual remedy is an outage",
    "summary": "Twelve consecutive publisher runs failed on a check that was right every time, and six merged pull requests spent sixteen hours invisible to readers.",
    "date": "2026-08-14",
    "readingMinutes": 7,
    "tags": [
      "delivery",
      "ci",
      "publishing",
      "postmortem"
    ],
    "receipts": [
      {
        "label": "ghashtag.github.io run 31774839732 — the last of twelve failures",
        "href": "https://github.com/gHashTag/ghashtag.github.io/actions/runs/31774839732"
      },
      {
        "label": "ghashtag.github.io run 31780655887 — the first green run after the fix",
        "href": "https://github.com/gHashTag/ghashtag.github.io/actions/runs/31780655887"
      },
      {
        "label": "ghashtag.github.io cf8534f — the publisher now regenerates the blog itself",
        "href": "https://github.com/gHashTag/ghashtag.github.io/commit/cf8534f450ef344be36eda90bff7e79ac316279d"
      },
      {
        "label": "regen-blog.py — the script that owns the chain",
        "href": "https://github.com/gHashTag/ghashtag.github.io/blob/main/regen-blog.py"
      }
    ],
    "openQuestions": [
      "The drift gate compares two lists of slugs. Nothing fetches a published page as a reader without JavaScript would, so a post can pass the gate and still be unreadable for a reason the gate does not model.",
      "The workflow asks for a run every fifteen minutes; the observed spacing on 13-14 August was closer to an hour, because GitHub throttles scheduled workflows. The comment in the file claiming a fifteen-minute worst case is therefore wrong, and nothing on the site measures the real lag between a merge and a reader.",
      "Cards for new posts are now drawn with Pillow in DejaVu, while the hand-made ones are set in Inter. That difference is visible and unmeasured — no platform preview has been checked against a generated card.",
      "Only the blog was audited for this shape. Other generated surfaces in the same repository — the book under docs/, the result pages under r/ — have generators that are also invoked by hand, and nobody has checked whether any gate depends on them."
    ],
    "published": true,
    "ru": {
      "title": "Верный гейт с ручным лечением — это простой",
      "summary": "Двенадцать прогонов публикатора подряд упали на проверке, которая каждый раз была права, а шесть смерженных pull request просидели шестнадцать часов невидимыми для читателя.",
      "openQuestions": [
        "Гейт сравнивает два списка слагов. Ни одна проверка не запрашивает опубликованную страницу так, как её запросил бы читатель без JavaScript, — значит пост может пройти гейт и остаться нечитаемым по причине, которой в гейте нет.",
        "Воркфлоу просит прогон каждые пятнадцать минут; наблюдаемый интервал 13–14 августа был около часа, потому что GitHub придерживает расписанные воркфлоу. Комментарий в файле про «худший случай пятнадцать минут» из-за этого неверен, и ничто на сайте не измеряет настоящую задержку между мержем и читателем.",
        "Карточки новых постов теперь рисуются Pillow в DejaVu, а сделанные руками набраны в Inter. Разница видна и не измерена — ни один предпросмотр площадки на сгенерированной карточке не проверялся.",
        "На эту форму отказа проверен только блог. В том же репозитории есть другие генерируемые поверхности — книга в docs/, страницы результатов в r/ — их генераторы тоже запускаются руками, и никто не проверял, зависит ли от них какой-нибудь гейт."
      ]
    }
  },
  {
    "slug": "eleven-verdicts-were-windows-not-checkpoints",
    "title": "Eleven verdicts were windows, not checkpoints",
    "summary": "A merged research correction replaces 140 pooled windows with four model-level replicates and turns eleven apparent verdicts into ties.",
    "date": "2026-08-13",
    "readingMinutes": 8,
    "tags": [
      "research",
      "statistics",
      "quantization",
      "reproducibility"
    ],
    "receipts": [
      {
        "label": "trinity-fpga PR #563 — merged research correction",
        "href": "https://github.com/gHashTag/trinity-fpga/pull/563"
      },
      {
        "label": "POOLED_VERDICTS_RESTATED_2026-08-12.md — merged analysis note",
        "href": "https://github.com/gHashTag/trinity-fpga/blob/main/research/block/POOLED_VERDICTS_RESTATED_2026-08-12.md"
      }
    ],
    "openQuestions": [
      "This is a re-analysis of per-window NLL already on disk; no model was re-run and no new checkpoint was measured.",
      "The one verdict that survives the correction, JK-asym-NEAR0 versus JOINT-KL, is tagged 3/4 in-sample, so it is not evidence about a new checkpoint.",
      "The corrected rows do not establish a general advantage for any codebook; a model-level result on four checkpoints remains a narrow result, not a deployment claim."
    ],
    "published": true,
    "ru": {
      "title": "Одиннадцать вердиктов оказались окнами, а не чекпоинтами",
      "summary": "Смерженная исследовательская правка заменяет 140 объединённых окон четырьмя репликами уровня модели и превращает одиннадцать видимых вердиктов в ничьи.",
      "openQuestions": [
        "Это переанализ уже сохранённых значений NLL по окнам; ни одна модель не перезапускалась, новый чекпоинт не измерялся.",
        "Сохранившийся после исправления вердикт, JK-asym-NEAR0 против JOINT-KL, помечен как 3/4 in-sample, поэтому он не свидетельствует о новом чекпоинте.",
        "Исправленные строки не доказывают общего преимущества какого-либо кодбука; результат на уровне четырёх чекпоинтов остаётся узким и не является заявлением о применении."
      ]
    }
  },
  {
    "slug": "each-half-imported-the-other",
    "title": "Each half imported the other",
    "summary": "One directory was split across two repositories and both kept flat imports of the other. Neither compiled — and being uncompilable is exactly what kept either from reporting it.",
    "date": "2026-08-12",
    "readingMinutes": 8,
    "tags": [
      "verification",
      "zig",
      "dependencies"
    ],
    "receipts": [
      {
        "label": "zig-knowledge-graph #2 — the near half, merged",
        "href": "https://github.com/gHashTag/zig-knowledge-graph/pull/2"
      },
      {
        "label": "zig-knowledge-graph #1 — the split, open",
        "href": "https://github.com/gHashTag/zig-knowledge-graph/issues/1"
      },
      {
        "label": "zig-knowledge-graph #3 — the two binaries, open",
        "href": "https://github.com/gHashTag/zig-knowledge-graph/issues/3"
      },
      {
        "label": "zig-golden-float #99 — the far half, merged",
        "href": "https://github.com/gHashTag/zig-golden-float/pull/99"
      },
      {
        "label": "trinity-training #2 — the self-invalidating pin, merged",
        "href": "https://github.com/gHashTag/trinity-training/pull/2"
      }
    ],
    "openQuestions": [
      "Only the library was made to build. `kg_cli` and `kg_server` are a Zig 0.14 to 0.15 migration across roughly 1300 lines — filed as #3, not attempted here, and until it is done those two tools remain what they have always been: unrunnable.",
      "I do not know how many other pairs in this fleet have the same shape. The one I found, I found by accident, while fixing something else.",
      "The library builds and its seven tests pass. Seven is a small number for a graph store, and nothing here establishes that the seven cover anything in particular."
    ],
    "published": true,
    "ru": {
      "title": "Каждая половина импортировала другую",
      "summary": "Одну папку разделили на два репозитория, и обе сохранили плоские импорты друг друга. Не компилировалась ни одна — и именно невозможность собраться мешала любой из них сообщить о проблеме.",
      "openQuestions": [
        "Собрана только библиотека. `kg_cli` и `kg_server` — это миграция с Zig 0.14 на 0.15 примерно по 1300 строкам; заведена как #3, здесь не делалась, и до неё эти два инструмента остаются тем, чем были всегда: незапускаемыми.",
        "Сколько ещё пар во флоте имеют ту же форму — я не знаю. Найденную нашёл случайно, чиня совсем другое.",
        "Библиотека собирается, семь тестов проходят. Семь — немного для хранилища графа, и ничто здесь не говорит, что именно эти семь покрывают."
      ]
    }
  },
  {
    "slug": "a-suite-that-runs-nothing-exits-zero",
    "title": "Zero of six hundred and forty",
    "summary": "A package declared 640 tests and ran none of them, and the exit code was 0. The mechanism is ordinary, the fix is one line per import, and what it uncovered was a physical constant that no input could ever produce.",
    "date": "2026-08-12",
    "readingMinutes": 9,
    "tags": [
      "verification",
      "zig",
      "vacuity"
    ],
    "receipts": [
      {
        "label": "zig-golden-float #98 — the unresolvable import, merged",
        "href": "https://github.com/gHashTag/zig-golden-float/pull/98"
      },
      {
        "label": "zig-golden-float #99 — export packed_vsa, submitted",
        "href": "https://github.com/gHashTag/zig-golden-float/pull/99"
      },
      {
        "label": "zig-physics #4 — 0 tests were running out of 640, submitted",
        "href": "https://github.com/gHashTag/zig-physics/pull/4"
      },
      {
        "label": "zig-physics #3 — the Barbero–Immirzi range, open",
        "href": "https://github.com/gHashTag/zig-physics/issues/3"
      },
      {
        "label": "trinity-training #1 — no test step existed, submitted",
        "href": "https://github.com/gHashTag/trinity-training/pull/1"
      }
    ],
    "openQuestions": [
      "Coverage after the fix is partial and I have not measured how partial. In zig-physics 254 tests became reachable out of 640 declared; the remaining 386 live in files that no root reaches, and I have not established whether they would pass.",
      "The Barbero–Immirzi projection is refuted, not repaired. Choosing a different mapping from E8 coordinates to γ is a physics decision, and any mapping I picked would be fitted to the assertion it had to satisfy.",
      "trinity-training builds and its five module roots run tests on the target toolchain, but those roots do not reach all 104 files. I report the count CI produces, not the 672 declared.",
      "One package, zig-knowledge-graph, is still unusable: three files importing four that do not exist. The four exist upstream; the shim is not written yet."
    ],
    "published": true,
    "ru": {
      "title": "Ноль из шестисот сорока",
      "summary": "Пакет объявлял 640 тестов и не выполнил ни одного, а код возврата был 0. Механизм самый обыкновенный, починка — одна строка на импорт, а под ней обнаружилась физическая константа, которую не даёт ни один вход.",
      "openQuestions": [
        "Покрытие после починки частичное, и насколько — я не измерял. В zig-physics стали досягаемы 254 теста из 640 объявленных; оставшиеся 386 лежат в файлах, до которых не дотягивается ни один корень, и прошли бы они — неизвестно.",
        "Проекция Барберо–Иммирци опровергнута, а не исправлена. Выбор другого отображения координат E8 в γ — решение физическое, и любое, которое выбрал бы я, оказалось бы подогнано под то самое утверждение, которому обязано удовлетворять.",
        "trinity-training собирается, и пять корней его модулей выполняют тесты на целевом тулчейне, но эти корни не покрывают все 104 файла. Я привожу число, которое выдаёт CI, а не 672 объявленных.",
        "Один пакет, zig-knowledge-graph, по-прежнему непригоден: три файла импортируют четыре несуществующих. Все четыре есть в апстриме, прослойка ещё не написана."
      ]
    }
  },
  {
    "slug": "a-repair-reaches-only-the-copy-it-lands-in",
    "title": "Sixteen defects fixed, zero of them reached the consumer",
    "summary": "Two repositories carried the same six files under the same names. Repairing one changed nothing downstream, and no instrument in either could report why — because each copy compiles entirely on its own.",
    "date": "2026-08-12",
    "readingMinutes": 7,
    "tags": [
      "Zig",
      "Modularity",
      "CI",
      "Verification"
    ],
    "receipts": [
      {
        "label": "zig-golden-float #97 — 16 defects repaired · MERGED 2026-08-11",
        "href": "https://github.com/gHashTag/zig-golden-float/pull/97"
      },
      {
        "label": "zig-hdc #3 — one implementation, CI green · MERGED 2026-08-12",
        "href": "https://github.com/gHashTag/zig-hdc/pull/3"
      },
      {
        "label": "zig-hdc #2 — the earlier attempt, closed as superseded",
        "href": "https://github.com/gHashTag/zig-hdc/pull/2"
      }
    ],
    "openQuestions": [
      "gHashTag/trinity, the consumer that started this, is still red. Its pin predates the repair and its own build has other causes, so nothing here claims that chain is finished.",
      "Listing re-exported names one by one has a cost this post does not pretend away: a symbol added upstream does not appear downstream until somebody adds it. usingnamespace, which would have avoided that, was removed in Zig 0.15.",
      "Whether the eighteen files that stayed behind should also live upstream was not decided. They have no counterpart there today; that is a fact about today, not an argument."
    ],
    "published": true,
    "ru": {
      "title": "Шестнадцать дефектов исправлены, до потребителя не дошёл ни один",
      "summary": "Два репозитория несли одни и те же шесть файлов под одними именами. Починка одного не изменила ничего внизу по цепочке, и ни один прибор не мог сказать почему — потому что каждая копия компилируется сама по себе.",
      "openQuestions": [
        "gHashTag/trinity, потребитель, с которого всё началось, всё ещё красный. Его закрепление старше починки, и у его сборки есть другие причины, так что ничто здесь не утверждает, что цепочка завершена.",
        "Перечисление реэкспортируемых имён поимённо имеет цену, и этот пост её не прячет: символ, добавленный наверху, не появится внизу, пока его туда не добавят. usingnamespace, который избавил бы от этого, убран в Zig 0.15.",
        "Должны ли восемнадцать оставшихся файлов тоже жить наверху — не решено. Сегодня у них там нет соответствия; это факт о сегодня, а не аргумент."
      ]
    }
  },
  {
    "slug": "green-ci-does-not-mean-usable",
    "title": "A green CI does not mean the library builds for you",
    "summary": "A Zig package with passing CI could not be compiled by any consumer. Lazy analysis means a test run proves only what the tests happen to touch — one line exposed five hidden errors in one package, and sixteen in the package under it.",
    "date": "2026-08-11",
    "readingMinutes": 11,
    "tags": [
      "Zig",
      "CI",
      "Verification",
      "Static analysis"
    ],
    "receipts": [
      {
        "label": "zig-golden-float #97 — 16 defects, CI green on 0.15.2 · MERGED 2026-08-11",
        "href": "https://github.com/gHashTag/zig-golden-float/pull/97"
      },
      {
        "label": "zig-hdc #2 — full-surface analysis, 5 drift errors · OPEN",
        "href": "https://github.com/gHashTag/zig-hdc/pull/2"
      },
      {
        "label": "trinity #701 — the consumer that surfaced it · OPEN",
        "href": "https://github.com/gHashTag/trinity/pull/701"
      }
    ],
    "openQuestions": [
      "Which copy of src/vsa/* is canonical is undecided. The two packages carry their own and they have diverged, so repairing one does not repair the other.",
      "zig-hdc is still red. Its five errors are in its own copy of files that were repaired in the package below it.",
      "refAllDeclsRecursive forces analysis, not execution. It proves the surface compiles; it says nothing about whether any of it is correct.",
      "Whether the same gap exists in other lazily-analysed languages was not tested. The claim here is about Zig, measured on Zig."
    ],
    "published": true,
    "ru": {
      "title": "Зелёный CI не значит, что библиотека соберётся у вас",
      "summary": "Пакет на Zig с проходящими тестами не мог собрать ни один потребитель. Ленивый анализ означает, что тесты доказывают лишь то, до чего дотянулись: одна строка вскрыла пять скрытых ошибок в одном пакете и шестнадцать в том, что под ним.",
      "openQuestions": [
        "Какая из копий src/vsa/* каноническая — не решено. Оба пакета несут свою, и они разошлись, поэтому починка одной не чинит другую.",
        "zig-hdc всё ещё красный. Его пять ошибок — в собственных копиях файлов, исправленных в пакете уровнем ниже.",
        "refAllDeclsRecursive заставляет анализировать, а не исполнять. Он доказывает, что поверхность компилируется, и ничего не говорит о том, верна ли она.",
        "Есть ли тот же разрыв в других языках с ленивым анализом — не проверялось. Утверждение здесь про Zig и измерено на Zig."
      ]
    }
  },
  {
    "slug": "scale-field-width-already-published",
    "title": "The scale field does not need eight bits, and we were not the first to say so",
    "summary": "Four bits cover the shared scale on every checkpoint measured -- bit-identical to E8M0, zero blocks truncated out of 20,462,464. The observation was published first by someone else; what is ours is the proof around it, and the constant does not survive contact with activations.",
    "date": "2026-08-11",
    "readingMinutes": 9,
    "tags": [
      "Number formats",
      "MXFP4",
      "Quantisation",
      "Prior art"
    ],
    "receipts": [
      {
        "label": "Chhugani et al., Unveiling the Potential of Quantization with MXFP4 (arXiv:2603.08713), section 3.3 -- the prior publication of the 4-bit-suffices observation",
        "href": "https://arxiv.org/abs/2603.08713"
      },
      {
        "label": "Dettmers et al., QLoRA: Efficient Finetuning of Quantized LLMs (NeurIPS 2023) -- double quantisation, 0.5 to 0.127 bits per parameter",
        "href": "https://arxiv.org/abs/2305.14314"
      },
      {
        "label": "Rouhani et al., With Shared Microexponents, A Little Shifting Goes a Long Way (ISCA 2023) -- multi-level exponent splitting",
        "href": "https://arxiv.org/abs/2302.08007"
      },
      {
        "label": "OCP Microscaling Formats (MX) Specification v1.0 -- the E8M0 shared scale this measures against",
        "href": "https://www.opencompute.org/documents/ocp-microscaling-formats-mx-v1-0-spec-final-pdf"
      }
    ],
    "openQuestions": [
      "The observation that four bits suffice for the scale exponent is not ours: Chhugani et al. (arXiv:2603.08713, section 3.3) published it on larger models. What is presented here as new is the theory around it -- the sufficiency proof, the R < S < R+2 bound, and the separation of sufficiency from necessity.",
      "Necessity was NOT established per tensor, only in the worst case. A counterexample exists in which a truncated scale field returns the same dequantised weights, so 'b_min bits are required' is false as a per-tensor statement.",
      "Activation spans are sample-dependent and were still growing between measurement windows. The five-bit figure for activations is a lower bound on what a longer run would report, not a converged number.",
      "The binade-grid phase ambiguity is worth one code either way and has not been eliminated: Pythia's R = 7.33 gives S = 8 at one phase and S = 9 at another.",
      "The five checkpoints are small (SmolLM2, Qwen, Pythia, OPT, GPT-2). The prior work reports the same conclusion on Llama-3.1-8B and Qwen3-8B, so the direction agrees at scale, but nothing here was measured at that size."
    ],
    "published": true,
    "ru": {
      "title": "Полю масштаба не нужны восемь бит, и сказали это не мы первыми",
      "summary": "Четырёх бит хватает на общий масштаб во всех измеренных чекпоинтах — побитово идентично E8M0, ноль обрезанных блоков из 20 462 464. Наблюдение опубликовано раньше и не нами; нашим остаётся доказательство вокруг него, а константа не переживает встречи с активациями.",
      "openQuestions": [
        "Наблюдение, что четырёх бит достаточно для экспоненты масштаба, — не наше: Chhugani et al. (arXiv:2603.08713, раздел 3.3) опубликовали его на моделях крупнее. Новым здесь подаётся теория вокруг него — доказательство достаточности, граница R < S < R+2 и разделение достаточности и необходимости.",
        "Необходимость НЕ установлена по тензорам, только в худшем случае. Существует контрпример, где обрезанное поле масштаба возвращает те же деквантованные веса, поэтому «требуется b_min бит» ложно как утверждение о каждом тензоре.",
        "Спаны активаций зависят от выборки и продолжали расти между окнами измерения. Пятибитная цифра по активациям — нижняя оценка, а не сошедшееся значение.",
        "Фазовая неоднозначность бинадной сетки стоит одного кода в любую сторону и не устранена: у Pythia R = 7.33 даёт S = 8 при одной фазе и S = 9 при другой.",
        "Пять чекпоинтов невелики (SmolLM2, Qwen, Pythia, OPT, GPT-2). Предшествующая работа сообщает тот же вывод на Llama-3.1-8B и Qwen3-8B, то есть направление совпадает и на масштабе, но здесь на таком размере ничего не измерялось."
      ]
    }
  },
  {
    "slug": "open-gigabit-ethernet-artix7",
    "title": "Gigabit Ethernet on Artix-7 without a vendor toolchain",
    "summary": "RGMII at gigabit through Yosys, nextpnr-xilinx and Project X-Ray with no vendor tools — the six blockers that had to be patched, the one still open, and what the workaround costs.",
    "date": "2026-08-09",
    "readingMinutes": 12,
    "tags": [
      "FPGA",
      "Open source",
      "Ethernet",
      "Artix-7",
      "openXC7"
    ],
    "receipts": [
      {
        "label": "openXC7/nextpnr-xilinx #109 — set_multicycle_path · MERGED 2026-08-09",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/109"
      },
      {
        "label": "#110 — clock-buffer preplace BFS cap · MERGED 2026-08-09",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/110"
      },
      {
        "label": "#111 — fabric-driven global buffers · MERGED 2026-08-10",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/111"
      },
      {
        "label": "#112 — SDP BRAM unused-port width bit · MERGED 2026-08-10",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/112"
      },
      {
        "label": "#113 — single-site configuration primitives · MERGED 2026-08-10",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/113"
      },
      {
        "label": "#115 — IDDR IFF flop initialisation · MERGED 2026-08-09",
        "href": "https://github.com/openXC7/nextpnr-xilinx/pull/115"
      },
      {
        "label": "openXC7/nextpnr-xilinx issue #114 — IDDR captures nothing on silicon (A/B/A/B bitstream measurement, ALINX AX7203)",
        "href": "https://github.com/openXC7/nextpnr-xilinx/issues/114"
      },
      {
        "label": "openXC7/nextpnr-xilinx issue #65 — SAME_EDGE_PIPELINED unsupported (janrinze, Mar 2025)",
        "href": "https://github.com/openXC7/nextpnr-xilinx/issues/65"
      },
      {
        "label": "Shah, Hung, Wolf, Bazanski, Gisselquist, Milanović — Yosys+nextpnr: an Open Source Framework from Verilog to Bitstream for Commercial FPGAs (FCCM 2019), arXiv:1903.10407",
        "href": "https://arxiv.org/abs/1903.10407"
      }
    ],
    "openQuestions": [
      "The link negotiates on 23 of 48 power-ups (48%, 95% interval 34-62%), independent of the RTL across four designs. Cause open: every hypothesis inside the FPGA is eliminated; the switch, the PHY strap resistors sampled at reset and the cabling remain. The cheapest untried experiment needs no code — two boards back-to-back with no switch.",
      "All six patches are OPEN on openXC7/nextpnr-xilinx — submitted upstream, none merged as of 2026-08-09.",
      "Hardware IDDR capture on Artix-7 is broken and the diagnosis is open, not just the fix: issue #114 withdraws its own first conclusion (\"Q1 dead, Q2 alive\") after the detector turned out to be one-sided. Both outputs are inert in every edge mode tried. The receive path uses fabric DDR capture as a workaround.",
      "Sigma ~= 470 ps was never measured. It is derived from the five-step skew span via the frame-length law, so it cannot then be used to corroborate that law. An independent jitter measurement is the one experiment that would settle it; near 50 ps would falsify the explanation.",
      "Frame-error rate was never measured directly, only inferred from whether the link came up. The three skew data points are right-censored at tap 31 and cannot discriminate between the candidate models."
    ],
    "published": true,
    "ru": {
      "title": "Gigabit Ethernet на Artix-7 без вендорского тулчейна",
      "summary": "RGMII на гигабите через Yosys, nextpnr-xilinx и Project X-Ray без вендорских инструментов — шесть блокеров, которые пришлось пропатчить, один оставшийся открытым, и во что обходится обходной путь.",
      "openQuestions": [
        "Линк поднимается на 23 включениях из 48 (48%, 95-процентный интервал 34-62%), независимо от RTL на четырёх разных дизайнах. Причина открыта: все гипотезы внутри FPGA исключены; остаются свитч, strap-резисторы PHY, читаемые в момент сброса, и кабель. Самый дешёвый непроведённый опыт не требует кода — две платы напрямую, без свитча.",
        "Все шесть патчей на openXC7/nextpnr-xilinx OPEN — отправлены наверх, ни один не влит по состоянию на 2026-08-09.",
        "Аппаратный захват IDDR на Artix-7 не работает, и открыт сам диагноз, а не только починка: issue #114 отзывает собственный первый вывод («Q1 мёртв, Q2 жив») после того, как детектор оказался односторонним. Оба выхода инертны во всех испробованных режимах фронта. Приёмный тракт использует захват DDR на фабрике как обходной путь.",
        "Sigma ~= 470 пс никогда не измерялась. Она выведена из размаха перекоса в пять шагов через закон длины кадра, а значит не может служить подтверждением этого же закона. Независимое измерение джиттера — тот единственный опыт, который закрыл бы вопрос; значение около 50 пс опровергло бы объяснение.",
        "Частота ошибок по кадрам не измерялась напрямую, а только выводилась из того, поднялся ли линк. Три точки по перекосу цензурированы справа на отсчёте 31 и не позволяют различить конкурирующие модели."
      ]
    }
  },
  {
    "slug": "how-to-join-the-swarm",
    "title": "How to join the swarm",
    "summary": "A hive of coding agents is rewriting this stack into its own language, one file per issue. There are two ways in - write a spec, or lend a provider key - and this is what each costs, what each earns, and which providers' terms quietly forbid the second one.",
    "date": "2026-09-23",
    "readingMinutes": 9,
    "tags": [
      "onboarding",
      "queen",
      "leaderboard",
      "t27"
    ],
    "receipts": [
      {
        "label": "LEADERBOARD - the lanes and their XP, live",
        "href": "https://app.t27.ai/queen/#/queen?tab=leaderboard"
      },
      {
        "label": "ROADMAP - the .t27 share of the stack, live",
        "href": "https://app.t27.ai/queen/#/queen?tab=roadmap"
      },
      {
        "label": "The rules of the game, machine-readable and test-checked",
        "href": "https://t27.ai/llms.txt"
      },
      {
        "label": "The open port issues, one file each",
        "href": "https://github.com/gHashTag/t27/issues?q=is%3Aissue+in%3Atitle+%22Port+tools%2F%22+is%3Aopen"
      },
      {
        "label": "NVIDIA API Trial Terms of Service (bars production use and making the service available to others)",
        "href": "https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf"
      },
      {
        "label": "OpenRouter rate limits (20/min, 50/day free; 1,000/day after a $10 lifetime top-up)",
        "href": "https://openrouter.ai/docs/api-reference/limits"
      },
      {
        "label": "GitHub Models retired 2026-07-30",
        "href": "https://docs.github.com/en/github-models"
      },
      {
        "label": "Anthropic Consumer Terms - \"You may not share your Account login information, Anthropic API key, or Account credentials with anyone else\"",
        "href": "https://www.anthropic.com/legal/consumer-terms"
      },
      {
        "label": "Google APIs Terms of Service - \"Developer credentials may not be embedded in open source projects\"",
        "href": "https://developers.google.com/terms"
      },
      {
        "label": "AI Horde - donated GPUs for kudos, and its rule that kudos are not a currency",
        "href": "https://aihorde.net/"
      },
      {
        "label": "Z.AI pricing - GLM-4.7-Flash and GLM-4.5-Flash at zero",
        "href": "https://docs.z.ai/guides/overview/pricing"
      }
    ],
    "openQuestions": [
      "A bee that runs on your own machine on your own key is the shape that lets someone contribute capacity without breaching a provider agreement - the way AI Horde and BOINC have always worked. It is not built here, and nothing in this post should be read as a promise that it is coming.",
      "Free-tier rate limits at Google, Z.AI and Mistral are no longer published or are login-gated, so the table states what each provider states and marks the rest unknown rather than guessing.",
      "Whether a donated key breaches a given provider's terms is a question about YOUR agreement with them, and the reading here is ours, not legal advice."
    ],
    "published": true,
    "ru": {
      "title": "Как войти в рой",
      "summary": "Рой кодовых агентов переписывает этот стек на собственный язык, по одному файлу на задачу. Войти можно двумя способами - написать спеку или одолжить ключ провайдера, - и здесь сказано, чего стоит каждый, что приносит, и чьи условия тихо запрещают второй.",
      "openQuestions": [
        "Пчела, работающая на вашей машине на вашем ключе, — та форма, которая позволяет отдавать мощность, не нарушая соглашения с провайдером, и именно так всегда работали AI Horde и BOINC. Здесь она не построена, и ничто в этом тексте не следует читать как обещание, что она будет.",
        "Лимиты бесплатных тарифов у Google, Z.AI и Mistral больше не публикуются или закрыты логином, поэтому таблица приводит то, что заявляет сам провайдер, а остальное помечает неизвестным, вместо того чтобы угадывать.",
        "Нарушает ли одолженный ключ условия конкретного провайдера - это вопрос о ВАШЕМ соглашении с ним, и прочтение здесь наше, а не юридическая консультация."
      ]
    }
  }
]

export const publishedPosts = () => postsIndex.filter((p) => p.published)

export const postBySlug = (slug: string) => postsIndex.find((p) => p.slug === slug)
