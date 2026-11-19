import sys,json,time,uuid,os
from pathlib import Path
from hexagon import Hexagon
name=sys.argv[1];c=Hexagon.local();cfg=json.loads(Path(os.environ['HEXAGON_ACCEPTANCE_CONFIG']).read_text())
Path('.local/evidence').mkdir(parents=True,exist_ok=True)
p=Path(f'.local/evidence/harness-{name}-python-{uuid.uuid4()}.json');r={'harness':name,'client':'python','started_at':time.time()}
def save():
 p.write_text(json.dumps(r,indent=2));p.chmod(0o600)
def wait(id):
 end=time.monotonic()+1800
 while time.monotonic()<end:
  run=c.run(id)
  if run['state'] in ('completed','failed','cancelled'):return run
  time.sleep(2)
 raise RuntimeError('run_timeout')
try:
 template=next(h for h in c.catalog()['harnesses'] if h['id']==cfg['harnesses'][name]['id'])
 h=c.register_harness(image=template['image']['reference'],id='custom.python-'+name,name=name+' Python',version=template['version'],protocol=template['protocol'],command=template['command'],capabilities=template['capabilities'])
 r['registered']={'id':h['id'],'version':h['version']};save()
 s=c.create_session(harness=r['registered'],sandbox_connection_id=cfg['sandbox'],model_connection_id=cfg['chat'] if name=='hermes' else cfg['model'],name=name+' · Python cloud journey',tools={'search':cfg['tool']},env={'APP_ACCEPTANCE_CLIENT':'python'},resources={'timeout_seconds':1800});r['session']=s['id'];save()
 r['initialization']=c.session_initialization(s['id']);c.upload(s['id'],{'input.txt':b'PYTHON_INPUT_OK'})
 key=str(uuid.uuid4());first=c.submit(s['id'],'This is the FIRST turn. For the next turn remember the literal passphrase OCTAGON-73 supplied here; do not search for it. Read only ./input.txt, then immediately reply CLOUD_PYTHON_OK, the file contents, and OCTAGON-73. Do not search directories or call remote tools.',key);r['first_run']=first['id'];save()
 assert c.submit(s['id'],'This is the FIRST turn. For the next turn remember the literal passphrase OCTAGON-73 supplied here; do not search for it. Read only ./input.txt, then immediately reply CLOUD_PYTHON_OK, the file contents, and OCTAGON-73. Do not search directories or call remote tools.',key)['id']==first['id']
 stream=c.stream(first['id']);event=next(stream);stream.close();r['disconnected_at']=event.get('id');save()
 r['first']=wait(first['id']);save();assert r['first']['state']=='completed',r['first'].get('error');assert 'OCTAGON-73' in r['first']['output']['text'];assert 'PYTHON_INPUT_OK' in r['first']['output']['text']
 r['replay']=list(c.stream(first['id'],after=event.get('id','0')));assert r['replay'][-1]['type']=='stream.end'
 second=c.submit(s['id'],'Recall the passphrase from the previous turn. Use assigned search tool to find official OCI image specification documentation. Write report.json in the requested artifact directory with remembered_code containing only the passphrase, env_value read from APP_ACCEPTANCE_CLIENT, and source_url from the tool result. Return the passphrase.',str(uuid.uuid4()));r['second_run']=second['id'];save();r['second']=wait(second['id']);save();assert r['second']['state']=='completed',r['second'].get('error');assert 'OCTAGON-73' in r['second']['output']['text']
 r['calls']=c.tool_calls(second['id']);assert any(v['state']=='completed' and not v.get('is_error') for v in r['calls']['calls'])
 r['artifacts']=c.artifacts(second['id']);a=next(a for a in r['artifacts']['artifacts'] if a['name']=='report.json');report=json.loads(c.download_artifact(a['id']));assert report['remembered_code']=='OCTAGON-73' and report['env_value']=='python' and report['source_url'].startswith('https://');r['artifact_verified']=True;r['events']=c.events(second['id']);r['passed']=True
except Exception as e:
 r['error']=str(e);sys.exitcode=1
finally:
 save()
 if r.get('session'):
  try:
   c.close(r['session'])
   for i in range(120):
    s=c.session(r['session'])
    if s['state']=='closed':r['cleanup']='confirmed';break
    time.sleep(1)
  except Exception as e:r['cleanup_error']=str(e)
 save();print({k:r.get(k) for k in ('harness','passed','error','cleanup')})
if not r.get('passed') or r.get('cleanup')!='confirmed':sys.exit(1)
