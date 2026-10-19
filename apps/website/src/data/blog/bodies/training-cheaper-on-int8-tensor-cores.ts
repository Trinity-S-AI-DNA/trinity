import type { Block } from '../types'

// Every number here is a constant or a recomputation of gHashTag/t27 specs/t27t/t27t.t27 (module T27t,
// gHashTag/t27#10789, PR #10790): the #10360 GEMM bench on one RTX 4090, 2026-10-18, and the saving
// law f x (1 - 1/s). t27c 0.5.2 test-report on the Railway lab: 8 of 8 tests pass, 3 invariants, 0 vacuous.
// The widget t27t-savings recomputes every cell of the cost grid in its own spec tests.
// The figures are static SVG strings: no drawing code.

// Speed over bf16 per shape: 100 px per 1.0x, bars start at x = 240, so bf16 is x = 340 and the 4x
// datasheet figure is x = 640. int8 TC: 2.93 2.90 3.16 3.54 3.19; dp4a: 0.94 0.91 0.92 0.92 0.93.
const SPEED_BARS =
  '<text x="10" y="66" font-size="13" fill="currentColor">4096x3456x1280, FFN up</text>' +
  '<rect x="240" y="44" width="293" height="18" fill="#ffd700"/><text x="527" y="58" font-size="12" text-anchor="end" fill="#000">2.93x</text>' +
  '<rect x="240" y="66" width="94" height="18" fill="#ff5c5c"/><text x="348" y="80" font-size="12" fill="currentColor" fill-opacity="0.85">0.94x</text>' +
  '<text x="10" y="116" font-size="13" fill="currentColor">4096x1280x3456, FFN down</text>' +
  '<rect x="240" y="94" width="290" height="18" fill="#ffd700"/><text x="524" y="108" font-size="12" text-anchor="end" fill="#000">2.90x</text>' +
  '<rect x="240" y="116" width="91" height="18" fill="#ff5c5c"/><text x="348" y="130" font-size="12" fill="currentColor" fill-opacity="0.85">0.91x</text>' +
  '<text x="10" y="166" font-size="13" fill="currentColor">16384x3456x1280</text>' +
  '<rect x="240" y="144" width="316" height="18" fill="#ffd700"/><text x="550" y="158" font-size="12" text-anchor="end" fill="#000">3.16x</text>' +
  '<rect x="240" y="166" width="92" height="18" fill="#ff5c5c"/><text x="348" y="180" font-size="12" fill="currentColor" fill-opacity="0.85">0.92x</text>' +
  '<text x="10" y="216" font-size="13" fill="currentColor">16384x1280x3456</text>' +
  '<rect x="240" y="194" width="354" height="18" fill="#ffd700"/><text x="588" y="208" font-size="12" text-anchor="end" fill="#000">3.54x</text>' +
  '<rect x="240" y="216" width="92" height="18" fill="#ff5c5c"/><text x="348" y="230" font-size="12" fill="currentColor" fill-opacity="0.85">0.92x</text>' +
  '<text x="10" y="266" font-size="13" fill="currentColor">16384x1280x1280, attn</text>' +
  '<rect x="240" y="244" width="319" height="18" fill="#ffd700"/><text x="553" y="258" font-size="12" text-anchor="end" fill="#000">3.19x</text>' +
  '<rect x="240" y="266" width="93" height="18" fill="#ff5c5c"/><text x="348" y="280" font-size="12" fill="currentColor" fill-opacity="0.85">0.93x</text>' +
  '<line x1="340" y1="36" x2="340" y2="292" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.5"/>' +
  '<line x1="640" y1="36" x2="640" y2="292" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="5 4"/>'

