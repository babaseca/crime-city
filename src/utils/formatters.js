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

export const titleCase = (value = "") =>
  String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatStatusLabel = (value) => statusLabels[value] ?? titleCase(value ?? "Sem status");

export const formatDistrictName = (value, districts = []) => {
  if (!value) return "Bairro não informado";
  return districts.find((district) => district.id === value)?.name ?? titleCase(value);
};

export const formatFactionName = (value, factions = []) => {
  if (!value) return "Sem facção atribuída";
  return factions.find((faction) => faction.id === value)?.name ?? titleCase(value);
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
