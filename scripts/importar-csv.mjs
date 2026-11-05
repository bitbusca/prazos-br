#!/usr/bin/env node
/**
 * Importa um calendário em CSV para os arquivos JSON de feriados/tribunais/<TRIBUNAL>/.
 *
 *   node scripts/importar-csv.mjs <arquivo.csv> --tribunal TJMS --anos 2021-2026 \
 *        [--sede "Campo Grande"] [--uf MS] [--ibge ibge.json] \
 *        [--fonte-ano "2026=Portaria TJMS 983/2025;2025=Portaria TJMS 1.265/2024"]
 *
 * Colunas do CSV: tribunal,data,descricao,tipo,abrangencia,fonte_url
 *   tipo: feriado | recesso | ponto_facultativo | suspensao_prazos
 *   abrangencia: todo_tribunal | sede | comarca:<Nome da comarca>
 *
 * Mantém as "regras" e os metadados já escritos à mão; troca só as "datas" dos anos importados
 * e soma esses anos a "anosConferidos". Depois rode `npm run dados` para validar e embutir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REDUZIDO =
  /meio expediente|meio-expediente|expediente (a partir|somente a partir|até|ate|reduzido|apenas)|a partir das \d|até as \d+ ?h|ate as \d+ ?h|até às|expediente das \d/i;

function args() {
  const a = process.argv.slice(2);
  const o = { csv: a[0] };
  for (let i = 1; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1];
  if (!o.csv || !o.tribunal || !o.anos) {
    console.error('uso: importar-csv.mjs <csv> --tribunal SIGLA --anos 2021-2026 [--sede Nome] [--ibge arq.json] [--fonte-ano "2026=..."]');
    process.exit(2);
  }
  return o;
}

/** CSV RFC 4180 (aspas, vírgulas e quebras dentro de aspas). */
function parseCsv(txt) {
  const out = [];
  let campo = '';
  let linha = [];
  let aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (aspas) {
      if (ch === '"') {
        if (txt[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ',') {
      linha.push(campo);
      campo = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && txt[i + 1] === '\n') i++;
      linha.push(campo);
      campo = '';
      if (linha.length > 1 || linha[0] !== '') out.push(linha);
      linha = [];
    } else campo += ch;
  }
  if (campo !== '' || linha.length) {
    linha.push(campo);
    out.push(linha);
  }
  return out;
}

export const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Separa o nome do feriado e a fonte (ato normativo) da descrição do CSV. */
function limpar(desc, comarca, fonteAno) {
  const r = limpar0(desc, comarca, fonteAno);
  // 1536/2023 -> 1.536/2023 (mesma grafia em todo o arquivo)
  return { nome: r.nome, fonte: r.fonte.replace(/(\D)(\d)(\d{3})\/(\d{4})/g, '$1$2.$3/$4') };
}

function limpar0(desc, comarca, fonteAno) {
  let d = desc.replace(/\s+/g, ' ').trim();
  let m = /^(Portaria [^/]+?\d+\/\d{4}) \/ lei municipal - feriado municipal(?: em ([^(]+?))?(?: \((.+)\))?$/.exec(d);
  if (m) return { nome: m[3] || 'Feriado municipal', fonte: `${m[1]} (lei municipal${m[2] || comarca ? ` de ${m[2] || comarca}` : ''})` };
  m = /^(.*?)\s*\[(.+?)\]\s*\((Calendário oficial[^)]*)\)$/.exec(d);
  if (m) return { nome: m[1], fonte: `${m[2]}; ${m[3]}` };
  m = /^(.*?)\s*\[(.+?)\]$/.exec(d);
  if (m) return { nome: m[1], fonte: m[2] };
  m = /^(.*?)\s*\((Calendário oficial[^)]*)\)$/.exec(d);
  if (m) return { nome: m[1], fonte: m[2] };
  let fonte = null;
  m = /\s*\((Portaria [^()]*\d{4})\)\s*$/.exec(d);
  if (m) {
    fonte = m[1];
    d = d.slice(0, m.index);
  }
  d = d.replace(/\s*-?\s*\(Portaria n[ºo°][^)]*\)/g, '').replace(/\s*-\s*$/, '').trim();
  if (comarca) d = d.replace(new RegExp(`\\s+em ${comarca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
  // citação do código de organização judiciária: sai do nome e vai para a fonte
  let cita = null;
  const mc = /\s*\(([^()]*CODJ[^()]*)\)/.exec(d);
  if (mc) {
    const pedacos = mc[1].split(';').map((x) => x.trim());
    cita = pedacos.filter((x) => /CODJ/.test(x)).join('; ');
    if (!fonte) fonte = pedacos.find((x) => /^Portaria/.test(x)) || null;
    d = (d.slice(0, mc.index) + d.slice(mc.index + mc[0].length)).trim();
  }
  d = d.replace(/[.\s-]*n[ãa]o h[áa] expediente\s*$/i, '').trim();
  if (!fonte) fonte = fonteAno || null;
  if (cita) cita = 'CODJ-MS, ' + cita.replace(/,?\s*CODJ$/, '').replace(/§\s*/, '§ ').replace(/,\s*§/, ' §');
  if (cita && fonte) fonte = `${fonte}; ${cita}`;
  else if (cita) fonte = cita;
  return { nome: d.replace(/\.$/, ''), fonte: fonte || 'calendário oficial do tribunal' };
}

function main() {
  const o = args();
  const T = o.tribunal.toUpperCase();
  const [a0, a1] = o.anos.split('-').map(Number);
  const anos = new Set();
  for (let a = a0; a <= (a1 || a0); a++) anos.add(a);
  const fonteAno = Object.fromEntries(
    (o['fonte-ano'] || '')
      .split(';')
      .filter(Boolean)
      .map((p) => p.split('=').map((x) => x.trim())),
  );
  const ibge = o.ibge ? JSON.parse(fs.readFileSync(o.ibge, 'utf8')) : {};

  const [cab, ...linhas] = parseCsv(fs.readFileSync(o.csv, 'utf8').replace(/^﻿/, ''));
  const col = (k) => cab.findIndex((c) => c.trim() === k);
  const [it, id, ids, itp, iab, iurl] = ['tribunal', 'data', 'descricao', 'tipo', 'abrangencia', 'fonte_url'].map(col);

  const dirTrib = path.join(RAIZ, 'feriados', 'tribunais', T);
  fs.mkdirSync(path.join(dirTrib, 'comarcas'), { recursive: true });
  const destinos = new Map(); // caminho -> {comarca, datas: Map}

  for (const r of linhas) {
    if ((r[it] || '').trim().toUpperCase() !== T) continue;
    const data = (r[id] || '').trim();
    const ano = Number(data.slice(0, 4));
    if (!anos.has(ano)) continue;
    const ab = (r[iab] || 'todo_tribunal').trim();
    let comarca = null;
    if (ab === 'sede') comarca = o.sede || null;
    else if (ab.startsWith('comarca:')) comarca = ab.slice(8).trim();
    if (ab === 'sede' && !comarca) {
      console.warn(`linha "sede" ignorada (passe --sede): ${data} ${r[ids]}`);
      continue;
    }
    const arq = comarca ? path.join(dirTrib, 'comarcas', `${slug(comarca)}.json`) : path.join(dirTrib, 'tribunal.json');
    if (!destinos.has(arq)) destinos.set(arq, { comarca, datas: new Map() });
    const desc = (r[ids] || '').trim();
    let tipo = (r[itp] || 'feriado').trim();
    if (tipo === 'ponto_facultativo' && REDUZIDO.test(desc)) tipo = 'expediente_reduzido';
    const { nome, fonte } = limpar(desc, comarca, fonteAno[String(ano)]);
    const k = `${data}|${tipo}`;
    if (destinos.get(arq).datas.has(k)) continue;
    const item = { data, nome, tipo, fonte };
    if (r[iurl]) item.url = r[iurl].trim();
    destinos.get(arq).datas.set(k, item);
  }

  const anosArr = [...anos].sort();
  for (const [arq, { comarca, datas }] of destinos) {
    let base;
    if (fs.existsSync(arq)) base = JSON.parse(fs.readFileSync(arq, 'utf8'));
    else
      base = {
        $schema: '../../../../schema/feriados.schema.json',
        id: `${T}/${slug(comarca)}`,
        escopo: 'comarca',
        tribunal: T,
        comarca,
        ...(o.uf ? { uf: o.uf } : {}),
        ...(ibge[comarca] ? { ibge: ibge[comarca] } : {}),
        atualizadoEm: new Date().toISOString().slice(0, 10),
        regras: [],
        datas: [],
      };
    const fora = (base.datas || []).filter((d) => !anos.has(Number(d.data.slice(0, 4))));
    base.datas = [...fora, ...datas.values()].sort((a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo));
    base.anosConferidos = [...new Set([...(base.anosConferidos || []), ...anosArr])].sort();
    // ordem estável das chaves
    const { $schema, id, escopo, nome, tribunal, comarca: c, uf, ibge: ib, aplicaA, observacao, atualizadoEm, anosConferidos, comarcas, regras, datas: ds, ...resto } = base;
    const saida = { $schema, id, escopo, nome, tribunal, comarca: c, uf, ibge: ib, aplicaA, observacao, atualizadoEm, anosConferidos, comarcas, ...resto, regras: regras || [], datas: ds };
    fs.writeFileSync(arq, JSON.stringify(saida, null, 2) + '\n');
    console.log(`${path.relative(RAIZ, arq)}: ${datas.size} datas`);
  }
}

main();
