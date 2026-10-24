import type { Block } from '../types'

export const body: Block[] = [
  {
    "kind": "h",
    "text": "What was measured"
  },
  {
    "kind": "p",
    "text": "A SPICE netlist whose devices are IHP SG13G2 (PSP103) models becomes .t27 specs that are at once the software reference and the FPGA design. The reference circuit is the SAR ADC of the golden deck: 16 subcircuits, 1265 MOS after flattening, 128 cap_cmim. The specs are checked with t27c test-report and against ngspice-47 with the OSDI models, and a second reference, VACASK, agrees with ngspice on the blocks it ran. The bench is the AX7203 board."
  },
  {
    "kind": "p",
    "text": "This post tells what version 0.1 of that work measured. The headline is the acceptance run: an external team's per-block checks, applied to our models of the 13 blocks of that SAR ADC, give 9 PASS, 0 FAIL and 4 NOT MODELLED. Every number below is taken from the v0.1 release notes (pull request t27#11973) and the one-page summary written with them, and each names the pull request or issue it was measured in. Conditions are the tt corner unless a row names another, and 27 C unless a row says 50 C."
  },
  {
    "kind": "p",
    "text": "v0.1 covers the blocks of the SAR ADC, the first converter slice, one corner (tt) on the AX7203 board, and an acceptance evaluator. It is not a full mixed-signal chip. The last sections say what it does not claim."
  },
  {
    "kind": "h",
    "text": "From a linear cell to a netlist front end"
  },
  {
    "kind": "p",
    "text": "The work starts with a circuit that has no transistors. The first milestone, M0, is an RC low-pass on the AX7203; the next ones generalise it to a linear state-space cell and read a SPICE deck into it."
  },
  {
    "kind": "table",
    "head": ["piece", "result", "source"],
    "rows": [
      ["M0 RC low-pass on the AX7203", "200 samples bit-exact on the board, 2.65 LSB or less against float64, 520 LUT, 0 DSP", "t27#10276"],
      ["M1 linear state-space cell", "14 of 14 tests; reproduces M0 bit for bit; RC 2.65, RLC 8.44, ladder3 9.45, ladder5 40.03 LSB against float64", "t27#10511"],
      ["M1c exact zero-order hold", "LC tank Q = 200 after 100 periods: amplitude ratio 1.0003 against 1.78e-7 for backward Euler", "t27#10528, t27#10539"],
      ["M2 netlist front end", "the golden SAR deck parses and flattens (16 subcircuits, 1265 MOS, 128 cap_cmim); rc, rlc, lad3, lad5 give every cell word bit-exact", "t27#10530, t27#10781"]
    ]
  },
  {
    "kind": "h",
    "text": "PSP103 devices read from tables, five corners"
  },
  {
    "kind": "p",
    "text": "For transistors the specs read tables of the PSP103 model: a 25 x 25 grid for five corners (tt, ss, ff, fs, sf). Each row is a distance to ngspice-47 run on the same cell."
  },
  {
    "kind": "table",
    "head": ["piece", "result", "source"],
    "rows": [
      ["M3b current tables", "tt table against ngspice 0.56 % and 0.41 % where Id is at least 100 uA; CMOS inverter delay within 0.37 % and 0.51 %", "t27#10778"],
      ["M3c charge tables", "tt and ss: 500 fF inverter delays within 0.020 % and 0.0041 % of ngspice; ff, fs, sf within 0.0249 % at worst; the gate node of a MOS loaded by a MOS drain within 0.051 % of the supply", "t27#10893, t27#11123"],
      ["M3c weak inversion, tt", "a log-domain reader with an integer exp: 0.080 and 0.094 % at the 576 midpoints, 0.398 and 0.527 % at 1000 held-out points, 0.467 and 0.705 % at the cell centres; inverter delays within 0.025 % at 500 fF", "t27#11146"],
      ["M3c-4 log tables, ss ff fs sf", "each corner within 0.734 % at worst of its own ngspice run (24 sets; the worst is the fs PMOS at a cell centre); 500 fF delays within 0.0312 %; the tt tables read in the ss run are 546 % and 359 % off, so the wrong corner is refused", "t27#11214"],
      ["M3e body effect", "a source-to-bulk axis on the tt tables: the transmission gate's Ron 2461.2 ohm against ngspice's 2459.6 ohm (+0.065 %), all 27 points within 0.090 %; the same read with the bulk axis forced to 0 is 30.2 % off", "t27#11288"]
    ]
  },
  {
    "kind": "h",
    "text": "The SAR ADC blocks and the converter"
  },
  {
    "kind": "table",
    "head": ["piece", "result", "source"],
    "rows": [
      ["M4a capacitive DAC", "all 1024 codes of a half within 1.74 units of 2^-24 V of the closed form and ngspice; INL 0", "t27#10575"],
      ["M4b comparator, square law", "decision time against ngspice LEVEL=1 within 0.53 %; the square-law model is 97.7 times too fast on the decision against PSP103 (device charge not read)", "t27#10604, t27#11133"],
      ["M4b-q comparator on PSP103 with the devices' charge", "decision time 613.07 ps (+2 mV) and 613.15 ps (-2 mV) against ngspice's own run 602.54 ps (+1.75 %) and the external report's 607 ps; with the charge removed it decides in 5.40 ps and fails", "t27#11325"],
      ["M4c sampling switch", "gate overdrive within 0.26 mV (square law)", "t27#10779"],
      ["M4d SAR logic and clock", "113 gates extracted from the golden deck; CK11 to CK1 order identical; delay cell trim settings within 4.3 %; repeated comparator-clock falls within 1.0 to 1.4 % of ngspice (they were 83 to 127 % late)", "t27#10845, t27#10898"]
    ]
  },
  {
    "kind": "p",
    "text": "M4e is the first slice of the converter itself. Our ngspice-47 run of the golden deck reproduces 30 of 31 codes of the published RAW file. The behavioural converter got 0 of 31 as first merged, and 30 of 31 with two fitted numbers. The converter offset is the comparator's clock-edge kick read through unequal top plates (base +9.42 mV, kick removed +0.03 mV). The spec sar_kick_net.t27 derives the kick from the plates' drive: scenarios S1 to S4 and the seven first-decision offsets are met within 1 mV. The late decisions, S5, are within 0.2 mV of ngspice's in-situ balance at all four decisions, and 3 of 4 against the pooled thresholds of the issue (t27#10854, t27#10953, t27#11124, t27#11158)."
  },
  {
    "kind": "h",
    "text": "The external team's checks: 9 PASS, 0 FAIL, 4 NOT MODELLED"
  },
  {
    "kind": "p",
    "text": "The team's report of 2026-10-16 lists, for each of the 13 blocks of the golden SAR ADC, a measured value and the limit its check enforces. The team confirmed on 2026-10-20 that the checks and their limits may be used and published. The spec specs/analog/accept_sar.t27 holds them as named constants and measures each quantity on our models. A row we do not compute is never a pass."
  },
  {
    "kind": "table",
    "head": ["result", "blocks (13)", "rows (30)"],
    "rows": [
      ["PASS", "9: clock_gen, SAR_logic, integration, nand, nor, tgate, dynamic_comparator, inverter, tracking_switch", "26"],
      ["FAIL", "0", "0"],
      ["NOT MODELLED", "4: dff, DAC_control, DAC_control_top, neg_bottom_plate_logic", "4"]
    ]
  },
  {
    "kind": "p",
    "text": "The counts are pinned by the tests as_all_blocks and as_all_rows (t27#11215, t27#11421); the table of every row with its function is docs/analog/accept-sar-2026-10-20.md in the t27 repository. A transistor-level row is PASS only when the same cell, run in ngspice-47 with PSP103, agrees within a stated bar: 10 uV for a level, 10 percent for a resistance, a current or a time. The rows from the milestones M5d to M5g, each with its ngspice cross-check:"
  },
  {
    "kind": "table",
    "head": ["row", "our value", "ngspice", "source"],
    "rows": [
      ["nand and nor levels into 10 fF", "within 2.4 uV and 1.1 uV of ngspice's", "the cell's own run", "t27#11279"],
      ["tgate off leakage", "291.0 pA", "285.6 pA at the output source (within 7.2 %)", "t27#11279"],
      ["inverter delays into 20 fF", "fall 75.755 ps, rise 93.246 ps", "75.368 and 92.778 ps (+0.51 and +0.50 %)", "t27#11374"],
      ["tracking switch hold step into 2 pF", "-1.634 and -1.893 mV", "-1.596 and -1.730 mV (+2.4 and +9.4 %); droop +0.24 uV", "t27#11399"],
      ["dff levels (a row that stays NOT MODELLED)", "six of eight levels within 1.33 uV; Q's 1 level is 12.73 and 16.30 uV under ngspice's, outside the 10 uV bar", "the cell's own run", "t27#11421"]
    ]
  },
  {
    "kind": "p",
    "text": "The negative controls are in the evaluator's tests. The comparator with its charge removed is a FAIL: the report's limit would accept it, and the cross-check refuses it. The inverter with its charge removed (39 and 52 ps) is a FAIL too."
  },
  {
    "kind": "p",
    "text": "The **SAR ADC acceptance** widget at t27.ai/widgets/analog-v01-acceptance/ draws this scoreboard in the page: 9 of 13 blocks pass, 0 fail, 4 are not modelled and stay on it as open gaps, with the comparator decision time on PSP103 beside ngspice's own run. Every number comes from the release notes and is checked by the widget's spec; it makes no speed claim."
  },
  {
    "kind": "h",
    "text": "On the AX7203 board"
  },
  {
    "kind": "p",
    "text": "All receipts are the board agreeing with the spec bit for bit, read over UART. A PASS says the board equals the spec; the spec's distance to ngspice is the one its own tests state."
  },
  {
    "kind": "table",
    "head": ["top", "result", "source"],
    "rows": [
      ["M1b linear cell", "573 of 573 receipt lines PASS in the 2026-10-19 regression (572 of 572 before), 1196 LUT, 1096 FF, 0 DSP, 0 BRAM, 116.06 MHz after routing; each mis-stamped control fails on its own circuit only (287 lines each)", "t27#10578, t27#11082"],
      ["SAR converter (behavioural)", "549 of 549 receipt lines PASS, 908 LUT, 538 FF, 0 DSP, 0 BRAM, 108.27 MHz after routing; the control (one more DAC unit) fails on exactly the 16 predicted conversions", "t27#11082"],
      ["M3d tt PSP103 inverter, 500 fF, 400 steps of 100 ps", "1217 of 1217 receipt lines PASS in three full rounds; 1426 LUT (+170 INV), 1219 FF, 0 DSP, 4 RAMB36E1 + 1 RAMB18E1 with the tables in block RAM, 103.61 MHz after routing; the ss control prints 231 PASS and 986 FAIL, exactly as predicted", "t27#11220"],
      ["M3f phase 1 and 2a, the comparator step", "phase 1: the step in the board's integer arithmetic, bit for bit equal to the model, 15 device evaluations a step, 1518 to 1690 table reads, 9517 to 10265 multiplies plus 896 in the four updates, 144 divisions a step. Phase 2a: ONE evaluator unit bit for bit the spec at 810 evaluations, placed and routed only (nothing loaded): 9525 LUT by yosys (14208 SLICE_LUTX sites by nextpnr), 5228 FF, 15 DSP48E1, 105 RAMB18 + 2 RAMB36, 59.46 MHz after routing, which FAILS at 100 MHz; 506 to 674 clocks for one full device evaluation", "t27#11387, t27#11427"]
    ]
  },
  {
    "kind": "p",
    "text": "Only one of these tops reads the PSP103 tables: the tt inverter. The two behavioural tops, the linear cell and the SAR converter, do not. The comparator's phase 2a is a unit that was placed and routed and never loaded on the board."
  },
  {
    "kind": "h",
    "text": "Waveforms and a second reference"
  },
  {
    "kind": "table",
    "head": ["piece", "result", "source"],
    "rows": [
      ["M5 RAW writer", "a .t27 writer for ngspice RAW files (ASCII and binary), byte for byte equal to ngspice's own output on the reference trace; ngspice loads our files and uberWAVE's parser reads them (binary bit-exact, ASCII within 4.4e-16)", "t27#10940"],
      ["M5 converter trace as RAW", "the 8-conversion trace read back by ngspice-47: largest difference 0 on 32 doubles of the binary file; a flipped data byte is reported by point and variable", "t27#11151"],
      ["VACASK second reference", "vacask-bin 0.3.4.dev3 against ngspice-47 with the same psp103.osdi: decision time within 0.125 ps over 14 inputs, 28 of 28 winners equal, DAC top-plate voltage within 1e-12 V", "t27#11133"]
    ]
  },
  {
    "kind": "h",
    "text": "Speed"
  },
  {
    "kind": "p",
    "text": "The board is slower than real time, and v0.1 makes no speed claim. One 100 ps backward Euler step of the 500 fF inverter takes 1700 to 1960 clocks at 100 MHz, which is 17.0 to 19.6 us: the board is 170000 to 196000 times slower than real time (specs/analog/bench.t27, tests board_min and board_max, t27#11313). The release notes also record ngspice-47's wall time for the same circuit and say the two are not the cost of the same work; no conclusion is drawn from them here. 103.61 MHz is the logic clock after routing, not the circuit's speed."
  },
  {
    "kind": "h",
    "text": "Against the epic's success criteria"
  },
  {
    "kind": "table",
    "head": ["criterion", "status"],
    "rows": [
      ["SC-001 linear.t27 reproduces the 200 samples of the M0 board spec bit for bit", "met (t27#10511)"],
      ["SC-002 a deck in the supported subset gives a spec whose tests pass with 0 vacuous, and t27c seal refuses each milestone's negative control", "partly evidenced: the specs above pass their tests with 0 vacuous, and the controls named above (M1b, the SAR top, M3d, the comparator and the inverter without charge) fail as predicted. A per-milestone t27c seal exit code was not collected for this release"],
      ["SC-003 for each of the five corners the inverter's board receipt reads PASS", "met for tt only (1217 of 1217). ss, ff, fs and sf have their tables and their ngspice checks (t27#11123, t27#11214) and no bitstream; the ss control on the tt board top fails as predicted"],
      ["SC-004 the ring oscillator on the board", "re-targeted by the external team on 2026-10-18 (the ring oscillator is digital and not relevant; the SAR ADC is); the acceptance result above stands in its place"],
      ["SC-005 the notes quote only receipt- or test-backed numbers", "the release notes, in pull request t27#11973"]
    ]
  },
  {
    "kind": "h",
    "text": "What v0.1 does not claim"
  },
  {
    "kind": "ul",
    "items": [
      "No speed claim, no power claim, no noise, mismatch or temperature claim.",
      "One corner on the board. The other four corners have tables and ngspice checks but no bitstream.",
      "The two behavioural board tops do not read the PSP103 tables; only the tt inverter does. The comparator's phase 2a is a routed unit that FAILS timing at 100 MHz and was never loaded on the board; the comparator step on the board (phase 2b, t27#11380) is not built.",
      "The converter is not predicted end to end. sar_adc.t27 still takes fitted numbers (the top-plate load of 77 fF and an offset); S5 of t27#10942 is met against ngspice's in-situ balance but 3 of 4 against the issue's pooled thresholds. The comparator and the switch at PSP103 level are not yet inside the converter loop.",
      "The acceptance result is 9 of 13 blocks. dff (its levels row is produced and outside the bar), DAC_control, DAC_control_top and neg_bottom_plate_logic are NOT MODELLED. The integration run passes as a behavioural converter fitted to the golden deck. The report's corners smoke suite (5 corners, -40 to 125 C) is NOT MODELLED.",
      "The external team's own evaluator and its testbenches were not run by us; accept_sar.t27 is our implementation of the published checks and limits.",
      "The full demo of the external team's VACASK example does not run on the VACASK obtained (it stops in hbac1 on the wheel 0.3.4.dev3); only the comparator and the DAC were compared.",
      "The body effect on the charge is not modelled; the comparator's resolution time is 4.9 % early and its nodes differ from ngspice's by up to 83 mV during regeneration (t27#11325).",
      "This is a SAR ADC and its blocks: not a full mixed-signal chip, not Verilog-A input and not PCIe."
    ]
  },
  {
    "kind": "h",
    "text": "What comes after v0.1"
  },
  {
    "kind": "ul",
    "items": [
      "One bitstream per remaining corner (ss, ff, fs, sf).",
      "The comparator step on the board with several evaluator units (t27#11380; its t27b rung 1 is t27#11376).",
      "The four NOT MODELLED blocks. Unless the external team says otherwise, the order is: dff levels, DAC_control, then one more corner on the board.",
      "S5 of t27#10942.",
      "The external team's second circuit, when its block and criterion are named (asked on 2026-10-20, no answer yet).",
      "A block of a public test chip (t27#11388; it needs the authors' word).",
      "The Kintex-7 board over PCIe (M7)."
    ]
  },
  {
    "kind": "h",
    "text": "Reproduce"
  },
  {
    "kind": "p",
    "text": "A spec's tests run with the command below; vacuous passes must be 0. The decks under specs/analog/decks/ run with ngspice-47 and the IHP-Open-PDK at the revision named in each deck (21133f21 for the acceptance decks). The board receipts and the exact build lines are in docs/analog/board-regression-2026-10-19.md, docs/analog/board-psp103-inv-2026-10-20.md and docs/analog/board-sar-cmp-unit-2026-10-20.md of the t27 repository. Runs that need ngspice and the PDK belong on the Railway lab, not on a laptop."
  },
  {
    "kind": "code",
    "text": "t27c test-report specs/analog/<spec>.t27"
  }
]

