import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src/content/holidays');

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.ts')) {
    continue;
  }
  const path = join(dir, file);
  const content = readFileSync(path, 'utf8').replace(
    /([\u0590-\u05FF])'/g,
    '$1\u05F3',
  );
  writeFileSync(path, content);
  console.log(`fixed ${file}`);
}
