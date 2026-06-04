export default function SocialPostCard({ post, heroes, districts, factions }) {
  const hero = heroes.find((item) => item.id === post.heroId);
  const district = districts.find((item) => item.id === post.districtId);
  const faction = factions.find((item) => item.id === post.factionId);

  return (
    <article className={`social-post-card tone-${post.tone}`}>
      <header>
        <strong>{post.authorHandle}</strong>
        <span>Dia {post.day} · {post.tone}</span>
      </header>
      <p>{post.text}</p>
      <div className="chip-row">
        {district ? <span className="chip">{district.name}</span> : null}
        {hero ? <span className="chip requirement">{hero.codinome}</span> : null}
        {faction ? <span className="chip warning">{faction.name}</span> : null}
      </div>
    </article>
  );
}
