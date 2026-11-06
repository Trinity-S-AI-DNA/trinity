import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { QueenSpecs } from "../components/QueenSpecs";
import { QueenAgents } from "../components/QueenAgents";
import { SELECTION_KEY, isExplorerTab, leaveTabSelections } from "../lib/queenEmbed";
import { specsChatSpec } from "../lib/queenSpecsChat";
import { openCardInApp, openCardMessage } from "../lib/queenCardChat";
import { hiveFeedHealth, hiveDisplayRecords, hiveSameRepositorySnapshot, placeHiveDisplays, type HiveDisplay, type HiveFeedHealth } from "../components/queenHiveDisplay";
import type { HiveBee } from "../components/QueenCombBabylon";
import {
  EMPTY_TASK_FILTER,
  TASK_FILTER_KEYS,
  TASK_KINDS,
  TASK_STATES,
  beeBadge,
  filterTasks,
  loadTasksFeed,
  observeRunning,
  taskFilterFromParams,
  taskFilterIsEmpty,
  taskFilterKey,
  tasksFromBoard,
  withEarliestSince,
  writeTaskFilter,
  type ActivityLike,
  type QueenBee,
  type QueenTasksFeed,
  type TaskFilter,
  type TaskKind,
  type TaskState,
  type TasksScope,
} from "../lib/queenTasks";
import { cardLoaded, cardReady } from "../lib/queenTasksCard";
import { ageBees, loadBusPage, patchFeed, planPage, touchBees, type SeenEvent } from "../lib/queenBus";
import { READ_PAUSE_MS, SNAPSHOT_EVERY_SECONDS, WAIT_MAX_SECONDS } from "../lib/queenEvents.generated";
import { eventsCardReady } from "../lib/queenEventsCard";
import { CELL_NONE, CELL_PLACED } from "../lib/queenHive.generated";
import { IV_CLAIMED, IV_EMPTY, IV_FILES, IV_FULL, IV_PACING, IV_SHAPE, LANE_KIND, LANE_NAMES, LANE_NONE, LANE_REPO, TONE_ACT, TONE_OK, TONE_WARN, VERDICT_NAMES } from "../lib/queenDashboard.generated";
import { dashboardCardLoaded, dashboardCardReady, dashFreeLanes, dashIdleVerdict, dashLaneShown, dashVerdictTone } from "../lib/queenDashboardCard";
import { QueenTaskDrawer, type DrawerWords } from "../components/QueenTaskDrawer";
import { QueenComb } from "../components/QueenComb";
import { QueenCommandPanel, type CommandItem } from "../components/QueenCommand";
import { QueenContext } from "../components/QueenContext";
import { QueenFactory } from "../components/QueenFactory";
import { QueenSectors } from "../components/QueenIntel";
import { SceneBoundary } from "../components/SceneBoundary";
import { QueenLoading } from "../components/QueenLoading";
import { QueenLadder, type LadderLayer } from "../components/QueenLadder";
import { loadLadderCounts, type LadderCounts } from "../lib/agentSpecs";
import {
  hudKeyIndex,
  hudKeyOf,
  HUD_VIEWS,
  RAIL_VIEWS,
  SPEC_LAYERS,
  BOARD_VIEWS,
  PROJECT_VIEWS,
  railViewOf,
  isSpecLayer,
  decisionDetail,
  rewriteEndpoints,
  roundStrip,
  skipReasonWords,
  skipCounts,
  idleReason,
  idleLine,
  latestEventFor,
  sectorRows,
  type CombHandle,
  type HudEvent,
  type HudPick,
  type HudView,
  placeCards,
  staleAge,
  moduleCard,
  type HudModule,
  withOpenIssues,
  countdownFor,
  serverOffsetMs,
  mergeActivity,
  hexField,
  spiralOrder,
  hexCellSummaries,
  HEX_HOME,
  FIELD_LAYERS,
  layersFromSearch,
  type FieldLayer,
  foundationCells,
  hexCellCount,
  CASTLE_RING,
  hiveCoverageFromManifest,
} from "../components/queenHud";
import {
  verifyHardwareEnvelope,
  type VerifiedHardwareRegistry,
} from "../components/queenHardwareRegistry";
import {
  directionColor,
  directionCounts,
  directionLabel,
  directionOf,
  narrowByDirection,
  type DirectionKey,
} from "../lib/queenDirection";
import { TrinityLogo } from "../components/TrinityLogo";
import type {UniverseAtlas} from '../lib/queenUniverseAtlas';
const QueenCatalogHive=lazy(()=>import('../components/QueenCatalogHive').then(m=>({default:m.QueenCatalogHive})));
// The Queen answers from the right column on every view, so she is part of the
// shell rather than of one tab. Lazy: the chat pulls its own components.
const QueenChat = lazy(() => import('../components/QueenChat'));
// The comb is Babylon.js (the user's decision, 2026-09-04). ?engine=canvas keeps
// the canvas2D comb for one release, for anyone comparing; then it goes.
const QueenCombBabylon = lazy(() =>
  import("../components/QueenCombBabylon").then((m) => ({ default: m.QueenCombBabylon })),
);
const ENGINE_FLAG =
  typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("engine") : null;
// Where the menu keeps "single-key shortcuts off": a local convenience, not a credential.
const KEY_SHORTCUTS_STORAGE = "queen.hud.key-shortcuts";
import { useI18n } from "../i18n/context";
import { QueenTri } from "../components/QueenTri";
import QueenRoadmap from "../components/QueenRoadmap";
import QueenLeaderboard from "../components/QueenLeaderboard";
import { QueenWars } from "../components/QueenWars";
import { QueenWidgets } from "../components/QueenWidgets";
import QueenToken from "../components/QueenToken";
import Passport from "./Passport";
import { QueenBrowser } from "../components/QueenBrowser";
import { QueenIdentity } from "../components/QueenIdentity";
import { TRI_BUTTONS, hashParamsOf, tabAddress, triAddress, triGroupOf, triScreenOf } from "../lib/triScreens";
import { OPEN_TARGETS, screenExcerpt } from "../lib/queenDirectives";
import { sendToAgentAsMe } from "../services/queenModel";
import { triIdentity } from "../lib/triIdentity";
import { clientsLane, loadHiveBoard, type ClientsLane, type HiveBoard, type HiveBoardReason } from "../lib/hiveBoard";
import { ballLane, loadBallBoard, type BallBoard, type BallLane } from "../lib/ballBoard";
import {
  REVIEW_STATES,
  publicIssueTitle,
  publicResearchText,
  reviewCounts,
  reviewStateOf,
  reviewUnclassified,
  type QueenReviewState,
} from "./queenReviewLifecycle";

// A review card names its queue only when the wire stated one; an absent
// field is a dash, never a label (P0-8).
function reviewSignalLabel(
  state: QueenReviewState | null,
  copy: Record<QueenReviewState, string>,
): string {
  return state ? copy[state] : "—";
}
import "./Queen.css";
// the phone's chrome, after Queen.css so that at equal specificity it wins
import "./queen-phone.css";

// The address moved to lib/queenApi so the homepage can ask the same server
// this page asks, rather than carry a second copy of the literal.
import { BOUNDARY_EXAMPLE_ISSUE, QUEEN_API } from "../lib/queenApi";
import { worldParam } from "../lib/queenCorpusCheck";
import { useCorpus, type CorpusSource, type FoundationSnapshot, type ManifestPart, type ModulesSnapshot } from "../lib/queenCorpus";
import { deriveT27Evolution } from "../lib/t27Evolution";
const LIVE_POLL_MS = 5_000;
// The clients lane is asked far less often than the public board. It is one
// person's pipeline, not a swarm that moves every few seconds, and every ask
// spends the game token — which is minted for 300 s at a time and renewed for
// as long as somebody is looking. Thirty seconds keeps the lane fresh enough
// to trust without making the kanban tab a reason to hold a credential awake.
const HIVE_BOARD_POLL_MS = 30_000;
const FOUNDATION_POLL_MS = 60_000;
const MODULES_POLL_MS = 15_000;
const ACTIVITY_POLL_MS = 2_000;
// The tasks route is asked as often as the board while it answers, and every
// thirty seconds while it does not: a route that is still deploying is not a
// reason to send a request every five seconds that is known to fail.
const TASKS_RETRY_MS = 30_000;
const EMPTY_SEEN: readonly SeenEvent[] = [];
// How many recent bus events the page keeps for the game: more than a page of
// one burst, few enough that a flash never outlives its list.
const SEEN_EVENTS = 64;
const PINNED_QUEEN_HARDWARE_PUBLIC_KEY =
  "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA5+HsGhhkVkICuwo5Qa2pWhfVhT3/wLOLWutK4VKYulw=\n-----END PUBLIC KEY-----\n";

type ResearchState = "researched" | "researching" | "available" | "locked";

interface ResearchNode {
  id: string;
  label: string;
  layer: string;
  maturity: "shipped" | "partial" | "blocked" | "planned" | "unknown";
  state: ResearchState;
  evidence: string;
  blockedBy?: string;
  note?: string;
  prerequisites: string[];
  unlocks: string[];
}

interface ResearchGraph {
  nodes: ResearchNode[];
  edges: Array<{ from: string; to: string }>;
  layers: string[];
  summary: {
    total: number;
    researched: number;
    researching: number;
    available: number;
    locked: number;
    percentage: number;
  };
  runtime: { status: "live" | "offline" };
  workers: {
    capacity: number;
    active: number;
    idle: number;
    utilization: number;
    slots: Array<{ slot: number; state: "busy" | "idle" }>;
  };
  agentBootstrap: {
    version: string;
    mode: string;
    protocol: string;
    endpoints: Record<string, string>;
    repositories: string[];
    skills: string[];
    adaptation: { read: string[]; write: string };
  };
}

interface QueenStatus {
  status: "ok";
  /** Lane occupancy as the swarm reports it. Occupancy, not throughput: a
      refused turn holds a lane exactly like a working one (see QueenLanes). */
  workers?: {
    capacity: number;
    active: number;
    idle: number;
    utilization: number;
  } | null;
  /** The swarm's own word for its state on the wire (working, idle, …). */
  swarmState?: string | null;
  scheduler: {
    enabled: boolean;
    intervalSeconds: number;
  };
  lastTick: {
    decidedAt: string;
    allowed: boolean;
    refusal: string | null;
    skippedCount: number;
    /** Per category { count, issues, more }; older servers sent a bare count. */
    skipSummary?: Record<string, number | { count: number; issues?: number[]; more?: number }>;
  } | null;
  dispatches: {
    total: number;
    finished: number;
    running: number;
    unreviewed?: number;
    latest: {
      issue: number;
      dispatchedAt: string;
      finishedAt: string | null;
      outcome: string | null;
    } | null;
  };
}

interface QueenBoard {
  repo: string;
  columns: Array<{ key: string; title: string; blurb: string }>;
  cards: Array<{
    number: number;
    title: string;
    column: string;
    criteria?: number;
    needs?: string[];
    reviewState?: QueenReviewState;
  }>;
  reviewQueues?: Record<QueenReviewState, number>;
  pulse: {
    rounds: number;
    bees: number;
    verdicts: number;
    lastRoundAt: string | null;
    roundSeconds: number | null;
  };
}

type QueenCard = QueenBoard["cards"][number];
type QueenColumn = QueenBoard["columns"][number];

const FALLBACK_COLUMNS = [
  { key: "backlog", title: "backlog", blurb: "" },
  { key: "blocked", title: "blocked", blurb: "" },
  { key: "running", title: "running", blurb: "" },
  { key: "review", title: "in review", blurb: "" },
  { key: "done", title: "done", blurb: "" },
  { key: "dropped", title: "dropped", blurb: "" },
];

interface QueenActivityEvent {
  id: string;
  kind:
    | "dispatch"
    | "progress"
    | "tool"
    | "result"
    | "usage"
    | "error"
    | "finished"
    | "review";
  issue: number | null;
  title: string;
  at: string;
  state: string | null;
}

interface QueenActivity {
  cursor: number;
  events: QueenActivityEvent[];
}

/** The activity hook's state: the wire's newest events, plus the alert-kind
 *  events kept for the bell - evicted by age, not by count. */
interface ActivityBuffer extends QueenActivity {
  alerts: QueenActivityEvent[];
  /** The oldest moment the wire has shown this page: the bell's span (P0-11). */
  observedFrom: string | null;
}

type LoadState =
  | { kind: "loading"; data: null; error: null; offsetMs: null }
  | { kind: "ready"; data: QueenStatus; error: null; offsetMs: number | null }
  | { kind: "error"; data: QueenStatus | null; error: string; offsetMs: number | null };

