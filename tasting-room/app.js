const state = {
  report: null,
  selected: 0
};

const els = {
  fileInput: document.getElementById('fileInput'),
  loadSample: document.getElementById('loadSample'),
  reportName: document.getElementById('reportName'),
  reportState: document.getElementById('reportState'),
  metricArcs: document.getElementById('metricArcs'),
  metricAverage: document.getElementById('metricAverage'),
  metricStrong: document.getElementById('metricStrong'),
  metricReview: document.getElementById('metricReview'),
  arcCount: document.getElementById('arcCount'),
  arcList: document.getElementById('arcList'),
  detailVariant: document.getElementById('detailVariant'),
  detailTitle: document.getElementById('detailTitle'),
  detailDecision: document.getElementById('detailDecision'),
  clockScore: document.getElementById('clockScore'),
  clockBar: document.getElementById('clockBar'),
  distanceValue: document.getElementById('distanceValue'),
  distanceBar: document.getElementById('distanceBar'),
  pleasureValue: document.getElementById('pleasureValue'),
  pleasureBar: document.getElementById('pleasureBar'),
  clockReadout: document.getElementById('clockReadout'),
  scoreReadout: document.getElementById('scoreReadout'),
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

function setReport(report, name = 'reporte cargado') {
  state.report = report;
  state.selected = 0;
  els.reportName.textContent = name;
  els.reportState.textContent = report.character ?? 'atlas';
  render();
}

function render() {
  if (!state.report) return;

  const results = state.report.results ?? [];
  const summary = state.report.summary ?? {};
  const selected = results[state.selected];

  els.metricArcs.textContent = results.length;
  els.metricAverage.textContent = Number(state.report.average ?? 0).toFixed(2);
  els.metricStrong.textContent = summary.strong_arc ?? 0;
  els.metricReview.textContent = summary.review ?? 0;
  els.arcCount.textContent = results.length;

  els.arcList.innerHTML = results.map((item, index) => `
    <button class="arc-button ${index === state.selected ? 'active' : ''}" data-index="${index}" type="button">
      <strong>${item.id}</strong>
      <span>${item.title} · ${item.decision}</span>
    </button>
  `).join('');

  els.arcList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.selected = Number(button.dataset.index);
      render();
    });
  });

  if (selected) renderDetail(selected);
}

function renderDetail(item) {
  const arc = item.clock_arc ?? {};
  const snapshot = item.clock_snapshot ?? {};
  const scores = item.scores ?? {};

  els.detailVariant.textContent = `${item.variant ?? '--'} · ${item.turns ?? 0} turnos`;
  els.detailTitle.textContent = item.title ?? item.id;
  els.detailDecision.textContent = item.decision ?? '--';

  els.clockScore.textContent = fmt(arc.score);
  els.clockBar.style.width = pct(arc.score);

  const minDistance = arc.distancia_min_m;
  const maxDistance = arc.distancia_max_m;
  els.distanceValue.textContent = `${fmt(minDistance)}-${fmt(maxDistance)}m`;
  els.distanceBar.style.width = pct(20 - Number(minDistance ?? 20), 18);

  const minPleasure = arc.placer_min;
  const maxPleasure = arc.placer_max;
  els.pleasureValue.textContent = `${fmt(minPleasure)}-${fmt(maxPleasure)}`;
  els.pleasureBar.style.width = pct(maxPleasure);

  els.clockReadout.innerHTML = entries({
    estado: snapshot.state,
    riesgo: snapshot.risk,
    distancia: `${fmt(snapshot.distance_m)}m`,
    zona: snapshot.distance_zone,
    movimiento: snapshot.distance_move,
    placer: snapshot.pleasure,
    vida: snapshot.aliveness,
    tension: snapshot.tension,
    reserva: snapshot.rep
  });

  els.scoreReadout.innerHTML = entries(scores);

  const notes = arc.notes ?? [];
  els.clockNotes.innerHTML = notes.length
    ? notes.map((note) => `<li>${note}</li>`).join('')
    : '<li>Sin notas.</li>';
}

function entries(data) {
  return Object.entries(data)
    .map(([key, value]) => `<dt>${key}</dt><dd>${fmt(value)}</dd>`)
    .join('');
}

els.fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  setReport(JSON.parse(text), file.name);
});

els.loadSample.addEventListener('click', () => {
  setReport(window.ATLAS_SAMPLE_REPORT, 'demo local');
});

if (window.ATLAS_SAMPLE_REPORT) {
  setReport(window.ATLAS_SAMPLE_REPORT, 'demo local');
}

