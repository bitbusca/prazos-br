import { calendarioPara, emPeriodoEleitoral, sigla, type Calendario, type Resolucao } from './calendario.js';
import { anoDe, br, DIAS_SEMANA, diaDaSemana, lerData, paraIso } from './datas.js';
import type { ArquivoFeriados, Dobro, EventoInicial, Materia, OpcoesPrazo, Passo, ResultadoPrazo } from './tipos.js';

export const AVISO_LEGAL = 'Confira sempre no processo; o prazos-br não substitui a conferência profissional.';
export const URL_CONTRIBUIR = 'https://github.com/bitbusca/prazos-br/blob/main/CONTRIBUTING.md';

const MATERIAS = new Set<Materia>(['civel', 'trabalho', 'penal', 'penal_urgente', 'eleitoral']);
const EVENTOS = new Set<EventoInicial>(['publicacao', 'djen', 'intimacao_eletronica']);
const DOBROS = new Set<Dobro>(['fazenda', 'defensoria', 'mp', 'litisconsortes']);

/** Matéria padrão: TRT/TST = trabalho; TRE/TSE = eleitoral; demais = cível. */
export function materiaPadrao(tribunal: string | null | undefined, tipo?: string): Materia {
  if (tipo === 'clt') return 'trabalho';
  const s = tribunal ? sigla(tribunal) : '';
  if (/^(TST|TRT\d+)$/.test(s)) return 'trabalho';
  if (/^(TSE|TRE-[A-Z]{2})$/.test(s)) return 'eleitoral';
  return 'civel';
}

const ds = (n: number) => DIAS_SEMANA[diaDaSemana(n)];
const fmt = (n: number) => br(paraIso(n));

function nomeDobro(d: Dobro): string {
  return { fazenda: 'Fazenda Pública', defensoria: 'Defensoria Pública', mp: 'Ministério Público', litisconsortes: 'litisconsortes com procuradores diferentes' }[d];
}

/**
 * Calcula o vencimento de um prazo processual e devolve o passo a passo dia a dia.
 *
 * Regras: CPC arts. 219, 220, 224, 229, 231; CLT arts. 775 e 775-A; CPP arts. 798 e 798-A;
 * Lei 11.419/2006 arts. 4º e 5º; Res. CNJ 455/2022; feriados do pacote (nacionais, Lei 5.010/1966,
 * tribunal e comarca) com a fonte de cada um.
 *
 * @example
 * calcularPrazo({ inicio: '2026-11-05', dias: 15, tribunal: 'TJMS' }).vencimento // '2026-11-27'
 */
