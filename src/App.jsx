import { useEffect, useMemo, useState } from "react";
import { Database, HardDriveDownload, RotateCcw, Save, ShieldCheck, UserCog } from "lucide-react";
import { activeEventCount } from "./data/eventCatalog";
import BaseInfrastructureApp from "./components/base/BaseInfrastructureApp";
import CityMapApp from "./components/city/CityMapApp";
import TerminalScreen from "./components/desktop/TerminalScreen";
import CommandHubLayout from "./layouts/CommandHubLayout";
import CommandApp from "./components/command/CommandApp";
import ConfirmDialog from "./components/common/ConfirmDialog";
import Button from "./components/common/Button";
import ObjectiveCard from "./components/common/ObjectiveCard";
import StatCard from "./components/common/StatCard";
import DispatchApp from "./components/dispatch/DispatchApp";
import MissionResultModal from "./components/dispatch/MissionResultModal";
import FactionApp from "./components/factions/FactionApp";
import HeroDatabaseApp from "./components/heroes/HeroDatabaseApp";
import OperationalSummaryApp from "./components/home/OperationalSummaryApp";
import MemorialApp from "./components/memorial/MemorialApp";
import NewspaperModal from "./components/news/NewspaperModal";
import RecruitmentApp from "./components/recruitment/RecruitmentApp";
import ReportsApp from "./components/reports/ReportsApp";
import ScheduleApp from "./components/schedule/ScheduleApp";
import DispatcherSetup from "./components/setup/DispatcherSetup";
import SocialFeedApp from "./components/social/SocialFeedApp";
import TrainingApp from "./components/training/TrainingApp";
import VillainArchiveApp from "./components/villains/VillainArchiveApp";
import { applyDispatcherUpgrade, dispatcherAttributeLabels, dispatcherUpgrades } from "./engine/dispatcherSystem";
import { clearSavedGame, hasSavedGame, loadGame, saveGame } from "./engine/saveSystem";
import { createInitialGameState, dispatchTeamToEvent, endDay, hydrateGameState } from "./engine/gameState";

