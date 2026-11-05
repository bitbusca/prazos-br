#!/usr/bin/env node
/**
 * prazos-br na linha de comando.
 *
 *   npx prazos-br 15 --de 2026-11-05 --tribunal TJMS
 *   npx prazos-br 15 --de 2026-11-04 --djen --tribunal TJMS --comarca "Campo Grande"
 *   npx prazos-br 15 --de 2026-03-02 --evento intimacao-eletronica --tribunal TJMS
 *   npx prazos-br catalogo apelação
 *   npx prazos-br feriados 2026 --tribunal TJMS --comarca "Campo Grande"
 *   npx prazos-br tribunais
 */
import { calcularPrazo, AVISO_LEGAL, diasSemExpediente, br, calendariosDisponiveis } from './index.js';
import { buscarPrazos } from './catalogo.js';
import type { EventoInicial, OpcoesPrazo, Passo, ResultadoPrazo } from './tipos.js';

const VERSAO = '0.2.0';

const AJUDA = `prazos-br ${VERSAO} — prazos processuais com passo a passo (CPC, CLT, CPP, Lei 11.419)

Uso:
  prazos-br <dias> --de <data> [opções]
  prazos-br catalogo <termo>                 busca o prazo legal de um ato
  prazos-br feriados <ano> --tribunal <T>    lista os dias sem expediente
  prazos-br tribunais                        tribunais com calendário próprio e anos conferidos

Opções do cálculo:
  --de <data>             data da publicação/intimação (AAAA-MM-DD ou DD/MM/AAAA)
  --tribunal <sigla>      TJSP, TRT2, TRF1... (veja "prazos-br tribunais"; sem tribunal: só nacionais)
  --comarca <nome>        comarca/cidade da vara, para os feriados municipais
  --tipo <t>              uteis (padrão, CPC 219) | clt | corridos
  --djen                  a data é a disponibilização no DJEN (publica no 1º dia útil seguinte)
  --evento <e>            publicacao (padrão) | djen | intimacao-eletronica
  --consulta <data>       intimação eletrônica: dia em que o intimado abriu (antes dos 10 dias)
  --dobro <quem>          fazenda | defensoria | mp | litisconsortes
  --fisico                autos físicos (litisconsortes só dobram no físico — CPC 229 § 2º)
  --juizado               processo no Juizado Especial
  --materia <m>           civel | trabalho | penal | penal_urgente | eleitoral
  --json                  saída em JSON
  --completo              mostra cada dia, sem agrupar os dias pulados

${AVISO_LEGAL}`;

type Args = { _: string[]; [k: string]: string | boolean | string[] };

