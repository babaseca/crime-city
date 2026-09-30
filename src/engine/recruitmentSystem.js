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
  String(codinome ?? "??")
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

const averageAttribute = (attributes = {}) => {
  const values = Object.values(attributes).map(Number).filter(Number.isFinite);
  if (!values.length) return 6;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const recruitmentHash = (value = "") => {
  let hash = 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const rotatedSort = (day) => (first, second) => recruitmentHash(`${first.id}:${day}`) - recruitmentHash(`${second.id}:${day}`);

const mergeCandidates = (candidates = []) => {
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!candidate?.id || seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
};

export const heroToRecruitmentCandidate = (hero, day = 1) => {
  const attributes = hero.atributos ?? hero.stats ?? {};
  const average = averageAttribute(attributes);
  const traits = hero.tracos ?? [];
  const positiveTraits = hero.tracosPositivos ?? traits.slice(0, 3);
  const negativeTraits = hero.tracosNegativos ?? traits.slice(3, 5);
  const risk = hero.riscoComportamental ?? (hero.controversy > 20 ? "alto" : hero.controversy > 10 ? "medio" : "baixo");
  const cost = hero.custoContratacao ?? Math.round(6500 + average * 1200 + (hero.fame ?? 0) * 130 + (hero.controversy ?? 0) * 60);
  const compatibility = Math.max(45, Math.min(96, Math.round(average * 9 + (hero.moral ?? 70) * 0.12 - (hero.controversy ?? 0) * 0.2)));

  return normalizeApplicant({
    id: hero.id,
    sourceType: "hero_pool",
    codinome: hero.codinome,
    nomeCivil: hero.nomeCivil ?? hero.nome,
    arquetipo: hero.funcao ?? hero.role ?? "operacional",
    poder: hero.poder ?? hero.bio ?? "Capacidade operacional em avaliacao.",
    biografia: hero.biografia ?? hero.bio ?? `${hero.codinome} esta no banco global da Central.`,
    atributos: attributes,
    tracosPositivos: positiveTraits,
    tracosNegativos: negativeTraits,
    riscoComportamental: risk,
    custoContratacao: cost,
    compatibilidade: compatibility,
    hiddenInfo: hero.hiddenInfo ?? hero.revealedInfo ?? `Disponivel na rotacao de RH do dia ${day}.`,
    revealedInfo: hero.recruitmentRevealedInfo ?? null,
    favorite: Boolean(hero.favorite),
    status: hero.recruitmentStatus ?? "novo",
    availableFromDay: hero.availableFromDay ?? 1,
    imageUrl: hero.imageUrl,
  });
};

export const visibleApplicantsForDay = (applicants, day, heroes = [], rotationState = {}) => {
  const dailyCount = Math.max(3, Math.min(6, rotationState.dailyCount ?? 3 + ((day - 1) % 4)));
  const applicantCandidates = (applicants ?? [])
    .filter((applicant) => (applicant.availableFromDay ?? 1) <= day && applicant.status !== "contratado")
    .map(normalizeApplicant);
  const heroCandidates = (heroes ?? [])
    .filter((hero) => hero.teamStatus === "available_global" && hero.status !== "morto" && hero.recruitmentStatus !== "contratado")
    .map((hero) => heroToRecruitmentCandidate(hero, day));
  const candidates = mergeCandidates([...applicantCandidates, ...heroCandidates]);
  const retained = candidates.filter((candidate) => candidate.favorite || candidate.status === "avaliado" || candidate.status === "rejeitado");
  const rotating = candidates
    .filter((candidate) => !retained.some((kept) => kept.id === candidate.id) && candidate.status === "novo")
    .sort(rotatedSort(day))
    .slice(0, dailyCount);

  return mergeCandidates([...retained, ...rotating]);
};

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
  heroes: state.heroes.map((hero) =>
    hero.id === applicantId
      ? {
          ...hero,
          recruitmentStatus: hero.recruitmentStatus === "rejeitado" ? "rejeitado" : "avaliado",
          recruitmentRevealedInfo: hero.hiddenInfo ?? hero.revealedInfo ?? "Perfil validado pelo RH.",
        }
      : hero,
  ),
});

export const toggleFavoriteApplicant = (state, applicantId) => ({
  ...state,
  applicants: state.applicants.map((applicant) =>
    applicant.id === applicantId ? { ...applicant, favorite: !applicant.favorite } : applicant,
  ),
  heroes: state.heroes.map((hero) => (hero.id === applicantId ? { ...hero, favorite: !hero.favorite } : hero)),
});

export const rejectApplicant = (state, applicantId) => ({
  ...state,
  applicants: state.applicants.map((applicant) =>
    applicant.id === applicantId ? { ...applicant, status: "rejeitado" } : applicant,
  ),
  heroes: state.heroes.map((hero) => (hero.id === applicantId ? { ...hero, recruitmentStatus: "rejeitado" } : hero)),
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
  tracos: [...(applicant.tracosPositivos ?? []), ...(applicant.tracosNegativos ?? []).slice(0, 1)],
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
  const heroCandidate = state.heroes.find((hero) => hero.id === applicantId && hero.teamStatus === "available_global");
  const candidate = applicant ?? (heroCandidate ? heroToRecruitmentCandidate(heroCandidate, state.day) : null);

  if (!candidate || candidate.status === "contratado") return { state, message: "Curriculo indisponivel." };

  const cost = dispatcherBudgetDiscount(state.dispatcher, candidate.custoContratacao);
  if (state.budget < cost) {
    return { state, message: "Orcamento insuficiente para contratacao." };
  }

  const activeCount = state.heroes.filter((hero) => activeTeamStatuses.includes(hero.teamStatus) && hero.status !== "morto").length;
  const teamStatus = activeCount < state.activeHeroLimit ? "active_team" : "reserve";
  const nextHeroes = heroCandidate
    ? state.heroes.map((hero) =>
        hero.id === candidate.id
          ? {
              ...hero,
              recruitmentStatus: "contratado",
              teamStatus,
              rosterStatus: teamStatus,
              status: hero.status === "morto" ? "morto" : "disponivel",
              scheduleStatus: teamStatus === "active_team" || teamStatus === "reformed_villain" ? "on_duty" : "reserve",
            }
          : hero,
      )
    : [...state.heroes, applicantToHero(candidate, teamStatus)];
  const nextState = {
    ...state,
    budget: state.budget - cost,
    heroes: nextHeroes,
    applicants: state.applicants.map((candidate) =>
      candidate.id === applicantId ? { ...candidate, status: "contratado" } : candidate,
    ),
    budgetLog: [
      ...state.budgetLog,
      {
        id: `budget-hire-${candidate.id}-${Date.now()}`,
        day: state.day,
        type: "expense",
        label: `Contratacao: ${candidate.codinome}`,
        amount: cost,
      },
    ],
  };

  return {
    state: nextState,
    message:
      teamStatus === "active_team"
        ? `${candidate.codinome} entrou para a equipe ativa.`
        : `${candidate.codinome} foi contratado, mas entrou na reserva: o limite da equipe ativa e ${state.activeHeroLimit}.`,
  };
};
