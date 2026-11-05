import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../dist/esm/cli.js', import.meta.url));
const rodar = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });

test('CLI: exemplo do README', () => {
  const r = rodar('15', '--de', '2026-11-05', '--tribunal', 'TJMS');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Vence em 27\/11\/2026/);
  assert.match(r.stdout, /Consciência Negra/);
  assert.match(r.stdout, /não substitui a conferência profissional/);
});

test('CLI: --json devolve o resultado completo', () => {
  const r = rodar('15', '--de', '2026-11-04', '--djen', '--tribunal', 'TJMS', '--json');
  const j = JSON.parse(r.stdout);
  assert.equal(j.publicacao, '2026-11-05');
  assert.equal(j.vencimento, '2026-11-27');
});

test('CLI: intimação eletrônica e dobro', () => {
  const r = rodar('5', '--de', '2026-03-02', '--evento', 'intimacao-eletronica', '--tribunal', 'TJMS', '--dobro', 'fazenda', '--json');
  const j = JSON.parse(r.stdout);
  assert.equal(j.ciencia, '2026-03-12');
  assert.equal(j.diasContados, 10);
});

test('CLI: catálogo e feriados', () => {
  assert.match(rodar('catalogo', 'apelação').stdout, /15 dias úteis/);
  assert.match(rodar('feriados', '2026', '--tribunal', 'TJMS', '--comarca', 'Campo Grande').stdout, /26\/08\/2026/);
});

test('CLI: erro de entrada sai com código 2', () => {
  const r = rodar('15', '--de', '2026-02-30');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /data inválida/);
});

test('CLI: tribunais lista os calendários com anos conferidos', () => {
  const r = rodar('tribunais');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^TJSP\s/m);
  assert.match(r.stdout, /^TRT15\s/m);
  assert.match(r.stdout, /anos conferidos: 2025, 2026/);
  const j = JSON.parse(rodar('tribunais', '--json').stdout);
  assert.ok(j.some((t) => t.tribunal === 'TRF1' && t.anosConferidos.includes(2026)));
});