const FIG_SPEED_EN =
  '<svg viewBox="0 0 720 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GEMM speed over bf16 on an RTX 4090, five training shapes. int8 tensor cores: 2.93x, 2.90x, 3.16x, 3.54x, 3.19x. int8 dp4a on CUDA cores: 0.94x, 0.91x, 0.92x, 0.92x, 0.93x, slower than bf16 on every shape. The datasheet says 4x." style="width:100%;height:auto;font-family:inherit">' +
  '<rect x="240" y="8" width="14" height="14" fill="#ffd700"/><text x="260" y="20" font-size="13" fill="currentColor">int8 tensor cores</text>' +
  '<rect x="470" y="8" width="14" height="14" fill="#ff5c5c"/><text x="490" y="20" font-size="13" fill="currentColor">int8 dp4a, CUDA cores</text>' +
  SPEED_BARS +
  '<text x="340" y="310" font-size="12" text-anchor="middle" fill="currentColor">bf16 = 1.0x</text>' +
  '<text x="640" y="310" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.8">datasheet 4x</text>' +
  '</svg>'

const FIG_SPEED_RU =
  '<svg viewBox="0 0 720 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Скорость GEMM относительно bf16 на RTX 4090, пять форм из обучения. int8 на тензорных ядрах: 2.93x, 2.90x, 3.16x, 3.54x, 3.19x. int8 dp4a на ядрах CUDA: 0.94x, 0.91x, 0.92x, 0.92x, 0.93x, медленнее bf16 на каждой форме. В паспорте 4x." style="width:100%;height:auto;font-family:inherit">' +
  '<rect x="240" y="8" width="14" height="14" fill="#ffd700"/><text x="260" y="20" font-size="13" fill="currentColor">int8, тензорные ядра</text>' +
  '<rect x="470" y="8" width="14" height="14" fill="#ff5c5c"/><text x="490" y="20" font-size="13" fill="currentColor">int8 dp4a, ядра CUDA</text>' +
  SPEED_BARS +
  '<text x="340" y="310" font-size="12" text-anchor="middle" fill="currentColor">bf16 = 1.0x</text>' +
  '<text x="640" y="310" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.8">паспорт 4x</text>' +
  '</svg>'

// One training step as a 600 px bar, f = 1/3, s = 3.2: forward GEMMs 200 px shrink to 62.5 px,
// the rest stays 400 px, and 137.5 px of 600 (22.9%) is saved.
const FIG_STEP_EN =
  '<svg viewBox="0 0 720 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="One training step drawn as a bar. In bf16, forward GEMMs take a third and everything else two thirds. With the forward GEMMs on int8 tensor cores at 3.2x, the third shrinks to about a tenth; everything else stays the same; 22.9% of the step is saved." style="width:100%;height:auto;font-family:inherit">' +
  '<text x="10" y="56" font-size="13" fill="currentColor">bf16</text>' +
  '<rect x="100" y="34" width="200" height="34" fill="#ffd700"/><text x="200" y="56" font-size="12" text-anchor="middle" fill="#000">forward GEMMs, f = 1/3</text>' +
  '<rect x="300" y="34" width="400" height="34" fill="currentColor" fill-opacity="0.25"/><text x="500" y="56" font-size="12" text-anchor="middle" fill="currentColor">backward in bf16, optimizer, data, the rest</text>' +
  '<text x="10" y="136" font-size="13" fill="currentColor">int8 fwd</text>' +
  '<rect x="100" y="114" width="62.5" height="34" fill="#ffd700"/>' +
  '<rect x="162.5" y="114" width="400" height="34" fill="currentColor" fill-opacity="0.25"/><text x="362.5" y="136" font-size="12" text-anchor="middle" fill="currentColor">backward in bf16, optimizer, data, the rest</text>' +
  '<rect x="562.5" y="114" width="137.5" height="34" fill="none" stroke="#ffd700" stroke-dasharray="5 4"/><text x="631" y="136" font-size="12" text-anchor="middle" fill="currentColor">saved: 22.9%</text>' +
  '<text x="100" y="182" font-size="12" fill="currentColor" fill-opacity="0.8">One step, f = 1/3, s = 3.2x: only the yellow part gets faster, by s. The saving is f x (1 - 1/s).</text>' +
  '</svg>'

