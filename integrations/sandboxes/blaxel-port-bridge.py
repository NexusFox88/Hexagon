"""Private IPv6 ingress for IPv4/IPv6 apps; no provider credentials enter this process."""
import json
import os
from pathlib import Path
import select
import socket
import socketserver
import sys

def identity(pid):
    try:
        return Path(f'/proc/{pid}/stat').read_text().split(') ', 1)[1].split()[19]
    except (FileNotFoundError, IndexError):
        return None


def serve(target, state_path):
    class Handler(socketserver.BaseRequestHandler):
        def handle(self):
            try:
                upstream = socket.create_connection(('127.0.0.1', target), timeout=5)
            except OSError:
                return
            with upstream:
                self.request.settimeout(30)
                upstream.settimeout(30)
                try:
                    while True:
                        ready, _, _ = select.select([self.request, upstream], [], [], 30)
                        if not ready:
                            return
                        for source in ready:
                            data = source.recv(65536)
                            if not data:
                                return
                            (upstream if source is self.request else self.request).sendall(data)
                except OSError:
                    return

    class Server(socketserver.ThreadingTCPServer):
        address_family = socket.AF_INET6
        daemon_threads = True

        def server_bind(self):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
            super().server_bind()

    with Server(('::', target), Handler) as server:
        value = {'pid': os.getpid(), 'start': identity(os.getpid()), 'port': server.server_address[1]}
        temporary = state_path.with_suffix('.tmp')
        temporary.write_text(json.dumps(value))
        temporary.replace(state_path)
        server.serve_forever()

if __name__ == '__main__':
    target = int(sys.argv[2])
    if not 1 <= target <= 65535:
        raise ValueError('invalid_port')
    if sys.argv[1] == 'serve':
        serve(target, Path(sys.argv[3]))
