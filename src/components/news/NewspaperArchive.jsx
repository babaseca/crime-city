import { Newspaper } from "lucide-react";
import EmptyState from "../common/EmptyState";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export default function NewspaperArchive({ newspapers }) {
  if (!newspapers?.length) {
    return <EmptyState title="Nenhum jornal arquivado" text="Ao encerrar o primeiro dia, o Nova Aurora Hoje aparece aqui." icon={Newspaper} />;
  }

  return (
    <div className="newspaper-archive">
      {newspapers.map((paper) => (
        <article className="newspaper-card" key={paper.id}>
          <p className="eyebrow">Dia {paper.day} · {paper.name}</p>
          <h3>{paper.headline}</h3>
          <p>{paper.opinion}</p>
          {paper.sections ? <p className="muted">{paper.sections.streetVoice}</p> : null}
          <div className="report-stat-grid">
            <span>Resolvidas <strong>{paper.indicators.resolved}</strong></span>
            <span>Falhas <strong>{paper.indicators.failures}</strong></span>
            <span>Saldo <strong>{money(paper.indicators.budgetDelta)}</strong></span>
            <span>Bairro <strong>{paper.indicators.district}</strong></span>
            {paper.indicators.faction ? <span>Facção <strong>{paper.indicators.faction}</strong></span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