const FIG_STEP_RU =
  '<svg viewBox="0 0 720 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Один шаг обучения в виде полосы. В bf16 прямые GEMM занимают треть, всё остальное две трети. Когда прямые GEMM идут на тензорных ядрах int8 в 3.2 раза быстрее, треть сжимается примерно до десятой; остальное не меняется; экономится 22.9% шага." style="width:100%;height:auto;font-family:inherit">' +
  '<text x="10" y="56" font-size="13" fill="currentColor">bf16</text>' +
  '<rect x="100" y="34" width="200" height="34" fill="#ffd700"/><text x="200" y="56" font-size="12" text-anchor="middle" fill="#000">прямые GEMM, f = 1/3</text>' +
  '<rect x="300" y="34" width="400" height="34" fill="currentColor" fill-opacity="0.25"/><text x="500" y="56" font-size="12" text-anchor="middle" fill="currentColor">обратный проход в bf16, оптимизатор, данные</text>' +
  '<text x="10" y="136" font-size="13" fill="currentColor">int8 вперёд</text>' +
  '<rect x="100" y="114" width="62.5" height="34" fill="#ffd700"/>' +
  '<rect x="162.5" y="114" width="400" height="34" fill="currentColor" fill-opacity="0.25"/><text x="362.5" y="136" font-size="12" text-anchor="middle" fill="currentColor">обратный проход в bf16, оптимизатор, данные</text>' +
  '<rect x="562.5" y="114" width="137.5" height="34" fill="none" stroke="#ffd700" stroke-dasharray="5 4"/><text x="631" y="136" font-size="12" text-anchor="middle" fill="currentColor">сэкономлено: 22.9%</text>' +
  '<text x="100" y="182" font-size="12" fill="currentColor" fill-opacity="0.8">Один шаг, f = 1/3, s = 3.2x: быстрее становится только жёлтая часть, в s раз. Экономия f x (1 - 1/s).</text>' +
  '</svg>'

// Saving against f, 0 to 0.5: x = 70 + 1240 f, y = 270 - 4.8 x (percent). Lines from the origin to
// f = 0.5: s = 2.9 ends at 32.76% (y 112.8), s = 3.5 at 35.71% (y 98.6), the ceiling (s unbounded) at
// 50% (y 30). The band is the #10360 estimate f = 1/4 to 1/3: x = 380 to 483.3. Points: 16.4% and
// 17.9% at 1/4, 21.8% and 23.8% at 1/3.
const LAW_PLOT =
  '<rect x="380" y="30" width="103.3" height="240" fill="#ffd700" fill-opacity="0.14"/>' +
  '<line x1="70" y1="270" x2="690" y2="270" stroke="currentColor" stroke-opacity="0.12"/><text x="62" y="274" font-size="12" text-anchor="end" fill="currentColor" fill-opacity="0.8">0%</text>' +
  '<line x1="70" y1="222" x2="690" y2="222" stroke="currentColor" stroke-opacity="0.12"/><text x="62" y="226" font-size="12" text-anchor="end" fill="currentColor" fill-opacity="0.8">10%</text>' +
  '<line x1="70" y1="174" x2="690" y2="174" stroke="currentColor" stroke-opacity="0.12"/><text x="62" y="178" font-size="12" text-anchor="end" fill="currentColor" fill-opacity="0.8">20%</text>' +
  '<line x1="70" y1="126" x2="690" y2="126" stroke="currentColor" stroke-opacity="0.12"/><text x="62" y="130" font-size="12" text-anchor="end" fill="currentColor" fill-opacity="0.8">30%</text>' +
  '<line x1="70" y1="78" x2="690" y2="78" stroke="currentColor" stroke-opacity="0.12"/><text x="62" y="82" font-size="12" text-anchor="end" fill="currentColor" fill-opacity="0.8">40%</text>' +
  '<line x1="70" y1="30" x2="690" y2="30" stroke="currentColor" stroke-opacity="0.12"/><text x="62" y="34" font-size="12" text-anchor="end" fill="currentColor" fill-opacity="0.8">50%</text>' +
  '<text x="70" y="288" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.8">0</text>' +
  '<text x="194" y="288" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.8">0.1</text>' +
  '<text x="318" y="288" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.8">0.2</text>' +
  '<text x="442" y="288" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.8">0.3</text>' +
  '<text x="566" y="288" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.8">0.4</text>' +
  '<text x="690" y="288" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.8">0.5</text>' +
  '<line x1="70" y1="270" x2="690" y2="30" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="5 4"/>' +
  '<line x1="70" y1="270" x2="690" y2="98.6" stroke="#ffd700" stroke-width="2.5"/>' +
  '<line x1="70" y1="270" x2="690" y2="112.8" stroke="#ffd700" stroke-width="2.5" stroke-opacity="0.6"/>' +
  '<text x="628" y="106" font-size="12" text-anchor="middle" fill="currentColor">s = 3.5x</text>' +
  '<text x="628" y="146" font-size="12" text-anchor="middle" fill="currentColor">s = 2.9x</text>' +
  '<circle cx="380" cy="191.4" r="4" fill="#ffd700"/><circle cx="380" cy="184.3" r="4" fill="#ffd700"/>' +
  '<circle cx="483.3" cy="165.2" r="4" fill="#ffd700"/><circle cx="483.3" cy="155.7" r="4" fill="#ffd700"/>' +
  '<text x="372" y="200" font-size="12" text-anchor="end" fill="currentColor">16.4%</text>' +
  '<text x="491" y="152" font-size="12" fill="currentColor">23.8%</text>'

