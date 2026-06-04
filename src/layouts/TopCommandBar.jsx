import { CalendarDays, CircleDollarSign, Gauge, RadioTower, RotateCcw, Save, ShieldCheck, UsersRound } from "lucide-react";
import Button from "../components/common/Button";
import { getMoraleTier } from "../engine/teamMoraleSystem";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value ?? 0);

const activeStatuses = ["active_team", "assigned_by_command", "reformed_villain"];

export default function TopCommandBar({ game, onEndDay, onReset, onSave, onToggleDensity }) {
  const activeHeroes = (game.heroes ?? []).filter((hero) => activeStatuses.includes(hero.teamStatus) && hero.status !== "morto");
  const morale = game.teamMorale ?? 62;
  const moraleTier = getMoraleTier(morale);
  const density = game.uiSettings?.density ?? "comfortable";

  return (
    <header className="top-command-bar">
      <div className="top-command-brand">
        <ShieldCheck size={20} aria-hidden="true" />
        <span>
          <strong>Central de Crise</strong>
          <small>Hub Operacional SRM-NA</small>
        </span>
      </div>

      <div className="top-command-metrics">
        <span><CalendarDays size={15} aria-hidden="true" /> Dia {game.day}</span>
        <span><Gauge size={15} aria-hidden="true" /> Rep. {game.reputation}</span>
        <span><CircleDollarSign size={15} aria-hidden="true" /> {money(game.budget)}</span>
        <span title={`Moral ${moraleTier.label}`}><UsersRound size={15} aria-hidden="true" /> Moral {morale}</span>
        <span><RadioTower size={15} aria-hidden="true" /> {game.activeEvents?.length ?? 0} alertas</span>
        <span>{activeHeroes.length}/{game.activeHeroLimit ?? 8} equipe</span>
      </div>

      <div className="top-command-actions">
        <Button variant="ghost" onClick={onToggleDensity}>
          {density === "compact" ? "Modo confortável" : "Modo compacto"}
        </Button>
        <Button variant="secondary" icon={Save} onClick={onSave}>Salvar</Button>
        <Button icon={CalendarDays} onClick={onEndDay}>Encerrar dia</Button>
        <Button variant="ghost" icon={RotateCcw} onClick={onReset}>Reiniciar</Button>
      </div>
    </header>
  );
}
