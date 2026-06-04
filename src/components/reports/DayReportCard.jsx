import { AlertTriangle, BadgeCheck, HeartPulse, Skull, UserRoundCheck, WalletCards } from "lucide-react";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export default function DayReportCard({ report }) {
  return (
    <article className="day-report-card">
      <header>
        <p className="eyebrow">Dia {report.day}</p>
        <h3>Fechamento operacional</h3>
      </header>
      <div className="report-stat-grid">
        <span><BadgeCheck size={15} aria-hidden="true" /> Resolvidas <strong>{report.resolved.length}</strong></span>
        <span><AlertTriangle size={15} aria-hidden="true" /> Falhas <strong>{report.failures.length}</strong></span>
        <span><UserRoundCheck size={15} aria-hidden="true" /> Civis <strong>{report.civiliansSaved}</strong></span>
        <span><WalletCards size={15} aria-hidden="true" /> Saldo <strong>{money(report.dayIncome - report.dayExpenses)}</strong></span>
        <span><HeartPulse size={15} aria-hidden="true" /> Feridos <strong>{report.heroesInjured}</strong></span>
        <span><Skull size={15} aria-hidden="true" /> Perdas <strong>{report.heroesKilled}</strong></span>
      </div>
    </article>
  );
}
