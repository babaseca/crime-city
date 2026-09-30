const ASSET_ROOT = "/assets/occurrences";

export const cityOverviewVisual = {
  src: `${ASSET_ROOT}/nova-aurora-night-city.jpg`,
  alt: "Vista aérea noturna da malha viária de Nova Aurora.",
  credit: "Pexels photo 30582953",
};

const visuals = {
  city: {
    src: `${ASSET_ROOT}/nova-aurora-night-city.jpg`,
    alt: "Vista aérea noturna de vias urbanas iluminadas.",
    label: "Rede urbana",
    tone: "city",
  },
  port: {
    src: `${ASSET_ROOT}/industrial-port-night.jpg`,
    alt: "Porto industrial iluminado durante a noite.",
    label: "Zona portuária",
    tone: "port",
  },
  refinery: {
    src: `${ASSET_ROOT}/refinery-night.jpg`,
    alt: "Complexo industrial e refinaria iluminados à noite.",
    label: "Risco industrial",
    tone: "hazard",
  },
  drone: {
    src: `${ASSET_ROOT}/drone-city.jpg`,
    alt: "Drone sobrevoando uma grande área urbana.",
    label: "Vigilância aérea",
    tone: "tech",
  },
  data: {
    src: `${ASSET_ROOT}/data-center.jpg`,
    alt: "Racks de servidores com luzes em um data center.",
    label: "Infraestrutura digital",
    tone: "data",
  },
  tunnel: {
    src: `${ASSET_ROOT}/tunnel-night.jpg`,
    alt: "Túnel urbano escuro com luzes em movimento.",
    label: "Subsolo urbano",
    tone: "tunnel",
  },
  emergency: {
    src: `${ASSET_ROOT}/emergency-night.jpg`,
    alt: "Cena urbana noturna com veículo de emergência.",
    label: "Resposta emergencial",
    tone: "emergency",
  },
};

const districtFallbacks = {
  "Doca Leste": "port",
  "Porto Velado": "port",
  "Baixada Azul": "refinery",
  "Setor Rubi": "emergency",
  "Morro das Antenas": "data",
  "Alto Candeal": "city",
  "Estacao Norte": "tunnel",
  "Estação Norte": "tunnel",
  "Distrito Lumen": "data",
  "Distrito Lúmen": "data",
  "Mercado Nimbus": "city",
  "Jardins de Vidro": "city",
  "Cintura Verde": "city",
  "Vila Farol": "port",
  "Mirante Solar": "city",
  "Coroa Sul": "tunnel",
};

const rules = [
  { key: "drone", terms: ["drone", "drones", "motores", "motor", "maquinas", "maquina", "transito", "entrega"] },
  { key: "refinery", terms: ["quim", "vazamento", "tox", "contamin", "gas", "fuma", "incendio", "calor", "energia"] },
  { key: "data", terms: ["arquivo", "dados", "servidor", "rede", "municipal", "hacker", "sinal", "radio", "antena"] },
  { key: "tunnel", terms: ["tunel", "túnel", "subsolo", "subterr", "estacao", "estação", "metro", "ponte"] },
  { key: "emergency", terms: ["civil", "ambulancia", "ambulan", "evacu", "resgate", "queda", "briga", "tumulto"] },
  { key: "port", terms: ["porto", "doca", "mar", "cais", "galpao", "galpões", "galpoes"] },
];

const normalize = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const getOccurrenceVisual = (event) => {
  if (!event) return visuals.city;

  const haystack = normalize([
    event.titulo,
    event.descricao,
    event.bairro,
    ...(event.tags ?? []),
    ...(event.requisitosPrincipais ?? []),
  ].join(" "));

  const matchedRule = rules.find((rule) => rule.terms.some((term) => haystack.includes(normalize(term))));
  const normalizedDistrict = Object.keys(districtFallbacks).find((district) => normalize(district) === normalize(event.bairro));
  const fallbackKey = districtFallbacks[event.bairro] ?? districtFallbacks[normalizedDistrict] ?? "city";
  return visuals[matchedRule?.key ?? fallbackKey] ?? visuals.city;
};

export const occurrenceVisualCredits = [
  { file: "nova-aurora-night-city.jpg", source: "https://www.pexels.com/photo/aerial-night-view-of-city-highways-and-lights-30582953/" },
  { file: "industrial-port-night.jpg", source: "https://www.pexels.com/photo/nighttime-industrial-port-with-illuminated-cranes-30750630/" },
  { file: "refinery-night.jpg", source: "https://www.pexels.com/photo/industrial-buildings-at-night-10396413/" },
  { file: "drone-city.jpg", source: "https://www.pexels.com/photo/drone-flying-over-city-buildings-2343483/" },
  { file: "data-center.jpg", source: "https://www.pexels.com/photo/light-on-computer-17489153/" },
  { file: "tunnel-night.jpg", source: "https://www.pexels.com/photo/dark-tunnel-with-lights-26626437/" },
  { file: "emergency-night.jpg", source: "https://www.pexels.com/photo/ambulance-with-reflective-american-flag-at-night-30282074/" },
];
