import { readFile, readdir } from 'node:fs/promises';
import { expect, it } from 'vitest';

it('keeps browser-native UI out of the Console and disables native validation bubbles', async () => {
  const directory = new URL('../apps/console/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => /\.(html|js)$/.test(name))) {
    const source = await readFile(new URL(name, directory), 'utf8');
    expect(source, name).not.toMatch(/\b(?:alert|confirm|prompt|reportValidity|showModal)\s*\(/);
    expect(source, name).not.toMatch(/<(?:select|dialog|datalist)\b/i);
    expect(source, name).not.toMatch(/(?:createElement|el)\(['"](?:select|dialog|datalist)['"]/);
    expect(source, name).not.toMatch(/type\s*=\s*['"](?:number|date|datetime-local|time|color|file)['"]/i);
    for (const form of source.matchAll(/<form\b[^>]*>/gi)) expect(form[0], name).toMatch(/\bnovalidate\b/);
  }
});

it('keeps permission checkbox counts separate from account verification details',async()=>{
 const source=await readFile(new URL('../apps/console/app.js',import.meta.url),'utf8');
 expect(source).toContain("querySelector('[data-permission-editor]')");
 expect(source).toContain("operations.dataset.permissionEditor=''");
});
