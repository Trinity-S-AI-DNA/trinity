import type { Block } from '../types'

// Facts are read from trinity#1874 and PR #1876 at eb7d0c2a7:
// apps/website/specs/course/vibecoding.t27, apps/website/i18n/vibecoding.ru.json,
// apps/website/specs/course/course-chat.t27, scripts/course-from-spec.mjs.

export const body: Block[] = [
  {
    kind: 'p',
    text: 'Course 12 of t27.ai, Vibecoding from zero, now carries a 1170–1403 byte English grounding text in every lesson. Before PR #1876 the texts were 361–685 bytes, leaving the 1500-byte CHAT_BODY_MAX budget mostly empty and the course chat helper poorly anchored to lesson content.',
  },
  {
    kind: 'h',
    text: 'How the grounding budget works',
  },
  {
    kind: 'p',
    text: 'The course chat helper is defined in apps/website/specs/course/course-chat.t27. At line 325 its system_prompt() function injects the lesson body text unconditionally when its length is greater than zero: every lesson now fills roughly 78–94 % of that 1500-byte CHAT_BODY_MAX slot. The injected text covers the key facts the lesson teaches, the widget data shown on screen, and common misconceptions the helper should address.',
  },
  {
    kind: 'h',
    text: 'Number parity and superlative rules',
  },
  {
    kind: 'p',
    text: 'The course-from-spec --check validator enforces two constraints on lesson text pairs. The number parity rule requires that every digit sequence present in the English text also appears in the corresponding Russian text in vibecoding.ru.json. Expanding 27 English texts added new digit sequences in 9 lessons; those 9 Russian texts were updated with natural-language additions that carry the same digits. The superlative rule flags the phrases "the first" and "the only". Eight English texts used those phrases; all eight were rephrased to remove the flag without introducing new digit sequences. After both fixes, course-from-spec --check runs clean: 324 lesson specs, 93 spec tests, 438 asserts, 0 parity errors, 0 superlative flags.',
  },
  {
    kind: 'h',
    text: 'Verification',
  },
  {
    kind: 'p',
    text: 'Code audit confirms that system_prompt() injects lesson_body for all 27 lessons: the injection is unconditional when len > 0, and all 27 expanded texts have len > 0. Live API probes via the course helper confirmed correct lesson-grounded responses for lessons 1 through 22, each reply citing data unique to that lesson\'s widget. Lessons 23–27 were blocked by the IP rate limit of 20 requests per hour at the time of writing; code audit covers them.',
  },
]

export const ruBody: Block[] = [
  {
    kind: 'p',
    text: 'Курс 12 на t27.ai, Вайбкодинг с нуля, теперь несёт в каждом уроке английский текст заземления в 1170–1403 байта. До PR #1876 тексты занимали 361–685 байт, оставляя бюджет CHAT_BODY_MAX = 1500 почти пустым, а помощник курсового чата слабо опирался на содержание урока.',
  },
  {
    kind: 'h',
    text: 'Как работает бюджет заземления',
  },
  {
    kind: 'p',
    text: 'Помощник курсового чата определён в apps/website/specs/course/course-chat.t27. В строке 325 функция system_prompt() безусловно встраивает текст тела урока, когда его длина больше нуля: теперь каждый урок заполняет примерно 78–94 % слота CHAT_BODY_MAX. Встроенный текст охватывает ключевые факты урока, данные виджета на экране и типичные заблуждения, которые должен разбирать помощник.',
  },
  {
    kind: 'h',
    text: 'Правила числового паритета и превосходных степеней',
  },
  {
    kind: 'p',
    text: 'Валидатор course-from-spec --check проверяет два ограничения на пары текстов уроков. Правило числового паритета требует, чтобы каждая последовательность цифр в английском тексте также присутствовала в соответствующем русском тексте в vibecoding.ru.json. Расширение 27 английских текстов добавило новые цифровые последовательности в 9 уроках; эти 9 русских текстов были обновлены естественными дополнениями с теми же цифрами. Правило превосходных степеней помечает фразы "the first" и "the only". Восемь английских текстов использовали эти фразы; все восемь были перефразированы без введения новых цифровых последовательностей. После обоих исправлений course-from-spec --check проходит чисто: 324 спеки уроков, 93 теста, 438 утверждений, 0 ошибок паритета, 0 флагов превосходных степеней.',
  },
  {
    kind: 'h',
    text: 'Верификация',
  },
  {
    kind: 'p',
    text: 'Аудит кода подтверждает, что system_prompt() встраивает lesson_body для всех 27 уроков: встройка безусловна при len > 0, а все 27 расширенных текстов имеют len > 0. Живые API-пробы через помощник чата подтвердили корректные ответы, заземлённые на урок, для уроков с 1 по 22; каждый ответ цитировал данные, уникальные для виджета этого урока. Уроки 23–27 были заблокированы ограничением в 20 запросов в час на IP во время написания; их покрывает аудит кода.',
  },
]
