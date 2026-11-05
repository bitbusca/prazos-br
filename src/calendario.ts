import { ARQUIVOS, TEXTOS } from './dados/feriados.gerado.js';
import { anoDe, diaDaSemana, isoValida, paraIso, paraNum, pascoa } from './datas.js';
import type { ArquivoCompacto, ArquivoFeriados, DataFeriado, DiaEspecial, Materia, RegraFeriado, TipoDia } from './tipos.js';

const TIPOS = new Set<TipoDia>(['feriado', 'recesso', 'ponto_facultativo', 'expediente_reduzido', 'suspensao_prazos', 'expediente_normal']);
const FECHADO = new Set<TipoDia>(['feriado', 'recesso', 'ponto_facultativo']);

// ── registro dos calendários ────────────────────────────────────────────────

function expandir(c: ArquivoCompacto): ArquivoFeriados {
  const txt = (i: number) => (i >= 0 ? TEXTOS[i] : undefined);
  return {
    id: c.id,
    escopo: c.escopo,
    nome: c.nome,
    tribunal: c.tribunal,
    comarca: c.comarca,
    uf: c.uf,
    aplicaA: c.aplicaA,
    anosConferidos: c.anosConferidos,
    comarcas: c.comarcas,
    regras: c.regras.map((r) => ({
      nome: r.nome,
      tipo: r.tipo as TipoDia,
      quando: r.quando,
      fonte: txt(r.fonte) ?? '',
      url: txt(r.url),
      desde: r.desde,
      ate: r.ate,
      naoSeAplica: r.naoSeAplica as Materia[] | undefined,
    })),
    datas: c.datas.map((d) => ({
      data: d[0],
      nome: txt(d[1]) ?? '',
      tipo: d[2] as TipoDia,
      fonte: txt(d[3]) ?? '',
      url: txt(d[4]),
      naoSeAplica: d[5] as Materia[] | undefined,
    })),
  };
}

let registro: Map<string, ArquivoFeriados> | null = null;
function reg(): Map<string, ArquivoFeriados> {
  if (!registro) registro = new Map(ARQUIVOS.map((c) => [c.id, expandir(c)]));
  return registro;
}

/** Normaliza a sigla: 'tj-ms' -> 'TJMS', 'tre_sp' -> 'TRE-SP', 'TJDF' -> 'TJDFT'. */
export function sigla(t: string): string {
  const s = String(t ?? '')
    .trim()
    .toUpperCase()
    .replace(/_/g, '-');
  const tre = /^TRE-?([A-Z]{2})$/.exec(s);
  if (tre) return `TRE-${tre[1]}`;
  const sem = s.replace(/-/g, '');
  if (sem === 'TJDF') return 'TJDFT';
  return /^(TJ|TRT|TRF|TJM)/.test(sem) ? sem : s;
}

