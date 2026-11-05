/** Tipos públicos do prazos-br. Datas sempre em texto 'AAAA-MM-DD' (dia civil, sem fuso). */

/**
 * - feriado / recesso / ponto_facultativo: sem expediente forense;
 * - expediente_reduzido: conta no meio do prazo, mas o prazo não começa nem vence nele (CPC art. 224, § 1º);
 * - suspensao_prazos: há expediente, mas o prazo não corre (ex.: CPC art. 220, de 20/12 a 20/01);
 * - expediente_normal: só em `datas`; o ato do tribunal manteve expediente normal num dia que uma regra mais
 *   geral fecharia (ex.: TRT que transferiu o feriado de 11/08 da Lei 5.010/1966 para outra data). Anula, naquele
 *   dia, as regras do próprio arquivo e tudo o que vier de arquivos mais gerais (ramo, nacional).
 */
export type TipoDia = 'feriado' | 'recesso' | 'ponto_facultativo' | 'expediente_reduzido' | 'suspensao_prazos' | 'expediente_normal';

export type Materia = 'civel' | 'trabalho' | 'penal' | 'penal_urgente' | 'eleitoral';

export type Quando = { dia: string } | { pascoa: number } | { de: string; ate: string };

/** Regra que se repete todo ano (dia fixo, data móvel pela Páscoa ou período). */
export interface RegraFeriado {
  nome: string;
  tipo: TipoDia;
  quando: Quando;
  desde?: number;
  ate?: number;
  naoSeAplica?: Materia[];
  fonte: string;
  url?: string;
}

/** Dia de um ano específico (portaria anual do tribunal, ato de suspensão etc.). */
export interface DataFeriado {
  data: string;
  nome: string;
  tipo: TipoDia;
  naoSeAplica?: Materia[];
  fonte: string;
  url?: string;
}

/** Formato aberto dos arquivos em feriados/ (ver schema/feriados.schema.json). */
export interface ArquivoFeriados {
  id: string;
  escopo: 'nacional' | 'ramo' | 'tribunal' | 'comarca';
  nome?: string;
  tribunal?: string;
  comarca?: string;
  uf?: string;
  ibge?: number;
  aplicaA?: string[];
  observacao?: string;
  atualizadoEm?: string;
  anosConferidos?: number[];
  comarcas?: string[];
  regras: RegraFeriado[];
  datas?: DataFeriado[];
}

/** Forma compacta embutida no pacote (gerada por scripts/gerar-dados.mjs). */
export interface ArquivoCompacto {
  id: string;
  escopo: ArquivoFeriados['escopo'];
  nome?: string;
  tribunal?: string;
  comarca?: string;
  uf?: string;
  aplicaA?: string[];
  anosConferidos?: number[];
  comarcas?: string[];
  regras: Array<{ nome: string; tipo: string; quando: Quando; fonte: number; url: number; desde?: number; ate?: number; naoSeAplica?: string[] }>;
  datas: Array<[string, number, string, number, number] | [string, number, string, number, number, string[]]>;
}

/** Um dia especial no calendário de um tribunal/comarca, já resolvido para uma data. */
export interface DiaEspecial {
  data: string;
  nome: string;
  tipo: TipoDia;
  fonte: string;
  url?: string;
  /** de qual arquivo veio: 'nacional', 'ramo/justica-federal', 'TJMS', 'TJMS/campo-grande' ou 'extra' */
  origem: string;
}

/**
 * Como a data `inicio` deve ser lida:
 * - 'publicacao' (padrão): data da publicação/intimação; o prazo começa no 1º dia útil seguinte (CPC art. 224, § 3º);
 * - 'djen': data da DISPONIBILIZAÇÃO no Diário de Justiça Eletrônico Nacional; a publicação é o 1º dia útil
 *   seguinte (Lei 11.419/2006 art. 4º, § 3º; Res. CNJ 455/2022 art. 11, § 3º) e o prazo começa no dia útil depois dela;
 * - 'intimacao_eletronica': data do ENVIO da intimação pelo portal/sistema; a ciência acontece na consulta ou,
 *   sem consulta, ao fim de 10 dias corridos (ciência ficta, Lei 11.419/2006 art. 5º, § 3º).
 */
export type EventoInicial = 'publicacao' | 'djen' | 'intimacao_eletronica';

/** Quem tem prazo diferenciado. */
export type Dobro = 'fazenda' | 'defensoria' | 'mp' | 'litisconsortes';

