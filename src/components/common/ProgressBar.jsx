const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export default function ProgressBar({ value, tone = "default", label }) {
  return (
    <span className={`progress-bar ${tone}`} aria-label={label} role="meter" aria-valuenow={clamp(value)}>
      <span style={{ width: `${clamp(value)}%` }} />
    </span>
  );
}
