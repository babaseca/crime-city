import { dispatcherBudgetDiscount } from "./dispatcherSystem";

const activeTeamStatuses = ["active_team", "assigned_by_command", "reformed_villain"];

const applicantImage = (initials, hue = 180) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="34" fill="hsl(${hue} 55% 18%)"/>
      <path d="M28 182c40-60 92-78 184-52v82H28z" fill="hsl(${(hue + 34) % 360} 65% 38%)"/>
      <circle cx="176" cy="58" r="34" fill="rgba(255,255,255,.16)"/>
      <text x="120" y="132" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="800" fill="#ecfeff">${initials}</text>
      <path d="M72 160h96" stroke="#67e8f9" stroke-width="7" stroke-linecap="round"/>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const applicantInitials = (codinome) =>
  codinome
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

export const normalizeApplicant = (applicant, index = 0) => ({
  ...applicant,
  imageUrl: applicant.imageUrl || applicantImage(applicantInitials(applicant.codinome), 160 + index * 17),
  revealedInfo: applicant.revealedInfo ?? null,
  favorite: Boolean(applicant.favorite),
  status: applicant.status ?? "novo",
});

export const visibleApplicantsForDay = (applicants, day) =>
  applicants.filter((applicant) => (applicant.availableFromDay ?? 1) <= day && applicant.status !== "contratado");

export const interviewApplicant = (state, applicantId) => ({
  ...state,
  applicants: state.applicants.map((applicant) =>
    applicant.id === applicantId
      ? {
          ...applicant,
          status: applicant.status === "rejeitado" ? "rejeitado" : "avaliado",
          revealedInfo: applicant.hiddenInfo,
        }
      : applicant,
  ),
});

export const toggleFavoriteApplicant = (state, applicantId) => ({
  ...state,
  applicants: state.applicants.map((applicant) =>
    applicant.id === applicantId ? { ...applicant, favorite: !applicant.favorite } : applicant,
  ),
});

export const rejectApplicant = (state, applicantId) => ({
  ...state,
  applicants: state.applicants.map((applicant) =>
    applicant.id === applicantId ? { ...applicant, status: "rejeitado" } : applicant,
  ),
});

export const applicantToHero = (applicant, teamStatus) => ({
  id: `h-${applicant.id.replace("app-", "")}`,
  codinome: applicant.codinome,
  nomeCivil: applicant.nomeCivil,
  imageUrl: applicant.imageUrl,
  funcao: applicant.arquetipo,
  bio: applicant.biografia,
  atributos: { ...applicant.atributos },
  energia: 92,
  estresse: applicant.riscoComportamental === "alto" ? 22 : applicant.riscoComportamental === "medio" ? 14 : 8,
  moral: 72,
  status: "disponivel",
  teamStatus,
  rosterStatus: teamStatus,
  scheduleStatus: teamStatus === "active_team" || teamStatus === "reformed_villain" ? "on_duty" : "reserve",
  fatigue: 0,
  burnoutRisk: 0,
  restDays: 0,
  lastMissionDay: null,
  overworkedCount: 0,
  experiencia: 0,
  missoes: 0,
  sucessos: 0,
  falhas: 0,
  civisSalvos: 0,
  ferimentos: [],
  injuries: [],
  medicalStatus: "liberado",
  recoveryDays: 0,
  traumas: [],
  nemeses: [],
  villainTraumas: [],
  tracos: [...applicant.tracosPositivos, ...applicant.tracosNegativos.slice(0, 1)],
  arcosPessoais: ["Novo na Central"],
  falasMarcantes: [],
  fame: 12,
  publicImage: "novato recém-contratado",
  controversy: applicant.riscoComportamental === "alto" ? 18 : 8,
  fans: 10,
  critics: applicant.riscoComportamental === "alto" ? 12 : 4,
  mediaTags: ["novo rosto"],
  recentPosts: [],
});

export const hireApplicant = (state, applicantId) => {
  const applicant = state.applicants.find((candidate) => candidate.id === applicantId);
  if (!applicant || applicant.status === "contratado") return { state, message: "Curriculo indisponivel." };

  const cost = dispatcherBudgetDiscount(state.dispatcher, applicant.custoContratacao);
  if (state.budget < cost) {
    return { state, message: "Orcamento insuficiente para contratacao." };
  }

  const activeCount = state.heroes.filter((hero) => activeTeamStatuses.includes(hero.teamStatus) && hero.status !== "morto").length;
  const teamStatus = activeCount < state.activeHeroLimit ? "active_team" : "reserve";
  const newHero = applicantToHero(applicant, teamStatus);
  const nextState = {
    ...state,
    budget: state.budget - cost,
    heroes: [...state.heroes, newHero],
    applicants: state.applicants.map((candidate) =>
      candidate.id === applicantId ? { ...candidate, status: "contratado" } : candidate,
    ),
    budgetLog: [
      ...state.budgetLog,
      {
        id: `budget-hire-${applicant.id}-${Date.now()}`,
        day: state.day,
        type: "expense",
        label: `Contratacao: ${applicant.codinome}`,
        amount: cost,
      },
    ],
  };

  return {
    state: nextState,
    message:
      teamStatus === "active_team"
        ? `${applicant.codinome} entrou para a equipe ativa.`
        : `${applicant.codinome} foi contratado, mas entrou na reserva: o limite da equipe ativa e ${state.activeHeroLimit}.`,
  };
};
