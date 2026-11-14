// /t27f/live/: the visual replay engine. Agents appear as colored circles on
// a force-directed graph (named by the specs they work on), deliveries animate
// as particles along edges, and a timeline replays the recorded log at the
// law's tick grid, rendered at display frame rate. Every frame number comes
// from the wasm module's arrival_frame law. Below the graph: the fleet panel,
// live from the GitHub API -- pull requests, activity, and the queen lane
// (workflow dispatches and crons), then the static $0 model-fleet matrix
// (the probe receipt on t27#12170). The log can grow: it is re-fetched
// cache-busted every 5 minutes and the delta replays. See PROVENANCE.txt.
const url = new URL('t27f.wasm', import.meta.url)
const refuse = (m) => ({ refused: true, message: m })
const NS = 'http://www.w3.org/2000/svg'
const C = { bg:'#0d1117',text:'#8b949e',bright:'#c9d1d9',spawn:'#3fb950',active:'#58a6ff',down:'#f85149',restart:'#d29922',exit:'#484f58',edge:'#30363d',particle:'#f0883e' }
const col = (st) => st==='spawning'?C.spawn:st==='down'?C.down:st==='restarting'?C.restart:st==='exit'?C.exit:C.active

// THE GX CONSUMER -- the law's own graph, dormant until the module carries it. The LAW is
// specs/t27f/live_graph_export.t27 (gHashTag/t27#12148, MERGED) over the ONE WorkGraph of
// specs/t27f/work_graph.t27: it exports gx_node_count/gx_node_kind/gx_node_name_ptr/
// gx_node_name_len per node, gx_edge_count/gx_edge_kind/gx_edge_from/gx_edge_to per edge,
// and the two event paths gx_replay (a whole recorded log) and gx_apply_event (one staged
// record). The wasm beside this file today exports only the scalar trio, so hasGx is false,
// none of this runs and the page keeps its simulated agents; the day t27f.build serves the
// stateful module this branch takes over with zero further PRs. Node kinds (work_graph.t27):
// 0 SPEC, 1 AGENT, 2 TASK, 3 ACTION, 4 ARTIFACT. Edge kinds: 0 READS, 1 ASSIGNED, 2 PERFORMS,
// 3 PRODUCES, 4 VERIFIES, 5 BLOCKS. A name is the module's own bytes at the ptr/len pair: a
// SPEC path, or the tagged form -- two kind letters, a colon, the node's id as 8
// little-endian bytes; the page renders the number it reads (the module converts none). A
// record is 32 bytes little-endian: kind +0, deliver +1, reason +2, reserved +3 (must be 0),
// task_no +4, seq +8, spec_id +12, from_pid +16, to_pid +24.
const GX_EV = { spawn:0, exit:1, down:2, restart:3, deliver:4, delivers:5 }
const GX_DV = { offer:1, result:2, cancel:3 }
const GX_KC = [C.restart, C.active, '#a371f7', C.text, C.spawn] // spec amber, agent blue, task violet, action grey, artifact green
const GX_KN = ['spec','agent','task','action','artifact']
const GX_SEED = [[96,96],[320,200],[544,96],[544,304],[320,336]] // kind clusters, then the force layout

// THE LAYOUT DISCOVERY SURFACE -- the struct-path's const plane landing in the browser. The LAW
// is specs/t27f/live_glue_layout.t27 (gHashTag/t27#12040): 23 CONSTANT gx_ exports -- the
// ptr/len pairs of the fixed 143,692-byte layout the contract card #12005 pins -- read OFF the
// module at load, never hardcoded in this file, so a layout change in the card breaks the
// module (this page refuses it) instead of silently shifting every region. Discovery only:
// the scalar replay stays the live surface, and a missing or misshaped module is reported as
// a refusal, never faked. The 10 stateful names (gx_replay/gx_live/gx_reset, the two set_len
// commits, the stream getters) wait for the stateful emitter floors (t27#5980) and are
// deliberately absent from the module.
const LAYOUT_NAMES = [
  'gx_ev_ptr','gx_ev_cap','gx_batch_ptr','gx_batch_cap',
  'gx_graph_ptr','gx_graph_len','gx_digest_ptr','gx_digest_len','gx_stream_ptr',
  'gx_node_kind_ptr','gx_node_kind_len','gx_node_label_ptr','gx_node_label_len',
  'gx_node_id_ptr','gx_node_id_len','gx_edge_kind_ptr','gx_edge_kind_len',
  'gx_edge_from_ptr','gx_edge_from_len','gx_edge_to_ptr','gx_edge_to_len',
  'gx_edge_label_ptr','gx_edge_label_len',
]
async function discoverLayout() {
  let L
  try {
    L = (await WebAssembly.instantiateStreaming(fetch(new URL('layout.wasm', import.meta.url)), {})
      .catch(async () => WebAssembly.instantiate(await (await fetch(new URL('layout.wasm', import.meta.url))).arrayBuffer(), {}))).instance.exports
  } catch { return { ok: false, line: 'gx layout refused: layout.wasm did not load -- the layout plane is not published; nothing is invented.' } }
  for (const n of LAYOUT_NAMES) if (typeof L[n] !== 'function') return { ok: false, line: `gx layout refused: the module lacks ${n} -- nothing is invented.` }
  const v = (n) => L[n]()
  const pairs = `graph ${v('gx_graph_ptr')}+${v('gx_graph_len')}, ev ${v('gx_ev_ptr')}+${v('gx_ev_cap')}, batch ${v('gx_batch_ptr')}+${v('gx_batch_cap')}, stream@${v('gx_stream_ptr')}`
  return { ok: true, line: `gx layout: ${LAYOUT_NAMES.length} constants discovered off layout.wasm (${pairs}); the struct path reads its regions from the module, not from this file (specs/t27f/live_glue_layout.t27, t27#12040).` }
}

