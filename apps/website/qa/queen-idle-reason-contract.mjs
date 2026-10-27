// Queen idle-reason contract. BEES read 0/4 on 2026-09-15 and the owner asked
// why the bees were broken: the swarm was healthy_idle and the last round said
// "nothing to choose" - 449 of 488 candidates had no ## Boundary. The status
// the page already fetched carried the reason; the HUD did not say it. This
// runs the pure reader and formatter on real /queen/status snapshots
// (qa/fixtures/queen-status), on a round built from queend's own sentences and
// on malformed ones, then checks the page uses them. Pure, no browser. Node 22
// needs --experimental-strip-types. The layout is qa/queen-idle-layout-contract.mjs.
import { readFileSync } from "node:fs";
import { idleLine, idleReason, skipCounts } from "../src/components/queenHud.ts";

const fails = [];
let checks = 0;
const check = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/queen-status/${name}`, import.meta.url), "utf8"));
const at = (status, seconds) => Date.parse(status.lastTick.decidedAt) + seconds * 1000;
const clone = (value) => structuredClone(value);

const EN = {
  idle: "idle", nothingToChoose: "nothing to choose", refused: "round refused", checked: "checked",
  stale: "round stale", staleDetail: "last decision {age} ago, rounds every {interval}",
  unitS: "s", unitMin: "min", unitH: "h",
  reasons: { missingBoundary: "no ## Boundary", claimed: "claimed", completed: "done but open", fileConflict: "touch held files", notFirst: "not first", other: "other" },
};
const RU = {
  idle: "свободно", nothingToChoose: "нечего выбрать", refused: "раунд отказал", checked: "проверено",
  stale: "раунд устарел", staleDetail: "последнее решение {age} назад, раунды каждые {interval}",
  unitS: "с", unitMin: "мин", unitH: "ч",
  reasons: { missingBoundary: "без ## Boundary", claimed: "заняты", completed: "сделаны и не закрыты", fileConflict: "задевают занятые файлы", notFirst: "не первые", other: "прочие" },
};
const line = (status, nowMs, words = EN) => { const r = idleReason(status, nowMs); return r ? idleLine(r, words) : null; };
// No count is followed by a word, so none has to agree with one (21 задача, 3 задачи, 1 issue).
const agreesWithNothing = (tail) => !/\d+ [A-Za-zА-яЁё]/.test(tail ?? "");

// 1. the real healthy_idle snapshot: every number comes from the file
const idle = fixture("healthy-idle-2026-09-15T1250Z.json");
const t = idle.lastTick, sum = t.skipSummary, free = idle.workers.capacity - idle.workers.active;
const en = line(idle, at(idle, 60));
check(en !== null && en.text === `${free} idle: nothing to choose — checked: ${t.skippedCount}; no ## Boundary: ${sum.missingBoundary.count}, done but open: ${sum.completed.count}, claimed: ${sum.claimed.count}`, `healthy_idle (en): the refusal, how many were checked, then the three reasons by size, numbers from the wire (got "${en?.text}")`);
check(en?.text === "4 idle: nothing to choose — checked: 488; no ## Boundary: 449, done but open: 27, claimed: 12", `healthy_idle (en) literal, so a reader sees the sentence the owner will see (got "${en?.text}")`);
check(en?.head === "4 idle: nothing to choose" && en?.example === true, "healthy_idle: the tile's short head is the free count and the refusal; 449 without a boundary, so the format example is offered");
const ru = line(idle, at(idle, 60), RU);
check(ru?.text === "4 свободно: нечего выбрать — проверено: 488; без ## Boundary: 449, сделаны и не закрыты: 27, заняты: 12", `healthy_idle (ru) (got "${ru?.text}")`);
check(!/\d/.test(JSON.stringify(EN) + JSON.stringify(RU)) && !/[А-яЁё]/.test(en?.text ?? ""), "no digit lives in the copy, no Cyrillic leaks into English");
check(agreesWithNothing(en?.tail) && agreesWithNothing(ru?.tail), "healthy_idle: every count stands after its label");

