import Modal from "../common/Modal";
import ProgressBar from "../common/ProgressBar";

export default function ApplicantDetailsModal({ applicant, onClose }) {
  if (!applicant) return null;

  return (
    <Modal title={applicant.codinome} eyebrow="Currículo completo" onClose={onClose}>
      <div className="profile-modal-grid">
        <img src={applicant.imageUrl} alt="" />
        <section>
          <h3>{applicant.nomeCivil}</h3>
          <p>{applicant.biografia}</p>
          <p><strong>Poder:</strong> {applicant.poder}</p>
          <p><strong>Informação revelada:</strong> {applicant.revealedInfo ?? "Entrevista pendente."}</p>
        </section>
      </div>
      <div className="attribute-grid">
        {Object.entries(applicant.atributos).map(([attribute, value]) => (
          <div key={attribute}>
            <span>{attribute}</span>
            <strong>{value}</strong>
            <ProgressBar value={value * 10} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
