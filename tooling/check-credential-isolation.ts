import {createHash} from 'node:crypto';
import type {SandboxConnector} from '../modules/sandboxes/connector.js';

/** Send hashes only; never introduce the original credential into the guest to test absence. */
export async function checkCredentialIsolation(connector:SandboxConnector,sandbox:string,originals:string[]) {
  const digests=originals.map(value=>createHash('sha256').update(value).digest('hex'));
  const source=`import hashlib,json,re,pathlib
expected=set(${JSON.stringify(digests)})
checked=0
leaked=False
def inspect(data):
 global checked,leaked
 checked+=1
 candidates=[data]+re.findall(rb'[A-Za-z0-9_./+=-]{16,}',data)
 for candidate in candidates:
  if hashlib.sha256(candidate).hexdigest() in expected: leaked=True
for process in pathlib.Path('/proc').glob('[0-9]*'):
 for name in ['environ','cmdline']:
  try:
   data=(process/name).read_bytes();inspect(data)
   for entry in data.split(bytes([0])):
    inspect(entry)
    if b'=' in entry:inspect(entry.split(b'=',1)[1])
  except (OSError,PermissionError):pass
for root in pathlib.Path('/tmp').glob('hexagon*'):
 if not root.is_dir():continue
 for path in root.rglob('*'):
  if 'node_modules' in path.parts:continue
  try:
   if path.is_file() and path.stat().st_size<=8*1024*1024:inspect(path.read_bytes())
  except (OSError,PermissionError):pass
print(json.dumps({'checked_sources':checked,'original_key_found':leaked}))
raise SystemExit(1 if leaked else 0)
`;
  await connector.write(sandbox,'/tmp/hexagon-credential-audit.py',Buffer.from(source));
  const result=await connector.execute(sandbox,'python3 /tmp/hexagon-credential-audit.py',{timeout_seconds:60});
  if(result.exit_code!==0)throw new Error('credential_isolation_probe_failed');
  const evidence=JSON.parse(result.stdout);
  if(evidence.original_key_found!==false||evidence.checked_sources<5)throw new Error('credential_isolation_probe_incomplete');
  return evidence;
}