// 2. working snapshots: the round dispatched, so there is no idle line
const working = fixture("working-2026-09-15T1400Z.json");
const cap12 = fixture("working-capacity12-2026-09-15T1533Z.json");
check(line(working, at(working, 60)) === null, "working (allowed, 2 of 4 busy): no idle line");
check(line(cap12, at(cap12, 60)) === null, "working (allowed, capacity 12): no idle line");
// a real snapshot where one bee works and the round still refused: three slots are idle and it says why
const busyRefused = fixture("working-refused-2026-09-15T1350Z.json");
check(line(busyRefused, at(busyRefused, 60))?.text === "3 idle: nothing to choose — checked: 487; no ## Boundary: 448, done but open: 27, claimed: 12", `1 of 4 busy, round refused: the three idle slots are explained (got "${line(busyRefused, at(busyRefused, 60))?.text}")`);

// 3. a round built from queend's own sentences (main.swift, choose) and filed as
// the server files them (queen-public-status.ts, classifySkipReason). An issue
// with a boundary but an incomplete spec gets TWO lines: "delegatable but ..."
// and, since the round chose nothing, " held by ...". skippedCount counts lines.
const file = (l) => l.includes(" held by ") ? "fileConflict"
  : /a worker already has it|claimed, but no worker is attached yet|spoken for by a task with no recorded state|so it is finished or waiting on you/.test(l) ? "claimed"
  : l.includes("the work already landed") ? "completed"
  : l.includes("no issue body was supplied") ? "missingBoundary"
  : l.includes("delegatable but") ? "incompleteSpec"
  : /not yet a spec|declares no boundary/.test(l) ? "missingBoundary"
  : l.includes("not first") ? "notFirst" : "other";
const refusedRound = ({ unbounded, claimed, done, heldIncomplete, heldExtra = 0 }) => {
  const lines = []; let n = 1000;
  for (let i = 0; i < unbounded; i++) lines.push(`#${n++}: not yet a spec - missing boundary, requirements`);
  for (let i = 0; i < claimed; i++) lines.push(`#${n++}: a worker already has it (running)`);
  for (let i = 0; i < done; i++) lines.push(`#${n++}: the work already landed (merged) - the issue is open and nobody closed it`);
  for (let i = 0; i < heldIncomplete; i++) { const k = n++; lines.push(`#${k}: delegatable but not yet a spec - missing success criteria`); lines.push(`#${k}: rings/SR-00/A.swift held by gHashTag/trios#1286`); }
  const s = clone(idle); const summary = {};
  for (const l of lines) { const c = file(l); summary[c] = { count: (summary[c]?.count ?? 0) + 1 }; }
  for (let i = 0; i < heldExtra; i++) summary.incompleteSpec.count += 1, lines.push("#9: delegatable but (contradiction)");
  s.lastTick.skippedCount = lines.length; s.lastTick.skipSummary = summary;
  return { status: s, issues: unbounded + claimed + done + heldIncomplete };
};
const twoLine = refusedRound({ unbounded: 400, claimed: 12, done: 27, heldIncomplete: 30 });
const tl = line(twoLine.status, at(twoLine.status, 60));
check(twoLine.status.lastTick.skippedCount === 499 && twoLine.issues === 469, "the built round: 499 skip lines for 469 issues");
check(tl?.text === "4 idle: nothing to choose — checked: 469; no ## Boundary: 400, touch held files: 30, done but open: 27", `incompleteSpec is no reason (it never blocks) and not a second issue: checked 469, not 499 (got "${tl?.text}")`);
const tlRu = line(twoLine.status, at(twoLine.status, 60), RU);
check(tlRu?.text === "4 свободно: нечего выбрать — проверено: 469; без ## Boundary: 400, задевают занятые файлы: 30, сделаны и не закрыты: 27" && !/неполн|incomplete/.test(tl.text + tlRu.text), `the same in Russian, and no word for an incomplete spec in either (got "${tlRu?.text}")`);
const bigHeld = refusedRound({ unbounded: 72, claimed: 12, done: 15, heldIncomplete: 200 });
check(line(bigHeld.status, at(bigHeld.status, 60))?.text === "4 idle: nothing to choose — checked: 299; touch held files: 200, no ## Boundary: 72, done but open: 15", `200 held and incomplete: named once, as held files (got "${line(bigHeld.status, at(bigHeld.status, 60))?.text}")`);
const contradicts = refusedRound({ unbounded: 400, claimed: 12, done: 27, heldIncomplete: 30, heldExtra: 1 });
check(line(contradicts.status, at(contradicts.status, 60))?.text === "4 idle: nothing to choose", "more incompleteSpec than fileConflict lines in a round that chose nothing contradicts queend: the refusal alone");

