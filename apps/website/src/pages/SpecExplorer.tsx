// Spec Explorer -- the .t27 corpus, layer by layer.
//
// Pick any spec from the library and watch it through every stage the real
// compiler puts it through: tokens, AST, type check, HIR, and five codegen
// backends. The compiler is not reimplemented here -- `bootstrap/src/compiler.rs`
// is built to WebAssembly and run in the browser, so what this page draws is
// what `t27c` produces, and it cannot drift.
//
// Deliberately not using Monaco (already a dependency, used by /play): a
// hand-rolled line-numbered view lets an AST node highlight the source line it
// came from, and avoids Monaco's CDN fetch on a page that already loads a
// 477 KB wasm module.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { usePageMeta } from '../hooks/usePageMeta'
import { useDocumentLock, useViewport } from '../lib/useViewport'
import { HEADER_CHROME_MAX } from '../lib/viewport.generated'
import { SpecCodeView } from '../components/SpecCodeView'
import { SpecChipView } from '../components/SpecChipView'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { SpecEditor } from '../components/SpecEditor'
import { SpecGraphView, type GraphNodeClick } from '../components/SpecGraphView'
import { SpecMetrics } from '../components/SpecMetrics'
import { SpecShare } from '../components/SpecShare'
import { SpecContribute } from '../components/SpecContribute'
import {resolveManifestSpec,specExplorerHash} from '../lib/specCatalog'
import { reportExplorerAddress } from '../lib/queenFrame'
import { loadCorpus, type ManifestPart } from '../lib/queenCorpus'
import { specWorld, worldParam } from '../lib/queenCorpusCheck'
import { HealthBar, HealthDot, PipelineRibbon, HEALTH_COLOR } from '../components/SpecGraphics'
import { SpecSkillChips } from '../components/SpecChips'
import TerminalCast from '../components/TerminalCast'
import { loadToolSpecs, type ToolCast } from '../lib/agentSpecs'
import { TARGET_LANG, highlightCode, highlightSource, type Span } from '../lib/highlight'
import {
  analyzeCached,
  analyzeEdited,
  cachedAnalysis,
  loadCompiler,
  loadSpecSource,
  prefetchSpec,
  TARGET_LABEL,
  type Health,
  type TargetId,
  type SpecEntry,
  type SpecManifest,
  type T27Analysis,
  type T27Node,
} from '../lib/t27Compiler'

/** Shape as well as colour, so status survives a colour-blind reader. */
const HEALTH_GLYPH: Record<Health, string> = { ok: '✓', warn: '⚠', fail: '✕' }

const UI = {
  en: {
    title: 'Spec Explorer',
    subtitle: 'Every .t27 spec, layer by layer',
    metaTitle: 'Spec Explorer',
    metaDescription:
      'Browse the whole t27 spec corpus and watch each spec through the real compiler: tokens, AST, HIR and every codegen backend.',
    search: 'Search specs',
    allCategories: 'All categories',
    specs: 'specs',
    world: 'World',
    worldClear: 'Show every world',
    loading: 'Loading compiler…',
    graphLoading: 'Loading the graph…',
    compiling: 'Analysing…',
    back: '← Home',
    backToLibrary: 'All specs',
    alsoIn: 'The same bytes are also vendored at:',
    chipTitle: 'ON THE CHIP',
    chipDerived:
      'Derived from what this spec declares: the bit width of every constant, the field layout of every packed struct, and the parameter and return widths of every function. Those are hardware facts the language requires you to state.',
    chipNotSynth:
      'Not a placed-and-routed netlist. The .t27 → Verilog backend emits module shells: in the yosys sweep of 2026-09-06, over a corpus of 676 specs, 361 produced Verilog yosys accepts and every one yielded 0 LUTs and 0 flip-flops. The corpus has grown since; the sweep has not been re-run, so that is the last measurement rather than a count of today. There is no cell placement to show, so none is drawn.',
    chipEmpty:
      'This spec declares nothing with a fixed bit width, so there is no datapath to draw. Nothing is inferred to fill the space.',
    chipConsts: 'constants',
    chipStructs: 'packed structs',
    chipFns: 'functions',
    chipBits: 'bits',
    chipUnsized: 'declaration(s) carry no fixed width and are not drawn.',
    chipOmitted:
      '{n} further declaration(s) are not drawn. The diagram scales to the panel, so past about a dozen rows every label stops being readable; the remainder is counted here rather than rendered too small to read.',
    source: 'Source',
    castHeading: 'RECORDED RUN',
    castHint: 'This tool card names a terminal recording of its command (the CAST constant). It shows that the command ran and that every step exited 0; it is not a test of the text above.',
    castNone: 'No recording yet: this command card names no CAST, so no published tri cast session is attached to it.',
    tokens: 'Tokens',
    ast: 'AST',
    hir: 'HIR',
    lines: 'lines',
    nodes: 'nodes',
    depth: 'depth',
    topLevel: 'top-level',
    bytes: 'bytes',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    noResults: 'No spec matches that search.',
    pickSpec: 'Pick a spec from the library to see it through every layer.',
    typecheckOk: 'Type check passed',
    typecheckFail: 'Type check errors',
    typecheckSkipped: 'Note: no codegen path runs the type checker — t27c compile gates on it, t27c gen does not.',
    lossTitle: 'The parser dropped part of this file',
    lossBody:
      'Error recovery discarded declarations while still reporting a successful parse. The tree below is missing them.',
    discarded: 'discarded declarations',
    swallowed: 'swallowed constructs',
    lexBad: 'characters the lexer dropped',
    noHir: 'This spec produces no hardware IR.',
    targetFailed: 'This backend rejected the spec:',
    emptyOut: 'This backend produced no output.',
    showingFirst: 'Showing the first',
    ofTokens: 'of',
    showAll: 'Show all',
    provenance: 'Corpus and compiler vendored from',
    snapshotDirty: 'snapshot includes uncommitted changes',
    wasmNote: 'Real compiler, run in your browser',
    took: 'took',
    astEmpty: 'The parser returned no tree for this spec.',
    filterKind: 'Filter by node kind',
    clear: 'Clear',
    matchedNodes: 'matching nodes',
    copy: 'Copy',
    copied: 'Copied',
    highlightNote: 'Coloured from the compiler’s own token stream',
    generated: 'generated',
    working: 'Working',
    warnings: 'Warnings',
    broken: 'Broken',
    all: 'All',
    healthOk: 'Clean through every layer',
    healthWarn: 'Compiles, but the compiler flagged or dropped something',
    healthFail: 'A backend refused this spec outright',
    notSource: 'Not a module',
    notSourceHint:
      'Files under a .t27 extension that are not compilation units: Markdown documents, TRI-27 assembly, fixtures damaged on purpose, and the older spec X { } surface. The three health counts are over modules only.',
    corpusHealth: 'corpus health',
    startHere: 'START HERE',
    noneInGroup: 'Nothing in this group.',
    lesson: 'LESSON',
    tags: 'Tags',
    share: 'Share',
    skillsUsing: 'Skills that stand on this spec',
    openSkill: 'Open in the Skill Explorer',
    about: 'About this spec',
    copyLink: 'Copy link',
    contribute: 'Contribute',
    propose: 'Propose a fix →',
    report: 'Report',
    edit: 'Edit',
    reset: 'Reset',
    editing: 'Editing — not the shipped spec',
    unrun: 'not compiled yet',
    runHint: 'RUN or ⌘⏎ to compile',
    course: 'Course',
    courseNote: 'Eight lessons, in order, each one clean through every layer.',
    droppedItems: 'dropped',
    typeErrs: 'type errors',
  },
  ru: {
    title: 'Обозреватель спек',
    subtitle: 'Каждая .t27-спека, слой за слоем',
    metaTitle: 'Обозреватель спек',
    metaDescription:
      'Просмотр всего корпуса спек t27 и каждой спеки через настоящий компилятор: токены, AST, HIR и все бэкенды кодогенерации.',
    search: 'Поиск по спекам',
    allCategories: 'Все категории',
    specs: 'спек',
    world: 'Мир',
    worldClear: 'Показать все миры',
    loading: 'Загрузка компилятора…',
    graphLoading: 'Загрузка графа…',
    compiling: 'Анализ…',
    back: '← На главную',
    backToLibrary: 'Все спеки',
    alsoIn: 'Те же байты лежат также в:',
    chipTitle: 'НА КРИСТАЛЛЕ',
    chipDerived:
      'Построено из того, что объявляет спека: разрядность каждой константы, раскладка полей каждой packed-структуры, ширины параметров и возврата каждой функции. Это аппаратные факты, которые язык требует указать явно.',
    chipNotSynth:
      'Это не размещённый и не разведённый нетлист. Бэкенд .t27 → Verilog выдаёт оболочки модулей: в прогоне yosys от 2026-09-06 по корпусу из 676 спек 361 дала Verilog, который принимает yosys, и каждая — 0 LUT и 0 триггеров. Корпус с тех пор вырос, а прогон не повторяли, так что это последнее измерение, а не счёт на сегодня. Размещать нечего, поэтому ничего и не нарисовано.',
    chipEmpty:
      'Эта спека не объявляет ничего с фиксированной разрядностью, поэтому тракт данных рисовать не из чего. Ничего не додумано.',
    chipConsts: 'константы',
    chipStructs: 'packed-структуры',
    chipFns: 'функции',
    chipBits: 'бит',
    chipUnsized: 'объявлений без фиксированной разрядности не нарисованы.',
    chipOmitted:
      'Ещё {n} объявлений не нарисованы. Схема масштабируется под панель, и после десятка строк подписи перестают читаться; остаток посчитан здесь, а не отрисован нечитаемо мелко.',
    source: 'Исходник',
    castHeading: 'ЗАПИСАННЫЙ ПРОГОН',
    castHint: 'Эта карточка инструмента называет терминальную запись своей команды (константа CAST). Запись показывает, что команда запускалась и каждый шаг завершился с кодом 0; проверкой текста выше она не является.',
    castNone: 'Записи пока нет: в карточке команды нет CAST, и опубликованная сессия tri cast к ней не привязана.',
    tokens: 'Токены',
    ast: 'AST',
    hir: 'HIR',
    lines: 'строк',
    nodes: 'узлов',
    depth: 'глубина',
    topLevel: 'верхний уровень',
    bytes: 'байт',
    expandAll: 'Развернуть всё',
    collapseAll: 'Свернуть всё',
    noResults: 'Ни одна спека не подходит под запрос.',
    pickSpec: 'Выберите спеку из библиотеки, чтобы увидеть её на всех слоях.',
    typecheckOk: 'Проверка типов пройдена',
    typecheckFail: 'Ошибки проверки типов',
    typecheckSkipped: 'Заметьте: ни один путь кодогенерации не запускает проверку типов — t27c compile её требует, t27c gen нет.',
    lossTitle: 'Парсер отбросил часть этого файла',
    lossBody:
      'Восстановление после ошибок отбросило объявления, но парсинг всё равно отмечен успешным. В дереве ниже их нет.',
    discarded: 'отброшенных объявлений',
    swallowed: 'проглоченных конструкций',
    lexBad: 'символов отброшено лексером',
    noHir: 'Эта спека не даёт аппаратного IR.',
    targetFailed: 'Этот бэкенд отклонил спеку:',
    emptyOut: 'Этот бэкенд не выдал ничего.',
    showingFirst: 'Показаны первые',
    ofTokens: 'из',
    showAll: 'Показать все',
    provenance: 'Корпус и компилятор взяты из',
    snapshotDirty: 'снимок включает незакоммиченные изменения',
    wasmNote: 'Настоящий компилятор, запущенный в вашем браузере',
    took: 'за',
    astEmpty: 'Парсер не вернул дерево для этой спеки.',
    filterKind: 'Фильтр по типу узла',
    clear: 'Сбросить',
    matchedNodes: 'подходящих узлов',
    copy: 'Копировать',
    copied: 'Скопировано',
    highlightNote: 'Раскрашено по собственному потоку токенов компилятора',
    generated: 'сгенерировано',
    working: 'Рабочие',
    warnings: 'С замечаниями',
    broken: 'Сломанные',
    all: 'Все',
    healthOk: 'Чисто на всех слоях',
    healthWarn: 'Компилируется, но компилятор что-то отбросил или пометил',
    healthFail: 'Бэкенд отказался обрабатывать эту спеку',
    notSource: 'Не модуль',
    notSourceHint:
      'Файлы с расширением .t27, которые не являются единицами компиляции: документы Markdown, ассемблер TRI-27, намеренно повреждённые фикстуры и старая форма spec X { }. Три счётчика здоровья считаются только по модулям.',
    corpusHealth: 'здоровье корпуса',
    startHere: 'НАЧНИТЕ ЗДЕСЬ',
    noneInGroup: 'В этой группе пусто.',
    lesson: 'УРОК',
    tags: 'Теги',
    share: 'Поделиться',
    skillsUsing: 'Скилы, которые стоят на этой спеке',
    openSkill: 'Открыть в Обозревателе скилов',
    about: 'Об этой спеке',
    copyLink: 'Копировать ссылку',
    contribute: 'Внести вклад',
    propose: 'Предложить правку →',
    report: 'Сообщить',
    edit: 'Правка',
    reset: 'Сброс',
    editing: 'Редактирование — это уже не исходная спека',
    unrun: 'ещё не скомпилировано',
    runHint: 'RUN или ⌘⏎ для компиляции',
    course: 'Курс',
    courseNote: 'Восемь уроков по порядку, каждый чист на всех слоях.',
    droppedItems: 'отброшено',
    typeErrs: 'ошибок типов',
  },
} as const