export async function replay(el, log) {
  let R
  try { R = (await WebAssembly.instantiateStreaming(fetch(url),{}).catch(async()=>WebAssembly.instantiate(await(await fetch(url)).arrayBuffer(),{}))).instance.exports }
  catch { return refuse('t27f.wasm did not load -- the closure build has not landed yet.') }
  if (typeof R.arrival_frame !== 'function') return refuse('the module lacks arrival_frame.')
  const evts = Array.isArray(log.events) ? log.events : []
  if (!evts.length) return refuse('the recorded log holds no events.')

  // The layout discovery surface: read the 23 gx_ layout constants off layout.wasm and report
  // one honest line either way. Discovery never gates the replay: a refused or missing module
  // leaves the scalar plane exactly as it was.
  const gxLayout = await discoverLayout()

  // The gx consumer: when the module carries the law's own graph (live_graph_export.t27,
  // t27#12148), the page stops simulating agents and reads the real topology out of the
  // module -- nodes, names and edges straight from linear memory. Today's module exports
  // none of it, so this stays dormant and the simulation below runs exactly as before;
  // any gx_ refusal or throw below falls back to that path silently.
  if (typeof R.gx_node_count === 'function') {
    try { const feed = gxFeed(R, evts); if (feed) { const g = gxReplay(el, R, log, evts, feed); g.message = gxLayout.line + ' ' + g.message; return g } }
    catch { /* the module refused its own graph: the simulation path stands */ }
  }

  const ks = document.getElementById('live-kf') || document.head.append(Object.assign(document.createElement('style'),{id:'live-kf',textContent:'@keyframes live-pulse{from{r:14;opacity:.7}to{r:44;opacity:0}}@keyframes live-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}'}))

  const wrap=document.createElement('div'); wrap.style.cssText='display:grid;grid-template-columns:1fr 260px;gap:10px'
  const gc=document.createElement('div'); gc.style.cssText='position:relative;border:1px solid #30363d;border-radius:8px;background:#0d1117;overflow:hidden;min-height:400px'
  const sc=document.createElement('div'); sc.style.cssText='display:flex;flex-direction:column;gap:8px'
  const W=640,H=400
  const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.setAttribute('width','100%'); svg.setAttribute('height','100%'); svg.style.cssText='position:absolute;inset:0'
  const eG=document.createElementNS(NS,'g'),nG=document.createElementNS(NS,'g'),fG=document.createElementNS(NS,'g')
  svg.append(eG,nG,fG); gc.append(svg)
  const lg=document.createElement('div'); lg.style.cssText='position:absolute;bottom:6px;left:8px;display:flex;gap:10px;font:11px monospace;color:#8b949e;pointer-events:none'
  const dot=(c,t)=>{const s=document.createElement('span');s.innerHTML=`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${c};margin-right:3px"></span>${t}`;return s}
  lg.append(dot(C.spawn,'new'),dot(C.active,'active'),dot(C.down,'down'),dot(C.restart,'restart'),dot(C.exit,'exit')); gc.append(lg)
  const stream=document.createElement('div'); stream.style.cssText='flex:1;border:1px solid #30363d;border-radius:8px;padding:6px;overflow-y:auto;font:11px/1.5 monospace;color:#8b949e;max-height:320px'
  const stats=document.createElement('div'); stats.style.cssText='border:1px solid #30363d;border-radius:8px;padding:6px 10px;font:11px monospace;color:#8b949e;display:flex;gap:12px;flex-wrap:wrap'
  sc.append(stream,stats)
  wrap.append(gc,sc)
  const tl=document.createElement('div'); tl.style.cssText='border:1px solid #30363d;border-radius:8px;padding:6px;display:flex;align-items:center;gap:6px;margin-top:8px'
  const mkB=(t,fn)=>{const b=document.createElement('button');b.textContent=t;b.onclick=fn;b.style.cssText='background:#21262d;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;padding:3px 8px;cursor:pointer;font:12px monospace';return b}
  const pb=mkB('\u25B6',()=>reset())
  const fe=document.createElement('span'); fe.style.cssText='color:#8b949e;font:11px monospace;margin-left:auto'
  tl.append(pb,fe)
  const fleet=document.createElement('div')
  el.replaceChildren(wrap,tl,fleet)
  mountFleet(fleet)

  const agents=new Map(),edges=[]
    const SPEC_SPECS={}
    const assignSpec=(aid0,si)=>{SPEC_SPECS[aid0]=SPECS[si%8]}
  const SPECS=['frontend','idea_factory','lesson_reel','spec_graph','particle_engine','hud','display_list','scene']
    const aid=(i)=>'a'+((i%4)+1)
    const specOf=(i)=>SPECS[i%8]
  function addA(id){ if(agents.has(id))return
    const a={id,st:'spawning',x:W/2+(Math.random()-.5)*100,y:H/2+(Math.random()-.5)*100,vx:0,vy:0}
    const g=document.createElementNS(NS,'g')
    const c=document.createElementNS(NS,'circle'); c.setAttribute('r','2'); c.setAttribute('fill',C.spawn); c.setAttribute('stroke','#c9d1d9'); c.setAttribute('stroke-width','1'); c.style.transition='r .3s,fill .3s'
    const t=document.createElementNS(NS,'text'); t.setAttribute('y','-18'); t.setAttribute('text-anchor','middle'); t.setAttribute('fill',C.text); t.setAttribute('font-size','9'); t.setAttribute('font-family','monospace'); t.textContent=SPEC_SPECS[id]||id
    g.append(c,t); nG.append(g); a.el=g; a.c=c; agents.set(id,a)
    requestAnimationFrame(()=>c.setAttribute('r','13'))
    const p=document.createElementNS(NS,'circle'); p.setAttribute('r','13'); p.setAttribute('fill','none'); p.setAttribute('stroke',C.spawn); p.setAttribute('stroke-width','2'); p.style.cssText='animation:live-pulse .8s ease-out forwards'; g.append(p); setTimeout(()=>p.remove(),900)
    setTimeout(()=>{a.st='active';c.setAttribute('fill',C.active)},400) }
  function setSt(id,st){ const a=agents.get(id); if(!a)return; a.st=st
    if(a.c){ a.c.setAttribute('fill',col(st))
      if(st==='exit'){a.c.style.opacity='0.25';a.el.querySelector('text').style.opacity='0.25'}
      if(st==='down'){a.el.style.animation='live-shake .3s ease-in-out 3'; setTimeout(()=>a.el.style.animation='',1000)} } }
  function deliver(f,to){ const a=agents.get(f),b=agents.get(to); if(!a||!b)return
    const l=document.createElementNS(NS,'polyline'); l.setAttribute('points',`${a.x},${a.y} ${b.x},${b.y}`); l.setAttribute('stroke',C.edge); l.setAttribute('stroke-width','1.5'); l.setAttribute('fill','none'); eG.append(l); edges.push({f,to,el:l})
    const d=document.createElementNS(NS,'circle'); d.setAttribute('r','3'); d.setAttribute('fill',C.particle); fG.append(d)
    const s=performance.now(),dur=500
    const an=(t)=>{ const p=Math.min(1,(t-s)/dur); d.setAttribute('cx',a.x+(b.x-a.x)*p); d.setAttribute('cy',a.y+(b.y-a.y)*p); if(p<1)requestAnimationFrame(an); else{d.remove();l.style.opacity='0.35'} }
    requestAnimationFrame(an) }
  function layout(){ const ls=[...agents.values()].filter(a=>a.st!=='exit'); const n=ls.length; if(!n)return
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){ const a=ls[i],b=ls[j]; let dx=b.x-a.x,dy=b.y-a.y; const d2=dx*dx+dy*dy||1,d=Math.sqrt(d2),f=2600/d2; dx/=d;dy/=d; a.vx-=dx*f;a.vy-=dy*f;b.vx+=dx*f;b.vy+=dy*f }
    for(const a of ls){ a.vx+=(W/2-a.x)*.003; a.vy+=(H/2-a.y)*.003; a.vx*=.82;a.vy*=.82; a.x+=a.vx;a.y+=a.vy; a.x=Math.max(30,Math.min(W-30,a.x)); a.y=Math.max(30,Math.min(H-30,a.y)); a.el.setAttribute('transform',`translate(${a.x},${a.y})`) }
    for(const e of edges){ const a=agents.get(e.f),b=agents.get(e.to); if(a&&b)e.el.setAttribute('points',`${a.x},${a.y} ${b.x},${b.y}`) } }

  let cur=0,timer=null
  function tick(){ if(cur>=evts.length){stop();return}
    const e=evts[cur],k=e.kind??'?',tk=e.tick??cur,frame=R.arrival_frame(tk*16),who=aid(cur)
    const ln=document.createElement('div'); ln.style.cssText=`padding:1px 0;border-bottom:1px solid #21262d;color:${k==='spawn'?C.spawn:k==='down'?C.down:k==='restart'?C.restart:k==='exit'?C.exit:C.text}`
    // a feed event names its own spec (the actor's name) and task; the
    // recorded log has neither, so the label prefers what the event carries
    const lbl=SPEC_SPECS[who]||e.spec
    const sp=lbl?` (${lbl})`:''
    const tsk=e.task!=null?(' #'+e.task):''
    ln.textContent=`[${String(frame).padStart(2,'0')}] ${k}${sp}${tsk} t=${tk}`; stream.append(ln); stream.scrollTop=stream.scrollHeight
    if(k==='spawn'){addA(who);assignSpec(who,cur)}
    else if(k==='down')setSt(who,'down')
    else if(k==='restart')setSt(who,'restarting')
    else if(k==='exit')setSt(who,'exit')
    else if(k==='deliver'||k==='delivers')deliver(who,aid(cur+1))
    cur++; fe.textContent=`${cur}/${evts.length}`
    const alive=[...agents.values()].filter(a=>a.st!=='exit').length
    stats.innerHTML=`<span style="color:${C.active}">\u25CF ${alive} agents</span><span>\u26A1 ${cur} events</span><span>\u23F1 frame ${frame}</span>` }
  let raf=null, playT0=0, nextIx=0
  const SLOW=25 // 25 law-frames per second of wall clock: one law tick (16 frames) every 400 ms
  function frame(ts){ if(!raf)return
    const lawF=(ts-playT0)/SLOW
    while(nextIx<evts.length && (evts[nextIx].tick??nextIx)*16<=lawF){ tick(); nextIx++ }
    layout()
    if(nextIx>=evts.length){ raf=null; pb.textContent='\u25B6'; return }
    raf=requestAnimationFrame(frame) }
  function stop(){ if(raf){cancelAnimationFrame(raf);raf=null} pb.textContent='\u25B6' }
  function reset(){ stop(); cur=0; nextIx=0; stream.replaceChildren(); nG.replaceChildren(); eG.replaceChildren(); fG.replaceChildren(); edges.length=0; agents.clear(); fe.textContent=`0/${evts.length}`
    pb.textContent='\u23F8'; playT0=performance.now(); raf=requestAnimationFrame(frame) }

  for(let i=0;i<evts.length;i++){ cur=i; tick() }
  let s0=0; const settle=()=>{ layout(); if(s0++<50)requestAnimationFrame(settle) }; requestAnimationFrame(settle)

  // the log can grow -- and the Queen now publishes a live feed. The feed is
  // tried first on every poll (15 s: seconds-level realtime, unauthenticated,
  // CORS-open); only when it fails or answers a foreign format does the old
  // recorded-log re-fetch run, and at its own old 5-minute cadence. Both
  // deliver events down the SAME tick() path above -- the feed's carry
  // kind/tick plus task/spec labels, which tick() now draws.
  const FEED='https://trios-agent-server-production.up.railway.app/queen/public-feed'
  const logUrl=new URL('./logs/recorded_log.json', import.meta.url)
  let lastSeq=evts.reduce((m,e)=>Math.max(m,Number(e.seq)||0),0), lastLog=0
  const grow=(add)=>{ if(!add.length)return
    for(const e of add){ evts.push(e); const s=Number(e.seq)||0; if(s>lastSeq)lastSeq=s }
    for(let i=0;i<add.length;i++) tick()
    let s1=0; const st=()=>{ layout(); if(s1++<40)requestAnimationFrame(st) }; requestAnimationFrame(st) }
  async function pollFeed(){
    const r=await fetch(FEED+'?since='+lastSeq+'&v='+Date.now()); if(!r.ok)throw new Error('http '+r.status)
    const d=await r.json()
    if(d.format!=='t27f-queen-feed-v1'||!Array.isArray(d.events))throw new Error('foreign format')
    let add=d.events.filter(e=>(Number(e.seq)||0)>lastSeq)
    if(d.resync&&Number.isFinite(d.cursor)){ lastSeq=d.cursor; return } // ask again from where the bus says
    // a live answer whose events are ALL behind our cursor means the bus
    // restarted (seed -> live, seq from 1 again): replay it from its start
    if(!d.seed&&!add.length&&d.events.length&&d.events.every(e=>(Number(e.seq)||0)<=lastSeq)){ lastSeq=0; add=d.events }
    grow(add) }
  async function pollLog(){
    const r=await fetch(logUrl+'?v='+Date.now()); if(!r.ok)return
    const d=await r.json(); if(d.format!==log.format||!Array.isArray(d.events))return
    if(d.events.length>evts.length) grow(d.events.slice(evts.length)) }
  setInterval(async()=>{ try{ await pollFeed() }catch{ // feed down or foreign: the recorded log, at its own cadence
      if(Date.now()-lastLog<300000)return; lastLog=Date.now(); try{ await pollLog() }catch{} } },15000)

  return { refused:false, message: gxLayout.line + ` ${evts.length} events on the law's tick grid, ${agents.size} named agents at display frame rate; below: pull requests, activity and the queen lane, live from the GitHub API. Press play to watch the replay.` }
}

