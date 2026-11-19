// Activepieces Discord/Telegram request mappings adapted for the control-plane broker (MIT).
import {type AppDefinition,operation,string,id,page,encode} from './types.js';
import {ToolAuthenticationError} from '../tools/http-json.js';
const discordBase='https://discord.com/api/v10';
const snowflake={type:'string',pattern:'^[0-9]{1,25}$'};
export const discord:AppDefinition={id:'discord',name:'Discord',category:'communication',credential_url:'https://discord.com/developers/applications',authHeader:token=>({Authorization:`Bot ${token}`}),verify:()=>({url:discordBase+'/users/@me',method:'GET'}),identity:b=>b.username,operations:{
 list_servers:operation('List guilds accessible to the connected bot. Follow the last ID with after.',false,{after:snowflake,limit:page},[],a=>({url:discordBase+'/users/@me/guilds',method:'GET',query:a})),
 list_channels:operation('List channels in a guild accessible to the bot.',false,{guild_id:snowflake},['guild_id'],a=>({url:discordBase+'/guilds/'+encode(a.guild_id)+'/channels',method:'GET'})),
 read_history:operation('Read channel messages. Requires history permission and applicable message-content intent.',false,{channel_id:snowflake,before:snowflake,limit:page},['channel_id'],({channel_id,...query})=>({url:discordBase+'/channels/'+encode(channel_id)+'/messages',method:'GET',query})),
 send_message:operation('Send a bot message. Mentions are disabled to prevent accidental notifications.',true,{channel_id:snowflake,text:{...string,maxLength:2000}},['channel_id','text'],a=>({url:discordBase+'/channels/'+encode(a.channel_id)+'/messages',method:'POST',body:{content:a.text,allowed_mentions:{parse:[]}}})),
 edit_message:operation('Edit a message owned by this bot; mentions remain disabled.',true,{channel_id:snowflake,message_id:snowflake,text:{...string,maxLength:2000}},['channel_id','message_id','text'],a=>({url:`${discordBase}/channels/${encode(a.channel_id)}/messages/${encode(a.message_id)}`,method:'PATCH',body:{content:a.text,allowed_mentions:{parse:[]}}})),
}};
const telegramBase='https://api.telegram.org';
const chat={type:'string',minLength:1,maxLength:256};
export const telegram:AppDefinition={id:'telegram',name:'Telegram Bot',category:'communication',credential_url:'https://t.me/BotFather',
 authenticate:(credential,spec)=>{if(!/^[0-9]+:[A-Za-z0-9_-]+$/.test(credential))throw new ToolAuthenticationError();const url=new URL(spec.url);if(url.origin!==telegramBase||!/^\/[A-Za-z]+$/.test(url.pathname))throw new Error('invalid_application_endpoint');return {...spec,url:`${telegramBase}/bot${credential}${url.pathname}`};},authHeader:()=>({}),
 verify:()=>({url:telegramBase+'/getMe',method:'POST'}),identity:b=>b.result?.username,operations:{
 read_bot:operation('Read the connected Telegram bot profile.',false,{},[],()=>({url:telegramBase+'/getMe',method:'POST'})),
 read_chat:operation('Read a chat the bot can access. Telegram bots cannot enumerate arbitrary private chats.',false,{chat_id:chat},['chat_id'],a=>({url:telegramBase+'/getChat',method:'POST',body:a})),
 send_message:operation('Send a plain-text bot message to an existing reachable chat; no history polling or webhook takeover.',true,{chat_id:chat,text:{...string,maxLength:4096},disable_notification:{type:'boolean'},message_thread_id:{type:'integer',minimum:1}},['chat_id','text'],a=>({url:telegramBase+'/sendMessage',method:'POST',body:a})),
 edit_message:operation('Edit a bot message by chat and message IDs.',true,{chat_id:chat,message_id:{type:'integer',minimum:1},text:{...string,maxLength:4096}},['chat_id','message_id','text'],a=>({url:telegramBase+'/editMessageText',method:'POST',body:a})),
}};
export const messagingApps=[discord,telegram];
