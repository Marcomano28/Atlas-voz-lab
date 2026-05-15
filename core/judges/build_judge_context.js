import { readText } from '../lib.js';

const responseDiagnosticTargets = [
  'main_failure',
  'missing_signal',
  'overused_field',
  'distance_issue',
  'pleasure_issue',
  'recipe_note',
  'risk'
];

const arcDiagnosticTargets = [
  'arc_failure',
  'missing_turn',
  'missing_state_transition',
  'distance_geometry',
  'pleasure_curve',
  'repertoire_curve',
  'recipe_note'
];

export async function loadJudgeSource(character) {
  const characterRoot = `characters/${character}`;
  const variables = JSON.parse(await readText(`${characterRoot}/variables.json`));
  const rubric = await readText(`${characterRoot}/evaluations/rubrica_yanis.md`);
  return { variables, rubric };
}

export function weightsForScenario(baseWeights, scenario = {}, clock = {}) {
  const weights = { ...baseWeights };
  const state = scenario.state ?? scenario.expected_state;

  if (state === 'desden_nevera' || state === 'machete_agresivo') {
    weights.limite = bump(weights.limite, 0.25);
    weights.safety = bump(weights.safety, 0.25);
    weights.distance_geometry = bump(weights.distance_geometry, 0.15);
  }

  if (state === 'seduccion_alianza' || state === 'coqueteo_basico') {
    weights.scenic_pleasure = bump(weights.scenic_pleasure, 0.2);
    weights.distance_geometry = bump(weights.distance_geometry, 0.15);
    weights.repertoire_economy = bump(weights.repertoire_economy, 0.1);
  }

  if (state === 'confidencia_filosofica') {
    weights.yanisidad = bump(weights.yanisidad, 0.2);
    weights.scenic_pleasure = bump(weights.scenic_pleasure, 0.15);
    weights.cubanidad = soften(weights.cubanidad, 0.15);
  }

  if (state === 'astilla_resolver') {
    weights.limite = bump(weights.limite, 0.15);
    weights.repertoire_economy = bump(weights.repertoire_economy, 0.15);
  }

  if (clock.distance_move === 'step_back') {
    weights.distance_geometry = bump(weights.distance_geometry, 0.25);
  }

  if ((clock.pleasure ?? 0) >= 5) {
    weights.scenic_pleasure = bump(weights.scenic_pleasure, 0.15);
  }

  return weights;
}

export function buildResponseJudgeContext({
  character,
  variables,
  rubric,
  scenario,
  candidate,
  scores = {},
  clock = null,
  history = []
}) {
  const weights = weightsForScenario(variables.judge_weights, scenario, clock ?? {});
  return {
    version: 'judge_context.v1',
    judge_type: 'response',
    character: characterBlock(variables),
    source: {
      variables_path: `characters/${character}/variables.json`,
      rubric_path: `characters/${character}/evaluations/rubrica_yanis.md`
    },
    rubric_excerpt: rubric.slice(0, 1800),
    scenario,
    candidate,
    clock,
    history: history.slice(-6),
    scores,
    weights,
    weighted_score: weightedScore(scores, weights),
    decision_rules: responseDecisionRules(),
    diagnostic_targets: responseDiagnosticTargets,
    diagnosis: diagnoseResponse({ scores, weights, scenario, candidate, clock })
  };
}

export function buildArcJudgeContext({
  character,
  variables,
  rubric,
  arc,
  scores = {},
  clockArc = null,
  clockSnapshot = null
}) {
  const weights = arcWeights(variables.judge_weights, clockArc ?? {});
  return {
    version: 'judge_context.v1',
    judge_type: 'arc',
    character: characterBlock(variables),
    source: {
      variables_path: `characters/${character}/variables.json`,
      rubric_path: `characters/${character}/evaluations/rubrica_yanis.md`
    },
    rubric_excerpt: rubric.slice(0, 1200),
    arc,
    clock: {
      arc: clockArc,
      snapshot: clockSnapshot
    },
    scores,
    weights,
    weighted_score: weightedScore(scores, weights),
    decision_rules: arcDecisionRules(),
    diagnostic_targets: arcDiagnosticTargets,
    diagnosis: diagnoseArc({ scores, arc, clockArc })
  };
}

export function weightedScore(scores, weights) {
  const entries = Object.entries(scores).filter(([key]) => Number.isFinite(weights[key]));
  if (entries.length === 0) return 0;
  const weightedTotal = entries.reduce((sum, [key, score]) => sum + score * weights[key], 0);
  const maxTotal = entries.reduce((sum, [key]) => sum + 5 * weights[key], 0);
  return Number(((weightedTotal / maxTotal) * 10).toFixed(2));
}

export function decideResponseFromContext(context) {
  const scores = context.scores;
  const weighted = context.weighted_score;

  if ((scores.safety ?? 5) < 5 || (scores.limite ?? 5) < 3) return 'rejected';
  if ((scores.cubanidad ?? 5) < 4 && context.scenario?.state !== 'confidencia_filosofica') return 'review';
  if ((scores.yanisidad ?? 5) < 4 || (scores.trigger ?? 5) < 4) return 'review';
  if ((scores.distance_geometry ?? 5) < 3 || (scores.scenic_pleasure ?? 5) < 3) return 'review';
  if ((scores.voice_ready ?? 5) < 4) return 'review';
  if (weighted >= 8) return 'approved_candidate';
  if (weighted >= 6) return 'review';
  if (weighted >= 4) return 'rough_candidate';
  return 'rejected';
}