export function calcularPrazo(o: OpcoesPrazo): ResultadoPrazo {
  if (!o || typeof o !== 'object') throw new TypeError('passe um objeto { inicio, dias, ... }');
  const dias = Number(o.dias);
  if (!Number.isInteger(dias) || dias < 1 || dias > 3650) throw new RangeError('dias deve ser um inteiro entre 1 e 3650');
  const tribunal = o.tribunal ? sigla(o.tribunal) : null;
  const comarca = o.comarca?.trim() || null;
  const materia: Materia = o.materia ?? materiaPadrao(tribunal, o.tipo);
  if (!MATERIAS.has(materia)) throw new RangeError(`matéria inválida: ${o.materia}`);
  const tipo = o.tipo ?? (materia === 'trabalho' ? 'clt' : materia === 'civel' ? 'uteis' : 'corridos');
  if (!['uteis', 'corridos', 'clt'].includes(tipo)) throw new RangeError("tipo deve ser 'uteis', 'corridos' ou 'clt'");
  const evento: EventoInicial = o.evento ?? 'publicacao';
  if (!EVENTOS.has(evento)) throw new RangeError("evento deve ser 'publicacao', 'djen' ou 'intimacao_eletronica'");
  if (o.dobro && !DOBROS.has(o.dobro)) throw new RangeError("dobro deve ser 'fazenda', 'defensoria', 'mp' ou 'litisconsortes'");
  if (o.consulta && evento !== 'intimacao_eletronica') throw new RangeError("'consulta' só vale com evento 'intimacao_eletronica'");

  const penal = materia === 'penal' || materia === 'penal_urgente';
  const artComeco = penal ? 'CPP, art. 798, § 1º' : tipo === 'clt' ? 'CLT, art. 775' : 'CPC, art. 224';
  const artProrroga = penal ? 'CPP, art. 798, § 3º' : 'CPC, art. 224, § 1º';
  const { cal, res } = calendarioPara(tribunal, comarca, materia, o.feriadosExtras);
  const passos: Passo[] = [];
  const avisos: string[] = [];
  const base = new Set<string>();
  const d0 = lerData(o.inicio);

  const passo = (n: number, acao: Passo['acao'], texto: string, extra: Partial<Passo> = {}) =>
    passos.push({ data: paraIso(n), diaSemana: ds(n), acao, texto, ...extra });
  const pula = (n: number, prefixo = 'Não conta') => {
    const m = cal.motivo(n);
    const extra: Partial<Passo> = { motivo: m.motivo };
    if (m.fonte) extra.fonte = m.fonte;
    if (m.url) extra.url = m.url;
    passo(n, 'pula', `${prefixo}: ${m.motivo}`, extra);
  };

  // ── 1) marco inicial: publicação ou ciência ───────────────────────────────
  let intimacao = d0;
  let publicacao: number | null = null;
  let ciencia: number | null = null;
  let cienciaFicta = false;

  if (evento === 'publicacao') {
    passo(d0, 'evento', `Publicação/intimação em ${fmt(d0)}: o dia do começo não conta (${artComeco})`);
  } else if (evento === 'djen') {
    passo(d0, 'evento', `Disponibilização no DJEN em ${fmt(d0)}`);
    let d = d0 + 1;
    while (!cal.util(d)) {
      pula(d, 'Sem publicação');
      d++;
    }
    publicacao = d;
    intimacao = d;
    passo(d, 'publicacao', `Publicação: 1º dia útil após a disponibilização (Lei 11.419/2006, art. 4º, § 3º)`, {
      fonte: 'Lei 11.419/2006, art. 4º, §§ 3º e 4º; Res. CNJ 455/2022, art. 11, § 3º',
    });
    base.add('Lei 11.419/2006, art. 4º, §§ 3º e 4º');
    base.add('Res. CNJ 455/2022, art. 11, § 3º');
  } else {
    passo(d0, 'evento', `Envio da intimação eletrônica em ${fmt(d0)}`);
    const limite = d0 + 10;
    let c: number;
    let motivo: string;
    const consulta = o.consulta ? lerData(o.consulta) : null;
    if (consulta !== null && consulta < d0) throw new RangeError('a consulta não pode ser antes do envio');
    if (consulta !== null && consulta <= limite) {
      c = consulta;
      motivo = `Ciência pela consulta em ${fmt(consulta)} (Lei 11.419/2006, art. 5º, § 1º)`;
    } else {
      c = limite;
      cienciaFicta = true;
      motivo = `Ciência ficta: 10 dias corridos após o envio, sem consulta (Lei 11.419/2006, art. 5º, § 3º)`;
      if (consulta !== null) avisos.push(`A consulta em ${fmt(consulta)} foi depois do 10º dia: vale a ciência ficta.`);
    }
    base.add('Lei 11.419/2006, art. 5º');
    base.add('CPC, art. 231, V');
    if (!cal.util(c)) {
      const m = cal.motivo(c);
      passo(c, 'pula', `${cienciaFicta ? 'O 10º dia' : 'A consulta'} caiu em dia não útil (${m.motivo}): a ciência passa para o 1º dia útil seguinte (Lei 11.419/2006, art. 5º, § 2º)`, {
        motivo: m.motivo,
        ...(m.fonte ? { fonte: m.fonte } : {}),
      });
      c = cal.proximo(c, (x) => cal.util(x));
      motivo += '; prorrogada para o 1º dia útil (art. 5º, § 2º)';
    }
    ciencia = c;
    intimacao = c;
    passo(c, 'ciencia', motivo, { fonte: 'Lei 11.419/2006, art. 5º, §§ 1º a 3º' });
  }

  // ── 2) prazo em dobro ─────────────────────────────────────────────────────
  let fator = 1;
  let dobro: ResultadoPrazo['dobro'] = null;
  if (o.dobro) {
    const d = o.dobro;
    let aplicado = true;
    let bl = '';
    if (d === 'fazenda') {
      bl = materia === 'trabalho' ? 'Decreto-Lei 779/1969, art. 1º, III; CPC, art. 183' : 'CPC, art. 183';
      if (o.juizado) {
        aplicado = false;
        avisos.push('Juizado Especial: não há prazo diferenciado para a Fazenda Pública (Lei 10.259/2001, art. 9º; Lei 12.153/2009, art. 7º).');
      } else {
        avisos.push('Sem dobra quando a lei fixa prazo próprio para o ente público (CPC, art. 183, § 2º).');
        if (materia === 'trabalho') avisos.push('Justiça do Trabalho: o DL 779/1969 dá prazo em dobro para recorrer; para a defesa, o prazo é em quádruplo (art. 1º, II).');
      }
    } else if (d === 'defensoria') {
      bl = 'CPC, art. 186';
      avisos.push('Sem dobra quando a lei fixa prazo próprio para a Defensoria (CPC, art. 186, § 4º).');
    } else if (d === 'mp') {
      bl = 'CPC, art. 180';
      avisos.push('Sem dobra quando a lei fixa prazo próprio para o Ministério Público (CPC, art. 180, § 2º).');
    } else {
      bl = 'CPC, art. 229';
      if (o.autosEletronicos !== false) {
        aplicado = false;
        avisos.push('Litisconsortes com procuradores diferentes não têm prazo em dobro em autos eletrônicos (CPC, art. 229, § 2º). Para autos físicos, passe autosEletronicos: false.');
      } else {
        avisos.push('Cessa a dobra se, havendo só dois réus, só um deles se defender (CPC, art. 229, § 1º).');
      }
    }
    if (aplicado) {
      fator = 2;
      base.add(bl);
    }
    dobro = { tipo: d, aplicado, baseLegal: bl };
  }
  const total = dias * fator;

  // ── 3) contagem ───────────────────────────────────────────────────────────
  const uteis = tipo !== 'corridos';
  if (tipo === 'clt') base.add('CLT, art. 775');
  else if (tipo === 'uteis') base.add('CPC, art. 219');
  else if (!penal) base.add('contagem em dias corridos (prazo material ou fixado em dias corridos)');
  base.add(artComeco);
  base.add(artProrroga);
  if (!uteis) base.add('Súmula 310 do STF');

  // início: 1º dia com expediente normal, em que o prazo corre, depois da intimação
  let d = intimacao;
  for (;;) {
    d++;
    if (cal.utilCheio(d) && cal.corre(d)) break;
    pula(d, cal.util(d) && cal.corre(d) ? `Prazo não começa em expediente reduzido (${artProrroga})` : 'Não conta');
  }
  const inicio = d;
  let n = 1;
  passo(d, 'conta', `1º dia do prazo`, { contagem: 1 });
  while (n < total) {
    d++;
    const conta = uteis ? cal.util(d) && cal.corre(d) : cal.corre(d);
    if (conta) {
      n++;
      passo(d, 'conta', `${n}º dia${cal.reduzidoEm(d) ? ' (expediente reduzido conta no meio do prazo)' : ''}`, { contagem: n });
    } else pula(d);
  }
  const fim = d;

  // ── 4) vencimento: nunca em dia sem expediente normal ou com prazo suspenso ──
  let venc = fim;
  let motivoProrrogacao: string | null = null;
  if (!(cal.utilCheio(fim) && cal.corre(fim))) {
    motivoProrrogacao = cal.motivo(fim).motivo;
    for (;;) {
      venc++;
      if (cal.utilCheio(venc) && cal.corre(venc)) break;
      pula(venc, 'Ainda não vence');
    }
    passo(venc, 'prorroga', `Prorrogado: o ${total}º dia (${fmt(fim)}) caiu em ${motivoProrrogacao} (${artProrroga})`, { motivo: motivoProrrogacao });
  }
  passo(venc, 'vencimento', `Vencimento: ${fmt(venc)} (${ds(venc)})`);

  // ── 5) avisos ─────────────────────────────────────────────────────────────
  avisosDeCobertura(res, tribunal, comarca, anoDe(d0), anoDe(venc), avisos);
  if (materia === 'eleitoral' && (emPeriodoEleitoral(intimacao) || emPeriodoEleitoral(venc))) {
    avisos.push(
      'Período eleitoral: prazos contínuos, sem suspensão nem prorrogação em sábados, domingos e feriados (LC 64/1990, art. 16; Res. TSE 23.608/2019, art. 7º). Confira a data final do período no calendário eleitoral do TSE.',
    );
  } else if (materia === 'eleitoral' && uteis) {
    avisos.push('Feitos eleitorais: o TSE afasta a contagem em dias úteis (Res. TSE 23.478/2016, art. 7º).');
  }
  if (materia === 'penal_urgente') avisos.push('Réu preso/medida urgente: os prazos não se suspendem de 20/12 a 20/01 (CPP, art. 798-A).');
  if (cal.suspensoEm(fim) || passos.some((p) => p.acao === 'pula' && /20\/12 a 20\/01/.test(p.motivo ?? ''))) {
    base.add(tipo === 'clt' || materia === 'trabalho' ? 'CLT, art. 775-A' : materia === 'penal' ? 'CPP, art. 798-A' : 'CPC, art. 220');
  }

  const unidade = uteis ? 'dias úteis' : 'dias corridos';
  const marcoTxt =
    evento === 'djen' ? `disponibilizado no DJEN em ${fmt(d0)} (publicação ${fmt(intimacao)})` : evento === 'intimacao_eletronica' ? `com ciência em ${fmt(intimacao)}${cienciaFicta ? ' (ficta)' : ''}` : `publicado em ${fmt(d0)}`;
  const resumo =
    `Prazo de ${total} ${unidade}${fator === 2 ? ` (${dias} em dobro: ${nomeDobro(o.dobro as Dobro)})` : ''} ${marcoTxt}` +
    `${tribunal ? ` no ${tribunal}${comarca ? `/${comarca}` : ''}` : ''}: começa em ${fmt(inicio)} e vence em ${fmt(venc)} (${ds(venc)}).`;

  return {
    vencimento: paraIso(venc),
    vencimentoBR: fmt(venc),
    inicioContagem: paraIso(inicio),
    intimacao: paraIso(intimacao),
    publicacao: publicacao === null ? null : paraIso(publicacao),
    ciencia: ciencia === null ? null : paraIso(ciencia),
    cienciaFicta,
    fimContagem: paraIso(fim),
    prorrogado: venc !== fim,
    motivoProrrogacao,
    dias,
    diasContados: total,
    dobro,
    tipo,
    evento,
    tribunal,
    comarca,
    materia,
    baseLegal: [...base],
    calendarios: res.arquivos.map((a) => a.id),
    passos,
    avisos,
    resumo,
  };
}

