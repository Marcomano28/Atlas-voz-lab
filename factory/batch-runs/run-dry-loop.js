import { readJsonl, writeText } from '../../core/lib.js';

const character = process.argv[2];

if (!character) {
  console.error('Usage: node scripts/run-dry-loop.js <character>');
  process.exit(1);
}

const characterRoot = `characters/${character}`;
const scenarios = await readJsonl(`${characterRoot}/scenarios/core.jsonl`);
const candidates = await readJsonl(`${characterRoot}/datasets/candidates/dry_run_seed.jsonl`);
const scenarioById = new Map(scenarios.map(({ value }) => [value.id, value]));

const cubanMarkers = [
  'asere',
  'saldo',
  'guagua',
  'apag',
  'paquete',
  'bicitaxi',
  'almendr',
  'astilla',
  'wifi',
  'qué bolá',
  'que bola',
  'candela',
  'sombrita',
  'barrio',
  'cobertura'
];

const yanisMarkers = [
  'mi amor',
  'mi vida',
  'asere',
  'brillo',
  'motor',
  'saldo',
  'madera',
  'corazón',
  'cabeza',
  'vitrina',
  'carrocería'
];

const hardVulgarity = [
  'pinga',
  'singar',
  'mamar',
  'boyo',
  'culo'
];

function clamp(score) {
  return Math.max(1, Math.min(5, score));
}

function containsAny(text, markers) {
  const lower = text.toLowerCase();
  return markers.filter((marker) => lower.includes(marker)).length;
}

function scoreCubanidad(text) {
  const hits = containsAny(text, cubanMarkers);
  return clamp(2 + Math.min(3, hits));
}

function scoreYanisidad(text) {
  const hits = containsAny(text, yanisMarkers);
  return clamp(2 + Math.min(3, hits));
}

function scoreLimite(text) {
  const lower = text.toLowerCase();
  if (hardVulgarity.some((word) => lower.includes(word))) return 1;
  if (lower.includes('bloquear') || lower.includes('camina') || lower.includes('revisa')) return 5;
  return 4;
}

function scoreTrigger(text, scenario) {
  const lower = text.toLowerCase();
  const state = scenario.state;

  if (state === 'desden_nevera') {
    return lower.includes('saldo') || lower.includes('terminal') || lower.includes('menú') || lower.includes('foto') ? 5 : 3;
  }
  if (state === 'machete_agresivo') {
    return lower.includes('cadena') || lower.includes('cableado') || lower.includes('espejuelos') ? 5 : 3;
  }
  if (state === 'seduccion_alianza') {
    return lower.includes('curva') || lower.includes('candela') || lower.includes('planta eléctrica') ? 5 : 3;
  }
  if (state === 'insistencia_pesada') {
    return lower.includes('insistencia') || lower.includes('2g') || lower.includes('cobertura') ? 5 : 3;
  }
  if (state === 'astilla_resolver') {
    return lower.includes('astilla') || lower.includes('aserrín') || lower.includes('wi-fi') ? 5 : 3;
  }
  if (state === 'confidencia_filosofica') {
    return lower.includes('sabes') || lower.includes('corazón') || lower.includes('capó') ? 5 : 3;
  }
  if (state === 'nombre_llave_barrio') {
    return lower.includes('marta') || lower.includes('nombre') || lower.includes('barrio') ? 5 : 3;
  }
  if (state === 'oficio_chucho_social') {
    return lower.includes('trompet') || lower.includes('nota') || lower.includes('metales') ? 5 : 3;
  }

  return 4;
}

function scoreRitmoOral(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 8) return 2;
  if (words <= 45) return 5;
  if (words <= 70) return 4;
  return 2;
}

function scoreVoiceReady(text) {
  const sentences = text.split(/[.!?]+/).filter((part) => part.trim()).length;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words <= 36 && sentences <= 3) return 5;
  if (words <= 55 && sentences <= 4) return 4;
  if (words <= 75) return 3;
  return 2;
}

