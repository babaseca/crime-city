const statusLabels = {
  active_team: "Equipe ativa",
  assigned_by_command: "Reforço do Comando",
  available_global: "Banco global",
  applicant: "Candidato",
  reserve: "Reserva",
  reformed_villain: "Aliado reformado",
  injured: "Ferido",
  dead: "No memorial",
  retired: "Aposentado",
  on_duty: "Em plantão",
  resting: "Descanso",
  training: "Treinamento",
  therapy: "Terapia",
  medical: "Tratamento",
  unavailable: "Indisponível",
  disponivel: "Disponível",
  cansado: "Cansado",
  ferido: "Ferido",
  sobrecarregado: "Sobrecarregado",
  exausto: "Exausto",
  morto: "No memorial",
  fugitivo: "Fugitivo",
  capturado: "Capturado",
  preso: "Preso",
  em_julgamento: "Em julgamento",
  em_reabilitacao: "Em reabilitação",
  "em reabilitacao": "Em reabilitação",
  "em reabilitação": "Em reabilitação",
  informante: "Informante",
  reformado: "Reformado",
  aliado_condicional: "Aliado condicional",
  at_large: "Fugitivo",
  "at large": "Fugitivo",
  captured: "Capturado",
  intake: "Entrada em custódia",
  holding: "Em custódia",
  interrogation: "Em interrogatório",
  rehabilitation: "Em reabilitação",
  informant_active: "Informante ativo",
  escaped: "Foragido",
  closed: "Caso encerrado",
  novo: "Novo",
  avaliado: "Avaliado",
  rejeitado: "Rejeitado",
  contratado: "Contratado",
  favorito: "Favorito",
  baixo: "Baixo",
  medio: "Médio",
  médio: "Médio",
  alto: "Alto",
  critico: "Crítico",
  crítico: "Crítico",
  extremo: "Extremo",
};

const missionResultLabels = {
  sucesso_exemplar: "Sucesso exemplar",
  sucesso_com_dano: "Sucesso com custo",
  missao_controlada: "Missão controlada",
  vitoria_apertada: "Vitória apertada",
  falha_parcial: "Falha parcial",
  falha_grave: "Falha grave",
  alerta_perdido: "Alerta perdido",
  captura_vilao: "Vilão capturado",
  traumatico: "Traumático",
  absurdo: "Absurdo",
};

const keepCase = (source, replacement) => {
  const text = String(source ?? "");
  if (text === text.toLocaleUpperCase("pt-BR")) return replacement.toLocaleUpperCase("pt-BR");
  if (text[0] === text[0]?.toLocaleUpperCase("pt-BR")) {
    return `${replacement[0].toLocaleUpperCase("pt-BR")}${replacement.slice(1)}`;
  }
  return replacement;
};

