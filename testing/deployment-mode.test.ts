import {it,expect} from 'vitest';
import {deploymentMode} from '../modules/deployment/mode.js';
it('requires explicit hosted identity, storage key and stable ingress without local fallback',()=>{
 expect(deploymentMode({})).toEqual({mode:'local'});
 expect(()=>deploymentMode({HEXAGON_DEPLOYMENT_MODE:'other'})).toThrow('invalid_deployment_mode');
 expect(()=>deploymentMode({HEXAGON_DEPLOYMENT_MODE:'hosted'})).toThrow('hosted_identity_and_storage_required');
 const env={HEXAGON_DEPLOYMENT_MODE:'hosted',DATABASE_URL:'postgres://fixture',HEXAGON_MASTER_KEY:Buffer.alloc(32,3).toString('base64'),HEXAGON_BOOTSTRAP_TOKEN:'explicit-fixture-owner',HEXAGON_ACCESS_URL:'https://access.example.test'};
 expect(deploymentMode(env).mode).toBe('hosted');
 for(const patch of [{HEXAGON_MASTER_KEY:'bad'},{HEXAGON_ACCESS_URL:'http://localhost'},{HEXAGON_ACCESS_TUNNEL:'cloudflare'}])expect(()=>deploymentMode({...env,...patch})).toThrow();
});
