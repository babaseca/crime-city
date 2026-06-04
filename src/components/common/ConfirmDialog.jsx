import { AlertTriangle } from "lucide-react";
import Button from "./Button";
import Modal from "./Modal";

export default function ConfirmDialog({ title, message, confirmLabel = "Confirmar", onConfirm, onCancel }) {
  return (
    <Modal title={title} eyebrow="Confirmação" onClose={onCancel} size="small">
      <div className="confirm-body">
        <AlertTriangle size={28} aria-hidden="true" />
        <p>{message}</p>
      </div>
      <div className="modal-actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
