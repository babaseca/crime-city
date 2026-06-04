import { useMemo, useState } from "react";
import { MapPinned } from "lucide-react";
import DistrictCard from "./DistrictCard";
import DistrictDetailDrawer from "./DistrictDetailDrawer";

const filters = [
  ["danger", "Mais perigosos"],
  ["trust", "Menor confiança"],
  ["faction", "Maior influência"],
  ["neglected", "Negligenciados"],
  ["critical", "Críticos"],
  ["stable", "Estáveis"],
];

const maxInfluence = (district) => Math.max(0, ...Object.values(district.activeFactionInfluence ?? {}));

const sortDistricts = (districts, filter) => {
  if (filter === "trust") return [...districts].sort((a, b) => a.trustInCentral - b.trustInCentral);
  if (filter === "faction") return [...districts].sort((a, b) => maxInfluence(b) - maxInfluence(a));
  if (filter === "neglected") return [...districts].sort((a, b) => b.stats.daysNeglected - a.stats.daysNeglected);
  if (filter === "critical") return districts.filter((district) => district.crisis || district.dangerLevel >= 70).sort((a, b) => b.dangerLevel - a.dangerLevel);
  if (filter === "stable") return districts.filter((district) => district.stability >= 62).sort((a, b) => b.stability - a.stability);
  return [...districts].sort((a, b) => b.dangerLevel - a.dangerLevel);
};

export default function CityMapApp({ game }) {
  const [filter, setFilter] = useState("danger");
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const districts = useMemo(() => sortDistricts(game.districts ?? [], filter), [filter, game.districts]);

  return (
    <div className="city-map-app">
      <header className="module-hero">
        <div>
          <p className="eyebrow"><MapPinned size={14} aria-hidden="true" /> Mapa da Cidade</p>
          <h2>Nova Aurora em tempo operacional</h2>
          <p>Bairros agora têm memória, humor público, infraestrutura e facções disputando espaço.</p>
        </div>
      </header>
      <div className="tab-strip wrap">
        {filters.map(([id, label]) => <button className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)} type="button">{label}</button>)}
      </div>
      <div className="district-grid">
        {districts.map((district) => (
          <DistrictCard district={district} factions={game.factions ?? []} key={district.id} onSelect={setSelectedDistrict} />
        ))}
      </div>
      <DistrictDetailDrawer district={selectedDistrict} factions={game.factions ?? []} socialPosts={game.socialPosts ?? []} onClose={() => setSelectedDistrict(null)} />
    </div>
  );
}
