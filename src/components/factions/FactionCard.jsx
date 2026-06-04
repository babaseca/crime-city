import MetricMiniCard from "../common/MetricMiniCard";

export default function FactionCard({ faction, onSelect }) {
  return (
    <button className="faction-card" onClick={() => onSelect?.(faction)} type="button">
      <span>
        <strong>{faction.name}</strong>
        <small>{faction.status}</small>
      </span>
      <p>{faction.style}</p>
      <div className="metric-mini-grid">
        <MetricMiniCard label="Ameaça" value={faction.threatLevel} tone="danger" />
        <MetricMiniCard label="Recursos" value={faction.resources} />
        <MetricMiniCard label="Heat" value={faction.heat} tone="warn" />
      </div>
    </button>
  );
}
