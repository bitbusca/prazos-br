/**
 * Catálogo de prazos processuais (ato -> dias -> base legal), só com informação pública.
 * Entrada separada para não pesar em quem só quer o cálculo:
 *   import { buscarPrazos } from 'prazos-br/catalogo'
 */
import { CATALOGO } from './dados/catalogo.gerado.js';
import type { CatalogoPrazos, PrazoCatalogo } from './tipos.js';

export type { CatalogoPrazos, PrazoCatalogo };

const norm = (s: string) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** O catálogo inteiro (categorias e prazos). */
export function catalogo(): CatalogoPrazos {
  return CATALOGO;
}

export function prazoPorId(id: string): PrazoCatalogo | null {
  return CATALOGO.prazos.find((p) => p.id === id) ?? null;
}

/**
 * Busca por palavras no nome do ato, na categoria e na base legal ("apelação", "contestação",
 * "art. 1.003", "embargos de declaração"). Todas as palavras precisam aparecer.
 */
export function buscarPrazos(termo: string, o: { ramo?: PrazoCatalogo['ramo']; quem?: PrazoCatalogo['quem']; limite?: number } = {}): PrazoCatalogo[] {
  const palavras = norm(termo).split(' ').filter(Boolean);
  const cats = new Map(CATALOGO.categorias.map((c) => [c.id, norm(c.nome)]));
  const out = CATALOGO.prazos.filter((p) => {
    if (o.ramo && p.ramo !== o.ramo) return false;
    if (o.quem && p.quem !== o.quem) return false;
    const alvo = `${norm(p.ato)} ${cats.get(p.categoria) ?? ''} ${norm(p.baseLegal)}`;
    return palavras.every((w) => alvo.includes(w));
  });
  // ato que começa com o termo primeiro
  const t = norm(termo);
  out.sort((a, b) => Number(norm(b.ato).startsWith(t)) - Number(norm(a.ato).startsWith(t)));
  return out.slice(0, o.limite ?? 50);
}

export function prazosDaCategoria(categoria: string): PrazoCatalogo[] {
  return CATALOGO.prazos.filter((p) => p.categoria === categoria);
}
