// The world scan's contract: the spec parses and its own tests hold, the pure decisions
// refuse what the spec says to refuse, "t27" means a declaration and not a file extension,
// and the manifest merge never touches a founding source. No network here; the scan is
// exercised by .github/workflows/t27-world-scan.yml against the real GitHub.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadCompiler} from '../scripts/agents-from-specs.mjs';
import * as d from '../scripts/discover-t27-worlds.mjs';

const analyze=await loadCompiler(readFileSync('public/t27/t27_compiler.wasm'));
const specText=readFileSync(d.SPEC,'utf8');
const spec=d.loadDiscoverySpec(analyze,specText);
assert.deepEqual(spec.problems,[],'the vendored contract has no problems');
assert.equal(spec.moduleName,d.EXPECTED_MODULE);
assert.ok(spec.tests.tests>=4&&spec.tests.asserts>=12&&!spec.tests.failures.length,'the spec carries tests and they hold');
const f=spec.fields;
assert.ok(f.OWNERS.includes('gHashTag'),'the founding owner stays scanned');
assert.equal(f.FOUNDING.length,5);
// A spec whose own assert fails must not load: typecheck.ok stays true for `assert 1 > 2`.
const broken=d.loadDiscoverySpec(analyze,specText.replace('assert MIN_DECLARATIONS >= 1;','assert MIN_DECLARATIONS >= 2;'));
assert.ok(broken.problems.some(p=>/assert/.test(p)),'a failing spec test is a problem, not a warning');
// A bare `;` line is a statement, not a comment. Ahead of `module` the artifact vendored
// before #4471 dropped the module line and still reported `typecheck.ok` with zero errors
// (measured 2026-09-12 while writing this spec) -- the silent form of the defect, caught
// here only because the loader counts discards. The compiler's own build refuses the file
// and names the token instead (measured 2026-09-21: `Unexpected token in expression:
// Semicolon (';')`). Louder, same contract, so the assertion is on the contract.
const bare=specText.replace('module catalog_discovery;',';\nmodule catalog_discovery;');
assert.notEqual(bare,specText,'the fixture found the module line');
const bareProblems=d.loadDiscoverySpec(analyze,bare).problems;
assert.ok(bareProblems.some(p=>/Semicolon/.test(p)),'a bare ; line is reported, not silently discarded');
assert.ok(bareProblems.some(p=>/module must be/.test(p)),'and the module it swallowed is named');
assert.ok(d.loadDiscoverySpec(analyze,specText.replace('module catalog_discovery;','module other;')).problems.some(p=>/module/.test(p)));

// The manifest's founding sources are exactly the spec's FOUNDING list.
const manifest=JSON.parse(readFileSync('public/t27/manifest.json','utf8'));
const founding=manifest.repos.filter(r=>!r.discoveredAt).map(r=>r.repo.includes('/')?r.repo:`ghashtag/${r.repo}`).sort();
assert.deepEqual(founding,[...f.FOUNDING].sort(),'every hand-vendored source is a founding source and vice versa');
for(const r of manifest.repos.filter(r=>r.discoveredAt)){
  assert.ok(!f.FOUNDING.includes(r.repo.includes('/')?r.repo:`ghashtag/${r.repo}`),`${r.repo}: a founding source cannot come from the scan`);
  assert.equal(manifest.specs.filter(e=>e.repo===r.repo).length,r.specs,`${r.repo}: manifest.repos count matches its entries`);
  assert.ok(manifest.specs.filter(e=>e.repo===r.repo).every(e=>e.path.startsWith(`${r.repo}/`)),`${r.repo}: entries live under their own prefix`);
}
if(manifest.discovery){
  assert.equal(manifest.discovery.spec.sha256,createHash('sha256').update(specText).digest('hex'),'the catalog was vendored under the committed contract');
  assert.deepEqual(manifest.discovery.worlds.map(w=>w.label).sort(),manifest.repos.filter(r=>r.discoveredAt).map(r=>r.repo).sort());
}

