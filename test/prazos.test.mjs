// Casos reais conferidos à mão no calendário (cada comentário mostra a contagem dia a dia).
// Rodar: npm run build && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPrazo } from '../dist/esm/index.js';

const v = (o) => calcularPrazo(o).vencimento;
const contados = (r) => r.passos.filter((p) => p.acao === 'conta').map((p) => p.data);

test('exemplo do README: 15 dias úteis no TJMS a partir de 05/11/2026', () => {
  // publicação qui 05/11 -> começa sex 06/11
  // 06(1) 09..13(2-6) 16..19(7-10) 20/11 Consciência Negra (Lei 14.759/2023) 23..27(11-15)
  const r = calcularPrazo({ inicio: '2026-11-05', dias: 15, tribunal: 'TJMS' });
  assert.equal(r.inicioContagem, '2026-11-06');
  assert.equal(r.vencimento, '2026-11-27');
  assert.equal(r.vencimentoBR, '27/11/2026');
  assert.equal(r.prorrogado, false);
  const pulo = r.passos.find((p) => p.data === '2026-11-20');
  assert.equal(pulo.acao, 'pula');
  assert.match(pulo.motivo, /Consciência Negra/);
  assert.ok(pulo.fonte);
  assert.equal(contados(r).length, 15);
});

test('aceita DD/MM/AAAA e sigla com hífen', () => {
  assert.equal(v({ inicio: '05/11/2026', dias: 15, tribunal: 'tj-ms' }), '2026-11-27');
});

test('recesso forense + suspensão do CPC art. 220 (TJMS, virada 2025/2026)', () => {
  // publicação qua 17/12/2025 -> 18/12(1) 19/12(2)
  // 20/12 a 06/01 feriado forense do TJMS (CODJ-MS art. 268) e 07/01 a 20/01 prazos suspensos (CPC 220)
  // 21/01(3) 22(4) 23(5) 26(6) 27(7) 28(8) 29(9) 30/01(10)
  const r = calcularPrazo({ inicio: '2025-12-17', dias: 10, tribunal: 'TJMS', comarca: 'Campo Grande' });
  assert.deepEqual(contados(r), ['2025-12-18', '2025-12-19', '2026-01-21', '2026-01-22', '2026-01-23', '2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30']);
  assert.equal(r.vencimento, '2026-01-30');
  assert.ok(r.baseLegal.includes('CPC, art. 220'));
  const dia = r.passos.find((p) => p.data === '2026-01-12');
  assert.match(dia.motivo, /20\/12 a 20\/01/);
  assert.deepEqual(r.avisos, []);
});

test('publicação dentro da suspensão (07/01 a 20/01): prazo só começa em 21/01', () => {
  // TJMS: publicação seg 12/01/2026 (há expediente, prazo suspenso) -> 21/01(1) 22(2) 23(3) 26(4) 27(5)
  const r = calcularPrazo({ inicio: '2026-01-12', dias: 5, tribunal: 'TJMS', comarca: 'Campo Grande' });
  assert.equal(r.inicioContagem, '2026-01-21');
  assert.equal(r.vencimento, '2026-01-27');
});

test('feriado móvel nacional: Sexta-feira da Paixão (sem tribunal)', () => {
  // Páscoa 05/04/2026. publicação seg 30/03 -> 31(1) 01/04(2) 02(3) [03 Paixão] 06(4) 07(5)
  const r = calcularPrazo({ inicio: '2026-03-30', dias: 5 });
  assert.equal(r.vencimento, '2026-04-07');
  assert.match(r.passos.find((p) => p.data === '2026-04-03').motivo, /Paixão/);
  assert.ok(r.avisos.some((a) => /Sem tribunal/.test(a)));
});

test('feriado móvel no TJMS: Quinta e Sexta-feira Santa (CODJ-MS art. 164 § 2º)', () => {
  // 31(1) 01/04(2) [02 e 03 fechados] 06(3) 07(4) 08(5)
  assert.equal(v({ inicio: '2026-03-30', dias: 5, tribunal: 'TJMS' }), '2026-04-08');
});

