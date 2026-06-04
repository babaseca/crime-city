export default function MissionHistoryTable({ missions }) {
  return (
    <div className="mission-history-table">
      <div className="table-head">
        <span>Dia</span>
        <span>Ocorrência</span>
        <span>Equipe</span>
        <span>Resultado</span>
      </div>
      {missions.slice().reverse().slice(0, 18).map((mission) => (
        <div className="table-row" key={mission.id}>
          <span>{mission.day}</span>
          <span>{mission.event.titulo}</span>
          <span>{mission.heroNames.length ? mission.heroNames.join(", ") : "sem equipe"}</span>
          <span className={mission.success ? "positive" : "negative"}>{mission.outcome}</span>
        </div>
      ))}
    </div>
  );
}