const FIG_LAW_EN =
  '<svg viewBox="0 0 720 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Saving of a run against f, the share of step time spent in forward GEMMs, from 0 to 0.5. Two lines for s = 2.9x and s = 3.5x, and a dashed ceiling where saving equals f. The band from f = 1/4 to 1/3 is the estimate, not measured: there the saving is 16.4% to 23.8%." style="width:100%;height:auto;font-family:inherit">' +
  LAW_PLOT +
  '<text x="431.7" y="46" font-size="12" text-anchor="middle" fill="currentColor">estimate, not measured</text>' +
  '<text x="590" y="50" font-size="12" text-anchor="end" fill="currentColor" fill-opacity="0.8">ceiling: saving = f</text>' +
  '<text x="380" y="310" font-size="12" text-anchor="middle" fill="currentColor">f, the share of step time in forward GEMMs</text>' +
  '<text x="70" y="20" font-size="12" fill="currentColor">share of the run saved</text>' +
  '<text x="690" y="326" font-size="11" text-anchor="end" fill="currentColor" fill-opacity="0.7">source: specs/t27t/t27t.t27, saving_e3</text>' +
  '</svg>'

const FIG_LAW_RU =
  '<svg viewBox="0 0 720 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Экономия прогона в зависимости от f, доли времени шага на прямые GEMM, от 0 до 0.5. Две линии для s = 2.9x и s = 3.5x и пунктирный потолок, где экономия равна f. Полоса от f = 1/4 до 1/3 это оценка, не измерение: там экономия от 16.4% до 23.8%." style="width:100%;height:auto;font-family:inherit">' +
  LAW_PLOT +
  '<text x="431.7" y="46" font-size="12" text-anchor="middle" fill="currentColor">оценка, не измерено</text>' +
  '<text x="590" y="50" font-size="12" text-anchor="end" fill="currentColor" fill-opacity="0.8">потолок: экономия = f</text>' +
  '<text x="380" y="310" font-size="12" text-anchor="middle" fill="currentColor">f, доля времени шага на прямые GEMM</text>' +
  '<text x="70" y="20" font-size="12" fill="currentColor">доля сэкономленного прогона</text>' +
  '<text x="690" y="326" font-size="11" text-anchor="end" fill="currentColor" fill-opacity="0.7">источник: specs/t27t/t27t.t27, saving_e3</text>' +
  '</svg>'

