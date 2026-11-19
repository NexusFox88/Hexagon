import {it,expect} from 'vitest';
import {harnessCatalogEntry,harnessVerifications} from './catalog.js';
it('never treats a registry image or registration as verified execution',()=>{
 const h=harnessCatalogEntry({id:'custom.x',version:'1',protocol:'codex-v1',image:{reference:'repo@sha256:one'},command:['codex']});
 expect(h.distribution).toBe('registry');expect(h.verification).toEqual([]);expect(h.model_providers).toEqual(['openai-responses']);
});
it('matches evidence only to exact image, adapter and command',()=>{
 const row={image:'repo@sha256:one',protocol:'codex-v1' as const,command:['codex'],sandbox_provider:'modal',model_provider:'openai-responses',model:'test',clients:['python' as const],scenarios:['conversation'],checked_at:'2026-11-18',evidence:'testing/evidence/test.md'};
 harnessVerifications.push(row);
 try{const h={protocol:'codex-v1',image:{reference:row.image},command:['codex']};expect(harnessCatalogEntry(h).verification).toEqual([row]);expect(harnessCatalogEntry({...h,command:['other']}).verification).toEqual([]);expect(harnessCatalogEntry({...h,image:{reference:'repo@sha256:two'}}).verification).toEqual([]);}finally{harnessVerifications.pop();}
});
