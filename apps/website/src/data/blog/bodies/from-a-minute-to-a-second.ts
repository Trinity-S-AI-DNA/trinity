import type { Block } from '../types'

// Numbers here were measured on the bench Mac (8 cores) during the hot-reload loop of 10-11 October 2026, ledger
// gHashTag/t27#8737 under epic gHashTag/t27#8095; the consolidated table is t27#8095 comment 6103268818. Load on
// that machine varied from about 3 to about 140 over the night, so each pair below was measured under the same
// conditions, and every speed-up whose output could differ was checked by comparing the two outputs byte for
// byte. The "now" column of the last table was measured on t27 master at load ~5 on 11 October, 03:35 UTC.

type Lang = 'en' | 'ru'

const GOLD = '#ffd700'
const GREY = '#8a8a8a'

// [en label, ru label, before seconds, after seconds]: the conservative end of each measured range.
const BARS: [string, string, number, number][] = [
  ['frontier, warm', 'frontier, тёплый', 55, 1.0],
  ['frontier after a t27c rebuild', 'frontier после пересборки t27c', 55, 6.3],
  ['watch: save to a hub spec (16 reruns)', 'watch: правка общей спеки (16 перепроверок)', 34.5, 13.9],
  ['silicon: unchanged design', 'silicon: дизайн не менялся', 4.3, 0.39],
  ['t27c suite (local)', 't27c suite (локально)', 394, 185],
  ['CI: corpus ratchet step', 'CI: шаг corpus ratchet', 221, 140],
]

const FIG_TEXT = {
  en: { label: 'Seconds before and after, on a log scale, for six places t27 builds and waits', title: 'Seconds spent waiting, before and after (log scale)', before: 'before', after: 'after' },
  ru: { label: 'Секунды до и после, в логарифмической шкале, для шести мест, где t27 собирает и ждёт', title: 'Секунды ожидания, до и после (логарифмическая шкала)', before: 'было', after: 'стало' },
}

// Text placed inside the SVG is escaped, so a label with & < > or " cannot break the markup.
const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function barsSvg(lang: Lang = 'en'): string {
  const t = FIG_TEXT[lang]
  const W = 720, rowH = 40, top = 56, x0 = 300, x1 = 690
  const H = top + BARS.length * rowH + 30
  const lo = Math.log10(0.1), hi = Math.log10(1000)
  const xs = (v: number) => x0 + ((Math.log10(v) - lo) * (x1 - x0)) / (hi - lo)
  const num = (v: number) => (lang === 'ru' ? String(v).replace('.', ',') : String(v))
  const unit = lang === 'ru' ? 'с' : 's'
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(t.label)}" style="width:100%;height:auto;font-family:inherit">`
  s += `<text x="10" y="22" font-size="15" font-weight="700" fill="currentColor">${esc(t.title)}</text>`
  s += `<rect x="${x0}" y="32" width="12" height="8" fill="${GREY}"/><text x="${x0 + 16}" y="40" font-size="11" fill="currentColor">${esc(t.before)}</text>`
  s += `<rect x="${x0 + 70}" y="32" width="12" height="8" fill="${GOLD}"/><text x="${x0 + 86}" y="40" font-size="11" fill="currentColor">${esc(t.after)}</text>`
  for (const v of [0.1, 1, 10, 100, 1000]) {
    s += `<line x1="${xs(v)}" y1="${top - 6}" x2="${xs(v)}" y2="${top + BARS.length * rowH}" stroke="currentColor" stroke-opacity="0.12"/>`
    s += `<text x="${xs(v)}" y="${top + BARS.length * rowH + 16}" font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.6">${num(v)} ${unit}</text>`
  }
  BARS.forEach((b, i) => {
    const y = top + i * rowH
    const label = lang === 'ru' ? b[1] : b[0]
    s += `<text x="${x0 - 8}" y="${y + 18}" font-size="11.5" text-anchor="end" fill="currentColor">${esc(label)}</text>`
    s += `<rect x="${x0}" y="${y + 4}" width="${xs(b[2]) - x0}" height="12" fill="${GREY}" fill-opacity="0.75"/>`
    s += `<text x="${xs(b[2]) + 4}" y="${y + 14}" font-size="10" fill="currentColor" fill-opacity="0.7">${num(b[2])}</text>`
    s += `<rect x="${x0}" y="${y + 18}" width="${xs(b[3]) - x0}" height="12" fill="${GOLD}"/>`
    s += `<text x="${xs(b[3]) + 4}" y="${y + 28}" font-size="10" font-weight="700" fill="currentColor">${num(b[3])}</text>`
  })
  return s + '</svg>'
}


