import { useEffect, useMemo, useState } from "react";
import { Database, LogIn, Play, RotateCcw, ShieldCheck, Users } from "lucide-react";
import { eventCount } from "../../data/events";
import Button from "../common/Button";

const bootLines = [
  "Conectando aos canais de emergência...",
  "Sincronizando banco de heróis...",
  "Carregando ocorrências urbanas...",
  "Validando protocolos de despacho...",
  "Abrindo área de trabalho da Central...",
];

export default function TerminalScreen({ hasSave, heroCount, onAccess, onNewGame, onContinue }) {
  const [booting, setBooting] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    if (!booting) return undefined;

    const timer = setInterval(() => {
      setLineIndex((current) => Math.min(bootLines.length - 1, current + 1));
    }, 260);

    return () => clearInterval(timer);
  }, [booting]);

  const visibleLines = useMemo(() => bootLines.slice(0, booting ? lineIndex + 1 : 3), [booting, lineIndex]);

  const startBoot = (action) => {
    setBooting(true);
    setLineIndex(0);
    window.setTimeout(action, 1250);
  };

  return (
    <main className="terminal-screen">
      <div className="terminal-grid" aria-hidden="true" />
      <section className="terminal-card">
        <div className="terminal-logo">
          <span />
          <div>
            <p>CENTRAL DE CRISE</p>
            <h1>HERÓIS DE PLANTÃO</h1>
          </div>
        </div>
        <p className="terminal-subtitle">Sistema de Resposta Meta-Humana de Nova Aurora</p>

        <div className="terminal-metrics">
          <span><ShieldCheck size={16} aria-hidden="true" /> cidade monitorada</span>
          <span><Database size={16} aria-hidden="true" /> {eventCount} alertas no banco</span>
          <span><Users size={16} aria-hidden="true" /> {heroCount} heróis cadastrados</span>
          <span>SRM-NA Alpha 0.9.5 · Missões Cinematográficas</span>
        </div>

        <div className="terminal-output">
          {visibleLines.map((line) => (
            <p key={line}>&gt; {line}</p>
          ))}
          <span className="terminal-cursor" />
        </div>

        <div className="terminal-actions">
          <Button icon={LogIn} onClick={() => startBoot(onAccess)} disabled={booting}>
            Acessar Central
          </Button>
          {hasSave ? (
            <Button variant="secondary" icon={Play} onClick={() => startBoot(onContinue)} disabled={booting}>
              Continuar Plantão
            </Button>
          ) : null}
          <Button variant="ghost" icon={RotateCcw} onClick={() => startBoot(onNewGame)} disabled={booting}>
            Novo Plantão
          </Button>
        </div>
      </section>
    </main>
  );
}
