import templates from "../data/socialPostTemplates.json";

const handles = [
  "maedonimbus",
  "rubirage",
  "teoriadocone",
  "fa_clube_vetor",
  "moradorfarol",
  "luzcansada",
  "vozdabaixada",
  "antena_aberta",
  "cafeedano",
  "prefeitura_nao",
];

const pick = (items, index) => items[Math.abs(index) % items.length];

const templateForTone = (tone, index = 0) => {
  const pool = templates.filter((template) => template.tone === tone);
  return pick(pool.length ? pool : templates, index);
};

const fillTemplate = (template, { hero, district, faction, handle }) =>
  template
    .replaceAll("{hero}", hero?.codinome ?? "a equipe")
    .replaceAll("{district}", district?.name ?? "Nova Aurora")
    .replaceAll("{faction}", faction?.name ?? "essa facção")
    .replaceAll("{handle}", handle);

export const generateSocialPosts = (dayReport, missionResults, heroes, districts, factions) => {
  if (!dayReport) return [];
  const posts = [];
  const day = dayReport.day;
  const dayMissions = missionResults.filter((mission) => mission.day === day);

  dayMissions.slice(0, 5).forEach((mission, index) => {
    const district = districts.find((item) => item.id === mission.event.districtId);
    const faction = factions.find((item) => item.id === mission.event.factionId);
    const hero = heroes.find((item) => mission.heroIds?.includes(item.id));
    const tone = mission.deaths?.length
      ? "luto"
      : mission.capturedVillain
        ? "facção"
        : mission.success && mission.civiliansSaved > 30
          ? "agradecimento"
          : mission.success
            ? index % 2 ? "meme" : "elogio"
            : district?.mediaAttention > 60
              ? "politico"
              : "critica";
    const template = templateForTone(tone, day + index);
    const handle = pick(handles, day * 7 + index * 3);
    const narrativeSeed = mission.socialSeeds?.[0] ?? mission.playByPlay?.seeds?.socialSeeds?.[0];

    posts.push({
      id: `post-${day}-${mission.id}-${index}`,
      day,
      authorHandle: `@${handle}`,
      districtId: district?.id,
      heroId: hero?.id,
      factionId: faction?.id,
      tone,
      text: narrativeSeed ?? fillTemplate(template.template, { hero, district, faction, handle }),
      impact: {
        reputationChange: tone === "critica" || tone === "politico" ? -1 : tone === "agradecimento" || tone === "elogio" ? 1 : 0,
        districtTrustChange: tone === "agradecimento" ? 1 : tone === "critica" ? -1 : 0,
        heroFameChange: hero ? (tone === "agradecimento" || tone === "fa" ? 2 : tone === "critica" ? 1 : 0) : 0,
      },
    });
  });

  const worstDistrict = [...districts].sort((a, b) => a.trustInCentral - b.trustInCentral)[0];
  if (worstDistrict && worstDistrict.trustInCentral < 35) {
    const template = templateForTone("denuncia", day);
    posts.push({
      id: `post-${day}-district-${worstDistrict.id}`,
      day,
      authorHandle: "@bairrosemsono",
      districtId: worstDistrict.id,
      tone: "denuncia",
      text: fillTemplate(template.template, { district: worstDistrict, handle: "bairrosemsono" }),
      impact: { reputationChange: -1, districtTrustChange: -1, heroFameChange: 0 },
    });
  }

  return posts.slice(0, 8);
};

export const applySocialImpactToReputation = (posts) =>
  Math.max(-3, Math.min(3, posts.reduce((sum, post) => sum + (post.impact?.reputationChange ?? 0), 0)));

export const getPostsByDistrict = (posts, districtId) => posts.filter((post) => post.districtId === districtId);
export const getPostsByHero = (posts, heroId) => posts.filter((post) => post.heroId === heroId);
export const getPostsByTone = (posts, tone) => posts.filter((post) => post.tone === tone);
