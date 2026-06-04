export default function InfluenceBar({ value, label, tone = "default" }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <span className={`influence-bar ${tone}`}>
      <span className="influence-bar__label">{label}</span>
      <span className="influence-bar__track"><span style={{ width: `${safeValue}%` }} /></span>
      <strong>{safeValue}</strong>
    </span>
  );
}