// 4. counts of 1, 21 and 3 in both languages: labels first, so nothing to decline
const small = clone(idle);
small.lastTick.skippedCount = 25;
small.lastTick.skipSummary = { claimed: { count: 1 }, completed: { count: 3 }, missingBoundary: { count: 21 } };
const smallEn = line(small, at(small, 60)), smallRu = line(small, at(small, 60), RU);
check(smallEn?.text === "4 idle: nothing to choose — checked: 25; no ## Boundary: 21, done but open: 3, claimed: 1", `1, 21 and 3 in English (got "${smallEn?.text}")`);
check(smallRu?.text === "4 свободно: нечего выбрать — проверено: 25; без ## Boundary: 21, сделаны и не закрыты: 3, заняты: 1", `1, 21 and 3 in Russian (got "${smallRu?.text}")`);
check(agreesWithNothing(smallEn?.tail) && agreesWithNothing(smallRu?.tail), "1, 21 and 3: no count followed by a word in either language");

// 5. staleness: older than two intervals says the round is stale, never the reasons
check(line(idle, at(idle, 600))?.head === "4 idle: nothing to choose", "exactly two intervals old is still fresh (the server's own bound)");
const stale = line(idle, at(idle, 601));
check(stale?.text === "4 idle: round stale — last decision 10 min ago, rounds every 5 min" && stale.example === false, `601 s past a 300 s round: stale, no reasons (got "${stale?.text}")`);
check(line(idle, at(idle, 11 * 3600 + 5), RU)?.text === "4 свободно: раунд устарел — последнее решение 11 ч назад, раунды каждые 5 мин", "stale in Russian, hours");
check(line(cap12, at(cap12, 3600))?.text === "11 idle: round stale — last decision 60 min ago, rounds every 5 min", "a stale ALLOW with idle slots is stale too: its dispatch is no longer news");
check(line(idle, at(idle, 90))?.text.startsWith("4 idle: nothing to choose") && line(idle, at(idle, -30)) !== null, "a tick a little in the future (clock skew) is fresh, not negative");

