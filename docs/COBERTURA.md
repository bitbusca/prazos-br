# Cobertura dos calendários

Situação em **05/11/2026** (versão 0.2.0). Cada dia cadastrado tem a fonte (ato do tribunal ou lei) e, quase sempre,
o link. O que não foi achado com fonte **não entrou** e está listado aqui como pendência.

**"Ano conferido"** quer dizer que todos os dias gerais do tribunal naquele ano foram transcritos dos atos oficiais,
inclusive 01–06/01 e 20–31/12. Fora desses anos a biblioteca avisa. Se o ano tem datas mas falta algum ato, o
aviso diz que o calendário está **"cadastrado só em parte"**.

**Capital ou sede** quer dizer feriados municipais (lei municipal) e suspensões que só valem ali. Comarcas e
subseções do interior ficam para a comunidade: veja o [mutirão](MUTIRAO.md).

## Justiça estadual

| tribunal | anos conferidos | atos principais | capital/sede |
|---|---|---|---|
| TJMS | 2021–2026 | Portarias TJMS 3/2021 … 983/2025; CODJ-MS | 56 comarcas |
| TJSP | 2025, 2026 | Provs. CSM 2.765/2024, 2.804/2025, 2.813/2025, 2.845/2026; Comunicado 184/2026 | São Paulo (Lei 14.485/2007) |
| TJRJ | 2025, 2026 | Calendário oficial do Portal do Conhecimento (Atos Executivos e Avisos); LODJ-RJ, art. 83 | Rio de Janeiro ("Comarca da Capital") |
| TJMG | 2025, 2026 | Portarias Conjuntas 1.629, 1.658, 1.757/PR/2025, 1.764, 1.798, 1.819/PR/2026; LC 59/2001 | Belo Horizonte (Lei 11.397/2022) |
| TJRS | 2026 | Ato 05/2025-OE; Ato 13/2024-OE; OS 003/2026-P; Atos Conjuntos 004 a 007/2026 | Porto Alegre (Lei 3.033/1967) |
| TJPR | 2025 (2026 em parte) | Decretos Judiciários 645/2024 e 621/2025; Res. 470/2024-OE e 515/2025-OE; DJ 268 e 308/2026 | Curitiba (Lei 3.015/1967) |
| TJSC | 2025 (2026 em parte) | Res. GP 2/2025 e 1/2026; Res. TJ 41/2024 e 30/2025; Res. GP 31 e 58/2026 | Florianópolis (Lei 832/1967) |
| TJBA | 2026 | Decretos Judiciários 1.050/2025, 09/2026, 944/2026, 974/2026, 1.414/2026; Res. TJBA 22/2016 | Salvador (Lei 1.997/1967) |
| TJGO | 2025, 2026 | Calendários oficiais 2025 e 2026; Decretos Judiciários 2025/2026; COJEG, art. 91 | Goiânia (Lei 701/1956) |
| TJPE | 2026 | Ato Conjunto 43/2025; Atos 966 e 977/2026; COJE, art. 94 | Recife |
| TJDFT | 2025, 2026 | Portarias Conjuntas 1/2025, 105/2025, 48 e 53/2026; Lei 11.697/2008, art. 60 | Brasília (o DF não tem município: vale o calendário do tribunal) |

## Justiça Federal

A Lei 5.010/1966 (recesso, Semana Santa, Carnaval, 11/08, 01/11, 02/11, 08/12) vale para todos os TRFs pelo arquivo
`ramos/justica-federal.json`.

| tribunal | anos conferidos | atos principais | capital/sede |
|---|---|---|---|
| TRF1 | 2026 | Portarias Presi 5/2026, 368/2026, 380/2026 | Brasília (Seção do DF) |
| TRF2 | 2026 | Portarias PRES 843, 844, 845/2025; 30, 31, 32, 17 e 338/2026 | Rio de Janeiro |
| TRF3 | — | **pendente** | — |
| TRF4 | 2026 | Calendário oficial (Portaria 1.064/2022); Portarias 39, 233, 449, 531, 825, 829, 840 e 917/2026 | Porto Alegre (conferido); Curitiba e Florianópolis (parciais) |
| TRF5 | 2026 | Ato 626/2025 (reeditado pelo 219/2026, retificado pelo 230/2026); Ato 321/2026 | Recife |
| TRF6 | 2025, 2026 | Portarias Presi 311/2024, 73/2025, 1/2026; Portarias Conjuntas 3, 9, 10/2026; Decisão 309/2026 | Belo Horizonte |

