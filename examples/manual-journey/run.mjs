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
    if (matches.length !== 1) throw new Error(`请先在 GUI 创建唯一的连接：${name}`);
    if (kind !== 'reports' && (!matches[0].enabled || matches[0].status !== 'ready')) throw new Error(`请先验证并启用 ${name}`);
    selected[kind] = matches[0].id;
  }
  const agent = await client.createAgent({ name: 'Manual Web task', harness: { id: 'opencode', version: '1.2.27' }, tools: [{ name: 'requirements' }, { name: 'reports', required_at_start: false }] });
  session = await client.createSession({ agent_id: agent.id, sandbox_connection_id: selected.sandbox, model_connection_id: selected.model, tools: { requirements: selected.requirements, reports: selected.reports } });
  console.log(`Session: ${session.id}\n在 Console → Sandbox Fleet 中查看该 Session。`);
  const directory = 'testing/fixtures/filter-app';
  await client.upload(session.id, await Promise.all((await readdir(directory)).map(async path => ({ path, content_base64: (await readFile(`${directory}/${path}`)).toString('base64') }))));
  async function runTask(text, key) {
    const run = await client.submit(session.id, text, key); console.log(`Run: ${run.id}`);
    let cursor='0';
    while (true) {
      try {
        for await (const event of client.stream(run.id,cursor)) {
          if(event.id) cursor=event.id;
          if(event.type==='authorization.required') console.log('请在 GUI → 连接管理中为 Reports 补充凭证、验证并启用；也可以在 Fleet 拒绝本次授权。');
          if(event.type==='approval.required') { console.log('审批请求：',JSON.stringify(event.data)); const answer=await terminal.question('允许本次报告写入？[y/N] '); await client.decide(event.data.id,answer.toLowerCase()==='y'); }
          if(event.type.startsWith('run.')) console.log(event.type);
        }
        break;
      } catch(error) {
        console.error(`连接中断：${error.message}；游标 ${cursor}。`);
        if((await terminal.question('按 Enter 续接；输入 q 退出：'))==='q') throw error;
      }
    }
    const result=await client.run(run.id); console.log(`状态：${result.state}\n${result.output?.text || JSON.stringify(result.error)}`);
    const folder=`.local/manual-journey/downloads/${run.id}`; await mkdir(folder,{recursive:true});
    for(const artifact of (await client.artifacts(run.id)).artifacts) { await writeFile(`${folder}/${artifact.id}`,await client.downloadArtifact(artifact.id)); console.log(`产物 ${artifact.name} → ${folder}/${artifact.id}`); }
    return result;
  }
  await runTask('先调用 requirements read 读取 ACCEPTANCE-001。按 README.md 实现 filter.mjs，不修改 acceptance.mjs，运行 node acceptance.mjs，将测试输出保存为 test-report.txt，并把 test-report.txt 和 filter.mjs 放入本次 Run 产物目录。启动 python3 serve.py，保持端口3000预览服务运行。最后调用 reports write，等待授权及审批结果后，用中文说明完成情况。','manual-first');
  console.log('在 Fleet 详情创建端口 3000 的预览，检查筛选交互。');
  await terminal.question('检查完成后按 Enter 发送追问：');
  await runTask('把刚才的修改总结成三句话，并指出主要修改文件。不调用工具。','manual-followup');
  if((await terminal.question('关闭 Session 并清理云端 Sandbox？[Y/n] ')).toLowerCase()!=='n') { await client.close(session.id); console.log('Session 已关闭；已导出产物保留。'); }
  else console.log(`保留 Session ${session.id}。完成后请在 Fleet 关闭，云端资源持续计费直至清理或到期。`);
} catch(error) { console.error(error.message); if(session) console.error(`Session ${session.id} 保留用于排查；请在 Fleet 取消任务/关闭 Session。`); process.exitCode=1; }
finally { terminal.close(); }
