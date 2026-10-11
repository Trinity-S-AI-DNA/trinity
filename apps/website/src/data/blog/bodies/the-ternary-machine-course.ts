import type { Block } from '../types'

// The course "The ternary machine" (specs/course/ternary-computing.t27). Every number below is
// computed by gHashTag/t27 specs/ternary/trits.t27 and radix_economy.t27 (t27#8979) or
// specs/isa/ternary_encoding.t27; the figure was drawn from the compiled trits.t27 the ripple widget runs.

export const body: Block[] = [
  {
    "kind": "p",
    "text": "t27.ai has a new course, the eighth: The ternary machine. It starts from why base 3 at all and ends with neurons whose weights are -1, 0 and +1, in 27 lessons of 9 modules. Each lesson opens a widget to press, and every number a widget shows is computed by a t27 spec compiled to WebAssembly in your browser, not written into the page."
  },
  {
    "kind": "h",
    "text": "Why three, and what the argument leaves out"
  },
  {
    "kind": "p",
    "text": "Price a digit by how many states it must tell apart, and a number costs base times digits. The first widget runs radix_economy.t27: every number up to 999999 costs 39 in base 3 and 40 in bases 2 and 4, because b / ln b is smallest at e and 3 is the nearest whole base. The lesson also says what that model omits: binary won because two-state parts are cheap, fast and robust."
  },
  {
    "kind": "h",
    "text": "Balanced ternary does arithmetic without special cases"
  },
  {
    "kind": "p",
    "text": "With digits -1, 0 and +1 a number needs no sign, negation flips every trit, and cutting trits is already rounding. Adding is a full adder per place; the figure below is the ripple-carry widget's opening case, drawn from the same compiled trits.t27 the widget runs."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 520 230' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='13 + 1 in balanced ternary: the carry ripples through three places, +++ becomes +---, which is 14' style='width:100%;height:auto;font-family:inherit'><text x='0' y='46' fill='currentColor' font-size='13'>carry in</text><rect x='130' y='20' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='155' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='192' y='20' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='217' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='254' y='20' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='279' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='316' y='20' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='341' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='378' y='20' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='403' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='440' y='20' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='465' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><text x='0' y='96' fill='currentColor' font-size='13'>x = 13</text><rect x='130' y='70' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='155' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='192' y='70' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='217' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='254' y='70' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='279' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='316' y='70' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='341' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='378' y='70' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='403' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='440' y='70' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='465' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><text x='0' y='146' fill='currentColor' font-size='13'>y = 1</text><rect x='130' y='120' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='155' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='192' y='120' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='217' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='254' y='120' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='279' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='316' y='120' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='341' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='378' y='120' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='403' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='440' y='120' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='465' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><text x='0' y='196' fill='currentColor' font-size='13'>sum = 14</text><rect x='130' y='170' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='155' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='192' y='170' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='217' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='254' y='170' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='279' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='316' y='170' width='50' height='40' rx='8' fill='none' stroke='#ff4d6d' stroke-width='2'/><text x='341' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='#ff4d6d'>−</text><rect x='378' y='170' width='50' height='40' rx='8' fill='none' stroke='#ff4d6d' stroke-width='2'/><text x='403' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='#ff4d6d'>−</text><rect x='440' y='170' width='50' height='40' rx='8' fill='none' stroke='#ff4d6d' stroke-width='2'/><text x='465' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='#ff4d6d'>−</text><text x='465' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>1</text><text x='403' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>3</text><text x='341' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>9</text><text x='279' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>27</text><text x='217' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>81</text><text x='155' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>243</text></svg>",
    "caption": "13 + 1 in balanced ternary, six places: the ones place makes 2 = 3 - 1, a carry of +1 ripples through three places, and +++ becomes +---, which is 14. Every tile is trit_at(), carry_into() or full_sum() of the compiled trits.t27."
  },
  {
    "kind": "p",
    "text": "Multiplying by a trit is a switch: copy, drop or flip. That is the reason ternary neural networks are cheap in hardware, and the course ends there: a MAC that only adds and subtracts, a neuron that can answer not sure, a bar detector and a small layer."
  },
  {
    "kind": "h",
    "text": "The TRI-27 machine, as the emulator really runs it"
  },
  {
    "kind": "p",
    "text": "Two modules leave the toy world. The instruction word is the 32-bit word the pinned Trinity emulator decodes: 47 of 256 opcode bytes mean something and the other 209 decode as NOP. The widgets call encode(), opcode_of() and the rest from specs/isa/ternary_encoding.t27. A ternary machine of three 9-trit registers then runs a loop that ends itself on a three-way jump."
  },
  {
    "kind": "h",
    "text": "How it is built"
  },
  {
    "kind": "p",
    "text": "The logic is two new specs in gHashTag/t27, trits.t27 and radix_economy.t27: 21 tests, every one executing its asserts, 8 negative controls caught. They read balanced trits through the offset 111...1 in base 3, so no signed division is needed. The 27 widgets share one drawing kit that computes nothing; scripts/widget-logic.mjs holds every compiled logic.js to the spec beside it. Lesson texts quote only numbers the specs or widgets produce, and where a lesson spec is a different machine, such as the binary adders built from ternary neurons, the text says so."
  }
]