function scoreRepertoireEconomy(text) {
  const lower = text.toLowerCase();
  const fieldMarkers = {
    energia: ['apag', 'voltaje', 'luz', 'corriente', 'planta', 'fusible', 'cableado'],
    tecnologia: ['saldo', 'cobertura', 'paquete', 'datos', 'wifi', 'modo avion', 'modo avión'],
    transporte: ['guagua', 'almendr', 'bicitaxi', 'freno', 'motor', 'chofer'],
    comida_vida: ['cafe', 'café', 'pan', 'menú', 'jaba', 'cocina', 'sabor'],
    astilla: ['astilla', 'aserr', 'dinero', 'fula', 'madera']
  };
  const usedFields = Object.entries(fieldMarkers).map(([field, markers]) => {
    const hits = markers.reduce((count, marker) => count + (lower.split(marker).length - 1), 0);
    return { field, hits };
  });
  const saturated = usedFields.filter(({ hits }) => hits >= 3);
  const loaded = usedFields.filter(({ hits }) => hits === 2);
  if (saturated.length > 0) return 2;
  if (loaded.length > 1) return 3;
  if (loaded.length === 1) return 4;
  return 5;
}

function scoreNoRepetition(text) {
  const lower = text.toLowerCase();
  const repeatedImages = ['saldo', 'motor', 'cobertura', 'barrio', 'asere']
    .filter((marker) => lower.split(marker).length - 1 > 1);
  if (repeatedImages.length > 1) return 3;
  if (repeatedImages.length === 1) return 4;
  return 5;
}

function scoreSafety(text) {
  if (containsAny(text, hardVulgarity) > 0) return 1;
  return 5;
}

function decide(total, scores) {
  if (scores.safety < 5 || scores.limite < 3) return 'rejected';
  if (scores.cubanidad < 4 || scores.yanisidad < 4 || scores.trigger < 4) return 'review';
  if (scores.voice_ready < 4) return 'review';
  if (total >= 34) return 'approved_candidate';
  if (total >= 29) return 'review';
  if (total >= 25) return 'review';
  if (total >= 18) return 'rough_candidate';
  return 'rejected';
}

function notesFor(scores, text) {
  const notes = [];
  if (scores.cubanidad < 4) notes.push('subir marcadores cubanos organicos');
  if (scores.yanisidad < 4) notes.push('reforzar filo/seduccion/control de Yanis');
  if (scores.repertoire_economy < 4) notes.push('reserva semantica saturada; cambiar de campo o usar callback intencional');
  if (scores.no_repetition < 4) notes.push('revisar repeticion interna de imagenes');
  if (scores.safety < 5) notes.push('riesgo de seguridad o vulgaridad');
  if (scores.voice_ready < 4) notes.push('recortar para TTS streaming');
  if (containsAny(text, hardVulgarity) > 0) notes.push('rechazar por vulgaridad directa');
  return notes.length ? notes : ['sin alerta fuerte'];
}

const results = [];

for (const { value: candidate } of candidates) {
  const scenario = scenarioById.get(candidate.scenario_id);
  if (!scenario) {
    throw new Error(`Unknown scenario_id: ${candidate.scenario_id}`);
  }

  const text = candidate.candidate_response;
  const scores = {
    cubanidad: scoreCubanidad(text),
    yanisidad: scoreYanisidad(text),
    limite: scoreLimite(text),
    trigger: scoreTrigger(text, scenario),
    ritmo_oral: scoreRitmoOral(text),
    repertoire_economy: scoreRepertoireEconomy(text),
    no_repetition: scoreNoRepetition(text),
    safety: scoreSafety(text),
    voice_ready: scoreVoiceReady(text)
  };
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);

  results.push({
    scenario_id: candidate.scenario_id,
    state: scenario.state,
    variant: candidate.variant,
    total,
    decision: decide(total, scores),
    scores,
    notes: notesFor(scores, text),
    user_input: scenario.user_input,
    candidate_response: text
  });
}

const summary = results.reduce((acc, result) => {
  acc[result.decision] = (acc[result.decision] ?? 0) + 1;
  return acc;
}, {});

const average = results.reduce((sum, result) => sum + result.total, 0) / results.length;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = `out/${character}/reports/dry-run-${timestamp}.json`;
const mdPath = `out/${character}/reports/dry-run-${timestamp}.md`;

await writeText(jsonPath, `${JSON.stringify({ character, average, summary, results }, null, 2)}\n`);

const rows = results
  .map((result) => `| ${result.scenario_id} | ${result.state} | ${result.variant} | ${result.total} | ${result.decision} | ${result.notes.join('; ')} |`)
  .join('\n');

await writeText(mdPath, `# Dry run ${character}

Average score: ${average.toFixed(2)}

Summary:

${Object.entries(summary).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

| Scenario | State | Variant | Total | Decision | Notes |
| --- | --- | --- | ---: | --- | --- |
${rows}
`);

console.log(`Dry loop completed for ${character}.`);
console.log(`Average score: ${average.toFixed(2)}`);
console.log(`Summary: ${JSON.stringify(summary)}`);
console.log(`Report: ${mdPath}`);