test('Justiça Federal: Semana Santa de quarta a domingo (Lei 5.010/1966 art. 62, II)', () => {
  // TRF3: 31/03(1) [01/04 a 05/04 fechados] 06(2) 07(3) 08(4) 09(5)
  const r = calcularPrazo({ inicio: '2026-03-30', dias: 5, tribunal: 'TRF3' });
  assert.equal(r.vencimento, '2026-04-09');
  assert.ok(r.calendarios.includes('ramo/justica-federal'));
  assert.ok(r.avisos.some((a) => /TRF3 ainda não tem calendário próprio/.test(a)));
});

test('Carnaval e Quarta-feira de Cinzas no TJMS', () => {
  // publicação qui 12/02/2026 -> 13/02(1) [16,17 Carnaval; 18 Cinzas sem expediente no TJMS] 19(2) 20(3)
  assert.equal(v({ inicio: '2026-02-12', dias: 3, tribunal: 'TJMS' }), '2026-02-20');
});

test('Corpus Christi + ponto facultativo do dia seguinte (TJMS 2026)', () => {
  // publicação ter 02/06 -> 03(1) [04 Corpus Christi, 05 ponto facultativo] 08(2) 09(3)
  assert.equal(v({ inicio: '2026-06-02', dias: 3, tribunal: 'TJMS' }), '2026-06-09');
});

test('intimação eletrônica: ciência ficta no 10º dia corrido (Lei 11.419/2006 art. 5º § 3º)', () => {
  // envio seg 02/03/2026 -> ciência ficta qui 12/03 -> começa sex 13/03
  // 13(1) 16..20(2-6) 23..27(7-11) 30(12) 31(13) 01/04(14) [02 e 03 Semana Santa no TJMS] 06/04(15)
  const r = calcularPrazo({ inicio: '2026-03-02', dias: 15, tribunal: 'TJMS', comarca: 'Campo Grande', evento: 'intimacao_eletronica' });
  assert.equal(r.ciencia, '2026-03-12');
  assert.equal(r.cienciaFicta, true);
  assert.equal(r.inicioContagem, '2026-03-13');
  assert.equal(r.vencimento, '2026-04-06');
  assert.ok(r.baseLegal.includes('Lei 11.419/2006, art. 5º'));
});

test('ciência ficta que cai no sábado vai para o 1º dia útil (art. 5º § 2º)', () => {
  // envio qua 04/03 + 10 = sáb 14/03 -> ciência seg 16/03 -> 17(1) 18(2) 19(3) 20(4) 23(5)
  const r = calcularPrazo({ inicio: '2026-03-04', dias: 5, tribunal: 'TJMS', evento: 'intimacao_eletronica' });
  assert.equal(r.ciencia, '2026-03-16');
  assert.equal(r.vencimento, '2026-03-23');
});

test('ciência ficta + feriado municipal da comarca (São José em Coxim, 19/03)', () => {
  // mesma conta, mas 19/03 é feriado em Coxim: 17(1) 18(2) 20(3) 23(4) 24(5)
  assert.equal(v({ inicio: '2026-03-04', dias: 5, tribunal: 'TJMS', comarca: 'Coxim', evento: 'intimacao_eletronica' }), '2026-03-24');
});

test('intimação eletrônica com consulta antes dos 10 dias', () => {
  // envio 02/03, consulta qui 05/03 -> 06(1) 09(2) 10(3) 11(4) 12(5)
  const r = calcularPrazo({ inicio: '2026-03-02', dias: 5, tribunal: 'TJMS', evento: 'intimacao_eletronica', consulta: '2026-03-05' });
  assert.equal(r.ciencia, '2026-03-05');
  assert.equal(r.cienciaFicta, false);
  assert.equal(r.vencimento, '2026-03-12');
});

test('DJEN: publicação no 1º dia útil após a disponibilização', () => {
  // disponibilização qua 04/11 -> publicação qui 05/11 -> mesmo vencimento do exemplo (27/11)
  const r = calcularPrazo({ inicio: '2026-11-04', dias: 15, tribunal: 'TJMS', evento: 'djen' });
  assert.equal(r.publicacao, '2026-11-05');
  assert.equal(r.vencimento, '2026-11-27');
  // disponibilização sex 13/11 -> publicação seg 16/11 -> 17(1) 18(2) 19(3)
  const s = calcularPrazo({ inicio: '2026-11-13', dias: 3, tribunal: 'TJMS', evento: 'djen' });
  assert.equal(s.publicacao, '2026-11-16');
  assert.equal(s.vencimento, '2026-11-19');
});

