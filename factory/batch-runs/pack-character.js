import path from 'node:path';
import { readJsonl, readText, writeText } from '../../core/lib.js';

const character = process.argv[2];

if (!character) {
  console.error('Usage: node scripts/pack-character.js <character>');
  process.exit(1);
}

const characterRoot = `characters/${character}`;
const prompts = [
  ['base', `${characterRoot}/prompts/yanis_base.md`],
  ['media', `${characterRoot}/prompts/yanis_media.md`],
  ['alta', `${characterRoot}/prompts/yanis_alta.md`]
];

const characterCard = await readText(`${characterRoot}/character.md`);
const rubric = await readText(`${characterRoot}/evaluations/rubrica_yanis.md`);
const scenarios = await readJsonl(`${characterRoot}/scenarios/core.jsonl`);

for (const [variant, promptPath] of prompts) {
  const prompt = await readText(promptPath);
  const packet = {
    character,
    variant,
    generated_at: new Date().toISOString(),
    character_card: characterCard,
    prompt,
    rubric,
    scenarios: scenarios.map(({ value }) => value)
  };

  await writeText(
    path.join('out', character, `${variant}.json`),
    `${JSON.stringify(packet, null, 2)}\n`
  );
}

console.log(`Packed ${prompts.length} prompt variants for ${character}.`);