function lerArgs(argv: string[]): Args {
  const out: Args = { _: [] };
  const flags = new Set(['djen', 'fisico', 'juizado', 'json', 'completo', 'help', 'h', 'version', 'v']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') || (a.startsWith('-') && a.length === 2 && isNaN(Number(a)))) {
      const [k, v] = a.replace(/^-+/, '').split('=', 2);
      if (flags.has(k)) out[k] = true;
      else if (v !== undefined) out[k] = v;
      else {
        const prox = argv[i + 1];
        if (prox === undefined) throw new Error(`falta o valor de --${k}`);
        out[k] = prox;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

const cor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (n: number) => (s: string) => (cor ? `\x1b[${n}m${s}\x1b[0m` : s);
const negrito = c(1);
const cinza = c(90);
const verde = c(32);
const amarelo = c(33);
const ciano = c(36);

const curto = (ds: string) => ds.slice(0, 3);

function agrupar(passos: Passo[]): Array<Passo & { ate?: string }> {
  const chave = (p: Passo) => {
    const partes = (p.motivo ?? '').split(' · ').filter((x) => x !== 'sábado' && x !== 'domingo');
    return partes.length ? partes.join(' · ') : 'fim de semana';
  };
  const out: Array<Passo & { ate?: string; chave?: string }> = [];
  for (const p of passos) {
    const ult = out[out.length - 1];
    if (p.acao === 'pula' && ult?.acao === 'pula' && ult.chave === chave(p) && ult.texto.split(':')[0] === p.texto.split(':')[0]) {
      ult.ate = p.data;
      continue;
    }
    out.push(p.acao === 'pula' ? { ...p, chave: chave(p) } : { ...p });
  }
  return out;
}

function imprimir(r: ResultadoPrazo, completo: boolean) {
  const unidade = r.tipo === 'corridos' ? 'dias corridos' : r.tipo === 'clt' ? 'dias úteis (CLT)' : 'dias úteis';
  const onde = r.tribunal ? `${r.tribunal}${r.comarca ? ` · ${r.comarca}` : ''}` : 'só feriados nacionais';
  console.log(`\n${negrito(`prazos-br · ${r.diasContados} ${unidade} · ${onde}`)}\n`);
  const lista = completo ? r.passos : agrupar(r.passos);
  const larg = 16;
  for (const p of lista as Array<Passo & { ate?: string; chave?: string }>) {
    const data = `${br(p.data)} ${curto(p.diaSemana)}`.padEnd(larg);
    if (p.acao === 'pula') {
      let faixa = data;
      if (p.ate) faixa = (p.data.slice(0, 4) === p.ate.slice(0, 4) ? `${br(p.data).slice(0, 5)}–${br(p.ate)}` : `${br(p.data)}–${br(p.ate)}`).padEnd(larg);
      const texto = p.ate && p.chave ? `${p.texto.split(':')[0]}: ${p.chave}` : p.texto;
      console.log(cinza(`  ${faixa}  ·   ${texto}${p.fonte ? ` [${p.fonte}]` : ''}`));
    } else if (p.acao === 'conta') {
      const nota = p.contagem === 1 ? 'início da contagem' : /reduzido/.test(p.texto) ? 'expediente reduzido: conta no meio do prazo' : '';
      console.log(`  ${data}${String(p.contagem).padStart(3)}  ${cinza(nota)}`.trimEnd());
    } else if (p.acao === 'vencimento') {
      console.log(verde(negrito(`  ${data}  ✔   ${p.texto}`)));
    } else if (p.acao === 'prorroga') {
      console.log(amarelo(`  ${data}  ↷   ${p.texto}`));
    } else {
      console.log(ciano(`  ${data}  ●   ${p.texto}`));
    }
  }
  console.log(`\n${negrito('Vence em')} ${verde(negrito(r.vencimentoBR))} — ${r.resumo}`);
  if (r.avisos.length) {
    console.log(`\n${amarelo('Avisos')}`);
    for (const a of r.avisos) console.log(amarelo(`  ! ${a}`));
  }
  console.log(cinza(`\nBase legal: ${r.baseLegal.join('; ')}`));
  console.log(cinza(`Calendários: ${r.calendarios.join(', ')}`));
  console.log(cinza(`${AVISO_LEGAL}\n`));
}

function main(argv: string[]): number {
  const a = lerArgs(argv);
  if (a.version || a.v) {
    console.log(VERSAO);
    return 0;
  }
  if (a.help || a.h || a._.length === 0) {
    console.log(AJUDA);
    return a._.length === 0 && !a.help && !a.h ? 1 : 0;
  }
  const [cmd, ...resto] = a._;

  if (cmd === 'catalogo' || cmd === 'catálogo') {
    const achados = buscarPrazos(resto.join(' '), { limite: 30 });
    if (a.json) console.log(JSON.stringify(achados, null, 2));
    else if (!achados.length) console.log('Nenhum prazo encontrado.');
    else
      for (const p of achados) {
        const un = p.unidadeNaLei ? `${p.quantidadeNaLei} ${p.unidadeNaLei}` : `${p.dias} ${p.contagem === 'uteis' ? 'dias úteis' : 'dias corridos'}`;
        console.log(`${negrito(un.padEnd(16))} ${p.ato}  ${cinza(`(${p.baseLegal}${p.quem === 'juizo' ? ' · prazo do juízo' : ''}${p.conta === 'antes_do_ato' ? ' · antes do ato' : ''})`)}`);
      }
    return 0;
  }

  if (cmd === 'tribunais') {
    const lista = calendariosDisponiveis();
    if (a.json) console.log(JSON.stringify(lista, null, 2));
    else {
      for (const t of lista) {
        const anos = t.anosConferidos.length ? t.anosConferidos.join(', ') : 'nenhum ano completo';
        const com = t.comarcasComFeriado.length > 3 ? `${t.comarcasComFeriado.length} comarcas` : t.comarcasComFeriado.join(', ') || '—';
        console.log(`${negrito(t.tribunal.padEnd(6))} ${t.nome}  ${cinza(`(anos conferidos: ${anos} · comarcas cadastradas: ${com})`)}`);
      }
      console.log(cinza(`
${lista.length} tribunais com calendário próprio. Os demais recebem os feriados nacionais (e a Lei 5.010/1966, se da União) e um aviso.`));
    }
    return 0;
  }

  if (cmd === 'feriados') {
    const ano = Number(resto[0]);
    const lista = diasSemExpediente(ano, {
      tribunal: (a.tribunal as string) || undefined,
      comarca: (a.comarca as string) || undefined,
      materia: (a.materia as OpcoesPrazo['materia']) || undefined,
    });
    if (a.json) console.log(JSON.stringify(lista, null, 2));
    else for (const d of lista) console.log(`${br(d.data)}  ${d.tipo.padEnd(19)} ${d.nome}  ${cinza(`[${d.fonte}] (${d.origem})`)}`);
    return 0;
  }

  const dias = Number(cmd);
  if (!Number.isInteger(dias)) throw new Error(`não entendi "${cmd}". Use: prazos-br <dias> --de <data>`);
  if (!a.de) throw new Error('informe a data com --de AAAA-MM-DD');
  const evento = (a.djen ? 'djen' : String(a.evento ?? 'publicacao').replace(/-/g, '_')) as EventoInicial;
  const r = calcularPrazo({
    inicio: String(a.de),
    dias,
    tipo: (a.tipo as OpcoesPrazo['tipo']) || undefined,
    tribunal: (a.tribunal as string) || undefined,
    comarca: (a.comarca as string) || undefined,
    evento,
    consulta: (a.consulta as string) || undefined,
    dobro: (a.dobro as OpcoesPrazo['dobro']) || undefined,
    autosEletronicos: !a.fisico,
    juizado: Boolean(a.juizado),
    materia: (a.materia as OpcoesPrazo['materia']) || undefined,
  });
  if (a.json) console.log(JSON.stringify(r, null, 2));
  else imprimir(r, Boolean(a.completo));
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  console.error(`prazos-br: ${(e as Error).message}`);
  process.exitCode = 2;
}
