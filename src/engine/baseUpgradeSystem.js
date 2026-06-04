import upgrades from "../data/baseUpgrades.json";

export const initializeBaseUpgrades = () => upgrades.map((upgrade) => ({ ...upgrade, purchased: false, level: 0 }));

export const hasBaseUpgrade = (baseUpgrades = [], id) =>
  baseUpgrades.some((upgrade) => upgrade.id === id && (upgrade.purchased || upgrade.level > 0));

export const baseUpgradeEffect = (baseUpgrades = [], key) =>
  baseUpgrades.reduce((sum, upgrade) => sum + (upgrade.purchased || upgrade.level > 0 ? upgrade.effect?.[key] ?? 0 : 0), 0);

export const purchaseBaseUpgrade = (state, upgradeId) => {
  const upgrade = state.baseUpgrades.find((item) => item.id === upgradeId);
  if (!upgrade) return { state, message: "Melhoria não encontrada." };
  if (upgrade.purchased || upgrade.level >= upgrade.maxLevel) return { state, message: "Melhoria já instalada." };
  if (state.budget < upgrade.cost) return { state, message: "Orçamento insuficiente para esta melhoria." };

  return {
    state: {
      ...state,
      budget: state.budget - upgrade.cost,
      baseUpgrades: state.baseUpgrades.map((item) =>
        item.id === upgradeId ? { ...item, purchased: true, level: Math.min(item.maxLevel, item.level + 1) } : item,
      ),
      budgetLog: [
        ...state.budgetLog,
        {
          id: `budget-upgrade-${upgrade.id}-${Date.now()}`,
          day: state.day,
          type: "expense",
          label: `Melhoria da Central: ${upgrade.name}`,
          amount: upgrade.cost,
        },
      ],
    },
    message: `${upgrade.name} instalada. A Central ficou um pouco menos improvisada.`,
  };
};
