import { X } from "lucide-react";
import Button from "./Button";

export default function Modal({ title, eyebrow, children, onClose, size = "medium" }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`modal-shell ${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2>{title}</h2>
          </div>
          <Button variant="ghost" icon={X} onClick={onClose}>
            Fechar
          </Button>
        </header>
        <div className="modal-content">{children}</div>
      </section>
    </div>
  );
}
