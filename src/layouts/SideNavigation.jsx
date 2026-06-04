import {
  Archive,
  Building2,
  CalendarClock,
  ClipboardList,
  FileBarChart,
  Gauge,
  GraduationCap,
  Handshake,
  HeartHandshake,
  MapPinned,
  MessageCircle,
  Newspaper,
  RadioTower,
  Settings,
  ShieldAlert,
  Skull,
  UsersRound,
} from "lucide-react";

export const hubNavigation = [
  {
    label: "Operação",
    items: [
      { id: "home", title: "Central Hoje", icon: Gauge },
      { id: "dispatch", title: "Despacho", icon: RadioTower },
      { id: "schedule", title: "Escala", icon: CalendarClock },
      { id: "city", title: "Mapa da Cidade", icon: MapPinned },
    ],
  },
  {
    label: "Equipe",
    items: [
      { id: "heroes", title: "Equipe", icon: UsersRound },
      { id: "training", title: "Treinamento", icon: GraduationCap },
      { id: "memorial", title: "Memorial", icon: Archive },
    ],
  },
  {
    label: "Cidade",
    items: [
      { id: "factions", title: "Facções", icon: ShieldAlert },
      { id: "social", title: "Rede Aurora", icon: MessageCircle },
      { id: "reports", title: "Jornal e Relatórios", icon: Newspaper },
    ],
  },
  {
    label: "Administração",
    items: [
      { id: "recruitment", title: "RH Heroico", icon: HeartHandshake },
      { id: "base", title: "Infraestrutura", icon: Building2 },
      { id: "villains", title: "Arquivo de Vilões", icon: Skull },
      { id: "command", title: "Comando", icon: Handshake },
      { id: "settings", title: "Configurações", icon: Settings },
    ],
  },
];

export const findHubItem = (activeId) =>
  hubNavigation.flatMap((group) => group.items).find((item) => item.id === activeId) ?? hubNavigation[0].items[0];

export default function SideNavigation({ activeApp, onOpenApp }) {
  return (
    <nav className="hub-side-navigation" aria-label="Módulos da Central">
      <div className="hub-side-header">
        <ClipboardList size={22} aria-hidden="true" />
        <span>
          <strong>SRM-NA</strong>
          <small>Alpha 0.9.5</small>
        </span>
      </div>

      {hubNavigation.map((group) => (
        <section key={group.label}>
          <p>{group.label}</p>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <button className={activeApp === item.id ? "active" : ""} key={item.id} onClick={() => onOpenApp(item.id)} type="button">
                <Icon size={17} aria-hidden="true" />
                <span>{item.title}</span>
              </button>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
