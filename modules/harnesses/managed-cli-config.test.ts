import {execFileSync} from 'node:child_process';
import {it,expect} from 'vitest';
import {fileURLToPath} from 'node:url';
const runner=fileURLToPath(new URL('./managed-cli-runner.py',import.meta.url));
it.each(['codex-v1','hermes-v1','openclaw-v1'])('%s preserves the scoped proxy prefix and uses the authorized v1 route',protocol=>{
 const script=`import importlib.util,json,sys,tempfile,os\nfrom pathlib import Path\ns=importlib.util.spec_from_file_location('runner',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nwith tempfile.TemporaryDirectory() as tmp:\n roots=[]\n m.Path=lambda root:(roots.append(root) or Path(tmp))\n os.environ['HEXAGON_MODEL_KEY']='fixture-grant'\n args,env=m.configure(json.load(sys.stdin))\n files={p.name:p.read_text() for p in Path(tmp).rglob('*') if p.is_file()}\n print(json.dumps({'args':args,'files':files,'lazy':env.get('HERMES_DISABLE_LAZY_INSTALLS'),'roots':roots}))\n`;
 const output=JSON.parse(execFileSync('python3',['-c',script,runner],{input:JSON.stringify({adapter:protocol,command:['agent'],run_id:'run',input:'hello',model:{provider:protocol==='hermes-v1'?'openai-compatible':'openai-responses',base_url:'https://proxy.example/access/grant',model:'example'},tools:[{name:'wiki',description:'Read wiki',input_schema:{type:'object'}}]}),encoding:'utf8'}));
 expect(JSON.stringify(output.files)).toContain('https://proxy.example/access/grant/v1');
 expect(JSON.stringify(output.files)).not.toContain('fixture-grant');
 if(protocol==='openclaw-v1'){expect(output.roots[0]).not.toMatch(/^\/tmp(?:\/|$)/);expect(JSON.parse(output.files['openclaw.json']).mcp.servers.hexagon.requestTimeoutMs).toBe(300000);}
 if(protocol==='hermes-v1'){expect(output.lazy).toBe('1');expect(output.args).not.toContain('--base-url');}
});

it('prepares restored SQLite state without changing database, WAL, or linked external files',()=>{
 const script=`import importlib.util,sys,tempfile,sqlite3,os,json\nfrom pathlib import Path\ns=importlib.util.spec_from_file_location('runner',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nwith tempfile.TemporaryDirectory() as tmp:\n root=Path(tmp)/'state';root.mkdir()\n db=root/'history';c=sqlite3.connect(db);c.execute('create table turns(message text)');c.execute("insert into turns values ('remember me')");c.commit();c.close()\n wal=root/'history-wal';wal.write_bytes(b'preserve sidecar')\n outside=Path(tmp)/'outside';outside.write_bytes(db.read_bytes());(root/'link').symlink_to(outside)\n (root/'linked-dir').symlink_to(Path(tmp),target_is_directory=True)\n before={p.name:p.read_bytes() for p in [db,wal,outside]}\n original_open=os.open;writable=[]\n def observed(path,flags,*args,**kwargs):\n  if flags & os.O_RDWR:writable.append(str(path))\n  return original_open(path,flags,*args,**kwargs)\n m.os.open=observed\n m.prepare_sqlite_files(root)\n after={p.name:p.read_bytes() for p in [db,wal,outside]}\n c=sqlite3.connect(db);rows=c.execute('select message from turns').fetchall();c.close()\n print(json.dumps({'unchanged':before==after,'opened':[Path(p).name for p in writable],'rows':rows}))\n`;
 const result=JSON.parse(execFileSync('python3',['-c',script,runner],{encoding:'utf8'}));
 expect(result).toEqual({unchanged:true,opened:['history'],rows:[['remember me']]});
});

