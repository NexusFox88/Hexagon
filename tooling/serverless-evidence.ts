/** Reads persisted native events; a final answer alone is not filesystem evidence. */
export async function verifiedWorkspaceRead(fetchEvents:(run:string,after:string)=>Promise<{events:any[]}>,run:string,expected:string){
 const events:any[]=[];let cursor='0';
 for(let page=0;page<100;page++){
  const batch=(await fetchEvents(run,cursor)).events;if(!batch.length)break;
  const next=String(batch.at(-1).id);if(!/^\d+$/.test(next)||BigInt(next)<=BigInt(cursor))throw Error('invalid_event_cursor');
  events.push(...batch);cursor=next;
  if(page===99)throw Error('event_limit_exceeded');
 }
 const native=events.filter(e=>e.type==='harness.stdout').map(e=>e.data.text??'').join('').split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
 const reads=new Set(native.filter(e=>e.type==='tool_execution_start'&&e.toolName==='bash'&&/\bcat\b/.test(e.args?.command??'')&&(e.args?.command??'').includes('hexagon-workspace-file')).map(e=>e.toolCallId));
 return native.some(e=>e.type==='tool_execution_end'&&e.toolName==='bash'&&reads.has(e.toolCallId)&&!e.isError&&JSON.stringify(e.result).includes(expected));
}

/** OpenClaw local exec must still be admitted after filesystem restore. */
export async function verifiedOpenClawExec(fetchEvents:(run:string,after:string)=>Promise<{events:any[]}>,run:string){
 let cursor='0';
 for(let page=0;page<100;page++){
  const batch=(await fetchEvents(run,cursor)).events;if(!batch.length)return false;
  if(batch.some(e=>e.type==='agent.activity.completed'&&e.data.name==='exec'&&e.data.is_error===false))return true;
  const next=String(batch.at(-1).id);if(!/^\d+$/.test(next)||BigInt(next)<=BigInt(cursor))throw Error('invalid_event_cursor');cursor=next;
 }
 throw Error('event_limit_exceeded');
}
