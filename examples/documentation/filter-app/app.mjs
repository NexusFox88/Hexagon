import { filterItems } from './filter.mjs';
const items = [
  { id: '1', title: 'Launch API', status: 'done' },
  { id: '2', title: 'Write SDK guide', status: 'open' },
  { id: '3', title: 'Review API tests', status: 'open' },
  { id: '4', title: '\u53d1\u5e03\u8bf4\u660e', status: 'done' },
];
function render() {
  try {
    const result = filterItems(items, document.querySelector('#query').value, document.querySelector('#status').value);
    document.querySelector('#items').replaceChildren(...result.map(item => {
      const card = document.createElement('article'), name = document.createElement('h2'), badge = document.createElement('span');
      card.dataset.id = item.id; name.textContent = item.title; badge.textContent = item.status === 'done' ? 'Done' : 'In progress'; badge.className = item.status;
      card.append(name, badge); return card;
    }));
    document.querySelector('#count').textContent = `${result.length} tasks`;
    document.querySelector('#empty').hidden = result.length !== 0;
    document.querySelector('#error').hidden = true;
  } catch (error) { document.querySelector('#error').textContent = error.message; document.querySelector('#error').hidden = false; }
}
document.querySelector('#filters').addEventListener('submit', event => { event.preventDefault(); render(); });
render();
