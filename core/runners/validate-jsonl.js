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

async function loadCharacterVariables(character) {
  const variablesPath = path.join(rootDir, 'characters', character, 'variables.json');
  const text = await fs.readFile(variablesPath, 'utf8');
  return JSON.parse(text);
}

function registeredStates(variables) {
  const taxonomy = variables.state_taxonomy ?? {};
  return new Set([
    ...(variables.states ?? []),
    ...(taxonomy.dataset_states ?? []),
    ...(taxonomy.arc_states ?? []),
    ...(taxonomy.clock_states ?? []),
    ...Object.keys(taxonomy.state_aliases ?? {}),
    ...Object.values(taxonomy.state_aliases ?? {}),
    ...Object.values(taxonomy.state_groups ?? {}).flat()
  ]);
}

function sameSet(left, right) {
  if (left.size !== right.size) return false;
  return [...left].every((item) => right.has(item));
}

function validateTaxonomy(character, variables) {
  const taxonomy = variables.state_taxonomy ?? {};
  const errors = [];
  const datasetStates = new Set(taxonomy.dataset_states ?? []);
  const canonicalStates = new Set(variables.states ?? []);
  if (!sameSet(canonicalStates, datasetStates)) {
    errors.push(`characters/${character}/variables.json: states and state_taxonomy.dataset_states must match`);
  }

  const baseStates = new Set([
    ...(variables.states ?? []),
    ...(taxonomy.dataset_states ?? []),
    ...(taxonomy.arc_states ?? []),
    ...(taxonomy.clock_states ?? [])
  ]);

  for (const [alias, target] of Object.entries(taxonomy.state_aliases ?? {})) {
    if (!baseStates.has(alias)) {
      errors.push(`characters/${character}/variables.json: state_aliases key "${alias}" is not registered`);
    }
    if (!baseStates.has(target)) {
      errors.push(`characters/${character}/variables.json: state_aliases target "${target}" is not registered`);
    }
  }

  for (const [group, states] of Object.entries(taxonomy.state_groups ?? {})) {
    for (const state of states) {
      if (!baseStates.has(state)) {
        errors.push(`characters/${character}/variables.json: state_groups.${group} contains unknown state "${state}"`);
      }
    }
  }

  return errors;
}

function validateKnownState({ file, index, field, state, variables }) {
  if (!state) return [];
  if (registeredStates(variables).has(state)) return [];
  return [`${file}:${index}: unknown ${field} state "${state}" in variables.state_taxonomy`];
}

async function validateArcs(character, variables) {
  const arcsPath = path.join(rootDir, 'characters', character, 'scenarios', 'arcs.json');
  try {
    await fs.access(arcsPath);
  } catch {
    return [];
  }

  const relativeFile = path.relative(rootDir, arcsPath);
  const arcs = JSON.parse(await fs.readFile(arcsPath, 'utf8'));
  const errors = [];

  for (const arc of arcs) {
    for (const [index, state] of (arc.expected_arc ?? []).entries()) {
      errors.push(...validateKnownState({
        file: relativeFile,
        index: `${arc.id}.expected_arc[${index}]`,
        field: 'expected_arc',
        state,
        variables
      }));
    }
    for (const turn of arc.turns ?? []) {
      errors.push(...validateKnownState({
        file: relativeFile,
        index: `${arc.id}.turn[${turn.turn}]`,
        field: 'expected_state',
        state: turn.expected_state,
        variables
      }));
    }
  }

  return errors;
}

async function validateYanisClockStates(variables) {
  const clockPath = path.join(rootDir, 'core', 'instruments', 'yanis_clock.py');
  const text = await fs.readFile(clockPath, 'utf8');
  const clockStates = [...text.matchAll(/name="([^"]+)"/g)].map((match) => match[1]);
  return clockStates.flatMap((state, index) => validateKnownState({
    file: path.relative(rootDir, clockPath),
    index: `STATE_MAP[${index}]`,
    field: 'clock',
    state,
    variables
  }));
}

const scenarioRoot = path.join(rootDir, 'characters');
const files = await findJsonlFiles(scenarioRoot);
const variableCache = new Map();
let errors = [];
let count = 0;

for (const file of files) {
  const relativeFile = path.relative(rootDir, file);
  const records = await readJsonl(relativeFile);
  const character = relativeFile.split(path.sep)[1];
  if (!variableCache.has(character)) {
    variableCache.set(character, await loadCharacterVariables(character));
  }
  const variables = variableCache.get(character);
  count += records.length;

  if (relativeFile.includes('/scenarios/')) {
    for (const record of records) {
      errors = errors.concat(validateScenario(relativeFile, record));
      errors = errors.concat(validateKnownState({
        file: relativeFile,
        index: record.index,
        field: 'scenario',
        state: record.value.state,
        variables
      }));
    }
  }
}

for (const [character, variables] of variableCache.entries()) {
  errors = errors.concat(validateTaxonomy(character, variables));
  errors = errors.concat(await validateArcs(character, variables));
  if (character === 'yanislaidis') {
    errors = errors.concat(await validateYanisClockStates(variables));
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${count} JSONL records in ${files.length} files.`);
