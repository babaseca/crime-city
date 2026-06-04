const labels = {
  1: "baixo",
  2: "moderado",
  3: "alto",
  4: "crítico",
  5: "extremo",
  baixo: "baixo",
  moderado: "moderado",
  medio: "moderado",
  alto: "alto",
  critico: "crítico",
  crítico: "crítico",
  extremo: "extremo",
};

export default function RiskBadge({ level, label }) {
  const text = label ?? labels[level] ?? "risco";
  const key = typeof level === "number" ? level : text.normalize("NFD").replace(/\p{Diacritic}/gu, "");

  return <span className={`risk-badge risk-${key}`}>{text}</span>;
}
