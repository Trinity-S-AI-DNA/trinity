import type { Block } from '../types'

// Every number here is one row of gHashTag/t27 specs/numeric/paper_claims.t27 (gHashTag/t27#10392,
// PR #10401), as returned by the t27 MCP tool t27_paper_claims (gHashTag/t27-mcp#23) on the Railway
// lab, t27c 0.5.2: 45 rows, 34 fit, 8 do not, 3 not checkable; test-report 10 of 10, 0 vacuous.
// The figures are static SVG strings: no drawing code.

const FIG_VERDICTS_EN =
  '<svg viewBox="0 0 720 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Verdicts per paper. GoldenFloat: 9 fit, 0 do not, 1 not checkable. Golden Ruler: 8, 1, 1. TNF: 15, 7, 1. t27 repo tables: 2, 0, 0." style="width:100%;height:auto;font-family:inherit">' +
  '<rect x="160" y="10" width="14" height="14" fill="#ffd700"/><text x="180" y="22" font-size="13" fill="currentColor">fits</text>' +
  '<rect x="236" y="10" width="14" height="14" fill="#ff5c5c"/><text x="256" y="22" font-size="13" fill="currentColor">does not fit</text>' +
  '<rect x="360" y="10" width="14" height="14" fill="currentColor" fill-opacity="0.35"/><text x="380" y="22" font-size="13" fill="currentColor">not checkable</text>' +
  '<text x="10" y="70" font-size="14" fill="currentColor">GoldenFloat</text>' +
  '<rect x="160" y="50" width="162" height="28" fill="#ffd700"/><rect x="322" y="50" width="18" height="28" fill="currentColor" fill-opacity="0.35"/>' +
  '<text x="352" y="70" font-size="13" fill="currentColor" fill-opacity="0.8">9 / 0 / 1</text>' +
  '<text x="10" y="120" font-size="14" fill="currentColor">Golden Ruler</text>' +
  '<rect x="160" y="100" width="144" height="28" fill="#ffd700"/><rect x="304" y="100" width="18" height="28" fill="#ff5c5c"/><rect x="322" y="100" width="18" height="28" fill="currentColor" fill-opacity="0.35"/>' +
  '<text x="352" y="120" font-size="13" fill="currentColor" fill-opacity="0.8">8 / 1 / 1</text>' +
  '<text x="10" y="170" font-size="14" fill="currentColor">TNF</text>' +
  '<rect x="160" y="150" width="270" height="28" fill="#ffd700"/><rect x="430" y="150" width="126" height="28" fill="#ff5c5c"/><rect x="556" y="150" width="18" height="28" fill="currentColor" fill-opacity="0.35"/>' +
  '<text x="586" y="170" font-size="13" fill="currentColor" fill-opacity="0.8">15 / 7 / 1</text>' +
  '<text x="10" y="220" font-size="14" fill="currentColor">t27 repo</text>' +
  '<rect x="160" y="200" width="36" height="28" fill="#ffd700"/>' +
  '<text x="208" y="220" font-size="13" fill="currentColor" fill-opacity="0.8">2 / 0 / 0</text>' +
  '<text x="10" y="246" font-size="12" fill="currentColor" fill-opacity="0.65">45 claims: 34 fit, 8 do not, 3 cannot be checked. One square is one claim.</text>' +
  '</svg>'

