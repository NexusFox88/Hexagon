import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Hexagon } from '../../sdk/typescript/dist/index.js';
const owner = JSON.parse(await readFile('.local/control-plane/owner.json', 'utf8'));
const client = new Hexagon('http://127.0.0.1:8787', owner.token);
const terminal = createInterface({ input: stdin, output: stdout });
let session;
try {
  const rows = (await client.request('GET', '/connections')).connections;
  const selected = {};
  for (const [kind, name] of [['sandbox','My Sandbox'],['model','My Model'],['requirements','Requirements'],['reports','Reports']]) {
    const matches = rows.filter(row => row.name === name && row.kind === (['requirements','reports'].includes(kind) ? 'tool' : kind));
    if (matches.length !== 1) throw new Error(`Create exactly one connection in the Console first: ${name}`);
    if (kind !== 'reports' && (!matches[0].enabled || matches[0].status !== 'ready')) throw new Error(`Verify and enable first: ${name}`);
    selected[kind] = matches[0].id;
  }
  const agent = await client.createAgent({ name: 'Manual Web task', harness: { id: 'opencode', version: '1.2.27' }, tools: [{ name: 'requirements' }, { name: 'reports', required_at_start: false }] });
  session = await client.createSession({ agent_id: agent.id, sandbox_connection_id: selected.sandbox, model_connection_id: selected.model, tools: { requirements: selected.requirements, reports: selected.reports } });
  console.log(`Session: ${session.id}\nView this Session in Console > Sandbox Fleet.`);
  const directory = 'testing/fixtures/filter-app';
  await client.upload(session.id, await Promise.all((await readdir(directory)).map(async path => ({ path, content_base64: (await readFile(`${directory}/${path}`)).toString('base64') }))));
  async function runTask(text, key) {
    const run = await client.submit(session.id, text, key); console.log(`Run: ${run.id}`);
    let cursor='0';
    while (true) {
      try {
        for await (const event of client.stream(run.id,cursor)) {
          if(event.id) cursor=event.id;
          if(event.type==='authorization.required') console.log('Configure Reports credentials in Console, verify and enable the connection, or deny authorization in Fleet.');
          if(event.type==='approval.required') { console.log('Approval requested: ',JSON.stringify(event.data)); const answer=await terminal.question('Allow this report write? [y/N] '); await client.decide(event.data.id,answer.toLowerCase()==='y'); }
          if(event.type.startsWith('run.')) console.log(event.type);
        }
        break;
      } catch(error) {
        console.error(`Connection interrupted: ${error.message}; cursor ${cursor}\u3002`);
        if((await terminal.question('Press Enter to reconnect, or q to exit: '))==='q') throw error;
      }
    }
    const result=await client.run(run.id); console.log(`State: ${result.state}\n${result.output?.text || JSON.stringify(result.error)}`);
    const folder=`.local/manual-journey/downloads/${run.id}`; await mkdir(folder,{recursive:true});
    for(const artifact of (await client.artifacts(run.id)).artifacts) { await writeFile(`${folder}/${artifact.id}`,await client.downloadArtifact(artifact.id)); console.log(`Artifact ${artifact.name} → ${folder}/${artifact.id}`); }
    return result;
  }
  await runTask('First call requirements read for ACCEPTANCE-001. Implement filter.mjs following README.md without changing acceptance.mjs. Run node acceptance.mjs, save its output as test-report.txt and place both files in the Run artifact directory. Start python3 serve.py and retain the port 3000 preview. Finally call reports write, wait for authorization and approval, and summarize the outcome in English.','manual-first');
  console.log('Create a port 3000 preview in Fleet and check the filtering interaction.');
  await terminal.question('Press Enter after inspection to send a follow-up: ');
  await runTask('Summarize the changes in three sentences and name the main modified file. Do not call tools.','manual-followup');
  if((await terminal.question('Close the Session and clean up the cloud Sandbox? [Y/n] ')).toLowerCase()!=='n') { await client.close(session.id); console.log('Session closed; exported artifacts are retained.'); }
  else console.log(`Keeping Session ${session.id}. Close it in Fleet when finished; cloud resources remain billable until cleanup or expiry.`);
} catch(error) { console.error(error.message); if(session) console.error(`Session ${session.id} retained for diagnosis; cancel the Run or close the Session in Fleet.`); process.exitCode=1; }
finally { terminal.close(); }
