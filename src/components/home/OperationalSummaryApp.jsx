import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  HeartPulse,
  Map,
  MapPinned,
  RadioTower,
  ShieldAlert,
  Skull,
  Theater,
  UsersRound,
} from "lucide-react";
import { getMostDangerousDistricts } from "../../engine/districtSystem";
import { getMoraleTier } from "../../engine/teamMoraleSystem";
import { formatMoney } from "../../utils/formatters";

const activeStatuses = ["active_team", "assigned_by_command", "reformed_villain"];

const average = (values) => Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));

const mapPins = [
  { x: 39, y: 33, tone: "cyan" },
  { x: 64, y: 35, tone: "red" },
  { x: 34, y: 63, tone: "amber" },
];

const quickActions = [
  { id: "dispatch", title: "Ir para Despacho", detail: "alertas ativos", icon: RadioTower, tone: "danger" },
  { id: "schedule", title: "Ver Escala", detail: "heróis em plantão", icon: CalendarDays, tone: "info" },
  { id: "recruitment", title: "Abrir RH Heroico", detail: "candidatos novos", icon: UsersRound, tone: "purple" },
  { id: "reports", title: "Ler Relatórios", detail: "jornal do dia", icon: ClipboardList, tone: "green" },
  { id: "villains", title: "Arquivo de Vilões", detail: "em custódia", icon: Theater, tone: "amber" },
  { id: "base", title: "Infraestrutura", detail: "projetos ativos", icon: Building2, tone: "cyan" },
];

const severityLabel = (risk = 0) => {
  if (risk >= 5) return "Crítico";
  if (risk >= 4) return "Alto";
  return "Médio";
};

const narrativeBrief = (event, faction, district) => {
  const place = event?.bairro ?? district?.name ?? "Nova Aurora";
  const factionName = faction?.name ?? "uma facção oportunista";

  return `"${place} voltou a tensionar os canais da Central. ${factionName} parece testar limites enquanto a população espera uma resposta visível."`;
};

function PanelTitle({ icon: Icon, children }) {
  return (
    <header className="ops-panel-title">
      <p className="eyebrow"><Icon size={14} aria-hidden="true" /> {children}</p>
    </header>
  );
}

function TacticalCityMap({ districts, faction }) {
  const highlighted = districts.slice(0, 3);

  return (
    <div className="tactical-city-map">
      <svg viewBox="0 0 640 360" role="img" aria-label="Mapa tático de Nova Aurora">
        <defs>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g className="map-grid-lines">
          {Array.from({ length: 13 }).map((_, index) => (
            <path key={`h-${index}`} d={`M0 ${index * 30 + 5} C 160 ${index * 22}, 360 ${index * 34}, 640 ${index * 28 + 18}`} />
          ))}
          {Array.from({ length: 12 }).map((_, index) => (
            <path key={`v-${index}`} d={`M${index * 58 + 10} 0 C ${index * 48 + 35} 80, ${index * 70} 180, ${index * 54 + 20} 360`} />
          ))}
        </g>
        <path className="map-zone map-zone--blue" d="M148 92 L276 62 L368 112 L340 206 L220 235 L122 182 Z" />
        <path className="map-zone map-zone--red" d="M376 112 L510 88 L594 160 L536 248 L408 232 L340 202 Z" />
        <path className="map-zone map-zone--amber" d="M126 190 L226 238 L348 214 L394 288 L284 334 L122 300 Z" />
        <path className="map-core" d="M224 120 L352 108 L436 184 L378 280 L232 270 L156 188 Z" />
        {mapPins.map((pin, index) => (
          <g className={`map-pin map-pin--${pin.tone}`} filter="url(#softGlow)" key={pin.tone} transform={`translate(${pin.x * 6.4} ${pin.y * 3.6})`}>
            <circle r="5" />
            <circle r="17" />
          </g>
        ))}
      </svg>
      <div className="map-threat-labels">
        {highlighted.map((district, index) => (
          <article className={`map-threat-label map-threat-label--${index}`} key={district.id}>
            <strong>{district.name}</strong>
            <span>Perigo {district.dangerLevel}</span>
          </article>
        ))}
      </div>
      <div className="map-scanline" aria-hidden="true" />
      <span className="map-faction-chip">{faction?.name ?? "Sem facção dominante"}</span>
    </div>
  );
}

