import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, UsersRound } from "lucide-react";
import EmptyState from "../common/EmptyState";
import HeroCard from "./HeroCard";
import HeroProfileModal from "./HeroProfileModal";

const filters = [
  ["equipe", "Equipe"],
  ["todos", "Todos"],
  ["global", "Banco global"],
  ["reserva", "Reservas"],
  ["disponivel", "Disponíveis"],
  ["ferido", "Feridos"],
  ["cansado", "Cansados"],
  ["novato", "Novatos"],
  ["veterano", "Veteranos"],
  ["suporte", "Suporte"],
  ["combate", "Combate"],
  ["investigacao", "Investigação"],
  ["resgate", "Resgate"],
];

const activeStatuses = ["active_team", "assigned_by_command", "reformed_villain"];
const pageSize = 24;

const matches = (hero, filter) => {
  if (filter === "todos") return true;
  if (filter === "equipe") return hero.isAlphaActive && activeStatuses.includes(hero.teamStatus);
  if (filter === "global") return hero.teamStatus === "available_global";
  if (filter === "reserva") return hero.teamStatus === "reserve";
  if (filter === "novato") return (hero.missoes ?? 0) < 3;
  if (filter === "veterano") return (hero.missoes ?? 0) >= 8 || (hero.experiencia ?? 0) > 80;
  if (filter === "suporte") return /suporte|medico|médico|diplomacia|logistica|logística|emocional/i.test(hero.funcao);
  if (filter === "combate") return /defesa|intervencao|intervenção|energia|conten/i.test(hero.funcao);
  if (filter === "investigacao") return /investig|analise|análise|sinais|campo/i.test(hero.funcao);
  if (filter === "resgate") return /resgate|evacuacao|evacuação|transporte/i.test(hero.funcao);
  return hero.status === filter;
};

const matchesSearch = (hero, query) => {
  const term = query.trim().toLocaleLowerCase("pt-BR");
  if (!term) return true;
  return [hero.codinome, hero.nomeCivil, hero.nome, hero.funcao, hero.role, hero.poder, hero.bio, hero.biografia]
    .some((value) => String(value ?? "").toLocaleLowerCase("pt-BR").includes(term));
};

export default function HeroDatabaseApp({ game }) {
  const [filter, setFilter] = useState("equipe");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedHero, setSelectedHero] = useState(null);
  const heroes = useMemo(
    () => game.heroes.filter((hero) => matches(hero, filter)).filter((hero) => matchesSearch(hero, search)),
    [game.heroes, filter, search],
  );
  const totalPages = Math.max(1, Math.ceil(heroes.length / pageSize));
  const pageHeroes = useMemo(() => heroes.slice((page - 1) * pageSize, page * pageSize), [heroes, page]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  return (
    <div className="hero-database-app">
      <header className="module-hero">
        <div>
          <p className="eyebrow"><UsersRound size={14} aria-hidden="true" /> Banco de Heróis</p>
          <h2>Prontuário completo da equipe</h2>
          <p>O banco global existe, mas só a Equipe do Dispatcher entra na escala de despacho.</p>
        </div>
      </header>
      <div className="database-toolbar">
        <label className="search-box">
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar herói, função ou poder" />
        </label>
        <div className="database-result-count">
          <strong>{heroes.length}</strong>
          <span>registros</span>
        </div>
      </div>
      <div className="tab-strip wrap">
        {filters.map(([id, label]) => <button className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)} type="button">{label}</button>)}
      </div>
      {heroes.length ? (
        <>
          <div className="hero-database-grid">
            {pageHeroes.map((hero) => <HeroCard hero={hero} key={hero.id} onClick={setSelectedHero} />)}
          </div>
          <div className="pagination-controls">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Página anterior">
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span>Página {page} de {totalPages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} aria-label="Próxima página">
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        <EmptyState title="Nenhum herói neste filtro" text="A Central ainda não possui registros compatíveis." icon={UsersRound} />
      )}
      <HeroProfileModal hero={selectedHero} heroes={game.heroes} history={game.history} onClose={() => setSelectedHero(null)} relationships={game.relationships} />
    </div>
  );
}
