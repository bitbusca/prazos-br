/**
 * Datas como número de dias desde 1970-01-01 (UTC): sem fuso, sem horário de verão.
 * Entrada aceita 'AAAA-MM-DD' e 'DD/MM/AAAA'.
 */

const DIA_MS = 86_400_000;

export const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'] as const;

export function paraNum(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / DIA_MS);
}

export function paraIso(n: number): string {
  return new Date(n * DIA_MS).toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado */
export function diaDaSemana(n: number): number {
  return new Date(n * DIA_MS).getUTCDay();
}

export function anoDe(n: number): number {
  return new Date(n * DIA_MS).getUTCFullYear();
}

export function isoValida(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

/** Lê 'AAAA-MM-DD' ou 'DD/MM/AAAA' (também aceita data com hora; a hora é ignorada). */
export function lerData(entrada: string): number {
  const s = String(entrada ?? '').trim().slice(0, 10);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : s;
  if (!isoValida(iso)) throw new RangeError(`data inválida: "${entrada}" (use AAAA-MM-DD ou DD/MM/AAAA)`);
  return paraNum(iso);
}

/** 'AAAA-MM-DD' -> 'DD/MM/AAAA' */
export function br(iso: string): string {
  return iso.split('-').reverse().join('/');
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), 'AAAA-MM-DD'. */
export function pascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Datas móveis do ano, todas a partir da Páscoa. */
export function datasMoveis(ano: number): {
  carnavalSegunda: string;
  carnavalTerca: string;
  quartaDeCinzas: string;
  quintaSanta: string;
  sextaSanta: string;
  pascoa: string;
  corpusChristi: string;
} {
  const p = paraNum(pascoa(ano));
  return {
    carnavalSegunda: paraIso(p - 48),
    carnavalTerca: paraIso(p - 47),
    quartaDeCinzas: paraIso(p - 46),
    quintaSanta: paraIso(p - 3),
    sextaSanta: paraIso(p - 2),
    pascoa: paraIso(p),
    corpusChristi: paraIso(p + 60),
  };
}

/** Soma dias corridos a uma data 'AAAA-MM-DD'. */
export function somarDias(iso: string, n: number): string {
  return paraIso(paraNum(iso) + n);
}
