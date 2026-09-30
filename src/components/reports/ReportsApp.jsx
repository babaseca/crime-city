import { useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, FileBarChart, HeartPulse, MapPinned, MessageCircle, Newspaper, Skull, UserRoundCheck, UsersRound } from "lucide-react";
import FactionCard from "../factions/FactionCard";
import FactionDetailDrawer from "../factions/FactionDetailDrawer";
import NewspaperArchive from "../news/NewspaperArchive";
import SocialPostCard from "../social/SocialPostCard";
import StatCard from "../common/StatCard";
import { getCampaignLegacySummary } from "../../engine/legacySystem";
import { formatStatusLabel, normalizeDisplayText } from "../../utils/formatters";
import DayReportCard from "./DayReportCard";
import MissionHistoryTable from "./MissionHistoryTable";

const heroRows = (heroes) =>
  [...heroes]
    .filter((hero) => hero.teamStatus !== "available_global")
    .sort((first, second) => (second.missoes ?? 0) - (first.missoes ?? 0))
    .slice(0, 12);

export default function ReportsApp({ game }) {
  const [tab, setTab] = useState("summary");
  const [selectedFaction, setSelectedFaction] = useState(null);
  const successes = game.history.filter((mission) => mission.success).length;
  const failures = game.history.filter((mission) => !mission.success).length;
  const civilians = game.history.reduce((sum, mission) => sum + (mission.civiliansSaved ?? 0), 0);
  const captures = game.history.filter((mission) => mission.capturedVillain).length;
  const injuries = game.history.reduce((sum, mission) => sum + (mission.injuries?.length ?? 0), 0);
  const deaths = game.memorial.length;
  const districts = useMemo(() => [...(game.districts ?? [])].sort((a, b) => b.dangerLevel - a.dangerLevel), [game.districts]);
  const heroes = useMemo(() => heroRows(game.heroes), [game.heroes]);
  const legacy = getCampaignLegacySummary(game);

  return (
    <div className="reports-app">
      <header className="module-hero">
        <div>
          <p className="eyebrow"><FileBarChart size={14} aria-hidden="true" /> Relatórios</p>
          <h2>Histórico da Central</h2>
          <p>O sistema agora cruza missões, bairros, facções, jornais e Rede Aurora para mostrar consequência territorial.</p>
        </div>
      </header>

      <div className="tab-strip wrap">
        {[
          ["summary", "Resumo"],
          ["missions", "Histórico de missões"],
          ["newspapers", "Jornais"],
          ["districts", "Bairros"],
          ["factions", "Facções"],
          ["social", "Rede Aurora"],
          ["heroes", "Heróis"],
        ].map(([id, label]) => (
          <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)} type="button">{label}</button>
        ))}
      </div>

      {tab === "summary" ? (
        <>
          <div className="stats-grid compact">
            <StatCard icon={BadgeCheck} label="Sucessos" value={successes} tone="good" />
            <StatCard icon={AlertTriangle} label="Falhas" value={failures} tone="warn" />
            <StatCard icon={UserRoundCheck} label="Civis salvos" value={civilians} />
            <StatCard icon={HeartPulse} label="Heróis feridos" value={injuries} tone="warn" />
            <StatCard icon={Skull} label="Perdas" value={deaths} tone="danger" />
            <StatCard icon={MapPinned} label="Vilões capturados" value={captures} />
          </div>
          <section className="report-section">
            <h3>Últimos dias</h3>
            {game.dayReports.length ? game.dayReports.map((report) => <DayReportCard key={report.day} report={report} />) : <p className="muted">Nenhum dia encerrado ainda.</p>}
          </section>
        </>
      ) : null}

      {tab === "missions" ? (
        <section className="report-section">
          <h3>Histórico de missões</h3>
          <MissionHistoryTable missions={game.history} />
        </section>
      ) : null}

      {tab === "newspapers" ? (
        <section className="report-section">
          <h3><Newspaper size={18} aria-hidden="true" /> Jornais arquivados</h3>
          <NewspaperArchive newspapers={game.newspapers} />
        </section>
      ) : null}

      {tab === "districts" ? (
        <section className="report-section">
          <h3>Bairros</h3>
          <div className="city-report-table">
            {districts.map((district) => (
              <article key={district.id}>
                <strong>{district.name}</strong>
                <span>Estab. {district.stability}</span>
                <span>Conf. {district.trustInCentral}</span>
                <span>Crime {district.crimeLevel}</span>
                <span>{district.dominantFactionId}</span>
                <span>{district.stats.alertsGenerated} alertas</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "factions" ? (
        <section className="report-section">
          <h3>Facções</h3>
          <div className="faction-grid">
            {(game.factions ?? []).map((faction) => <FactionCard faction={faction} key={faction.id} onSelect={setSelectedFaction} />)}
          </div>
          <FactionDetailDrawer faction={selectedFaction} districts={game.districts ?? []} onClose={() => setSelectedFaction(null)} />
        </section>
      ) : null}

      {tab === "social" ? (
        <section className="report-section">
          <h3><MessageCircle size={18} aria-hidden="true" /> Rede Aurora</h3>
          <div className="social-feed-list">
            {(game.socialPosts ?? []).slice(0, 20).map((post) => (
              <SocialPostCard districts={game.districts ?? []} factions={game.factions ?? []} heroes={game.heroes ?? []} key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}

      {tab === "heroes" ? (
        <section className="report-section">
          <h3><UsersRound size={18} aria-hidden="true" /> Leitura da equipe</h3>
          <div className="hero-report-list">
            {heroes.map((hero) => (
              <article key={hero.id}>
                <img src={hero.imageUrl} alt="" />
                <span>
                  <strong>{hero.codinome}</strong>
                  <small>{normalizeDisplayText(hero.publicImage)} · {formatStatusLabel(hero.status)}</small>
                </span>
                <span>{hero.missoes ?? 0} missões</span>
                <span>Fama {hero.fame ?? 0}</span>
                <span>Controv. {hero.controversy ?? 0}</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
