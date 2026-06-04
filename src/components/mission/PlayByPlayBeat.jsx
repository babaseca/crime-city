import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Flower,
  HeartPulse,
  Lock,
  MapPin,
  Newspaper,
  Radio,
  Send,
  ShieldAlert,
  Skull,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const iconByPhase = {
  chamado: Radio,
  despacho: Send,
  chegada: MapPin,
  primeira_acao: Zap,
  acao: Zap,
  complicacao: AlertTriangle,
  sinergia: Users,
  virada: Activity,
  resolucao: CheckCircle,
  consequencia: Newspaper,
  facção: ShieldAlert,
  faccao: ShieldAlert,
  vilao: Skull,
  combo: Sparkles,
  ferimento: HeartPulse,
  captura: Lock,
  morte: Flower,
};

const phaseLabel = (phase = "") =>
  String(phase)
    .replace(/_/g, " ")
    .replace("faccao", "facção")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function PlayByPlayBeat({ beat, highlightCritical = false }) {
  const phase = beat.phase ?? "registro";
  const Icon = iconByPhase[phase] ?? iconByPhase[phase.normalize("NFD").replace(/\p{Diacritic}/gu, "")] ?? Activity;
  const critical = highlightCritical && ["complicacao", "ferimento", "morte"].includes(phase.normalize("NFD").replace(/\p{Diacritic}/gu, ""));

  return (
    <article className={`play-by-play-beat phase-${phase.normalize("NFD").replace(/\p{Diacritic}/gu, "")} ${critical ? "critical" : ""}`.trim()}>
      <div className="play-by-play-marker">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="play-by-play-copy">
        <header>
          <time>{beat.time}</time>
          <strong>{phaseLabel(phase)}</strong>
        </header>
        <p>{beat.text}</p>
      </div>
    </article>
  );
}
