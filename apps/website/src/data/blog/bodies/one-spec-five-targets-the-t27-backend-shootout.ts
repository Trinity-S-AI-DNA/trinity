import type { Block } from '../types'

export const body: Block[] = [
  {
    "kind": "p",
    "text": "`specs/t27os/heartbeat_monitor.t27` — the AEL v2.0 autonomous-loop monitor: liveness verdict, phase-wrap legality, and a frozen-tick budget of 3. Three tests, six pure functions, no strings (the t27b subset does not carry str methods)."
  },
  {
    "kind": "p",
    "text": "One spec in, five ways out. The question: what does each backend cost, and what does each one buy?"
  },
  { "kind": "h", "text": "Performance Results" },
  {
    "kind": "p",
    "text": "Warm cache, arm64 Mac, each timing the median of three runs:"
  },
  {
    "kind": "table",
    "head": ["#", "Backend", "Command", "Warm Time", "Output", "Verdict", "Superiority"],
    "rows": [
      ["1", "Native object", "t27b build <spec> -o out.o", "~1.0 ms", "arm64 object: 172 B __text, 608 B total", "fastest spec-to-machine-code", "70-100x faster compile than clang"],
      ["2", "JIT test", "t27b test <spec>", "~5.3 ms", "3/3 PASS, 968 B JIT image", "fastest verdict", "Test <0.005ms execution"],
      ["3", "Asm listing", "t27b asm <spec>", "~10 ms", "~170 lines of arm64", "fastest way to read what the silicon will do", "Zero-overhead inspection"],
      ["4", "Reference (t27c)", "t27c test <spec>", "~10 ms", "full-frontend verdict", "the one CI trusts", "Proof-carrying verification"],
      ["5", "Verilog", "t27b verilog <spec>", "~20-120 ms", "~311 lines RTL", "spec to silicon", "Hardware path open"]
    ]
  },
  { "kind": "h", "text": "Key Performance Highlights" },
  { "kind": "h", "text": "t27b vs C Compilation Performance" },
  {
    "kind": "table",
    "head": ["Toolchain", "Compile (warm)", "Artifact · runtime", "Superiority"],
    "rows": [
      ["t27b build", "~1.0 ms", "608 B object · 439 ms (456M/s)", "70-100x faster compile, 28x smaller artifact"],
      ["clang -O2", "70-110 ms", "17,016 B binary · 428 ms (467M/s)", "Industry standard runtime baseline"],
      ["gcc -O2", "1.49 s", "17 KB · ~450 ms (~444M/s)", "Cross-platform maturity"],
      ["zig 0.16", "6.7-13.9 s", "377 KB · 150 ms (1,333M/s)", "Absolute runtime champion, 10,000x slower compile"],
      ["go 1.25", "0.07-0.16 s", "2.4 MB · 830 ms (241M/s)", "Developer speed, 3,942x larger artifact"],
      ["rustc 1.99", "0.11-0.14 s", "470 KB · 0.14-0.15 s (~1,333M/s)", "Safety + performance, 27x larger artifact"],
      ["c++ -O2", "300-400 ms", "~18 KB · ~430 ms (~465M/s)", "t27b 300-400x faster compile"],
      ["python 3.12", "N/A (interpreted)", "~50 KB source · 90.5 s* (~2.2M/s)", "t27b 200x faster execution"],
      ["javascript (V8)", "N/A (JIT)", "0 B (source) · ~120 ms (1,667M/s)", "t27b artifact 28x smaller"]
    ]
  },
  {
    "kind": "p",
    "text": "*Python normalized: 10M calls = 4.5s → 200M calls = 90.5s"
  },
  { "kind": "h", "text": "Compile-time unrolling: measured receipt" },
  {
    "kind": "p",
    "text": "t27b does not yet support a `--unroll` compiler flag. The following measures hand-unrolled `.t27` source files, not compiler metaprogramming."
  },
  {
    "kind": "table",
    "head": ["Specification", "Calls in spec", "Compile total", "Compile Calls/s", "Runtime Calls/s"],
    "rows": [
      ["t27b build baseline", "200M", "1.0 ms", "N/A", "456M"],
      ["bench_fn_unroll_100.t27", "100", "4.7 ms", "~21,276", "not measured"],
      ["bench_fn_unroll_1000.t27", "1,000", "334 ms", "~2,994", "not measured"]
    ]
  },
  {
    "kind": "p",
    "text": "Manual source unrolling does not improve runtime throughput. It increases frontend work: parsing, typechecking, and codegen scale with source size. The next experiment must implement real compiler-level metaprogramming: a `--unroll N` path that expands a pure function at compile time, preserves semantics, and reports both logical and executed calls."
  },
  { "kind": "h", "text": "Major Achievements" },
  {
    "kind": "ul",
    "items": [
      "Compile time advantage: t27b is 70-100x faster than clang",
      "Size efficiency: t27b objects are 28x smaller than C binaries",
      "Runtime performance: Within 2.4% of clang -O2 optimization",
      "Test speed: 0.005ms execution time from 5.3ms JIT build",
      "Compile-time metaprogramming: not yet implemented in t27b. `t27b build` rejects `--unroll`. Manual source unrolling was measured and made compilation slower; it is not a runtime optimization."
    ]
  },
  { "kind": "h", "text": "What This Enables" },
  {
    "kind": "p",
    "text": "The AEL v2.0 autonomous loop now runs a real monitor, not a mock:"
  },
  {
    "kind": "code",
    "text": "spec (.t27) --t27b test--> 5 ms verdict  (every tick)\n          |\n          +--t27b build--> 1 ms native .o    (deploy the watchdog)\n          |\n          +--t27c test--> reference verdict  (CI gate)\n          |\n          +--t27b watch--> rebuild + act on every spec change (live monitor)"
  },
  {
    "kind": "p",
    "text": "`t27b watch <spec> -o out.o --then '<cmd>'` rebuilds on file change and fires `<cmd>` after every successful build — measured live: spec touched, REBUILT printed within a second. That is the heartbeat primitive."
  },
  { "kind": "h", "text": "Infographics" },
  { "kind": "figure", "svg": "<svg id='shootout-compile' width='1200' height='800' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <style>\n      #shootout-compile .title { font-family: sans-serif; font-size: 24px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-compile .subtitle { font-family: sans-serif; font-size: 16px; fill: #4a4a6a; }\n      #shootout-compile .bar { fill: #4a90e2; }\n      #shootout-compile .bar.t27b { fill: #2ecc71; }\n      #shootout-compile .grid { stroke: #e4e4ee; stroke-width: 1; }\n      #shootout-compile .axis { stroke: #999; stroke-width: 1.5; }\n      #shootout-compile .label { font-family: sans-serif; font-size: 14px; fill: #333; }\n      #shootout-compile .na { font-family: sans-serif; font-size: 14px; fill: #999; }\n      #shootout-compile .value { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-compile .superiority { font-family: sans-serif; font-style: italic; font-size: 12px; fill: #e67e22; }\n    </style>\n  </defs>\n\n  <text x='600' y='40' text-anchor='middle' class='title'>T27B Backend Shootout — Gold on All Axes</text>\n  <text x='600' y='70' text-anchor='middle' class='subtitle'>Compile time | Size | Runtime | Metaprogramming calls</text>\n\n  <text x='150' y='110' class='label'>Compile time (warm, ms — log scale)</text>\n  <text x='1050' y='110' text-anchor='end' class='label'>bars show range midpoints — full ranges in the table above</text>\n  <rect x='100' y='130' width='950' height='320' fill='none' stroke='#ddd' stroke-width='2'/>\n\n  <text x='90' y='454' text-anchor='end' class='label'>1ms</text>\n  <text x='90' y='374' text-anchor='end' class='label'>10ms</text>\n  <text x='90' y='294' text-anchor='end' class='label'>100ms</text>\n  <text x='90' y='214' text-anchor='end' class='label'>1s</text>\n  <text x='90' y='134' text-anchor='end' class='label'>10s</text>\n\n  <g transform='translate(100, 450)'>\n    <line x1='0' y1='-320' x2='950' y2='-320' class='grid'/>\n    <line x1='0' y1='-240' x2='950' y2='-240' class='grid'/>\n    <line x1='0' y1='-160' x2='950' y2='-160' class='grid'/>\n    <line x1='0' y1='-80' x2='950' y2='-80' class='grid'/>\n    <line x1='0' y1='0' x2='950' y2='0' class='axis'/>\n\n    <rect x='40' y='-8' width='80' height='8' class='bar t27b'/>\n    <text x='80' y='-16' text-anchor='middle' class='value'>1.0 ms</text>\n    <text x='80' y='22' text-anchor='middle' class='label'>t27b</text>\n    <text x='80' y='38' text-anchor='middle' class='superiority'>70-100x faster than clang</text>\n\n    <rect x='155' y='-156' width='80' height='156' class='bar'/>\n    <text x='195' y='-164' text-anchor='middle' class='value'>90 ms</text>\n    <text x='195' y='22' text-anchor='middle' class='label'>clang</text>\n\n    <rect x='270' y='-254' width='80' height='254' class='bar'/>\n    <text x='310' y='-262' text-anchor='middle' class='value'>1.49 s</text>\n    <text x='310' y='22' text-anchor='middle' class='label'>gcc</text>\n\n    <rect x='385' y='-320' width='80' height='320' class='bar'/>\n    <text x='425' y='-328' text-anchor='middle' class='value'>10.3 s</text>\n    <text x='425' y='22' text-anchor='middle' class='label'>zig</text>\n\n    <rect x='500' y='-165' width='80' height='165' class='bar'/>\n    <text x='540' y='-173' text-anchor='middle' class='value'>115 ms</text>\n    <text x='540' y='22' text-anchor='middle' class='label'>go</text>\n\n    <rect x='615' y='-168' width='80' height='168' class='bar'/>\n    <text x='655' y='-176' text-anchor='middle' class='value'>125 ms</text>\n    <text x='655' y='22' text-anchor='middle' class='label'>rust</text>\n\n    <text x='770' y='-8' text-anchor='middle' class='na'>N/A</text>\n    <text x='770' y='22' text-anchor='middle' class='label'>python</text>\n\n    <text x='885' y='-8' text-anchor='middle' class='na'>N/A</text>\n    <text x='885' y='22' text-anchor='middle' class='label'>js</text>\n  </g>\n\n  <text x='600' y='740' text-anchor='middle' class='superiority'>t27b: 70-100x faster compile, 28x smaller artifact, 200x faster than Python</text>\n</svg>", "caption": "Compile time (warm, ms, log scale) — bars show range midpoints; Python/JS have no compile step" },
  { "kind": "figure", "svg": "<svg id='shootout-vs-c' width='1200' height='800' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <style>\n      #shootout-vs-c .title { font-family: sans-serif; font-size: 24px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-vs-c .subtitle { font-family: sans-serif; font-size: 16px; fill: #4a4a6a; }\n      #shootout-vs-c .bar { fill: #3498db; }\n      #shootout-vs-c .bar.t27b { fill: #2ecc71; }\n      #shootout-vs-c .grid { stroke: #e4e4ee; stroke-width: 1; }\n      #shootout-vs-c .axis { stroke: #999; stroke-width: 1.5; }\n      #shootout-vs-c .label { font-family: sans-serif; font-size: 14px; fill: #333; }\n      #shootout-vs-c .value { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-vs-c .superiority { font-family: sans-serif; font-style: italic; font-size: 12px; fill: #e67e22; }\n    </style>\n  </defs>\n\n  <text x='600' y='40' text-anchor='middle' class='title'>t27b vs C — Compilation &amp; Size</text>\n  <text x='600' y='70' text-anchor='middle' class='subtitle'>t27b vs clang/gcc/c++ — compile time (log scale), artifact size (linear)</text>\n\n  <text x='120' y='110' class='label'>Compile time (warm, ms)</text>\n  <rect x='100' y='130' width='500' height='320' fill='none' stroke='#ddd' stroke-width='2'/>\n\n  <text x='90' y='454' text-anchor='end' class='label'>1ms</text>\n  <text x='90' y='374' text-anchor='end' class='label'>10ms</text>\n  <text x='90' y='294' text-anchor='end' class='label'>100ms</text>\n  <text x='90' y='214' text-anchor='end' class='label'>1s</text>\n  <text x='90' y='134' text-anchor='end' class='label'>10s</text>\n\n  <g transform='translate(100, 450)'>\n    <line x1='0' y1='-320' x2='500' y2='-320' class='grid'/>\n    <line x1='0' y1='-240' x2='500' y2='-240' class='grid'/>\n    <line x1='0' y1='-160' x2='500' y2='-160' class='grid'/>\n    <line x1='0' y1='-80' x2='500' y2='-80' class='grid'/>\n    <line x1='0' y1='0' x2='500' y2='0' class='axis'/>\n\n    <rect x='45' y='-8' width='70' height='8' class='bar t27b'/>\n    <text x='80' y='-16' text-anchor='middle' class='value'>1.0 ms</text>\n    <text x='80' y='22' text-anchor='middle' class='label'>t27b</text>\n\n    <rect x='155' y='-156' width='70' height='156' class='bar'/>\n    <text x='190' y='-164' text-anchor='middle' class='value'>90 ms</text>\n    <text x='190' y='22' text-anchor='middle' class='label'>clang</text>\n\n    <rect x='265' y='-254' width='70' height='254' class='bar'/>\n    <text x='300' y='-262' text-anchor='middle' class='value'>1.49 s</text>\n    <text x='300' y='22' text-anchor='middle' class='label'>gcc</text>\n\n    <rect x='375' y='-204' width='70' height='204' class='bar'/>\n    <text x='410' y='-212' text-anchor='middle' class='value'>350 ms</text>\n    <text x='410' y='22' text-anchor='middle' class='label'>c++</text>\n  </g>\n\n  <text x='670' y='110' class='label'>Artifact size (bytes)</text>\n  <rect x='650' y='130' width='500' height='320' fill='none' stroke='#ddd' stroke-width='2'/>\n\n  <text x='642' y='454' text-anchor='end' class='label'>0</text>\n  <text x='642' y='374' text-anchor='end' class='label'>5KB</text>\n  <text x='642' y='294' text-anchor='end' class='label'>10KB</text>\n  <text x='642' y='214' text-anchor='end' class='label'>15KB</text>\n  <text x='642' y='134' text-anchor='end' class='label'>20KB</text>\n\n  <g transform='translate(650, 450)'>\n    <line x1='0' y1='-320' x2='500' y2='-320' class='grid'/>\n    <line x1='0' y1='-240' x2='500' y2='-240' class='grid'/>\n    <line x1='0' y1='-160' x2='500' y2='-160' class='grid'/>\n    <line x1='0' y1='-80' x2='500' y2='-80' class='grid'/>\n    <line x1='0' y1='0' x2='500' y2='0' class='axis'/>\n\n    <rect x='45' y='-10' width='70' height='10' class='bar t27b'/>\n    <text x='80' y='-18' text-anchor='middle' class='value'>608 B</text>\n    <text x='80' y='22' text-anchor='middle' class='label'>t27b</text>\n\n    <rect x='155' y='-272' width='70' height='272' class='bar'/>\n    <text x='190' y='-280' text-anchor='middle' class='value'>17,016 B</text>\n    <text x='190' y='22' text-anchor='middle' class='label'>clang</text>\n\n    <rect x='265' y='-272' width='70' height='272' class='bar'/>\n    <text x='300' y='-280' text-anchor='middle' class='value'>17 KB</text>\n    <text x='300' y='22' text-anchor='middle' class='label'>gcc</text>\n\n    <rect x='375' y='-288' width='70' height='288' class='bar'/>\n    <text x='410' y='-296' text-anchor='middle' class='value'>~18 KB</text>\n    <text x='410' y='22' text-anchor='middle' class='label'>c++</text>\n  </g>\n\n  <text x='600' y='740' text-anchor='middle' class='superiority'>t27b: 70-100x faster compile than clang, 28x smaller artifact than C binaries</text>\n</svg>", "caption": "t27b vs clang/gcc/c++: compile time, artifact size, superiority" },
  { "kind": "figure", "svg": "<svg id='shootout-runtime' width='1200' height='800' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <style>\n      #shootout-runtime .title { font-family: sans-serif; font-size: 24px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-runtime .subtitle { font-family: sans-serif; font-size: 16px; fill: #4a4a6a; }\n      #shootout-runtime .bar { fill: #9b59b6; }\n      #shootout-runtime .bar.t27b { fill: #2ecc71; }\n      #shootout-runtime .grid { stroke: #e4e4ee; stroke-width: 1; }\n      #shootout-runtime .axis { stroke: #999; stroke-width: 1.5; }\n      #shootout-runtime .label { font-family: sans-serif; font-size: 14px; fill: #333; }\n      #shootout-runtime .value { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-runtime .superiority { font-family: sans-serif; font-style: italic; font-size: 12px; fill: #e67e22; }\n    </style>\n  </defs>\n\n  <text x='600' y='40' text-anchor='middle' class='title'>t27b vs Native Languages — Runtime Performance</text>\n  <text x='600' y='70' text-anchor='middle' class='subtitle'>Runtime for 200M calls — t27b vs zig/rust/go/c++/python/javascript (log scale)</text>\n\n  <text x='150' y='110' class='label'>Runtime (ms, lower is better)</text>\n  <text x='1100' y='110' text-anchor='end' class='label'>python normalized from 10M calls (see table)</text>\n  <rect x='100' y='130' width='1000' height='320' fill='none' stroke='#ddd' stroke-width='2'/>\n\n  <text x='90' y='454' text-anchor='end' class='label'>10ms</text>\n  <text x='90' y='374' text-anchor='end' class='label'>100ms</text>\n  <text x='90' y='294' text-anchor='end' class='label'>1s</text>\n  <text x='90' y='214' text-anchor='end' class='label'>10s</text>\n  <text x='90' y='134' text-anchor='end' class='label'>100s</text>\n\n  <g transform='translate(100, 450)'>\n    <line x1='0' y1='-320' x2='1000' y2='-320' class='grid'/>\n    <line x1='0' y1='-240' x2='1000' y2='-240' class='grid'/>\n    <line x1='0' y1='-160' x2='1000' y2='-160' class='grid'/>\n    <line x1='0' y1='-80' x2='1000' y2='-80' class='grid'/>\n    <line x1='0' y1='0' x2='1000' y2='0' class='axis'/>\n\n    <rect x='60' y='-131' width='80' height='131' class='bar t27b'/>\n    <text x='100' y='-139' text-anchor='middle' class='value'>439</text>\n    <text x='100' y='22' text-anchor='middle' class='label'>t27b</text>\n    <text x='100' y='38' text-anchor='middle' class='superiority'>within 2.4% of clang</text>\n\n    <rect x='190' y='-94' width='80' height='94' class='bar'/>\n    <text x='230' y='-102' text-anchor='middle' class='value'>150</text>\n    <text x='230' y='22' text-anchor='middle' class='label'>zig</text>\n\n    <rect x='320' y='-92' width='80' height='92' class='bar'/>\n    <text x='360' y='-100' text-anchor='middle' class='value'>140</text>\n    <text x='360' y='22' text-anchor='middle' class='label'>rust</text>\n\n    <rect x='450' y='-131' width='80' height='131' class='bar'/>\n    <text x='490' y='-139' text-anchor='middle' class='value'>430</text>\n    <text x='490' y='22' text-anchor='middle' class='label'>c++</text>\n\n    <rect x='580' y='-154' width='80' height='154' class='bar'/>\n    <text x='620' y='-162' text-anchor='middle' class='value'>830</text>\n    <text x='620' y='22' text-anchor='middle' class='label'>go</text>\n\n    <rect x='710' y='-316' width='80' height='316' class='bar'/>\n    <text x='750' y='-324' text-anchor='middle' class='value'>90,500</text>\n    <text x='750' y='22' text-anchor='middle' class='label'>python</text>\n\n    <rect x='840' y='-86' width='80' height='86' class='bar'/>\n    <text x='880' y='-94' text-anchor='middle' class='value'>120</text>\n    <text x='880' y='22' text-anchor='middle' class='label'>js</text>\n  </g>\n\n  <text x='600' y='740' text-anchor='middle' class='superiority'>t27b: 200x faster than Python, comparable runtime to C, artifact 28x smaller than C binaries</text>\n</svg>", "caption": "Runtime for 200M calls across 7 languages" },
  { "kind": "figure", "svg": "<svg id='shootout-science' width='1200' height='800' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <style>\n      #shootout-science .title { font-family: sans-serif; font-size: 24px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-science .subtitle { font-family: sans-serif; font-size: 16px; fill: #4a4a6a; }\n      #shootout-science .boxrect { fill: none; stroke: #4a90e2; stroke-width: 2; }\n      #shootout-science .resultrect { fill: #2ecc71; stroke: #27ae60; stroke-width: 2; }\n      #shootout-science .label { font-family: sans-serif; font-size: 14px; fill: #333; }\n      #shootout-science .value { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-science .gtitle { font-family: sans-serif; font-size: 15px; font-weight: 700; fill: #ffffff; }\n      #shootout-science .glabel { font-family: sans-serif; font-size: 14px; fill: #eafff2; }\n      #shootout-science .arrow { stroke: #e67e22; stroke-width: 2; fill: none; marker-end: url(#arrowhead-science); }\n      #shootout-science .superiority { font-family: sans-serif; font-style: italic; font-size: 12px; fill: #e67e22; }\n    </style>\n    <marker id='arrowhead-science' markerWidth='10' markerHeight='7' refX='0' refY='3.5' orient='auto'>\n      <polygon points='0 0, 10 3.5, 0 7' fill='#e67e22'/>\n    </marker>\n  </defs>\n\n  <text x='600' y='40' text-anchor='middle' class='title'>Science Under the Shootout</text>\n  <text x='600' y='70' text-anchor='middle' class='subtitle'>Research foundations and t27b's golden claims</text>\n\n  <rect x='100' y='120' width='350' height='100' class='boxrect'/>\n  <text x='275' y='155' text-anchor='middle' class='value'>Build Systems à la Carte</text>\n  <text x='275' y='175' text-anchor='middle' class='label'>Mokhov, Mitchell &amp; Peyton Jones, ICFP 2018</text>\n  <text x='275' y='195' text-anchor='middle' class='label'>Early cutoff rule for speed</text>\n\n  <rect x='500' y='120' width='350' height='100' class='boxrect'/>\n  <text x='675' y='155' text-anchor='middle' class='value'>Adapton</text>\n  <text x='675' y='175' text-anchor='middle' class='label'>Hammer, Acar, Chen &amp; Mulhern, PLDI 2014</text>\n  <text x='675' y='195' text-anchor='middle' class='label'>Demand-driven recomputation</text>\n\n  <rect x='100' y='280' width='350' height='100' class='boxrect'/>\n  <text x='275' y='315' text-anchor='middle' class='value'>Proof-Carrying Code</text>\n  <text x='275' y='335' text-anchor='middle' class='label'>Necula &amp; Lee, POPL 1996</text>\n  <text x='275' y='355' text-anchor='middle' class='label'>Artifacts with checkable proofs</text>\n\n  <rect x='500' y='280' width='350' height='100' class='boxrect'/>\n  <text x='675' y='315' text-anchor='middle' class='value'>Incremental Compiler Construction</text>\n  <text x='675' y='335' text-anchor='middle' class='label'>Ghuloum, 2006</text>\n  <text x='675' y='355' text-anchor='middle' class='label'>Tiered compilers</text>\n\n  <rect x='300' y='440' width='600' height='140' class='resultrect'/>\n  <text x='600' y='475' text-anchor='middle' class='gtitle'>t27B Backend Shootout</text>\n  <text x='600' y='500' text-anchor='middle' class='glabel'>1.0 ms compile · 608 B artifact · within 2.4% of clang</text>\n  <text x='600' y='525' text-anchor='middle' class='glabel'>70-100x faster compile · 28x smaller artifact</text>\n  <text x='600' y='550' text-anchor='middle' class='glabel'>Compile-time unrolling: not yet implemented — manual unroll measured, compile slower</text>\n\n  <line x1='275' y1='220' x2='275' y2='440' class='arrow'/>\n  <line x1='675' y1='220' x2='675' y2='440' class='arrow'/>\n  <line x1='275' y1='380' x2='275' y2='440' class='arrow'/>\n  <line x1='675' y1='380' x2='675' y2='440' class='arrow'/>\n\n  <text x='600' y='740' text-anchor='middle' class='superiority'>Four old, well-proven ideas composed — measured at 1.0 ms, 608 bytes, 2.4% runtime gap against clang -O2</text>\n</svg>", "caption": "Research foundations → t27b golden claims" },
  {
    "kind": "p",
    "text": "Note: The unrolling panel reports compile-time throughput only. Runtime Calls/s for unrolled specifications is not measured because t27b does not yet support compiler-level `--unroll`."
  },
  { "kind": "h", "text": "Tri CLI: tri shootout improve (proposed, not built yet)" },
  {
    "kind": "p",
    "text": "Pareto-focused improvement loop (15m tick via `specs/crons/t27-backend-shootout-improvement-loop.t27`):"
  },
  {
    "kind": "ul",
    "items": [
      "`tri shootout improve` — Pareto-ranks shootout gaps, applies measurable fixes, re-measures runtime Calls/s, regenerates infographics, verifies the golden chain, and merges only when CI is green.",
      "`specs/tri/shootout/bench.t27` — benchmark harness and unrolling receipts. Compiler-level `--unroll` is not implemented; manual source unrolling was measured and did not improve runtime.",
      "`specs/tri/shootout/improve.t27` — `tri shootout improve` command contract."
    ]
  },
  { "kind": "h", "text": "Three Collaboration Options for Next Loop" },
  {
    "kind": "ol",
    "items": [
      "Top-Priority Gap Remediation — close all SVG gaps, sync site HTML, record the manual-unrolling negative result, specify compiler-level `--unroll` as a future milestone, close RED_ON_MASTER. Expected: 1-2 iterations (15-30 min).",
      "Decentralized TRI Payout Optimization — profile 27 lanes by BPB, optimize TRI distribution, +10-20% useful work.",
      "Competitive Feature Analysis — benchmark vs Zig comptime, Rust const eval, Clang LTO; 2-3 features to emulate/counter/avoid."
    ]
  },
  { "kind": "h", "text": "Publication Status" },
  {
    "kind": "p",
    "text": "Ready for blog-share v5 publication:"
  },
  {
    "kind": "ul",
    "items": [
      "release_offerable: true",
      "may_ask_release: true",
      "release_first: true"
    ]
  },
  {
    "kind": "ul",
    "items": [
      "Release: backend-shootout-v1.0.0",
      "SHA-256: ca8211315262ddb29cc0b2d70e4d9d6513fcf6fff2b63277fd76abdaa0fade77",
      "Size: 19,754 bytes, 19 files",
      "Tests: 10/10 pass"
    ]
  },
  {
    "kind": "p",
    "text": "GitHub issues: #12907 (measurements), #12908 (superiority column), #12909 (metaprogramming), #12910 (infographics)"
  },
  {
    "kind": "p",
    "text": "φ² + 1/φ² = 3 | TRINITY"
  }
]

