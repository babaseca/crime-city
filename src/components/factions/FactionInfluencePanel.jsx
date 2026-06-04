import InfluenceBar from "../common/InfluenceBar";

export default function FactionInfluencePanel({ factions }) {
  return (
    <div className="faction-influence-panel">
      {factions.map((faction) => (
        <InfluenceBar key={faction.id} label={faction.name} value={Math.max(faction.threatLevel, faction.resources)} tone="faction" />
      ))}
    </div>
  );
}
