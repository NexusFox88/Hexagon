import Fastify from 'fastify';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
const dir = '.local/manual-journey'; await mkdir(dir, { recursive: true, mode: 0o700 });
let access: { credential: string };
try { access = JSON.parse(await readFile(`${dir}/tool-access.json`, 'utf8')); }
catch (error: any) { if (error.code !== 'ENOENT') throw error; access = { credential: randomBytes(32).toString('hex') }; await writeFile(`${dir}/tool-access.json`, JSON.stringify(access), { mode: 0o600 }); }
const app = Fastify();
app.addHook('onRequest', async (req, reply) => { if (req.headers.authorization !== `Bearer ${access.credential}`) return reply.code(401).send({ error: 'invalid_credential' }); });
app.get('/auth/check', async () => ({ account: 'local-manual-journey', scope: ['requirements:read', 'reports:write'] }));
app.get('/requirements', async () => ({ id: 'ACCEPTANCE-001', instruction: await readFile('testing/fixtures/filter-app/README.md', 'utf8') }));
app.post('/reports', async req => { const record = { id: randomBytes(8).toString('hex'), at: new Date().toISOString(), report: req.body }; await appendFile(`${dir}/reports.jsonl`, JSON.stringify(record)+'\n', { mode: 0o600 }); return { id: record.id, saved: true }; });
await app.listen({ host: '127.0.0.1', port: 8790 });
console.log('Manual journey Tools listening on 127.0.0.1:8790; credential stored privately in .local/manual-journey/tool-access.json');
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, async () => { await app.close(); });
