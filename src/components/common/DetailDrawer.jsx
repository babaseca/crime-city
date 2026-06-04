import { X } from "lucide-react";
import Button from "./Button";

export default function DetailDrawer({ title, eyebrow, children, onClose }) {
  if (!title) return null;

  return (
    <aside className="detail-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <header>
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        <Button variant="ghost" icon={X} onClick={onClose}>Fechar</Button>
      </header>
      <div className="detail-drawer__body">{children}</div>
    </aside>
  );
}
