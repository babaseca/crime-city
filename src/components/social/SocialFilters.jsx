const filters = ["todos", "elogio", "critica", "meme", "teoria", "denuncia", "facção", "luto"];

export default function SocialFilters({ value, onChange }) {
  return (
    <div className="tab-strip wrap">
      {filters.map((filter) => (
        <button className={value === filter ? "active" : ""} key={filter} onClick={() => onChange(filter)} type="button">
          {filter}
        </button>
      ))}
    </div>
  );
}
