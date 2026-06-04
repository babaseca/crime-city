import PlayByPlayTimeline from "./PlayByPlayTimeline";

export default function MissionReportCinematic({ mission, density = "comfortable" }) {
  return <PlayByPlayTimeline density={density} highlightCritical playByPlay={mission?.playByPlay} />;
}
