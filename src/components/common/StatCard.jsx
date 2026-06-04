export default function StatCard({ icon: Icon, label, value, tone = "neutral" }) {
  return (
    <section className={`stat-tile ${tone}`}>
      {Icon ? <Icon size={18} aria-hidden="true" /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}
