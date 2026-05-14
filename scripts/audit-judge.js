import fs from 'node:fs/promises';
import path from 'node:path';
import { readJsonl, readText, rootDir, writeText } from './lib.js';

const character = process.argv[2];
const explicitReport = process.argv[3];
const explicitReview = process.argv[4];

if (!character) {
  console.error('Usage: node scripts/audit-judge.js <character> [report-json] [human-review-jsonl]');
  process.exit(1);
}

async function latestReportPath() {
  const reportsDir = path.join(rootDir, 'out', character, 'reports');
  const files = await fs.readdir(reportsDir);
  const jsonReports = files
    .filter((file) => file.startsWith('dry-run-') && file.endsWith('.json'))
    .sort();

  if (jsonReports.length === 0) {
    throw new Error(`No dry-run JSON reports found in ${reportsDir}`);
  }

  return path.join('out', character, 'reports', jsonReports.at(-1));
}

const reportPath = explicitReport ?? await latestReportPath();
const reviewPath = explicitReview ?? `characters/${character}/evaluations/human_judge_review.example.jsonl`;
const report = JSON.parse(await readText(reportPath));
const humanReviews = await readJsonl(reviewPath);
const resultByScenario = new Map(report.results.map((result) => [result.scenario_id, result]));

const scoreKeys = [
  'cubanidad',
  'yanisidad',
  'limite',
  'trigger',
  'ritmo_oral',
  'no_repetition',
  'safety',
  'voice_ready'
];

const audits = [];
const drift = Object.fromEntries(scoreKeys.map((key) => [key, []]));
let agreement = 0;
let falseApproval = 0;
let falseRejection = 0;

function isApproved(decision) {
  return decision === 'approved_candidate';
}

for (const { value: review } of humanReviews) {
  const judge = resultByScenario.get(review.scenario_id);
  if (!judge) {
    throw new Error(`Human review references missing scenario: ${review.scenario_id}`);
  }

  const sameDecision = judge.decision === review.human_decision;
  if (sameDecision) agreement += 1;
  if (isApproved(judge.decision) && !isApproved(review.human_decision)) falseApproval += 1;
  if (!isApproved(judge.decision) && isApproved(review.human_decision)) falseRejection += 1;

  const scoreDiffs = {};
  for (const key of scoreKeys) {
    const humanScore = review.human_scores?.[key];
    const judgeScore = judge.scores?.[key];
    if (typeof humanScore === 'number' && typeof judgeScore === 'number') {
      const diff = judgeScore - humanScore;
      scoreDiffs[key] = diff;
      drift[key].push(Math.abs(diff));
    }
  }

  audits.push({
    scenario_id: review.scenario_id,
    judge_decision: judge.decision,
    human_decision: review.human_decision,
    same_decision: sameDecision,
    judge_error: review.judge_error,
    score_diffs: scoreDiffs,
    notes: review.notes
  });
}

const reviewed = humanReviews.length;
const driftSummary = Object.fromEntries(
  Object.entries(drift).map(([key, values]) => [
    key,
    values.length
      ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
      : null
  ])
);

const summary = {
  character,
  report_path: reportPath,
  review_path: reviewPath,
  reviewed,
  agreement,
  agreement_rate: Number((agreement / reviewed).toFixed(3)),
  false_approval: falseApproval,
  false_rejection: falseRejection,
  drift: driftSummary
};

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const auditJsonPath = `out/${character}/judge-audits/audit-${timestamp}.json`;
const auditMdPath = `out/${character}/judge-audits/audit-${timestamp}.md`;

await writeText(auditJsonPath, `${JSON.stringify({ summary, audits }, null, 2)}\n`);

const rows = audits
  .map((audit) => `| ${audit.scenario_id} | ${audit.judge_decision} | ${audit.human_decision} | ${audit.same_decision ? 'yes' : 'no'} | ${audit.judge_error} | ${audit.notes} |`)
  .join('\n');

const driftRows = Object.entries(driftSummary)
  .map(([key, value]) => `| ${key} | ${value ?? 'n/a'} |`)
  .join('\n');

await writeText(auditMdPath, `# Judge audit ${character}

Report: ${reportPath}

Human review: ${reviewPath}

Reviewed cases: ${reviewed}

Agreement: ${agreement}/${reviewed} (${summary.agreement_rate})

False approvals: ${falseApproval}

False rejections: ${falseRejection}

## Score drift

| Criterion | Mean absolute drift |
| --- | ---: |
${driftRows}

## Cases

| Scenario | Judge | Human | Same | Error label | Notes |
| --- | --- | --- | --- | --- | --- |
${rows}
`);

console.log(`Judge audit completed for ${character}.`);
console.log(`Agreement: ${agreement}/${reviewed} (${summary.agreement_rate})`);
console.log(`False approvals: ${falseApproval}`);
console.log(`False rejections: ${falseRejection}`);
console.log(`Audit: ${auditMdPath}`);

