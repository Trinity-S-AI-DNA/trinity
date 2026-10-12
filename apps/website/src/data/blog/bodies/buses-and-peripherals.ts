import type { Block } from '../types'

// Numbers here come from specs/course/buses-and-peripherals.t27 (trinity#1484), from
// the vendored bus specs under public/t27/files/specs/fpga/ (uart, spi, apb_bridge,
// axi4, bridge, memory, top_level and their testbenches), and from the recorded
// terminal runs of native t27c 0.4.0 on macOS that back the 31 new cast widgets.
// The two Ethernet specs (rgmii.t27, eth_crc.t27) landed in gHashTag/t27 as PR 7626
// and are vendored here. The native status of every spec (clean, blocked) was
// screened by reading the run text, because t27c test-report exits 0 on a blocked
// spec (t27#7370). The four gherkin specs (uart, spi, bridge, top_level) parse to the
// end after gHashTag/t27 PR 7659. Read on 2026-10-08.

export const body: Block[] = [
  {
    kind: 'p',
    text: 'The catalog holds seven courses now. "Buses and peripherals" is 27 lessons in 9 modules of 3, chained after the clocks course: the capstone of that course links forward, lesson 1 links back. The subject is the middle of every real design -- how blocks talk. UART frame by frame, SPI mode by mode, the APB handshake, the five AXI4 channels, memory maps, the packet bridge between buses, Ethernet frames and RGMII timing, and the bench IO discipline that guards the hardware the whole track has been building toward.',
  },
  { kind: 'h', text: 'Nine modules' },
  {
    kind: 'table',
    head: ['Module', 'What it teaches'],
    rows: [
      ['1, What a bus is', 'Why shared wires need an agreed conversation; the UART as the two-wire archetype, SPI as the clocked answer, APB as the register bus with roles.'],
      ['2, UART', 'The frame (start, 8 data, stop, idle high), the divisor 100,000,000 / 115,200, the status codes a driver polls and the 16-deep FIFOs.'],
      ['3, SPI', 'CPOL and CPHA as four modes, the prescaler ladder from the one 50 MHz clock, chip-select timing of 100 ns and data widths up to 32 bits.'],
      ['4, APB', 'The setup and access phases of PSEL and PENABLE, strobe bytes for 32-bit and 16-bit writes, and how many address bits 1, 4 or 8 peripherals cost.'],
      ['5, AXI4', 'The five channels with their widths (address 32, data 32, strobe 4, ID 4, LEN 8, SIZE 3), what Lite drops, and what an ID buys a burst.'],
      ['6, Memory', 'The memory map as who lives at which address: kinds, up to 8 ports, read-only ROM refusing a write port, and latency a wait state must cover.'],
      ['7, Bridges', 'Why one design grows several buses, and the packet bridge with its 256-byte RX and TX buffers, 64-byte SPI buffer, 128-byte packets and 10,000-cycle timeout.'],
      ['8, Ethernet', 'The frame check sequence as a CRC-32, RGMII moving a nibble on both edges at 125 MHz, and a pre-registered bring-up plan read step by step.'],
      ['9, The bench', 'Who holds the IO right now (tri fpga-ioclients), taking and returning the claim, and the capstone that opens the whole design, 8 MAC units and 19 tests.'],
    ],
  },
  { kind: 'h', text: 'Thirty-three recordings, and what they honestly show' },
  {
    kind: 'p',
    text: 'The course needed a framable widget for every lesson, and minted 33 new cast recordings. Most of them run native t27c 0.4.0 on a laptop against the bus specs. But the native runner cannot take most of these specs whole: uart, spi, apb_bridge, axi4, bridge and top_level are BLOCKED for comptime resolution the runner cannot finish. Four of them run clean natively: memory.t27 -- 15 tests and 6 invariants proved comptime -- spi_tb.t27 with 7 tests, and the two new Ethernet specs, eth_crc.t27 with 8 tests and rgmii.t27 with 7 tests plus its comptime invariant. So the recordings show what the compiler does complete on every spec: t27c check (0 errors, 0 warnings), t27c gen-verilog (the synthesizable module, its port list, its wires), and t27c debug-hir (the hardware IR view). The lesson texts say which is which; no recording claims a test run that did not happen.',
  },
  {
    kind: 'terminal',
    src: 'term/t27c-verilog-uart/session.cast',
    share: 'https://t27.ai/term/t27c-verilog-uart/',
    title: 't27c gen-verilog on uart.t27 -- spec to RTL',
    caption: 't27c gen-verilog on uart.t27: the module ZeroDSP_UART with its ports, and the divisor 100,000,000 / 115,200 and the 16-deep FIFO as localparams. uart.t27 is BLOCKED in the native test runner, so this recording shows Verilog, not a test run. 3.3 s.',
  },
  {
    kind: 'p',
    text: 'The bench module records the live tools instead: tri fpga-ioclients reading the registered IO clients, tri fpga-claim and tri fpga-release taken and given back back-to-back, tri fpga-next reading what runs next, and the Ethernet bring-up plan of tri fpga-steps E3, pre-registered step by step. The capstone lesson lowers the whole design: top_level.t27 carries CLK_FREQ_HZ 100,000,000, SYSTICK_HZ 1000, NUM_MAC_UNITS 8 and the four opcodes (CMD_NOP, CMD_MAC_MULT, CMD_MAC_DOT, CMD_UART_SEND) over 19 tests.',
  },
  { kind: 'h', text: 'Two new specs, landed in the compiler repo first' },
  {
    kind: 'p',
    text: 'The Ethernet module needed specs the tree did not have. specs/fpga/eth_crc.t27 carries the CRC-32 the frame check sequence computes, and specs/fpga/rgmii.t27 the double-data-rate timing arithmetic, 125 MHz for gigabit and the single-data-rate downshift for 10 and 100. Both were written in gHashTag/t27 (PR 7626), then vendored into the website files tree -- the direction the own-language rule wants: the spec lives in the repo that owns the language, the site serves a copy it can prove identical. Every constant in them that is not from IEEE 802.3 is labelled as an assumption in the spec header, with the document it is not from. The first version of the CRC spec was wrong in a way its own CI could not see: the gates check that a spec compiles, not that its asserts hold, and 6 of its 8 tests failed natively -- every failing assert compared the running register against zlib post-inverted values, and the receiver test claimed the register returns to its preset, which no 802.3 CRC-32 does. The spec now carries the physical model: the FCS is the post-inverted register, and a receiver digesting frame plus FCS lands on the residue 0xDEBB20E3, computed with the same Python zlib the header names as oracle. All 8 tests pass, none vacuous.',
  },
  {
    kind: 'terminal',
    src: 'term/t27c-eth-crc/session.cast',
    share: 'https://t27.ai/term/t27c-eth-crc/',
    title: 't27c on eth_crc.t27 -- the FCS, native',
    caption: 'The CRC spec as it landed: t27c test-report runs all 8 tests natively and none is vacuous; receiver_residue_is_the_magic is the receiver test the paragraph above describes. 9.7 s.',
  },
  { kind: 'h', text: 'Four specs that only looked compiled' },
  {
    kind: 'p',
    text: 'The last gate the course runs counts discarded tokens, and four lesson specs failed it while reporting that they compiled: uart, spi, bridge and top_level carried test and invariant bodies the parser silently threw away -- a bare statement where a clause was expected, implies conditions in assert bodies, a call to a method that does not exist, comments inside clauses. The compiler said these files were fine; a reader was never told their tests were not even being read (the defect is filed as gHashTag/t27#2474, and the parser repair is stage0-frozen, so the specs were rewritten into the subset the parser already consumes -- gHashTag/t27 PR 7659, with the wasm/native divergence on bridge array writes recorded in it). Every lesson that says here is the spec and it compiles now points at a spec that parses to the end.',
  },
  { kind: 'h', text: 'What this does not show' },
  {
    kind: 'ul',
    items: [
      'The browser player still skips test and invariant blocks (trinity#1477, fix open as PR 1495), so every recorded verdict runs natively and the lesson says so.',
      'Six of the seven bus specs are BLOCKED in the native runner for comptime resolution; their recordings show check, gen-verilog and debug-hir, never a claimed test run.',
      't27c test-report exits 0 on a blocked spec (t27#7370), so the minting pipeline screened status from the run text, not exit codes.',
      'The t27 CI gates caught nothing of the wrong CRC: they prove a spec compiles, not that its asserts hold. The 6-of-8 failure was found by running the spec natively before recording it, and fixed on the PR branch (t27#7626) before either cast was minted.',
      'The RGMII and CRC numbers are the specs\' own model with header-labelled assumptions, not board measurements; the E3 bring-up steps are pre-registered, and steps that did not run are recorded as not run.',
      'The Russian bundle covers all 27 lessons (the contract refuses a missing field), but widget strings stay English: each widget is its own t27 spec.',
    ],
  },
  { kind: 'h', text: 'Try it' },
  {
    kind: 'ul',
    items: [
      'Course: t27.ai/learn/buses-and-peripherals/',
      'The frame, start to stop: t27.ai/learn/the-frame/',
      'A spec the native runner takes whole: t27.ai/learn/memory-maps/',
      'In the app: t27.ai/#/buses-and-peripherals',
    ],
  },
]

