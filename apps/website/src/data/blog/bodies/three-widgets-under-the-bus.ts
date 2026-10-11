import type { Block } from '../types'

// Three widgets for the physics under the buses course. Every number below is computed by the
// widgets' own logic: gHashTag/t27 specs/fpga/line_bounce.t27, eye_isi.t27 and secded.t27 compiled
// to wasm (t27#8931); the figure was drawn from line_bounce's far_end and near_end.

export const body: Block[] = [
  {
    "kind": "p",
    "text": "The buses course teaches the protocols: UART, SPI, APB, AXI4, Ethernet. Underneath every one of them is physics the protocol never mentions: a wire is a transmission line, a fast edge does not arrive once, a short bit does not finish rising, and a memory cell can flip. Three new widgets show those three things, and each one computes nothing of its own: its logic is a t27 spec's fn bodies compiled to WebAssembly, so the page draws exactly what the spec's tests assert."
  },
  {
    "kind": "h",
    "text": "A step down a line arrives more than once"
  },
  {
    "kind": "p",
    "text": "line-bounce runs specs/fpga/line_bounce.t27: a driver of resistance RS sends a step into a line of impedance Z0; each end reflects by (R - Z0) / (R + Z0). With the textbook values of Johnson and Graham -- a 1 V step, RS 25 ohm, Z0 50 ohm, an open end -- the far end reads 1.333 V on the first arrival, then 0.889, 1.037, 0.988, and settles at 1 V. The two reflection coefficients have opposite signs, so it rings. A series resistor that makes RS equal Z0 lands it on 1 V at the first arrival; a 50 ohm load at the far end stops the reflection altogether."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 720 210' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='far end (load): 1.333, 0.889, 1.037, 0.988' style='width:100%;height:auto;font-family:inherit'><line x1='60' x2='680' y1='73.5' y2='73.5' stroke='currentColor' stroke-opacity='0.5' stroke-dasharray='5 5'/><line x1='60' x2='680' y1='170.0' y2='170.0' stroke='currentColor' stroke-opacity='0.25'/><path d='M60.0,105.6H137.5V62.7H215.0V77.0H292.5V72.3H370.0V73.8H447.5V73.3H525.0V73.5H602.5V73.4H680' fill='none' stroke='#d4af37' stroke-width='2'/><path d='M60.0,170.0H98.8V41.3H176.3V84.2H253.8V69.9H331.3V74.6H408.8V73.1H486.3V73.6H563.8V73.4H641.3V73.5H680' fill='none' stroke='currentColor' stroke-width='2.5'/><text x='102.8' y='35.3' font-size='12' fill='currentColor'>1.333</text><text x='180.3' y='78.2' font-size='12' fill='currentColor'>0.889</text><text x='257.8' y='63.9' font-size='12' fill='currentColor'>1.037</text><text x='335.3' y='68.6' font-size='12' fill='currentColor'>0.988</text><text x='470' y='24' font-size='12' fill='currentColor'>— far end (load)</text><text x='470' y='40' font-size='12' fill='#d4af37'>— near end (driver)</text><text x='470' y='56' font-size='12' fill='currentColor' fill-opacity='0.7'>- - settles at 1.000 V</text><text x='680' y='200' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>time, in one-way delays TD</text></svg>",
    "caption": "The far end (white) and the near end (gold) of a 1 V step from a 25 ohm driver into an open 50 ohm line, computed by the compiled line_bounce.t27 the widget runs: 1.333, 0.889, 1.037, 0.988 V, settling at 1 V."
  },
  {
    "kind": "h",
    "text": "A short bit does not finish rising"
  },
  {
    "kind": "p",
    "text": "eye-isi runs specs/fpga/eye_isi.t27: one RC pole of time constant TAU, sampled at the end of each bit, gives y[n] = a y[n-1] + (1 - a) x[n] with a = exp(-T/TAU). The worst 1 reaches 1 - a and the worst 0 stays at a, so the eye is 1 - 2a: a quarter of the swing at T = TAU, and shut at T = TAU ln 2. The widget pushes two periods of PRBS7 through the channel and measures the eye it drew: 26.5% at T = TAU, against the formula's worst case of 26.4% (PRBS7 has no infinitely long run). At T = 0.6 TAU the eye is shut; a 25% de-emphasis tap opens it to 21.6%. exp itself is in the spec, as a series, with tests."
  },
  {
    "kind": "h",
    "text": "One flip is fixed, two are caught"
  },
  {
    "kind": "p",
    "text": "ecc-secded runs specs/fpga/secded.t27: 8 data bits, Hamming check bits at positions 1, 2, 4 and 8, and an overall parity bit at 0 -- the construction ECC memory uses per word at 72 bits. Press any bit to flip it: the syndrome is that bit's position in binary, and the byte comes back. Flip two and the parity stays even while the syndrome is not zero: detected, not corrected. The spec's tests check every byte, every single flip and every pair of flips of three words."
  },
  {
    "kind": "h",
    "text": "What these do not show"
  },
  {
    "kind": "ul",
    "items": [
      "The line is lossless, the load is a resistor and the edge is ideal; a real trace has loss, vias and a pin capacitance.",
      "One pole is the mechanism of intersymbol interference, not a link budget: no jitter, crosstalk or receiver noise.",
      "Three or more flips can alias to one in SECDED and be corrected wrongly; the widget says so."
    ]
  },
  {
    "kind": "h",
    "text": "Try them"
  },
  {
    "kind": "ul",
    "items": [
      "t27.ai/widgets/line-bounce/",
      "t27.ai/widgets/eye-isi/",
      "t27.ai/widgets/ecc-secded/",
      "The specs: gHashTag/t27 specs/fpga/line_bounce.t27, eye_isi.t27, secded.t27"
    ]
  }
]

