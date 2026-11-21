# TNF article -- full audit, 2026-08-18 (W845)

**How this was produced.** Five parallel readers over `docs/theory/TNF_ARTICLE_RU.md`
(2,890 lines), the four publication process files, theorems T483-T628a, the
measurement artefacts, and every outbound reference the article makes. They
returned **318 raw findings**. Each load-bearing one was then handed to an
independent agent instructed to REFUSE it, defaulting to refuted when uncertain:
**24 of 24 survived**. 30 agents, 568 tool calls, 32 minutes.

**What it is not.** An audit, not a rewrite and not a retraction. Many findings are
internal contradictions where the article states one number two or three ways --
the audit names which site is current and which is stale, and where the file
cannot settle it, it says so under NOT ESTABLISHED.

**Standing rule applied.** T619a (W842): a silicon verdict must agree across at
least three placer seeds, or it is a statement about one placement.

---

# TNF ARTICLE — STATUS REPORT
**Target:** `docs/theory/TNF_ARTICLE_RU.md` · **Measured:** 2026-08-18 · **Branch:** `claude/igla-fpga-improvements-3f5e1a`

---

## 1. STATUS

The article is 2,890 lines, last edited 2026-08-18 in commit `233fd8ee0` (which added a dated toolchain caveat and a provenance note to one hardware table, and entered the article into `docs/PUBLICATION_AUDIT.md:33` as **Ready? No** with three named blockers). It carries 70 tables and 101 status tags (44 `[доказано]`, 48 `[измерено]`, 8 `[источник в тексте]`, 1 `[открытая гипотеза]`); exactly **2 of 70 tables carry a dated provenance line**, both added on 2026-08-18 to the same table (`:307-313`, `:326-342`). The article's own traceability audit (`:2079-2110`) claims 444 of 451 numeric literals trace to a generating file, but the tool it names as producing that audit, `tools/check_paper_numbers.py`, does not exist in the worktree or anywhere in git history — so the 444/451 figure is itself unreproducible. Four appended errata blocks (2026-08-13, -08-14, -08-17, -08-18) retract claims the body still asserts verbatim; the abstract at `:65` still prints three numbers its own erratum at `:2385-2456` withdrew.

---

## 2. BLOCKERS

### Needing a USER decision (4)

**U1 — Which `smul` is canonical: does 0·x = 0?**
The corpus contains two normalised `smul` bodies: `7c0755a0` (19 specs, zero guard + branch sign) and `8d3af2b6` (2 specs — `gft_signed_dot4.t27`, `gft_signed_mac.t27` — no guard, XOR sign). The die answered both ways within one hour: design 12 `c_zero=1`, design 13 `c_zero=0`, re-run at seeds 1/7/42 and stable (`IGLA-FORMAL-RESULTS.md:24061`, T620). *Blocks because:* choosing either changes what the hardware computes for specs that already carry silicon verdicts (T546, T577). *Clears when:* a human decides whether TNF multiplication annihilates zero, and the two files are brought to the chosen form. Evidence: `IGLA-FORMAL-RESULTS.md:22212` (T552), `:23365` (T589), `:23569` (T597).

**U2 — Ternary alphabet polarity in the `gft_*` family.**
Five `gft_*` specs decode `w==2 → +a`, `w==0 → -a`, against `specs/numeric/gfternary.t27`'s canonical `GAT_POS=0x01`. A wrapper written to the canonical alphabet computes the negation and still passes a cancellation test, because cancellation is symmetric under negation. Recorded, not fixed. Evidence: `IGLA-FORMAL-RESULTS.md:21652` (T533).

**U3 — Publish-vs-withhold on `TNF16 = M=11` vs `M=9`.**
`:95` declares `M=11`, `:96` divides by `2^9`, `:107` asserts nine bits, `:441/:447` settle on `M=11`, and the appended FPGA block at `:2552-2559` concludes the honest binary-fabric width is 17 bits (1+7+9). The declared 1+7+11 layout stores 19 bits, not 16. `specs/numeric/tnf17.t27:28-36` implements `M=9` and records the conflict in its own header. *Clears when:* someone decides whether the article publishes TNF16 (M=9, 17-bit honest) or TNF17e, and rewrites §Формат accordingly.