## Justiça do Trabalho

A Lei 5.010/1966 e a CLT, art. 775-A, valem para todos os TRTs pelos arquivos de `ramos/`.

| tribunal | anos conferidos | atos principais | capital/sede |
|---|---|---|---|
| TRT1 | 2025, 2026 | Atos 124 e 125/2024, 109 e 110/2025 e atos posteriores | Rio de Janeiro |
| TRT2 | 2025, 2026 | Portarias GP 45/2024 e 50/2025; GP.CR 15/2024, 15/2025; GP/CR 14 e 15/2026 | São Paulo |
| TRT3 | 2025, 2026 | RA 142/2024, 60/2025, 109/2025; Portarias GP 119, 135 e 195/2026 | Belo Horizonte |
| TRT4 | 2026 | Portaria 08/2025 da Corregedoria (compilada); RA 06 e 10/2026; Ato GP 02/2026; Portarias 2.019 e 2.075/2026 | Porto Alegre |
| TRT15 | 2026 | Portaria GP-CR 016/2025 (anexo); GP-CR 015/2025, 005/2026, 007/2026 | Campinas |
| TRT24 | 2026 | Portaria TRT/GP/SGJ 51/2025 e alterações | 22 cidades |

### Feriado transferido (`expediente_normal`)

Alguns tribunais mudam de data um feriado da Lei 5.010/1966. O dia original fica cadastrado como
`expediente_normal`, com a fonte, e assim anula a regra geral só naquele tribunal:

- **TRT2:** 11/08/2026 (antecipado para 10/08) e 08/12/2026 (antecipado para 07/12).
- **TRT3:** 11/08/2025 e 11/08/2026 (transferidos para 14/08).
- **TRT15:** 11/08/2026 (transferido para 10/08).

## Pendências

### Tribunal sem calendário

- **TRF3 (SP e MS).** Os sites trf3.jus.br, web.trf3.jus.br, jfsp.jus.br e jfms.jus.br não responderam em 05/11/2026.
  Os atos a transcrever são estes:
  - Portaria CATRF3R 48/2025 (2º grau);
  - Portaria CJF3R 764/2025 (1º grau, Seções de SP e MS);
  - Portarias CATRF3R 53, 56, 57 e 58/2026;
  - calendário oficial atualizado em 25/06/2026 (`trf3.jus.br/documentos/seju/Feriados/`).
- **Fora do escopo desta versão:** os demais TJs, TRTs e TRFs, os TREs, os tribunais superiores e a Justiça Militar.
  Hoje recebem só os feriados nacionais (e a Lei 5.010/1966, se forem da União) e um aviso.

### Ano incompleto

- **TJPR e TJSC 2026.** Até 05/11/2026 não saiu o ato do recesso de 20/12/2026 a 06/01/2027. Os prazos cíveis
  já ficam suspensos de 20/12 a 20/01 pelo CPC, art. 220 (arquivo nacional). O que falta é o fechamento do
  expediente, que importa para réu preso e para feitos eleitorais. Lembre que em 2025 o TJSC só fechou a partir de 22/12.
- **2025 sem conferência:**
  - TJRS: as suspensões extraordinárias de 2025 não foram levantadas.
  - TJPE: atos avulsos de 2025 (chuva em 05/02/2025, portarias de maio) não foram cadastrados, mas as datas
    do Ato Conjunto 42/2024 estão no arquivo.
  - TJBA: a tabela do decreto de 2025 sai embaralhada no PDF.
  - TRF1, TRF2, TRF4, TRF5, TRT4, TRT15: 2025 ainda não foi feito.
- **TRF4: Curitiba e Florianópolis** têm datas e leis municipais, mas os avisos das Seções do PR e de SC não foram
  todos varridos. Por isso nenhum ano está marcado como conferido nelas.