it.each([0,1])('reconciles restored OpenClaw credentials through upstream doctor (exit %s)',exitCode=>{
 const script=`import importlib.util,json,sys,tempfile,os,types\nfrom pathlib import Path\ns=importlib.util.spec_from_file_location('runner',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nwith tempfile.TemporaryDirectory() as tmp:\n m.Path=lambda root:Path(tmp)\n m.prepare_sqlite_files=lambda state:False\n calls=[]\n def repair(command,**kwargs):\n  calls.append({'command':command,'timeout':kwargs['timeout'],'scoped_state':kwargs['env']['OPENCLAW_STATE_DIR'].startswith(tmp),'quiet':kwargs['stdout']==m.subprocess.DEVNULL and kwargs['stderr']==m.subprocess.DEVNULL})\n  return types.SimpleNamespace(returncode=int(sys.argv[2]))\n m.subprocess.run=repair\n try:\n  args,env=m.configure(json.load(sys.stdin));error=None\n except RuntimeError as e:\n  args=None;error=str(e)\n print(json.dumps({'calls':calls,'args':args,'error':error}))\n`;
 const result=JSON.parse(execFileSync('python3',['-c',script,runner,String(exitCode)],{input:JSON.stringify({adapter:'openclaw-v1',command:['node','/app/openclaw.mjs'],run_id:'next',native_session:'original',input:'continue',model:{provider:'openai-compatible',base_url:'https://proxy.example/access/grant',model:'example'},tools:[]}),encoding:'utf8'}));
 expect(result.calls).toEqual([{command:['node','/app/openclaw.mjs','doctor','--client-credentials','--repair','--non-interactive'],timeout:120,scoped_state:true,quiet:true}]);
 if(exitCode){expect(result.args).toBeNull();expect(result.error).toBe('openclaw_restored_credentials_repair_failed');}
 else{expect(result.error).toBeNull();expect(result.args).toContain('original');}
});

it.each(['codex-v1','hermes-v1','openclaw-v1'])('%s maps initialization to native configuration and preserves the continuation boundary',protocol=>{
 const script=`import importlib.util,json,sys,tempfile,os,types
from pathlib import Path
s=importlib.util.spec_from_file_location('runner',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
with tempfile.TemporaryDirectory() as tmp:
 workspace=Path(tmp)/'workspace';workspace.mkdir()
 class Paths:
  def __call__(self,root):return Path(tmp)/'state'
  def cwd(self):return workspace
 m.Path=Paths()
 m.subprocess.run=lambda *args,**kwargs:types.SimpleNamespace(returncode=0)
 os.environ['HEXAGON_MODEL_KEY']='private-test-grant'
 request=json.load(sys.stdin)
 first,_=m.configure(json.loads(json.dumps(request)))
 request['native_session']='existing';request['run_id']='followup';request['input']='next task'
 second,_=m.configure(request)
 files={str(p.relative_to(tmp)):p.read_text() for p in Path(tmp).rglob('*') if p.is_file()}
 print(json.dumps({'first':first,'second':second,'files':files}))
`;
 const result=JSON.parse(execFileSync('python3',['-c',script,runner],{input:JSON.stringify({adapter:protocol,command:['agent'],run_id:'initial',input:'task',initialization:{system:'Act as Atlas. Cite sources.',context:'BACKGROUND-ORBIT',digest:'fixture',schema_version:1},model:{provider:protocol==='codex-v1'?'openai-responses':'openai-compatible',base_url:'https://proxy.example/access/grant',model:'example'}}),encoding:'utf8'}));
 expect(JSON.stringify(result.first)).toContain('BACKGROUND-ORBIT');expect(JSON.stringify(result.second)).not.toContain('BACKGROUND-ORBIT');expect(JSON.stringify(result.second)).toContain('next task');
 expect(JSON.stringify(result.files)).toContain('Act as Atlas. Cite sources.');expect(JSON.stringify(result.files)).not.toContain('private-test-grant');
 if(protocol==='openclaw-v1')expect(result.files['workspace/SOUL.md']).toBe('Act as Atlas. Cite sources.');
 if(protocol==='codex-v1')expect(result.files['state/codex-v1/config.toml']).toContain('developer_instructions =');
 if(protocol==='hermes-v1')expect(JSON.parse(result.files['state/hermes-v1/config.yaml']).agent.system_prompt).toBe('Act as Atlas. Cite sources.');
},15000);
