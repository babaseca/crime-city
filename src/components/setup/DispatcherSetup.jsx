import { useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, Headphones, Sparkles, UsersRound } from "lucide-react";
import { heroes as heroData } from "../../data/heroes";
import { createDispatcher, dispatcherAttributeLabels, dispatcherBackgrounds, dispatcherPersonalities } from "../../engine/dispatcherSystem";
import { initialTeamCandidateIds } from "../../engine/gameState";
import Button from "../common/Button";
import ProgressBar from "../common/ProgressBar";

const recommendedTeam = ["h-aurora-vetor", "h-bruma-livre", "h-domo-prata"];

const teamCandidates = initialTeamCandidateIds
  .map((id) => heroData.find((hero) => hero.id === id))
  .filter(Boolean);

const emptyForm = {
  name: "",
  callsign: "",
  pronoun: "",
  backgroundId: dispatcherBackgrounds[0]?.id ?? "emergency_operator",
  personalityId: dispatcherPersonalities[0]?.id ?? "empathetic_mentor",
};

export default function DispatcherSetup({ onComplete, onCancel }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [selectedHeroIds, setSelectedHeroIds] = useState(recommendedTeam);

  const dispatcher = useMemo(() => createDispatcher(form), [form]);
  const selectedHeroes = useMemo(
    () => selectedHeroIds.map((id) => heroData.find((hero) => hero.id === id)).filter(Boolean),
    [selectedHeroIds],
  );
  const hasRescue = selectedHeroes.some((hero) => /resgate|mobilidade|suporte|evacuacao|transporte/i.test(hero.funcao));
  const hasContainment = selectedHeroes.some((hero) => /controle|defesa|conten|combate|energia|ambiental/i.test(hero.funcao));

  const toggleHero = (heroId) => {
    setSelectedHeroIds((current) => {
      if (current.includes(heroId)) return current.filter((id) => id !== heroId);
      if (current.length >= 3) return current;
      return [...current, heroId];
    });
  };

  const canContinue = step === 0 ? form.name.trim() && form.callsign.trim() : selectedHeroIds.length >= 2 && hasRescue && hasContainment;

  return (
    <main className="campaign-setup">
      <div className="terminal-grid" aria-hidden="true" />
      <section className="setup-shell">
        <header className="setup-header">
          <div>
            <p className="eyebrow"><Headphones size={14} aria-hidden="true" /> novo plantao</p>
            <h1>Configurar Dispatcher</h1>
            <p>Antes do Dia 1, a Central precisa saber quem esta no radio e quem entra na primeira escala.</p>
          </div>
          <Button variant="ghost" icon={ArrowLeft} onClick={onCancel}>Voltar</Button>
        </header>

        <div className="setup-steps">
          {["Dispatcher", "Equipe inicial", "Briefing"].map((label, index) => (
            <span className={step === index ? "active" : ""} key={label}>{index + 1}. {label}</span>
          ))}
        </div>

        {step === 0 ? (
          <div className="setup-grid">
            <section className="setup-panel">
              <h2>Identidade operacional</h2>
              <label>
                Nome
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Lais Nogueira" />
              </label>
              <label>
                Apelido operacional
                <input value={form.callsign} onChange={(event) => setForm({ ...form, callsign: event.target.value })} placeholder="Ex.: Aurora-3" />
              </label>
              <label>
                Tratamento opcional
                <input value={form.pronoun} onChange={(event) => setForm({ ...form, pronoun: event.target.value })} placeholder="Ex.: ela/dela, ele/dele, elu/delu" />
              </label>
            </section>

            <section className="setup-panel">
              <h2>Historico profissional</h2>
              <div className="option-list">
                {dispatcherBackgrounds.map((background) => (
                  <button
                    className={form.backgroundId === background.id ? "selected" : ""}
                    key={background.id}
                    onClick={() => setForm({ ...form, backgroundId: background.id })}
                    type="button"
                  >
                    <strong>{background.title}</strong>
                    <span>{background.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="setup-panel">
              <h2>Estilo de lideranca</h2>
              <div className="option-list">
                {dispatcherPersonalities.map((personality) => (
                  <button
                    className={form.personalityId === personality.id ? "selected" : ""}
                    key={personality.id}
                    onClick={() => setForm({ ...form, personalityId: personality.id })}
                    type="button"
                  >
                    <strong>{personality.title}</strong>
                    <span>{personality.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <aside className="dispatcher-preview">
              <img src={dispatcher.imageUrl} alt="" />
              <h2>{dispatcher.callsign}</h2>
              <p>{dispatcher.backgroundTitle} · {dispatcher.personalityTitle}</p>
              <strong>{dispatcher.startingAbility}</strong>
              <div className="attribute-grid compact-attributes">
                {Object.entries(dispatcher.attributes).map(([key, value]) => (
                  <div key={key}>
                    <span>{dispatcherAttributeLabels[key]}</span>
                    <strong>{value}</strong>
                    <ProgressBar value={value * 8.33} tone="compat" />
                  </div>
                ))}
              </div>
            </aside>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="setup-panel full">
            <div className="setup-section-title">
              <div>
                <p className="eyebrow"><UsersRound size={14} aria-hidden="true" /> equipe do dispatcher</p>
                <h2>Escolha 2 ou 3 herois para o Dia 1</h2>
              <p>O limite da equipe ativa e 8. O resto do banco global pode aparecer por RH, reforma ou ordem do Comando.</p>
              {!hasRescue || !hasContainment ? <p className="warning-text">Inclua ao menos uma pessoa de resgate/suporte e uma de contenção/controle.</p> : null}
              </div>
              <Button variant="secondary" onClick={() => setSelectedHeroIds(recommendedTeam)}>Usar equipe recomendada</Button>
            </div>
            <div className="initial-team-grid">
              {teamCandidates.map((hero) => {
                const selected = selectedHeroIds.includes(hero.id);
                return (
                  <button className={`initial-hero-card ${selected ? "selected" : ""}`} key={hero.id} onClick={() => toggleHero(hero.id)} type="button">
                    <img src={hero.imageUrl} alt="" />
                    <span>{selected ? <BadgeCheck size={17} aria-hidden="true" /> : null}</span>
                    <h3>{hero.codinome}</h3>
                    <p>{hero.funcao}</p>
                    <div className="hero-pitch">
                      <strong>{hero.atributos.mobilidade + hero.atributos.controle + hero.atributos.resistencia}</strong>
                      <small>prontidao combinada</small>
                    </div>
                    <div className="chip-row">
                      {hero.tracos.slice(0, 3).map((trait) => <span className="chip" key={trait}>{trait}</span>)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <section className="setup-panel briefing-panel">
            <p className="eyebrow"><Sparkles size={14} aria-hidden="true" /> briefing do comando</p>
            <h2>Dia 1: plantao pequeno, cidade grande</h2>
            <p>
              A Chefia Regional liberou uma escala curta para testar sua leitura de campo. Nova Aurora nao vai esperar
              a equipe crescer: priorize ocorrencias, preserve gente e use o radio como ferramenta emocional, nao so
              como sirene com botoes.
            </p>
            <div className="briefing-grid">
              <span>Equipe ativa inicial: <strong>{selectedHeroIds.length}/8</strong></span>
              <span>Dispatcher: <strong>{dispatcher.callsign}</strong></span>
              <span>Habilidade inicial: <strong>{dispatcher.startingAbility}</strong></span>
            </div>
          </section>
        ) : null}

        <footer className="setup-actions">
          <Button variant="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Anterior</Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>Continuar</Button>
          ) : (
            <Button onClick={() => onComplete({ dispatcher, initialHeroIds: selectedHeroIds })}>Iniciar Dia 1</Button>
          )}
        </footer>
      </section>
    </main>
  );
}
