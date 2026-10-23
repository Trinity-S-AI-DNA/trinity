import type { Block } from '../types'

// Numbers here come from the Queen's public endpoints read on 2026-10-07 between
// 11:27Z and 11:29Z (/queen/status, /queen/public-board, /queen/public-activity
// on trios-agent-server-production), from gHashTag/BrowserOS#537 (merge b4329c4bf)
// and from the docs/now entries of the gHashTag/t27 branches the post links.

export const body: Block[] = [
  {
    kind: 'p',
    text: 'On 7 October 2026 the Queen, the agent that hands t27 issues to worker bees, got a new scheduler. Its rules live in one t27 spec, `specs/queen/control.t27`, and the server loads that spec through the compiler\'s WebAssembly build. Before handing out an issue, the scheduler claims a lease on it, and the claim is fenced: a second claim on the same issue is refused. While the bee works, a heartbeat renews the lease every round; on every path that does not start a bee, the lease is released. Every start and every end is written to an event log. The change is gHashTag/BrowserOS#537, merged at 09:07Z and deployed the same morning.',
  },
  {
    kind: 'p',
    text: 'Two hours later the board showed 40 bees RUNNING out of 70. That looks like a scheduler that is not using its workers. The Queen\'s own status endpoint says otherwise.',
  },
  { kind: 'h', text: 'What the Queen said about her last round' },
  {
    kind: 'table',
    head: ['Reading, 11:27Z', 'Value'],
    rows: [
      ['workers: capacity / active / idle', '70 / 39 / 31'],
      ['last round', 'allowed: false, "nothing to choose"'],
      ['issues skipped in that round', '982'],
      ['skipped: already claimed by a bee', '159'],
      ['skipped: work landed, issue still open', '319'],
      ['skipped: no Boundary section (missingBoundary)', '287'],
      ['skipped: its files are held by another task', '119'],
      ['skipped: spec sections missing', '98'],
    ],
  },
  {
    kind: 'p',
    text: 'The 31 idle bees are idle because no open issue was eligible, not because the scheduler failed to hand one out. Every one of the 286 BACKLOG cards lacks a Boundary section, the list of files a task touches, and 261 lack all four sections the Queen asks for. Without a boundary there is nothing to reserve, so the scheduler will not start a bee on it. The 105 BLOCKED cards wait for files held by other tasks, and the 122 cards in review hold their files until a reviewer judges them. To fill the hive, the issues have to be written in the shape the scheduler reads. More bees would change nothing.',
  },
  { kind: 'h', text: 'What is not good' },
  {
    kind: 'ul',
    items: [
      'Of the last 51 finished dispatches (10:34Z to 11:28Z), 33 ended without a completion frame, which the server records as "ended unexpectedly (cause undetermined)". Only 18 finished normally. Whether this rate was the same before the new scheduler is not measured: the public activity feed returns the newest 120 events and cannot page further back.',
      'Of 69 reviews in the same window, 26 sent the work back, 18 found nothing to review and 3 accepted it.',
      'Twice that morning the Queen started bees on issues whose work already existed on a pushed branch (t27#7472, t27#7471): a claim was a comment, not a branch. Both issues now name their branch.',
      'The lease and event tables are not public. "The scheduler is live" rests on the deploy, on rounds every 60 s and on 39 running dispatch rows matching 39 active workers. Nobody outside can count leases yet.',
    ],
  },
  {
    kind: 'p',
    text: 'All four go in one issue, t27#7494, with the numbers above and success criteria the next reading can check.',
  },
  { kind: 'h', text: 'The same day\'s work on the tools' },
  {
    kind: 'ul',
    items: [
      '`tri mutate census --dir D` (t27#7475, closes #7433) gives a whole directory of specs one table and one exit code. Its rules are in t27, `specs/tri/mutate/census.t27`. On `specs/tri/mutate` it reports 153 of 159 mutants killed (96.2% of judged): 4 survivors, each shown equivalent, and 2 hung.',
      'The survivor gate and the lab rules of `tri mutate` were Rust copies of two t27 specs. Now they are generated from those specs by `t27c gen-rust`: 198 hand-written lines removed, 20 added (branch for t27#7472).',
      'A `--lab` census is one job on the Railway lab, with the same census lines as a local run: 72 s locally, 77 s on the lab (branches for t27#7471, two slices).',
      'Across `specs/queen`, mutation coverage is 783 of 844 (92.8%). The rest waits on two open compiler issues.',
    ],
  },
  {
    kind: 'p',
    text: 'The three branches are pushed and land one pull request at a time after #7475, because the Actions queue is long. Every count in this post was printed by a command on the day; none was typed from memory.',
  },
]