**U4 — Sign-off and target venue.**
`docs/reports/TNF9-ABSTRACT-PROPOSAL.tex:135-137` states the abstract is not applied and not pushed pending Dmitrii's confirmation. `docs/PUBLICATION_QUEUE.md:16` lists the article at P0 with the literal placeholder `*open publication-task*` and DOI `none` — no issue number was ever filled in, against the queue's own rule at `:22` that each row must have a living issue. `docs/PUBLICATION_MAP.md:20` now routes it to MLSys or a numerics venue; no venue is named in the article.

### Ordinary work (9, ranked)

**B1 — The abstract asserts three retracted numbers.** `:65` reads "среди двадцати форматов … на 10.2% впереди следующего и в 6.1× впереди posit32, причём восемь из двадцати — наши". The erratum at `:2385-2456` recomputes from the article's own table: 0.1584/0.1429 = **+10.85%**, 0.1584/0.0302 = **5.245×**, the table has **24** data rows, **12** are bolded as ours. The values 0.1437 and 0.0260 that would yield 10.2% and 6.1× appear nowhere in the file. Two further sites contradict the erratum and were not touched: `:1270` captions the same table "девятнадцать форматов", and `:1779` still asserts "Его первое место … не затронуто". *Clears when:* `:65` is rewritten to +10.85% / 5.245× / 24 / 12 with a pointer to `:2385`, and `:1270`/`:1779` are corrected. Note the erratum's own internal pointer to "строки 1216-1240" is stale — the table is at `:1243-1268`.

**B2 — Retraction count stated four irreconcilable ways.** "Пять" (`:69`), "Десять" (`:89`), "одиннадцать" (`:1552`, `:2456`), "шестнадцать … два из них затем отозваны" (`:2026`, `:2081`). The scope defence fails at `:2073` — "Приложенная к нашим собственным утверждениям, процедура дала шестнадцать отзывов" — which scopes 16 to the same population as `:89`'s ten. 5, 10 and 16 all entered in one commit (`9f54b0437`); 11 was added later by `bf3ad8135`. A second collision rides along: `:89` says the last four were found by independent review, `:2456` calls the eleventh "первое, снятое не нами". *Clears when:* one count is computed from a list and all five sites cite it.

**B3 — The Железо table contradicts §Ограничения.** Table at `:319-324` prints six placed rungs: TNF4 12 LUT/161.11 MHz, TNF8 50/153.23, TNF16 212/131.73, TNF32 1,477/83.27, TNF64 6,140/53.26, TNF128 10,029/33.23. `:2271-2276` says five of nine rungs were measured, gives TNF64 as **7,479 LUT / 48.20 MHz**, and states TNF128 "не сходится в разводке на этом кристалле и не заявляется". The caption at `:345` also presupposes TNF128 was measured. The TNF64 gap is probably two builds (M=52 vs harmonized M=56, `:419-427`, `:580`) and is an undisclosed conflation; the TNF128 row is a hard contradiction. *Clears when:* the TNF128 row is removed or `:2271` is corrected, and the TNF64 row states its M.

**B4 — Three LUT counts for one TNF16 multiplier.** `:321` 212 LUT @ 131.73 MHz; `:367` 219 LUT; `:447`/`:563` **372 LUT @ 131.73 MHz** (with M=11 at 443 LUT / 136.44 MHz). 212 vs 372 is 1.75× on one rung, and the seed caveat at `:338` identifies the two 131.73 MHz figures as one measurement, so they cannot be different builds; `:341` declares the LUT column a synthesis result independent of placer seed, foreclosing synth-vs-route. Two corroborating symptoms: TNF32 is 1,477 LUT in the table and 1,683 in the λ sweep; the sweep's fitted fixed overhead f=141 LUT exceeds the table's TNF4 (12) and TNF8 (50) rows entirely.

