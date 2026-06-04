import { formatFactionName, formatStatusLabel } from "../../utils/formatters";
import ProgressBar from "../common/ProgressBar";
import RiskBadge from "../common/RiskBadge";
import StatusPill from "../common/StatusPill";

export default function VillainCard({ villain, selected, onSelect }) {
  return (
    <button className={`villain-card villain-card--compact ${selected ? "selected" : ""}`} onClick={() => onSelect(villain)} type="button">
      <img src={villain.imageUrl} alt="" />
      <span className="villain-list-main">
        <strong>{villain.alcunha}</strong>
        <small>{villain.nome}</small>
        <small>{villain.associatedFactionId ? formatFactionName(villain.associatedFactionId) : villain.faccao}</small>
      </span>
      <span className="villain-list-side">
        <StatusPill status={villain.estadoAtual}>{formatStatusLabel(villain.estadoAtual)}</StatusPill>
        <RiskBadge level={villain.periculosidade} />
      </span>
      <span className="villain-card-meter">
        Reforma <ProgressBar value={villain.reformProgress ?? villain.chanceReforma ?? 0} tone="compat" />
      </span>
    </button>
  );
}
