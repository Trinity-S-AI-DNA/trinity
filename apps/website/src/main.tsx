import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import FormatSelection from './pages/FormatSelection'
import './index.css'
import './styles/card.css'
import './styles/viewport.generated.css'
import './styles/explorer-viewport.css'
import App from './App.tsx'
import { I18nProvider } from './i18n/context.tsx'
import GlobalStarfield from './components/GlobalStarfield.tsx'
import { handExplorerLinksToQueen } from './lib/queenFrame'
import { redirectLegacyQueen } from './lib/legacyQueenRedirect'
import { triIdentity } from './lib/triIdentity'
import { installBotLinkCarry, reportArrival } from './lib/trafficArrival'
import { COURSE_ROUTES } from './lib/courseRoutes.generated'

// THE QUEEN MOVED to https://app.t27.ai/queen/, which now builds this same
// bundle and serves the board on the app's own origin. #/queen here is the old
// address and hands its visitors over.
//
// Decided first, before anything below costs a request. location.replace() does
// not halt this module — the document keeps executing until the navigation
// commits — so `leaving` is carried down to the identity bridge, which would
// otherwise fetch a cross-origin document for a page that is on its way out.
//
// Why this cannot simply key on the route: app.t27.ai/queen/ runs this code
// too. See src/lib/legacyQueenRedirect.ts and qa/queen-redirect-contract.mjs,
// which calls the decision with both origins as input.
const leaving = redirectLegacyQueen()

// A visitor from a tagged link (utm_source=x, reddit, threads...) is counted
// once, by channel, where the agents' links land. Not for a page that is on
// its way to another address. See src/lib/trafficArrival.ts.
if (!leaving) {
  void reportArrival()
  installBotLinkCarry()
}

// In a Queen tab's frame, a link to another Explorer switches the Queen's tab instead
// of navigating the frame under a rail that names a different one.
handExplorerLinksToQueen()

// The Queen's identity chip waits on the app.t27.ai bridge, a document from
// another host that then waits behind the hive's long tasks. Measured on a
// local build with the bridge's live latency: requested only when the shell
// rendered (~0.7 s), loaded, then ~1.1 s more behind long tasks; chip at
// 3.3-6.0 s. Asked here, at the entry, the bridge loads beside the Queen's own
// chunks. Only on the address that renders the Queen shell, never for an
// embedded preview (embed=1, which asks nobody), in the language the page
// will pick (src/i18n/context.tsx: ?lang=, then the saved choice).
{
  const hash = window.location.hash
  const params = new URLSearchParams(hash.split('?')[1] ?? '')
  const view = params.get('view')
  if (!leaving && /^#\/queen(?:\?|$)/.test(hash) && params.get('embed') !== '1' && !params.has('repo') && view !== 'atlas' && view !== 'core') {
    const asked = new URLSearchParams(window.location.search).get('lang')
    let lang = asked && ['en', 'ru'].includes(asked) ? asked : null
    if (!lang) {
      try {
        lang = window.localStorage.getItem('trinity-lang')
      } catch {
        lang = null
      }
    }
    triIdentity().setLanguage(lang ?? 'en')
    triIdentity().prime()
  }
}

// Only "/" is eager — it is the route every visitor lands on. The others were
// static imports, which put all of them in the entry chunk (843 kB) and made the
// landing page wait on code nobody had asked for yet.
const QuantumLab = lazy(() => import('./pages/QuantumLab.tsx'))
const Playground = lazy(() => import('./pages/Playground.tsx'))
const CosmicChat = lazy(() => import('./pages/CosmicChat.tsx'))
const TrinityCanvas = lazy(() => import('./pages/TrinityCanvas.tsx'))
const TrinityCanvasWasm = lazy(() => import('./components/TrinityCanvasWasm.tsx'))
const ProductionDashboard = lazy(() => import('./components/ProductionDashboard.tsx'))
const TechTreePage = lazy(() => import('./pages/TechTreePage.tsx'))
const HardwareVerification = lazy(() => import('./pages/HardwareVerification.tsx'))
const Start = lazy(() => import('./pages/Start.tsx'))
const Course = lazy(() => import('./pages/Course.tsx'))
const FpgaTraining = lazy(() => import('./pages/FpgaTraining.tsx'))
const CaseStudies = lazy(() => import('./pages/CaseStudies.tsx'))
const GFT = lazy(() => import('./pages/GFT.tsx'))
const Licensing = lazy(() => import('./pages/Licensing.tsx'))
const Proof = lazy(() => import('./pages/Proof.tsx'))
const Trinity = lazy(() => import('./pages/Trinity.tsx'))
const AboutAuthor = lazy(() => import('./pages/AboutAuthor.tsx'))
const Resources = lazy(() => import('./pages/Resources.tsx'))
const Foundry = lazy(() => import('./pages/Foundry.tsx'))
const DevKit = lazy(() => import('./pages/DevKit.tsx'))
const Queen = lazy(() => import('./pages/QueenUniverse.tsx'))
// The PASSPORT: the record proposed to the OCP neuromorphic working group, and
// the three measured cases behind it. One component, two faces.
const Passport = lazy(() => import('./pages/Passport.tsx'))
// Blog exports two components rather than a default, so the module has to be
// unwrapped into the shape lazy() expects.
const BlogIndex = lazy(() => import('./pages/Blog.tsx').then(m => ({ default: m.BlogIndex })))
const BlogPost = lazy(() => import('./pages/Blog.tsx').then(m => ({ default: m.BlogPost })))
// Lazy matters more than usual here: this page pulls a 477 KB compiler wasm.
const SpecExplorer = lazy(() => import('./pages/SpecExplorer.tsx'))
// The Explorer family: the same shell over six other corpora — the skills
// that stand on those specs, the jobs that run on a schedule, the agents that
// hold the skills, the tools those agents should know, the owner's own
// client memory, and the providers who sell compute (Gonka's models, and the
// GPU or FPGA a person could rent out for TRI).
const SkillExplorer = lazy(() => import('./pages/SkillExplorer.tsx'))
const CronExplorer = lazy(() => import('./pages/CronExplorer.tsx'))
const AgentExplorer = lazy(() => import('./pages/AgentExplorer.tsx'))
const FunctionExplorer = lazy(() => import('./pages/FunctionExplorer.tsx'))
const ToolExplorer = lazy(() => import('./pages/ToolExplorer.tsx'))
const ProviderExplorer = lazy(() => import('./pages/ProviderExplorer.tsx'))
// The system documentation: one declared document (specs/docs/system.t27), seven
// chapters, rendered from public/docs/system-docs.json. The Queen's PROJECT view
// frames it with ?embed=1.
const SystemDocs = lazy(() => import('./pages/SystemDocs.tsx'))
const ClientsConsole = lazy(() => import('./pages/ClientsConsole.tsx'))