**B5 — Zero-DSP stack table has no provenance and three untraceable numbers.** `:1233-1239` prints 78 МГц, 33 GOPS, 97%, XOR 4/4, 24–25 эпох with no `[измерено]` tag, no seed, no bench, no date, no cross-reference. Each appears exactly once in the 2,890-line file. "33 GOPS" appears in no other repo file; no repo file records a ternary correlator at 78 MHz on air (the only 78.x MHz measurement in the repo is e8m0 at 78.63 MHz, `IGLA-FORMAL-RESULTS.md:21973`). XOR 4/4 and 24–25 epochs are documented in `docs/SILICON_TRAINING_METHODOLOGY.md:49` and `docs/NOW.md:283` as seed-search-dependent (some seeds diverge, `docs/NOW.md:181,207`); the only ~97% in the repo (`docs/NOW.md:406`, `docs/GFT_WHITEPAPER.md:74`) is a 2-layer MLP held-out score on a 2-D task, not a trained ternary transformer.

**B6 — Zero-DSP novelty is unavailable after 2026-07.** ELiTeFormer (arXiv:2607.03652) publishes a PE eliminating all multiplications in ternary linear projections and avoiding DSP blocks. `IGLA-FORMAL-RESULTS.md:20299` (T490) names `TNF_ARTICLE_RU.md` and states the citation is mandatory and the novelty claim unavailable. The article headlines zero-DSP at `:49`, `:1117`, `:1202-1214`, `:2419`, `:2493`. Separately, `IGLA-FORMAL-RESULTS.md:20316` (T491) registers arXiv:2604.25183 as an open challenge to the golden sieve's novelty.

**B7 — Five silicon verdicts are single-placement claims.** Table at `:2782-2788` and the claim at `:2790` ("Пятнадцать вердиктов «спека → кристалл», ноль DSP48E1 … значит ни одна не подвержена дефектам openXC7 из T246/T250 и T342"). T616-T619 measured a defect class that DSP/SRL absence does not exclude: five builds from one netlist (187 CARRY4 in every build) gave PASS at seeds 1/42/31337 and FAIL at 7/1234, deterministically, with the best-margin build failing (`IGLA-FORMAL-RESULTS.md:23971`, `:23990`, `:24015`). Only 2 of the 5 rows have been re-audited under the three-seed rule (`:24131`, T622: ternary_node, e8m0 upheld); tnf17, phi_weights and ternary_link have had only timing margin checked (`:24189`, T625: 2.80×/2.66×/2.58×).

**B8 — Five named gates do not exist.** `tools/check_paper_numbers.py` (`:2083`), `tools/check_literal_widths.py` (`:1862`), `tools/check_variant_declared.py` and `conformance/variant_map.json` (`:1811-1813`), `tools/check_exponent_window.py` (`:1607`) — all verified absent from the worktree and from git history. Also `gen_figures.py` (`:449`), on which the reproducibility of the precision figure and three ratios rests. The article presents each as a live, red-team-tested gate.

**B9 — Publication-doc dead paths.** `docs/PUBLICATION_PIPELINE.md:36` requires a pointer to `docs/RESEARCH_CLAIMS.md`; the file is at `docs/nona-03-manifest/RESEARCH_CLAIMS.md`. Same for `docs/LANGUAGE_SPEC.md` (audit row 23, queue P2) — real path `docs/nona-02-organism/LANGUAGE_SPEC.md`. No artifact can satisfy these two mandatory gates as written.

---

## 3. CONNECTIVITY

**What the article cites that no longer matches the repository.**

