"""Independent Python SDK Web journey. Secrets/config arrive only over stdin."""
import hashlib
import http.client
import json
import os
from pathlib import Path
import sys
import time
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from hexagon import Hexagon

c = json.loads(sys.stdin.readline())
h = Hexagon(c['base'], c['token'], timeout=45)


def wait(run):
    deadline = time.monotonic() + 420
    while time.monotonic() < deadline:
        row = h.run(run['id'])
        if row['state'] in ('completed', 'failed', 'cancelled'):
            return row
        time.sleep(.5)
    raise TimeoutError('Python Web Run timed out')


def writes():
    request = Request(c['tool_base'] + '/stats', headers={'Authorization': 'Bearer ' + c['tool_key']})
    with urlopen(request, timeout=10) as response:
        return json.load(response)['writes']


def preview_request(url, path='/', cookie=None):
    parts = urlsplit(url)
    connection = http.client.HTTPConnection('127.0.0.1', parts.port, timeout=30)
    try:
        connection.request('GET', path, headers={'Host': parts.netloc, **({'Cookie': cookie} if cookie else {})})
        response = connection.getresponse()
        return response.status, dict(response.getheaders()), response.read()
    finally:
        connection.close()


cross = wait(h.submit(c['ts_session'], '用中文一句话说明刚才修改的筛选逻辑，不调用工具。', 'python-web-cross'))
assert cross['state'] == 'completed'
ts_cancelled = None
if c.get('serial_sdks'):
    ts_cancelled = h.submit(c['ts_session'], '执行 sleep 120，结束后再回复。', 'ts-cancel')
    h.cancel(ts_cancelled['id'])
    assert wait(ts_cancelled)['state'] == 'cancelled'
    h.close(c['ts_session'])
    assert h.session(c['ts_session'])['state'] == 'closed'

http_bindings = {}
if os.environ.get('HEXAGON_HTTP_ACCESS_SMOKE') == '1':
    # Discover the test's scoped HTTP fixture through the public Session API.
    http_connections = [row for row in h.session(c['ts_session'])['definition']['connections'] if row['kind'] == 'http']
    assert len(http_connections) == 1
    http_bindings['catalog'] = http_connections[0]['id']
report = h.create_connection(kind='tool', provider='http-json', name='Python Web report', config=c['report_config'])
agent = h.create_agent(name='Python independent Web task', harness=c['harness'], tools=[{'name': 'requirements'}, {'name': 'reports', 'required_at_start': False}])
session = h.create_session(agent_id=agent['id'], sandbox_connection_id=c['sandbox'], model_connection_id=c['model'], connections=http_bindings, tools={'requirements': c['requirements'], 'reports': report['id']})
files = {path.name: path.read_bytes() for path in Path(c['fixture']).iterdir() if path.is_file()}
h.upload(session['id'], files)
prompt = '先调用 requirements read MCP 工具读取 ACCEPTANCE-001，按 README.md 实现 filter.mjs。不要修改 acceptance.mjs，运行 node acceptance.mjs，将测试输出 test-report.txt、filter.mjs 放入本次 Run 的产物目录。运行 python3 serve.py 启动端口 3000 的 Web 预览并保留服务。最后调用 reports write MCP 工具，平台会处理授权与审批，请等待结果后用中文总结。'
run = h.submit(session['id'], prompt, 'python-web-first')
assert h.submit(session['id'], prompt, 'python-web-first')['id'] == run['id']
baseline = writes()
stream = h.stream(run['id'])
head = next(stream)
stream.close()
seen = [head['id']]
authorized = approved = False
stream_deadline = time.monotonic() + 420
for event in h.stream(run['id'], head['id']):
    if time.monotonic() > stream_deadline:
        raise TimeoutError('Python Web event stream exceeded acceptance deadline')
    if 'id' in event:
        assert event['id'] not in seen
        seen.append(event['id'])
    if event['type'] == 'authorization.required':
        assert writes() == baseline
        if c.get('gui_auth'):
            print(json.dumps({'checkpoint': {'kind': 'authorization', 'session': session['id'], 'run': run['id'], 'connection': report['id']}}), flush=True)
            assert json.loads(sys.stdin.readline())['verified'] is True
            connected = h.request('GET', '/connections/' + report['id'])
            assert connected['status'] == 'ready' and connected['enabled']
        else:
            h.update_connection(report['id'], credential=c['tool_key'])
            assert h.validate_connection(report['id'])['status'] == 'ready'
            h.update_connection(report['id'], enabled=True)
        authorized = True
    if event['type'] == 'approval.required':
        assert writes() == baseline
        h.decide(event['data']['id'], True)
        h.decide(event['data']['id'], True)
        approved = True
