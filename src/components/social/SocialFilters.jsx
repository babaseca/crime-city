const filters = [
  ["todos", "todos"],
  ["elogio", "elogio"],
  ["critica", "crítica"],
  ["meme", "meme"],
  ["teoria", "teoria"],
  ["denuncia", "denúncia"],
  ["facção", "facção"],
  ["luto", "luto"],
];

export default function SocialFilters({ value, onChange }) {
  return (
    <div className="tab-strip wrap">
      {filters.map(([filter, label]) => (
        <button className={value === filter ? "active" : ""} key={filter} onClick={() => onChange(filter)} type="button">
          {label}
        </button>
      ))}
    </div>
  );
}
