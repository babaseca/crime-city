export default function DesktopIcon({ icon: Icon, label, description, active, onClick }) {
  return (
    <button className={`desktop-icon ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <span className="desktop-icon__glyph">{Icon ? <Icon size={24} aria-hidden="true" /> : null}</span>
      <strong>{label}</strong>
      <small>{description}</small>
    </button>
  );
}
