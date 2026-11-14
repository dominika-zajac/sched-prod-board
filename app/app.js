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
const incidentsById = new Map();
const acked = new Map(); // incident id -> ackedAt

// The incident panel (product's decision after step 1): a row opens it; Ack lives in the panel, so a list
// that moves under the pointer can no longer ack the wrong incident. The panel names the incident it acks.
const panel = document.querySelector('[data-testid="incident-panel"]');
const panelAck = panel.querySelector('[data-testid="panel-ack"]');
let openId = null;

function rowFor(i) {
  const li = document.createElement('li');
  li.dataset.testid = 'incident-row';
  li.dataset.id = i.id;
  li.className = `row ${i.severity}`;
  li.tabIndex = 0;
  li.setAttribute('role', 'button');
  li.setAttribute('aria-label', `Open incident ${i.id}`);
  li.innerHTML = `<span class="id"></span><span class="sev"></span><span class="what"></span><time></time><span class="act"></span>`;
  li.querySelector('.id').textContent = i.id;
  li.querySelector('.sev').textContent = i.severity;
  li.querySelector('.what').textContent = `${i.service} · ${i.region} · ${i.summary}`;
  const t = li.querySelector('time');
  t.dateTime = i.openedAt; // full UTC value stays in the attribute
  t.textContent = localTime(i.openedAt);
  t.title = i.openedAt;
  li.addEventListener('click', () => openPanel(i.id));
  li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(i.id); } });
  return li;
}

function openPanel(id) {
  const i = incidentsById.get(id);
  if (!i) return;
  openId = id;
  for (const li of rows.values()) li.classList.toggle('is-open', li.dataset.id === id);
  panel.querySelector('.p-id').textContent = i.id;
  panel.querySelector('.p-sev').textContent = i.severity;
  panel.querySelector('.p-sev').className = `p-sev ${i.severity}`;
  panel.querySelector('.p-what').textContent = `${i.service} · ${i.region}`;
  panel.querySelector('.p-summary').textContent = i.summary;
  const t = panel.querySelector('.p-time');
  t.dateTime = i.openedAt;
  t.textContent = localTime(i.openedAt);
  showPanelAckState();
  panel.hidden = false;
}

function closePanel() {
  openId = null;
  panel.hidden = true;
  for (const li of rows.values()) li.classList.remove('is-open');
}

function showPanelAckState() {
  const at = acked.get(openId);
  const done = panel.querySelector('.p-acked');
  panelAck.hidden = Boolean(at);
  panelAck.disabled = false;
  panelAck.textContent = `Ack ${openId}`;
  done.hidden = !at;
  if (at) done.textContent = `Acked ${timeOnly.format(new Date(at))}`;
}

async function onPanelAck() {
  const id = openId; // the incident the panel names, never a row position
  if (!id || acked.has(id)) return;
  panelAck.disabled = true;
  panelAck.textContent = `Acking ${id}…`;
  try {
    const reply = await ack(id);
    acked.set(reply.id, reply.ackedAt);
    markRowAcked(reply.id, reply.ackedAt);
    if (openId === id) showPanelAckState();
  } catch (err) {
    if (openId === id) { panelAck.disabled = false; panelAck.textContent = `Ack ${id}`; }
    showStatus(`Ack failed for ${id}: ${err.message}`);
  }
}

function markRowAcked(id, at) {
  const li = rows.get(id);
  if (!li || li.querySelector('[data-testid="acked"]')) return;
  const mark = document.createElement('span');
  mark.dataset.testid = 'acked';
  mark.className = 'acked';
  mark.textContent = `Acked ${timeOnly.format(new Date(at))}`;
  mark.title = at;
  li.querySelector('.act').append(mark);
  li.classList.add('is-acked');
}

panelAck.addEventListener('click', onPanelAck);
panel.querySelector('.p-close').addEventListener('click', closePanel);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closePanel(); });

function showStatus(text) {
  status.textContent = text;
  status.hidden = !text;
}

// R1: keep existing rows (and their state); put new ones at the top, newest first.
function render(incidents) {
  const sorted = [...incidents].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  for (const i of sorted) {
    incidentsById.set(i.id, i);
    if (!rows.has(i.id)) rows.set(i.id, rowFor(i));
  }
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
