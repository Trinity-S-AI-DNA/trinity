// gnn.js -- a tiny message-passing GNN in vanilla JS, plus every figure on
// /t27f/gnn/. Zero dependencies, zero network fetches, ASCII source.
//
// The engine (LinB, aggFwd/aggBwd, GNN, trainEpochs, pca2) runs in Node as
// well as the browser: selfTest() at the bottom checks gradients numerically,
// trains karate to a sane accuracy, and measures permutation invariance.
// The figure initializers are guarded by `typeof document` and no-op in Node.
//
// Standing on distill.pub/2021/gnn-intro (Sanchez-Lengeling, Reif, Pearce,
// Wiltschko, 2021, DOI 10.23915/distill.00033, CC-BY). We improve; we do
// not erase. See the page footer.

import {
  KARATE_NODES, KARATE_EDGES, KARATE_LABELS, KARATE_FACTIONS, KARATE_CONSISTENT,
} from './karate.js';

// ---------------------------------------------------------------------------
// 1. deterministic RNG
// ---------------------------------------------------------------------------

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng, std) {
  const u = Math.max(rng(), 1e-12), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

// ---------------------------------------------------------------------------
// 2. linear layer (batched: n row-vectors of length nin), tanh stack, Adam
// ---------------------------------------------------------------------------

class LinB {
  constructor(nin, nout, rng) {
    this.nin = nin; this.nout = nout;
    const std = Math.sqrt(2 / (nin + nout)); // Xavier: tanh-friendly
    this.W = new Float64Array(nin * nout);
    for (let i = 0; i < this.W.length; i++) this.W[i] = gauss(rng, std);
    this.b = new Float64Array(nout);
    this.dW = new Float64Array(nin * nout);
    this.db = new Float64Array(nout);
    this.mW = new Float64Array(nin * nout); this.vW = new Float64Array(nin * nout);
    this.mb = new Float64Array(nout); this.vb = new Float64Array(nout);
    this.X = null; this.n = 0;
  }
  fwd(X, n) {
    this.X = X; this.n = n;
    const Y = new Float64Array(n * this.nout);
    for (let i = 0; i < n; i++) {
      const xo = i * this.nin, yo = i * this.nout;
      for (let j = 0; j < this.nout; j++) {
        let s = this.b[j];
        for (let k = 0; k < this.nin; k++) s += X[xo + k] * this.W[k * this.nout + j];
        Y[yo + j] = s;
      }
    }
    return Y;
  }
  bwd(dY) {
    const dX = new Float64Array(this.n * this.nin);
    for (let i = 0; i < this.n; i++) {
      const xo = i * this.nin, yo = i * this.nout;
      for (let j = 0; j < this.nout; j++) {
        const g = dY[yo + j];
        if (g === 0) continue;
        this.db[j] += g;
        for (let k = 0; k < this.nin; k++) {
          this.dW[k * this.nout + j] += this.X[xo + k] * g;
          dX[xo + k] += g * this.W[k * this.nout + j];
        }
      }
    }
    return dX;
  }
  adam(lr, t, wd) {
    const b1 = 0.9, b2 = 0.999, eps = 1e-8;
    const c1 = 1 - Math.pow(b1, t), c2 = 1 - Math.pow(b2, t);
    for (let i = 0; i < this.W.length; i++) {
      const g = this.dW[i] + wd * this.W[i];
      this.mW[i] = b1 * this.mW[i] + (1 - b1) * g;
      this.vW[i] = b2 * this.vW[i] + (1 - b2) * g * g;
      this.W[i] -= lr * (this.mW[i] / c1) / (Math.sqrt(this.vW[i] / c2) + eps);
      this.dW[i] = 0;
    }
    for (let j = 0; j < this.b.length; j++) {
      const g = this.db[j];
      this.mb[j] = b1 * this.mb[j] + (1 - b1) * g;
      this.vb[j] = b2 * this.vb[j] + (1 - b2) * g * g;
      this.b[j] -= lr * (this.mb[j] / c1) / (Math.sqrt(this.vb[j] / c2) + eps);
      this.db[j] = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// 3. neighborhood aggregation (gather), sum / mean / max, self included
// ---------------------------------------------------------------------------

function aggFwd(H, n, d, nbrs, mode, arg) {
  const A = new Float64Array(n * d);
  if (mode === 'max') {
    for (let i = 0; i < n; i++) {
      const L = nbrs[i], off = i * d;
      for (let s = 0; s < L.length; s++) {
        const ro = L[s] * d;
        for (let k = 0; k < d; k++) {
          const v = H[ro + k];
          if (s === 0 || v > A[off + k]) { A[off + k] = v; arg[off + k] = L[s]; }
        }
      }
    }
    return A;
  }
  for (let i = 0; i < n; i++) {
    const L = nbrs[i], off = i * d, w = mode === 'mean' ? 1 / L.length : 1;
    for (let s = 0; s < L.length; s++) {
      const ro = L[s] * d;
      for (let k = 0; k < d; k++) A[off + k] += H[ro + k] * w;
    }
  }
  return A;
}

function aggBwd(dA, n, d, nbrs, mode, arg, dH) {
  if (mode === 'max') {
    for (let i = 0; i < n; i++) {
      const off = i * d;
      for (let k = 0; k < d; k++) dH[arg[off + k] * d + k] += dA[off + k];
    }
    return;
  }
  for (let i = 0; i < n; i++) {
    const L = nbrs[i], off = i * d, w = mode === 'mean' ? 1 / L.length : 1;
    for (let s = 0; s < L.length; s++) {
      const ro = L[s] * d;
      for (let k = 0; k < d; k++) dH[ro + k] += dA[off + k] * w;
    }
  }
}

// ---------------------------------------------------------------------------
// 4. the GNN: stacked LinB layers, optional message passing between layers
// ---------------------------------------------------------------------------

export class GNN {
  // layers >= 1; the last LinB is the linear classifier (2 logits, no tanh).
  constructor(nfeat, dim, layers, agg, mp, seed) {
    this.agg = agg; this.mp = !!mp; this.dim = dim;
    const rng = mulberry32(seed);
    this.lins = []; this.dims = [nfeat];
    let inD = nfeat;
    for (let l = 0; l < layers; l++) {
      const outD = l === layers - 1 ? 2 : dim;
      this.lins.push(new LinB(inD, outD, rng));
      this.dims.push(outD); inD = outD;
    }
    this.t = 0; this.cs = null; this.n = 0; this.nbrs = null;
  }
  fwd(X, n, nbrs) {
    this.n = n; this.nbrs = nbrs;
    const cs = []; let H = X;
    for (let l = 0; l < this.lins.length; l++) {
      const dIn = this.dims[l];
      let A = H, arg = null;
      if (this.mp) {
        if (this.agg === 'max') arg = new Int32Array(n * dIn);
        A = aggFwd(H, n, dIn, nbrs, this.agg, arg || new Int32Array(0));
      }
      const Z = this.lins[l].fwd(A, n);
      let out = Z;
      if (l < this.lins.length - 1) {
        out = new Float64Array(Z.length);
        for (let i = 0; i < Z.length; i++) out[i] = Math.tanh(Z[i]);
      }
      cs.push({ Hin: H, A, arg, out, dIn });
      H = out;
    }
    this.cs = cs;
    return H; // logits, n x 2
  }
  probs(logits, n) {
    const P = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      const a = logits[i * 2], b = logits[i * 2 + 1];
      const mx = Math.max(a, b), ea = Math.exp(a - mx), eb = Math.exp(b - mx);
      P[i * 2] = ea / (ea + eb); P[i * 2 + 1] = 1 - P[i * 2];
    }
    return P;
  }
  bwd(dLogits) {
    let g = dLogits;
    for (let l = this.lins.length - 1; l >= 0; l--) {
      const c = this.cs[l];
      if (l < this.lins.length - 1) {
        const t = new Float64Array(g.length);
        for (let i = 0; i < g.length; i++) t[i] = g[i] * (1 - c.out[i] * c.out[i]);
        g = t;
      }
      const dA = this.lins[l].bwd(g);
      if (!this.mp) { g = dA; continue; }
      const dH = new Float64Array(this.n * c.dIn);
      aggBwd(dA, this.n, c.dIn, this.nbrs, this.agg, c.arg, dH);
      g = dH;
    }
  }
  embeddings() {
    if (this.cs.length < 2) return this.cs[0].Hin; // 1 layer: raw features
    return this.cs[this.cs.length - 2].out; // penultimate
  }
  step(lr, wd) { for (const l of this.lins) l.adam(lr, ++this.t, wd); }
}

// softmax cross-entropy: fills grad, returns {loss, acc}
export function lossAcc(logits, Y, n, grad) {
  let loss = 0, acc = 0;
  for (let i = 0; i < n; i++) {
    const a = logits[i * 2], b = logits[i * 2 + 1];
    const mx = Math.max(a, b), ea = Math.exp(a - mx), eb = Math.exp(b - mx);
    const pa = ea / (ea + eb), pb = eb / (ea + eb), y = Y[i];
    loss -= y === 0 ? Math.log(Math.max(pa, 1e-12)) : Math.log(Math.max(pb, 1e-12));
    grad[i * 2] = (pa - (y === 0 ? 1 : 0)) / n;
    grad[i * 2 + 1] = (pb - (y === 1 ? 1 : 0)) / n;
    if ((pa < pb ? 1 : 0) === y) acc++;
  }
  return { loss: loss / n, acc: acc / n };
}

export function trainEpochs(m, X, Y, n, nbrs, epochs, lr, wd, hist) {
  const grad = new Float64Array(n * 2);
  for (let e = 0; e < epochs; e++) {
    const logits = m.fwd(X, n, nbrs);
    const r = lossAcc(logits, Y, n, grad);
    m.bwd(grad);
    m.step(lr, wd);
    if (hist) hist.push(r);
  }
}

// ---------------------------------------------------------------------------
// 5. karate wiring: features, neighbor lists, layout, PCA
// ---------------------------------------------------------------------------

export function karateDegrees() {
  const deg = new Array(KARATE_NODES).fill(0);
  for (const [a, b] of KARATE_EDGES) { deg[a]++; deg[b]++; }
  return deg;
}

// one-hot degree bucketed at 10 (karate degrees run 1..17): no features given.
export function karateFeatures(buckets = 10) {
  const deg = karateDegrees();
  const X = new Float64Array(KARATE_NODES * buckets);
  for (let i = 0; i < KARATE_NODES; i++) X[i * buckets + Math.min(deg[i], buckets) - 1] = 1;
  return X;
}

export function karateNbrs() {
  const nb = Array.from({ length: KARATE_NODES }, (_, i) => [i]); // self
  for (const [a, b] of KARATE_EDGES) { nb[a].push(b); nb[b].push(a); }
  for (const L of nb) L.sort((x, y) => x - y);
  return nb;
}

// seeded Fruchterman-Reingold-lite; deterministic, ~150 iterations, n<=64
export function forceLayout(n, edges, seed, iters = 150, w = 620, h = 440) {
  const rng = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * 2 * Math.PI + rng() * 0.5;
    const rad = 0.32 + rng() * 0.08;
    pts.push([w / 2 + Math.cos(ang) * rad * w / 2, h / 2 + Math.sin(ang) * rad * h / 2]);
  }
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const k = Math.sqrt((w * h) / n) * 0.55;
  let temp = w / 10;
  for (let it = 0; it < iters; it++) {
    const disp = Array.from({ length: n }, () => [0, 0]);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
      let d2 = dx * dx + dy * dy; if (d2 < 1e-6) { d2 = 1e-6; dx = 0.01; dy = 0.01; }
      const f = (k * k) / d2, d = Math.sqrt(d2);
      const fx = (dx / d) * f, fy = (dy / d) * f;
      disp[i][0] += fx; disp[i][1] += fy; disp[j][0] -= fx; disp[j][1] -= fy;
    }
    for (let i = 0; i < n; i++) for (const j of adj[i]) if (j > i) {
      let dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1e-6);
      const f = (d * d) / k, fx = (dx / d) * f, fy = (dy / d) * f;
      disp[i][0] -= fx; disp[i][1] -= fy; disp[j][0] += fx; disp[j][1] += fy;
    }
    for (let i = 0; i < n; i++) {
      disp[i][0] += (w / 2 - pts[i][0]) * 0.01; disp[i][1] += (h / 2 - pts[i][1]) * 0.01;
      const d = Math.max(Math.hypot(disp[i][0], disp[i][1]), 1e-6);
      const step = Math.min(d, temp);
      pts[i][0] += (disp[i][0] / d) * step; pts[i][1] += (disp[i][1] / d) * step;
      pts[i][0] = Math.max(24, Math.min(w - 24, pts[i][0]));
      pts[i][1] = Math.max(24, Math.min(h - 24, pts[i][1]));
    }
    temp *= 0.97;
  }
  return pts;
}

