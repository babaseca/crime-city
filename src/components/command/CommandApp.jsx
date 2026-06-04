import { Handshake, Landmark, ShieldAlert, Trophy } from "lucide-react";
import ObjectiveCard from "../common/ObjectiveCard";
import StatCard from "../common/StatCard";
import { getCampaignLegacySummary, generateLegacyHeadline } from "../../engine/legacySystem";

export default function CommandApp({ game }) {
  const legacy = getCampaignLegacySummary(game);
  const org = game.rivalOrganizations?.[0];
  const season = game.seasonArcs?.[0];

  return (
    <div className="command-app hub-module">
      <header className="module-hero slim">
        <div>
          <p className="eyebrow"><Handshake size={14} aria-hidden="true" /> Comando da Central</p>
          <h2>Pressões externas e campanha</h2>
          <p>Chefias, temporada, organização rival e legado permanente ficam aqui, longe do ruído do Despacho.</p>
        </div>
      </header>

      <div className="stats-grid compact">
        <StatCard icon={ShieldAlert} label="Progresso da temporada" value={`${season?.progress ?? 0}%`} />
        <StatCard icon={Landmark} label="Rivalidade Atlas" value={org?.rivalryLevel ?? 0} tone="warn" />
        <StatCard icon={Trophy} label="Feitos heroicos" value={legacy.feitosHeroicos} tone="good" />
      </div>

      <section className="report-section">
        <h3>Objetivos ativos</h3>
        {game.commandObjectives?.length ? (
          <div className="upgrade-grid">
            {game.commandObjectives.map((objective) => <ObjectiveCard objective={objective} key={objective.id} />)}
          </div>
        ) : (
          <p className="muted">Nenhuma ordem especial no momento. Aproveite enquanto dura.</p>
        )}
      </section>

      <section className="command-grid">
        <article>
          <h3>{season?.name ?? "Cidade em Alerta"}</h3>
          <p>{season?.events?.[0]?.text ?? "A temporada ainda está reunindo pistas."}</p>
          <strong>{season?.status ?? "active"}</strong>
        </article>
        <article>
          <h3>{org?.name ?? "Resposta Atlas"}</h3>
          <p>{org?.description ?? "Organização rival em observação."}</p>
          <strong>Relação {org?.relationshipWithCentral ?? 0}</strong>
        </article>
        <article>
          <h3>Legado</h3>
          <p>{generateLegacyHeadline(game)}</p>
          <strong>{legacy.decisoesControversas} decisões controversas</strong>
        </article>
      </section>
    </div>
  );
}
