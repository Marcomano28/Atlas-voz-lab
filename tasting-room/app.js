const state = {
  report: null,
  reportPath: null,
  selected: 0,
  serverOnline: false,
  busy: false,
  queues: null
};

const els = {
  fileInput: document.getElementById('fileInput'),
  loadSample: document.getElementById('loadSample'),
  loadLatestDry: document.getElementById('loadLatestDry'),
  loadLatestArc: document.getElementById('loadLatestArc'),
  loadLatestLive: document.getElementById('loadLatestLive'),
  runDry: document.getElementById('runDry'),
  runArc: document.getElementById('runArc'),
  runLive: document.getElementById('runLive'),
  curateCurrent: document.getElementById('curateCurrent'),
  commandLog: document.getElementById('commandLog'),
  reportName: document.getElementById('reportName'),
  reportState: document.getElementById('reportState'),
  serverState: document.getElementById('serverState'),
  metricItems: document.getElementById('metricItems'),
  metricAverage: document.getElementById('metricAverage'),
  metricApproved: document.getElementById('metricApproved'),
  metricReview: document.getElementById('metricReview'),
  queueApproved: document.getElementById('queueApproved'),
  queueReview: document.getElementById('queueReview'),
  queueRough: document.getElementById('queueRough'),
  queueRejected: document.getElementById('queueRejected'),
  itemCount: document.getElementById('itemCount'),
  itemList: document.getElementById('itemList'),
  detailVariant: document.getElementById('detailVariant'),
  detailTitle: document.getElementById('detailTitle'),
  detailDecision: document.getElementById('detailDecision'),
  metadataReadout: document.getElementById('metadataReadout'),
  clockScore: document.getElementById('clockScore'),
  clockBar: document.getElementById('clockBar'),
  distanceValue: document.getElementById('distanceValue'),
  distanceBar: document.getElementById('distanceBar'),
  pleasureValue: document.getElementById('pleasureValue'),
  pleasureBar: document.getElementById('pleasureBar'),
  clockReadout: document.getElementById('clockReadout'),
  scoreReadout: document.getElementById('scoreReadout'),
  userInput: document.getElementById('userInput'),
  candidateResponse: document.getElementById('candidateResponse'),
  clockNotes: document.getElementById('clockNotes')
};

function fmt(value, fallback = '--') {
  if (value === undefined || value === null || Number.isNaN(value)) return fallback;
  return String(value);
}

function pct(value, max = 10) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';
  return `${Math.max(0, Math.min(100, (number / max) * 100))}%`;
}

function reportKind(report) {
  const schema = report?.metadata?.schema_version ?? '';
  if (schema.includes('arc')) return 'arc';
  if (schema.includes('live')) return 'live';
  if (schema.includes('dry')) return 'dry';
  return 'report';
}

function setReport(report, name = 'reporte cargado', reportPath = null) {
  state.report = report;
  state.reportPath = reportPath;
  state.selected = 0;
  els.reportName.textContent = name;
  els.reportState.textContent = `${report.character ?? 'atlas'} · ${reportKind(report)}`;
  render();
}

