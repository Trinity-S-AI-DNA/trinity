// Tests for scripts/t27-coverage-index.mjs. The script runs at import time, so each test starts it as a child
// process (async, never spawnSync: the mock GitHub API lives in this process) against a local mock server.
// Run: node --test scripts/t27-coverage-index.test.mjs
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {execFile} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const SCRIPT=fileURLToPath(new URL('./t27-coverage-index.mjs',import.meta.url));
const sleep=ms=>new Promise(f=>setTimeout(f,ms));
const mocks=[],dirs=[];
after(async()=>{
  for(const m of mocks)await m.close();
  for(const d of dirs)rmSync(d,{recursive:true,force:true});
});

// A closed PR as the GitHub list endpoint returns it.
const pr=(number,updated_at,body,{merged=true,login='dev'}={})=>({number,updated_at,body,user:{login},merged_at:merged?updated_at:null,merge_commit_sha:merged?`sha${number}`:null});
const file=(filename,status='modified')=>({filename,status});

// Mock of GET /repos/o/r/pulls and /repos/o/r/pulls/N/files. onFiles may answer a files request itself
// (return true when it did); otherwise the files come from `files[N]`.
const startMock=async({prs,files={},onFiles}={})=>{
  const log=[],hits=new Map(),state={delay:0};
  const server=http.createServer(async(req,res)=>{
    log.push(req.url);
    const hit=(hits.get(req.url)??0)+1;hits.set(req.url,hit);
    const send=(status,body)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
    const u=new URL(req.url,'http://mock'),page=Number(u.searchParams.get('page')??1);
    if(u.pathname==='/repos/o/r/pulls'){
      const sorted=[...prs].sort((a,b)=>a.updated_at<b.updated_at?1:a.updated_at>b.updated_at?-1:b.number-a.number);
      return send(200,sorted.slice((page-1)*100,page*100));
    }
    const m=u.pathname.match(/^\/repos\/o\/r\/pulls\/(\d+)\/files$/);
    if(m){
      if(state.delay)await sleep(state.delay);
      const n=Number(m[1]);
      if(onFiles&&await onFiles({n,page,hit,send,res,req}))return;
      return send(200,(files[n]??[]).slice((page-1)*100,page*100));
    }
    send(404,{message:'Not Found'});
  });
  await new Promise(f=>server.listen(0,'127.0.0.1',f));
  const mock={
    base:`http://127.0.0.1:${server.address().port}`,log,hits,state,
    filesRequests:()=>log.filter(u=>u.includes('/files')),
    close:async()=>{server.closeAllConnections();await new Promise(f=>server.close(f));},
  };
  mocks.push(mock);
  return mock;
};

// A temp workspace with a seals directory: specs/a.t27 and specs/b.t27 are sealed, specs/c.t27 is not.
const workspace=()=>{
  const dir=mkdtempSync(join(tmpdir(),'t27-coverage-index-test-'));
  dirs.push(dir);
  const seals=join(dir,'seals');
  mkdirSync(seals);
  writeFileSync(join(seals,'a.json'),JSON.stringify({spec_path:'specs/a.t27'}));
  writeFileSync(join(seals,'b.json'),JSON.stringify({spec_path:'specs/b.t27'}));
  writeFileSync(join(seals,'broken.json'),'{not json');
  return {dir,seals,out:join(dir,'issues.json'),prev:join(dir,'prev.json')};
};
const SEAL_A='.trinity/seals/a.json',SEAL_B='.trinity/seals/b.json';
const emptyIndex=(extra={})=>({repo:'o/r',generated_at:'2026-01-01T00:00:00.000Z',watermark:null,issues:{},...extra});
const writePrev=(w,index)=>writeFileSync(w.prev,JSON.stringify(index));

