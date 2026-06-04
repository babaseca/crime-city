import { Wrench } from "lucide-react";
import Button from "../common/Button";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export default function UpgradeCard({ upgrade, onBuy, budget }) {
  const installed = upgrade.purchased || upgrade.level > 0;

  return (
    <article className={`upgrade-card ${installed ? "installed" : ""}`}>
      <span><Wrench size={16} aria-hidden="true" /> {upgrade.category}</span>
      <h3>{upgrade.name}</h3>
      <p>{upgrade.description}</p>
      <strong>{installed ? "Instalada" : money(upgrade.cost)}</strong>
      <Button disabled={installed || budget < upgrade.cost} onClick={() => onBuy(upgrade.id)} variant={installed ? "secondary" : "primary"}>
        {installed ? "Ativa" : "Comprar"}
      </Button>
    </article>
  );
}