export const ruBody: Block[] = [
  {
    "kind": "p",
    "text": "Курс про шины учит протоколам: UART, SPI, APB, AXI4, Ethernet. Под каждым из них физика, о которой протокол молчит: провод — это линия передачи, быстрый фронт приходит не один раз, короткий бит не успевает дорасти, а ячейка памяти может перевернуться. Три новых виджета показывают эти три вещи, и ни один не считает ничего сам: их логика — тела функций спеки t27, собранные в WebAssembly, поэтому страница рисует ровно то, что утверждают тесты спеки."
  },
  {
    "kind": "h",
    "text": "Ступенька по линии приходит не один раз"
  },
  {
    "kind": "p",
    "text": "line-bounce исполняет specs/fpga/line_bounce.t27: драйвер с сопротивлением RS посылает ступеньку в линию с импедансом Z0; каждый конец отражает с коэффициентом (R - Z0) / (R + Z0). С учебными значениями Джонсона и Грэма — ступенька 1 В, RS 25 Ом, Z0 50 Ом, открытый конец — дальний конец показывает 1,333 В при первом приходе, затем 0,889, 1,037, 0,988 и устанавливается на 1 В. Коэффициенты отражения разных знаков, поэтому сигнал звенит. Последовательный резистор, при котором RS равно Z0, приводит к 1 В с первого прихода; нагрузка 50 Ом на дальнем конце убирает отражение совсем."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 720 210' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='дальний конец (нагрузка): 1,333, 0,889, 1,037, 0,988' style='width:100%;height:auto;font-family:inherit'><line x1='60' x2='680' y1='73.5' y2='73.5' stroke='currentColor' stroke-opacity='0.5' stroke-dasharray='5 5'/><line x1='60' x2='680' y1='170.0' y2='170.0' stroke='currentColor' stroke-opacity='0.25'/><path d='M60.0,105.6H137.5V62.7H215.0V77.0H292.5V72.3H370.0V73.8H447.5V73.3H525.0V73.5H602.5V73.4H680' fill='none' stroke='#d4af37' stroke-width='2'/><path d='M60.0,170.0H98.8V41.3H176.3V84.2H253.8V69.9H331.3V74.6H408.8V73.1H486.3V73.6H563.8V73.4H641.3V73.5H680' fill='none' stroke='currentColor' stroke-width='2.5'/><text x='102.8' y='35.3' font-size='12' fill='currentColor'>1,333</text><text x='180.3' y='78.2' font-size='12' fill='currentColor'>0,889</text><text x='257.8' y='63.9' font-size='12' fill='currentColor'>1,037</text><text x='335.3' y='68.6' font-size='12' fill='currentColor'>0,988</text><text x='470' y='24' font-size='12' fill='currentColor'>— дальний конец (нагрузка)</text><text x='470' y='40' font-size='12' fill='#d4af37'>— ближний конец (драйвер)</text><text x='470' y='56' font-size='12' fill='currentColor' fill-opacity='0.7'>- - устанавливается на 1,000 В</text><text x='680' y='200' font-size='11' text-anchor='end' fill='currentColor' fill-opacity='0.7'>время, в задержках TD</text></svg>",
    "caption": "Дальний (белый) и ближний (золотой) концы для ступеньки 1 В от драйвера 25 Ом в открытую линию 50 Ом, посчитанные собранной line_bounce.t27, которую исполняет виджет: 1,333, 0,889, 1,037, 0,988 В, установление на 1 В."
  },
  {
    "kind": "h",
    "text": "Короткий бит не успевает дорасти"
  },
  {
    "kind": "p",
    "text": "eye-isi исполняет specs/fpga/eye_isi.t27: один RC-полюс с постоянной TAU, взятый в конце каждого бита, даёт y[n] = a y[n-1] + (1 - a) x[n], где a = exp(-T/TAU). Худшая единица доходит до 1 - a, худший ноль остаётся на a, поэтому глаз равен 1 - 2a: четверть размаха при T = TAU и закрыт при T = TAU ln 2. Виджет пропускает через канал два периода PRBS7 и мерит нарисованный глаз: 26,5% при T = TAU против худшего случая формулы 26,4% (у PRBS7 нет бесконечно длинной серии). При T = 0,6 TAU глаз закрыт; отвод de-emphasis 25% открывает его до 21,6%. Сама exp тоже в спеке — рядом, с тестами."
  },
  {
    "kind": "h",
    "text": "Одну ошибку исправит, две поймает"
  },
  {
    "kind": "p",
    "text": "ecc-secded исполняет specs/fpga/secded.t27: 8 бит данных, проверочные биты Хэмминга на позициях 1, 2, 4 и 8 и общий бит чётности на 0 — та же конструкция, что у памяти с ECC на словах по 72 бита. Нажмите любой бит, чтобы перевернуть его: синдром — это номер бита в двоичном виде, и байт возвращается. Переверните два — чётность остаётся чётной, а синдром не ноль: обнаружено, не исправлено. Тесты спеки проверяют каждый байт, каждую одиночную и каждую пару ошибок трёх слов."
  },
  {
    "kind": "h",
    "text": "Чего это не показывает"
  },
  {
    "kind": "ul",
    "items": [
      "Линия без потерь, нагрузка — резистор, фронт идеальный; у настоящей дорожки есть потери, переходные отверстия и ёмкость вывода.",
      "Один полюс — это механизм межсимвольной интерференции, а не бюджет линка: нет джиттера, перекрёстных помех и шума приёмника.",
      "Три и больше ошибок в SECDED могут выглядеть как одна и исправиться неверно; виджет говорит об этом."
    ]
  },
  {
    "kind": "h",
    "text": "Попробовать"
  },
  {
    "kind": "ul",
    "items": [
      "t27.ai/widgets/line-bounce/",
      "t27.ai/widgets/eye-isi/",
      "t27.ai/widgets/ecc-secded/",
      "Спеки: gHashTag/t27 specs/fpga/line_bounce.t27, eye_isi.t27, secded.t27"
    ]
  }
]
