import { readFile, readdir, writeFile } from 'node:fs/promises';
import { BlaxelConnector } from '../integrations/sandboxes/blaxel.js';
import { localTestCredential } from './local-test-credentials.js';
const connector = new BlaxelConnector({workspace:await localTestCredential('blaxel_workspace','sandbox')},await localTestCredential('blaxel_personal_api_secret','sandbox'));
for (const name of await readdir('.local/evidence')) {
 if (!name.startsWith('blaxel-') || !name.endsWith('.json')) continue;
 const path = `.local/evidence/${name}`, row = JSON.parse(await readFile(path,'utf8'));
 if (row.state === 'intent' || row.cleanup === 'confirmed') continue;
 const id = row.resource?.id ?? (name === 'blaxel-address-probe.json' ? row.name : undefined);
 if (!id) continue;
 if (await connector.inspect(id)) await connector.destroy(id);
 if (await connector.inspect(id)) throw new Error('cleanup_unconfirmed');
 row.cleanup='confirmed';row.reconciled_at=new Date().toISOString();await writeFile(path,JSON.stringify(row,null,2),{mode:0o600}); console.log(JSON.stringify({file:path,cleanup:row.cleanup}));
}
