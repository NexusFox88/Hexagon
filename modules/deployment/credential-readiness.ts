import {ExecutionError} from '../execution/runs.js';
import type {DevelopmentIngress} from './ingress.js';
import type {CredentialIngressHealth} from '../access/ingress-health.js';

/** One platform-owned readiness operation shared by startup, SDK calls and workers. */
export class CredentialReadiness {
  private pending?:Promise<void>;
  private timer?:ReturnType<typeof setInterval>;
  private nextAttempt=0;
  private failures=0;
  private phase='idle';
  private code?:string;
  status(){return {state:this.phase,code:this.code,retry_at:this.nextAttempt?new Date(this.nextAttempt).toISOString():undefined};}
  start(){
    if(!this.automatic||this.timer)return;
    this.timer=setInterval(()=>{if(Date.now()>=this.nextAttempt&&this.ingress.status().state!=='disabled')void this.ensure().catch(()=>{});},15000);
    this.timer.unref();
  }
  stop(){if(this.timer)clearInterval(this.timer);this.timer=undefined;}

  constructor(private health:CredentialIngressHealth,private ingress:DevelopmentIngress,
    private automatic:boolean,private canReplace:()=>Promise<boolean>) {}
  ensure():Promise<void> {
    return this.pending??=this.prepare().then(()=>{this.phase='ready';this.code=undefined;this.failures=0;this.nextAttempt=0;}).catch(error=>{this.code=error.code??'credential_proxy_tunnel_unavailable';this.phase=this.code==='credential_ingress_recovery_blocked'?'blocked':'unavailable';this.nextAttempt=Date.now()+Math.min(60000,5000*2**Math.min(this.failures++,4));throw error;}).finally(()=>{this.pending=undefined;});
  }
  private async prepare() {
    this.phase='checking';
    const initial=await this.health.check();
    if(initial.state==='reachable')return;
    // A transient health-probe timeout is not evidence that a live origin needs replacement.
    if(initial.origin){for(let attempt=0;attempt<2;attempt++){await new Promise(resolve=>setTimeout(resolve,250));if((await this.health.check(true)).state==='reachable')return;}}
    if(!this.automatic)throw new ExecutionError('credential_ingress_unreachable',503);
    // Replacing an origin invalidates URLs already handed to active invocations.
    // Recover before provisioning; never silently migrate in-flight invocation credentials.
    if(!await this.canReplace())throw new ExecutionError('credential_ingress_recovery_blocked',503);
    this.phase='recovering';
    await this.ingress.retry();
    if((await this.health.check(true)).state!=='reachable')throw new ExecutionError('credential_proxy_tunnel_unavailable',503);
  }
}
