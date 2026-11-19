import json
from pathlib import Path
import socket
import subprocess
import sys
import socketserver
import tempfile
import threading
import time
import unittest

SCRIPT = Path(__file__).with_name('blaxel-port-bridge.py')


class BridgeTest(unittest.TestCase):
    def test_ipv6_ingress_for_ipv4_only_binary_http_response(self):
        payload = bytes(range(256)) * 1024

        class Application(socketserver.BaseRequestHandler):
            def handle(self):
                self.request.recv(4096)
                self.request.sendall(b'HTTP/1.1 200 OK\r\nContent-Length: ' + str(len(payload)).encode() + b'\r\nConnection: close\r\n\r\n' + payload)

        with socketserver.TCPServer(('127.0.0.1', 0), Application) as app, tempfile.TemporaryDirectory() as directory:
            thread = threading.Thread(target=app.serve_forever, daemon=True)
            thread.start()
            state = Path(directory) / 'bridge.json'
            process = subprocess.Popen([sys.executable, str(SCRIPT), 'serve', str(app.server_address[1]), str(state)])
            try:
                deadline = time.monotonic() + 5
                while not state.exists() and time.monotonic() < deadline and process.poll() is None:
                    time.sleep(0.02)
                self.assertTrue(state.exists())
                port = json.loads(state.read_text())['port']
                with socket.create_connection(('::1', port), timeout=5) as client:
                    client.sendall(b'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n')
                    chunks = []
                    while True:
                        chunk = client.recv(65536)
                        if not chunk:
                            break
                        chunks.append(chunk)
                header, body = b''.join(chunks).split(b'\r\n\r\n', 1)
                self.assertTrue(header.startswith(b'HTTP/1.1 200'))
                self.assertEqual(body, payload)
            finally:
                process.terminate()
                process.wait(5)
                app.shutdown()
                thread.join(5)


if __name__ == '__main__':
    unittest.main()
