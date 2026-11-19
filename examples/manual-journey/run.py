"""GUI-configured connections → protected HTTP → real model → SDK result → cleanup."""
import hashlib, json, os, sys, uuid, signal
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'sdk/python'))
from hexagon import Hexagon
config = json.loads(Path(sys.argv[1] if len(sys.argv) > 1 else '.local/manual-journey/connections.json').read_text())
token = os.environ.get('HEXAGON_API_TOKEN') or json.loads(Path('.local/control-plane/owner.json').read_text())['token']
client = Hexagon(os.environ.get('HEXAGON_API_URL', 'http://127.0.0.1:8787'), token)
def interrupted(_signal, _frame):
    raise KeyboardInterrupt()
signal.signal(signal.SIGTERM, interrupted)
session = None
journal = None
try:
    health = client.request('GET', '/health')
    if health['credential_access']['state'] != 'reachable':
        raise RuntimeError('Credential ingress is not reachable. Check Console and npm run local -- status.')
    source = Path('examples/manual-journey/protected-prefix.py').read_text() + Path('examples/harnesses/python-agent/main.py').read_text()
    version = hashlib.sha256(source.encode()).hexdigest()[:16]
    client.register_harness_package(id='custom.manual-protected', version=version, protocol='hexagon-json-v1', interpreter='python3', entrypoint='main.py', capabilities=['conversation'], model_providers=['anthropic-compatible'], files=[{'path':'main.py','content':source}])
    agent = client.create_agent(name='Manual protected journey', harness={'id':'custom.manual-protected','version':version}, variables={'APP_MODE':'manual-acceptance'}, resources={'timeout_seconds':600})
    definition = dict(agent_id=agent['id'], sandbox_connection_id=config['sandbox_connection_id'], model_connection_id=config['model_connection_id'], connections={'catalog':config['http_connection_id']}, variables={'HTTP_PATH':config.get('http_path','/v1/models')})
    print('Preflight:', json.dumps(client.preflight_session(**definition)))
    session = client.create_session(**definition)
    directory = Path('.local/manual-journey'); directory.mkdir(parents=True, exist_ok=True)
    journal = directory / ('python-' + session['id'] + '.json')
    journal.write_text(json.dumps({'session':session['id'],'state':'open'})); journal.chmod(0o600)
    print('Session:', session['id'], flush=True)
    run = client.submit(session['id'], 'Introduce yourself in one English sentence and state that you are running in a cloud Sandbox. Do not run shell tools.', str(uuid.uuid4()))
    print('Run:', run['id'], flush=True)
    cursor, http_verified = '0', False
    for attempt in range(3):
        try:
            for event in client.stream(run['id'], cursor):
                if event.get('id'): cursor = event['id']
                if event['type'].startswith('run.'): print(event['type'], flush=True)
                if event['type'] == 'harness.stdout' and 'protected_http_ok' in json.dumps(event.get('data')): http_verified = True
            break
        except Exception:
            if attempt == 2: raise
            print('Reconnecting the same Run from its event cursor.', flush=True)
    result = client.run(run['id'])
    if result['state'] != 'completed' or not (result.get('output') or {}).get('text') or not http_verified:
        raise RuntimeError('Journey failed; inspect the Run in Fleet.')
    print('Protected HTTP and ordinary variables verified.\nAgent:', result['output']['text'])
    journal.write_text(json.dumps({'session':session['id'],'run':run['id'],'state':'completed','http_verified':True,'output':result['output']['text']}))
finally:
    if session:
        try:
            client.close(session['id'])
            record = json.loads(journal.read_text()); record['closed'] = True; journal.write_text(json.dumps(record))
            print('Session closed:', session['id'])
        except Exception:
            print('Cleanup needs reconciliation. Close Session in Fleet:', session['id'], file=sys.stderr)
            raise
