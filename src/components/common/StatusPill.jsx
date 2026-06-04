export default function StatusPill({ status, children }) {
  const normalized = String(status ?? "neutro").replace(/\s+/g, "-").toLowerCase();

  return <span className={`status-pill status-${normalized}`}>{children ?? status}</span>;
}