export default function OperationalSummaryApp({ game, onNavigate }) {
  const dangerousDistricts = getMostDangerousDistricts(game.districts ?? [], 3);
  const activeFaction = [...(game.factions ?? [])].sort((a, b) => (b.heat + b.threatLevel) - (a.heat + a.threatLevel))[0];
  const trustAverage = average((game.districts ?? []).map((district) => district.trustInCentral ?? 50));
  const activeHeroes = (game.heroes ?? []).filter((hero) => activeStatuses.includes(hero.teamStatus) && hero.status !== "morto");
  const onDuty = activeHeroes.filter((hero) => (hero.scheduleStatus ?? "on_duty") === "on_duty");
  const tired = activeHeroes.filter((hero) => (hero.fatigue ?? 0) >= 45 || (hero.estresse ?? 0) >= 62);
  const injured = activeHeroes.filter((hero) => hero.status === "ferido" || (hero.injuries ?? hero.ferimentos ?? []).length);
  const trainings = game.trainingAssignments ?? [];
  const activeEvents = [...(game.activeEvents ?? [])].sort((a, b) => (b.nivelRisco ?? 0) - (a.nivelRisco ?? 0)).slice(0, 4);
  const commandObjective = (game.commandObjectives ?? []).find((objective) => objective.status === "active");
  const morale = game.teamMorale ?? 60;
  const moraleTier = getMoraleTier(morale);
  const leadDistrict = dangerousDistricts[0];
  const leadEvent = activeEvents[0];
  const objectiveTitle = commandObjective?.label ?? `Reduzir influência da ${activeFaction?.name ?? "facção dominante"}`;
  const objectiveDescription =
    commandObjective?.description ??
    `A facção expandiu operações em ${leadDistrict?.name ?? "bairros estratégicos"} e exige uma resposta coordenada da Central.`;
  const objectiveProgress = Math.max(35, Math.min(68, 100 - (activeFaction?.heat ?? 55)));
  const objectiveDeadline = commandObjective?.deadlineDay ? Math.max(1, commandObjective.deadlineDay - game.day + 1) : 5;
  const activeVillains = (game.villains ?? []).filter((villain) => villain.status === "capturado" || villain.status === "custodia").length;
  const activeBaseProjects = (game.baseUpgrades ?? []).filter((upgrade) => upgrade.purchased || (upgrade.level ?? 0) > 0).length;
  const quickActionDetails = {
    dispatch: `${game.activeEvents?.length ?? 0} alertas ativos`,
    schedule: `${onDuty.length} em plantão`,
    recruitment: `${game.applicants?.length ?? 0} candidatos novos`,
    reports: "Jornal do dia",
    villains: `${activeVillains} em custódia`,
    base: `${activeBaseProjects} projetos ativos`,
  };

  return (
    <div className="home-app ops-dashboard">
      <section className="ops-hero">
        <p>Bom dia, Coordenador.</p>
        <h1>Aqui está a situação de Nova Aurora hoje.</h1>
        <span>Escolha onde focar sua atenção.</span>
      </section>

      <div className="ops-command-grid">
        <section className="ops-panel ops-panel--city">
          <PanelTitle icon={MapPinned}>Situação da Cidade</PanelTitle>
          <div className="ops-alert-line">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>Tensão elevada</span>
          </div>
          <TacticalCityMap districts={dangerousDistricts} faction={activeFaction} />
          <div className="city-metrics-strip">
            <article>
              <span>Confiança média</span>
              <strong>{trustAverage}</strong>
              <small>{trustAverage >= 58 ? "Estável" : "Instável"}</small>
            </article>
            <article>
              <span>Bairros críticos</span>
              <strong>{dangerousDistricts.length}</strong>
              <small>Monitorados</small>
            </article>
            <article>
              <span>Facção mais ativa</span>
              <strong>{activeFaction?.name ?? "Sem leitura"}</strong>
              <small>Calor {activeFaction?.heat ?? 0}</small>
            </article>
          </div>
          <button className="ops-wide-button" onClick={() => onNavigate("city")} type="button">
            <Map size={17} aria-hidden="true" />
            <span>Ver mapa completo</span>
          </button>
        </section>

        <section className="ops-panel ops-panel--priority">
          <div className="priority-mark" aria-hidden="true"><ShieldAlert size={70} /></div>
          <div className="priority-copy">
            <PanelTitle icon={ShieldAlert}>Prioridade do Comando</PanelTitle>
            <h2>{objectiveTitle}</h2>
            <p>{objectiveDescription}</p>
            <div className="priority-progress">
              <span>Progresso do objetivo</span>
              <div><i style={{ width: `${objectiveProgress}%` }} /></div>
              <strong>{objectiveProgress}%</strong>
            </div>
          </div>
          <aside className="priority-reward">
            <span>Prazo</span>
            <strong>{objectiveDeadline} dias</strong>
            <span>Recompensa</span>
            <strong className="reward-good">{formatMoney(commandObjective?.reward?.budget ?? 20000)}</strong>
            <em>+{commandObjective?.reward?.reputation ?? 15} Reputação</em>
            <span>Penalidade</span>
            <strong className="reward-bad">-25 Reputação</strong>
          </aside>
        </section>

        <section className="ops-panel ops-panel--team">
          <PanelTitle icon={UsersRound}>Situação da Equipe</PanelTitle>
          <div className="team-status-list">
            <article><span className="status-dot status-dot--green"><UsersRound size={16} /></span><p>Em plantão</p><strong>{onDuty.length} heróis</strong></article>
            <article><span className="status-dot status-dot--amber"><AlertTriangle size={16} /></span><p>Cansados</p><strong>{tired.length} herói</strong></article>
            <article><span className="status-dot status-dot--red"><HeartPulse size={16} /></span><p>Feridos</p><strong>{injured.length} herói</strong></article>
            <article><span className="status-dot status-dot--blue"><UsersRound size={16} /></span><p>Em treinamento</p><strong>{trainings.length} herói</strong></article>
            <article className="team-morale-row">
              <span className="status-dot"><ShieldAlert size={16} /></span>
              <p>Moral da equipe</p>
              <strong>{morale} <small>{moraleTier.label}</small></strong>
              <div><i style={{ width: `${morale}%` }} /></div>
            </article>
          </div>
        </section>

        <section className="ops-panel ops-panel--narrative">
          <PanelTitle icon={FileBarChart}>Resumo Narrativo</PanelTitle>
          <blockquote>{narrativeBrief(leadEvent, activeFaction, leadDistrict)}</blockquote>
          <p>— Análise da Central, 07:10</p>
        </section>
      </div>

      <section className="ops-panel ops-quick-actions">
        <PanelTitle icon={RadioTower}>Ações Rápidas</PanelTitle>
        <div className="quick-action-grid">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button className={`quick-action-card quick-action-card--${action.tone}`} key={action.id} onClick={() => onNavigate(action.id)} type="button">
                <span><Icon size={34} aria-hidden="true" /></span>
                <strong>{action.title}</strong>
                <small>{quickActionDetails[action.id] ?? action.detail}</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="ops-bottom-grid">
        <section className="ops-panel ops-event-list">
          <PanelTitle icon={AlertTriangle}>Eventos e Alertas</PanelTitle>
          {activeEvents.map((event) => (
            <button key={event.id} onClick={() => onNavigate("dispatch")} type="button">
              <AlertTriangle size={20} aria-hidden="true" />
              <span>{event.titulo}</span>
              <strong>{severityLabel(event.nivelRisco ?? event.risco)}</strong>
            </button>
          ))}
        </section>

        <section className="ops-panel ops-next-events">
          <PanelTitle icon={CalendarDays}>Próximos Eventos</PanelTitle>
          <article><CalendarDays size={18} /><span><strong>Reunião com o Comando</strong><small>Amanhã, 09:00</small></span></article>
          <article><ClipboardList size={18} /><span><strong>Avaliar progresso da reforma</strong><small>Dia {game.day + 1}</small></span></article>
          <article><Skull size={18} /><span><strong>Pagamento de manutenção da base</strong><small>Dia {game.day + 2}</small></span></article>
        </section>
      </div>
    </div>
  );
}
