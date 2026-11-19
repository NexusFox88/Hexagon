"""Adapter for Aider's documented Python scripting API; installed in an OCI image."""
import json, os, sys
from pathlib import Path
request = json.load(sys.stdin)
os.environ['ANTHROPIC_API_KEY'] = os.environ['HEXAGON_MODEL_KEY']
os.environ['ANTHROPIC_API_BASE'] = request['model']['base_url'].rstrip('/').removesuffix('/v1')
os.environ['AIDER_ANALYTICS'] = 'false'
from aider.coders import Coder
from aider.models import Model
from aider.io import InputOutput
history = Path('.hexagon-aider-history.md')
io = InputOutput(yes=True, pretty=False, chat_history_file=str(history))
model = Model('anthropic/' + request['model']['model'])
coder = Coder.create(main_model=model, io=io, stream=False, use_git=False,
                     auto_commits=False, restore_chat_history=history.exists())
text = coder.run(with_message=request['input'])
print(json.dumps({'type':'hexagon.result','text':text or '', 'native_session':'aider-workspace','failed':not bool(text)}), flush=True)
