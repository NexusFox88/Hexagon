import assert from 'node:assert/strict';
import { filterItems } from './filter.mjs';
const items = [
  { id: '1', title: 'Launch API', status: 'done' },
  { id: '2', title: 'Write SDK guide', status: 'open' },
  { id: '3', title: 'Review API tests', status: 'open' },
  { id: '4', title: '\u53d1\u5e03\u8bf4\u660e', status: 'done' },
];
const before = JSON.stringify(items);
assert.deepEqual(filterItems(items).map(i => i.id), ['1','2','3','4']);
assert.deepEqual(filterItems(items, '  api  ').map(i => i.id), ['1','3']);
assert.deepEqual(filterItems(items, '', 'open').map(i => i.id), ['2','3']);
assert.deepEqual(filterItems(items, 'API', 'done').map(i => i.id), ['1']);
assert.deepEqual(filterItems(items, 'missing'), []);
assert.deepEqual(filterItems(items, '\u53d1\u5e03').map(i => i.id), ['4']);
assert.deepEqual(filterItems([], 'API', 'open'), []);
assert.equal(JSON.stringify(items), before);
console.log('8 assertions passed');