// 6. missing or malformed skipSummary: the refusal alone, no fabricated zeros, no example
const without = (mutate) => { const s = clone(idle); mutate(s); return line(s, at(s, 60)); };
const bare = "4 idle: nothing to choose";
for (const [label, mutate] of [
  ["absent", (s) => { delete s.lastTick.skipSummary; }],
  ["null", (s) => { s.lastTick.skipSummary = null; }],
  ["a string", (s) => { s.lastTick.skipSummary = "449 missing"; }],
  ["an array", (s) => { s.lastTick.skipSummary = [449, 12, 27]; }],
  ["a count as text", (s) => { s.lastTick.skipSummary.claimed.count = "12"; }],
  ["a negative count", (s) => { s.lastTick.skipSummary.missingBoundary.count = -1; }],
  ["a fractional count", (s) => { s.lastTick.skipSummary.completed.count = 27.5; }],
  ["an entry without count", (s) => { s.lastTick.skipSummary.claimed = { issues: [1] }; }],
  ["a count above skippedCount", (s) => { s.lastTick.skipSummary.missingBoundary.count = 489; }],
  ["counts summing past skippedCount (449 three times of 488)", (s) => { s.lastTick.skipSummary.claimed.count = 449; s.lastTick.skipSummary.completed.count = 449; }],
  ["counts summing short of skippedCount", (s) => { s.lastTick.skipSummary.missingBoundary.count = 400; }],
  ["empty", (s) => { s.lastTick.skipSummary = {}; }],
  ["all zero", (s) => { s.lastTick.skipSummary = { claimed: { count: 0, issues: [], more: 0 } }; }],
]) {
  const got = without(mutate);
  check(got?.text === bare && got.tail === null && got.example === false, `skipSummary ${label}: "${bare}", nothing about reasons, no example (got "${got?.text}")`);
}
check(without((s) => { delete s.lastTick.skippedCount; })?.text === "4 idle: nothing to choose — no ## Boundary: 449, done but open: 27, claimed: 12", "no skippedCount: the counts stand, no 'checked' is invented");
const alien = without((s) => { s.lastTick.skipSummary = { claimed: { count: 12 }, toString: { count: 449 }, completed: { count: 27 } }; });
check(alien?.text === "4 idle: nothing to choose — checked: 488; other: 449, done but open: 27, claimed: 12" && alien.example === false, `a key outside the server's closed set is "other", never words made from its name, and offers no format example (got "${alien?.text}")`);
const noBoundary = without((s) => { s.lastTick.skippedCount = 39; s.lastTick.skipSummary = { claimed: { count: 12 }, completed: { count: 27 } }; });
check(noBoundary?.text === "4 idle: nothing to choose — checked: 39; done but open: 27, claimed: 12" && noBoundary.example === false, "every candidate bounded but claimed or done: no format example, since no boundary is missing");
check(skipCounts({ claimed: 17, completed: 6, missingBoundary: 2, fileConflict: 1, incompleteSpec: 1, notFirst: 6 }, 33)?.map((r) => `${r.key}=${r.count}`).join(",") === "claimed=17,completed=6,missingBoundary=2,fileConflict=1,incompleteSpec=1,notFirst=6", "the older wire shape (bare numbers) reads as the same counts, in wire order");
check(skipCounts({ claimed: 17, missingBoundary: 2 }, 33) === null && skipCounts({ claimed: 17, missingBoundary: 2 })?.length === 2, "counts that do not sum to skippedCount are null; with no skippedCount there is nothing to sum against");
check(skipCounts(idle.lastTick.skipSummary, 488)?.map((r) => r.count).join(",") === "12,27,449" && skipCounts(undefined) === null && skipCounts({ x: { count: 1 } }, 0) === null, "skipCounts: wire order; absent or contradictory is null");
check(skipCounts({ oddNewReason: { count: 1 }, claimed: { count: 4 }, other: { count: 2 } }, 7)?.map((r) => `${r.key}=${r.count}`).join(",") === "other=3,claimed=4", "unknown keys fold into one 'other', at the place the first of them stood");
const many = clone(idle);
many.lastTick.skippedCount = 124;
many.lastTick.skipSummary = { claimed: { count: 40 }, other: { count: 0 }, fileConflict: { count: 40 }, oddNewReason: { count: 41 }, missingBoundary: { count: 3 } };
const manyLine = line(many, at(many, 60));
check(manyLine?.tail === "checked: 124; other: 41, claimed: 40, touch held files: 40" && manyLine.example === true, `only the three largest, ties in wire order; 3 without a boundary still offer the format example (got "${manyLine?.tail}")`);

