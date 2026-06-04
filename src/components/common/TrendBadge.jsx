export default function TrendBadge({ trend }) {
  return <span className={`trend-badge trend-${String(trend).replaceAll(" ", "-")}`}>{trend}</span>;
}
