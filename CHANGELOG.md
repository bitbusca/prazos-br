# Changelog

## 0.2.0 — 2026-11-05

- **Cobertura nacional:** calendário próprio, com o ato oficial e o link em cada dia, para mais 20 tribunais e a
  capital ou sede de cada um:
  - TJSP, TJRJ, TJMG, TJRS, TJPR, TJSC, TJBA, TJGO, TJPE, TJDFT;
  - TRF1, TRF2, TRF4, TRF5, TRF6;
  - TRT1, TRT2, TRT3, TRT4, TRT15.

  Com TJMS e TRT24, são 22 tribunais. 2026 está conferido em quase todos e 2025 em 11. Situação detalhada e
  pendências em `docs/COBERTURA.md`. O TRF3 ficou pendente porque os sites do tribunal estavam fora do ar.
- **Novo tipo de dia `expediente_normal`** (só em `datas`): marca o feriado transferido pelo tribunal e anula, naquele
  dia, a regra mais geral. Exemplos: o TRT3 passou o 11/08 da Lei 5.010/1966 para 14/08; o TRT2 passou o 08/12
  para 07/12.
- **Constante `TRIBUNAIS` e comando `prazos-br tribunais`** (aceita `--json`): mostram os tribunais com calendário,
  os anos conferidos e as comarcas cadastradas.
- **Avisos mais precisos:**
  - comarca que está na lista do tribunal, mas sem arquivo de feriados municipais, agora gera aviso;
  - ano com datas cadastradas, mas sem todos os atos, gera "cadastrado só em parte" em vez de "não cadastrado".
- **Mutirão da comunidade:** `docs/MUTIRAO.md` e o formulário de issue `.github/ISSUE_TEMPLATE/feriado.yml`, para
  mandar a portaria da sua comarca.
- Testes: um caso conferido à mão por tribunal novo (`test/tribunais.test.mjs`), além de testes do
  `expediente_normal`, da cobertura e do comando `tribunais`.

## 0.1.0 — 2026-11-05

- Primeira versão: `calcularPrazo` com passo a passo (CPC, CLT, CPP, DJEN, intimação eletrônica com ciência ficta,
  prazo em dobro, recesso e suspensão de 20/12 a 20/01, expediente reduzido, período eleitoral).
- Feriados em JSON aberto com fonte: nacional, Lei 5.010/1966, CLT 775-A, TJMS (2021–2026, 56 comarcas), TRT24 (2026, 22 cidades).
- Catálogo público de 296 prazos (`prazos-br/catalogo`), CLI `prazos-br` e demo estática.
