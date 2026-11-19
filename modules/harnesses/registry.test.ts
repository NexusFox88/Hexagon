import {createHash} from 'node:crypto';
import {it,expect,vi} from 'vitest';
import {imageReference,resolveImage} from './registry.js';
const digest=(s:string)=>'sha256:'+createHash('sha256').update(s).digest('hex');
const config=JSON.stringify({os:'linux',architecture:'amd64',config:{Entrypoint:['python3'],Cmd:['/app/main.py']}});
const manifest=JSON.stringify({schemaVersion:2,config:{digest:digest(config)}});
it('pins tags and verifies both manifest and configuration bytes',async()=>{
 const request=vi.fn().mockResolvedValueOnce(new Response(manifest)).mockResolvedValueOnce(new Response(config));
 expect(await resolveImage('python:3.12',undefined,request)).toMatchObject({reference:`docker.io/library/python@${digest(manifest)}`,command:['python3','/app/main.py']});
 const corrupt=vi.fn().mockResolvedValueOnce(new Response(manifest)).mockResolvedValueOnce(new Response(config+' '));
 await expect(resolveImage('python:3.12',undefined,corrupt)).rejects.toMatchObject({code:'image_digest_mismatch'});
});
it('rejects URL credentials, arbitrary registry hosts and traversal',()=>{
 for(const ref of ['http://127.0.0.1/image','evil.example/a:1','ghcr.io/a/../b','user:pass@ghcr.io/a','ghcr.io/a?x'])expect(()=>imageReference(ref)).toThrow();
});
it('rejects auth challenges that would forward credentials to another host',async()=>{
 const request=vi.fn().mockResolvedValue(new Response('',{status:401,headers:{'www-authenticate':'Bearer realm="https://evil.example/token"'}}));
 await expect(resolveImage('python', {username:'user',password:'secret'},request)).rejects.toMatchObject({code:'image_registry_authentication_failed'});expect(request).toHaveBeenCalledTimes(1);
});
it('strips registry auth on allowed blob redirects, rejects arbitrary redirect targets',async()=>{
 const request=vi.fn().mockResolvedValueOnce(new Response(manifest)).mockResolvedValueOnce(new Response(null,{status:307,headers:{location:'https://production.cloudfront.docker.com/config'}})).mockResolvedValueOnce(new Response(config));
 await resolveImage('python',undefined,request);expect(request.mock.calls[2]![1]).not.toHaveProperty('headers');
 const denied=vi.fn().mockResolvedValueOnce(new Response(manifest)).mockResolvedValueOnce(new Response(null,{status:307,headers:{location:'https://127.0.0.1/config'}}));
 await expect(resolveImage('python',undefined,denied)).rejects.toMatchObject({code:'image_registry_redirect_rejected'});
});
it('rejects unsupported platform before requesting a layer',async()=>{
 const request=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({manifests:[{platform:{os:'linux',architecture:'arm64'},digest:'sha256:'+'a'.repeat(64)}]})));
 await expect(resolveImage('python',undefined,request)).rejects.toMatchObject({code:'image_platform_unsupported'});expect(request).toHaveBeenCalledTimes(1);
});
it('bounds retries for lost registry reads and returns an actionable error',async()=>{
 const request=vi.fn().mockRejectedValue(new TypeError('fetch failed'));
 await expect(resolveImage('python',undefined,request)).rejects.toMatchObject({code:'image_registry_request_failed',status:502});
 expect(request).toHaveBeenCalledTimes(2);
 expect(request.mock.calls.every(([,options])=>!options.method||options.method==='GET')).toBe(true);
});
