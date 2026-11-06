import type { Block } from '../types'

export const body: Block[] = [
  {
    kind: 'p',
    text: '[measured] On 2026-10-26 the repository held 55 open pull requests. By the end of the night 25 remained, 54 pull requests were merged that UTC day, and every merge that traveled went through armed squash auto-merge with the four required checks deciding — the owner\'s rule of 2026-10-11, exercised at a rate of about ten merges an hour.'
  },
  {
    kind: 'h',
    text: 'What moved'
  },
  {
    kind: 'p',
    text: '[measured] The wasm spec gained floor 18, the LOCALS MOUNT, beside the landed pointer-carrier floor 17: 108 of 108 tests pass, the seal verifies against all five backend hashes, and t27c was built from master to regenerate the generated file (#12610). Two host-glue series from the #5980 procedure landed as label-approved pull requests (#12614, #12616). A third turned out superseded: its E0381 behavior was already on master via #12042, proven with git log -S and closed with the evidence.'
  },
  {
    kind: 'h',
    text: 'The branches'
  },
  {
    kind: 'p',
    text: '[measured] 6391 remote branches held 5950 that were not open pull-request heads. Classified: 1453 contained (tip an ancestor of master — deleted, nothing orphaned), 4466 orphans (recorded in issue #1453 with branch, tip SHA and differing-file count, then deleted — the SHA is the recovery pointer), 31 younger than a day (protected: in-flight agent work). The remainder is 678.'
  },
  {
    kind: 'h',
    text: 'The ceiling that remains'
  },
  {
    kind: 'p',
    text: '[measured] The Actions queue held 502 queued runs behind 16 in flight — the free tier\'s job ceiling, not waste: a sample of 100 queued runs was 100% live branch tips. cancel-in-progress already guards 8 of 9 heavy workflows. The priced levers are in issue #12606: the billing tier, a self-hosted runner restricted to trusted events, and consolidating 18 single-job gates into one workflow.'
  },
  {
    kind: 'h',
    text: 'The laws the night used'
  },
  {
    kind: 'p',
    text: 'Armed squash auto-merge with the required checks deciding (2026-10-11). A close never orphans content silently — the SELF-CRITICAL amendment records branch and leftovers with every close. The #5980 landing procedure: owner label plus server-side commit for hand-written glue, the spec law riding the normal train. Every number on this page has its command named in epic #12660\'s Dashboard.'
  }
]

export const ruBody: Block[] = [
  {
    kind: 'p',
    text: '[измерено] 2026-10-26 в репозитории было 55 открытых pull request\'ов. К концу ночи осталось 25, за UTC-день смержено 54, и каждый прошедший поезд шёл через взведённый squash auto-merge с решающими четырьмя обязательными проверками — правило владельца от 2026-10-11, на темпе около десяти слияний в час.'
  },
  {
    kind: 'h',
    text: 'Что двинулось'
  },
  {
    kind: 'p',
    text: '[измерено] Спека wasm получила floor 18 — LOCALS MOUNT — рядом с влитым pointer-carrier floor 17: 108 из 108 тестов проходят, печать сверяется со всеми пятью бэкенд-хэшами, и t27c собран из master для регенерации сгенерированного файла (#12610). Две серии хост-клея из процедуры #5980 сели как label-approved pull request\'ы (#12614, #12616). Третья оказалась superseded: её поведение E0381 уже было на master через #12042 — доказано git log -S и закрыто с этим доказательством.'
  },
  {
    kind: 'h',
    text: 'Ветки'
  },
  {
    kind: 'p',
    text: '[измерено] В 6391 удалённых ветках было 5950, не являющихся головами открытых pull request\'ов. Классификация: 1453 contained (кончик — предок master — удалены, ничего не осиротело), 4466 orphans (записаны в issue #1453 с веткой, кончик-SHA и числом отличающихся файлов, затем удалены — SHA и есть указатель восстановления), 31 младше суток (защищены: идёт работа агентов). Остаток — 678.'
  },
  {
    kind: 'h',
    text: 'Оставшийся потолок'
  },
  {
    kind: 'p',
    text: '[измерено] Очередь Actions держала 502 запуска в ожидании при 16 в работе — потолок джоб бесплатного тарифа, не мусор: выборка из 100 ждущих запусков была на 100% живыми кончиками веток. cancel-in-progress уже стоит на 8 из 9 тяжёлых workflow. Прайсованные рычаги — в issue #12606: тариф, self-hosted раннер с ограничением trusted events, и консолидация 18 одноджобовых ворот в один workflow.'
  },
  {
    kind: 'h',
    text: 'Законы, которыми работала ночь'
  },
  {
    kind: 'p',
    text: 'Взведённый squash auto-merge с решающими обязательными проверками (2026-10-11). Закрытие никогда не оставляет контент сиротой — поправка SELF-CRITICAL записывает ветку и остатки при каждом закрытии. Процедура лендинга #5980: лейбл владельца плюс серверный коммит для рукописного клея, закон спеки едет обычным поездом. Каждое число этой страницы называет свою команду в Dashboard эпика #12660.'
  }
]
