import PlayByPlayBeat from "./PlayByPlayBeat";

export default function PlayByPlayTimeline({ playByPlay, density = "comfortable", highlightCritical = true }) {
  if (!playByPlay?.beats?.length) return null;

  return (
    <section className={`play-by-play-timeline density-${density}`}>
      <header className="play-by-play-header">
        <div>
          <p className="eyebrow">{playByPlay.source === "fallback" ? "registro operacional" : "transmissão operacional"}</p>
          <h3>{playByPlay.title ?? "Como aconteceu"}</h3>
        </div>
        <span>{playByPlay.tone ?? "operacional"}</span>
      </header>
      {playByPlay.summary ? <p className="play-by-play-summary">{playByPlay.summary}</p> : null}
      <div className="play-by-play-list">
        {playByPlay.beats.map((beat) => (
          <PlayByPlayBeat beat={beat} highlightCritical={highlightCritical} key={beat.id} />
        ))}
      </div>
    </section>
  );
}