function SettingsApp({ game, onSave, onClearSave, onReset, onUpgrade }) {
  const dispatcher = game.dispatcher;

  return (
    <div className="settings-app">
      <header className="module-hero">
        <div>
          <p className="eyebrow">Configurações</p>
          <h2>Sistema operacional da Central</h2>
          <p>Gerencie o save local, reinicie o plantão ou confira a versão do simulador.</p>
        </div>
      </header>
      <div className="stats-grid compact">
        <StatCard icon={Database} label="Eventos no banco" value={activeEventCount} />
        <StatCard icon={ShieldCheck} label="Versão" value={game.version} />
        <StatCard icon={HardDriveDownload} label="Missões registradas" value={game.history.length} />
      </div>

      <section className="dispatcher-profile-card">
        <img src={dispatcher.imageUrl} alt="" />
        <div>
          <p className="eyebrow"><UserCog size={14} aria-hidden="true" /> Perfil do Dispatcher</p>
          <h3>{dispatcher.callsign} · {dispatcher.name}</h3>
          <p>{dispatcher.backgroundTitle} · {dispatcher.personalityTitle}</p>
          <strong>Nível {dispatcher.level} · {dispatcher.xp}/{dispatcher.nextLevelXp} XP</strong>
          <div className="chip-row">
            {dispatcher.abilities.map((ability) => <span className="chip requirement" key={ability}>{ability}</span>)}
          </div>
        </div>
        <div className="attribute-grid compact-attributes">
          {Object.entries(dispatcher.attributes).map(([key, value]) => (
            <div key={key}>
              <span>{dispatcherAttributeLabels[key]}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      {dispatcher.pendingUpgrades > 0 ? (
        <section className="upgrade-panel">
          <h3>Melhorias disponíveis: {dispatcher.pendingUpgrades}</h3>
          <div className="upgrade-grid">
            {dispatcherUpgrades.map((upgrade) => (
              <button
                className={dispatcher.upgrades.includes(upgrade.id) ? "owned" : ""}
                disabled={dispatcher.upgrades.includes(upgrade.id)}
                key={upgrade.id}
                onClick={() => onUpgrade(upgrade.id)}
                type="button"
              >
                <strong>{upgrade.title}</strong>
                <span>{upgrade.description}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {game.commandObjectives?.length ? (
        <section className="upgrade-panel">
          <h3>Objetivos do Comando</h3>
          <div className="upgrade-grid">
            {game.commandObjectives.map((objective) => <ObjectiveCard key={objective.id} objective={objective} />)}
          </div>
        </section>
      ) : null}

      <div className="settings-actions">
        <Button icon={Save} onClick={onSave}>Salvar agora</Button>
        <Button variant="secondary" onClick={onClearSave}>Apagar save local</Button>
        <Button variant="danger" icon={RotateCcw} onClick={onReset}>Reiniciar plantão</Button>
      </div>
      <p className="muted">O progresso é salvo em localStorage neste navegador: Dispatcher, equipe ativa, reputação, orçamento, jornais, heróis, vilões, currículos, memorial e histórico.</p>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("terminal");
  const [game, setGame] = useState(() => hydrateGameState(loadGame()));
  const [activeApp, setActiveApp] = useState("home");
  const [confirmReset, setConfirmReset] = useState(false);
  const [saveAvailable, setSaveAvailable] = useState(() => hasSavedGame());
  const [missionResult, setMissionResult] = useState(null);
  const [newspaper, setNewspaper] = useState(null);

  useEffect(() => {
    if (screen === "desktop") {
      saveGame(game);
      setSaveAvailable(true);
    }
  }, [game, screen]);

  const heroCount = useMemo(() => game.heroes.length, [game.heroes.length]);

  const startDesktop = (state) => {
    setGame(hydrateGameState(state));
    setScreen("desktop");
    setActiveApp("home");
  };

  const accessCentral = () => {
    const saved = loadGame();
    if (saved) startDesktop(saved);
    else setScreen("setup");
  };

  const newShift = () => {
    clearSavedGame();
    setSaveAvailable(false);
    setScreen("setup");
  };

  const continueShift = () => {
    startDesktop(loadGame() ?? createInitialGameState());
  };

  const finishSetup = ({ dispatcher, initialHeroIds }) => {
    const fresh = createInitialGameState({ dispatcher, initialHeroIds });
    startDesktop(fresh);
  };

  const requestReset = () => setConfirmReset(true);

  const resetShift = () => {
    clearSavedGame();
    setConfirmReset(false);
    setSaveAvailable(false);
    setScreen("setup");
    setMissionResult(null);
    setNewspaper(null);
  };

  const handleEndDay = async () => {
    const next = await endDay(game);
    setGame(next);
    setActiveApp("reports");
    setNewspaper(next.lastNewspaper);
  };

  const handleDispatch = async (eventId, heroIds) => {
    const result = await dispatchTeamToEvent(game, eventId, heroIds);
    setGame(result.state);
    setActiveApp("dispatch");
    setMissionResult(result.mission);
    return result.mission;
  };

  const saveNow = () => {
    saveGame(game);
    setSaveAvailable(true);
  };

  const clearSave = () => {
    clearSavedGame();
    setSaveAvailable(false);
  };

  const upgradeDispatcher = (upgradeId) => {
    setGame((current) => ({
      ...current,
      dispatcher: applyDispatcherUpgrade(current.dispatcher, upgradeId),
    }));
  };

  const toggleDensity = () => {
    setGame((current) => ({
      ...current,
      uiSettings: {
        ...(current.uiSettings ?? {}),
        density: current.uiSettings?.density === "compact" ? "comfortable" : "compact",
      },
    }));
  };

  const renderApp = () => {
    if (activeApp === "home") return <OperationalSummaryApp game={game} onNavigate={setActiveApp} />;
    if (activeApp === "dispatch") return <DispatchApp game={game} onDispatch={handleDispatch} />;
    if (activeApp === "schedule") return <ScheduleApp game={game} setGame={setGame} />;
    if (activeApp === "city") return <CityMapApp game={game} />;
    if (activeApp === "training") return <TrainingApp game={game} setGame={setGame} />;
    if (activeApp === "recruitment") return <RecruitmentApp game={game} setGame={setGame} />;
    if (activeApp === "villains") return <VillainArchiveApp game={game} setGame={setGame} />;
    if (activeApp === "factions") return <FactionApp game={game} />;
    if (activeApp === "heroes") return <HeroDatabaseApp game={game} />;
    if (activeApp === "base") return <BaseInfrastructureApp game={game} setGame={setGame} />;
    if (activeApp === "memorial") return <MemorialApp game={game} />;
    if (activeApp === "reports") return <ReportsApp game={game} />;
    if (activeApp === "social") return <SocialFeedApp game={game} />;
    if (activeApp === "command") return <CommandApp game={game} />;
    if (activeApp === "settings") {
      return (
        <SettingsApp
          game={game}
          onClearSave={clearSave}
          onReset={requestReset}
          onSave={saveNow}
          onUpgrade={upgradeDispatcher}
        />
      );
    }

    return null;
  };

  if (screen === "terminal") {
    return (
      <TerminalScreen
        hasSave={saveAvailable}
        heroCount={heroCount}
        onAccess={accessCentral}
        onContinue={continueShift}
        onNewGame={newShift}
      />
    );
  }

  if (screen === "setup") {
    return <DispatcherSetup onCancel={() => setScreen("terminal")} onComplete={finishSetup} />;
  }

  return (
    <>
      <CommandHubLayout
        activeApp={activeApp}
        game={game}
        onEndDay={handleEndDay}
        onOpenApp={setActiveApp}
        onReset={requestReset}
        onSave={saveNow}
        onToggleDensity={toggleDensity}
      >
        {renderApp()}
      </CommandHubLayout>
      {confirmReset ? (
        <ConfirmDialog
          confirmLabel="Reiniciar"
          message="Isso apaga o plantão atual da memória local e abre a criação de um novo Dispatcher."
          onCancel={() => setConfirmReset(false)}
          onConfirm={resetShift}
          title="Reiniciar plantão?"
        />
      ) : null}
      <MissionResultModal mission={missionResult} onClose={() => setMissionResult(null)} onNavigate={setActiveApp} />
      <NewspaperModal newspaper={newspaper} onClose={() => setNewspaper(null)} />
    </>
  );
}
