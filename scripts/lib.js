import fs from 'node:fs/promises';
import path from 'node:path';

export const rootDir = path.resolve(new URL('..', import.meta.url).pathname);

export async function readText(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), 'utf8');
}

export async function ensureDir(relativePath) {
  await fs.mkdir(path.join(rootDir, relativePath), { recursive: true });
}

export async function writeText(relativePath, content) {
  await ensureDir(path.dirname(relativePath));
  await fs.writeFile(path.join(rootDir, relativePath), content);
}

export async function readJsonl(relativePath) {
  const text = await readText(relativePath);
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => line.trim())
    .map(({ line, index }) => {
      try {
        return { value: JSON.parse(line), index };
      } catch (error) {
        error.message = `${relativePath}:${index}: ${error.message}`;
        throw error;
      }
    });
}

