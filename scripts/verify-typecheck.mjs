import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const tscBin = require.resolve('typescript/bin/tsc');

execFileSync(process.execPath, [tscBin, '--noEmit'], { cwd: root, stdio: 'inherit' });
console.log('PASS verify-typecheck');
