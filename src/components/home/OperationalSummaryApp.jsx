import { AlertTriangle, CalendarClock, FileBarChart, HeartPulse, MapPinned, RadioTower, ShieldAlert, Skull, UsersRound } from "lucide-react";
import Button from "../common/Button";
import ProgressBar from "../common/ProgressBar";
import RiskBadge from "../common/RiskBadge";
import { getMostDangerousDistricts } from "../../engine/districtSystem";
import { formatMoney, formatStatusLabel } from "../../utils/formatters";

const activeStatuses = ["active_team", "assigned_by_command", "reformed_villain"];

const average = (values) => Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));

const cityBriefing = (game, dangerousDistricts, faction) => {
  const morale = game.teamMorale ?? 60;
  const alertCount = game.activeEvents?.length ?? 0;
  const district = dangerousDistricts[0]?.name ?? "Nova Aurora";
  const factionName = faction?.name ?? "nenhuma facção dominante";

  if (game.reputation < 35) {
    return `A cidade acordou desconfiada. ${district} concentra pressão, ${factionName} observa brechas e a equipe precisa escolher respostas visíveis sem queimar quem já está cansado.`;
  }

  if (morale < 42) {
    return `O rádio está estável, mas a equipe não. Há ${alertCount} alerta(s) no dia e a prioridade real talvez seja preservar gente antes de preservar estatística.`;
  }

  if (alertCount <= 2) {
    return `Plantão administrável por enquanto. ${district} merece atenção, mas ainda há espaço para cuidar da escala, entrevistar candidatos e mexer na infraestrutura.`;
  }

  return `Nova Aurora está barulhenta hoje: ${alertCount} ocorrências ativas, ${district} no limite e sinais de movimento ligados a ${factionName}. Escolha o primeiro despacho com calma.`;
};

export default function OperationalSummaryApp({ game, onNavigate }) {
  const dangerousDistricts = getMostDangerousDistricts(game.districts ?? [], 3);
  const activeFaction = [...(game.factions ?? [])].sort((a, b) => (b.heat + b.threatLevel) - (a.heat + a.threatLevel))[0];
  const trustAverage = average((game.districts ?? []).map((district) => district.trustInCentral ?? 50));
  const activeHeroes = (game.heroes ?? []).filter((hero) => activeStatuses.includes(hero.teamStatus) && hero.status !== "morto");
  const onDuty = activeHeroes.filter((hero) => (hero.scheduleStatus ?? "on_duty") === "on_duty");
  const tired = activeHeroes.filter((hero) => (hero.fatigue ?? 0) >= 45 || (hero.estresse ?? 0) >= 62);
  const injured = activeHeroes.filter((hero) => hero.status === "ferido" || (hero.injuries ?? hero.ferimentos ?? []).length);
  const trainings = game.trainingAssignments ?? [];
  const commandObjective = (game.commandObjectives ?? []).find((objective) => objective.status === "active");
  const briefing = cityBriefing(game, dangerousDistricts, activeFaction);

  return (
    <div className="home-app">
      <section className="home-briefing-card">
        <div>
          <p className="eyebrow">painel do plantão</p>
          <h2>Central Hoje</h2>
          <p>{briefing}</p>
        </div>
        <div className="home-briefing-actions">
          <Button icon={RadioTower} onClick={() => onNavigate("dispatch")}>Ir para Despacho</Button>
          <Button variant="secondary" icon={CalendarClock} onClick={() => onNavigate("schedule")}>Ver Escala</Button>
        </div>
      </section>

      <div className="home-grid">
        <section className="home-panel city-state">
          <header>
            <p className="eyebrow"><MapPinned size={14} aria-hidden="true" /> Situação da cidade</p>
            <strong>{game.activeEvents?.length ?? 0} alertas hoje</strong>
          </header>
          <div className="home-metric-row">
            <span>Confiança média</span>
            <strong>{trustAverage}%</strong>
          </div>
          <ProgressBar value={trustAverage} tone="compat" />
          <div className="pressure-list">
            {dangerousDistricts.map((district) => (
              <article key={district.id}>
                <span>
                  <strong>{district.name}</strong>
                  <small>Crime {district.crimeLevel} · estabilidade {district.stability}</small>
                </span>
                <RiskBadge label={`Perigo ${district.dangerLevel}`} level={district.dangerLevel >= 75 ? 5 : district.dangerLevel >= 60 ? 4 : 3} />
              </article>
            ))}
          </div>
          <div className="home-callout">
            <ShieldAlert size={16} aria-hidden="true" />
            <span>Facção em evidência: <strong>{activeFaction?.name ?? "Sem leitura dominante"}</strong></span>
          </div>
        </section>

        <section className="home-panel team-state">
          <header>
            <p className="eyebrow"><UsersRound size={14} aria-hidden="true" /> Situação da equipe</p>
            <strong>Moral {game.teamMorale ?? 60}</strong>
          </header>
          <div className="home-stat-grid">
            <span><strong>{onDuty.length}</strong> em plantão</span>
            <span><strong>{tired.length}</strong> cansados</span>
            <span><strong>{injured.length}</strong> feridos</span>
            <span><strong>{trainings.length}</strong> treinos</span>
          </div>
          <ProgressBar value={game.teamMorale ?? 60} tone="compat" label="Moral coletiva" />
          <div className="compact-roster">
            {activeHeroes.slice(0, 4).map((hero) => (
              <article key={hero.id}>
                <img src={hero.imageUrl} alt="" />
                <span>
                  <strong>{hero.codinome}</strong>
                  <small>{formatStatusLabel(hero.scheduleStatus ?? "on_duty")} · fadiga {hero.fatigue ?? 0}</small>
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="home-panel command-state">
          <header>
            <p className="eyebrow"><AlertTriangle size={14} aria-hidden="true" /> Prioridade do Comando</p>
            <strong>{commandObjective ? `Dia ${commandObjective.deadlineDay}` : "Sem ordem crítica"}</strong>
          </header>
          {commandObjective ? (
            <article className="objective-summary">
              <h3>{commandObjective.label}</h3>
              <p>{commandObjective.description ?? "O Comando quer resultado visível antes que a cobrança vire manchete."}</p>
              <div>
                <span>Recompensa: <strong>{formatMoney(commandObjective.reward?.budget ?? 0)}</strong></span>
                <span>Reputação: <strong>{commandObjective.reward?.reputation ?? 0}</strong></span>
              </div>
            </article>
          ) : (
            <p className="muted">A chefia ainda não enviou uma prioridade formal. Isso raramente dura.</p>
          )}
        </section>

        <section className="home-panel action-state">
          <header>
            <p className="eyebrow"><FileBarChart size={14} aria-hidden="true" /> Ações rápidas</p>
            <strong>Escolha o próximo foco</strong>
          </header>
          <div className="quick-actions">
            <button onClick={() => onNavigate("dispatch")} type="button"><RadioTower size={18} /> Despacho</button>
            <button onClick={() => onNavigate("recruitment")} type="button"><HeartPulse size={18} /> RH Heroico</button>
            <button onClick={() => onNavigate("reports")} type="button"><FileBarChart size={18} /> Jornal/Relatórios</button>
            <button onClick={() => onNavigate("villains")} type="button"><Skull size={18} /> Arquivo de Vilões</button>
          </div>
        </section>
      </div>
    </div>
  );
}
