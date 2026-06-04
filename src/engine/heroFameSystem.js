export const defaultHeroFame = {
  fame: 18,
  publicImage: "nome promissor",
  controversy: 8,
  fans: 24,
  critics: 6,
  mediaTags: [],
  recentPosts: [],
};

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

const imageFromScores = (fame, controversy) => {
  if (controversy >= 70) return "figura controversa";
  if (fame >= 72 && controversy < 35) return "símbolo público";
  if (fame >= 48) return "herói conhecido";
  if (controversy >= 40) return "nome em debate";
  return "nome promissor";
};

export const normalizeHeroFame = (hero) => ({
  ...hero,
  fame: hero.fame ?? defaultHeroFame.fame,
  publicImage: hero.publicImage ?? defaultHeroFame.publicImage,
  controversy: hero.controversy ?? defaultHeroFame.controversy,
  fans: hero.fans ?? defaultHeroFame.fans,
  critics: hero.critics ?? defaultHeroFame.critics,
  mediaTags: hero.mediaTags ?? [],
  recentPosts: hero.recentPosts ?? [],
});

export const applyMissionResultToHeroFame = (hero, missionResult, district) => {
  if (!missionResult.heroIds.includes(hero.id)) return hero;
  const heroIndex = missionResult.heroIds.indexOf(hero.id);
  const savedShare = Math.floor((missionResult.civiliansSaved ?? 0) / Math.max(1, missionResult.heroIds.length));
  const highDamage = ["alto", "severo"].includes(missionResult.materialDamage);
  const mediaWeight = Math.max(1, Math.round((district?.mediaAttention ?? 35) / 35));
  const fameDelta = missionResult.success ? 2 + Math.floor(savedShare / 18) + mediaWeight : Math.max(0, mediaWeight - 1);
  const controversyDelta = highDamage ? 3 + mediaWeight : missionResult.success ? -1 : 3 + mediaWeight;
  const fansDelta = missionResult.success ? Math.max(1, Math.floor(savedShare / 8)) : 0;
  const criticsDelta = missionResult.success && !highDamage ? 0 : 2 + mediaWeight;
  const nextFame = clamp((hero.fame ?? defaultHeroFame.fame) + fameDelta);
  const nextControversy = clamp((hero.controversy ?? defaultHeroFame.controversy) + controversyDelta);
  const tag =
    missionResult.success && savedShare >= 20
      ? "salvou muita gente"
      : highDamage
        ? "dano em debate"
        : missionResult.success
          ? "boa presença"
          : "cobrança pública";

  return {
    ...hero,
    fame: nextFame,
    controversy: nextControversy,
    fans: clamp((hero.fans ?? defaultHeroFame.fans) + fansDelta),
    critics: clamp((hero.critics ?? defaultHeroFame.critics) + criticsDelta),
    publicImage: imageFromScores(nextFame, nextControversy),
    mediaTags: [...new Set([tag, ...(hero.mediaTags ?? [])])].slice(0, 5),
    recentPosts: [
      {
        day: missionResult.day,
        text: `${hero.codinome} virou assunto após ${missionResult.event.titulo}.`,
        tone: missionResult.success ? "elogio" : "critica",
      },
      ...(hero.recentPosts ?? []),
    ].slice(0, 8),
    spotlightScore: (hero.spotlightScore ?? 0) + fameDelta - Math.floor(controversyDelta / 2) + heroIndex,
  };
};

export const applyMissionResultToHeroesFame = (heroes, missionResult, district) =>
  heroes.map((hero) => applyMissionResultToHeroFame(normalizeHeroFame(hero), missionResult, district));

export const getHeroPublicSummary = (hero) =>
  `${hero.publicImage ?? "nome promissor"} · fama ${hero.fame ?? 0}/100 · controvérsia ${hero.controversy ?? 0}/100`;

export const getMostFamousHeroes = (heroes, limit = 5) =>
  [...heroes].sort((first, second) => (second.fame ?? 0) - (first.fame ?? 0)).slice(0, limit);

export const getMostControversialHeroes = (heroes, limit = 5) =>
  [...heroes].sort((first, second) => (second.controversy ?? 0) - (first.controversy ?? 0)).slice(0, limit);
