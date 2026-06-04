import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import EmptyState from "../common/EmptyState";
import SocialFilters from "./SocialFilters";
import SocialPostCard from "./SocialPostCard";

export default function SocialFeedApp({ game }) {
  const [filter, setFilter] = useState("todos");
  const posts = useMemo(
    () => (game.socialPosts ?? []).filter((post) => filter === "todos" || post.tone === filter),
    [filter, game.socialPosts],
  );

  return (
    <div className="social-feed-app">
      <header className="module-hero">
        <div>
          <p className="eyebrow"><MessageCircle size={14} aria-hidden="true" /> Rede Aurora</p>
          <h2>Voz das ruas</h2>
          <p>Comentários públicos reagem a bairros, heróis, facções, danos e ausências da Central.</p>
        </div>
      </header>
      <SocialFilters value={filter} onChange={setFilter} />
      {posts.length ? (
        <div className="social-feed-list">
          {posts.map((post) => (
            <SocialPostCard
              districts={game.districts ?? []}
              factions={game.factions ?? []}
              heroes={game.heroes ?? []}
              key={post.id}
              post={post}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Rede silenciosa" text="Posts aparecem ao encerrar dias com ocorrências registradas." icon={MessageCircle} />
      )}
    </div>
  );
}