const run=(mock,w,extra=[],env={})=>new Promise(resolve=>{
  execFile(process.execPath,[SCRIPT,'--repo','o/r','--seals',w.seals,'--out',w.out,...extra],
    {env:{...process.env,GH_TOKEN:'',GITHUB_TOKEN:'',T27_API_BASE:mock.base,T27_RETRY_MS:'1',...env},timeout:60000},
    (err,stdout,stderr)=>resolve({code:err?(err.code??1):0,stdout,stderr}));
});
// The written index without generated_at (a clock value), after checking that it is there.
const result=w=>{
  assert.ok(existsSync(w.out),'issues.json was not written');
  const {generated_at,...rest}=JSON.parse(readFileSync(w.out,'utf8'));
  assert.equal(typeof generated_at,'string');
  return rest;
};

test('healthy run: entries, order and watermark match the previous behaviour',async()=>{
  const mock=await startMock({
    prs:[
      pr(101,'2026-03-01T00:00:00Z','Closes #10'),
      pr(102,'2026-03-02T00:00:00Z','Fixes #10 and closes #11'),
      pr(103,'2026-03-03T00:00:00Z','Closes #12',{merged:false}),
      pr(91,'2026-03-04T00:00:00Z','No closing keyword now'),
      pr(80,'2026-01-15T00:00:00Z','Closes #99'),
    ],
    files:{
      101:[file('specs/a.t27'),file('docs/readme.md')],
      102:[file('specs/a.t27'),file('specs/c.t27','added'),file('specs/b.t27','removed')],
    },
  });
  const w=workspace();
  writePrev(w,emptyIndex({watermark:'2026-02-01T00:00:00Z',issues:{
    5:[{pr:90,sha:'sha90',touched:['specs/a.t27'],specs:[]}],
    7:[{pr:91,sha:'sha91',touched:['specs/a.t27'],specs:[{path:'specs/a.t27',seal:SEAL_A}]}],
    10:[{pr:50,sha:'sha50',touched:[],specs:[]}],
  }}));
  const r=await run(mock,w,['--prev',w.prev]);
  assert.equal(r.code,0,r.stderr);
  assert.deepEqual(result(w),{
    repo:'o/r',
    watermark:'2026-03-04T00:00:00Z',
    issues:{
      5:[{pr:90,sha:'sha90',touched:['specs/a.t27'],specs:[{path:'specs/a.t27',seal:SEAL_A}]}],
      10:[
        {pr:50,sha:'sha50',touched:[],specs:[]},
        {pr:102,sha:'sha102',touched:['specs/a.t27','specs/c.t27'],specs:[]},
        {pr:101,sha:'sha101',touched:['specs/a.t27'],specs:[{path:'specs/a.t27',seal:SEAL_A}]},
      ],
      11:[{pr:102,sha:'sha102',touched:['specs/a.t27','specs/c.t27'],specs:[]}],
    },
  });
  // Issue keys are sorted by number.
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(w.out,'utf8')).issues),['5','10','11']);
  assert.match(r.stdout,/index: 3 issues; 2 PRs read since 2026-02-01T00:00:00Z/);
  assert.doesNotMatch(r.stdout,/pending/);
  // PR 80 is older than the watermark: not read. PR 103 is not merged: no files request.
  assert.deepEqual(mock.filesRequests().map(u=>u.split('?')[0]),['/repos/o/r/pulls/101/files','/repos/o/r/pulls/102/files']);
});

test('a 422 on the files page is retried and then succeeds',async()=>{
  const mock=await startMock({
    prs:[pr(201,'2026-03-01T00:00:00Z','Closes #20')],
    files:{201:[file('specs/b.t27')]},
    onFiles:({hit,send})=>{if(hit<=2){send(422,{message:'Unprocessable Entity'});return true;}},
  });
  const w=workspace();
  const r=await run(mock,w);
  assert.equal(r.code,0,r.stderr);
  assert.deepEqual(result(w).issues,{20:[{pr:201,sha:'sha201',touched:['specs/b.t27'],specs:[{path:'specs/b.t27',seal:SEAL_B}]}]});
  assert.equal(mock.hits.get('/repos/o/r/pulls/201/files?per_page=100&page=1'),3);
});

