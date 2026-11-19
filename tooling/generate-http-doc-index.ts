/** Enumerates literal management routes without starting a server or accessing a DB. */
import ts from 'typescript';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {applicationRoute} from '../modules/credentials/application-tokens.js';
const path='apps/control-plane/server.ts',source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
const rows:Array<{method:string;path:string;application:boolean}>=[];
function visit(n:ts.Node){
 if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.expression.getText(source)==='api'&&['get','post','put','patch','delete'].includes(n.expression.name.text)&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){
  const method=n.expression.name.text.toUpperCase(),route='/v1'+n.arguments[0].text;
  rows.push({method,path:route,application:applicationRoute(method,route.replace(/:[a-z_]+/g,'example-id'))});
 }
 ts.forEachChild(n,visit);
}
visit(source);
if(new Set(rows.map(r=>r.method+' '+r.path)).size!==rows.length)throw Error('Duplicate routes');
const assignments:Record<string,string>=JSON.parse(readFileSync('docs/product/http-operation-pages.json','utf8')).assignments;
const routeKeys=new Set(rows.map(r=>r.method+' '+r.path));
for(const [operation,page] of Object.entries(assignments)){
 if(!routeKeys.has(operation))throw Error(`Documentation assignment has no current route: ${operation}`);
 for(const lang of ['en','zh-CN'])if(!existsSync(`docs/product/${lang}/reference/${page}`))throw Error(`Missing ${lang} operation page: ${page}`);
}
const operations=rows.map(row=>({...row,page:assignments[row.method+' '+row.path]??null,status:assignments[row.method+' '+row.path]?'source-reviewed-draft':'operation-reference-pending'}));
writeFileSync('docs/product/http-operation-coverage.json',JSON.stringify({scope:'Current literal management routes and editorial page assignments. A draft assignment does not certify exhaustive schemas, executable examples or runtime acceptance.',total:rows.length,assigned:operations.filter(row=>row.page).length,pending:operations.filter(row=>!row.page).length,operations},null,2)+'\n');
for(const lang of ['en','zh-CN']){
 const target=`docs/product/${lang}/reference/http.md`,text=readFileSync(target,'utf8');
 const body=['<!-- http-routes:begin -->','',lang==='en'?'| Method | Path | Application token |':'| \u65b9\u6cd5 | \u8def\u5f84 | Application Token |','| --- | --- | --- |',...rows.map(r=>`| ${r.method} | \`${r.path}\` | ${r.application?'Allowed / \u5141\u8bb8':'Owner required / \u8981\u6c42 owner'} |`),'','<!-- http-routes:end -->'].join('\n');
 const begin=text.indexOf('<!-- http-routes:begin -->'),end=text.indexOf('<!-- http-routes:end -->')+'<!-- http-routes:end -->'.length;
 if(begin<0)throw Error('Missing marker');
 writeFileSync(target,text.slice(0,begin)+body+text.slice(end));
}
console.log(`${rows.length} literal management routes indexed; authorization classifier evaluated, no requests sent`);