export interface OpcoesPrazo {
  /** data do evento (AAAA-MM-DD ou DD/MM/AAAA) — ver `evento` */
  inicio: string;
  /** quantidade de dias do prazo (antes de dobrar) */
  dias: number;
  /** 'uteis' (CPC art. 219, padrão), 'clt' (dias úteis, CLT art. 775) ou 'corridos' (CPP art. 798; prazos materiais) */
  tipo?: 'uteis' | 'corridos' | 'clt';
  /** sigla do tribunal (TJMS, TRT24, TRF3...). Sem tribunal: só feriados nacionais. */
  tribunal?: string;
  /** comarca (ou cidade da vara), para os feriados municipais */
  comarca?: string;
  evento?: EventoInicial;
  /** intimação eletrônica: data em que o intimado abriu a intimação (se antes dos 10 dias) */
  consulta?: string;
  /** prazo em dobro: Fazenda Pública (CPC 183), Defensoria (CPC 186), MP (CPC 180) ou litisconsortes (CPC 229) */
  dobro?: Dobro | false | null;
  /** processo em autos eletrônicos (padrão true). CPC art. 229, § 2º: litisconsortes não têm dobra no eletrônico. */
  autosEletronicos?: boolean;
  /** processo no Juizado Especial (sem prazo em dobro para a Fazenda: Lei 10.259/2001 art. 9º; Lei 12.153/2009 art. 7º) */
  juizado?: boolean;
  /** matéria; o padrão sai do tribunal (TRT/TST = trabalho, TRE/TSE = eleitoral, demais = cível) */
  materia?: Materia;
  /** dias extras sem expediente (ex.: suspensão por falha no sistema, feriado ainda não catalogado) */
  feriadosExtras?: DataFeriado[];
}

export type AcaoPasso = 'evento' | 'publicacao' | 'ciencia' | 'conta' | 'pula' | 'prorroga' | 'vencimento';

export interface Passo {
  data: string;
  /** 'segunda-feira' … 'domingo' */
  diaSemana: string;
  acao: AcaoPasso;
  /** número do dia contado (só em acao 'conta') */
  contagem?: number;
  /** por que o dia foi pulado/prorrogado ou qual a regra do marco */
  motivo?: string;
  /** ato normativo do motivo */
  fonte?: string;
  url?: string;
  /** frase pronta para mostrar ao usuário */
  texto: string;
}

export interface ResultadoPrazo {
  /** último dia do prazo (AAAA-MM-DD) */
  vencimento: string;
  /** vencimento em DD/MM/AAAA */
  vencimentoBR: string;
  /** dia em que a contagem começa (1º dia contado) */
  inicioContagem: string;
  /** data em que a parte ficou intimada (publicação ou ciência) */
  intimacao: string;
  /** publicação no DJEN (só com evento 'djen') */
  publicacao: string | null;
  /** ciência da intimação eletrônica (só com evento 'intimacao_eletronica') */
  ciencia: string | null;
  cienciaFicta: boolean;
  /** dia em que a contagem terminou, antes de prorrogar */
  fimContagem: string;
  prorrogado: boolean;
  motivoProrrogacao: string | null;
  dias: number;
  /** dias efetivamente contados (com a dobra) */
  diasContados: number;
  dobro: { tipo: Dobro; aplicado: boolean; baseLegal: string } | null;
  tipo: 'uteis' | 'corridos' | 'clt';
  evento: EventoInicial;
  tribunal: string | null;
  comarca: string | null;
  materia: Materia;
  /** dispositivos de lei usados no cálculo */
  baseLegal: string[];
  /** calendários aplicados (ids dos arquivos de feriados) */
  calendarios: string[];
  passos: Passo[];
  avisos: string[];
  /** uma frase com o resultado */
  resumo: string;
}

export interface PrazoCatalogo {
  id: string;
  categoria: string;
  ato: string;
  dias: number;
  contagem: 'uteis' | 'corridos';
  conta: 'da_intimacao' | 'antes_do_ato' | 'na_data';
  quem: 'parte' | 'juizo';
  ramo: 'civel' | 'trabalho' | 'juizado';
  baseLegal: string;
  prazoGenerico?: boolean;
  unidadeNaLei?: 'meses' | 'anos';
  quantidadeNaLei?: number;
}

export interface CatalogoPrazos {
  versao: string;
  categorias: Array<{ id: string; nome: string; total: number }>;
  prazos: PrazoCatalogo[];
}
