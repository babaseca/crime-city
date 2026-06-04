import DetailDrawer from "../common/DetailDrawer";
import DistrictFactionInfluence from "./DistrictFactionInfluence";
import DistrictStatBar from "./DistrictStatBar";
import DistrictTrendBadge from "./DistrictTrendBadge";

export default function DistrictDetailDrawer({ district, factions, socialPosts, onClose }) {
  if (!district) return null;
  const posts = socialPosts.filter((post) => post.districtId === district.id).slice(0, 4);

  return (
    <DetailDrawer title={district.name} eyebrow="dossiê territorial" onClose={onClose}>
      <p>{district.description}</p>
      <div className="chip-row">
        {district.tags.map((tag) => <span className="chip" key={tag}>{tag}</span>)}
        <DistrictTrendBadge district={district} />
      </div>
      <DistrictStatBar district={district} />
      <section>
        <h3>Facções presentes</h3>
        <DistrictFactionInfluence district={district} factions={factions} />
      </section>
      <section>
        <h3>Modificadores locais</h3>
        {(district.modifiers ?? []).map((modifier) => (
          <p className="drawer-row" key={modifier.id}><span>{modifier.label}</span><strong>{modifier.description}</strong></p>
        ))}
      </section>
      <section>
        <h3>Histórico recente</h3>
        {(district.recentHistory ?? []).length ? district.recentHistory.map((item, index) => (
          <p className="drawer-row" key={`${item.day}-${index}`}><span>Dia {item.day} · {item.title}</span><strong>{item.outcome}</strong></p>
        )) : <p className="muted">Sem ocorrências registradas ainda.</p>}
      </section>
      <section>
        <h3>Rede Aurora</h3>
        {posts.length ? posts.map((post) => <blockquote key={post.id}>{post.text}</blockquote>) : <p className="muted">Nenhum post recente deste bairro.</p>}
      </section>
    </DetailDrawer>
  );
}
