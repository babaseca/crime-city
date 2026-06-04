# Central de Crise - Heróis de Plantão

Log técnico de funcionalidades por versão lançada.

Estado atual do projeto: `0.9.5-alpha`.

## Alpha 0.9.5 - Missões Cinematográficas

Foco da versão: transformar o relatório pós-missão em uma transmissão operacional com timeline narrativa.

Funcionalidades lançadas:

- Novo sistema Mission Play-by-Play.
- Nova seção visual `Como aconteceu` no relatório de missão.
- Geração de beats narrativos por evento, tag, bairro, facção, resultado, combo, captura e ferimento.
- Fallback narrativo seguro para toda missão resolvida ou alerta perdido.
- Histórico recente `recentPlayByPlay` com cooldown para reduzir repetição.
- Estatísticas `playByPlayStats` para acompanhar origem das narrações.
- Seeds narrativas para Jornal, Rede Aurora e Legado.
- Validador narrativo exportável e script `validate:narrative`.

Arquivos principais:

- `src/engine/playByPlayContext.js`
- `src/engine/playByPlaySystem.js`
- `src/engine/playByPlayValidation.js`
- `src/components/mission/PlayByPlayTimeline.jsx`
- `src/components/mission/PlayByPlayBeat.jsx`
- `src/components/mission/MissionReportCinematic.jsx`
- `src/data/playByPlay/`

Validação:

- Cobertura inicial validada: 420 eventos com 15+ rotas narrativas pelo critério conservador.
- 9 variações completas e 71 beats reutilizáveis no pacote inicial.
- Nenhum placeholder inválido encontrado.
- Nenhum beat incompatível com missão solo encontrado.

## Alpha 0.8.0 - Diálogos Expandidos

Foco da versão: ampliar fortemente a variedade narrativa dos relatórios pós-missão.

Funcionalidades lançadas:

- Importação do pacote externo `dialogues_alpha_050_1500plus.json` para a base principal de diálogos.
- Expansão de `src/data/dialogues.json` de 16 para 2.305 diálogos fixos.
- Catálogo total estimado em runtime: 2.655 diálogos, somando os diálogos fixos aos 350 diálogos gerados por `src/engine/dialogueSystem.js`.
- Atualização da versão do jogo para `0.8.0-alpha`.
- Atualização do save atual para `saveVersion: "0.8.0"`.
- Nova chave de persistência local: `central-de-crise-herois-de-plantao:v8`.
- Compatibilidade de carregamento mantida com saves `v7`, `v5`, `v4` e `v2`.

Detalhes técnicos:

- `src/data/dialogues.json` passou a aceitar diálogos com:
  - `priority`;
  - `cooldownDays`;
  - `tone`;
  - `districtId`;
  - `districtTags`;
  - `factionId`;
  - `factionTags`.
- `src/engine/dialogueSystem.js` foi ajustado para:
  - preservar `priority` e `cooldownDays` vindos do JSON;
  - priorizar diálogos específicos de bairro e facção;
  - bloquear diálogos com `districtId` ou `factionId` incompatíveis com a missão;
  - pontuar `districtTags` e `factionTags` no ranking;
  - reconhecer speakers especiais como `dispatcher` e `comando`;
  - manter fallback seguro quando nenhum diálogo contextual é elegível.
- O sistema continua usando memória recente em `recentDialogues` para evitar repetição dentro do cooldown.

Validação:

- `vite build` passou.
- Smoke test em navegador validou:
  - criação de novo plantão;
  - missão enviada;
  - relatório pós-missão aberto;
  - diálogo registrado em `recentDialogues`;
  - save gravado como `0.8.0`.

Nota técnica:

- O bundle principal ficou maior por embutir 2.305 diálogos no build. O Vite passou a emitir aviso de chunk acima de 500 kB. Uma otimização futura recomendada é carregar `dialogues.json` sob demanda ou dividir dados narrativos em chunks.

## Alpha 0.7.0 - Vilões e Consequências

Foco da versão: transformar vilões em entidades recorrentes e registrar consequências permanentes de campanha.

Funcionalidades lançadas:

- Ciclo de vida persistente para vilões.
- Estados expandidos de vilão, incluindo:
  - `fugitivo`;
  - `capturado`;
  - `preso`;
  - `em_julgamento`;
  - `em_reabilitacao`;
  - `informante`;
  - `reformado`;
  - `aliado_condicional`;
  - `desaparecido`;
  - `morto`.
- Sistema de custódia, julgamento e risco de fuga.
- Sistema de reforma progressiva de vilões.
- Interrogatórios com abordagens diferentes.
- Rivalidades entre heróis e vilões.
- Retaliações de vilões/facções.
- Organização rival inicial: `Resposta Atlas`.
- Arcos de temporada.
- Missões de grande crise.
- Registro de legado permanente da cidade.

Arquivos principais:

- `src/engine/villainLifecycleSystem.js`
- `src/engine/custodySystem.js`
- `src/engine/villainReformSystem.js`
- `src/engine/interrogationSystem.js`
- `src/engine/rivalrySystem.js`
- `src/engine/retaliationSystem.js`
- `src/engine/rivalOrganizationSystem.js`
- `src/engine/seasonArcSystem.js`
- `src/engine/crisisMissionSystem.js`
- `src/engine/legacySystem.js`
- `src/engine/saveMigration070.js`

Dados adicionados:

- `src/data/custodyActions.json`
- `src/data/interrogationApproaches.json`
- `src/data/retaliationEvents.json`
- `src/data/rivalOrganizations.json`
- `src/data/seasonArcs.json`
- `src/data/crisisMissions.json`

Detalhes técnicos:

- `normalizeVillainLifecycle()` adiciona campos ausentes em saves antigos e normaliza vilões para o ciclo 0.7.
- `applyCustodyDailyTick()` processa risco de fuga e resolução de julgamento ao fim do dia.
- `progressRehabilitation()` calcula avanço de reforma com base em:
  - empatia do Dispatcher;
  - carisma do mentor;
  - upgrades da base;
  - violência/periculosidade do vilão.
- `recordLegacyFromMission()` registra consequências permanentes de missões no `cityLegacy`.
- `generateRetaliationEvent()` cria eventos especiais quando facções ou vilões acumulam pressão suficiente.

Persistência:

- `saveVersion: "0.7.0"`.
- Novos campos persistidos:
  - `villainLifecycle`;
  - `custody`;
  - `reformPrograms`;
  - `informants`;
  - `rivalries`;
  - `retaliationHistory`;
  - `rivalOrganizations`;
  - `seasonArcs`;
  - `crisisMissions`;
  - `cityLegacy`.

## Alpha 0.6.0 - Equipe Viva

Foco da versão: transformar os heróis em uma equipe com rotina, desgaste, descanso, treinamento, moral e relações táticas.

Funcionalidades lançadas:

- App `Escala`.
- App `Treinamento`.
- Status de escala por herói:
  - `on_duty`;
  - `resting`;
  - `training`;
  - `therapy`;
  - `medical`;
  - `reserve`;
  - `unavailable`.
- Fadiga profunda.
- Risco de burnout.
- Descanso e terapia com efeitos reais.
- Lesões detalhadas e persistentes.
- Treinamentos com duração, custo e efeitos.
- Moral coletiva da equipe.
- Combos/sinergias entre heróis.
- Cenas de equipe/base.
- Arcos pessoais de heróis.
- Progressão adicional do Dispatcher com perks.

Arquivos principais:

- `src/components/schedule/ScheduleApp.jsx`
- `src/components/training/TrainingApp.jsx`
- `src/engine/scheduleSystem.js`
- `src/engine/fatigueSystem.js`
- `src/engine/injurySystem.js`
- `src/engine/trainingSystem.js`
- `src/engine/teamMoraleSystem.js`
- `src/engine/comboSystem.js`
- `src/engine/teamSceneSystem.js`
- `src/engine/heroArcSystem.js`
- `src/engine/dispatcherProgressionSystem.js`
- `src/engine/saveMigration060.js`

Dados adicionados:

- `src/data/injuries.json`: 10 tipos de lesão.
- `src/data/trainingPrograms.json`: 9 programas de treinamento.
- `src/data/teamCombos.json`: 5 combos iniciais.
- `src/data/teamScenes.json`: 5 cenas de equipe.
- `src/data/heroArcs.json`: 3 arcos pessoais iniciais.
- `src/data/dispatcherPerks.json`: 7 perks do Dispatcher.

Detalhes técnicos:

- `isMissionAvailableHero()` passou a exigir `scheduleStatus === "on_duty"` para aparecer no Despacho.
- `calculateMissionChance()` passou a considerar:
  - fadiga;
  - status de escala;
  - lesões;
  - moral coletiva;
  - combos ativos.
- `resolveMission()` passou a retornar `activeCombos`.
- `applyMissionFatigue()` aumenta fadiga, burnout e contadores de excesso de uso após missões.
- `progressTraining()` resolve atividades de treinamento ao fim do dia.
- `applyScheduleEndOfDayRecovery()` processa descanso, terapia e recuperação diária.
- `checkHeroArcTriggers()` avança arcos pessoais conforme estresse, fadiga, missões e lesões.

Persistência:

- `saveVersion: "0.6.0"`.
- Novos campos persistidos:
  - `schedule`;
  - `teamMorale`;
  - `injuries`;
  - `trainingAssignments`;
  - `unlockedCombos`;
  - `heroArcs`;
  - `dispatcherProgression`;
  - `recentTeamScenes`;
  - `uiSettings`.

## UI 2.0 - Hub Operacional da Central

Foco da atualização visual: reduzir poluição visual e substituir o desktop de múltiplas janelas por um hub de gestão moderno.

Funcionalidades lançadas:

- Novo layout principal `CommandHubLayout`.
- Navegação lateral fixa por categoria.
- Top bar com indicadores principais.
- Painel lateral de contexto vivo.
- Modo de densidade visual:
  - `comfortable`;
  - `compact`.
- Estilo mais limpo para sessões longas.

Arquivos principais:

- `src/layouts/CommandHubLayout.jsx`
- `src/layouts/TopCommandBar.jsx`
- `src/layouts/SideNavigation.jsx`
- `src/layouts/ContextPanel.jsx`
- `src/styles/designTokens.css`

Detalhes técnicos:

- O layout antigo `CentralDesktop` foi preservado no código, mas o shell ativo passou a ser `CommandHubLayout`.
- `SideNavigation` organiza módulos por:
  - Operação;
  - Equipe;
  - Cidade;
  - Administração.
- `ContextPanel` cruza dados de:
  - bairros perigosos;
  - heróis famosos/controversos;
  - Rede Aurora;
  - temporada/legado.
- `uiSettings.density` é salvo em localStorage junto do estado da campanha.

## Alpha 0.5.0 - Cidade Viva

Foco da versão: transformar Nova Aurora em uma cidade reativa, com bairros, facções, opinião pública e consequências territoriais.

Funcionalidades lançadas:

- Sistema persistente de bairros vivos.
- App `Mapa da Cidade`.
- Sistema persistente de facções.
- Eventos diários considerando bairros e facções.
- Eventos encadeados.
- Rede Aurora.
- Fama individual dos heróis.
- Jornal diário mais profundo.
- Relatórios expandidos.
- Melhorias de infraestrutura da Central.
- Comando/Chefia conectado à cidade.

Arquivos principais:

- `src/components/city/CityMapApp.jsx`
- `src/components/social/SocialFeedApp.jsx`
- `src/components/base/BaseInfrastructureApp.jsx`
- `src/engine/districtSystem.js`
- `src/engine/factionSystem.js`
- `src/engine/eventChainSystem.js`
- `src/engine/socialSystem.js`
- `src/engine/heroFameSystem.js`
- `src/engine/baseUpgradeSystem.js`
- `src/engine/saveMigrationSystem.js`

Dados adicionados:

- `src/data/districts.json`: 14 bairros.
- `src/data/factions.json`: 6 facções.
- `src/data/eventChains.json`: 5 cadeias.
- `src/data/socialPostTemplates.json`: 10 modelos de post.
- `src/data/baseUpgrades.json`: 7 melhorias da Central.