const FIG_VERDICTS_RU =
  '<svg viewBox="0 0 720 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Вердикты по статьям. GoldenFloat: 9 подходят, 0 нет, 1 не проверить. Golden Ruler: 8, 1, 1. TNF: 15, 7, 1. Таблицы репозитория t27: 2, 0, 0." style="width:100%;height:auto;font-family:inherit">' +
  '<rect x="160" y="10" width="14" height="14" fill="#ffd700"/><text x="180" y="22" font-size="13" fill="currentColor">подходит</text>' +
  '<rect x="262" y="10" width="14" height="14" fill="#ff5c5c"/><text x="282" y="22" font-size="13" fill="currentColor">не подходит</text>' +
  '<rect x="386" y="10" width="14" height="14" fill="currentColor" fill-opacity="0.35"/><text x="406" y="22" font-size="13" fill="currentColor">не проверить</text>' +
  '<text x="10" y="70" font-size="14" fill="currentColor">GoldenFloat</text>' +
  '<rect x="160" y="50" width="162" height="28" fill="#ffd700"/><rect x="322" y="50" width="18" height="28" fill="currentColor" fill-opacity="0.35"/>' +
  '<text x="352" y="70" font-size="13" fill="currentColor" fill-opacity="0.8">9 / 0 / 1</text>' +
  '<text x="10" y="120" font-size="14" fill="currentColor">Golden Ruler</text>' +
  '<rect x="160" y="100" width="144" height="28" fill="#ffd700"/><rect x="304" y="100" width="18" height="28" fill="#ff5c5c"/><rect x="322" y="100" width="18" height="28" fill="currentColor" fill-opacity="0.35"/>' +
  '<text x="352" y="120" font-size="13" fill="currentColor" fill-opacity="0.8">8 / 1 / 1</text>' +
  '<text x="10" y="170" font-size="14" fill="currentColor">TNF</text>' +
  '<rect x="160" y="150" width="270" height="28" fill="#ffd700"/><rect x="430" y="150" width="126" height="28" fill="#ff5c5c"/><rect x="556" y="150" width="18" height="28" fill="currentColor" fill-opacity="0.35"/>' +
  '<text x="586" y="170" font-size="13" fill="currentColor" fill-opacity="0.8">15 / 7 / 1</text>' +
  '<text x="10" y="220" font-size="14" fill="currentColor">репозиторий t27</text>' +
  '<rect x="160" y="200" width="36" height="28" fill="#ffd700"/>' +
  '<text x="208" y="220" font-size="13" fill="currentColor" fill-opacity="0.8">2 / 0 / 0</text>' +
  '<text x="10" y="246" font-size="12" fill="currentColor" fill-opacity="0.65">45 утверждений: 34 подходят, 8 нет, 3 не проверить. Один квадрат — одно утверждение.</text>' +
  '</svg>'

const FIG_FLOW_EN =
  '<svg viewBox="0 0 720 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="How a number is checked: the number as printed, then the rule the paper states, then exact u64 arithmetic in paper_claims.t27, then a verdict: fits, does not fit, or not checkable." style="width:100%;height:auto;font-family:inherit">' +
  '<rect x="10" y="18" width="156" height="60" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.6"/><text x="88" y="44" font-size="13" text-anchor="middle" fill="currentColor">the number</text><text x="88" y="62" font-size="13" text-anchor="middle" fill="currentColor">as printed</text>' +
  '<text x="183" y="53" font-size="16" text-anchor="middle" fill="currentColor">→</text>' +
  '<rect x="200" y="18" width="156" height="60" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.6"/><text x="278" y="44" font-size="13" text-anchor="middle" fill="currentColor">the rule</text><text x="278" y="62" font-size="13" text-anchor="middle" fill="currentColor">the paper states</text>' +
  '<text x="373" y="53" font-size="16" text-anchor="middle" fill="currentColor">→</text>' +
  '<rect x="390" y="18" width="156" height="60" rx="10" fill="none" stroke="#ffd700" stroke-width="2"/><text x="468" y="44" font-size="13" text-anchor="middle" fill="currentColor">exact u64 arithmetic</text><text x="468" y="62" font-size="13" text-anchor="middle" fill="currentColor">in paper_claims.t27</text>' +
  '<text x="563" y="53" font-size="16" text-anchor="middle" fill="currentColor">→</text>' +
  '<rect x="580" y="18" width="130" height="60" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.6"/><text x="645" y="44" font-size="13" text-anchor="middle" fill="currentColor">fits, does not fit,</text><text x="645" y="62" font-size="13" text-anchor="middle" fill="currentColor">or not checkable</text>' +
  '</svg>'

