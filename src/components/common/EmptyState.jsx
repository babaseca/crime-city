export default function EmptyState({ title, text, icon: Icon }) {
  return (
    <div className="empty-state">
      {Icon ? <Icon size={28} aria-hidden="true" /> : null}
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
