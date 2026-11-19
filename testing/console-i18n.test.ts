import { readFile } from 'node:fs/promises';
import { expect, it, afterEach } from 'vitest';
import ts from 'typescript';
// @ts-expect-error The browser module is deliberately usable without a DOM.
import { catalogs, translate, resolveLocale, setLocale, getLocale, UiError, formatNumber, formatDate, formatBytes, formatList } from '../apps/console/i18n.js';

afterEach(() => setLocale('en'));
it('requires complete catalogs and matching interpolation parameters in both languages', () => {
  const keys = Object.keys(catalogs.en).sort();
  expect(Object.keys(catalogs['zh-CN']).sort()).toEqual(keys);
  const parameters=(value:string)=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
  for(const key of keys){
    expect(catalogs.en[key].trim(),key).not.toBe('');expect(catalogs['zh-CN'][key].trim(),key).not.toBe('');
    expect(parameters(catalogs.en[key]),key).toEqual(parameters(catalogs['zh-CN'][key]));
  }
  expect(()=>translate('en','missing.key')).toThrow('Missing translation');
  expect(()=>translate('en','ui.more_actions_name')).toThrow('Missing translation parameter');
  expect(translate('en','ui.more_actions_name',{name:'<script>\u4e2d\u6587</script>'})).toBe('More actions · <script>\u4e2d\u6587</script>');
});
it('resolves explicit preferences, browser language order, regional variants and unsupported languages', () => {
  expect(resolveLocale('zh-CN',['en-US'])).toBe('zh-CN');
  expect(resolveLocale('en',['zh-CN'])).toBe('en');
  expect(resolveLocale('bad',['fr-FR','zh-Hans-SG','en'])).toBe('zh-CN');
  expect(resolveLocale(null,['en-GB','zh-CN'])).toBe('en');
  expect(resolveLocale(null,['zh_TW'])).toBe('en');
  expect(resolveLocale(null,[])).toBe('en');
  expect(()=>setLocale('fr')).toThrow('Unsupported locale');
});
it('formats data and already-created errors using the active locale without changing identifiers', () => {
  const error = new UiError('ui.request_failed_code',{code:'sandbox_lost'});
  for(const locale of ['en','zh-CN']){
    setLocale(locale);expect(getLocale()).toBe(locale);
    expect(formatNumber(1234567.89)).toBe(new Intl.NumberFormat(locale).format(1234567.89));
    expect(formatBytes(2048)).toBe(new Intl.NumberFormat(locale,{style:'unit',unit:'byte',unitDisplay:'short'}).format(2048));
    expect(formatDate('2026-11-16T03:00:00Z')).toBe(new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date('2026-11-16T03:00:00Z')));
    expect(formatList(['A','B'])).toBe(new Intl.ListFormat(locale,{style:'short',type:'conjunction'}).format(['A','B']));
    expect(error.message).toBe(translate(locale,'ui.request_failed_code',{code:'sandbox_lost'}));
  }
});
it('references only defined message keys and keeps literal Chinese out of executable views', async()=>{
  for(const name of ['session-security.js','session-access-editor.js','session-reuse.js','sandbox-connect.js','tool-usage.js','rest-preview.js','harness-console.js','tool-catalog.js','local-workspace.js','session-console.js','run-detail.js','session-code.js','app.js','components.js','icons.js','quickstart.js','quickstart-code.js','infrastructure.js','agents.js','operations.js','tokens.js','index.html']){
    const source=await readFile(new URL('../apps/console/'+name,import.meta.url),'utf8');
    expect(source,name).not.toMatch(/[\u3400-\u9fff]/);
    if(name.endsWith('.js')){
      const parsed=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
      // Flat message keys contain dots; lookup without path interpretation.
      const check=(node:ts.Node)=>{if(ts.isStringLiteral(node)&&node.text.startsWith('ui.'))expect(Object.hasOwn(catalogs.en,node.text),`${name}: ${node.text}`).toBe(true);if(ts.isCallExpression(node)) {
        const fn=node.expression.getText(parsed);
        const indexes=fn==='el'||fn==='field'?[1]:['button','notice','confirmAction'].includes(fn)?[0]:fn==='empty'?[0,1]:[];
        for(const index of indexes){const arg=node.arguments[index];if(arg&&ts.isStringLiteral(arg))expect(['','···','×','CPU','vCPU',...(name==='harness-console.js'?Object.keys(catalogs.en):[])],`${name}: hardcoded UI copy ${arg.text}`).toContain(arg.text);}
      }
      ts.forEachChild(node,check);};check(parsed);
    }else{
      for(const match of source.matchAll(/data-i18n(?:-placeholder|-aria-label)?="([^"]+)"/g))expect(Object.hasOwn(catalogs.en,match[1]!),match[1]).toBe(true);
      for(const match of source.matchAll(/(?:aria-label|placeholder)="([^"]+)"/g)){
        if(!match[0].startsWith('aria-label')&&!match[0].startsWith('placeholder'))continue;
        expect(match[1]).toMatch(/^ui\./);
      }
    }
  }
});

it('rejects duplicate translation keys before JavaScript overwrites them', async()=>{
 for(const locale of ['en','zh-CN']){
  const source=await readFile(new URL('../apps/console/locales/'+locale+'.js',import.meta.url),'utf8');
  const parsed=ts.createSourceFile(locale+'.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const keys=new Set<string>();
  const visit=(node:ts.Node)=>{if(ts.isPropertyAssignment(node)&&ts.isStringLiteral(node.name)){expect(keys.has(node.name.text),locale+': '+node.name.text).toBe(false);keys.add(node.name.text);}ts.forEachChild(node,visit);};visit(parsed);
 }
});