// 7. other refusals: the refusal text itself in the line, a short word in the tile
const refusing = (refusal, workers) => { const s = clone(idle); s.lastTick.refusal = refusal; if (workers) s.workers = { ...s.workers, ...workers }; return line(s, at(s, 60)); };
const mirror = refusing("no registry mirror published yet");
check(mirror?.text === "4 idle: no registry mirror published yet" && mirror.head === "4 idle: round refused", "no registry mirror: verbatim in the line, 'round refused' in the tile");
const capacity = refusing("4 workers already running (limit 4)", { capacity: 12, active: 4 });
check(capacity?.text === "8 idle: 4 workers already running (limit 4)" && capacity.tail === null && capacity.example === false, `the policy limit under a larger capacity: verbatim, eight slots idle (got "${capacity?.text}")`);
const dailyCap = "the swarm has spent about $41.20 today, $21.20 past its $20.00 daily limit (raise it with TRIOS_DAILY_USD_CAP)";
const cap = refusing(dailyCap);
check(cap?.text === `4 idle: ${dailyCap}` && cap.head === "4 idle: round refused" && cap.head.length < 30, "a long refusal stays whole in the line and title; the tile's head stays short, so its two-line clamp cuts nothing");
const s1 = clone(idle); s1.lastTick.refusal = "daily cap reached: $20.00 of $20.00";
const s1Ru = line(s1, at(s1, 60), RU);
check(s1Ru?.text === "4 свободно: daily cap reached: $20.00 of $20.00" && s1Ru.head === "4 свободно: раунд отказал", "the daily cap in Russian: the wire's words, not a translation guessed from them");

// 8. nothing to explain, or nothing trustworthy to explain it with
const gate = (mutate) => { const s = clone(idle); mutate(s); return line(s, at(idle, 60)); };
for (const [label, value] of [
  ["null status", line(null, 0)], ["a string status", line("ok", 0)], ["an empty object", line({}, 0)],
  ["no lastTick", gate((s) => { s.lastTick = null; })],
  ["an undatable decidedAt", gate((s) => { s.lastTick.decidedAt = "yesterday"; })],
  ["allowed not a boolean", gate((s) => { s.lastTick.allowed = "false"; })],
  ["a refusal of null", gate((s) => { s.lastTick.refusal = null; })],
  ["an empty refusal", gate((s) => { s.lastTick.refusal = "  "; })],
  ["the scheduler off", gate((s) => { s.scheduler.enabled = false; })],
  ["no interval", gate((s) => { s.scheduler.intervalSeconds = 0; })],
  ["no workers", gate((s) => { delete s.workers; })],
  ["workers as text", gate((s) => { s.workers.capacity = "4"; })],
  ["every slot busy", gate((s) => { s.workers.active = 4; })],
  ["no capacity", gate((s) => { s.workers = { capacity: 0, active: 0, idle: 0, utilization: 0 }; })],
]) check(value === null, `${label}: no line`);