type Ui = Record<keyof typeof UI.en, string>

// The site's tokens (index.css :root) rather than a stock editor palette.
// Panels sit a step above pure black: on OLED, white text on #000 smears
// during scroll, and this list scrolls a lot.
const C = {
  bg: '#000000',
  panel: '#0b0d0c',
  raised: '#121614',
  border: 'rgba(0,255,136,0.10)',
  borderBright: 'rgba(0,255,136,0.34)',
  text: '#FFFFFF',
  muted: '#8b9490',
  accent: '#00FF88',
  golden: '#FFD700',
  bad: '#f85149',
  warn: '#f0a020',
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`
  return `${(n / 1024).toFixed(1)}K`
}

/** The group a chip selects. `not-source` crosses the health axis rather than extending it. */
type SpecGroup = Health | 'all' | 'course' | 'not-source'

/**
 * Whether a spec belongs in the selected group.
 *
 * One function, two callers: the list and the tag-facet counts. Those were the
 * same three lines written out twice, a few lines apart -- which is exactly how
 * a facet ends up promising results the list will not show.
 *
 * The three health chips count MODULES only, matching the manifest's `health`
 * block, so the chip and the list it opens can never disagree. A file that is
 * not a compilation unit is in `not-source` whatever the compiler did with it;
 * `sourceKind` defaults to `source` so a catalog written before the classifier
 * existed behaves exactly as it did.
 */
function inGroup(s: SpecEntry, group: SpecGroup): boolean {
  if (group === 'course') return !!s.tutorial
  const isSource = (s.sourceKind ?? 'source') === 'source'
  if (group === 'not-source') return !isSource
  if (group === 'all') return true
  return isSource && s.health === group
}

/** Colour a node by its family so structure reads at a glance. */
function kindColor(kind: string): string {
  if (kind.startsWith('Expr')) return C.accent
  if (kind.startsWith('Stmt')) return '#58a6ff'
  if (kind.endsWith('Decl') || kind === 'Module') return C.golden
  if (kind.endsWith('Block') || kind === 'EnumVariant') return '#c792ea'
  return C.muted
}

const LAYERS = [
  { id: 'source', kind: 'source' },
  { id: 'graph', kind: 'graph' },
  { id: 'tokens', kind: 'tokens' },
  { id: 'ast', kind: 'ast' },
  { id: 'typecheck', kind: 'typecheck' },
  { id: 'hir', kind: 'hir' },
  { id: 'zig', kind: 'target' },
  { id: 'verilog', kind: 'target' },
  { id: 'verilog_hir', kind: 'target' },
  { id: 'c', kind: 'target' },
  { id: 'rust', kind: 'target' },
  { id: 'js', kind: 'target' },
  { id: 'ts', kind: 'target' },
  { id: 'chip', kind: 'chip' },
] as const

type LayerId = (typeof LAYERS)[number]['id']

// LAYERS stays written out -- half of it is not a backend, and a spread of
// TARGET_IDS would widen every `id` to `string` and take LayerId with it. So
// the list is checked instead of derived: add a backend without a layer to show
// it in and this line stops compiling. LAYER_LABEL, being a Record<LayerId,_>,
// already refuses a layer with no name.
const _everyBackendHasALayer: TargetId extends LayerId ? true : never = true
void _everyBackendHasALayer

// The backend names come from t27Compiler's TARGET_LABEL, which every other
// page that names t27's outputs reads too -- one list, not one per page.
const LAYER_LABEL: Record<LayerId, string> = {
  source: 'Source',
  graph: 'Graph',
  tokens: 'Tokens',
  ast: 'AST',
  typecheck: 'Types',
  hir: 'HIR',
  ...TARGET_LABEL,
  chip: 'Chip',
}

// ---------------------------------------------------------------- AST tree

interface AstRowProps {
  node: T27Node
  depth: number
  path: string
  open: Set<string>
  toggle: (path: string) => void
  onHover: (line: number | null) => void
  filter: string
}

function AstRow({ node, depth, path, open, toggle, onHover, filter }: AstRowProps) {
  const hasKids = node.children.length > 0
  const isOpen = open.has(path)
  const dim = filter.length > 0 && !node.kind.toLowerCase().includes(filter.toLowerCase())

  const scalars: [string, string][] = []
  if (node.name) scalars.push(['name', node.name])
  if (node.value) scalars.push(['value', node.value])
  if (node.type) scalars.push(['type', node.type])
  if (node.op) scalars.push(['op', node.op])
  if (node.returnType) scalars.push(['→', node.returnType])
  if (node.field) scalars.push(['field', node.field])

  return (
    <div>
      <div
        onMouseEnter={() => onHover(node.line)}
        onMouseLeave={() => onHover(null)}
        onClick={() => hasKids && toggle(path)}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          padding: '1px 6px',
          paddingLeft: 6 + depth * 14,
          cursor: hasKids ? 'pointer' : 'default',
          opacity: dim ? 0.25 : 1,
          borderRadius: 3,
          fontSize: 12.5,
          lineHeight: 1.65,
          fontFamily: C.mono,
        }}
      >
        <span style={{ width: 10, flexShrink: 0, color: C.muted, fontSize: 9 }}>
          {hasKids ? (isOpen ? '▾' : '▸') : ''}
        </span>
        <span style={{ color: kindColor(node.kind), fontWeight: 600 }}>{node.kind}</span>
        {scalars.map(([k, v]) => (
          <span key={k} style={{ color: C.muted, whiteSpace: 'nowrap' }}>
            {k}=<span style={{ color: '#d8d8d8' }}>{v.length > 40 ? v.slice(0, 40) + '…' : v}</span>
          </span>
        ))}
        {node.params && node.params.length > 0 && (
          <span style={{ color: C.muted }}>({node.params.map((p) => `${p.name}: ${p.type}`).join(', ')})</span>
        )}
        {hasKids && !isOpen && (
          <span style={{ color: C.muted, opacity: 0.6 }}>{node.children.length}</span>
        )}
        <span style={{ marginLeft: 'auto', color: C.muted, opacity: 0.5, fontSize: 11, flexShrink: 0 }}>
          {node.line || ''}
        </span>
      </div>
      {hasKids && isOpen && (
        <div>
          {node.children.map((c, i) => (
            <AstRow
              key={i}
              node={c}
              depth={depth + 1}
              path={`${path}.${i}`}
              open={open}
              toggle={toggle}
              onHover={onHover}
              filter={filter}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------- page

export default function SpecExplorer() {
  const { lang } = useI18n()
  const ui: Ui = lang === 'ru' ? UI.ru : UI.en
  usePageMeta(ui.metaTitle, ui.metaDescription)
  const viewContext=useMemo(()=>{
    const p=new URLSearchParams(window.location.hash.split('?')[1]||'')
    return {path:p.get('spec'),sha256:p.get('sha256')??undefined,embedded:p.get('embed')==='1'}
  },[])
  const embedded=viewContext.embedded
  const requestRef=useRef(0)
  const [verifiedHash,setVerifiedHash]=useState<string|null>(null)

  const [manifest, setManifest] = useState<SpecManifest | null>(null)
  // The store's part, for the corpus identity this frame prints on its root.
  const [corpus, setCorpus] = useState<ManifestPart | null>(null)
  // The world the address names (#/specs?world=ghashtag/t27): in the Queen, the one
  // its header has chosen. The list shows that repository's specs only.
  const [world, setWorld] = useState<string | null>(() => worldParam(new URLSearchParams(window.location.hash.split('?')[1] || '').get('world')))
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('')
  // The course first, by default. Someone arriving here has no way to know
  // which of 760 specs to open, and "Working 522" is still 522 unordered
  // files; the eight lessons are the one path through this that starts
  // somewhere. Every other group is one click away and carries its count.
  // `not-source` is a fourth group beside the three health states rather than a
  // fourth health state: it answers a different question (what IS this file)
  // and the two axes cross. 31 files here compile cleanly.
  const [healthFilter, setHealthFilter] = useState<Health | 'all' | 'course' | 'not-source'>('course')
  // Multi-select, AND across selections: picking domain/fpga + has/tests means
  // "FPGA specs that have tests", which is the question people actually ask.
  const [tagSel, setTagSel] = useState<string[]>([])
  const [tagsOpen, setTagsOpen] = useState(false)
  const [selected, setSelected] = useState<SpecEntry | null>(null)

  /**
   * Below the phone tier's upper bound the two panes cannot both be useful.
   *
   * The desktop layout is a 300px library beside the detail pane. On a 375px
   * phone that left 150-odd pixels for the detail, which wrapped every word of
   * the description onto its own line -- and the row still overflowed, so the
   * page scrolled sideways and the search box was clipped off the top.
   *
   * The bound is PHONE_MAX from specs/ui/viewport.t27, read through
   * useViewport (matchMedia per tier plus `resize`; see the note there about
   * programmatic viewport changes not always delivering a matchMedia change
   * event). Tablets stay on the two-pane layout.
   */
  // Distinct from `narrow` below, which only trims chrome. This one changes
  // the layout's shape, so it gets its own name.
  const viewport = useViewport()
  const phone = viewport.tier === 'phone'
  // Phone and tablet lock the document (DOCUMENT_SCROLLS = false): the panes
  // scroll, body's 80px bottom padding for the long pages does not apply.
  useDocumentLock(viewport.tier === 'phone' || viewport.tier === 'tablet')

  /**
   * Which pane a narrow screen is showing. Master-detail, the way a phone
   * expects: the library is the landing view, tapping a spec opens it, and a
   * back control returns. Ignored entirely when the two-pane layout fits.
   */
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>('list')
  const [source, setSource] = useState('')
  // The recorded run a tool card ends with. Read from the tool catalog, where
  // scripts/agents-from-specs.mjs castProblems() already held the CAST to its files,
  // so this page carries no second copy of the rule; null for every other spec.
  const [cast, setCast] = useState<ToolCast | null>(null)
  // True when the selected spec is a tri command card the catalog lists without a CAST.
  const [castMissing, setCastMissing] = useState(false)
  const [result, setResult] = useState<T27Analysis | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // Source first: the page is an input surface, so what loads is the thing you
  // can type into. Every other layer is one click away and already computed.
  // `view=graph` in the address opens the Graph layer (T27F, public/t27f/graph); no other layer is addressed.
  const [layer, setLayer] = useState<LayerId>(() => (new URLSearchParams(window.location.hash.split('?')[1] || '').get('view') === 'graph' ? 'graph' : 'source'))
  const layerRef = useRef(layer)
  layerRef.current = layer
  /** The lines a click on a graph box asked the Source layer to show. */
  const [reveal, setReveal] = useState<{ from: number; to: number; seq: number } | null>(null)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [, setHoverLine] = useState<number | null>(null)
  const [kindFilter, setKindFilter] = useState('')
  const [tokenLimit, setTokenLimit] = useState(400)
  const [ms, setMs] = useState<number | null>(null)
  // `pick` is defined below but needed by the mount effect above; a ref keeps
  // the ordering honest without hoisting the callback out of the component.
  const pickRef = useRef<((s: SpecEntry) => Promise<void>) | null>(null)
  // Live editing. `draft` is null until the source is touched; once it is set,
  // `baseline` holds the shipped spec's result so every metric can be shown as
  // a delta rather than a bare number.
  const [draft, setDraft] = useState<string | null>(null)
  const [baseline, setBaseline] = useState<T27Analysis | null>(null)
  const [dirty, setDirty] = useState(false)
  /** The exact text the current `result` was produced from. */
  const [lastCompiled, setLastCompiled] = useState('')

  useEffect(() => {
    // Instantiate the compiler at mount, not at first click: instantiation
    // dominates a cold compile, and paying it here makes the first selection
    // as fast as every later one.
    void loadCompiler().catch(()=>{/* The selected spec surfaces compiler failures. */})
    loadCorpus('manifest')
      .then((part) => {
        const m = part.data
        setCorpus(part)
        setManifest(m)
        // A shared link names its spec; honour it before falling back to the
        // teaching spec. Without this a share would only ever say "the
        // explorer, go find it yourself".
        const named = new URLSearchParams(window.location.hash.split('?')[1] || '')
        const wanted = named.get('spec')
        const target = resolveManifestSpec(m,wanted)
        if (target) {
          // An address that names a spec is someone asking for the corpus at
          // that spec, so the library beside it is the whole library. This used
          // to lift the course filter only for a spec outside the course, and
          // the homepage frame opens hello_world -- lesson 0 -- so it kept the
          // course chip on and read "9 specs" beside a map saying 856. The
          // course default is for an arrival that names nothing.
          if (wanted || worldParam(named.get('world'))) setHealthFilter('all')
          // A shared link names a spec on purpose, so on a phone it opens that
          // spec. The featured-spec fallback does not: nobody asked for it, and
          // the library is the honest landing view.
          if (wanted && target.path === wanted) setMobilePane('detail')
          void pickRef.current?.(target)
        }
      })
      .catch((e) => {setErr(String(e));setMobilePane('detail')})
  }, [])

  // In a frame, a spec named by a later hash -- the Queen moving its frame after Back
  // or a link -- opens that spec; the address used to be read once at mount, so a
  // changed ?spec= left the old spec open under it. The page on its own still reads
  // its address once, as before.
  useEffect(() => {
    if (!manifest || !embedded) return
    const onHash = () => {
      const wanted = new URLSearchParams(window.location.hash.split('?')[1] || '').get('spec')
      if (!wanted || wanted === selected?.path) return
      try {
        const target = resolveManifestSpec(manifest, wanted)
        setHealthFilter('all')
        setMobilePane('detail')
        void pickRef.current?.(target)
      } catch {
        // An unknown path in a later hash: keep the spec that is open.
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [manifest, selected, embedded])

  // The world follows the address on every page, in a frame or not: the Queen moves
  // its frame's fragment when the header picks a world, and nothing else would tell
  // this page. A world narrows the list, so the course default would leave it empty.
  useEffect(() => {
    const onHash = () => {
      const next = worldParam(new URLSearchParams(window.location.hash.split('?')[1] || '').get('world'))
      setWorld(next)
      if (next) setHealthFilter('all')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const inWorld = useCallback((s: SpecEntry) => !world || specWorld(s.repo) === world, [world])
  /** On its own page the chip clears the world; in the Queen the header owns it. */
  const clearWorld = useCallback(() => {
    setWorld(null)
    const p = new URLSearchParams(window.location.hash.split('?')[1] || '')
    p.delete('world')
    window.history.replaceState(null, '', `#/specs?${p}`)
  }, [])

  // Inline styles cannot carry media queries, and the header has three pieces
  // of text that will happily overlap rather than wrap. Track the width and
  // drop the optional ones instead.
  // Embedded in the Queen HUD (?embed=1): the frame already sits under the
  // HUD's own chrome, so the page header would be a second title bar.
  // HEADER_CHROME_MAX is the 1100 this page always used; it is not a tier.
  const narrow = viewport.width < HEADER_CHROME_MAX

  // Embedded, the frame is the viewport, and the site's 80px body
  // padding-bottom -- there for the mobile CTA -- means nothing inside one. It
  // made the document 778px against a 698px frame, so the whole app scrolled
  // and left a strip of background under the code. The Queen shell drops the
  // same padding for the same reason.
  //
  // Only the padding: locking the body's overflow as well would fix desktop
  // twice over and break the phone, where the pane is deliberately
  // overflow:visible so the page scrolls instead of trapping the gesture in a
  // nested scroller. With the padding gone the desktop frame does not overflow
  // anyway.
  useEffect(() => {
    if (!embedded) return
    const body = document.body
    const previous = body.style.paddingBottom
    body.style.paddingBottom = '0px'
    return () => { body.style.paddingBottom = previous }
  }, [embedded])

  // Which specs are also somewhere else, byte for byte. Vendoring keeps the
  // first copy it sees and discards the rest, so the corpus shows one entry for
  // a file that may live in four repositories -- true, and until now invisible.
  // Keyed by the path that was kept, which is the one a reader has open.
  const copiesOf = useMemo(() => {
    const index = new Map<string, { path: string; repo: string }[]>()
    for (const d of manifest?.duplicates ?? []) {
      const list = index.get(d.sameAs)
      if (list) list.push({ path: d.path, repo: d.repo })
      else index.set(d.sameAs, [{ path: d.path, repo: d.repo }])
    }
    return index
  }, [manifest])

  const filtered = useMemo(() => {
    if (!manifest) return []
    const q = query.trim().toLowerCase()
    return manifest.specs.filter((s) => {
      if (!inWorld(s)) return false
      if (!inGroup(s, healthFilter)) return false
      if (tagSel.length && !tagSel.every((t) => s.tags.includes(t))) return false
      if (category && s.category !== category) return false
      if (!q) return true
      return (
        s.path.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.module ? s.module.toLowerCase().includes(q) : false) ||
        (s.description ? s.description.toLowerCase().includes(q) : false)
      )
    })
  }, [manifest, query, category, healthFilter, tagSel, inWorld])

  /**
   * Counts for each tag *given the rest of the filter*, so a facet never
   * promises results it cannot deliver. A tag that would yield nothing on top
   * of the current selection reads 0 and is disabled rather than being a dead
   * click. Selected tags are excluded from their own narrowing so their count
   * stays meaningful.
   */
  const tagCounts = useMemo(() => {
    if (!manifest) return {}
    const q = query.trim().toLowerCase()
    const base = manifest.specs.filter((s) => {
      if (!inWorld(s)) return false
      if (!inGroup(s, healthFilter)) return false
      if (category && s.category !== category) return false
      if (q && !(s.path.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) ||
        (s.module ? s.module.toLowerCase().includes(q) : false) ||
        (s.description ? s.description.toLowerCase().includes(q) : false))) return false
      return true
    })
    const out: Record<string, number> = {}
    for (const s of base) {
      const othersMatch = tagSel.every((t) => s.tags.includes(t))
      for (const t of s.tags) {
        // For an unselected tag, only count rows that already satisfy every
        // selected tag -- that is what clicking it would actually give you.
        const rest = tagSel.filter((x) => x !== t)
        if (tagSel.includes(t) ? rest.every((x) => s.tags.includes(x)) : othersMatch) {
          out[t] = (out[t] || 0) + 1
        }
      }
    }
    return out
  }, [manifest, query, category, healthFilter, tagSel, inWorld])

  const toggleTag = useCallback((t: string) => {
    setTagSel((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }, [])

  const pick = useCallback(async (spec: SpecEntry) => {
    const request=++requestRef.current
    // Selection paints immediately -- that sub-100ms response IS the feedback.
    // Never label another source's analysis as the newly selected spec.
    setSelected(spec)
    setSource('');setDraft(null);setResult(null);setLastCompiled('');setVerifiedHash(null)
    setErr(null)
    setTokenLimit(400)
    // A draft belongs to the spec it was typed against.
    setBaseline(null)
    setDirty(false)
    // Keep the address bar on the selected spec so the link is always
    // shareable, without pushing 676 history entries as someone browses.
    const expectedSha256=spec.path===viewContext.path?viewContext.sha256:undefined
    setBusy(true)
    try {
      const address=specExplorerHash(spec.path,{embedded,sha256:expectedSha256,world,view:layerRef.current==='graph'?'graph':null})
      window.history.replaceState(null,'',address)
      reportExplorerAddress(address)
      const text = await loadSpecSource(spec.path,expectedSha256)
      if(request!==requestRef.current)return
      const warm=cachedAnalysis(spec.path,text)
      setVerifiedHash(expectedSha256??null)
      setSource(text)
      // The source pane is editable from the moment it loads -- no mode to
      // enter, nothing to click first.
      setDraft(text)
      const t0 = performance.now()
      const r = await analyzeCached(spec.path, text)
      if(request!==requestRef.current)return
      setMs(warm ? 0 : performance.now() - t0)
      setResult(r)
      setLastCompiled(text)
      // Open the root and its immediate children: enough to show the shape of
      // the module without rendering thousands of rows on a large spec.
      const seed = new Set<string>(['0'])
      r.ast?.children.forEach((_, i) => seed.add(`0.${i}`))
      setOpen(seed)
    } catch (e) {
      if(request===requestRef.current)setErr(String(e))
    } finally {
      if(request===requestRef.current)setBusy(false)
    }
  }, [embedded,viewContext,world])

  pickRef.current = pick

  // The address names the layer only for the Graph (view=graph), so a link, a reload and the Queen's frame keep it.
  // replaceState fires no hashchange, so this does not feed the listener below.
  useEffect(() => {
    if (!selected) return
    const expectedSha256 = selected.path === viewContext.path ? viewContext.sha256 : undefined
    const address = specExplorerHash(selected.path, { embedded, sha256: expectedSha256, world, view: layer === 'graph' ? 'graph' : null })
    if (window.location.hash === address) return
    window.history.replaceState(null, '', address)
    reportExplorerAddress(address)
  }, [layer, selected, embedded, viewContext, world])

  // The Queen moves its frame by the fragment: follow a view= it changed.
  useEffect(() => {
    const onHash = () => {
      const graph = new URLSearchParams(window.location.hash.split('?')[1] || '').get('view') === 'graph'
      setLayer((l) => (graph ? 'graph' : l === 'graph' ? 'source' : l))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  /** A click on a graph box: open the Source layer with that box's lines selected. */
  const showLines = useCallback((n: GraphNodeClick) => {
    setLayer('source')
    setReveal((r) => ({ from: n.line, to: n.end, seq: (r?.seq ?? 0) + 1 }))
  }, [])

  /** Run the real compiler over the edited source. */
  const run = useCallback(async () => {
    if (draft === null) return
    const request=++requestRef.current
    setBusy(true)
    setErr(null)
    try {
      // Keep the shipped spec's result as the comparison point, computed once.
      if (!baseline && result) setBaseline(result)
      const t0 = performance.now()
      const r = await analyzeEdited(draft)
      if(request!==requestRef.current)return
      setMs(performance.now() - t0)
      setResult(r)
      setLastCompiled(draft)
      setDirty(false)
      const seed = new Set<string>(['0'])
      r.ast?.children.forEach((_, i) => seed.add(`0.${i}`))
      setOpen(seed)
    } catch (e) {
      if(request===requestRef.current)setErr(String(e))
    } finally {
      if(request===requestRef.current)setBusy(false)
    }
  }, [draft, baseline, result])

  /**
   * Compile as you type.
   *
   * A compile is 5-70ms, well inside the budget where a person perceives the
   * result as immediate, so there is no reason to make them ask for it. 200ms
   * of quiet is the trigger: long enough not to fire mid-word, short enough
   * that the pause before you look up is already over.
   *
   * RUN stays, and stays useful -- it runs without waiting for the debounce,
   * and it is the affordance that tells you this page compiles at all.
   */
  // `run` is reachable through a ref so it is not an effect dependency:
  // otherwise every render hands the effect a new function, the cleanup
  // cancels the pending timer, and the 200ms never actually elapses.
  const runRef = useRef(run)
  runRef.current = run

  useEffect(() => {
    if (draft === null || draft === lastCompiled) return
    const id = window.setTimeout(() => { void runRef.current() }, 200)
    return () => window.clearTimeout(id)
  }, [draft, lastCompiled])

  /** Discard the edit and put the shipped spec back. */
  const reset = useCallback(() => {
    if (!selected) return
    setDraft(null)
    setDirty(false)
    setDraft(source)
    if (baseline) {
      setResult(baseline)
      setLastCompiled(source)
      setBaseline(null)
      setMs(0)
    }
  }, [selected, baseline, source])

  const toggle = useCallback((path: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    if (!result?.ast) return
    const all = new Set<string>()
    const walk = (n: T27Node, p: string) => {
      if (n.children.length) all.add(p)
      n.children.forEach((c, i) => walk(c, `${p}.${i}`))
    }
    walk(result.ast, '0')
    setOpen(all)
  }, [result])

  const kindCounts = useMemo(() => {
    if (!result?.ast) return []
    const counts = new Map<string, number>()
    const walk = (n: T27Node) => {
      counts.set(n.kind, (counts.get(n.kind) || 0) + 1)
      n.children.forEach(walk)
    }
    walk(result.ast)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [result])

  const editorText = draft ?? source

  // Highlight from the compiler's own token stream -- see lib/highlight.ts.
  //
  // The tokens must belong to the text on screen, or the colours land on the
  // wrong characters. That is what the live compile below guarantees: by the
  // time you have stopped typing for 200ms, `result.tokens` describes exactly
  // this text. In the gap, the previous spans are close enough to read and are
  // corrected within a frame of the next compile.
  // Declared before the memo that reads it: useMemo runs its callback during
  // this call, so a ref declared afterwards would still be in its temporal
  // dead zone and throw.
  const highlightRef = useRef<{ text: string; spans: Span[][] }>({ text: '', spans: [] })

  const sourceSpans: Span[][] = useMemo(() => {
    if (result && editorText === lastCompiled) {
      const spans = highlightSource(editorText, result.tokens)
      highlightRef.current = { text: editorText, spans }
      return spans
    }
    if (highlightRef.current.text === editorText) return highlightRef.current.spans
    // Nothing authoritative for this exact text: keep the shape, drop the
    // colour, rather than paint one revision's tokens onto another's.
    return editorText.split('\n').map((l) => [{ text: l, cls: 'plain' as const }])
  }, [editorText, result, lastCompiled])

  /** True once the draft diverges from the file as shipped. */
  const edited = draft !== null && draft !== source
  const selectedPath = selected?.path ?? null
  useEffect(() => {
    setCast(null)
    setCastMissing(false)
    const isToolCard = selectedPath !== null && selectedPath.startsWith('specs/tools/')
    if (!isToolCard) return
    let live = true
    loadToolSpecs()
      .then((catalog) => {
        const card = catalog.tools.find((t) => t.specPath === selectedPath)
        if (!live) return
        setCast(card?.cast ?? null)
        const isCommandWithoutCast = card !== undefined && card.family === 'tri-cli' && !card.cast
        setCastMissing(isCommandWithoutCast)
      })
      .catch(() => { /* No catalog, no recording: the source still renders. */ })
    return () => { live = false }
  }, [selectedPath])

  const activeTarget = LAYERS.find((l) => l.id === layer)?.kind === 'target' ? result?.targets?.[layer] : undefined

  const codeSpans: Span[][] | null = useMemo(() => {
    if (layer === 'hir' && result?.hir.ok && result.hir.text) return highlightCode(result.hir.text, TARGET_LANG.hir)
    if (activeTarget?.ok && activeTarget.code) return highlightCode(activeTarget.code, TARGET_LANG[layer] || 'plain')
    return null
  }, [layer, result, activeTarget])

  const lossCount =
    (result?.discarded.length || 0) + (result?.swallowed.length || 0) + (result?.lexerDiscarded.length || 0)

  const box: React.CSSProperties = {
    // Embedded in the HUD the panes float on the star map, so their ground is
    // the shell's own veil rather than a solid panel: one 0.42 layer, the value
    // every other panel out there uses. Standalone, the Explorer is a page and
    // keeps its opaque panel.
    background: embedded ? 'rgba(2, 8, 6, 0.66)' : C.panel,
    // Frosted where the text is. Over the hive the code was legible only where
    // the map happened to be empty: a cell's outline running through a line of
    // source is a line you read twice. The blur keeps the map as depth behind
    // the panel and takes its detail out of the words.
    ...(embedded ? { backdropFilter: 'blur(7px)' } : null),
    border: `1px solid ${C.border}`,
    borderRadius: 6,
  }

  return (
    <div
      className="spec-x" data-tier={viewport.tier} data-embedded={embedded ? "1" : undefined}
      // The corpus on show, from the store the Queen shell reads: the shell's root
      // carries the same three, and qa/queen-spec-sync-contract.mjs compares them.
      data-spec-count={corpus?.identity.specCount}
      data-corpus-version={corpus?.version}
      data-corpus-source={corpus?.source}
      data-spec-world={world ?? undefined}
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: C.bg,
        color: C.text,
        fontFamily: "'Outfit', system-ui, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* header */}
      {/* Everything after the title is allowed to shrink and then clip: on a
          narrow window the provenance line would otherwise wrap under the
          heading and overlap it. */}
      {!embedded && <header
        style={{
          minHeight: 52,
          flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 16px',
          overflow: 'hidden',
        }}
      >
        <Link to="/" className="spec-x-target" style={{ color: C.muted, textDecoration: 'none', fontSize: 13, flexShrink: 0 }}>
          {ui.back}
        </Link>
        {/* flexShrink 0 here pushed the language switcher 9px off a 375px
            screen: the Russian title is longer than the English one and the
            block refused to give. The header clips with overflow:hidden, so
            nothing showed it -- the page-level mobile audit reads
            documentElement.scrollWidth, which an ancestor's overflow:hidden
            clamps. The title now truncates instead, which is the right thing
            for a heading standing beside a control. */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, flexShrink: 1 }}>
          <span style={{
            fontSize: 16, fontWeight: 700, color: C.golden,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{ui.title}</span>
          {!narrow && (
            <span
              style={{
                fontSize: 12,
                color: C.muted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ui.subtitle}
            </span>
          )}
        </div>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 11,
            color: C.muted,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {!narrow && <span style={{ color: C.accent, whiteSpace: 'nowrap', flexShrink: 0 }}>◆ {ui.wasmNote}</span>}
          {/* Not on a phone. Making the title shrinkable so the language
              switcher could fit had a cost I did not look for: with the
              provenance line still competing for the same row, the title
              collapsed to "О..." on a 375px screen. Provenance is developer
              metadata about which corpus snapshot is loaded -- it was already
              truncated to "Корпус и компи…" and told nobody anything. The page
              title is its identity. On a phone the metadata goes and the title
              stays. */}
          {manifest && !phone && (
            <span
              style={{
                fontFamily: C.mono,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
              title={`${manifest.generatedFrom.repo}@${manifest.generatedFrom.commit}`}
            >
              {ui.provenance} {manifest.generatedFrom.repo}@{manifest.generatedFrom.shortCommit}
              {manifest.generatedFrom.specsOrCompilerDirty ? ` (${ui.snapshotDirty})` : ''}
            </span>
          )}
        </div>
        {/* The site is translated into five languages and this page was the
            only one with no way to say so: it renders its own header instead of
            <Navigation>, which is where the switcher had always lived. Someone
            arriving here directly -- and /specs is the most-shared link on the
            site -- had no control at all, only a ?lang= they would have to know
            about.

            Outside the provenance block and flexShrink: 0, because that block
            is deliberately allowed to clip and a control that disappears on a
            narrow header is the bug being fixed, not a smaller version of it. */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', marginLeft: 12 }}>
          <LanguageSwitcher />
        </div>
      </header>}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }}>
        {/* library */}
        {(!phone || mobilePane === 'list') && <aside
          style={{
            width: phone ? '100%' : 300,
            // Allowed to shrink on a narrow window rather than pushing the
            // layer panes off-screen entirely. On a phone it is the whole
            // width, because the detail pane is not on screen beside it.
            minWidth: phone ? 0 : 180,
            flexShrink: 1,
            borderRight: phone ? 'none' : `1px solid ${C.border}`,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ui.search}
              aria-label={ui.search}
              style={{
                background: C.raised,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                color: C.text,
                padding: '7px 9px',
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={ui.allCategories}
              style={{
                // The platform's own arrow is drawn hard against the control's
                // right border and cannot be moved. This is the chevron the
                // worlds select uses, with room around it, and the padding
                // keeps the longest category name clear of it.
                appearance: 'none',
                background: `${C.raised} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='m2 4 4 4 4-4' fill='none' stroke='%23e7f7fa' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 12px center`,
                backgroundSize: '11px 11px',
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                color: C.text,
                padding: '6px 32px 6px 8px',
                fontSize: 12.5,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              <option value="">
                {ui.allCategories} ({manifest?.specCount ?? 0})
              </option>
              {manifest &&
                Object.entries(manifest.categories).map(([c, n]) => (
                  <option key={c} value={c}>
                    {c} ({n})
                  </option>
                ))}
            </select>
            {/* Counts live inside the filter, so the summary and the
                navigation are one control rather than two that can disagree.
                Every spec is counted once, at its worst stage, so these sum
                to the corpus total. */}
            {manifest && (
              <>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {([
                    ['course', ui.course, manifest.specs.filter((s) => s.tutorial).length],
                    ['ok', ui.working, manifest.health.ok],
                    ['warn', ui.warnings, manifest.health.warn],
                    ['fail', ui.broken, manifest.health.fail],
                    // Counted from the entries, not read from `manifest.notSource`,
                    // so this chip is right on a catalog generated before that
                    // block existed instead of reading 0 over a full list.
                    ['not-source', ui.notSource, manifest.specs.filter((s) => inGroup(s, 'not-source')).length],
                    ['all', ui.all, manifest.specCount],
                  ] as [SpecGroup, string, number][]).map(([k, label, n]) => {
                    const on = healthFilter === k
                    const col =
                      k === 'all' || k === 'not-source' ? C.muted : k === 'course' ? C.golden : HEALTH_COLOR[k]
                    return (
                      <button
                        key={k}
                        onClick={() => setHealthFilter(k)}
                        aria-pressed={on}
                        title={k === 'not-source' ? ui.notSourceHint : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: on ? 'rgba(255,255,255,0.07)' : 'transparent',
                          border: `1px solid ${on ? col : C.border}`,
                          borderRadius: 999,
                          color: on ? col : C.muted,
                          padding: '2px 9px',
                          cursor: 'pointer',
                          fontSize: 11,
                          fontFamily: 'inherit',
                        }}
                      >
                        {k === 'course' ? (
                          <span aria-hidden="true">◆</span>
                        ) : k === 'not-source' ? (
                          <span aria-hidden="true">◇</span>
                        ) : k !== 'all' ? (
                          <span aria-hidden="true">{HEALTH_GLYPH[k]}</span>
                        ) : null}
                        <span>{label}</span>
                        <span style={{ fontFamily: C.mono, opacity: 0.8 }}>{n}</span>
                      </button>
                    )
                  })}
                </div>
                {/* The bar's denominator is the modules, not the corpus. The
                    three counts are over `source` entries, so dividing them by
                    `specCount` would leave a silent 121-wide gap on the right
                    that reads as a fourth, unnamed state. */}
                <HealthBar
                  health={manifest.health}
                  total={manifest.health.ok + manifest.health.warn + manifest.health.fail}
                />
              </>
            )}
            {/* Tag facets, grouped by family. Collapsed by default: 40-odd
                chips above a list is noise until you want them. */}
            {manifest && (
              <div>
                <button
                  onClick={() => setTagsOpen((v) => !v)}
                  aria-expanded={tagsOpen}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: tagSel.length ? C.accent : C.muted,
                    padding: '2px 0',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    fontFamily: 'inherit',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 9 }}>{tagsOpen ? '▾' : '▸'}</span>
                  <span>{ui.tags}</span>
                  {tagSel.length > 0 && (
                    <span style={{ fontFamily: C.mono }}>{tagSel.length}</span>
                  )}
                  {tagSel.length > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setTagSel([]) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setTagSel([]) } }}
                      style={{ marginLeft: 'auto', color: C.muted, textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {ui.clear}
                    </span>
                  )}
                </button>

                {/* Selected tags stay visible when the panel is shut, so the
                    filter is never invisibly active. */}
                {!tagsOpen && tagSel.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                    {tagSel.map((t) => (
                      <button key={t} onClick={() => toggleTag(t)} style={tagChip(true, false)}>
                        {t} ✕
                      </button>
                    ))}
                  </div>
                )}

                {tagsOpen && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {TAG_FAMILIES.map((fam) => {
                      const inFam = Object.keys(manifest.tags)
                        .filter((t) => (fam.prefix === '' ? !t.includes('/') : t.startsWith(fam.prefix)))
                        .sort((a, b) => (tagCounts[b] ?? 0) - (tagCounts[a] ?? 0) || a.localeCompare(b))
                      if (!inFam.length) return null
                      return (
                        <div key={fam.prefix}>
                          <div style={{ fontSize: 9.5, letterSpacing: 0.6, color: C.muted, opacity: 0.7, marginBottom: 3 }}>
                            {fam.label.toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {inFam.map((t) => {
                              const on = tagSel.includes(t)
                              const n = tagCounts[t] ?? 0
                              const dead = n === 0 && !on
                              return (
                                <button
                                  key={t}
                                  onClick={() => !dead && toggleTag(t)}
                                  disabled={dead}
                                  aria-pressed={on}
                                  title={t}
                                  style={tagChip(on, dead)}
                                >
                                  {t.includes('/') ? t.slice(t.indexOf('/') + 1) : t}
                                  <span style={{ opacity: 0.6, marginLeft: 4 }}>{n}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {world && (
              <div className="spec-x-world" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.text, fontFamily: C.mono }}>
                <span style={{ color: C.muted }}>◈ {ui.world}</span>
                <span data-lang-exempt="live" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{world}</span>
                {!embedded && (
                  <button type="button" onClick={clearWorld} aria-label={ui.worldClear} title={ui.worldClear} style={{ background: 'none', border: 0, color: C.muted, cursor: 'pointer', padding: '0 4px', fontSize: 13 }}>✕</button>
                )}
              </div>
            )}
            <div className="spec-x-listed" data-spec-listed={manifest ? filtered.length : undefined} style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
              {filtered.length} {ui.specs}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {filtered.length === 0 && manifest && (
              <div style={{ padding: 14, fontSize: 12.5, color: C.muted }}>
                {query || category ? ui.noResults : ui.noneInGroup}
              </div>
            )}
            {filtered.map((s) => {
              const active = selected?.path === s.path
              const dir = s.path.slice(0, s.path.lastIndexOf('/') + 1)
              return (
                <button
                  key={s.path}
                  // The tap IS the navigation on a phone, so the pane switch
                  // lives here rather than inside pick(): the explorer also
                  // picks a spec on load, and that must land on the library,
                  // not drop a first-time visitor into a file they did not
                  // choose.
                  onClick={() => { setMobilePane('detail'); void pick(s) }}
                  // Users hover 80-150ms before clicking; that is half the
                  // compile budget, free.
                  onPointerEnter={() => void prefetchSpec(s.path)}
                  onFocus={() => void prefetchSpec(s.path)}
                  // The visible label is nested divs, which leaves the button
                  // with no accessible name -- spell it out.
                  aria-label={`${s.module || s.name} — ${s.path}, ${s.lines} ${ui.lines}, ${s.health}`}
                  aria-current={active ? 'true' : undefined}
                  style={{
                    display: 'flex',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                    background: active ? 'rgba(0,255,136,0.10)' : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${active ? C.accent : 'transparent'}`,
                    color: active ? C.accent : C.text,
                    padding: '7px 10px',
                    cursor: 'pointer',
                    fontFamily: C.mono,
                    fontSize: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ paddingTop: 2 }}>
                    <HealthDot health={s.health} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                        {s.module || s.name}
                      </span>
                      {s.featured ? (
                        <span
                          style={{
                            fontSize: 8.5,
                            letterSpacing: 0.5,
                            color: C.golden,
                            border: `1px solid ${C.golden}`,
                            borderRadius: 3,
                            padding: '0 4px',
                            flexShrink: 0,
                          }}
                        >
                          {ui.startHere}
                        </span>
                      ) : s.tutorial ? (
                        <span
                          style={{
                            fontSize: 8.5,
                            letterSpacing: 0.5,
                            color: C.golden,
                            opacity: 0.75,
                            flexShrink: 0,
                            fontFamily: C.mono,
                          }}
                        >
                          {ui.lesson} {s.lesson}
                        </span>
                      ) : null}
                    </span>
                    {/* Dim the directory, keep the basename readable. */}
                    <span
                      style={{
                        display: 'block',
                        fontSize: 10,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: C.muted,
                      }}
                    >
                      <span style={{ opacity: 0.55 }}>{dir}</span>
                      {s.path.slice(dir.length)} · {s.lines}
                    </span>
                    {s.description && (
                      <span
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontFamily: "'Outfit', system-ui, sans-serif",
                          fontSize: 11,
                          lineHeight: 1.4,
                          color: '#9aa0a6',
                          marginTop: 2,
                        }}
                      >
                        {s.description}
                      </span>
                    )}
                    {s.health !== 'ok' && (
                      <span style={{ display: 'block', fontSize: 10, color: HEALTH_COLOR[s.health], marginTop: 2 }}>
                        {s.failedBackends.length > 0 && `${s.failedBackends.join(', ')} ✕ `}
                        {s.loss > 0 && `${s.loss} ${ui.droppedItems} `}
                        {s.tcErrors > 0 && `${s.tcErrors} ${ui.typeErrs}`}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>}

        {/* main */}
        {/* On a phone the detail column scrolls as ONE document.
            The desktop shape is a fixed-height flex column inside a 100dvh
            root with overflow:hidden, so the only thing that scrolls is the
            innermost code pane. That works when the pane owns most of the
            screen. On a 375x812 phone the description, tags, share row,
            metrics and tab strip come first, and the pane was left about three
            lines tall with its own scrollbar -- the code was effectively
            invisible and the page underneath would not move. */}
        {(!phone || mobilePane === 'detail') && <main style={{
          flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0,
          ...(phone ? { overflowY: 'auto', WebkitOverflowScrolling: 'touch' } : null),
        }}>
          {/* The way back on a phone. Nothing else returns to the library:
              the aside is not on screen, and the browser's back button
              belongs to the route, not to this pane. */}
          {phone && (
            <button
              className="spec-x-back" onClick={() => setMobilePane('list')}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${C.border}`,
                color: C.accent,
                font: `12px ${C.mono}`,
                // 44px is the smallest reliably tappable target.
                minHeight: 44,
                padding: '0 14px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              ← {ui.backToLibrary}
            </button>
          )}
          {err && (
            <div style={{ padding: 14, color: C.bad, fontFamily: C.mono, fontSize: 13 }}>{err}</div>
          )}
          {verifiedHash&&<p role="status" style={{padding:'0 14px',color:C.muted,fontSize:11,overflowWrap:'anywhere'}}>{lang==='ru'?'Исходник каталога: SHA-256 проверен':'Catalog source: SHA-256 verified'} · {verifiedHash}</p>}

          {!selected && !err && (
            <div style={{ margin: 'auto', color: C.muted, fontSize: 14, textAlign: 'center', padding: 24 }}>
              {manifest ? ui.pickSpec : ui.loading}
            </div>
          )}

          {selected && (
            <>
              {/* stats */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '9px 14px',
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  flexWrap: 'wrap',
                  fontFamily: C.mono,
                  fontSize: 11.5,
                  color: C.muted,
                }}
              >
                <span style={{ color: HEALTH_COLOR[selected.health] }} title={ui[selected.health === 'ok' ? 'healthOk' : selected.health === 'warn' ? 'healthWarn' : 'healthFail']}>
                  {HEALTH_GLYPH[selected.health]}
                </span>
                <span style={{ color: C.golden, fontWeight: 600 }}>{selected.path}</span>
                {busy && <span style={{ color: C.accent }}>{ui.compiling}</span>}
                {result && (
                  <>
                    <span>{result.sourceLines} {ui.lines}</span>
                    <span>{result.tokenCount} {ui.tokens.toLowerCase()}</span>
                    {result.nodeCount !== undefined && (
                      <span>{result.nodeCount} {ui.nodes} / {ui.depth} {result.astDepth}</span>
                    )}
                    {ms !== null && <span style={{ opacity: 0.7 }}>{ui.took} {ms.toFixed(0)}ms</span>}
                  </>
                )}

                {/* Edit / RUN / Reset. RUN is the loud one on purpose -- it is
                    the action the whole page exists to make cheap. */}
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Reset only appears once there is something to reset. */}
                  {edited && <button onClick={reset} style={ctrlBtn}>{ui.reset}</button>}
                  {/* On a phone this one is replaced by the sticky button at the
                      bottom of the screen: this row sits at the TOP of a column
                      that now scrolls, so after reading any distance the control
                      is off-screen and out of thumb reach. Two identical RUN
                      buttons would be worse than either alone. */}
                  {!phone && <button
                    onClick={() => void run()}
                    disabled={busy}
                    title={ui.runHint}
                    style={{
                      // Filled once the text differs from what was last
                      // compiled: the button tells you there is work pending
                      // rather than looking identical either way.
                      background: dirty ? C.accent : 'transparent',
                      color: dirty ? '#04150c' : C.accent,
                      border: `1px solid ${C.accent}`,
                      borderRadius: 4,
                      padding: '3px 16px',
                      cursor: busy ? 'default' : 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      fontFamily: 'inherit',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {busy ? ui.compiling : 'RUN'}
                  </button>}
                </span>
              </div>

              {/* description + pipeline: what this spec is, and where it dies.
                  Embedded on the landing this ran 284px tall and left the code
                  332px, so there it collapses behind a summary and the code
                  gets the height. On its own page it stays open, and the
                  summary is hidden, so nothing about /specs changes. */}
              {(selected.description || result) && (
                <details className={`spec-x-brief${embedded ? ' is-collapsible' : ''}`} open={!embedded}>
                  <summary>{ui.about}</summary>
                <div
                  style={{
                    flexShrink: 0,
                    padding: '10px 14px 0',
                    display: 'flex',
                    gap: 18,
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selected.description && (
                      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: '#b9bfc6', maxWidth: 'none' }}>
                        {selected.description}
                      </p>
                    )}
                    {/* The same bytes, somewhere else. One entry can stand for
                        copies in several repositories, and a reader deciding
                        where a spec really lives needs to be told that. */}
                    {(copiesOf.get(selected.path)?.length ?? 0) > 0 && (
                      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: C.golden, maxWidth: 'none' }}>
                        {ui.alsoIn}{' '}
                        {copiesOf.get(selected.path)!.map((c, i) => (
                          <span key={c.path}>
                            {i > 0 ? ', ' : ''}
                            <code style={{ fontFamily: C.mono, fontSize: 11 }}>{c.path}</code>
                          </span>
                        ))}
                      </p>
                    )}
                    {/* Derived from the compile, not written by hand -- so it
                        cannot drift from the artifact it describes. */}
                    {selected.summary && (
                      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: C.muted, maxWidth: 'none' }}>
                        {selected.summary}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {selected.tags.map((t) => (
                        <button
                          key={t}
                          onClick={() => { if (!tagSel.includes(t)) toggleTag(t); setTagsOpen(true) }}
                          title={`Filter by ${t}`}
                          style={tagChip(tagSel.includes(t), false)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {/* The reverse direction of the skill link, derived at
                        index time and never written into a .t27 file. Renders
                        nothing when no skill names this spec. */}
                    <SpecSkillChips specPath={selected.path} labels={{ skillsUsing: ui.skillsUsing, openSkill: ui.openSkill }} />
                    <SpecShare key={selected.path} spec={selected} embedded={embedded} labels={{ share: ui.share, copy: ui.copyLink, copied: ui.copied }} />
                    {!embedded&&<SpecContribute spec={selected} result={result} edited={edited} labels={{ contribute: ui.contribute, propose: ui.propose, report: ui.report }} />}
                  </div>
                  {result && (
                    <div style={{ flex: '0 1 340px', minWidth: 220 }}>
                      <PipelineRibbon
                        result={result}
                        active={layer}
                        onPick={(id) => setLayer(id as LayerId)}
                        labels={LAYER_LABEL}
                        interactive={viewport.tier !== 'phone' && viewport.tier !== 'tablet'}
                      />
                    </div>
                  )}
                  {/* Full metrics only while editing: on an unedited spec the
                      stats bar and ribbon already say everything, and a second
                      copy would be noise. */}
                  {result && draft !== null && (
                    <div style={{ flexBasis: '100%', marginTop: 4 }}>
                      <SpecMetrics
                        result={result}
                        baseline={baseline}
                        ms={ms}
                        labels={{ tokens: ui.tokens, nodes: ui.nodes, depth: ui.depth, typeErrs: ui.typeErrs, droppedItems: ui.droppedItems }}
                      />
                    </div>
                  )}
                </div>
                </details>
              )}

              {/* loss banner -- the honest bit */}
              {result && lossCount > 0 && (
                <div
                  className="spec-x-banner"
                  style={{
                    flexShrink: 0,
                    margin: '10px 14px 0',
                    padding: '9px 12px',
                    background: 'rgba(248,81,73,0.10)',
                    border: `1px solid ${C.bad}`,
                    borderRadius: 5,
                    fontSize: 12,
                  }}
                >
                  <div style={{ color: C.bad, fontWeight: 700, marginBottom: 3 }}>⚠ {ui.lossTitle}</div>
                  <div style={{ color: '#d8d8d8', marginBottom: 5 }}>{ui.lossBody}</div>
                  <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 11 }}>
                    {result.discarded.length} {ui.discarded} · {result.swallowed.length} {ui.swallowed} ·{' '}
                    {result.lexerDiscarded.length} {ui.lexBad}
                  </div>
                </div>
              )}

              {/* layer tabs */}
              <div
                // Every backend's name legible at once. The strip scrolled
                // sideways, so past Zig the tabs existed only for whoever
                // thought to drag a row that gives no sign it can be dragged —
                // Verilog, and the HIR beside it, were off the end of an 804px
                // pane. Wrapping costs one line and hides nothing.
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  padding: '10px 14px 0',
                }}
              >
                {LAYERS.map((l) => {
                  const t = l.kind === 'target' ? result?.targets?.[l.id] : null
                  const failed = l.kind === 'target' && result && t && !t.ok
                  const active = layer === l.id
                  // A size on the tab makes the backends comparable at a glance
                  // without opening each one.
                  let badge = ''
                  if (result) {
                    if (l.id === 'tokens') badge = String(result.tokenCount)
                    else if (l.id === 'ast') badge = String(result.nodeCount ?? '')
                    else if (l.id === 'typecheck') badge = String(result.typecheck?.errorCount ?? 0)
                    else if (l.id === 'hir') badge = result.hir.ok ? fmtBytes(result.hir.text?.length ?? 0) : '—'
                    else if (t?.ok) badge = fmtBytes(t.bytes ?? 0)
                  }
                  return (
                    <button
                      // Keyed by spec too, so the one-shot failure flash
                      // re-fires when a different spec fails the same backend.
                      key={`${l.id}:${selected.path}`}
                      className={failed ? 'spec-x-flag' : undefined}
                      onClick={() => setLayer(l.id)}
                      aria-current={active ? 'true' : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        background: active ? C.raised : 'transparent',
                        border: `1px solid ${active ? C.borderBright : 'transparent'}`,
                        borderBottom: active ? `1px solid ${C.bg}` : `1px solid ${C.border}`,
                        borderRadius: '5px 5px 0 0',
                        color: failed ? C.bad : active ? C.accent : C.muted,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: 12.5,
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>{LAYER_LABEL[l.id]}</span>
                      {failed ? (
                        <span aria-hidden="true">✕</span>
                      ) : badge ? (
                        <span style={{ fontSize: 10, fontFamily: C.mono, opacity: 0.65 }}>{badge}</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {/* layer body */}
              {/* On a phone this stops competing for the leftovers of a fixed
                  column and simply asks for a readable height, letting <main>
                  scroll. 70vh is about 30 lines of the mono face at this size:
                  enough to read a function without the pane becoming a second
                  scroll region fighting the page. */}
              <div style={{
                flex: phone ? 'none' : 1,
                minHeight: phone ? '70vh' : 0,
                padding: '0 14px 14px',
                display: 'flex',
              }}>
                <div
                  className="spec-x-pane spec-x-scroll"
                  data-pending={busy ? 'true' : 'false'}
                  style={{
                    ...box,
                    flex: 1,
                    minHeight: 0,
                    borderTopLeftRadius: 0,
                    // The page is the scroller on a phone; a nested one here
                    // traps the gesture and is what made the code unreachable.
                    ...(phone ? { overflow: 'visible' } : null),
                  }}
                >
                  {/* Keyed on spec+layer so switching either replays the
                      90ms enter; the AST tree inside is never animated. */}
                  <div className="spec-x-swap" key={`${selected.path}:${layer}`}>
                  {/* source -- read-only until edited, then a plain textarea.
                      A textarea rather than a contenteditable overlay: the
                      whole point is that what you type is exactly what the
                      compiler receives, with no DOM in between. */}
                  {layer === 'source' && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 3,
                          background: C.panel,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 10px',
                          borderBottom: `1px solid ${C.border}`,
                          fontFamily: C.mono,
                          fontSize: 11,
                          color: C.muted,
                        }}
                      >
                        <span>{editorText.length} {ui.bytes}</span>
                        {edited && <span style={{ color: C.golden }}>{ui.editing}</span>}
                        {dirty ? (
                          <span style={{ color: C.warn }}>{ui.unrun}</span>
                        ) : (
                          <span style={{ opacity: 0.75 }}>{ui.highlightNote}</span>
                        )}
                        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>{ui.runHint}</span>
                      </div>
                      <SpecEditor
                        value={editorText}
                        onChange={(v) => { setDraft(v); setDirty(v !== lastCompiled) }}
                        lines={sourceSpans}
                        onRun={() => void run()}
                        ariaLabel={ui.source}
                        reveal={reveal}
                      />
                      {cast && (
                        <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>{ui.castHeading}</div>
                          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>{ui.castHint}</div>
                          <div data-lang-exempt="live">
                            <TerminalCast key={cast.src} src={cast.src} title={cast.title} share={cast.share} caption={cast.recorded ? `${cast.title} · ${cast.recorded}` : cast.title} />
                          </div>
                        </div>
                      )}
                      {castMissing && (
                        <div data-cast-state="none" style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>{ui.castHeading}</div>
                          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>{ui.castNone}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* graph -- the T27F view of the open spec, drawn by t27f.wasm (components/SpecGraphView) */}
                  {layer === 'graph' && <SpecGraphView path={selected.path} text={editorText} onNode={showLines} loading={ui.graphLoading} />}

                  {/* tokens */}
                  {layer === 'tokens' && result && (
                    <div style={{ padding: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {result.tokens.slice(0, tokenLimit).map((t, i) => (
                          <span
                            key={i}
                            title={`${t.kind} @ ${t.line}:${t.col}`}
                            onMouseEnter={() => setHoverLine(t.line)}
                            onMouseLeave={() => setHoverLine(null)}
                            style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              gap: 1,
                              padding: '3px 6px',
                              background: C.raised,
                              border: `1px solid ${C.border}`,
                              borderRadius: 3,
                              fontFamily: C.mono,
                              fontSize: 11,
                            }}
                          >
                            <span style={{ color: C.accent }}>
                              {t.lexeme.length > 18 ? t.lexeme.slice(0, 18) + '…' : t.lexeme || '␠'}
                            </span>
                            <span style={{ color: C.muted, fontSize: 9.5 }}>{t.kind}</span>
                          </span>
                        ))}
                      </div>
                      {result.tokens.length > tokenLimit && (
                        <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
                          {ui.showingFirst} {tokenLimit} {ui.ofTokens} {result.tokens.length}.{' '}
                          <button
                            onClick={() => setTokenLimit(result.tokens.length)}
                            style={{
                              background: 'transparent',
                              border: `1px solid ${C.border}`,
                              borderRadius: 4,
                              color: C.accent,
                              padding: '3px 9px',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontFamily: 'inherit',
                            }}
                          >
                            {ui.showAll}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ast */}
                  {layer === 'ast' && result && (
                    <div>
                      <div
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                          background: C.panel,
                          borderBottom: `1px solid ${C.border}`,
                          padding: '7px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <button onClick={expandAll} style={ctrlBtn}>{ui.expandAll}</button>
                        <button onClick={() => setOpen(new Set(['0']))} style={ctrlBtn}>{ui.collapseAll}</button>
                        <input
                          value={kindFilter}
                          onChange={(e) => setKindFilter(e.target.value)}
                          placeholder={ui.filterKind}
                          aria-label={ui.filterKind}
                          style={{
                            background: C.raised,
                            border: `1px solid ${C.border}`,
                            borderRadius: 4,
                            color: C.text,
                            padding: '4px 8px',
                            fontSize: 12,
                            fontFamily: C.mono,
                            outline: 'none',
                            width: 160,
                          }}
                        />
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginLeft: 'auto' }}>
                          {kindCounts.slice(0, 8).map(([k, n]) => (
                            <button
                              key={k}
                              onClick={() => setKindFilter(kindFilter === k ? '' : k)}
                              style={{
                                background: kindFilter === k ? 'rgba(0,255,136,0.14)' : 'transparent',
                                border: `1px solid ${C.border}`,
                                borderRadius: 3,
                                color: kindColor(k),
                                padding: '2px 6px',
                                cursor: 'pointer',
                                fontSize: 10.5,
                                fontFamily: C.mono,
                              }}
                            >
                              {k} {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      {result.ast ? (
                        <div style={{ padding: '6px 0' }}>
                          <AstRow
                            node={result.ast}
                            depth={0}
                            path="0"
                            open={open}
                            toggle={toggle}
                            onHover={setHoverLine}
                            filter={kindFilter}
                          />
                        </div>
                      ) : (
                        <div style={{ padding: 14, color: C.bad, fontFamily: C.mono, fontSize: 12.5 }}>
                          {result.astError || ui.astEmpty}
                        </div>
                      )}
                    </div>
                  )}

                  {/* typecheck */}
                  {layer === 'typecheck' && result && (
                    <div style={{ padding: 14, fontSize: 13 }}>
                      {result.typecheck?.fatal ? (
                        <div style={{ color: C.bad, fontFamily: C.mono }}>{result.typecheck.fatal}</div>
                      ) : (
                        <>
                          <div
                            style={{
                              color: result.typecheck?.ok ? C.accent : C.bad,
                              fontWeight: 700,
                              marginBottom: 8,
                            }}
                          >
                            {result.typecheck?.ok ? `✓ ${ui.typecheckOk}` : `✕ ${ui.typecheckFail}`}
                            {' · '}
                            <span style={{ fontFamily: C.mono, fontWeight: 400 }}>
                              {result.typecheck?.errorCount ?? 0} / {result.typecheck?.warnings ?? 0} warn
                            </span>
                          </div>
                          <div style={{ color: C.warn, fontSize: 12, marginBottom: 12 }}>{ui.typecheckSkipped}</div>
                          {result.typecheck?.errors?.map((e, i) => (
                            <div
                              key={i}
                              style={{ fontFamily: C.mono, fontSize: 12, color: '#d8d8d8', padding: '2px 0' }}
                            >
                              {e}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* hir */}
                  {layer === 'hir' && result && (
                    result.hir.ok ? (
                      codeSpans ? (
                        <SpecCodeView
                          lines={codeSpans}
                          raw={result.hir.text || ''}
                          copyLabel={ui.copy}
                          copiedLabel={ui.copied}
                          meta={`${result.hir.text?.length ?? 0} ${ui.bytes} · ${ui.generated}`}
                        />
                      ) : (
                        <div style={{ padding: 14, color: C.muted, fontSize: 13 }}>{ui.noHir}</div>
                      )
                    ) : (
                      <pre style={{ ...preStyle, color: C.bad }}>{`${ui.targetFailed}\n\n${result.hir.error}`}</pre>
                    )
                  )}

                  {/* on-the-chip schematic, derived from declared widths */}
                  {layer === 'chip' && result && (
                    <SpecChipView
                      ast={result.ast}
                      specPath={selected?.path || ''}
                      copy={{
                        title: ui.chipTitle,
                        derived: ui.chipDerived,
                        notSynth: ui.chipNotSynth,
                        empty: ui.chipEmpty,
                        consts: ui.chipConsts,
                        structs: ui.chipStructs,
                        fns: ui.chipFns,
                        bits: ui.chipBits,
                        unsized: ui.chipUnsized,
                        omitted: ui.chipOmitted,
                      }}
                    />
                  )}

                  {/* codegen targets */}
                  {LAYERS.find((l) => l.id === layer)?.kind === 'target' && result && (
                    !activeTarget ? (
                      <div style={{ padding: 14, color: C.muted }}>{ui.emptyOut}</div>
                    ) : !activeTarget.ok ? (
                      <pre style={{ ...preStyle, color: C.bad }}>{`${ui.targetFailed}\n\n${activeTarget.error}`}</pre>
                    ) : codeSpans ? (
                      <SpecCodeView
                        lines={codeSpans}
                        raw={activeTarget.code || ''}
                        copyLabel={ui.copy}
                        copiedLabel={ui.copied}
                        meta={`${activeTarget.bytes ?? 0} ${ui.bytes} · ${ui.generated}`}
                      />
                    ) : (
                      <div style={{ padding: 14, color: C.muted }}>{ui.emptyOut}</div>
                    )
                  )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>}

        {/* RUN, within reach of a thumb.
            The inline control lives in a row at the TOP of a column that now
            scrolls on a phone, so it leaves the screen as soon as you read any
            distance -- and the top of a tall phone is the hardest place on the
            device to reach one-handed. Fixed to the bottom instead, so the
            action the page exists for is always one tap away.

            Bottom-right rather than a full-width bar: it stays clear of the
            text column, and env(safe-area-inset-bottom) keeps it off the home
            indicator. */}
        {phone && mobilePane === 'detail' && selected && (
          <button
            onClick={() => void run()}
            disabled={busy}
            title={ui.runHint}
            aria-label={busy ? ui.compiling : 'RUN'}
            style={{
              position: 'fixed',
              right: 16,
              bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
              zIndex: 40,
              // Same signal as the inline control: filled once the text differs
              // from what was last compiled.
              background: dirty ? C.accent : '#0f1a14',
              color: dirty ? '#04150c' : C.accent,
              border: `1px solid ${C.accent}`,
              borderRadius: 999,
              // 48px clears the 44px minimum with room for a shadow.
              minHeight: 48,
              padding: '0 22px',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.5,
              fontFamily: 'inherit',
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.7 : 1,
              boxShadow: '0 6px 20px rgba(0,0,0,0.55)',
            }}
          >
            {busy ? ui.compiling : '▶ RUN'}
          </button>
        )}
      </div>
    </div>
  )
}

/** Ordered so the two families people filter by most sit at the top. */
const TAG_FAMILIES = [
  { prefix: 'domain/', label: 'domain' },
  { prefix: 'has/', label: 'contains' },
  { prefix: 'issue/', label: 'problems' },
  { prefix: 'size/', label: 'size' },
  { prefix: 'src/', label: 'repository' },
  { prefix: 'health/', label: 'health' },
]

function tagChip(on: boolean, dead: boolean): React.CSSProperties {
  return {
    background: on ? 'rgba(0,255,136,0.14)' : 'transparent',
    border: `1px solid ${on ? C.accent : C.border}`,
    borderRadius: 999,
    color: dead ? 'rgba(139,148,144,0.35)' : on ? C.accent : C.muted,
    padding: '1px 7px',
    cursor: dead ? 'default' : 'pointer',
    fontSize: 10.5,
    fontFamily: C.mono,
  }
}

const ctrlBtn: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  color: C.muted,
  padding: '3px 9px',
  cursor: 'pointer',
  fontSize: 11.5,
  fontFamily: 'inherit',
}

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: 14,
  fontFamily: C.mono,
  fontSize: 12.5,
  lineHeight: 1.6,
  color: '#d8d8d8',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}