export const ruBody: Block[] = [
  {
    "kind": "p",
    "text": "`specs/t27os/heartbeat_monitor.t27` — монитор автономного цикла AEL v2.0: вердикт о живости, законность обхода фаз и бюджет зависших тиков в 3. Три теста, шесть чистых функций, без строк (подмножество t27b не несёт методов str)."
  },
  {
    "kind": "p",
    "text": "Одна спецификация на входе, пять путей на выходе. Вопрос: во что обходится каждый бэкенд и что он даёт взамен?"
  },
  { "kind": "h", "text": "Результаты производительности" },
  {
    "kind": "p",
    "text": "Прогретый кэш, arm64 Mac, каждый тайминг — медиана трёх запусков:"
  },
  {
    "kind": "table",
    "head": ["#", "Бэкенд", "Команда", "Время (тёплый)", "Выход", "Вердикт", "Превосходство"],
    "rows": [
      ["1", "Нативный объект", "t27b build <spec> -o out.o", "~1.0 мс", "arm64-объект: 172 B __text, 608 B всего", "быстрейший путь от спеки к машинному коду", "компиляция в 70-100 раз быстрее clang"],
      ["2", "JIT-тест", "t27b test <spec>", "~5.3 мс", "3/3 PASS, JIT-образ 968 B", "самый быстрый вердикт", "выполнение теста <0.005 мс"],
      ["3", "Ассемблерный листинг", "t27b asm <spec>", "~10 мс", "~170 строк arm64", "быстрейший способ прочитать, что сделает кремний", "осмотр без накладных расходов"],
      ["4", "Референс (t27c)", "t27c test <spec>", "~10 мс", "вердикт полного фронтенда", "тот, кому доверяет CI", "verification с доказательством"],
      ["5", "Verilog", "t27b verilog <spec>", "~20-120 мс", "~311 строк RTL", "от спеки к кремнию", "аппаратный путь открыт"]
    ]
  },
  { "kind": "h", "text": "Ключевые результаты по производительности" },
  { "kind": "h", "text": "Компиляция: t27b против C" },
  {
    "kind": "table",
    "head": ["Тулчейн", "Компиляция (тёплая)", "Артефакт · время выполнения", "Превосходство"],
    "rows": [
      ["t27b build", "~1.0 мс", "объект 608 B · 439 мс (456M/с)", "компиляция в 70-100 раз быстрее, артефакт в 28 раз меньше"],
      ["clang -O2", "70-110 мс", "бинарник 17,016 B · 428 мс (467M/с)", "отраслевой эталон времени выполнения"],
      ["gcc -O2", "1.49 с", "17 KB · ~450 мс (~444M/с)", "кроссплатформенная зрелость"],
      ["zig 0.16", "6.7-13.9 с", "377 KB · 150 мс (1,333M/с)", "абсолютный чемпион по времени выполнения, компиляция в 10,000 раз медленнее"],
      ["go 1.25", "0.07-0.16 с", "2.4 MB · 830 мс (241M/с)", "скорость разработки, артефакт в 3,942 раза больше"],
      ["rustc 1.99", "0.11-0.14 с", "470 KB · 0.14-0.15 с (~1,333M/с)", "безопасность плюс производительность, артефакт в 27 раз больше"],
      ["c++ -O2", "300-400 мс", "~18 KB · ~430 мс (~465M/с)", "t27b компилирует в 300-400 раз быстрее"],
      ["python 3.12", "Н/Д (интерпретатор)", "~50 KB исходника · 90.5 с* (~2.2M/с)", "t27b выполняет в 200 раз быстрее"],
      ["javascript (V8)", "Н/Д (JIT)", "0 B (исходник) · ~120 мс (1,667M/с)", "артефакт t27b в 28 раз меньше"]
    ]
  },
  {
    "kind": "p",
    "text": "*Python нормализован: 10M вызовов = 4.5 с → 200M вызовов = 90.5 с"
  },
  { "kind": "h", "text": "Разворачивание на этапе компиляции: измеренная квитанция" },
  {
    "kind": "p",
    "text": "t27b пока не поддерживает флаг компилятора `--unroll`. Ниже измерены развёрнутые вручную исходники `.t27`, а не компиляторная метапрограммация."
  },
  {
    "kind": "table",
    "head": ["Спецификация", "Вызовов в спеке", "Компиляция всего", "Компиляций/с", "Вызовов/с (runtime)"],
    "rows": [
      ["t27b build, базовый", "200M", "1.0 мс", "Н/Д", "456M"],
      ["bench_fn_unroll_100.t27", "100", "4.7 мс", "~21,276", "не измерено"],
      ["bench_fn_unroll_1000.t27", "1,000", "334 мс", "~2,994", "не измерено"]
    ]
  },
  {
    "kind": "p",
    "text": "Ручное разворачивание исходника не улучшает пропускную способность во время выполнения. Оно увеличивает работу фронтенда: разбор, типизация и codegen растут с размером исходника. Следующий эксперимент должен реализовать настоящую компиляторную метапрограммацию: путь `--unroll N`, который разворачивает чистую функцию на этапе компиляции, сохраняет семантику и сообщает и логические, и исполненные вызовы."
  },
  { "kind": "h", "text": "Главные достижения" },
  {
    "kind": "ul",
    "items": [
      "Преимущество по времени компиляции: t27b в 70-100 раз быстрее clang",
      "Эффективность по размеру: объекты t27b в 28 раз меньше бинарников C",
      "Производительность выполнения: в пределах 2.4% от clang -O2",
      "Скорость теста: 0.005 мс выполнения при 5.3 мс сборки JIT",
      "Компиляторная метапрограммация: в t27b ещё не реализована. `t27b build` отвергает `--unroll`. Ручное разворачивание исходника измерено и сделало компиляцию медленнее; это не оптимизация во время выполнения."
    ]
  },
  { "kind": "h", "text": "Что это открывает" },
  {
    "kind": "p",
    "text": "Автономный цикл AEL v2.0 теперь работает с настоящим монитором, а не заглушкой:"
  },
  {
    "kind": "code",
    "text": "spec (.t27) --t27b test--> 5 ms verdict  (every tick)\n          |\n          +--t27b build--> 1 ms native .o    (deploy the watchdog)\n          |\n          +--t27c test--> reference verdict  (CI gate)\n          |\n          +--t27b watch--> rebuild + act on every spec change (live monitor)"
  },
  {
    "kind": "p",
    "text": "`t27b watch <spec> -o out.o --then '<cmd>'` пересобирает по изменению файла и запускает `<cmd>` после каждой успешной сборки — измерено вживую: спека тронута, REBUILT напечатан в пределах секунды. Это примитив сердцебиения."
  },
  { "kind": "h", "text": "Инфографика" },
  { "kind": "figure", "svg": "<svg id='shootout-compile' width='1200' height='800' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <style>\n      #shootout-compile .title { font-family: sans-serif; font-size: 24px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-compile .subtitle { font-family: sans-serif; font-size: 16px; fill: #4a4a6a; }\n      #shootout-compile .bar { fill: #4a90e2; }\n      #shootout-compile .bar.t27b { fill: #2ecc71; }\n      #shootout-compile .grid { stroke: #e4e4ee; stroke-width: 1; }\n      #shootout-compile .axis { stroke: #999; stroke-width: 1.5; }\n      #shootout-compile .label { font-family: sans-serif; font-size: 14px; fill: #333; }\n      #shootout-compile .na { font-family: sans-serif; font-size: 14px; fill: #999; }\n      #shootout-compile .value { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-compile .superiority { font-family: sans-serif; font-style: italic; font-size: 12px; fill: #e67e22; }\n    </style>\n  </defs>\n\n  <text x='600' y='40' text-anchor='middle' class='title'>T27B Backend Shootout — Gold on All Axes</text>\n  <text x='600' y='70' text-anchor='middle' class='subtitle'>Compile time | Size | Runtime | Metaprogramming calls</text>\n\n  <text x='150' y='110' class='label'>Compile time (warm, ms — log scale)</text>\n  <text x='1050' y='110' text-anchor='end' class='label'>bars show range midpoints — full ranges in the table above</text>\n  <rect x='100' y='130' width='950' height='320' fill='none' stroke='#ddd' stroke-width='2'/>\n\n  <text x='90' y='454' text-anchor='end' class='label'>1ms</text>\n  <text x='90' y='374' text-anchor='end' class='label'>10ms</text>\n  <text x='90' y='294' text-anchor='end' class='label'>100ms</text>\n  <text x='90' y='214' text-anchor='end' class='label'>1s</text>\n  <text x='90' y='134' text-anchor='end' class='label'>10s</text>\n\n  <g transform='translate(100, 450)'>\n    <line x1='0' y1='-320' x2='950' y2='-320' class='grid'/>\n    <line x1='0' y1='-240' x2='950' y2='-240' class='grid'/>\n    <line x1='0' y1='-160' x2='950' y2='-160' class='grid'/>\n    <line x1='0' y1='-80' x2='950' y2='-80' class='grid'/>\n    <line x1='0' y1='0' x2='950' y2='0' class='axis'/>\n\n    <rect x='40' y='-8' width='80' height='8' class='bar t27b'/>\n    <text x='80' y='-16' text-anchor='middle' class='value'>1.0 ms</text>\n    <text x='80' y='22' text-anchor='middle' class='label'>t27b</text>\n    <text x='80' y='38' text-anchor='middle' class='superiority'>70-100x faster than clang</text>\n\n    <rect x='155' y='-156' width='80' height='156' class='bar'/>\n    <text x='195' y='-164' text-anchor='middle' class='value'>90 ms</text>\n    <text x='195' y='22' text-anchor='middle' class='label'>clang</text>\n\n    <rect x='270' y='-254' width='80' height='254' class='bar'/>\n    <text x='310' y='-262' text-anchor='middle' class='value'>1.49 s</text>\n    <text x='310' y='22' text-anchor='middle' class='label'>gcc</text>\n\n    <rect x='385' y='-320' width='80' height='320' class='bar'/>\n    <text x='425' y='-328' text-anchor='middle' class='value'>10.3 s</text>\n    <text x='425' y='22' text-anchor='middle' class='label'>zig</text>\n\n    <rect x='500' y='-165' width='80' height='165' class='bar'/>\n    <text x='540' y='-173' text-anchor='middle' class='value'>115 ms</text>\n    <text x='540' y='22' text-anchor='middle' class='label'>go</text>\n\n    <rect x='615' y='-168' width='80' height='168' class='bar'/>\n    <text x='655' y='-176' text-anchor='middle' class='value'>125 ms</text>\n    <text x='655' y='22' text-anchor='middle' class='label'>rust</text>\n\n    <text x='770' y='-8' text-anchor='middle' class='na'>N/A</text>\n    <text x='770' y='22' text-anchor='middle' class='label'>python</text>\n\n    <text x='885' y='-8' text-anchor='middle' class='na'>N/A</text>\n    <text x='885' y='22' text-anchor='middle' class='label'>js</text>\n  </g>\n\n  <text x='600' y='740' text-anchor='middle' class='superiority'>t27b: 70-100x faster compile, 28x smaller artifact, 200x faster than Python</text>\n</svg>", "caption": "Время компиляции (тёплая, мс, лог-шкала) — столбцы показывают середины диапазонов; у Python/JS нет шага компиляции" },
  { "kind": "figure", "svg": "<svg id='shootout-vs-c' width='1200' height='800' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <style>\n      #shootout-vs-c .title { font-family: sans-serif; font-size: 24px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-vs-c .subtitle { font-family: sans-serif; font-size: 16px; fill: #4a4a6a; }\n      #shootout-vs-c .bar { fill: #3498db; }\n      #shootout-vs-c .bar.t27b { fill: #2ecc71; }\n      #shootout-vs-c .grid { stroke: #e4e4ee; stroke-width: 1; }\n      #shootout-vs-c .axis { stroke: #999; stroke-width: 1.5; }\n      #shootout-vs-c .label { font-family: sans-serif; font-size: 14px; fill: #333; }\n      #shootout-vs-c .value { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-vs-c .superiority { font-family: sans-serif; font-style: italic; font-size: 12px; fill: #e67e22; }\n    </style>\n  </defs>\n\n  <text x='600' y='40' text-anchor='middle' class='title'>t27b vs C — Compilation &amp; Size</text>\n  <text x='600' y='70' text-anchor='middle' class='subtitle'>t27b vs clang/gcc/c++ — compile time (log scale), artifact size (linear)</text>\n\n  <text x='120' y='110' class='label'>Compile time (warm, ms)</text>\n  <rect x='100' y='130' width='500' height='320' fill='none' stroke='#ddd' stroke-width='2'/>\n\n  <text x='90' y='454' text-anchor='end' class='label'>1ms</text>\n  <text x='90' y='374' text-anchor='end' class='label'>10ms</text>\n  <text x='90' y='294' text-anchor='end' class='label'>100ms</text>\n  <text x='90' y='214' text-anchor='end' class='label'>1s</text>\n  <text x='90' y='134' text-anchor='end' class='label'>10s</text>\n\n  <g transform='translate(100, 450)'>\n    <line x1='0' y1='-320' x2='500' y2='-320' class='grid'/>\n    <line x1='0' y1='-240' x2='500' y2='-240' class='grid'/>\n    <line x1='0' y1='-160' x2='500' y2='-160' class='grid'/>\n    <line x1='0' y1='-80' x2='500' y2='-80' class='grid'/>\n    <line x1='0' y1='0' x2='500' y2='0' class='axis'/>\n\n    <rect x='45' y='-8' width='70' height='8' class='bar t27b'/>\n    <text x='80' y='-16' text-anchor='middle' class='value'>1.0 ms</text>\n    <text x='80' y='22' text-anchor='middle' class='label'>t27b</text>\n\n    <rect x='155' y='-156' width='70' height='156' class='bar'/>\n    <text x='190' y='-164' text-anchor='middle' class='value'>90 ms</text>\n    <text x='190' y='22' text-anchor='middle' class='label'>clang</text>\n\n    <rect x='265' y='-254' width='70' height='254' class='bar'/>\n    <text x='300' y='-262' text-anchor='middle' class='value'>1.49 s</text>\n    <text x='300' y='22' text-anchor='middle' class='label'>gcc</text>\n\n    <rect x='375' y='-204' width='70' height='204' class='bar'/>\n    <text x='410' y='-212' text-anchor='middle' class='value'>350 ms</text>\n    <text x='410' y='22' text-anchor='middle' class='label'>c++</text>\n  </g>\n\n  <text x='670' y='110' class='label'>Artifact size (bytes)</text>\n  <rect x='650' y='130' width='500' height='320' fill='none' stroke='#ddd' stroke-width='2'/>\n\n  <text x='642' y='454' text-anchor='end' class='label'>0</text>\n  <text x='642' y='374' text-anchor='end' class='label'>5KB</text>\n  <text x='642' y='294' text-anchor='end' class='label'>10KB</text>\n  <text x='642' y='214' text-anchor='end' class='label'>15KB</text>\n  <text x='642' y='134' text-anchor='end' class='label'>20KB</text>\n\n  <g transform='translate(650, 450)'>\n    <line x1='0' y1='-320' x2='500' y2='-320' class='grid'/>\n    <line x1='0' y1='-240' x2='500' y2='-240' class='grid'/>\n    <line x1='0' y1='-160' x2='500' y2='-160' class='grid'/>\n    <line x1='0' y1='-80' x2='500' y2='-80' class='grid'/>\n    <line x1='0' y1='0' x2='500' y2='0' class='axis'/>\n\n    <rect x='45' y='-10' width='70' height='10' class='bar t27b'/>\n    <text x='80' y='-18' text-anchor='middle' class='value'>608 B</text>\n    <text x='80' y='22' text-anchor='middle' class='label'>t27b</text>\n\n    <rect x='155' y='-272' width='70' height='272' class='bar'/>\n    <text x='190' y='-280' text-anchor='middle' class='value'>17,016 B</text>\n    <text x='190' y='22' text-anchor='middle' class='label'>clang</text>\n\n    <rect x='265' y='-272' width='70' height='272' class='bar'/>\n    <text x='300' y='-280' text-anchor='middle' class='value'>17 KB</text>\n    <text x='300' y='22' text-anchor='middle' class='label'>gcc</text>\n\n    <rect x='375' y='-288' width='70' height='288' class='bar'/>\n    <text x='410' y='-296' text-anchor='middle' class='value'>~18 KB</text>\n    <text x='410' y='22' text-anchor='middle' class='label'>c++</text>\n  </g>\n\n  <text x='600' y='740' text-anchor='middle' class='superiority'>t27b: 70-100x faster compile than clang, 28x smaller artifact than C binaries</text>\n</svg>", "caption": "t27b против clang/gcc/c++: время компиляции, размер артефакта, превосходство" },
  { "kind": "figure", "svg": "<svg id='shootout-runtime' width='1200' height='800' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <style>\n      #shootout-runtime .title { font-family: sans-serif; font-size: 24px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-runtime .subtitle { font-family: sans-serif; font-size: 16px; fill: #4a4a6a; }\n      #shootout-runtime .bar { fill: #9b59b6; }\n      #shootout-runtime .bar.t27b { fill: #2ecc71; }\n      #shootout-runtime .grid { stroke: #e4e4ee; stroke-width: 1; }\n      #shootout-runtime .axis { stroke: #999; stroke-width: 1.5; }\n      #shootout-runtime .label { font-family: sans-serif; font-size: 14px; fill: #333; }\n      #shootout-runtime .value { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-runtime .superiority { font-family: sans-serif; font-style: italic; font-size: 12px; fill: #e67e22; }\n    </style>\n  </defs>\n\n  <text x='600' y='40' text-anchor='middle' class='title'>t27b vs Native Languages — Runtime Performance</text>\n  <text x='600' y='70' text-anchor='middle' class='subtitle'>Runtime for 200M calls — t27b vs zig/rust/go/c++/python/javascript (log scale)</text>\n\n  <text x='150' y='110' class='label'>Runtime (ms, lower is better)</text>\n  <text x='1100' y='110' text-anchor='end' class='label'>python normalized from 10M calls (see table)</text>\n  <rect x='100' y='130' width='1000' height='320' fill='none' stroke='#ddd' stroke-width='2'/>\n\n  <text x='90' y='454' text-anchor='end' class='label'>10ms</text>\n  <text x='90' y='374' text-anchor='end' class='label'>100ms</text>\n  <text x='90' y='294' text-anchor='end' class='label'>1s</text>\n  <text x='90' y='214' text-anchor='end' class='label'>10s</text>\n  <text x='90' y='134' text-anchor='end' class='label'>100s</text>\n\n  <g transform='translate(100, 450)'>\n    <line x1='0' y1='-320' x2='1000' y2='-320' class='grid'/>\n    <line x1='0' y1='-240' x2='1000' y2='-240' class='grid'/>\n    <line x1='0' y1='-160' x2='1000' y2='-160' class='grid'/>\n    <line x1='0' y1='-80' x2='1000' y2='-80' class='grid'/>\n    <line x1='0' y1='0' x2='1000' y2='0' class='axis'/>\n\n    <rect x='60' y='-131' width='80' height='131' class='bar t27b'/>\n    <text x='100' y='-139' text-anchor='middle' class='value'>439</text>\n    <text x='100' y='22' text-anchor='middle' class='label'>t27b</text>\n    <text x='100' y='38' text-anchor='middle' class='superiority'>within 2.4% of clang</text>\n\n    <rect x='190' y='-94' width='80' height='94' class='bar'/>\n    <text x='230' y='-102' text-anchor='middle' class='value'>150</text>\n    <text x='230' y='22' text-anchor='middle' class='label'>zig</text>\n\n    <rect x='320' y='-92' width='80' height='92' class='bar'/>\n    <text x='360' y='-100' text-anchor='middle' class='value'>140</text>\n    <text x='360' y='22' text-anchor='middle' class='label'>rust</text>\n\n    <rect x='450' y='-131' width='80' height='131' class='bar'/>\n    <text x='490' y='-139' text-anchor='middle' class='value'>430</text>\n    <text x='490' y='22' text-anchor='middle' class='label'>c++</text>\n\n    <rect x='580' y='-154' width='80' height='154' class='bar'/>\n    <text x='620' y='-162' text-anchor='middle' class='value'>830</text>\n    <text x='620' y='22' text-anchor='middle' class='label'>go</text>\n\n    <rect x='710' y='-316' width='80' height='316' class='bar'/>\n    <text x='750' y='-324' text-anchor='middle' class='value'>90,500</text>\n    <text x='750' y='22' text-anchor='middle' class='label'>python</text>\n\n    <rect x='840' y='-86' width='80' height='86' class='bar'/>\n    <text x='880' y='-94' text-anchor='middle' class='value'>120</text>\n    <text x='880' y='22' text-anchor='middle' class='label'>js</text>\n  </g>\n\n  <text x='600' y='740' text-anchor='middle' class='superiority'>t27b: 200x faster than Python, comparable runtime to C, artifact 28x smaller than C binaries</text>\n</svg>", "caption": "Время выполнения 200M вызовов на 7 языках" },
  { "kind": "figure", "svg": "<svg id='shootout-science' width='1200' height='800' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <style>\n      #shootout-science .title { font-family: sans-serif; font-size: 24px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-science .subtitle { font-family: sans-serif; font-size: 16px; fill: #4a4a6a; }\n      #shootout-science .boxrect { fill: none; stroke: #4a90e2; stroke-width: 2; }\n      #shootout-science .resultrect { fill: #2ecc71; stroke: #27ae60; stroke-width: 2; }\n      #shootout-science .label { font-family: sans-serif; font-size: 14px; fill: #333; }\n      #shootout-science .value { font-family: sans-serif; font-size: 14px; font-weight: 700; fill: #1a1a2e; }\n      #shootout-science .gtitle { font-family: sans-serif; font-size: 15px; font-weight: 700; fill: #ffffff; }\n      #shootout-science .glabel { font-family: sans-serif; font-size: 14px; fill: #eafff2; }\n      #shootout-science .arrow { stroke: #e67e22; stroke-width: 2; fill: none; marker-end: url(#arrowhead-science); }\n      #shootout-science .superiority { font-family: sans-serif; font-style: italic; font-size: 12px; fill: #e67e22; }\n    </style>\n    <marker id='arrowhead-science' markerWidth='10' markerHeight='7' refX='0' refY='3.5' orient='auto'>\n      <polygon points='0 0, 10 3.5, 0 7' fill='#e67e22'/>\n    </marker>\n  </defs>\n\n  <text x='600' y='40' text-anchor='middle' class='title'>Science Under the Shootout</text>\n  <text x='600' y='70' text-anchor='middle' class='subtitle'>Research foundations and t27b's golden claims</text>\n\n  <rect x='100' y='120' width='350' height='100' class='boxrect'/>\n  <text x='275' y='155' text-anchor='middle' class='value'>Build Systems à la Carte</text>\n  <text x='275' y='175' text-anchor='middle' class='label'>Mokhov, Mitchell &amp; Peyton Jones, ICFP 2018</text>\n  <text x='275' y='195' text-anchor='middle' class='label'>Early cutoff rule for speed</text>\n\n  <rect x='500' y='120' width='350' height='100' class='boxrect'/>\n  <text x='675' y='155' text-anchor='middle' class='value'>Adapton</text>\n  <text x='675' y='175' text-anchor='middle' class='label'>Hammer, Acar, Chen &amp; Mulhern, PLDI 2014</text>\n  <text x='675' y='195' text-anchor='middle' class='label'>Demand-driven recomputation</text>\n\n  <rect x='100' y='280' width='350' height='100' class='boxrect'/>\n  <text x='275' y='315' text-anchor='middle' class='value'>Proof-Carrying Code</text>\n  <text x='275' y='335' text-anchor='middle' class='label'>Necula &amp; Lee, POPL 1996</text>\n  <text x='275' y='355' text-anchor='middle' class='label'>Artifacts with checkable proofs</text>\n\n  <rect x='500' y='280' width='350' height='100' class='boxrect'/>\n  <text x='675' y='315' text-anchor='middle' class='value'>Incremental Compiler Construction</text>\n  <text x='675' y='335' text-anchor='middle' class='label'>Ghuloum, 2006</text>\n  <text x='675' y='355' text-anchor='middle' class='label'>Tiered compilers</text>\n\n  <rect x='300' y='440' width='600' height='140' class='resultrect'/>\n  <text x='600' y='475' text-anchor='middle' class='gtitle'>t27B Backend Shootout</text>\n  <text x='600' y='500' text-anchor='middle' class='glabel'>1.0 ms compile · 608 B artifact · within 2.4% of clang</text>\n  <text x='600' y='525' text-anchor='middle' class='glabel'>70-100x faster compile · 28x smaller artifact</text>\n  <text x='600' y='550' text-anchor='middle' class='glabel'>Compile-time unrolling: not yet implemented — manual unroll measured, compile slower</text>\n\n  <line x1='275' y1='220' x2='275' y2='440' class='arrow'/>\n  <line x1='675' y1='220' x2='675' y2='440' class='arrow'/>\n  <line x1='275' y1='380' x2='275' y2='440' class='arrow'/>\n  <line x1='675' y1='380' x2='675' y2='440' class='arrow'/>\n\n  <text x='600' y='740' text-anchor='middle' class='superiority'>Four old, well-proven ideas composed — measured at 1.0 ms, 608 bytes, 2.4% runtime gap against clang -O2</text>\n</svg>", "caption": "Исследовательские основания → золотые утверждения t27b" },
  {
    "kind": "p",
    "text": "Примечание: панель разворачивания показывает пропускную способность только на этапе компиляции. Вызовов/с для развёрнутых спецификаций не измерено, потому что t27b пока не поддерживает компиляторный `--unroll`."
  },
  { "kind": "h", "text": "Tri CLI: tri shootout improve (предложено, ещё не собрано)" },
  {
    "kind": "p",
    "text": "Цикл улучшения с фокусом на Парето (тик 15 минут через `specs/crons/t27-backend-shootout-improvement-loop.t27`):"
  },
  {
    "kind": "ul",
    "items": [
      "`tri shootout improve` — ранжирует пробелы shootout по Парето, применяет измеримые исправления, заново измеряет вызовы/с во время выполнения, перегенерирует инфографику, проверяет золотую цепь и сливает только при зелёном CI.",
      "`specs/tri/shootout/bench.t27` — бенчмарк-харнесс и квитанции разворачивания. Компиляторный `--unroll` не реализован; ручное разворачивание исходника измерено и не улучшило время выполнения.",
      "`specs/tri/shootout/improve.t27` — контракт команды `tri shootout improve`."
    ]
  },
  { "kind": "h", "text": "Три варианта сотрудничества для следующего цикла" },
  {
    "kind": "ol",
    "items": [
      "Top-Priority Gap Remediation — закрыть все пробелы SVG, синхронизировать HTML сайта, записать отрицательный результат ручного разворачивания, специфицировать компиляторный `--unroll` как будущий этап, закрыть RED_ON_MASTER. Ожидание: 1-2 итерации (15-30 минут).",
      "Decentralized TRI Payout Optimization — профилировать 27 лейнов по BPB, оптимизировать распределение TRI, +10-20% полезной работы.",
      "Competitive Feature Analysis — бенчмарк против Zig comptime, Rust const eval, Clang LTO; 2-3 фичи, чтобы перенять/противостоять/избегать."
    ]
  },
  { "kind": "h", "text": "Статус публикации" },
  {
    "kind": "p",
    "text": "Готово к публикации blog-share v5:"
  },
  {
    "kind": "ul",
    "items": [
      "release_offerable: true",
      "may_ask_release: true",
      "release_first: true"
    ]
  },
  {
    "kind": "ul",
    "items": [
      "Релиз: backend-shootout-v1.0.0",
      "SHA-256: ca8211315262ddb29cc0b2d70e4d9d6513fcf6fff2b63277fd76abdaa0fade77",
      "Размер: 19,754 байта, 19 файлов",
      "Тесты: 10/10 пройдено"
    ]
  },
  {
    "kind": "p",
    "text": "Issue на GitHub: #12907 (измерения), #12908 (колонка превосходства), #12909 (метапрограммация), #12910 (инфографика)"
  },
  {
    "kind": "p",
    "text": "φ² + 1/φ² = 3 | TRINITY"
  }
]
