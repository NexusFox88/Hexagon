import {afterEach,expect,it,vi} from 'vitest';
import {applicationRequest,redactApplicationResult,applicationCatalog} from './registry.js';
import {trello} from './project-management.js';
import {telegram,discord} from './messaging.js';
import {graphPage,outlook} from './microsoft.js';
import {googleSheets,googleTasks} from './google-workspace.js';
import {executeTool} from '../../modules/tools/adapters.js';
import {ToolAuthenticationError} from '../tools/http-json.js';
afterEach(()=>vi.unstubAllGlobals());
it('puts Trello component credentials in an authorization header, never query strings, and redacts each component',async()=>{
 const credential=JSON.stringify({api_key:'key-private',token:'token-private'});
 const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify({echo:'key-private and token-private'})));vi.stubGlobal('fetch',transport);
 expect(await applicationRequest(trello,credential,trello.verify({}))).toEqual({echo:'[REDACTED] and [REDACTED]'});
 const [url,request]=transport.mock.calls[0]!;expect(String(url)).toBe('https://api.trello.com/1/members/me');expect(request.headers.Authorization).toBe('OAuth oauth_consumer_key="key-private", oauth_token="token-private"');
 expect(redactApplicationResult(trello,credential,{echo:credential})).toEqual({echo:'[REDACTED]'});
 await expect(applicationRequest(trello,'not-json',trello.verify({}))).rejects.toBeInstanceOf(ToolAuthenticationError);
 expect(transport).toHaveBeenCalledTimes(1);
});
it('only materializes Telegram bot tokens immediately before transport and keeps them out of public metadata',async()=>{
 const credential='123456:private_token';const spec=telegram.verify({});expect(spec.url).toBe('https://api.telegram.org/getMe');
 const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:true,result:{username:'fixture'}})));vi.stubGlobal('fetch',transport);
 await applicationRequest(telegram,credential,spec);expect(String(transport.mock.calls[0]![0])).toBe('https://api.telegram.org/bot123456:private_token/getMe');
 expect(JSON.stringify(applicationCatalog())).not.toContain(credential);
 expect(telegram.operations.get_updates).toBeUndefined();expect(telegram.operations.set_webhook).toBeUndefined();
 await expect(applicationRequest(telegram,'bad/url',spec)).rejects.toBeInstanceOf(ToolAuthenticationError);
 expect(transport).toHaveBeenCalledTimes(1);
});
it('allows Graph pagination only on the exact operation resource and rejects invalid links before transport',async()=>{
 const good='https://graph.microsoft.com/v1.0/me/messages?$skiptoken=opaque%2Ftoken';expect(graphPage('/me/messages',{next_page_url:good}).url).toBe(good);
 for(const url of ['https://evil.example/v1.0/me/messages','http://graph.microsoft.com/v1.0/me/messages','https://graph.microsoft.com/v1.0/me/drive/root','https://u:p@graph.microsoft.com/v1.0/me/messages','https://graph.microsoft.com/v1.0/me/messages#fragment'])expect(()=>graphPage('/me/messages',{next_page_url:url})).toThrow();
 vi.stubGlobal('fetch',vi.fn());await expect(executeTool(outlook.id,{operations:['list_messages']},'key','list_messages',{next_page_url:'http://localhost/'},'call')).rejects.toMatchObject({code:'app_arguments_invalid'});expect(fetch).not.toHaveBeenCalled();
});
it('preserves provider-specific side effect semantics when migrating mappings',()=>{
 const sheets=googleSheets.operations.append_values!.request({spreadsheet_id:'sheet',range:'Tab name!A1',values:[['=1+1']]},{});expect(sheets.query).toEqual({valueInputOption:'RAW',insertDataOption:'INSERT_ROWS'});expect(sheets.url).toContain('Tab%20name!A1:append');
 const task=googleTasks.operations.create_task!.request({list_id:'list',title:'Task',due_date:'2026-12-31',parent:'parent'},{});expect(task.query).toEqual({parent:'parent',previous:undefined});expect(task.body).toMatchObject({due:'2026-12-31T00:00:00Z'});expect(task.body).not.toHaveProperty('parent');
 const message=discord.operations.send_message!.request({channel_id:'123',text:'@everyone'},{});expect(message.body).toMatchObject({allowed_mentions:{parse:[]}});
});