const wordReplacements = [
  ["faccao", "facção"],
  ["faccoes", "facções"],
  ["heroi", "herói"],
  ["herois", "heróis"],
  ["plantao", "plantão"],
  ["ocorrencia", "ocorrência"],
  ["ocorrencias", "ocorrências"],
  ["relatorio", "relatório"],
  ["relatorios", "relatórios"],
  ["confianca", "confiança"],
  ["tensao", "tensão"],
  ["missao", "missão"],
  ["missoes", "missões"],
  ["acoes", "ações"],
  ["acao", "ação"],
  ["dossie", "dossiê"],
  ["dossies", "dossiês"],
  ["custodia", "custódia"],
  ["seguranca", "segurança"],
  ["tatico", "tático"],
  ["critica", "crítica"],
  ["criticas", "críticas"],
  ["critico", "crítico"],
  ["criticos", "críticos"],
  ["saude", "saúde"],
  ["policia", "polícia"],
  ["midia", "mídia"],
  ["ambulancia", "ambulância"],
  ["ambulancias", "ambulâncias"],
  ["publico", "público"],
  ["publica", "pública"],
  ["publicas", "públicas"],
  ["publicos", "públicos"],
  ["eletrica", "elétrica"],
  ["eletricas", "elétricas"],
  ["eletrico", "elétrico"],
  ["eletricos", "elétricos"],
  ["rapida", "rápida"],
  ["rapido", "rápido"],
  ["rapidos", "rápidos"],
  ["pressao", "pressão"],
  ["preservacao", "preservação"],
  ["decisao", "decisão"],
  ["decisoes", "decisões"],
  ["interferencia", "interferência"],
  ["solucao", "solução"],
  ["permissao", "permissão"],
  ["exposicao", "exposição"],
  ["autorizacao", "autorização"],
  ["estrategia", "estratégia"],
  ["codigo", "código"],
  ["licao", "lição"],
  ["diferenca", "diferença"],
  ["proxima", "próxima"],
  ["proximo", "próximo"],
  ["tambem", "também"],
  ["voce", "você"],
  ["nao", "não"],
  ["so", "só"],
  ["ja", "já"],
  ["ate", "até"],
  ["alguem", "alguém"],
  ["ninguem", "ninguém"],
  ["proprias", "próprias"],
  ["proprio", "próprio"],
  ["propria", "própria"],
  ["padrao", "padrão"],
  ["padroes", "padrões"],
  ["previsao", "previsão"],
  ["utilizavel", "utilizável"],
  ["tatica", "tática"],
  ["fisicas", "físicas"],
  ["evacuacao", "evacuação"],
  ["forca", "força"],
  ["dificil", "difícil"],
  ["tecnico", "técnico"],
  ["nevoa", "névoa"],
  ["contencao", "contenção"],
  ["duvidas", "dúvidas"],
  ["distancia", "distância"],
  ["triangulacao", "triangulação"],
  ["estatistica", "estatística"],
  ["cabeca", "cabeça"],
  ["protecao", "proteção"],
  ["prudencia", "prudência"],
  ["milicia", "milícia"],
  ["negociacao", "negociação"],
  ["multidoes", "multidões"],
  ["populacao", "população"],
  ["eficiencia", "eficiência"],
  ["competencia", "competência"],
  ["demolicao", "demolição"],
  ["remocao", "remoção"],
  ["escombros", "escombros"],
  ["silencio", "silêncio"],
  ["independencia", "independência"],
  ["radio", "rádio"],
  ["radios", "rádios"],
  ["area", "área"],
  ["aerea", "aérea"],
  ["aereo", "aéreo"],
  ["veiculo", "veículo"],
  ["veiculos", "veículos"],
  ["tunel", "túnel"],
  ["tuneis", "túneis"],
  ["portuaria", "portuária"],
  ["portuario", "portuário"],
  ["vigilancia", "vigilância"],
  ["aerea", "aérea"],
  ["laboratorios", "laboratórios"],
  ["vegetacao", "vegetação"],
  ["estacao", "estação"],
  ["conteineres", "contêineres"],
  ["predios", "prédios"],
  ["turisticos", "turísticos"],
  ["autonomo", "autônomo"],
  ["contraditorias", "contraditórias"],
  ["transito", "trânsito"],
  ["evacuacao", "evacuação"],
  ["estao", "estão"],
  ["agua", "água"],
  ["valvulas", "válvulas"],
  ["proximas", "próximas"],
  ["balancam", "balançam"],
  ["saidas", "saídas"],
  ["veiculos", "veículos"],
  ["comunitario", "comunitário"],
  ["eletricos", "elétricos"],
  ["caidos", "caídos"],
  ["manutencao", "manutenção"],
  ["servico", "serviço"],
  ["panico", "pânico"],
  ["termica", "térmica"],
  ["predio", "prédio"],
  ["servicos", "serviços"],
  ["concentracao", "concentração"],
  ["contaminacao", "contaminação"],
  ["instrucoes", "instruções"],
  ["emergencia", "emergência"],
  ["residencial", "residencial"],
  ["licenca", "licença"],
  ["reservatorio", "reservatório"],
  ["quimica", "química"],
  ["semaforos", "semáforos"],
  ["sincronizados", "sincronizados"],
  ["incendio", "incêndio"],
  ["oxigenio", "oxigênio"],
  ["subterraneo", "subterrâneo"],
  ["apos", "após"],
  ["familias", "famílias"],
  ["educacao", "educação"],
  ["comunitarias", "comunitárias"],
  ["remedios", "remédios"],
  ["deposito", "depósito"],
  ["refrigeracao", "refrigeração"],
  ["cinetico", "cinético"],
  ["maquinas", "máquinas"],
  ["forum", "fórum"],
  ["acustico", "acústico"],
  ["frequencias", "frequências"],
  ["desconfortaveis", "desconfortáveis"],
  ["audiencia", "audiência"],
];

const phraseReplacements = [
  [/Distrito Lumen/g, "Distrito Lúmen"],
  [/Sindicato do Apagao/g, "Sindicato do Apagão"],
  [/ligado a rede/g, "ligado à rede"],
  [/a ala critica/g, "a ala crítica"],
  [/pedir permissão e perder/g, "pedir permissão é perder"],
  [/Central da a seus/g, "Central dá a seus"],
  [/a Central e o unico/g, "a Central é o único"],
  [/A Central e o unico/g, "A Central é o único"],
  [/como arroz/g, "como arroz"],
];

export const normalizeDisplayText = (value = "") => {
  if (value === undefined || value === null) return "";
  let text = String(value);
  phraseReplacements.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  wordReplacements.forEach(([source, replacement]) => {
    text = text.replace(new RegExp(`\\b${source}\\b`, "gi"), (match) => keepCase(match, replacement));
  });
  return text;
};

const lowerSmallWords = (value = "") =>
  String(value).replace(/\b(E|A|O|As|Os|De|Do|Da|Dos|Das|Em|No|Na|Nos|Nas|Para|Por)\b/g, (match, word, offset) =>
    offset === 0 ? match : word.toLocaleLowerCase("pt-BR"),
  );

export const titleCase = (value = "") =>
  lowerSmallWords(
    normalizeDisplayText(String(value)
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/(^|[\s/.,;:()[\]{}]+)(\p{L})/gu, (match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("pt-BR")}`)),
  );

export const formatStatusLabel = (value) => statusLabels[value] ?? titleCase(value ?? "Sem status");

export const formatDistrictName = (value, districts = []) => {
  if (!value) return "Bairro não informado";
  return normalizeDisplayText(districts.find((district) => district.id === value)?.name ?? titleCase(value));
};

export const formatFactionName = (value, factions = []) => {
  if (!value) return "Sem facção atribuída";
  const knownFaction = factions.find((faction) => faction.id === value)?.name;
  if (knownFaction) return normalizeDisplayText(knownFaction);
  const alphaMatch = String(value).match(/^FACTION[_ -]?(\d+)$/i);
  if (alphaMatch) return `Facção ${alphaMatch[1].padStart(3, "0")}`;
  return titleCase(value);
};

export const formatHeroRole = (value) => titleCase(value ?? "Função não definida");

export const formatMissionResult = (value) => missionResultLabels[value] ?? titleCase(value ?? "Resultado pendente");

export const formatRiskWord = (value) => titleCase(value ?? "baixo");

export const formatMoney = (value = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export const safeList = (items, fallback = "Nenhum registro") => {
  if (!Array.isArray(items) || !items.length) return fallback;
  return items.filter(Boolean).map(titleCase).join(", ");
};
