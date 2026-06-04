import { ShieldAlert } from "lucide-react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import ProgressBar from "../common/ProgressBar";

export default function VillainDetailsModal({ villain, onClose, onInterrogate, onReform, onContain, onMax }) {
  if (!villain) return null;

  return (
    <Modal title={villain.alcunha} eyebrow="Dossiê de vilão" onClose={onClose} size="large">
      <div className="profile-modal-grid">
        <img src={villain.imageUrl} alt="" />
        <section>
          <h3>{villain.nome}</h3>
          <p><strong>Recursos:</strong> {villain.poderesRecursos}</p>
          <p><strong>Crimes conhecidos:</strong> {villain.crimesConhecidos.join(", ")}</p>
          <p><strong>Personalidade:</strong> {villain.personalidade.join(", ")}</p>
          <p><strong>Estado atual:</strong> {villain.status ?? villain.estadoAtual}</p>
          <p><strong>Julgamento:</strong> {villain.trialStatus ?? "sem processo"} · <strong>Custódia:</strong> nível {villain.prisonSecurityLevel ?? 1}</p>
          <p><strong>Rancor contra a Central:</strong> {villain.grudgeAgainstCentral ?? 0}/100</p>
          {villain.informante ? <p className="revealed-info">Informante ativo: pode destravar eventos futuros.</p> : null}
        </section>
      </div>

      <div className="villain-detail-bars">
        <span>Chance de reforma <ProgressBar value={villain.chanceReforma} tone="compat" /></span>
        <span>Progresso de reforma <ProgressBar value={villain.reformProgress ?? 0} tone="compat" /></span>
        <span>Risco de fuga <ProgressBar value={villain.riscoFuga} tone="death" /></span>
      </div>

      <div className="card-actions modal-action-row">
        <Button variant="secondary" onClick={() => onInterrogate(villain.id)}>Interrogar</Button>
        <Button onClick={() => onReform(villain.id)}>Tentar reformar</Button>
        <Button variant="secondary" onClick={() => onContain(villain.id)}>Manter preso</Button>
        <Button variant="danger" icon={ShieldAlert} onClick={() => onMax(villain.id)}>Segurança máxima</Button>
      </div>

      <section className="timeline-list">
        <h3>Histórico de encontros</h3>
        {villain.historicoEncontros.length ? villain.historicoEncontros.map((item, index) => (
          <p key={`${item.day}-${index}`}><span>Dia {item.day} · {item.eventTitle}</span><strong>{item.result}</strong></p>
        )) : <p className="muted">Nenhum encontro registrado ainda.</p>}
      </section>
    </Modal>
  );
}
