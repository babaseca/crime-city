import { Activity, AlertTriangle, MapPinned, MessageCircle, UsersRound } from "lucide-react";
import { getMostDangerousDistricts } from "../engine/districtSystem";
import { getMostControversialHeroes, getMostFamousHeroes } from "../engine/heroFameSystem";

export default function ContextPanel({ game }) {
  const dangerous = getMostDangerousDistricts(game.districts ?? [], 3);
  const famous = getMostFamousHeroes(game.heroes ?? []).slice(0, 3);
  const controversial = getMostControversialHeroes(game.heroes ?? []).slice(0, 2);
  const latestPost = game.socialPosts?.[0];

  return (
    <aside className="hub-context-panel">
      <header>
        <p className="eyebrow">contexto vivo</p>
        <h3>Leitura rápida</h3>
      </header>

      <section>
        <h4><MapPinned size={15} aria-hidden="true" /> Bairros sob pressão</h4>
        {dangerous.map((district) => (
          <article key={district.id}>
            <strong>{district.name}</strong>
            <span>Perigo {district.dangerLevel} · Confiança {district.trustInCentral}</span>
          </article>
        ))}
      </section>

      <section>
        <h4><UsersRound size={15} aria-hidden="true" /> Imagem pública</h4>
        {famous.map((hero) => (
          <article key={hero.id}>
            <strong>{hero.codinome}</strong>
            <span>Fama {hero.fame ?? 0} · {hero.publicImage}</span>
          </article>
        ))}
        {controversial.length ? (
          <p className="context-warning"><AlertTriangle size={14} aria-hidden="true" /> Atenção em {controversial[0].codinome}: controvérsia {controversial[0].controversy ?? 0}</p>
        ) : null}
      </section>

      <section>
        <h4><Activity size={15} aria-hidden="true" /> Campanha</h4>
        <article>
          <strong>{game.seasonArcs?.[0]?.name ?? "Cidade em Alerta"}</strong>
          <span>{game.cityLegacy?.feitosHeroicos?.length ?? 0} feitos registrados no legado</span>
        </article>
      </section>

      {latestPost ? (
        <section>
          <h4><MessageCircle size={15} aria-hidden="true" /> Rede Aurora</h4>
          <p className="context-post">{latestPost.text}</p>
        </section>
      ) : null}
    </aside>
  );
}
