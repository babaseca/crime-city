import { Fingerprint, MapPin } from "lucide-react";
import { formatFactionName, formatStatusLabel } from "../../utils/formatters";
import ProgressBar from "../common/ProgressBar";
import RiskBadge from "../common/RiskBadge";
import StatusPill from "../common/StatusPill";

const cleanFactionText = (value) => String(value ?? "").replace(/faccao/gi, "facção");

export default function VillainCard({ villain, selected, onSelect, factions = [] }) {
  const factionName = villain.associatedFactionId
    ? formatFactionName(villain.associatedFactionId, factions)
    : cleanFactionText(villain.faccao ?? "Sem facção conhecida");
  const reformProgress = villain.reformProgress ?? villain.chanceReforma ?? 0;

  return (
    <button
      aria-pressed={selected}
      className={`villain-card villain-card--compact ${selected ? "selected" : ""}`}
      onClick={() => onSelect(villain)}
      type="button"
    >
      <span className="villain-card__portrait">
        <img src={villain.imageUrl} alt="" />
      </span>

      <span className="villain-card__record">
        <span className="villain-card__topline">
          <span className="villain-card__name">
            <strong>{villain.alcunha}</strong>
            <small>{villain.nome}</small>
          </span>
          <StatusPill status={villain.estadoAtual}>{formatStatusLabel(villain.estadoAtual)}</StatusPill>
        </span>

        <span className="villain-card__chips">
          <span><MapPin size={13} aria-hidden="true" /> {villain.bairroAtuacao ?? "Território incerto"}</span>
          <span><Fingerprint size={13} aria-hidden="true" /> {factionName}</span>
          <RiskBadge level={villain.periculosidade} />
        </span>

        <span className="villain-card__meter">
          <span>
            Reforma
            <strong>{Math.round(Number(reformProgress) || 0)}%</strong>
          </span>
          <ProgressBar value={reformProgress} tone="compat" />
        </span>
      </span>
    </button>
  );
}