| Count | Item |
|---|---|
| 6 | Named tooling/data artefacts that never existed in git history: `check_paper_numbers.py`, `check_literal_widths.py`, `check_variant_declared.py`, `check_exponent_window.py`, `conformance/variant_map.json`, `gen_figures.py` |
| 23 | Distinct theorem ids cited by the article; **21** resolve to `###` headings in `IGLA-FORMAL-RESULTS.md`, **2** (T413c, T456b) exist only as blockquote sub-claims at `:17504` and `:19074` |
| 2 | Mis-attributions: ≈2750 LUT credited to T293 at `:2833` belongs to T294 (`IGLA-FORMAL-RESULTS.md:14434`); T398 cited at `:2818` for a cardinality claim measures base spread (b=3 vs b=2), not cardinality |
| 1 | Highest theorem cited: **T482**. The file's highest is **T628a** |
| 6 | Theorems the article holds pending re-measurement (T430, T431, T432, T439, T443, T446) — `IGLA-FORMAL-RESULTS.md:19082` (T456c) re-opened **eleven**, so five re-opened results are not held |
| 5 | `.t27` specs the article tabulates: all exist, all still carry the functions attributed (`tnf17.t27:88,205`; `phi_weights.t27:137,111,115`; `ternary_node.t27:271`; `golden_sieve.t27` — 8 invariants, no `on_comb`) |
| 3 | Facts in `docs/reports/TNF-ARTICLE-RECONCILIATION.md` (which the article names as "Полный разбор") that are false of the current article: "2,687 lines" (now 2,890), "zero status tags" (now 101), "no retractions section" (`:2385` ЭРРАТУМ + `:2023` methodology section). That file carries a self-correcting W845 banner; the article's pointer text does not warn the reader |

**What the repository has measured that the article does not know about.**

- **146 theorem entries T483–T628a** (`IGLA-FORMAL-RESULTS.md:20135-24269`, waves W805–W844) are entirely outside the article's errata window. They contain **7 explicit withdrawals** and **3 corrections of results the article cites or depends on**.
- **T500/T504/T505** (`:20689`, `:20798`, `:20823`): `cell_census` reported **exactly 2× every cell count** for 264 commits (`addf9a3df` 2026-08-14 → `2e2bea00f` 2026-08-17), across three call sites including `t27c silicon`. The article's five-row silicon table at `:2782-2788` falls inside that window; all five LUT and CARRY4 values are even and fail T505's parity test.
- **T501** (`:20726`): the "66 LUT на MAC" figure the article uses at `:2627` to derive 2,039 parallel MACs and 204 GMAC/s is withdrawn — it is 33.
- **T542** (`:21961`): nextpnr-xilinx with no `--freq` and no XDC targets **12 MHz** against a die measured at 67–71 MHz (T495, `:20479`). Every design placed before W818 was checked at 5.7× below its drive frequency. T544 (`:22020`) re-placed the article's exact five wrappers at 70.77 MHz and all five PASS — so those rows survive, but were not entitled to at the time.
- **T484/T485/T483** (`:20154`, `:20171`, `:20135`) overtake all three clauses of the article's fan-in section at `:2755-2758`: monotonicity refuted at 8 points; T482's mechanism withdrawn (partial corr headroom|MI = +0.853 vs MI|headroom = +0.458); the functional form the article calls "не измерена" measured as compressive (log R² = 0.904 vs linear 0.717).
- **T487/T488** (`:20220`, `:20264`): non-volatile storage measured at **16 MB** (JEDEC 0x20ba18, Micron N25Q128) on all three dice — a 28.6× shortfall against 457 MB of weights. The board's DRAM is unrecorded anywhere in the repo. The article's capacity tables at `:2612-2640` do not carry this.
- **Forecast ledger, 16 waves W828–W844** (T569a … T628a): 7 withdrawals, of which 4 were of magnitudes from a flawed instrument and 1 of an inference — "none was of a qualitative claim, and none was of a hardware measurement" (`:23532`, T594a). It appears nowhere in the article.

---

## 4. TABLES

### In the article

