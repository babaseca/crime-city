import { AlertTriangle, ArrowRight, CalendarDays, CircleDollarSign, Gauge, RotateCcw, Save, Settings, UsersRound } from "lucide-react";
import { getMoraleTier } from "../engine/teamMoraleSystem";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value ?? 0);

function TopMetric({ icon: Icon, label, value, detail, tone = "default" }) {
  return (
    <article className={`top-command-metric top-command-metric--${tone}`}>
      <span className="top-command-metric__icon"><Icon size={17} aria-hidden="true" /></span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        {detail ? <em>{detail}</em> : null}
      </span>
    </article>
  );
}

export default function TopCommandBar({ game, onEndDay, onReset, onSave, onToggleDensity }) {
  const morale = game.teamMorale ?? 62;
  const moraleTier = getMoraleTier(morale);
  const criticalAlerts = (game.activeEvents ?? []).filter((event) => (event.nivelRisco ?? event.risco ?? 0) >= 4).length;
  const calendarDay = 11 + ((game.day ?? 1) % 20);

  return (
    <header className="top-command-bar">
      <div className="top-command-metrics">
        <TopMetric icon={CalendarDays} label="Dia" value={game.day} detail={`${calendarDay} de Maio`} />
        <TopMetric icon={Gauge} label="Reputação" value={game.reputation} detail="+4" tone="good" />
        <TopMetric icon={CircleDollarSign} label="Orçamento" value={money(game.budget)} />
        <TopMetric icon={UsersRound} label="Moral" value={morale} detail={moraleTier.label} tone="good" />
        <TopMetric icon={AlertTriangle} label="Alertas" value={game.activeEvents?.length ?? 0} detail={`${criticalAlerts} críticos`} tone={criticalAlerts ? "danger" : "warn"} />
      </div>

      <div className="top-command-actions">
        <button className="command-action command-action--secondary" onClick={onSave} type="button">
          <Save size={17} aria-hidden="true" />
          <span>Salvar</span>
        </button>
        <button className="command-action command-action--primary" onClick={onEndDay} type="button">
          <span>Encerrar dia</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button className="command-icon-action" onClick={onToggleDensity} title="Alternar densidade" type="button">
          <Settings size={18} aria-hidden="true" />
        </button>
        <button className="command-icon-action" onClick={onReset} title="Reiniciar plantão" type="button">
          <RotateCcw size={17} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
