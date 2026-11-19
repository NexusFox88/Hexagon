import {expect,it} from 'vitest';
// @ts-expect-error Browser module also exposes pure request projections.
import {restRequests,restCurl} from '../apps/console/rest-preview.js';
it('projects the actual creation/continuation chain and omits runtime metadata and environment values',()=>{
 const request={definition:{harness:{id:'pi',version:'1',capabilities:['tools']},env:{TOKEN:'never-display'}},input:"what's next?"};
 const requests=restRequests(request);expect(requests.map((r:{path:string})=>r.path)).toEqual(['/v1/sessions/preflight','/v1/sessions','/v1/sessions/{session_id}/runs','/v1/runs/{run_id}','/v1/runs/{run_id}/stream']);
 expect(requests[0].body.harness).toEqual({id:'pi',version:'1'});expect(JSON.stringify(requests)).not.toContain('never-display');expect(request.definition.env.TOKEN).toBe('never-display');
 expect(restRequests({...request,sessionId:'known'})[0].path).toBe('/v1/sessions/known/runs');
 const curl=restCurl(requests,'http://127.0.0.1:8787',true);expect(curl).toContain('/local/connect');expect(curl).toContain("what'\\''s next?");expect(curl).toContain('Idempotency-Key');expect(restCurl(requests,'https://example.test',false)).not.toContain('/local/connect');
});

it('includes explicitly authored ordinary env in runnable Playground REST requests',()=>{
 const request={definition:{env:{APP_ENV:'preview'},connections:{crm:'connection-id'}},input:'hello'};
 const requests=restRequests(request,true);
 expect(requests[1].body.env).toEqual({APP_ENV:'preview'});
 expect(requests[1].body.connections).toEqual({crm:'connection-id'});
});
