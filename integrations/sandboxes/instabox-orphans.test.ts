import {expect,it} from 'vitest';
import {mkdtemp,mkdir,writeFile,rm,readdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {reapInstaboxSSHDirectories} from './instabox-transport.js';
it('reaps keys from a SIGKILLed owner and preserves live, legacy and symlink directories',async()=>{
 const root=await mkdtemp(join(tmpdir(),'hexagon-orphan-test-'));
 const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
 try{
  const dead=`hexagon-instabox-${child.pid}-abcdef`,live=`hexagon-instabox-${process.pid}-ghijkl`,legacy='hexagon-instabox-ABCDEF',link=`hexagon-instabox-${child.pid}-mnopqr`;
  for(const name of [dead,live,legacy]){await mkdir(join(root,name),{mode:0o700});await writeFile(join(root,name,'key'),'test-only',{mode:0o600});}
  await symlink(join(root,legacy),join(root,link));
  const exit=once(child,'exit');child.kill('SIGKILL');await exit;
  expect(await reapInstaboxSSHDirectories(root)).toBe(1);
  expect((await readdir(root)).sort()).toEqual([live,legacy,link].sort());
 }finally{child.kill();await rm(root,{recursive:true,force:true});}
});
