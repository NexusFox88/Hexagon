# Prepended to the example custom Harness; runs inside the cloud Sandbox.
import os, json, urllib.request
assert os.environ['APP_MODE'] == 'manual-acceptance'
binding = json.loads(os.environ['HEXAGON_CONNECTIONS'])['catalog']
request = urllib.request.Request(binding['base_url'] + os.environ['HTTP_PATH'], headers=binding['headers'], method='GET')
with urllib.request.urlopen(request, timeout=60) as response:
    assert response.status == 200
    response.read(8 * 1024 * 1024)
print('protected_http_ok', flush=True)
