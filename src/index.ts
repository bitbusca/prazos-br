/**
 * prazos-br — cálculo de prazos processuais brasileiros com passo a passo e fonte de cada feriado.
 * Grátis e de código aberto (MIT). Confira sempre no processo; não substitui conferência profissional.
 */
import { calendarioPara, sigla } from './calendario.js';
import { lerData, paraIso } from './datas.js';
import { materiaPadrao } from './prazo.js';
import type { DataFeriado, DiaEspecial, Materia } from './tipos.js';

export { calcularPrazo, materiaPadrao, AVISO_LEGAL, URL_CONTRIBUIR } from './prazo.js';
export { registrarCalendario, restaurarCalendarios, calendariosDisponiveis, sigla, slug, TRIBUNAIS } from './calendario.js';
export { pascoa, datasMoveis, br, somarDias } from './datas.js';
export type * from './tipos.js';

export interface OpcoesCalendario {
  tribunal?: string;
  comarca?: string;
  materia?: Materia;
  feriadosExtras?: DataFeriado[];
}

function cal(o: OpcoesCalendario = {}) {
  const tribunal = o.tribunal ? sigla(o.tribunal) : null;
  return calendarioPara(tribunal, o.comarca?.trim() || null, o.materia ?? materiaPadrao(tribunal), o.feriadosExtras).cal;
}

/**
 * Diz se há expediente forense normal na data (o prazo pode começar e vencer nela) e, se não, por quê.
 * `conta` = o dia entra na contagem em dias úteis (expediente reduzido conta; suspensão não).
 */
export function ehDiaUtil(data: string, o: OpcoesCalendario = {}): { util: boolean; conta: boolean; motivo: string; fonte?: string } {
  const c = cal(o);
  const n = lerData(data);
  const m = c.motivo(n);
  return { util: c.utilCheio(n) && c.corre(n), conta: c.util(n) && c.corre(n), motivo: m.motivo, ...(m.fonte ? { fonte: m.fonte } : {}) };
}

/** Feriados, recessos, pontos facultativos, expedientes reduzidos e suspensões do ano, com a fonte. */
export function diasSemExpediente(ano: number, o: OpcoesCalendario = {}): DiaEspecial[] {
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2200) throw new RangeError('ano inválido');
  return cal(o).diasEspeciais(ano);
}

/**
 * Anda `n` dias úteis a partir da data (negativo = para trás), sem contar o próprio dia.
 * Útil para o prazo interno do escritório ("2 dias úteis antes do vencimento").
 */
export function somarDiasUteis(data: string, n: number, o: OpcoesCalendario = {}): string {
  if (!Number.isInteger(n)) throw new RangeError('n deve ser inteiro');
  const c = cal(o);
  let d = lerData(data);
  const passo = n < 0 ? -1 : 1;
  for (let i = 0; i < Math.abs(n); ) {
    d += passo;
    if (c.util(d) && c.corre(d)) i++;
  }
  return paraIso(d);
}
