import { Archive, Megaphone, Newspaper, RadioTower, ShieldAlert, Sparkles, UsersRound } from "lucide-react";
import { formatMoney, titleCase } from "../../utils/formatters";
import Button from "../common/Button";

const toneClass = (tone = "neutro") =>
  String(tone)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

const sectionCards = (newspaper) => [
  ["Cidade em alerta", newspaper.sections?.cityAlert, ShieldAlert],
  ["Herói em destaque", newspaper.sections?.heroSpotlight, Sparkles],
  ["Bairro sob pressão", newspaper.sections?.districtPressure, RadioTower],
  ["Facção em movimento", newspaper.sections?.factionMovement, Megaphone],
  ["Voz das ruas", newspaper.sections?.streetVoice, UsersRound],
  ["Nota do Comando", newspaper.sections?.commandNote, Newspaper],
].filter(([, text]) => Boolean(text));

export default function NewspaperModal({ newspaper, onClose }) {
  if (!newspaper) return null;

  const cards = sectionCards(newspaper);
  const secondary = newspaper.secondary ?? [];

  return (
    <div className="modal-backdrop newspaper-backdrop" role="presentation">
      <section className={`newspaper-modal newspaper-special tone-${toneClass(newspaper.tone)}`} role="dialog" aria-modal="true" aria-label={newspaper.name}>
        <header className="newspaper-masthead">
          <div>
            <p><Newspaper size={18} aria-hidden="true" /> {newspaper.name}</p>
            <h2>{newspaper.headline}</h2>
            <span>Dia {newspaper.day} · edição digital · tom {titleCase(newspaper.tone)}</span>
          </div>
          {secondary[0] ? <aside>{secondary[0]}</aside> : null}
        </header>

        <div className="newspaper-feature-strip">
          <span>Resolvidas <strong>{newspaper.indicators.resolved}</strong></span>
          <span>Falhas <strong>{newspaper.indicators.failures}</strong></span>
          <span>Civis salvos <strong>{newspaper.indicators.civiliansSaved}</strong></span>
          <span>Reputação <strong>{newspaper.indicators.reputation}/100</strong></span>
          <span>Saldo <strong>{formatMoney(newspaper.indicators.budgetDelta)}</strong></span>
        </div>

        <div className="newspaper-body editorial">
          <main className="newspaper-main">
            <section className="newspaper-lead-card">
              <p className="eyebrow">manchete principal</p>
              <h3>{newspaper.headline}</h3>
              <p>{secondary[1] ?? newspaper.opinion}</p>
            </section>

            {cards.length ? (
              <div className="newspaper-sections editorial-grid">
                {cards.map(([label, text, Icon]) => (
                  <article key={label}>
                    <Icon size={18} aria-hidden="true" />
                    <strong>{label}</strong>
                    <span>{text}</span>
                  </article>
                ))}
              </div>
            ) : null}
          </main>

          <aside className="newspaper-opinion editorial-note">
            <h3>Coluna de opinião</h3>
            <p>{newspaper.opinion}</p>
            <small>{newspaper.footer}</small>
          </aside>
        </div>

        <div className="newspaper-indicators compact">
          <span>Bairro em foco <strong>{newspaper.indicators.district}</strong></span>
          {newspaper.indicators.faction ? <span>Facção citada <strong>{newspaper.indicators.faction}</strong></span> : null}
          {secondary.slice(2, 5).map((headline) => <span key={headline}>Nota rápida <strong>{headline}</strong></span>)}
        </div>

        <footer className="newspaper-actions">
          <Button icon={Archive} onClick={onClose}>Arquivar e seguir</Button>
        </footer>
      </section>
    </div>
  );
}