export function decideArcFromContext(context) {
  const scores = context.scores;
  const clockArc = context.clock?.arc ?? {};
  if ((scores.resolution ?? 5) < 4 || (scores.state_coherence ?? 5) < 4) return 'review';
  if ((clockArc.rango_distancia_m ?? 0) < 2 || (clockArc.rango_placer ?? 0) < 1.5) return 'review';
  if (context.weighted_score >= 8) return 'strong_arc';
  if (context.weighted_score >= 6) return 'review';
  return 'weak_arc';
}

function characterBlock(variables) {
  return {
    id: variables.id,
    display_name: variables.display_name,
    culture: variables.culture,
    temperatures: variables.temperatures,
    states: variables.states,
    social_axes: variables.social_axes,
    boundaries: variables.boundaries
  };
}

function responseDecisionRules() {
  return {
    reject_if: [
      'safety < 5',
      'limite < 3',
      'vulgaridad directa',
      'servilismo o comprabilidad'
    ],
    review_if: [
      'cubanidad < 4 salvo confidencia',
      'yanisidad < 4',
      'trigger < 4',
      'distance_geometry < 3',
      'scenic_pleasure < 3',
      'voice_ready < 4'
    ],
    approve_if: [
      'weighted_score >= 8',
      'sin fallos criticos',
      'diagnostico sin alerta fuerte'
    ]
  };
}

function arcDecisionRules() {
  return {
    reject_if: [
      'sin resolucion',
      'sin coherencia de estados',
      'rompe limites del personaje'
    ],
    review_if: [
      'distancia plana',
      'placer plano',
      'sin climax',
      'repertorio saturado'
    ],
    approve_if: [
      'weighted_score >= 8',
      'hay progresion dramatica',
      'distancia y placer tienen movimiento'
    ]
  };
}

function diagnoseResponse({ scores, scenario, candidate, clock }) {
  const notes = [];
  const coldState = ['desden_nevera', 'machete_agresivo', 'insistencia_pesada'].includes(scenario?.state);
  if ((scores.cubanidad ?? 5) < 4 && scenario?.state !== 'confidencia_filosofica') {
    notes.push('subir cubania organica sin pegar jerga');
  }
  if ((scores.yanisidad ?? 5) < 4) notes.push('reforzar filo, estatus y control de Yanis');
  if ((scores.repertoire_economy ?? 5) < 4) notes.push('cambiar campo semantico o usar callback intencional');
  if ((scores.distance_geometry ?? 5) < 4) notes.push('definir distancia: acercar, alejar o paso atras');
  if (!coldState && (scores.scenic_pleasure ?? 5) < 4) notes.push('hacer visible si Yanis disfruta o se seca');
  if ((scores.voice_ready ?? 5) < 4) notes.push('recortar o segmentar para voz');
  if ((clock?.distance_move ?? '') === 'step_back') notes.push('verificar que el paso atras sea deliberado');
  return {
    main_failure: notes[0] ?? 'sin alerta fuerte',
    recipe_note: notes.join('; ') || 'mantener receta',
    risk: candidate?.risk ?? scenario?.risk ?? 'no declarado'
  };
}

function diagnoseArc({ scores, arc, clockArc }) {
  const notes = [];
  if ((scores.state_coherence ?? 5) < 4) notes.push('revisar secuencia de estados');
  if ((scores.resolution ?? 5) < 4) notes.push('agregar resolucion clara');
  if ((clockArc?.rango_distancia_m ?? 0) < 2) notes.push('falta geometria de distancia');
  if ((clockArc?.rango_placer ?? 0) < 1.5) notes.push('falta curva de placer');
  if ((clockArc?.pasos_atras ?? 0) === 0 && arc?.title?.toLowerCase().includes('paso')) {
    notes.push('el arco promete paso atras pero no lo ejecuta');
  }
  if ((clockArc?.variedad_repo ?? 0) < 2) notes.push('falta variedad de campo semantico');
  return {
    arc_failure: notes[0] ?? 'sin alerta fuerte',
    recipe_note: notes.join('; ') || 'mantener patron de arco'
  };
}

function arcWeights(baseWeights, clockArc) {
  return {
    state_coherence: 1.2,
    dramatic_tension: 1.2,
    resolution: 1.3,
    memory_continuity: 0.8,
    repertoire_economy: baseWeights.repertoire_economy ?? 1,
    character_integrity: baseWeights.yanisidad ?? 1,
    distance_geometry: baseWeights.distance_geometry ?? 1,
    scenic_pleasure: baseWeights.scenic_pleasure ?? 1,
    clock_score: (clockArc?.score ?? 0) > 0 ? 0.8 : 0
  };
}

function bump(value = 1, amount) {
  return Number((value + amount).toFixed(2));
}

function soften(value = 1, amount) {
  return Number(Math.max(0.5, value - amount).toFixed(2));
}
