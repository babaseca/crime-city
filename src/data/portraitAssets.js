const HERO_BASE = "/assets/portraits/heroes/";
const VILLAIN_BASE = "/assets/portraits/villains/";

export const heroPortraits = {
  "h-aurora-vetor": `${HERO_BASE}h-aurora-vetor.jpg`,
  "h-bruma-livre": `${HERO_BASE}h-bruma-livre.jpg`,
  "h-cifra-rasa": `${HERO_BASE}h-cifra-rasa.jpg`,
  "h-domo-prata": `${HERO_BASE}h-domo-prata.jpg`,
  "h-eco-mandarim": `${HERO_BASE}h-eco-mandarim.jpg`,
  "h-faisca-norte": `${HERO_BASE}h-faisca-norte.jpg`,
  "h-geodo-vivo": `${HERO_BASE}h-geodo-vivo.jpg`,
  "h-horizonte-lince": `${HERO_BASE}h-horizonte-lince.jpg`,
  "h-ilha-pulso": `${HERO_BASE}h-ilha-pulso.jpg`,
  "h-jade-trovao": `${HERO_BASE}h-jade-trovao.jpg`,
  "h-lampiao-azul": `${HERO_BASE}h-lampiao-azul.jpg`,
  "h-matriz-solar": `${HERO_BASE}h-matriz-solar.jpg`,
  "h-noctiluca": `${HERO_BASE}h-noctiluca.jpg`,
  "h-orla-firme": `${HERO_BASE}h-orla-firme.jpg`,
  "h-papiro-rubro": `${HERO_BASE}h-papiro-rubro.jpg`,
  "h-quartzo-manso": `${HERO_BASE}h-quartzo-manso.jpg`,
  "h-rosa-vetorial": `${HERO_BASE}h-rosa-vetorial.jpg`,
  "h-salva-vidro": `${HERO_BASE}h-salva-vidro.jpg`,
  "h-trilho-claro": `${HERO_BASE}h-trilho-claro.jpg`,
  "h-umbra-coral": `${HERO_BASE}h-umbra-coral.jpg`,
};

export const villainPortraits = {
  "vilha-ferrugem": `${VILLAIN_BASE}vilha-ferrugem.jpg`,
  "vilha-marionete-luz": `${VILLAIN_BASE}vilha-marionete-luz.jpg`,
  "vilha-pedra-oco": `${VILLAIN_BASE}vilha-pedra-oco.jpg`,
  "vilha-salitre": `${VILLAIN_BASE}vilha-salitre.jpg`,
  "vilha-pregao": `${VILLAIN_BASE}vilha-pregao.jpg`,
  "vilha-coroa-rubi": `${VILLAIN_BASE}vilha-coroa-rubi.jpg`,
  "vilha-seiva-torta": `${VILLAIN_BASE}vilha-seiva-torta.jpg`,
  "vilha-tremorinho": `${VILLAIN_BASE}vilha-tremorinho.jpg`,
  "vilha-lodo-fino": `${VILLAIN_BASE}vilha-lodo-fino.jpg`,
  "vilha-prisma-falso": `${VILLAIN_BASE}vilha-prisma-falso.jpg`,
  "vilha-breu-claro": `${VILLAIN_BASE}vilha-breu-claro.jpg`,
  "vilha-lacre-negro": `${VILLAIN_BASE}vilha-lacre-negro.jpg`,
  "vilha-chiado": `${VILLAIN_BASE}vilha-chiado.jpg`,
  "vilha-madre-cabo": `${VILLAIN_BASE}vilha-madre-cabo.jpg`,
  "vilha-espelho-bento": `${VILLAIN_BASE}vilha-espelho-bento.jpg`,
  "vilha-baronesa_do_ru_do": `${VILLAIN_BASE}vilha-baronesa_do_ru_do.jpg`,
  "vilha-cardume_cinza": `${VILLAIN_BASE}vilha-cardume_cinza.jpg`,
  "vilha-chaveiro_de_n_voa": `${VILLAIN_BASE}vilha-chaveiro_de_n_voa.jpg`,
  "vilha-dama_das_fia_es": `${VILLAIN_BASE}vilha-dama_das_fia_es.jpg`,
  "vilha-eco_do_viaduto": `${VILLAIN_BASE}vilha-eco_do_viaduto.jpg`,
  "vilha-falso_sem_foro": `${VILLAIN_BASE}vilha-falso_sem_foro.jpg`,
  "vilha-giz_de_guerra": `${VILLAIN_BASE}vilha-giz_de_guerra.jpg`,
  "vilha-h_spede_zero": `${VILLAIN_BASE}vilha-h_spede_zero.jpg`,
  "vilha-m_de_rua": `${VILLAIN_BASE}vilha-m_de_rua.jpg`,
  "vilha-janela_cega": `${VILLAIN_BASE}vilha-janela_cega.jpg`,
  "vilha-karaok_sombrio": `${VILLAIN_BASE}vilha-karaok_sombrio.jpg`,
  "vilha-lacre_violeta": `${VILLAIN_BASE}vilha-lacre_violeta.jpg`,
  "vilha-mestre_da_goteira": `${VILLAIN_BASE}vilha-mestre_da_goteira.jpg`,
  "vilha-n_de_cobre": `${VILLAIN_BASE}vilha-n_de_cobre.jpg`,
  "vilha-or_culo_do_mofo": `${VILLAIN_BASE}vilha-or_culo_do_mofo.jpg`,
  "vilha-p_tio_fantasma": `${VILLAIN_BASE}vilha-p_tio_fantasma.jpg`,
  "vilha-quina_de_sal": `${VILLAIN_BASE}vilha-quina_de_sal.jpg`,
  "vilha-rascunho_negro": `${VILLAIN_BASE}vilha-rascunho_negro.jpg`,
  "vilha-sargento_vala": `${VILLAIN_BASE}vilha-sargento_vala.jpg`,
  "vilha-tinta_rasa": `${VILLAIN_BASE}vilha-tinta_rasa.jpg`,
  "vilha-ursa_de_vidro": `${VILLAIN_BASE}vilha-ursa_de_vidro.jpg`,
  "vilha-voto_frio": `${VILLAIN_BASE}vilha-voto_frio.jpg`,
  "vilha-xadrez_de_lona": `${VILLAIN_BASE}vilha-xadrez_de_lona.jpg`,
  "vilha-zigue_zague": `${VILLAIN_BASE}vilha-zigue_zague.jpg`,
  "vilha-arquivo_morto": `${VILLAIN_BASE}vilha-arquivo_morto.jpg`,
};

export const isGeneratedPortraitPlaceholder = (imageUrl) =>
  typeof imageUrl === "string" && imageUrl.startsWith("data:image/svg+xml");

export const resolveHeroPortrait = (hero, fallbackUrl = "") => {
  const current = hero?.imageUrl ?? "";
  if (current && !isGeneratedPortraitPlaceholder(current)) return current;
  return heroPortraits[hero?.id] ?? fallbackUrl ?? current;
};

export const resolveVillainPortrait = (villain, fallbackUrl = "") => {
  const current = villain?.imageUrl ?? "";
  if (current && !isGeneratedPortraitPlaceholder(current)) return current;
  return villainPortraits[villain?.id] ?? fallbackUrl ?? current;
};
