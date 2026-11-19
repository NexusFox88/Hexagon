"""Real stdio -> HTTP mailbox exchange; no model or remote provider simulation claims."""
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.request
import urllib.error
from pathlib import Path


class ToolBridgeTests(unittest.TestCase):
    def test_pending_resume_idempotency_and_auth_scope(self):
        with tempfile.TemporaryDirectory() as root:
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0))
                port = sock.getsockname()[1]
            token = 'management-' + 'm' * 32
            scoped = 'run-tools-' + 't' * 32
            env = {**os.environ, 'HEXAGON_RUNTIME_HOME': root, 'HEXAGON_RUNTIME_TOKEN': token, 'PORT': str(port)}
            server = subprocess.Popen([sys.executable, str(Path(__file__).with_name('server.py'))], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            bridge = None
            def request(method, path, body=None, credential=token):
                req = urllib.request.Request(f'http://127.0.0.1:{port}{path}', data=None if body is None else json.dumps(body).encode(), method=method, headers={'Authorization': f'Bearer {credential}'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    return json.load(response)
            try:
                for _ in range(100):
                    try:
                        request('GET', '/health')
                        break
                    except urllib.error.URLError:
                        time.sleep(.03)
                definitions = [{'name': 'reports__write', 'binding': 'reports', 'operation': 'write', 'description': 'Save report', 'inputSchema': {'type': 'object'}}]
                request('POST', '/runs', {'id': 'tools-run', 'command': [sys.executable, '-c', 'import time; time.sleep(60)'], 'tools': {'token': scoped, 'definitions': definitions}})
                with self.assertRaises(urllib.error.HTTPError) as rejected:
                    request('GET', '/runs/tools-run/tools', credential=scoped)
                self.assertEqual(rejected.exception.code, 401)
                bridge = subprocess.Popen([sys.executable, str(Path(__file__).with_name('tool_bridge.py'))], env={**os.environ, 'HEXAGON_RUNTIME_PORT': str(port), 'HEXAGON_RUN_ID': 'tools-run', 'HEXAGON_TOOL_TOKEN': scoped, 'HEXAGON_TOOLS': json.dumps(definitions)}, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
                def send(row):
                    bridge.stdin.write(json.dumps(row) + '\n')
                    bridge.stdin.flush()
                send({'jsonrpc': '2.0', 'id': 1, 'method': 'initialize'})
                self.assertIn('tools', json.loads(bridge.stdout.readline())['result']['capabilities'])
                send({'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list'})
                listed = json.loads(bridge.stdout.readline())['result']['tools']
                self.assertEqual(listed[0]['name'], 'reports__write')
                self.assertNotIn('binding', listed[0])
                send({'jsonrpc': '2.0', 'id': 3, 'method': 'tools/call', 'params': {'name': 'reports__write', 'arguments': {'report': 'actual transport'}}})
                calls = []
                for _ in range(100):
                    calls = request('GET', '/runs/tools-run/tools')['calls']
                    if calls:
                        break
                    time.sleep(.03)
                self.assertEqual(len(calls), 1)
                call = calls[0]
                self.assertEqual(call['arguments'], {'report': 'actual transport'})
                time.sleep(.6)
                self.assertEqual(request('GET', '/runs/tools-run/tools')['calls'], calls)
                result = {'content': [{'type': 'text', 'text': 'report saved'}]}
                request('POST', '/runs/tools-run/tool-results', {'id': call['id'], 'result': result})
                request('POST', '/runs/tools-run/tool-results', {'id': call['id'], 'result': result})
                self.assertEqual(json.loads(bridge.stdout.readline())['result'], result)
                with self.assertRaises(urllib.error.HTTPError) as conflict:
                    request('POST', '/runs/tools-run/tool-results', {'id': call['id'], 'result': {}})
                self.assertEqual(conflict.exception.code, 409)
                self.assertEqual(request('GET', '/runs/tools-run/tools')['calls'], [])
                request('POST', '/runs/tools-run/cancel')
                with self.assertRaises(urllib.error.HTTPError):
                    request('POST', '/tools/tools-run/call', {'id': call['id'], 'name': 'reports__write', 'arguments': {}}, scoped)
            finally:
                if bridge:
                    bridge.terminate()
                    bridge.communicate(timeout=5)
                try:
                    request('POST', '/runs/tools-run/cancel')
                except Exception:
                    pass
                server.terminate()
                server.wait(timeout=5)


if __name__ == '__main__':
    unittest.main()
