import { expect,it,vi,afterEach } from 'vitest';
import { checkInstaboxOpenSSH } from './instabox-transport.js';
import { InstaboxConnector } from './instabox.js';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('fails before contacting the provider when OpenSSH is absent',async()=>{
 vi.stubEnv('PATH','/nonexistent-hexagon-bin');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 await expect(new InstaboxConnector({},'secret').validate()).rejects.toMatchObject({code:'sandbox_openssh_unavailable'});
 expect(fetch).not.toHaveBeenCalled();
});
it('checks local OpenSSH and actual ed25519 key generation',async()=>{
 await expect(checkInstaboxOpenSSH()).resolves.toBeUndefined();
});
it('also fails when ssh exists but ssh-keygen is absent',async()=>{
 const {mkdtemp,symlink,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');
 const ssh=(await promisify(execFile)('which',['ssh'])).stdout.trim();
 const dir=await mkdtemp(join(tmpdir(),'hexagon-preflight-test-'));
 try{await symlink(ssh,join(dir,'ssh'));vi.stubEnv('PATH',dir);await expect(checkInstaboxOpenSSH()).rejects.toMatchObject({code:'sandbox_openssh_unavailable'});}
 finally{vi.unstubAllEnvs();await rm(dir,{recursive:true,force:true});}
});