test('prazo em dobro da Fazenda Pública (CPC art. 183)', () => {
  // 5 dias -> 10 úteis: 06(1) 09..13(2-6) 16..19(7-10)
  const r = calcularPrazo({ inicio: '2026-11-05', dias: 5, tribunal: 'TJMS', dobro: 'fazenda' });
  assert.equal(r.diasContados, 10);
  assert.equal(r.vencimento, '2026-11-19');
  assert.deepEqual(r.dobro, { tipo: 'fazenda', aplicado: true, baseLegal: 'CPC, art. 183' });
});

test('Fazenda no Juizado Especial: sem dobra', () => {
  const r = calcularPrazo({ inicio: '2026-11-05', dias: 5, tribunal: 'TJMS', dobro: 'fazenda', juizado: true });
  assert.equal(r.vencimento, '2026-11-12');
  assert.equal(r.dobro.aplicado, false);
});

test('Defensoria e MP dobram', () => {
  assert.equal(v({ inicio: '2026-11-05', dias: 5, tribunal: 'TJMS', dobro: 'defensoria' }), '2026-11-19');
  assert.equal(v({ inicio: '2026-11-05', dias: 5, tribunal: 'TJMS', dobro: 'mp' }), '2026-11-19');
});

test('litisconsortes: dobra só em autos físicos (CPC art. 229 § 2º)', () => {
  const eletronico = calcularPrazo({ inicio: '2026-11-05', dias: 5, tribunal: 'TJMS', dobro: 'litisconsortes' });
  assert.equal(eletronico.vencimento, '2026-11-12'); // 06 09 10 11 12
  assert.equal(eletronico.dobro.aplicado, false);
  assert.ok(eletronico.avisos.some((a) => /229, § 2º/.test(a)));
  assert.equal(v({ inicio: '2026-11-05', dias: 5, tribunal: 'TJMS', dobro: 'litisconsortes', autosEletronicos: false }), '2026-11-19');
});

test('dias corridos: vencimento no sábado prorroga para segunda (CPC 224 § 1º)', () => {
  // publicação seg 02/03 -> 03,04,05,06,07(sáb) -> não vence no fim de semana -> seg 09/03
  const r = calcularPrazo({ inicio: '2026-03-02', dias: 5, tipo: 'corridos' });
  assert.equal(r.fimContagem, '2026-03-07');
  assert.equal(r.vencimento, '2026-03-09');
  assert.equal(r.prorrogado, true);
  assert.match(r.motivoProrrogacao, /sábado/);
  assert.equal(r.passos.filter((p) => p.acao === 'prorroga').length, 1);
});

test('CLT no TRT24: Corpus Christi e suspensão de expediente do dia seguinte', () => {
  // publicação seg 01/06 -> 02(1) 03(2) [04 Corpus Christi, 05 sem expediente] 08(3) 09(4) 10(5) 11(6) 12(7) 15(8)
  const r = calcularPrazo({ inicio: '2026-06-01', dias: 8, tribunal: 'TRT24' });
  assert.equal(r.tipo, 'clt');
  assert.equal(r.materia, 'trabalho');
  assert.equal(r.vencimento, '2026-06-15');
  assert.ok(r.baseLegal.includes('CLT, art. 775'));
});

test('expediente reduzido conta no meio, mas não vence nele (TRT24, Quarta de Cinzas 2026)', () => {
  // publicação qui 12/02 -> 13(1) [16,17 Carnaval] 18 expediente até 13h (2) -> não vence: 19/02
  const r = calcularPrazo({ inicio: '2026-02-12', dias: 2, tribunal: 'TRT24' });
  assert.equal(r.fimContagem, '2026-02-18');
  assert.equal(r.vencimento, '2026-02-19');
  assert.match(r.motivoProrrogacao, /expediente reduzido/);
});

test('expediente reduzido: publica nele, mas o prazo só começa no dia seguinte (DJEN, TRT24)', () => {
  // disponibilização sex 13/02 -> publicação qua 18/02 (reduzido, mas útil) -> começa qui 19/02
  // 19(1) 20(2) 23(3) 24(4) 25(5)
  const r = calcularPrazo({ inicio: '2026-02-13', dias: 5, tribunal: 'TRT24', evento: 'djen' });
  assert.equal(r.publicacao, '2026-02-18');
  assert.equal(r.inicioContagem, '2026-02-19');
  assert.equal(r.vencimento, '2026-02-25');
});