const FIG_FLOW_RU =
  '<svg viewBox="0 0 720 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Как проверяется число: число, как напечатано, затем правило из самой статьи, затем точная арифметика u64 в paper_claims.t27, затем вердикт: подходит, не подходит или не проверить." style="width:100%;height:auto;font-family:inherit">' +
  '<rect x="10" y="18" width="156" height="60" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.6"/><text x="88" y="44" font-size="13" text-anchor="middle" fill="currentColor">число,</text><text x="88" y="62" font-size="13" text-anchor="middle" fill="currentColor">как напечатано</text>' +
  '<text x="183" y="53" font-size="16" text-anchor="middle" fill="currentColor">→</text>' +
  '<rect x="200" y="18" width="156" height="60" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.6"/><text x="278" y="44" font-size="13" text-anchor="middle" fill="currentColor">правило</text><text x="278" y="62" font-size="13" text-anchor="middle" fill="currentColor">из самой статьи</text>' +
  '<text x="373" y="53" font-size="16" text-anchor="middle" fill="currentColor">→</text>' +
  '<rect x="390" y="18" width="156" height="60" rx="10" fill="none" stroke="#ffd700" stroke-width="2"/><text x="468" y="44" font-size="13" text-anchor="middle" fill="currentColor">точная арифметика u64</text><text x="468" y="62" font-size="13" text-anchor="middle" fill="currentColor">в paper_claims.t27</text>' +
  '<text x="563" y="53" font-size="16" text-anchor="middle" fill="currentColor">→</text>' +
  '<rect x="580" y="18" width="130" height="60" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.6"/><text x="645" y="44" font-size="13" text-anchor="middle" fill="currentColor">подходит, нет</text><text x="645" y="62" font-size="13" text-anchor="middle" fill="currentColor">или не проверить</text>' +
  '</svg>'

