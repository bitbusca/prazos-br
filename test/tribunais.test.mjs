// Um caso por tribunal novo da 0.2.0, conferido à mão no ato do tribunal (contagem dia a dia no comentário).
// Cada caso passa por um dia que só o calendário do tribunal/capital traz. Rodar: npm run build && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPrazo, calendariosDisponiveis, diasSemExpediente, ehDiaUtil, registrarCalendario, restaurarCalendarios, TRIBUNAIS } from '../dist/esm/index.js';

const caso = (tribunal, comarca, inicio, dias, esperado, pulos) => {
  const r = calcularPrazo({ inicio, dias, tribunal, comarca });
  assert.equal(r.vencimento, esperado, `${tribunal} ${inicio} +${dias}`);
  for (const [data, re] of pulos) {
    const p = r.passos.find((x) => x.data === data && x.acao === 'pula');
    assert.ok(p, `${tribunal}: ${data} deveria ser pulado`);
    assert.match(p.motivo, re);
    assert.ok(p.fonte, `${tribunal}: ${data} sem fonte`);
  }
  return r;
};

// ── Justiça estadual ────────────────────────────────────────────────────────

test('TJSP: Data Magna (09/07) e suspensão de 10/07/2026 (Prov. CSM 2.813/2025)', () => {
  // pub. seg 06/07 -> 07(1) 08(2) [09 Data Magna, Lei SP 9.497/1997] [10 sem expediente] [11-12] 13(3) 14(4) 15(5)
  caso('TJSP', 'São Paulo', '2026-07-06', 5, '2026-07-15', [['2026-07-09', /Data Magna/], ['2026-07-10', /Suspensão/]]);
});

test('TJRJ: São Jorge (23/04) e ponto facultativo de 24/04/2026 (Ato Executivo 79/2026)', () => {
  // pub. seg 20/04 -> [21 Tiradentes] 22(1) [23 São Jorge] [24 suspenso] [25-26] 27(2) 28(3) 29(4) 30(5)
  caso('TJRJ', 'Rio de Janeiro', '2026-04-20', 5, '2026-04-30', [['2026-04-23', /São Jorge/], ['2026-04-24', /suspens/i]]);
});

test('TJMG: Dia do Funcionário Público transferido para 30/10/2026 (Portaria Conjunta 1.798/PR/2026)', () => {
  // pub. seg 26/10 -> 27(1) 28(2) 29(3) [30 Funcionário Público] [31, 01] [02 Finados] 03(4) 04(5)
  caso('TJMG', 'Belo Horizonte', '2026-10-26', 5, '2026-11-04', [['2026-10-30', /Funcionário Público/]]);
});

test('TJRS: prazos suspensos nos jogos da Copa, 24/06 e 29/06/2026 (OS 003/2026-P)', () => {
  // pub. seg 15/06 -> 16(1) 17(2) 18(3) 19(4) 22(5) 23(6) [24 suspenso] 25(7) 26(8) [29 suspenso] 30(9) 01/07(10)
  caso('TJRS', 'Porto Alegre', '2026-06-15', 10, '2026-07-01', [['2026-06-24', /Copa/], ['2026-06-29', /Copa/]]);
});

test('TJPR: padroeira de Curitiba, 08/09/2026 (Decreto Judiciário 621/2025; Lei municipal 3.015/1967)', () => {
  // pub. qui 03/09 -> 04(1) [05-06] [07 Independência] [08 padroeira] 09(2) 10(3) 11(4) [12-13] 14(5)
  const r = caso('TJPR', 'Curitiba', '2026-09-03', 5, '2026-09-14', [['2026-09-08', /Curitiba/]]);
  // o ato do recesso de dez/2026 ainda não saiu: aviso de calendário parcial
  assert.ok(r.avisos.some((a) => /só em parte/.test(a)));
});

test('TJSC: aniversário de Florianópolis, 23/03/2026 (Res. GP 1/2026; Lei municipal 832/1967)', () => {
  // pub. qua 18/03 -> 19(1) 20(2) [21-22] [23 Dia do Município] 24(3) 25(4) 26(5)
  caso('TJSC', 'Florianópolis', '2026-03-18', 5, '2026-03-26', [['2026-03-23', /Florianópolis/]]);
});