// 9. the page: a live read only, one response for the tile, the words above
const src = readFileSync(new URL("../src/pages/Queen.tsx", import.meta.url), "utf8");
check(/const isLive = state\.kind === "ready";/.test(src) && /const idleNow = isLive \? idleReason\(data, now \+ \(state\.offsetMs \?\? 0\)\) : null;/.test(src) && /idleLine\(/.test(src), "Queen.tsx reads the idle reason only from a live status (a kept copy after a failed fetch says nothing), on the server's clock");
check((src.match(/idleReason\(/g) || []).length === 1, "no second, ungated call of idleReason");
// The exemplar URL moved to src/lib/queenApi.ts when a second surface (the
// homepage's DIRECT card) started pointing at the same issue: a literal copied
// into two files is one that has moved in one of them. The check follows it
// rather than loosening — the page must still render it behind
// idleWhy.example, and the constant it renders must still be that issue.
const api = readFileSync(new URL("../src/lib/queenApi.ts", import.meta.url), "utf8");
// The reason stopped being a line floating over the map on 2026-09-20 and became
// the BEES tile's sub-line, where the same head was already printed; the element
// is queen27-hud-idle-why, the whole sentence is its title, and the format
// example is the head made a link. qa/queen-idle-layout-contract.mjs holds it
// there and proves nothing floats over the map's controls any more.
check(/className="queen27-hud-idle-why"/.test(src) && !/className="queen27-hud-idle"/.test(src) && /idleWhy\?\.example \? \(/.test(src) && /href=\{BOUNDARY_EXAMPLE_ISSUE\}/.test(src), "the reason is the BEES tile's sub-line, and nothing floats over the map; the format example is behind idleWhy.example");
check(/title=\{idleWhy\?\.example \? `\$\{idleWhy\.text\} · \$\{c\.idleExample\}` : idleWhy\?\.text\}/.test(src), "the whole sentence stays on the tile, for hover and for a screen reader");
check(/import \{[^}]*BOUNDARY_EXAMPLE_ISSUE[^}]*\} from "\.\.\/lib\/queenApi";/.test(src), "the page takes the exemplar from lib/queenApi rather than carrying its own copy");
check(/export const BOUNDARY_EXAMPLE_ISSUE = "https:\/\/github\.com\/gHashTag\/t27\/issues\/3587";/.test(api), "lib/queenApi names the exemplar issue, and it is the one this contract was written about");
check(/idleExample:\s*"an issue written the way bees can take it"/.test(src) && /idleExample:\s*"задача в формате, который пчёлы берут"/.test(src), "the link is labelled as a format, not as an issue bees can take now, in both languages");
check(/idleRefused:\s*"round refused"/.test(src) && /idleRefused:\s*"раунд отказал"/.test(src) && /idleChecked:\s*"checked"/.test(src) && /idleChecked:\s*"проверено"/.test(src) && /idleMissingBoundary:\s*"no ## Boundary"/.test(src) && /idleMissingBoundary:\s*"без ## Boundary"/.test(src), "the page's words are the ones this contract formats with");
check(!/idleIncompleteSpec|idleOf:|idleIssues:/.test(src), "no word for incompleteSpec in the idle copy, and no 'issues' noun for a count of lines");
check(/data\?\.workers \? data\.workers\.active : data \? data\.dispatches\.running : "—"/.test(src) && !/`\$\{data\.workers\.active\}\/\$\{data\.workers\.capacity\}`/.test(src) && /data\?\.workers \? data\.workers\.capacity - data\.workers\.active :/.test(src), "the BEES tile shows the working bees alone (#1711): the count from /queen/status, falling back to dispatches.running, never the old active/capacity fraction; free slots still come from the same reading");
check(/hudBeesCeiling:\s*"hive ceiling: \{cap\}"/.test(src) && /hudBeesCeiling:\s*"потолок улья: \{cap\}"/.test(src) && /c\.hudBeesCeiling\.replace\("\{cap\}", String\(data\.workers\.capacity\)\)/.test(src), "the ceiling survives as the tile's hover and screen-reader title, in both languages (#1711)");
check(/skipCounts\(decision\?\.skipSummary\)/.test(src) && !/skipEntries\.map\(\(\[reason, count\]\)/.test(src), "the round popover lists counts read through skipCounts: the wire's {count, issues, more} objects crashed it (React #31)");
check(/hudNoVerdict:\s*"finished, no verdict"/.test(src) && /hudNoVerdict:\s*"без вердикта"/.test(src) && !/hudReady/.test(src), "dispatches.unreviewed is named for what it counts: finished rows with no verdict, not issues ready");

// self-test: a changed wire number changes the sentence, so the numbers are read, not written
const moved = clone(idle); moved.lastTick.skipSummary.missingBoundary.count = 448; moved.lastTick.skippedCount = 487;
const movedText = line(moved, at(moved, 60))?.text ?? "";
check(movedText.includes("checked: 487; no ## Boundary: 448") && !movedText.includes("449"), `self-test: 448 of 487 in the wire reads so on the page (got "${movedText}")`);

if (fails.length) { for (const f of fails) console.log("  ✗ " + f); console.log(`Queen idle-reason contract: FAIL (${fails.length} of ${checks})`); process.exit(1); }
console.log(`Queen idle-reason contract: PASS (${checks} checks)`);
