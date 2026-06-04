export default function ObjectiveCard({ objective }) {
  if (!objective) return null;

  return (
    <article className="objective-card">
      <span>{objective.status}</span>
      <strong>{objective.label}</strong>
      <small>Prazo: dia {objective.deadlineDay}</small>
    </article>
  );
}