// Encode one log event as its 32-byte #12005 record at offset o. Fields the log does not
// carry are written 0 -- the module, never this file, is the judge of what then stands.
function gxPut(v, o, ev) {
  const k = typeof ev.kind === 'number' ? ev.kind : GX_EV[ev.kind]
  if (k === undefined) return false
  const d = typeof ev.deliver === 'number' ? ev.deliver : GX_DV[ev.deliver]
  v.setUint8(o, k); v.setUint8(o + 1, d === undefined ? 0 : d)
  v.setUint8(o + 2, ev.reason ?? 0); v.setUint8(o + 3, 0)
  v.setUint32(o + 4, ev.task ?? ev.task_no ?? 0, true)
  v.setUint32(o + 8, ev.seq ?? ev.tick ?? 0, true)
  v.setUint32(o + 12, ev.spec ?? ev.spec_id ?? 0, true)
  v.setBigUint64(o + 16, BigInt(ev.from ?? ev.from_pid ?? 0), true)
  v.setBigUint64(o + 24, BigInt(ev.to ?? ev.to_pid ?? 0), true)
  return true
}

// Feed the module: the load path first (the whole recorded log through gx_replay, accepted
// only if the module answers ok and holds nodes), else the live path (gx_apply_event per
// event, staged one record at a time). A partial load path stands in the law's own
// semantics, so the live path is entered only behind a gx_reset that clears it.
function gxFeed(R, evts) {
  if (!(R.memory instanceof WebAssembly.Memory)) return null
  const base = R.gx_log_ptr(), cap = R.gx_log_cap(), v = new DataView(R.memory.buffer)
  let tried = false
  if (typeof R.gx_replay === 'function' && evts.length * 32 <= cap) {
    tried = true; let ok = true
    for (let i = 0; i < evts.length && ok; i++) ok = gxPut(v, base + i * 32, evts[i])
    if (ok && R.gx_log_set_len(evts.length * 32) && R.gx_replay(base, evts.length * 32) === 0
        && R.gx_node_count() > 0) return { mode: 'replay' }
  }
  if (typeof R.gx_apply_event !== 'function') return null
  if (tried && (typeof R.gx_reset !== 'function' || R.gx_reset() !== 0)) return null
  if (!gxPut(v, base, evts[0]) || !R.gx_log_set_len(32)) return null
  const k = typeof evts[0].kind === 'number' ? evts[0].kind : GX_EV[evts[0].kind]
  if (R.gx_apply_event(k, evts[0].tick ?? 0, evts[0].task ?? evts[0].task_no ?? 0) !== 0
      || R.gx_node_count() === 0) return null
  return { mode: 'apply' }
}