function setLog(message) {
  els.commandLog.textContent = message;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {})
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`);
  }
  return payload;
}

async function checkServer() {
  try {
    await api('/api/health');
    state.serverOnline = true;
    els.serverState.textContent = 'control conectado';
    els.serverState.classList.add('ok');
    await refreshQueues();
    await loadLatest('arc', { silent: true });
  } catch {
    state.serverOnline = false;
    els.serverState.textContent = 'modo archivo';
    els.serverState.classList.remove('ok');
    setLog('Abierto sin servidor de control. Puedes cargar JSON manual o demo.');
  }
  updateControls();
}

function updateControls() {
  const commandButtons = [els.runDry, els.runArc, els.runLive, els.curateCurrent];
  for (const button of commandButtons) {
    button.disabled = !state.serverOnline || state.busy;
  }
  els.curateCurrent.disabled = !state.serverOnline || state.busy || !state.reportPath;
  els.loadLatestDry.disabled = !state.serverOnline || state.busy;
  els.loadLatestArc.disabled = !state.serverOnline || state.busy;
  els.loadLatestLive.disabled = !state.serverOnline || state.busy;
}

async function loadLatest(kind, { silent = false } = {}) {
  if (!state.serverOnline) return;
  const list = await api(`/api/reports?kind=${kind}`);
  const latest = list.reports[0];
  if (!latest) {
    if (!silent) setLog(`No hay reportes ${kind}.`);
    return;
  }
  const report = await api(`/api/report?path=${encodeURIComponent(latest.path)}`);
  setReport(report, latest.name, latest.path);
  if (!silent) setLog(`Cargado ${latest.path}`);
}

async function runAction(action) {
  if (!state.serverOnline || state.busy) return;
  state.busy = true;
  updateControls();
  setLog(`Ejecutando ${action}...`);
  try {
    const result = await api('/api/run', {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    setLog(commandSummary(result));
    if (result.followup) {
      await loadLatest(result.followup, { silent: true });
    }
  } catch (error) {
    setLog(`Error: ${error.message}`);
  } finally {
    state.busy = false;
    updateControls();
  }
}

async function curateCurrentReport() {
  if (!state.reportPath || !state.serverOnline || state.busy) return;
  state.busy = true;
  updateControls();
  setLog(`Curando ${state.reportPath}...`);
  try {
    const result = await api('/api/curate', {
      method: 'POST',
      body: JSON.stringify({ reportPath: state.reportPath })
    });
    setLog(commandSummary(result));
    await refreshQueues();
  } catch (error) {
    setLog(`Error: ${error.message}`);
  } finally {
    state.busy = false;
    updateControls();
  }
}

function commandSummary(result) {
  const head = `${result.ok ? 'OK' : 'Fallo'} ${result.action ?? 'comando'} (${result.code})`;
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  return output ? `${head}\n${output}` : head;
}

async function refreshQueues() {
  if (!state.serverOnline) return;
  state.queues = await api('/api/curation');
  renderQueues();
}

function render() {
  if (!state.report) return;

  const results = state.report.results ?? [];
  const summary = state.report.summary ?? {};
  const selected = results[state.selected];

  els.metricItems.textContent = results.length;
  els.metricAverage.textContent = Number(state.report.average ?? 0).toFixed(2);
  els.metricApproved.textContent = (summary.approved_candidate ?? 0) + (summary.strong_arc ?? 0);
  els.metricReview.textContent = summary.review ?? 0;
  els.itemCount.textContent = results.length;

  els.itemList.innerHTML = results.map((item, index) => `
    <button class="arc-button ${index === state.selected ? 'active' : ''}" data-index="${index}" type="button">
      <strong>${escapeHtml(itemId(item))}</strong>
      <span>${escapeHtml(itemTitle(item))} · ${escapeHtml(item.decision ?? '--')}</span>
    </button>
  `).join('');

  els.itemList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.selected = Number(button.dataset.index);
      render();
    });
  });

  if (selected) renderDetail(selected);
}

function renderQueues() {
  const routes = state.queues?.routes ?? {};
  els.queueApproved.textContent = routes.approved_candidates?.count ?? 0;
  els.queueReview.textContent = routes.review_queue?.count ?? 0;
  els.queueRough.textContent = routes.rough_candidates?.count ?? 0;
  els.queueRejected.textContent = routes.rejected?.count ?? 0;
}

function renderDetail(item) {
  const arc = item.clock_arc ?? item.judge_context?.clock?.arc ?? {};
  const snapshot = item.clock_snapshot ?? item.judge_context?.clock?.snapshot ?? {};
  const scores = item.scores ?? {};
  const metadata = item.metadata ?? {};

  els.detailVariant.textContent = `${item.variant ?? '--'} · ${item.turns ?? item.state ?? 'respuesta'}`;
  els.detailTitle.textContent = itemTitle(item);
  els.detailDecision.textContent = item.decision ?? '--';
  els.detailDecision.dataset.decision = item.decision ?? '';

  els.metadataReadout.innerHTML = entries({
    juez: metadata.judge_version ?? state.report?.metadata?.judge_version,
    contexto: metadata.judge_context_version ?? state.report?.metadata?.judge_context_version,
    variables: shortHash(metadata.variables_sha256 ?? state.report?.metadata?.variables_sha256),
    rubrica: shortHash(metadata.rubric_sha256 ?? state.report?.metadata?.rubric_sha256),
    fuente: state.reportPath ?? 'archivo local'
  });

  const score = arc.score ?? item.total ?? item.weighted_score;
  els.clockScore.textContent = fmt(score);
  els.clockBar.style.width = pct(score);

  const minDistance = arc.distancia_min_m ?? snapshot.distance_m;
  const maxDistance = arc.distancia_max_m ?? snapshot.distance_m;
  els.distanceValue.textContent = `${fmt(minDistance)}-${fmt(maxDistance)}m`;
  els.distanceBar.style.width = pct(20 - Number(minDistance ?? 20), 18);

  const minPleasure = arc.placer_min ?? snapshot.pleasure;
  const maxPleasure = arc.placer_max ?? snapshot.pleasure;
  els.pleasureValue.textContent = `${fmt(minPleasure)}-${fmt(maxPleasure)}`;
  els.pleasureBar.style.width = pct(maxPleasure);

  els.clockReadout.innerHTML = entries({
    estado: snapshot.state ?? item.state ?? item.judge_context?.state_info?.normalized,
    riesgo: snapshot.risk ?? item.judge_context?.scenario?.risk,
    distancia: snapshot.distance_m ? `${fmt(snapshot.distance_m)}m` : undefined,
    zona: snapshot.distance_zone,
    movimiento: snapshot.distance_move,
    placer: snapshot.pleasure,
    vida: snapshot.aliveness,
    tension: snapshot.tension,
    reserva: snapshot.rep
  });

  els.scoreReadout.innerHTML = entries(scores);
  els.userInput.textContent = item.user_input ?? item.judge_context?.candidate?.user_input ?? firstTurnUser(item) ?? '--';
  els.candidateResponse.textContent = item.candidate_response ?? item.judge_context?.candidate?.response ?? firstTurnYanis(item) ?? '--';

  const notes = item.notes ?? arc.notes ?? [item.diagnosis?.recipe_note].filter(Boolean);
  els.clockNotes.innerHTML = notes.length
    ? notes.map((note) => `<li>${escapeHtml(String(note))}</li>`).join('')
    : '<li>Sin notas.</li>';
}

function entries(data) {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(fmt(value))}</dd>`)
    .join('');
}

