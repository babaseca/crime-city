import ContextPanel from "./ContextPanel";
import SideNavigation, { findHubItem } from "./SideNavigation";
import TopCommandBar from "./TopCommandBar";

export default function CommandHubLayout({
  activeApp,
  children,
  game,
  onEndDay,
  onOpenApp,
  onReset,
  onSave,
  onToggleDensity,
}) {
  const active = findHubItem(activeApp);
  const density = game.uiSettings?.density ?? "comfortable";

  return (
    <main className={`command-hub ui-density-${density}`}>
      <SideNavigation activeApp={activeApp} onOpenApp={onOpenApp} />
      <section className="hub-workspace">
        <TopCommandBar
          game={game}
          onEndDay={onEndDay}
          onReset={onReset}
          onSave={onSave}
          onToggleDensity={onToggleDensity}
        />
        <div className="hub-body">
          <section className="hub-main-content">
            <header className="hub-page-title">
              <div>
                <p className="eyebrow">módulo ativo</p>
                <h1>{active.title}</h1>
              </div>
              <span>Nova Aurora · {game.cityStatus}</span>
            </header>
            {children}
          </section>
          <ContextPanel game={game} />
        </div>
      </section>
    </main>
  );
}