const RouteFallback = () => (
  // spinSlow, not spin — index.css only defines the former.
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spinSlow 1s linear infinite' }} />
  </div>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <HashRouter>
        {/* Звёзды монтируются один раз над Routes: слой fixed, ключа маршрута у
            него нет, поэтому при переходе между страницами поле не пересоздаётся
            и не мигает. */}
        <GlobalStarfield />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/dashboard" element={<ProductionDashboard />} />
            <Route path="/tree" element={<TechTreePage />} />
            <Route path="/start" element={<Start />} />
            <Route path="/select" element={<FormatSelection />} />
            <Route path="/verification" element={<HardwareVerification />} />
            {/* Each course is a t27 spec (specs/course/courses.t27 names them);
                the paid training that used to live here moved to /fpga-training. */}
            {/* Every course of specs/course/courses.t27: a hand list held 4 of 7 and "Next course" opened nothing. */}
            {COURSE_ROUTES.flatMap((route) => [
              <Route key={route} path={`/${route}`} element={<Course />} />,
              <Route key={`${route}/lesson`} path={`/${route}/:lessonId`} element={<Course />} />,
            ])}
            <Route path="/fpga-training" element={<FpgaTraining />} />
            <Route path="/cases" element={<CaseStudies />} />
            <Route path="/gft" element={<GFT />} />
            <Route path="/ip" element={<Licensing />} />
            <Route path="/proof" element={<Proof />} />
            {/* The number and the claim under it. They were the homepage's first
                screen; the homepage is the game now, and this is where the
                arithmetic lives. */}
            <Route path="/trinity" element={<Trinity />} />
            <Route path="/about" element={<AboutAuthor />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/resources" element={<Resources />} />
            {/* Клуб. /club — короткий синоним для ссылок в рилсах и профиле. */}
            <Route path="/foundry" element={<Foundry />} />
            <Route path="/club" element={<Navigate to="/foundry" replace />} />
            <Route path="/devkit" element={<DevKit />} />
            <Route path="/queen" element={<Queen />} />
            <Route path="/passport" element={<Passport face="record" />} />
            <Route path="/passport/research" element={<Passport face="research" />} />
            <Route path="/canvas" element={<TrinityCanvas />} />
            <Route path="/quantum" element={<QuantumLab />} />
            <Route path="/lab" element={<QuantumLab />} />
            <Route path="/play" element={<Playground />} />
            <Route path="/chat" element={<CosmicChat />} />
            <Route path="/wasm" element={<TrinityCanvasWasm />} />
            <Route path="/specs" element={<SpecExplorer />} />
            <Route path="/skills" element={<SkillExplorer />} />
            <Route path="/crons" element={<CronExplorer />} />
            <Route path="/agents" element={<AgentExplorer />} />
            <Route path="/functions" element={<FunctionExplorer />} />
            <Route path="/tools" element={<ToolExplorer />} />
            <Route path="/providers" element={<ProviderExplorer />} />
            <Route path="/docs" element={<SystemDocs />} />
            <Route path="/docs/:chapter" element={<SystemDocs />} />
            {/* Not in the navigation: the console shows one person's
                correspondence and opens only for the owner. */}
            <Route path="/clients" element={<ClientsConsole />} />
            <Route path="/viz/*" element={<Navigate to="/quantum" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </I18nProvider>
  </StrictMode>,
)