test('TJBA: Independência da Bahia (02/07) e ponto facultativo de 03/07/2026 (Decreto Judiciário 1.050/2025)', () => {
  // pub. qua 01/07 -> [02 Independência da Bahia] [03 ponto facultativo] [04-05] 06(1) 07(2) 08(3) 09(4) 10(5)
  caso('TJBA', 'Salvador', '2026-07-01', 5, '2026-07-10', [['2026-07-02', /Independência da Bahia/], ['2026-07-03', /Bahia/]]);
});

test('TJPE: Nossa Senhora do Carmo no Recife, 16/07/2026 (Ato Conjunto 43/2025)', () => {
  // pub. seg 13/07 -> 14(1) 15(2) [16 N. Sra. do Carmo] 17(3) [18-19] 20(4) 21(5)
  caso('TJPE', 'Recife', '2026-07-13', 5, '2026-07-21', [['2026-07-16', /Carmo/]]);
});

test('TJGO: Dia do Servidor transferido para 30/10/2026 (Decreto Judiciário 5.123/2026); 28/10 conta', () => {
  // pub. seg 26/10 -> 27(1) 28(2) 29(3) [30 Dia do Servidor] [31, 01] [02 Finados] 03(4) 04(5)
  const r = caso('TJGO', 'Goiânia', '2026-10-26', 5, '2026-11-04', [['2026-10-30', /Servidor/]]);
  assert.equal(r.passos.find((p) => p.data === '2026-10-28').acao, 'conta');
});

test('TJDFT: ponto facultativo de 10/08 e feriado forense de 11/08/2026 (Portaria Conjunta 105/2025; Lei 11.697/2008)', () => {
  // pub. qui 06/08 -> 07(1) [08-09] [10 ponto facultativo] [11 feriado forense] 12(2) 13(3) 14(4) [15-16] 17(5)
  caso('TJDFT', 'Brasília', '2026-08-06', 5, '2026-08-17', [['2026-08-10', /facultativo/i], ['2026-08-11', /forense/i]]);
});

// ── Justiça Federal ─────────────────────────────────────────────────────────

test('TRF1: ponto facultativo do jogo do Brasil, 29/06/2026 (Portaria Presi 380/2026)', () => {
  // pub. sex 26/06 -> [27-28] [29 ponto facultativo] 30(1) 01/07(2) 02(3) 03(4) [04-05] 06(5)
  caso('TRF1', 'Brasília', '2026-06-26', 5, '2026-07-06', [['2026-06-29', /facultativo/i]]);
});

test('TRF2: ponto facultativo de 20/04 (Portaria 30/2026) e São Jorge no Rio, 23/04/2026', () => {
  // pub. sex 17/04 -> [18-19] [20 ponto facultativo] [21 Tiradentes] 22(1) [23 São Jorge] 24(2) [25-26] 27(3)
  caso('TRF2', 'Rio de Janeiro', '2026-04-17', 3, '2026-04-27', [['2026-04-20', /facultativo/i], ['2026-04-23', /São Jorge/]]);
});

test('TRF4: suspensões de prazos no RS em 21 e 22/09/2026 (Portarias 825 e 829/2026)', () => {
  // pub. qua 16/09 -> 17(1) 18(2) [19-20] [21 suspenso] [22 suspenso] 23(3) 24(4) 25(5)
  caso('TRF4', 'Porto Alegre', '2026-09-16', 5, '2026-09-25', [['2026-09-21', /Suspensão/], ['2026-09-22', /Suspensão/]]);
});

test('TRF5: Data Magna de Pernambuco, 06/03/2026 (Ato da Presidência 626/2025; Lei PE 16.241/2017)', () => {
  // pub. ter 03/03 -> 04(1) 05(2) [06 Data Magna] [07-08] 09(3) 10(4) 11(5)
  caso('TRF5', 'Recife', '2026-03-03', 5, '2026-03-11', [['2026-03-06', /Data Magna/]]);
});

