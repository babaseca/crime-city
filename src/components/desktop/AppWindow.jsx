import { Minus, X } from "lucide-react";

export default function AppWindow({ app, children, onClose }) {
  if (!app) return null;
  const Icon = app.icon;

  return (
    <section className={`app-window app-${app.id}`}>
      <header className="app-window__header">
        <div className="window-title">
          <span>{Icon ? <Icon size={18} aria-hidden="true" /> : null}</span>
          <div>
            <strong>{app.title}</strong>
            <small>{app.subtitle}</small>
          </div>
        </div>
        <div className="window-controls">
          <button type="button" onClick={onClose} aria-label="Minimizar janela">
            <Minus size={15} aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar janela">
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="app-window__body">{children}</div>
    </section>
  );
}