Detalhes técnicos:

- `applyMissionResultToDistricts()` altera estabilidade, confiança, crime, infraestrutura e estatísticas locais após cada missão.
- `applyDailyDistrictDecay()` piora bairros negligenciados ao fim do dia.
- `applyMissionResultToFactions()` altera ameaça, recursos e heat de facções.
- `applyDailyFactionTick()` processa recuperação, expansão e retaliação de facções.
- `generateDailyAlerts()` passou a considerar:
  - dia da campanha;
  - tamanho da equipe ativa;
  - bairros perigosos;
  - facções;
  - cadeias ativas;
  - objetivos do Comando.
- `generateSocialPosts()` cria posts com impacto leve em reputação, bairro e fama de heróis.
- `applyMissionResultToHeroesFame()` atualiza fama, controvérsia, fãs, críticos e tags de mídia.

Persistência:

- `saveVersion: "0.5.0"`.
- Novos campos persistidos:
  - `districts`;
  - `factions`;
  - `activeEventChains`;
  - `completedEventChains`;
  - `discoveredClues`;
  - `socialPosts`;
  - `baseUpgrades`;
  - `commandObjectives`;
  - `cityHistory`.

## Alpha 0.4.0 - Campanha do Dispatcher

Foco da versão: deixar a campanha menos genérica, com equipe limitada, criação do Dispatcher, jornal diário e melhor organização de layout.

Funcionalidades lançadas:

- Criação do personagem do jogador: Dispatcher.
- Escolha de equipe inicial.
- Limite de equipe ativa em 8 membros.
- Status de equipe:
  - `available_global`;
  - `applicant`;
  - `active_team`;
  - `reserve`;
  - `assigned_by_command`;
  - `injured`;
  - `dead`;
  - `retired`;
  - `reformed_villain`.
- Geração de alertas balanceada para equipe pequena.
- Jornal ao fim do dia.
- Comando/Chefia Regional.
- RH Heroico respeitando orçamento e limite de equipe.
- Arquivo de vilões com captura, reforma e contenção.
- Banco de Heróis com filtros.
- Memorial.
- Relatórios com abas.
- Diálogos pós-missão com cooldown e ranking contextual.

Arquivos principais:

- `src/components/setup/DispatcherSetup.jsx`
- `src/components/news/NewspaperModal.jsx`
- `src/components/news/NewspaperArchive.jsx`
- `src/engine/dispatcherSystem.js`
- `src/engine/newspaperSystem.js`
- `src/engine/commandSystem.js`
- `src/engine/recruitmentSystem.js`
- `src/engine/villainSystem.js`
- `src/engine/dialogueSystem.js`
- `src/engine/saveSystem.js`

Detalhes técnicos:

- `createInitialGameState()` cria campanha com Dispatcher, equipe inicial reduzida e alertas do Dia 1.
- `hydrateGameState()` reconstrói saves antigos com defaults seguros.
- `activeTeamCount()` e `isMissionAvailableHero()` controlam disponibilidade operacional.
- `generateDailyAlerts()` limita risco/dificuldade no começo da campanha.
- `endDay()` gera relatório diário, jornal, novos alertas, orçamento e atualizações narrativas.
- `recentDialogues` guarda histórico recente para reduzir repetição de falas.

Persistência:

- Save local em `localStorage`.
- Campos relevantes:
  - `dispatcher`;
  - `heroes`;
  - `activeEvents`;
  - `history`;
  - `dayReports`;
  - `newspapers`;
  - `recentDialogues`;
  - `commandEvents`;
  - `budgetLog`.

## Alpha 0.1.0 - MVP de Despacho Heroico

Foco da versão: criar o núcleo jogável do simulador textual.

Funcionalidades lançadas:

- Aplicação React + Vite.
- Estado local para campanha.
- Banco inicial com 20 heróis originais.
- Banco de 420 eventos originais.
- Sistema de alertas ativos.
- Seleção de 1 a 3 heróis por ocorrência.
- Cálculo de chance de sucesso.
- Resultado de missão com:
  - sucesso/falha;
  - reputação;
  - orçamento;
  - XP;
  - energia;
  - estresse;
  - ferimentos;
  - mortes raras;
  - captura de vilão.