test('TRF6: expediente reduzido em 24/06 não começa o prazo; ponto facultativo em 29/06/2026', () => {
  // pub. ter 23/06 -> [24 expediente reduzido: não começa, CPC 224 § 1º] 25(1) 26(2) [27-28] [29 ponto facultativo] 30(3) 01/07(4) 02(5)
  const r = calcularPrazo({ inicio: '2026-06-23', dias: 5, tribunal: 'TRF6', comarca: 'Belo Horizonte' });
  assert.equal(r.inicioContagem, '2026-06-25');
  assert.equal(r.vencimento, '2026-07-02');
});

// ── Justiça do Trabalho ─────────────────────────────────────────────────────

test('TRT1: expediente e prazos suspensos em 10/08/2026 (Ato 70/2026)', () => {
  // pub. sex 07/08 -> [08-09] [10 suspenso] [11 Cursos Jurídicos] 12(1) 13(2) 14(3) [15-16] 17(4) 18(5)
  caso('TRT1', 'Rio de Janeiro', '2026-08-07', 5, '2026-08-18', [['2026-08-10', /suspens/i]]);
});

test('TRT2: suspensão do expediente em 05/06/2026 (Portaria GP 50/2025) e Corpus Christi na Capital', () => {
  // pub. seg 01/06 -> 02(1) 03(2) [04 Corpus Christi] [05 suspensão] [06-07] 08(3) 09(4) 10(5)
  caso('TRT2', 'São Paulo', '2026-06-01', 5, '2026-06-10', [['2026-06-04', /Corpus Christi/], ['2026-06-05', /Suspensão/]]);
});

test('TRT3: Corpus Christi em BH e suspensão de 05/06/2026 (RA 109/2025)', () => {
  // pub. seg 01/06 -> 02(1) 03(2) [04 Corpus Christi] [05 suspensão] [06-07] 08(3) 09(4) 10(5)
  caso('TRT3', 'Belo Horizonte', '2026-06-01', 5, '2026-06-10', [['2026-06-04', /Corpus Christi/], ['2026-06-05', /Suspensão/]]);
});

test('TRT4: ponto facultativo de 05/06/2026 (RA 10/2026) e Corpus Christi em Porto Alegre', () => {
  // pub. seg 01/06 -> 02(1) 03(2) [04 Corpus Christi] [05 ponto facultativo] [06-07] 08(3) 09(4) 10(5) 11(6) 12(7) [13-14] 15(8)
  caso('TRT4', 'Porto Alegre', '2026-06-01', 8, '2026-06-15', [['2026-06-05', /facultativo/i]]);
});

test('TRT15: vencimento em dia de expediente reduzido (24/06/2026, Portaria GP-CR 005/2026) prorroga', () => {
  // pub. qua 17/06 -> 18(1) 19(2) [20-21] 22(3) 23(4) 24(5) = expediente reduzido -> vence 25/06
  const r = calcularPrazo({ inicio: '2026-06-17', dias: 5, tribunal: 'TRT15', comarca: 'Campinas' });
  assert.equal(r.vencimento, '2026-06-25');
  assert.equal(r.prorrogado, true);
});

// ── feriado transferido (expediente_normal) ─────────────────────────────────

test('expediente_normal: TRT3 transferiu o feriado de 11/08 para 14/08/2026 (RA 109/2025)', () => {
  // a Lei 5.010/1966 (ramo) fecharia 11/08; o ato do TRT3 manteve o expediente.
  // pub. sex 07/08 -> [08-09] 10(1) 11(2) 12(3)
  const r = calcularPrazo({ inicio: '2026-08-07', dias: 3, tribunal: 'TRT3', comarca: 'Belo Horizonte' });
  assert.equal(r.vencimento, '2026-08-12');
  assert.equal(ehDiaUtil('2026-08-11', { tribunal: 'TRT3' }).util, true);
  assert.equal(ehDiaUtil('2026-08-14', { tribunal: 'TRT3' }).util, false);
  // TRT24 não transferiu: 11/08 continua fechado
  assert.equal(ehDiaUtil('2026-08-11', { tribunal: 'TRT24' }).util, false);
  // não aparece como dia sem expediente
  assert.ok(!diasSemExpediente(2026, { tribunal: 'TRT3' }).some((d) => d.data === '2026-08-11'));
});

