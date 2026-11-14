# TNF article -- reconciliation against W778-W788

**Status: the article is written and the week that just passed contradicts parts of it.**
`docs/theory/TNF_ARTICLE_RU.md`, 2,687 lines, ~55 sections. This file lists what must
change and which measurement forces each change. It is an audit, not a rewrite.

Generated 2026-08-17 (W788). Every theorem cited is in `docs/theory/IGLA-FORMAL-RESULTS.md`.

> ## ЧАСТИЧНО УСТАРЕЛ — прочитан заново 2026-08-18 (W845)
>
> Между W788 и сегодняшним днём прошло **пятьдесят семь витков**, и три пункта
> этого документа больше не описывают положение дел.
>
> **§0.3 «status tags ... Count in the article: zero» — неверно.** В статье
> **93** тега `[доказано]/[измерено]/[смоделировано]/[открытая гипотеза]`;
> их внесли коммитом того же дня. Пункт §0.2 (**нет раздела ретракций**) стоит:
> проверено, ноль.
>
> **§4 «Any claim resting on the connectivity thread ... None may appear until
> re-run» — линия перезапущена и разрешена.** T479 прогнал пять интервенций на
> Fashion, T480 — на MNIST. **T479a**: две интервенции, на которых стояла эта
> линия (сбалансированное покрытие T439, глубина T450), значимо положительны на
> Fashion и отрицательны на UNSW. **T479b** называет три утверждения, переживших
> три задачи. Но **шесть теорем (T430, T431, T432, T439, T443, T446) по-прежнему
> процитированы в статье по разу каждая** и не пересобраны под этот результат.
>
> **§0.1 «No theorem from T403-T457 appears in it» — разрыв вырос.** Статья
> цитирует 32 теоремы, максимальная — **T482**. Файл результатов дошёл до
> **T628a**. Появилась и новая, тяжёлая для статьи группа: **T616/T619a** —
> place-and-route на этом стенде не сохраняет функцию, и кремниевый вердикт с
> одного размещения перестал считаться результатом. Кремниевая таблица статьи
> снята с одного размещения.
>
> Три блокера перечислены в `docs/PUBLICATION_AUDIT.md` §W845, куда статья
> внесена — **до W845 её не было ни в одной таблице публикации**.

---

## 0. Three facts about the article as it stands

1. **No theorem from T403-T457 appears in it.** It predates every result of W778-W788.
2. **It carries no retractions section.** A draft abstract in scratch
   (`abstract_tnf9.tex`) speaks of "twenty-three retractions"; the Russian article has none.
3. **It carries no status tags.** The tri-net handoff rule requires
   `[доказано] / [измерено] / [смоделировано] / [открытая гипотеза]` on every claim.
   Count in the article: **zero**.

---

## 1. What SURVIVES untouched, and should lead

| article claim | status | why it survives |
|---|---|---|
| Closure: `Z[φ]` is closed under weight application because `φ²=φ+1` | **[доказано]** | algebra, machine-checked in Coq per the article |
| Multiplier-free scales are exactly the algebraic integers whose companion matrix has entries in `{0,±1}`; degree 2 admits φ alone | **[доказано]** | an enumeration, and nothing this week touched it |
| The accumulator is the only site that needs a float | **[доказано]** | restated by T437a for a shared block scale |
| The width law: once range is named, the exponent/mantissa split is determined | **[измерено]** | untouched |
| 83-format catalogue resolves to four staircase forms | **[измерено]** | T405 ran the same catalogue through a different sieve and did not contradict it |

**These are the article's spine and the week did not bend it.**

---

## 2. What must be RE-SCOPED, with the measurement that forces it

