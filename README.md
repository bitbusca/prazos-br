# prazos-br

[![CI](https://github.com/bitbusca/prazos-br/actions/workflows/ci.yml/badge.svg)](https://github.com/bitbusca/prazos-br/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/prazos-br.svg)](https://www.npmjs.com/package/prazos-br)
[![licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-green.svg)](LICENSE)

**Cálculo de prazos processuais brasileiros com o passo a passo de cada dia e a fonte de cada feriado.**
CPC (dias úteis), CLT, dias corridos, prazo em dobro, recesso de 20/12 a 20/01, feriados nacionais fixos e móveis,
DJEN e intimação eletrônica com ciência ficta. TypeScript, ESM + CommonJS, sem dependências, roda no Node e no navegador.

![Demonstração do prazos-br: 15 dias úteis a partir de 13/11/2026 no TJMS, Campo Grande, vencendo em 09/12/2026, com cada dia pulado e a fonte](https://raw.githubusercontent.com/bitbusca/prazos-br/main/docs/demo.gif)

<sub>`npx prazos-br 15 --de 2026-11-13 --tribunal TJMS --comarca "Campo Grande"`. Gravado com a versão 0.1.0; a
saída é a real da ferramenta.</sub>

> **Atenção:** confira sempre no processo; **não substitui conferência profissional.** Portarias de tribunal mudam
> durante o ano (pontos facultativos, suspensões por falha de sistema). A biblioteca avisa quando o calendário do
> tribunal ou da comarca não está cadastrado para o ano do prazo.

## Instalação

```bash
npm install prazos-br
# ou, sem instalar:
npx prazos-br 15 --de 2026-11-05 --tribunal TJMS
```

## Uso rápido

```ts
import { calcularPrazo } from 'prazos-br';

const r = calcularPrazo({ inicio: '2026-11-05', dias: 15, tipo: 'uteis', tribunal: 'TJMS', comarca: 'Campo Grande' });

r.vencimento;      // '2026-11-27'
r.vencimentoBR;    // '27/11/2026'
r.inicioContagem;  // '2026-11-06'
r.resumo;          // 'Prazo de 15 dias úteis publicado em 05/11/2026 no TJMS/Campo Grande: começa em 06/11/2026 e vence em 27/11/2026 (sexta-feira).'
r.passos;          // cada dia: contado, pulado (com motivo e fonte), prorrogado, vencimento
r.avisos;          // o que não foi possível conferir (ex.: portaria do ano ainda não cadastrada)
r.baseLegal;       // ['CPC, art. 219', 'CPC, art. 224', ...]
```

Um passo pulado:

```json
{ "data": "2026-11-20", "diaSemana": "sexta-feira", "acao": "pula",
  "motivo": "Dia Nacional de Zumbi e da Consciência Negra", "fonte": "Portaria TJMS 983/2025",
  "texto": "Não conta: Dia Nacional de Zumbi e da Consciência Negra" }
```

CommonJS também funciona: `const { calcularPrazo } = require('prazos-br')`.

### Opções

| opção | padrão | o que faz |
|---|---|---|
| `inicio` | — | data do evento, `AAAA-MM-DD` ou `DD/MM/AAAA` (veja `evento`) |
| `dias` | — | dias do prazo, antes de dobrar |
| `tipo` | `uteis` | `uteis` (CPC art. 219), `clt` (CLT art. 775) ou `corridos` (CPP art. 798, prazos materiais) |
| `evento` | `publicacao` | `publicacao`: a data é a publicação/intimação · `djen`: a data é a **disponibilização** no DJEN · `intimacao_eletronica`: a data é o **envio** pelo sistema |
| `consulta` | — | intimação eletrônica aberta antes dos 10 dias |
| `tribunal` | — | `TJSP`, `TRT2`, `TRF1`… (lista em `TRIBUNAIS` ou `npx prazos-br tribunais`; sem tribunal: só feriados nacionais) |
| `comarca` | — | comarca/cidade da vara, para feriados municipais |
| `dobro` | — | `fazenda` (CPC 183), `defensoria` (CPC 186), `mp` (CPC 180), `litisconsortes` (CPC 229) |
| `autosEletronicos` | `true` | litisconsortes só dobram em autos físicos (CPC art. 229, § 2º) |
| `juizado` | `false` | no Juizado a Fazenda não tem prazo diferenciado |
| `materia` | pelo tribunal | `civel`, `trabalho`, `penal`, `penal_urgente` (réu preso: sem suspensão de fim de ano), `eleitoral` |
| `feriadosExtras` | — | dias a mais (suspensão por indisponibilidade, ato novo): `{ data, nome, tipo, fonte }` |

### Outras funções

```ts
import { ehDiaUtil, diasSemExpediente, somarDiasUteis, datasMoveis, calendariosDisponiveis, registrarCalendario, TRIBUNAIS } from 'prazos-br';

ehDiaUtil('2026-11-20', { tribunal: 'TJMS' });           // { util: false, conta: false, motivo: 'Dia Nacional de Zumbi…', fonte: '…' }
diasSemExpediente(2026, { tribunal: 'TJMS', comarca: 'Campo Grande' }); // lista com nome, tipo, fonte e origem
somarDiasUteis('2026-11-27', -2, { tribunal: 'TJMS' });  // '2026-11-25' — prazo interno do escritório
datasMoveis(2027);                                       // Carnaval, Cinzas, Semana Santa, Páscoa, Corpus Christi
TRIBUNAIS;                                               // ['TJBA', 'TJDFT', …, 'TRT2', 'TRT3', 'TRT4', 'TRT15', 'TRT24']
calendariosDisponiveis();                                // anos conferidos e comarcas de cada tribunal

import { buscarPrazos } from 'prazos-br/catalogo';
buscarPrazos('apelação cível')[0];  // { ato: 'Apelação Cível', dias: 15, contagem: 'uteis', baseLegal: 'art. 1.009 c/c art. 1.003, § 5º, CPC', ... }
```

## Linha de comando

```text
$ npx prazos-br 5 --de 2026-03-04 --evento intimacao-eletronica --tribunal TJMS --comarca Coxim

prazos-br · 5 dias úteis · TJMS · Coxim

  04/03/2026 qua    ●   Envio da intimação eletrônica em 04/03/2026
  14/03/2026 sáb    ·   O 10º dia caiu em dia não útil (sábado): a ciência passa para o 1º dia útil seguinte (Lei 11.419/2006, art. 5º, § 2º)
  16/03/2026 seg    ●   Ciência ficta: 10 dias corridos após o envio, sem consulta (Lei 11.419/2006, art. 5º, § 3º); prorrogada para o 1º dia útil (art. 5º, § 2º)
  17/03/2026 ter    1  início da contagem
  18/03/2026 qua    2
  19/03/2026 qui    ·   Não conta: São José [Portaria TJMS 983/2025 (lei municipal de Coxim)]
  20/03/2026 sex    3
  21/03–22/03/2026  ·   Não conta: fim de semana
  23/03/2026 seg    4
  24/03/2026 ter    5
  24/03/2026 ter    ✔   Vencimento: 24/03/2026 (terça-feira)

Vence em 24/03/2026
Base legal: Lei 11.419/2006, art. 5º; CPC, art. 231, V; CPC, art. 219; CPC, art. 224; CPC, art. 224, § 1º
Confira sempre no processo; o prazos-br não substitui a conferência profissional.
```

Outros comandos:

```bash
npx prazos-br 15 --de 2026-11-04 --djen --tribunal TJMS          # data = disponibilização no DJEN
npx prazos-br 5 --de 2026-11-05 --tribunal TJMS --dobro fazenda  # 10 dias úteis
npx prazos-br 8 --de 2026-06-01 --tribunal TRT2 --comarca "São Paulo"  # CLT (padrão nos TRTs)
npx prazos-br 5 --de 2026-07-06 --tribunal TJSP --comarca "São Paulo"  # pula a Data Magna (09/07) e 10/07
npx prazos-br 15 --de 2026-11-05 --tribunal TJMS --json          # resultado completo em JSON
npx prazos-br catalogo embargos de declaração                    # prazo legal do ato
npx prazos-br feriados 2026 --tribunal TJMS --comarca "Campo Grande"
npx prazos-br tribunais                                          # tribunais com calendário e anos conferidos
```

## Demo no navegador

`demo/index.html` é uma página estática, sem build, que importa a biblioteca e mostra o vencimento, um calendário
com os dias contados e pulados e o passo a passo.

```bash
npm install && npm run build && npm run demo   # abre em http://127.0.0.1:5173/demo/
```

## Regras implementadas

| regra | base legal |
|---|---|
| exclui o dia do começo, inclui o do vencimento | CPC art. 224; CLT art. 775; CPP art. 798, § 1º |
| começo e vencimento só em dia de expediente normal (prorrogam) | CPC art. 224, § 1º; CPP art. 798, § 3º; Súmula 310 do STF |
| expediente reduzido conta no meio do prazo, mas não começa nem vence | CPC art. 224, § 1º |
| dias úteis | CPC art. 219; CLT art. 775; Lei 9.099/1995 art. 12-A |
| suspensão de 20/12 a 20/01 (exceto réu preso e feitos eleitorais) | CPC art. 220; CLT art. 775-A; CPP art. 798-A |
| recesso forense 20/12 a 06/01 na Justiça da União; feriado forense no TJMS | Lei 5.010/1966 art. 62, I; CODJ-MS art. 268 |
| Semana Santa, Carnaval, 11/08, 01/11, 02/11, 08/12 na Justiça da União | Lei 5.010/1966 art. 62 |
| DJEN: publicação no 1º dia útil após a disponibilização; prazo no dia útil seguinte | Lei 11.419/2006 art. 4º, §§ 3º e 4º; Res. CNJ 455/2022 art. 11, § 3º |
| intimação eletrônica: ciência na consulta ou em 10 dias corridos (ficta); dia não útil vai ao próximo útil | Lei 11.419/2006 art. 5º; CPC art. 231, V |
| prazo em dobro: Fazenda, Defensoria, MP, litisconsortes (só autos físicos) | CPC arts. 180, 183, 186 e 229 |
| sem dobra da Fazenda no Juizado | Lei 10.259/2001 art. 9º; Lei 12.153/2009 art. 7º |
| período eleitoral: prazos contínuos | LC 64/1990 art. 16; Res. TSE 23.608/2019 art. 7º |

## Feriados: o que vem no pacote

**22 tribunais com calendário próprio**, cada dia com o ato oficial e o link. Situação detalhada, atos usados e
pendências em [docs/COBERTURA.md](docs/COBERTURA.md).

| calendário | anos conferidos | capital/sede com feriados municipais |
|---|---|---|
| nacional (todos os tribunais) | regras permanentes (Leis 662/1949, 6.802/1980, 9.093/1995, 14.759/2023) + suspensão do CPC 220 | — |
| Justiça da União (TRF, TRT, TRE, superiores) | regras da Lei 5.010/1966, art. 62 | — |
| **TJSP** | 2025, 2026 | São Paulo |
| **TJRJ** | 2025, 2026 | Rio de Janeiro |
| **TJMG** | 2025, 2026 | Belo Horizonte |
| **TJRS** | 2026 | Porto Alegre |
| **TJPR** | 2025 (2026 sem o ato do recesso de dezembro) | Curitiba |
| **TJSC** | 2025 (2026 sem o ato do recesso de dezembro) | Florianópolis |
| **TJBA** | 2026 | Salvador |
| **TJGO** | 2025, 2026 | Goiânia |
| **TJPE** | 2026 | Recife |
| **TJDFT** | 2025, 2026 | Brasília (o DF não tem município) |
| **TJMS** | 2021 a 2026 | **56 comarcas** |
| **TRF1** | 2026 | Brasília (Seção do DF) |
| **TRF2** | 2026 | Rio de Janeiro |
| **TRF4** | 2026 | Porto Alegre; Curitiba e Florianópolis em parte |
| **TRF5** | 2026 | Recife |
| **TRF6** | 2025, 2026 | Belo Horizonte |
| **TRT1** | 2025, 2026 | Rio de Janeiro |
| **TRT2** | 2025, 2026 | São Paulo |
| **TRT3** | 2025, 2026 | Belo Horizonte |
| **TRT4** | 2026 | Porto Alegre |
| **TRT15** | 2026 | Campinas |
| **TRT24** | 2026 | **22 cidades** |

**O que ainda não está coberto:**

- o **TRF3**, porque os sites do tribunal estavam fora do ar quando os dados foram levantados;
- os demais TJs, TRTs e TREs;
- as **comarcas e subseções do interior** dos tribunais acima. Quando a comarca está na lista do tribunal mas não
  tem arquivo, a biblioteca aplica o calendário geral e **avisa**.

Esses pontos são o [mutirão da comunidade](docs/MUTIRAO.md): mande a portaria da sua comarca pelo
[formulário de issue](https://github.com/bitbusca/prazos-br/issues/new?template=feriado.yml) ou num pull request.

Carnaval e Corpus Christi **não** são feriados nacionais por lei: entram pelo calendário do tribunal. Tribunal sem
calendário próprio recebe só os nacionais (e a Lei 5.010, se for da União) **e um aviso**. Nesse caso o vencimento
real pode ser posterior ao calculado, nunca anterior.

Quando o tribunal muda de data um feriado da Lei 5.010/1966 (por exemplo, o TRT3 passou o 11/08 para 14/08), a data
original fica cadastrada como `expediente_normal`, com a fonte, e conta como dia útil só naquele tribunal.

### Formato aberto (contribua com a sua comarca)

Um JSON por tribunal e por comarca em [`feriados/`](feriados), com a **fonte de cada dia** e o
[schema](schema/feriados.schema.json) para o editor validar:

```json
{
  "id": "TJMS/campo-grande", "escopo": "comarca", "tribunal": "TJMS", "comarca": "Campo Grande",
  "anosConferidos": [2021, 2022, 2023, 2024, 2025, 2026],
  "regras": [
    { "nome": "Aniversário de Campo Grande", "tipo": "feriado", "quando": { "dia": "08-26" },
      "fonte": "Lei municipal de Campo Grande 1.019/1967", "url": "https://www.trt24.jus.br/web/guest/calendario" }
  ],
  "datas": [
    { "data": "2025-08-25", "nome": "Ponto facultativo", "tipo": "ponto_facultativo",
      "fonte": "Portaria TJMS 1.265/2024", "url": "https://www.tjms.jus.br/institucional/feriados" }
  ]
}
```

Passo a passo em [CONTRIBUTING.md](CONTRIBUTING.md). Para testar um arquivo antes do pull request:
`registrarCalendario(json)`.

## Catálogo de prazos

[`catalogo/prazos.json`](catalogo/prazos.json): 296 atos em 56 categorias (ato → dias → contagem → base legal),
só com informação pública. Marca o que é prazo do juízo (`quem: "juizo"`), antecedência antes de audiência
(`conta: "antes_do_ato"`), ramo (cível, trabalho, juizado) e prazos que a lei fixa em meses ou anos
(`unidadeNaLei`), que devem ser contados pelo calendário (CC art. 132, § 3º), não em dias.

## Limitações conhecidas

- Há calendário próprio para 22 tribunais, quase sempre só da capital ou sede. Interior, TRF3 e os demais
  tribunais recebem aviso; veja [docs/COBERTURA.md](docs/COBERTURA.md) e ajude no [mutirão](docs/MUTIRAO.md).
- Suspensões que valem só para um sistema, uma parte (INSS, AGU) ou uma vara ficam de fora de propósito; use `feriadosExtras`.
- Suspensões avulsas publicadas depois de 05/11/2026 só entram se estiverem no JSON ou em `feriadosExtras`.
- Prazos em meses/anos não são calculados como meses (use a data de igual número do mês/ano).
- O período eleitoral está cadastrado para 2026, 2028 e 2030; confira a data final no calendário do TSE.
- A lei e os tribunais mudam: confira sempre no processo.

## Grátis aqui, automático na BitBusca

O cálculo é **grátis e completo** nesta biblioteca, para sempre (MIT). Se você quer que isso aconteça sozinho:

- **[Busca Jurídica da BitBusca](https://bitbusca.net/busca-juridica?utm_source=github&utm_medium=prazos-br)** —
  monitor automático do DJEN pela sua OAB: cada intimação chega com o **prazo já contado** (com feriados da comarca)
  e vira **tarefa na agenda** do escritório.
- **[Intimações grátis](https://bitbusca.net/intimacoes-gratis?utm_source=github&utm_medium=prazos-br)** — receba
  por e-mail, sem custo, as intimações da semana da sua OAB.

<details>
<summary>Como o <code>docs/demo.gif</code> foi gravado e roteiro de uma versão mais longa (demo no navegador)</summary>

O `docs/demo.gif` do topo mostra só o terminal: a saída do comando foi capturada em arquivo, com as cores ANSI, e os
quadros foram desenhados a partir dela (nada editado à mão), montados com `ffmpeg` (`palettegen`/`paletteuse`),
1200×600, 10 fps. Regravar a cada versão que mude a saída.

Roteiro para uma versão mais longa, com a demo no navegador:

1. **0–3 s** — página da demo aberta com o exemplo padrão (15 dias úteis, TJMS, Campo Grande, 05/11/2026): o
   vencimento **27/11/2026** em destaque e o calendário com o dia 20/11 hachurado.
2. **3–6 s** — passar o mouse sobre 20/11: aparece "Não conta: Dia Nacional de Zumbi e da Consciência Negra — Portaria TJMS 983/2025".
3. **6–10 s** — trocar a data para 17/12/2025 e o evento para "disponibilização no DJEN": o calendário vira três
   meses, com o recesso e a suspensão até 20/01 hachurados; vencimento **02/02/2026**.
4. **10–14 s** — escolher "o envio da intimação eletrônica" com data 04/03/2026 e comarca Coxim: aparece a ciência
   ficta em 16/03 (o 10º dia caiu no sábado) e o feriado de São José em 19/03; vencimento **24/03/2026**.
5. **14–17 s** — digitar "apelação" em Tipo de ato: os dias viram 15 automaticamente.
6. **17–20 s** — terminal: `npx prazos-br 15 --de 2026-11-05 --tribunal TJMS` mostrando o passo a passo colorido.

Gravar em 1280×720, 12 fps, sem som, até 2 MB (ex.: ScreenToGif ou `ffmpeg -vf "fps=12,scale=1000:-1"`).
</details>

## Desenvolvimento

```bash
npm install
npm run build        # valida os JSON, embute em src/dados/*.gerado.ts e compila ESM + CJS
npm test             # node:test, casos reais conferidos à mão
npm run dados        # só valida e regenera os dados
```

## Licença

[MIT](LICENSE) © BITSIS LTDA (BitBusca). Feriados e catálogo são informação pública; as fontes estão em cada registro.
