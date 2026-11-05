import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarPrazos, catalogo, prazoPorId, prazosDaCategoria } from '../dist/esm/catalogo.js';

test('catálogo: ids únicos, categorias consistentes e base legal em todos', () => {
  const c = catalogo();
  assert.ok(c.prazos.length >= 290);
  assert.equal(new Set(c.prazos.map((p) => p.id)).size, c.prazos.length);
  for (const cat of c.categorias) assert.equal(prazosDaCategoria(cat.id).length, cat.total, cat.id);
  for (const p of c.prazos) assert.ok(p.baseLegal, p.id);
});

test('buscar: apelação é 15 dias úteis (CPC art. 1.003, § 5º)', () => {
  const ap = buscarPrazos('apelação cível')[0];
  assert.equal(ap.dias, 15);
  assert.equal(ap.contagem, 'uteis');
  assert.match(ap.baseLegal, /1\.003/);
  assert.equal(prazoPorId(ap.id), ap);
});

test('buscar: embargos de declaração é 5 dias úteis', () => {
  const ed = buscarPrazos('embargos de declaração').find((p) => /oposição|interposição|embargos de declaração$/i.test(p.ato)) ?? buscarPrazos('embargos de declaração')[0];
  assert.equal(ed.dias, 5);
});

test('prazos longos trazem a unidade da lei (ação rescisória: 2 anos)', () => {
  const r = buscarPrazos('rescisória ajuizamento')[0];
  assert.equal(r.unidadeNaLei, 'anos');
  assert.equal(r.quantidadeNaLei, 2);
});

test('filtro por ramo', () => {
  const t = buscarPrazos('', { ramo: 'trabalho', limite: 500 });
  assert.ok(t.length > 5);
  assert.ok(t.every((p) => p.ramo === 'trabalho'));
});
