import json,time,uuid,sys
from pathlib import Path
sys.path.insert(0,str(Path('sdk/python').resolve()))
from hexagon import Hexagon
c=Hexagon.local(); record={'started_at':time.time()}; file=Path('.local/oci-harness/python-journey.json'); file.parent.mkdir(parents=True,exist_ok=True)
def save():
 file.write_text(json.dumps(record,indent=2));file.chmod(0o600)
def wait(run):
 record.setdefault('runs',[]).append(run['id']);save()
 deadline=time.time()+600
 while time.time()<deadline:
  row=c.run(run['id'])
  if row['state'] in ('completed','failed','cancelled'):
   record.setdefault('results',[]).append(row);save()
   if row['state']!='completed':raise RuntimeError(str(row['error']))
   return row
  time.sleep(2)
 raise RuntimeError('run_timeout')
try:
 connections=c.request('GET','/connections')['connections'];sandbox=next(x for x in connections if x['provider']=='modal' and x['enabled']);model=next(x for x in connections if x['kind']=='model' and x['enabled'])
 # Entrypoint override tests the custom protocol without publishing an image.
 # The separate Dockerfile embeds this exact example for normal distribution.
 source=Path('examples/harnesses/python-agent/main.py').read_text()
 command=['python3','-c',"__file__='/tmp/hexagon-custom-agent.py'\n"+source]
 h=c.register_harness(image='docker.io/library/python@sha256:05a994d2344eb364cc186910f4fc8786a38215f39f00d0acc25bff33a08f4177',id='custom.oci-python',name='Python OCI',version='1.0.0',protocol='hexagon-json-v1',command=command,capabilities=['conversation','tools'])
 record['harness']= {'id':h['id'],'version':h['version'],'image':h['image']};save()
 exa=next(x for x in connections if x['provider']=='exa' and x['enabled'])
 session=c.create_session(harness={'id':h['id'],'version':h['version']},name='OCI Python acceptance',sandbox_connection_id=sandbox['id'],model_connection_id=model['id'],resources={'timeout_seconds':1200},tools={'search':exa['id']},env={'APP_OCI_ACCEPTANCE':'python'})
 record['session']=session['id'];save()
 first=wait(c.submit(session['id'],'Reply exactly OCI_PYTHON_OK. Remember the code ORBIT-42 for the next turn. Do not use tools.',str(uuid.uuid4())))
 if 'OCI_PYTHON_OK' not in first['output']['text']:raise RuntimeError('unexpected_output')
 second=wait(c.submit(session['id'],'Return the code I gave you in the previous turn. Use the search tool once to find official OCI image documentation. Read APP_OCI_ACCEPTANCE from the environment using shell. Save a short report containing the code and environment value to the requested artifact directory, then report the result.',str(uuid.uuid4())))
 record['tool_calls']=c.tool_calls(second['id']);record['artifacts']=c.artifacts(second['id']);record['events_count']=len(c.events(second['id'])['events']);save()
 if 'ORBIT-42' not in second['output']['text']:raise RuntimeError('continuation_failed')
 if not record['artifacts']['artifacts']:raise RuntimeError('artifact_missing')
 content=c.download_artifact(record['artifacts']['artifacts'][0]['id'])
 record['artifact_bytes']=len(content)
 if 'ORBIT-42' not in content.decode() or 'python' not in content.decode():raise RuntimeError('artifact_semantic_mismatch')
 if not any(call['state']=='completed' and not call.get('is_error') for call in record['tool_calls']['calls']):raise RuntimeError('remote_tool_not_completed')
 record['artifact_semantics_verified']=True
 record['passed']=True
except Exception as e:
 record['error']=getattr(e,'code',str(e));save();record['passed']=False
finally:
 if record.get('session'):
  try:c.close(record['session'])
  except Exception as error:
   record['cleanup_initial_error']=getattr(error,'code',str(error));save()
   if getattr(error,'code',None)!='sandbox_deletion_unconfirmed':raise
  for _ in range(90):
   if c.session(record['session'])['state']=='closed':record['cleanup']='confirmed';break
   time.sleep(1)
 save();print({k:record.get(k) for k in ['passed','error','cleanup']})
 if not record.get('passed') or record.get('cleanup')!='confirmed':sys.exit(1)
