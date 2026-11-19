import {expect,it,vi} from 'vitest';import{verifiedWorkspaceRead}from'./serverless-evidence.js';
it('follows public event ids and reconstructs fragmented tool output',async()=>{
 const text=JSON.stringify({type:'tool_execution_start',toolName:'bash',toolCallId:'1',args:{command:'cat hexagon-workspace-file'}})+'\n'+JSON.stringify({type:'tool_execution_end',toolName:'bash',toolCallId:'1',isError:false,result:{content:'CACHE-713'}})+'\n';
 const fetch=vi.fn(async(_run:string,cursor:string)=>({events:cursor==='0'?[{id:'7',type:'harness.stdout',data:{text:text.slice(0,80)}}]:cursor==='7'?[{id:'11',type:'harness.stdout',data:{text:text.slice(80)}}]:[]}));
 expect(await verifiedWorkspaceRead(fetch,'r','CACHE-713')).toBe(true);expect(fetch.mock.calls.map(c=>c[1])).toEqual(['0','7','11']);
});
it('rejects final-answer claims without an actual successful file read',async()=>{
 const fetch=async(_run:string,cursor:string)=>({events:cursor==='0'?[{id:'1',type:'harness.stdout',data:{text:JSON.stringify({type:'message_end',text:'CACHE-713'})+'\n'}}]:[]});
 expect(await verifiedWorkspaceRead(fetch,'r','CACHE-713')).toBe(false);
});
it('fails a nonadvancing event stream instead of looping',async()=>{await expect(verifiedWorkspaceRead(async()=>({events:[{id:'0'}]}),'r','x')).rejects.toThrow('invalid_event_cursor');});