function itemId(item) {
  return item.scenario_id ?? item.id ?? 'sin-id';
}

function itemTitle(item) {
  return item.title ?? item.scenario_id ?? item.id ?? 'resultado';
}

function firstTurnUser(item) {
  return item.turn_log?.[0]?.user_msg;
}

function firstTurnYanis(item) {
  return item.turn_log?.[0]?.yanis_response;
}

function shortHash(hash) {
  return hash ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : '--';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

els.fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  setReport(JSON.parse(text), file.name, null);
});

els.loadSample.addEventListener('click', () => {
  setReport(window.ATLAS_SAMPLE_REPORT, 'demo local', null);
});

els.loadLatestDry.addEventListener('click', () => loadLatest('dry'));
els.loadLatestArc.addEventListener('click', () => loadLatest('arc'));
els.loadLatestLive.addEventListener('click', () => loadLatest('live'));
els.runDry.addEventListener('click', () => runAction('dry'));
els.runArc.addEventListener('click', () => runAction('arc'));
els.runLive.addEventListener('click', () => runAction('live'));
els.curateCurrent.addEventListener('click', () => curateCurrentReport());

if (window.ATLAS_SAMPLE_REPORT) {
  setReport(window.ATLAS_SAMPLE_REPORT, 'demo local', null);
}

checkServer();
