import type { Block } from '../types'

// Facts are read from trinity#1874 and PR #1876 at 80d2d5c93:
// apps/website/specs/course/vibecoding.t27, apps/website/i18n/vibecoding.ru.json,
// apps/website/specs/course/course-chat.t27, scripts/course-from-spec.mjs.
// Numbers: before 361-685 B, after 1170-1403 B, CHAT_BODY_MAX=1500 B (course-chat.t27:325).

type Lang = 'en' | 'ru'

const FIG = {
  en: {
    title: 'LESSON_TEXT bytes vs CHAT_BODY_MAX = 1500',
    before: 'Before',
    after: 'After',
    ariaLabel: 'Before PR 1876: lesson texts 361-685 bytes (24-46 % of budget). After: 1170-1403 bytes (78-94 %).',
    capBefore: '361-685 B',
    capAfter: '1170-1403 B',
  },
  ru: {
    title: 'Байты LESSON_TEXT vs CHAT_BODY_MAX = 1500',
    before: 'До',
    after: 'После',
    ariaLabel: 'До PR 1876: тексты уроков 361-685 байт (24-46 % бюджета). После: 1170-1403 байта (78-94 %).',
    capBefore: '361-685 Б',
    capAfter: '1170-1403 Б',
  },
}

function lessonTextSvg(lang: Lang = 'en'): string {
  const t = FIG[lang]
  const W = 500, H = 110
  const lx = 70, rx = 480
  const wc = rx - lx
  const sc = wc / 1500
  const x = (b: number) => lx + b * sc
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t.ariaLabel}" style="width:100%;height:auto;font-family:inherit">`
  s += `<text x="8" y="16" font-size="12" font-weight="700" fill="currentColor">${t.title}</text>`
  s += `<line x1="${rx}" y1="22" x2="${rx}" y2="102" stroke="currentColor" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="4,2"/>`
  const row = (label: string, min: number, max: number, y: number, cap: string) => {
    let r = `<text x="4" y="${y + 14}" font-size="11" fill="currentColor">${label}</text>`
    r += `<rect x="${lx}" y="${y}" width="${wc}" height="22" fill="currentColor" fill-opacity="0.06" rx="2"/>`
    r += `<rect x="${x(min)}" y="${y}" width="${x(max) - x(min)}" height="22" fill="currentColor" fill-opacity="0.4" rx="2"/>`
    r += `<text x="${x(min) + 3}" y="${y + 15}" font-size="9" fill="currentColor" fill-opacity="0.85">${cap}</text>`
    return r
  }
  s += row(t.before, 361, 685, 26, t.capBefore)
  s += row(t.after, 1170, 1403, 68, t.capAfter)
  s += `</svg>`
  return s
}

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
  {
    kind: 'figure',
    svg: lessonTextSvg('en'),
    caption: 'Each lesson text before PR 1876 (361-685 B) versus after (1170-1403 B), against the CHAT_BODY_MAX = 1500 B budget injected by course-chat.t27 at line 325.',
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
  {
    kind: 'figure',
    svg: lessonTextSvg('ru'),
    caption: 'Текст каждого урока до PR 1876 (361-685 Б) и после (1170-1403 Б) относительно бюджета CHAT_BODY_MAX = 1500 Б, который встраивает course-chat.t27 в строке 325.',
  },
]
