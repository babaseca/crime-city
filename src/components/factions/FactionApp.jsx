import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import FactionCard from "./FactionCard";
import FactionDetailDrawer from "./FactionDetailDrawer";

export default function FactionApp({ game }) {
  const [selectedFaction, setSelectedFaction] = useState(null);
  const factions = useMemo(() => [...(game.factions ?? [])].sort((a, b) => b.threatLevel - a.threatLevel), [game.factions]);

  return (
    <div className="faction-app hub-module">
      <header className="module-hero danger slim">
        <div>
          <p className="eyebrow"><ShieldAlert size={14} aria-hidden="true" /> Facções</p>
          <h2>Pressão, território e retaliação</h2>
          <p>Facções acumulam recursos, calor e rancor. Quando a cidade aperta, elas respondem.</p>
        </div>
      </header>
      <div className="faction-grid relaxed">
        {factions.map((faction) => <FactionCard faction={faction} key={faction.id} onSelect={setSelectedFaction} />)}
      </div>
      <FactionDetailDrawer faction={selectedFaction} districts={game.districts ?? []} onClose={() => setSelectedFaction(null)} />
    </div>
  );
}