- Sistema de relacionamento por pares de heróis.
- Passagem de dias.
- Relatório diário.

Arquivos principais:

- `src/App.jsx`
- `src/components/dispatch/DispatchApp.jsx`
- `src/components/dispatch/AlertCard.jsx`
- `src/components/dispatch/AlertDetails.jsx`
- `src/components/dispatch/HeroSelectionPanel.jsx`
- `src/components/dispatch/MissionResultModal.jsx`
- `src/engine/gameState.js`
- `src/engine/mission.js`
- `src/engine/relationships.js`

Dados principais:

- `src/data/heroes.js`: 20 heróis.
- `src/data/events.js`: 420 eventos.
- `src/data/villains.json`: 15 vilões.
- `src/data/applicants.json`: 12 candidatos.

Detalhes técnicos:

- `calculateMissionChance()` combina:
  - requisitos do evento;
  - atributos dos heróis;
  - cansaço;
  - estresse;
  - relacionamento médio;
  - bônus de função;
  - modificadores do Dispatcher;
  - upgrades da base.
- `resolveMission()` resolve:
  - rolagem de sucesso;
  - margem;
  - dano material;
  - civis salvos;
  - ferimentos;
  - morte;
  - captura de vilão;
  - mudanças de relacionamento;
  - diálogo contextual.
- `buildInitialRelationships()` gera relações iniciais entre pares de heróis.
- `pairKey()` padroniza chaves de relacionamento.

## Estado técnico atual

Stack:

- React 19.
- Vite 7.
- `lucide-react` para ícones.
- Sem backend.
- Sem banco externo.
- Persistência via `localStorage`.

Contagens atuais de conteúdo:

- Heróis: 20.
- Eventos: 420.
- Candidatos de RH: 12.
- Vilões: 15.
- Bairros: 14.
- Facções: 6.
- Cadeias de eventos: 5.
- Melhorias da Central: 7.
- Lesões: 10.
- Treinamentos: 9.
- Combos: 5.
- Cenas de equipe: 5.
- Arcos pessoais: 3.
- Perks do Dispatcher: 7.
- Diálogos fixos: 2.305.

Módulos de engine atuais:

- `baseSceneSystem.js`
- `baseUpgradeSystem.js`
- `comboSystem.js`
- `commandSystem.js`
- `crisisMissionSystem.js`
- `custodySystem.js`
- `dialogueSystem.js`
- `dispatcherProgressionSystem.js`
- `dispatcherSystem.js`
- `districtSystem.js`
- `eventChainSystem.js`
- `factionSystem.js`
- `fatigueSystem.js`
- `gameState.js`
- `heroArcSystem.js`
- `heroFameSystem.js`
- `injurySystem.js`
- `interrogationSystem.js`
- `legacySystem.js`
- `mission.js`
- `newspaperSystem.js`
- `recruitmentSystem.js`
- `relationships.js`
- `retaliationSystem.js`
- `rivalOrganizationSystem.js`
- `rivalrySystem.js`
- `saveMigration060.js`
- `saveMigration070.js`
- `saveMigrationSystem.js`
- `saveSystem.js`
- `scheduleSystem.js`
- `seasonArcSystem.js`
- `socialSystem.js`
- `teamMoraleSystem.js`
- `teamSceneSystem.js`
- `trainingSystem.js`
- `villainLifecycleSystem.js`
- `villainReformSystem.js`
- `villainSystem.js`

Notas de manutenção:

- O build atual passa, mas emite aviso de chunk grande por causa do volume de diálogos embutidos.
- Otimização recomendada para versões futuras: carregar catálogos narrativos por demanda ou separar `dialogues.json` em chunks por tom/tag/contexto.
- O sistema de migração atual cobre 0.5.0, 0.6.0 e 0.7.0; a 0.8.0 não exigiu migração estrutural além de `saveVersion`, pois foi uma expansão de conteúdo e ranking de diálogos.
