import { attributeLabels } from "../../engine/mission";
import Modal from "../common/Modal";
import ProgressBar from "../common/ProgressBar";
import StatusPill from "../common/StatusPill";

export default function HeroProfileModal({ hero, relationships, heroes, onClose }) {
  if (!hero) return null;
  const relationRows = Object.entries(relationships)
    .filter(([key]) => key.includes(hero.id))
    .map(([key, value]) => {
      const otherId = key.split("__").find((id) => id !== hero.id);
      const other = heroes.find((candidate) => candidate.id === otherId);
      return { other, value };
    })
    .filter((row) => row.other)
    .sort((first, second) => Math.abs(second.value) - Math.abs(first.value))
    .slice(0, 5);

  return (
    <Modal title={hero.codinome} eyebrow="Ficha operacional" onClose={onClose} size="large">
      <div className="profile-modal-grid">
        <img src={hero.imageUrl} alt="" />
        <section>
          <h3>{hero.nomeCivil}</h3>
          <StatusPill status={hero.status}>{hero.status}</StatusPill>
          <StatusPill status={hero.teamStatus}>{hero.teamStatus}</StatusPill>
          <p>{hero.bio}</p>
          <p><strong>Função:</strong> {hero.funcao}</p>
          <p><strong>Traços:</strong> {hero.tracos.join(", ")}</p>
          <p><strong>Imagem pública:</strong> {hero.publicImage} · fama {hero.fame}/100 · controvérsia {hero.controversy}/100</p>
        </section>
      </div>
      <div className="attribute-grid">
        {Object.entries(hero.atributos).map(([attribute, value]) => (
          <div key={attribute}>
            <span>{attributeLabels[attribute]}</span>
            <strong>{value}</strong>
            <ProgressBar value={value * 10} />
          </div>
        ))}
      </div>
      <div className="hero-record-grid">
        <span>Missões <strong>{hero.missoes ?? 0}</strong></span>
        <span>Sucessos <strong>{hero.sucessos ?? 0}</strong></span>
        <span>Falhas <strong>{hero.falhas ?? 0}</strong></span>
        <span>Civis salvos <strong>{hero.civisSalvos ?? 0}</strong></span>
      </div>
      <section className="timeline-list">
        <h3>Relações importantes</h3>
        {relationRows.map((row) => <p key={row.other.id}><span>{row.other.codinome}</span><strong>{row.value > 0 ? "+" : ""}{row.value}</strong></p>)}
      </section>
      <section className="timeline-list">
        <h3>Ferimentos e arcos</h3>
        {(hero.ferimentos ?? []).length ? hero.ferimentos.map((injury) => <p key={injury.id}><span>{injury.name}</span><strong>{injury.daysRemaining} dias</strong></p>) : <p className="muted">Sem ferimentos ativos.</p>}
        {(hero.arcosPessoais ?? []).map((arc) => <p key={arc}><span>Arco pessoal</span><strong>{arc}</strong></p>)}
      </section>
      <section className="timeline-list">
        <h3>Rede Aurora</h3>
        {(hero.recentPosts ?? []).length ? hero.recentPosts.map((post, index) => <p key={`${post.day}-${index}`}><span>Dia {post.day} · {post.tone}</span><strong>{post.text}</strong></p>) : <p className="muted">Sem posts recentes sobre este herói.</p>}
      </section>
    </Modal>
  );
}
