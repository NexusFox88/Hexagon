"""Launch a detached preview server so it outlives the harness Run."""
import json
import subprocess
import sys
from pathlib import Path

with Path('preview.log').open('ab') as log:
    process = subprocess.Popen([sys.executable, '-m', 'http.server', '3000', '--bind', '0.0.0.0'], stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True, close_fds=True)
print(json.dumps({'port': 3000, 'pid': process.pid}))
