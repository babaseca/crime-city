export default function MetricMiniCard({ label, value, tone = "default" }) {
  return (
    <span className={`metric-mini-card ${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}
