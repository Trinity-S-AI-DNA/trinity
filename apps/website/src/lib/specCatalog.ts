import type {SpecEntry,SpecManifest} from './t27Compiler.ts';
import {validCoreRepo} from './sharedSpecCore.ts';

/** One public address per source; embed and revision pins are viewing context. */
/** `world` narrows the Explorer's list to one source repository, in the atlas's key (`ghashtag/t27`): the world the Queen's header has chosen. */
export function specExplorerHash(path:string,options:{embedded?:boolean;sha256?:string;world?:string|null;view?:'graph'|null}={}):string {
  if(!path.endsWith('.t27')||/[\\%?#:]/.test(path)||Array.from(path).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)||path.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error('Invalid catalog spec path');
  if(options.sha256!==undefined&&!/^[a-f0-9]{64}$/.test(options.sha256))throw new Error('Invalid catalog SHA-256');
  const params=new URLSearchParams({spec:path});
  if(options.embedded)params.set('embed','1');
  if(options.sha256)params.set('sha256',options.sha256);
  if(options.world){if(!validCoreRepo(options.world))throw new Error('Invalid catalog world');params.set('world',options.world);}
  if(options.view==='graph')params.set('view','graph');
  return `#/specs?${params}`;
}

export function canonicalSpecUrl(path:string):string {
  return `https://t27.ai/${specExplorerHash(path)}`;
}

/** An explicit broken link must never silently show a different featured spec. */
export function resolveManifestSpec(manifest:SpecManifest,path:string|null):SpecEntry {
  if(path===null){
    const first=manifest.specs.find(s=>s.featured)??manifest.specs[0];
    if(!first)throw new Error('Spec catalog is empty');
    return first;
  }
  specExplorerHash(path);
  const matches=manifest.specs.filter(s=>s.path===path);
  if(matches.length!==1)throw new Error(`Spec catalog path is missing or ambiguous: ${path}`);
  return matches[0];
}
