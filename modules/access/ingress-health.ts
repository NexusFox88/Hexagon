import { randomUUID } from 'node:crypto';
export const credentialListenerId = randomUUID();

/** A public liveness response must identify this listener, not just any live tunnel. */
export class CredentialIngressHealth {
  private cached?: { state: string; checked_at: string; origin?: string; code?: string };
  private pending?: Promise<NonNullable<CredentialIngressHealth['cached']>>;
  constructor(private configuration:()=>{state:string;origin?:string;code?:string},private fetcher:typeof fetch=fetch) {}
  async check(force=false) {
    if(!force&&this.cached&&this.cached.origin===this.configuration().origin&&Date.now()-Date.parse(this.cached.checked_at)<5000)return this.cached;
    return this.pending??=(async()=>{
      const config=this.configuration(),checked_at=new Date().toISOString();
      if(!config.origin)return this.cached={state:'not_configured',checked_at,code:config.code};
      try {
        const response=await this.fetcher(`${config.origin}/health/live`,{redirect:'error',signal:AbortSignal.timeout(5000)});
        const body=await response.json();
        if(!response.ok||body.instance!==credentialListenerId)throw new Error('wrong_listener');
        return this.cached={state:'reachable',origin:config.origin,checked_at};
      }catch{return this.cached={state:'unreachable',origin:config.origin,checked_at,code:'credential_ingress_unreachable'};}
    })().finally(()=>{this.pending=undefined;});
  }
}
