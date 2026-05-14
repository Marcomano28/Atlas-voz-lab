import { readText, writeText } from '../../core/lib.js';
import { spawnSync } from 'node:child_process';

const character = process.argv[2];

if (!character) {
  console.error('Usage: node factory/batch-runs/run-arc-dry-loop.js <character>');
  process.exit(1);
}

const arcs = JSON.parse(await readText(`characters/${character}/scenarios/arcs.json`));

const resolutionStates = [
  'resolucion_complice',
  'resolucion_calida',
  'cierre_elegante',
  'machete_final',
  'confidencia_filosofica'
];

const highTensionStates = [
  'desden_nevera',
  'machete_agresivo',
  'insistencia_pesada',
  'astilla_resolver'
];

const bridgeStates = [
  'redencion',
  'coqueteo_basico',
  'seduccion_alianza',
  'confidencia_filosofica'
];

function clamp(score) {
  return Math.max(1, Math.min(5, score));
}

function scoreStateCoherence(arc) {
  const turnStates = arc.turns.map((turn) => turn.expected_state);
  const expectedStates = arc.expected_arc ?? [];
  const missing = turnStates.filter((state) => !expectedStates.includes(state));
  if (missing.length === 0) return 5;
  if (missing.length <= 1) return 4;
  if (missing.length <= 2) return 3;
  return 2;
}

function scoreDramaticTension(arc) {
  const states = arc.turns.map((turn) => turn.expected_state);
  const hasHigh = states.some((state) => highTensionStates.includes(state));
  const hasBridge = states.some((state) => bridgeStates.includes(state));
  const hasResolution = states.some((state) => resolutionStates.includes(state));
  return clamp(2 + Number(hasHigh) + Number(hasBridge) + Number(hasResolution));
}

function scoreResolution(arc) {
  const last = arc.turns.at(-1)?.expected_state;
  if (resolutionStates.includes(last)) return 5;
  if (bridgeStates.includes(last)) return 4;
  return 2;
}

function scoreMemoryContinuity(arc) {
  const hasMemory = Boolean(arc.memory && Object.keys(arc.memory).length);
  const mentionsMemoryGoal = arc.turns.some((turn) => /nombre|oficio|record|confianza|piezas/i.test(turn.goal));
  if (hasMemory && mentionsMemoryGoal) return 5;
  if (hasMemory) return 4;
  if (mentionsMemoryGoal) return 3;
  return 3;
}

function scoreRepertoireEconomy(arc) {
  const text = arc.turns.map((turn) => `${turn.user_input} ${turn.goal}`).join(' ').toLowerCase();
  const images = ['saldo', 'apag', 'motor', 'astilla', 'guagua', 'barrio'];
  const repeated = images.filter((image) => text.split(image).length - 1 > 2);
  if (repeated.length === 0) return 5;
  if (repeated.length === 1) return 4;
  return 3;
}

function scoreCharacterIntegrity(arc) {
  const goals = arc.turns.map((turn) => turn.goal).join(' ').toLowerCase();
  const hasLimit = /limite|sin vulgaridad|no acepta|controlada|servil/.test(goals);
  const hasYanisLogic = /chucho|astilla|swing|coqueteo|filosofia|reina|machete/.test(goals);
  return clamp(3 + Number(hasLimit) + Number(hasYanisLogic));
}

function decide(total, scores) {
  if (scores.resolution < 4 || scores.state_coherence < 4) return 'review';
  if (total >= 27) return 'strong_arc';
  if (total >= 22) return 'review';
  return 'weak_arc';
}

function runClock(arc) {
  const payload = JSON.stringify({
    actor_profile: arc.turns[0]?.user_actor ?? 'poeta_con_swing',
    messages: arc.turns.map((turn) => turn.user_input)
  });

  const script = [
    'import json, sys',
    'from core.instruments.yanis_clock import YanisClock',
    'payload = json.loads(sys.stdin.read())',
    'clock = YanisClock(actor_profile=payload.get("actor_profile", "poeta_con_swing"))',
    'for msg in payload.get("messages", []):',
    '    clock.update(msg)',
    'print(json.dumps({"snapshot": clock.snapshot(), "arc_quality": clock.arc_quality(), "report": clock.report()}, ensure_ascii=False))'
  ].join('\n');

  const result = spawnSync('python3', ['-c', script], {
    cwd: process.cwd(),
    input: payload,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    return {
      error: result.stderr || 'clock failed'
    };
  }

  return JSON.parse(result.stdout);
}

const results = arcs.map((arc) => {
  const clock = runClock(arc);
  const scores = {
    state_coherence: scoreStateCoherence(arc),
    dramatic_tension: scoreDramaticTension(arc),
    resolution: scoreResolution(arc),
    memory_continuity: scoreMemoryContinuity(arc),
    repertoire_economy: scoreRepertoireEconomy(arc),
    character_integrity: scoreCharacterIntegrity(arc)
  };
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);

  return {
    id: arc.id,
    title: arc.title,
    variant: arc.variant,
    turns: arc.turns.length,
    total,
    decision: decide(total, scores),
    scores,
    clock_arc: clock.arc_quality ?? null,
    clock_snapshot: clock.snapshot ?? null,
    clock_error: clock.error ?? null
  };
});

const summary = results.reduce((acc, result) => {
  acc[result.decision] = (acc[result.decision] ?? 0) + 1;
  return acc;
}, {});

const average = results.reduce((sum, result) => sum + result.total, 0) / results.length;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = `out/${character}/arc-reports/arc-dry-run-${timestamp}.json`;
const mdPath = `out/${character}/arc-reports/arc-dry-run-${timestamp}.md`;

await writeText(jsonPath, `${JSON.stringify({ character, average, summary, results }, null, 2)}\n`);

const rows = results
  .map((result) => `| ${result.id} | ${result.title} | ${result.variant} | ${result.turns} | ${result.total} | ${result.decision} | ${result.clock_arc?.score ?? 'n/a'} | ${result.clock_arc?.notes?.join('; ') ?? result.clock_error ?? ''} |`)
  .join('\n');

await writeText(mdPath, `# Arc dry run ${character}

Average score: ${average.toFixed(2)}

Summary:

${Object.entries(summary).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

| Arc | Title | Variant | Turns | Total | Decision | Clock score | Clock notes |
| --- | --- | --- | ---: | ---: | --- | ---: | --- |
${rows}
`);

console.log(`Arc dry loop completed for ${character}.`);
console.log(`Average score: ${average.toFixed(2)}`);
console.log(`Summary: ${JSON.stringify(summary)}`);
console.log(`Report: ${mdPath}`);