| article claim | forcing result | required change |
|---|---|---|
| "оптимум сползает вниз по иерархии: сдвиг на трёх битах, φ на четырёх, пластическое на пяти" | **T442**: every integer ladder with ≥2 magnitudes fails non-dominance, at every size; **T444**: over all 1156 admissible nine-level integer alphabets the optimum is `linear 9 = {0,±1,±2,±3,±4}`, rank 1 strictly | The ladder optimum is a **representation** claim. Say so explicitly, and add that in a **fan-in-3 truth-table datapath** the ranking is different and enumerated. |
| φ carries the interlayer scale the unit alphabet must learn | **T406**: `{0,±φ}` is single-lane because φ factors out as a common scale -- so does any `{0,±c}`. **T293/S3**: mixing powers of φ forces a two-lane resolve at 8 DSP48E1 or ~2750 LUT | The advantage is real **for one magnitude** and reverses **for a ladder**. State the split. |
| alphabet cardinality is a major accuracy lever | **T447**: measured on a normalised stand, 3→9 levels is **+0.26/+0.28 pp**, not +0.844 -- ~70 % of the published effect was a fixed-threshold trainer artefact | Restate the number. **T288's Nine-Rung Law is downgraded from law to measurement** (holds on Fashion, breaks on UNSW at 13 levels by +0.14 pp). |
| smaller alphabets are cheaper in silicon | **T448**: post-route, ternary `{0,±1}` costs **137 SLICE_LUTX** against dyadic-9's **137** and linear-9's **128**. A truth table is `2^(fanin×bits)` rows whatever the alphabet | **Cardinality is free in a table datapath** and costs only in an adder tree (T398: 203 vs 103). This is a section, not a footnote. |

---

## 3. What must be ADDED, because it is new and it is ours

| result | tag | one line |
|---|---|---|
| **T444** | **[доказано]** for the enumeration, **[измерено]** for the metric | `linear 9` is rank 1 of **1156** admissible nine-level integer alphabets; the bound is shown not to bind, so the optimum is global |
| **T442** | **[доказано]** | no integer ladder of ≥2 magnitudes clears non-dominance, at any size; exhaustive over `b∈[2,12]`, `k∈[2,12]`, margin exactly +1 at `b=2` |
| **T410 / T455** | **[измерено]** | junta degree → LUT area, slope **+151 LUT per unit**, 95 % CI **[+139,+189]**, Spearman **+1.000**, `n=5`, **at L=8**; the relation does **not** resolve at L=4 |
| **T413c / T456** | **[измерено]** | two independent trainer defects, each of which **reordered** arms rather than lowering them -- a fixed threshold (`r` flipped −0.971 → +0.956) and a one-class validation split (connectivity ordering reversed) |
| **T454** | **[измерено]** | twelve input bits cost **3.75×** six post-route on a layer, not the 20-27× implied by per-neuron figures |

---

## 4. What must be REMOVED or held back

- **Any claim resting on the connectivity thread.** T430, T431, T432, T439, T443, T446
  were all measured under the one-class validation split and their ordering **reverses**
  when it is fixed (T456). None may appear until re-run.
- **Correlation coefficients as evidence.** T424: every `r` in this line is over 5-7 arms
  *constructed* to vary in the predictor. Report slopes with intervals (§3).
- **"Effective fan-in"** as a coined term. It is ODIN's (arXiv:1804.07858) for accumulator
  depth. Use **junta degree** / **dictator** / **linear threshold function** -- O'Donnell.

---

## 5. Prior art that must be cited, and was not

| claim in the article | who owns it |
|---|---|
| a neuron of ≤6 input bits costs ~2 LUT | **LogicNets**, arXiv:2004.03021 (their own NID configs run at **14** bits) |
| one weight dominating the rest collapses the function onto it | **Servedio**, critical-index / head-tail decomposition, arXiv:0902.3757 |
| the constant `x³=x²+x+1` | **OEIS A058265**, tribonacci |
| PoT quantisation has "rigid resolution" | **APoT**, Li/Dong/Wang ICLR 2020, arXiv:1909.13144 |
| BatchNorm folds into a threshold | **FINN** §4.2.2, arXiv:1612.07119; **TWN** arXiv:1605.04711 |
| per-LUT input count learned for area | **Logic Shrinkage**, 10.1145/3583075 |

---

## 6. The honest headline the article can defend

Not *"our format is better"* -- this project refuted that itself (T447, T448, T442).

> **A methods paper**: low-precision benchmarks manufacture orderings that do not exist.
> Two independent trainer defects are demonstrated, each reversing the sign of a reported
> effect; parity with the published field is reached by removing them rather than by any
> architectural change (**T456b**: 4.76 pp against SparseLUT's 4.79). The alphabet work is
> reported as the negative result it is, with an exhaustive optimum (**T444**) and a
> measured area law (**T455**) as the constructive contributions.

---

*φ² + φ⁻² = 3 | TRINITY*
