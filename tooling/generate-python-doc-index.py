"""Update source-derived Python signatures in both reference pages; no SDK calls."""
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'sdk/python/hexagon/__init__.py'
BEGIN = '<!-- python-methods:begin -->'
END = '<!-- python-methods:end -->'
tree = ast.parse(SOURCE.read_text())
client = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == 'Hexagon')
methods = [n for n in client.body if isinstance(n, ast.FunctionDef) and (not n.name.startswith('_') or n.name == '__init__')]
for language in ('en', 'zh-CN'):
    page = ROOT / 'docs/product' / language / 'reference/python.md'
    zh = language == 'zh-CN'
    lines = [BEGIN, '', '| '+('签名（省略 self/cls） | HTTP 映射／返回方式' if zh else 'Signature (self/cls omitted) | HTTP mapping / return mode')+' |', '| --- | --- |']
    for node in methods:
        args = node.args
        signature = ast.unparse(args)
        for prefix in ('self, ', 'cls, '):
            if signature.startswith(prefix): signature = signature[len(prefix):]
        if signature in ('self','cls'): signature = ''
        route = None
        for call in ast.walk(node):
            if isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute) and call.func.attr in ('request','_open') and len(call.args)>=2:
                method = call.args[0].value if isinstance(call.args[0], ast.Constant) else ast.unparse(call.args[0])
                route = f'`{method}` `{ast.unparse(call.args[1])}`'
                break
        if node.name == '__init__': route = 'Hexagon instance; no HTTP request / 无请求'
        if node.name == 'local': route = 'Local discovery → Hexagon instance / 本地发现'
        if node.name == 'request': route = 'JSON-decoded value; 204 → None'
        if node.name == 'download_artifact': route += '; bytes'
        if node.name == 'stream': route += '; generator[dict]'
        lines.append(f'| `{node.name}({signature})` | {route or "See source"} |')
    lines.extend(['', END])
    text=page.read_text(); left=text.index(BEGIN);right=text.index(END)+len(END)
    page.write_text(text[:left]+'\n'.join(lines)+text[right:])
print(f'Indexed {len(methods)} Python methods in both languages; no network requests')
