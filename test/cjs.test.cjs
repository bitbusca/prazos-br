// O pacote também funciona com require() (CommonJS).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularPrazo } = require('../dist/cjs/index.js');
const { buscarPrazos } = require('../dist/cjs/catalogo.js');

test('CJS: require funciona e calcula igual ao ESM', () => {
  assert.equal(calcularPrazo({ inicio: '2026-11-05', dias: 15, tribunal: 'TJMS' }).vencimento, '2026-11-27');
  assert.ok(buscarPrazos('contestação').length > 0);
});
