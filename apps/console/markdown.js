// HTML supplied by model/tool output is always text. Remote images never load.
const escape=text=>String(text??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function messageRenderer(Marked){
 const parser=new Marked({gfm:true,breaks:true,renderer:{
  html({text}){return escape(text);},
  link({href,tokens}){const label=this.parser.parseInline(tokens);try{const url=new URL(href);if(!['https:','http:'].includes(url.protocol))return label;return `<a href="${escape(url.href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;}catch{return label;}},
  image({text}){return escape(text);}
 }});
 return text=>parser.parse(String(text??''),{async:false});
}