// A recorded before/after pair, side by side, as an animated GIF (made from the two casts below it).
function compareSvg(id: string, h: number, label: string): string {
  return `<svg viewBox="0 0 1310 ${h}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="${esc(label)}" style="width:100%;height:auto"><image href="/term/hot-${id}-after/compare.gif" xlink:href="/term/hot-${id}-after/compare.gif" width="1310" height="${h}"/></svg>`
}

const term = (id: string, title: string, caption: string): Block => ({ kind: 'terminal', src: `term/${id}/session.cast`, share: `https://t27.ai/term/${id}/`, title, caption })

export const body: Block[] = [
  {
    kind: 'p',
    text: 'Overnight from 10 to 11 October, one loop went through every place t27 builds something and makes its author wait, measured each one, and changed what the measurements pointed at. A warm `t27c frontier` went from about a minute to under a second, a bitstream that has not changed is found in a quarter of a second instead of four to nine, and the corpus suite that CI runs on every pull request takes half its old time. Thirteen pull requests, all merged; the record is the loop ledger, t27#8737.',
  },
  { kind: 'figure', svg: barsSvg('en'), caption: 'Seconds before and after for six paths, on a log scale. Each pair is the conservative end of its measured range: the slowest "after" against the fastest "before". Measured on one 8-core Mac whose load varied from about 3 to about 140 overnight.' },
  { kind: 'h', text: 'Where the time went' },
  {
    kind: 'p',
    text: 'Almost none of it went into work that was new. It went into recomputing what had not changed since the last run, and into doing independent pieces of work one after another. Every fix below is one of those two.',
  },
  {
    kind: 'table',
    head: ['Where', 'Before', 'Now', 'What changed', 'PR'],
    rows: [
      ['`t27c frontier`, warm', '55-68 s', '~0.9 s', 'The four generated-code hashes of a spec come from a cache keyed on the spec, every spec it imports, and the bytes of the t27c binary', 't27#8741'],
      ['`t27c frontier` after a rebuild of t27c', '55-68 s', '6.3 s', 'The cache is filled by 8 workers first; the decisions are then made in order, exactly as before', 't27#8847'],
      ['`frontier --watch`, idle', '33% of a core', '3%', 'Each look stats the files and reads nothing unless a stat moved', 't27#8825'],
      ['`frontier --watch`, a save to a spec 16 others import', '34.5 s', '13.9 s', 'The reruns go side by side; specs that share a file name stay on one worker', 't27#8856'],
      ['`t27c silicon`, design unchanged', '4.3-8.9 s', '0.22-0.39 s', 'Tool digests (the 333 MB chipdb among them) come from a cache keyed on the file stat; the Python packages are read from the venv instead of `pip freeze`', 't27#8808, t27#8814'],
      ['A board run after `/bench approve`', 'build first, 30-550 s', 'load only', 'The bench agent builds the bitstream while the job waits for approval, without touching the cable', 't27#8797'],
      ['`t27c suite --corpus-only`', '394-498 s', '167-185 s', 'About 13,000 per-spec runs go 8 at a time; results are folded in file order', 't27#8837, t27#8840, t27#8845'],
      ['The same suite step in CI', '221-257 s', '108-140 s', 'Same change, measured on the runners', 't27#8837'],
    ],
  },
  { kind: 'h', text: 'Three rules did most of the work' },
  {
    kind: 'ol',
    items: [
      'Key a cache on everything that can change the output, and on nothing else. The generated code of a spec depends on its imports, because constants are inlined across them, so the key holds the whole import closure. It also holds the binary itself: any rebuild of t27c is a new generator. A key that names too little serves wrong answers; a key that names too much, like a commit of an unrelated checkout, throws good answers away.',
      'Check something cheap before something expensive. A file stat costs microseconds; reading and hashing 333 MB costs seconds. The watch and the digest cache both look at the stat first and read only what moved, and they take the stat before reading, so an edit that lands during a read is seen next time.',
      'Run independent work side by side, and prove it changed nothing. Every parallel phase folds its results in input order, and each one was run both ways, with `T27_SUITE_JOBS=1` and with the default: the error output was byte-identical, the JSON summaries equal apart from their timing fields, 259 failures both times.',
    ],
  },
  { kind: 'h', text: 'Defects found on the way' },
  {
    kind: 'ul',
    items: [
      'The bitstream cache key held `pip freeze`, which named the editable prjxray package by the commit of the t27 checkout around it. A commit there would have orphaned every cached bitstream, while an edit to prjxray itself never reached the key (t27#8814).',
      'When the bench agent stopped a build that ran past its hour, yosys and nextpnr kept running under launchd. Its timeout now stops the whole process tree (t27#8819).',
      'The first version of the watch spent a third of a core doing nothing (t27#8825).',
      'The new `tri hot` read its first silicon measurement as OVER, 28 s on a healthy cache: every tenth reuse hit is rebuilt from scratch on purpose, as an audit of the key, and that run had been timed. It now times such a run once more (t27#8872).',
    ],
  },
  { kind: 'h', text: 'Where the time still goes' },
  {
    kind: 'table',
    head: ['Path', 'Now', 'Where it goes', 'Next step'],
    rows: [
      ['Edit a spec, get its verdict', '~2 s per spec', 'Zig compiles and relinks the test binary on every run; t27c itself takes 0.03 s', 'Skip the relink: about 0.2-0.3 s per spec. It changes the test runner that every seal names, so it needs one full re-mint'],
      ['Change logic, get a bitstream', '36.7 s (ternary_link)', 'nextpnr 27.3 s: clock routing searches the whole chip for the BSCAN to BUFG arc, and the router sets up every wire of the 200T before routing a few thousand', 'A patch with byte-identical output makes clock routing 1.8-5x faster (t27#8754); a place-and-route process that stays resident would remove the setup'],
      ['Bitstream onto the board', '~13-15 s', '9.73 MB over JTAG at the default clock', 'A faster JTAG clock on the HS2 cable, about 3 s; needs a test on the board'],
      ['Approval to the start of a run', 'up to 60 s', 'The bench agent polls once a minute', 'Poll every 15 s, at about 180 more GitHub API calls an hour'],
      ['`t27c suite`', '~170 s', 'The C-header gate: 72 s of `cc -fsyntax-only` on every spec, every run', 'Cache its results by content (t27#8900)'],
    ],
  },
  {
    kind: 'p',
    text: 'Each next step in this table changes something outside the loop: what every seal records, what the board is sent, the GitHub API budget, or a file the project only lets its owner open for hand-written code. None of them was taken without the owner.',
  },
  { kind: 'h', text: "Every speed-up as one command, before and after" },
  { kind: 'p', text: "Each speed-up above is now one `tri hot` word (t27#8953): `watch`, `frontier`, `prebuild`, `suite` and `caches`, with `tri hot` alone as the check. Below, each one was recorded twice on this Mac on 11 October: before, with the speed-up switched off by the same knob used to verify it, and after. The typing is staged; every byte printed is real and arrives when it was printed. `time` prints the real duration." },
  { kind: 'figure', svg: compareSvg("frontier", 218, "tri hot frontier: what a build may reuse"), caption: "Before: an empty cache and T27_SUITE_JOBS=1, every spec generated again one after another, as every walk ran before t27#8741: 17.9 s. After: the cache warm, 1.4 s. Both print the same decision line, 1284 of 1856 reused." },
  term("hot-frontier-after", "tri hot frontier, warm", "The after run in full; its before run is at t27.ai/term/hot-frontier-before/."),
  { kind: 'figure', svg: compareSvg("prebuild", 350, "tri hot prebuild: the bitstream before the board run"), caption: "Before: T27_SILICON_REBUILD=1 forces yosys, nextpnr and the bitstream for ternary_link, what an approved board run waited for before t27#8797: 32.4 s. After: the bitstream from the reuse cache, 0.5 s, the cable never touched. The reuse key and the audit of every tenth hit make the cached bitstream the same bytes a build would write." },
  term("hot-prebuild-after", "tri hot prebuild, a reuse hit", "The after run in full; its before run is at t27.ai/term/hot-prebuild-before/."),
  { kind: 'figure', svg: compareSvg("watch", 434, "tri hot watch: a save reruns the specs that import it"), caption: "A save to reuse.t27 reruns 16 specs. Before, one at a time: the first verdict 3.1 s after the save, all 16 after 42.3 s. After, side by side: the first after 8.2 s, all 16 after 21.5 s. The batch finishes twice as fast; the first answer comes later, because eight compiles share the processor. Each verdict prints the moment its rerun ends (t27#8958)." },
  term("hot-watch-after", "tri hot watch, a save to reuse.t27", "The after run in full; its before run is at t27.ai/term/hot-watch-before/."),
  { kind: 'figure', svg: compareSvg("suite", 482, "tri hot suite: the corpus suite CI runs on every pull request"), caption: "Before: T27_SUITE_JOBS=1, about 13,000 per-spec runs one after another: 478 s. After: 8 workers, 231.5 s, the same 259 failures. Both on a loaded machine, played at x40. The FAIL lines the suite prints to stderr scroll past in both panes." },
  term("hot-suite-after", "tri hot suite, 8 workers", "The after run in full; its before run is at t27.ai/term/hot-suite-before/."),
  term('hot-check', "tri hot: the hot paths against their budgets", "`tri hot` runs each hot path once to warm it, then once timed, and says OVER when one is past its budget, or ran and failed. It is the regression test for the caches above, and the loop now starts every tick with it."),
  term('hot-caches', "tri hot caches: every cache against its eviction limit", "The gen-hash, bitstream and digest caches, each with its size and the limit t27c enforces (t27#8930, t27#8935)."),
  { kind: 'h', text: "Against the field: the TOP" },
  { kind: 'p', text: "Six things this post needs, a spec’s verdict and then its bitstream on a board, checked against each tool’s own documentation. Yes means the tool does it; half means partly, or only with a separate tool or by wrapping the flow; no means it does not, or the documentation checked does not say so." },
  { kind: 'table', head: ["", "t27 tri hot", "Bazel", "Nx", "Gradle", "Nix", "ccache", "Vivado incremental", "Quartus Rapid Recompile", "LiteX"], rows: [["Reuses a passing verdict when nothing it depends on changed", "yes", "yes", "yes", "yes", "½", "no", "no", "no", "no"], ["Reruns only what a save affects", "yes", "½ (ibazel)", "yes", "yes", "no", "no", "no", "no", "no"], ["Skips FPGA place-and-route when the design is unchanged", "yes", "½", "no", "no", "½", "no", "½", "½", "½"], ["Checks its own cache hits by rebuilding and comparing", "yes", "no", "no", "no", "yes", "no", "no", "no", "no"], ["Bounded cache with automatic eviction", "yes", "½", "no", "no", "no", "yes", "no", "no", "no"], ["Cache shared across machines", "no", "yes", "yes", "yes", "yes", "no", "no", "no", "no"], ["Score", "5", "3.5", "3", "3", "3", "1", "½", "½", "½"]] },
  { kind: 'ol', items: ["t27 tri hot, 5 of 6. What it lacks is a shared cache: every machine builds its own, and the shared-bitstream path (P8) is a spec, not a service.", "Bazel, 3.5: cached test results and a remote cache; a watch only through ibazel, and disk-cache garbage collection still experimental.", "Nx, Gradle and Nix, 3 each. Nx and Gradle cache tasks and rerun on change; Nix shares binary caches and can rebuild a path to check that it is deterministic.", "ccache, 1: a bounded compiler cache, and nothing above the compiler.", "Vivado incremental, Quartus Rapid Recompile and LiteX, half each. Vivado reuses placement and routing from a reference checkpoint but still runs them; Quartus reuses fitting for a change it judges small, and the Pro edition removed it in 21.1; LiteX reloads firmware without rebuilding the gateware. None skips a build whose inputs did not change."] },
  { kind: 'p', text: "This TOP is weighted toward this workflow: its rows are the six things t27 needed. On remote execution, ecosystem and scale, which is what a general build system is chosen for, Bazel, Nx, Gradle and Nix are far ahead, and t27 has no shared cache at all. No competitor was run on this workload; every number in this post is t27’s own, measured on one Mac." },
]