| Table | Line | What it says now | Current measurement / correct value |
|---|---|---|---|
| Abstract headline | `:65` | +10.2%, 6.1×, 8 of 20 | +10.85%, 5.245×, **12 of 24** (`:2385-2456`) |
| §Формат layout | `:95-96`, `:107` | `M=11` declared, `2^9` in formula, "девять битов" in prose | Settled choice is `M=11` (`:441`, `:447`); honest 16-bit assignments are 1+7+8 and 1+5+10 (`:1705-1707`); honest fabric width 1+7+9 = 17 (`:2552-2559`). Accuracy table `:117-126` still tabulates the M=9 ladder (`:120`: M=9, 2^-(M+1)=9.77e-4) |
| Железо multiplier | `:317-324` | 6 rows, TNF128 = 10,029/33.23 MHz, TNF64 = 6,140/53.26 | TNF128 did not route (`:2274`); TNF64 = **7,479 LUT / 48.20 MHz** at M=56. LUT/DSP columns are current and seed-independent; the F_max column's 2nd decimal is not reproducible (`:326-342`, 15% seed spread 15.83→18.29 MHz) |
| Специфицированная лестница | `:345-353` | TNF32 = E_t 6, M 25, **73 декады** | 73 is the E_t=5 value (`:442`); E_t=6 gives **219** decades, as printed at `:282`, `:443`, `:469`. Convention is (3^E_t − 1)·log10 2. Every other rung matches cell-for-cell |
| Mode-codec silicon | `:538-543` vs prose `:549` | Cleaned decode LUT 379 / 6 / 393; prose quotes 403, 417, 30 and "разница в 3.5%" | Prose is testbench-included (+24 LUT); cleaned difference is 393/379 = **3.69%**. Round-trip overhead given as 18% (`:545`, cleaned 516/438 = 17.8%) and 16% (`:555`, testbench-included 16.05%) |
| λ conversions | `:563`, `:569`, `:599`, `:612`, `:615` | λ = 48.8 (16-bit class) → 438 LUT = **8.98** mantissa bits, 3.94, 0.82 | Under the area law A = f + cM² (`:587`, f=141, c=2.4455, R²=0.99963), λ = 2cM = **44.0** at M=9 → **9.95** bits and 0.91; at M=11, 53.8 → **8.14**. 8.98 matches neither, and as printed 8.98 < 9 contradicts the sentence at `:565`/`:612` it supports |
| Ternary-neuron throughput | `:705-712` vs `:714` | Prose: 2.03× area, 2.54× frequency, 5.16× throughput/LUT "измерено сквозным образом" | Best table row is **3.99×** (32b: area 1.68×, frequency 2.38×). 2.03 = 895/440, the area ratio of the "440 vs 895 LUT, 5.1×" measurement retracted at `:703`. posit32 decoder is 456 LUT (`:714`), 480 (`:626`, `:665`), 517 (`:1343`) — the latter two at F_max 49.0 vs 49.05 |
| Zero-DSP stack | `:1233-1239` | 78 МГц, 33 GOPS, 97%, XOR 4/4, 24–25 эпох, 0 DSP | Untagged, unsourced; 2 of 5 untraceable repo-wide (see B5) |
| Isolated decoder | `:1328-1343` | 12 rows, `#` column 1,2,3,4,6,9,13,14,15,16,17,18 | 18 rows measured; ranks 5,7,8,10,11,12 silently dropped, with no caption saying so. Claim at `:1347` ("все четырнадцать фиксированных полей") cannot be checked against 8 printed fixed-field rows. Values are byte-identical since `9f54b0437` and not superseded — **fix is a caption naming the full row count** |
| Regrouped by width | `:1493-1520` | Captioned "Те же измерения"; 24 rows | 9 rows carry **5-seed medians** where `:1243-1268` carries **54-seed means** (GFTernary, binary32, fp8 e4m3, TNF16a, fp8 e5m2, GF10, TNF17e, TNF16c, binary16). Load-bearing: TNF16c/binary16 from the stale table = 0.1157/0.1039 = **+11.4%**, reviving the margin `:1584` retracts in favour of **+6.92%** |
| "Честное сравнение" prose | `:1524`, `:1526-1533`, `:1560` | GF+8 0.1004 vs fp8 e4m3 0.1254 (−19.9%); BNF16 −3.1%/+57.4%/+79.8%/+113.4% | Neither 0.1004 nor 0.1254 appears in any table or data file repo-wide. Current: GF+8 = 0.0882 (`:1262`, `:1501`) vs fp8 e4m3 = 0.1225 (`:1247`) or 0.1244 (`:1498`) = **−28.0% / −29.1%**. BNF16 recomputed: **−0.5% (or −4.1%) / +48.8% / +72.9% / +113.2%**. Same paragraph says GF+8's verification reads "селектор живой; референса нет"; the table entry is "1,024/1,024 ✓" (`:1262`) |
| Mixed-width scale summary | `:1099-1110` | Captioned "при 16-битных компонентах"; плаcтическое 228/231.21, r⁴ 469/184.98 | Those two cells are **32-bit**, copied from `:1189-1190`. 16-bit plastic is **186/318.47** (`:952`); no 16-bit degree-4 measurement exists, so that row must be blanked with `---`. Three consequences: the caption's "ровно одного сложения" is contradicted (+53% vs the true +25%); plastic reads slowest at 231.21 when at 16 bits it is fastest at 318.47, ahead of φ's 307.69; the r⁴ row reads 3.15× φ against the article's own 2.1× at `:1192` |
| Equal-storage vs IEEE half | `:1629-1640` | TNF32 listed at **+13.2%** (5-seed range 0.1137–0.1243), unflagged | TNF32 is withdrawn for the exponent-window wrap defect at `:1596`/`:1607` and again at `:1699`. A 32-bit format inside a table headed "при равном или почти равном хранении" against binary16 |
| TNF16c margin recall | `:1582` | "+12.5%" | Article's own 5-seed figure is **+11.3%** (`:1638`, range 0.1118–0.1210), corroborated by `:1507` (0.1157/0.1039 = +11.4%). +12.5% is reachable only by mixing estimators (median vs range midpoint 0.1028) |
| Taper slopes | `:162`, `:167`, `:179`, `:190` | posit16: −0.254 (table), 0.261 (prose, R²=0.999), −0.2497. posit32: 0.247, −0.2505 | One quantity, defined at `:150` as dM_eff/d\|e\|. `:167` is provably reading `:162` (takum16 0.113 matches exactly). Corollary 3 at `:206` forecloses the fit-window excuse. The audit at `:2101` flags 0.247 as "измеренный здесь же … как 0,260" — 0.260 appears only in that audit cell |
| Bin tables vs ladder | `:251-253`, `:267-268`, `:281` | GF16 far bin 6.98e-3 (478 обрезано) and 6.76e-3 (478); TNF16 3.56/3.52/3.53 and 3.45/3.69/3.66 | Identical overflow count proves one sample set; the whole GF16 row disagrees (3.43/3.57 vs 3.56/3.52). Far-bin ratio vs takum16 printed 5.53× (`:253`), 5.49× (`:447`), 5.46× (`:440`), while `:449` claims all such ratios come from one script at one seed |
| int8 vs GFTernary | `:1396`, `:1400`, `:2406-2408` | `:1396` 454 LUT/78.83 MHz/**0.1736**, разброс 11.00; `:1400` **0.180 vs 0.181**, "неразличимы", разброс 16%; erratum: 0.1736 vs 0.1584 = **+9.60% для int8** | 0.180 and 0.181 appear nowhere else in the article or repo. GFTernary is 0.1584 in both the 5-seed (`:1245`) and 54-seed (`:1572`) tables. The document simultaneously says indistinguishable and int8-wins-by-9.6%. `:758` propagates the indistinguishability claim; `:1907` denies only the retracted 7% figure. The erratum's self-pointer "Строка 1369" is stale (numbers are at `:1396`) |
| Catalogue size | `:1270`, `:1613`, `:1617-1625`, `:1731-1756`, `:1774-1777`, `:2396` | 19 / 21 / 28 / 24 / 23 then 22 / 24 | Both catalogue tables have exactly **24** data rows over identical format names. Band 3 defined as "от fp8 e4m3 до GF+8" spans 16 rows, not the stated 20 |
| Staircase taxonomy | `:214` vs `:218-223` | 83 − 11 − 18 − 1 = **53** classifiable | Table sums 38+3+5+8 = **54** |
| Well-posedness | `:1830` vs `:1846` | posit32 divergences: **36** (table) / **48** (prose) | Same unreachable `casez` branch, same 40,000-code sample. Both entered in `9f54b0437`; the correct value is not determined by any file under `conformance/`, `research/` or `fpga/`. The parallel posit16 entry (4 in both `:1829` and `:1838`) shows the two must agree |
| Toolchain declaration | `:2288-2292`, `:1328` | Yosys 0.65, nextpnr-xilinx 1743d0f | Bench measured 2026-08-18: **Yosys 0.63 (`70a11c6b`), nextpnr `c32135b0`** (`:307-313`). The 2026-08-13 FPGA block at `:2477-2480` independently reports Yosys 0.63 / nextpnr `e4a261c` / Python 3.14.6. One declaration in 3 places, contradicted by 2 dated bench observations that differ from each other |
| Five-spec silicon | `:2782-2788` | ternary_link 118/16, e8m0 98/56, tnf17 86/16, phi_weights 86/16, ternary_node 92/16 | All five are even and inside the T504 doubling window. Halved they land one-to-one on T536's "IN WRAPPER" column: 59/8, 49/28, 43/8, 43/8, 46/8 (`IGLA-FORMAL-RESULTS.md:21758`). `ternary_node` at 46/8 is the one wrapper T536 proved had discarded its datapath (DUT alone needs 66 LUT / 24 CARRY4); T537 repaired it to **146/40** (`:21796`). The claim at `:2790` that zero DSP excludes the openXC7 defect class is contradicted by T616-T619 |
| Fan-in / MI | `:2753-2758` | "Монотонно по пяти датасетам"; mechanism "[измерено]"; form "не измерена" | All three overtaken by T484, T485, T483 (see §3) |

### In the publication docs

| Table | Line | What it says now | Current |
|---|---|---|---|
| `docs/PUBLICATION_AUDIT.md` row "Repro smoke bundle" | `:23` | Next action: add `rust-toolchain.toml` | File still absent |
| `docs/PUBLICATION_AUDIT.md` row 23 | `:26` | `docs/LANGUAGE_SPEC.md`, Ready? No | Path does not exist; file is `docs/nona-02-organism/LANGUAGE_SPEC.md` |
| `docs/PUBLICATION_AUDIT.md:53-58` W845 banner | `:57` | "2,863 lines, 95 sections, 70 tables, 93 status tags, 32 distinct theorem citations" | 2,890 lines; 101 status tags; 70 tables confirmed; the "32" is a raw `T<number>` regex count including `GF-T8`, `GF-T16`, and pin names `T14`/`T15` — **23** distinct theorem ids |
| `docs/PUBLICATION_AUDIT.md:97` Blocker 3 | `:97` | "The article also carries no retractions section" | The article carries `# ЭРРАТУМ 2026-08-13` at `:2385` and a retraction-methodology section at `:2023` |
| `docs/PUBLICATION_QUEUE.md:13-16` | all 4 rows | Issue = `*open publication-task*`, DOI = `none` | No issue number was ever filled in, against the rule at `:22`. All TNF commits carry `Refs #1959`, which the repo's Issue Gate does not treat as closing |
| `docs/reports/tnf-sweep/2026-08-14-local-cost-sweep.md:41` and `:74-75` | body | 104-arm yosys LUT counts; E_t coefficient +330.0 / +393.2 | `docs/reports/PARSER-AUDIT-W719.md` proved these inflated **×4.00**; the same file's Addendum 3 (`:270`) silently prints the corrected **+127.5** without flagging the disagreement |
| Same file, `:193-197` | pre→post ratio | "1.0%–12.7%, mean 6.6%" below the yosys count | Withdrawn as backwards by T234a: placed LUT runs **74.7–98.1% above** the corrected yosys count |
| `.claude/skills/tnf-gfternary.md:603` | GA-T line | 1692 / 1371 / 1878 / 2349 / 2796 LUT | T234 corrected these to **564 / 457 / 626 / 783 / 932** (factor 3.00×, `IGLA-FORMAL-RESULTS.md:12392`). Skill last committed 2026-08-17 (`cf185dfb6`), three days after the audit, with no mention of W719 or T234 |
| `docs/reports/tnf-sweep/2026-08-14-post-route.tsv` | all rows | 7 unlabelled numeric columns | No header, date, tool version, part, or seed. Column 3 is the ×2-inflated yosys LUT; column 4 is the sound placed LUT; nothing distinguishes them (row 1: 1214 is double-counted, true 607; 1163 beside it is sound). Column 6 (557.4–1157.4 MHz) is unnamed, unused, and not a credible design F_max for an XC7A200T |
| `docs/reports/tnf-sweep/2026-08-14-post-route-ci-flags.tsv:1` | line 1 | A stray `grep -n` fragment showing line 20 of the driver script | Not data; breaks any TSV parse (20 data rows follow, naive readers get 21). It is simultaneously the only in-file record of the synthesis command |

---

## 5. NOT ESTABLISHED

- **Which posit32 divergence count is right, 36 or 48.** No file under `conformance/`, `research/` or `fpga/` records either. Both entered in the same commit, so neither is stale relative to the other.
- **Whether the toolchain difference between the two dated bench observations (nextpnr `e4a261c` on 2026-08-13, `c32135b0` on 2026-08-18) is an error or a legitimate rebuild.** No commit record ties either to a build.
- **What the TNF16 multiplier actually costs.** 212, 219 and 372 LUT are all published for the same rung; nothing in the repo adjudicates.
- **Whether the 15% seed spread cited in the 2026-08-18 provenance note (`:326-342`) applies to the ladder table's rows.** That spread was measured on a different, much slower netlist (15.83→18.29 MHz), and `:1241` reports a pooled seed CV of 3.71% on the throughput bench. The two are in tension and neither was re-measured on the ladder.
- **The absolute LUT overhead of the post-route harness.** `experiments/gfternary-line/tnf_postroute_wrap.py:10-13` asserts it is identical across arms and cancels in first differences; nothing measures it, and the file deliberately never reports it.
- **Whether `t27c silicon`'s five-spec figures can be reproduced.** The parser fix committed in W719 to `experiments/gfternary-line/run_ladder.sh:26-32` does not compile (IndentationError in the embedded Python heredoc), and `pnr.sh:42-43` still carries the original un-fixed `re.findall` over the whole log. All corrections to date were arithmetic rescalings; no artefact was regenerated.
- **Whether the raw 104-arm dataset can be recovered.** `yosys.tsv`, named at `docs/reports/tnf-sweep/2026-08-14-local-cost-sweep.md:133` as the evidence for Q1, Q2, the E_t finding and the DSP48E1 result, does not exist anywhere in the repository. Three of the record's four other provenance anchors are also unresolvable: `fpga/openxc7-synth/gen/gen_tnf_cost_sweep.py` (no `gen/` directory), `.github/workflows/tnf-cost-sweep.yml` (absent), and commit `9ce0d1129da5…` (`git cat-file` returns "could not get object info").
- **The mechanism behind the seed-dependent verdict flip.** `IGLA-FORMAL-RESULTS.md:23746` (T605a) records arithmetic excluded by proof and Icarus, timing excluded by measurement, the effect reproduced across 3 designs / 2 arithmetic forms / 2 boards / 2 loads, and the mechanism not identified. T628 (`:24251`) notes the passing-vs-failing FASM diff has not been taken.
- **Whether `t27c silicon` figures for tnf17, phi_weights and ternary_link would survive a three-seed re-run.** Not attempted; only their timing margins were measured.

---

*phi^2 + phi^-2 = 3 | TRINITY*
