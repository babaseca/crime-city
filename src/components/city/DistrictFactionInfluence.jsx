import InfluenceBar from "../common/InfluenceBar";

export default function DistrictFactionInfluence({ district, factions }) {
  const entries = Object.entries(district.activeFactionInfluence ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="district-factions">
      {entries.map(([factionId, value]) => {
        const faction = factions.find((item) => item.id === factionId);
        return <InfluenceBar key={factionId} label={faction?.name ?? factionId} value={value} tone="faction" />;
      })}
    </div>
  );
}