test('expediente_normal: TRT2 antecipou 08/12 para 07/12/2026 (Portaria GP 50/2025)', () => {
  // pub. qui 03/12 -> 04(1) [05-06] [07 Dia da Justiça antecipado] 08(2) 09(3)
  assert.equal(calcularPrazo({ inicio: '2026-12-03', dias: 3, tribunal: 'TRT2', comarca: 'São Paulo' }).vencimento, '2026-12-09');
});

test('expediente_normal só anula o que vem de arquivo mais geral', () => {
  registrarCalendario({
    id: 'TRT99', escopo: 'tribunal', tribunal: 'TRT99', anosConferidos: [2026], comarcas: ['Cidade'], regras: [],
    datas: [{ data: '2026-08-11', nome: 'Expediente normal', tipo: 'expediente_normal', fonte: 'Ato de teste' }],
  });
  registrarCalendario({
    id: 'TRT99/cidade', escopo: 'comarca', tribunal: 'TRT99', comarca: 'Cidade', anosConferidos: [2026], datas: [],
    regras: [{ nome: 'Padroeiro da cidade', tipo: 'feriado', quando: { dia: '08-11' }, fonte: 'Lei municipal de teste' }],
  });
  try {
    assert.equal(ehDiaUtil('2026-08-11', { tribunal: 'TRT99' }).util, true);
    const c = ehDiaUtil('2026-08-11', { tribunal: 'TRT99', comarca: 'Cidade' });
    assert.equal(c.util, false);
    assert.match(c.motivo, /Padroeiro/);
    assert.throws(
      () => registrarCalendario({ id: 'X', escopo: 'tribunal', tribunal: 'X', regras: [{ nome: 'n', tipo: 'expediente_normal', quando: { dia: '01-02' }, fonte: 'f' }] }),
      /só vale em datas/,
    );
  } finally {
    restaurarCalendarios();
  }
});

// ── cobertura e avisos ──────────────────────────────────────────────────────

test('TRIBUNAIS e calendariosDisponiveis listam os tribunais da 0.2.0', () => {
  const novos = ['TJSP', 'TJRJ', 'TJMG', 'TJRS', 'TJPR', 'TJSC', 'TJBA', 'TJGO', 'TJPE', 'TJDFT', 'TRF1', 'TRF2', 'TRF4', 'TRF5', 'TRF6', 'TRT1', 'TRT2', 'TRT3', 'TRT4', 'TRT15'];
  for (const t of [...novos, 'TJMS', 'TRT24']) assert.ok(TRIBUNAIS.includes(t), t);
  assert.ok(!TRIBUNAIS.includes('TRF3')); // pendente: ver docs/COBERTURA.md
  assert.ok(Object.isFrozen(TRIBUNAIS));
  const disp = calendariosDisponiveis();
  assert.deepEqual(disp.map((d) => d.tribunal), [...TRIBUNAIS]);
  assert.ok(TRIBUNAIS.indexOf('TRT2') < TRIBUNAIS.indexOf('TRT15'));
});

test('todo dia de todo calendário novo tem fonte', () => {
  for (const t of TRIBUNAIS) {
    for (const ano of [2025, 2026]) {
      for (const d of diasSemExpediente(ano, { tribunal: t })) assert.ok(d.fonte, `${t} ${d.data} sem fonte`);
    }
  }
});

test('aviso quando a comarca é conhecida mas não tem feriados municipais cadastrados', () => {
  // TRT2 lista Guarulhos entre as cidades da região, mas só a Capital tem arquivo
  const r = calcularPrazo({ inicio: '2026-03-02', dias: 5, tribunal: 'TRT2', comarca: 'Guarulhos' });
  assert.ok(r.avisos.some((a) => /Feriados municipais de Guarulhos ainda não cadastrados/.test(a)));
  const capital = calcularPrazo({ inicio: '2026-03-02', dias: 5, tribunal: 'TRT2', comarca: 'São Paulo' });
  assert.deepEqual(capital.avisos, []);
});