export function slug(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Registra (ou substitui, pelo `id`) um calendário no formato aberto de feriados/*.json.
 * Útil para testar um arquivo novo antes de mandar o pull request, ou para o calendário
 * interno de um escritório.
 */
export function registrarCalendario(arq: ArquivoFeriados): void {
  if (!arq || typeof arq.id !== 'string' || !arq.id) throw new TypeError('calendário sem "id"');
  if (!['nacional', 'ramo', 'tribunal', 'comarca'].includes(arq.escopo)) throw new TypeError(`escopo inválido: ${arq.escopo}`);
  for (const d of arq.datas ?? []) {
    if (!isoValida(d.data)) throw new TypeError(`${arq.id}: data inválida ${d.data}`);
    if (!TIPOS.has(d.tipo)) throw new TypeError(`${arq.id}: tipo inválido ${d.tipo}`);
    if (!d.fonte) throw new TypeError(`${arq.id}: ${d.data} sem fonte`);
  }
  for (const r of arq.regras ?? []) {
    if (!TIPOS.has(r.tipo)) throw new TypeError(`${arq.id}: tipo inválido ${r.tipo}`);
    if (r.tipo === 'expediente_normal') throw new TypeError(`${arq.id}: regra "${r.nome}": expediente_normal só vale em datas`);
    if (!r.fonte) throw new TypeError(`${arq.id}: regra "${r.nome}" sem fonte`);
  }
  const copia: ArquivoFeriados = { ...arq, regras: arq.regras ?? [], datas: arq.datas ?? [] };
  if (copia.tribunal) copia.tribunal = sigla(copia.tribunal);
  reg().set(copia.id, copia);
  cacheCalendarios.clear();
}

/** Volta ao conjunto de calendários que vem no pacote (desfaz registrarCalendario). */
export function restaurarCalendarios(): void {
  registro = null;
  cacheCalendarios.clear();
}

function casa(padrao: string, s: string): boolean {
  if (padrao === '*') return true;
  if (padrao.endsWith('*')) return s.startsWith(padrao.slice(0, -1));
  return padrao === s;
}

export interface Resolucao {
  /** do mais específico para o mais geral: comarca, tribunal, ramos, nacional */
  arquivos: ArquivoFeriados[];
  tribunal: ArquivoFeriados | null;
  comarca: ArquivoFeriados | null;
  /** a comarca está na lista do tribunal (mesmo sem arquivo próprio) */
  comarcaConhecida: boolean;
}

export function resolver(tribunal: string | null, comarca: string | null): Resolucao {
  const r = reg();
  const sig = tribunal ? sigla(tribunal) : null;
  const trib = sig ? (r.get(sig) ?? null) : null;
  const com = sig && comarca ? (r.get(`${sig}/${slug(comarca)}`) ?? null) : null;
  const gerais = [...r.values()].filter(
    (a) => (a.escopo === 'nacional' || a.escopo === 'ramo') && (a.aplicaA ?? []).some((p) => (sig ? casa(p, sig) : p === '*')),
  );
  // ramo antes do nacional (descrição mais específica do mesmo dia)
  gerais.sort((a, b) => (a.escopo === b.escopo ? 0 : a.escopo === 'ramo' ? -1 : 1));
  const conhecida = Boolean(com) || Boolean(comarca && trib?.comarcas?.some((c) => slug(c) === slug(comarca)));
  return { arquivos: [...(com ? [com] : []), ...(trib ? [trib] : []), ...gerais], tribunal: trib, comarca: com, comarcaConhecida: conhecida };
}

/** Siglas dos tribunais com calendário próprio no pacote (os demais recebem só nacionais/ramo e um aviso). */
export const TRIBUNAIS: readonly string[] = Object.freeze(
  ARQUIVOS.filter((a) => a.escopo === 'tribunal' && a.tribunal)
    .map((a) => a.tribunal!)
    .sort((x, y) => x.localeCompare(y, 'pt-BR', { numeric: true })),
);

/** Tribunais com calendário próprio no pacote, com as comarcas conhecidas e as que têm feriado municipal. */
export function calendariosDisponiveis(): Array<{
  tribunal: string;
  nome: string;
  uf: string | null;
  anosConferidos: number[];
  comarcas: string[];
  comarcasComFeriado: string[];
}> {
  const r = [...reg().values()];
  return r
    .filter((a) => a.escopo === 'tribunal' && a.tribunal)
    .map((a) => ({
      tribunal: a.tribunal!,
      nome: a.nome ?? a.tribunal!,
      uf: a.uf ?? null,
      anosConferidos: a.anosConferidos ?? [],
      comarcas: a.comarcas ?? [],
      comarcasComFeriado: r.filter((c) => c.escopo === 'comarca' && c.tribunal === a.tribunal).map((c) => c.comarca!),
    }))
    .sort((a, b) => a.tribunal.localeCompare(b.tribunal, 'pt-BR', { numeric: true }));
}

// ── calendário de um tribunal/comarca ───────────────────────────────────────

/**
 * Período eleitoral: do fim do prazo de registro de candidaturas (15/08) até a diplomação.
 * Conferir a data final no calendário eleitoral do TSE de cada pleito.
 */
const PERIODO_ELEITORAL: Record<number, [string, string]> = {
  2026: ['2026-08-15', '2026-12-18'],
  2028: ['2028-08-15', '2028-12-18'],
  2030: ['2030-08-15', '2030-12-19'],
};

export function emPeriodoEleitoral(n: number): boolean {
  const p = PERIODO_ELEITORAL[anoDe(n)];
  return Boolean(p && paraNum(p[0]) <= n && n <= paraNum(p[1]));
}

function datasDaRegra(r: RegraFeriado, ano: number): number[] {
  if (r.desde && ano < r.desde) return [];
  if (r.ate && ano > r.ate) return [];
  const q = r.quando as { dia?: string; pascoa?: number; de?: string; ate?: string };
  if (q.dia) return isoValida(`${ano}-${q.dia}`) ? [paraNum(`${ano}-${q.dia}`)] : [];
  if (typeof q.pascoa === 'number') return [paraNum(pascoa(ano)) + q.pascoa];
  if (q.de && q.ate) {
    const de = paraNum(`${ano}-${q.de}`);
    const ate = paraNum(`${ano}-${q.ate}`);
    const out: number[] = [];
    if (q.de <= q.ate) for (let d = de; d <= ate; d++) out.push(d);
    else {
      // período que vira o ano (20/12 a 20/01): neste ano, 01/01..ate e de..31/12
      for (let d = paraNum(`${ano}-01-01`); d <= ate; d++) out.push(d);
      for (let d = de; d <= paraNum(`${ano}-12-31`); d++) out.push(d);
    }
    return out;
  }
  return [];
}

export class Calendario {
  private readonly fechado = new Map<number, DiaEspecial>();
  private readonly reduzido = new Map<number, DiaEspecial>();
  private readonly suspenso = new Map<number, DiaEspecial>();
  private readonly anos = new Set<number>();
  /** posição do arquivo na precedência: -1 = feriadosExtras, 0 = mais específico (comarca) ... */
  private readonly datasPorAno = new Map<number, Array<{ d: DataFeriado; origem: string; pos: number }>>();
  /** dia com expediente_normal -> posição do arquivo mais específico que o declarou */
  private readonly normal = new Map<number, number>();

  constructor(
    readonly arquivos: ArquivoFeriados[],
    readonly materia: Materia,
    extras: DataFeriado[] = [],
  ) {
    const por = (d: DataFeriado, origem: string, pos: number) => {
      if (!isoValida(d.data)) return;
      const a = Number(d.data.slice(0, 4));
      if (!this.datasPorAno.has(a)) this.datasPorAno.set(a, []);
      this.datasPorAno.get(a)!.push({ d, origem, pos });
    };
    for (const e of extras) por(e, 'extra', -1);
    arquivos.forEach((arq, i) => {
      for (const d of arq.datas ?? []) por(d, arq.id, i);
    });
  }

  private marcar(n: number, tipo: TipoDia, info: DiaEspecial, naoSeAplica?: Materia[]) {
    if (naoSeAplica?.includes(this.materia)) return;
    const def = (m: Map<number, DiaEspecial>) => {
      if (!m.has(n)) m.set(n, info);
    };
    if (FECHADO.has(tipo)) def(this.fechado);
    else if (tipo === 'expediente_reduzido') def(this.reduzido);
    else if (tipo === 'suspensao_prazos') def(this.suspenso);
  }

  private ano(a: number) {
    if (this.anos.has(a)) return;
    this.anos.add(a);
    const doAno = this.datasPorAno.get(a) ?? [];
    // 0) expediente normal declarado (feriado transferido): anula o que vier de arquivo mais geral
    for (const { d, pos } of doAno) {
      if (d.tipo !== 'expediente_normal' || d.naoSeAplica?.includes(this.materia)) continue;
      const n = paraNum(d.data);
      if (!this.normal.has(n) || this.normal.get(n)! > pos) this.normal.set(n, pos);
    }
    const anulado = (n: number, pos: number, ehRegra: boolean) => {
      const p = this.normal.get(n);
      return p !== undefined && (ehRegra ? p <= pos : p < pos);
    };
    // 1) datas conferidas (extras primeiro, depois comarca, tribunal...)
    for (const { d, origem, pos } of doAno) {
      if (d.tipo === 'expediente_normal' || anulado(paraNum(d.data), pos, false)) continue;
      this.marcar(paraNum(d.data), d.tipo, { data: d.data, nome: d.nome, tipo: d.tipo, fonte: d.fonte, url: d.url, origem }, d.naoSeAplica);
    }
    // 2) regras permanentes
    this.arquivos.forEach((arq, pos) => {
      for (const r of arq.regras) {
        for (const n of datasDaRegra(r, a)) {
          if (anulado(n, pos, true)) continue;
          this.marcar(n, r.tipo, { data: paraIso(n), nome: r.nome, tipo: r.tipo, fonte: r.fonte, url: r.url, origem: arq.id }, r.naoSeAplica);
        }
      }
    });
  }

  private garantir(n: number) {
    const a = anoDe(n);
    this.ano(a);
  }

  /** Feito eleitoral em período eleitoral: todo dia conta, inclusive começo e vencimento. */
  continuo(n: number): boolean {
    return this.materia === 'eleitoral' && emPeriodoEleitoral(n);
  }

  fechadoEm(n: number): DiaEspecial | undefined {
    this.garantir(n);
    return this.fechado.get(n);
  }
  reduzidoEm(n: number): DiaEspecial | undefined {
    this.garantir(n);
    return this.fechado.has(n) ? undefined : this.reduzido.get(n);
  }
  suspensoEm(n: number): DiaEspecial | undefined {
    this.garantir(n);
    return this.suspenso.get(n);
  }

  fimDeSemana(n: number): boolean {
    const w = diaDaSemana(n);
    return w === 0 || w === 6;
  }
  /** há expediente forense (inclusive reduzido) */
  util(n: number): boolean {
    return this.continuo(n) || (!this.fimDeSemana(n) && !this.fechadoEm(n));
  }
  /** há expediente normal (o prazo pode começar ou vencer) */
  utilCheio(n: number): boolean {
    return this.continuo(n) || (this.util(n) && !this.reduzidoEm(n));
  }
  /** o prazo corre neste dia (não está suspenso) */
  corre(n: number): boolean {
    return this.continuo(n) || !this.suspensoEm(n);
  }

  /** Motivo legível de um dia não contar/não poder vencer, com a fonte principal. */
  motivo(n: number): { motivo: string; fonte?: string; url?: string } {
    const partes: string[] = [];
    const f = this.fechadoEm(n);
    const r = this.reduzidoEm(n);
    const s = this.suspensoEm(n);
    const w = diaDaSemana(n);
    if (f) partes.push(f.nome);
    if (w === 6) partes.push('sábado');
    if (w === 0) partes.push('domingo');
    if (r) partes.push(`${r.nome} (expediente reduzido)`);
    if (s) partes.push(s.nome);
    const principal = f ?? r ?? s;
    return { motivo: partes.join(' · ') || 'dia útil', fonte: principal?.fonte, url: principal?.url };
  }

  proximo(n: number, cond: (x: number) => boolean): number {
    for (let i = 0; i < 800; i++) {
      n += 1;
      if (cond(n)) return n;
    }
    throw new RangeError('calendário sem dia útil em 800 dias: confira os dados de feriados');
  }

  /** Dias especiais de um ano (para listar ou desenhar um calendário). */
  diasEspeciais(ano: number): DiaEspecial[] {
    this.ano(ano);
    const out: DiaEspecial[] = [];
    for (const m of [this.fechado, this.reduzido, this.suspenso]) for (const [n, v] of m) if (anoDe(n) === ano) out.push({ ...v, data: paraIso(n) });
    return out.sort((a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo));
  }
}

const cacheCalendarios = new Map<string, Calendario>();

export function calendarioPara(tribunal: string | null, comarca: string | null, materia: Materia, extras?: DataFeriado[]): { cal: Calendario; res: Resolucao } {
  const res = resolver(tribunal, comarca);
  if (extras?.length) return { cal: new Calendario(res.arquivos, materia, extras), res };
  const k = `${res.arquivos.map((a) => a.id).join('|')}#${materia}`;
  let cal = cacheCalendarios.get(k);
  if (!cal) {
    if (cacheCalendarios.size > 200) cacheCalendarios.clear();
    cal = new Calendario(res.arquivos, materia);
    cacheCalendarios.set(k, cal);
  }
  return { cal, res };
}