export const ruBody: Block[] = [
  {
    kind: 'p',
    text: 'В каталоге теперь семь курсов. «Шины и периферия» — 27 уроков в 9 модулях по 3, он сцеплен с курсом о тактах: капстоун того курса ссылается вперёд, урок 1 — назад. Предмет — середина любого настоящего дизайна: как блоки разговаривают. UART покадрово, SPI по режимам, рукопожатие APB, пять каналов AXI4, карты памяти, пакетный мост между шинами, кадры Ethernet и тайминг RGMII, дисциплина IO на стенде, к которой весь трек вёл.',
  },
  { kind: 'h', text: 'Девять модулей' },
  {
    kind: 'table',
    head: ['Модуль', 'Чему учит'],
    rows: [
      ['1, Что такое шина', 'Зачем общим проводам нужен согласованный разговор; UART как двухпроводный архетип, SPI как разговор под тактом, APB как шина регистров с ролями.'],
      ['2, UART', 'Кадр (старт, 8 бит данных, стоп, покой вверх), делитель 100,000,000 / 115,200, коды статуса, которые опрашивает драйвер, и FIFO глубиной 16.'],
      ['3, SPI', 'CPOL и CPHA как четыре режима, лестница предделителей от одного такта 50 МГц, тайминг выбора кристалла 100 нс и ширины данных до 32 бит.'],
      ['4, APB', 'Фазы setup и access у PSEL и PENABLE, байты строоба для 32-битных и 16-битных записей и сколько адресных бит стоят 1, 4 или 8 периферий.'],
      ['5, AXI4', 'Пять каналов с их ширинами (адрес 32, данные 32, строуб 4, ID 4, LEN 8, SIZE 3), что выбрасывает Lite и что покупает ID у пакета.'],
      ['6, Память', 'Карта памяти как «кто живёт по какому адресу»: типы, до 8 портов, ROM только-для-чтения, отвергающий порт записи, и задержка, которую должно покрывать ожидание.'],
      ['7, Мосты', 'Почему в дизайне вырастает несколько шин и пакетный мост с буферами RX и TX по 256 байт, SPI-буфером 64, пакетами 128 и таймаутом 10,000 тактов.'],
      ['8, Ethernet', 'Контрольная сумма кадра как CRC-32, RGMII, переносящий полубайт на обоих фронтах на 125 МГц, и заранее зарегистрированный план запуска, читаемый по шагам.'],
      ['9, Стенд', 'Кто сейчас держит IO (tri fpga-ioclients), взятие и возврат захвата и капстоун, открывающий весь дизайн: 8 MAC-блоков и 19 тестов.'],
    ],
  },
  { kind: 'h', text: 'Тридцать три записи — и что они честно показывают' },
  {
    kind: 'p',
    text: 'Курсу нужен виджет для каждого урока, и он отчеканил 33 новые записи. Большинство прогоняет нативный t27c 0.4.0 на ноутбуке по спекам шин. Но нативный раннер не берёт большинство этих спек целиком: uart, spi, apb_bridge, axi4, bridge и top_level BLOCKED по comptime-разрешению, которое раннер не завершает. Четыре проходят нативно чисто: memory.t27 — 15 тестов и 6 инвариантов, доказанных comptime, spi_tb.t27 — 7 тестов и обе новые спеки Ethernet: eth_crc.t27 с 8 тестами и rgmii.t27 с 7 тестами и comptime-инвариантом. Поэтому записи показывают то, что компилятор доводит до конца на каждой спеке: t27c check (0 ошибок, 0 предупреждений), t27c gen-verilog (синтезируемый модуль, его порты, его провода) и t27c debug-hir (взгляд аппаратного IR). Тексты уроков говорят, что есть что; ни одна запись не утверждает прогон тестов, которого не было.',
  },
  {
    kind: 'terminal',
    src: 'term/t27c-verilog-uart/session.cast',
    share: 'https://t27.ai/term/t27c-verilog-uart/',
    title: 't27c gen-verilog on uart.t27 -- spec to RTL',
    caption: 't27c gen-verilog на uart.t27: модуль ZeroDSP_UART с его портами, а делитель 100,000,000 / 115,200 и FIFO глубиной 16 — в виде localparam. В нативном раннере тестов uart.t27 BLOCKED, поэтому запись показывает Verilog, а не прогон тестов. 3,3 с.',
  },
  {
    kind: 'p',
    text: 'Модуль стенда записывает живые инструменты: tri fpga-ioclients читает зарегистрированных клиентов IO, tri fpga-claim и tri fpga-release берут и возвращают захват подряд, tri fpga-next читает, что запускается дальше, а план запуска Ethernet из tri fpga-steps E3 зарегистрирован по шагам заранее. Капстоун опускает весь дизайн: top_level.t27 несёт CLK_FREQ_HZ 100,000,000, SYSTICK_HZ 1000, NUM_MAC_UNITS 8 и четыре кода операций (CMD_NOP, CMD_MAC_MULT, CMD_MAC_DOT, CMD_UART_SEND) на 19 тестах.',
  },
  { kind: 'h', text: 'Две новые спеки — сначала в репозитории компилятора' },
  {
    kind: 'p',
    text: 'Модулю Ethernet нужны были спеки, которых в дереве не было. specs/fpga/eth_crc.t27 несёт CRC-32, который вычисляет контрольная сумма кадра, а specs/fpga/rgmii.t27 — тайминговую арифметику с двойной скоростью данных, 125 МГц для гигабита и одинарное понижение для 10 и 100. Обе написаны в gHashTag/t27 (PR 7626) и вендорены в дерево файлов сайта — в ту сторону, куда указывает правило собственного языка: спека живёт в репозитории, которому принадлежит язык, а сайт отдаёт копию, которую умеет доказать идентичной. Каждая константа в них, взятая не из IEEE 802.3, помечена в шапке спеки как допущение — рядом с документом, из которого её нет. Первая версия CRC-спеки была неверна так, что её собственный CI этого не видел: гейты проверяют, что спека компилируется, а не что её asserts держатся, и нативно падали 6 тестов из 8 — каждый неудачный assert сравнивал бегущий регистр с проинвертированными значениями zlib, а тест приёмника утверждал возврат регистра к пресету, чего CRC-32 из 802.3 не делает. Теперь спека несёт физическую модель: FCS — это проинвертированный регистр, а приёмник, переваривший кадр с FCS, приходит к остатку 0xDEBB20E3, вычисленному тем же Python zlib, который шапка называет оракулом. Все 8 тестов проходят, пустых — нет.',
  },
  {
    kind: 'terminal',
    src: 'term/t27c-eth-crc/session.cast',
    share: 'https://t27.ai/term/t27c-eth-crc/',
    title: 't27c on eth_crc.t27 -- the FCS, native',
    caption: 'Спека CRC в том виде, в каком она влита: t27c test-report нативно прогоняет все 8 тестов, ни один не пустой; receiver_residue_is_the_magic — тот самый тест приёмника, о котором абзац выше. 9,7 с.',
  },
  { kind: 'h', text: 'Четыре спеки, которые только выглядели компилирующимися' },
  {
    kind: 'p',
    text: 'Последний гейт, который прогоняет курс, считает выброшенные токены, и четыре спеки уроков его не прошли, хотя отчитались, что компилируются: uart, spi, bridge и top_level несли тела тестов и инвариантов, которые парсер молча выбрасывал, -- голый оператор там, где ждали клаузу, условие implies в assert-телах, вызов несуществующего метода, комментарии внутри клауз. Компилятор говорил, что с файлами всё в порядке; читателю никто не сообщал, что его тесты даже не читались (дефект заведён как gHashTag/t27#2474, починка парсера заморожена стадией stage0, поэтому спеки переписаны в подмножество, которое парсер уже потребляет, -- gHashTag/t27 PR 7659, там же записана дивергенция wasm и нативного компилятора на записи в массив bridge). Каждый урок, который говорит вот спека, и она компилируется, теперь указывает на спеку, которая парсится до конца.',
  },
  { kind: 'h', text: 'Чего это не показывает' },
  {
    kind: 'ul',
    items: [
      'Браузерный плеер по-прежнему пропускает блоки test и invariant (trinity#1477, исправление открыто как PR 1495), поэтому каждый записанный вердикт идёт нативно, и урок говорит об этом.',
      'Шесть из семи спек шин BLOCKED в нативном раннере по comptime-разрешению; их записи показывают check, gen-verilog и debug-hir — никогда не заявленный прогон тестов.',
      't27c test-report возвращает 0 на заблокированной спеке (t27#7370), поэтому конвейер чеканки читал статус из текста прогона, а не из кода возврата.',
      'CI в t27 не поймал неверный CRC: он доказывает, что спека компилируется, а не что её asserts держатся. Падение 6 из 8 нашлось нативным прогоном спеки перед записью и исправлено в ветке PR (t27#7626) до того, как отчеканен хоть один каст.',
      'Числа RGMII и CRC — собственная модель спек с помеченными в шапке допущениями, а не измерения на плате; шаги запуска E3 зарегистрированы заранее, и не выполнившиеся шаги записаны как не выполнившиеся.',
      'Русский бандл покрывает все 27 уроков (контракт отвергает недостающее поле), но строки виджетов остаются английскими: каждый виджет — своя спека t27.',
    ],
  },
  { kind: 'h', text: 'Попробуйте' },
  {
    kind: 'ul',
    items: [
      'Курс: t27.ai/learn/buses-and-peripherals/',
      'Кадр, от старта до стопа: t27.ai/learn/the-frame/',
      'Спека, которую нативный раннер берёт целиком: t27.ai/learn/memory-maps/',
      'В приложении: t27.ai/#/buses-and-peripherals',
    ],
  },
]
