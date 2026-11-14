#!/usr/bin/env node
// Builds the issue to PR to spec index the Queen reads for gHashTag/t27 (specs/queen/t27_issue_proof.t27).
// The index is a hint only: the browser reader re-reads every claim (merged PR, closing line,
// spec at head, seal hash and tests, required checks) from GitHub before it paints a cell.
// Usage: node scripts/t27-coverage-index.mjs --seals <checkout>/.trinity/seals --out issues.json
//          [--prev issues.json] [--author LOGIN ...] [--since ISO] [--repo gHashTag/t27] [--budget-ms 600000]
// Env, all optional: T27_API_BASE (default https://api.github.com), T27_REQUEST_TIMEOUT_MS (default 30000),
//   T27_RETRY_MS (default 2000, the retry backoff unit).
// PRs are read oldest first. When the time budget ends or a PR cannot be read, the work done so far is still
// written and the watermark stays below the first PR left open, so the next run continues from there.
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const args=process.argv.slice(2),opt=(k,d)=>{const i=args.indexOf(k);return i<0?d:args[i+1];};
const many=k=>args.flatMap((a,i)=>a===k?[args[i+1]]:[]);
const repo=opt('--repo','gHashTag/t27'),sealsDir=opt('--seals'),out=opt('--out'),prev=opt('--prev'),since=opt('--since');
const authors=new Set(many('--author'));
if(!sealsDir||!out)throw new Error('--seals and --out are required');
const budget=Number(opt('--budget-ms',600000)),over=()=>process.uptime()*1000>=budget;
const base=process.env.T27_API_BASE||'https://api.github.com',timeout=Number(process.env.T27_REQUEST_TIMEOUT_MS||30000),retryMs=Number(process.env.T27_RETRY_MS||2000);
const token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN||'';
// A 5xx, 429, 403 or 422 (GitHub answers 422 for a PR file list it cannot build right now), a network error,
// a timeout and a body that is not JSON are all retried.
const gh=async path=>{
  for(let attempt=0;;attempt++){
    let status=0,err='';
    try{
      const r=await fetch(`${base}/repos/${repo}${path}`,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:`Bearer ${token}`}:{})},signal:AbortSignal.timeout(timeout)});
      if(r.ok)return await r.json();
      status=r.status;r.body?.cancel().catch(()=>{});
    }catch(e){err=e.name==='TimeoutError'?'timeout':e.message;}
    if(attempt<3&&(!status||status>=500||status===429||status===403||status===422))await new Promise(f=>setTimeout(f,retryMs*(attempt+1)));
    else throw new Error(`${path}: ${status||err}`);
  }
};
// Same keyword rule as the reader: a closing keyword directly before the issue number.
export const closes=body=>[...new Set([...(body??'').matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#([1-9][0-9]*)(?![0-9])/gi)].map(m=>Number(m[1])))];

// spec path -> seal file, from the seals checked out at the head.
const sealOf=new Map();
for(const name of readdirSync(sealsDir).filter(n=>n.endsWith('.json'))){
  try{const d=JSON.parse(readFileSync(join(sealsDir,name),'utf8'));if(typeof d.spec_path==='string'&&!sealOf.has(d.spec_path))sealOf.set(d.spec_path,`.trinity/seals/${name}`);}catch{}
}
const index=prev&&existsSync(prev)?JSON.parse(readFileSync(prev,'utf8')):{repo,generated_at:null,watermark:null,issues:{}};
if(index.repo!==repo)throw new Error('previous index belongs to another repository');
const from=since??index.watermark??'1970-01-01T00:00:00Z';
// List first (no files), then read oldest first, so a run that stops early has finished a prefix of the work.
const listed=new Map();
for(let page=1;page<=100;page++){
  const prs=await gh(`/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`);
  if(!prs.length)break;
  let older=true;
  for(const pr of prs){
    if(pr.updated_at<=from)continue;
    older=false;
    if(!listed.has(pr.number)||pr.updated_at>listed.get(pr.number).updated_at)listed.set(pr.number,pr);
  }
  if(older)break;
}
const todo=[...listed.values()].sort((a,b)=>a.updated_at<b.updated_at?-1:a.updated_at>b.updated_at?1:a.number-b.number);
const BUDGET=Symbol('budget');
// GitHub lists at most 3000 files of a PR (30 pages); the list is used as it is after that.
const filesOf=async number=>{
  const files=[];
  for(let fp=1;fp<=30;fp++){
    if(over())return BUDGET;
    const part=await gh(`/pulls/${number}/files?per_page=100&page=${fp}`);
    files.push(...part);
    if(part.length<100)break;
  }
  return files;
};
// Drop what a PR claimed before, so an edited description cannot leave a stale claim behind.
const drop=number=>{for(const [n,list] of Object.entries(index.issues)){const kept=list.filter(e=>e.pr!==number);if(kept.length)index.issues[n]=kept;else delete index.issues[n];}};
// pending: PRs not finished (appended in ascending order). added: entries put in each issue during this run.
const pending=[],unreadable=[],added={};
let seen=0,ranOut=false;
for(let i=0;i<todo.length;i++){
  const pr=todo[i];
  if(over()){ranOut=true;pending.push(...todo.slice(i));break;}
  if(!pr.merged_at||!pr.merge_commit_sha)continue;
  if(authors.size&&!authors.has(pr.user?.login))continue;
  const issues=closes(pr.body);
  if(!issues.length){drop(pr.number);continue;}
  let files;
  try{files=await filesOf(pr.number);}catch(e){console.log(`unreadable PR #${pr.number}: ${e.message}`);unreadable.push(pr.number);pending.push(pr);continue;}
  if(files===BUDGET){ranOut=true;pending.push(...todo.slice(i));break;}
  drop(pr.number);
  const specs=files.filter(f=>f.filename.endsWith('.t27')&&f.status!=='removed').map(f=>({path:f.filename,seal:sealOf.get(f.filename)})).filter(s=>s.seal);
  // A spec of this PR without a seal is simply not listed: the PR then lists fewer specs than it touched
  // and the reader cannot prove it, so the issue stays unknown until the spec is sealed.
  const touchedPaths=files.filter(f=>f.filename.endsWith('.t27')&&f.status!=='removed').map(f=>f.filename);
  // PRs are read oldest first; a new entry goes before the ones added in this run, so the order is newest first.
  for(const n of issues){const list=index.issues[n]??=[];list.splice(list.length-(added[n]??0),0,{pr:pr.number,sha:pr.merge_commit_sha,touched:touchedPaths,specs:touchedPaths.length===specs.length?specs:[]});added[n]=(added[n]??0)+1;}
  seen++;
}
// Watermark: the newest listed PR when nothing is pending. Otherwise the newest listed time strictly below the
// oldest pending PR, else `from`: a time shared with a pending PR would hide that PR from the next run.
const oldest=pending[0]?.updated_at;
const watermark=oldest===undefined?(todo.length?todo.at(-1).updated_at:from):todo.reduce((w,p)=>p.updated_at<oldest&&p.updated_at>w?p.updated_at:w,from);
// A spec sealed after its PR merged must count from the next run, so every entry's specs are
// derived again from the seals at the head, not only for the PRs read in this run.
for(const list of Object.values(index.issues))for(const e of list){
  if(!Array.isArray(e.touched))continue;
  const found=e.touched.map(path=>({path,seal:sealOf.get(path)}));
  e.specs=found.every(x=>x.seal)?found:[];
}
index.watermark=watermark;index.generated_at=new Date().toISOString();
index.issues=Object.fromEntries(Object.entries(index.issues).sort((a,b)=>Number(a[0])-Number(b[0])));
writeFileSync(out,JSON.stringify(index,null,1)+'\n');
const why=[ranOut&&'budget',unreadable.length&&`unreadable: ${unreadable.map(n=>`#${n}`).join(' ')}`].filter(Boolean).join(', ');
console.log(`index: ${Object.keys(index.issues).length} issues; ${seen} PRs read since ${from}${pending.length?`; watermark ${watermark}; ${pending.length} pending (${why})`:''}`);
