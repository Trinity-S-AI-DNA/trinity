# The project

## What t27 and Trinity are

**t27** is a specification language and a toolchain. A `.t27` file declares behaviour,
constants, tests and invariants in one place; the compiler (`t27c`, driven by the `tri`
command) validates the file, generates code for the target backends (Zig, C, Verilog) and
runs the tests written inside the spec. The repository `gHashTag/t27` holds the language,
the compiler, the spec corpus and the canon documents that govern how agents and people
work in it (`SOUL.md`, `AGENTS.md`, `docs/T27-CONSTITUTION.md`).

**Trinity** is the programme around t27: the GoldenFloat family of numeric formats built on
the identity phi^2 + 1/phi^2 = 3, hardware validation of those formats on one FPGA board,
and the public site `t27.ai` (repository `gHashTag/trinity`, `apps/website`) that renders
the spec corpus, the skills, the scheduled jobs, the agents and the tools through the real
compiler compiled to WebAssembly. The site does not paraphrase the specs; it compiles them
in the browser build and shows the verdicts.

The rule that ties the two together is spec-first: project logic originates in `.t27`, and
host languages -- Rust for the bootstrap compiler, TypeScript for the site, Zig, C and
Verilog as generated output -- are subordinate implementations. `docs/T27-CONSTITUTION.md`,
Article SSOT-MATH, states it for mathematics and numerics; `AGENTS.md` section 3 restates
it for every change ("Specs are source of truth").

## Claims and their status

Every claim in this documentation carries one of five status tags, and the table the site
renders next to this chapter repeats them with their source file:

- `[measured]` -- a number produced by running something whose output is in a repository
  or a public CI log, with the command and the commit recorded.
- `[declared]` -- stated in a spec or a canon document; not (yet) exercised by a run.
- `[specified]` -- exists as a `.t27` spec that typechecks; no implementation is claimed.
- `[external]` -- a value taken from a source outside the two repositories; cited, not
  reproduced here.
- `[not claimed]` -- explicitly outside what the project asserts today.

The statements this chapter is prepared to make, with their tags:

- The GoldenFloat catalog holds 83 formats `[declared]` -- `FAMILY_TOTALS.catalog` in
  `trinity:apps/website/src/data/siliconHistory.ts`, transcribed from the hardware
  conformance report of `gHashTag/trinity-fpga` (v0.2), which is the published source of
  every hardware figure on the site.
- Hardware numbers exist for a subset of the catalog `[measured]`: at v0.2 the same file
  records 27 formats at Tier E (public chain: CI run id, bitstream SHA-256, JTAG flash,
  UART log), 13 with decode in hardware, 7 with ADD and 7 with MUL in hardware, and 62 with
  a bit-exact software reference. The union of the hardware axes is a smaller number than
  83; the exact union is stated in the trinity-fpga report and is not restated here.
- Every hardware number was measured on one board `[measured]`: ALINX AX7203, Xilinx
  Artix-7 `xc7a200tfbg484-2`, open toolchain (yosys, nextpnr-xilinx, Project X-Ray),
  `DEVICE` and `TOOLCHAIN` in the same file.
- Skills, crons, agents and tools on the site are generated from `.t27` specs through the
  vendored compiler wasm `[measured]`: the counts are in the ladder header of every
  Explorer and in the "Evidence and witnesses" chapter; `typecheck.ok` for each spec is
  recorded in the JSON the site serves.

## Boundaries

What the project does **not** claim, in its own words:

- **No silicon.** `[not claimed]` A SKY130 design was prepared through Tiny Tapeout; the
  TTSKY26a/TTSKY26b submissions were withdrawn before fabrication and refunded, so no die
  exists and no measurement on silicon is claimed (`trinity:apps/website/src/content/tnf.ts`,
  the "Is this an ASIC result?" answer). ASIC mapping and multi-corner characterisation are
  not claimed either. The hardware boundary is the FPGA named above.
- **No ranking words.** The canon forbids "first", "only", "best" and their translations in
  first-party prose; the site's QA (`check:docs`, `check:queen-honesty`) fails a build that
  contains them. Comparisons are stated as numbers with a source or not at all.
- **The Verilog the t27 compiler emits from a format spec is a module shell** -- across the
  corpus it yields 0 LUTs and 0 flip-flops (`siliconHistory.ts`, provenance note). The
  silicon results belong to hand-written RTL verified against an independent oracle. The
  spec and the RTL describe the same format; they are not the same artifact.
- **`typecheck.ok` from the wasm is necessary, not sufficient.** It stays `true` for a wrong
  annotation such as `str = 5`; the site's generators check the field schema of every card
  on top of it (`specs/skills/README.md`).
- **Two repositories, two lists.** Tools, agents and jobs of `gHashTag/t27` and of
  `gHashTag/trinity` are recorded under their own `REPO`; nothing is merged into one list.

## How to read this documentation

The seven chapters are declared in `specs/docs/system.t27` and one spec per chapter under
`specs/docs/chapters/`. Each chapter spec names its `SOURCES` (the files it quotes), its
`SECTIONS` (the headings of this Markdown, checked at build time), the figure the site draws
from data (`DIAGRAM`) and the table it generates from the catalogs (`TABLE`). The English
prose is canonical and lives in `docs/system/<id>.md` in `gHashTag/t27`; the Russian text
travels through the translation contract `specs/i18n/docs-ru.t27` and the bundle it names
in `gHashTag/trinity`. When the two disagree, English wins.

Every figure on the site carries a caption and a data-source line: the JSON it was drawn
from and the commit that JSON was generated at. Every table is generated; none is typed by
hand. A number without a source line is a defect -- report it as one.
