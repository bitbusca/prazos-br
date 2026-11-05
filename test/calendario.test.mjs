import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  calcularPrazo,
  calendariosDisponiveis,
  datasMoveis,
  diasSemExpediente,
  ehDiaUtil,
  pascoa,
  registrarCalendario,
  restaurarCalendarios,
  somarDiasUteis,
} from '../dist/esm/index.js';

test('Páscoa e datas móveis', () => {
  assert.equal(pascoa(2024), '2024-03-31');
  assert.equal(pascoa(2025), '2025-04-20');
  assert.equal(pascoa(2026), '2026-04-05');
  assert.equal(pascoa(2027), '2027-03-28');
  const m = datasMoveis(2026);
  assert.equal(m.carnavalSegunda, '2026-02-16');
  assert.equal(m.carnavalTerca, '2026-02-17');
  assert.equal(m.quartaDeCinzas, '2026-02-18');
  assert.equal(m.sextaSanta, '2026-04-03');
  assert.equal(m.corpusChristi, '2026-06-04');
});

test('feriados nacionais fixos e Consciência Negra só desde 2024', () => {
  const nac = (ano) => diasSemExpediente(ano).filter((d) => d.tipo === 'feriado').map((d) => d.data.slice(5));
  assert.deepEqual(nac(2026), ['01-01', '04-03', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']);
  assert.ok(!nac(2023).includes('11-20'));
});

test('ehDiaUtil explica o motivo com a fonte', () => {
  const r = ehDiaUtil('2026-11-20', { tribunal: 'TJMS' });
  assert.equal(r.util, false);
  assert.match(r.motivo, /Consciência Negra/);
  assert.ok(r.fonte);
  assert.equal(ehDiaUtil('2026-11-19', { tribunal: 'TJMS' }).util, true);
  const jan = ehDiaUtil('2026-01-12', { tribunal: 'TJMS' });
  assert.equal(jan.util, false); // expediente normal, mas prazo suspenso
  assert.equal(jan.conta, false);
});

test('somarDiasUteis para trás (prazo interno do escritório)', () => {
  // 27/11 (sex) - 2 úteis = 25/11 (qua); 23/11 (seg) - 1 = 19/11 (qui), pulando 20/11
  assert.equal(somarDiasUteis('2026-11-27', -2, { tribunal: 'TJMS' }), '2026-11-25');
  assert.equal(somarDiasUteis('2026-11-23', -1, { tribunal: 'TJMS' }), '2026-11-19');
});

test('Campo Grande no calendário do TJMS e do TRT24', () => {
  const tj = diasSemExpediente(2026, { tribunal: 'TJMS', comarca: 'Campo Grande' });
  const aniv = tj.find((d) => d.data === '2026-08-26');
  assert.ok(aniv);
  assert.equal(aniv.origem, 'TJMS/campo-grande');
  const trt = diasSemExpediente(2026, { tribunal: 'TRT24', comarca: 'Campo Grande' });
  assert.ok(trt.some((d) => d.data === '2026-09-10' && d.tipo === 'suspensao_prazos'));
  const disp = calendariosDisponiveis();
  const tjms = disp.find((d) => d.tribunal === 'TJMS');
  assert.ok(tjms.comarcas.includes('Campo Grande'));
  assert.ok(tjms.comarcasComFeriado.includes('Campo Grande'));
  assert.deepEqual(tjms.anosConferidos, [2021, 2022, 2023, 2024, 2025, 2026]);
});

test('as regras permanentes do TJMS batem com as portarias de 2021 a 2026', () => {
  // toda data gerada por regra que cai em dia de semana tem de estar nas datas conferidas do ano
  const j = JSON.parse(fs.readFileSync(new URL('../feriados/tribunais/TJMS/tribunal.json', import.meta.url), 'utf8'));
  const conferidas = new Set(j.datas.map((d) => d.data));
  const faltando = [];
  for (const ano of j.anosConferidos) {
    const lista = diasSemExpediente(ano, { tribunal: 'TJMS' }).filter((d) => d.origem === 'TJMS');
    for (const d of lista) {
      const dow = new Date(`${d.data}T00:00:00Z`).getUTCDay();
      if (dow !== 0 && dow !== 6 && !conferidas.has(d.data)) faltando.push(`${d.data} ${d.nome}`);
    }
  }
  assert.deepEqual(faltando, []);
});

test('registrarCalendario: arquivo novo da comunidade entra no cálculo', () => {
  try {
    registrarCalendario({
      id: 'TJMS/comarca-de-teste',
      escopo: 'comarca',
      tribunal: 'TJMS',
      comarca: 'Comarca de Teste',
      anosConferidos: [2026],
      regras: [],
      datas: [{ data: '2026-11-06', nome: 'Padroeiro de teste', tipo: 'feriado', fonte: 'Lei municipal 1/2026' }],
    });
    // 06/11 fechado: 09(1) 10(2) 11(3)
    const r = calcularPrazo({ inicio: '2026-11-05', dias: 3, tribunal: 'TJMS', comarca: 'Comarca de Teste' });
    assert.equal(r.vencimento, '2026-11-11');
    assert.equal(r.passos.find((p) => p.data === '2026-11-06').fonte, 'Lei municipal 1/2026');
  } finally {
    restaurarCalendarios();
  }
  assert.equal(calcularPrazo({ inicio: '2026-11-05', dias: 3, tribunal: 'TJMS', comarca: 'Comarca de Teste' }).vencimento, '2026-11-10');
});

test('registrarCalendario recusa dia sem fonte', () => {
  assert.throws(
    () => registrarCalendario({ id: 'X/y', escopo: 'comarca', tribunal: 'X', comarca: 'Y', regras: [], datas: [{ data: '2026-01-02', nome: 'z', tipo: 'feriado' }] }),
    /sem fonte/,
  );
});

test('comarca desconhecida gera aviso', () => {
  const r = calcularPrazo({ inicio: '2026-11-05', dias: 5, tribunal: 'TJMS', comarca: 'Cidade Inexistente' });
  assert.ok(r.avisos.some((a) => /não encontrada/.test(a)));
});