const COPY = {
  en: {
    back: "TRINITY",
    eyebrow: "AUTONOMOUS SUPERVISOR / PRODUCTION",
    title: "Queen turns specifications into verified work.",
    lede: "One decision-maker. Isolated Bees. Every refusal and completion leaves evidence.",
    live: "LIVE",
    swarmWorking: "WORKING",
    swarmIdle: "IDLE",
    swarmPaused: "PAUSED",
    swarmUnknown: "STATE —",
    hudNoVerdict: "finished, no verdict",
    idleNothing: "nothing to choose",
    idleRefused: "round refused",
    idleChecked: "checked",
    idleStale: "round stale",
    idleStaleDetail: "last decision {age} ago, rounds every {interval}",
    idleMissingBoundary: "no ## Boundary",
    idleClaimed: "claimed",
    idleCompleted: "done but open",
    idleFileConflict: "touch held files",
    idleNotFirst: "not first",
    idleOther: "other",
    idleExample: "an issue written the way bees can take it",
    unavailable: "BACKEND UNAVAILABLE",
    checking: "CHECKING BACKEND",
    scheduler: "Scheduler",
    hudSince: "since",
    lastDecision: "Last decision",
    dispatches: "Completed Bees",
    active: "Running now",
    decision: "LATEST QUEEN DECISION",
    chose: "A new Bee may start.",
    stoodDown: "policy stood down, no Bee started",
    noDecision: "No recorded decision yet.",
    reasons: "explicit skip reasons",
    queueMeaning:
      "The supervisor is alive. The current queue has no eligible specification.",
    path: "FROM INTENT TO EVIDENCE",
    spec: "SPEC",
    specCopy: "Boundary, scenarios, requirements and success criteria — written as a .t27 spec. The spec is the source of truth; every language output is generated from it.",
    queen: "QUEEN",
    queenCopy: "Checks collisions, state and policy before delegation.",
    bee: "BEE",
    beeCopy: "Works in isolation and returns a reviewable result.",
    latest: "LATEST DISPATCH",
    issue: "Issue",
    outcome: "Outcome",
    finished: "Finished",
    provenance: "LIVE / RAILWAY / POSTGRES / QUEEND",
    refresh: "refreshes every 5 seconds",
    source: "Open operational view",
    hudSky: "Star catalog",
    board: "REALTIME KANBAN",
    boardTitle: "The whole swarm, in one place.",
    boardCopy:
      "Public GitHub work mapped to the Queen’s own states. Operational secrets stay private.",
    kanbanView: "KANBAN",
    mapView: "MISSION MAP",
    factoryView: "FACTORY",
    kanbanHint: "Operational columns",
    mapHint: "Strategic lifecycle sectors",
    factoryHint: "Live engineering production",
    // The KANBAN module's own sub-navigation: three readings of the one board,
    // which used to be three buttons of the rail.
    boardAria: "The board: kanban, mission map, factory",
    combView: "COMB",
    combHint: "The board as a field of marks",
    specsView: "SPECS",
    specsHint: "The corpus she is generated from",
    // The SPECS module's own sub-navigation: the seven layers of the ladder,
    // six of which used to be buttons of the rail.
    ladderAria: "The ladder: specs, skills, crons, agents, tools, functions, providers",
    skillsView: "SKILLS",
    skillsHint: "Agent skills, each stated by a .t27 spec",
    cronsView: "CRONS",
    cronsHint: "Scheduled jobs, each stated by a .t27 spec",
    skillsDirective: "SKILLS ARE SPECS",
    skillsDirectiveBody:
      "An agent skill exists when a .t27 spec under specs/skills states it; the SKILL.md in the repository is the code that witnesses it. The catalog is generated from the specs through the compiler at build time. A card with both is spec+code; a card with code alone is code-only and says so. ENABLED is read from the spec and changed there, not on this page.",
    cronsDirective: "CRONS ARE SPECS",
    cronsDirectiveBody:
      "A scheduled job exists when a .t27 spec under specs/crons states it: host, schedule, what it runs, what happens on failure, whether it is on. The workflow, Inngest function or timer the sync script found is the witness. “Run now” goes to the host that owns the job; a timer inside a process has no outside handle and the card says so. No live control plane is deployed.",
    agentsView: "AGENTS",
    agentsHint: "Who holds the skills",
    agentsDirective: "AGENTS ARE SPECS",
    agentsDirectiveBody:
      "Level by level the system is built: Specs → Skills → Crons → Agents. An agent exists when a .t27 spec under specs/agents states it — its letter, domain, archetype, the skills it holds, its entry and exit invariant — bound by SOUL.md and AGENTS.md at the repository root. Its crons are derived from the crons' RUNS, never listed by hand. Its experience is joined from the episode log only when an episode names its letter; an agent no episode names says so, and the episodes that name no one are counted as unattributed, not assigned.",
    toolsView: "TOOLS",
    toolsHint: "The tri CLI and the MCP servers, each stated by a .t27 spec (key t)",
    toolsDirective: "TOOLS ARE SPECS",
    toolsDirectiveBody:
      "The fifth layer: Specs → Skills → Crons → Agents → Tools → Functions — the tools every agent should know. A tool exists when a .t27 spec under specs/tools states it: a command of the t27 tri CLI, read from the clap enum and its doc comments, or an MCP server of either repository with its tool list, read from the manifest and source. The witness names how the text was obtained (source-parse, help-output). An agent owns a tool only when both the agent's spec and a source say so; a tool no letter has bound says so, and nothing on this page is typed by hand.",
    toolsOwned: "owned by an agent",
    toolsUnowned: "no owner yet",
    projectView: "PROJECT",
    projectHint: "The project, the rules of the game for its agents, and the system in detail (key p)",
    projectDirective: "THE SYSTEM IS A DOCUMENT",
    projectDirectiveBody:
      "The system documentation, whole: one declared document, specs/docs/system.t27, names seven chapters and their order; each chapter spec names its sources, its sections and the Markdown body that is its text. The generator renders the body through the compiler, builds every table from the catalogs and draws every figure from data; nothing on the page is typed twice. Chapters: the project and its tagged claims, the constitution and the rules of the game, the six-step ladder, the 27-letter alphabet, the Queen's cycle, the tools, the witnesses. Opens on the letter p: the digits are spent.",
    projectChapters: "chapters",
    projectRu: "with a Russian body",
    projectSources: "sources pinned",
    triView: "TRI",
    triHint: "The app inside the game: feed, agent, AI generation, profile and CRM (key r)",
    // The fourteenth view: the record proposed to the OCP neuromorphic working
    // group, and the three measured cases of ours that pay for it.
    roadmapView: "ROADMAP",
    roadmapHint: "The game: the whole stack rewritten in .t27, by language and stage (key m)",
    // The fifteenth view: who wrote the specs, and the runners lent to the
    // swarm. Lanes are counted on TOKEN, not ranked here.
    leaderboardView: "LEADERBOARD",
    leaderboardHint: "Who wrote the specs, and the runners lent to the swarm (key l)",
    warsView: "WARS",
    warsHint: "Real-task agent benchmarks generated from one .t27 ledger (key x)",
    tokenView: "TOKEN",
    tokenHint: "TRI on TON testnet, and who earned it, by GitHub account (key k)",
    passportView: "PASSPORT",
    passportHint: "What must travel with a result: the record proposed to the OCP working group (key b)",
    // The fifteenth view: the person's own remote browser, the one the agent drives.
    browserView: "BROWSER",
    browserHint: "Your own browser, the one your agent drives (key w)",
    browserPreview: "Your own browser on a server, the one your agent drives. It opens on the board itself, never in a preview.",
    browserSignin: "Your browser belongs to your account. Sign in to the app, then come back to this tab.",
    browserOpenInApp: "Open in the app",
    browserFullscreen: "Fullscreen",
    browserExitFullscreen: "Exit fullscreen",
    browserNone: "Your browser is closed. Opening it starts a machine for you; your logins are kept between openings.",
    browserOpen: "Open browser",
    browserStarting: "Starting your browser...",
    browserUnavailable: "Browsers are not running on this server right now.",
    browserClose: "Close (logins kept)",
    browserFailed: "The browser service did not answer.",
    browserRetry: "Try again",
    browserFrameTitle: "Your browser",
    browserPasswords: "Type passwords yourself, inside the window. Nobody else sees them, the agent included.",
    browserJournal: "What the agent did here",
    browserDriving: "You are driving. The agent watches and waits.",
    browserHandBack: "Hand back to the agent",
    browserGuideTitle: "What this tab does once you are signed in",
    browserGuideLive: "It shows your own browser, running on a server, and your agent drives it.",
    browserGuideJournal: "Every step the agent takes is listed under the window. Press inside the window and you drive while the agent waits, until you hand it back or leave it untouched for ten minutes.",
    browserGuidePasswords: "This page never asks for a password. You type passwords yourself, inside the window.",
    browserGuideSpec: "This address names a spec:",
    browserGuideReadSpec: "read it on SPECS, no sign-in needed",
    browserWatchInvite: "Invite to watch",
    browserWatchNote: "A watch link shows this browser live and read-only: no clicks, no typing, no agent. A bank, a mail box and the sites on your ask or block list are held, not shown -- but a payment form framed inside a shop page is shown with the page. Two viewers per link; revoke it any time.",
    browserWatchFor: "For",
    browserWatchHour: "h",
    browserWatchLabel: "Who is it for (optional)",
    browserWatchCreate: "Make a link",
    browserWatchOnce: "Shown once: copy it now. Anyone who has it can watch until it ends or you revoke it.",
    browserWatchCopy: "Copy",
    browserWatchCopied: "Copied",
    browserWatchRevoke: "Revoke",
    browserWatchWatching: "watching now",
    browserWatchViews: "opened",
    browserWatchNone: "No live links.",
    browserWatchFull: "Five links are live already: revoke one first.",
    browserWatchFailed: "The server did not make it. Try again.",
    browserWatchHide: "Hide",
    browserLanesAdd: "+ Task side by side",
    browserLanesAddTitle: "A second task in a window of its own, in the same browser. The chat stays on the first.",
    browserLanesRegion: "Tasks side by side",
    browserLanesPlaceholder: "A task for its own window, e.g. find the opening hours on example.org",
    browserLanesSend: "Send",
    browserLanesWorking: "working...",
    browserLanesLimit: "Three tasks at once is the most, the chat included, and another device or the bot may hold one. Close a card, or wait: a task idle for 30 min is let go.",
    browserLanesOld: "This browser server does not run tasks apart yet: the answer came from the main conversation, in the same window.",
    browserLanesSignedOut: "Sign in again to send this.",
    browserLanesFailed: "The server did not answer. Try again.",
    browserLanesClose: "Close",
    browserLanesCloseTitle: "The card goes. Its window stays until a new card takes it or 30 min pass.",
    triScreens: "App screens",
    triFeed: "Feed",
    triAgent: "Agent",
    triAi: "AI",
    triProfile: "Profile",
    triCrm: "CRM",
    triLoading: "Opening app.t27.ai…",
    triNoAnswer: "The app did not answer inside the game: it may not allow t27.ai to frame it yet.",
    triOpenApp: "Open this screen in the app",
    triAppError: "The app hit an error inside the game.",
    triFrameTitle: "Trinity app",
    triInsidePlayer: "You are already inside the app: TRI is the app, and the app is around this game. Use its tabs.",
    triPreview: "A preview does not load the app. Open TRI in the game itself.",
    identitySignIn: "Sign in",
    identitySignInTitle: "Sign in with Telegram on app.t27.ai and come back to this view",
    identitySignInAgain: "Sign in again in TRI",
    identitySignedIn: "Signed in",
    identityRoleKeeper: "Keeper",
    identityRoleOwner: "Owner",
    identityRoleBee: "Bee",
    identityPending: "Checking TRI…",
    identityConfirm: "Confirm in TRI",
    identityConfirmTitle: "TRI asks you to confirm in the box at the bottom of the page",
    identityConfirmAgainTitle: "Show the TRI confirmation again",
    identityResume: "Resume in TRI",
    identityResumeTitle: "Your TRI sign-in ran out on this page: open TRI to renew it and come back to this view",
    identityRetry: "Retry",
    identityOffline: "TRI unreachable",
    identityNoAnswer: "TRI did not answer",
    identityBusy: "TRI busy, wait a minute",
    identityRefused: "TRI refused",
    identityUnavailable: "Identity unavailable",
    identityWebOnly: "Identity is on the web version",
    identityOffSite: "Identity works on t27.ai",
    agentsLoading: "Loading the Explorer…",
    agentsSpecs: "specs",
    agentsSpecCode: "spec+code",
    agentsSpecExperience: "spec+experience",
    agentsUnattributed: "unattributed episodes",
    agentsCodeOnly: "code-only",
    agentsTypecheck: "typecheck ok",
    functionsView: "FUNCTIONS",
    functionsHint: "The 28 Inngest functions of the bot, each stated by a .t27 spec",
    functionsDirective: "FUNCTIONS ARE SPECS",
    functionsDirectiveBody:
      "The layer where a spec meets a running service — sixth on this site's ladder, after Tools; t27 specs/functions/README.md calls it layer 5, as specs/tools/README.md does for tools, and the two READMEs disagree: each Inngest function of 999-multibots-telegraf is stated by a .t27 spec under specs/functions — its trigger, event and legacy events or cron, its steps in source order, retries, what happens on failure, its side effects, guard, safe probe and probe result — and witnessed by a vendored copy of the functions manifest read from the repository at a named commit. Where spec and manifest disagree the card says so. Live run counts are read from the bot once a minute and never invented: an offline status source is shown as offline, and a count it did not send is unknown, not zero.",
    // The seventh layer, on g (the GPU): who sells the compute the ladder spends.
    providersView: "PROVIDERS",
    providersHint: "Who sells compute: the Gonka models, and a GPU or FPGA rented out for TRI (key g)",
    widgetsView: "WIDGETS",
    widgetsHint: "Shareable widgets: recordings, the X player, embed code (key v)",
    providersDirective: "PROVIDERS ARE SPECS",
    providersDirectiveBody:
      "The seventh layer: Specs → Skills → Crons → Agents → Tools → Functions → Providers — who sells the compute the rest of the ladder spends. A provider exists when a .t27 spec under specs/providers states it: a model the Gonka chain lists, every number copied from a public chain endpoint on the date the card names (hosts serving it, GPU memory, context, validation threshold, price), or a class of hardware a person could rent out to TRI-NET for TRI — an Artix-7 FPGA measured on three boards, and a 24 GB gaming GPU that is a design and claims no measurement. The page re-reads the Gonka chain from your browser when you ask and prints every difference; it never calls a paid model, never asks for a key and never shows a host's address. Under both families sits specs/providers/tri_gnk_pair.t27: TRI is on testnet, Gonka has no DEX pool, and its bridge goes to Ethereum, not to TON or Solana.",
    providersRead: "read from a chain or a bench",
    providersDesign: "design only",
    specsTitle: "SPEC CORPUS",
    specsDirective: "STANDING DIRECTIVE",
    specsDirectiveBody:
      "Every part of this project is to be expressed as a .t27 spec, and the project generated from those specs. A spec is the source of truth; the Zig, Verilog, C and Rust are outputs. Where hand-written code still exists, the task is to replace it with a spec that generates it — not to maintain both.",
    specsCorpus: "corpus health",
    specsClean: "clean",
    specsWarnings: "flagged",
    specsBroken: "rejected",
    specsSpecs: "specs",
    specsLines: "lines",
    specsNodes: "AST nodes",
    specsSources: "SOURCES",
    specsOpen: "Open full screen ↗",
    specsLoading: "Loading the compiler…",
    specsGapTitle: "HOW FAR THIS ACTUALLY IS",
    specsGapBody:
      "Measured, not asserted: the generated Verilog synthesises to 0 LUTs and 0 flip-flops across every spec that Yosys accepts — module shells with IBUF/OBUF and nothing behind them. The bitstreams running on the board today come from hand-written RTL. The directive above is the goal; this line is the distance.",
    combHeld: "held",
    combNeutral: "neutral",
    combFog: "fog",
    combBees: "bees",
    combQueen: "THE QUEEN",
    combQueenCell: "centre cell",
    combNoBee: "no bee here",
    combPick: "Click a cell. A bee on it, or the Queen's own cell, shows a portrait; every cell is one card of the board.",
    combHint2: "drag to orbit · wheel to zoom · click a cell",
    hiveLawT27: "T27 covered",
    hiveLawManual: "manual code",
    hiveLawAwaiting: "awaiting T27",
    hiveLawUnknown: "T27 coverage unknown",
    hiveLawBees: "bees",
    factoryFlow: "ISSUE → SPEC → BEE → REVIEW → EVIDENCE",
    factoryThroughput: "Live utilization",
    factoryQueueDensity: "queue density peak",
    factoryWorkerBays: "Bee hangars",
    factoryIdle: "idle",
    factoryStation: "station",
    factoryModules: "modules",
    factoryOffline: "factory telemetry offline",
    factoryOpenIssue: "OPEN REAL MODULE",
    factorySelectedModule: "SELECTED PRODUCTION MODULE",
    factoryLiveContract:
      "Every Bee bay, partial and laboratory below is backed by the live Queen ledger.",
    cityTitle: "RESEARCH CITADEL",
    cityCopy:
      "A living city compiled from the canonical technology graph. Laboratories are research nodes; energy routes are dependencies.",
    cityDistricts: "research districts",
    cityLaboratories: "real laboratories",
    citySelected: "SELECTED LABORATORY",
    cityEvidence: "Evidence",
    cityOffline: "Research graph unavailable — no city was synthesized.",
    cityBuildTitle: "CONSTRUCTION PROTOCOL",
    cityComplete: "complete",
    cityAssembling: "assembling",
    cityBlueprint: "blueprints",
    citySealed: "sealed",
    cityDependencies: "dependencies ready",
    foundryTitle: "SIGNED FPGA FOUNDRY",
    foundryVerified: "Registry signature verified. Structures below represent signed public evidence.",
    foundryUnavailable: "Hardware registry unavailable — no FPGA structures rendered.",
    foundryTotal: "verified devices",
    foundryOnline: "online now",
    foundryProgrammed: "programmed",
    foundryKey: "signing key",
    mapLegend:
      "The routes show Queen lifecycle movement; only the Technology Tree below claims prerequisite links.",
    sector: "sector",
    rounds: "rounds / 24h",
    beesStarted: "started / 24h",
    verdicts: "verdicts",
    empty: "Nothing here",
    criteria: "criteria",
    missing: "needs",
    // The number beside it is what is STILL HIDDEN, not the size of the next
    // page. "more 539" is a fact about the column; "more 30" would be a fact
    // about this button, and the reader is asking about the column.
    showMore: "show more",
    // The two boards of the kanban, one at a time. TASKS is the public board
    // and is the same for everybody, signed in or not; CLIENTS appears only for
    // a signed-in person, holds only what the hive answered for them, and is
    // never the board that happens to be on screen — it is reached by pressing
    // for it. The words below are drawn ONLY when the second board exists —
    // signed out, the page is the board it always was, with no switch
    // announcing an absence.
    laneTasks: "TASKS",
    laneSwitchAria: "Which board",
    lanePrivate: "private",
    lanePrivateHint: "names and payments — only you were shown this",
    // The direction chips. The names of the directions themselves are not
    // here: they travel with the rules that decide them, in
    // lib/queenDirection.ts, so a new direction cannot arrive without both.
    tasksDirection: "Direction",
    tasksDirectionAll: "All",
    tasksFilterAria: "Filter the tasks",
    tasksFilterToggle: "Filter",
    tasksFind: "title or #number",
    tasksKind: "Kind",
    tasksKindAll: "all kinds",
    tasksKindIssue: "issues",
    tasksKindReview: "reviews",
    tasksKindJob: "jobs",
    tasksKindReviewOne: "review",
    tasksKindJobOne: "job",
    tasksState: "State",
    tasksStateAll: "all states",
    tasksStateFailed: "failed",
    tasksRepo: "Repository",
    tasksRepoAll: "all repositories",
    tasksReset: "reset",
    tasksFromBoard: "derived from the board: the tasks route is not answering",
    tasksTruncated: "cut at the route's page limit",
    tasksBeeTitle: "The bee on this task: its lane, working or quiet, how long it has had the task, and when it was last heard",
    // Why lanes are idle, the lanes, and one task opened (gHashTag/t27
    // specs/queen/dashboard.t27). {free}, {count}, {waiting} and {n} are filled in.
    healthFull: "all {n} lanes busy",
    healthPacing: "{free} lanes free · {waiting} ready issues wait their turn",
    healthFiles: "{free} lanes free · {count} issues wait for files another bee holds",
    healthShape: "{free} lanes free · {count} issues have no Boundary yet",
    healthClaimed: "{free} lanes free · every open issue is already taken ({count})",
    healthEmpty: "{free} lanes free · no open work",
    healthTitle: "Why lanes are idle, from the Queen's last round",
    lanesLabel: "Lanes",
    lanesNone: "no lanes",
    lanesRepo: "by repository",
    lanesKind: "by kind",
    lanesOther: "other",
    drawerOpen: "Details",
    drawerClose: "Close",
    drawerTimeline: "History",
    drawerLease: "Lease",
    drawerLeaseNone: "no lease",
    drawerLeaseLive: "held, fence {fence}, expires in {left}",
    drawerLeaseExpired: "expired {left} ago, fence {fence}: waiting to be taken back",
    drawerAttempts: "Attempts",
    drawerSendBacks: "send-backs",
    drawerFreeAttempts: "free attempts",
    drawerCeilingReleases: "ceiling releases",
    drawerReviewerMisses: "reviewer misses",
    drawerReview: "review",
    drawerStarted: "started",
    drawerFinished: "finished",
    drawerEffects: "Effects",
    drawerEffectStep: "step",
    drawerEffectRuns: "runs",
    drawerEmpty: "nothing recorded yet",
    drawerMissing: "this server does not answer the task drawer yet",
    drawerLoading: "reading…",
    drawerOnGithub: "Open on GitHub",
    evCreated: "a bee started it",
    evEnded: "the bee finished",
    evLeaseLost: "the lease expired and the task was taken back",
    evEvidence: "the bee was working",
    evReviewed: "reviewed",
    evAssign: "a person assigned it",
    evCancel: "a person cancelled it",
    laneClients: "CLIENTS",
    clientsLaneAria: "Clients board",
    clientsNarrow: "Narrow to",
    clientsNarrowAll: "All",
    clientsNarrowSearch: "find a person",
    clientsNarrowed: "the hive already narrowed this board",
    clientsPending: "Asking the hive…",
    clientsRefused: "The hive did not open this board to you.",
    clientsOffline: "The hive did not answer. Asking again.",
    clientsUnreadable: "The hive answered something this page cannot read.",
    clientsEmpty: "No one on your board yet.",
    clientsNoName: "no name",
    clientsPaid: "paid",
    clientsWaiting: "waiting for a reply",
    clientsQuiet: "days quiet",
    clientsTouched: "last touch",
    // The third board: the owner's mail, CRM and open work by client, with
    // whose move it is (lib/ballBoard.ts). Drawn only when the hive sent the
    // mail -- to the owner, or to somebody the owner granted it to.
    laneBall: "MAIL",
    ballLaneAria: "Mail and whose move it is",
    ballPrivateHint: "the owner's mail — shown to the owner and to whom they allowed",
    ballOurs: "our move",
    ballDue: "promised",
    ballTheirs: "their move",
    ballNone: "nobody's",
    ballSourceMail: "mail",
    ballSourceCrm: "chat",
    ballSourceGithub: "code",
    ballDays: "d",
    ballEmpty: "Nothing waiting.",
    ballStale: "The mailbox snapshot is old; the owner's machine has not pushed a new one.",
    command: "LIVE COMMAND ROOM",
    commandTitle: "Queen reviews the swarm herself.",
    commandCopy:
      "The screen follows the real supervisor cycle: selection, isolated execution, self-review, Queen verdict and acceptance.",
    nextRound: "next Queen round",
    reviewing: "waiting for Queen review",
    queenReviewPending: "Queen review pending",
    changesRequested: "Changes requested",
    humanEscalation: "Human escalation",
    reconciliationAnomaly: "Ledger anomaly",
    hudReviewUnclassified: "no state on the wire",
    executing: "executing now",
    noBees:
      "No Bee is executing right now. Queen remains online and keeps the queue under policy.",
    reviewQueue: "Queen review queue",
    activity: "LIVE BEE ACTIVITY",
    activityRate: "2 second pulse",
    noActivity: "Waiting for the next recorded Bee event.",
    synchronized: "synced every 5 seconds",
    selfReview: "SELF-REVIEW",
    selfReviewCopy:
      "The Bee runs checks and inspects its own diff before handoff.",
    verdict: "QUEEN VERDICT",
    verdictCopy:
      "Queen judges the evidence, rejects weak work and accepts only a passing result.",
    merge: "ACCEPT / MERGE",
    mergeCopy: "Approved work enters the repository with an auditable trail.",
    tech: "TECH TREE",
    techTitle: "The .t27 language, and what each step of it cost.",
    techCopy:
      "The evolution of the language, read from the corpus index this page already ships: the seed compiler, the constructs the specs use, the checks they pass, the backends they generate to, the repositories that adopted them, and the silicon path. Select a node to see its evidence, its prerequisites and what it unlocks.",
    researched: "researched",
    researching: "researching",
    available: "available next",
    locked: "locked",
    prerequisites: "Prerequisites",
    unlocks: "Unlocks next",
    noPrerequisites: "Available from the start",
    terminalNode: "Final technology in this branch",
    overallResearch: "overall research",
    activeResearch: "active research",
    nextAvailable: "available next",
    evidence: "Evidence",
    // The tree draws the .t27 language, and it is read out of the corpus index
    // this site ships. Saying "the TRINITY graph" here described the supervisor
    // wire the tab used to draw, and was the only sentence a reader saw while
    // the index loaded.
    graphOffline: "T27 CORPUS INDEX OFFLINE",
    graphLoading: "Reading the .t27 index…",
    workerPool: "A2A RESEARCH WORKERS",
    workerPoolCopy: "Each paid slot can carry one isolated Bee without sharing a rate limit.",
    slotsBusy: "slots busy",
    copyAgent: "COPY TO AGENT",
    copiedAgent: "BOOTSTRAP COPIED",
    copyAgentTitle: "Connect an agent to TRINITY research and development.",
    copyAgentCopy:
      "Copies the public A2A bootstrap, graph endpoints, repositories, evidence skills and adaptation rules. No secret or mutation authority is included.",
    copyFailed: "COPY FAILED",
    nodeMaturity: "Repository maturity",
    // ---- single-screen HUD ----
    hudBrand: "TRINITY QUEEN",
    hudBees: "BEES",
    hudBeesCeiling: "hive ceiling: {cap}",
    hudDone: "DONE",
    hudVerdicts: "VERDICTS",
    hud24h: "24h",
    hudResearch: "RESEARCH",
    hudFoundry: "FOUNDRY",
    hudNextRound: "SINCE ROUND",
    hudMenu: "MENU",
    hudLanguage: "EN / RU",
    hudShortcuts: "KEY SHORTCUTS",
    hudOn: "ON",
    hudOff: "OFF",
    hudViews: "VIEWS",
    hudIntel: "INTEL FEED",
    hudLive: "LIVE",
    unitS: "s",
    unitMin: "min",
    unitH: "h",
    hudOffline: "OFFLINE",
    hudOverview: "OVERVIEW",
    hudSectors: "SECTORS",
    hudContext: "CONTEXT DETAILS",
    hudQueue: "BEE QUEUE",
    hudQueueEmpty: "No Bee is running. The Queen holds the queue under policy.",
    hudReviewQueue: "REVIEW QUEUE",
    hudLast: "LAST",
    hudSelected: "SELECTED",
    hudTheQueen: "THE QUEEN",
    hudQueenRole: "Supervisor. Chooses, delegates, judges.",
    hudBackend: "BACKEND",
    hudTerritory: "TERRITORY",
    hudNeeds: "NEEDS",
    hudNoBee: "NO BEE",
    hudSlot: "SLOT",
    hudBusy: "BUSY",
    hudCell: "CELL",
    hudAllow: "ALLOW",
    hudRefuse: "REFUSE",
    hudSchedulerOff: "SCHEDULER OFF",
    hudOverdue: "OVERDUE",
    hudStale: "STALE",
    hudDispatched: "dispatched",
    hudOpenIssue: "OPEN ISSUE",
    hudCopyLink: "COPY LINK",
    hudLinkCopied: "LINK COPIED",
    hudClose: "Close",
    hudActiveSector: "ACTIVE SECTOR",
    hudProduction: "PRODUCTION",
    hudCards: "CARDS",
    hudHeld: "HELD",
    hudSlots: "SLOTS",
    hudSignature: "SIGNATURE",
    hudVerified: "VERIFIED",
    hudUnverified: "UNVERIFIED",
    hudDevice: "DEVICE",
    hudCommands: "QUICK COMMANDS",
    hudOpenRepo: "OPEN REPO",
    hudFitView: "FIT VIEW",
    hudLayerFoundation: "FOUNDATION",
    hudLabels: "LABELS",
    hudEpic: "EPIC",
    hudLayerCastle: "CASTLE",
    hudLayerCode: "CODE",
    hudFoundationSnapshot: "snapshot",
    hudClosed: "closed",
    hudZoomIn: "ZOOM IN",
    hudZoomOut: "ZOOM OUT",
    hudFullscreen: "FULLSCREEN",
    hudExitFullscreen: "EXIT FULLSCREEN",
    hudTools: "Map tools",
    hudToolsClose: "Hide map tools",
    hudCollapse: "COLLAPSE",
    hudExpand: "EXPAND",
    hudNoEvents: "No recorded Bee event yet.",
    researchHint: "Canonical evidence graph",
  },
  ru: {
    back: "TRINITY",
    eyebrow: "АВТОНОМНЫЙ НАДЗОР / PRODUCTION",
    title: "Queen превращает спецификации в проверяемую работу.",
    lede: "Один центр решений. Изолированные Bees. Каждый отказ и завершение оставляют доказательства.",
    live: "LIVE",
    swarmWorking: "РАБОТАЕТ",
    swarmIdle: "ЖДЁТ",
    swarmPaused: "ПАУЗА",
    swarmUnknown: "СОСТОЯНИЕ —",
    hudNoVerdict: "без вердикта",
    idleNothing: "нечего выбрать",
    idleRefused: "раунд отказал",
    idleChecked: "проверено",
    idleStale: "раунд устарел",
    idleStaleDetail: "последнее решение {age} назад, раунды каждые {interval}",
    idleMissingBoundary: "без ## Boundary",
    idleClaimed: "заняты",
    idleCompleted: "сделаны и не закрыты",
    idleFileConflict: "задевают занятые файлы",
    idleNotFirst: "не первые",
    idleOther: "прочие",
    idleExample: "задача в формате, который пчёлы берут",
    unavailable: "BACKEND НЕДОСТУПЕН",
    checking: "ПРОВЕРЯЮ BACKEND",
    scheduler: "Планировщик",
    hudSince: "с",
    lastDecision: "Последнее решение",
    dispatches: "Завершено Bees",
    active: "Сейчас работают",
    decision: "ПОСЛЕДНЕЕ РЕШЕНИЕ QUEEN",
    chose: "Новая Bee может быть запущена.",
    stoodDown: "политика остановила, Bee не запущена",
    noDecision: "Решений пока не записано.",
    reasons: "явных причин пропуска",
    queueMeaning:
      "Королева работает. В текущей очереди нет допустимой спецификации.",
    path: "ОТ НАМЕРЕНИЯ К ДОКАЗАТЕЛЬСТВУ",
    spec: "SPEC",
    specCopy: "Граница, сценарии, требования и критерии успеха — записанные как .t27-спека. Спека — источник истины; все языковые выходы порождаются из неё.",
    queen: "QUEEN",
    queenCopy: "Проверяет конфликты, состояние и политику до делегирования.",
    bee: "BEE",
    beeCopy: "Работает изолированно и возвращает результат на проверку.",
    latest: "ПОСЛЕДНИЙ DISPATCH",
    issue: "Задача",
    outcome: "Исход",
    finished: "Завершено",
    provenance: "LIVE / RAILWAY / POSTGRES / QUEEND",
    refresh: "обновление каждые 5 секунд",
    source: "Открытый operational view",
    hudSky: "Каталог звёзд",
    board: "REALTIME KANBAN",
    boardTitle: "Весь рой — в одном месте.",
    boardCopy:
      "Публичные GitHub-задачи в реальных состояниях Queen. Внутренние данные остаются закрытыми.",
    kanbanView: "КАНБАН",
    mapView: "КАРТА МИССИЙ",
    factoryView: "ФАБРИКА",
    kanbanHint: "Операционные колонки",
    mapHint: "Стратегические сектора цикла",
    factoryHint: "Живое инженерное производство",
    boardAria: "Доска: канбан, карта миссий, фабрика",
    combView: "СОТЫ",
    combHint: "Доска как поле из меток",
    specsView: "СПЕКИ",
    specsHint: "Корпус, из которого её порождают",
    ladderAria: "Лестница: спеки, скиллы, кроны, агенты, инструменты, функции, провайдеры",
    skillsView: "СКИЛЛЫ",
    skillsHint: "Скиллы агентов, каждый заявлен спекой .t27",
    cronsView: "КРОНЫ",
    cronsHint: "Расписания, каждое заявлено спекой .t27",
    skillsDirective: "СКИЛЛЫ — ЭТО СПЕКИ",
    skillsDirectiveBody:
      "Скилл агента существует, когда его заявляет спека .t27 в specs/skills; SKILL.md в репозитории — код, который это свидетельствует. Каталог порождается из спек через компилятор при сборке. Карточка с тем и другим — «спека+код»; карточка только с кодом — «только код», и она об этом говорит. ENABLED читается из спеки и меняется там, а не на этой странице.",
    cronsDirective: "КРОНЫ — ЭТО СПЕКИ",
    cronsDirectiveBody:
      "Задание по расписанию существует, когда его заявляет спека .t27 в specs/crons: хост, расписание, что запускает, что при сбое, включено ли. Workflow, функция Inngest или таймер, найденные скриптом синхронизации, — свидетель. «Запустить сейчас» ведёт к хосту, которому задание принадлежит; у таймера внутри процесса внешней ручки нет, и карточка так и говорит. Живой контур управления не развёрнут.",
    agentsView: "АГЕНТЫ",
    agentsHint: "Кто держит скиллы",
    agentsDirective: "АГЕНТЫ — ЭТО СПЕКИ",
    agentsDirectiveBody:
      "Уровень за уровнем мы создаём систему: спеки → скиллы → кроны → агенты. Агент существует, когда его заявляет спека .t27 в specs/agents — буква, домен, архетип, скиллы, которые он держит, входной и выходной инвариант, — под законом SOUL.md и AGENTS.md в корне репозитория. Его кроны выводятся из RUNS кронов, а не пишутся руками. Его опыт присоединяется из журнала эпизодов только когда эпизод называет его букву; агент, которого не называет ни один эпизод, говорит об этом сам, а эпизоды без имени считаются неатрибутированными, а не приписываются.",
    toolsView: "ИНСТРУМЕНТЫ",
    toolsHint: "tri CLI и MCP-серверы, каждый заявлен спекой .t27 (клавиша t)",
    toolsDirective: "ИНСТРУМЕНТЫ — ЭТО СПЕКИ",
    toolsDirectiveBody:
      "Пятый слой: спеки → скиллы → кроны → агенты → инструменты → функции — инструменты, о которых должен знать каждый агент. Инструмент существует, когда его заявляет спека .t27 в specs/tools: команда t27 tri CLI, прочитанная из enum clap и его doc-комментариев, или MCP-сервер любого из двух репозиториев со списком инструментов, прочитанным из манифеста и исходника. Свидетель называет, как получен текст (source-parse, help-output). Агент владеет инструментом только когда об этом говорят и спека агента, и источник; инструмент, который не привязала ни одна буква, говорит об этом сам, и ничего на этой странице не набрано руками.",
    toolsOwned: "с агентом-владельцем",
    toolsUnowned: "без владельца",
    projectView: "ПРОЕКТ",
    projectHint: "проект, правила игры для агентов и система в деталях (клавиша p)",
    projectDirective: "СИСТЕМА — ЭТО ДОКУМЕНТ",
    projectDirectiveBody:
      "Документация системы целиком: один объявленный документ, specs/docs/system.t27, называет семь глав и их порядок; спека каждой главы называет её источники, разделы и Markdown-текст, который и есть её содержание. Генератор прогоняет текст через компилятор, строит каждую таблицу из каталогов и рисует каждый рисунок по данным; ничего на странице не набрано дважды. Главы: проект и его помеченные утверждения, конституция и правила игры, лестница из шести ступеней, алфавит из 27 букв, цикл Королевы, инструменты, свидетели. Открывается буквой p: цифры заняты.",
    projectChapters: "глав",
    projectRu: "с русским текстом",
    projectSources: "источников закреплено",
    triView: "TRI",
    triHint: "Приложение внутри игры: лента, агент, ИИ-генерация, профиль и CRM (клавиша r)",
    roadmapView: "ДОРОЖНАЯ КАРТА",
    roadmapHint: "Игра: весь стек на .t27 — по языкам и этапам (клавиша m)",
    leaderboardView: "ЛИДЕРБОРД",
    leaderboardHint: "Кто писал спеки, и раннеры, одолженные рою (клавиша l)",
    warsView: "ВОЙНЫ",
    warsHint: "Бенчмарки агентов на реальных задачах из единого журнала .t27 (клавиша x)",
    tokenView: "ТОКЕН",
    tokenHint: "TRI в TON testnet и кто его заработал, по аккаунтам GitHub (клавиша k)",
    passportView: "ПАСПОРТ",
    passportHint: "Что обязано ехать вместе с результатом: запись, поданная в рабочую группу OCP (клавиша b)",
    browserView: "БРАУЗЕР",
    browserHint: "Ваш собственный браузер, которым водит ваш агент (клавиша w)",
    browserPreview: "Ваш собственный браузер на сервере, которым водит ваш агент. Открывается на самой доске, никогда в превью.",
    browserSignin: "Браузер принадлежит вашему аккаунту. Войдите в приложение и вернитесь на эту вкладку.",
    browserOpenInApp: "Открыть в приложении",
    browserFullscreen: "На весь экран",
    browserExitFullscreen: "Свернуть",
    browserNone: "Браузер закрыт. Открытие запускает для вас машину; входы сохраняются между открытиями.",
    browserOpen: "Открыть браузер",
    browserStarting: "Запускаю ваш браузер...",
    browserUnavailable: "Браузеры на этом сервере сейчас не запущены.",
    browserClose: "Закрыть (входы сохранятся)",
    browserFailed: "Сервис браузера не ответил.",
    browserRetry: "Ещё раз",
    browserFrameTitle: "Ваш браузер",
    browserPasswords: "Пароли вводите сами, внутри окна. Их не видит никто, включая агента.",
    browserJournal: "Что здесь делал агент",
    browserDriving: "Руль у вас. Агент смотрит и ждёт.",
    browserHandBack: "Вернуть агенту",
    browserGuideTitle: "Что делает эта вкладка после входа",
    browserGuideLive: "Здесь виден ваш собственный браузер, запущенный на сервере, и им водит ваш агент.",
    browserGuideJournal: "Каждый шаг агента записывается под окном. Нажмите внутри окна, и руль ваш, а агент ждёт, пока вы не вернёте руль или десять минут ничего не трогаете.",
    browserGuidePasswords: "Эта страница никогда не спрашивает пароль. Пароли вы вводите сами, внутри окна.",
    browserGuideSpec: "Этот адрес называет спеку:",
    browserGuideReadSpec: "прочитать её во вкладке СПЕКИ, без входа",
    browserWatchInvite: "Пригласить посмотреть",
    browserWatchNote: "Ссылка для просмотра показывает этот браузер вживую и только для чтения: без кликов, без ввода, без агента. Банк, почта и сайты из вашего списка «спросить» или «запретить» скрыты -- но платёжная форма, встроенная в страницу магазина, видна вместе со страницей. До двух зрителей на ссылку; отозвать можно в любой момент.",
    browserWatchFor: "На",
    browserWatchHour: "ч",
    browserWatchLabel: "Для кого (необязательно)",
    browserWatchCreate: "Создать ссылку",
    browserWatchOnce: "Показывается один раз: скопируйте сейчас. Любой, у кого она есть, может смотреть, пока она не закончится или вы её не отзовёте.",
    browserWatchCopy: "Скопировать",
    browserWatchCopied: "Скопировано",
    browserWatchRevoke: "Отозвать",
    browserWatchWatching: "смотрят сейчас",
    browserWatchViews: "открытий",
    browserWatchNone: "Живых ссылок нет.",
    browserWatchFull: "Уже пять живых ссылок: сначала отзовите одну.",
    browserWatchFailed: "Сервер не создал ссылку. Попробуйте ещё раз.",
    browserWatchHide: "Скрыть",
    browserLanesAdd: "+ Задача рядом",
    browserLanesAddTitle: "Вторая задача в своём окне того же браузера. Чат остаётся на первой.",
    browserLanesRegion: "Задачи рядом",
    browserLanesPlaceholder: "Задача для отдельного окна, например: найди часы работы на example.org",
    browserLanesSend: "Отправить",
    browserLanesWorking: "работает...",
    browserLanesLimit: "Не больше трёх задач сразу, считая чат, и одну может держать другое устройство или бот. Закройте карточку или подождите: задача без дела 30 минут освобождается.",
    browserLanesOld: "Этот сервер браузера пока не ведёт задачи раздельно: ответ пришёл из основного разговора, в том же окне.",
    browserLanesSignedOut: "Войдите заново, чтобы отправить.",
    browserLanesFailed: "Сервер не ответил. Попробуйте ещё раз.",
    browserLanesClose: "Закрыть",
    browserLanesCloseTitle: "Карточка закроется. Её окно останется, пока его не займёт новая карточка или не пройдут 30 минут.",
    triScreens: "Экраны приложения",
    triFeed: "Лента",
    triAgent: "Агент",
    triAi: "ИИ",
    triProfile: "Профиль",
    triCrm: "CRM",
    triLoading: "Открываю app.t27.ai…",
    triNoAnswer: "Приложение не ответило внутри игры: возможно, оно ещё не разрешает t27.ai показывать себя во фрейме.",
    triOpenApp: "Открыть этот экран в приложении",
    triAppError: "Приложение столкнулось с ошибкой внутри игры.",
    triFrameTitle: "Приложение Trinity",
    triInsidePlayer: "Вы уже внутри приложения: TRI — это само приложение, и оно вокруг этой игры. Пользуйтесь его вкладками.",
    triPreview: "Превью не загружает приложение. Откройте TRI в самой игре.",
    identitySignIn: "Войти",
    identitySignInTitle: "Войти через Telegram на app.t27.ai и вернуться к этому виду",
    identitySignInAgain: "Войдите заново в TRI",
    identitySignedIn: "Вы вошли",
    identityRoleKeeper: "Хранитель",
    identityRoleOwner: "Владелец",
    identityRoleBee: "Пчела",
    identityPending: "Проверяю TRI…",
    identityConfirm: "Подтвердите в TRI",
    identityConfirmTitle: "TRI просит подтвердить в окне внизу страницы",
    identityConfirmAgainTitle: "Показать подтверждение TRI снова",
    identityResume: "Продолжить в TRI",
    identityResumeTitle: "Вход в TRI на этой странице истёк: откройте TRI, чтобы обновить его и вернуться к этому виду",
    identityRetry: "Повторить",
    identityOffline: "TRI недоступен",
    identityNoAnswer: "TRI не ответил",
    identityBusy: "TRI занят, подождите минуту",
    identityRefused: "TRI отказал",
    identityUnavailable: "Профиль недоступен",
    identityWebOnly: "Профиль — в веб-версии",
    identityOffSite: "Профиль работает на t27.ai",
    agentsLoading: "Загружаем Обозреватель…",
    agentsSpecs: "спек",
    agentsSpecCode: "спека+код",
    agentsSpecExperience: "спека+опыт",
    agentsUnattributed: "эпизодов без агента",
    agentsCodeOnly: "только код",
    agentsTypecheck: "типизация ок",
    functionsView: "ФУНКЦИИ",
    functionsHint: "28 функций Inngest бота, каждая заявлена спекой .t27",
    functionsDirective: "ФУНКЦИИ — ЭТО СПЕКИ",
    functionsDirectiveBody:
      "Слой, где спека встречается с работающим сервисом — шестой на лестнице этого сайта, после инструментов; specs/functions/README.md в t27 называет его пятым, как и specs/tools/README.md — инструменты, и два README расходятся: каждая функция Inngest бота 999-multibots-telegraf заявлена спекой .t27 в specs/functions — триггер, событие и старые события или крон, шаги в порядке исходника, повторы, действие при сбое, побочные эффекты, страж, безопасная проба и её результат — и засвидетельствована копией манифеста функций, прочитанного из репозитория на названном коммите. Где спека и манифест расходятся, карточка говорит об этом. Живые счётчики запусков читаются с бота раз в минуту и не придумываются: недоступный источник статуса показан как недоступный, а счётчик, которого он не прислал, — как «неизвестно», а не ноль.",
    providersView: "ПРОВАЙДЕРЫ",
    providersHint: "Кто продаёт вычисления: модели Gonka и GPU или FPGA в аренду за TRI (клавиша g)",
    widgetsView: "ВИДЖЕТЫ",
    widgetsHint: "Виджеты для репоста: записи, X-плеер, код встраивания (клавиша v)",
    providersDirective: "ПРОВАЙДЕРЫ — ЭТО СПЕКИ",
    providersDirectiveBody:
      "Седьмой слой: спеки → скиллы → кроны → агенты → инструменты → функции → провайдеры — кто продаёт вычисления, которые тратит вся остальная лестница. Провайдер существует, когда его заявляет спека .t27 в specs/providers: модель из списка цепи Gonka, где каждое число скопировано с публичного эндпоинта цепи в дату, которую называет карточка (сколько хостов её обслуживают, память GPU, контекст, порог валидации, цена), или класс железа, который человек мог бы сдать в аренду TRI-NET за TRI — FPGA Artix-7, измеренная на трёх платах, и игровая GPU на 24 ГБ, которая пока проект и не заявляет измерений. Страница по вашему запросу перечитывает цепь Gonka из вашего браузера и печатает каждое расхождение; она никогда не вызывает платную модель, не просит ключ и не показывает адрес хоста. Под обоими семействами лежит specs/providers/tri_gnk_pair.t27: TRI в testnet, у Gonka нет пула на DEX, а её мост ведёт в Ethereum, а не в TON или Solana.",
    providersRead: "прочитано с цепи или стенда",
    providersDesign: "только проект",
    specsTitle: "КОРПУС СПЕК",
    specsDirective: "ПОСТОЯННАЯ ДИРЕКТИВА",
    specsDirectiveBody:
      "Каждая часть проекта должна быть выражена как .t27-спека, а проект — порождаться из этих спек. Спека — источник истины; Zig, Verilog, C и Rust — выходы. Там, где ещё остаётся рукописный код, задача — заменить его спекой, которая его порождает, а не поддерживать оба.",
    specsCorpus: "здоровье корпуса",
    specsClean: "чисто",
    specsWarnings: "с замечаниями",
    specsBroken: "отклонено",
    specsSpecs: "спек",
    specsLines: "строк",
    specsNodes: "узлов AST",
    specsSources: "ИСТОЧНИКИ",
    specsOpen: "Открыть на весь экран ↗",
    specsLoading: "Загрузка компилятора…",
    specsGapTitle: "НАСКОЛЬКО ЭТО ДАЛЕКО НА САМОМ ДЕЛЕ",
    specsGapBody:
      "Измерено, а не заявлено: сгенерированный Verilog даёт 0 LUT и 0 триггеров на всех спеках, которые Yosys принимает, — оболочки модулей с IBUF/OBUF и ничем внутри. Битстримы, работающие на плате сегодня, собраны из рукописного RTL. Директива выше — цель; эта строка — расстояние.",
    combHeld: "занято",
    combNeutral: "нейтрально",
    combFog: "туман",
    combBees: "пчёлы",
    combQueen: "КОРОЛЕВА",
    combQueenCell: "центральная ячейка",
    combNoBee: "пчелы здесь нет",
    combPick: "Нажмите на ячейку. Пчела на ней или ячейка Королевы покажет портрет; каждая ячейка — одна карточка доски.",
    combHint2: "тяните — вращать · колесо — масштаб · клик — выбрать",
    hiveLawT27: "покрыто T27",
    hiveLawManual: "ручной код",
    hiveLawAwaiting: "ждёт T27",
    hiveLawUnknown: "покрытие T27 неизвестно",
    hiveLawBees: "пчёлы",
    factoryFlow: "ISSUE → SPEC → BEE → REVIEW → EVIDENCE",
    factoryThroughput: "Живая загрузка",
    factoryQueueDensity: "пик плотности очереди",
    factoryWorkerBays: "Ангары Bees",
    factoryIdle: "свободно",
    factoryStation: "станция",
    factoryModules: "модулей",
    factoryOffline: "телеметрия фабрики недоступна",
    factoryOpenIssue: "ОТКРЫТЬ РЕАЛЬНЫЙ МОДУЛЬ",
    factorySelectedModule: "ВЫБРАННЫЙ ПРОИЗВОДСТВЕННЫЙ МОДУЛЬ",
    factoryLiveContract:
      "Каждый ангар Bee, сборка и лаборатория ниже подтверждены живым реестром Queen.",
    cityTitle: "ИССЛЕДОВАТЕЛЬСКАЯ ЦИТАДЕЛЬ",
    cityCopy:
      "Живой город собран из канонического графа технологий. Лаборатории — узлы исследований, энергомаршруты — зависимости.",
    cityDistricts: "районов исследований",
    cityLaboratories: "реальных лабораторий",
    citySelected: "ВЫБРАННАЯ ЛАБОРАТОРИЯ",
    cityEvidence: "Доказательство",
    cityOffline: "Граф исследований недоступен — город не синтезирован.",
    cityBuildTitle: "ПРОТОКОЛ СТРОИТЕЛЬСТВА",
    cityComplete: "построено",
    cityAssembling: "строится",
    cityBlueprint: "чертежи",
    citySealed: "запечатано",
    cityDependencies: "зависимостей готово",
    foundryTitle: "ПОДПИСАННАЯ FPGA-ВЕРФЬ",
    foundryVerified: "Подпись реестра проверена. Сооружения показывают только подписанные публичные факты.",
    foundryUnavailable: "Реестр оборудования недоступен — FPGA-сооружения не отображаются.",
    foundryTotal: "проверено устройств",
    foundryOnline: "онлайн сейчас",
    foundryProgrammed: "прошито",
    foundryKey: "ключ подписи",
    mapLegend:
      "Маршруты показывают движение по циклу Queen; реальные зависимости есть только в Дереве технологий ниже.",
    sector: "сектор",
    rounds: "циклов / 24ч",
    beesStarted: "старт / 24ч",
    verdicts: "вердиктов",
    empty: "Здесь пусто",
    criteria: "критерия",
    missing: "нужно",
    showMore: "ещё",
    // The same two boards, in Russian. The warning is deliberately blunter here
    // than a label would be: it is the sentence a person reads a half-second
    // before deciding whether to open a stranger's pipeline on a screen that
    // may not be theirs alone.
    laneTasks: "ЗАДАЧИ",
    laneSwitchAria: "Какая доска",
    lanePrivate: "приватно",
    lanePrivateHint: "имена и оплаты — это показали только вам",
    // The Russian names of the directions are not here either: they sit on the
    // same entries as the rules, in lib/queenDirection.ts.
    tasksDirection: "Направление",
    tasksDirectionAll: "Все",
    tasksFilterAria: "Фильтр задач",
    tasksFilterToggle: "Фильтр",
    tasksFind: "название или #номер",
    tasksKind: "Вид",
    tasksKindAll: "все виды",
    tasksKindIssue: "задачи",
    tasksKindReview: "ревью",
    tasksKindJob: "работы",
    tasksKindReviewOne: "ревью",
    tasksKindJobOne: "работа",
    tasksState: "Состояние",
    tasksStateAll: "все состояния",
    tasksStateFailed: "сбой",
    tasksRepo: "Репозиторий",
    tasksRepoAll: "все репозитории",
    tasksReset: "сбросить",
    tasksFromBoard: "выведено из доски: маршрут задач не отвечает",
    tasksTruncated: "обрезано лимитом маршрута",
    tasksBeeTitle: "Пчела на задаче: её линия, работает или молчит, сколько она на задаче и когда её слышали",
    healthFull: "все {n} линий заняты",
    healthPacing: "свободно линий: {free} · готовых задач ждут очереди: {waiting}",
    healthFiles: "свободно линий: {free} · задач ждут файлов, занятых другой пчелой: {count}",
    healthShape: "свободно линий: {free} · задач без Boundary: {count}",
    healthClaimed: "свободно линий: {free} · все открытые задачи уже взяты ({count})",
    healthEmpty: "свободно линий: {free} · открытой работы нет",
    healthTitle: "Почему линии простаивают, по последнему раунду Королевы",
    lanesLabel: "Дорожки",
    lanesNone: "без дорожек",
    lanesRepo: "по репозиториям",
    lanesKind: "по видам",
    lanesOther: "прочее",
    drawerOpen: "Подробно",
    drawerClose: "Закрыть",
    drawerTimeline: "История",
    drawerLease: "Lease",
    drawerLeaseNone: "lease нет",
    drawerLeaseLive: "держится, fence {fence}, истекает через {left}",
    drawerLeaseExpired: "истёк {left} назад, fence {fence}: задачу заберут обратно",
    drawerAttempts: "Попытки",
    drawerSendBacks: "возвратов",
    drawerFreeAttempts: "бесплатных попыток",
    drawerCeilingReleases: "сбросов потолка",
    drawerReviewerMisses: "промахов ревьюера",
    drawerReview: "ревью",
    drawerStarted: "начата",
    drawerFinished: "закончена",
    drawerEffects: "Эффекты",
    drawerEffectStep: "шаг",
    drawerEffectRuns: "запусков",
    drawerEmpty: "пока ничего не записано",
    drawerMissing: "этот сервер пока не отвечает на карточку задачи",
    drawerLoading: "читаю…",
    drawerOnGithub: "Открыть на GitHub",
    evCreated: "пчела взяла задачу",
    evEnded: "пчела закончила",
    evLeaseLost: "lease истёк, задачу забрали обратно",
    evEvidence: "пчела работала",
    evReviewed: "проверена",
    evAssign: "человек назначил задачу",
    evCancel: "человек отменил задачу",
    laneClients: "КЛИЕНТЫ",
    clientsLaneAria: "Доска клиентов",
    clientsNarrow: "Сузить до",
    clientsNarrowAll: "Все",
    clientsNarrowSearch: "найти человека",
    clientsNarrowed: "улей уже сузил эту доску",
    clientsPending: "Спрашиваем улей…",
    clientsRefused: "Улей не открыл вам эту доску.",
    clientsOffline: "Улей не ответил. Спросим ещё раз.",
    clientsUnreadable: "Улей ответил тем, что эта страница не может прочитать.",
    clientsEmpty: "На вашей доске пока никого.",
    clientsNoName: "без имени",
    clientsPaid: "оплатил",
    clientsWaiting: "ждёт ответа",
    clientsQuiet: "дней тишины",
    clientsTouched: "последний контакт",
    laneBall: "ПОЧТА",
    ballLaneAria: "Почта и чей ход",
    ballPrivateHint: "почта владельца — видит владелец и те, кому он разрешил",
    ballOurs: "наш ход",
    ballDue: "обещано",
    ballTheirs: "их ход",
    ballNone: "ничей",
    ballSourceMail: "почта",
    ballSourceCrm: "чат",
    ballSourceGithub: "код",
    ballDays: "дн.",
    ballEmpty: "Ничего не ждёт.",
    ballStale: "Снимок почты устарел: машина владельца давно не присылала новый.",
    command: "ЖИВОЙ КОМАНДНЫЙ ЦЕНТР",
    commandTitle: "Королева сама ревьюит работу роя.",
    commandCopy:
      "Экран следует реальному циклу надзирателя: выбор, изолированное выполнение, саморевью, вердикт Королевы и приёмка.",
    nextRound: "следующий цикл Queen",
    reviewing: "ждут ревью Королевы",
    queenReviewPending: "Ревью Queen",
    changesRequested: "Нужны изменения",
    humanEscalation: "Решение человека",
    reconciliationAnomaly: "Аномалия реестра",
    hudReviewUnclassified: "состояние не пришло",
    executing: "выполняются сейчас",
    noBees:
      "Сейчас ни одна Bee не выполняет задачу. Queen остаётся онлайн и контролирует очередь по политике.",
    reviewQueue: "очередь ревью Queen",
    activity: "ЖИВЫЕ СОБЫТИЯ BEES",
    activityRate: "пульс каждые 2 секунды",
    noActivity: "Ждём следующее записанное событие Bee.",
    synchronized: "синхронизация каждые 5 секунд",
    selfReview: "САМОРЕВЬЮ",
    selfReviewCopy:
      "Bee запускает проверки и изучает собственный diff до передачи результата.",
    verdict: "ВЕРДИКТ QUEEN",
    verdictCopy:
      "Королева судит доказательства, отклоняет слабую работу и принимает только прошедший результат.",
    merge: "ПРИЁМКА / MERGE",
    mergeCopy:
      "Одобренная работа попадает в репозиторий с полным следом доказательств.",
    tech: "ТЕХ-ДЕРЕВО",
    techTitle: "Язык .t27 и цена каждого его шага.",
    techCopy:
      "Эволюция языка, прочитанная из индекса корпуса, который эта страница и так отдаёт: компилятор-семя, конструкции, которые используют спеки, проверки, которые они проходят, бэкенды, в которые они порождаются, репозитории, принявшие их, и путь к кремнию. Выберите узел, чтобы увидеть его свидетельство, зависимости и то, что он откроет дальше.",
    researched: "исследовано",
    researching: "изучается",
    available: "доступно дальше",
    locked: "заблокировано",
    prerequisites: "Зависимости",
    unlocks: "Откроет дальше",
    noPrerequisites: "Доступно с начала",
    terminalNode: "Финальная технология ветки",
    overallResearch: "исследовано всего",
    activeResearch: "активных исследований",
    nextAvailable: "доступно дальше",
    evidence: "Доказательство",
    graphOffline: "ИНДЕКС КОРПУСА .T27 НЕДОСТУПЕН",
    graphLoading: "Чтение индекса .t27…",
    workerPool: "A2A ВОРКЕРЫ ИССЛЕДОВАНИЙ",
    workerPoolCopy:
      "Каждый оплаченный слот несёт одну изолированную Bee и не делит rate limit с соседями.",
    slotsBusy: "слотов занято",
    copyAgent: "COPY TO AGENT",
    copiedAgent: "BOOTSTRAP СКОПИРОВАН",
    copyAgentTitle: "Подключить агента к исследованиям и разработке TRINITY.",
    copyAgentCopy:
      "Копирует публичный A2A-bootstrap, адреса графа, репозитории, evidence-скиллы и правила адаптации. Секреты и права на изменения не копируются.",
    copyFailed: "НЕ УДАЛОСЬ СКОПИРОВАТЬ",
    nodeMaturity: "Зрелость в репозитории",
    // ---- single-screen HUD ----
    hudBrand: "TRINITY QUEEN",
    hudBees: "ПЧЁЛЫ",
    hudBeesCeiling: "потолок улья: {cap}",
    hudDone: "ГОТОВО",
    hudVerdicts: "ВЕРДИКТЫ",
    hud24h: "24ч",
    hudResearch: "ИССЛЕДОВАНИЯ",
    hudFoundry: "ВЕРФЬ",
    hudNextRound: "С ПРОШЛОГО ЦИКЛА",
    hudMenu: "МЕНЮ",
    hudLanguage: "EN / RU",
    hudShortcuts: "КЛАВИШИ",
    hudOn: "ВКЛ",
    hudOff: "ВЫКЛ",
    hudViews: "ВИДЫ",
    hudIntel: "ЛЕНТА РАЗВЕДКИ",
    hudLive: "В СЕТИ",
    unitS: "с",
    unitMin: "мин",
    unitH: "ч",
    hudOffline: "НЕ В СЕТИ",
    hudOverview: "ОБЗОР",
    hudSectors: "СЕКТОРА",
    hudContext: "ДЕТАЛИ КОНТЕКСТА",
    hudQueue: "ОЧЕРЕДЬ ПЧЁЛ",
    hudQueueEmpty: "Ни одна Bee не работает. Королева держит очередь по политике.",
    hudReviewQueue: "ОЧЕРЕДЬ РЕВЬЮ",
    hudLast: "ПОСЛЕДНИЙ",
    hudSelected: "ВЫБРАНО",
    hudTheQueen: "КОРОЛЕВА",
    hudQueenRole: "Надзиратель. Выбирает, делегирует, судит.",
    hudBackend: "BACKEND",
    hudTerritory: "ТЕРРИТОРИЯ",
    hudNeeds: "НУЖНО",
    hudNoBee: "ПЧЕЛЫ НЕТ",
    hudSlot: "СЛОТ",
    hudBusy: "ЗАНЯТ",
    hudCell: "ЯЧЕЙКА",
    hudAllow: "РАЗРЕШЕНО",
    hudRefuse: "ОТКАЗ",
    hudSchedulerOff: "ПЛАНИРОВЩИК ВЫКЛЮЧЕН",
    hudOverdue: "ПРОСРОЧЕН",
    hudStale: "УСТАРЕЛО",
    hudDispatched: "запущен",
    hudOpenIssue: "ОТКРЫТЬ ЗАДАЧУ",
    hudCopyLink: "КОПИРОВАТЬ ССЫЛКУ",
    hudLinkCopied: "ССЫЛКА СКОПИРОВАНА",
    hudClose: "Закрыть",
    hudActiveSector: "АКТИВНЫЙ СЕКТОР",
    hudProduction: "PRODUCTION",
    hudCards: "КАРТОЧЕК",
    hudHeld: "ЗАНЯТО",
    hudSlots: "СЛОТОВ",
    hudSignature: "ПОДПИСЬ",
    hudVerified: "ПРОВЕРЕНА",
    hudUnverified: "НЕ ПРОВЕРЕНА",
    hudDevice: "УСТРОЙСТВО",
    hudCommands: "БЫСТРЫЕ КОМАНДЫ",
    hudOpenRepo: "ОТКРЫТЬ РЕПО",
    hudFitView: "ВПИСАТЬ",
    hudLayerFoundation: "ФУНДАМЕНТ",
    hudLabels: "МЕТКИ",
    hudEpic: "ЭПИК",
    hudLayerCastle: "ЗАМОК",
    hudLayerCode: "КОД",
    hudFoundationSnapshot: "снимок",
    hudClosed: "закрыто",
    hudZoomIn: "ПРИБЛИЗИТЬ",
    hudZoomOut: "ОТДАЛИТЬ",
    hudFullscreen: "ВО ВЕСЬ ЭКРАН",
    hudExitFullscreen: "ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА",
    hudTools: "Инструменты карты",
    hudToolsClose: "Скрыть инструменты карты",
    hudCollapse: "СВЕРНУТЬ",
    hudExpand: "РАЗВЕРНУТЬ",
    hudNoEvents: "Записанных событий Bee пока нет.",
    researchHint: "Канонический граф доказательств",
  },
} as const;

