const el = (id) => document.getElementById(id);
const state = { db: null, table: null };

async function api(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || res.statusText);
  return data;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function checkHealth() {
  const status = el('status');
  try {
    const h = await api('/api/health');
    status.textContent = `MySQL ${h.version} @ ${h.host}:${h.port}`;
    status.className = 'status ok';
  } catch (e) {
    status.textContent = `hors ligne — ${e.message}`;
    status.className = 'status err';
  }
}

async function loadDatabases() {
  const ul = el('databases');
  ul.innerHTML = '<li class="muted">chargement…</li>';
  try {
    const dbs = await api('/api/databases');
    if (!dbs.length) { ul.innerHTML = '<li class="muted">aucune base</li>'; return; }
    ul.innerHTML = '';
    for (const db of dbs) {
      const li = document.createElement('li');
      li.textContent = db;
      li.className = 'item';
      li.onclick = () => selectDb(db, li);
      ul.appendChild(li);
    }
  } catch (e) {
    ul.innerHTML = `<li class="muted err">${escapeHtml(e.message)}</li>`;
  }
}

async function selectDb(db, li) {
  state.db = db;
  state.table = null;
  document.querySelectorAll('#databases .item').forEach((n) => n.classList.remove('active'));
  li.classList.add('active');
  el('tables-title').textContent = `Tables — ${db}`;
  el('placeholder').hidden = false;
  el('table-view').hidden = true;
  const ul = el('tables');
  ul.innerHTML = '<li class="muted">chargement…</li>';
  try {
    const tables = await api(`/api/databases/${encodeURIComponent(db)}/tables`);
    if (!tables.length) { ul.innerHTML = '<li class="muted">aucune table</li>'; return; }
    ul.innerHTML = '';
    for (const t of tables) {
      const item = document.createElement('li');
      item.textContent = t;
      item.className = 'item';
      item.onclick = () => selectTable(t, item);
      ul.appendChild(item);
    }
  } catch (e) {
    ul.innerHTML = `<li class="muted err">${escapeHtml(e.message)}</li>`;
  }
}

function selectTable(table, li) {
  state.table = table;
  document.querySelectorAll('#tables .item').forEach((n) => n.classList.remove('active'));
  li.classList.add('active');
  el('placeholder').hidden = true;
  el('table-view').hidden = false;
  el('table-name').textContent = `${state.db}.${table}`;
  loadTable();
}

function baseUrl() {
  return `/api/databases/${encodeURIComponent(state.db)}/tables/${encodeURIComponent(state.table)}`;
}

async function loadTable() {
  if (!state.db || !state.table) return;
  const limit = el('limit').value || 50;
  try {
    const cols = await api(`${baseUrl()}/columns`);
    el('columns').innerHTML = cols.map((c) => {
      const flags = [c.Type, c.Key, c.Null === 'NO' ? 'NOT NULL' : null, c.Default ? `défaut ${c.Default}` : null]
        .filter(Boolean).join(' • ');
      return `<span class="col"><b>${escapeHtml(c.Field)}</b><small>${escapeHtml(flags)}</small></span>`;
    }).join('');

    const data = await api(`${baseUrl()}/rows?limit=${encodeURIComponent(limit)}`);
    el('count').textContent = `${data.rows.length} / ${data.total} lignes`;
    renderRows(data.rows);
  } catch (e) {
    el('rows').innerHTML = `<tbody><tr><td class="err">${escapeHtml(e.message)}</td></tr></tbody>`;
  }
}

function formatCell(value) {
  if (value === null || value === undefined) return '<span class="null">NULL</span>';
  if (typeof value === 'object') return escapeHtml(JSON.stringify(value));
  return escapeHtml(value);
}

function renderRows(rows) {
  const table = el('rows');
  if (!rows.length) {
    table.innerHTML = '<tbody><tr><td class="muted">aucune ligne</td></tr></tbody>';
    return;
  }
  const headers = Object.keys(rows[0]);
  const thead = `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${formatCell(r[h])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  table.innerHTML = thead + tbody;
}

el('reload').onclick = loadTable;
el('limit').addEventListener('change', loadTable);
checkHealth();
loadDatabases();