export const ruBody: Block[] = [
  {
    "kind": "h",
    "text": "Что измерено"
  },
  {
    "kind": "p",
    "text": "Нетлист SPICE, устройства которого — модели IHP SG13G2 (PSP103), превращается в спеки .t27, которые одновременно служат программным эталоном и проектом для ПЛИС. Эталонная схема — SAR-АЦП из golden deck: 16 подсхем, 1265 МОП-транзисторов после раскрытия иерархии, 128 cap_cmim. Спеки проверяются командой t27c test-report и сравнением с ngspice-47 на моделях OSDI, а второй эталон, VACASK, совпадает с ngspice на тех блоках, которые на нём прогонялись. Стенд — плата AX7203."
  },
  {
    "kind": "p",
    "text": "Этот пост рассказывает, что измерила версия 0.1 этой работы. Главный результат — приёмочный прогон: поблочные проверки внешней команды, применённые к нашим моделям 13 блоков этого SAR-АЦП, дают 9 PASS, 0 FAIL и 4 NOT MODELLED (не смоделировано). Каждое число ниже взято из заметок к релизу v0.1 (pull request t27#11973) и одностраничной сводки к ним, и при каждом названо, в каком pull request или какой задаче оно измерено. Условия — технологический угол tt, если строка не называет другой, и 27 C, если строка не говорит о 50 C."
  },
  {
    "kind": "p",
    "text": "v0.1 охватывает блоки SAR-АЦП, первый срез преобразователя, один угол (tt) на плате AX7203 и приёмочный вычислитель. Это не полноценная смешанная микросхема. В последних разделах сказано, чего версия не заявляет."
  },
  {
    "kind": "h",
    "text": "От линейной ячейки к входу для нетлиста"
  },
  {
    "kind": "p",
    "text": "Работа начинается со схемы без транзисторов. Первая веха, M0, — RC-фильтр нижних частот на AX7203; следующие обобщают его до линейной ячейки в пространстве состояний и вводят в неё колоду SPICE."
  },
  {
    "kind": "table",
    "head": ["часть", "результат", "источник"],
    "rows": [
      ["M0 RC-фильтр нижних частот на AX7203", "200 отсчётов бит в бит на плате, не более 2.65 LSB относительно float64, 520 LUT, 0 DSP", "t27#10276"],
      ["M1 линейная ячейка в пространстве состояний", "14 тестов из 14; воспроизводит M0 бит в бит; RC 2.65, RLC 8.44, ladder3 9.45, ladder5 40.03 LSB относительно float64", "t27#10511"],
      ["M1c точное удержание нулевого порядка", "LC-контур с добротностью Q = 200 после 100 периодов: отношение амплитуд 1.0003 против 1.78e-7 у обратного метода Эйлера", "t27#10528, t27#10539"],
      ["M2 вход для нетлиста", "golden SAR deck разбирается и раскрывается (16 подсхем, 1265 МОП, 128 cap_cmim); rc, rlc, lad3, lad5 дают каждое слово ячейки бит в бит", "t27#10530, t27#10781"]
    ]
  },
  {
    "kind": "h",
    "text": "Устройства PSP103 из таблиц, пять углов"
  },
  {
    "kind": "p",
    "text": "Для транзисторов спеки читают таблицы модели PSP103: сетка 25 x 25 для пяти углов (tt, ss, ff, fs, sf). Каждая строка — расстояние до ngspice-47, запущенного на той же ячейке."
  },
  {
    "kind": "table",
    "head": ["часть", "результат", "источник"],
    "rows": [
      ["M3b таблицы тока", "таблица tt против ngspice 0.56 % и 0.41 % там, где Id не меньше 100 uA; задержка КМОП-инвертора в пределах 0.37 % и 0.51 %", "t27#10778"],
      ["M3c таблицы заряда", "tt и ss: задержки инвертора на 500 fF в пределах 0.020 % и 0.0041 % от ngspice; ff, fs, sf — не хуже 0.0249 %; затворный узел МОП, нагруженный стоком МОП, в пределах 0.051 % питания", "t27#10893, t27#11123"],
      ["M3c слабая инверсия, tt", "читатель в логарифмической области с целочисленной exp: 0.080 и 0.094 % в 576 серединах ячеек, 0.398 и 0.527 % в 1000 отложенных точках, 0.467 и 0.705 % в центрах ячеек; задержки инвертора в пределах 0.025 % на 500 fF", "t27#11146"],
      ["M3c-4 логарифмические таблицы, ss ff fs sf", "каждый угол не хуже 0.734 % относительно собственного прогона ngspice (24 набора; худший — PMOS угла fs в центре ячейки); задержки на 500 fF в пределах 0.0312 %; таблицы tt, прочитанные в прогоне ss, расходятся на 546 % и 359 %, так что чужой угол отвергается", "t27#11214"],
      ["M3e эффект подложки", "ось исток-подложка на таблицах tt: Ron передаточного вентиля 2461.2 Ом против 2459.6 Ом у ngspice (+0.065 %), все 27 точек в пределах 0.090 %; то же чтение с осью подложки, принудительно равной 0, расходится на 30.2 %", "t27#11288"]
    ]
  },
  {
    "kind": "h",
    "text": "Блоки SAR-АЦП и преобразователь"
  },
  {
    "kind": "table",
    "head": ["часть", "результат", "источник"],
    "rows": [
      ["M4a ёмкостный ЦАП", "все 1024 кода половины в пределах 1.74 единицы 2^-24 В от замкнутой формулы и ngspice; INL 0", "t27#10575"],
      ["M4b компаратор, квадратичный закон", "время решения против ngspice LEVEL=1 в пределах 0.53 %; квадратичная модель в 97.7 раза слишком быстра в решении против PSP103 (заряд устройств не читается)", "t27#10604, t27#11133"],
      ["M4b-q компаратор на PSP103 с зарядом устройств", "время решения 613.07 пс (+2 мВ) и 613.15 пс (-2 мВ) против собственного прогона ngspice 602.54 пс (+1.75 %) и 607 пс из отчёта внешней команды; без заряда он решает за 5.40 пс и не проходит", "t27#11325"],
      ["M4c ключ выборки", "перенапряжение на затворе в пределах 0.26 мВ (квадратичный закон)", "t27#10779"],
      ["M4d логика SAR и тактирование", "извлечено 113 вентилей из golden deck; порядок CK11 .. CK1 совпадает; настройки подстройки ячейки задержки в пределах 4.3 %; повторные спады тактового сигнала компаратора в пределах 1.0 .. 1.4 % от ngspice (раньше опаздывали на 83 .. 127 %)", "t27#10845, t27#10898"]
    ]
  },
  {
    "kind": "p",
    "text": "M4e — первый срез самого преобразователя. Наш прогон ngspice-47 golden deck воспроизводит 30 кодов из 31 в опубликованном файле RAW. Поведенческий преобразователь в первом слитом виде дал 0 из 31, а с двумя подобранными числами — 30 из 31. Смещение преобразователя — это толчок компаратора по фронту тактового сигнала, прочитанный через неравные верхние обкладки (база +9.42 мВ, при снятом толчке +0.03 мВ). Спека sar_kick_net.t27 выводит толчок из управления обкладками: сценарии S1 .. S4 и семь смещений первых решений выполнены в пределах 1 мВ. Поздние решения, S5, в пределах 0.2 мВ от баланса ngspice in situ на всех четырёх решениях и 3 из 4 относительно объединённых порогов задачи (t27#10854, t27#10953, t27#11124, t27#11158)."
  },
  {
    "kind": "h",
    "text": "Проверки внешней команды: 9 PASS, 0 FAIL, 4 NOT MODELLED"
  },
  {
    "kind": "p",
    "text": "Отчёт команды от 2026-10-16 перечисляет для каждого из 13 блоков golden SAR ADC измеренное значение и предел, который проверка обеспечивает. 2026-10-20 команда подтвердила, что проверки и их пределы можно использовать и публиковать. Спека specs/analog/accept_sar.t27 хранит их как именованные константы и измеряет каждую величину на наших моделях. Строка, которую мы не вычисляем, никогда не считается пройденной."
  },
  {
    "kind": "table",
    "head": ["результат", "блоки (13)", "строки (30)"],
    "rows": [
      ["PASS", "9: clock_gen, SAR_logic, integration, nand, nor, tgate, dynamic_comparator, inverter, tracking_switch", "26"],
      ["FAIL", "0", "0"],
      ["NOT MODELLED", "4: dff, DAC_control, DAC_control_top, neg_bottom_plate_logic", "4"]
    ]
  },
  {
    "kind": "p",
    "text": "Числа закреплены тестами as_all_blocks и as_all_rows (t27#11215, t27#11421); таблица каждой строки с её функцией — docs/analog/accept-sar-2026-10-20.md в репозитории t27. Строка на уровне транзисторов считается PASS, только если та же ячейка, запущенная в ngspice-47 с PSP103, согласуется в заявленных пределах: 10 мкВ для уровня, 10 процентов для сопротивления, тока или времени. Строки вех M5d .. M5g, каждая с перекрёстной проверкой по ngspice:"
  },
  {
    "kind": "table",
    "head": ["строка", "наше значение", "ngspice", "источник"],
    "rows": [
      ["уровни nand и nor на 10 fF", "в пределах 2.4 мкВ и 1.1 мкВ от ngspice", "собственный прогон ячейки", "t27#11279"],
      ["ток утечки tgate в закрытом состоянии", "291.0 пА", "285.6 пА на выходном источнике (в пределах 7.2 %)", "t27#11279"],
      ["задержки инвертора на 20 fF", "спад 75.755 пс, фронт 93.246 пс", "75.368 и 92.778 пс (+0.51 и +0.50 %)", "t27#11374"],
      ["скачок при удержании следящего ключа на 2 pF", "-1.634 и -1.893 мВ", "-1.596 и -1.730 мВ (+2.4 и +9.4 %); спад +0.24 мкВ", "t27#11399"],
      ["уровни dff (строка остаётся NOT MODELLED)", "шесть уровней из восьми в пределах 1.33 мкВ; уровень 1 на Q ниже, чем у ngspice, на 12.73 и 16.30 мкВ, то есть за границей 10 мкВ", "собственный прогон ячейки", "t27#11421"]
    ]
  },
  {
    "kind": "p",
    "text": "Отрицательные контроли лежат в тестах вычислителя. Компаратор со снятым зарядом — FAIL: предел из отчёта его бы принял, а перекрёстная проверка отвергает. Инвертор со снятым зарядом (39 и 52 пс) — тоже FAIL."
  },
  {
    "kind": "p",
    "text": "Виджет **приёмка SAR-АЦП** на t27.ai/widgets/analog-v01-acceptance/ рисует эту таблицу на странице: 9 из 13 блоков проходят, 0 не проходят, 4 не смоделированы и остаются на ней как открытые пробелы; рядом время решения компаратора на PSP103 и прогон самого ngspice. Каждое число взято из заметок к выпуску и проверяется спецификацией виджета; заявления о скорости нет."
  },
  {
    "kind": "h",
    "text": "На плате AX7203"
  },
  {
    "kind": "p",
    "text": "Все квитанции — это плата, совпадающая со спекой бит в бит, прочитанная по UART. PASS говорит, что плата равна спеке; расстояние спеки до ngspice — то, что заявляют её собственные тесты."
  },
  {
    "kind": "table",
    "head": ["верхний модуль", "результат", "источник"],
    "rows": [
      ["M1b линейная ячейка", "573 строки квитанции из 573 PASS в регрессии 2026-10-19 (раньше 572 из 572), 1196 LUT, 1096 FF, 0 DSP, 0 BRAM, 116.06 МГц после разводки; каждый контроль с неверной штамповкой падает только на своей схеме (по 287 строк)", "t27#10578, t27#11082"],
      ["преобразователь SAR (поведенческий)", "549 строк квитанции из 549 PASS, 908 LUT, 538 FF, 0 DSP, 0 BRAM, 108.27 МГц после разводки; контроль (ещё одна единица ЦАП) падает ровно на 16 предсказанных преобразованиях", "t27#11082"],
      ["M3d инвертор tt PSP103, 500 fF, 400 шагов по 100 пс", "1217 строк квитанции из 1217 PASS в трёх полных кругах; 1426 LUT (+170 INV), 1219 FF, 0 DSP, 4 RAMB36E1 + 1 RAMB18E1 с таблицами в блочной памяти, 103.61 МГц после разводки; контроль ss печатает 231 PASS и 986 FAIL, точно как предсказано", "t27#11220"],
      ["M3f фазы 1 и 2a, шаг компаратора", "фаза 1: шаг в целочисленной арифметике платы, бит в бит равный модели, 15 вычислений устройств на шаг, от 1518 до 1690 чтений таблиц, от 9517 до 10265 умножений плюс 896 в четырёх обновлениях, 144 деления на шаг. Фаза 2a: ОДИН вычислительный блок бит в бит равен спеке на 810 вычислениях, только размещён и разведён (ничего не загружено): 9525 LUT по yosys (14208 площадок SLICE_LUTX по nextpnr), 5228 FF, 15 DSP48E1, 105 RAMB18 + 2 RAMB36, 59.46 МГц после разводки, то есть НЕ проходит 100 МГц; от 506 до 674 тактов на одно полное вычисление устройства", "t27#11387, t27#11427"]
    ]
  },
  {
    "kind": "p",
    "text": "Таблицы PSP103 читает только один из этих модулей: инвертор tt. Два поведенческих модуля, линейная ячейка и преобразователь SAR, их не читают. Фаза 2a компаратора — блок, который размещён и разведён, но на плату никогда не загружался."
  },
  {
    "kind": "h",
    "text": "Осциллограммы и второй эталон"
  },
  {
    "kind": "table",
    "head": ["часть", "результат", "источник"],
    "rows": [
      ["M5 писатель RAW", "писатель файлов RAW для ngspice на .t27 (ASCII и двоичные), байт в байт равный собственному выводу ngspice на эталонной трассе; ngspice загружает наши файлы, а разборщик uberWAVE их читает (двоичные бит в бит, ASCII в пределах 4.4e-16)", "t27#10940"],
      ["M5 трасса преобразователя как RAW", "трасса из 8 преобразований, прочитанная обратно ngspice-47: наибольшая разница 0 на 32 числах double двоичного файла; перевёрнутый байт данных сообщается по точке и переменной", "t27#11151"],
      ["VACASK, второй эталон", "vacask-bin 0.3.4.dev3 против ngspice-47 с тем же psp103.osdi: время решения в пределах 0.125 пс на 14 входах, 28 победителей из 28 совпали, напряжение верхней обкладки ЦАП в пределах 1e-12 В", "t27#11133"]
    ]
  },
  {
    "kind": "h",
    "text": "Скорость"
  },
  {
    "kind": "p",
    "text": "Плата медленнее реального времени, и v0.1 не заявляет скорости. Один шаг обратным методом Эйлера в 100 пс для инвертора на 500 fF занимает от 1700 до 1960 тактов на 100 МГц, то есть от 17.0 до 19.6 мкс: плата медленнее реального времени в 170000 .. 196000 раз (specs/analog/bench.t27, тесты board_min и board_max, t27#11313). Заметки к релизу записывают и время работы ngspice-47 на той же схеме и говорят, что это не стоимость одной и той же работы; выводов из них здесь не делается. 103.61 МГц — тактовая частота логики после разводки, а не скорость схемы."
  },
  {
    "kind": "h",
    "text": "Критерии успеха эпика"
  },
  {
    "kind": "table",
    "head": ["критерий", "состояние"],
    "rows": [
      ["SC-001 linear.t27 воспроизводит 200 отсчётов спеки платы M0 бит в бит", "выполнен (t27#10511)"],
      ["SC-002 колода из поддерживаемого подмножества даёт спеку, тесты которой проходят с 0 пустых, а t27c seal отвергает отрицательный контроль каждой вехи", "подтверждён частично: перечисленные спеки проходят тесты с 0 пустых, а названные выше контроли (M1b, верхний модуль SAR, M3d, компаратор и инвертор без заряда) падают, как предсказано. Код возврата t27c seal для каждой вехи в этом релизе не собирался"],
      ["SC-003 для каждого из пяти углов квитанция платы с инвертором читается PASS", "выполнен только для tt (1217 из 1217). У ss, ff, fs и sf есть таблицы и проверки по ngspice (t27#11123, t27#11214), но нет битстрима; контроль ss на верхнем модуле tt падает, как предсказано"],
      ["SC-004 кольцевой генератор на плате", "перенацелен внешней командой 2026-10-18 (кольцевой генератор цифровой и не важен; важно SAR-АЦП); вместо него стоит приёмочный результат выше"],
      ["SC-005 заметки приводят только числа, подкреплённые квитанцией или тестом", "заметки к релизу, в pull request t27#11973"]
    ]
  },
  {
    "kind": "h",
    "text": "Чего v0.1 не заявляет"
  },
  {
    "kind": "ul",
    "items": [
      "Нет заявлений о скорости, мощности, шуме, разбросе и температуре.",
      "Один угол на плате. У остальных четырёх углов есть таблицы и проверки по ngspice, но нет битстрима.",
      "Два поведенческих модуля платы не читают таблицы PSP103; читает только инвертор tt. Фаза 2a компаратора — разведённый блок, который НЕ проходит тайминг на 100 МГц и никогда не загружался на плату; шаг компаратора на плате (фаза 2b, t27#11380) не построен.",
      "Преобразователь не предсказан от начала до конца. sar_adc.t27 всё ещё берёт подобранные числа (нагрузка верхней обкладки 77 fF и смещение); S5 из t27#10942 выполнен относительно баланса ngspice in situ, но лишь 3 из 4 относительно объединённых порогов задачи. Компаратор и ключ на уровне PSP103 пока не внутри контура преобразователя.",
      "Приёмочный результат — 9 блоков из 13. dff (строка уровней получена и лежит за границей), DAC_control, DAC_control_top и neg_bottom_plate_logic — NOT MODELLED. Прогон integration проходит как поведенческий преобразователь, подогнанный под golden deck. Дымовой набор углов из отчёта (5 углов, от -40 до 125 C) — NOT MODELLED.",
      "Собственный вычислитель внешней команды и её тестовые стенды мы не запускали; accept_sar.t27 — наша реализация опубликованных проверок и пределов.",
      "Полная демонстрация примера VACASK внешней команды на полученной версии VACASK не работает (останавливается в hbac1 на пакете 0.3.4.dev3); сравнивались только компаратор и ЦАП.",
      "Эффект подложки на заряде не смоделирован; время разрешения компаратора на 4.9 % раньше, а его узлы отличаются от ngspice до 83 мВ во время регенерации (t27#11325).",
      "Это SAR-АЦП и его блоки: не полноценная смешанная микросхема, не вход Verilog-A и не PCIe."
    ]
  },
  {
    "kind": "h",
    "text": "Что после v0.1"
  },
  {
    "kind": "ul",
    "items": [
      "По одному битстриму на каждый оставшийся угол (ss, ff, fs, sf).",
      "Шаг компаратора на плате с несколькими вычислительными блоками (t27#11380; его ступень 1 в t27b — t27#11376).",
      "Четыре блока NOT MODELLED. Если внешняя команда не скажет иначе, порядок такой: уровни dff, DAC_control, затем ещё один угол на плате.",
      "S5 из t27#10942.",
      "Вторая схема внешней команды, когда будут названы её блок и критерий (спрошено 2026-10-20, ответа пока нет).",
      "Блок общедоступного тестового кристалла (t27#11388; нужно слово авторов).",
      "Плата Kintex-7 по PCIe (M7)."
    ]
  },
  {
    "kind": "h",
    "text": "Как воспроизвести"
  },
  {
    "kind": "p",
    "text": "Тесты спеки запускаются командой ниже; пустых прохождений должно быть 0. Колоды из specs/analog/decks/ запускаются с ngspice-47 и IHP-Open-PDK той ревизии, что названа в каждой колоде (21133f21 для приёмочных колод). Квитанции платы и точные строки сборки — в docs/analog/board-regression-2026-10-19.md, docs/analog/board-psp103-inv-2026-10-20.md и docs/analog/board-sar-cmp-unit-2026-10-20.md репозитория t27. Прогоны, которым нужны ngspice и PDK, место на лаборатории Railway, а не на ноутбуке."
  },
  {
    "kind": "code",
    "text": "t27c test-report specs/analog/<spec>.t27"
  }
]
