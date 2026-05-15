import path from 'node:path';
import { readText, writeText } from '../../core/lib.js';

const CURATOR_VERSION = 'curator.v1';

const ROUTES = {
  approved_candidate: 'approved_candidates',
  strong_arc: 'approved_candidates',
  review: 'review_queue',
  rough_candidate: 'rough_candidates',
  weak_arc: 'rough_candidates',
  rejected: 'rejected'
};

const ACTIONS = {
  approved_candidates: 'queue_for_human_gold_review',
  review_queue: 'queue_for_human_repair',
  rough_candidates: 'keep_as_raw_material',
  rejected: 'keep_rejection_log'
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const reportPath = args.find((arg) => !arg.startsWith('--'));

if (!reportPath) {
  console.error('Usage: node factory/curation/curate-report.js <report-json> [--dry-run]');
  process.exit(1);
}

const report = JSON.parse(await readText(reportPath));
const character = report.character;

if (!character) {
  throw new Error(`Report ${reportPath} does not declare "character"`);
}

if (!Array.isArray(report.results)) {
  throw new Error(`Report ${reportPath} does not contain a results array`);
}

const curatedAt = new Date().toISOString();
const sourceName = path.basename(reportPath, path.extname(reportPath));
const routed = new Map();
const unknownDecisions = new Set();

for (const [index, result] of report.results.entries()) {
  const route = routeForDecision(result.decision);
  if (!route) {
    unknownDecisions.add(result.decision ?? 'undefined');
    continue;
  }

  if (!routed.has(route)) routed.set(route, []);
  routed.get(route).push(curatedRecord({
    character,
    curatedAt,
    report,
    reportPath,
    result,
    route,
    index
  }));
}

if (unknownDecisions.size > 0) {
  throw new Error(`Unknown decisions in ${reportPath}: ${[...unknownDecisions].join(', ')}`);
}

const outputs = [];
for (const [route, records] of routed.entries()) {
  const target = `characters/${character}/datasets/curation/${route}/${sourceName}.jsonl`;
  outputs.push({ route, target, count: records.length });
  if (!dryRun) {
    await writeText(target, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
  }
}

const summary = {
  schema_version: 'curation_summary.v1',
  curator_version: CURATOR_VERSION,
  curated_at: curatedAt,
  source_report: reportPath,
  character,
  dry_run: dryRun,
  routes: Object.fromEntries(outputs.map(({ route, count }) => [route, count])),
  outputs
};

const summaryPath = `out/${character}/curation/curation-${sourceName}.json`;
if (!dryRun) {
  await writeText(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

console.log(`Curated ${report.results.length} results from ${reportPath}`);
console.log(`Gold policy: automatic decisions never write to datasets/gold`);
for (const output of outputs) {
  console.log(`${output.route}: ${output.count} -> ${output.target}`);
}
if (!dryRun) {
  console.log(`Summary: ${summaryPath}`);
}

function routeForDecision(decision) {
  return ROUTES[decision] ?? null;
}

function curatedRecord({ character, curatedAt, report, reportPath, result, route, index }) {
  const decision = result.decision ?? 'unknown';
  return {
    metadata: {
      schema_version: 'curated_item.v1',
      curator_version: CURATOR_VERSION,
      curated_at: curatedAt,
      source_report: reportPath,
      source_report_schema: report.metadata?.schema_version ?? null,
      source_report_generated_at: report.metadata?.generated_at ?? null,
      judge_version: result.metadata?.judge_version ?? report.metadata?.judge_version ?? null,
      judge_context_version: result.metadata?.judge_context_version ?? report.metadata?.judge_context_version ?? null,
      variables_sha256: result.metadata?.variables_sha256 ?? report.metadata?.variables_sha256 ?? null,
      rubric_sha256: result.metadata?.rubric_sha256 ?? report.metadata?.rubric_sha256 ?? null
    },
    character,
    item_id: itemId(result, index),
    item_type: itemType(result),
    source_decision: decision,
    route,
    curation_action: ACTIONS[route],
    gold_policy: 'never_auto_gold',
    gold_requires: [
      'human_decision',
      'judge_version',
      'judge_context_version',
      'variables_sha256',
      'rubric_sha256'
    ],
    result: compactResult(result)
  };
}

function itemId(result, index) {
  return result.scenario_id ?? result.id ?? `result-${index + 1}`;
}

function itemType(result) {
  if (result.turn_log) return 'live_arc';
  if (result.clock_arc || result.clock_snapshot) return 'arc';
  if (result.scenario_id) return 'response';
  return 'unknown';
}

function compactResult(result) {
  const { judge_context: judgeContext, ...rest } = result;
  if (!judgeContext) return rest;

  return {
    ...rest,
    judge_context: {
      version: judgeContext.version,
      judge_version: judgeContext.judge_version,
      judge_type: judgeContext.judge_type,
      source: judgeContext.source,
      state_info: judgeContext.state_info,
      arc_state_info: judgeContext.arc_state_info,
      scenario: judgeContext.scenario,
      arc: judgeContext.arc,
      candidate: judgeContext.candidate,
      clock: judgeContext.clock,
      scores: judgeContext.scores,
      weights: judgeContext.weights,
      weighted_score: judgeContext.weighted_score,
      diagnosis: judgeContext.diagnosis
    }
  };
}