function avisosDeCobertura(res: Resolucao, tribunal: string | null, comarca: string | null, a0: number, a1: number, avisos: string[]) {
  if (!tribunal) {
    avisos.push('Sem tribunal: aplicados só os feriados nacionais. Informe o tribunal para incluir Carnaval, Semana Santa, recesso forense e feriados locais.');
    return;
  }
  if (!res.tribunal) {
    const ramo = res.arquivos.some((a) => a.id === 'ramo/justica-federal') ? ' e da Lei 5.010/1966' : '';
    avisos.push(
      `${tribunal} ainda não tem calendário próprio no prazos-br: aplicados só os feriados nacionais${ramo}. ` +
        `O vencimento real pode ser posterior por feriado local, ponto facultativo ou suspensão. Contribua: ${URL_CONTRIBUIR}`,
    );
    return;
  }
  const faltam = (anos: number[] | undefined) => {
    const out: number[] = [];
    for (let a = a0; a <= a1; a++) if (!(anos ?? []).includes(a)) out.push(a);
    return out;
  };
  const ft = faltam(res.tribunal.anosConferidos);
  const comDatas = (arq: ArquivoFeriados | null, a: number) => (arq?.datas ?? []).some((d) => d.data.startsWith(`${a}-`));
  const parciais = ft.filter((a) => comDatas(res.tribunal, a));
  const vazios = ft.filter((a) => !comDatas(res.tribunal, a));
  if (vazios.length) {
    avisos.push(
      `Calendário do ${tribunal} de ${vazios.join(', ')} ainda não cadastrado: aplicadas só as regras permanentes. ` +
        'Pontos facultativos, feriados móveis decididos em portaria e suspensões do ano podem adiar o vencimento.',
    );
  }
  if (parciais.length) {
    avisos.push(
      `Calendário do ${tribunal} de ${parciais.join(', ')} cadastrado só em parte (falta algum ato do ano, ex.: o do recesso): ` +
        'confira a portaria do tribunal. Veja https://github.com/bitbusca/prazos-br/blob/main/docs/COBERTURA.md',
    );
  }
  const temMunicipais = (res.tribunal.comarcas?.length ?? 0) > 0;
  if (!comarca) {
    if (temMunicipais) avisos.push(`Sem comarca: feriados municipais não aplicados. Informe a comarca (ex.: "Campo Grande") para incluir os do ${tribunal}.`);
    return;
  }
  if (!res.comarca && !res.comarcaConhecida) {
    avisos.push(`Comarca "${comarca}" não encontrada no calendário do ${tribunal}: feriados municipais não aplicados.`);
    return;
  }
  if (!res.comarca) {
    avisos.push(
      `Feriados municipais de ${comarca} ainda não cadastrados no prazos-br: aplicado só o calendário geral do ${tribunal}. ` +
        `O vencimento real pode ser posterior. Contribua: ${URL_CONTRIBUIR}`,
    );
    return;
  }
  const fc = faltam(res.comarca?.anosConferidos ?? res.tribunal.anosConferidos).filter((a) => !ft.includes(a));
  if (fc.length) avisos.push(`Feriados municipais de ${comarca} em ${fc.join(', ')} ainda não cadastrados: aplicadas só as regras permanentes da comarca.`);
}

export type { Calendario };
