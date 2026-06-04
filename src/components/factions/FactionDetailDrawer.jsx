import DetailDrawer from "../common/DetailDrawer";
import InfluenceBar from "../common/InfluenceBar";

export default function FactionDetailDrawer({ faction, districts, onClose }) {
  if (!faction) return null;
  const territories = faction.territories.map((id) => districts.find((district) => district.id === id)).filter(Boolean);

  return (
    <DetailDrawer title={faction.name} eyebrow="arquivo de facção" onClose={onClose}>
      <p>{faction.description}</p>
      <div className="district-stat-bars">
        <InfluenceBar label="Ameaça" value={faction.threatLevel} tone="danger" />
        <InfluenceBar label="Recursos" value={faction.resources} tone="warn" />
        <InfluenceBar label="Heat" value={faction.heat} tone="trust" />
        <InfluenceBar label="Medo público" value={faction.publicFear} tone="faction" />
      </div>
      <section>
        <h3>Agenda</h3>
        <p>{faction.agenda}</p>
      </section>
      <section>
        <h3>Territórios</h3>
        <div className="chip-row">{territories.map((district) => <span className="chip" key={district.id}>{district.name}</span>)}</div>
      </section>
      <section>
        <h3>Eventos recentes</h3>
        {(faction.recentEvents ?? []).length ? faction.recentEvents.map((event, index) => (
          <p className="drawer-row" key={`${event.day}-${index}`}><span>Dia {event.day} · {event.title}</span><strong>{event.result}</strong></p>
        )) : <p className="muted">Nenhuma movimentação registrada.</p>}
      </section>
    </DetailDrawer>
  );
}
