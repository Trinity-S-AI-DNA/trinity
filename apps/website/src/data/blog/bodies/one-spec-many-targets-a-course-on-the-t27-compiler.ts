import type { Block } from '../types'

// Course 12, t27-compiler: 27 widgets, each running the fn bodies of a gHashTag/t27 specs/compiler, specs/verified,
// specs/t27mcp or specs/isa spec compiled to wasm (999 scripts/t27-logic.mjs, then scripts/widget-logic.mjs). The two
// figures were drawn from compiled logic: mispredicts of reproducible.t27 (the cmp-builds widget) and cells_with of
// sieve.t27 (the cmp-sieve widget).

export const body: Block[] = [
  {
    "kind": "p",
    "text": "Course 12 of t27.ai is out: One spec, many targets, the t27 compiler. A .t27 file is a spec with tests, and the compiler t27c turns it into Zig, Rust, C, Verilog and more. gHashTag/t27 writes the rules of that pipeline, and the ways it has failed, as specs with numeric tests. The course has 27 lessons in 9 modules, each opening with a question, and each widget answers it with the fn bodies of one of 18 of those specs compiled to WebAssembly."
  },
  {
    "kind": "h",
    "text": "Nine steps, twenty-seven widgets"
  },
  {
    "kind": "p",
    "text": "The pipeline in pipeline.t27 has 6 stages: Lex, Parse, TypeCheck, Optimize, Codegen and Link. The 9 modules of the course are its own division of the road, not those 6 stages."
  },
  {
    "kind": "table",
    "head": [
      "Module",
      "Widgets",
      "Specs"
    ],
    "rows": [
      [
        "Reading the text",
        "cmp-chars, cmp-scan, cmp-number",
        "compiler/lexer, isa/t27a"
      ],
      [
        "Shape and refusals",
        "cmp-prec, cmp-operand, cmp-errors",
        "compiler/parser, compiler/operator_text, isa/t27a"
      ],
      [
        "Names, types and branches",
        "cmp-int-types, cmp-tuple, cmp-branches",
        "compiler/int_type_names, compiler/verilog_names, compiler/verilog_branch_context"
      ],
      [
        "The cost estimate",
        "cmp-delay, cmp-power, cmp-route",
        "compiler/hir_cost_models"
      ],
      [
        "The same answer from every backend",
        "cmp-parens, cmp-stale, cmp-slices",
        "compiler/codegen_conformance"
      ],
      [
        "The output file",
        "cmp-overwrite, cmp-marker, cmp-gen-files",
        "compiler/compile_output, verified/gen_file_check"
      ],
      [
        "Seals",
        "cmp-seal-parts, cmp-seal-verdict, cmp-seal-cut",
        "verified/seal_check, t27mcp/seal_verdict, verified/seal_write"
      ],
      [
        "Trusting the compiler",
        "cmp-sieve, cmp-builds, cmp-ddc",
        "compiler/theory/sieve, compiler/theory/reproducible, compiler/theory/toolchain"
      ],
      [
        "Down to the machine",
        "cmp-assemble, cmp-fields, cmp-container",
        "isa/t27a, isa/tri27_bytecode"
      ]
    ]
  },
  {
    "kind": "p",
    "text": "The pictures are rules in motion: bytes that light up as letters, digits and gaps, eleven levels of precedence in a grid, a clock curve that falls as LUTs pile up, a 32-bit word whose fields are found by flipping each bit and asking the decoder, and a table of nine compilers where unknown is not no."
  },
  {
    "kind": "h",
    "text": "Seven builds, four binaries"
  },
  {
    "kind": "p",
    "text": "reproducible.t27 records seven builds of one commit on 2026-10-09: t27c came out as four different binaries and t27b as one, and 17 of the 21 pairs of t27c builds differ. The figure runs its compiled mispredicts over five models of the cause. A model explains the builds only when it gets no pair wrong, and one model does for each binary: the git hash length baked into the binary together with the cache path for t27c, and no cause at all for t27b."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 720 330' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='Pairs of builds each cause model gets wrong, out of 21. For t27c, where 17 pairs differ: 0, 3, 11, 7, 17 for the five models in order, and only the git hash length with the cache path gets 0. For t27b, where 0 pairs differ: 17, 14, 6, 10, 0, and only no cause at all gets 0' style='width:100%;height:auto;font-family:inherit'><text x='8' y='26' fill='currentColor' font-size='13' font-weight='700'>t27c: 17 / 21</text><text x='206' y='47' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>git hash length and cache path</text><rect x='214' y='34' width='3.2' height='18' rx='4' fill='#00b36b'/><text x='223.2' y='47' fill='currentColor' font-size='13'>0</text><text x='206' y='71' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>cache path alone</text><rect x='214' y='58' width='62.3' height='18' rx='4' fill='#7d8f89'/><text x='282.3' y='71' fill='currentColor' font-size='13'>3</text><text x='206' y='95' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>git hash length alone</text><rect x='214' y='82' width='228.4' height='18' rx='4' fill='#7d8f89'/><text x='448.4' y='95' fill='currentColor' font-size='13'>11</text><text x='206' y='119' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>host alone</text><rect x='214' y='106' width='145.3' height='18' rx='4' fill='#7d8f89'/><text x='365.3' y='119' fill='currentColor' font-size='13'>7</text><text x='206' y='143' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>no cause at all</text><rect x='214' y='130' width='353.0' height='18' rx='4' fill='#7d8f89'/><text x='573.0' y='143' fill='currentColor' font-size='13'>17</text><text x='8' y='174' fill='currentColor' font-size='13' font-weight='700'>t27b: 0 / 21</text><text x='206' y='195' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>git hash length and cache path</text><rect x='214' y='182' width='353.0' height='18' rx='4' fill='#7d8f89'/><text x='573.0' y='195' fill='currentColor' font-size='13'>17</text><text x='206' y='219' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>cache path alone</text><rect x='214' y='206' width='290.7' height='18' rx='4' fill='#7d8f89'/><text x='510.7' y='219' fill='currentColor' font-size='13'>14</text><text x='206' y='243' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>git hash length alone</text><rect x='214' y='230' width='124.6' height='18' rx='4' fill='#7d8f89'/><text x='344.6' y='243' fill='currentColor' font-size='13'>6</text><text x='206' y='267' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>host alone</text><rect x='214' y='254' width='207.6' height='18' rx='4' fill='#7d8f89'/><text x='427.6' y='267' fill='currentColor' font-size='13'>10</text><text x='206' y='291' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>no cause at all</text><rect x='214' y='278' width='3.2' height='18' rx='4' fill='#00b36b'/><text x='223.2' y='291' fill='currentColor' font-size='13'>0</text><text x='8' y='318' fill='currentColor' fill-opacity='0.7' font-size='12'>pairs of the 21 builds a model gets wrong; green: none</text></svg>",
    "caption": "mispredicts of reproducible.t27 for five cause models and two binaries, computed by the compiled spec the cmp-builds widget runs."
  },
  {
    "kind": "h",
    "text": "Unknown is not no"
  },
  {
    "kind": "p",
    "text": "sieve.t27 asks ten questions of nine compilers and keeps unknown apart from false. The figure counts each compiler's cells with the compiled cells_with: t27c has 4 false cells and t27b 1, because for those two we are the source. The seven outside compilers have no false cell and 3 to 5 unknown ones, because no opened source states them. Only false removes a compiler, so on the cited evidence the sieve removes only the two compilers we can read from the inside, and the spec says it may not be read as t27 is worse than X."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 720 250' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='Cells of the compiler sieve per compiler, ten each, false in red, unknown in grey, true in green, not applicable in blue. t27c has 4 false cells and t27b 1; the seven outside compilers have none' style='width:100%;height:auto;font-family:inherit'><text x='102' y='27' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>Zig aarch64</text><rect x='110.0' y='14' width='235.0' height='18' fill='#7d8f89'/><text x='225.0' y='27' fill='#020403' font-size='12' font-weight='700'>4</text><rect x='346.0' y='14' width='176.0' height='18' fill='#00b36b'/><text x='431.5' y='27' fill='#020403' font-size='12' font-weight='700'>3</text><rect x='523.0' y='14' width='176.0' height='18' fill='#38bdf8'/><text x='608.5' y='27' fill='#020403' font-size='12' font-weight='700'>3</text><text x='102' y='51' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>Zig x86_64</text><rect x='110.0' y='38' width='235.0' height='18' fill='#7d8f89'/><text x='225.0' y='51' fill='#020403' font-size='12' font-weight='700'>4</text><rect x='346.0' y='38' width='176.0' height='18' fill='#00b36b'/><text x='431.5' y='51' fill='#020403' font-size='12' font-weight='700'>3</text><rect x='523.0' y='38' width='176.0' height='18' fill='#38bdf8'/><text x='608.5' y='51' fill='#020403' font-size='12' font-weight='700'>3</text><text x='102' y='75' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>cg_clif</text><rect x='110.0' y='62' width='235.0' height='18' fill='#7d8f89'/><text x='225.0' y='75' fill='#020403' font-size='12' font-weight='700'>4</text><rect x='346.0' y='62' width='294.0' height='18' fill='#00b36b'/><text x='490.5' y='75' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='641.0' y='62' width='58.0' height='18' fill='#38bdf8'/><text x='667.5' y='75' fill='#020403' font-size='12' font-weight='700'>1</text><text x='102' y='99' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>Go SSA</text><rect x='110.0' y='86' width='294.0' height='18' fill='#7d8f89'/><text x='254.5' y='99' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='405.0' y='86' width='235.0' height='18' fill='#00b36b'/><text x='520.0' y='99' fill='#020403' font-size='12' font-weight='700'>4</text><rect x='641.0' y='86' width='58.0' height='18' fill='#38bdf8'/><text x='667.5' y='99' fill='#020403' font-size='12' font-weight='700'>1</text><text x='102' y='123' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>QBE</text><rect x='110.0' y='110' width='294.0' height='18' fill='#7d8f89'/><text x='254.5' y='123' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='405.0' y='110' width='176.0' height='18' fill='#00b36b'/><text x='490.5' y='123' fill='#020403' font-size='12' font-weight='700'>3</text><rect x='582.0' y='110' width='117.0' height='18' fill='#38bdf8'/><text x='638.0' y='123' fill='#020403' font-size='12' font-weight='700'>2</text><text x='102' y='147' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>CompCert</text><rect x='110.0' y='134' width='176.0' height='18' fill='#7d8f89'/><text x='195.5' y='147' fill='#020403' font-size='12' font-weight='700'>3</text><rect x='287.0' y='134' width='294.0' height='18' fill='#00b36b'/><text x='431.5' y='147' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='582.0' y='134' width='117.0' height='18' fill='#38bdf8'/><text x='638.0' y='147' fill='#020403' font-size='12' font-weight='700'>2</text><text x='102' y='171' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>LLVM</text><rect x='110.0' y='158' width='294.0' height='18' fill='#7d8f89'/><text x='254.5' y='171' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='405.0' y='158' width='294.0' height='18' fill='#00b36b'/><text x='549.5' y='171' fill='#020403' font-size='12' font-weight='700'>5</text><text x='102' y='195' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>t27c</text><rect x='110.0' y='182' width='235.0' height='18' fill='#ff4d6d'/><text x='225.0' y='195' fill='#020403' font-size='12' font-weight='700'>4</text><rect x='346.0' y='182' width='294.0' height='18' fill='#00b36b'/><text x='490.5' y='195' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='641.0' y='182' width='58.0' height='18' fill='#38bdf8'/><text x='667.5' y='195' fill='#020403' font-size='12' font-weight='700'>1</text><text x='102' y='219' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>t27b</text><rect x='110.0' y='206' width='58.0' height='18' fill='#ff4d6d'/><text x='136.5' y='219' fill='#020403' font-size='12' font-weight='700'>1</text><rect x='169.0' y='206' width='412.0' height='18' fill='#00b36b'/><text x='372.5' y='219' fill='#020403' font-size='12' font-weight='700'>7</text><rect x='582.0' y='206' width='117.0' height='18' fill='#38bdf8'/><text x='638.0' y='219' fill='#020403' font-size='12' font-weight='700'>2</text><text x='8' y='238' fill='currentColor' fill-opacity='0.7' font-size='12'>cells of ten per compiler: false, unknown, true, not applicable</text></svg>",
    "caption": "cells_with of sieve.t27 per compiler and value, computed by the compiled spec the cmp-sieve widget runs. Red: false. Grey: unknown. Green: true. Blue: not applicable."
  },
  {
    "kind": "h",
    "text": "How the specs got into the browser"
  },
  {
    "kind": "p",
    "text": "No widget copies a rule. scripts/t27-logic.mjs of 999-multibots-telegraf runs t27c gen on a spec, builds the Zig with Zig 0.16 for wasm32 and writes a module with one function per spec fn, and scripts/widget-logic.mjs puts it beside the widget with a byte-identical copy of the spec. The share of the functions a spec declares that lower runs from 5 of 20 in the lexer, which scans a struct, to 38 of 38 in the t27a assembler. A module also holds the functions of the specs its spec takes in with use, whose files are not vendored beside the widget: t27a.t27 lowers 58 functions, 38 its own and 20 spliced in from isa/ternary_encoding.t27 and isa/t27a_mnemonics.t27, and six other specs splice in from 1 to 7 functions each. Lessons 7 and 8 use fns spliced in from tri/t27b/type_text.t27, tools/t27o/rust_std.t27 and hosting/toolchain.t27. A str crosses the boundary as UTF-8 bytes, which is how the assembler and the tuple check take text. The course needed no new spec for its logic: it uses the 18 and the specs they use."
  },
  {
    "kind": "h",
    "text": "What it does not show"
  },
  {
    "kind": "ul",
    "items": [
      "No lesson runs a whole stage of t27c. The lexer and the parser scan structs, which WebAssembly cannot take, so the widgets run their byte tests and their precedence rule. The typechecker, pipeline and optimizer specs do not compile to Zig today.",
      "The t27a assembler is the exception: it is a small front end of its own, and all 38 functions it declares lower, with 20 more spliced in through use, so lessons 2, 3, 6, 25 and 26 run a real parser, assembler and disassembler.",
      "Lessons 16, 18, 21 and 23 quote lab accounts that the specs record with a date. The seal rules of lessons 18 and 21 are rules the specs state, and whether t27c does them is for the specs and the compiler to say.",
      "The costs of lessons 10 to 12 are the static estimates of the compiler, not a place-and-route report."
    ]
  },
  {
    "kind": "h",
    "text": "Try it"
  },
  {
    "kind": "ul",
    "items": [
      "Course: t27.ai/learn/t27-compiler/",
      "t27.ai/widgets/cmp-ddc/, t27.ai/widgets/cmp-builds/, t27.ai/widgets/cmp-sieve/, t27.ai/widgets/cmp-assemble/",
      "Specs: gHashTag/t27 specs/compiler/, specs/verified/ and specs/isa/"
    ]
  }
]

