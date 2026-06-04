import { HeartCrack } from "lucide-react";

export default function MemorialCard({ record }) {
  return (
    <article className="memorial-card">
      <img src={record.imageUrl} alt="" />
      <div>
        <p className="eyebrow"><HeartCrack size={14} aria-hidden="true" /> Dia {record.day}</p>
        <h3>{record.codinome}</h3>
        <p>{record.nomeCivil}</p>
        <blockquote>“{record.lastLine}”</blockquote>
        <p>{record.legacy}</p>
        <strong>Missão final: {record.finalMission}</strong>
      </div>
    </article>
  );
}
