import {it,expect} from 'vitest';
import {supportDiagnostics} from './support.js';
it('allowlists support fields and refuses arbitrary states or nested secret data',()=>{
 const result=supportDiagnostics({api:'ready',database:'secret-dsn',owner:{token:'secret-token'},credential_access:{state:'reachable',origin:'https://private-host'},execution:{state:'running',run_id:'private-id',busy:true}},{platform:'darwin',arch:'arm64',node:'22.19.0'});
 expect(result.database).toBe('unknown');expect(result.execution.busy).toBe(true);const text=JSON.stringify(result);for(const secret of ['secret-dsn','secret-token','private-host','private-id'])expect(text).not.toContain(secret);
 expect(supportDiagnostics(null,{platform:'linux',arch:'x64',node:'22.19.0'}).reachable).toBe(false);
});
