import { useMemo, useState } from "react";
import { isMissionAvailableHero } from "../../engine/gameState";
import { calculateMissionChance } from "../../engine/mission";
import AlertCard from "./AlertCard";
import AlertDetails from "./AlertDetails";
import HeroSelectionPanel from "./HeroSelectionPanel";

const sortHeroes = (heroes) => {
  const order = { disponivel: 0, cansado: 1, ferido: 2, sobrecarregado: 3, exausto: 4, reserva: 5, morto: 6 };
  return [...heroes].sort((first, second) => (order[first.status] ?? 8) - (order[second.status] ?? 8) || first.codinome.localeCompare(second.codinome));
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

  const visibleHeroes = sortHeroes(
    game.heroes.filter(
      (hero) =>
        ["active_team", "assigned_by_command", "reformed_villain"].includes(hero.teamStatus) && hero.status !== "morto" && (hero.scheduleStatus ?? "on_duty") === "on_duty",
    ),
  );

  return (
    <div className="dispatch-app">
      <section className="dispatch-command-strip">
        <div>
          <p className="eyebrow">módulo de ação</p>
          <h2>Despacho do dia</h2>
          <span>Escolha uma ocorrência, monte uma equipe enxuta e confira o risco antes de abrir o rádio.</span>
        </div>
        <div className="dispatch-command-metrics">
          <strong>{game.activeEvents.length}</strong>
          <span>alertas ativos</span>
        </div>
      </section>
      <div className="mobile-tabs">
        {["alerts", "details", "team"].map((tab) => (
          <button className={mobileTab === tab ? "active" : ""} key={tab} onClick={() => setMobileTab(tab)} type="button">
            {tab === "alerts" ? "Alertas" : tab === "details" ? "Detalhes" : "Equipe"}
          </button>
        ))}
      </div>
      <div className="dispatch-layout">
        <section className={`alerts-column mobile-panel ${mobileTab === "alerts" ? "active" : ""}`}>
          <header className="section-header">
            <div>
              <p className="eyebrow">despacho</p>
              <h2>Alertas ativos</h2>
            </div>
            <strong>{game.activeEvents.length}</strong>
          </header>
          <div className="alert-list">
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
        <div className={`mobile-panel ${mobileTab === "details" ? "active" : ""}`}>
          <AlertDetails dispatching={dispatching} event={focusedEvent} game={game} onSend={sendMission} preview={preview} relationships={game.relationships} team={team} />
        </div>
        <div className={`mobile-panel ${mobileTab === "team" ? "active" : ""}`}>
          <HeroSelectionPanel heroes={visibleHeroes} isMissionAvailable={isMissionAvailableHero} onToggleHero={toggleHero} selectedIds={selectedIds} />
        </div>
      </div>
    </div>
  );
}
