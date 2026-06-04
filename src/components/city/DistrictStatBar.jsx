import InfluenceBar from "../common/InfluenceBar";

export default function DistrictStatBar({ district }) {
  return (
    <div className="district-stat-bars">
      <InfluenceBar label="Estabilidade" value={district.stability} tone="good" />
      <InfluenceBar label="Confiança" value={district.trustInCentral} tone="trust" />
      <InfluenceBar label="Crime" value={district.crimeLevel} tone="danger" />
      <InfluenceBar label="Infra" value={district.infrastructure} tone="warn" />
    </div>
  );
}