test('feriado municipal de Campo Grande (26/08) só com a comarca', () => {
  // publicação seg 24/08: com comarca 25(1) [26 aniversário] 27(2) 28(3); sem comarca 25 26 27
  const com = calcularPrazo({ inicio: '2026-08-24', dias: 3, tribunal: 'TJMS', comarca: 'Campo Grande' });
  assert.equal(com.vencimento, '2026-08-28');
  assert.match(com.passos.find((p) => p.data === '2026-08-26').motivo, /Aniversário/);
  assert.equal(v({ inicio: '2026-08-24', dias: 3, tribunal: 'TJMS' }), '2026-08-27');
  assert.equal(v({ inicio: '2026-08-24', dias: 3, tribunal: 'TJMS', comarca: 'campo grande' }), '2026-08-28');
});

test('penal: corridos com suspensão; réu preso (penal_urgente) não suspende', () => {
  // publicação seg 14/12/2026, 10 corridos.
  // penal: 15..19 (1-5), suspenso 20/12..20/01, 21/01(6) 22(7) 23(8) 24(9) 25/01/2027(10, segunda)
  const penal = calcularPrazo({ inicio: '2026-12-14', dias: 10, tribunal: 'TJMS', materia: 'penal' });
  assert.equal(penal.tipo, 'corridos');
  assert.equal(penal.vencimento, '2027-01-25');
  // urgente: 15..24/12 (1-10) -> 24/12 está no feriado forense do TJMS -> 1º dia útil: qui 07/01/2027
  const urgente = calcularPrazo({ inicio: '2026-12-14', dias: 10, tribunal: 'TJMS', materia: 'penal_urgente' });
  assert.equal(urgente.fimContagem, '2026-12-24');
  assert.equal(urgente.vencimento, '2027-01-07');
  assert.ok(urgente.avisos.some((a) => /2027 ainda não cadastrado/.test(a)));
});

test('eleitoral em período eleitoral: todo dia conta e não prorroga', () => {
  // TRE-MS, DJEN sex 18/09/2026 -> publicação sáb 19 -> começa dom 20 -> 20, 21, 22
  const r = calcularPrazo({ inicio: '2026-09-18', dias: 3, tribunal: 'TRE-MS', evento: 'djen' });
  assert.equal(r.materia, 'eleitoral');
  assert.equal(r.publicacao, '2026-09-19');
  assert.equal(r.vencimento, '2026-09-22');
  // vence num sábado e fica no sábado: publicação seg 21/09 -> 22, 23, 24, 25, 26(sáb)
  assert.equal(v({ inicio: '2026-09-21', dias: 5, tribunal: 'TRE-MS' }), '2026-09-26');
});

test('feriadosExtras: suspensão avulsa entra no cálculo com a fonte', () => {
  const r = calcularPrazo({
    inicio: '2026-11-05',
    dias: 15,
    tribunal: 'TJMS',
    feriadosExtras: [{ data: '2026-11-27', nome: 'Indisponibilidade do sistema', tipo: 'suspensao_prazos', fonte: 'Certidão de indisponibilidade' }],
  });
  assert.equal(r.vencimento, '2026-11-30');
  assert.equal(r.passos.find((p) => p.data === '2026-11-27').fonte, 'Certidão de indisponibilidade');
});

test('todo dia pulado tem motivo; todo dia contado tem número', () => {
  const r = calcularPrazo({ inicio: '2025-12-17', dias: 30, tribunal: 'TJMS', comarca: 'Campo Grande', evento: 'djen' });
  for (const p of r.passos) {
    if (p.acao === 'pula') assert.ok(p.motivo && p.motivo !== 'dia útil', `${p.data} sem motivo`);
    if (p.acao === 'conta') assert.ok(p.contagem >= 1);
  }
  assert.equal(r.passos.at(-1).acao, 'vencimento');
});

test('erros claros de entrada', () => {
  assert.throws(() => calcularPrazo({ inicio: '2026-02-30', dias: 5 }), /data inválida/);
  assert.throws(() => calcularPrazo({ inicio: '2026-11-05', dias: 0 }), /dias/);
  assert.throws(() => calcularPrazo({ inicio: '2026-11-05', dias: 5, tipo: 'semanas' }), /tipo/);
  assert.throws(() => calcularPrazo({ inicio: '2026-11-05', dias: 5, consulta: '2026-11-06' }), /consulta/);
});
