import {expect,it,vi,afterEach} from 'vitest';
import {apify,brave,firecrawl,gitlab,readwise} from './research-development.js';
import {applicationRequest,applicationOperations} from './registry.js';
import {validToolArguments} from '../tools/http-json.js';
afterEach(()=>vi.unstubAllGlobals());
it('encodes GitLab project paths and separates project identifiers from issue bodies',()=>{
 const request=gitlab.operations.create_issue!.request({project_id:'team/project',title:'Review'},{});expect(request.url).toBe('https://gitlab.com/api/v4/projects/team%2Fproject/issues');expect(request.body).toEqual({title:'Review'});
 expect(applicationOperations(gitlab,{})).not.toHaveProperty('create_issue');
});
it('requires approval for Actor execution and does not replay side effects',()=>{
 expect(applicationOperations(apify,{})).not.toHaveProperty('start_actor');expect(applicationOperations(apify,{operations:['start_actor']}).start_actor).toMatchObject({approval:true,replay:'never'});
 expect(apify.operations.start_actor!.request({actor_id:'owner~actor',input:{url:'https://example.com'}},{})).toMatchObject({method:'POST',body:{url:'https://example.com'}});
 expect(validToolArguments(apify.operations.read_dataset!.input_schema,{dataset_id:'data',limit:101})).toBe(false);
});
it('uses provider-specific authentication and accepts Readwise 204 validation',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(null,{status:204}));vi.stubGlobal('fetch',fetch);expect(await applicationRequest(readwise,'secret',readwise.verify({}),{write:false})).toEqual({success:true});expect(fetch.mock.calls[0]![1].headers.Authorization).toBe('Token secret');
 expect(brave.authHeader!('key')).toEqual({'X-Subscription-Token':'key'});expect(brave.operations.web_search!.request({query:'query'},{}).query).toMatchObject({q:'query',count:10});
 expect(firecrawl.operations.scrape_page!.request({url:'https://example.com'},{}).body).toEqual({url:'https://example.com',formats:['markdown']});
});