type Copy = (typeof COPY)["ru"] | (typeof COPY)["en"];

function useQueenStatus(): LoadState {
  const [state, setState] = useState<LoadState>({
    kind: "loading",
    data: null,
    error: null,
    offsetMs: null,
  });

  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const sentAt = Date.now();
        const response = await fetch(`${QUEEN_API}/queen/status`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        // the server's clock rides on the Date header (P1-30); absent (not
        // exposed across origins) it stays null and the client clock is used
        const offsetMs = serverOffsetMs(response.headers.get("Date"), sentAt, Date.now());
        const data = (await response.json()) as QueenStatus;
        if (active) setState({ kind: "ready", data, error: null, offsetMs });
      } catch (error) {
        if (!active) return;
        setState((previous) => ({
          kind: "error",
          data: previous.data,
          error: error instanceof Error ? error.message : String(error),
          offsetMs: previous.offsetMs,
        }));
      }
    };

    void read();
    const timer = window.setInterval(read, LIVE_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return state;
}

/**
 * The repository's modules (M-2): the server's scan (/queen/public-modules,
 * M-1) first, public/queen/modules.json -- a scan stamped with its commit --
 * when the wire has none. Read through the corpus store like every other part.
 */
function useQueenModules(): { data: (ModulesSnapshot & { source: CorpusSource }) | null; error: string | null } {
  const { part, error } = useCorpus("modules", { wire: `${QUEEN_API}/queen/public-modules`, pollMs: MODULES_POLL_MS });
  const data = useMemo(() => (part ? { ...part.data, source: part.source } : null), [part]);
  return { data, error };
}

/**
 * The corpus index, from the store every tab and the Explorer frame share
 * (src/lib/queenCorpus.ts): 1.8 MB, read once per window tree. Its failure is
 * reported separately from the supervisor's: the TECH TREE is drawn from this
 * file, so a tree with no index is offline even while the wire is healthy, and
 * a tree with an index is complete even while the wire is down.
 */
function useT27Manifest(): { manifest: unknown; part: ManifestPart | null; error: string | null } {
  const { part, error } = useCorpus("manifest");
  return { manifest: part?.data ?? null, part, error };
}

/**
 * Bind corpus claims to the displayed module snapshot, not to the board repo.
 * Retain raw data so a repo change cannot reuse the previous repo's coverage.
 * Failed/unavailable reads remain explicitly unknown.
 */
function useT27Coverage(repository: string | null): ReadonlySet<string> | null {
  const { manifest } = useT27Manifest();
  return useMemo(() => hiveCoverageFromManifest(manifest, repository), [manifest, repository]);
}

/**
 * The honeycomb's facts from GitHub: the server's route first
 * (/queen/public-foundation, when it exists), the loop's dated snapshot in
 * public/queen/foundation.json otherwise. The wire carries no closed_at,
 * labels or epics, so this is the only honest source; absent, the layers
 * read a dash and draw nothing.
 */
function useQueenFoundation(): { data: (FoundationSnapshot & { source: CorpusSource }) | null; error: string | null } {
  const { part, error } = useCorpus("foundation", { wire: `${QUEEN_API}/queen/public-foundation`, pollMs: FOUNDATION_POLL_MS });
  const data = useMemo(() => (part ? { ...part.data, source: part.source } : null), [part]);
  return { data, error };
}

function useQueenBoard(): {
  data: QueenBoard | null;
  error: string | null;
  syncedAt: Date | null;
} {
  const [data, setData] = useState<QueenBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const response = await fetch(`${QUEEN_API}/queen/public-board`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = (await response.json()) as QueenBoard;
        if (active) {
          setData(next);
          setError(null);
          setSyncedAt(new Date());
        }
      } catch (nextError) {
        if (active) {
          setError(
            nextError instanceof Error ? nextError.message : String(nextError),
          );
        }
      }
    };

    void read();
    const timer = window.setInterval(read, LIVE_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { data, error, syncedAt };
}

/**
 * The clients lane's data: hive_board, asked as the person who is signed in.
 *
 * Signed out, this hook asks nothing and holds nothing, and the kanban has no
 * second lane at all — not an empty one, not a locked one. That is the whole
 * of the signed-out behaviour, and it is enforced here rather than in the view
 * because a view that receives a board has already been handed the data.
 *
 * `enabled` is the kanban being on screen. A tab nobody is looking at does not
 * spend a credential, and the token's own renewal already stops when nothing
 * subscribes (src/lib/triIdentity.ts, rule 5).
 *
 * What a failure does to the board it already has is not one rule but two:
 *   - refused, or signed out: the board is DROPPED. The hive has just said
 *     this person may not see it; leaving yesterday's rows on screen would be
 *     showing exactly what was refused.
 *   - offline, or unreadable: the board is KEPT. Nothing was said about who
 *     may see what — the question simply did not come back — and blanking a
 *     correct panel because one poll missed is its own kind of lie.
 */