// Node i's name from the module's own bytes: the tagged form renders the id the law wrote
// as 8 little-endian bytes (the page renders the number, the module converts none); every
// other name decodes as text -- a spec path the fixture's join named.
function gxName(R, i) {
  const p = R.gx_node_name_ptr(i), n = R.gx_node_name_len(i)
  if (!n) return 'node ' + i
  const buf = R.memory.buffer, b = new Uint8Array(buf, p, n)
  if (n === 11 && b[2] === 58)
    return String.fromCharCode(b[0], b[1]) + ':' + new DataView(buf).getBigUint64(p + 3, true)
  return new TextDecoder().decode(b)
}

// The gx page: the same chrome as the simulation, but the graph is the law's own topology.
function gxReplay(el, R, log, evts, feed) {
  document.getElementById('live-kf') || document.head.append(Object.assign(document.createElement('style'),{id:'live-kf',textContent:'@keyframes live-pulse{from{r:14;opacity:.7}to{r:44;opacity:0}}'}))
  const wrap=document.createElement('div'); wrap.style.cssText='display:grid;grid-template-columns:1fr 260px;gap:10px'
  const gc=document.createElement('div'); gc.style.cssText='position:relative;border:1px solid #30363d;border-radius:8px;background:#0d1117;overflow:hidden;min-height:400px'
  const sc=document.createElement('div'); sc.style.cssText='display:flex;flex-direction:column;gap:8px'
  const W=640,H=400
  const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.setAttribute('width','100%'); svg.setAttribute('height','100%'); svg.style.cssText='position:absolute;inset:0'
  const eG=document.createElementNS(NS,'g'),nG=document.createElementNS(NS,'g'),fG=document.createElementNS(NS,'g')
  svg.append(eG,nG,fG); gc.append(svg)
  const lg=document.createElement('div'); lg.style.cssText='position:absolute;bottom:6px;left:8px;display:flex;gap:10px;font:11px monospace;color:#8b949e;pointer-events:none;flex-wrap:wrap'
  for(let k=0;k<5;k++){const s=document.createElement('span');s.innerHTML=`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${GX_KC[k]};margin-right:3px"></span>${GX_KN[k]}`;lg.append(s)}
  gc.append(lg)
  const tag=document.createElement('div'); tag.style.cssText='position:absolute;top:6px;right:8px;font:10px monospace;color:#8b949e;pointer-events:none'
  tag.textContent='gx '+(feed.mode==='replay'?'replay: the whole log':'apply: per event'); gc.append(tag)
  const stream=document.createElement('div'); stream.style.cssText='flex:1;border:1px solid #30363d;border-radius:8px;padding:6px;overflow-y:auto;font:11px/1.5 monospace;color:#8b949e;max-height:320px'
  const stats=document.createElement('div'); stats.style.cssText='border:1px solid #30363d;border-radius:8px;padding:6px 10px;font:11px monospace;color:#8b949e;display:flex;gap:12px;flex-wrap:wrap'
  sc.append(stream,stats)
  wrap.append(gc,sc)
  const tl=document.createElement('div'); tl.style.cssText='border:1px solid #30363d;border-radius:8px;padding:6px;display:flex;align-items:center;gap:6px;margin-top:8px'
  const mkB=(t,fn)=>{const b=document.createElement('button');b.textContent=t;b.onclick=fn;b.style.cssText='background:#21262d;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;padding:3px 8px;cursor:pointer;font:12px monospace';return b}
  const pb=mkB('\u25B6',()=>reset())
  const fe=document.createElement('span'); fe.style.cssText='color:#8b949e;font:11px monospace;margin-left:auto'
  tl.append(pb,fe)
  const fleet=document.createElement('div')
  el.replaceChildren(wrap,tl,fleet)
  mountFleet(fleet)

  const nodes=[],edges=[],prods=[]
  let lastN=0,lastM=0,cur=0,nextIx=0,lastFrame=0,rr=0,raf=null,playT0=0
  const SLOW=25 // 25 law-frames per second of wall clock: one law tick (16 frames) every 400 ms
  const dv=()=>new DataView(R.memory.buffer)
  function addNode(i){ const kind=R.gx_node_kind(i); if(kind>=5)return
    const a={kind,x:GX_SEED[kind][0]+(Math.random()-.5)*90,y:GX_SEED[kind][1]+(Math.random()-.5)*70,vx:0,vy:0}
    const g=document.createElementNS(NS,'g')
    const c=document.createElementNS(NS,'circle'); c.setAttribute('r','2'); c.setAttribute('fill',GX_KC[kind]); c.setAttribute('stroke','#c9d1d9'); c.setAttribute('stroke-width','1'); c.style.transition='r .3s'
    const t=document.createElementNS(NS,'text'); t.setAttribute('y','-16'); t.setAttribute('text-anchor','middle'); t.setAttribute('fill',C.text); t.setAttribute('font-size','8'); t.setAttribute('font-family','monospace'); t.textContent=gxName(R,i)
    g.append(c,t); nG.append(g); a.el=g; a.c=c; nodes.push(a)
    requestAnimationFrame(()=>c.setAttribute('r','9'))
    const p=document.createElementNS(NS,'circle'); p.setAttribute('r','9'); p.setAttribute('fill','none'); p.setAttribute('stroke',GX_KC[kind]); p.setAttribute('stroke-width','2'); p.style.cssText='animation:live-pulse .8s ease-out forwards'; g.append(p); setTimeout(()=>p.remove(),900) }
  function addEdge(j){ const kind=R.gx_edge_kind(j); if(kind>=6)return
    const f=R.gx_edge_from(j),to=R.gx_edge_to(j); if(f>=nodes.length||to>=nodes.length)return
    const l=document.createElementNS(NS,'polyline'); l.setAttribute('stroke',kind===3?C.particle:C.edge); l.setAttribute('stroke-width',kind===3?'1.5':'1'); l.setAttribute('fill','none'); eG.append(l)
    edges.push({f,to,el:l}); if(kind===3)prods.push(edges.length-1) }
  function statsUp(){ stats.innerHTML=`<span style="color:${C.active}">\u25CF ${R.gx_node_count()} nodes</span><span>\u2192 ${R.gx_edge_count()} edges</span><span>\u26A1 ${cur} events</span><span>\u23F1 frame ${lastFrame}</span>` }
  function sync(){ const N=R.gx_node_count(),M=R.gx_edge_count()
    for(let i=lastN;i<N;i++)addNode(i)
    for(let j=lastM;j<M;j++)addEdge(j)
    lastN=N; lastM=M; statsUp() }
  function fire(ix){ const e=edges[ix]; if(!e)return
    const a=nodes[e.f],b=nodes[e.to]; if(!a||!b)return
    const d=document.createElementNS(NS,'circle'); d.setAttribute('r','3'); d.setAttribute('fill',C.particle); fG.append(d)
    const s=performance.now(),dur=500
    const an=(t)=>{ const p=Math.min(1,(t-s)/dur); d.setAttribute('cx',a.x+(b.x-a.x)*p); d.setAttribute('cy',a.y+(b.y-a.y)*p); if(p<1)requestAnimationFrame(an); else d.remove() }
    requestAnimationFrame(an) }
  function layout(){ const n=nodes.length; if(!n)return
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){ const a=nodes[i],b=nodes[j]; let dx=b.x-a.x,dy=b.y-a.y; const d2=dx*dx+dy*dy||1; if(d2>25600)continue; const d=Math.sqrt(d2),f=2600/d2; dx/=d;dy/=d; a.vx-=dx*f;a.vy-=dy*f;b.vx+=dx*f;b.vy+=dy*f }
    for(const e of edges){ const a=nodes[e.f],b=nodes[e.to]; if(!a||!b)continue
      let dx=b.x-a.x,dy=b.y-a.y; const d=Math.sqrt(dx*dx+dy*dy)||1,f=(d-70)*.006; dx/=d;dy/=d; a.vx+=dx*f;a.vy+=dy*f;b.vx-=dx*f;b.vy-=dy*f }
    for(const a of nodes){ a.vx+=(GX_SEED[a.kind][0]-a.x)*.004; a.vy+=(GX_SEED[a.kind][1]-a.y)*.004; a.vx*=.82;a.vy*=.82; a.x+=a.vx;a.y+=a.vy; a.x=Math.max(24,Math.min(W-24,a.x)); a.y=Math.max(24,Math.min(H-24,a.y)); a.el.setAttribute('transform',`translate(${a.x},${a.y})`) }
    for(const e of edges){ const a=nodes[e.f],b=nodes[e.to]; if(a&&b)e.el.setAttribute('points',`${a.x},${a.y} ${b.x},${b.y}`) } }
  function apply(e){ if(!gxPut(dv(),R.gx_log_ptr(),e))return -1
    const k=typeof e.kind==='number'?e.kind:GX_EV[e.kind]
    return R.gx_apply_event(k,e.tick??0,e.task??e.task_no??0) }
  function tick(){ if(cur>=evts.length){stop();return}
    const e=evts[cur],k=e.kind??'?',tk=e.tick??cur,frame=R.arrival_frame(tk*16)
    lastFrame=frame
    const before=feed.mode==='apply'?R.gx_node_count():0
    let code=0
    if(feed.mode==='apply'){ code=apply(e); sync() } else statsUp()
    const grew=feed.mode==='apply'?R.gx_node_count()-before:0
    const ln=document.createElement('div'); ln.style.cssText=`padding:1px 0;border-bottom:1px solid #21262d;color:${k==='spawn'?C.spawn:k==='down'?C.down:k==='restart'?C.restart:k==='exit'?C.exit:C.text}`
    ln.textContent=`[${String(frame).padStart(2,'0')}] ${k}${grew>0?` +${grew}`:''}${code>0?` (refused ${code})`:''} t=${tk}`; stream.append(ln); stream.scrollTop=stream.scrollHeight
    if(k==='deliver'||k==='delivers'){ if(prods.length)fire(prods[rr++%prods.length]); else if(edges.length)fire(rr++%edges.length) }
    cur++; fe.textContent=`${cur}/${evts.length}` }
  function frame(ts){ if(!raf)return
    const lawF=(ts-playT0)/SLOW
    while(nextIx<evts.length && (evts[nextIx].tick??nextIx)*16<=lawF){ tick(); nextIx++ }
    layout()
    if(nextIx>=evts.length){ raf=null; pb.textContent='\u25B6'; return }
    raf=requestAnimationFrame(frame) }
  function stop(){ if(raf){cancelAnimationFrame(raf);raf=null} pb.textContent='\u25B6' }
  function settle(){ let s0=0; const st=()=>{ layout(); if(s0++<50)requestAnimationFrame(st) }; requestAnimationFrame(st) }
  function reset(){ stop(); cur=0; nextIx=0; stream.replaceChildren(); fe.textContent=`0/${evts.length}`
    if(feed.mode==='apply'){
      if(typeof R.gx_reset==='function'){ if(R.gx_reset()!==0)return }
      nG.replaceChildren(); eG.replaceChildren(); fG.replaceChildren(); edges.length=0; prods.length=0; nodes.length=0; lastN=0; lastM=0
      gxPut(dv(),R.gx_log_ptr(),evts[0]); R.gx_log_set_len(32); apply(evts[0]); sync(); cur=1; nextIx=1 }
    settle(); pb.textContent='\u23F8'; playT0=performance.now(); raf=requestAnimationFrame(frame) }

  if(feed.mode==='replay') sync()
  else { const e=evts[0],fr=R.arrival_frame((e.tick??0)*16); lastFrame=fr
    const ln=document.createElement('div'); ln.style.cssText=`padding:1px 0;border-bottom:1px solid #21262d;color:${e.kind==='spawn'?C.spawn:C.text}`
    ln.textContent=`[${String(fr).padStart(2,'0')}] ${e.kind} +${R.gx_node_count()} t=${e.tick??0}`; stream.append(ln)
    cur=1; nextIx=1; sync(); pb.textContent='\u23F8'; playT0=performance.now(); raf=requestAnimationFrame(frame) }
  settle()

  // the log can grow: re-fetch it cache-busted every 5 minutes; the load path re-feeds the
  // whole log behind a gx_reset (the law's rows stand on a refusal, never roll back), the
  // live path applies just the delta through gx_apply_event
  const logUrl=new URL('./logs/recorded_log.json', import.meta.url)
  setInterval(async()=>{ try{ const r=await fetch(logUrl+'?v='+Date.now()); if(!r.ok)return
    const d=await r.json(); if(d.format!==log.format||!Array.isArray(d.events)||d.events.length<=evts.length)return
    const add=d.events.slice(evts.length); for(const e of add) evts.push(e)
    if(feed.mode==='replay'&&typeof R.gx_reset==='function'&&R.gx_reset()===0){
      const base=R.gx_log_ptr(),v=dv(); let ok=true
      for(let i=0;i<d.events.length&&ok;i++) ok=gxPut(v,base+i*32,d.events[i])
      if(ok&&R.gx_log_set_len(d.events.length*32)&&R.gx_replay(base,d.events.length*32)===0) sync() }
    else if(feed.mode==='apply') for(const e of add){ apply(e); sync() }
    let s1=0; const st=()=>{ layout(); if(s1++<40)requestAnimationFrame(st) }; requestAnimationFrame(st) }catch{} },300000)

  return { refused:false, message:`${evts.length} events through gx_${feed.mode==='replay'?'replay':'apply_event'}: ${R.gx_node_count()} nodes and ${R.gx_edge_count()} edges read from the module's own WorkGraph (specs/t27f/live_graph_export.t27, t27#12148) -- the law's real topology, not a simulation; below: the fleet, live from the GitHub API. Press play to watch the timeline.` }
}