// 2-component PCA by power iteration with deflation; returns [x, y] pairs.
export function pca2(H, n, d, iters = 24) {
  const mean = new Float64Array(d);
  for (let i = 0; i < n; i++) for (let k = 0; k < d; k++) mean[k] += H[i * d + k] / n;
  const C = new Float64Array(n * d); // centered
  for (let i = 0; i < n; i++) for (let k = 0; k < d; k++) C[i * d + k] = H[i * d + k] - mean[k];
  const rng = mulberry32(1);
  const comps = [];
  for (let c = 0; c < 2; c++) {
    let v = new Float64Array(d);
    for (let k = 0; k < d; k++) v[k] = gauss(rng, 1);
    let R = C;
    if (c === 1) { // deflate
      R = new Float64Array(C.length);
      const p0 = new Float64Array(d);
      for (let i = 0; i < n; i++) for (let k = 0; k < d; k++) p0[k] += C[i * d + k] * comps[0][k];
      for (let i = 0; i < n; i++) for (let k = 0; k < d; k++) R[i * d + k] = C[i * d + k] - p0[k] * comps[0][k] / n;
    }
    for (let it = 0; it < iters; it++) {
      const w = new Float64Array(d);
      for (let i = 0; i < n; i++) for (let k = 0; k < d; k++) w[k] += R[i * d + k] * v[k];
      const nw = Math.hypot(...w) || 1; for (let k = 0; k < d; k++) v[k] = w[k] / nw;
    }
    comps.push(v);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    for (let k = 0; k < d; k++) { x += C[i * d + k] * comps[0][k]; y += C[i * d + k] * comps[1][k]; }
    out.push([x, y]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 6. the T27F work graph fixture (semantics of specs/t27f/work_graph.t27)
// ---------------------------------------------------------------------------

export const NK = ['SPEC', 'AGENT', 'TASK', 'ACTION', 'ARTIFACT'];
export const EK = ['READS', 'ASSIGNED', 'PERFORMS', 'PRODUCES', 'VERIFIES', 'BLOCKS'];

// A 17-node fixture built to follow the work_graph.t27 prose semantics:
// an offer assigns the task and (through the feed's join) the task reads the
// spec; a result is performed, produced as an artifact, and verified by
// whoever received it; a cancel blocks the task; every deliver is an ACTION
// the actor performs. Provenance labels: EXACT / DERIVED / UNKNOWN (dashed).
// This is a fixture, not a fetch: the real, moving graph is /t27f/live/.
export const WG_NODES = [
  { k: 1, id: 'pid 4127', name: 'reviewer', lab: 'EXACT', x: 78, y: 66 },
  { k: 1, id: 'pid 4189', name: 'runner', lab: 'EXACT', x: 78, y: 186 },
  { k: 1, id: 'pid 4255', name: 'porter', lab: 'EXACT', x: 78, y: 306 },
  { k: 1, id: 'pid 4310', name: '(bare pid)', lab: 'UNKNOWN', x: 78, y: 398 },
  { k: 3, id: 'd881', name: 'offer', lab: 'EXACT', x: 288, y: 56 },
  { k: 3, id: 'd885', name: 'offer', lab: 'EXACT', x: 288, y: 152 },
  { k: 3, id: 'd886', name: 'result', lab: 'EXACT', x: 288, y: 236 },
  { k: 3, id: 'd884', name: 'result', lab: 'EXACT', x: 288, y: 336 },
  { k: 3, id: 'd887', name: 'cancel', lab: 'EXACT', x: 288, y: 420 },
  { k: 2, id: '#6795', name: 'port HUD paint', lab: 'EXACT', x: 496, y: 84 },
  { k: 2, id: '#6810', name: 'fix seals', lab: 'EXACT', x: 496, y: 226 },
  { k: 2, id: '#6802', name: 'verify receipt', lab: 'EXACT', x: 496, y: 356 },
  { k: 4, id: 'PR 6811', name: 'diff', lab: 'EXACT', x: 700, y: 176 },
  { k: 4, id: 'rc 6802', name: 'receipt.json', lab: 'EXACT', x: 700, y: 330 },
  { k: 0, id: 'hud', name: '.t27 spec', lab: 'EXACT', x: 372, y: 452 },
  { k: 0, id: 'work_graph', name: '.t27 spec', lab: 'EXACT', x: 546, y: 452 },
  { k: 0, id: 'gf16', name: '.t27 spec', lab: 'EXACT', x: 720, y: 452 },
];

// s -> t, kind index into EK, provenance label
export const WG_EDGES = [
  { s: 0, t: 4, k: 2, lab: 'EXACT' },   // reviewer PERFORMS offer d881
  { s: 4, t: 9, k: 1, lab: 'EXACT' },   // d881 ASSIGNED #6795
  { s: 9, t: 14, k: 0, lab: 'DERIVED' }, // #6795 READS hud.t27 (join)
  { s: 2, t: 5, k: 2, lab: 'EXACT' },   // porter PERFORMS offer d885
  { s: 5, t: 10, k: 1, lab: 'EXACT' },  // d885 ASSIGNED #6810
  { s: 10, t: 15, k: 0, lab: 'DERIVED' }, // #6810 READS work_graph.t27
  { s: 2, t: 6, k: 2, lab: 'EXACT' },   // porter PERFORMS result d886
  { s: 6, t: 10, k: 1, lab: 'EXACT' },  // d886 ASSIGNED #6810
  { s: 6, t: 12, k: 3, lab: 'EXACT' },  // d886 PRODUCES PR 6811
  { s: 0, t: 12, k: 4, lab: 'DERIVED' }, // reviewer VERIFIES PR 6811 (received)
  { s: 1, t: 7, k: 2, lab: 'EXACT' },   // runner PERFORMS result d884
  { s: 7, t: 11, k: 1, lab: 'EXACT' },  // d884 ASSIGNED #6802
  { s: 7, t: 13, k: 3, lab: 'EXACT' },  // d884 PRODUCES receipt
  { s: 11, t: 16, k: 0, lab: 'DERIVED' }, // #6802 READS gf16.t27
  { s: 3, t: 13, k: 4, lab: 'DERIVED' }, // bare pid VERIFIES receipt (received)
  { s: 1, t: 8, k: 2, lab: 'EXACT' },   // runner PERFORMS cancel d887
  { s: 8, t: 10, k: 5, lab: 'EXACT' },  // d887 BLOCKS #6810
];

export const KIND_COLOR = { SPEC: '#58a6ff', AGENT: '#3fb950', TASK: '#d29922', ACTION: '#f85149', ARTIFACT: '#e6edf3' };
export const EDGE_STYLE = {
  READS: ['#58a6ff', ''], ASSIGNED: ['#d29922', ''], PERFORMS: ['#3fb950', ''],
  PRODUCES: ['#e6edf3', '2 3'], VERIFIES: ['#58a6ff', '5 3'], BLOCKS: ['#f85149', '5 3'],
};

export function wgUndirectedNbrs(nodes, edges) {
  const nb = nodes.map((_, i) => [i]);
  for (const e of edges) { nb[e.s].push(e.t); nb[e.t].push(e.s); }
  return nb;
}

export function khop(nodes, edges, start, k) {
  const nb = wgUndirectedNbrs(nodes, edges);
  const seen = new Set([start]), frontier = [start];
  const byHop = [[start]];
  for (let h = 1; h <= k; h++) {
    const next = [];
    for (const u of frontier) for (const v of nb[u]) if (!seen.has(v)) { seen.add(v); next.push(v); }
    byHop.push(next); frontier.push(...next);
  }
  return { nodes: seen, byHop };
}

// ---------------------------------------------------------------------------
// 7. DOM figures (browser only; every function no-ops if its element is gone)
// ---------------------------------------------------------------------------

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const key in attrs) e.setAttribute(key, attrs[key]);
  if (parent) parent.appendChild(e);
  return e;
}
function mkSvg(container, vbW, vbH) {
  container.textContent = '';
  return svgEl('svg', { viewBox: `0 0 ${vbW} ${vbH}`, width: '100%', style: 'height:auto;display:block' }, container);
}

// -- figure: work graph hero, hover a node, k-hop gather readout ------------
function figHero() {
  const host = document.getElementById('fig-hero-svg');
  const readout = document.getElementById('fig-hero-readout');
  if (!host || !readout) return;
  const ksel = document.getElementById('fig-hero-k');
  const svg = mkSvg(host, 800, 496);
  const defs = svgEl('defs', {}, svg);
  for (const name in EDGE_STYLE) {
    const [c] = EDGE_STYLE[name];
    const m = svgEl('marker', { id: 'arr-' + name, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    svgEl('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: c }, m);
  }
  const W = 104, H = 30;
  const edgeEls = WG_EDGES.map((e) => {
    const a = WG_NODES[e.s], b = WG_NODES[e.t];
    const x1 = a.x + W / 2, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2;
    const [c, dash] = EDGE_STYLE[EK[e.k]];
    const l = svgEl('line', {
      x1, y1, x2: x2 - 4, y2, stroke: c, 'stroke-width': 1.4, 'stroke-dasharray': dash,
      'marker-end': `url(#arr-${EK[e.k]})`, opacity: 0.75, 'stroke-linecap': 'round',
    }, svg);
    return l;
  });
  const nodeEls = WG_NODES.map((nd, i) => {
    const g = svgEl('g', { style: 'cursor:pointer' }, svg);
    svgEl('rect', {
      x: nd.x, y: nd.y, width: W, height: H, rx: 7, fill: '#161b22',
      stroke: KIND_COLOR[NK[nd.k]], 'stroke-width': 1.4,
      'stroke-dasharray': nd.lab === 'EXACT' ? '' : '4 3',
    }, g);
    svgEl('text', { x: nd.x + W / 2, y: nd.y + 13.5, 'text-anchor': 'middle', fill: '#e6edf3', 'font-size': 10, 'font-family': 'JetBrains Mono,monospace' }, g).textContent = nd.name;
    svgEl('text', { x: nd.x + W / 2, y: nd.y + 25, 'text-anchor': 'middle', fill: '#8b949e', 'font-size': 8.5, 'font-family': 'JetBrains Mono,monospace' }, g).textContent = `${NK[nd.k]} ${nd.id}`;
    const show = (i2) => {
      const k = ksel ? +ksel.value : 1;
      const { nodes, byHop } = khop(WG_NODES, WG_EDGES, i2, k);
      nodeEls.forEach((g2, j) => { g2.setAttribute('opacity', nodes.has(j) ? '1' : '0.22'); });
      edgeEls.forEach((l, j) => {
        const e = WG_EDGES[j];
        l.setAttribute('opacity', nodes.has(e.s) && nodes.has(e.t) ? '0.95' : '0.08');
      });
      const lines = [`gather for ${NK[nd.k]} "${nd.name} ${nd.id}" at k = ${k}:`];
      for (let h = 1; h <= k; h++) {
        const names = byHop[h].map((j) => `${WG_NODES[j].name}`).join(', ') || '(none)';
        lines.push(`  hop ${h}: ${names}`);
      }
      lines.push(`after ${k} message-passing layer${k > 1 ? 's' : ''}, this node's embedding`);
      lines.push('aggregated information from every node listed above.');
      readout.textContent = lines.join('\n');
    };
    g.addEventListener('mouseenter', () => show(i));
    g.addEventListener('mouseleave', () => {
      nodeEls.forEach((g2) => g2.setAttribute('opacity', '1'));
      edgeEls.forEach((l) => l.setAttribute('opacity', '0.75'));
      readout.textContent = 'hover a node -- its k-hop neighborhood lights up, and the panel lists exactly which embeddings a k-layer GNN would gather into it. solid outlines are EXACT provenance, dashed are weaker (DERIVED or UNKNOWN).';
    });
    return g;
  });
}

// -- figure: adjacency matrix, click to toggle, A^2 walks --------------------
function figMatrix() {
  const hostA = document.getElementById('fig-matrix-a');
  const hostA2 = document.getElementById('fig-matrix-a2');
  const readout = document.getElementById('fig-matrix-readout');
  if (!hostA || !hostA2 || !readout) return;
  const n = WG_NODES.length;
  let edges = WG_EDGES.map((e) => ({ ...e }));
  let edited = new Set();
  const cell = 20, lab = 66, pad = 18;
  function current() { return edges; }
  function drawA2() {
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const e of edges) A[e.s][e.t] = 1;
    const svg = mkSvg(hostA2, lab + pad + n * cell + pad, lab + pad + n * cell + pad + 30);
    let maxw = 0;
    const A2 = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      let s = 0; for (let m2 = 0; m2 < n; m2++) s += A[i][m2] * A[m2][j];
      A2[i][j] = s; if (s > maxw) maxw = s;
    }
    svgEl('text', { x: lab, y: 14, fill: '#8b949e', 'font-size': 10, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = 'A^2 -- counts of 2-walks i -> m -> j (live)';
    for (let i = 0; i < n; i++) {
      svgEl('text', { x: lab - 6, y: lab + pad + i * cell + 14, 'text-anchor': 'end', fill: '#8b949e', 'font-size': 8, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = `${WG_NODES[i].name}`;
      for (let j = 0; j < n; j++) {
        const v = A2[i][j];
        const x = lab + pad + j * cell, y = lab + pad + i * cell;
        svgEl('rect', {
          x, y, width: cell - 1, height: cell - 1, rx: 2,
          fill: v > 0 ? `rgba(210,153,34,${0.15 + 0.7 * (v / (maxw || 1))})` : '#161b22',
          stroke: '#30363d', 'stroke-width': 0.5,
        }, svg);
        if (v > 0 && v < 100) svgEl('text', { x: x + cell / 2 - 0.5, y: y + 13.5, 'text-anchor': 'middle', fill: v > maxw / 2 ? '#0d1117' : '#d29922', 'font-size': 8.5, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = String(v);
      }
    }
    readout.textContent = `17 nodes, ${edges.length} directed edges: ${edges.length} of ${n * n} = ${(100 * edges.length / (n * n)).toFixed(1)}% of the matrix is non-zero. The real fleet caps: 8192 edges over up to 2048 nodes -- 0.2% of 4.2M cells. A^2 above counts 2-walks; the same sparsity argument applies to every power.`;
  }
  function draw() {
    const svg = mkSvg(hostA, lab + pad + n * cell + pad, lab + pad + n * cell + pad);
    svgEl('text', { x: lab, y: 14, fill: '#8b949e', 'font-size': 10, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = 'A -- click any cell to toggle that directed edge';
    for (let j = 0; j < n; j++) {
      svgEl('text', { x: lab + pad + j * cell + cell / 2, y: lab + pad - 5, 'text-anchor': 'middle', fill: '#8b949e', 'font-size': 8, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = `${WG_NODES[j].name}`.slice(0, 6);
    }
    const key = (i, j) => i * n + j;
    const present = new Map();
    for (let ei = 0; ei < edges.length; ei++) present.set(key(edges[ei].s, edges[ei].t), ei);
    for (let i = 0; i < n; i++) {
      svgEl('text', { x: lab - 6, y: lab + pad + i * cell + 14, 'text-anchor': 'end', fill: '#8b949e', 'font-size': 8, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = `${WG_NODES[i].name}`;
      for (let j = 0; j < n; j++) {
        const x = lab + pad + j * cell, y = lab + pad + i * cell;
        const ei = present.get(key(i, j));
        const [c, dash] = ei !== undefined ? EDGE_STYLE[EK[edges[ei].k]] : ['#21262d', ''];
        const r = svgEl('rect', { x, y, width: cell - 1, height: cell - 1, rx: 2, fill: ei !== undefined ? c : '#161b22', 'fill-opacity': ei !== undefined ? 0.85 : 1, stroke: edited.has(key(i, j)) ? '#3fb950' : '#30363d', 'stroke-width': edited.has(key(i, j)) ? 1.6 : 0.5, style: 'cursor:pointer' }, svg);
        r.addEventListener('click', () => {
          const kk = key(i, j);
          const at = present.get(kk);
          if (at !== undefined) { edges.splice(at, 1); present.delete(kk); }
          else { edges.push({ s: i, t: j, k: 0, lab: 'EDITED' }); present.set(kk, edges.length - 1); }
          edited.add(kk);
          draw(); drawA2();
        });
      }
    }
    drawA2();
  }
  draw();
}

// -- figure: permutation invariance, shown numerically -----------------------
function figPermute() {
  const hostA = document.getElementById('fig-perm-a');
  const hostB = document.getElementById('fig-perm-b');
  const readout = document.getElementById('fig-perm-readout');
  const btn = document.getElementById('fig-perm-btn');
  if (!hostA || !hostB || !readout) return;
  const n = WG_NODES.length;
  const nbrs = wgUndirectedNbrs(WG_NODES, WG_EDGES);
  const deg = nbrs.map((L) => L.length - 1);
  const nF = 6;
  const feats = (permInv) => { // permInv[i] = original index of row i
    const X = new Float64Array(n * nF);
    for (let i = 0; i < n; i++) X[i * nF + Math.min(permInv === null ? deg[i] : deg[permInv[i]], nF) - 1] = 1;
    return X;
  };
  const nbrsPerm = (perm) => { // perm maps old->new
    const nb = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) { nb[perm[i]] = nbrs[i].map((v) => perm[v]); nb[perm[i]].sort((a, b) => a - b); }
    return nb;
  };
  const runModel = (X, nb) => {
    const m = new GNN(nF, 8, 2, 'sum', true, 7);
    return m.fwd(X, n, nb); // logits, untrained: invariance is architectural
  };
  const identity = Array.from({ length: n }, (_, i) => i);
  let perm = identity.slice();
  const logits0 = runModel(feats(null), nbrs);
  function drawM(host, title, order) { // order[i] = original index shown at row i
    const cell = 15, lab = 60, pad = 16;
    const svg = mkSvg(host, lab + pad + n * cell + pad, lab + pad + n * cell + pad + 26);
    svgEl('text', { x: lab, y: 13, fill: '#8b949e', 'font-size': 10, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = title;
    const es = new Set(WG_EDGES.map((e) => e.s * n + e.t));
    for (let i = 0; i < n; i++) {
      const orig = order[i];
      svgEl('text', { x: lab - 5, y: lab + pad + i * cell + 11, 'text-anchor': 'end', fill: '#8b949e', 'font-size': 7.5, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = `${WG_NODES[orig].name}`.slice(0, 6);
      for (let j = 0; j < n; j++) {
        const on = es.has(orig * n + order[j]);
        svgEl('rect', { x: lab + pad + j * cell, y: lab + pad + i * cell, width: cell - 1, height: cell - 1, rx: 1.5, fill: on ? '#58a6ff' : '#161b22', 'fill-opacity': on ? 0.8 : 1, stroke: '#30363d', 'stroke-width': 0.4 }, svg);
      }
    }
  }
  function report() {
    const inv = identity.slice();
    for (let i = 0; i < n; i++) inv[perm[i]] = i; // inv[new] = old
    const logits1 = runModel(feats(inv), nbrsPerm(perm));
    let maxd = 0;
    for (let i = 0; i < n; i++) for (let d = 0; d < 2; d++) {
      maxd = Math.max(maxd, Math.abs(logits0[i * 2 + d] - logits1[perm[i] * 2 + d]));
    }
    const f0 = (i) => `[${logits0.slice(i * 2, i * 2 + 2).map((v) => v.toFixed(4)).join(', ')}]`;
    const f1 = (i) => `[${logits1.slice(perm[i] * 2, perm[i] * 2 + 2).map((v) => v.toFixed(4)).join(', ')}]`;
    const moved = perm.filter((p, i) => p !== i).length;
    readout.textContent =
      `same graph, ${moved} of ${n} rows re-ordered.\n` +
      `logits for "reviewer" (row 0): ${f0(0)}  ->  relabeled row ${perm[0]}: ${f1(0)}\n` +
      `logits for "offer d881" (row 4): ${f0(4)}  ->  relabeled row ${perm[4]}: ${f1(4)}\n` +
      `max |delta| over all ${n} nodes and both logits: ${maxd.toExponential(2)}\n` +
      (maxd < 1e-9
        ? 'identical up to float rounding: the function is permutation-invariant, the summation order is not.'
        : 'invariant.');
  }
  function render() {
    const inv = identity.slice();
    for (let i = 0; i < n; i++) inv[perm[i]] = i;
    drawM(hostA, 'A (node order as born)', identity);
    drawM(hostB, 'A\' (same graph, shuffled order)', inv);
    report();
  }
  if (btn) btn.addEventListener('click', () => {
    perm = identity.slice();
    const rng = mulberry32(Date.now() & 0xffff);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    render();
  });
  render();
}

// -- figure: playground (karate) + sweep -------------------------------------
function figPlayground() {
  const hostG = document.getElementById('pg-graph');
  const hostS = document.getElementById('pg-pca');
  const hostL = document.getElementById('pg-loss');
  const readout = document.getElementById('pg-readout');
  if (!hostG || !hostS || !hostL || !readout) return;
  const n = KARATE_NODES;
  const Y = new Float64Array(n);
  for (let i = 0; i < n; i++) Y[i] = KARATE_LABELS[i];
  const nbrs = karateNbrs();
  const pts = forceLayout(n, KARATE_EDGES, 42);
  const FAC = ['#58a6ff', '#f85149'];
  const cfg = { layers: 2, dim: 16, agg: 'sum', mp: true, seed: 7 };
  let model = null, hist = [], running = false, raf = 0, epoch = 0;
  const MAXE = 600;
  function rebuild() {
    model = new GNN(10, cfg.dim, cfg.layers, cfg.agg, cfg.mp, cfg.seed);
    hist = []; epoch = 0;
    draw();
  }
  function draw() {
    const X = karateFeatures(10);
    const logits = model.fwd(X, n, nbrs);
    const P = model.probs(logits, n);
    let acc = 0, loss = 0;
    const svg = mkSvg(hostG, 640, 460);
    for (const [a, b] of KARATE_EDGES) {
      svgEl('line', { x1: pts[a][0], y1: pts[a][1], x2: pts[b][0], y2: pts[b][1], stroke: '#30363d', 'stroke-width': 1.2 }, svg);
    }
    for (let i = 0; i < n; i++) {
      const pred = P[i * 2] < P[i * 2 + 1] ? 1 : 0;
      const conf = Math.max(P[i * 2], P[i * 2 + 1]);
      if (pred === Y[i]) acc++;
      loss -= Math.log(Math.max(P[i * 2 + (Y[i] === 1 ? 1 : 0)], 1e-12));
      const correct = pred === Y[i];
      svgEl('circle', {
        cx: pts[i][0], cy: pts[i][1], r: 9,
        fill: FAC[pred], 'fill-opacity': 0.25 + 0.6 * conf,
        stroke: correct ? '#e6edf3' : '#d29922', 'stroke-width': correct ? 1.4 : 1.8,
        'stroke-dasharray': correct ? '' : '3 2',
      }, svg);
      svgEl('title', {}, svg.lastChild).textContent =
        `node ${i}: ${KARATE_FACTIONS[Y[i]]}, predicted ${KARATE_FACTIONS[pred]} (p=${conf.toFixed(2)})`;
    }
    svgEl('text', { x: 12, y: 452, fill: '#8b949e', 'font-size': 11, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent =
      `fill = predicted faction (${KARATE_FACTIONS[0]} blue / ${KARATE_FACTIONS[1]} red); amber dashed ring = wrong`;
    // PCA of penultimate embeddings
    const E = model.embeddings();
    const dim = E.length / n;
    const xy = pca2(E, n, dim);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of xy) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const sw = 300, sh = 260, sc = Math.max(x1 - x0, y1 - y0, 1e-9);
    const svg2 = mkSvg(hostS, sw, sh);
    svgEl('line', { x1: 0, y1: sh / 2, x2: sw, y2: sh / 2, stroke: '#21262d' }, svg2);
    svgEl('line', { x1: sw / 2, y1: 0, x2: sw / 2, y2: sh, stroke: '#21262d' }, svg2);
    for (let i = 0; i < n; i++) {
      svgEl('circle', {
        cx: 16 + (xy[i][0] - x0) / sc * (sw - 32), cy: 16 + (xy[i][1] - y0) / sc * (sh - 32),
        r: 5, fill: FAC[Y[i]], 'fill-opacity': 0.85,
      }, svg2);
    }
    svgEl('text', { x: 10, y: sh - 8, fill: '#8b949e', 'font-size': 10, 'font-family': 'JetBrains Mono,monospace' }, svg2).textContent = 'penultimate embeddings, PCA (true factions)';
    // loss sparkline
    const svg3 = mkSvg(hostL, 300, 90);
    if (hist.length > 1) {
      let m0 = Infinity; for (const h of hist) m0 = Math.min(m0, h.loss);
      const m1 = hist[0].loss;
      const pl = hist.map((h, idx) => `${6 + (idx / (hist.length - 1)) * 288},${82 - ((h.loss - m0) / Math.max(m1 - m0, 1e-9)) * 70}`).join(' ');
      svgEl('polyline', { points: pl, fill: 'none', stroke: '#58a6ff', 'stroke-width': 1.4 }, svg3);
    }
    svgEl('text', { x: 8, y: 14, fill: '#8b949e', 'font-size': 10, 'font-family': 'JetBrains Mono,monospace' }, svg3).textContent =
      `epoch ${epoch}  loss ${loss.toFixed(4)}  acc ${(acc / n).toFixed(3)}`;
    readout.textContent =
      `epoch ${epoch}/${MAXE} -- loss ${loss.toFixed(4)}, train accuracy ${(acc / n).toFixed(3)} ` +
      `(transductive: every node is both train and test; ${KARATE_CONSISTENT ? 'labels verified against the faction split' : 'LABEL CHECK FAILED'})`;
  }
  function frame() {
    if (!running) return;
    const X = karateFeatures(10);
    trainEpochs(model, X, Y, n, nbrs, 3, 0.05, 5e-4, hist);
    epoch += 3; draw();
    if (epoch >= MAXE) { running = false; btnTrain.textContent = 'train'; return; }
    raf = requestAnimationFrame(frame);
  }
  const btnTrain = document.getElementById('pg-btn-train');
  const btnReset = document.getElementById('pg-btn-reset');
  if (btnTrain) btnTrain.addEventListener('click', () => {
    running = !running;
    btnTrain.textContent = running ? 'pause' : 'train';
    if (running) frame(); else cancelAnimationFrame(raf);
  });
  if (btnReset) btnReset.addEventListener('click', () => { running = false; if (btnTrain) btnTrain.textContent = 'train'; rebuild(); });
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { fn(el); running = false; if (btnTrain) btnTrain.textContent = 'train'; rebuild(); });
  };
  bind('pg-layers', (el) => { cfg.layers = +el.value; });
  bind('pg-dim', (el) => { cfg.dim = +el.value; });
  bind('pg-agg', (el) => { cfg.agg = el.value; });
  bind('pg-mp', (el) => { cfg.mp = el.checked; });
  bind('pg-seed', (el) => { cfg.seed = +el.value; });
  rebuild();
}

// -- figure: the design sweep -------------------------------------------------
async function figSweep() {
  const host = document.getElementById('sweep-fig');
  const readout = document.getElementById('sweep-readout');
  const btn = document.getElementById('sweep-btn');
  if (!host || !readout) return;
  const n = KARATE_NODES;
  const Y = new Float64Array(n);
  for (let i = 0; i < n; i++) Y[i] = KARATE_LABELS[i];
  const nbrs = karateNbrs();
  const X = karateFeatures(10);
  const EP = 200, LR = 0.05, WD = 5e-4, SEEDS = [3, 17];
  const run = (layers, agg, mp, seed) => {
    const m = new GNN(10, 16, layers, agg, mp, seed);
    const hist = [];
    trainEpochs(m, X, Y, n, nbrs, EP, LR, WD, hist);
    return hist[hist.length - 1].acc;
  };
  const bars = (svg, x0, title, groups, ymax) => {
    const bw = 34, gap = 10;
    svgEl('text', { x: x0, y: 20, fill: '#e6edf3', 'font-size': 11, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = title;
    groups.forEach((g, gi) => {
      const bx = x0 + gi * (bw + gap);
      const h = (g.mean / ymax) * 120;
      svgEl('rect', { x: bx, y: 158 - h, width: bw, height: h, rx: 3, fill: g.color, 'fill-opacity': 0.8 }, svg);
      svgEl('text', { x: bx + bw / 2, y: 172, 'text-anchor': 'middle', fill: '#8b949e', 'font-size': 9.5, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = g.label;
      svgEl('text', { x: bx + bw / 2, y: 186, 'text-anchor': 'middle', fill: '#e6edf3', 'font-size': 9, 'font-family': 'JetBrains Mono,monospace' }, svg).textContent = g.mean.toFixed(3);
      // min-max whisker
      const yHi = 158 - (g.max / ymax) * 120, yLo = 158 - (g.min / ymax) * 120;
      svgEl('line', { x1: bx + bw / 2, y1: yHi, x2: bx + bw / 2, y2: yLo, stroke: '#8b949e', 'stroke-width': 1 }, svg);
    });
  };
  const go = async () => {
    if (btn) { btn.disabled = true; btn.textContent = 'running 24 tiny models...'; }
    const res = { layers: {}, agg: {}, mp: {} };
    const jobs = [];
    for (let L = 1; L <= 4; L++) for (const agg of ['sum', 'mean', 'max']) for (const mp of [true, false]) jobs.push({ L, agg, mp });
    for (let ji = 0; ji < jobs.length; ji++) {
      const j = jobs[ji];
      const accs = SEEDS.map((s) => run(j.L, j.agg, j.mp, s));
      const rec = { accs, mean: accs.reduce((a, b) => a + b, 0) / accs.length };
      (res.layers[j.L] = res.layers[j.L] || []).push(rec);
      (res.agg[j.agg] = res.agg[j.agg] || []).push(rec);
      (res.mp[j.mp ? 'on' : 'off'] = res.mp[j.mp ? 'on' : 'off'] || []).push(rec);
      if (readout) readout.textContent = `sweep: model ${ji + 1} of ${jobs.length} (layers ${j.L}, ${j.agg}, mp ${j.mp ? 'on' : 'off'}) -> ${rec.mean.toFixed(3)}`;
      await new Promise((r2) => setTimeout(r2, 0));
    }
    const stat = (arr) => ({ mean: arr.reduce((a, b) => a + b.mean, 0) / arr.length, min: Math.min(...arr.flatMap((r) => r.accs)), max: Math.max(...arr.flatMap((r) => r.accs)) });
    const svg = mkSvg(host, 860, 200);
    bars(svg, 8, 'accuracy by GNN layers',
      [1, 2, 3, 4].map((L) => ({ label: `${L}L`, ...stat(res.layers[L]), color: '#58a6ff' })), 1.0);
    bars(svg, 296, 'by aggregation',
      ['sum', 'mean', 'max'].map((a) => ({ label: a, ...stat(res.agg[a]), color: '#3fb950' })), 1.0);
    bars(svg, 540, 'message passing',
      [['on', '#d29922'], ['off', '#8b949e']].map(([a, c]) => ({ label: `mp ${a}`, ...stat(res.mp[a]), color: c })), 1.0);
    const byL = [1, 2, 3, 4].map((L) => `${L}:${stat(res.layers[L]).mean.toFixed(3)}`).join(' ');
    const byA = ['sum', 'mean', 'max'].map((a) => `${a}:${stat(res.agg[a]).mean.toFixed(3)}`).join(' ');
    const byM = `on:${stat(res.mp.on).mean.toFixed(3)} off:${stat(res.mp.off).mean.toFixed(3)}`;
    readout.textContent = `mean final train accuracy, ${EP} epochs, dim 16, seeds {${SEEDS.join(',')}} -- by layers ${byL} | by aggregation ${byA} | by message passing ${byM}. One dataset, a tiny engine: read it as a reproduction of the 2021 design lessons at toy scale, not as a benchmark.`;
    if (btn) { btn.disabled = false; btn.textContent = 'run the sweep again'; }
  };
  if (btn) btn.addEventListener('click', go);
  go();
}

// ---------------------------------------------------------------------------
// 8. self test (node): gradient check, karate learning, permutation invariance
// ---------------------------------------------------------------------------

export function selfTest() {
  const out = {};
  // gradient check on a tiny random graph, sum aggregation
  {
    const n = 6, nb = [[0, 1, 2], [1, 0, 3], [2, 0, 3, 4], [3, 1, 2, 5], [4, 2, 5], [5, 3, 4]];
    const X = new Float64Array(n * 3);
    const rng0 = mulberry32(5);
    for (let i = 0; i < X.length; i++) X[i] = rng0();
    const Y = new Float64Array([0, 1, 0, 1, 0, 1]);
    const m = new GNN(3, 4, 2, 'sum', true, 11);
    const grad = new Float64Array(n * 2);
    const floss = () => lossAcc(m.fwd(X, n, nb), Y, n, grad).loss;
    floss(); m.bwd(grad);
    let worst = 0;
    const lin = m.lins[0]; // LinB(3, 4): W has 12 entries, probe inside
    for (const idx of [0, 5, 11]) {
      const h = 1e-6, old = lin.W[idx];
      lin.W[idx] = old + h; const lp = floss();
      lin.W[idx] = old - h; const lm = floss();
      lin.W[idx] = old;
      const num = (lp - lm) / (2 * h), ana = lin.dW[idx];
      worst = Math.max(worst, Math.abs(num - ana) / Math.max(1e-8, Math.abs(num) + Math.abs(ana)));
    }
    out.gradCheckRelErr = worst;
    out.gradCheckOK = worst < 1e-4;
  }
  // karate: default config must learn the structure signal
  {
    const n = KARATE_NODES, nb = karateNbrs(), X = karateFeatures(10);
    const Y = new Float64Array(n);
    for (let i = 0; i < n; i++) Y[i] = KARATE_LABELS[i];
    const m = new GNN(10, 16, 2, 'sum', true, 7);
    const hist = [];
    trainEpochs(m, X, Y, n, nb, 300, 0.05, 5e-4, hist);
    out.karateAcc300 = hist[hist.length - 1].acc;
    out.karateLearns = out.karateAcc300 > 0.8;
    const m2 = new GNN(10, 16, 2, 'sum', false, 7); // mp off should lag
    const hist2 = [];
    trainEpochs(m2, X, Y, n, nb, 300, 0.05, 5e-4, hist2);
    out.karateAccNoMP = hist2[hist2.length - 1].acc;
  }
  // permutation invariance on the fixture (undirected, kind-blind)
  {
    const nodes = WG_NODES, edges = WG_EDGES, n = nodes.length;
    const nb = wgUndirectedNbrs(nodes, edges);
    const deg = nb.map((L) => L.length - 1);
    const nF = 6;
    const mkX = (row2orig) => {
      const Xr = new Float64Array(n * nF);
      for (let i = 0; i < n; i++) Xr[i * nF + Math.min(row2orig === null ? deg[i] : deg[row2orig[i]], nF) - 1] = 1;
      return Xr;
    };
    const m = new GNN(nF, 8, 2, 'sum', true, 7);
    const l0 = m.fwd(mkX(null), n, nb);
    const rng = mulberry32(9);
    const perm = Array.from({ length: n }, (_, i) => i); // perm[old] = new
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const inv = Array.from({ length: n }, (_, i) => i); // inv[new] = old
    for (let i = 0; i < n; i++) inv[perm[i]] = i;
    const nbp = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) { nbp[perm[i]] = nb[i].map((v) => perm[v]); nbp[perm[i]].sort((a, b) => a - b); }
    const l1 = m.fwd(mkX(inv), n, nbp); // row i holds original node inv[i]
    let maxd = 0;
    for (let i = 0; i < n; i++) for (let d = 0; d < 2; d++) {
      maxd = Math.max(maxd, Math.abs(l0[i * 2 + d] - l1[perm[i] * 2 + d]));
    }
    out.permMaxDiff = maxd;
    out.permInvariant = maxd < 1e-9;
  }
  out.allOK = out.gradCheckOK && out.karateLearns && out.permInvariant && KARATE_CONSISTENT;
  return out;
}

// ---------------------------------------------------------------------------
// 9. DOM boot (browser only)
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
  const boot = () => { figHero(); figMatrix(); figPermute(); figPlayground(); figSweep(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