export const body: Block[] = [
  {
    kind: 'p',
    text: 'Training gets cheaper when the forward GEMMs of a step run on int8 tensor cores and the gradients stay in bf16. On one RTX 4090 the int8 tensor cores ran 2.9x to 3.5x faster than bf16 on the five GEMM shapes of our training run. If forward GEMMs take a quarter to a third of a step, a run costs 16% to 24% less: $16 to $24 of every $100. No custom CUDA backend is needed for that, because PyTorch already reaches those cores through torch._int_mm. One number in that chain is still a guess: f, the share of step time spent in forward GEMMs. Nobody has measured it.',
  },
  {
    kind: 'p',
    text: 'All of this now lives in one place: t27t, the t27 trainer. Its law is a t27 spec, specs/t27t/t27t.t27 in gHashTag/t27. It holds the bench times, every ratio recomputed from them, the saving formula, the rule that picks a GEMM path, and the list of what nobody measured. Its runner is the PyTorch trainer gHashTag/igla-coder-gpu, which stays in Python; t27t says what the runner must do.',
  },
  {
    kind: 'figure',
    svg: FIG_SPEED_EN,
    caption: 'Speed over bf16 for each of the five training shapes (M x N x K). Yellow: int8 on tensor cores, 2.90x to 3.54x, under the 4x of the datasheet. Red: int8 dp4a on ordinary CUDA cores, 0.91x to 0.94x, slower than bf16 on every shape. Source: gHashTag/t27#10360, one RTX 4090, 2026-10-18.',
  },
  { kind: 'h', text: 'The bench' },
  {
    kind: 'table',
    head: ['Shape, M x N x K', 'bf16, ms', 'int8 TC, ms', 'int8 TC vs bf16', 'dp4a, ms', 'dp4a vs bf16'],
    rows: [
      ['4096 x 3456 x 1280 (FFN up)', '0.2254', '0.0770', '2.93x', '0.2406', '0.94x'],
      ['4096 x 1280 x 3456 (FFN down)', '0.2239', '0.0773', '2.90x', '0.2470', '0.91x'],
      ['16384 x 3456 x 1280', '0.8540', '0.2701', '3.16x', '0.9234', '0.92x'],
      ['16384 x 1280 x 3456', '0.8506', '0.2399', '3.54x', '0.9278', '0.92x'],
      ['16384 x 1280 x 1280 (attn proj)', '0.3215', '0.1007', '3.19x', '0.3460', '0.93x'],
    ],
  },
  {
    kind: 'p',
    text: 'The spec recomputes every ratio from the two times beside it. The times have four printed digits, so the tests allow one hundredth of slack, and they need it once: 0.8506 / 0.2399 = 3.5456, printed as 3.54. The int8 times are the best CUTLASS 3.5.1 s8 kernel. They stand in for torch._int_mm, which was not timed itself.',
  },
  { kind: 'h', text: 'The law: f x (1 - 1/s)' },
  {
    kind: 'p',
    text: 'Only the forward GEMMs get faster. The backward pass keeps its gradients in bf16, and the optimizer, the data loader and everything else do not change. So if f is the share of a step spent in forward GEMMs and s is how much faster int8 makes them, the step loses f x (1 - 1/s) of its time. Even an infinitely fast int8 kernel cannot save more than f.',
  },
  {
    kind: 'figure',
    svg: FIG_STEP_EN,
    caption: 'One step at f = 1/3 and s = 3.2x. The forward GEMMs shrink from a third of the step to about a tenth; the rest of the step stays as it was.',
  },
  {
    kind: 'table',
    head: ['f, share of step time in forward GEMMs', 's = 2.9x', 's = 3.2x', 's = 3.5x'],
    rows: [
      ['1/4', '16.4%, $16 per $100', '17.2%, $17', '17.9%, $18'],
      ['1/3', '21.8%, $22 per $100', '22.9%, $23', '23.8%, $24'],
    ],
  },
  {
    kind: 'figure',
    svg: FIG_LAW_EN,
    caption: 'The saving grows in a straight line with f, and the speed s only sets the slope. The yellow band is where f was assumed to be, not where it was measured. Outside the band the same formula gives 13% at f = 1/5 and 33% to 36% at f = 1/2.',
  },
  {
    kind: 'p',
    text: 'All six cells are T27t.saving_e3 in tenths of a percent, rounded half up. The spec checks them against the cost table #10360 printed, and the widget t27t-savings checks them again in its own tests, together with two what-if rows for f = 1/5 and f = 1/2.',
  },
  { kind: 'h', text: 'Why no custom CUDA backend' },
  {
    kind: 'p',
    text: 'The question behind #10360 was whether t27c needs its own CUDA or PTX backend to make training cheaper. It does not. The speed comes from the int8 tensor cores, and PyTorch reaches them already. The int8 path a backend could add on its own is dp4a on CUDA cores, and dp4a ran slower than plain bf16 on all five shapes. t27t writes this down as a rule, pick_path:',
  },
  {
    kind: 'ul',
    items: [
      'A forward GEMM goes to int8 tensor cores through torch._int_mm.',
      'A backward GEMM stays in bf16, and so does a GPU without int8 tensor cores.',
      'dp4a is never picked; two invariants of the spec say so.',
      'A kernel generated by t27c takes over only if it reaches 1.10x of tuned CUTLASS s8 or better.',
    ],
  },
  { kind: 'h', text: 'What nobody has measured' },
  {
    kind: 'ul',
    items: [
      'f, the share of a real training step spent in forward GEMMs. The 1/4 to 1/3 is an estimate, and the spec says so: F_MEASURED = false.',
      'The cost of quantizing activations from bf16 to int8, and its kernel launch. It comes out of the saving.',
      'torch._int_mm itself, and cuBLAS under it; the bench timed CUTLASS.',
      'A run end to end. The runner gHashTag/igla-coder-gpu does not call torch._int_mm yet: RUNNER_USES_INT_MM = false.',
      'Whether int8 forward GEMMs change the loss curve. The bench measured speed, not quality.',
    ],
  },
  {
    kind: 'p',
    text: 'So 16% to 24% is what the law gives for the assumed f, not a saving anyone has billed. The next step is to time one real step, which gives f, and then to wire torch._int_mm into the runner and compare two runs.',
  },
  { kind: 'h', text: 'The same habit, applied to papers' },
  {
    kind: 'p',
    text: 'The same week, t27 rechecked 45 numbers printed in three papers on number formats against the rules those papers state: GoldenFloat (arXiv:2606.05017), the Golden Ruler catalog (arXiv:2606.09686) and the TNF paper. 34 fit, 8 do not, and 3 cannot be checked. Golden Ruler says 12 clusters where its catalog has 13, and seven TNF numbers miss, four of them because two tables do not follow the rule Section 10 adopts. The method is the one used here: write the rule as a spec, recompute the printed number, and print what does not fit. The earlier post has all 45 rows.',
  },
  { kind: 'h', text: 'Run it yourself' },
  {
    kind: 'code',
    text: '# in a gHashTag/t27 checkout, with t27c built\ntri t27t      # the trainer law: 8 tests, 3 invariants\ntri papers    # the 45 paper numbers',
  },
  {
    kind: 'p',
    text: 'The widget at t27.ai/widgets/t27t-savings shows the whole grid, the path from int8 GEMMs to the saving, and the list of unmeasured inputs. Every cell there is recomputed by its spec\'s tests when the page is built.',
  },
]

