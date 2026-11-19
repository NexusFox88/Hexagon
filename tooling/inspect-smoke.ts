import { readdir, readFile, stat } from 'node:fs/promises';
import { E2BConnector } from '../integrations/sandboxes/e2b.js';
import { localTestCredential } from './local-test-credentials.js';

const files = await Promise.all((await readdir('.local/evidence')).filter(f => /^e2b-.*\.json$/.test(f)).map(async name => ({ name, time: (await stat(`.local/evidence/${name}`)).mtimeMs })));
files.sort((a, b) => b.time - a.time);
const journal = JSON.parse(await readFile(`.local/evidence/${files[0]!.name}`, 'utf8'));
if (journal.cleanup === 'confirmed') throw new Error('Latest smoke is already cleaned up');
const connector = new E2BConnector({}, await localTestCredential('e2b_api_key', 'sandbox'));
const script = "import pathlib,json\nfor p in pathlib.Path('/tmp/hexagon-runtime/runs').glob('*/state.json'):\n s=json.loads(p.read_text()); print(json.dumps({'id':s['id'],'state':s['state'],'exit_code':s.get('exit_code')}))\n e=p.parent/'events.jsonl'\n if e.exists():\n  for line in e.read_text().splitlines()[-8:]:\n   r=json.loads(line); print(json.dumps({'type':r['type'],'bytes':len(json.dumps(r['data']))}))\n";
await connector.write(journal.resource.id, '/tmp/hexagon-inspect.py', Buffer.from(script));
const result = await connector.execute(journal.resource.id, 'python3 /tmp/hexagon-inspect.py', { timeout_seconds: 15 });
console.log(result.stdout);
