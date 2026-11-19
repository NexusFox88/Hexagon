"""Use GUI-configured application accounts from the Python SDK and a cloud Agent."""
import hashlib,json,os,sys,uuid,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'sdk/python'))
from hexagon import Hexagon
config=json.loads(Path(sys.argv[1] if len(sys.argv)>1 else '.local/applications/connections.json').read_text())
api=Hexagon(os.environ.get('HEXAGON_API_URL','http://127.0.0.1:8787'),os.environ.get('HEXAGON_API_TOKEN') or json.loads(Path('.local/control-plane/owner.json').read_text())['token'],timeout=120)
source=Path('examples/harnesses/python-agent/main.py').read_text();version=hashlib.sha256(source.encode()).hexdigest()[:16]
api.register_harness_package(id='custom.applications',version=version,protocol='hexagon-json-v1',interpreter='python3',entrypoint='main.py',capabilities=['conversation','tools'],model_providers=['anthropic-compatible'],files=[{'path':'main.py','content':source}])
agent=api.create_agent(name='Python application acceptance',harness={'id':'custom.applications','version':version},tools=[{'name':name,'required_at_start':True} for name in config['tools']],resources={'timeout_seconds':600})
session=api.create_session(agent_id=agent['id'],**config);run=None
journal=Path('.local/applications')/('python-'+session['id']+'.json');journal.write_text(json.dumps({'session':session['id'],'state':'open'}));journal.chmod(0o600)
try:
    run=api.submit(session['id'],'Use the exa and tavily search tools to find official Model Context Protocol documentation. Use deepl translate_text to translate "Bonjour, le monde." to EN-US. Actually call all three remote tools; do not use shell or create files. Report two documentation links and the translation in English.',str(uuid.uuid4()))
    print(json.dumps({'session':session['id'],'run':run['id']}),flush=True)
    cursor='0'
    for attempt in range(3):
        try:
            for event in api.stream(run['id'],cursor):
                if event.get('id'):cursor=event['id']
                if event['type']=='tool.completed':print('tool.completed',flush=True)
            break
        except Exception:
            if attempt==2:raise
    result=api.run(run['id']);calls=api.tool_calls(run['id'])['calls']
    assert result['state']=='completed' and result['output']['text'],result.get('error')
    for name in config['tools']:assert any(c['binding']==name and c['state']=='completed' and c.get('is_error') is not True for c in calls),name
    journal.write_text(json.dumps({'session':session['id'],'run':run['id'],'state':'passed','output':result['output']['text'],'calls':[{'binding':c['binding'],'operation':c['operation'],'state':c['state']} for c in calls]},ensure_ascii=False,indent=2));print(result['output']['text'],flush=True)
finally:
    if run and api.run(run['id'])['state'] not in ('completed','failed','cancelled'):
        api.cancel(run['id'])
        for _ in range(30):
            if api.run(run['id'])['state'] in ('completed','failed','cancelled'):break
            time.sleep(1)
    api.close(session['id']);record=json.loads(journal.read_text());record['closed']=True;journal.write_text(json.dumps(record,ensure_ascii=False,indent=2))