### Capital: o que falta

- **TRF2, Espírito Santo:** a Portaria 845/2025 traz o 13/04 (N. Sra. da Penha), mas faltam os feriados
  municipais de Vitória.
- **TRF2 e TRF5:** as outras seções judiciárias (AL, CE, PB, RN, SE) e as subseções.
- **TRF1:** as 12 seções fora do DF. As capitais estão na lista de comarcas, mas sem arquivo, e a biblioteca avisa.

### Cadastrado com ressalva

Cada caso abaixo tem a ressalva na fonte do próprio dia.

- **TJMG, 24/06 e 29/06/2026 (Copa).** A Portaria Conjunta 1.819/PR/2026 fixa o horário do expediente pelo
  horário do jogo do Brasil. As datas vêm dessa regra somada às datas oficiais dos jogos. Não achei o aviso do
  DJe de cada dia. O mesmo vale para o TJSC em 29/06/2026 (Res. GP 31/2026).
- **TRF6, 24/06/2026.** A portaria diz só que os prazos seguem a lei. O dia foi gravado como expediente reduzido
  (CPC, art. 224, § 1º).
- **TRF1, 01 a 06/01/2026.** Esses dias vêm da Lei 5.010/1966, art. 62, I. A portaria do TRF1 de 2025 não foi lida.
- **TJGO, decretos de 2026.** A fonte são as notícias oficiais do TJGO, porque o site barra o download automático
  dos PDFs. O ato de 29/06 aparece como 3.079/2026 na notícia e como 3.060 em outra página.
- **TRF4 e TRT4, atos lidos só pelo aviso oficial.** As Portarias 39/2026 e 449/2026 (TRF4) e 2.075/2026 (TRT4)
  vêm do aviso oficial no portal, sem o PDF.
- **Leis municipais citadas pelo ato do tribunal.** O texto oficial não foi aberto, porque o site da prefeitura ou
  da câmara estava fora ou monta a página por JavaScript. Casos: Goiânia (Lei 701/1956), Belo Horizonte
  (Lei 11.397/2022), Recife (Lei 9.777/1967), Salvador (Lei 1.997/1967). No Rio, a Lei 5.146/2010 está com link
  do leismunicipais.com.br, porque não achei a página oficial da Câmara.

### Não cadastrado de propósito

Se entrassem para todo mundo, esses dias adiariam prazos que não deveriam ser adiados.

- **Suspensões que valem só para um sistema:**
  - TJBA: PJe em 19/06 e 04/09, BRBJUS em 17 a 23/09, Projudi em 16, 19 e 20/10/2026;
  - TJRJ: prorrogações por indisponibilidade do DCP/eJUD ou do eproc;
  - TJPR: queda do Projudi em 01/09/2026.
- **Suspensões que valem só para uma parte ou uma classe:**
  - INSS: CJF 50 e 57/2026, TJRJ Aviso 28/2026;
  - AGU: TJRJ Aviso 89/2026, TRT1 Ato 49/2026, TJGO;
  - DPU: TRF2;
  - advogados de uma cidade: TJRJ Ato 66/2026.
- **Suspensões de um único fórum, vara ou prédio:**
  - TJRS: Foro Central I em 08/04/2026;
  - TJRJ: fóruns regionais;
  - TJSP: comunicados locais;
  - TRF4: 17/06/2026, só no 2º grau;
  - inspeções por vara.
- **Trabalho remoto sem suspensão geral de prazos:**
  - TRT1: 13/02 e 03/07/2026;
  - TRF5: 13/02, 29/06 e 31/12/2026.
- **Expediente encurtado em que o ato não fala de prazos:**
  - TJSP: 24/06/2026, expediente das 9h às 16h pelo Prov. CSM 2.832/2026;
  - TRT1: 24/06/2026, saída às 16h pelo Ato 71/2026;
  - TRT3: 24/06/2026, expediente até as 18h.

  **Confira o processo antes de contar um prazo que começa ou vence nesses dias.**

Use `feriadosExtras` para aplicar qualquer um desses dias ao seu caso.
