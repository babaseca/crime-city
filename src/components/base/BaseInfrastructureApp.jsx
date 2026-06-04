import { useState } from "react";
import { Building2, WalletCards } from "lucide-react";
import { purchaseBaseUpgrade } from "../../engine/baseUpgradeSystem";
import UpgradeCard from "./UpgradeCard";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export default function BaseInfrastructureApp({ game, setGame }) {
  const [message, setMessage] = useState("");

  const buy = (upgradeId) => {
    setGame((current) => {
      const result = purchaseBaseUpgrade(current, upgradeId);
      setMessage(result.message);
      return result.state;
    });
  };

  return (
    <div className="base-infra-app">
      <header className="module-hero">
        <div>
          <p className="eyebrow"><Building2 size={14} aria-hidden="true" /> Infraestrutura</p>
          <h2>Melhorias da Central</h2>
          <p>Orçamento agora também compra menos improviso, menos trauma e mais chance de não virar manchete ruim.</p>
        </div>
        <span><WalletCards size={16} aria-hidden="true" /> {money(game.budget)}</span>
      </header>
      {message ? <p className="system-message">{message}</p> : null}
      <div className="upgrade-card-grid">
        {(game.baseUpgrades ?? []).map((upgrade) => (
          <UpgradeCard budget={game.budget} key={upgrade.id} onBuy={buy} upgrade={upgrade} />
        ))}
      </div>
    </div>
  );
}