test('an unreadable PR keeps its old claims and holds the watermark',async()=>{
  const oldClaim={pr:302,sha:'old302',touched:['specs/a.t27'],specs:[{path:'specs/a.t27',seal:SEAL_A}]};
  const mock=await startMock({
    prs:[
      pr(301,'2026-04-01T00:00:00Z','Closes #20'),
      pr(302,'2026-04-02T00:00:00Z','Closes #21'),
      pr(303,'2026-04-03T00:00:00Z','Closes #22'),
    ],
    files:{301:[file('specs/a.t27')],303:[file('specs/b.t27')]},
    onFiles:({n,send})=>{if(n===302){send(422,{message:'Unprocessable Entity'});return true;}},
  });
  const w=workspace();
  writePrev(w,emptyIndex({watermark:'2026-03-01T00:00:00Z',issues:{21:[oldClaim]}}));
  const r=await run(mock,w,['--prev',w.prev]);
  assert.equal(r.code,0,r.stderr);
  const got=result(w);
  assert.deepEqual(got.issues[21],[oldClaim]);
  assert.equal(got.issues[20][0].pr,301);
  assert.equal(got.issues[22][0].pr,303);
  assert.equal(got.watermark,'2026-04-01T00:00:00Z');
  assert.match(r.stdout,/unreadable PR #302/);
  assert.match(r.stdout,/1 pending \(unreadable: #302\)/);
});

test('PRs sharing the boundary time: the watermark stays below it, the next run indexes both',async()=>{
  const T='2026-05-02T00:00:00Z';
  const prs=[
    pr(401,'2026-05-01T00:00:00Z','Closes #40'),
    pr(402,T,'Closes #41'),
    pr(403,T,'Closes #42'),
  ];
  const files={401:[file('specs/a.t27')],402:[file('specs/a.t27')],403:[file('specs/b.t27')]};
  const w=workspace();
  const broken=await startMock({prs,files,onFiles:({n,send})=>{if(n===402){send(422,{});return true;}}});
  const r1=await run(broken,w);
  assert.equal(r1.code,0,r1.stderr);
  const first=result(w);
  assert.equal(first.watermark,'2026-05-01T00:00:00Z');
  assert.deepEqual(Object.keys(first.issues),['40','42']);
  assert.match(r1.stdout,/#402/);
  // Second run, healthy server, from the first output.
  const healthy=await startMock({prs,files});
  writeFileSync(w.prev,readFileSync(w.out));
  const r2=await run(healthy,w,['--prev',w.prev]);
  assert.equal(r2.code,0,r2.stderr);
  const second=result(w);
  assert.equal(second.watermark,T);
  assert.deepEqual(Object.keys(second.issues),['40','41','42']);
  // PR 403 was read in both runs: still exactly one entry.
  for(const n of ['40','41','42'])assert.equal(second.issues[n].length,1);
});

test('the budget ends the run: progress is written and the next run resumes',async()=>{
  const prs=[],files={};
  for(let i=1;i<=6;i++){prs.push(pr(500+i,`2026-06-0${i}T00:00:00Z`,`Closes #${50+i}`));files[500+i]=[file('specs/a.t27')];}
  const mock=await startMock({prs,files});
  mock.state.delay=600;
  const w=workspace();
  const r1=await run(mock,w,['--budget-ms','1500']);
  assert.equal(r1.code,0,r1.stderr);
  const part=result(w);
  // Done work is a prefix of the oldest PRs (each closes its own issue): PRs 501..500+k.
  const k=Object.keys(part.issues).length;
  assert.ok(k>=1&&k<6,`expected a partial run, indexed ${k} PRs`);
  assert.deepEqual(Object.keys(part.issues).map(Number),Array.from({length:k},(_,i)=>51+i));
  assert.equal(part.watermark,`2026-06-0${k}T00:00:00Z`);
  assert.match(r1.stdout,/pending \(budget\)/);
  // Resume with no delay and a large budget.
  mock.state.delay=0;
  writeFileSync(w.prev,readFileSync(w.out));
  const r2=await run(mock,w,['--prev',w.prev,'--budget-ms','600000']);
  assert.equal(r2.code,0,r2.stderr);
  const resumed=result(w);
  // One full run on a fresh index gives the same result.
  const full=workspace();
  const r3=await run(mock,full);
  assert.equal(r3.code,0,r3.stderr);
  assert.deepEqual(resumed,result(full));
  assert.equal(resumed.watermark,'2026-06-06T00:00:00Z');
  assert.equal(Object.keys(resumed.issues).length,6);
});

test('file paging stops at page 30',async()=>{
  const mock=await startMock({
    prs:[pr(601,'2026-07-01T00:00:00Z','Closes #60')],
    onFiles:({page,send})=>{
      send(200,Array.from({length:100},(_,i)=>file(page===1&&i===0?'specs/a.t27':`docs/p${page}-${i}.md`)));
      return true;
    },
  });
  const w=workspace();
  const r=await run(mock,w);
  assert.equal(r.code,0,r.stderr);
  assert.equal(mock.filesRequests().length,30);
  assert.ok(!mock.log.some(u=>u.includes('page=31')));
  assert.deepEqual(result(w).issues,{60:[{pr:601,sha:'sha601',touched:['specs/a.t27'],specs:[{path:'specs/a.t27',seal:SEAL_A}]}]});
});

test('a request that times out is retried, not fatal',async()=>{
  const mock=await startMock({
    prs:[pr(701,'2026-08-01T00:00:00Z','Closes #70')],
    files:{701:[file('specs/a.t27')]},
    // The first answer never comes (the connection is closed when the client gives up).
    onFiles:({hit,res})=>{if(hit===1){res.on('error',()=>{});return new Promise(()=>{});}},
  });
  const w=workspace();
  const r=await run(mock,w,[],{T27_REQUEST_TIMEOUT_MS:'500'});
  assert.equal(r.code,0,r.stderr);
  assert.deepEqual(result(w).issues,{70:[{pr:701,sha:'sha701',touched:['specs/a.t27'],specs:[{path:'specs/a.t27',seal:SEAL_A}]}]});
  assert.equal(mock.hits.get('/repos/o/r/pulls/701/files?per_page=100&page=1'),2);
});

test('seals are re-derived when the run stops early',async()=>{
  const mock=await startMock({
    prs:[pr(801,'2026-09-01T00:00:00Z','Closes #80')],
    files:{801:[file('specs/a.t27')]},
  });
  const w=workspace();
  writePrev(w,emptyIndex({watermark:'2026-08-01T00:00:00Z',issues:{
    9:[{pr:700,sha:'sha700',touched:['specs/a.t27'],specs:[]}],
    10:[{pr:701,sha:'sha701',touched:['specs/a.t27','specs/c.t27'],specs:[{path:'specs/a.t27',seal:SEAL_A}]}],
  }}));
  const r=await run(mock,w,['--prev',w.prev,'--budget-ms','0']);
  assert.equal(r.code,0,r.stderr);
  const got=result(w);
  assert.deepEqual(got.issues[9][0].specs,[{path:'specs/a.t27',seal:SEAL_A}]);
  assert.deepEqual(got.issues[10][0].specs,[]);
  assert.equal(got.issues[80],undefined);
  assert.equal(got.watermark,'2026-08-01T00:00:00Z');
  assert.equal(mock.filesRequests().length,0);
  assert.match(r.stdout,/1 pending \(budget\)/);
});

test('--since overrides the watermark',async()=>{
  const mock=await startMock({
    prs:[
      pr(901,'2026-05-20T00:00:00Z','Closes #90'),
      pr(902,'2026-06-05T00:00:00Z','Closes #91'),
      pr(903,'2026-06-15T00:00:00Z','Closes #92'),
    ],
    files:{901:[file('specs/a.t27')],902:[file('specs/a.t27')],903:[file('specs/b.t27')]},
  });
  const w=workspace();
  writePrev(w,emptyIndex({watermark:'2026-06-10T00:00:00Z'}));
  const r=await run(mock,w,['--prev',w.prev,'--since','2026-06-01T00:00:00Z']);
  assert.equal(r.code,0,r.stderr);
  const got=result(w);
  assert.deepEqual(Object.keys(got.issues),['91','92']);
  assert.equal(got.watermark,'2026-06-15T00:00:00Z');
  assert.match(r.stdout,/since 2026-06-01T00:00:00Z/);
});