export const ruBody: Block[] = [
  {
    "kind": "p",
    "text": "Вышел курс 12 на t27.ai: «Одна спека, много целей: компилятор t27». Файл .t27 — это спека с тестами, а компилятор t27c превращает её в Zig, Rust, C, Verilog и не только. gHashTag/t27 записывает правила этого конвейера и способы, которыми он ломался, спеками с числовыми тестами. В курсе 27 уроков в 9 модулях, каждый начинается с вопроса, и каждый виджет отвечает на него телами функций одной из 18 таких спек, скомпилированных в WebAssembly."
  },
  {
    "kind": "h",
    "text": "Девять шагов, двадцать семь виджетов"
  },
  {
    "kind": "p",
    "text": "Конвейер в pipeline.t27 состоит из 6 этапов: Lex, Parse, TypeCheck, Optimize, Codegen и Link. 9 модулей курса — собственное деление дороги, а не эти 6 этапов."
  },
  {
    "kind": "table",
    "head": [
      "Модуль",
      "Виджеты",
      "Спеки"
    ],
    "rows": [
      [
        "Чтение текста",
        "cmp-chars, cmp-scan, cmp-number",
        "compiler/lexer, isa/t27a"
      ],
      [
        "Форма и отказы",
        "cmp-prec, cmp-operand, cmp-errors",
        "compiler/parser, compiler/operator_text, isa/t27a"
      ],
      [
        "Имена, типы и ветви",
        "cmp-int-types, cmp-tuple, cmp-branches",
        "compiler/int_type_names, compiler/verilog_names, compiler/verilog_branch_context"
      ],
      [
        "Оценка стоимости",
        "cmp-delay, cmp-power, cmp-route",
        "compiler/hir_cost_models"
      ],
      [
        "Один ответ от каждого бэкенда",
        "cmp-parens, cmp-stale, cmp-slices",
        "compiler/codegen_conformance"
      ],
      [
        "Выходной файл",
        "cmp-overwrite, cmp-marker, cmp-gen-files",
        "compiler/compile_output, verified/gen_file_check"
      ],
      [
        "Печати",
        "cmp-seal-parts, cmp-seal-verdict, cmp-seal-cut",
        "verified/seal_check, t27mcp/seal_verdict, verified/seal_write"
      ],
      [
        "Доверие к компилятору",
        "cmp-sieve, cmp-builds, cmp-ddc",
        "compiler/theory/sieve, compiler/theory/reproducible, compiler/theory/toolchain"
      ],
      [
        "Вниз, к машине",
        "cmp-assemble, cmp-fields, cmp-container",
        "isa/t27a, isa/tri27_bytecode"
      ]
    ]
  },
  {
    "kind": "p",
    "text": "Картинки — это правила в движении: байты, загорающиеся буквами, цифрами и пробелами, одиннадцать уровней приоритета в сетке, кривая такта, падающая по мере роста числа LUT, 32-битное слово, поля которого находят, переворачивая каждый бит и спрашивая декодер, и таблица девяти компиляторов, где «неизвестно» — не «нет»."
  },
  {
    "kind": "h",
    "text": "Семь сборок, четыре бинарника"
  },
  {
    "kind": "p",
    "text": "reproducible.t27 записывает семь сборок одного коммита от 2026-10-09: t27c получился четырьмя разными бинарниками, а t27b одним, и из 21 пары сборок t27c отличаются 17. Рисунок прогоняет скомпилированную mispredicts по пяти моделям причины. Модель объясняет сборки, только если не ошибается ни в одной паре, и для каждого бинарника такая модель одна: длина git-хеша, зашитого в бинарник, вместе с путём кэша для t27c и «никакой причины» для t27b."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 720 330' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='Пары сборок, в которых ошибается каждая модель причин, из 21. Для t27c, где отличаются 17 пар: 0, 3, 11, 7, 17 для пяти моделей по порядку, и только длина git-хеша вместе с путём кэша даёт 0. Для t27b, где отличаются 0 пар: 17, 14, 6, 10, 0, и только «никакой причины» даёт 0' style='width:100%;height:auto;font-family:inherit'><text x='8' y='26' fill='currentColor' font-size='13' font-weight='700'>t27c: 17 / 21</text><text x='206' y='47' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>длина git-хеша и путь кэша</text><rect x='214' y='34' width='3.2' height='18' rx='4' fill='#00b36b'/><text x='223.2' y='47' fill='currentColor' font-size='13'>0</text><text x='206' y='71' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>один путь кэша</text><rect x='214' y='58' width='62.3' height='18' rx='4' fill='#7d8f89'/><text x='282.3' y='71' fill='currentColor' font-size='13'>3</text><text x='206' y='95' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>одна длина git-хеша</text><rect x='214' y='82' width='228.4' height='18' rx='4' fill='#7d8f89'/><text x='448.4' y='95' fill='currentColor' font-size='13'>11</text><text x='206' y='119' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>один хост</text><rect x='214' y='106' width='145.3' height='18' rx='4' fill='#7d8f89'/><text x='365.3' y='119' fill='currentColor' font-size='13'>7</text><text x='206' y='143' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>никакой причины</text><rect x='214' y='130' width='353.0' height='18' rx='4' fill='#7d8f89'/><text x='573.0' y='143' fill='currentColor' font-size='13'>17</text><text x='8' y='174' fill='currentColor' font-size='13' font-weight='700'>t27b: 0 / 21</text><text x='206' y='195' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>длина git-хеша и путь кэша</text><rect x='214' y='182' width='353.0' height='18' rx='4' fill='#7d8f89'/><text x='573.0' y='195' fill='currentColor' font-size='13'>17</text><text x='206' y='219' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>один путь кэша</text><rect x='214' y='206' width='290.7' height='18' rx='4' fill='#7d8f89'/><text x='510.7' y='219' fill='currentColor' font-size='13'>14</text><text x='206' y='243' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>одна длина git-хеша</text><rect x='214' y='230' width='124.6' height='18' rx='4' fill='#7d8f89'/><text x='344.6' y='243' fill='currentColor' font-size='13'>6</text><text x='206' y='267' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>один хост</text><rect x='214' y='254' width='207.6' height='18' rx='4' fill='#7d8f89'/><text x='427.6' y='267' fill='currentColor' font-size='13'>10</text><text x='206' y='291' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>никакой причины</text><rect x='214' y='278' width='3.2' height='18' rx='4' fill='#00b36b'/><text x='223.2' y='291' fill='currentColor' font-size='13'>0</text><text x='8' y='318' fill='currentColor' fill-opacity='0.7' font-size='12'>пары из 21 сборки, в которых модель ошибается; зелёное — ни одной</text></svg>",
    "caption": "mispredicts из reproducible.t27 для пяти моделей причины и двух бинарников, посчитанные скомпилированной спекой, которую исполняет виджет cmp-builds."
  },
  {
    "kind": "h",
    "text": "Неизвестно — не «нет»"
  },
  {
    "kind": "p",
    "text": "sieve.t27 задаёт десять вопросов девяти компиляторам и держит «неизвестно» отдельно от «ложь». Рисунок считает клетки каждого компилятора скомпилированной cells_with: у t27c 4 ложных клетки, у t27b 1, потому что для этих двух источник — мы сами. У семи сторонних компиляторов нет ложных клеток и от 3 до 5 неизвестных, потому что ни один открытый источник их не называет. Решето отсеивает компилятор только по значению «ложь», поэтому по приведённым данным оно отсеивает только двух компиляторов, которых мы читаем изнутри, а спека оговаривает, что её нельзя читать как «t27 хуже X»."
  },
  {
    "kind": "figure",
    "svg": "<svg viewBox='0 0 720 250' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='Клетки решета компиляторов по каждому компилятору, по десять, ложь красным, неизвестно серым, истина зелёным, неприменимо синим. У t27c 4 ложных клетки, у t27b 1; у семи сторонних компиляторов их нет' style='width:100%;height:auto;font-family:inherit'><text x='102' y='27' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>Zig aarch64</text><rect x='110.0' y='14' width='235.0' height='18' fill='#7d8f89'/><text x='225.0' y='27' fill='#020403' font-size='12' font-weight='700'>4</text><rect x='346.0' y='14' width='176.0' height='18' fill='#00b36b'/><text x='431.5' y='27' fill='#020403' font-size='12' font-weight='700'>3</text><rect x='523.0' y='14' width='176.0' height='18' fill='#38bdf8'/><text x='608.5' y='27' fill='#020403' font-size='12' font-weight='700'>3</text><text x='102' y='51' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>Zig x86_64</text><rect x='110.0' y='38' width='235.0' height='18' fill='#7d8f89'/><text x='225.0' y='51' fill='#020403' font-size='12' font-weight='700'>4</text><rect x='346.0' y='38' width='176.0' height='18' fill='#00b36b'/><text x='431.5' y='51' fill='#020403' font-size='12' font-weight='700'>3</text><rect x='523.0' y='38' width='176.0' height='18' fill='#38bdf8'/><text x='608.5' y='51' fill='#020403' font-size='12' font-weight='700'>3</text><text x='102' y='75' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>cg_clif</text><rect x='110.0' y='62' width='235.0' height='18' fill='#7d8f89'/><text x='225.0' y='75' fill='#020403' font-size='12' font-weight='700'>4</text><rect x='346.0' y='62' width='294.0' height='18' fill='#00b36b'/><text x='490.5' y='75' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='641.0' y='62' width='58.0' height='18' fill='#38bdf8'/><text x='667.5' y='75' fill='#020403' font-size='12' font-weight='700'>1</text><text x='102' y='99' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>Go SSA</text><rect x='110.0' y='86' width='294.0' height='18' fill='#7d8f89'/><text x='254.5' y='99' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='405.0' y='86' width='235.0' height='18' fill='#00b36b'/><text x='520.0' y='99' fill='#020403' font-size='12' font-weight='700'>4</text><rect x='641.0' y='86' width='58.0' height='18' fill='#38bdf8'/><text x='667.5' y='99' fill='#020403' font-size='12' font-weight='700'>1</text><text x='102' y='123' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>QBE</text><rect x='110.0' y='110' width='294.0' height='18' fill='#7d8f89'/><text x='254.5' y='123' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='405.0' y='110' width='176.0' height='18' fill='#00b36b'/><text x='490.5' y='123' fill='#020403' font-size='12' font-weight='700'>3</text><rect x='582.0' y='110' width='117.0' height='18' fill='#38bdf8'/><text x='638.0' y='123' fill='#020403' font-size='12' font-weight='700'>2</text><text x='102' y='147' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>CompCert</text><rect x='110.0' y='134' width='176.0' height='18' fill='#7d8f89'/><text x='195.5' y='147' fill='#020403' font-size='12' font-weight='700'>3</text><rect x='287.0' y='134' width='294.0' height='18' fill='#00b36b'/><text x='431.5' y='147' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='582.0' y='134' width='117.0' height='18' fill='#38bdf8'/><text x='638.0' y='147' fill='#020403' font-size='12' font-weight='700'>2</text><text x='102' y='171' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>LLVM</text><rect x='110.0' y='158' width='294.0' height='18' fill='#7d8f89'/><text x='254.5' y='171' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='405.0' y='158' width='294.0' height='18' fill='#00b36b'/><text x='549.5' y='171' fill='#020403' font-size='12' font-weight='700'>5</text><text x='102' y='195' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>t27c</text><rect x='110.0' y='182' width='235.0' height='18' fill='#ff4d6d'/><text x='225.0' y='195' fill='#020403' font-size='12' font-weight='700'>4</text><rect x='346.0' y='182' width='294.0' height='18' fill='#00b36b'/><text x='490.5' y='195' fill='#020403' font-size='12' font-weight='700'>5</text><rect x='641.0' y='182' width='58.0' height='18' fill='#38bdf8'/><text x='667.5' y='195' fill='#020403' font-size='12' font-weight='700'>1</text><text x='102' y='219' fill='currentColor' fill-opacity='0.8' font-size='13' text-anchor='end'>t27b</text><rect x='110.0' y='206' width='58.0' height='18' fill='#ff4d6d'/><text x='136.5' y='219' fill='#020403' font-size='12' font-weight='700'>1</text><rect x='169.0' y='206' width='412.0' height='18' fill='#00b36b'/><text x='372.5' y='219' fill='#020403' font-size='12' font-weight='700'>7</text><rect x='582.0' y='206' width='117.0' height='18' fill='#38bdf8'/><text x='638.0' y='219' fill='#020403' font-size='12' font-weight='700'>2</text><text x='8' y='238' fill='currentColor' fill-opacity='0.7' font-size='12'>клетки из десяти на компилятор: ложь, неизвестно, истина, неприменимо</text></svg>",
    "caption": "cells_with из sieve.t27 по компиляторам и значениям, посчитанные скомпилированной спекой, которую исполняет виджет cmp-sieve. Красное — ложь, серое — неизвестно, зелёное — истина, синее — неприменимо."
  },
  {
    "kind": "h",
    "text": "Как спеки попали в браузер"
  },
  {
    "kind": "p",
    "text": "Ни один виджет не копирует правило. scripts/t27-logic.mjs из 999-multibots-telegraf запускает t27c gen на спеке, собирает Zig в Zig 0.16 под wasm32 и пишет модуль с одной функцией на каждую fn спеки, а scripts/widget-logic.mjs кладёт его рядом с виджетом вместе с побайтной копией спеки. Доля объявленных в спеке функций, которые переводятся, идёт от 5 из 20 в лексере, сканирующем структуру, до 38 из 38 у ассемблера t27a. В модуль попадают и функции спек, которые эта спека подтягивает через use, а их файлы рядом с виджетом не лежат: t27a.t27 переводит 58 функций, 38 свои и 20 подтянутых из isa/ternary_encoding.t27 и isa/t27a_mnemonics.t27, а шесть других спек подтягивают от 1 до 7 функций. Уроки 7 и 8 используют функции, подтянутые из tri/t27b/type_text.t27, tools/t27o/rust_std.t27 и hosting/toolchain.t27. Строка str пересекает границу как байты UTF-8, так ассемблер и проверка кортежей принимают текст. Для логики курса новая спека не понадобилась: он использует эти 18 и спеки, которые они подтягивают."
  },
  {
    "kind": "h",
    "text": "Чего он не показывает"
  },
  {
    "kind": "ul",
    "items": [
      "Ни один урок не запускает целый этап t27c. Лексер и парсер сканируют структуры, которые WebAssembly принять не может, поэтому виджеты исполняют их проверки байтов и правило приоритета. Спеки typechecker, pipeline и optimizer сегодня не компилируются в Zig.",
      "Ассемблер t27a — исключение: это небольшой самостоятельный фронтенд, и переводятся все 38 объявленных в нём функций, а ещё 20 подтянуты через use, поэтому уроки 2, 3, 6, 25 и 26 исполняют настоящие парсер, ассемблер и дизассемблер.",
      "Уроки 16, 18, 21 и 23 цитируют отчёты стенда, которые спеки записывают с датой. Правила печатей из уроков 18 и 21 — это правила, которые формулируют спеки, а делает ли их t27c, должны сказать спеки и сам компилятор.",
      "Стоимости из уроков 10–12 — статические оценки компилятора, а не отчёт размещения и трассировки."
    ]
  },
  {
    "kind": "h",
    "text": "Попробовать"
  },
  {
    "kind": "ul",
    "items": [
      "Курс: t27.ai/learn/t27-compiler/",
      "t27.ai/widgets/cmp-ddc/, t27.ai/widgets/cmp-builds/, t27.ai/widgets/cmp-sieve/, t27.ai/widgets/cmp-assemble/",
      "Спеки: gHashTag/t27 specs/compiler/, specs/verified/ и specs/isa/"
    ]
  }
]
