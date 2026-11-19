import { Template } from 'e2b';
import { writeFile } from 'node:fs/promises';
import { localTestCredential } from './local-test-credentials.js';
const apiKey = await localTestCredential('e2b_api_key', 'sandbox');
const alias = 'hexagon-manual-20261115';
if (!await Template.exists(alias, { apiKey })) await Template.build(Template().fromTemplate('base'), alias, { apiKey, memoryMB: 2048, cpuCount: 2 });
if (!await Template.exists(alias, { apiKey })) throw new Error('template_not_ready');
await writeFile('.local/manual-journey/template.json', JSON.stringify({ alias, owned_by: 'manual-journey', retained_for_user: true }), { mode: 0o600 });
console.log(JSON.stringify({ template: alias, ready: true, retained_for_user: true }));
