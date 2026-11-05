#!/usr/bin/env node
/**
 * Valida os JSON de feriados/ e catalogo/ e embute tudo em src/dados/*.gerado.ts
 * (a biblioteca roda no navegador sem ler arquivo nem fazer fetch).
 *
 *   node scripts/gerar-dados.mjs              # valida e gera
 *   node scripts/gerar-dados.mjs --verificar  # só confere se os .gerado.ts estão em dia (CI)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERIFICAR = process.argv.includes('--verificar');
const TIPOS = new Set(['feriado', 'recesso', 'ponto_facultativo', 'expediente_reduzido', 'suspensao_prazos', 'expediente_normal']);
const MATERIAS = new Set(['civel', 'trabalho', 'penal', 'penal_urgente', 'eleitoral']);
const ESCOPOS = new Set(['nacional', 'ramo', 'tribunal', 'comarca']);
const erros = [];
const erro = (arq, msg) => erros.push(`${arq}: ${msg}`);

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
const mesDiaValido = (s) => /^\d{2}-\d{2}$/.test(s) && dataValida(`2024-${s}`);

function listar(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listar(p));
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out.sort();
}

function validarArquivo(rel, j) {
  const permitidas = new Set(['$schema', 'id', 'escopo', 'nome', 'tribunal', 'comarca', 'uf', 'ibge', 'aplicaA', 'observacao', 'atualizadoEm', 'anosConferidos', 'comarcas', 'regras', 'datas']);
  for (const k of Object.keys(j)) if (!permitidas.has(k)) erro(rel, `campo desconhecido "${k}"`);
  if (!ESCOPOS.has(j.escopo)) erro(rel, `escopo inválido: ${j.escopo}`);
  if (typeof j.id !== 'string' || !j.id) erro(rel, 'falta "id"');
  if (j.escopo === 'tribunal' || j.escopo === 'comarca') {
    if (!/^[A-Z0-9-]+$/.test(j.tribunal || '')) erro(rel, 'falta "tribunal" (sigla em maiúsculas)');
    const pasta = rel.split(/[\\/]/)[2];
    if (pasta !== j.tribunal) erro(rel, `pasta ${pasta} diferente do tribunal ${j.tribunal}`);
  }
  if (j.escopo === 'comarca') {
    if (!j.comarca) erro(rel, 'falta "comarca"');
    else if (path.basename(rel, '.json') !== slug(j.comarca)) erro(rel, `nome do arquivo deve ser ${slug(j.comarca)}.json`);
    if (j.id !== `${j.tribunal}/${slug(j.comarca || '')}`) erro(rel, `id deve ser ${j.tribunal}/${slug(j.comarca || '')}`);
  }
  if (j.escopo === 'tribunal' && j.id !== j.tribunal) erro(rel, `id deve ser ${j.tribunal}`);
  if ((j.escopo === 'nacional' || j.escopo === 'ramo') && !Array.isArray(j.aplicaA)) erro(rel, 'falta "aplicaA"');
  if (j.anosConferidos && !j.anosConferidos.every((a) => Number.isInteger(a) && a > 1990 && a < 2200)) erro(rel, 'anosConferidos inválido');
  if (!Array.isArray(j.regras)) erro(rel, '"regras" deve ser lista (pode ser vazia)');
  for (const [i, r] of (j.regras || []).entries()) {
    const onde = `regras[${i}] (${r.nome})`;
    if (!r.nome) erro(rel, `${onde}: falta nome`);
    if (!TIPOS.has(r.tipo)) erro(rel, `${onde}: tipo inválido ${r.tipo}`);
    if (r.tipo === 'expediente_normal') erro(rel, `${onde}: expediente_normal só vale em "datas" (feriado transferido num ano)`);
    if (!r.fonte) erro(rel, `${onde}: falta fonte`);
    const q = r.quando || {};
    const ok =
      (Object.keys(q).length === 1 && q.dia && mesDiaValido(q.dia)) ||
      (Object.keys(q).length === 1 && Number.isInteger(q.pascoa)) ||
      (Object.keys(q).length === 2 && mesDiaValido(q.de || '') && mesDiaValido(q.ate || ''));
    if (!ok) erro(rel, `${onde}: "quando" deve ser {dia:"MM-DD"}, {pascoa:N} ou {de:"MM-DD",ate:"MM-DD"}`);
    for (const m of r.naoSeAplica || []) if (!MATERIAS.has(m)) erro(rel, `${onde}: matéria inválida ${m}`);
  }
  const vistos = new Set();
  for (const [i, d] of (j.datas || []).entries()) {
    const onde = `datas[${i}] (${d.data})`;
    if (!dataValida(d.data || '')) erro(rel, `${onde}: data inválida`);
    if (!d.nome) erro(rel, `${onde}: falta nome`);
    if (!TIPOS.has(d.tipo)) erro(rel, `${onde}: tipo inválido ${d.tipo}`);
    if (!d.fonte) erro(rel, `${onde}: falta fonte (ato normativo que criou o feriado)`);
    if (d.url && !/^https?:\/\//.test(d.url)) erro(rel, `${onde}: url inválida`);
    const k = `${d.data}|${d.tipo}`;
    if (vistos.has(k)) erro(rel, `${onde}: data repetida com o mesmo tipo`);
    vistos.add(k);
    for (const m of d.naoSeAplica || []) if (!MATERIAS.has(m)) erro(rel, `${onde}: matéria inválida ${m}`);
  }
}

// ── feriados ────────────────────────────────────────────────────────────────
const arquivos = listar(path.join(RAIZ, 'feriados'));
const textos = [];
const idxTexto = new Map();
const t = (s) => {
  if (s === undefined || s === null || s === '') return -1;
  if (!idxTexto.has(s)) {
    idxTexto.set(s, textos.length);
    textos.push(s);
  }
  return idxTexto.get(s);
};
const compactos = [];
const ids = new Set();
for (const abs of arquivos) {
  const rel = path.relative(RAIZ, abs).replace(/\\/g, '/');
  let j;
  try {
    j = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    erro(rel, `JSON inválido: ${e.message}`);
    continue;
  }
  validarArquivo(rel, j);
  if (ids.has(j.id)) erro(rel, `id repetido: ${j.id}`);
  ids.add(j.id);
  const c = { id: j.id, escopo: j.escopo };
  for (const k of ['nome', 'tribunal', 'comarca', 'uf', 'aplicaA', 'anosConferidos', 'comarcas']) if (j[k] !== undefined) c[k] = j[k];
  c.regras = (j.regras || []).map((r) => {
    const o = { nome: r.nome, tipo: r.tipo, quando: r.quando, fonte: t(r.fonte), url: t(r.url) };
    if (r.desde) o.desde = r.desde;
    if (r.ate) o.ate = r.ate;
    if (r.naoSeAplica) o.naoSeAplica = r.naoSeAplica;
    return o;
  });
  // [data, nome, tipo, fonte, url, naoSeAplica?]
  c.datas = (j.datas || []).map((d) => {
    const tup = [d.data, t(d.nome), d.tipo, t(d.fonte), t(d.url)];
    if (d.naoSeAplica) tup.push(d.naoSeAplica);
    return tup;
  });
  compactos.push(c);
}

// ── catálogo ────────────────────────────────────────────────────────────────
const cat = JSON.parse(fs.readFileSync(path.join(RAIZ, 'catalogo', 'prazos.json'), 'utf8'));
const idsPrazo = new Set();
const catIds = new Set(cat.categorias.map((c) => c.id));
for (const p of cat.prazos) {
  const onde = `catalogo/prazos.json (${p.id})`;
  if (idsPrazo.has(p.id)) erro(onde, 'id repetido');
  idsPrazo.add(p.id);
  if (!catIds.has(p.categoria)) erro(onde, `categoria desconhecida ${p.categoria}`);
  if (!Number.isInteger(p.dias) || p.dias < 0) erro(onde, 'dias inválido');
  if (!['uteis', 'corridos'].includes(p.contagem)) erro(onde, 'contagem inválida');
  if (!['da_intimacao', 'antes_do_ato', 'na_data'].includes(p.conta)) erro(onde, 'conta inválida');
  if (!['parte', 'juizo'].includes(p.quem)) erro(onde, 'quem inválido');
  if (!['civel', 'trabalho', 'juizado'].includes(p.ramo)) erro(onde, 'ramo inválido');
  if (!p.baseLegal) erro(onde, 'falta baseLegal');
}
for (const c of cat.categorias) {
  const n = cat.prazos.filter((p) => p.categoria === c.id).length;
  if (n !== c.total) erro('catalogo/prazos.json', `categoria ${c.id}: total ${c.total} mas há ${n} prazos`);
}

if (erros.length) {
  console.error(`✗ ${erros.length} erro(s) nos dados:\n  ` + erros.join('\n  '));
  process.exit(1);
}

const cabecalho = '// GERADO por scripts/gerar-dados.mjs — não edite à mão; edite os JSON e rode `npm run dados`.\n/* eslint-disable */\n';
const feriadosTs =
  cabecalho +
  "import type { ArquivoCompacto } from '../tipos.js';\n\n" +
  `export const TEXTOS: string[] = ${JSON.stringify(textos)};\n\n` +
  `export const ARQUIVOS: ArquivoCompacto[] = ${JSON.stringify(compactos)};\n`;
