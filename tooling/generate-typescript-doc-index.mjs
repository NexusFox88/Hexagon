/** Source-derived signatures and inferred returns; never calls the SDK. */
import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sourcePath=resolve(root,'sdk/typescript/index.ts');
const config=ts.readConfigFile(resolve(root,'sdk/typescript/tsconfig.json'),ts.sys.readFile);
if(config.error)throw Error(ts.flattenDiagnosticMessageText(config.error.messageText,'\n'));
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,resolve(root,'sdk/typescript'));
const program=ts.createProgram(parsed.fileNames,parsed.options),checker=program.getTypeChecker();
const source=program.getSourceFile(sourcePath);
const client=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='Hexagon');
const members=client.members.filter(n=>(ts.isMethodDeclaration(n)||ts.isConstructorDeclaration(n))&&!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword));
const clean=s=>s.replace(/\s+/g,' ').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('|','&#124;');
for(const lang of ['en','zh-CN']){
 const path=resolve(root,`docs/product/${lang}/reference/typescript.md`),text=readFileSync(path,'utf8');
 const rows=['<!-- ts-methods:begin -->','',lang==='en'?'| Declaration | Inferred return |':'| 声明 | 推断返回类型 |','| --- | --- |'];
 for(const n of members){
  const head=n.getText(source).slice(0,n.body.getStart(source)-n.getStart(source)).trim();
  const signature=checker.getSignatureFromDeclaration(n);
  const result=ts.isConstructorDeclaration(n)?'Hexagon':checker.typeToString(checker.getReturnTypeOfSignature(signature),n,ts.TypeFormatFlags.NoTruncation);
  rows.push(`| <code>${clean(head)}</code> | <code>${clean(result)}</code> |`);
 }
 rows.push('','<!-- ts-methods:end -->');
 const start=text.indexOf('<!-- ts-methods:begin -->'),end=text.indexOf('<!-- ts-methods:end -->')+'<!-- ts-methods:end -->'.length;
 if(start<0||end<0)throw Error('Missing generated section');
 writeFileSync(path,text.slice(0,start)+rows.join('\n')+text.slice(end));
}
console.log(`Indexed ${members.length} TypeScript public methods/constructors in both languages`);