export const ruBody: Block[] = [
  {
    kind: 'p',
    text: 'Обучение дешевеет, если прямые GEMM шага считать на тензорных ядрах int8, а градиенты оставить в bf16. На одной RTX 4090 тензорные ядра int8 были в 2.9–3.5 раза быстрее bf16 на пяти формах GEMM из нашего обучения. Если прямые GEMM занимают от четверти до трети шага, прогон стоит на 16–24% меньше: $16–24 с каждых $100. Свой CUDA-бэкенд для этого не нужен: PyTorch уже достаёт до этих ядер через torch._int_mm. Одно число в этой цепочке пока догадка: f, доля времени шага на прямые GEMM. Её никто не мерил.',
  },
  {
    kind: 'p',
    text: 'Теперь всё это собрано в одном месте: t27t, тренер t27. Его закон это спецификация t27, specs/t27t/t27t.t27 в gHashTag/t27. В ней времена замеров, каждое отношение, пересчитанное из них, формула экономии, правило выбора пути для GEMM и список того, что никто не мерил. Исполнитель это тренер на PyTorch gHashTag/igla-coder-gpu, он остаётся на Python; t27t говорит, что он должен делать.',
  },
  {
    kind: 'figure',
    svg: FIG_SPEED_RU,
    caption: 'Скорость относительно bf16 для каждой из пяти форм обучения (M x N x K). Жёлтое: int8 на тензорных ядрах, от 2.90x до 3.54x, ниже 4x из паспорта. Красное: int8 dp4a на обычных ядрах CUDA, от 0.91x до 0.94x, медленнее bf16 на каждой форме. Источник: gHashTag/t27#10360, одна RTX 4090, 2026-10-18.',
  },
  { kind: 'h', text: 'Замер' },
  {
    kind: 'table',
    head: ['Форма, M x N x K', 'bf16, мс', 'int8 TC, мс', 'int8 TC к bf16', 'dp4a, мс', 'dp4a к bf16'],
    rows: [
      ['4096 x 3456 x 1280 (FFN вверх)', '0.2254', '0.0770', '2.93x', '0.2406', '0.94x'],
      ['4096 x 1280 x 3456 (FFN вниз)', '0.2239', '0.0773', '2.90x', '0.2470', '0.91x'],
      ['16384 x 3456 x 1280', '0.8540', '0.2701', '3.16x', '0.9234', '0.92x'],
      ['16384 x 1280 x 3456', '0.8506', '0.2399', '3.54x', '0.9278', '0.92x'],
      ['16384 x 1280 x 1280 (проекция внимания)', '0.3215', '0.1007', '3.19x', '0.3460', '0.93x'],
    ],
  },
  {
    kind: 'p',
    text: 'Спецификация пересчитывает каждое отношение из двух времён рядом с ним. У времён четыре напечатанные цифры, поэтому тесты допускают одну сотую, и один раз она нужна: 0.8506 / 0.2399 = 3.5456, напечатано 3.54. Времена int8 это лучшее ядро CUTLASS 3.5.1 s8. Они стоят вместо torch._int_mm, который сам не замерялся.',
  },
  { kind: 'h', text: 'Закон: f x (1 - 1/s)' },
  {
    kind: 'p',
    text: 'Быстрее становятся только прямые GEMM. Обратный проход держит градиенты в bf16, а оптимизатор, загрузка данных и всё остальное не меняются. Поэтому если f это доля шага на прямые GEMM, а s это во сколько раз int8 их ускоряет, шаг теряет f x (1 - 1/s) своего времени. Даже бесконечно быстрое ядро int8 не сэкономит больше f.',
  },
  {
    kind: 'figure',
    svg: FIG_STEP_RU,
    caption: 'Один шаг при f = 1/3 и s = 3.2x. Прямые GEMM сжимаются с трети шага примерно до десятой; остальная часть шага остаётся как была.',
  },
  {
    kind: 'table',
    head: ['f, доля времени шага на прямые GEMM', 's = 2.9x', 's = 3.2x', 's = 3.5x'],
    rows: [
      ['1/4', '16.4%, $16 со $100', '17.2%, $17', '17.9%, $18'],
      ['1/3', '21.8%, $22 со $100', '22.9%, $23', '23.8%, $24'],
    ],
  },
  {
    kind: 'figure',
    svg: FIG_LAW_RU,
    caption: 'Экономия растёт по прямой вместе с f, а скорость s задаёт только наклон. Жёлтая полоса показывает, где f предположили, а не где её измерили. Вне полосы та же формула даёт 13% при f = 1/5 и 33–36% при f = 1/2.',
  },
  {
    kind: 'p',
    text: 'Все шесть клеток это T27t.saving_e3 в десятых долях процента с округлением половины вверх. Спецификация сверяет их с таблицей стоимости, напечатанной в #10360, а виджет t27t-savings сверяет ещё раз в своих тестах, вместе с двумя строками «а что если» для f = 1/5 и f = 1/2.',
  },
  { kind: 'h', text: 'Почему не нужен свой CUDA-бэкенд' },
  {
    kind: 'p',
    text: 'Вопрос #10360 был такой: нужен ли t27c свой бэкенд CUDA или PTX, чтобы обучение подешевело. Не нужен. Скорость дают тензорные ядра int8, и PyTorch до них уже достаёт. Путь int8, который бэкенд мог бы добавить сам, это dp4a на ядрах CUDA, а dp4a оказался медленнее обычного bf16 на всех пяти формах. t27t записывает это правилом pick_path:',
  },
  {
    kind: 'ul',
    items: [
      'Прямой GEMM идёт на тензорные ядра int8 через torch._int_mm.',
      'Обратный GEMM остаётся в bf16, как и на GPU без тензорных ядер int8.',
      'dp4a не выбирается никогда; это говорят два инварианта спецификации.',
      'Ядро, сгенерированное t27c, берёт работу на себя, только если оно достигает 1.10x от настроенного CUTLASS s8 или лучше.',
    ],
  },
  { kind: 'h', text: 'Чего никто не мерил' },
  {
    kind: 'ul',
    items: [
      'f, долю настоящего шага обучения на прямые GEMM. 1/4–1/3 это оценка, и спецификация так и пишет: F_MEASURED = false.',
      'Цену квантования активаций из bf16 в int8 и запуска его ядра. Она вычитается из экономии.',
      'Сам torch._int_mm и cuBLAS под ним; в замере был CUTLASS.',
      'Прогон целиком. Исполнитель gHashTag/igla-coder-gpu пока не вызывает torch._int_mm: RUNNER_USES_INT_MM = false.',
      'Меняют ли прямые GEMM в int8 кривую потерь. Замер мерил скорость, а не качество.',
    ],
  },
  {
    kind: 'p',
    text: 'Так что 16–24% это то, что закон даёт при предположенном f, а не экономия, которую кто-то увидел в счёте. Следующий шаг: замерить один настоящий шаг, это даст f, затем подключить torch._int_mm в исполнитель и сравнить два прогона.',
  },
  { kind: 'h', text: 'Та же привычка, применённая к статьям' },
  {
    kind: 'p',
    text: 'На той же неделе t27 перепроверил 45 чисел, напечатанных в трёх статьях о числовых форматах, по правилам, которые формулируют сами статьи: GoldenFloat (arXiv:2606.05017), каталог Golden Ruler (arXiv:2606.09686) и статья TNF. 34 подходят, 8 нет, 3 проверить нельзя. Golden Ruler пишет о 12 кластерах, а в каталоге их 13; семь чисел TNF не сходятся, четыре из них потому, что две таблицы не следуют правилу, принятому в разделе 10. Метод тот же, что здесь: записать правило спецификацией, пересчитать напечатанное число и назвать то, что не сходится. Все 45 строк в предыдущем посте.',
  },
  { kind: 'h', text: 'Запустить самому' },
  {
    kind: 'code',
    text: '# в checkout gHashTag/t27, с собранным t27c\ntri t27t      # закон тренера: 8 тестов, 3 инварианта\ntri papers    # 45 чисел из статей',
  },
  {
    kind: 'p',
    text: 'Виджет t27.ai/widgets/t27t-savings показывает всю сетку, путь от GEMM в int8 до экономии и список неизмеренных входов. Каждую клетку там пересчитывают тесты его спецификации, когда страница собирается.',
  },
]
