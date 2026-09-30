import { normalizeDisplayText, titleCase } from "../../utils/formatters";
import MetricMiniCard from "../common/MetricMiniCard";
import DistrictTrendBadge from "./DistrictTrendBadge";

export default function DistrictCard({ district, factions, onSelect }) {
  const faction = factions.find((item) => item.id === district.dominantFactionId);

  return (
    <button className="district-card" onClick={() => onSelect(district)} type="button">
      <span className="district-card__top">
        <strong>{district.name}</strong>
        <DistrictTrendBadge district={district} />
      </span>
      <small>{titleCase(district.type)} · {normalizeDisplayText(faction?.name ?? "sem facção dominante")}</small>
      <div className="metric-mini-grid">
        <MetricMiniCard label="Perigo" value={district.dangerLevel} tone={district.dangerLevel > 70 ? "danger" : "default"} />
        <MetricMiniCard label="Confiança" value={district.trustInCentral} />
        <MetricMiniCard label="Crime" value={district.crimeLevel} tone="danger" />
      </div>
      {district.crisis ? <span className="district-crisis">Crise: {district.crisis.label}</span> : null}
    </button>
  );
}
