import {afterEach,expect,it,vi} from 'vitest';
import {e2bTransportOptions} from './e2b.js';
afterEach(()=>vi.unstubAllEnvs());
it('passes operator proxy selection to E2B while honoring bypass and disabled proxy mode',()=>{
 for(const name of ['HTTP_PROXY','http_proxy','https_proxy','ALL_PROXY','all_proxy','NO_PROXY','no_proxy'])vi.stubEnv(name,'');
 vi.stubEnv('HTTPS_PROXY','http://127.0.0.1:12345');vi.stubEnv('NODE_USE_ENV_PROXY','1');
 expect(e2bTransportOptions()).toEqual({proxy:'http://127.0.0.1:12345'});
 vi.stubEnv('NO_PROXY','.e2b.app');expect(e2bTransportOptions()).toEqual({});
 vi.stubEnv('NO_PROXY','');vi.stubEnv('NODE_USE_ENV_PROXY','0');expect(e2bTransportOptions()).toEqual({});
});