function useHiveBoard(enabled: boolean): {
  /**
   * Whether anything client-scoped may be drawn at all: a person the hive has
   * identified, on a board that is on screen. The view's single gate hangs off
   * this, so "signed out" and "not looking" cannot each be forgotten
   * separately.
   */
  showing: boolean;
  board: HiveBoard | null;
  reason: HiveBoardReason | null;
} {
  const identity = triIdentity();
  const me = useSyncExternalStore(identity.subscribe, identity.getSnapshot);
  const signedIn = me.state === "signed-in";
  const [board, setBoard] = useState<HiveBoard | null>(null);
  const [reason, setReason] = useState<HiveBoardReason | null>(null);

  useEffect(() => {
    if (!enabled || !signedIn) {
      setBoard(null);
      setReason(null);
      return;
    }
    let active = true;
    const read = async () => {
      const answer = await loadHiveBoard(identity);
      if (!active) return;
      if (answer.ok) {
        setBoard(answer.board);
        setReason(null);
        return;
      }
      setReason(answer.reason);
      if (answer.reason === "refused" || answer.reason === "signed-out") setBoard(null);
    };
    void read();
    const timer = window.setInterval(read, HIVE_BOARD_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled, identity, signedIn]);

  return { showing: enabled && signedIn, board, reason };
}

/**
 * The mail lane's data: ball_board, asked as the person who is signed in.
 *
 * The same life as useHiveBoard's, with one rule made stricter: ANY failure
 * that says who may see it -- refused, signed out -- drops the board, and so
 * does a board that came back without the mail (lib/ballBoard.ts ballLane).
 * An owner who revokes a grant takes the lane off the viewer's screen at the
 * next poll; offline keeps the last true board rather than blanking it.
 */
function useBallBoard(enabled: boolean): { showing: boolean; board: BallBoard | null } {
  const identity = triIdentity();
  const me = useSyncExternalStore(identity.subscribe, identity.getSnapshot);
  const signedIn = me.state === "signed-in";
  const [board, setBoard] = useState<BallBoard | null>(null);

  useEffect(() => {
    if (!enabled || !signedIn) {
      setBoard(null);
      return;
    }
    let active = true;
    const read = async () => {
      const answer = await loadBallBoard(identity);
      if (!active) return;
      if (answer.ok) setBoard(answer.board);
      else if (answer.reason === "refused" || answer.reason === "signed-out") setBoard(null);
    };
    void read();
    const timer = window.setInterval(read, HIVE_BOARD_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled, identity, signedIn]);

  return { showing: enabled && signedIn, board };
}

function useQueenActivity(): {
  data: ActivityBuffer | null;
  error: string | null;
} {
  const [data, setData] = useState<ActivityBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cursor = useRef(Date.now() - 24 * 60 * 60 * 1_000);

  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const response = await fetch(
          `${QUEEN_API}/queen/public-activity?since=${cursor.current}`,
          {
            headers: { Accept: "application/json" },
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = (await response.json()) as QueenActivity;
        if (active) {
          cursor.current = next.cursor - ACTIVITY_POLL_MS;
          // the merge is pure (P0-9): same-second ties keep the newest
          // poll's wire order, the bell's alerts age out by the window
          setData((previous) => mergeActivity(previous, next, Date.now()));
          setError(null);
        }
      } catch (nextError) {
        if (active) {
          setError(
            nextError instanceof Error ? nextError.message : String(nextError),
          );
        }
      }
    };

    void read();
    const timer = window.setInterval(read, ACTIVITY_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { data, error };
}

/**
 * One task view and its bees (gHashTag/t27 specs/queen/tasks.t27): the route
 * when it answers, the public board and the activity feed when it does not.
 *
 * ONE LOOP, TWO SIZES. The game needs the bees and the running issues; the
 * kanban needs every task. So the same loop asks for `state=running` (about
 * 2 KB compressed; the bees come with any filter) unless the kanban is on
 * screen, and for everything (about 55 KB) while it is. A kanban that opens
 * before the full answer arrives is drawn from the board, never from the
 * running-only answer, which would read as a board of twenty tasks.
 *
 * THE FALLBACK ADDS NO REQUEST. The board and the activity feed are polled by
 * this page already; tasksFromBoard reshapes them, and the feed says
 * `source: "board"` so the screen can say which it is drawing.
 */
function useQueenTasks(
  full: boolean,
  board: QueenBoard | null,
  boardError: string | null,
  events: readonly ActivityLike[],
): { feed: QueenTasksFeed | null; health: HiveFeedHealth; error: string | null; events: readonly SeenEvent[] } {
  const [wire, setWire] = useState<{ feed: QueenTasksFeed; scope: TasksScope } | null>(null);
  const [wireError, setWireError] = useState<string | null>(null);
  // The events the bus delivered lately, newest last, for the game to draw
  // (gHashTag/t27 specs/queen/hive.t27 cell_effect). A short tail: a flash
  // lasts under two seconds, and a page that was away has nothing to replay.
  const [seen, setSeen] = useState<readonly SeenEvent[]>(EMPTY_SEEN);
  // THE BUS (gHashTag/t27 specs/queen/events.t27). One snapshot, which carries
  // the cursor it was read at; then only the events past it, each decided by the
  // card: a bee heard is touched where it is, a task that moved is read again
  // alone, and a gap or a pruned cursor is one more snapshot. A route without a
  // cursor (a server before the bus) is polled as before. A whole snapshot still
  // comes every SNAPSHOT_EVERY_SECONDS, for what GitHub changed and no event says.
  useEffect(() => {
    let active = true;
    let timer = 0;
    let controller: AbortController | null = null;
    const scope: TasksScope = full ? "all" : "running";
    let feed: QueenTasksFeed | null = null;
    let cursor: number | null = null;
    let snapshotAt = 0;
    let busOk = true;
    const show = (next: QueenTasksFeed) => {
      if (next === feed) return;
      feed = withEarliestSince(feed, next);
      setWire({ feed, scope });
    };
    const snapshot = async () => {
      controller = new AbortController();
      try {
        // The cards decide the filter, the bees' states and every event; nothing
        // is shown before they are loaded, so nothing is decided without them.
        const [next] = await Promise.all([loadTasksFeed(QUEEN_API, scope, controller.signal), cardReady]);
        if (!active) return;
        await eventsCardReady.catch(() => (busOk = false));
        if (!active) return;
        show(next);
        setWireError(null);
        snapshotAt = Date.now();
        cursor = next.cursor;
        if (cursor !== null && busOk) void follow();
        else timer = window.setTimeout(snapshot, LIVE_POLL_MS);
      } catch (error) {
        if (!active) return;
        setWireError(error instanceof Error ? error.message : String(error));
        timer = window.setTimeout(snapshot, TASKS_RETRY_MS);
      }
    };
    const follow = async () => {
      if (!feed || cursor === null) return void snapshot();
      if (Date.now() - snapshotAt >= SNAPSHOT_EVERY_SECONDS * 1000) return void snapshot();
      controller = new AbortController();
      try {
        const page = await loadBusPage(QUEEN_API, cursor, WAIT_MAX_SECONDS, controller.signal);
        if (!active || !feed) return;
        const plan = planPage(cursor, page);
        if (plan.snapshot) return void snapshot();
        let next = touchBees(ageBees(feed, Date.now()), plan.touched, Date.now());
        if (plan.refresh.length > 0 && plan.repo) {
          const fresh = await loadTasksFeed(QUEEN_API, scope, controller.signal, plan.refresh);
          if (!active) return;
          next = patchFeed(next, fresh, plan.repo, plan.refresh);
        }
        cursor = plan.cursor;
        show(next);
        setWireError(null);
        if (plan.applied.length > 0) {
          const seenAt = Date.now();
          setSeen((previous) => [...previous, ...plan.applied.map((event) => ({ ...event, seenAt }))].slice(-SEEN_EVENTS));
        }
        timer = window.setTimeout(follow, READ_PAUSE_MS);
      } catch (error) {
        if (!active) return;
        // A server without the bus answers 404: poll snapshots, as before it.
        if ((error as { status?: number }).status === 404) busOk = false;
        timer = window.setTimeout(snapshot, LIVE_POLL_MS);
      }
    };
    void snapshot();
    // A bee nobody hears from turns quiet with no event to say so.
    const aging = window.setInterval(() => {
      if (active && feed) show(ageBees(feed, Date.now()));
    }, READ_PAUSE_MS * 5);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearInterval(aging);
      controller?.abort();
    };
  }, [full]);
  // When each running card was first seen running, for the derived bees' "since".
  const running = useMemo(
    () => (board?.cards ?? []).filter((card) => card.column === "running").map((card) => card.number),
    [board],
  );
  const runningKey = running.join(",");
  const [firstSeen, setFirstSeen] = useState<{ key: string; map: Map<number, string> }>({ key: "", map: new Map() });
  if (firstSeen.key !== runningKey) {
    setFirstSeen({ key: runningKey, map: observeRunning(firstSeen.map, running, new Date().toISOString()) });
  }
  const [cardOk, setCardOk] = useState(cardLoaded);
  useEffect(() => {
    let live = true;
    cardReady.then(() => live && setCardOk(true)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const derived = useMemo(
    () => (board && cardOk ? tasksFromBoard(board.repo, board.cards, events, firstSeen.map, Date.now()) : null),
    [board, events, firstSeen, cardOk],
  );
  const wireUsable = wire !== null && wireError === null && (wire.scope === "all" || !full);
  if (wireUsable) return { feed: wire.feed, health: "live", error: null, events: seen };
  return { feed: derived, health: derived ? hiveFeedHealth(true, boardError) : "unknown", error: wireError, events: EMPTY_SEEN };
}

/**
 * The tech tree, and the live pool that works on it.
 *
 * These are two different subjects and they now come from two different places,
 * because one of them kept taking the other down with it. The GRAPH is the
 * evolution of the .t27 language, derived from the corpus index this bundle
 * already ships (public/t27/manifest.json, dated and attributed to a commit of
 * gHashTag/t27) -- see deriveT27Evolution, which reads every count it prints.
 * The WORKERS, the runtime status and the agent bootstrap are the supervisor's
 * and only the supervisor knows them, so they still come off the wire.
 *
 * Before this the tree was the supervisor's own research graph, which meant a
 * supervisor that was not answering -- 502, then no answer at all, measured
 * 2026-09-20 -- left the tab drawing RESEARCH GRAPH OFFLINE over an empty
 * console. The language's own history does not stop when a container restarts,
 * and it is the thing this page is about.
 *
 * `error` is still the wire's error and still says when the live half is out;
 * the tree draws regardless.
 */
function useQueenResearch(lang: string): {
  data: ResearchGraph | null;
  /** The .t27 evolution only: null when the corpus index did not load. */
  tree: ResearchGraph | null;
  error: string | null;
  /** Why the TECH TREE has nothing to draw -- the index, not the supervisor. */
  sourceError: string | null;
  syncedAt: Date | null;
} {
  const [live, setLive] = useState<ResearchGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const { manifest, error: sourceError } = useT27Manifest();

  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const response = await fetch(`${QUEEN_API}/queen/public-research`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = (await response.json()) as ResearchGraph;
        if (active) {
          setLive(next);
          setError(null);
          setSyncedAt(new Date());
        }
      } catch (nextError) {
        if (active) {
          setError(
            nextError instanceof Error ? nextError.message : String(nextError),
          );
        }
      }
    };

    void read();
    const timer = window.setInterval(read, LIVE_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const evolution = useMemo(
    () => deriveT27Evolution(manifest, lang),
    [manifest, lang],
  );

  const data = useMemo<ResearchGraph | null>(() => {
    if (!evolution) return live;
    return {
      nodes: evolution.nodes,
      edges: evolution.edges,
      layers: evolution.layers,
      summary: evolution.summary,
      runtime: live?.runtime ?? { status: "offline" },
      workers: live?.workers ?? {
        capacity: 0,
        active: 0,
        idle: 0,
        utilization: 0,
        slots: [],
      },
      agentBootstrap: live?.agentBootstrap ?? fallbackBootstrap(),
    };
  }, [evolution, live]);

  // The tab's subject is the language. Without the index there is no tree to
  // draw, and drawing the supervisor's task graph in its place would put a
  // different subject under the same heading -- which is what this tab used to
  // do, and the reason the rename was asked for.
  const tree = evolution ? data : null;

  return { data, tree, error, sourceError, syncedAt };
}

function useQueenHardware(): {
  data: VerifiedHardwareRegistry | null;
  error: string | null;
} {
  const [data, setData] = useState<VerifiedHardwareRegistry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const response = await fetch(`${QUEEN_API}/queen/public-hardware`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const envelope: unknown = await response.json();
        const verified = await verifyHardwareEnvelope(
          envelope,
          PINNED_QUEEN_HARDWARE_PUBLIC_KEY,
        );
        if (!verified) throw new Error("hardware signature verification failed");
        if (active) {
          setData(verified);
          setError(null);
        }
      } catch (nextError) {
        if (active) {
          setData(null);
          setError(
            nextError instanceof Error ? nextError.message : String(nextError),
          );
        }
      }
    };

    void read();
    const timer = window.setInterval(read, LIVE_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { data, error };
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

/** A CSS media query as React state; the subscription is the query's own listener. */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const read = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, read, () => false);
}

/** Close a popover on Escape or on a pointer-down outside its element. */
function useDismiss(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const host = ref.current;
      if (host && !host.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, onClose]);
}

function formatMoment(value: string | null | undefined, lang: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatCountdown(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return [hours, minutes, remainder]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function activityLabel(event: QueenActivityEvent, lang: string) {
  const labels =
    lang === "ru"
      ? {
          dispatch: "Queen делегировала",
          progress: "Bee сообщает прогресс",
          tool: "Bee использует инструмент",
          result: "Bee получила результат",
          usage: "Bee обновила метрики",
          error: "Bee встретила ошибку",
          finished: "Bee завершила работу",
          review: "Queen вынесла вердикт",
        }
      : {
          dispatch: "Queen delegated",
          progress: "Bee reported progress",
          tool: "Bee used a tool",
          result: "Bee received a result",
          usage: "Bee updated metrics",
          error: "Bee hit an error",
          finished: "Bee finished work",
          review: "Queen issued a verdict",
        };
  const word = labels[event.kind] ?? labels.progress;
  // the wire's own state follows the kind word for verdicts and finishes
  // (P1-24): "Queen issued a verdict · wait", "Bee finished work · accepted";
  // the state is a wire field printed as-is, absent means no suffix
  return (event.kind === "review" || event.kind === "finished") && event.state && event.state !== event.kind ? `${word} · ${event.state}` : word;
}

// the field's three toggleable layers (H-D): the COPY key of each button and its glyph
const LAYER_COPY: Record<FieldLayer, "hudLayerFoundation" | "hudLayerCastle" | "hudLayerCode"> = { foundation: "hudLayerFoundation", castle: "hudLayerCastle", code: "hudLayerCode" };
const LAYER_GLYPH: Record<FieldLayer, string> = { foundation: "⬢", castle: "♜", code: "▦" };

// One colour and one glyph per layer. The first six were the supervisor's own
// research layers; the four after them are the .t27 evolution's, and they are
// listed here for the same reason the others are -- a layer with no entry draws
// a white diamond, which is legible but says nothing about where it sits.
const LAYER_DESIGN: Record<string, { color: string; icon: string }> = {
  seed: { color: "#00ff88", icon: "◆" },
  ring: { color: "#7dffbf", icon: "◎" },
  silicon: { color: "#ffd700", icon: "▰" },
  runtime: { color: "#29d7ff", icon: "◈" },
  supervisor: { color: "#ff4fb8", icon: "♛" },
  interface: { color: "#b69cff", icon: "▦" },
  language: { color: "#7dffbf", icon: "⟐" },
  check: { color: "#29d7ff", icon: "✓" },
  backend: { color: "#b69cff", icon: "⇥" },
  adoption: { color: "#ff4fb8", icon: "◎" },
};

// The column caption above each layer. It used to print the layer id, which is
// an English word sitting on a Russian page; the four evolution layers made
// that visible enough to fix. An unknown layer still prints its id, because a
// caption that is merely untranslated is better than no caption at all.
const LAYER_CAPTION: Record<string, { en: string; ru: string }> = {
  seed: { en: "seed", ru: "семя" },
  ring: { en: "ring", ru: "кольцо" },
  silicon: { en: "silicon", ru: "кремний" },
  runtime: { en: "runtime", ru: "исполнение" },
  supervisor: { en: "supervisor", ru: "супервизор" },
  interface: { en: "interface", ru: "интерфейс" },
  language: { en: "language", ru: "язык" },
  check: { en: "checks", ru: "проверки" },
  backend: { en: "backends", ru: "бэкенды" },
  adoption: { en: "adoption", ru: "принятие" },
};

function layerCaption(layer: string, lang: string): string {
  const caption = LAYER_CAPTION[layer];
  if (!caption) return layer;
  return lang === "ru" ? caption.ru : caption.en;
}

function fallbackBootstrap(): ResearchGraph["agentBootstrap"] {
  return {
    version: "trinity-research-a2a/v1",
    mode: "public-read-only",
    protocol: "A2A",
    endpoints: {
      research: `${QUEEN_API}/queen/public-research`,
      board: `${QUEEN_API}/queen/public-board`,
      activity: `${QUEEN_API}/queen/public-activity`,
    },
    repositories: [
      "https://github.com/gHashTag/trinity",
      "https://github.com/gHashTag/BrowserOS/tree/feat/queen-supervisor/trios",
    ],
    skills: [
      "spec-first acceptance criteria",
      "OBSERVED / CLAIM / INFERENCE / TARGET / UNKNOWN evidence labels",
      "dependency-aware research",
      "adversarial review",
      "append-only experience and checkpoints",
    ],
    adaptation: {
      read: ["research graph", "public board", "public activity"],
      write:
        "Use a scoped repository issue or authenticated A2A session. Public endpoints grant no mutation authority.",
    },
  };
}

function agentBootstrapText(
  bootstrap: ResearchGraph["agentBootstrap"],
  lang: string,
) {
  const mission =
    lang === "ru"
      ? "Подключись к исследованиям и разработке TRINITY. Сначала прочитай граф зависимостей, выбери только доступный узел, зафиксируй проверяемый контракт, работай в изоляции и верни доказательства для adversarial review. Не считай публичный read-only доступ правом на изменения.\n\nПОСТОЯННАЯ ДИРЕКТИВА: каждая часть проекта должна быть выражена как .t27-спека, а проект — порождаться из этих спек. Спека — источник истины; Zig, Verilog, C и Rust — выходы. Встретив рукописный код, предпочитай заменить его спекой, которая его порождает, а не поддерживать оба. Директива — цель, а не текущее состояние: сгенерированный Verilog сегодня даёт 0 LUT и 0 триггеров, поэтому измеряй, а не заявляй."
      : "Join TRINITY research and development. Read the dependency graph first, choose only an available node, write an observable contract, work in isolation, and return evidence for adversarial review. Public read-only access is never mutation authority.\n\nSTANDING DIRECTIVE: every part of this project is to be expressed as a .t27 spec, and the project generated from those specs. A spec is the source of truth; the Zig, Verilog, C and Rust are outputs. Where you meet hand-written code, prefer replacing it with a spec that generates it over maintaining both. Treat this as the goal and not the current state: the generated Verilog today synthesises to 0 LUTs and 0 flip-flops, so measure rather than assert.";
  return [
    "# TRINITY RESEARCH · A2A BOOTSTRAP",
    mission,
    "",
    JSON.stringify(
      { ...bootstrap, endpoints: rewriteEndpoints(bootstrap.endpoints, QUEEN_API) },
      null,
      2,
    ),
  ].join("\n");
}

async function copyToClipboard(value: string) {
  // Prefer the synchronous user-gesture path. Some embedded browsers expose
  // navigator.clipboard but leave writeText pending behind a permission bridge,
  // which made a very visible button appear to do nothing forever.
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (copied) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  throw new Error("Clipboard is unavailable");
}

function TechnologyTree({
  c,
  graph,
  error,
  lang,
  embedded = false,
}: {
  c: Copy;
  graph: ResearchGraph | null;
  error: string | null;
  lang: string;
  /** Inside the HUD viewport: a one-line strip instead of the page head. */
  embedded?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const nodesById = useMemo(
    () => new Map((graph?.nodes ?? []).map((node) => [node.id, node])),
    [graph],
  );
  const selected =
    (selectedId ? nodesById.get(selectedId) : undefined) ??
    graph?.nodes.find((node) => node.state === "researching") ??
    graph?.nodes.find((node) => node.state === "available") ??
    graph?.nodes[0] ??
    null;
  const stateLabel = {
    researched: c.researched,
    researching: c.researching,
    available: c.available,
    locked: c.locked,
  } satisfies Record<ResearchState, string>;

  const geometry = useMemo(() => {
    if (!graph) return null;
    const nodeWidth = 210;
    const nodeHeight = 100;
    const gapX = 92;
    const gapY = 28;
    const padX = 52;
    const padY = 82;
    const grouped = new Map(
      graph.layers.map((layer) => [
        layer,
        graph.nodes.filter((node) => node.layer === layer),
      ]),
    );
    const maxInLayer = Math.max(
      1,
      ...[...grouped.values()].map((nodes) => nodes.length),
    );
    const width =
      padX * 2 + graph.layers.length * nodeWidth + (graph.layers.length - 1) * gapX;
    const height = padY * 2 + maxInLayer * nodeHeight + (maxInLayer - 1) * gapY;
    const positions = new Map<string, { x: number; y: number }>();
    graph.layers.forEach((layer, layerIndex) => {
      const layerNodes = grouped.get(layer) ?? [];
      const offsetY = ((maxInLayer - layerNodes.length) * (nodeHeight + gapY)) / 2;
      layerNodes.forEach((node, nodeIndex) => {
        positions.set(node.id, {
          x: padX + layerIndex * (nodeWidth + gapX),
          y: padY + offsetY + nodeIndex * (nodeHeight + gapY),
        });
      });
    });
    return { nodeWidth, nodeHeight, width, height, positions };
  }, [graph]);

  const bootstrap = graph?.agentBootstrap ?? fallbackBootstrap();
  const copyBootstrap = async () => {
    try {
      await copyToClipboard(agentBootstrapText(bootstrap, lang));
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2_500);
    } catch {
      setCopyState("error");
    }
  };

  const prerequisiteNames =
    selected?.prerequisites.map((id) =>
      publicResearchText(nodesById.get(id)?.label ?? id, id, lang, "label"),
    ) ?? [];
  const unlockNames =
    selected?.unlocks.map((id) =>
      publicResearchText(nodesById.get(id)?.label ?? id, id, lang, "label"),
    ) ?? [];

  return (
    <section
      className={`queen27-tech${embedded ? " is-embedded" : ""}`}
      aria-labelledby="queen-tech-title"
    >
      {embedded ? (
        <div className="queen27-tech-strip">
          <span className="queen27-section-label" id="queen-tech-title">
            {c.tech}
          </span>
          <span>
            <b>{graph ? `${graph.summary.percentage}%` : "—"}</b> {c.overallResearch}
          </span>
          <span>
            <b>{graph?.summary.researched ?? "—"}</b> {c.researched}
          </span>
          <span>
            <b>{graph?.summary.researching ?? "—"}</b> {c.activeResearch}
          </span>
          <span>
            <b>{graph?.summary.available ?? "—"}</b> {c.nextAvailable}
          </span>
          <span className="queen27-worker-slots">
            {(graph?.workers.slots ?? []).map((slot) => (
              <span className={`is-${slot.state}`} key={slot.slot}>
                <i /> {String(slot.slot).padStart(2, "0")}
              </span>
            ))}
          </span>
        </div>
      ) : (
        <>
          <div className="queen27-tech-head">
            <div>
              <span className="queen27-section-label" id="queen-tech-title">
                {c.tech}
              </span>
              <h2>{c.techTitle}</h2>
              <p>{c.techCopy}</p>
            </div>
            <div className="queen27-tech-score" aria-label={c.overallResearch}>
              <strong>{graph ? `${graph.summary.percentage}%` : "—"}</strong>
              <span>{c.overallResearch}</span>
            </div>
          </div>

          <div className="queen27-agent-connect">
            <div>
              <span>A2A / SKILLS / ADAPTATION</span>
              <h3>{c.copyAgentTitle}</h3>
              <p>{c.copyAgentCopy}</p>
            </div>
            <button type="button" onClick={copyBootstrap}>
              <i aria-hidden="true">⌘</i>
              <strong>
                {copyState === "copied"
                  ? c.copiedAgent
                  : copyState === "error"
                    ? c.copyFailed
                    : c.copyAgent}
              </strong>
              <small>{bootstrap.protocol} · {bootstrap.version}</small>
            </button>
          </div>

          <div className="queen27-tech-stats">
            <span>
              <b>{graph?.summary.researched ?? "—"}</b> {c.researched}
            </span>
            <span>
              <b>{graph?.summary.researching ?? "—"}</b> {c.activeResearch}
            </span>
            <span>
              <b>{graph?.summary.available ?? "—"}</b> {c.nextAvailable}
            </span>
          </div>

          <div className="queen27-worker-pool">
            <div>
              <span>{c.workerPool}</span>
              <strong>
                {graph ? `${graph.workers.active}/${graph.workers.capacity}` : "—"}
              </strong>
              <small>{c.slotsBusy}</small>
            </div>
            <p>{c.workerPoolCopy}</p>
            <div className="queen27-worker-slots">
              {(graph?.workers.slots ?? []).map((slot) => (
                <span className={`is-${slot.state}`} key={slot.slot}>
                  <i /> SLOT {String(slot.slot).padStart(2, "0")}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="queen27-tech-console">
        <div
          className="queen27-tech-map"
          role="region"
          aria-label={c.tech}
          tabIndex={0}
        >
          {!graph || !geometry ? (
            <div className="queen27-tech-loading">
              <i />
              <strong>{error ? c.graphOffline : c.graphLoading}</strong>
              {error && <small>{error}</small>}
            </div>
          ) : (
            <div
              className="queen27-tech-canvas"
              style={{ width: geometry.width, height: geometry.height }}
            >
              {graph.layers.map((layer) => {
                const layerIndex = graph.layers.indexOf(layer);
                const design = LAYER_DESIGN[layer] ?? {
                  color: "#ffffff",
                  icon: "◇",
                };
                return (
                  <div
                    className="queen27-tech-layer"
                    key={layer}
                    style={{
                      left: 52 + layerIndex * (geometry.nodeWidth + 92),
                      width: geometry.nodeWidth,
                      "--tech-color": design.color,
                    } as CSSProperties}
                  >
                    <span aria-hidden="true">{design.icon}</span>
                    <b>{layerCaption(layer, lang)}</b>
                  </div>
                );
              })}
              <svg
                className="queen27-tech-edges"
                width={geometry.width}
                height={geometry.height}
                aria-hidden="true"
              >
                {graph.edges.map((edge) => {
                  const from = geometry.positions.get(edge.from);
                  const to = geometry.positions.get(edge.to);
                  const fromNode = nodesById.get(edge.from);
                  if (!from || !to || !fromNode) return null;
                  const x1 = from.x + geometry.nodeWidth;
                  const y1 = from.y + geometry.nodeHeight / 2;
                  const x2 = to.x;
                  const y2 = to.y + geometry.nodeHeight / 2;
                  const bend = Math.max(32, Math.abs(x2 - x1) * 0.45);
                  const reverse = x2 <= x1;
                  const d = reverse
                    ? `M ${x1} ${y1} C ${x1 + 28} ${y1}, ${x2 - 28} ${y2}, ${x2} ${y2}`
                    : `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
                  return (
                    <path
                      d={d}
                      key={`${edge.from}-${edge.to}`}
                      className={
                        fromNode.state === "researched" ? "is-open" : ""
                      }
                    />
                  );
                })}
              </svg>
              {graph.nodes.map((node) => {
                const position = geometry.positions.get(node.id);
                if (!position) return null;
                const design = LAYER_DESIGN[node.layer] ?? {
                  color: "#ffffff",
                  icon: "◇",
                };
                const isSelected = selected?.id === node.id;
                return (
                  <motion.button
                    type="button"
                    className={`queen27-tech-node is-${node.state}${isSelected ? " is-selected" : ""}`}
                    key={node.id}
                    onClick={() => setSelectedId(node.id)}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    aria-pressed={isSelected}
                    style={{
                      left: position.x,
                      top: position.y,
                      width: geometry.nodeWidth,
                      height: geometry.nodeHeight,
                      "--tech-color": design.color,
                    } as CSSProperties}
                  >
                    <small>{stateLabel[node.state]}</small>
                    <strong>
                      {publicResearchText(node.label, node.id, lang, "label")}
                    </strong>
                    <span>{node.id}</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {selected ? (
          <motion.aside
            className={`queen27-tech-details is-${selected.state}`}
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>{stateLabel[selected.state]}</span>
            <h3>
              {publicResearchText(selected.label, selected.id, lang, "label")}
            </h3>
            {selected.note && (
              <p>{publicResearchText(selected.note, selected.id, lang)}</p>
            )}
            <dl>
              <div>
                <dt>{c.evidence}</dt>
                <dd className="queen27-tech-evidence">
                  {publicResearchText(selected.evidence, selected.id, lang)}
                </dd>
              </div>
              <div>
                <dt>{c.prerequisites}</dt>
                <dd>
                  {prerequisiteNames.length > 0
                    ? prerequisiteNames.join(" · ")
                    : c.noPrerequisites}
                </dd>
              </div>
              <div>
                <dt>{c.unlocks}</dt>
                <dd>
                  {unlockNames.length > 0
                    ? unlockNames.join(" · ")
                    : c.terminalNode}
                </dd>
              </div>
              <div>
                <dt>{c.nodeMaturity}</dt>
                <dd>
                  {lang === "ru"
                    ? {
                        shipped: "выпущено",
                        partial: "частично",
                        blocked: "заблокировано",
                        planned: "запланировано",
                        unknown: "неизвестно",
                      }[selected.maturity]
                    : selected.maturity}
                </dd>
              </div>
              {selected.blockedBy && (
                <div>
                  <dt>{c.locked}</dt>
                  <dd>
                    {publicResearchText(
                      selected.blockedBy,
                      selected.id,
                      lang,
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </motion.aside>
        ) : (
          <aside className="queen27-tech-details">
            <span>{error ? c.graphOffline : c.graphLoading}</span>
          </aside>
        )}
      </div>
    </section>
  );
}

/**
 * What the page hands the board about the signed-in visitor's own pipeline.
 *
 * Null means SIGNED OUT, and it is the whole of the signed-out behaviour. Not
 * "signed out so the lane is empty" — there is no lane, no heading, no count
 * and no sentence explaining an absence. `lane` null inside a non-null panel is
 * the other absence: somebody is signed in and the hive has not answered yet,
 * or answered with a refusal, which is a thing worth saying to the person it is
 * about.
 */
interface ClientsPanel {
  lane: ClientsLane | null;
  reason: HiveBoardReason | null;
}

/**
 * The reason the clients lane has nothing new, in the reader's language — or
 * null when there is nothing to say.
 *
 * One function rather than a sentence chosen at each of the two places it is
 * needed (the note when there is no board, the tooltip when the board on screen
 * is older than we would like): two copies of a four-way mapping is two chances
 * for a refusal to start reading as an outage on one of them.
 */
function clientsReasonSentence(reason: HiveBoardReason | null, c: Copy): string | null {
  switch (reason) {
    case "refused":
      return c.clientsRefused;
    case "offline":
      return c.clientsOffline;
    case "unreadable":
      return c.clientsUnreadable;
    // 'signed-out' is the identity chip's sentence and not the board's: the chip
    // already says sign in again, and this lane is about to vanish along with
    // the token that was the reason for drawing it.
    default:
      return null;
  }
}

// The kanban and the mission map, byte-identical in markup to the board views
// the page rendered before the HUD; they now live inside the viewport.
//
// The kanban has two lanes now: TASKS, which is the public board every visitor
// has always seen, and CLIENTS, which is the people this particular signed-in
// visitor answers for. The second lane appears only when `clients` is non-null,
// which happens only for somebody the hive has already identified — so for a
// signed-out reader this component still renders exactly one element, the same
// `.queen27-kanban` it rendered before this feature, with no lane heading above
// it and nothing after it. That is deliberate twice over: a visitor cannot be
// shown a board they are not on, and an empty lane is itself a statement
// ("you have no clients") that we have no right to make about a stranger.
//
// HOW MUCH OF A COLUMN IS DRAWN AT ONCE. Sized from the board, not from taste:
// a clamped card is about 110px tall inside a scroller measured at 581px, so 30
// is roughly six screens of a column — past the fold by a long way for anybody
// scanning, and short enough that the reader who wants more presses once rather
// than being handed 569 cards they did not ask for.
const CARD_PAGE = 30;

// HOW MANY CHIPS A CARD DRAWS (trinity#1588). The chips are one line under the
// title: two of them on a card as wide as a phone's, the rest counted as +N
// with their words on hover, and the drawer has all of them. A card narrower
// than 12rem inside (every column beside the Queen's panel) draws only the
// first, by a container query in Queen.css: two chips in 97px are two slivers.
// One line is what keeps every card shorter than the smallest column box the
// viewport contract measures, whatever the board sends: the contract draws the
// kanban from a fixture whose first card in every column is the worst the data
// can be (qa/queen-viewport-contract.mjs, FIXTURE_ROWS).
const CARD_CHIPS_SHOWN = 2;

/**
 * A card on the tasks lane: the task the feed sent, in the shape the board
 * always drew (`column` is the task's state), plus what a task has that a board
 * card never had -- its kind, its repository, its own address and its bee.
 */
type KanbanCard = QueenCard & {
  key: string;
  kind: TaskKind;
  state: TaskState;
  repo: string;
  url: string | null;
  bee: QueenBee | null;
};

/** `{name}` in a template, filled from `values`. */
function fillWords(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}

/** The words for a kind, plural, as the filter offers them. */
function kindWords(kind: TaskKind, c: Copy): string {
  return kind === "issue" ? c.tasksKindIssue : kind === "review" ? c.tasksKindReview : c.tasksKindJob;
}

function KanbanView({
  columns,
  cards,
  tasks,
  repo,
  error,
  loaded,
  c,
  lang,
  clients,
  ball,
  onNarrow,
  search,
  onSearch,
  status,
}: {
  columns: QueenColumn[];
  /** The public board's cards: only for what a task does not carry yet (a review card's queue). */
  cards: QueenCard[];
  /** Every task and its bees (lib/queenTasks.ts); null until the first answer. */
  tasks: QueenTasksFeed | null;
  repo: string | null;
  error: string | null;
  /** false until the feed has answered once: counts read a dash, not 0 */
  loaded: boolean;
  c: Copy;
  lang: string;
  /** The signed-in visitor's own pipeline. Null is signed out: see above. */
  clients: ClientsPanel | null;
  /** The owner's mail by client, whose move it is. Null unless the hive sent it. */
  ball: BallLane | null;
  /**
   * The view's own narrowing: the clients being watched, empty for all of
   * them. It never reaches the hive; see lib/hiveBoard.ts.
   */
  onNarrow: (keys: string[]) => void;
  /** What has been typed into the find box. Also never leaves this page. */
  search: string;
  onSearch: (text: string) => void;
  /** The Queen's own status (GET /queen/status): her lanes and her last round's skips. */
  status: QueenStatus | null;
}) {
  // Which directions the reader is looking at, empty for all of them. It lives
  // here and nowhere else: it is a property of this screen, not of the visitor,
  // not of the URL, and above all not of the request — lib/queenDirection.ts
  // says why a chip that can only hide is a chip that cannot be made to ask.
  const [directions, setDirections] = useState<DirectionKey[]>([]);
  // THE TASKS, AS CARDS. A review card's queue still comes from the board,
  // matched by number in the board's repository, because the task feed does not
  // carry it; everything else is the task's own.
  const allCards = useMemo<KanbanCard[]>(() => {
    if (!tasks) return [];
    const boardCard = new Map(cards.map((card) => [card.number, card]));
    const bees = new Map(tasks.bees.map((bee) => [bee.id, bee]));
    return tasks.tasks.map((task) => {
      const own = task.number !== null && repo !== null && task.repo.toLowerCase() === repo.toLowerCase() && task.kind === "issue" ? boardCard.get(task.number) : undefined;
      return {
        key: task.key,
        kind: task.kind,
        state: task.state,
        repo: task.repo,
        url: task.url,
        bee: task.bee ? bees.get(task.bee) ?? null : null,
        number: task.number ?? 0,
        title: task.title,
        // A failed job or review has a state no board column ever had, and the
        // board's DROPPED column already reads "failed or cancelled". It stands
        // there, tagged, rather than in a seventh column: the grid is six wide,
        // and a seventh wrapped below and halved every column's height.
        column: task.state === "failed" ? "dropped" : task.state,
        criteria: task.criteria ?? undefined,
        needs: task.needs,
        reviewState: own?.reviewState,
      };
    });
  }, [tasks, cards, repo]);
  // THE FILTER IS THE ADDRESS (owner, 2026-10-08: a filtered view is a link you
  // can send). Kind, state, repository and text ride in the board's address --
  // `#/queen?tab=kanban&kinds=job&states=failed` -- and only there: they narrow
  // what already arrived and are never an argument to the route, the same rule
  // the direction chips keep. The screen holds its own copy so a keystroke is
  // drawn at once, and an address changed from outside (Back, a pasted link) is
  // adopted; an address this board wrote itself is recognised and not adopted
  // again, so a write that lands late cannot undo the keystroke after it.
  const [hashParams, setHashParams] = useSearchParams();
  const addressFilter = useMemo(() => taskFilterFromParams(hashParams), [hashParams]);
  const addressKey = taskFilterKey(addressFilter);
  const [filter, setFilterState] = useState<TaskFilter>(addressFilter);
  const [seenAddress, setSeenAddress] = useState(addressKey);
  // THE ROW IS FOLDED UNTIL ASKED FOR. The board is measured at 1280x600 and
  // 390x560 to still show a whole card in every column (check:queen-viewport),
  // and a fourth row of chrome above the columns took that card away. So the
  // filter opens from a chip at the end of the direction row, and opens by
  // itself when the address already carries a filter: a shared link shows what
  // it narrowed. Folded with a filter on, the chip says how many are applied.
  const [filterOpen, setFilterOpen] = useState(() => !taskFilterIsEmpty(addressFilter));
  const written = useRef(new Set<string>());
  if (seenAddress !== addressKey) {
    setSeenAddress(addressKey);
    if (written.current.has(addressKey)) written.current.delete(addressKey);
    else {
      setFilterState(addressFilter);
      if (!taskFilterIsEmpty(addressFilter)) setFilterOpen(true);
    }
  }
  const setFilter = useCallback(
    (next: TaskFilter) => {
      setFilterState(next);
      written.current.add(taskFilterKey(next));
      setHashParams(() => writeTaskFilter(hashParamsOf(window.location.hash), next), { replace: true });
    },
    [setHashParams],
  );
  const filtered = useMemo(() => filterTasks(allCards, filter), [allCards, filter]);
  // THE DASHBOARD CARD (gHashTag/t27 specs/queen/dashboard.t27, epic #7718
  // slice 5): why the free lanes are idle, the lanes across the columns, and
  // one task opened. Nothing of it is drawn before the card is loaded.
  const [dashOk, setDashOk] = useState(dashboardCardLoaded);
  useEffect(() => {
    let live = true;
    dashboardCardReady.then(() => live && setDashOk(true)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  // WHY THE LANES ARE IDLE, from the Queen's own last round: the verdict is
  // the card's idle_verdict, the numbers are the round's skip counts.
  const health = useMemo(() => {
    if (!dashOk || !status?.workers) return null;
    const skip = (name: string) => {
      const value = status.lastTick?.skipSummary?.[name];
      return typeof value === "number" ? value : value?.count ?? 0;
    };
    const { capacity, active } = status.workers;
    const verdict = dashIdleVerdict(Boolean(status.lastTick), capacity, active, skip("notFirst"), skip("missingBoundary"), skip("fileConflict"), skip("claimed"));
    const template =
      verdict === IV_FULL ? c.healthFull
      : verdict === IV_PACING ? c.healthPacing
      : verdict === IV_FILES ? c.healthFiles
      : verdict === IV_SHAPE ? c.healthShape
      : verdict === IV_CLAIMED ? c.healthClaimed
      : verdict === IV_EMPTY ? c.healthEmpty
      : null;
    if (!template) return null;
    const count = verdict === IV_FILES ? skip("fileConflict") : verdict === IV_SHAPE ? skip("missingBoundary") : verdict === IV_CLAIMED ? skip("claimed") : 0;
    const tone = dashVerdictTone(verdict);
    return {
      name: VERDICT_NAMES[verdict] ?? "unknown",
      tone: tone === TONE_OK ? "ok" : tone === TONE_WARN ? "warn" : tone === TONE_ACT ? "act" : "none",
      text: fillWords(template, { n: capacity, free: dashFreeLanes(capacity, active), waiting: skip("notFirst"), count }),
    };
  }, [dashOk, status, c]);
  // LANES: one per repository or per kind across the columns, in the address
  // (`lanes=repo`) like the filter. Ranked by size; past the card's LANES_MAX
  // the rest share one lane, so a column never becomes a list of headings.
  const lanesMode = Math.max(0, (LANE_NAMES as readonly string[]).indexOf(hashParams.get("lanes") ?? "none"));
  const setLanes = useCallback(
    (mode: number) =>
      setHashParams(
        () => {
          const next = hashParamsOf(window.location.hash);
          if (mode === LANE_NONE) next.delete("lanes");
          else next.set("lanes", LANE_NAMES[mode]);
          return next;
        },
        { replace: true },
      ),
    [setHashParams],
  );
  // ONE TASK OPENED, by its key in the address (`open=gHashTag/t27#7804`), so
  // an opened task is a link too.
  const openKey = hashParams.get("open");
  const setOpen = useCallback(
    (key: string | null) =>
      setHashParams(
        () => {
          const next = hashParamsOf(window.location.hash);
          if (key) next.set("open", key);
          else next.delete("open");
          return next;
        },
        { replace: true },
      ),
    [setHashParams],
  );
  const drawerWords: DrawerWords = {
    drawerClose: c.drawerClose, drawerTimeline: c.drawerTimeline, drawerLease: c.drawerLease, drawerLeaseNone: c.drawerLeaseNone,
    drawerLeaseLive: c.drawerLeaseLive, drawerLeaseExpired: c.drawerLeaseExpired, drawerAttempts: c.drawerAttempts,
    drawerSendBacks: c.drawerSendBacks, drawerFreeAttempts: c.drawerFreeAttempts, drawerCeilingReleases: c.drawerCeilingReleases,
    drawerReviewerMisses: c.drawerReviewerMisses, drawerReview: c.drawerReview, drawerStarted: c.drawerStarted,
    drawerFinished: c.drawerFinished, drawerEffects: c.drawerEffects, drawerEffectStep: c.drawerEffectStep,
    drawerEffectRuns: c.drawerEffectRuns, drawerEmpty: c.drawerEmpty, drawerMissing: c.drawerMissing,
    drawerLoading: c.drawerLoading, drawerOnGithub: c.drawerOnGithub, evCreated: c.evCreated, evEnded: c.evEnded,
    evLeaseLost: c.evLeaseLost, evEvidence: c.evEvidence, evReviewed: c.evReviewed, evAssign: c.evAssign, evCancel: c.evCancel,
  };
  // The options count the WHOLE feed, as the direction chips count the whole
  // board, so a number does not change because the reader picked something.
  const options = useMemo(() => {
    const kinds = new Map<string, number>(), states = new Map<string, number>(), repos = new Map<string, number>();
    for (const card of allCards) {
      kinds.set(card.kind, (kinds.get(card.kind) ?? 0) + 1);
      states.set(card.state, (states.get(card.state) ?? 0) + 1);
      repos.set(card.repo, (repos.get(card.repo) ?? 0) + 1);
    }
    return { kinds, states, repos: [...repos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
  }, [allCards]);
  // The chips count the WHOLE board, not the narrowed one, so the numbers stay
  // still while the reader clicks. A count that changed on every click would be
  // counting the click rather than the work.
  const tally = useMemo(() => directionCounts(allCards), [allCards]);
  const shownCards = useMemo(
    () => narrowByDirection(filtered, directions),
    [filtered, directions],
  );
  const lanes = useMemo(() => {
    if (lanesMode === LANE_NONE || !dashOk) return null;
    const keyOf = (card: KanbanCard) => (lanesMode === LANE_REPO ? card.repo : card.kind);
    const sizes = new Map<string, number>();
    for (const card of shownCards) sizes.set(keyOf(card), (sizes.get(keyOf(card)) ?? 0) + 1);
    const ranked = [...sizes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key]) => key);
    const rankOf = new Map(ranked.map((key, rank) => [key, dashLaneShown(rank) ? rank : ranked.length]));
    return {
      rank: (card: KanbanCard) => rankOf.get(keyOf(card)) ?? ranked.length,
      label: (card: KanbanCard) =>
        (rankOf.get(keyOf(card)) ?? ranked.length) === ranked.length
          ? c.lanesOther
          : lanesMode === LANE_KIND
            ? kindWords(card.kind, c)
            : card.repo,
    };
  }, [lanesMode, dashOk, shownCards, c]);
  const stateTitle = (state: TaskState) =>
    columns.find((column) => column.key === state)?.title ?? (state === "failed" ? c.tasksStateFailed : state);
  // How old a bee is, by the feed's own clock: badges move with each answer, and
  // the board is not re-drawn every second to count them.
  const feedNow = tasks?.at ? Date.parse(tasks.at) || Date.now() : Date.now();
  const filterActive = !taskFilterIsEmpty(filter);
  const filterCount =
    (filter.kinds.length > 0 ? 1 : 0) + (filter.states.length > 0 ? 1 : 0) + (filter.repos.length > 0 ? 1 : 0) + (filter.q.trim() ? 1 : 0);
  // A repository named in the address is matched without regard to case, so a
  // link that says ghashtag/t27 selects the gHashTag/t27 the feed spells.
  const repoValue =
    filter.repos.length === 1
      ? (options.repos.find(([name]) => name.toLowerCase() === filter.repos[0].toLowerCase())?.[0] ?? filter.repos[0])
      : filter.repos.join(",");
  const toggleDirection = useCallback((key: DirectionKey) => {
    setDirections((current) =>
      current.includes(key)
        ? current.filter((other) => other !== key)
        : [...current, key],
    );
  }, []);
  // WHICH BOARD IS ON SCREEN, AND WHY IT STARTS ON THE PUBLIC ONE.
  //
  // The two lanes used to be drawn one under the other, and that was wrong in
  // both directions at once.
  //
  // It was wrong about privacy. This page has a public address. The task board
  // is meant to be read by anybody; the clients lane is people's names, whether
  // they paid, and how long they have been ignored. Stacking them meant the
  // moment somebody signed in, a screen they might be sharing, projecting or
  // walking away from painted a stranger's pipeline underneath the public work
  // — with nobody having asked to see it. Private things are not private
  // because the server refuses a stranger's request, which it does; they are
  // private because they are not put on a screen unbidden.
  //
  // It was wrong about the board as a board. Two lanes inside one viewport
  // height left each column about 150px tall: one and a half cards, two
  // scrollbars, and a title cut mid-word. A kanban whose column shows one card
  // is a list pretending to be a board.
  //
  // So: one lane at a time, and 'tasks' first. The private board is one press
  // away and is never the thing that happens to be on screen.
  const [board, setBoard] = useState<"tasks" | "clients" | "ball">("tasks");
  // Signing out takes the lane with it, and a view pointing at a board that no
  // longer exists would render as an empty screen with no way back. The switch
  // itself disappears at the same moment, so nothing else could return it.
  // A revoked grant takes the mail lane the same way.
  useEffect(() => {
    if (!clients && board === "clients") setBoard("tasks");
    if (!ball && board === "ball") setBoard("tasks");
  }, [clients, ball, board]);
  const showTasks = board === "tasks" || (board === "clients" && !clients) || (board === "ball" && !ball);
  // How deep into each column the reader has asked to go. Per column, because
  // BACKLOG holding 569 and REVIEW holding 9 are not one question: opening the
  // long one should not silently build the short one's tail as well.
  const [shownDepth, setShownDepth] = useState<Record<string, number>>({});
  const lane = clients?.lane ?? null;
  const sentence = clientsReasonSentence(clients?.reason ?? null, c);
  // With a board on screen the reason goes in the tooltip, exactly where the
  // task lane already puts `error`: a board that is still true is not worth
  // hiding behind a banner about the network. With no board the reason IS the
  // content, and the fallback is "asking" — before the first answer there is no
  // reason at all, and silence with a spinner's worth of words is honest.
  // A board that arrived empty says so once, in a sentence, instead of seven
  // columns each repeating that they are empty.
  const note = !clients
    ? null
    : !lane
      ? (sentence ?? c.clientsPending)
      : lane.shown === 0
        ? c.clientsEmpty
        : null;
  const stale = lane ? sentence : null;
  const scopeLine = lane
    ? [
        lane.scope.role === "keeper"
          ? c.identityRoleKeeper
          : lane.scope.role === "owner"
            ? c.identityRoleOwner
            : lane.scope.role === "bee"
              ? c.identityRoleBee
              : // A role this build has not met yet: the hive's own description
                // of the scope is better than a word we made up for it.
                lane.scope.label,
        ...lane.scope.bots,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  return (
    <>
      {(clients || ball) && (
        // The switch only exists when there are two boards to tell apart. One
        // board needs no label, and offering a signed-out reader a way to reach
        // a clients board would put a word about clients on a page that has
        // none — and name a screen they cannot open, which is its own small
        // statement about what exists behind the sign-in.
        <div
          className="queen27-lane-switch"
          role="group"
          aria-label={c.laneSwitchAria}
        >
          <button
            type="button"
            className="queen27-chip"
            aria-pressed={showTasks}
            onClick={() => setBoard("tasks")}
          >
            {c.laneTasks} <small>{loaded ? shownCards.length : "—"}</small>
          </button>
          {clients && (
            <button
              type="button"
              className="queen27-chip queen27-lane-private-chip"
              aria-pressed={board === "clients"}
              onClick={() => setBoard("clients")}
            >
              {c.laneClients} <small>{lane ? lane.shown : "—"}</small>
              {/* The word rides on the control that opens the board, not only on
                  the board itself: the reader decides whether to show it before
                  it is drawn, and that decision is worth one word of warning. */}
              <em>{c.lanePrivate}</em>
            </button>
          )}
          {ball && (
            <button
              type="button"
              className="queen27-chip queen27-lane-private-chip"
              aria-pressed={board === "ball"}
              onClick={() => setBoard("ball")}
            >
              {c.laneBall} <small>{ball.shown}</small>
              <em>{c.lanePrivate}</em>
            </button>
          )}
        </div>
      )}
      {showTasks && (
      <>
      {/* THE TASK FILTER: one row, four controls. Selects rather than chips:
          three kinds and seven states as chips would be two more rows of
          chrome on a phone, where the board is already short of height. Each
          option carries its count over the whole feed. The address can name
          several kinds or states at once (a link somebody built); the select
          then shows that list as its one chosen option. */}
      {/* With no direction row to carry the chip (every card one direction),
          the row stays open, once there is a board to filter: before the
          first answer there is nothing to narrow and no height to spend. */}
      {(filterOpen || (loaded && tally.length <= 1)) && (
      <div className="queen27-task-filter" id="queen27-task-filter" role="group" aria-label={c.tasksFilterAria}>
        <input
          className="queen27-lane-search"
          type="search"
          value={filter.q}
          placeholder={c.tasksFind}
          aria-label={c.tasksFind}
          onChange={(event) => setFilter({ ...filter, q: event.target.value })}
        />
        <select
          aria-label={c.tasksKind}
          value={filter.kinds.join(",")}
          onChange={(event) => setFilter({ ...filter, kinds: event.target.value ? (event.target.value.split(",") as TaskKind[]) : [] })}
        >
          <option value="">{c.tasksKindAll} · {loaded ? allCards.length : "—"}</option>
          {filter.kinds.length > 1 && <option value={filter.kinds.join(",")}>{filter.kinds.map((kind) => kindWords(kind, c)).join(", ")}</option>}
          {TASK_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kindWords(kind, c)} · {options.kinds.get(kind) ?? 0}
            </option>
          ))}
        </select>
        <select
          aria-label={c.tasksState}
          value={filter.states.join(",")}
          onChange={(event) => setFilter({ ...filter, states: event.target.value ? (event.target.value.split(",") as TaskState[]) : [] })}
        >
          <option value="">{c.tasksStateAll} · {loaded ? allCards.length : "—"}</option>
          {filter.states.length > 1 && <option value={filter.states.join(",")}>{filter.states.map(stateTitle).join(", ")}</option>}
          {TASK_STATES.map((state) => (
            <option key={state} value={state}>
              {stateTitle(state)} · {options.states.get(state) ?? 0}
            </option>
          ))}
        </select>
        <select
          aria-label={c.tasksRepo}
          value={repoValue}
          onChange={(event) => setFilter({ ...filter, repos: event.target.value ? event.target.value.split(",") : [] })}
        >
          <option value="">{c.tasksRepoAll}</option>
          {repoValue && !options.repos.some(([name]) => name === repoValue) && <option value={repoValue}>{filter.repos.join(", ")}</option>}
          {options.repos.map(([name, total]) => (
            <option key={name} value={name}>
              {name} · {total}
            </option>
          ))}
        </select>
        {dashOk && (
          <select aria-label={c.lanesLabel} value={LANE_NAMES[lanesMode]} onChange={(event) => setLanes(Math.max(0, (LANE_NAMES as readonly string[]).indexOf(event.target.value)))}>
            <option value={LANE_NAMES[LANE_NONE]}>{c.lanesNone}</option>
            <option value={LANE_NAMES[LANE_REPO]}>{c.lanesRepo}</option>
            <option value={LANE_NAMES[LANE_KIND]}>{c.lanesKind}</option>
          </select>
        )}
        {filterActive && (
          <button type="button" className="queen27-chip" onClick={() => setFilter(EMPTY_TASK_FILTER)}>
            {c.tasksReset}
          </button>
        )}
        {/* What is on screen, out of what arrived, and where it came from. */}
        <small data-tasks-source={tasks?.source ?? "none"}>
          {loaded ? `${shownCards.length} / ${allCards.length}` : "—"}
          {tasks?.source === "board" ? ` · ${c.tasksFromBoard}` : ""}
          {tasks?.truncated ? ` · ${c.tasksTruncated}` : ""}
        </small>
      </div>
      )}
      {tally.length > 1 && (
        // The direction chips, and unlike the clients lane they are here for
        // EVERYONE — signed in or not. Nothing about them describes a person:
        // they sort the public board by what its cards are about, so there is
        // no reader for whom they would be a statement about somebody else.
        //
        // One chip per direction the board actually contains, never one per
        // direction the table knows about, and the row disappears entirely if
        // everything on screen is the same thing. A chip that can only ever
        // show the same board is a control that lies about having an effect.
        //
        // Its own class and not the clients row's, though they are drawn alike:
        // that class is counted by qa/clients-filter-contract.mjs to prove the
        // ONE clients filter sits inside the sign-in check, and a second
        // element wearing it would read as one that escaped.
        //
        // The count on each chip is the point of the design: the reader is not
        // told "there is a CONTENT direction", they are told it holds four
        // cards. That is what makes the distribution visible instead of
        // decorative.
        <div
          className="queen27-dir-filter"
          role="group"
          aria-label={c.tasksDirection}
        >
          <span>{c.tasksDirection}</span>
          <button
            type="button"
            className="queen27-chip"
            aria-pressed={directions.length === 0}
            onClick={() => setDirections([])}
          >
            {c.tasksDirectionAll} <small>{allCards.length}</small>
          </button>
          {tally.map(({ key, count }) => (
            <button
              key={key}
              type="button"
              className="queen27-chip queen27-dir-chip"
              style={{ "--queen-dir": directionColor(key) } as CSSProperties}
              aria-pressed={directions.includes(key)}
              onClick={() => toggleDirection(key)}
            >
              <i aria-hidden="true" />
              {directionLabel(key, lang)} <small>{count}</small>
            </button>
          ))}
          {health && (
            <span className="queen27-health" data-verdict={health.name} data-tone={health.tone} title={c.healthTitle}>
              <i aria-hidden="true" />
              {health.text}
            </span>
          )}
          {/* Opens the task filter row. Folded, it still says that a filter is
              applied and how many parts, and its tooltip says when the board is
              derived because the tasks route is not answering. */}
          <button
            type="button"
            className="queen27-chip queen27-task-filter-toggle"
            aria-expanded={filterOpen}
            aria-controls={filterOpen ? "queen27-task-filter" : undefined}
            data-tasks-source={tasks?.source ?? "none"}
            title={tasks?.source === "board" ? c.tasksFromBoard : c.tasksFilterAria}
            onClick={() => setFilterOpen((open) => !open)}
          >
            {c.tasksFilterToggle}
            {filterCount > 0 && <small>{filterCount}</small>}
          </button>
        </div>
      )}
      <motion.div
        className="queen27-kanban"
        role="region"
        aria-label={c.kanbanView}
        tabIndex={0}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
      {columns.map((column) => {
        // Narrowed first, then split by column, so a column header counts what
        // is under it rather than what would have been there without the chips.
        const inColumn = shownCards.filter(
          (card) => card.column === column.key,
        );
        // With lanes on, the column's cards come lane by lane (a stable sort,
        // so each lane keeps the order the feed gave it).
        const columnCards = lanes ? [...inColumn].sort((a, b) => lanes.rank(a) - lanes.rank(b)) : inColumn;
        // AND THEN ONLY THE TOP OF IT IS DRAWN.
        //
        // Measured on the live board at 1512x949: BACKLOG holds 569 cards and
        // DONE 431, every one of them built, and a column's scroller was
        // 163182px long inside a 581px window. That is 280 screens in one
        // column. Nobody scrolls that; they give up, which is what the owner
        // reported as the board being hard to use.
        //
        // The count in the header is still the true one — it counts
        // columnCards, above, not what survived this line — so the page never
        // pretends the rest is not there. It says how many are left and offers
        // to draw them.
        //
        // It is also why the board was slow. 1100 cards is 1100 motion
        // elements, each with a layout animation measuring itself on every
        // change; a filter press re-laid out the lot.
        const depth = shownDepth[column.key] ?? CARD_PAGE;
        const drawn = columnCards.slice(0, depth);
        const rest = columnCards.length - drawn.length;
        return (
          <motion.article
            className={`queen27-column is-${column.key}`}
            key={column.key}
            layout
          >
            <header title={error ?? undefined}>
              <h3>{column.title}</h3>
              <span>{loaded ? columnCards.length : "—"}</span>
            </header>
            <small>{column.blurb}</small>
            <div className="queen27-cards">
              {drawn.map((card, index) => {
                const direction = directionOf(card.title);
                const issue = card.kind === "issue" && card.number > 0;
                const lane = lanes ? lanes.label(card) : null;
                const laneHead = lane !== null && (index === 0 || lanes?.label(drawn[index - 1]) !== lane);
                // EVERY CHIP ON A CARD IS IN THIS LIST, AND THE LIST IS ONE LINE
                // (trinity#1588). The kind, the state, the repository and the
                // signal sat in the topline and wrapped it onto a second and a
                // third line; the bee, the criteria and the needs each took a
                // line of their own. So a card was as tall as the data made it,
                // and on live data that was taller than a column box: 174px in
                // a 156px box at 1280x600, 109px in 101px at 390x560. Now the
                // chips are one line under the title, the first
                // CARD_CHIPS_SHOWN of them drawn and the rest counted as +N
                // with their words on hover, so a card has a height the data
                // cannot change. A chip added to cards later goes into this
                // list, never back into the topline.
                const chips: { key: string; text: string; node: ReactNode }[] = [];
                if (card.state === "failed") {
                  chips.push({ key: "failed", text: c.tasksStateFailed, node: <span className="queen27-card-kind" data-state="failed">{c.tasksStateFailed}</span> });
                }
                if (card.bee) {
                  // Before the signal: on a running card the bee says more than
                  // "executing now", and a narrow card draws one chip.
                  // The bee on this task, as the route states it: its lane,
                  // whether it is working or has gone quiet, how long it has
                  // been on it and when it was last heard. Words, not only a
                  // colour; a quiet bee is not drawn as busy.
                  const badge = beeBadge(card.bee, feedNow, lang === "ru" ? "ru" : "en");
                  chips.push({
                    key: "bee",
                    text: badge,
                    node: (
                      <span className="queen27-card-bee" data-bee-state={card.bee.state} title={c.tasksBeeTitle}>
                        <i aria-hidden="true" />
                        {badge}
                      </span>
                    ),
                  });
                }
                if (column.key === "running" || column.key === "review") {
                  const signal = column.key === "running" ? c.executing : reviewSignalLabel(reviewStateOf(card), c);
                  chips.push({ key: "signal", text: signal, node: <span className="queen27-card-signal"><i />{signal}</span> });
                }
                if (card.kind !== "issue") {
                  const kind = card.kind === "review" ? c.tasksKindReviewOne : c.tasksKindJobOne;
                  chips.push({ key: "kind", text: kind, node: <span className="queen27-card-kind">{kind}</span> });
                }
                if (repo !== null && card.repo.toLowerCase() !== repo.toLowerCase()) {
                  const name = card.repo.split("/")[1] ?? card.repo;
                  chips.push({ key: "repo", text: name, node: <span className="queen27-card-kind">{name}</span> });
                }
                if (typeof card.criteria === "number") {
                  const criteria = `${card.criteria} ${c.criteria}`;
                  chips.push({ key: "criteria", text: criteria, node: <span className="queen27-card-fact">{criteria}</span> });
                }
                if (card.needs && card.needs.length > 0) {
                  // Cut to its share of the line; the whole list is here.
                  const needs = `${c.missing}: ${card.needs.join(", ")}`;
                  chips.push({ key: "needs", text: needs, node: <span className="queen27-card-fact" title={needs}>{needs}</span> });
                }
                const hiddenChips = chips.slice(CARD_CHIPS_SHOWN);
                return (
                // The slot is what moves. It was the card inside it, and a card
                // sliding to its new place, or growing from its old size, was
                // drawn outside a slot that had already arrived: 162x200 in
                // 162x124 at 1920x1080 (trinity#1588). The slot is the grid
                // item, so the move happens inside the card box, which is the
                // scroller declared for it; and only the position animates, so
                // a card is never drawn at a size it does not have.
                <motion.div
                  className="queen27-card-slot"
                  key={card.key}
                  layout="position"
                  layoutId={`queen-card-${card.key}`}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 30,
                  }}
                >
                {laneHead && <small className="queen27-swimlane">{lane}</small>}
                <a
                  className="queen27-card"
                  data-kind={card.kind}
                  // The colour rides on an attribute and a custom property, and
                  // the left border is deliberately untouched: that border
                  // already says which column the card is in, and two meanings
                  // on one edge is one meaning lost. Direction gets the tint,
                  // the right-hand rule and the dot — its own channel.
                  data-dir={direction}
                  style={{ "--queen-dir": directionColor(direction) } as CSSProperties}
                  href={card.url ?? `https://github.com/${card.repo}/issues/${card.number}`}
                  target="_blank"
                  rel="noreferrer"
                  // Framed by the app on its own origin, the tap opens the
                  // card's conversation with the agent there; anywhere else,
                  // and on cmd-click, the issue opens as before. A review or a
                  // job is not an issue conversation, so it opens its link.
                  onClick={(event) => {
                    if (issue) openCardInApp(event, openCardMessage(card.repo, card.number, publicIssueTitle(card.title, card.number, lang), column.key));
                  }}
                  // The title is clamped to three lines in a 126px column —
                  // measured, one card's title was nine lines and 147px of a
                  // 222px card. Clamping without this would be losing the
                  // sentence; with it the card is short and the whole of it is
                  // still one hover away, and the link behind it was always the
                  // full answer.
                  title={publicIssueTitle(card.title, card.number, lang)}
                >
                  {/* The number and the direction, and nothing else: two
                      items, so at most two lines in the narrowest column. */}
                  <div className="queen27-card-topline">
                    <b>{card.number > 0 ? `#${card.number}` : "—"}</b>
                    {/* The name in words, next to the dot, on every card. A
                        reader who cannot tell this orange from this red loses
                        nothing: the colour is a shortcut for people who have
                        it, never the only way to know. */}
                    <span className="queen27-dir-tag">
                      <i aria-hidden="true" />
                      {directionLabel(direction, lang)}
                    </span>
                  </div>
                  <strong>{publicIssueTitle(card.title, card.number, lang)}</strong>
                  {chips.length > 0 && (
                    // Two counts, one drawn: a card too narrow for two chips
                    // (the 126px column) shows the first and counts the rest
                    // from the second, by the container query in Queen.css.
                    <span className="queen27-card-foot">
                      {chips.slice(0, CARD_CHIPS_SHOWN).map((chip) => (
                        <Fragment key={chip.key}>{chip.node}</Fragment>
                      ))}
                      {hiddenChips.length > 0 && (
                        <span className="queen27-card-kind queen27-card-more" data-more="wide" title={hiddenChips.map((chip) => chip.text).join(" · ")}>
                          +{hiddenChips.length}
                        </span>
                      )}
                      {chips.length > 1 && (
                        <span className="queen27-card-kind queen27-card-more" data-more="narrow" title={chips.slice(1).map((chip) => chip.text).join(" · ")}>
                          +{chips.length - 1}
                        </span>
                      )}
                    </span>
                  )}
                </a>
                {/* The task opened in the drawer: a sibling of the card's link,
                    never inside it, so the card's own click still opens the
                    issue or its conversation. A review has no drawer. */}
                {card.kind !== "review" && (
                  <button type="button" className="queen27-card-open" aria-label={`${c.drawerOpen} ${card.number > 0 ? `#${card.number}` : card.key}`} title={c.drawerOpen} onClick={() => setOpen(card.key)}>
                    ⋯
                  </button>
                )}
                </motion.div>
                );
              })}
              {rest > 0 && (
                // Says the number it is hiding, and adds the same page again
                // rather than dropping all 569 in at once — the reader who
                // wants the whole column can have it, one press at a time,
                // and the reader who wanted the top of it never paid for it.
                <button
                  type="button"
                  className="queen27-cards-more"
                  onClick={() =>
                    setShownDepth((at) => ({
                      ...at,
                      [column.key]: depth + CARD_PAGE,
                    }))
                  }
                >
                  {c.showMore} <small>{rest}</small>
                </button>
              )}
              {columnCards.length === 0 && (
                <em title={error ?? undefined}>{loaded ? c.empty : "—"}</em>
              )}
            </div>
          </motion.article>
        );
      })}
      </motion.div>
      {openKey && (() => {
        const card = allCards.find((one) => one.key === openKey);
        return card ? (
          <QueenTaskDrawer
            api={QUEEN_API}
            card={{ key: card.key, kind: card.kind, number: card.number, title: publicIssueTitle(card.title, card.number, lang), state: stateTitle(card.state), url: card.url, bee: card.bee }}
            words={drawerWords}
            lang={lang === "ru" ? "ru" : "en"}
            onClose={() => setOpen(null)}
          />
        ) : null;
      })()}
      </>
      )}
      {clients && board === "clients" && (
        <>
          <div
            className="queen27-lane-head is-private"
            title={lane?.howToRead ?? undefined}
          >
            <h3>{c.laneClients}</h3>
            {/* Said on the board as well as on the control that opened it. The
                two are not a duplicate of each other: one is a warning before
                the names are drawn, this one is a label on a screen somebody
                may have left open, arrived at by a back button, or be showing
                to a room. It carries the sentence rather than a tooltip
                because a tooltip is a fact you have to already suspect. */}
            <b className="queen27-lane-private">
              {c.lanePrivate}
              <em>{c.lanePrivateHint}</em>
            </b>
            {/* A count of the cards on this screen, and never anything else. The
                hive sends a count on every column and every filter option and
                this page throws all of them away (lib/hiveBoard.ts says why):
                a number describing rows that were not sent is a description of
                other people's clients, which is the one thing a bee may not
                have. And when there is no board at all the count is an em dash,
                not a zero — the same way the task lane reads before its first
                answer. Nobody is told they have nothing until somebody has
                actually said so. */}
            <span title={stale ?? undefined}>{lane ? lane.shown : "—"}</span>
            {scopeLine && <small>{scopeLine}</small>}
            {lane && lane.options.length > 0 && (
              // Narrowing happens HERE, on what already arrived, and no key and
              // no typed character goes back to the hive. The server has
              // already decided what this person may see; a control that
              // re-asks with a name in its hand is a control that can be made
              // to ask for a different name. A filter that can only ever hide
              // is a filter that cannot be turned into a question.
              //
              // Toggles rather than a dropdown because the question is "these
              // three clients" and a dropdown can only answer "this one". They
              // are buttons with aria-pressed, not checkboxes dressed as chips:
              // the state a screen reader reads is the state the styling shows,
              // because they are the same attribute.
              <div
                className="queen27-lane-filter"
                role="group"
                aria-label={c.clientsNarrow}
              >
                <span>{c.clientsNarrow}</span>
                <button
                  type="button"
                  className="queen27-chip"
                  aria-pressed={lane.narrow.length === 0}
                  onClick={() => onNarrow([])}
                >
                  {c.clientsNarrowAll}
                </button>
                {lane.options.map((option) => {
                  const on = lane.narrow.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className="queen27-chip"
                      aria-pressed={on}
                      onClick={() =>
                        onNarrow(
                          on
                            ? lane.narrow.filter((key) => key !== option.key)
                            : [...lane.narrow, option.key],
                        )
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
                {/* A keeper is sent the whole platform, and no row of chips
                    finds one person in it. This types over the cards already in
                    hand — name, bot, id — and is the same kind of hiding the
                    chips do. */}
                <input
                  className="queen27-lane-search"
                  type="search"
                  value={search}
                  placeholder={c.clientsNarrowSearch}
                  aria-label={c.clientsNarrowSearch}
                  onChange={(event) => onSearch(event.target.value)}
                />
              </div>
            )}
            {lane?.applied && (
              // The hive's own narrowing, which nothing on this page can widen.
              // Said out loud, because a board that is a subset and does not
              // admit it is a board that reads as the whole of somebody's work.
              <small>
                {c.clientsNarrowed}: {lane.applied}
              </small>
            )}
          </div>
          <motion.div
            className="queen27-kanban queen27-clients-lane"
            role="region"
            aria-label={c.clientsLaneAria}
            tabIndex={0}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {lane && lane.shown > 0
              ? lane.groups.map((group) => (
                  <motion.article
                    className={`queen27-column is-${group.column.key}`}
                    key={group.column.key}
                    layout
                  >
                    <header title={stale ?? undefined}>
                      <h3>{group.column.title}</h3>
                      <span>{group.cards.length}</span>
                    </header>
                    <div className="queen27-cards">
                      {group.cards.map((card) => (
                        <motion.div
                          className="queen27-card"
                          key={card.id}
                          layout
                          layoutId={`hive-client-${card.id}`}
                          transition={{
                            type: "spring",
                            stiffness: 320,
                            damping: 30,
                          }}
                        >
                          <div className="queen27-card-topline">
                            <b>{card.bot || "—"}</b>
                            {card.waitingForReply && (
                              <span className="queen27-card-signal">
                                <i />
                                {c.clientsWaiting}
                              </span>
                            )}
                          </div>
                          {/* Names and bot handles are OTHER PEOPLE'S TEXT,
                              arriving from a remote service. React puts them on
                              the page as text nodes; nothing here builds markup
                              out of them and nothing treats them as an
                              instruction. */}
                          <strong>{card.name || c.clientsNoName}</strong>
                          {card.paid && <span>{c.clientsPaid}</span>}
                          {/* A silence the hive did not measure is not a silence
                              of zero days, and "0 days quiet" would read as "we
                              spoke today" about somebody nobody has spoken to.
                              Unmeasured means the line is not drawn. */}
                          {card.quietDays !== null && (
                            <span>
                              {card.quietDays} {c.clientsQuiet}
                            </span>
                          )}
                          {card.lastTouchAt && (
                            <span>
                              {c.clientsTouched}: {formatMoment(card.lastTouchAt, lang)}
                            </span>
                          )}
                        </motion.div>
                      ))}
                      {group.cards.length === 0 && <em>{c.empty}</em>}
                    </div>
                  </motion.article>
                ))
              : null}
            {note && <em className="queen27-lane-note">{note}</em>}
          </motion.div>
        </>
      )}
      {ball && board === "ball" && (
        // The owner's mail by client, and whose move it is. `ball` is null for
        // everybody the hive did not send the mail to (lib/ballBoard.ts), so
        // this lane -- like its chip -- does not exist for them at all.
        <>
          <div className="queen27-lane-head is-private">
            <h3>{c.laneBall}</h3>
            <b className="queen27-lane-private">
              {c.lanePrivate}
              <em>{c.ballPrivateHint}</em>
            </b>
            <span>{ball.shown}</span>
            {ball.mail === "stale" && <small>{c.ballStale}</small>}
          </div>
          <motion.div
            className="queen27-kanban queen27-ball-lane"
            role="region"
            aria-label={c.ballLaneAria}
            tabIndex={0}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {ball.groups.map((group) => (
              <motion.article
                className={`queen27-column is-ball-${group.ball}`}
                key={group.ball}
                layout
              >
                <header>
                  <h3>{ballTitle(group.ball, c)}</h3>
                  <span>{group.cards.length}</span>
                </header>
                <div className="queen27-cards">
                  {group.cards.map((card) => (
                    <div className="queen27-card" key={`${card.source}:${card.clientKey}:${card.ref}`}>
                      <div className="queen27-card-topline">
                        <b>{card.client}</b>
                        <span>{ballSourceTitle(card.source, c)}</span>
                      </div>
                      {/* Subjects and names are OTHER PEOPLE'S TEXT from a
                          mailbox: text nodes, never markup, never an
                          instruction. The only link is github over https
                          (safeLink); a mail card has none. */}
                      {card.link ? (
                        <a href={card.link} target="_blank" rel="noopener noreferrer">
                          <strong>{card.title}</strong>
                        </a>
                      ) : (
                        <strong>{card.title}</strong>
                      )}
                      {card.because && <span>{card.because}</span>}
                      {card.days !== null && (
                        <span>
                          {card.days} {c.ballDays}
                        </span>
                      )}
                    </div>
                  ))}
                  {group.cards.length === 0 && <em>{c.empty}</em>}
                </div>
              </motion.article>
            ))}
            {ball.shown === 0 && <em className="queen27-lane-note">{c.ballEmpty}</em>}
          </motion.div>
        </>
      )}
    </>
  );
}

/** A ball this build has not met keeps its own word rather than a made-up one. */
function ballTitle(ball: string, c: Copy): string {
  return ball === "ours"
    ? c.ballOurs
    : ball === "due"
      ? c.ballDue
      : ball === "theirs"
        ? c.ballTheirs
        : ball === "none"
          ? c.ballNone
          : ball;
}

function ballSourceTitle(source: string, c: Copy): string {
  return source === "mail"
    ? c.ballSourceMail
    : source === "crm"
      ? c.ballSourceCrm
      : source === "github"
        ? c.ballSourceGithub
        : source;
}

function MissionMapView({
  columns,
  cards,
  repo,
  error,
  loaded,
  c,
  lang,
}: {
  columns: QueenColumn[];
  cards: QueenCard[];
  repo: string | null;
  error: string | null;
  /** false until /queen/public-board has answered once: counts read a dash, not 0 */
  loaded: boolean;
  c: Copy;
  lang: string;
}) {
  return (
    <motion.div
      className="queen27-mission-map"
      role="region"
      aria-label={c.mapView}
      tabIndex={0}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="queen27-map-stars" aria-hidden="true" />
      <div className="queen27-map-route" aria-hidden="true" />
      <div className="queen27-map-sectors">
        {columns.map((column, sectorIndex) => {
          const columnCards = cards.filter(
            (card) => card.column === column.key,
          );
          return (
            <motion.section
              className={`queen27-map-sector is-${column.key}`}
              key={column.key}
              layout
            >
              <header title={error ?? undefined}>
                <small>
                  {c.sector} {String(sectorIndex + 1).padStart(2, "0")}
                </small>
                <h3>{column.title}</h3>
                <b>{loaded ? columnCards.length : "—"}</b>
              </header>
              <div className="queen27-map-nodes">
                {columnCards.map((card, cardIndex) => (
                  <motion.a
                    href={`https://github.com/${repo}/issues/${card.number}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => {
                      if (repo) openCardInApp(event, openCardMessage(repo, card.number, publicIssueTitle(card.title, card.number, lang), column.key));
                    }}
                    key={card.number}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: Math.min(cardIndex * 0.025, 0.3),
                    }}
                    title={publicIssueTitle(card.title, card.number, lang)}
                  >
                    <i aria-hidden="true" />
                    <span>#{card.number}</span>
                    <strong>{publicIssueTitle(card.title, card.number, lang)}</strong>
                    {typeof card.criteria === "number" && (
                      <small>
                        {card.criteria} {c.criteria}
                      </small>
                    )}
                  </motion.a>
                ))}
                {columnCards.length === 0 && (
                <em title={error ?? undefined}>{loaded ? c.empty : "—"}</em>
              )}
              </div>
            </motion.section>
          );
        })}
      </div>
      <p>{c.mapLegend}</p>
    </motion.div>
  );
}

const EMPTY_CARDS: QueenCard[] = [];
const EMPTY_MODULES: HudModule[] = [];
const EMPTY_EVENTS: QueenActivityEvent[] = [];

export default function Queen({sharedCatalog}:{sharedCatalog?:UniverseAtlas}={}) {
  const { lang, setLang } = useI18n();
  const c = lang === "ru" ? COPY.ru : COPY.en;
  const identityCopy = useMemo(
    () => ({
      signIn: c.identitySignIn,
      signInTitle: c.identitySignInTitle,
      signInAgain: c.identitySignInAgain,
      signedIn: c.identitySignedIn,
      roleKeeper: c.identityRoleKeeper,
      roleOwner: c.identityRoleOwner,
      roleBee: c.identityRoleBee,
      pending: c.identityPending,
      confirm: c.identityConfirm,
      confirmTitle: c.identityConfirmTitle,
      confirmAgainTitle: c.identityConfirmAgainTitle,
      resume: c.identityResume,
      resumeTitle: c.identityResumeTitle,
      retry: c.identityRetry,
      offline: c.identityOffline,
      noAnswer: c.identityNoAnswer,
      busy: c.identityBusy,
      refused: c.identityRefused,
      unavailable: c.identityUnavailable,
      webOnly: c.identityWebOnly,
      offSite: c.identityOffSite,
    }),
    [c],
  );
  const state = useQueenStatus();
  const boardState = useQueenBoard();
  const activityState = useQueenActivity();
  const researchState = useQueenResearch(lang);
  const hardwareState = useQueenHardware();
  // A tab is addressable, in both directions. The landing presents every module
  // and links to each, and a link that lands on the comb whatever it said would
  // be a link that lies — and so would an address bar still naming the tab you
  // left. `tab`, not `view`: the universe around this page already owns `view`
  // for its atlas and its shared core. Both go through the router's search
  // params, each writer keeping the other's key, so they do not fight; and a
  // hash changed from outside (Back, a link, a script) moves the shell as a
  // click does. Measured on t27.ai before this: load #/queen?tab=kanban, click
  // FACTORY, and the address still said kanban; set the hash to ?tab=crons,
  // and the shell stayed on factory.
  // Embedded on the homepage: the same shell, showing one module, with the
  // chrome that names it left out — the block around it already does that — and
  // without the hive. Four previews each booting Babylon is four more WebGL
  // contexts on one page, which is the failure this shell was just fixed for.
  const embedded = useMemo(
    () => new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("embed") === "1",
    [],
  );
  // HudView is the one list of views (src/components/queenHud.ts); `?tab=`
  // accepts exactly its names and the digit keys index it. The comb is the
  // default and carries no `tab`, so #/queen stays the comb's address.
  const [hashParams, setHashParams] = useSearchParams();
  const asked = hashParams.get("tab");
  const addressView: HudView = (HUD_VIEWS as readonly string[]).includes(asked ?? "") ? (asked as HudView) : "comb";
  // The shell keeps its own view; the address follows it and feeds it. HashRouter
  // hands every navigation to React inside startTransition, and while the hive's
  // long tasks run after load that transition waited: on t27.ai the address
  // changed within 5 ms of a click and the view in 0 of 42 clicks, up to 11.9 s
  // later. So a click sets the view directly, and an address changed from outside
  // (Back, a link, a script) still moves it through the check below.
  const [boardView, setBoardView] = useState<HudView>(addressView);
  const [seenAddressView, setSeenAddressView] = useState<HudView>(addressView);
  if (seenAddressView !== addressView) {
    setSeenAddressView(addressView);
    setBoardView(addressView);
  }
  const view: HudView = boardView;
  const now = useNow();
  const isNarrow = useMediaQuery("(max-width: 1100px)");
  const isPhone = useMediaQuery("(max-width: 900px)");

  // ---- HUD state: which panel is open, what is picked. Nothing here acts on
  // the Queen; there is no public write endpoint to act with.
  const [commandCollapsed, setCommandCollapsed] = useState(false);
  const [intelExpanded, setIntelExpanded] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  // The context panel belongs to the comb: it opens with the field (on a
  // desktop) and steps aside for the views that need the whole viewport.
  const [contextOpen, setContextOpen] = useState(!isPhone&&!sharedCatalog);
  // Replace, not push, as useHashParams does: moving between tabs does not pile
  // up history entries. Built from the live hash, not the updater's argument:
  // React Router hands the updater the params of this hook's last render, so
  // with TRI's screen write pending in the same transition one would erase the
  // other. A tab you leave takes TRI's screen= and path= with it. A tab that
  // embeds an Explorer also names its card (skill=, spec=, chapter= …,
  // lib/queenEmbed); the card belongs to its tab, so leaving the tab drops it,
  // and a card given with the tab is written with it.
  const setView = useCallback(
    (next: HudView, card?: string | null) => {
      setBoardView(next);
      setHashParams(() => {
        const leaving = (hashParamsOf(window.location.hash).get("tab") ?? "comb") !== next;
        const params = tabAddress(window.location.hash, next);
        if (leaving) leaveTabSelections(params);
        // the board's filter is the board's: another tab is not narrowed by it
        if (leaving && next !== "kanban") for (const key of TASK_FILTER_KEYS) params.delete(key);
        if (card && isExplorerTab(next)) params.set(SELECTION_KEY[next], card);
        return params;
      }, { replace: true });
    },
    [setHashParams],
  );
  // The panel follows the view however the view changed — a click, a digit key
  // or the address bar — and only on a change, so the first render keeps the
  // initial state it had before.
  const [contextView, setContextView] = useState<HudView>(view);
  if (contextView !== view) {
    setContextView(view);
    setContextOpen(view === "comb" && !isPhone && !sharedCatalog);
  }
  const [menuOpen, setMenuOpen] = useState(false);
  // Single-key shortcuts (1-0, t, p, r) can be turned off from the menu (WCAG
  // 2.1.4): a letter typed for something else must not switch the view.
  const [keyShortcuts, setKeyShortcuts] = useState(() => {
    try {
      return window.localStorage.getItem(KEY_SHORTCUTS_STORAGE) !== "off";
    } catch {
      return true;
    }
  });
  const toggleKeyShortcuts = () => {
    const next = !keyShortcuts;
    setKeyShortcuts(next);
    try {
      window.localStorage.setItem(KEY_SHORTCUTS_STORAGE, next ? "on" : "off");
    } catch {
      /* storage blocked: this page still follows the choice until it reloads */
    }
  };
  const [doctrineOpen, setDoctrineOpen] = useState(false);
  const [roundOpen, setRoundOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // CALM BY DEFAULT IN THE APP'S FRAME (owner, 2026-10-02: "make the interface
  // more minimal so the map is visible"). Bare mode rode on the Fullscreen API,
  // which the Telegram Mini App's WebView does not have and a phone browser
  // only grants on a tap -- so in the app's Game tab the map stayed 499px of
  // 812 under a 176px head. The page keeps a bare state of its own: on by
  // default when this board is framed (app.t27.ai/game; a top-level /queen/ is
  // sent there by its nginx) at phone width, and set by the FULLSCREEN button
  // wherever the API is missing. The iOS app shimmed the API to get the same
  // effect; this is that behaviour, owned here, on every platform.
  const framed = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);
  const [pageBare, setPageBare] = useState(
    () => framed && !embedded && window.matchMedia("(max-width: 900px)").matches,
  );
  const bare = isFullscreen || pageBare;
  // In bare mode the head shows the sector name and nothing else until "more"
  // opens it; every tool, EXIT FULLSCREEN included, is one tap away.
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsShown = bare && toolsOpen;
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [pick, setPick] = useState<HudPick | null>(null);
  const [agentCopy, setAgentCopy] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const combRef = useRef<CombHandle>(null);
  // the field's layers: from the URL (?layers=foundation,castle), all on by default (H-D)
  const [layers, setLayers] = useState<Record<FieldLayer, boolean>>(() => layersFromSearch(window.location.search));
  const viewportRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const roundRef = useRef<HTMLElement>(null);
  const agentCopyTimer = useRef<number | null>(null);

  const data = state.data;
  const isLive = state.kind === "ready";
  const latest = data?.dispatches.latest;
  const decision = data?.lastTick;
  const board = boardState.data;
  const repo = board?.repo ?? null;
  const pulse = board?.pulse;
  const research = researchState.data;
  // The HUD's RESEARCH figure is the tech tree's own figure, so the strip and
  // the tab it opens never print two different percentages.
  const tree = researchState.tree;
  const workers = research?.workers ?? null;
  const hardware = hardwareState.data;
  const cards = board?.cards ?? EMPTY_CARDS;
  // The field's cells are the repository's MODULES (M-2); the board's cards
  // stay the issues, which are the bees. A module stands in a column derived
  // from facts (an issue in progress on it, an open issue, recently touched,
  // dormant), so territories and the buildings' kinds follow.
  const modulesState = useQueenModules();
  const foundationState = useQueenFoundation();
  const t27Coverage = useT27Coverage(modulesState.data?.repo ?? null);
  const hiveFoundation = hiveSameRepositorySnapshot(repo, foundationState.data);
  const closedCount = hiveFoundation?.closedIssues.length ?? 0;
  const hiveRecords = useMemo(() => hiveDisplayRecords(repo, cards, hiveFoundation), [repo, cards, hiveFoundation]);
  const rawModules = modulesState.data?.modules ?? EMPTY_MODULES;
  // the board knows the issues; every row gets its open issues from the cards
  const modules = useMemo(() => withOpenIssues(rawModules, cards), [rawModules, cards]);
  const runningIssues = useMemo(() => new Set(cards.filter((c) => c.column === "running").map((c) => c.number)), [cards]);
  const moduleCards = useMemo<QueenCard[]>(() => modules.map((m) => moduleCard(m, now, runningIssues) as QueenCard), [modules, runningIssues, now]);
  const modulesById = useMemo(() => { const map = new Map<number, HudModule>(); moduleCards.forEach((c, i) => map.set(c.number, modules[i])); return map; }, [moduleCards, modules]);
  // Placement ledger (P1-20): the board arrives in wire order on every poll,
  // so a positional layout moved every structure and every bee whenever an
  // issue was inserted at the head. Known cards keep their cells across
  // polls; the ledger is adjusted during render when the card list changes
  // (React's derived-state pattern), never in an effect, so the comb, the
  // minimap and the pick all see the same placement in the same frame.
  // the field is as large as the honey needs (the hub plus modules or closed issues) and, when the
  // snapshot names ring directories, at least the castle's ring 7 with its plinths
  const fieldNeed = Math.max(moduleCards.length + 1, closedCount + 1, hiveRecords.length + 1, (hiveFoundation?.rings.length ?? 0) > 0 ? hexCellCount(CASTLE_RING) + 1 : 0);
  const [hivePlacement, setHivePlacement] = useState<{ rows: HiveDisplay[]; placed: (HiveDisplay | null)[]; ledger: Map<string, number> }>(() => ({ rows: hiveRecords, ...placeHiveDisplays(new Map(), hiveRecords, hexField(fieldNeed).cellCount) }));
  let hiveCells = hivePlacement.placed;
  if (hivePlacement.rows !== hiveRecords || hiveCells.length !== hexField(fieldNeed).cellCount) {
    const next = placeHiveDisplays(hivePlacement.ledger, hiveRecords, hexField(fieldNeed).cellCount);
    hiveCells = next.placed;
    setHivePlacement({ rows: hiveRecords, ...next });
  }
  const [placement, setPlacement] = useState<{
    cards: QueenCard[];
    placed: (QueenCard | null)[];
    ledger: Map<number, number>;
  }>(() => {
    // the honeycomb: the hub plus one cell per module and per closed issue, rings from the centre
    const shape0 = hexField(fieldNeed);
    return { cards: moduleCards, ...placeCards(new Map(), moduleCards, shape0.cellCount, spiralOrder(shape0.cellCount)) };
  });
  let placedCards = placement.placed;
  if (placement.cards !== moduleCards || placement.placed.length !== hexField(fieldNeed).cellCount) {
    // rings from the centre: free cells are taken along the spiral, nearest the Queen first;
    // the field is as large as the honey and the castle need, the modules keep their inner cells
    const shape = hexField(fieldNeed);
    const next = placeCards(placement.ledger, moduleCards, shape.cellCount, spiralOrder(shape.cellCount));
    placedCards = next.placed;
    setPlacement({ cards: moduleCards, placed: next.placed, ledger: next.ledger });
  }
  const events: HudEvent[] = activityState.data?.events ?? EMPTY_EVENTS;
  const boardColumns = board?.columns ?? FALLBACK_COLUMNS;
  // Every task and its bees: the game's ships and the kanban's cards read this
  // one feed. The kanban being on screen is what asks for all of it.
  const tasksState = useQueenTasks(boardView === "kanban", board, boardState.error, events);
  const catalogLive = useMemo(() => ({ feed: tasksState.feed, health: tasksState.health, events: tasksState.events }), [tasksState.feed, tasksState.health, tasksState.events]);
  // The repository comb's bees, each over its own issue's cell by number in this
  // board's repository. Undefined until the feed exists, so the slot motes keep
  // the field until then rather than an empty sky.
  const combBees = useMemo<HiveBee[] | undefined>(() => {
    if (!tasksState.feed) return undefined;
    const sameRepo = (other: string) => repo !== null && other.toLowerCase() === repo.toLowerCase();
    return tasksState.feed.bees.map((bee) => {
      const index = bee.number !== null && sameRepo(bee.repo) ? hiveCells.findIndex((row) => row?.number === bee.number) : -1;
      // this comb draws every card of its board at once, so a cell is placed or there is none
      return { id: bee.id, lane: bee.lane, state: bee.state, number: bee.number, since: bee.since, target: index >= 0 ? index : null, cell: index >= 0 ? CELL_PLACED : CELL_NONE, portal: null };
    });
  }, [tasksState.feed, hiveCells, repo]);
  // The board's second lane. Asked for only while the kanban is on screen, and
  // answered only for somebody the hive has identified — `showing` carries both
  // of those facts, so the view has ONE thing to check rather than two it could
  // forget separately. The narrowing is this page's own state and stays here:
  // it never becomes an argument to the hive (src/lib/hiveBoard.ts).
  const hive = useHiveBoard(boardView === "kanban");
  // Empty is ALL of them, which is why the initial state is an empty array and
  // not a list of everything: a board that started by listing the clients it
  // was watching would be one refresh away from silently watching fewer.
  const [clientsNarrow, setClientsNarrow] = useState<string[]>([]);
  const [clientsSearch, setClientsSearch] = useState("");
  const clientsPanel = useMemo<ClientsPanel | null>(
    () =>
      hive.showing
        ? {
            lane: clientsLane(hive.board, clientsNarrow, lang, clientsSearch),
            reason: hive.reason,
          }
        : null,
    [hive.showing, hive.board, hive.reason, clientsNarrow, clientsSearch, lang],
  );
  // The third lane, the owner's mail. Null -- no chip, no lane, no word about
  // mail -- unless the hive sent the mail to this person (lib/ballBoard.ts).
  const ballBoard = useBallBoard(boardView === "kanban");
  const ballPanel = useMemo<BallLane | null>(
    () => (ballBoard.showing ? ballLane(ballBoard.board) : null),
    [ballBoard.showing, ballBoard.board],
  );
  const runningCards = useMemo(
    () => cards.filter((card) => card.column === "running"),
    [cards],
  );
  const reviewCards = useMemo(
    () => cards.filter((card) => card.column === "review"),
    [cards],
  );
  const doneCount = useMemo(
    () => cards.filter((card) => card.column === "done").length,
    [cards],
  );
  const reviewQueueCounts = reviewCounts(board);
  const reviewUnclassifiedCount = reviewUnclassified(board);
  const reviewColumnTitle =
    boardColumns.find((column) => column.key === "review")?.title ?? "review";
  // The tile is named by the column the number comes from - the wire's own
  // title - not by a word ("accepted") no endpoint carries.
  const doneColumnTitle = (
    boardColumns.find((column) => column.key === "done")?.title ?? c.hudDone
  ).toUpperCase();
  // STALE badge (P1-12): a poll failed after a first success, so the board or
  // the research numbers on screen are older than the wire. The age is the
  // older of the two; the raw error lives in the badge's title.
  const boardStale = staleAge(now, boardState.syncedAt, boardState.error);
  const researchStale = staleAge(now, researchState.syncedAt, researchState.error);
  const staleSeconds =
    boardStale === null ? researchStale : researchStale === null ? boardStale : Math.max(boardStale, researchStale);
  // one endpoint (P1-29): the round tile reads public-board's pulse and
  // nothing else; without the board it reads a dash, never a value assembled
  // from the status endpoint's interval and the last decision's moment
  const roundSeconds = board?.pulse.roundSeconds ?? 0;
  const lastRoundAt = board?.pulse.lastRoundAt ?? null;
  // server-relative: the client clock plus the offset the status answer
  // carried, so a fast or slow client never invents an OVERDUE (P1-30)
  const roundClock = countdownFor(now, state.offsetMs, lastRoundAt, roundSeconds);
  const elapsedSeconds = roundClock.elapsed;
  // The clock is only as real as its two inputs, a round length and the
  // moment the last round happened: without both it reads "—", never a
  // fabricated 00:00:00. A disabled scheduler has no next round to count
  // down to; past the round length the clock counts up as overdue.
  const schedulerOff = data ? !data.scheduler.enabled : false;
  const roundKnown = roundSeconds > 0 && lastRoundAt !== null;
  const roundOverdue = roundKnown && elapsedSeconds > roundSeconds;
  const syncLabel = boardState.syncedAt
    ? boardState.syncedAt.toLocaleTimeString(lang === "ru" ? "ru-RU" : "en-GB")
    : "—";
  // the value is the time since the last round (a fact); the interval is a
  // bound the scheduler works under, printed on the sub-line as "≤ 05:00",
  // never a countdown that promises the next round at a second (P1-29)
  const countdown =
    schedulerOff || !roundKnown ? "—" : `+${formatCountdown(elapsedSeconds)}`;
  const roundWindow =
    schedulerOff || !roundKnown
      ? null
      : `${c.hudSince} ${formatMoment(lastRoundAt, lang)} · ≤ ${formatCountdown(roundSeconds)}`;
  const roundLabel = schedulerOff
    ? c.hudSchedulerOff
    : roundOverdue
      ? c.hudOverdue
      : c.hudNextRound;
  // A round's resolution moment: when decidedAt changes, the round tile and
  // the gold block flash for six seconds and carry the strip. The change is
  // detected during render (state adjusted from a prop, the documented
  // pattern) and the expiry is read off the 1 Hz clock, so no timer and no
  // effect. The first decidedAt seen after load is history, not news.
  const decidedAt = decision?.decidedAt ?? null;
  const [seenDecidedAt, setSeenDecidedAt] = useState<string | null>(null);
  const [flashUntil, setFlashUntil] = useState(0);
  if (decidedAt !== seenDecidedAt) {
    setSeenDecidedAt(decidedAt);
    if (seenDecidedAt !== null && decidedAt !== null) setFlashUntil(now + 6_000);
  }
  const roundResolved = flashUntil > now;
  const strip =
    roundResolved && decision
      ? roundStrip(
          decision,
          data?.dispatches.running ?? null,
          latest?.issue ?? null,
          {
            allow: c.hudAllow,
            refuse: c.hudRefuse,
            executing: c.executing,
            queueMeaning: c.queueMeaning,
            reasons: c.reasons,
          },
          lang,
        )
      : null;
  const cellSummaries = useMemo(() => hexCellSummaries(placedCards), [placedCards]);
  const sectors = useMemo(
    () => sectorRows(boardColumns, cards),
    [boardColumns, cards],
  );
  const queue = useMemo(
    () =>
      runningCards.map((card) => ({
        card,
        latest: latestEventFor(events, card.number),
      })),
    [runningCards, events],
  );
  const reviewQueue = useMemo(() => reviewCards.slice(0, 4), [reviewCards]);
  const describe = useCallback(
    (event: HudEvent) => activityLabel(event, lang),
    [lang],
  );
  // The pick is a card number, not a cell index: the field is rebuilt from
  // the card list on every poll, so an index would drift to a stranger's
  // cell. A pick with a card follows its number and re-reads the card; a pick
  // without one (the Queen's cell, an empty cell) keeps its index; a card that
  // left the board clears the pick. Derived, never stored.
  // the honey under the cells, for picks by issue number (H-E)
  const foundationByIndex = useMemo(() => (hiveFoundation ? foundationCells(hiveFoundation.closedIssues, cellSummaries.length) : null), [hiveFoundation, cellSummaries.length]);
  const foundationIndexByNumber = useMemo(() => { const m = new Map<number, number>(); foundationByIndex?.forEach((issue, i) => { if (issue) m.set(issue.number, i); }); return m; }, [foundationByIndex]);
  const livePick = useMemo<HudPick | null>(() => {
    if (!pick) return null;
    if (pick.kind === "issue" && pick.issue) {
      // an issue pick follows its number: the cell may move when the snapshot re-packs
      const index = foundationIndexByNumber.get(pick.issue.number);
      if (index === undefined) return null;
      return { ...pick, index, issue: foundationByIndex?.[index] ?? pick.issue, territory: cellSummaries[index]?.own ?? pick.territory };
    }
    if (!pick.card) return pick.index < cellSummaries.length ? pick : null;
    const number = pick.card.number;
    const index = cellSummaries.findIndex((cell) => cell.cardNumber === number);
    if (index < 0) return null;
    return {
      ...pick,
      index,
      card: moduleCards.find((card) => card.number === number) ?? pick.card,
      module: modulesById.get(number) ?? null,
      territory: cellSummaries[index].own,
      isQueen: index === HEX_HOME,
    };
  }, [pick, cellSummaries, moduleCards, modulesById, foundationByIndex, foundationIndexByNumber]);
  const pickIndex = livePick?.index ?? null;
  const pickedCard = livePick?.card ?? null;
  const pickedIssueUrl =
    pickedCard && repo
      ? `https://github.com/${repo}/issues/${pickedCard.number}`
      : null;
  // On ALLOW the detail is what the round did; on a refusal it is the refusal.
  const decisionInfo = decision
    ? decisionDetail(decision, data?.dispatches.running ?? null, latest?.issue ?? null, c)
    : null;
  // Why free slots are idle, from the status already fetched, on the server's
  // clock. Measured 2026-09-15: BEES 0/4 was read as broken bees while the
  // round said "nothing to choose" and 449 of 488 issues had no ## Boundary.
  // Only on a live read: after a failed fetch the hook keeps the last data,
  // and a kept round would age into "round stale", blaming the scheduler for
  // a page that cannot see the server.
  const idleNow = isLive ? idleReason(data, now + (state.offsetMs ?? 0)) : null;
  const idleWhy = idleNow
    ? idleLine(idleNow, {
        idle: c.factoryIdle,
        nothingToChoose: c.idleNothing,
        refused: c.idleRefused,
        checked: c.idleChecked,
        stale: c.idleStale,
        staleDetail: c.idleStaleDetail,
        unitS: c.unitS,
        unitMin: c.unitMin,
        unitH: c.unitH,
        reasons: {
          missingBoundary: c.idleMissingBoundary,
          claimed: c.idleClaimed,
          completed: c.idleCompleted,
          fileConflict: c.idleFileConflict,
          notFirst: c.idleNotFirst,
          other: c.idleOther,
        },
      })
    : null;
  // wire field first (P1-18): the refusal or what the round did leads, the
  // verb follows, so a narrow gold block cuts the verb, never the reason

  // ---- the shell owns the document while mounted: the body class scopes the
  // height chain in Queen.css and is removed on unmount.
  useEffect(() => {
    document.body.classList.add("queen-shell");
    return () => document.body.classList.remove("queen-shell");
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (!keyShortcuts) return;
      // The typed letter, or the physical key for another script: r is TRI on a Russian layout too.
      const at = hudKeyIndex(event);
      if (at >= 0 && at < HUD_VIEWS.length) setView(HUD_VIEWS[at]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setView, keyShortcuts]);

  useEffect(() => {
    const onChange = () => {
      const on = Boolean(document.fullscreenElement);
      setIsFullscreen(on);
      // Leaving from the tools closes them, so the next entry starts calm.
      if (!on) setToolsOpen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // How many each layer of the ladder holds. The Explorers used to print these
  // in a strip of their own inside the frame; that strip was a second ladder on
  // the same screen, so it is gone and the numbers stand on the rungs instead.
  // The shell is a different document from the frames and cannot read what they
  // loaded, so it fetches the smallest catalog itself. A failure leaves the
  // rungs without numbers, which is what they had before.
  const [ladderCounts, setLadderCounts] = useState<LadderCounts | null>(null);
  useEffect(() => {
    let live = true;
    void loadLadderCounts().then(
      (counts) => { if (live) setLadderCounts(counts); },
      () => {},
    );
    return () => { live = false; };
  }, []);
  // The SPECS rung is the corpus store's count, the number the Explorer frame
  // prints from the same part; the catalogs' generated ladder is the fallback
  // until the manifest arrives. qa/queen-spec-sync-contract.mjs holds them equal.
  const corpus = useT27Manifest().part;
  const rungCounts = useMemo<LadderCounts | null>(
    () => (ladderCounts && corpus ? { ...ladderCounts, specs: corpus.identity.specCount } : ladderCounts),
    [ladderCounts, corpus],
  );

  useEffect(
    () => () => {
      if (agentCopyTimer.current !== null) {
        window.clearTimeout(agentCopyTimer.current);
      }
    },
    [],
  );

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeRound = useCallback(() => setRoundOpen(false), []);
  useDismiss(menuOpen, menuRef, closeMenu);
  useDismiss(roundOpen, roundRef, closeRound);

  const handlePick = useCallback((next: HudPick | null) => {
    setPick(next);
  }, []);

  const toggleFullscreen = () => {
    if (bare) {
      setPageBare(false);
      setToolsOpen(false);
      if (document.fullscreenElement) void document.exitFullscreen();
    } else if ((framed && isPhone) || !document.fullscreenEnabled) {
      setPageBare(true);
    } else {
      void viewportRef.current?.requestFullscreen?.();
    }
  };

  // The scene measures itself on resize. Entering or leaving bare mode changes
  // the viewport's box without one, and the map stayed fitted to the old box.
  // Twice: the layout settles over a frame or two after the class lands.
  useEffect(() => {
    const timers = [60, 400].map((ms) =>
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), ms),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [bare]);

  // COMPAT, REMOVE ONCE NO INSTALLED iOS BUILD PREDATES THIS: the Vibee iOS app
  // (999-multibots-telegraf, AppWebView.swift boardFullscreen) injects its own
  // calm rules, which hide the head's tools with !important unless the root
  // carries this class. Setting it keeps the board's own "more" working there.
  // The shim left the app in 999-multibots-telegraf#3351 (bf9edb835), so the
  // first build without it is CFBundleVersion 8033 cut from main (the build
  // number is the commit count). TestFlight testers can still run older ones,
  // and the app's web view does not say its build, so "none older is
  // installed" cannot be measured from here yet: until it can, keep this.
  useEffect(() => {
    document.documentElement.classList.toggle("vibee-board-tools", toolsShown);
  }, [toolsShown]);

  // The address says the language too, as the header's LanguageSwitcher already
  // makes it: measured before this, /?lang=ru stayed in the address after the toggle
  // switched the page to English, so a reload came back in Russian. history.state
  // is kept, since HashRouter keeps its entry index there.
  const toggleLang = () => {
    const next = lang === "ru" ? "en" : "ru";
    setLang(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(window.history.state, "", url);
  };

  const copyAgent = async () => {
    if (agentCopyTimer.current !== null) {
      window.clearTimeout(agentCopyTimer.current);
    }
    try {
      await copyToClipboard(
        agentBootstrapText(research?.agentBootstrap ?? fallbackBootstrap(), lang),
      );
      setAgentCopy("copied");
      agentCopyTimer.current = window.setTimeout(() => {
        agentCopyTimer.current = null;
        setAgentCopy("idle");
      }, 2_500);
    } catch {
      setAgentCopy("error");
    }
  };

  const onBell = () => {
    if (isNarrow) setIntelOpen((open) => !open);
    else setIntelExpanded((expanded) => !expanded);
  };

  // Every view, with the glyph and the key it has always answered. The rail
  // draws the seven in RAIL_VIEWS; the five layers below SPECS and the two
  // board views beside KANBAN are drawn by their own module's sub-navigation
  // instead (components/QueenLadder), which is why seven of these entries no
  // longer appear on the left edge. Keys are unchanged and come from hudKeyOf,
  // so 7 is still SKILLS, t still TOOLS and 4 still MISSION MAP — they now open
  // the module that holds them, standing on that view.
  const viewItems = [
    { view: "comb" as const, glyph: "▽", label: c.combView, hint: c.combHint },
    // Second, directly after the comb: the corpus is the Queen's core, not an
    // appendix to the board views — and now the door to the whole ladder.
    { view: "specs" as const, glyph: "⬡", label: c.specsView, hint: c.specsHint },
    { view: "kanban" as const, glyph: "▦", label: c.kanbanView, hint: c.kanbanHint },
    { view: "map" as const, glyph: "⌘", label: c.mapView, hint: c.mapHint },
    { view: "factory" as const, glyph: "⚙", label: c.factoryView, hint: c.factoryHint },
    { view: "research" as const, glyph: "◈", label: c.tech, hint: c.researchHint },
    // The agents' skills and schedules, each a catalog generated from .t27
    // specs, opened whole like the corpus is. Layers of the ladder: inside SPECS.
    { view: "skills" as const, glyph: "⟁", label: c.skillsView, hint: c.skillsHint },
    { view: "crons" as const, glyph: "◷", label: c.cronsView, hint: c.cronsHint },
    // The agents themselves — the fourth layer, who holds the skills
    // under SOUL.md and AGENTS.md, with their experience joined by evidence.
    { view: "agents" as const, glyph: "Ω", label: c.agentsView, hint: c.agentsHint },
    // The functions — where a spec meets a running service, witnessed by the
    // vendored manifest and read live once a minute.
    { view: "functions" as const, glyph: "ƒ", label: c.functionsView, hint: c.functionsHint },
    // The tools — what every agent should know: the tri CLI and the MCP
    // servers, each read from its spec and its source.
    { view: "tools" as const, glyph: "⟐", label: c.toolsView, hint: c.toolsHint },
    // On the letter p (the digits are spent, t is TOOLS): the system
    // documentation — the project, the rules of the game for its agents, and
    // the system in detail, framed from #/docs.
    { view: "project" as const, glyph: "§", label: c.projectView, hint: c.projectHint },
    // On the letter r (digits spent, t is TOOLS, p is PROJECT): TRI, the app at
    // app.t27.ai inside the game, one screen per address.
    { view: "tri" as const, glyph: "△", label: c.triView, hint: c.triHint },
    { view: "passport" as const, glyph: "▤", label: c.passportView, hint: c.passportHint },
    { view: "browser" as const, glyph: "◍", label: c.browserView, hint: c.browserHint },
    { view: "roadmap" as const, glyph: "⇶", label: c.roadmapView, hint: c.roadmapHint },
    // On the letter l: whose token each bee ran on, and what that lane earned.
    { view: "leaderboard" as const, glyph: "⚙", label: c.leaderboardView, hint: c.leaderboardHint },
    { view: "wars" as const, glyph: "⚔", label: c.warsView, hint: c.warsHint },
    { view: "token" as const, glyph: "¤", label: c.tokenView, hint: c.tokenHint },
    // On the letter g (the GPU): the seventh layer of the ladder, who sells
    // compute. Folded into SPECS like the other layers, so it has no rail button.
    { view: "providers" as const, glyph: "⌬", label: c.providersView, hint: c.providersHint },
    // On the letter v: what a reader can lift out of t27 and share, from
    // specs/widgets/gallery.t27. Its own rail door, not folded.
    { view: "widgets" as const, glyph: "⧉", label: c.widgetsView, hint: c.widgetsHint },
  ].map((item) => ({ ...item, hotkey: hudKeyOf(item.view) }));
  // TRI is drawn as one button per screen, owner's word 2026-09-21: every
  // screen of the app its own tab. The first keeps TRI's key; the rest are
  // reached by the rail. The address underneath is still ?tab=tri&screen=.
  const triGroupNow = triGroupOf(triScreenOf(hashParams.get("screen")));
  const triRail: Record<string, { glyph: string; label: string }> = {
    feed: { glyph: "▣", label: c.triFeed },
    chat: { glyph: "✦", label: c.triAgent },
    script: { glyph: "✧", label: c.triAi },
    profile: { glyph: "◐", label: c.triProfile },
    crm: { glyph: "☰", label: c.triCrm },
  };
  const railItems: CommandItem[] = viewItems
    .filter((item) => (RAIL_VIEWS as readonly string[]).includes(item.view))
    .flatMap((item): CommandItem[] =>
      item.view !== "tri"
        ? [item]
        : TRI_BUTTONS.map((screen, i): CommandItem => ({
            ...item,
            glyph: triRail[screen]?.glyph ?? item.glyph,
            label: (triRail[screen]?.label ?? screen).toUpperCase(),
            hint: `TRI · ${triRail[screen]?.label ?? screen}`,
            hotkey: i === 0 ? item.hotkey : "",
            screen,
            current: triGroupOf(screen) === triGroupNow,
          })),
    );
  // PROFILE last, after every other tab: the owner's word, 2026-09-21. The
  // person's own page closes the rail rather than sitting between the AI
  // pipeline and the CRM.
  const commandItems: CommandItem[] = [
    ...railItems.filter((item) => item.screen !== "profile"),
    ...railItems.filter((item) => item.screen === "profile"),
  ];
  const selectTriScreen = (screen: string) => {
    setBoardView("tri");
    setHashParams(() => triAddress(window.location.hash, triScreenOf(screen), null), { replace: true });
  };
  // The ladder's rungs, in the ladder's own order (queenHud.SPEC_LAYERS) rather
  // than the rail's — Tools is the fifth layer and Functions the sixth, which
  // the rail's key order had the other way round — with the labels the rail used
  // to print for them.
  const ladderItems: LadderLayer[] = SPEC_LAYERS.map((layer) => {
    const item = viewItems.find((entry) => entry.view === layer)!;
    return { layer, glyph: item.glyph, label: item.label, hint: item.hint };
  });
  // The board's three readings, in the board's own order (queenHud.BOARD_VIEWS):
  // the columns, the same cards as ground, and what the swarm is producing on
  // them. Built exactly as the ladder's rungs are, from the same view entries,
  // so the two rows cannot disagree about a label or a key. No counts: the
  // ladder's numbers are how many cards a catalog holds, and the three board
  // views all hold the one board.
  const boardItems: LadderLayer[] = BOARD_VIEWS.map((member) => {
    const item = viewItems.find((entry) => entry.view === member)!;
    return { layer: member, glyph: item.glyph, label: item.label, hint: item.hint };
  });
  const viewLabel = viewItems.find((item) => item.view === view)?.label ?? c.combView;
  const ladderNav = (
    <QueenLadder
      layers={ladderItems}
      current={view}
      onSelect={setView}
      aria={c.ladderAria}
      counts={rungCounts}
    />
  );
  const boardNav = (
    <QueenLadder layers={boardItems} current={view} onSelect={setView} aria={c.boardAria} family="board" />
  );
  // PROJECT and the PASSPORT beside it, drawn exactly as the board's row is.
  const projectItems: LadderLayer[] = PROJECT_VIEWS.map((member) => {
    const item = viewItems.find((entry) => entry.view === member)!;
    return { layer: member, glyph: item.glyph, label: item.label, hint: item.hint };
  });
  const projectNav = (
    <QueenLadder layers={projectItems} current={view} onSelect={setView} aria={c.projectView} family="project" />
  );
  const doctrine = [
    { n: "01", title: c.spec, copy: c.specCopy, tone: "" },
    { n: "02", title: c.queen, copy: c.queenCopy, tone: "is-queen" },
    { n: "03", title: c.bee, copy: c.beeCopy, tone: "" },
    { n: "04", title: c.selfReview, copy: c.selfReviewCopy, tone: "is-active" },
    { n: "05", title: c.verdict, copy: c.verdictCopy, tone: "is-queen" },
    { n: "06", title: c.merge, copy: c.mergeCopy, tone: "" },
  ];
  // the pill says what the swarm is doing, in the wire's own state read
  // through four COPY keys (P1-28); a state the page has no word for prints
  // the wire's word itself, never a guess
  const swarmWord =
    data?.swarmState === "working"
      ? c.swarmWorking
      : data?.swarmState === "idle"
        ? c.swarmIdle
        : data?.swarmState === "paused"
          ? c.swarmPaused
          : data?.swarmState
            ? data.swarmState.toUpperCase()
            : c.swarmUnknown;
  const statusText = isLive
    ? `${c.live} · ${swarmWord}`
    : state.kind === "error"
      ? c.unavailable
      : c.checking;
  const statusTone = isLive ? "is-live" : state.kind === "error" ? "is-cold" : "is-muted";
  const skipEntries = skipCounts(decision?.skipSummary) ?? [];

  // The feed used to be a second list beside the Queen, saying the same things
  // she now says in her own log — and it left her 90px of a column she is meant
  // to work in. The events go to her; the column keeps the overview below.
  // The same Queen in both shapes of the column: the wide aside and the phone
  // drawer. Defined once so the drawer cannot quietly lose her.
  // WHERE THE PERSON IS, AND WHAT THEY SEE (owner, 2026-09-22): the rail's
  // own name for the tab, the TRI screen, and the screen's text read at the
  // moment of a question. The app frame is this origin on app.t27.ai/queen,
  // so its document is readable; on t27.ai it is another origin and the read
  // throws, which leaves the Queen with the tab name alone.
  const triScreenNow = triScreenOf(hashParams.get("screen"));
  const railLabelNow = (
    boardView === "tri"
      ? triRail[triGroupOf(triScreenNow)]?.label ?? c.triView
      : viewItems.find((item) => item.view === railViewOf(boardView))?.label ?? boardView
  ).toUpperCase();
  const screenNow = (): string => {
    if (boardView === "tri") {
      const frame = document.querySelector<HTMLIFrameElement>(".queen27-tri-frame");
      try {
        const body = frame?.contentDocument?.body;
        if (body) return screenExcerpt(body.innerText, triScreenNow === "chat");
      } catch {
        /* another origin: nothing to read, and nothing to claim */
      }
      return "";
    }
    const main = document.querySelector<HTMLElement>(".queen27-hud-vp-body");
    return main ? screenExcerpt(main.innerText, false) : "";
  };
  // She shows her work by opening the tab it is on ([[open:NAME]]), through
  // the same two calls the rail makes.
  const openForQueen = (name: string): string | null => {
    const target = Object.hasOwn(OPEN_TARGETS, name) ? OPEN_TARGETS[name] : null;
    if (!target) return null;
    if (target.screen) selectTriScreen(target.screen);
    else setView(target.view as HudView);
    return name.toUpperCase();
  };
  // A draft the person approved goes to their agent as them; the AGENT tab
  // is reloaded after, so its own thread shows the exchange.
  const sendForPerson = async (text: string): Promise<string> => {
    const reply = await sendToAgentAsMe(text);
    window.dispatchEvent(new CustomEvent("queen:tri-reload"));
    return reply;
  };
  const queenChat = (
    <Suspense fallback={null}>
      <QueenChat
        lang={lang === "ru" ? "ru" : "en"}
        context={{
          view: boardView,
          repo,
          // On SPECS, the spec the frame shows, when its path may go into the
          // Queen's prompt (lib/queenSpecsChat.ts). On BROWSER, the address's
          // own spec= (raw: askQueenInBrowser names it to the agent only if it
          // is a catalog entry, queenBrowserPage.ts).
          spec: boardView === "specs" ? specsChatSpec(hashParams.get("spec")) : boardView === "browser" ? hashParams.get("spec") : null,
          label: railLabelNow,
          screen: boardView === "tri" ? triScreenNow : null,
          sees: screenNow,
        }}
        onOpen={openForQueen}
        onSendToAgent={sendForPerson}
        events={events}
        describe={describe}
        issueHref={(event) => (event.issue && repo ? `https://github.com/${repo}/issues/${event.issue}` : null)}
        // The A2A tab counts links out of the feed; how many slots are actually
        // busy is the swarm's own number and is never inferred from events.
        // Same fallback the factory strip uses: /queen/status first, the
        // research graph's copy when status has not answered yet.
        workers={data?.workers ?? workers}
      />
    </Suspense>
  );

  // The overview is a fact about the map — which repository, how many cards,
  // and the six sectors' counts — so it sits on the map, at the foot of the
  // field it describes. In the bar it was a panel folded into 191px of a 64px
  // row, and the minimap under its title had nowhere left to draw.
  // The overview's numbers, in the bar with the rest of the counts.
  //
  // As a panel on the map it was a picture of the field drawn on top of the
  // field — 280x224 of it — and what it carried that nothing else does is two
  // numbers: how many cards the board holds, and how they fall across the six
  // sectors. Numbers are what this bar is for. The rows keep their names for a
  // screen reader and their click, which still opens the sector on the board.
  const overviewNumbers = (
    <section className="queen27-hud-res queen27-hud-sectors" aria-label={c.hudOverview}>
      <i aria-hidden="true">◇</i>
      <small>{c.hudSectors}</small>
      <strong>{board ? cards.length : "—"}</strong>
      <QueenSectors
        rows={board ? sectors : null}
        active={activeSector}
        onSelect={(key) => {
          setActiveSector(key);
          setView("kanban");
        }}
        labels={{
          title: c.hudSectors,
          held: c.combHeld,
          neutral: c.combNeutral,
          fog: c.combFog,
          cards: c.hudCards,
        }}
      />
    </section>
  );

  const roundPopover = roundOpen && (
    <div
      className="queen27-hud-round-pop"
      id="queen-round-pop"
      role="dialog"
      aria-label={c.decision}
    >
      <span className="queen27-section-label">{c.decision}</span>
      <div className="queen27-hud-round-pop-grid">
        <div
          className="queen27-verdict"
          aria-label={
            decision ? (decision.allowed ? c.hudAllow : c.hudRefuse) : c.noDecision
          }
        >
          <span>{decision ? (decision.allowed ? "1" : "0") : "—"}</span>
          <small>{decision ? (decision.allowed ? c.hudAllow : c.hudRefuse) : "—"}</small>
        </div>
        <div>
          <strong>
            {decision
              ? decision.allowed
                ? c.chose
                : c.stoodDown
              : c.noDecision}
          </strong>
          {decision && (
            <p>
              {decisionInfo} · {decision.skippedCount}{" "}
              {c.reasons}.
            </p>
          )}
          {skipEntries.length > 0 && (
            <ul className="queen27-hud-skips">
              {skipEntries.map(({ key: reason, count }) => (
                <li key={reason}>
                  <b>{count}</b> {skipReasonWords(reason)}
                </li>
              ))}
            </ul>
          )}
          <small>
            {c.lastDecision}: {formatMoment(decision?.decidedAt, lang)} ·{" "}
            {c.synchronized} · {syncLabel}
          </small>
        </div>
      </div>
    </div>
  );

  // The hive is the ground under every view, not a view of its own.
  //
  // It rendered only for the comb, so every other tab was the flat starfield
  // with panels over it — the user, repeatedly: "где карта с игрой?". The field
  // is already a fixed, full-shell layer at z-index 0, so mounting it always
  // puts it behind whatever the tab draws. Off the comb it keeps drawing and
  // stops listening: its labels, its toolbar and its cards belong to the map's
  // own view, and a scene that took clicks under the board would be a scene in
  // the way.
  const hiveScene =
            sharedCatalog ? <SceneBoundary lang={lang==='ru'?'ru':'en'}><Suspense fallback={<QueenLoading title={lang==='ru'?'Собираю карту':'Building the map'} facts={[`${sharedCatalog.specs.length} .t27`,`${sharedCatalog.worlds.length} ${lang==='ru'?'репозиториев':'repositories'}`,`${sharedCatalog.issues.length} ${lang==='ru'?'задач':'issues'}`]}/>}><QueenCatalogHive atlas={sharedCatalog} lang={lang==='ru'?'ru':'en'} handleRef={combRef} foundationVisible={layers.foundation} fitInset={contextOpen?(isPhone?.56:.46):0} onInspect={()=>setContextOpen(false)} live={catalogLive}/></Suspense></SceneBoundary> : ENGINE_FLAG !== "canvas" ? (
              <SceneBoundary lang={lang === 'ru' ? 'ru' : 'en'}>
              <Suspense fallback={<QueenLoading title={lang === 'ru' ? 'Собираю карту' : 'Building the map'} facts={[`${placedCards.length} ${lang === 'ru' ? 'карточек' : 'cards'}`, hiveFoundation ? `${hiveFoundation.closedIssues.length} ${lang === 'ru' ? 'закрытых' : 'closed'}` : null]}/>}>
                <QueenCombBabylon
                  signalHealth={{board:hiveFeedHealth(boardState.data!==null,boardState.error),activity:hiveFeedHealth(activityState.data!==null,activityState.error)}}
                  displays={hiveCells}
                  lang={lang === 'ru' ? 'ru' : 'en'}
                  /* Inspecting a hive display zooms the scene onto it and the
                     display draws over the whole field, so the card steps
                     aside. It used to leave a collapsed chip behind; now it
                     leaves nothing, and FIT VIEW below brings it back. */
                  onInspect={() => setContextOpen(false)}
                  cards={placedCards}
                  modules={modulesById}
                  beeTargets={runningCards.map(card => { const index = hiveCells.findIndex(row => row?.number === card.number); return index >= 0 ? index : null; })}
                  liveBees={combBees}
                  foundation={hiveFoundation ? { issues: hiveFoundation.closedIssues, generatedAt: hiveFoundation.generatedAt, source: hiveFoundation.source, rings: hiveFoundation.rings, epics: hiveFoundation.epics, releases: hiveFoundation.releases } : null}
                  layers={layers}
                  handleRef={combRef}
                  workers={workers}
                  onPick={handlePick}
                  pickIndex={pickIndex}
                  fitInset={contextOpen ? (isPhone ? 0.56 : 0.46) : 0}
                  events={events}
                  t27Coverage={t27Coverage}
                  law={{ t27: c.hiveLawT27, manual: c.hiveLawManual, awaiting: c.hiveLawAwaiting, unknown: c.hiveLawUnknown, bees: c.hiveLawBees }}
                />
              </Suspense>
              </SceneBoundary>
            ) : (
              <QueenComb
                embedded
                handleRef={combRef}
                onPick={handlePick}
                pickIndex={pickIndex}
                fitInset={contextOpen ? (isPhone ? 0.56 : 0.46) : 0}
                events={events}
                columns={boardColumns}
                cards={placedCards}
                repo={repo}
                workers={workers}
                error={boardState.error ?? researchState.error}
                labels={{
                  aria: c.combView,
                  held: c.combHeld,
                  neutral: c.combNeutral,
                  fog: c.combFog,
                  bees: c.combBees,
                  queen: c.combQueen,
                  queenCell: c.combQueenCell,
                  noBee: c.combNoBee,
                  pick: c.combPick,
                  hint: c.combHint2,
                  offline: c.factoryOffline,
                }}
              />
            );

  return (
    <main
      className={`queen27-page is-shell${commandCollapsed ? " is-command-collapsed" : ""}${bare ? " is-bare" : ""}${toolsShown ? " is-tools" : ""}${embedded ? " is-embed" : ""}`}
      data-view={view}
      // Which module the reader is in, as against which layer of it: for the
      // seven layers of the ladder this is "specs" for all seven. A rule that
      // wants "inside the SPECS module" -- the map's command row does not
      // belong there, and the body must not reserve its height -- asks this,
      // not data-view, which said "specs" on one of the six and left the other
      // five reserving 66px for a row that is not rendered on any of them.
      data-rail-view={railViewOf(view)}
      // The corpus every tab is reading, from the one store: the Explorer frame
      // stamps the same three on its root, and qa/queen-spec-sync-contract.mjs
      // reads both on every tab and requires them equal.
      data-spec-count={corpus?.identity.specCount}
      data-corpus-version={corpus?.version}
      data-corpus-source={corpus?.source}
    >
      <section
        className="queen27-hud-viewport"
        ref={viewportRef}
        aria-label={viewLabel}
        data-errors-as="title"
              data-pick-index={pickIndex ?? undefined}
        data-pick-number={pickedCard?.number ?? livePick?.issue?.number ?? undefined}
        data-pick-kind={livePick?.kind ?? undefined}
        data-pick-issue={livePick?.kind === "issue" ? (livePick.issue?.number ?? undefined) : undefined}
        data-pick-territory={livePick?.territory ?? undefined}
        data-pick-module={livePick?.module?.path ?? undefined}
        data-modules={modulesState.data ? `${modules.length}@${modulesState.data.commit ?? "?"}:${modulesState.data.source}` : undefined}
        data-foundation={hiveFoundation ? `${hiveFoundation.closedIssues.length}@${hiveFoundation.generatedAt}:${hiveFoundation.source}` : undefined}
        data-layers={FIELD_LAYERS.filter((k) => layers[k]).join(",") || "none"}
      >
        <header className="queen27-hud-vp-head">
          <span className="queen27-hud-vp-title">
            {c.sector.toUpperCase()}: {sharedCatalog&&boardView==='comb'?'TRI-27 / SHARED CORE':repo ?? "—"}
          </span>
          <span className="queen27-hud-vp-sep" aria-hidden="true">
            ///
          </span>
          <span className="queen27-hud-vp-view">{viewLabel}</span>
          {staleSeconds !== null && (
            <span
              className="queen27-hud-vp-stale"
              data-stale={staleSeconds}
              title={boardState.error ?? researchState.error ?? undefined}
            >
              {c.hudStale} · {formatCountdown(staleSeconds)}
            </span>
          )}
          {/* The worlds render here: choosing a repository is a question about
              the map, and the map's own controls are where it is answered. */}
          <div id="queen-worlds-slot" className="queen27-hud-vp-worlds" />

          <div className="queen27-hud-vp-tools">
            {view === "comb" && (
              <>
                {FIELD_LAYERS.filter(k=>!sharedCatalog||k==='foundation').map((k) => (
                  <button
                    type="button"
                    key={k}
                    data-layer={k}
                    aria-pressed={layers[k]}
                    aria-label={c[LAYER_COPY[k]]}
                    title={sharedCatalog?`${c[LAYER_COPY[k]]} · ${sharedCatalog.specs.length} .t27`:k === "foundation" ? (hiveFoundation ? `${c[LAYER_COPY[k]]} · ${hiveFoundation.closedIssues.length} ${c.hudClosed} · ${c.hudFoundationSnapshot} ${formatMoment(hiveFoundation.generatedAt, lang)} · ${hiveFoundation.source}` : `${c[LAYER_COPY[k]]} · —`) : c[LAYER_COPY[k]]}
                    onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}
                  >
                    <i aria-hidden="true">{LAYER_GLYPH[k]}</i>
                    <span className="queen27-hud-vp-word">{c[LAYER_COPY[k]]}</span>
                  </button>
                ))}
                {/* FIT VIEW is the way home, and the inspector is part of home:
                    it undoes the roam, the zoom and the display that took the
                    field, so the CONTEXT card comes back with them. That is
                    what reopens it now that the collapsed chip is gone — a
                    labelled control in the toolbar instead of a green button
                    floating over the hive. Not on the catalog board and not on
                    a phone: the card does not belong to either. */}
                <button
                  type="button"
                  data-tool="fit"
                  onClick={() => { combRef.current?.fit(); setContextOpen(!isPhone && !sharedCatalog); }}
                  title={c.hudFitView}
                >
                  {c.hudFitView}
                </button>
                <button
                  type="button"
                  data-tool="out"
                  onClick={() => combRef.current?.zoomOut()}
                  aria-label={c.hudZoomOut}
                  title={c.hudZoomOut}
                >
                  −
                </button>
                <button
                  type="button"
                  data-tool="in"
                  onClick={() => combRef.current?.zoomIn()}
                  aria-label={c.hudZoomIn}
                  title={c.hudZoomIn}
                >
                  +
                </button>
              </>
            )}
            {/* The quick-command row is gone, and what it held that this row
                does not is here instead: the agent packet, the repository, the
                picked issue and the language. Icons at the row's own size — the
                row is read by people who have just used it, and each keeps its
                name in the tooltip and for a screen reader. */}
            {/* Who is playing (src/lib/triIdentity.ts). A preview on the landing
                (embed=1) asks nobody: it would mount a bridge per block. */}
            {!embedded && (
              <QueenIdentity
                view={view}
                screen={view === "tri" ? hashParams.get("screen") : null}
                lang={lang}
                c={identityCopy}
              />
            )}
            <button
              type="button"
              data-tool="agent"
              className={agentCopy === "copied" ? "is-gold" : undefined}
              onClick={copyAgent}
              aria-label={c.copyAgent}
              title={agentCopy === "copied" ? c.copiedAgent : agentCopy === "error" ? c.copyFailed : c.copyAgent}
            >
              ⌘
            </button>
            {repo ? (
              <a data-tool="repo" href={`https://github.com/${repo}`} target="_blank" rel="noreferrer" aria-label={c.hudOpenRepo} title={c.hudOpenRepo}>
                ◇
              </a>
            ) : (
              <button type="button" data-tool="repo" disabled aria-label={c.hudOpenRepo} title={c.hudOpenRepo}>
                ◇
              </button>
            )}
            {pickedIssueUrl ? (
              <a data-tool="issue" href={pickedIssueUrl} target="_blank" rel="noreferrer" aria-label={c.hudOpenIssue} title={c.hudOpenIssue}>
                #
              </a>
            ) : (
              <button type="button" data-tool="issue" disabled aria-label={c.hudOpenIssue} title={c.hudOpenIssue}>
                #
              </button>
            )}
            <button type="button" data-tool="lang" onClick={toggleLang} aria-label={c.hudLanguage} title={c.hudLanguage}>
              ⟲
            </button>
            {/* Below 1101 the Queen is a drawer, and the tile that opened her
                left the bar with the alert count. Her opener belongs with the
                map's own controls, where every other panel is reached. */}
            {isNarrow && (
              <button
                type="button"
                data-tool="queen"
                onClick={onBell}
                aria-pressed={intelOpen}
                aria-label={c.hudIntel}
                title={c.hudIntel}
              >
                <i aria-hidden="true">◉</i>
                <span className="queen27-hud-vp-word">{c.hudIntel}</span>
              </button>
            )}
            <button
              type="button"
              data-tool="full"
              onClick={toggleFullscreen}
              aria-pressed={bare}
              title={bare ? c.hudExitFullscreen : c.hudFullscreen}
            >
              {bare ? c.hudExitFullscreen : c.hudFullscreen}
            </button>
          </div>
        </header>
        {bare && (
          <button
            type="button"
            className="queen27-hud-more"
            onClick={() => setToolsOpen((open) => !open)}
            aria-expanded={toolsOpen}
            aria-label={toolsOpen ? c.hudToolsClose : c.hudTools}
            title={toolsOpen ? c.hudToolsClose : c.hudTools}
          >
            <span aria-hidden="true">{toolsOpen ? "\u00d7" : "\u22ef"}</span>
          </button>
        )}

        {/* Why free bees are idle used to be a line floating here, over the top
            of the map. It is a notification about the round, and the round's tile
            is in the header -- where the same words were already printed, short,
            beside the count they are about. Two places said it; the floating one
            was the one that covered the ladder, the Explorer's search field and,
            on a phone, the controls under it, and it was removed rather than
            moved a third time. The full sentence and the example issue went to
            the tile, so nothing it carried was lost. */}
        <div className="queen27-hud-vp-body">
          {/* Embedded, the scene is skipped — a page of previews would be a page
              of WebGL contexts — except on the comb, where the scene IS the
              view. One preview on the homepage boots one context, which is what
              the hive block booted before there were six blocks. */}
          {(!embedded || boardView === "comb") && hiveScene}
          {/* KANBAN, MISSION MAP and FACTORY are one module now, so each of the
              three is drawn under the board's own row (boardNav) rather than
              from a rail button of its own. The body is a one-cell grid — every
              view is stacked in it, over the scene — so the row and the view it
              switches share one cell as a column. */}
          {boardView === "kanban" ? (
            <div className="queen27-board-stack">
              {boardNav}
              <KanbanView
                columns={boardColumns}
                cards={cards}
                tasks={tasksState.feed}
                repo={repo}
                error={tasksState.error ?? boardState.error}
                loaded={tasksState.feed !== null}
                c={c}
                lang={lang}
                clients={clientsPanel}
                ball={ballPanel}
                onNarrow={setClientsNarrow}
                search={clientsSearch}
                onSearch={setClientsSearch}
                status={data ?? null}
              />
            </div>
          ) : boardView === "map" ? (
            <div className="queen27-board-stack">
              {boardNav}
              <MissionMapView
                columns={boardColumns}
                cards={cards}
                repo={repo}
                error={boardState.error}
                loaded={board !== null}
                c={c}
                lang={lang}
              />
            </div>
          ) : boardView === "specs" ? (
            <QueenSpecs
              showDirective={isNarrow}
              onNavigate={setView}
              world={sharedCatalog ? worldParam(hashParams.get("world")) : null}
              ladder={ladderNav}
              c={{
                directive: c.specsDirective,
                directiveBody: c.specsDirectiveBody,
                open: c.specsOpen,
                loading: c.specsLoading,
                clean: c.specsClean,
                warnings: c.specsWarnings,
                broken: c.specsBroken,
              }}
            />
          ) : boardView === "skills" || boardView === "crons" || boardView === "agents" || boardView === "functions" || boardView === "tools" || boardView === "providers" || boardView === "project" ? (
            <QueenAgents
              kind={boardView}
              showDirective={isNarrow}
              onNavigate={setView}
              // PROJECT is the system documentation, not a layer of the ladder:
              // it keeps its own rail button and gets no rung row.
              ladder={isSpecLayer(boardView) ? ladderNav : boardView === "project" ? projectNav : undefined}
              c={{
                directive: boardView === "skills" ? c.skillsDirective : boardView === "crons" ? c.cronsDirective : boardView === "functions" ? c.functionsDirective : boardView === "tools" ? c.toolsDirective : boardView === "providers" ? c.providersDirective : boardView === "project" ? c.projectDirective : c.agentsDirective,
                directiveBody: boardView === "skills" ? c.skillsDirectiveBody : boardView === "crons" ? c.cronsDirectiveBody : boardView === "functions" ? c.functionsDirectiveBody : boardView === "tools" ? c.toolsDirectiveBody : boardView === "providers" ? c.providersDirectiveBody : boardView === "project" ? c.projectDirectiveBody : c.agentsDirectiveBody,
                open: c.specsOpen,
                loading: c.agentsLoading,
                specs: c.agentsSpecs,
                specPlusCode: c.agentsSpecCode,
                codeOnly: c.agentsCodeOnly,
                typecheck: c.agentsTypecheck,
                specPlusExperience: c.agentsSpecExperience,
                unattributed: c.agentsUnattributed,
                toolsOwned: c.toolsOwned,
                toolsUnowned: c.toolsUnowned,
                projectChapters: c.projectChapters,
                projectRu: c.projectRu,
                projectSources: c.projectSources,
                providersRead: c.providersRead,
                providersDesign: c.providersDesign,
              }}
            />
          ) : boardView === "tri" ? (
            <QueenTri
              lang={lang}
              embedded={embedded}
              c={{
                screens: c.triScreens,
                feed: c.triFeed,
                agent: c.triAgent,
                ai: c.triAi,
                profile: c.triProfile,
                crm: c.triCrm,
                loading: c.triLoading,
                noAnswer: c.triNoAnswer,
                appError: c.triAppError,
                openApp: c.triOpenApp,
                frameTitle: c.triFrameTitle,
                insidePlayer: c.triInsidePlayer,
                preview: c.triPreview,
              }}
            />
          ) : boardView === "wars" ? (
            <QueenWars lang={lang === "ru" ? "ru" : "en"} />
          ) : boardView === "widgets" ? (
            <QueenWidgets lang={lang === "ru" ? "ru" : "en"} />
          ) : boardView === "token" ? (
            <QueenToken lang={lang === "ru" ? "ru" : "en"} />
          ) : boardView === "roadmap" ? (
            <QueenRoadmap lang={lang === "ru" ? "ru" : "en"} />
          ) : boardView === "leaderboard" ? (
            <QueenLeaderboard lang={lang === "ru" ? "ru" : "en"} />
          ) : boardView === "passport" ? (
            // The record itself, not a frame of it: the page and this view read
            // one content module, so the working group and the map cannot drift.
            <div className="queen27-board-stack">
              {projectNav}
              <Passport face={hashParams.get("face") === "research" ? "research" : "record"} />
            </div>
          ) : boardView === "browser" ? (
            <QueenBrowser
              embedded={embedded}
              lang={lang === 'ru' ? 'ru' : 'en'}
              // The spec the address names (kept across tab switches, lib/queenEmbed
              // leaveTabSelections); the signed-out guide links to it on SPECS
              // through the same setView every tab switch uses.
              spec={hashParams.get("spec")}
              onReadSpec={(named) => setView("specs", named)}
              c={{
                preview: c.browserPreview,
                signin: c.browserSignin,
                openInApp: c.browserOpenInApp,
                fullscreen: c.browserFullscreen,
                exitFullscreen: c.browserExitFullscreen,
                none: c.browserNone,
                open: c.browserOpen,
                starting: c.browserStarting,
                unavailable: c.browserUnavailable,
                close: c.browserClose,
                failed: c.browserFailed,
                retry: c.browserRetry,
                frameTitle: c.browserFrameTitle,
                passwords: c.browserPasswords,
                journal: c.browserJournal,
                driving: c.browserDriving,
                handBack: c.browserHandBack,
                guideTitle: c.browserGuideTitle,
                guideLive: c.browserGuideLive,
                guideJournal: c.browserGuideJournal,
                guidePasswords: c.browserGuidePasswords,
                guideSpec: c.browserGuideSpec,
                guideReadSpec: c.browserGuideReadSpec,
                watch: {
                  invite: c.browserWatchInvite,
                  note: c.browserWatchNote,
                  forHours: c.browserWatchFor,
                  hour: c.browserWatchHour,
                  label: c.browserWatchLabel,
                  create: c.browserWatchCreate,
                  once: c.browserWatchOnce,
                  copy: c.browserWatchCopy,
                  copied: c.browserWatchCopied,
                  revoke: c.browserWatchRevoke,
                  watching: c.browserWatchWatching,
                  views: c.browserWatchViews,
                  none: c.browserWatchNone,
                  full: c.browserWatchFull,
                  failed: c.browserWatchFailed,
                  hide: c.browserWatchHide,
                },
                lanes: {
                  add: c.browserLanesAdd,
                  addTitle: c.browserLanesAddTitle,
                  region: c.browserLanesRegion,
                  placeholder: c.browserLanesPlaceholder,
                  send: c.browserLanesSend,
                  working: c.browserLanesWorking,
                  limit: c.browserLanesLimit,
                  old: c.browserLanesOld,
                  signedout: c.browserLanesSignedOut,
                  failed: c.browserLanesFailed,
                  close: c.browserLanesClose,
                  closeTitle: c.browserLanesCloseTitle,
                },
              }}
            />
          ) : boardView === "comb" ? (
            null
          ) : boardView === "research" ? (
            <div className="queen27-board-stack">
              {boardNav}
              <TechnologyTree
                c={c}
                graph={researchState.tree}
                error={researchState.sourceError}
                lang={lang}
                embedded
              />
            </div>
          ) : (
            <div className="queen27-board-stack">
              {boardNav}
              <QueenFactory
                workers={researchState.data?.workers ?? null}
                researchNodes={researchState.data?.nodes ?? []}
                researchEdges={researchState.data?.edges ?? []}
                researchLayers={researchState.data?.layers ?? []}
                researchError={researchState.error}
                hardware={hardwareState.data}
                hardwareError={hardwareState.error}
                error={boardState.error ?? researchState.error}
                labels={{
                  aria: c.factoryView,
                  flow: c.factoryFlow,
                  throughput: c.factoryThroughput,
                  queueDensity: c.factoryQueueDensity,
                  workerBays: c.factoryWorkerBays,
                  active: c.executing,
                  idle: c.factoryIdle,
                  station: c.factoryStation,
                  modules: c.factoryModules,
                  empty: c.empty,
                  offline: c.factoryOffline,
                  criteria: c.criteria,
                  missing: c.missing,
                  openIssue: c.factoryOpenIssue,
                  selectedModule: c.factorySelectedModule,
                  liveContract: c.factoryLiveContract,
                  cityTitle: c.cityTitle,
                  cityCopy: c.cityCopy,
                  cityDistricts: c.cityDistricts,
                  cityLaboratories: c.cityLaboratories,
                  citySelected: c.citySelected,
                  cityEvidence: c.cityEvidence,
                  cityOffline: c.cityOffline,
                  cityBuildTitle: c.cityBuildTitle,
                  cityComplete: c.cityComplete,
                  cityAssembling: c.cityAssembling,
                  cityBlueprint: c.cityBlueprint,
                  citySealed: c.citySealed,
                  cityDependencies: c.cityDependencies,
                  foundryTitle: c.foundryTitle,
                  foundryVerified: c.foundryVerified,
                  foundryUnavailable: c.foundryUnavailable,
                  foundryTotal: c.foundryTotal,
                  foundryOnline: c.foundryOnline,
                  foundryProgrammed: c.foundryProgrammed,
                  foundryKey: c.foundryKey,
                }}
              />
            </div>
          )}
        </div>

        {/* The legacy CONTEXT panel belongs to the comb it describes, and only
            the old comb: the shared catalog has its own inspector. Drawn on
            every other view, its collapsed chip floated over FEED, AI, PROFILE
            and ROADMAP with nothing to show (owner, 2026-09-22: "remove the
            phantom button of the old design"). Closing it now removes it
            outright - there is no chip left behind, and FIT VIEW brings the
            card back. */}
        {boardView === "comb" && !sharedCatalog && <QueenContext
          open={contextOpen}
          onClose={() => setContextOpen(false)}
          lang={lang}
          repo={repo}
          columns={boardColumns}
          queue={board ? queue : null}
          now={now}
          roundSeconds={roundSeconds > 0 ? roundSeconds : null}
          reviewQueue={reviewQueue}
          latestDispatch={latest ?? null}
          pick={livePick}
          queenStats={{
            backendLive: isLive,
            accepted: board ? doneCount : null,
            verdicts: pulse?.verdicts ?? null,
            running: data?.dispatches.running ?? null,
            capacity: workers?.capacity ?? null,
            // pulse.rounds counts the rows of a one-row lease table (0 or 1); a
            // dash until the server counts real rounds (backlog P3-2).
            rounds: null,
            beesStarted: pulse?.bees ?? null,
          }}
          describe={describe}
          labels={{
            title: c.hudContext,
            queue: c.hudQueue,
            queueEmpty: c.hudQueueEmpty,
            reviewQueue: c.hudReviewQueue,
            unitS: c.unitS,
            unitMin: c.unitMin,
            unitH: c.unitH,
            closed: c.hudClosed,
            labelsWord: c.hudLabels,
            epic: c.hudEpic,
            foundationLayer: c.hudLayerFoundation,
            last: c.hudLast,
            selected: c.hudSelected,
            theQueen: c.hudTheQueen,
            queenRole: c.hudQueenRole,
            backend: c.hudBackend,
            live: c.hudLive,
            offline: c.hudOffline,
            accepted: doneColumnTitle,
            verdicts: c.verdicts,
            bees: c.hudBees,
            rounds: c.rounds,
            beesStarted: c.beesStarted,
            sector: c.sector,
            territory: c.hudTerritory,
            held: c.combHeld,
            neutral: c.combNeutral,
            fog: c.combFog,
            criteria: c.criteria,
            needs: c.hudNeeds,
            noBee: c.hudNoBee,
            slot: c.hudSlot,
            busy: c.hudBusy,
            idle: c.factoryIdle,
            cell: c.hudCell,
            dispatched: c.hudDispatched,
            openIssue: c.hudOpenIssue,
            copyLink: c.hudCopyLink,
            linkCopied: c.hudLinkCopied,
            close: c.hudClose,
          }}
        />}


      {/* Inside the map, not beside it: the header, the rails and the
          footer are children of the container that holds the 3D scene, so
          they overlay the same element rather than sitting in a grid around
          a box that happens to contain it. */}
      <header className="queen27-hud-top">
        <Link to="/" className="queen27-hud-res queen27-hud-brand" aria-label={c.hudBrand}>
          <TrinityLogo withLabel={false} height="34px" />
        </Link>

        <div
          className="queen27-hud-res queen27-hud-res-bees"
          title={data?.workers ? c.hudBeesCeiling.replace("{cap}", String(data.workers.capacity)) : undefined}
        >
          <i aria-hidden="true">◆</i>
          <small>{c.hudBees}</small>
          {/* One response for the whole tile: /queen/status's started, unfinished
              bees, the reading idleReason takes free slots from. The research
              poll's reading only when the status carries none. The count is the
              number alone (#1711): the owner reads the tile as "how many bees
              work", so the ceiling moved out of the number and into the title,
              where hover and a screen reader still find it. */}
          <strong id="stat-bees">
            {data?.workers ? data.workers.active : data ? data.dispatches.running : "—"}
          </strong>
          {/* The whole reason lives here now: the head short enough for the tile,
              the sentence on hover and for a screen reader, and -- when the
              reason is a brief no bee can take -- the example issue one click
              away, which is what the line that floated over the map carried.
              The link goes INSIDE the span rather than replacing it: the header's
              narrow-screen rules fold a tile's sub-line away by `> span`, and an
              anchor in its place would have been the one sub-line that stayed
              when the tiles are down to a name and a number. */}
          <span
            className="queen27-hud-idle-why"
            data-idle={idleNow?.kind}
            title={idleWhy?.example ? `${idleWhy.text} · ${c.idleExample}` : idleWhy?.text}
          >
            {idleWhy?.example ? (
              <a href={BOUNDARY_EXAMPLE_ISSUE} target="_blank" rel="noreferrer">
                {idleWhy.head}
              </a>
            ) : idleWhy ? (
              idleWhy.head
            ) : (
              `${data?.workers ? data.workers.capacity - data.workers.active : (workers?.idle ?? "—")} ${c.factoryIdle}`
            )}
          </span>
        </div>

        <div className="queen27-hud-res">
          <i aria-hidden="true">✓</i>
          <small>{doneColumnTitle}</small>
          <strong id="stat-accepted">{board ? doneCount : "—"}</strong>
          <span>
            +{pulse?.bees ?? "—"} {c.beesStarted}
          </span>
        </div>

        <div className="queen27-hud-res">
          <i aria-hidden="true">▲</i>
          <small>{c.hudVerdicts}</small>
          <strong id="stat-verdicts">{pulse?.verdicts ?? "—"}</strong>
          <span>
            {c.hud24h} · {board ? `${reviewCards.length} ${reviewColumnTitle}` : "—"}
            {typeof data?.dispatches.unreviewed === "number" ? ` · ${data.dispatches.unreviewed} ${c.hudNoVerdict}` : ""}
          </span>
        </div>

        <div className="queen27-hud-res">
          <i aria-hidden="true">◈</i>
          <small>{c.hudResearch}</small>
          <strong id="stat-research">
            {tree ? `${tree.summary.percentage}%` : "—"}
          </strong>
          <span>
            {tree
              ? `${tree.summary.researched}/${tree.summary.total}`
              : researchState.sourceError
                ? c.graphOffline
                : c.graphLoading}
          </span>
        </div>

        <div className="queen27-hud-res">
          <i aria-hidden="true">▰</i>
          <small>{c.hudFoundry}</small>
          <strong id="stat-foundry">
            {hardware
              ? `${hardware.summary.online}/${hardware.summary.total}`
              : "—"}
          </strong>
          <span title={hardware ? hardware.keyId : hardwareState.error ?? undefined}>
            {hardware
              ? `${hardware.summary.programmed} ${c.foundryProgrammed}`
              : hardwareState.error
                ? c.foundryUnavailable
                : c.checking}
          </span>
        </div>

        <section
          ref={roundRef}
          className={`queen27-hud-res queen27-hud-res-round${roundResolved ? " is-resolved" : ""}`}
        >
          {/* One round control, and it is this one: the command rail carried a
              second button with the same countdown. The details it opened come
              with it rather than being lost. */}
          <button
            type="button"
            className="queen27-hud-res-round-btn"
            aria-expanded={roundOpen}
            aria-controls="queen-round-pop"
            onClick={() => setRoundOpen((open) => !open)}
          >
            <i aria-hidden="true">◎</i>
            <small>{roundLabel}</small>
            <strong id="stat-round" data-clock={state.offsetMs === null ? "client" : "server"}>{countdown}</strong>
            <span>
              {strip ? (
                <b className="queen27-hud-round-strip">{strip}</b>
              ) : roundWindow ? (
                roundWindow
              ) : (
                "—"
              )}
            </span>
          </button>
          {roundPopover}
        </section>

        {/* The active sector is named on the map's own head, and the map is where
            repositories and their tasks are. A third copy in the status bar
            left the row eleven children against ten grid tracks, and every
            count was crushed to 27px. */}
        {/* The alert count went to the Queen: she carries every event the bell
            counted, in a log you can ask about, and a tile that only said how
            many there were said it twice. The overview's numbers stayed. */}
        {overviewNumbers}

        <div className="queen27-hud-res queen27-hud-status" ref={menuRef}>
          <span
            className={`queen27-hud-pill ${statusTone}`}
            id="stat-status"
            title={state.kind === "error" ? state.error : c.provenance}
          >
            <i aria-hidden="true" />
            {statusText}
          </span>
          <button
            type="button"
            className="queen27-hud-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="queen-hud-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {c.hudMenu} ▾
          </button>
          {menuOpen && (
            <ul className="queen27-hud-menu" id="queen-hud-menu">
              <li>
                <button type="button" onClick={toggleLang}>
                  <span>{c.hudLanguage}</span>
                  <b>{lang.toUpperCase()}</b>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  data-setting="key-shortcuts"
                  aria-pressed={keyShortcuts}
                  onClick={toggleKeyShortcuts}
                >
                  <span>{c.hudShortcuts}</span>
                  <b>{keyShortcuts ? c.hudOn : c.hudOff}</b>
                </button>
              </li>
              <li>
                {repo ? (
                  <a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer">
                    <span>{c.hudOpenRepo}</span>
                    <b>{repo}</b>
                  </a>
                ) : (
                  <button type="button" disabled>
                    <span>{c.hudOpenRepo}</span>
                    <b>—</b>
                  </button>
                )}
              </li>
              <li>
                <button
                  type="button"
                  aria-expanded={doctrineOpen}
                  onClick={() => setDoctrineOpen((open) => !open)}
                >
                  <span>{c.path}</span>
                  <b>{doctrineOpen ? "▴" : "▾"}</b>
                </button>
                {doctrineOpen && (
                  <ol className="queen27-hud-doctrine">
                    {doctrine.map((step) => (
                      <li key={step.n} className={step.tone}>
                        <b>{step.n}</b>
                        <strong>{step.title}</strong>
                        <p>{step.copy}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
              <li className="queen27-hud-menu-note">
                <span>{c.latest}</span>
                <b>
                  {latest
                    ? latest.finishedAt
                      ? `#${latest.issue} · ${(latest.outcome ?? "—").toUpperCase()} · ${formatMoment(latest.finishedAt, lang)}`
                      : `#${latest.issue} · ${c.hudDispatched} ${formatMoment(latest.dispatchedAt, lang)}`
                    : "—"}
                </b>
              </li>
              <li className="queen27-hud-menu-note">
                <span>{c.reviewQueue}</span>
                <div className="queen27-review-summary">
                  {REVIEW_STATES.map((reviewState) => {
                    // Null is not zero: the ledger has cards in review and does
                    // not say which queue they are in. The dash says that, and
                    // says it as a state rather than as a missing number.
                    const stated = reviewQueueCounts[reviewState];
                    return (
                      <span
                        className={`is-${reviewState}${stated === null ? " is-unstated" : ""}`}
                        key={reviewState}
                      >
                        <b>{stated ?? "—"}</b>
                        {c[reviewState]}
                      </span>
                    );
                  })}
                  {reviewUnclassifiedCount !== null && reviewUnclassifiedCount > 0 && (
                    <span className="is-unclassified">
                      <b>{reviewUnclassifiedCount}</b>
                      {c.hudReviewUnclassified}
                    </span>
                  )}
                </div>
              </li>
              <li className="queen27-hud-menu-note">
                <span>{c.source}</span>
                <b title={state.kind === "error" ? state.error : undefined}>
                  {state.kind === "error" ? c.hudOffline : c.refresh}
                </b>
              </li>
              {/* The sky is someone's work under CC BY-SA 4.0, and the credit is
                  a condition of using it, not decoration. It read as a glass
                  badge floating over the map; it reads here instead, where this
                  HUD already keeps where its facts come from. */}
              <li className="queen27-hud-menu-note">
                <span>{c.hudSky}</span>
                <b>
                  <a
                    href="https://github.com/astronexus/HYG-Database/blob/main/hyg/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    HYG 4.1 · J2000 · David Nash / Astronexus · CC BY-SA 4.0
                  </a>
                </b>
              </li>
            </ul>
          )}
        </div>
      </header>

      {!isPhone && (
        <QueenCommandPanel
          items={commandItems}
          // A ladder layer lights SPECS: it is not on the rail any more, it is
          // inside the module the rail's second button opens.
          view={railViewOf(view)}
          onSelect={setView}
          onSelectScreen={selectTriScreen}
          collapsed={commandCollapsed}
          onToggleCollapsed={() => setCommandCollapsed((collapsed) => !collapsed)}
          labels={{ aria: c.hudViews, collapse: c.hudCollapse, expand: c.hudExpand }}
        />
      )}

      {isNarrow ? (
        intelOpen && (
          <aside
            className={`queen27-hud-intel is-drawer${intelExpanded ? " is-expanded" : ""}`}
            aria-label={c.hudIntel}
          >
            <button
              type="button"
              className="queen27-hud-drawer-close"
              onClick={() => setIntelOpen(false)}
              aria-label={c.hudClose}
            >
              ×
            </button>
            {queenChat}
          </aside>
        )
      ) : (
        <aside
          className={`queen27-hud-intel${intelExpanded ? " is-expanded" : ""}`}
          aria-label={
            boardView === "specs"
              ? c.specsDirective
              : boardView === "skills"
                ? c.skillsDirective
                : boardView === "crons"
                  ? c.cronsDirective
                  : boardView === "agents"
                    ? c.agentsDirective
                    : boardView === "functions"
                      ? c.functionsDirective
                    : boardView === "tools"
                      ? c.toolsDirective
                    : boardView === "providers"
                      ? c.providersDirective
                      : boardView === "project"
                        ? c.projectDirective
                        : c.hudIntel
          }
        >
          {/* The overview sits above her, stowed: a row that opens when the board
              is the question and stays out of the way when the Queen is. */}
          {/* The standing directive counted what the Explorer's own filter strip
              counts on the same screen — clean, flagged, rejected, under its
              search — and it took the head of the Queen's column to do it. She
              is the reason the column exists. It still reads inside the specs
              view itself on a narrow screen, where the Explorer's strip is the
              first thing to go. */}
          {queenChat}
        </aside>
      )}

      <footer className="queen27-hud-bottom">
        {isPhone ? (
          <>
            <QueenCommandPanel
              items={commandItems}
              // Same rule as the desktop rail: a ladder layer lights SPECS,
              // which is the button that now holds it.
              view={railViewOf(view)}
              onSelect={setView}
              onSelectScreen={selectTriScreen}
              collapsed={false}
              onToggleCollapsed={() => undefined}
              compact
              labels={{ aria: c.hudViews, collapse: c.hudCollapse, expand: c.hudExpand }}
            />
          </>
        ) : (
          <>


          </>
        )}
      </footer>
      </section>
    </main>
  );
}