result = wait(run)
assert result['state'] == 'completed' and result['output']['text']
assert authorized and approved and writes() == baseline + 1
persisted, after = [], '0'
protected_http_call = False
while True:
    page = h.events(run['id'], after)['events']
    if not page:
        break
    protected_http_call |= any(event['type'] == 'harness.stdout' and 'protected-http-probe-passed' in event.get('data', {}).get('text', '') for event in page)
    persisted.extend(event['id'] for event in page)
    after = page[-1]['id']
assert seen == persisted
if http_bindings:
    assert protected_http_call
artifacts = h.artifacts(run['id'])['artifacts']
by_name = {item['name']: item for item in artifacts}
assert {'filter.mjs', 'test-report.txt'} <= set(by_name)
hashes = {}
for item in artifacts:
    data = h.download_artifact(item['id'])
    assert hashlib.sha256(data).hexdigest() == item['sha256']
    hashes[item['id']] = item['sha256']
assert b'8 assertions passed' in h.download_artifact(by_name['test-report.txt']['id'])
preview = h.create_preview(session['id'], 3000)
url = urlsplit(preview['url'])
status, headers, _ = preview_request(preview['url'], url.path + '?' + url.query)
assert status == 302
cookie = headers['set-cookie'].split(';')[0]
status, _, body = preview_request(preview['url'], cookie=cookie)
if status != 200 or b'ACCEPTANCE-001 / LIVE WORKSPACE' not in body:
    print(json.dumps({'checkpoint': {'kind': 'preview_failure', 'session': session['id'], 'run': run['id'], 'status': status, 'bytes': len(body)}}), flush=True)
    assert json.loads(sys.stdin.readline())['verified'] is True
assert status == 200 and b'ACCEPTANCE-001 / LIVE WORKSPACE' in body
assert preview_request(preview['url'])[0] == 401
followup = wait(h.submit(session['id'], '用中文一句话总结修改，不调用工具。', 'python-web-follow'))
assert followup['state'] == 'completed'
# Parent independently checks fixed workspace bytes/tests and continues via TS.
print(json.dumps({'checkpoint': {'session': session['id'], 'run': run['id']}}), flush=True)
assert json.loads(sys.stdin.readline())['verified'] is True
# Exercise explicit cancellation without depending on a model race.
cancelled = h.submit(session['id'], '执行 sleep 120，结束后再回复。', 'python-web-cancel')
h.cancel(cancelled['id'])
assert wait(cancelled)['state'] == 'cancelled'
h.revoke_preview(preview['id'])
assert preview_request(preview['url'], cookie=cookie)[0] == 401
retained_preview = h.create_preview(session['id'], 3000)
h.close(session['id'])
retained_url = urlsplit(retained_preview['url'])
assert preview_request(retained_preview['url'], retained_url.path + '?' + retained_url.query)[0] == 401
for artifact_id, expected in hashes.items():
    assert hashlib.sha256(h.download_artifact(artifact_id)).hexdigest() == expected
assert h.run(run['id'])['output'] == result['output']
h.delete_connection(report['id'])
print(json.dumps({'result': {'ts_cancelled_run': ts_cancelled['id'] if ts_cancelled else None, 'session': session['id'], 'run': result, 'cross_language': cross, 'followup': followup, 'cursor_resume': True, 'protected_http_call': protected_http_call, 'event_count': len(seen), 'authorization': authorized, 'approval': approved, 'writes_before_approval': 0, 'writes_after_approval': 1, 'artifacts': artifacts, 'artifacts_retained': True, 'preview_verified': True, 'revoked_preview_denied': True, 'closed_preview_denied': True, 'cancelled_run': cancelled['id'], 'closed': True}}, ensure_ascii=False), flush=True)
