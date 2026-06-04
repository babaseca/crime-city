import { Archive } from "lucide-react";
import EmptyState from "../common/EmptyState";
import MemorialCard from "./MemorialCard";

export default function MemorialApp({ game }) {
  return (
    <div className="memorial-app">
      <header className="module-hero memorial">
        <div>
          <p className="eyebrow"><Archive size={14} aria-hidden="true" /> Memorial</p>
          <h2>Memorial dos Heróis</h2>
          <p>Este módulo não trata perda como estatística. Cada nome permanece no sistema.</p>
        </div>
      </header>
      {game.memorial.length ? (
        <div className="memorial-grid">
          {game.memorial.map((record) => <MemorialCard key={`${record.heroId}-${record.day}`} record={record} />)}
        </div>
      ) : (
        <EmptyState title="Nenhum nome no memorial. Que continue assim." text="A sala permanece silenciosa, limpa e esperando nunca precisar ser preenchida." icon={Archive} />
      )}
    </div>
  );
}