export const body: Block[] = [
  {
    kind: 'p',
    text: 'Three papers describe number formats that t27 implements: GoldenFloat (arXiv:2606.05017), the Golden Ruler catalog (arXiv:2606.09686), and the TNF paper on formats with a ternary exponent. We took every number in them that follows from a rule the paper itself states and put it into one t27 spec, **specs/numeric/paper_claims.t27**. The spec recomputes each number with exact 64-bit integer arithmetic and gives a verdict. Of 45 claims, **34 fit, 8 do not, and 3 cannot be checked**.',
  },
  {
    kind: 'figure',
    svg: FIG_VERDICTS_EN,
    caption: 'One row per paper, one square per claim. The two t27 repo rows are sums over the repository\'s own format tables, which the TNF paper compares itself against. Source: t27_paper_claims, called once with no filter on the Railway lab, t27c 0.5.2.',
  },
  { kind: 'h', text: 'How a number is checked' },
  {
    kind: 'p',
    text: 'The spec uses no floating point at all. Square roots are integer square roots; ln 2, ln 3 and phi are series sums at scale 10^12; a value printed to three or four digits is rounded half to even at that digit before it is compared. A claim fits only if the recomputed value equals the printed one at the printed precision. If the paper gives no rule for a number (an FPGA run, a cross-check against another library, counts with no stated method), the claim is **not checkable**, and that never counts as fitting.',
  },
  {
    kind: 'figure',
    svg: FIG_FLOW_EN,
    caption: 'The four steps of every row. Only the third runs code, and that code is the t27 spec.',
  },
  { kind: 'h', text: 'Per paper' },
  {
    kind: 'table',
    head: ['Paper', 'Claims', 'Fit', 'Do not fit', 'Not checkable'],
    rows: [
      ['GoldenFloat, arXiv:2606.05017v5', '10', '9', '0', '1'],
      ['Golden Ruler, arXiv:2606.09686v3', '10', '8', '1', '1'],
      ['TNF paper, 2026-08-11', '23', '15', '7', '1'],
      ['t27 repo format tables', '2', '2', '0', '0'],
      ['All', '45', '34', '8', '3'],
    ],
  },
  {
    kind: 'p',
    text: '**GoldenFloat.** All nine numbers that can be checked fit: the exponent and mantissa split e = round((N-1)/phi^2) at all 17 widths, the printed (N-1)/phi^2 = 5.7295 for GF16, e = 391 for GF1024, the GF16 code 0x47C0 decoding to 30, and the look-elsewhere p = 83 / 80000 = 1.04e-3. The Lucas identity phi^(2n) + phi^(-2n) = L_(2n) is checked for n = 1 to 45, where u64 runs out; the paper checks it up to 256 at 500 digits. The 35 of 35 testbench vectors are a hardware result and cannot be recomputed here. The clock frequency the abstract prints beside them was withdrawn by t27 itself on 2026-08-18 (RESEARCH_CLAIMS.md): it is the toggle rate of a ring oscillator, not a path through GF16 arithmetic, and the paper still carries it.',
  },
  {
    kind: 'p',
    text: '**Golden Ruler.** The five encodings of 3.0 fit: BF16 0x4040, FP8 E4M3 0x44, FP8 E5M2 0x42, the MXFP4 element E2M1 0x5, and GF16 0x4100. So does "no E8M0 code", because E8M0 holds only powers of two, and so does the count of 109 formats. The abstract says the 109 formats span 12 clusters; the catalog has 13.',
  },
  {
    kind: 'p',
    text: '**TNF.** 15 of the 22 checkable numbers fit, among them the error constants (1/2) ln 2 = 0.3466 and 1/(4 ln 2) = 0.3607, the radix economy gaps 0.46% and 6.15%, 1 - log3 2 = 0.3691, the 81 exponent steps of four trits, and every row of Tables 10, 11 and 22. The seven that do not fit are below.',
  },
  { kind: 'h', text: 'The eight that do not fit' },
  {
    kind: 'table',
    head: ['Paper', 'Where', 'Claim', 'Printed', 'Recomputed'],
    rows: [
      ['Golden Ruler', 'Abstract', 'the 109 formats span this many clusters', '12', '13'],
      ['TNF', 'Table 1 vs Sec. 10', 'rungs whose M equals the adopted M = N - 1 - Et', '8 of 8', '2 of 8'],
      ['TNF', 'Eq. (1)', 'mantissa bits of TNF16, where 1 + 4 + M = 16', '9', '11'],
      ['TNF', 'Cor. 18', 'kappa(3)/kappa(2), kappa(r) = (r-1)^2 / (r ln r)', '1.683', '1.682'],
      ['TNF', 'Table 24', 'rungs where GF-T follows Et = round((N-1)/phi^2)', '9 of 9', '1 of 9'],
      ['TNF', 'Table 24', 'rungs where GF-T and TNF give the same layout', '8 of 9', '1 of 9'],
      ['TNF', 'Table 24 vs Sec. 10', 'rungs of the TNF column with 1 + Et + M = N', '9 of 9', '3 of 9'],
      ['TNF', 'Table 23', 'exponent bits of BNF8 (the repo bnf8.t27 has E = 5, M = 2)', '3', '5'],
    ],
  },
  {
    kind: 'p',
    text: 'The kappa ratio is 8 ln 2 / (3 ln 3) = 1.68248, so 1.682 to three places; the paper prints 1.683 in one place and 1.68 in another, and the 1.68 fits. Four of the TNF misfits have the same shape: Section 10 adopts the rule M = N - 1 - Et for every rung, and Tables 1 and 24 do not follow it. Table 11, which carries the reconciled column, does: all nine of its rows fit and match the repository\'s tnf*.t27.',
  },
  { kind: 'h', text: 'Run it yourself' },
  {
    kind: 'code',
    text: '# in a gHashTag/t27 checkout, with t27c built\ntri papers\n\n# or from any MCP client connected to t27-mcp\nt27_paper_claims {"paper": "tnf", "verdict": "misfit"}',
  },
  {
    kind: 'p',
    text: 'tri papers runs the spec\'s test report: 10 tests, none vacuous. The MCP tool runs the same spec compiled to WebAssembly and can filter by paper and verdict. The widget at t27.ai/widgets/paper-claims shows all 45 rows, with the claim text for each, and is offered in the first lesson of the GoldenFloat course.',
  },
  {
    kind: 'p',
    text: 'What this does not do: it does not judge the papers\' arguments, only the numbers a stated rule can reproduce. No paper has been revised yet. The three unchecked claims need their inputs published before anyone can check them: the testbench log, the ml_dtypes run, and how the Table 23 magnitudes were counted.',
  },
]

