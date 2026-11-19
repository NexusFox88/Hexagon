import {openLocalhostAccessTunnel} from './localhost-access-tunnel.js';
import type { FastifyInstance } from 'fastify';
import { openCloudflareCredentialTunnel } from '../integrations/network/cloudflare-tunnel.js';

/** Acceptance owns both its isolated data-plane listener and its temporary tunnel. */
export async function openAccessTunnel(app:FastifyInstance) {
  const address=await app.listen({host:'127.0.0.1',port:0});
  try {
    const tunnel=await (process.env.HEXAGON_ACCEPTANCE_TUNNEL==='localhost-run'?openLocalhostAccessTunnel:openCloudflareCredentialTunnel)(address);
    return {origin:tunnel.origin,close:async()=>{await tunnel.close();await app.close();}};
  }catch(error){await app.close();throw error;}
}