// The fleet monitor: real pull requests and real repository activity from the
// GitHub API, refreshed on a slow cycle that respects the anonymous rate limit
// (60/h). No keys, no server: the visitor's browser reads the public API.
const REPO='Trinity-S-AI-DNA/t27', API=`https://api.github.com/repos/${REPO}`
const FC={ok:'#3fb950',info:'#58a6ff',dim:'#8b949e',text:'#c9d1d9',bg:'#0d1117',border:'#30363d'}
function mountFleet(root){
  root.style.cssText='margin-top:12px'
  const hd=document.createElement('div'); hd.style.cssText=`display:flex;align-items:center;gap:10px;font:12px monospace;color:${FC.text};padding:8px 12px;border:1px solid ${FC.border};border-radius:8px;background:${FC.bg}`
  const t=document.createElement('strong'); t.textContent='THE FLEET, LIVE'; t.style.color=FC.text
  const n=document.createElement('span'); n.style.color=FC.dim; n.textContent='loading...'
  const tm=document.createElement('span'); tm.style.cssText=`color:${FC.dim};margin-left:auto;font-size:11px`
  hd.append(t,n,tm); root.append(hd)
  const cols=document.createElement('div'); cols.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px'
  const prP=document.createElement('div'); prP.style.cssText=`border:1px solid ${FC.border};border-radius:8px;background:${FC.bg};padding:10px;overflow-y:auto;max-height:420px`
  const acP=document.createElement('div'); acP.style.cssText=`border:1px solid ${FC.border};border-radius:8px;background:${FC.bg};padding:10px;overflow-y:auto;max-height:420px`
  const h1=document.createElement('div'); h1.textContent='pull requests'; h1.style.cssText=`color:${FC.text};font:bold 12px monospace;margin:0 0 8px`
  const h2=document.createElement('div'); h2.textContent='activity'; h2.style.cssText=`color:${FC.text};font:bold 12px monospace;margin:0 0 8px`
  const qP=document.createElement('div'); qP.style.cssText=`border:1px solid ${FC.border};border-radius:8px;background:${FC.bg};padding:10px;overflow-y:auto;max-height:240px;margin-top:8px`
  const h3=document.createElement('div'); h3.textContent='the queen -- dispatches and crons (workflow runs)'; h3.style.cssText=`color:${FC.text};font:bold 12px monospace;margin:0 0 8px`
  qP.append(h3)
  // The model fleet: the $0 capacity matrix, STATIC from the probe receipt on
  // t27#12170 (2026-10-25). The pool flapped 8->2 alive cells within hours that
  // day, so the law (specs/queen/api_fleet.t27) is re-probe, never replace the
  // pool. The live scanner lands as t27#12375; this panel switches to its fresh
  // matrix then. No fetch, no timer: a dated snapshot, honestly labelled.
  const flP=document.createElement('div'); flP.style.cssText=`border:1px solid ${FC.border};border-radius:8px;background:${FC.bg};padding:10px;margin-top:8px`
  const h5=document.createElement('div'); h5.textContent='the model fleet -- $0 capacity (probe 2026-10-25)'; h5.style.cssText=`color:${FC.text};font:bold 12px monospace;margin:0 0 8px`
  const flT=document.createElement('table'); flT.style.cssText='width:100%;border-collapse:collapse;font:11px monospace'
  const flRows=[['route','model','keys alive','price'],
    ['zai-coding-plan','glm-5.3-flash','probe subagent','$0'],
    ['z.ai','glm-4.5-flash','5/5 keys that day','$0'],
    ['z.ai','glm-4.7-flash','3 probed','$0'],
    ['zai-coding-plan','glm-5.3-highspeed','REFUSED by plan','--']]
  flRows.forEach((r,ri)=>{ const tr=document.createElement('tr')
    r.forEach((c,ci)=>{ const td=document.createElement('td'); td.style.cssText='padding:3px 6px;border-bottom:1px solid #21262d;color:'+FC.text
      if(ri===0)td.style.color=FC.dim
      else if(c.indexOf('REFUSED')===0)td.style.color='#f85149'
      else if(c==='$0')td.style.color='#d29922'
      td.textContent=c; tr.append(td) })
    flT.append(tr) })
  const flF=document.createElement('div'); flF.style.cssText=`color:${FC.dim};font:10px monospace;margin-top:6px`
  flF.textContent='re-probe before routing; 401 refuses the ROUTE, never the key (specs/queen/api_fleet.t27)'
  const flC=document.createElement('div'); flC.style.cssText=`color:${FC.dim};font:10px monospace;margin-top:3px`
  flC.textContent='static matrix from the probe receipt (t27#12170); the live scanner lands as t27#12375 and this panel switches to its fresh matrix then'
  flP.append(h5,flT,flF,flC)
  const vid=document.createElement('div'); vid.style.cssText=`border:1px solid ${FC.border};border-radius:8px;background:${FC.bg};padding:10px;margin-top:8px`
  const h4=document.createElement('div'); h4.textContent='recorded footage -- 900 frames from frame_render.t27, rendered by the lab (110.11 fps, 9.08 ms/frame)'; h4.style.cssText=`color:${FC.text};font:bold 12px monospace;margin:0 0 8px`
  const v=document.createElement('video'); v.controls=true; v.playsInline=true; v.preload='metadata'
  v.style.cssText='width:100%;max-height:420px;border-radius:6px;background:#000'
  v.src='./queen-live.mp4'
  vid.append(h4,v)
  prP.append(h1); acP.append(h2); cols.append(prP,acP); root.append(cols,qP,flP,vid)
  const etags=new Map()
  const gh=async(p)=>{ const h={Accept:'application/vnd.github+json'}; if(etags.has(p))h['If-None-Match']=etags.get(p)
    const r=await fetch(API+p,{headers:h})
    const et=r.headers.get('etag'); if(et)etags.set(p,et)
    if(r.status===304) return null
    if(r.status===403||r.status===429) throw Object.assign(new Error('rate-limited'),{rl:true})
    if(!r.ok) throw new Error('http '+r.status); return r.json() }
  const ago=(iso)=>{ const s=Math.floor((Date.now()-new Date(iso))/1e3)
    return s<60?s+'s':s<3600?Math.floor(s/60)+'m':s<86400?Math.floor(s/3600)+'h':Math.floor(s/86400)+'d' }
  async function prs(){ const L=await gh('/pulls?state=all&sort=updated&direction=desc&per_page=12')
    if(!L)return
    n.textContent=L.filter(p=>p.state==='open').length+' open'
    prP.querySelectorAll('.pr').forEach(e=>e.remove())
    for(const p of L){ const m=p.merged_at!==null, st=m?'MERGED':p.state==='open'?'OPEN':'CLOSED', c=m?FC.ok:p.state==='open'?FC.info:FC.dim
      const d=document.createElement('div'); d.className='pr'; d.style.cssText=`padding:7px;border:1px solid ${FC.border};border-radius:6px;margin-bottom:6px;font:11px monospace;display:flex;gap:8px;align-items:baseline`
      const b=document.createElement('span'); b.style.cssText=`color:${c};flex-shrink:0`; b.textContent=m?'\u2713':p.state==='open'?'\u25CF':'\u2717'
      const w=document.createElement('div'); w.style.cssText='flex:1;min-width:0'
      const tt=document.createElement('div'); tt.style.cssText=`color:${FC.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`; tt.textContent='#'+p.number+' '+(p.title||'').split('(')[0].trim()
      const mt=document.createElement('div'); mt.style.cssText=`color:${FC.dim};font-size:10px`; mt.textContent=st+' \u00B7 '+p.head.ref.replace(/^.*\//,'')+' \u00B7 '+ago(p.updated_at)
      w.append(tt,mt); d.append(b,w); prP.append(d) } }
  async function acts(){ const L=await gh('/events?per_page=20')
    if(!L)return
    acP.querySelectorAll('.ac').forEach(e=>e.remove())
    for(const ev of L.slice(0,12)){ const d=document.createElement('div'); d.className='ac'
      d.style.cssText=`padding:4px 0;border-bottom:1px solid #21262d;font:11px monospace;color:${FC.dim};display:flex;gap:6px`
      const ts=document.createElement('span'); ts.style.cssText='flex-shrink:0;min-width:30px'; ts.textContent=ago(ev.created_at)
      const tx=document.createElement('span'); tx.style.cssText='color:'+FC.text+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis'
      let s=''
      if(ev.type==='PushEvent') s=ev.actor.login+' pushed '+(ev.payload.size||1)+' to '+String(ev.payload.ref||'').replace('refs/heads/','')
      else if(ev.type==='PullRequestEvent') s='PR #'+ev.payload.number+' '+ev.payload.action+((ev.payload.pull_request||{}).merged?' -- MERGED':'')
      else if(ev.type==='IssueCommentEvent') s=ev.actor.login+' commented on #'+ev.payload.issue.number
      else if(ev.type==='CreateEvent') s=ev.actor.login+' created '+ev.payload.ref_type+(ev.payload.ref?' '+ev.payload.ref:'')
      else s=String(ev.type||'').replace('Event','')
      tx.textContent=s; d.append(ts,tx); acP.append(d) } }
  async function queen(){ const L=await gh('/actions/runs?per_page=10')
    if(!L)return
    qP.querySelectorAll('.qw').forEach(e=>e.remove())
    for(const r of (L.workflow_runs||[]).slice(0,8)){
      const d=document.createElement('div'); d.className='qw'
      d.style.cssText=`padding:4px 0;border-bottom:1px solid #21262d;font:11px monospace;color:${FC.dim};display:flex;gap:6px`
      const ts=document.createElement('span'); ts.style.cssText='flex-shrink:0;min-width:30px'; ts.textContent=ago(r.created_at)
      const b=document.createElement('span'); b.style.cssText='flex-shrink:0'
      const pend=r.status!=='completed', ok=r.conclusion==='success'
      b.textContent=pend?'\u25CB':ok?'\u2713':r.conclusion==='cancelled'?'\u2717':'!'
      b.style.color=pend?FC.dim:ok?FC.ok:'#f85149'
      const tx=document.createElement('span'); tx.style.cssText='color:'+FC.text+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis'
      tx.textContent=r.name+' ['+(r.event==='schedule'?'cron':r.event)+']'+(r.head_branch?' @'+r.head_branch:'')
      d.append(ts,b,tx); qP.append(d) } }
  let wait=150, nextAt=0
  async function refresh(){ tm.textContent='\u21BB refreshing...'
    const R=await Promise.allSettled([prs(),acts(),queen()])
    const bad=R.find(r=>r.status==='rejected'&&r.reason&&r.reason.rl)
    wait=bad?Math.min(wait*2,900):150; nextAt=Date.now()+wait*1000
    tm.textContent=bad?('rate-limited, backing off '+Math.round(wait/60)+'m'):('live \u00B7 cycle '+Math.round(wait/60)+'m') }
  setInterval(()=>{ if(!nextAt)return; const s=Math.max(0,Math.ceil((nextAt-Date.now())/1000))
    tm.textContent=s>0?('next refresh '+s+'s'):'\u21BB refreshing...' },1000)
  refresh()
}
