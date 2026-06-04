import {
  Archive,
  Building2,
  ClipboardList,
  FileBarChart,
  HeartHandshake,
  MapPinned,
  MessageCircle,
  MonitorCog,
  RadioTower,
  Settings,
  Skull,
  UsersRound,
} from "lucide-react";
import AppWindow from "./AppWindow";
import DesktopIcon from "./DesktopIcon";
import Taskbar from "./Taskbar";
import TopStatusBar from "./TopStatusBar";

export const apps = [
  { id: "dispatch", title: "Despacho", subtitle: "alertas e equipes", icon: RadioTower, description: "Ocorrências" },
  { id: "city", title: "Mapa da Cidade", subtitle: "bairros vivos", icon: MapPinned, description: "Territórios" },
  { id: "recruitment", title: "RH Heroico", subtitle: "currículos e contratos", icon: HeartHandshake, description: "Contratar" },
  { id: "villains", title: "Arquivo de Vilões", subtitle: "captura e reforma", icon: Skull, description: "Dossiês" },
  { id: "heroes", title: "Banco de Heróis", subtitle: "fichas operacionais", icon: UsersRound, description: "Equipe" },
  { id: "base", title: "Infraestrutura", subtitle: "melhorias da central", icon: Building2, description: "Base" },
  { id: "memorial", title: "Memorial", subtitle: "legados permanentes", icon: Archive, description: "Legado" },
  { id: "reports", title: "Relatórios", subtitle: "histórico e métricas", icon: FileBarChart, description: "Dados" },
  { id: "social", title: "Rede Aurora", subtitle: "voz das ruas", icon: MessageCircle, description: "VoxPop" },
  { id: "settings", title: "Configurações", subtitle: "sistema e save", icon: Settings, description: "Sistema" },
];

export const appById = (id) => apps.find((app) => app.id === id) ?? apps[0];

export default function CentralDesktop({ game, activeApp, onOpenApp, onCloseApp, onEndDay, onReset, children }) {
  const app = activeApp ? appById(activeApp) : null;

  return (
    <main className="central-desktop">
      <div className="wallpaper-map" aria-hidden="true" />
      <TopStatusBar game={game} onEndDay={onEndDay} onReset={onReset} />
      <section className="desktop-zone">
        <div className="desktop-icons">
          {apps.map((item) => (
            <DesktopIcon
              active={activeApp === item.id}
              description={item.description}
              icon={item.icon}
              key={item.id}
              label={item.title}
              onClick={() => onOpenApp(item.id)}
            />
          ))}
        </div>
        <AppWindow app={app} onClose={onCloseApp}>{children}</AppWindow>
      </section>
      <Taskbar apps={apps} activeApp={activeApp} onOpen={onOpenApp} />
      <div className="desktop-corner">
        <MonitorCog size={16} aria-hidden="true" />
        SRM-NA · Cidade Viva
      </div>
      <ClipboardList className="desktop-watermark" size={180} aria-hidden="true" />
    </main>
  );
}
