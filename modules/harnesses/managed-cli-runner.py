"""Configure a pinned upstream CLI, then replace this process for Runtime-owned cancellation.

Only delegated model/tool grants enter the guest. Configuration and native conversation
state live within this Sandbox; no host HOME, external daemon or credential store is used.
"""
import json
import os
import stat
import subprocess
import sys
from pathlib import Path


def write_config(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.write_text(value)
    path.chmod(0o600)


def prepare_sqlite_files(state):
    """Copy up private SQLite files before the CLI captures their file identity.

    Image-backed filesystem restores can change dev/inode on first writable open.
    Opening (without writing) before OpenClaw admission preserves all database/WAL
    bytes and leaves its identity and pathname security checks intact.
    """
    changed_identity = False
    for root, directories, files in os.walk(state, followlinks=False):
        directories[:] = [name for name in directories if not os.path.islink(os.path.join(root, name))]
        for name in files:
            path = os.path.join(root, name)
            info = os.lstat(path)
            if not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid():
                continue
            descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
            try:
                is_database = os.read(descriptor, 16) == b'SQLite format 3\x00'
            finally:
                os.close(descriptor)
            if is_database:
                descriptor = os.open(path, os.O_RDWR | os.O_NOFOLLOW)
                try:
                    opened = os.fstat(descriptor)
                    changed_identity |= (info.st_dev, info.st_ino) != (opened.st_dev, opened.st_ino)
                finally:
                    os.close(descriptor)
    return changed_identity


def configure(request):
    protocol = request['adapter']
    # Some providers mount /tmp without sticky protection. OpenClaw validates every
    # ancestor of its state/temp fallback; use the guest user's private home instead
    # of weakening that check or changing permissions on a shared provider mount.
    state = Path(os.path.expanduser('~/.hexagon-harness') if protocol == 'openclaw-v1' else '/tmp/hexagon-harness') / protocol
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    model = dict(request['model'])
    if model['provider'] in ('openai-compatible', 'openai-responses'):
        model['base_url'] = model['base_url'].rstrip('/').removesuffix('/v1') + '/v1'
    env = dict(os.environ)
    env.update(NO_COLOR='1', CI='1', HEXAGON_RUN_ID=request['run_id'], HEXAGON_TOOLS=json.dumps(request.get('tools', [])))
    bridge = {'command': 'python3', 'args': ['/tmp/hexagon-runtime/tool_bridge.py'],
              'env': {key: env.get(key, '') for key in ('HEXAGON_RUN_ID', 'HEXAGON_TOOLS', 'HEXAGON_TOOL_TOKEN')}}
    native = request.get('native_session')
    initialization = request.get('initialization') or {}
    if initialization.get('context') and not native:
        request['input'] = initialization['context'] + '\n\nCurrent user task:\n' + request['input']
    system = initialization.get('system', '')
    command = request['command']
    if protocol == 'codex-v1':
        env['CODEX_HOME'] = str(state)
        # JSON strings/arrays are valid TOML literals; avoid interpolation into shell code.
        config = [f'model = {json.dumps(model["model"])}', 'model_provider = "hexagon"',
                  'approval_policy = "never"', 'sandbox_mode = "danger-full-access"',
                  *([f'developer_instructions = {json.dumps(system)}'] if system else []),
                  '[model_providers.hexagon]', 'name = "Hexagon"',
                  f'base_url = {json.dumps(model["base_url"])}', 'env_key = "HEXAGON_MODEL_KEY"',
                  'wire_api = "responses"', 'request_max_retries = 0', 'stream_max_retries = 0']
        if request.get('tools'):
            config += ['[mcp_servers.hexagon]', 'command = "python3"',
                       'args = ["/tmp/hexagon-runtime/tool_bridge.py"]', 'required = true',
                       'env_vars = ["HEXAGON_RUN_ID", "HEXAGON_TOOLS", "HEXAGON_TOOL_TOKEN"]']
        write_config(state / 'config.toml', '\n'.join(config) + '\n')
        command += ['exec'] + (['resume', native] if native else [])
        command += ['--json', '--skip-git-repo-check', '--', request['input']]
    elif protocol == 'hermes-v1':
        env.update(HERMES_HOME=str(state), OPENAI_API_KEY=env['HEXAGON_MODEL_KEY'], OPENAI_BASE_URL=model['base_url'],
                   HERMES_DISABLE_LAZY_INSTALLS='1', HERMES_IGNORE_RULES='1', HERMES_YOLO_MODE='1', TERMINAL_CWD=os.getcwd(), HERMES_WRITE_SAFE_ROOT=os.getcwd())
        config = {'model': {'provider': 'custom', 'default': model['model'], 'base_url': model['base_url']},
                  'agent': {'system_prompt': system},
                  'memory': {'memory_enabled': False, 'user_profile_enabled': False},
                  'checkpoints': {'enabled': False},
                  'mcp_servers': {'hexagon': bridge} if request.get('tools') else {}}
        write_config(state / 'config.yaml', json.dumps(config))
        command += ['chat', '--format', 'stream-json', '--provider', 'custom', '--model', model['model'],
                    '--ignore-rules', '--toolsets', 'terminal,file,hexagon',
                    '--max-turns', '30']
        if native:
            command += ['--resume', native]
        command += ['-q', request['input']]
    elif protocol == 'openclaw-v1':
        if system:
            # Platform-owned native persona file; uploads cannot replace it for initialized Sessions.
            soul = Path.cwd() / 'SOUL.md'
            descriptor = os.open(soul, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
            with os.fdopen(descriptor, 'w') as stream:
                stream.write(system)
        restored_database_identity = prepare_sqlite_files(state)
        env['NODE_OPTIONS'] = (env.get('NODE_OPTIONS', '') + ' --import=/tmp/hexagon-runtime/openclaw-observer.mjs').strip()
        env['OPENCLAW_STATE_DIR'] = str(state)
        env['OPENCLAW_CONFIG_PATH'] = str(state / 'openclaw.json')
        api = {'openai-compatible': 'openai-completions', 'openai-responses': 'openai-responses',
               'anthropic-compatible': 'anthropic-messages'}[model['provider']]
        provider = {'baseUrl': model['base_url'], 'apiKey': '${HEXAGON_MODEL_KEY}', 'api': api,
                    'models': [{'id': model['model'], 'name': model['model'], 'contextWindow': 64000, 'maxTokens': 8192}]}
        config = {'models': {'mode': 'replace', 'providers': {'hexagon': provider}, 'catalogRefresh': {'enabled': False}},
                  'agents': {'defaults': {'workspace': os.getcwd(), 'model': {'primary': 'hexagon/' + model['model']},
                                          'skipBootstrap': True, 'sandbox': {'mode': 'off'}}},
                  # The mailbox crosses a cloud transport and can wait for authorization.
                  # OpenClaw's default 60s expires before a recovered transport returns results.
                  'mcp': {'servers': {'hexagon': {**bridge, 'requestTimeoutMs': 300000}} if request.get('tools') else {}},
                  'tools': {'profile': 'coding', 'alsoAllow': ['group:mcp']},
                  'plugins': {'slots': {'memory': 'none'}}, 'cron': {'enabled': False}}
        write_config(state / 'openclaw.json', json.dumps(config))
        if native or restored_database_identity:
            # OpenClaw also persists the shared database identity in its local
            # credential migration receipt. Let upstream reconcile that receipt;
            # never edit its credential tables or bypass admission checks. Check
            # continuations too: a cold boot may change dev without a copy-up.
            repaired = subprocess.run(command + ['doctor', '--client-credentials', '--repair', '--non-interactive'],
                                      env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
            if repaired.returncode:
                raise RuntimeError('openclaw_restored_credentials_repair_failed')
        command += ['agent', '--local', '--json', '--session-id', native or request['run_id'], '--message', request['input']]
    else:
        raise ValueError('unsupported_cli_protocol')
    return command, env


if __name__ == '__main__':
    args, environment = configure(json.load(sys.stdin))
    os.execvpe(args[0], args, environment)
