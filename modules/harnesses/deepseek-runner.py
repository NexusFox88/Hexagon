"""Configure official dsh headless without copying upstream credentials into files."""
import json
import os
from pathlib import Path
import sys

request = json.load(sys.stdin)
model = request['model']
patch = [
    {'id': 'llm-deepseek', 'config': {
        'baseURL': model['base_url'].rstrip('/'), 'apiKeyEnv': 'HEXAGON_MODEL_KEY',
        'thinking': 'disabled',
        'models': [{'id': model['model'], 'contextWindow': 131072, 'maxTokens': 8192}],
    }},
    {'id': 'agent-default-model', 'config': {'provider': 'deepseek-official', 'model': model['model']}},
    {'id': 'session-log-deepseek', 'disabled': True},
    {'id': 'session-persistence-jsonl', 'config': {'root': str(Path.cwd() / '.hexagon-dsh-sessions'), 'compression': 'none'}},
]
if request.get('tools'):
    patch.append({'insert': [{'id': 'hexagon-mcp', 'name': '@deepseek-ai/dsh-mcp-client', 'config': {
        'serverName': 'hexagon', 'transport': 'stdio', 'command': 'python3',
        'args': ['/tmp/hexagon-runtime/tool_bridge.py'],
        'env': {'HEXAGON_RUN_ID': request['run_id'], 'HEXAGON_TOOL_TOKEN': os.environ['HEXAGON_TOOL_TOKEN'],
                'HEXAGON_TOOLS': json.dumps(request['tools'])},
        'toolCallTimeoutMs': 3600000,
    }}]})
path = Path('/tmp/hexagon-runtime/deepseek.patch.json')
path.write_text(json.dumps(patch))
path.chmod(0o600)
command = json.loads(os.environ['HEXAGON_DSH_COMMAND']) + ['headless', '--patch', str(path), '--json', '--approval-policy', 'never']
if request.get('native_session'):
    command += ['--session-id', request['native_session']]
command += ['--', request['input']]
os.execvpe(command[0], command, {**os.environ, 'DSH_HOME': str(Path.cwd() / '.hexagon-dsh'), 'DSH_TELEMETRY_DISABLED': '1'})
