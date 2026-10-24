// /t27f/live/: the visual replay engine. Agents appear as colored circles on
// a force-directed graph, deliveries animate as particles along edges, and a
// timeline replays the 24-event recording. Every frame number comes from the
// wasm module's arrival_frame law. See PROVENANCE.txt.
const url = new URL('t27f.wasm', import.meta.url)
const refuse = (m) => ({ refused: true, message: m })
const NS = 'http://www.w3.org/2000/svg'
const C = { bg:'#0d1117',text:'#8b949e',bright:'#c9d1d9',spawn:'#3fb950',active:'#58a6ff',down:'#f85149',restart:'#d29922',exit:'#484f58',edge:'#30363d',particle:'#f0883e' }
const col = (st) => st==='spawning'?C.spawn:st==='down'?C.down:st==='restarting'?C.restart:st==='exit'?C.exit:C.active

export async function replay(el, log) {
  let R
  try { R = (await WebAssembly.instantiateStreaming(fetch(url),{}).catch(async()=>WebAssembly.instantiate(await(await fetch(url)).arrayBuffer(),{}))).instance.exports }
  catch { return refuse('t27f.wasm did not load -- the closure build has not landed yet.') }
  if (typeof R.arrival_frame !== 'function') return refuse('the module lacks arrival_frame.')
  const evts = Array.isArray(log.events) ? log.events : []
  if (!evts.length) return refuse('the recorded log holds no events.')

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
  el.replaceChildren(wrap,tl)

  const agents=new Map(),edges=[]
  const aid=(i)=>`a${(i%4)+1}`
  function addA(id){ if(agents.has(id))return
    const a={id,st:'spawning',x:W/2+(Math.random()-.5)*100,y:H/2+(Math.random()-.5)*100,vx:0,vy:0}
    const g=document.createElementNS(NS,'g')
    const c=document.createElementNS(NS,'circle'); c.setAttribute('r','2'); c.setAttribute('fill',C.spawn); c.setAttribute('stroke','#c9d1d9'); c.setAttribute('stroke-width','1'); c.style.transition='r .3s,fill .3s'
    const t=document.createElementNS(NS,'text'); t.setAttribute('y','-18'); t.setAttribute('text-anchor','middle'); t.setAttribute('fill',C.text); t.setAttribute('font-size','9'); t.setAttribute('font-family','monospace'); t.textContent=id
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
    ln.textContent=`[${String(frame).padStart(2,'0')}] ${k} t=${tk}`; stream.append(ln); stream.scrollTop=stream.scrollHeight
    if(k==='spawn')addA(who)
    else if(k==='down')setSt(who,'down')
    else if(k==='restart')setSt(who,'restarting')
    else if(k==='exit')setSt(who,'exit')
    else if(k==='deliver'||k==='delivers')deliver(who,aid(cur+1))
    cur++; fe.textContent=`${cur}/${evts.length}`
    const alive=[...agents.values()].filter(a=>a.st!=='exit').length
    stats.innerHTML=`<span style="color:${C.active}">\u25CF ${alive} agents</span><span>\u26A1 ${cur} events</span><span>\u23F1 frame ${frame}</span>` }
  function stop(){ if(timer){clearInterval(timer);timer=null} pb.textContent='\u25B6' }
  function reset(){ stop(); cur=0; stream.replaceChildren(); nG.replaceChildren(); eG.replaceChildren(); fG.replaceChildren(); edges.length=0; agents.clear(); fe.textContent=`0/${evts.length}`
    pb.textContent='\u23F8'; timer=setInterval(tick,420); tick() }

  for(let i=0;i<evts.length;i++){ cur=i; tick() }
  let s0=0; const settle=()=>{ layout(); if(s0++<50)requestAnimationFrame(settle) }; requestAnimationFrame(settle)

  return { refused:false, message:`${evts.length} events, ${agents.size} agents. Press play to watch the replay.` }
}
