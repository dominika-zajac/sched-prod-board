import { fetchIncidents, ack } from './api.js';

const REFRESH_MS = 2000; // R4
const board = document.querySelector('[data-testid="board"]');
const list = document.querySelector('[data-testid="incident-list"]');
let loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const status = document.querySelector('.status');

// R5: local time; the locale decides the order (en-GB, de, fr, pl … give dd/mm; en-US gives mm/dd).
const locale = navigator.languages?.[0] || navigator.language || 'en-GB';
const fmt = new Intl.DateTimeFormat(locale, {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
});
const timeOnly = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const localTime = (iso) => fmt.format(new Date(iso));

const rows = new Map(); // incident id -> <li>; acked state lives on the row, so a refresh keeps it

function rowFor(i) {
  const li = document.createElement('li');
  li.dataset.testid = 'incident-row';
  li.dataset.id = i.id;
  li.className = `row ${i.severity}`;
  li.innerHTML = `<span class="id"></span><span class="sev"></span><span class="what"></span>
    <time></time><span class="act"><button type="button" data-testid="ack">Ack</button></span>`;
  li.querySelector('.id').textContent = i.id;
  li.querySelector('.sev').textContent = i.severity;
  li.querySelector('.what').textContent = `${i.service} · ${i.region} · ${i.summary}`;
  const t = li.querySelector('time');
  t.dateTime = i.openedAt; // full UTC value stays in the attribute
  t.textContent = localTime(i.openedAt);
  t.title = i.openedAt;
  li.querySelector('[data-testid="ack"]').addEventListener('click', () => onAck(li, i.id)); // R2: the row's own id
  return li;
}

async function onAck(li, id) {
  const btn = li.querySelector('[data-testid="ack"]');
  btn.disabled = true;
  btn.textContent = 'Acking…';
  try {
    const reply = await ack(id);
    const mark = document.createElement('span');
    mark.dataset.testid = 'acked';
    mark.className = 'acked';
    mark.textContent = `Acked ${timeOnly.format(new Date(reply.ackedAt))}`;
    mark.title = reply.ackedAt;
    btn.replaceWith(mark);
    li.classList.add('is-acked');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Ack';
    showStatus(`Ack failed for ${id}: ${err.message}`);
  }
}

function showStatus(text) {
  status.textContent = text;
  status.hidden = !text;
}

// R1: keep existing rows (and their state); put new ones at the top, newest first.
function render(incidents) {
  const sorted = [...incidents].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  for (const i of sorted) if (!rows.has(i.id)) rows.set(i.id, rowFor(i));
  const wanted = sorted.map((i) => rows.get(i.id));
  wanted.forEach((li, n) => {
    if (list.children[n] !== li) list.insertBefore(li, list.children[n] || null);
  });
  while (list.children.length > wanted.length) list.lastElementChild.remove();
  empty.hidden = sorted.length > 0;
  list.hidden = sorted.length === 0;
}

async function refresh() {
  try {
    const page = await fetchIncidents();
    render(page.incidents);
    loader?.remove(); // R3: gone once incidents load
    showStatus('');
    board.dataset.updatedAt = page.updatedAt;
  } catch (err) {
    showStatus(`Could not load incidents: ${err.message}. Retrying.`);
  } finally {
    setTimeout(refresh, REFRESH_MS); // R4: no overlapping requests
  }
}

refresh();
