import sys,json,time,uuid,os
from pathlib import Path
from hexagon import Hexagon
name=sys.argv[1];cfg=json.loads(Path(os.environ['HEXAGON_JOURNEY_CONFIG']).read_text());c=Hexagon.local(data_directory=cfg['data_directory'])
p=Path(cfg['evidence_directory']) / f'{name}-python.json';r={'harness':name,'client':'python','started_at':time.time()}
def save():
 p.write_text(json.dumps(r,indent=2));p.chmod(0o600)
def wait(id):
 end=time.monotonic()+cfg.get('run_timeout_ms',900000)/1000
 while time.monotonic()<end:
  run=c.run(id)
  if run['state'] in ('completed','failed','cancelled'):return run
  if run['state']=='provisioning' and (run.get('error') or {}).get('stage')=='sandbox_provision':
   operations=c.resource_operations(limit=100)['operations']
   pending=next((o for o in operations if o['session_id']==r.get('session') and o['kind']=='create' and o['state']=='unknown' and o['review_state']=='needs_review'),None)
   if pending:
    r['resource_review']=pending;save();raise RuntimeError('sandbox_creation_requires_review')
  if run['state']=='waiting_approval':
   calls=c.tool_calls(id)
   if any(call['state']=='unknown' for call in calls['calls']):
    r['unknown_calls']=calls;save();raise RuntimeError('remote_tool_outcome_unknown')
  time.sleep(2)
 raise RuntimeError('run_timeout')
try:
 template=next(h for h in c.catalog()['harnesses'] if h['id']==cfg['harnesses'][name]['id'])
 if template.get('image'):
  h=c.register_harness(image=template['image']['reference'],id='custom.matrix-python-'+name,name=name+' Python',version=template['version'],protocol=template['protocol'],command=template['command'],capabilities=template['capabilities'])
  r['registered']={'id':h['id'],'version':h['version']}
 else:r['registered']=cfg['harnesses'][name]
 save()
 if cfg.get('profile')=='conversation':
  s=c.create_session(harness=r['registered'],sandbox_connection_id=cfg['sandbox'],model_connection_id=cfg['model'],name=name+' · Python conversation acceptance',resources={'timeout_seconds':1800});r['session']=s['id'];save()
  first=c.submit(s['id'],'Remember OCTAGON-73 for the next turn. Reply OCTAGON-73.',str(uuid.uuid4()));r['first_run']=first['id'];save();r['first']=wait(first['id']);assert r['first']['state']=='completed' and 'OCTAGON-73' in r['first']['output']['text']
  second=c.submit(s['id'],'What exact passphrase did I ask you to remember?',str(uuid.uuid4()));r['second_run']=second['id'];save();r['second']=wait(second['id']);assert r['second']['state']=='completed' and 'OCTAGON-73' in r['second']['output']['text'];r['passed']=True;r['profile']='conversation'
 else:
  s=c.create_session(harness=r['registered'],sandbox_connection_id=cfg['sandbox'],model_connection_id=cfg.get('model_by_harness',{}).get(name,cfg.get('chat') if name=='hermes' else cfg['model']),name=name+' · Python cloud journey',tools={'wiki':cfg['tool']},env={'APP_ACCEPTANCE_CLIENT':'python'},resources={'timeout_seconds':1800});r['session']=s['id'];save()
  r['initialization']=c.session_initialization(s['id']);c.upload(s['id'],{'input.txt':b'PYTHON_INPUT_OK'})
  key=str(uuid.uuid4());first=c.submit(s['id'],'This is the FIRST turn. For the next turn remember the literal passphrase OCTAGON-73 supplied here; do not search for it. Read only ./input.txt, then immediately reply CLOUD_PYTHON_OK, the file contents, and OCTAGON-73. Do not search directories or call remote tools.',key);r['first_run']=first['id'];save()
  assert c.submit(s['id'],'This is the FIRST turn. For the next turn remember the literal passphrase OCTAGON-73 supplied here; do not search for it. Read only ./input.txt, then immediately reply CLOUD_PYTHON_OK, the file contents, and OCTAGON-73. Do not search directories or call remote tools.',key)['id']==first['id']
  stream=c.stream(first['id']);event=next(stream);stream.close();r['disconnected_at']=event.get('id');save()
  r['first']=wait(first['id']);save();assert r['first']['state']=='completed',r['first'].get('error') or 'first_run_not_completed';assert 'OCTAGON-73' in r['first']['output']['text'],'first_passphrase_missing';assert 'PYTHON_INPUT_OK' in r['first']['output']['text'],'uploaded_file_not_read'
  r['replay']=list(c.stream(first['id'],after=event.get('id','0')));assert r['replay'][-1]['type']=='stream.end'
  second=c.submit(s['id'],'Recall the passphrase from the previous turn. Use the assigned wiki tool once to read the wiki structure of the opencontainers/image-spec repository. Write report.json in the requested artifact directory with remembered_code containing only the passphrase, env_value read from APP_ACCEPTANCE_CLIENT, and source_url set to https://github.com/opencontainers/image-spec. Return the passphrase.',str(uuid.uuid4()));r['second_run']=second['id'];save();r['second']=wait(second['id']);save();assert r['second']['state']=='completed',r['second'].get('error') or 'second_run_not_completed';assert 'OCTAGON-73' in r['second']['output']['text']
  r['calls']=c.tool_calls(second['id']);assert any(v['state']=='completed' and not v.get('is_error') for v in r['calls']['calls']),'remote_tool_not_successful'
  r['artifacts']=c.artifacts(second['id']);a=next(a for a in r['artifacts']['artifacts'] if a['name']=='report.json');report=json.loads(c.download_artifact(a['id']));assert report['remembered_code']=='OCTAGON-73' and report['env_value']=='python' and report['source_url'].startswith('https://');r['artifact_verified']=True;r['events']=c.events(second['id']);r['passed']=True
except Exception as e:
 r['error']=str(e) or type(e).__name__;sys.exitcode=1
finally:
 save()
 if r.get('session'):
  try:
   for run_id in [r.get('first_run'),r.get('second_run')]:
    if run_id and c.run(run_id)['state'] not in ('completed','failed','cancelled'):
     c.cancel(run_id)
     for _ in range(60):
      if c.run(run_id)['state'] in ('completed','failed','cancelled'):break
      time.sleep(1)
   c.close(r['session'])
   for i in range(120):
    s=c.session(r['session'])
    if s['state']=='closed':r['cleanup']='confirmed';break
    time.sleep(1)
  except Exception as e:r['cleanup_error']=str(e)
 r['finished_at']=time.time();save();print({k:r.get(k) for k in ('harness','passed','error','cleanup')})
if not r.get('passed') or r.get('cleanup')!='confirmed':sys.exit(1)
