import { useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, MapPinned, RadioTower, ShieldAlert } from "lucide-react";
import { isMissionAvailableHero } from "../../engine/gameState";
import { calculateMissionChance } from "../../engine/mission";
import { cityOverviewVisual, getOccurrenceVisual } from "../../data/occurrenceVisuals";
import { formatFactionName } from "../../utils/formatters";
import AlertCard from "./AlertCard";
import AlertDetails from "./AlertDetails";
import HeroSelectionPanel from "./HeroSelectionPanel";

const sortHeroes = (heroes) => {
  const order = { disponivel: 0, cansado: 1, ferido: 2, sobrecarregado: 3, exausto: 4, reserva: 5, morto: 6 };
  return [...heroes].sort((first, second) => (order[first.status] ?? 8) - (order[second.status] ?? 8) || first.codinome.localeCompare(second.codinome));
};

const mapPositions = [
  { left: 22, top: 33 },
  { left: 48, top: 42 },
  { left: 74, top: 28 },
  { left: 64, top: 66 },
  { left: 84, top: 58 },
];

const alertTone = (event) => {
  if ((event?.nivelRisco ?? 0) >= 4) return "danger";
  if ((event?.dificuldade ?? 0) >= 62) return "warn";
  return "info";
};

export default function DispatchApp({ game, onDispatch }) {
  const [focusedEventId, setFocusedEventId] = useState(game.activeEvents[0]?.id ?? null);
  const [selectedByEvent, setSelectedByEvent] = useState({});
  const [mobileTab, setMobileTab] = useState("alerts");
  const [dispatching, setDispatching] = useState(false);
  const focusedEvent = game.activeEvents.find((event) => event.id === focusedEventId) ?? game.activeEvents[0] ?? null;
  const activeFocusedId = focusedEvent?.id ?? null;
  const heroById = useMemo(() => new Map(game.heroes.map((hero) => [hero.id, hero])), [game.heroes]);
  const selectedIds = activeFocusedId ? selectedByEvent[activeFocusedId] ?? [] : [];
  const team = selectedIds.map((heroId) => heroById.get(heroId)).filter(Boolean);
  const visibleHeroes = sortHeroes(
    game.heroes.filter(
      (hero) =>
        hero.isAlphaActive &&
        ["active_team", "assigned_by_command", "reformed_villain"].includes(hero.teamStatus) &&
        hero.status !== "morto" &&
        (hero.scheduleStatus ?? "on_duty") === "on_duty",
    ),
  );
  const preview = focusedEvent && team.length
    ? calculateMissionChance(focusedEvent, team, game.relationships, game.dispatcher, game.baseUpgrades, {
        teamMorale: game.teamMorale,
        unlockedCombos: game.unlockedCombos,
      })
    : null;
  const eventPreviews = useMemo(() => {
    return new Map(
      game.activeEvents.map((event) => {
        const selected = (selectedByEvent[event.id] ?? []).map((heroId) => heroById.get(heroId)).filter(Boolean);
        return [
          event.id,
          selected.length
            ? calculateMissionChance(event, selected, game.relationships, game.dispatcher, game.baseUpgrades, {
                teamMorale: game.teamMorale,
                unlockedCombos: game.unlockedCombos,
              })
            : null,
        ];
      }),
    );
  }, [game.activeEvents, game.baseUpgrades, game.dispatcher, game.relationships, game.teamMorale, game.unlockedCombos, heroById, selectedByEvent]);

  const toggleHero = (heroId) => {
    if (!activeFocusedId) return;
    setSelectedByEvent((current) => {
      const selected = current[activeFocusedId] ?? [];
      const nextSelected = selected.includes(heroId)
        ? selected.filter((id) => id !== heroId)
        : selected.length < 3
          ? [...selected, heroId]
          : selected;

      return { ...current, [activeFocusedId]: nextSelected };
    });
  };

  const sendMission = async () => {
    if (!activeFocusedId || team.length === 0 || dispatching) return;
    setDispatching(true);
    const mission = await onDispatch(activeFocusedId, selectedIds);
    setDispatching(false);
    if (!mission) return;
    setSelectedByEvent((current) => {
      const next = { ...current };
      delete next[activeFocusedId];
      return next;
    });
    const nextEvent = game.activeEvents.find((event) => event.id !== activeFocusedId);
    setFocusedEventId(nextEvent?.id ?? null);
  };

  const criticalCount = game.activeEvents.filter((event) => (event.nivelRisco ?? 0) >= 4).length;
  const watchCount = game.activeEvents.filter((event) => (event.nivelRisco ?? 0) === 3).length;
  const stableCount = Math.max(0, game.activeEvents.length - criticalCount - watchCount);

  return (
    <div className="dispatch-app dispatch-ops">
      <header className="dispatch-ops-hero">
        <div>
          <p className="eyebrow"><RadioTower size={14} aria-hidden="true" /> Central de Alertas</p>
          <h2>Painel de ocorrências</h2>
        </div>
        <div className="dispatch-ops-signal" aria-hidden="true" />
      </header>

      <section className="dispatch-map-strip">
        <div className="dispatch-map-copy">
          <strong>Nova Aurora</strong>
          <button type="button">Ver mapa completo <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
        <div className="dispatch-city-map" aria-label="Mapa tático de ocorrências">
          <img className="dispatch-city-map__photo" src={cityOverviewVisual.src} alt="" aria-hidden="true" />
          <div className="dispatch-city-map__wash" aria-hidden="true" />
          <svg viewBox="0 0 1000 220" aria-hidden="true">
            <path d="M0 170 C150 118 280 205 440 136 S710 104 1000 150" />
            <path d="M80 58 C230 98 370 70 500 118 S760 180 960 80" />
            <path d="M30 120 H970 M145 22 V202 M300 16 V210 M455 28 V196 M610 10 V208 M770 25 V194 M910 18 V210" />
          </svg>
          {game.activeEvents.slice(0, 5).map((event, index) => {
            const position = mapPositions[index] ?? mapPositions[0];
            return (
              <button
                className={`dispatch-map-pin dispatch-map-pin--${alertTone(event)} ${event.id === activeFocusedId ? "active" : ""}`}
                key={event.id}
                onClick={() => setFocusedEventId(event.id)}
                style={{ left: `${position.left}%`, top: `${position.top}%` }}
                type="button"
              >
                <ShieldAlert size={16} aria-hidden="true" />
                <span>{event.bairro}</span>
              </button>
            );
          })}
        </div>
        <div className="dispatch-alert-stats">
          <article><strong>{game.activeEvents.length}</strong><span>alertas ativos</span></article>
          <article><strong>{watchCount}</strong><span>em observação</span></article>
          <article><strong>{stableCount}</strong><span>setor estável</span></article>
        </div>
      </section>

      <div className="mobile-tabs dispatch-mobile-tabs">
        {["alerts", "details", "team"].map((tab) => (
          <button className={mobileTab === tab ? "active" : ""} key={tab} onClick={() => setMobileTab(tab)} type="button">
            {tab === "alerts" ? "Radar" : tab === "details" ? "Ocorrência" : "Equipe"}
          </button>
        ))}
      </div>

      <div className="dispatch-ops-layout">
        <section className={`dispatch-radar-panel mobile-panel ${mobileTab === "alerts" ? "active" : ""}`}>
          <header className="dispatch-panel-title">
            <div>
              <p className="eyebrow"><Activity size={13} aria-hidden="true" /> Radar de ocorrências</p>
              <h3>{game.activeEvents.length} alertas</h3>
            </div>
            <button type="button" aria-label="Filtrar ocorrências"><ShieldAlert size={15} aria-hidden="true" /></button>
          </header>
          <div className="alert-list dispatch-radar-list">
            {game.activeEvents.map((event) => {
              const selectedHeroes = (selectedByEvent[event.id] ?? []).map((heroId) => heroById.get(heroId)).filter(Boolean);
              return (
                <AlertCard
                  active={event.id === activeFocusedId}
                  event={event}
                  key={event.id}
                  onSelect={(eventId) => {
                    setFocusedEventId(eventId);
                    setMobileTab("details");
                  }}
                  preview={eventPreviews.get(event.id)}
                  selectedHeroes={selectedHeroes}
                />
              );
            })}
          </div>
        </section>

        <div className={`dispatch-selected-panel mobile-panel ${mobileTab === "details" ? "active" : ""}`}>
          <AlertDetails event={focusedEvent} game={game} preview={preview} relationships={game.relationships} team={team} />
        </div>

        <div className={`dispatch-team-panel mobile-panel ${mobileTab === "team" ? "active" : ""}`}>
          <HeroSelectionPanel
            dispatching={dispatching}
            event={focusedEvent}
            game={game}
            heroes={visibleHeroes}
            isMissionAvailable={isMissionAvailableHero}
            onSend={sendMission}
            onToggleHero={toggleHero}
            preview={preview}
            relationships={game.relationships}
            selectedIds={selectedIds}
          />
        </div>

        <section className="dispatch-live-feed">
          <header>
            <p className="eyebrow"><AlertTriangle size={13} aria-hidden="true" /> Feed operacional ao vivo</p>
            <button type="button">Filtrar</button>
          </header>
          <div>
            {game.activeEvents.slice(0, 3).map((event, index) => (
              <article key={`feed-${event.id}`}>
                <span className="feed-event-thumb"><img src={getOccurrenceVisual(event).src} alt="" /></span>
                <div>
                  <time>{String(12 - index).padStart(2, "0")}:{index ? "27" : "32"}</time>
                  <strong>{event.bairro}</strong>
                  <p>
                    {event.factionId ? formatFactionName(event.factionId, game.factions) : "Sensores civis"} reporta movimentação ligada a {event.titulo.toLowerCase()}.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
