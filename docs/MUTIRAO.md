# Mutirão dos calendários forenses

O prazos-br já traz o calendário geral de 22 tribunais e o da capital ou sede de cada um (lista em
[COBERTURA.md](COBERTURA.md)). Falta o resto do país: as **comarcas e subseções do interior**, os **tribunais que
ainda não têm calendário** e os **atos que saem durante o ano**. Quem conhece melhor a sua comarca é quem advoga
nela. Se cada pessoa cadastrar a própria, o Brasil inteiro fica coberto.

## Regra única: sem fonte, não entra

Todo dia precisa do **ato oficial** que o criou e, se possível, do link. Vale:

- portaria, provimento, resolução, ato ou decreto judiciário do tribunal com o calendário do ano;
- ato avulso de suspensão (indisponibilidade de sistema, chuva, evento) publicado no Diário ou no site do tribunal;
- lei municipal ou estadual do feriado, de preferência no site oficial da prefeitura, câmara ou assembleia.

Não vale: notícia de jornal, calendário de site particular, "todo ano é assim" ou print sem o número do ato.

## Como participar

### Sem programar: abra uma issue

Use o formulário **[Feriado ou suspensão da minha comarca](https://github.com/bitbusca/prazos-br/issues/new?template=feriado.yml)**. Informe o
tribunal, a comarca, as datas e o link do ato. Alguém do projeto ou da comunidade transforma em JSON.

### Programando: mande um pull request

1. Ache o ato e anote o número e o link.
2. Crie `feriados/tribunais/<TRIBUNAL>/comarcas/<slug>.json`. Copie um modelo pronto:
   - `feriados/tribunais/TJSP/comarcas/sao-paulo.json`
   - `feriados/tribunais/TRT2/comarcas/sao-paulo.json`

   O slug é o nome sem acento, em minúsculas e com hífen: `São José dos Campos` → `sao-jose-dos-campos`.
3. Em `regras`, ponha o feriado que se repete todo ano por lei: aniversário, padroeiro, Corpus Christi municipal.
   Em `datas`, ponha o que vale num ano específico: ponto facultativo, suspensão, feriado transferido.
4. Se a comarca ainda não está na lista `comarcas` do `tribunal.json`, inclua o nome dela.
5. Em `anosConferidos`, ponha só o ano em que você conferiu **todos** os dias daquela comarca.
6. Rode `npm install && npm run build && npm test`. O validador recusa dia sem fonte, data inválida e nome de
   arquivo errado.
7. Escreva um teste em `test/tribunais.test.mjs` com um prazo que passe pelo seu feriado e a contagem dia a dia no
   comentário. Use os testes que já estão lá como modelo.

Passo a passo completo e lista de tipos de dia: [CONTRIBUTING.md](../CONTRIBUTING.md).

## Onde a ajuda vale mais

1. **TRF3 (SP e MS).** Os atos já foram identificados (veja [COBERTURA.md](COBERTURA.md)). Falta transcrever.
2. **Comarcas do interior dos tribunais grandes.** Quase todos publicam a lista de feriados municipais num anexo
   do ato anual. Um anexo cobre dezenas de comarcas de uma vez:
   - TJSP: edital de feriados municipais do CSM;
   - TJMG: Anexo Único das Portarias Conjuntas;
   - TJPR e TJSC: art. 4º dos decretos e resoluções;
   - TRT1: Ato 110/2025;
   - TRT2: Portaria GP 50/2025, que traz os municípios da região;
   - TRT3: Portaria SEGP 991/2025;
   - TRT4: Anexo Único da Portaria 08/2025;
   - TRT15: Portaria CR 2/2025.
3. **Seções judiciárias fora das capitais-sede:**
   - TRF1: 12 estados;
   - TRF2: Espírito Santo;
   - TRF4: SC e PR;
   - TRF5: AL, CE, PB, RN e SE.
4. **Tribunais ainda sem calendário:**
   - os outros 16 TJs;
   - os outros 18 TRTs;
   - os TREs;
   - STJ, TST e STF.
5. **Atos do ano corrente:** o recesso de 2026/2027 do TJPR e do TJSC e as suspensões avulsas que saírem depois de
   05/11/2026.

## Cuidados

- **Um sistema, uma parte ou uma vara.** Suspensão que vale só para um sistema (PJe, eproc, Projudi), só para uma
  parte (INSS, AGU) ou só para uma vara vai no arquivo da comarca, se for local, e com o alcance escrito no nome.
  Se não for possível descrever o alcance, deixe de fora e registre em COBERTURA.md. Dia fechado a mais adia o
  vencimento sem motivo.
- **Feriado transferido.** Se o tribunal mudou um feriado da Lei 5.010/1966 de data (ex.: 11/08 para 10/08):
  - cadastre a nova data como `feriado`;
  - cadastre a data antiga como `expediente_normal`, com o ato que fez a mudança.
- **Expediente encurtado.** Use `expediente_reduzido` quando o ato aplica o CPC, art. 224, § 1º: o prazo não
  começa nem vence nesse dia. Use `suspensao_prazos` quando o ato suspende os prazos.

Obrigado! Cada comarca cadastrada evita um prazo perdido.
