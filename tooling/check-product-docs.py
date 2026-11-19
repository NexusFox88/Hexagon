"""Structural documentation checks only; never claims content or cloud acceptance."""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs/product'
PLAN = ROOT / 'docs/plans/2026-11-19-documentation-content-architecture.tmp.md'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--require-complete', action='store_true', help='Also reject pending/draft coverage; not a substitute for editorial audit')
parser.add_argument('--report', type=Path)
args = parser.parse_args()
errors = []
ledger = json.loads((DOCS / 'coverage.json').read_text())
expected = re.findall(r'^#### ([ESBICORD]\d{2}) ·', PLAN.read_text(), re.M)
items = ledger['items']
ids = [item['id'] for item in items]
if len(ids) != len(set(ids)) or set(ids) != set(expected):
    errors.append('Coverage IDs do not exactly match the architecture inventory')
paths = [item['target'] for item in items]
if len(paths) != len(set(paths)):
    errors.append('Duplicate canonical coverage paths')
links = {}
for page in sorted(DOCS.rglob('*.md')):
    text = page.read_text()
    if text.count('```') % 2:
        errors.append(f'{page.relative_to(ROOT)}: unmatched fenced code block')
    # Exclude fenced examples when scanning authored inline Markdown links.
    prose = re.sub(r'```[^\n]*\n.*?```', '', text, flags=re.S)
    links[page.resolve()] = set()
    for target in re.findall(r'\]\(([^)]+)\)', prose):
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target) or target.startswith('#'):
            continue
        destination = (page.parent / target.split('#')[0]).resolve()
        if not destination.exists():
            errors.append(f'{page.relative_to(ROOT)}: missing file {target}')
        links[page.resolve()].add(destination)
for locale, field in [('zh-CN', 'zh_CN'), ('en', 'en')]:
    visited = set()
    queue = [(DOCS / locale / 'index.md').resolve()]
    while queue:
        page = queue.pop()
        if page in visited:
            continue
        visited.add(page)
        queue.extend(links.get(page, set()) - visited)
    for item in items:
        state = item[field]
        if state not in ('pending', 'draft', 'reviewed', 'complete'):
            errors.append(f'{item["id"]}: invalid {field} state {state}')
        if args.require_complete and state != 'complete':
            errors.append(f'{item["id"]}/{locale}: {state}')
        if state == 'pending':
            continue
        route = item['target']
        page = ROOT / 'README.md' if item['id'] == 'E02' else DOCS / locale / ('index.md' if route == '/' else route.lstrip('/') + '.md')
        if not page.is_file():
            errors.append(f'{item["id"]}/{locale}: coverage claims a missing page')
        elif page.resolve() not in visited:
            errors.append(f'{item["id"]}/{locale}: page unreachable from language index')
report = {
    'scope': 'Inventory, files, inline Markdown link file targets, fence pairing, and index reachability only. Anchors, external URLs, prose correctness, examples and real-cloud behavior require separate verification.',
    'planned_assets': len(expected),
    'markdown_files': len(links),
    'coverage': {field: dict(Counter(item[field] for item in items)) for field in ('zh_CN', 'en')},
    'errors': errors,
    'passed': not errors,
}
if args.report:
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
