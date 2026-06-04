import { Eye, Star } from "lucide-react";
import { formatHeroRole, formatMoney, formatStatusLabel } from "../../utils/formatters";
import Button from "../common/Button";
import ProgressBar from "../common/ProgressBar";
import RiskBadge from "../common/RiskBadge";
import StatusPill from "../common/StatusPill";

export default function ApplicantCard({ applicant, onView, onInterview, onHire, onReject, onFavorite }) {
  const rejected = applicant.status === "rejeitado";

  return (
    <article className={`applicant-card applicant-card--compact ${applicant.favorite ? "favorite" : ""}`}>
      <button className="favorite-button" type="button" onClick={() => onFavorite(applicant.id)} aria-label="Favoritar currículo">
        <Star size={16} aria-hidden="true" fill={applicant.favorite ? "currentColor" : "none"} />
      </button>

      <div className="applicant-card__identity">
        <img src={applicant.imageUrl} alt="" />
        <div>
          <h3>{applicant.codinome}</h3>
          <p>{formatHeroRole(applicant.arquetipo)}</p>
        </div>
        <StatusPill status={applicant.status}>{formatStatusLabel(applicant.status)}</StatusPill>
      </div>

      <div className="applicant-summary-grid">
        <span>Custo <strong>{formatMoney(applicant.custoContratacao)}</strong></span>
        <span>Compatibilidade <strong>{applicant.compatibilidade}%</strong></span>
        <span>Risco <RiskBadge label={applicant.riscoComportamental} level={applicant.riscoComportamental} /></span>
      </div>

      <ProgressBar value={applicant.compatibilidade} tone="compat" label="Compatibilidade" />

      <div className="card-actions compact-actions">
        <Button variant="ghost" icon={Eye} onClick={() => onView(applicant)}>Ver currículo</Button>
        <Button variant="secondary" onClick={() => onInterview(applicant.id)} disabled={rejected}>Entrevistar</Button>
        <Button onClick={() => onHire(applicant.id)} disabled={rejected}>Contratar</Button>
        <Button variant="danger" onClick={() => onReject(applicant.id)} disabled={rejected}>Rejeitar</Button>
      </div>
    </article>
  );
}
