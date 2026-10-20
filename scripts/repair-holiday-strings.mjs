import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src/content/holidays');

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.ts')) {
    continue;
  }
  const path = join(dir, file);
  let content = readFileSync(path, 'utf8');

  // Restore closing single-quotes accidentally converted to Hebrew geresh.
  content = content.replace(/([\u0590-\u05FF])׳([,\);])/g, "$1'$2");
  content = content.replace(/([\u0590-\u05FF])׳(\r?\n)/g, "$1'$2");

  // Normalize internal Hebrew abbreviations (ב' ג' etc.) inside strings.
  content = content.replace(/([\u0590-\u05FF])'(\s|[\u0590-\u05FF(])/g, '$1\u05F3$2');

  // Normalize gershayim for halachic refs.
  content = content.replace(/"/g, '\u05F4');

  writeFileSync(path, content);
  console.log(`repaired ${file}`);
}
