import fs from 'node:fs/promises';
import path from 'node:path';
import { readJsonl, rootDir } from '../lib.js';

const requiredScenarioFields = [
  'id',
  'state',
  'temperature',
  'user_input',
  'expected_behavior',
  'risk'
];

async function findJsonlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findJsonlFiles(fullPath));
    } else if (entry.name.endsWith('.jsonl')) {
      files.push(fullPath);
    }
  }

  return files;
}

function validateScenario(file, record) {
  const errors = [];
  for (const field of requiredScenarioFields) {
    if (record.value[field] === undefined || record.value[field] === '') {
      errors.push(`${file}:${record.index}: missing ${field}`);
    }
  }
  return errors;
}

const scenarioRoot = path.join(rootDir, 'characters');
const files = await findJsonlFiles(scenarioRoot);
let errors = [];
let count = 0;

for (const file of files) {
  const relativeFile = path.relative(rootDir, file);
  const records = await readJsonl(relativeFile);
  count += records.length;

  if (relativeFile.includes('/scenarios/')) {
    for (const record of records) {
      errors = errors.concat(validateScenario(relativeFile, record));
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${count} JSONL records in ${files.length} files.`);
