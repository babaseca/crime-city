import { formatStatusLabel, normalizeDisplayText } from "../../utils/formatters";
import ProgressBar from "../common/ProgressBar";
import StatusPill from "../common/StatusPill";

export default function HeroCard({ hero, onClick }) {
  return (
    <button className="database-hero-card" type="button" onClick={() => onClick(hero)}>
      <img src={hero.imageUrl} alt="" />
      <span>
        <strong>{hero.codinome}</strong>
        <small>{normalizeDisplayText(hero.publicImage ?? hero.nomeCivil)} · fama {hero.fame ?? 0}</small>
      </span>
      <StatusPill status={hero.status}>{formatStatusLabel(hero.status)}</StatusPill>
      <span className="database-bars">
        Energia <ProgressBar value={hero.energia} tone="energy" />
        Estresse <ProgressBar value={hero.estresse} tone="stress" />
        Moral <ProgressBar value={hero.moral ?? 70} tone="compat" />
      </span>
    </button>
  );
}
