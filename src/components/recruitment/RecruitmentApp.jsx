import { useMemo, useState } from "react";
import { HeartHandshake, Inbox, Search, Star, UsersRound, WalletCards } from "lucide-react";
import { hireApplicant, interviewApplicant, rejectApplicant, toggleFavoriteApplicant, visibleApplicantsForDay } from "../../engine/recruitmentSystem";
import { formatMoney } from "../../utils/formatters";
import EmptyState from "../common/EmptyState";
import ApplicantCard from "./ApplicantCard";
import ApplicantDetailsModal from "./ApplicantDetailsModal";

const filters = [
  ["todos", "Todos"],
  ["baratos", "Baratos"],
  ["alta", "Alta compatibilidade"],
  ["risco", "Alto risco"],
  ["suporte", "Suporte"],
  ["combate", "Combate"],
  ["investigacao", "Investigação"],
  ["favoritos", "Favoritos"],
];

const pipelineTabs = [
  ["highlights", "Destaques do dia", Star],
  ["inbox", "Caixa de entrada", Inbox],
  ["talent", "Banco de talentos", UsersRound],
  ["interviews", "Entrevistas", HeartHandshake],
];

const matchesFilter = (applicant, filter) => {
  if (filter === "todos") return true;
  if (filter === "baratos") return applicant.custoContratacao <= 12500;
  if (filter === "alta") return applicant.compatibilidade >= 76;
  if (filter === "risco") return applicant.riscoComportamental === "alto";
  if (filter === "favoritos") return applicant.favorite;
  if (filter === "suporte") return /suporte|medic|social|controle|comunic/i.test(applicant.arquetipo);
  if (filter === "combate") return /combate|conten|defesa|energia/i.test(applicant.arquetipo);
  if (filter === "investigacao") return /investig|analise|tecnico|dados/i.test(applicant.arquetipo);
  return true;
};

const matchesSearch = (applicant, query) => {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [applicant.codinome, applicant.nomeCivil, applicant.arquetipo, applicant.poder].some((value) =>
    String(value ?? "").toLowerCase().includes(term),
  );
};

const byCompatibility = (first, second) => (second.favorite ? 12 : 0) + second.compatibilidade - ((first.favorite ? 12 : 0) + first.compatibilidade);

const pickApplicantsForTab = (applicants, tab) => {
  if (tab === "highlights") {
    return [...applicants]
      .filter((applicant) => !["rejeitado", "contratado"].includes(applicant.status))
      .sort(byCompatibility)
      .slice(0, 4);
  }
  if (tab === "inbox") return applicants.filter((applicant) => applicant.status === "novo");
  if (tab === "interviews") return applicants.filter((applicant) => applicant.status === "avaliado" || applicant.revealedInfo);
  return applicants;
};

export default function RecruitmentApp({ game, setGame }) {
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("todos");
  const [pipeline, setPipeline] = useState("highlights");
  const [search, setSearch] = useState("");
  const allVisibleApplicants = useMemo(
    () => visibleApplicantsForDay(game.applicants, game.day, game.heroes, game.recruitmentRotationState),
    [game.applicants, game.day, game.heroes, game.recruitmentRotationState],
  );
  const visibleApplicants = useMemo(
    () =>
      pickApplicantsForTab(allVisibleApplicants, pipeline)
        .filter((applicant) => matchesFilter(applicant, filter))
        .filter((applicant) => matchesSearch(applicant, search)),
    [allVisibleApplicants, filter, pipeline, search],
  );
  const activeCount = game.heroes.filter(
    (hero) => ["active_team", "assigned_by_command", "reformed_villain"].includes(hero.teamStatus) && hero.status !== "morto",
  ).length;
  const inboxCount = allVisibleApplicants.filter((applicant) => applicant.status === "novo").length;
  const interviewCount = allVisibleApplicants.filter((applicant) => applicant.status === "avaliado" || applicant.revealedInfo).length;

  const update = (updater) => setGame((current) => updater(current));
  const hire = (id) => {
    setGame((current) => {
      const result = hireApplicant(current, id);
      setMessage(result.message);
      return result.state;
    });
  };

  return (
    <div className="recruitment-app">
      <header className="module-hero recruitment-hero">
        <div>
          <p className="eyebrow"><HeartHandshake size={14} aria-hidden="true" /> RH Heroico</p>
          <h2>Pipeline de recrutamento</h2>
          <p>Triagem rápida, entrevistas com surpresa e contratação sem lotar a escala antes do primeiro café da chefia.</p>
        </div>
        <span><WalletCards size={16} aria-hidden="true" /> {formatMoney(game.budget)} · Equipe {activeCount}/{game.activeHeroLimit}</span>
      </header>

      {message ? <p className="system-message">{message}</p> : null}

      <section className="recruitment-pipeline">
        <div className="pipeline-tabs">
          {pipelineTabs.map(([id, label, Icon]) => (
            <button className={pipeline === id ? "active" : ""} key={id} onClick={() => setPipeline(id)} type="button">
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
              {id === "inbox" ? <strong>{inboxCount}</strong> : null}
              {id === "interviews" ? <strong>{interviewCount}</strong> : null}
            </button>
          ))}
        </div>

        <div className="recruitment-toolbar">
          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar codinome, função ou poder" />
          </label>
          <div className="tab-strip wrap compact-filter">
            {filters.map(([id, label]) => (
              <button className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)} type="button">{label}</button>
            ))}
          </div>
        </div>
      </section>

      {visibleApplicants.length ? (
        <div className={pipeline === "talent" ? "applicant-list" : "applicant-grid curated"}>
          {visibleApplicants.map((applicant) => (
            <ApplicantCard
              applicant={applicant}
              key={applicant.id}
              onFavorite={(id) => update((state) => toggleFavoriteApplicant(state, id))}
              onHire={hire}
              onInterview={(id) => update((state) => interviewApplicant(state, id))}
              onReject={(id) => update((state) => rejectApplicant(state, id))}
              onView={setSelectedApplicant}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum currículo nesta etapa" text="Mude o filtro, espere novos candidatos ou avance entrevistas pendentes." icon={HeartHandshake} />
      )}
      <ApplicantDetailsModal applicant={selectedApplicant} onClose={() => setSelectedApplicant(null)} />
    </div>
  );
}