// Identity: public API data, never trusted by name alone.
const raw=(over={})=>({full_name:'gHashTag/trios',html_url:'https://github.com/gHashTag/trios',owner:{login:'gHashTag'},private:false,fork:false,archived:false,has_issues:true,default_branch:'main',description:'Trinity Git Orchestrator',...over});
assert.equal(d.repoIdentity(raw()).repo,'ghashtag/trios');
assert.equal(d.repoIdentity(raw({html_url:'https://evil.invalid/gHashTag/trios'})),null,'a foreign html_url is not a GitHub repository');
assert.equal(d.repoIdentity(raw({owner:{login:'someone'}})),null,'owner must match the full name');
assert.equal(d.repoIdentity(raw({full_name:'a/b?x=1'})),null);
assert.equal(d.repoIdentity(raw({default_branch:'ma in'})),null);

// Verdicts follow the spec, not the script.
const v=(over)=>d.candidateVerdict(d.repoIdentity(raw(over)),f);
assert.equal(v({private:true}).skip,'private');
assert.equal(v({fork:true}).skip,'fork');
assert.equal(v({full_name:'gHashTag/ghashtag.github.io',html_url:'https://github.com/gHashTag/ghashtag.github.io'}).skip,'mirror','build output is never a source');
assert.equal(v({archived:true}).skip,null,'an archived repository keeps its specs');
assert.deepEqual(v({full_name:'gHashTag/t27',html_url:'https://github.com/gHashTag/t27'}),{skip:null,founding:true,mirror:false},'a founding source is reported, not skipped, and never vendored');
assert.deepEqual(v({}),{skip:null,founding:false,mirror:false});

// Trees: .t27 blobs only, worktree copies and oversized files set aside, path order.
const tree={truncated:false,tree:[{path:'specs/b.t27',type:'blob',size:10},{path:'specs/a.t27',type:'blob',size:10},{path:'.claude/worktrees/x/specs/a.t27',type:'blob',size:10},{path:'big.t27',type:'blob',size:f.MAX_FILE_BYTES+1},{path:'specs',type:'tree'},{path:'README.md',type:'blob',size:1},{path:'src/x.t27',type:'blob',size:5}]};
const listing=d.t27PathsOf(tree,f);
assert.deepEqual(listing,{paths:['specs/a.t27','specs/b.t27','src/x.t27'],skippedLarge:1,truncated:false});
assert.deepEqual(d.probeOrder(['zz/spec.t27','specs/b.t27','apps/x/specs/c.t27','a.t27'],3),['apps/x/specs/c.t27','specs/b.t27','a.t27'],'specs/ paths are probed first, then the rest');
const many=Array.from({length:64},(_,i)=>`specs/${String(i).padStart(2,'0')}.t27`);
const picks=d.probeOrder(many,8);
assert.equal(picks.length,8);assert.equal(picks[0],'specs/00.t27');assert.equal(picks.at(-1),'specs/63.t27');
assert.ok(picks.some(p=>p>'specs/30.t27'&&p<'specs/40.t27'),'the probe samples the whole list, not its front');
assert.deepEqual(d.probeOrder(many.slice(0,3),8),many.slice(0,3),'a short list is probed whole');
assert.deepEqual(d.probeOrder(many,0),[]);

// t27 is a declaration, not an extension: the compiler turns any text into an empty module.
assert.equal(d.declarationsOf(analyze('Copyright (c) 2019\nPermission is hereby granted, free of charge, to any person obtaining a copy.\n')),0,'a licence text is not a spec');
assert.equal(d.declarationsOf(analyze('{"a":1}')),0);
assert.equal(d.declarationsOf(analyze('')),0);
assert.ok(d.declarationsOf(analyze(readFileSync('public/t27/files/specs/demos/hello_world.t27','utf8')))>=f.MIN_DECLARATIONS,'hello_world qualifies');
assert.ok(d.declarationsOf(analyze(specText))>=f.MIN_DECLARATIONS,'this contract qualifies');

// Prefixes: gHashTag keeps the founding convention, another owner carries its name.
assert.equal(d.worldPrefix('ghashtag/trios'),'trios');
assert.equal(d.worldPrefix('dmitrii-f-t27/trinity-memory'),'dmitrii-f-t27/trinity-memory');
assert.throws(()=>d.worldPrefix('../x'));assert.throws(()=>d.worldPrefix('a/b/c'));

