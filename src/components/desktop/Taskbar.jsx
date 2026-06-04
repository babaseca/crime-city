export default function Taskbar({ apps, activeApp, onOpen }) {
  return (
    <nav className="taskbar" aria-label="Aplicativos abertos">
      {apps.map((app) => {
        const Icon = app.icon;
        return (
          <button className={activeApp === app.id ? "active" : ""} key={app.id} type="button" onClick={() => onOpen(app.id)}>
            {Icon ? <Icon size={17} aria-hidden="true" /> : null}
            <span>{app.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
