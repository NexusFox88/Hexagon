import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it} from 'vitest';
const source=readFileSync(new URL('../apps/console/theme.js',import.meta.url),'utf8');
function boot(saved:string|null,dark=false,blocked=false){
 const listeners:Record<string,Function>={},media={matches:dark,addEventListener:(_:string,f:Function)=>listeners.media=f};
 const document={documentElement:{dataset:{} as any},dispatchEvent:()=>{}},storage={getItem:()=>{if(blocked)throw Error();return saved;},setItem:(_:string,value:string)=>{if(blocked)throw Error();saved=value;}};
 const window:any={matchMedia:()=>media,addEventListener:(name:string,f:Function)=>listeners[name]=f};
 runInNewContext(source,{window,document,localStorage:storage,Event:class {}});return {window,document,media,listeners,saved:()=>saved};
}
it('resolves system before render, follows OS changes and pins explicit choices',()=>{
 const x=boot(null,true);expect(x.document.documentElement.dataset.theme).toBe('dark');
 x.media.matches=false;x.listeners.media!();expect(x.document.documentElement.dataset.theme).toBe('light');
 x.window.hexagonTheme.set('dark');expect(x.saved()).toBe('dark');x.listeners.media!();expect(x.document.documentElement.dataset.theme).toBe('dark');
 expect(boot(x.saved()).document.documentElement.dataset.theme).toBe('dark');
});
it('handles denied storage, invalid preferences and cross-tab reset',()=>{
 const x=boot('invalid',true,true);expect(x.window.hexagonTheme.preference).toBe('system');x.window.hexagonTheme.set('light');expect(x.document.documentElement.dataset.theme).toBe('light');
 x.window.hexagonTheme.set('invalid');expect(x.window.hexagonTheme.preference).toBe('light');
 x.listeners.storage!({key:'hexagon.console.theme',newValue:null});expect(x.document.documentElement.dataset.theme).toBe('dark');
});