export const ruBody: Block[] = [
  {
    kind: 'p',
    text: '7 октября 2026 года у Королевы — агента, который раздаёт задачи t27 пчёлам-исполнителям, — появился новый планировщик. Его правила лежат в одной спеке t27, `specs/queen/control.t27`, и сервер загружает её через WebAssembly-сборку компилятора. Прежде чем отдать задачу, планировщик берёт на неё аренду, и захват защищён: второй захват той же задачи отклоняется. Пока пчела работает, сердцебиение продлевает аренду каждый раунд; на любом пути, где пчела не запускается, аренда освобождается. Каждый старт и каждое завершение записываются в журнал событий. Изменение — gHashTag/BrowserOS#537, влито в 09:07Z и выкачено в то же утро.',
  },
  {
    kind: 'p',
    text: 'Через два часа доска показывала 40 пчёл в RUNNING из 70. Похоже на планировщик, который не загружает рабочих. Собственный эндпоинт статуса Королевы говорит другое.',
  },
  { kind: 'h', text: 'Что Королева сказала о своём последнем раунде' },
  {
    kind: 'table',
    head: ['Показание, 11:27Z', 'Значение'],
    rows: [
      ['рабочие: всего / заняты / свободны', '70 / 39 / 31'],
      ['последний раунд', 'allowed: false, «nothing to choose»'],
      ['задач пропущено в этом раунде', '982'],
      ['пропуск: уже взята пчелой', '159'],
      ['пропуск: работа влита, задача не закрыта', '319'],
      ['пропуск: нет раздела Boundary (missingBoundary)', '287'],
      ['пропуск: её файлы заняты другой задачей', '119'],
      ['пропуск: не хватает разделов спеки', '98'],
    ],
  },
  {
    kind: 'p',
    text: '31 пчела простаивает, потому что подходящих открытых задач не было, а не потому, что планировщик не сумел их раздать. Ни у одной из 286 карточек BACKLOG нет раздела Boundary, то есть списка файлов, которые задача трогает, а у 261 нет всех четырёх разделов, которые требует Королева. Без границы нечего резервировать, поэтому планировщик не запускает на такую задачу пчелу. 105 карточек BLOCKED ждут файлы, занятые другими задачами, а 122 карточки на ревью держат свои файлы, пока ревьюер их не оценит. Чтобы заполнить улей, задачи нужно писать в той форме, которую читает планировщик. Больше пчёл ничего бы не изменило.',
  },
  { kind: 'h', text: 'Что плохо' },
  {
    kind: 'ul',
    items: [
      'Из последних 51 завершённой выдачи (10:34Z–11:28Z) 33 закончились без кадра завершения — сервер пишет это как «ended unexpectedly (cause undetermined)». Нормально завершились только 18. Была ли эта доля такой же до нового планировщика, не измерено: публичная лента отдаёт последние 120 событий и не листается дальше.',
      'Из 69 ревью за то же окно 26 вернули работу, в 18 нечего было смотреть, 3 приняли.',
      'Дважды за утро Королева запускала пчёл на задачи, работа по которым уже лежала в запушенной ветке (t27#7472, t27#7471): захватом был комментарий, а не ветка. Теперь в обеих задачах названа их ветка.',
      'Таблицы аренд и событий не публичны. «Планировщик работает» держится на выкатке, раундах каждые 60 с и 39 открытых выдачах при 39 занятых рабочих. Снаружи аренды пока не посчитать.',
    ],
  },
  {
    kind: 'p',
    text: 'Все четыре пункта собраны в одну задачу, t27#7494, — с цифрами выше и критериями успеха, которые следующее измерение сможет проверить.',
  },
  { kind: 'h', text: 'Работа над инструментами в тот же день' },
  {
    kind: 'ul',
    items: [
      '`tri mutate census --dir D` (t27#7475, закрывает #7433) даёт целой папке спек одну таблицу и один код выхода. Его правила написаны на t27, в `specs/tri/mutate/census.t27`. На `specs/tri/mutate` он сообщает 153 из 159 убитых мутантов (96,2% от оценённых): 4 выживших, у каждого показана эквивалентность, и 2 зависших.',
      'Ворота выживших и правила лаборатории в `tri mutate` были Rust-копиями двух спек t27. Теперь их генерирует из этих спек `t27c gen-rust`: удалено 198 рукописных строк, добавлено 20 (ветка для t27#7472).',
      'Перепись с `--lab` — это одно задание на лаборатории Railway с теми же строками census, что и при локальном прогоне: 72 с локально, 77 с на лаборатории (ветки для t27#7471, два среза).',
      'По `specs/queen` мутационное покрытие — 783 из 844 (92,8%). Остальное ждёт двух открытых задач компилятора.',
    ],
  },
  {
    kind: 'p',
    text: 'Три ветки запушены и вливаются по одному пул-реквесту после #7475, потому что очередь Actions длинная. Каждое число в посте в тот день напечатала команда; ни одно не набрано по памяти.',
  },
]