// Merge: replaces one world, keeps every other entry byte for byte, refuses a founding source.
const sha=s=>createHash('sha256').update(s).digest('hex');
const entry=(path,repo,text)=>({path,category:path.split('/').slice(0,2).join('/'),name:path.split('/').pop().replace(/\.t27$/,''),module:null,lines:text.split('\n').length,bytes:Buffer.byteLength(text),description:null,health:'ok',tokens:1,nodes:1,depth:1,loss:0,tcErrors:0,failedBackends:[],outBytes:{},repo,kinds:{},tags:[`src/${repo}`,'health/ok'],summary:''});
const base={generatedFrom:{repo:'gHashTag/t27',commit:'a'.repeat(40),shortCommit:'aaaaaaaaa',specsOrCompilerDirty:false},wasmBytes:1,specCount:2,totalLines:2,categories:{},repos:[{repo:'t27',commit:'a'.repeat(40),specs:1},{repo:'tri-net',commit:'b'.repeat(40),specs:1}],duplicatesSkipped:0,tags:{},health:{ok:2,warn:0,fail:0},backendFailures:{},featured:'specs/demos/hello_world.t27',totals:{tokens:2,nodes:2,lossAffected:0,tcAffected:0},specs:[entry('specs/demos/hello_world.t27','t27','module a;'),entry('tri-net/specs/x.t27','tri-net','module b;')]};
const world={repo:'dmitrii-f-t27/trinity-memory',commit:'c'.repeat(40),branch:'master',at:'2026-09-12T00:00:00.000Z',specSha256:sha(specText),files:2,duplicatesSkipped:0,skippedLarge:0};
const merged=d.mergeWorld(base,world,[entry('dmitrii-f-t27/trinity-memory/specs/memory/bridge.t27','dmitrii-f-t27/trinity-memory','module bridge;'),entry('dmitrii-f-t27/trinity-memory/t27/rtl/a.t27','dmitrii-f-t27/trinity-memory','module a;')],f);
assert.deepEqual(merged.specs.slice(0,2),base.specs,'founding entries stay first and untouched');
assert.equal(merged.specCount,4);assert.equal(merged.repos.length,3);assert.equal(merged.repos[2].discoveredAt,world.at);
assert.equal(merged.categories['dmitrii-f-t27/trinity-memory'],2);assert.equal(merged.tags['src/dmitrii-f-t27/trinity-memory'],2);
assert.deepEqual(Object.keys(merged),['generatedFrom','wasmBytes','specCount','totalLines','categories','repos','duplicatesSkipped','duplicates','tags','health','backendFailures','featured','totals','discovery','specs'],'manifest keys keep the sync order, discovery before specs');
assert.equal(base.specs.length,2,'the input manifest is not mutated');
const again=d.mergeWorld(merged,{...world,commit:'d'.repeat(40)},[entry('dmitrii-f-t27/trinity-memory/specs/memory/bridge.t27','dmitrii-f-t27/trinity-memory','module bridge2;')],f);
assert.equal(again.specCount,3,'re-vendoring a world replaces its entries instead of adding to them');
assert.equal(again.repos.find(r=>r.repo==='dmitrii-f-t27/trinity-memory').commit,'d'.repeat(40));
assert.equal(again.discovery.worlds.length,1);
assert.throws(()=>d.mergeWorld(base,{...world,repo:'ghashtag/t27'},[],f),/founding/);
assert.throws(()=>d.mergeWorld(base,world,[entry('tri-net/specs/x.t27','dmitrii-f-t27/trinity-memory','x')],f),/outside/);
assert.throws(()=>d.mergeWorld(base,world,[entry('dmitrii-f-t27/trinity-memory/a.t27','trios','x')],f),/label/);
assert.throws(()=>d.mergeWorld(base,{...world,commit:'short'},[],f),/sha/);
const empty=d.mergeWorld(base,world,[],f);
assert.equal(empty.repos.length,2,'a world without new bytes leaves no record');

