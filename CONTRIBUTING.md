# Como contribuir

Obrigado! A contribuição mais valiosa é **o calendário da sua comarca ou do seu tribunal, com a fonte**.
O que já está coberto e o que falta: [docs/COBERTURA.md](docs/COBERTURA.md). Onde ajudar primeiro:
[docs/MUTIRAO.md](docs/MUTIRAO.md). Sem programar, mande o ato pelo
[formulário de issue](https://github.com/bitbusca/prazos-br/issues/new?template=feriado.yml).

## Adicionar o feriado de uma comarca

1. **Ache a fonte oficial.** Vale: portaria/resolução do tribunal com o calendário do ano, lei municipal, lei
   estadual ou ato de suspensão publicado no Diário. Guarde o número do ato e o link. Sem fonte, não entra.

2. **Crie ou edite o arquivo** `feriados/tribunais/<TRIBUNAL>/comarcas/<slug-da-comarca>.json`.
   O slug é o nome sem acento, minúsculo, com hífen: `São Gabriel do Oeste` → `sao-gabriel-do-oeste.json`.

   ```json
   {
     "$schema": "../../../../schema/feriados.schema.json",
     "id": "TJMS/sao-gabriel-do-oeste",
     "escopo": "comarca",
     "tribunal": "TJMS",
     "comarca": "São Gabriel do Oeste",
     "uf": "MS",
     "atualizadoEm": "2026-11-05",
     "anosConferidos": [2026],
     "regras": [
       {
         "nome": "Aniversário de São Gabriel do Oeste",
         "tipo": "feriado",
         "quando": { "dia": "05-12" },
         "fonte": "Lei municipal 273/1994",
         "url": "https://www.trt24.jus.br/web/guest/calendario"
       }
     ],
     "datas": [
       {
         "data": "2026-09-29",
         "nome": "Padroeira de São Gabriel do Oeste",
         "tipo": "feriado",
         "fonte": "Portaria TJMS 983/2025 (lei municipal)",
         "url": "https://www.tjms.jus.br/institucional/feriados"
       }
     ]
   }
   ```

   - **`regras`**: o que se repete todo ano por lei. `quando` é `{ "dia": "MM-DD" }`, `{ "pascoa": N }`
     (dias em relação ao Domingo de Páscoa: Carnaval -48/-47, Sexta-feira Santa -2, Corpus Christi +60) ou
     `{ "de": "12-20", "ate": "01-06" }` (período; pode virar o ano). Use `desde`/`ate` (anos) se a lei mudou.
   - **`datas`**: o que vale num ano específico (portaria anual, ponto facultativo, suspensão).
   - **`tipo`**:
     - `feriado`, `recesso`, `ponto_facultativo` — sem expediente;
     - `expediente_reduzido` — conta no meio do prazo, mas o prazo não começa nem vence nele (CPC art. 224, § 1º);
     - `suspensao_prazos` — há expediente, mas o prazo não corre;
     - `expediente_normal` — só em `datas`: o tribunal **transferiu** um feriado de uma regra mais geral (ex.: o TRT3
       passou o 11/08 da Lei 5.010/1966 para 14/08). Cadastre a data nova como `feriado` e a antiga como
       `expediente_normal`, com o ato. Ele anula, naquele dia, as regras do próprio arquivo e as dos arquivos mais
       gerais (ramo, nacional). Não anula o arquivo da comarca.
   - **`anosConferidos`**: só ponha o ano se você conferiu **todas** as datas daquele ano na fonte. Fora desses
     anos a biblioteca avisa o usuário de que aplicou só as regras.
   - Se a comarca é nova, inclua o nome dela na lista `comarcas` do `tribunal.json`.
   - Suspensão que vale só para um sistema (PJe, eproc), uma parte (INSS, AGU) ou uma vara **não** vai para o
     tribunal inteiro. Se não der para descrever o alcance, deixe de fora e registre em `docs/COBERTURA.md`.

3. **Rode a validação e os testes:**

   ```bash
   npm install
   npm run build   # valida todos os JSON (falta de fonte, data inválida, nome de arquivo) e compila
   npm test
   ```

4. **Inclua um teste** em `test/tribunais.test.mjs` (ou `test/prazos.test.mjs`) com um prazo que passa pelo feriado novo, com a contagem dia a
   dia no comentário (veja os exemplos existentes).

5. **Atualize `docs/COBERTURA.md`** se a sua contribuição fecha uma pendência.

6. **Abra o pull request** com o link da fonte na descrição.

## Adicionar um tribunal inteiro

Crie `feriados/tribunais/<SIGLA>/tribunal.json` (`"escopo": "tribunal"`, `"id": "<SIGLA>"`). Se você tem o
calendário em CSV (`tribunal,data,descricao,tipo,abrangencia,fonte_url`), o importador ajuda:

```bash
node scripts/importar-csv.mjs calendario.csv --tribunal TJXX --anos 2026 --uf XX --sede "Capital"
```

Ele preserva as `regras` escritas à mão e troca só as `datas` dos anos importados. Revise o resultado antes do PR.

## Regras de cálculo e catálogo

Mudança na contagem precisa citar o dispositivo de lei (ou súmula/tema vinculante) e vir com teste conferido à mão.
No catálogo (`catalogo/prazos.json`) só entra informação pública: ato, dias, contagem e base legal.

## Conduta

Seja gentil e objetivo. Dúvidas e erros de data: abra uma issue com o link da fonte.