export const ruBody: Block[] = [
  {
    kind: 'p',
    text: 'В ночь с 10 на 11 октября один цикл прошёл по всем местам, где t27 что-то собирает и заставляет автора ждать, замерил каждое и поменял то, на что указали замеры. Тёплый `t27c frontier` ускорился примерно с минуты до долей секунды, неизменный битстрим находится за четверть секунды вместо четырёх-девяти, а прогон корпуса, который CI делает на каждом pull request, занимает половину прежнего времени. Тринадцать pull request, все смержены; журнал цикла — t27#8737.',
  },
  { kind: 'figure', svg: barsSvg('ru'), caption: 'Секунды до и после для шести путей, в логарифмической шкале. Каждая пара — осторожный край измеренного диапазона: самое медленное «после» против самого быстрого «до». Замеры на одном 8-ядерном Mac, нагрузка на котором за ночь менялась примерно от 3 до 140.' },
  { kind: 'h', text: 'Куда уходило время' },
  {
    kind: 'p',
    text: 'Почти никуда на новую работу. Оно уходило на пересчёт того, что не менялось с прошлого запуска, и на то, что независимые куски работы выполнялись один за другим. Каждое исправление ниже — про одно из двух.',
  },
  {
    kind: 'table',
    head: ['Где', 'Было', 'Стало', 'Что изменилось', 'PR'],
    rows: [
      ['`t27c frontier`, тёплый', '55-68 с', '~0,9 с', 'Четыре хэша сгенерированного кода спеки берутся из кэша с ключом по самой спеке, всем её импортам и байтам бинарника t27c', 't27#8741'],
      ['`t27c frontier` после пересборки t27c', '55-68 с', '6,3 с', 'Кэш сначала заполняют 8 воркеров; решения затем принимаются по порядку, ровно как раньше', 't27#8847'],
      ['`frontier --watch` в простое', '33% ядра', '3%', 'Каждый взгляд смотрит stat файлов и ничего не читает, если stat не сдвинулся', 't27#8825'],
      ['`frontier --watch`, правка спеки, которую импортируют 16 других', '34,5 с', '13,9 с', 'Перепроверки идут параллельно; спеки с одинаковым именем файла остаются на одном воркере', 't27#8856'],
      ['`t27c silicon`, дизайн не менялся', '4,3-8,9 с', '0,22-0,39 с', 'Хэши инструментов (среди них chipdb на 333 МБ) берутся из кэша по stat файла; Python-пакеты читаются из venv вместо `pip freeze`', 't27#8808, t27#8814'],
      ['Запуск на плате после `/bench approve`', 'сначала сборка, 30-550 с', 'только загрузка', 'Бенч-агент собирает битстрим, пока задача ждёт одобрения, не трогая кабель', 't27#8797'],
      ['`t27c suite --corpus-only`', '394-498 с', '167-185 с', 'Около 13 000 запусков по спекам идут по 8 сразу; результаты собираются в порядке файлов', 't27#8837, t27#8840, t27#8845'],
      ['Тот же шаг в CI', '221-257 с', '108-140 с', 'То же изменение, замер на раннерах', 't27#8837'],
    ],
  },
  { kind: 'h', text: 'Большую часть сделали три правила' },
  {
    kind: 'ol',
    items: [
      'Ключ кэша — всё, что может изменить результат, и ничего больше. Сгенерированный код спеки зависит от её импортов, потому что константы подставляются через них, — поэтому ключ держит всё замыкание импортов. И сам бинарник: любая пересборка t27c — это новый генератор. Ключ, который называет слишком мало, отдаёт неверные ответы; ключ, который называет лишнее, например коммит постороннего чекаута, выбрасывает верные.',
      'Сначала дешёвая проверка, потом дорогая. stat файла стоит микросекунды; прочитать и хэшировать 333 МБ — секунды. И watch, и кэш хэшей сначала смотрят stat и читают только то, что сдвинулось, причём stat снимается до чтения, так что правка, пришедшая во время чтения, будет замечена в следующий раз.',
      'Независимую работу — параллельно, и доказать, что ничего не изменилось. Каждая параллельная фаза собирает результаты в исходном порядке, и каждая прогнана двумя способами, с `T27_SUITE_JOBS=1` и по умолчанию: вывод ошибок совпал байт в байт, JSON-сводки — кроме полей времени, 259 падений оба раза.',
    ],
  },
  { kind: 'h', text: 'Дефекты, найденные по пути' },
  {
    kind: 'ul',
    items: [
      'Ключ кэша битстримов содержал `pip freeze`, а тот называл пакет prjxray (установленный в режиме editable) по коммиту окружающего чекаута t27. Коммит там осиротил бы все закэшированные битстримы, а правка самого prjxray в ключ не попадала (t27#8814).',
      'Когда бенч-агент останавливал сборку, превысившую час, yosys и nextpnr продолжали работать под launchd. Теперь таймаут останавливает всё дерево процессов (t27#8819).',
      'Первая версия watch тратила треть ядра, ничего не делая (t27#8825).',
      'Новая команда `tri hot` при первом же замере назвала silicon OVER — 28 с на исправном кэше: каждое десятое попадание в кэш намеренно пересобирается с нуля как аудит ключа, и замер попал на него. Теперь такой прогон замеряется ещё раз (t27#8872).',
    ],
  },
  { kind: 'h', text: 'Куда время уходит сейчас' },
  {
    kind: 'table',
    head: ['Путь', 'Сейчас', 'Куда уходит', 'Следующий шаг'],
    rows: [
      ['Правка спеки → её вердикт', '~2 с на спеку', 'Zig компилирует и заново линкует тестовый бинарник при каждом запуске; сам t27c тратит 0,03 с', 'Убрать перелинковку: около 0,2-0,3 с на спеку. Это меняет тест-раннер, который называет каждая печать, поэтому нужна одна полная перепечать'],
      ['Правка логики → битстрим', '36,7 с (ternary_link)', 'nextpnr 27,3 с: трассировка клоков ищет путь BSCAN → BUFG по всему кристаллу, а роутер настраивает каждый провод 200T, прежде чем развести несколько тысяч', 'Патч с побайтно тем же результатом ускоряет трассировку клоков в 1,8-5 раз (t27#8754); place-and-route, который остаётся в памяти, убрал бы настройку'],
      ['Битстрим → плата', '~13-15 с', '9,73 МБ по JTAG на частоте по умолчанию', 'Более быстрый JTAG на кабеле HS2 — около 3 с; нужен тест на плате'],
      ['Одобрение → старт запуска', 'до 60 с', 'Бенч-агент опрашивает раз в минуту', 'Опрос раз в 15 с — примерно на 180 вызовов GitHub API в час больше'],
      ['`t27c suite`', '~170 с', 'Гейт C-заголовков: 72 с `cc -fsyntax-only` на каждую спеку при каждом прогоне', 'Кэшировать его результаты по содержимому (t27#8900)'],
    ],
  },
  {
    kind: 'p',
    text: 'Каждый следующий шаг в этой таблице меняет что-то за пределами цикла: то, что записывает каждая печать, то, что уходит на плату, бюджет GitHub API, или файл, который проект открывает для рукописного кода только с разрешения владельца. Ни один из них не сделан без владельца.',
  },
  { kind: 'h', text: "Каждое ускорение — одна команда: было и стало" },
  { kind: 'p', text: "Каждое ускорение выше теперь вызывается одним словом `tri hot` (t27#8953): `watch`, `frontier`, `prebuild`, `suite` и `caches`, а `tri hot` без слова — проверка. Ниже каждое записано дважды на этом Mac 11 октября: «было» — с ускорением, выключенным той же ручкой, которой его проверяли, и «стало». Набор команды постановочный; каждый напечатанный байт настоящий и появляется тогда, когда был напечатан. `time` печатает реальную длительность." },
  { kind: 'figure', svg: compareSvg("frontier", 218, "tri hot frontier: что можно не перепроверять"), caption: "Было: пустой кэш и T27_SUITE_JOBS=1, код каждой спеки генерируется заново, одна за другой, как шёл каждый проход до t27#8741: 17,9 с. Стало: кэш прогрет, 1,4 с. Оба печатают одну и ту же строку решений: 1284 из 1856 переиспользованы." },
  term("hot-frontier-after", "tri hot frontier, кэш прогрет", "Прогон «стало» целиком; прогон «было» — на t27.ai/term/hot-frontier-before/."),
  { kind: 'figure', svg: compareSvg("prebuild", 350, "tri hot prebuild: битстрим до запуска на плате"), caption: "Было: T27_SILICON_REBUILD=1 заставляет заново пройти yosys, nextpnr и сборку битстрима ternary_link — то, чего одобренный запуск на плате ждал до t27#8797: 32,4 с. Стало: битстрим из кэша, 0,5 с, кабель не тронут. Ключ кэша и аудит каждого десятого попадания гарантируют, что битстрим из кэша — те же байты, что дала бы сборка." },
  term("hot-prebuild-after", "tri hot prebuild, попадание в кэш", "Прогон «стало» целиком; прогон «было» — на t27.ai/term/hot-prebuild-before/."),
  { kind: 'figure', svg: compareSvg("watch", 434, "tri hot watch: правка перепроверяет спеки, которые её импортируют"), caption: "Правка reuse.t27 перепроверяет 16 спек. Было, по одной: первый вердикт через 3,1 с после сохранения, все 16 — через 42,3 с. Стало, параллельно: первый через 8,2 с, все 16 — через 21,5 с. Вся пачка заканчивается вдвое быстрее; первый ответ приходит позже, потому что восемь компиляций делят процессор. Каждый вердикт печатается, как только кончилась его перепроверка (t27#8958)." },
  term("hot-watch-after", "tri hot watch, правка reuse.t27", "Прогон «стало» целиком; прогон «было» — на t27.ai/term/hot-watch-before/."),
  { kind: 'figure', svg: compareSvg("suite", 482, "tri hot suite: прогон корпуса, который CI делает на каждом PR"), caption: "Было: T27_SUITE_JOBS=1, около 13 000 запусков по спекам один за другим: 478 с. Стало: 8 воркеров, 231,5 с, те же 259 падений. Оба на нагруженной машине, проигрывание в 40 раз быстрее. Строки FAIL, которые прогон пишет в stderr, пролетают в обоих окнах." },
  term("hot-suite-after", "tri hot suite, 8 воркеров", "Прогон «стало» целиком; прогон «было» — на t27.ai/term/hot-suite-before/."),
  term('hot-check', "tri hot: горячие пути против бюджетов", "`tri hot` прогоняет каждый горячий путь один раз для разогрева, затем один раз с замером, и пишет OVER, если путь вышел за бюджет или запустился и упал. Это регрессионный тест для кэшей выше, и цикл теперь начинает с него каждый тик."),
  term('hot-caches', "tri hot caches: каждый кэш против своего лимита", "Кэши хэшей кода, битстримов и хэшей файлов — каждый с размером и лимитом, который соблюдает t27c (t27#8930, t27#8935)."),
  { kind: 'h', text: "Против конкурентов: TOP" },
  { kind: 'p', text: "Шесть вещей, которые нужны этому посту — вердикт спеки, а затем её битстрим на плате, — сверены с документацией каждого инструмента. «да» — инструмент это делает; «½» — частично, или только отдельным инструментом, или если обернуть поток; «нет» — не делает, или в проверенной документации об этом нет." },
  { kind: 'table', head: ["", "t27 tri hot", "Bazel", "Nx", "Gradle", "Nix", "ccache", "Vivado incremental", "Quartus Rapid Recompile", "LiteX"], rows: [["Переиспользует вердикт, если ничего, от чего он зависит, не менялось", "да", "да", "да", "да", "½", "нет", "нет", "нет", "нет"], ["Перепроверяет только то, что затронула правка", "да", "½ (ibazel)", "да", "да", "нет", "нет", "нет", "нет", "нет"], ["Пропускает place-and-route, если дизайн не менялся", "да", "½", "нет", "нет", "½", "нет", "½", "½", "½"], ["Проверяет свои попадания в кэш пересборкой и сравнением", "да", "нет", "нет", "нет", "да", "нет", "нет", "нет", "нет"], ["Ограниченный кэш с автоматическим вытеснением", "да", "½", "нет", "нет", "нет", "да", "нет", "нет", "нет"], ["Кэш, общий для нескольких машин", "нет", "да", "да", "да", "да", "нет", "нет", "нет", "нет"], ["Сумма", "5", "3.5", "3", "3", "3", "1", "½", "½", "½"]] },
  { kind: 'ol', items: ["t27 tri hot — 5 из 6. Нет общего кэша: каждая машина собирает своё, а общий путь для битстримов (P8) пока спека, а не сервис.", "Bazel — 3,5: кэш результатов тестов и удалённый кэш; watch только через ibazel, сборка мусора дискового кэша пока экспериментальная.", "Nx, Gradle и Nix — по 3. Nx и Gradle кэшируют задачи и перезапускают их при изменениях; Nix раздаёт бинарные кэши и умеет пересобрать путь, чтобы проверить детерминированность.", "ccache — 1: ограниченный кэш компилятора и ничего выше компилятора.", "Vivado incremental, Quartus Rapid Recompile и LiteX — по ½. Vivado берёт размещение и трассировку из эталонного checkpoint, но всё равно их выполняет; Quartus переиспользует fitting для изменения, которое сочтёт малым, а в Pro его убрали в 21.1; LiteX перезагружает прошивку без пересборки gateware. Ни один не пропускает сборку, у которой не менялись входы."] },
  { kind: 'p', text: "Этот TOP взвешен в пользу нашей задачи: его строки — шесть вещей, которые были нужны t27. По удалённому исполнению, экосистеме и масштабу — то, за что выбирают общую систему сборки, — Bazel, Nx, Gradle и Nix далеко впереди, а общего кэша у t27 нет вовсе. Ни один конкурент не запускался на этой задаче; каждая цифра в посте — t27, измеренная на одном Mac." },
]