const catalogoTs =
  cabecalho +
  "import type { CatalogoPrazos } from '../tipos.js';\n\n" +
  `export const CATALOGO: CatalogoPrazos = ${JSON.stringify({ versao: cat.versao, categorias: cat.categorias, prazos: cat.prazos })};\n`;

const saidas = [
  [path.join(RAIZ, 'src', 'dados', 'feriados.gerado.ts'), feriadosTs],
  [path.join(RAIZ, 'src', 'dados', 'catalogo.gerado.ts'), catalogoTs],
];
let desatualizado = false;
for (const [arq, txt] of saidas) {
  const atual = fs.existsSync(arq) ? fs.readFileSync(arq, 'utf8') : '';
  if (atual === txt) continue;
  if (VERIFICAR) {
    console.error(`✗ ${path.relative(RAIZ, arq)} desatualizado: rode \`npm run dados\` e faça commit.`);
    desatualizado = true;
  } else fs.writeFileSync(arq, txt);
}
if (desatualizado) process.exit(1);
const nDatas = compactos.reduce((s, c) => s + c.datas.length, 0);
const nRegras = compactos.reduce((s, c) => s + c.regras.length, 0);
console.log(`✓ ${compactos.length} calendários (${nRegras} regras, ${nDatas} datas) e ${cat.prazos.length} prazos no catálogo${VERIFICAR ? ' — em dia' : ''}.`);
