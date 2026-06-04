export default function Card({ children, className = "", as: Tag = "section" }) {
  return <Tag className={`panel-card ${className}`.trim()}>{children}</Tag>;
}
