"""Bounded provider-private IPv6 listener forwarding to an IPv4-only guest service."""
import select
import socket
import socketserver
import sys

target_port = int(sys.argv[1])


class Handler(socketserver.BaseRequestHandler):
    def handle(self):
        with socket.create_connection(("127.0.0.1", target_port), timeout=5) as target:
            peers = {self.request: target, target: self.request}
            inputs = list(peers)
            while inputs:
                readable, _, _ = select.select(inputs, [], [], 45)
                if not readable:
                    return
                for source in readable:
                    data = source.recv(65536)
                    if data:
                        peers[source].sendall(data)
                    else:
                        peers[source].shutdown(socket.SHUT_WR)
                        inputs.remove(source)


class Server(socketserver.ThreadingTCPServer):
    address_family = socket.AF_INET6
    daemon_threads = True
    def handle_error(self, request, client_address):
        pass  # Disconnects are ordinary; no payload or credentials are logged.


with Server(("::", 0), Handler) as server:
    print(server.server_address[1], flush=True)
    server.serve_forever()
