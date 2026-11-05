// dist/cjs é CommonJS dentro de um pacote "type": "module"
import fs from 'node:fs';
fs.writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), JSON.stringify({ type: 'commonjs' }) + '\n');
try {
  fs.chmodSync(new URL('../dist/esm/cli.js', import.meta.url), 0o755);
} catch {}
