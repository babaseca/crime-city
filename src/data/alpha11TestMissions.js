export const alpha11VerticalMissions = [
  {
    id: "alpha11-hospital-generator-sabotage",
    titulo: "Sabotagem de gerador criminoso perto de um hospital",
    descricao:
      "Um gerador clandestino foi ligado à rede auxiliar de um hospital no Distrito Lúmen. A carga pode explodir ou derrubar a ala crítica; a Central precisa escolher entre evacuar civis, preservar energia e expor a facção.",
    bairro: "Distrito Lúmen",
    districtId: "distrito_lumen",
    faccao: "Sindicato do Apagão",
    factionId: "sindicato_do_apagao",
    nivelRisco: 3,
    dificuldade: 64,
    requisitosPrincipais: ["controle", "investigacao"],
    tags: ["alpha11", "hospital", "energia", "gerador", "infraestrutura", "civis", "protocolo", "midia"],
    limiteTempoNarrativo: "45 minutos",
    source: "alpha11",
    alpha11: true,
  },
];

export default alpha11VerticalMissions;
