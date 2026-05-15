#!/usr/bin/env node
import {
  buildArcJudgeContext,
  buildResponseJudgeContext,
  decideArcFromContext,
  decideResponseFromContext,
  judgmentMetadata,
  loadJudgeSource
} from './build_judge_context.js';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function notesFromDiagnosis(diagnosis = {}) {
  return diagnosis.recipe_note || diagnosis.main_failure || diagnosis.arc_failure || 'sin alerta fuerte';
}

function outputFor(context, decision, judgedAt, includeContext) {
  const result = {
    metadata: judgmentMetadata(context, judgedAt),
    scores: context.scores,
    weights: context.weights,
    weighted_score: context.weighted_score,
    decision,
    notes: notesFromDiagnosis(context.diagnosis),
    diagnosis: context.diagnosis
  };
  if (includeContext) {
    result.judge_context = context;
  }
  return result;
}

const raw = await readStdin();
if (!raw.trim()) {
  console.error('Usage: echo \'{"mode":"response",...}\' | node core/judges/judge_context_cli.js');
  process.exit(1);
}

const input = JSON.parse(raw);
const character = input.character ?? 'yanislaidis';
const judgeSource = await loadJudgeSource(character);
const judgedAt = input.judged_at ?? new Date().toISOString();
const includeContext = input.include_context !== false;
const mode = input.mode ?? input.judge_type ?? 'response';

if (mode === 'response') {
  const context = buildResponseJudgeContext({
    character,
    variables: judgeSource.variables,
    rubric: judgeSource.rubric,
    scenario: input.scenario ?? {},
    candidate: input.candidate ?? {},
    scores: input.scores ?? {},
    clock: input.clock ?? null,
    history: input.history ?? [],
    source: judgeSource.source
  });
  const decision = decideResponseFromContext(context);
  console.log(JSON.stringify(outputFor(context, decision, judgedAt, includeContext), null, 2));
} else if (mode === 'arc') {
  const context = buildArcJudgeContext({
    character,
    variables: judgeSource.variables,
    rubric: judgeSource.rubric,
    arc: input.arc ?? {},
    scores: input.scores ?? {},
    clockArc: input.clock_arc ?? input.clockArc ?? null,
    clockSnapshot: input.clock_snapshot ?? input.clockSnapshot ?? null,
    source: judgeSource.source
  });
  const decision = decideArcFromContext(context);
  console.log(JSON.stringify(outputFor(context, decision, judgedAt, includeContext), null, 2));
} else {
  console.error(`Unknown judge context mode: ${mode}`);
  process.exit(1);
}