export const ruBody: Block[] = [
  {
    "kind": "p",
    "text": "На t27.ai восьмой курс: «Троичная машина». Он начинается с вопроса, зачем вообще основание 3, и заканчивается нейронами с весами -1, 0 и +1, всего 27 уроков в 9 модулях. В каждом уроке есть виджет, который можно нажимать, и каждое число в нём вычисляет спека t27, скомпилированная в WebAssembly прямо в вашем браузере, а не вписанная в страницу."
  },
  {
    "kind": "h",
    "text": "Почему три и что упускает этот довод"
  },
  {
    "kind": "p",
    "text": "Если цена цифры — число состояний, которые она различает, то число стоит основание, умноженное на количество цифр. Первый виджет запускает radix_economy.t27: любое число до 999999 стоит 39 в основании 3 и 40 в основаниях 2 и 4, потому что b / ln b минимально в точке e, а 3 — ближайшее к ней целое. Урок говорит и о том, что модель упускает: двоичная система победила, потому что элементы на два состояния дёшевы, быстры и надёжны."
  },
  {
    "kind": "h",
    "text": "Сбалансированная троичная считает без особых случаев"
  },
  {
    "kind": "p",
    "text": "С цифрами -1, 0 и +1 числу не нужен знак, смена знака переворачивает каждый трит, а отбрасывание тритов уже и есть округление. Сложение — это полный сумматор на каждый разряд; ниже — стартовый пример виджета со сквозным переносом, нарисованный той же скомпилированной trits.t27, что исполняет виджет."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 520 230' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='13 + 1 in balanced ternary: the carry ripples through three places, +++ becomes +---, which is 14' style='width:100%;height:auto;font-family:inherit'><text x='0' y='46' fill='currentColor' font-size='13'>carry in</text><rect x='130' y='20' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='155' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='192' y='20' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='217' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='254' y='20' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='279' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='316' y='20' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='341' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='378' y='20' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='403' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='440' y='20' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='465' y='47' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><text x='0' y='96' fill='currentColor' font-size='13'>x = 13</text><rect x='130' y='70' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='155' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='192' y='70' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='217' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='254' y='70' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='279' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='316' y='70' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='341' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='378' y='70' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='403' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='440' y='70' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='465' y='97' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><text x='0' y='146' fill='currentColor' font-size='13'>y = 1</text><rect x='130' y='120' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='155' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='192' y='120' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='217' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='254' y='120' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='279' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='316' y='120' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='341' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='378' y='120' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='403' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='440' y='120' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='465' y='147' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><text x='0' y='196' fill='currentColor' font-size='13'>sum = 14</text><rect x='130' y='170' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='155' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='192' y='170' width='50' height='40' rx='8' fill='none' stroke='currentColor' stroke-width='2'/><text x='217' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='currentColor'>0</text><rect x='254' y='170' width='50' height='40' rx='8' fill='none' stroke='#00ff88' stroke-width='2'/><text x='279' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='#00ff88'>+</text><rect x='316' y='170' width='50' height='40' rx='8' fill='none' stroke='#ff4d6d' stroke-width='2'/><text x='341' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='#ff4d6d'>−</text><rect x='378' y='170' width='50' height='40' rx='8' fill='none' stroke='#ff4d6d' stroke-width='2'/><text x='403' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='#ff4d6d'>−</text><rect x='440' y='170' width='50' height='40' rx='8' fill='none' stroke='#ff4d6d' stroke-width='2'/><text x='465' y='197' text-anchor='middle' font-size='20' font-weight='700' fill='#ff4d6d'>−</text><text x='465' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>1</text><text x='403' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>3</text><text x='341' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>9</text><text x='279' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>27</text><text x='217' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>81</text><text x='155' y='224' text-anchor='middle' font-size='11' fill='currentColor' opacity='0.6'>243</text></svg>",
    "caption": "13 + 1 в сбалансированной троичной, шесть разрядов: разряд единиц даёт 2 = 3 - 1, перенос +1 проходит три разряда, и +++ превращается в +---, то есть 14. Каждая плитка — trit_at(), carry_into() или full_sum() из скомпилированной trits.t27."
  },
  {
    "kind": "p",
    "text": "Умножение на трит — это переключатель: копия, ноль или переворот. Поэтому троичные нейросети дёшевы в железе, и курс заканчивается именно этим: MAC, который только складывает и вычитает, нейрон, умеющий ответить «не уверен», детектор полосы и маленький слой."
  },
  {
    "kind": "h",
    "text": "Машина TRI-27 такой, какой её на деле исполняет эмулятор"
  },
  {
    "kind": "p",
    "text": "Два модуля выходят из игрушечного мира. Командное слово — это 32-битное слово, которое декодирует закреплённая версия эмулятора Trinity: из 256 байтов опкода 47 что-то значат, а остальные 209 декодируются как NOP. Виджеты вызывают encode(), opcode_of() и остальные функции из specs/isa/ternary_encoding.t27. Затем троичная машина с тремя 9-тритными регистрами выполняет цикл, который сам завершается переходом на три стороны."
  },
  {
    "kind": "h",
    "text": "Как это устроено"
  },
  {
    "kind": "p",
    "text": "Логика — две новые спеки в gHashTag/t27, trits.t27 и radix_economy.t27: 21 тест, каждый исполняет свои проверки, 8 отрицательных контролей пойманы. Они читают сбалансированные триты через смещение 111...1 в основании 3, поэтому знаковое деление не нужно. 27 виджетов используют один общий модуль отрисовки, который ничего не вычисляет; scripts/widget-logic.mjs сверяет каждый скомпилированный logic.js со спекой рядом с ним. Тексты уроков приводят только числа, которые дают спеки или виджеты, а там, где спека урока — другая машина, например двоичные сумматоры из троичных нейронов, текст так и говорит."
  }
]
