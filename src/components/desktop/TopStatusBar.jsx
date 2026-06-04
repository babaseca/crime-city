import { AlertTriangle, CalendarDays, HeartPulse, RotateCcw, ShieldCheck, WalletCards } from "lucide-react";
import Button from "../common/Button";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export default function TopStatusBar({ game, onEndDay, onReset }) {
  const activeTeam = game.heroes.filter(
    (hero) => ["active_team", "assigned_by_command", "reformed_villain"].includes(hero.teamStatus) && hero.status !== "morto",
  );
  const availableHeroes = activeTeam.filter((hero) => ["disponivel", "cansado"].includes(hero.status)).length;

  return (
    <header className="top-status-bar">
      <div className="system-brand">
        <span className="system-led" />
        <div>
          <strong>Central de Crise</strong>
          <small>{game.cityStatus}</small>
        </div>
      </div>
      <div className="status-cluster">
        <span><CalendarDays size={15} aria-hidden="true" /> Dia {game.day}</span>
        <span><ShieldCheck size={15} aria-hidden="true" /> {game.reputation}/100</span>
        <span><WalletCards size={15} aria-hidden="true" /> {money(game.budget)}</span>
        <span><AlertTriangle size={15} aria-hidden="true" /> {game.activeEvents.length} alertas</span>
        <span><HeartPulse size={15} aria-hidden="true" /> {availableHeroes}/{game.activeHeroLimit} equipe</span>
      </div>
      <div className="system-actions">
        <Button variant="ghost" icon={RotateCcw} onClick={onReset}>Reiniciar</Button>
        <Button variant="primary" icon={CalendarDays} onClick={onEndDay}>Encerrar dia</Button>
      </div>
    </header>
  );
}
