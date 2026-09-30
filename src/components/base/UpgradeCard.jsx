import { Wrench } from "lucide-react";
import { baseUpgradeCost } from "../../engine/baseUpgradeSystem";
import { titleCase } from "../../utils/formatters";
import Button from "../common/Button";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export default function UpgradeCard({ upgrade, onBuy, budget }) {
  const installed = upgrade.purchased || upgrade.level > 0;
  const cost = baseUpgradeCost(upgrade);

  return (
    <article className={`upgrade-card ${installed ? "installed" : ""}`}>
      <span><Wrench size={16} aria-hidden="true" /> {titleCase(String(upgrade.category ?? "").toLocaleLowerCase("pt-BR"))}</span>
      <h3>{upgrade.name}</h3>
      <p>{upgrade.description}</p>
      <strong>{installed ? "Instalada" : money(cost)}</strong>
      <Button disabled={installed || budget < cost} onClick={() => onBuy(upgrade.id)} variant={installed ? "secondary" : "primary"}>
        {installed ? "Ativa" : "Comprar"}
      </Button>
    </article>
  );
}