export const ruBody: Block[] = [
  {
    kind: 'p',
    text: 'Три статьи описывают числовые форматы, которые реализует t27: GoldenFloat (arXiv:2606.05017), каталог Golden Ruler (arXiv:2606.09686) и статья TNF о форматах с троичной экспонентой. Мы взяли из них каждое число, которое следует из правила, сформулированного в самой статье, и собрали все такие числа в одну спецификацию t27 — **specs/numeric/paper_claims.t27**. Она пересчитывает каждое число в точной 64-битной целочисленной арифметике и выносит вердикт. Из 45 утверждений **34 подходят, 8 не подходят, 3 проверить нельзя**.',
  },
  {
    kind: 'figure',
    svg: FIG_VERDICTS_RU,
    caption: 'Строка — статья, квадрат — утверждение. Две строки репозитория t27 — суммы по собственным таблицам форматов, с которыми сравнивает себя статья TNF. Источник: t27_paper_claims, один вызов без фильтра на лаборатории Railway, t27c 0.5.2.',
  },
  { kind: 'h', text: 'Как проверяется число' },
  {
    kind: 'p',
    text: 'Плавающей точки в спецификации нет вовсе. Квадратные корни — целочисленные; ln 2, ln 3 и phi — суммы рядов в масштабе 10^12; значение, напечатанное с тремя или четырьмя знаками, перед сравнением округляется до этого знака, половина — к чётному. Утверждение подходит, только если пересчёт совпадает с напечатанным при напечатанной точности. Если статья не даёт правила для числа (прогон на FPGA, сверка с другой библиотекой, подсчёты без описанного метода), утверждение **не проверить**, и это никогда не засчитывается как совпадение.',
  },
  {
    kind: 'figure',
    svg: FIG_FLOW_RU,
    caption: 'Четыре шага каждой строки. Код выполняет только третий, и этот код — спецификация t27.',
  },
  { kind: 'h', text: 'По статьям' },
  {
    kind: 'table',
    head: ['Статья', 'Утверждений', 'Подходят', 'Не подходят', 'Не проверить'],
    rows: [
      ['GoldenFloat, arXiv:2606.05017v5', '10', '9', '0', '1'],
      ['Golden Ruler, arXiv:2606.09686v3', '10', '8', '1', '1'],
      ['Статья TNF, 2026-08-11', '23', '15', '7', '1'],
      ['Таблицы форматов репозитория t27', '2', '2', '0', '0'],
      ['Всего', '45', '34', '8', '3'],
    ],
  },
  {
    kind: 'p',
    text: '**GoldenFloat.** Подходят все девять проверяемых чисел: разбиение на экспоненту и мантиссу e = round((N-1)/phi^2) на всех 17 ширинах, напечатанное (N-1)/phi^2 = 5.7295 для GF16, e = 391 для GF1024, код GF16 0x47C0, который декодируется в 30, и поправка на множественные сравнения p = 83 / 80000 = 1.04e-3. Тождество Люка phi^(2n) + phi^(-2n) = L_(2n) проверено для n от 1 до 45 — дальше u64 не хватает; статья проверяет его до 256 с точностью 500 знаков. 35 из 35 тестовых векторов — аппаратный результат, пересчитать его здесь нельзя. Тактовую частоту, которую аннотация печатает рядом с ними, сам t27 отозвал 2026-08-18 (RESEARCH_CLAIMS.md): это частота переключения кольцевого генератора, а не путь через арифметику GF16, и в статье она всё ещё стоит.',
  },
  {
    kind: 'p',
    text: '**Golden Ruler.** Подходят все пять кодировок 3.0: BF16 0x4040, FP8 E4M3 0x44, FP8 E5M2 0x42, элемент MXFP4 E2M1 0x5 и GF16 0x4100. Подходит и «кода в E8M0 нет» — E8M0 хранит только степени двойки, — и число форматов, 109. В аннотации сказано, что 109 форматов делятся на 12 кластеров; в каталоге их 13.',
  },
  {
    kind: 'p',
    text: '**TNF.** Подходят 15 из 22 проверяемых чисел, среди них константы ошибки (1/2) ln 2 = 0.3466 и 1/(4 ln 2) = 0.3607, отставание по экономичности системы счисления 0.46% и 6.15%, 1 - log3 2 = 0.3691, 81 шаг экспоненты из четырёх тритов и каждая строка таблиц 10, 11 и 22. Семь неподходящих — ниже.',
  },
  { kind: 'h', text: 'Восемь, которые не подходят' },
  {
    kind: 'table',
    head: ['Статья', 'Где', 'Утверждение', 'Напечатано', 'Пересчитано'],
    rows: [
      ['Golden Ruler', 'Аннотация', 'число кластеров, на которые делятся 109 форматов', '12', '13'],
      ['TNF', 'Табл. 1 против разд. 10', 'ступени, где M равно принятому M = N - 1 - Et', '8 из 8', '2 из 8'],
      ['TNF', 'Ур. (1)', 'бит мантиссы у TNF16, где 1 + 4 + M = 16', '9', '11'],
      ['TNF', 'След. 18', 'kappa(3)/kappa(2), kappa(r) = (r-1)^2 / (r ln r)', '1.683', '1.682'],
      ['TNF', 'Табл. 24', 'ступени, где GF-T следует Et = round((N-1)/phi^2)', '9 из 9', '1 из 9'],
      ['TNF', 'Табл. 24', 'ступени, где у GF-T и TNF одинаковая раскладка', '8 из 9', '1 из 9'],
      ['TNF', 'Табл. 24 против разд. 10', 'ступени столбца TNF с 1 + Et + M = N', '9 из 9', '3 из 9'],
      ['TNF', 'Табл. 23', 'бит экспоненты у BNF8 (в репозитории bnf8.t27: E = 5, M = 2)', '3', '5'],
    ],
  },
  {
    kind: 'p',
    text: 'Отношение kappa равно 8 ln 2 / (3 ln 3) = 1.68248, то есть 1.682 с тремя знаками; статья печатает 1.683 в одном месте и 1.68 в другом, и 1.68 подходит. Четыре несовпадения в TNF устроены одинаково: раздел 10 принимает правило M = N - 1 - Et для каждой ступени, а таблицы 1 и 24 ему не следуют. Таблица 11 со сверенным столбцом следует: все девять её строк подходят и совпадают с tnf*.t27 из репозитория.',
  },
  { kind: 'h', text: 'Проверьте сами' },
  {
    kind: 'code',
    text: '# in a gHashTag/t27 checkout, with t27c built\ntri papers\n\n# or from any MCP client connected to t27-mcp\nt27_paper_claims {"paper": "tnf", "verdict": "misfit"}',
  },
  {
    kind: 'p',
    text: 'tri papers запускает отчёт по тестам спецификации: 10 тестов, ни одного пустого. Инструмент MCP выполняет ту же спецификацию, скомпилированную в WebAssembly, и фильтрует по статье и вердикту. Виджет t27.ai/widgets/paper-claims показывает все 45 строк с текстом каждого утверждения; он предложен в первом уроке курса GoldenFloat.',
  },
  {
    kind: 'p',
    text: 'Чего здесь нет: оценки аргументов статей — только числа, которые воспроизводит сформулированное правило. Ни одна статья пока не исправлена. Для трёх непроверенных утверждений нужно сначала опубликовать исходные данные: журнал тестового стенда, прогон ml_dtypes и способ, которым считались величины в таблице 23.',
  },
]
