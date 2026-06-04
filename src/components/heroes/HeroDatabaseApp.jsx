import { useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
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

const matches = (hero, filter) => {
  if (filter === "todos") return true;
  if (filter === "equipe") return activeStatuses.includes(hero.teamStatus);
  if (filter === "global") return hero.teamStatus === "available_global";
  if (filter === "reserva") return hero.teamStatus === "reserve";
  if (filter === "novato") return (hero.missoes ?? 0) < 3;
  if (filter === "veterano") return (hero.missoes ?? 0) >= 8 || (hero.experiencia ?? 0) > 80;
  if (filter === "suporte") return /suporte|medico|diplomacia|logistica|emocional/i.test(hero.funcao);
  if (filter === "combate") return /defesa|intervencao|energia|conten/i.test(hero.funcao);
  if (filter === "investigacao") return /investig|analise|sinais|campo/i.test(hero.funcao);
  if (filter === "resgate") return /resgate|evacuacao|transporte/i.test(hero.funcao);
  return hero.status === filter;
};

export default function HeroDatabaseApp({ game }) {
  const [filter, setFilter] = useState("equipe");
  const [selectedHero, setSelectedHero] = useState(null);
  const heroes = useMemo(() => game.heroes.filter((hero) => matches(hero, filter)), [game.heroes, filter]);

  return (
    <div className="hero-database-app">
      <header className="module-hero">
        <div>
          <p className="eyebrow"><UsersRound size={14} aria-hidden="true" /> Banco de Heróis</p>
          <h2>Prontuário completo da equipe</h2>
          <p>O banco global existe, mas só a Equipe do Dispatcher entra na escala de despacho.</p>
        </div>
      </header>
      <div className="tab-strip wrap">
        {filters.map(([id, label]) => <button className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)} type="button">{label}</button>)}
      </div>
      {heroes.length ? (
        <div className="hero-database-grid">
          {heroes.map((hero) => <HeroCard hero={hero} key={hero.id} onClick={setSelectedHero} />)}
        </div>
      ) : (
        <EmptyState title="Nenhum herói neste filtro" text="A central ainda não possui registros compatíveis." icon={UsersRound} />
      )}
      <HeroProfileModal hero={selectedHero} heroes={game.heroes} onClose={() => setSelectedHero(null)} relationships={game.relationships} />
    </div>
  );
}
