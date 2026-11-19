import {it,expect} from 'vitest';import {Marked} from 'marked';
// @ts-expect-error Browser formatter also accepts the package parser in Node.
import {messageRenderer} from '../apps/console/markdown.js';
const render=messageRenderer(Marked);
it('renders conversation formatting without executing HTML or fetching images',()=>{
 const html=render('**Answer**\n\n```js\nconst x = "<script>";\n```\n\n[Docs](https://example.com/docs)\n\n<script>alert(1)</script>\n\n![tracking](https://example.com/pixel)');
 expect(html).toContain('<strong>Answer</strong>');expect(html).toContain('<pre>');expect(html).toContain('rel="noopener noreferrer"');expect(html).not.toContain('<script>');expect(html).not.toContain('<img');
});
it('rejects active URLs and escapes raw HTML and hostile link attributes',()=>{
 for(const text of ['[x](javascript:alert%281%29)','[x](data:text/html,evil)','<img src=x onerror=alert(1)>','[x](https://example.com/\"onclick=evil)']){
  const html=render(text);expect(html).not.toMatch(/href="(?:javascript|data):|<img|<script|"onclick=/);
 }
});
