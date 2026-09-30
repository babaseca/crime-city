import {
  Archive,
  Building2,
  CalendarClock,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Home,
  MapPinned,
  MessageCircle,
  Newspaper,
  RadioTower,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Skull,
  UsersRound,
} from "lucide-react";

export const hubNavigation = [
  {
    label: "Operação",
    items: [
      { id: "home", title: "Início", subtitle: "Resumo Operacional", icon: Home },
      { id: "dispatch", title: "Despacho", subtitle: "Alertas ativos", icon: RadioTower },
      { id: "schedule", title: "Escala", subtitle: "Turnos e fadiga", icon: CalendarClock },
      { id: "city", title: "Mapa da Cidade", subtitle: "Bairros críticos", icon: MapPinned },
    ],
  },
  {
    label: "Equipe",
    items: [
      { id: "heroes", title: "Equipe", subtitle: "Heróis ativos", icon: UsersRound },
      { id: "training", title: "Treinamento", subtitle: "Programas", icon: GraduationCap },
      { id: "memorial", title: "Memorial", subtitle: "Legado", icon: Archive },
    ],
  },
  {
    label: "Cidade",
    items: [
      { id: "factions", title: "Facções", subtitle: "Influência", icon: ShieldAlert },
      { id: "social", title: "Rede Aurora", subtitle: "Opinião pública", icon: MessageCircle },
      { id: "reports", title: "Jornal e Relatórios", subtitle: "Arquivo diário", icon: Newspaper },
    ],
  },
  {
    label: "Administração",
    items: [
      { id: "recruitment", title: "RH Heroico", subtitle: "Candidatos", icon: HeartHandshake },
      { id: "base", title: "Infraestrutura", subtitle: "Projetos", icon: Building2 },
      { id: "villains", title: "Arquivo de Vilões", subtitle: "Custódia", icon: Skull },
      { id: "command", title: "Comando", subtitle: "Objetivos", icon: Handshake },
      { id: "settings", title: "Configurações", subtitle: "Sistema", icon: Settings },
    ],
  },
];

export const findHubItem = (activeId) =>
  hubNavigation.flatMap((group) => group.items).find((item) => item.id === activeId) ?? hubNavigation[0].items[0];

export default function SideNavigation({ activeApp, onOpenApp }) {
  return (
    <nav className="hub-side-navigation" aria-label="Módulos da Central">
      <div className="hub-side-header">
        <div className="hub-side-emblem">
          <ShieldCheck size={25} aria-hidden="true" />
        </div>
        <span>
          <strong>Central de Crise</strong>
          <small>Heróis de Plantão</small>
        </span>
      </div>

      {hubNavigation.map((group) => (
        <section key={group.label}>
          <p>{group.label}</p>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <button className={activeApp === item.id ? "active" : ""} key={item.id} onClick={() => onOpenApp(item.id)} type="button">
                <span className="hub-nav-icon"><Icon size={18} aria-hidden="true" /></span>
                <span className="hub-nav-copy">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
              </button>
            );
          })}
        </section>
      ))}
      <span className="hub-side-version">v0.9.5-alpha</span>
    </nav>
  );
}
