import {expect,it} from 'vitest';
// @ts-expect-error Browser module has intentionally no TypeScript declarations.
import {parseEnvironment} from '../apps/console/session-access-editor.js';
it('validates ordinary env without evaluating pasted values or overriding platform variables',()=>{
 expect(parseEnvironment([{name:'MODE',value:'$(echo no)\n"quoted"'}])).toEqual({MODE:'$(echo no)\n"quoted"'});
 for(const rows of [[{name:'MODE',value:'1'},{name:'MODE',value:'2'}],[{name:'HEXAGON_CONNECTIONS',value:'x'}],[{name:'NODE_OPTIONS',value:'x'}],[{name:'A',value:'\0'}]])expect(()=>parseEnvironment(rows)).toThrow();
 expect(JSON.stringify(parseEnvironment([{name:'__proto__',value:'literal'}]))).toBe('{"__proto__":"literal"}');
 expect(parseEnvironment([{name:'',value:''},{name:'EMPTY',value:''}])).toEqual({EMPTY:''});
});
