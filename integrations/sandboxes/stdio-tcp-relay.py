"""One loopback TCP connection over stdio; remote EOF becomes process exit."""
import os
import base64
import select
import socket
import sys

port = int(sys.argv[1])
encoded_output = len(sys.argv) > 2 and sys.argv[2] == '--base64'
if not 1 <= port <= 65535:
    raise ValueError('invalid_port')

with socket.create_connection(('127.0.0.1', port), timeout=5) as remote:
    remote.settimeout(30)
    inputs = [remote, sys.stdin.buffer]
    while True:
        ready, _, _ = select.select(inputs, [], [], 30)
        if not ready:
            raise TimeoutError('relay_idle_timeout')
        for source in ready:
            if source is remote:
                data = remote.recv(65536)
                if not data:
                    sys.exit(0)
                sys.stdout.buffer.write(base64.b64encode(data) + b'\n' if encoded_output else data)
                sys.stdout.buffer.flush()
            else:
                data = os.read(sys.stdin.fileno(), 65536)
                if data:
                    remote.sendall(data)
                else:
                    remote.shutdown(socket.SHUT_WR)
                    inputs.remove(sys.stdin.buffer)