// The workflow runs the scan the spec describes and commits the catalog, never deploys.
const wf=readFileSync('../../.github/workflows/t27-world-scan.yml','utf8');
for(const step of ['discover -- scan','discover -- vendor','core -- index','atlas -- scan --discovery','atlas -- build','check:discovery','check:spec-catalog','check:queen-catalog','git push'])assert.ok(wf.includes(step),`workflow runs ${step}`);
assert.doesNotMatch(wf,/GHIO_TOKEN|ghashtag\.github\.io|uses: \.\/\.github\/workflows\/deploy/,'the scan never publishes; deploy-site.yml stays manual');
// The workflows it may start are two checks on the pull request it opened: the
// token's own events start nothing, so without them the refresh sat BLOCKED with
// no required check (PR #1176), and #1535 merged with no website check at all --
// its course specs deleted, the publisher refusing t27.ai. Any other dispatch, a
// deploy above all, is refused; the website checks run on the refresh branch.
const ALLOWED=['pr-blog-report.yml','website-checks.yml'];
const dispatches=[...wf.matchAll(/gh workflow run\s+(\S+)/g)].map(m=>m[1]);
assert.deepEqual(dispatches,ALLOWED,'the scan dispatches the work-report check and the website checks, nothing else');
assert.match(wf,/gh workflow run website-checks\.yml --ref "\$BRANCH"/,'the website checks run on the refresh branch, not on main');
for(const bad of ['gh workflow run deploy-site.yml','gh workflow run pr-blog-report.yml\n          gh workflow run deploy-site.yml'])assert.notDeepEqual([...wf.replace(/gh workflow run pr-blog-report\.yml[^\n]*/,bad).matchAll(/gh workflow run\s+(\S+)/g)].map(m=>m[1]),ALLOWED,'the dispatch check refuses a deploy');
// The checks the scan dispatches decide for themselves whether the site is
// touched, and one always-present job reports: `website gate` is what branch
// protection requires. A path filter on the trigger made the check absent on
// most PRs, and a `printf | grep -q` under pipefail read #1539's 1236-file
// change as "no site" (grep stops at the first match, printf takes SIGPIPE).
const wc=readFileSync('../../.github/workflows/website-checks.yml','utf8');
const onAt=wc.indexOf('\non:'),jobsAt=wc.indexOf('\njobs:');
assert.ok(onAt>-1&&jobsAt>onAt,'website-checks has a top-level on: before jobs: (else the trigger check below reads nothing)');
const triggers=wc.slice(onAt,jobsAt);
assert.match(triggers,/pull_request:/,'the trigger block is the one read');
assert.doesNotMatch(triggers,/paths:/,'website-checks runs on every PR; scope decides, not a trigger path filter');
// The gate needs every check group by name, so a group added to the workflow
// but not to this list reports "pass" while its checks never ran.
const GROUPS=['checks-pure','checks-lang-en','checks-lang-ru','checks-browser-a','checks-browser-b'];
assert.match(wc,new RegExp(`\\n  gate:\\n    name: website gate\\n    needs: \\[scope, ${GROUPS.join(', ')}\\]\\n    if: always\\(\\)`),'website gate always reports, after scope and every check group');
for(const g of GROUPS)assert.match(wc,new RegExp(`\\n  ${g}:\\n`),`check group ${g} exists`);
assert.match(wc,/if: needs\.scope\.outputs\.site == 'true'/,'the heavy checks run when scope says the site changed');
assert.match(wc,/grep -Eq "\$SITE_PATHS" <<< "\$FILES"/,'scope reads the file list without a pipe into grep -q');
assert.doesNotMatch(wc,/\| grep -Eq "\$SITE_PATHS"/,'no pipe into grep -q: SIGPIPE under pipefail reads a big change as none');
console.log(`t27 world discovery: PASS (contract ${spec.tests.tests} tests / ${spec.tests.asserts} asserts, owners ${f.OWNERS.join(', ')}, ${manifest.repos.filter(r=>r.discoveredAt).length} scanned worlds in the catalog)`);
