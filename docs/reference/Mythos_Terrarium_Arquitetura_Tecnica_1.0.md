# Mythos Terrarium — Arquitetura Técnica e Plano de Desenvolvimento

**Versão:** 1.0  
**Data:** 14/11/2026  
**Status:** Proposta técnica inicial  
**Tecnologias principais:** Three.js, TypeScript e Vite

---

## 1. Visão do projeto

Mythos Terrarium é um simulador de ecossistema mitológico em 3D. Criaturas inspiradas em diferentes mitologias vivem de forma autônoma em habitats conectados, movimentam-se pelo mundo, procuram recursos, descansam, exploram, interagem e respondem às condições ambientais.

A experiência principal é a observação: o usuário acompanha a rotina do ecossistema como em um terrário ou documentário de natureza, sem precisar controlar diretamente cada criatura.

### Definições aprovadas

| Dimensão | Decisão |
|---|---|
| Tecnologia 3D | Three.js |
| Linguagem | TypeScript |
| Formato dos assets | Ainda desconhecido; será auditado na primeira sprint |
| Mundo | Aberto, com habitats conectados |
| Primeira versão | Múltiplos habitats |
| Estilo visual | Estilizado, com aparência natural |
| População-alvo | 100+ criaturas simultâneas como meta de escala |
| Experiência | Simulação autônoma e observação |
| Persistência inicial | IndexedDB |
| Build | Vite |

### Princípios do produto

1. O mundo deve continuar evoluindo sem intervenção do usuário.
2. Criaturas da mesma espécie podem apresentar personalidades e rotinas individuais.
3. O ambiente deve influenciar decisões e comportamentos.
4. A simulação lógica deve ser independente da renderização Three.js.
5. O mundo deve poder crescer por meio de novos habitats, espécies e comportamentos configuráveis.
6. O desempenho deve ser medido e otimizado com profiling, não por suposições.
7. Os assets existentes devem ser aproveitados sempre que possível; não criar modelos substitutos antes de auditar o pacote disponível.

---

## 2. Escopo do MVP

O MVP deve demonstrar um ecossistema funcional, não apenas uma cena 3D.

### Incluído

- Mundo aberto dividido em setores.
- Pelo menos três habitats conectados.
- Pelo menos cinco espécies.
- Carregamento dos modelos e animações existentes.
- Criaturas com necessidades básicas.
- Exploração, descanso, alimentação e hidratação.
- Movimentação autônoma compatível com o tipo de locomoção.
- Interações básicas entre espécies.
- Ciclo de dia e noite.
- Câmera livre e câmera de acompanhamento.
- Inspetor de criatura e diário de eventos.
- Salvamento e carregamento do estado lógico do mundo.
- Meta de teste de 100+ criaturas na simulação, com níveis diferentes de detalhe.

### Fora do escopo obrigatório do primeiro MVP

- Reprodução completa e hereditariedade.
- Ciclo de vida detalhado.
- Extinção e equilíbrio populacional avançado.
- Geração procedural completa do continente.
- Multiplayer.
- Simulação física completa para todas as criaturas.
- IA generativa ou LLM controlando decisões em tempo real.

Esses itens podem ser adicionados depois que a simulação básica estiver estável.

---

## 3. Arquitetura de alto nível

A aplicação será organizada em subsistemas com responsabilidades explícitas.

```text
MYTHOS TERRARIUM
|
+-- Application / Runtime
|
+-- World Engine
|   +-- World Manager
|   +-- Sector Manager
|   +-- Habitat Manager
|   +-- Environment Resources
|   +-- Weather and Time
|
+-- Creature Engine
|   +-- Creature Entity
|   +-- Species Registry
|   +-- Creature Factory
|   +-- Attributes and Needs
|   +-- Lifecycle
|
+-- Behavior Engine
|   +-- Utility AI
|   +-- State Machine
|   +-- Perception
|   +-- Memory
|   +-- Behavior Library
|
+-- Navigation Engine
|   +-- Ground Navigation
|   +-- Flight Navigation
|   +-- Water Navigation
|   +-- Steering Behaviors
|
+-- Ecology Engine
|   +-- Food and Water
|   +-- Territory
|   +-- Interactions
|   +-- Population
|   +-- Reproduction (future)
|
+-- Persistence Engine
|   +-- Save Manager
|   +-- IndexedDB Adapter
|   +-- Save Migrations
|
+-- Presentation Engine
|   +-- Three.js Renderer
|   +-- Asset Manager
|   +-- Animation Manager
|   +-- LOD and Culling
|   +-- Camera and Effects
|
+-- Observer Interface
    +-- HUD
    +-- Creature Inspector
    +-- Habitat Panel
    +-- Event Journal
    +-- Simulation Controls
```

### Regra arquitetural fundamental

A lógica de simulação não deve importar nem depender de classes de renderização do Three.js.

Fluxo de exemplo:

1. A Utility AI decide que uma criatura deve procurar alimento.
2. O Behavior Engine inicia o comportamento `Forage`.
3. O Navigation Engine calcula ou solicita uma rota.
4. O Creature Controller atualiza posição e orientação lógica.
5. O Presentation Engine sincroniza o modelo 3D e reproduz a animação apropriada.

Essa separação permite testar IA, ecologia e navegação sem iniciar uma cena gráfica.

---

## 4. Stack tecnológica recomendada

| Tecnologia | Responsabilidade | Observações |
|---|---|---|
| Three.js | Renderização 3D | Núcleo visual |
| TypeScript | Linguagem | Tipagem e contratos |
| Vite | Dev server e build | Inicialização simples |
| GLTFLoader | Modelos GLB/GLTF | Formato preferencial de runtime |
| FBXLoader | Importação FBX, se necessária | Avaliar conversão para glTF |
| AnimationMixer | Animações | Um mixer por instância animada ativa |
| IndexedDB | Persistência local | Saves e metadados |
| Rapier | Física opcional | Usar seletivamente |
| NavMesh | Navegação terrestre | Selecionar biblioteca após prova técnica |
| Vitest | Testes unitários | Simulação e regras |
| Playwright | Testes de fluxo | Interface e carregamento |
| Stats.js / profiler | Diagnóstico | FPS, memória e renderização |

Não introduzir React inicialmente. A interface pode começar com HTML, CSS e TypeScript. Uma biblioteca de estado como Zustand só deve ser adicionada se a complexidade da interface justificar.

### Política de dependências

- Fixar versões no `package-lock.json`.
- Evitar dependências duplicadas para a mesma responsabilidade.
- Avaliar licença, manutenção e compatibilidade antes de adotar bibliotecas.
- Criar adapters para bibliotecas de navegação e física, evitando acoplamento ao domínio.
- Não adicionar uma biblioteca apenas por conveniência sem registrar a decisão técnica.

---

## 5. World Engine — mundo aberto e setores

O mundo será dividido em setores espaciais. Cada setor contém terreno, habitats, recursos, pontos de interesse e população residente.

### Exemplo de setores

| ID | Habitat | Espécies possíveis |
|---|---|---|
| `ancient_forest` | Floresta ancestral | Ninfas, grifos e criaturas florestais |
| `mountain_range` | Cordilheira | Dragões e grifos |
| `swamplands` | Pântano | Hidras e espécies anfíbias |
| `enchanted_lake` | Lago encantado | Criaturas aquáticas |
| `volcanic_region` | Região vulcânica | Fênix e dragões |
| `dark_wood` | Floresta sombria | Criaturas noturnas |

A distribuição acima é ilustrativa e deve ser ajustada ao catálogo real de criaturas.

### Estados de setor

| Estado | Comportamento |
|---|---|
| `UNLOADED` | Recursos visuais não carregados |
| `LOADING` | Carregamento de dados e assets |
| `ACTIVE` | Renderização e simulação detalhadas |
| `BACKGROUND` | Simulação lógica simplificada |
| `SLEEPING` | Atualização agregada ou por eventos |

Descarregar a representação visual de um setor não pode apagar seu estado lógico. Criaturas fora da área observada continuam evoluindo por simulação simplificada.

### Responsabilidades do SectorManager

- Determinar setores próximos à câmera e aos pontos de interesse.
- Solicitar carregamento e descarregamento de recursos.
- Preservar estado lógico dos setores.
- Coordenar transições entre setores.
- Controlar orçamento de memória e renderização.
- Evitar duplicação de criaturas nas fronteiras.

### Dados de um setor

```typescript
interface SectorDefinition {
  id: string;
  bounds: WorldBounds;
  habitatIds: string[];
  assetBundle: string;
  connections: string[];
  populationCapacity?: number;
}
```

---

## 6. Creature Engine — entidades e espécies

Separar espécie, indivíduo, controlador de comportamento e representação visual.

- **SpeciesDefinition:** configuração compartilhada pela espécie.
- **CreatureEntity:** estado individual persistente.
- **CreatureController:** coordena decisões e ações.
- **CreatureView:** modelo, materiais e animações Three.js.

### Contrato inicial da entidade

```typescript
interface CreatureEntity {
  id: string;
  speciesId: string;
  sectorId: string;
  habitatId: string;

  position: Vector3Data;
  rotation: QuaternionData;

  age: number;
  health: number;
  energy: number;
  hunger: number;
  thirst: number;

  personality: CreaturePersonality;
  currentState: CreatureState;
  targetId?: string;
}
```

`Vector3Data` e `QuaternionData` devem ser tipos de domínio serializáveis, sem persistir instâncias Three.js.

### Definição de espécie

```typescript
interface SpeciesDefinition {
  id: string;
  displayName: string;

  habitatPreferences: string[];
  locomotionTypes: LocomotionType[];

  attributes: {
    speed: number;
    strength: number;
    perception: number;
    aggression: number;
    intelligence: number;
  };

  needs: {
    hunger: boolean;
    thirst: boolean;
    sleep: boolean;
    social: boolean;
  };

  dietProfile: DietProfile;
  behaviorProfileId: string;
  assetProfileId: string;
}
```

### Personalidade individual

A personalidade varia dentro dos limites da espécie:

```typescript
interface CreaturePersonality {
  aggression: number;
  curiosity: number;
  sociability: number;
  boldness: number;
  territoriality: number;
}
```

Os valores devem ser normalizados e validados. A personalidade influencia decisões, mas não deve permitir comportamentos incompatíveis com a biologia configurada da espécie.

### Necessidades iniciais

- Fome.
- Sede.
- Energia.
- Segurança.
- Socialização, quando aplicável.

Cada necessidade deve ter taxa de alteração, limiares, urgência e consequências configuráveis por espécie.

---

## 7. Behavior Engine — inteligência comportamental

Adotar abordagem híbrida:

- **Utility AI:** pontua ações possíveis e seleciona a mais adequada.
- **Finite State Machine:** executa e acompanha a ação escolhida.
- **Perception System:** fornece informações relevantes do ambiente.
- **Memory System:** registra informações úteis de curto prazo.

### Fluxo de decisão

```text
Perception
    |
    v
Evaluate Needs and Context
    |
    v
Calculate Action Utilities
    |
    v
Select Candidate
    |
    v
Validate Preconditions
    |
    v
Start / Continue Behavior
    |
    v
Monitor Success, Failure or Interruption
    |
    v
Reevaluate
```

### Biblioteca inicial de comportamentos

| Comportamento | Descrição |
|---|---|
| `Idle` | Observar ou permanecer em repouso |
| `Wander` | Explorar uma área |
| `Patrol` | Percorrer território |
| `Forage` | Procurar alimento |
| `Hunt` | Perseguir uma presa |
| `Feed` | Consumir alimento |
| `Drink` | Beber água |
| `Sleep` | Descansar |
| `Flee` | Fugir de ameaça |
| `Attack` | Atacar, quando compatível |
| `Socialize` | Interagir com indivíduos |
| `SeekShelter` | Procurar abrigo |
| `Migrate` | Deslocar-se para outro habitat |

### Prioridades

Prioridades não devem ser constantes globais rígidas. A Utility AI deve considerar:

- Urgência da necessidade.
- Características da espécie.
- Personalidade.
- Distância e acessibilidade do objetivo.
- Perigo percebido.
- Condições ambientais.
- Estado atual e custo de interrompê-lo.

Usar histerese ou custo de troca de ação para evitar alternância frenética entre comportamentos.

### Memória

A memória inicial pode registrar:

- Último local de alimentação.
- Fontes de água conhecidas.
- Abrigos conhecidos.
- Indivíduos conhecidos.
- Ameaças recentes.
- Resultado de interações.

A memória deve ter limites e expiração para controlar consumo de memória.

---

## 8. Navigation Engine — locomoção

A IA escolhe o objetivo; a navegação calcula a rota; o controlador de movimento executa o deslocamento.

| Tipo | Abordagem |
|---|---|
| Terrestre | NavMesh, pathfinding e steering |
| Voo | Waypoints 3D, volumes e steering |
| Aquático | Volumes navegáveis e rotas |
| Escalada | Rotas de escalada específicas |
| Movimento especial | Controlador específico por espécie |

### Requisitos

- Evitar obstáculos.
- Respeitar inclinação e limites de terreno.
- Evitar colisões entre indivíduos.
- Respeitar áreas proibidas.
- Suavizar curvas e mudanças de direção.
- Sincronizar velocidade e animação.
- Recalcular rota apenas quando necessário.
- Tratar falha de rota sem prender a criatura indefinidamente.

Não usar física completa para todas as criaturas. Movimento cinemático é suficiente para grande parte dos deslocamentos. Rapier deve ser introduzido apenas para interações que realmente precisem de física.

---

## 9. Ecology Engine — ecossistema

Recursos ambientais devem ser entidades ou componentes do mundo, e não apenas valores abstratos nas criaturas.

### Recursos

- Água.
- Vegetação.
- Presas.
- Abrigos.
- Áreas de descanso.
- Locais de reprodução.
- Energia ou fontes mágicas, quando aplicável.

### Relações ecológicas

- Predação.
- Competição por recursos.
- Territorialidade.
- Cooperação.
- Relações sociais.
- Reprodução.
- Migração.
- Mortalidade e extinção local.

Nem toda espécie mitológica precisa seguir uma cadeia alimentar convencional. A dieta deve ser configurável: carne, vegetação, minerais, energia mágica, calor ou outros recursos definidos pelo jogo.

### Regras de equilíbrio

- Recursos renováveis devem ter taxa de recuperação.
- Recursos consumíveis devem ter disponibilidade limitada.
- Populações devem respeitar capacidade ambiental.
- Predação deve considerar compatibilidade, risco e diferença de força.
- A simulação não deve criar recursos infinitos sem regra explícita.
- Eventos ecológicos devem ser registrados para inspeção.

---

## 10. Environment Engine — tempo e clima

### Ciclo diário

| Período | Tendência de comportamento |
|---|---|
| Amanhecer | Despertar de espécies diurnas |
| Manhã | Alimentação e exploração |
| Tarde | Atividade e interações |
| Entardecer | Retorno a abrigos |
| Noite | Atividade de espécies noturnas |
| Madrugada | Descanso e atividades noturnas |

### Clima e estações

- Chuva.
- Tempestade.
- Neblina.
- Neve.
- Temperatura.
- Seca.
- Estações.

O clima precisa afetar a simulação: disponibilidade de recursos, busca por abrigo, atividade e deslocamento.

---

## 11. Asset Pipeline — auditoria e integração

O formato dos assets é desconhecido. Portanto, a primeira sprint deve inventariar o pacote antes de assumir compatibilidade.

### Asset Inspector

Identificar para cada arquivo:

| Campo | Verificação |
|---|---|
| Formato | GLB, GLTF, FBX, OBJ, BLEND etc. |
| Geometria | Meshes e complexidade |
| Materiais | PBR, transparência e compatibilidade |
| Texturas | Formato, resolução e tamanho |
| Rig | Skeleton e hierarquia |
| Animações | Clips e nomes |
| Escala | Dimensões e unidades |
| Orientação | Eixos e pose inicial |
| Peso | Tamanho em disco e memória estimada |

### Normalização

- Definir unidade e escala de referência.
- Padronizar orientação.
- Verificar origem e pivô.
- Validar materiais e texturas.
- Mapear nomes de animação para ações semânticas.
- Gerar bounding boxes.
- Criar LOD quando necessário.
- Registrar limitações e correções necessárias.

### Manifesto de asset

```json
{
  "id": "dragon_fire",
  "type": "creature",
  "model": "creatures/dragon/fire.glb",
  "scale": 1.0,
  "orientation": "y-up",
  "animations": {
    "idle": "Idle",
    "walk": "Walk",
    "fly": "Fly",
    "attack": "Attack"
  },
  "capabilities": ["walk", "fly"]
}
```

Os nomes de animação são exemplos. O manifesto real deve ser gerado a partir dos arquivos auditados.

O Asset Manager deve validar a existência dos arquivos, clips e materiais declarados. Falhas devem gerar relatórios claros e não interromper silenciosamente o carregamento do mundo.

---

## 12. Rendering Engine — desempenho

### Técnicas

| Técnica | Uso |
|---|---|
| InstancedMesh | Vegetação e objetos repetidos |
| LOD | Criaturas e objetos por distância |
| Frustum culling | Objetos fora da câmera |
| Distance culling | Objetos muito distantes |
| Animation throttling | Reduzir atualizações de animação distante |
| Object pooling | Partículas e efeitos recorrentes |
| Texture optimization | Reduzir consumo de GPU |
| Selective shadows | Sombras apenas onde agregam valor |
| Progressive loading | Carregamento gradual de setores |

### Níveis de simulação e apresentação

| Distância / relevância | Simulação | Visual |
|---|---|---|
| Próxima / selecionada | IA detalhada | Modelo e animação completos |
| Próxima | IA detalhada | Modelo completo |
| Distante | IA em frequência reduzida | LOD simplificado |
| Setor em background | Simulação agregada | Sem renderização |
| Setor sleeping | Atualização por eventos/intervalos | Sem renderização |

A seleção não deve depender apenas da distância: criaturas envolvidas em eventos importantes podem receber prioridade de atualização.

### Fixed timestep

```typescript
const FIXED_STEP = 1 / 30;

let accumulator = 0;
let previousTime = 0;

function animate(time: number): void {
  requestAnimationFrame(animate);

  const delta = Math.min((time - previousTime) / 1000, 0.1);
  previousTime = time;
  accumulator += delta;

  while (accumulator >= FIXED_STEP) {
    simulation.update(FIXED_STEP);
    accumulator -= FIXED_STEP;
  }

  renderer.render(scene, camera);
}
```

A implementação final deve tratar inicialização do relógio, pausa, velocidade da simulação e descarte de tempo excedente de maneira explícita.

### Metas iniciais de desempenho

São metas para validação, não garantias:

| Métrica | Meta |
|---|---:|
| Desktop de referência | 60 FPS |
| População lógica | 100+ criaturas |
| Animações detalhadas simultâneas | 20–30 inicialmente |
| IA próxima | 5–10 Hz |
| IA distante | 1–2 Hz |
| Carregamento inicial | Menos de 10 segundos |

Registrar hardware de referência, resolução, quantidade de setores carregados, quantidade de criaturas visíveis e custo de CPU/GPU nos testes.

---

## 13. Persistence Engine — salvamento

Usar IndexedDB na primeira versão, com snapshots e gravações incrementais.

### Persistir

- ID e versão do mundo.
- Tempo da simulação.
- Estado dos setores.
- Estado dos habitats e recursos.
- Identidade e atributos das criaturas.
- Necessidades e personalidade.
- Estado lógico e objetivo atual.
- Memória relevante.
- Clima e eventos necessários para reconstrução.

### Não persistir

- Instâncias Three.js.
- Buffers de geometria.
- Materiais em runtime.
- Estado de cada frame.
- Posição intermediária de animação.
- Objetos temporários de renderização.

### Fluxo de restauração

1. Ler metadados e versão do save.
2. Executar migrações necessárias.
3. Restaurar relógio e estado ambiental.
4. Restaurar setores e recursos.
5. Restaurar entidades.
6. Reconstruir representação visual sob demanda.
7. Validar referências e objetivos.
8. Retomar a simulação.

Implementar versionamento de save desde a primeira versão persistente.

---

## 14. Observer Interface — experiência de observação

### Câmeras

- Câmera livre.
- Câmera de acompanhamento de criatura.
- Câmeras predefinidas por habitat.
- Câmera de pontos de interesse.
- Retorno à visão geral do mundo.

### Painéis

- HUD com horário e clima.
- Inspetor de criatura.
- Informações do habitat.
- Diário de acontecimentos.
- Controles de pausa e velocidade.
- Visão geral de população e espécies.

### Diário de eventos

Exemplos:

- Criatura iniciou busca por alimento.
- Dragão retornou ao território.
- Grifo encontrou uma fonte de água.
- Criatura iniciou descanso.
- Duas criaturas entraram em conflito.

Eventos devem ser emitidos pela simulação e consumidos pela interface, sem acoplamento direto entre IA e HUD.

---

## 15. Estrutura de diretórios

```text
mythos-terrarium/
├── public/
│   └── assets/
│       ├── creatures/
│       ├── environments/
│       ├── vegetation/
│       ├── textures/
│       ├── audio/
│       └── manifests/
├── src/
│   ├── app/
│   ├── core/
│   ├── world/
│   ├── creatures/
│   │   ├── components/
│   │   └── lifecycle/
│   ├── behavior/
│   │   └── behaviors/
│   ├── navigation/
│   │   └── steering/
│   ├── ecology/
│   ├── environment/
│   ├── rendering/
│   │   └── effects/
│   ├── camera/
│   ├── persistence/
│   │   └── migrations/
│   ├── interface/
│   ├── data/
│   │   ├── species/
│   │   ├── habitats/
│   │   ├── behaviors/
│   │   └── world/
│   └── shared/
│       ├── types/
│       ├── constants/
│       └── utils/
├── scripts/
│   └── asset-inspector/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── simulation/
│   └── performance/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── GAME_DESIGN.md
│   ├── ASSET_PIPELINE.md
│   ├── AI_BEHAVIOR.md
│   └── PERFORMANCE.md
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

Esta é a estrutura-alvo. Criar módulos conforme as funcionalidades forem implementadas; não gerar arquivos vazios antecipadamente.

---

## 16. Backlog priorizado

### P0 — Fundação e bloqueadores

| ID | Item | Critério de conclusão |
|---|---|---|
| MT-001 | Inicializar projeto Vite + TypeScript | Build e servidor local funcionam |
| MT-002 | Configurar Three.js | Cena, câmera e renderer funcionam |
| MT-003 | Asset Inspector | Inventário dos arquivos gerado |
| MT-004 | Asset Manifest | Assets catalogados e validados |
| MT-005 | Carregar terreno real | Terreno existente aparece corretamente |
| MT-006 | Carregar criatura real | Modelo aparece com escala e orientação corretas |
| MT-007 | Animation Manager | Clips existentes podem ser reproduzidos |
| MT-008 | World Manager | Mundo e setores são registrados |
| MT-009 | Sector Manager | Setores podem ser carregados e descarregados |
| MT-010 | Creature Entity | Estado lógico independente do modelo |
| MT-011 | Simulation Loop | Timestep independente do FPS |
| MT-012 | State Machine | Estados e transições testados |
| MT-013 | Movimento terrestre | Criatura percorre rota sem atravessar obstáculos |

### P1 — MVP funcional

| ID | Item | Critério de conclusão |
|---|---|---|
| MT-014 | Utility AI | Ações são pontuadas e selecionadas |
| MT-015 | Necessidades | Fome, sede e energia evoluem |
| MT-016 | Habitats | Preferências e limites ambientais funcionam |
| MT-017 | Navegação aérea | Criatura voa entre pontos válidos |
| MT-018 | Navegação aquática | Criatura se desloca em volume navegável |
| MT-019 | Alimentação e hidratação | Recursos são encontrados e consumidos |
| MT-020 | Ciclo dia/noite | Horário afeta iluminação e atividade |
| MT-021 | Personalidade | Indivíduos apresentam decisões distintas |
| MT-022 | Interações | Criaturas reconhecem e reagem a outras |
| MT-023 | Background Simulation | Setores distantes continuam evoluindo |
| MT-024 | Clima | Condições afetam comportamentos |
| MT-025 | Câmera de observação | Usuário acompanha uma criatura |
| MT-026 | Creature Inspector | Estado individual pode ser consultado |
| MT-027 | Event Journal | Eventos relevantes são apresentados |
| MT-028 | IndexedDB | Mundo pode ser salvo e restaurado |
| MT-033 | LOD | Modelos reduzem complexidade por distância |
| MT-034 | Animação otimizada | Atualização visual é escalonada |

### P2 — Expansão

| ID | Item | Critério de conclusão |
|---|---|---|
| MT-029 | Reprodução | Casais compatíveis podem gerar descendentes |
| MT-030 | Ciclo de vida | Idade e maturidade afetam a entidade |
| MT-031 | Migração | Criaturas mudam de habitat |
| MT-032 | Eventos ecológicos | Eventos ambientais e populacionais são simulados |
| MT-035 | Áudio ambiental | Ambientes e criaturas emitem áudio contextual |
| MT-036 | Geração procedural | Regiões podem ser geradas por regras |

---

## 17. Plano de implementação — 12 semanas

Estimativa inicial para desenvolvimento assistido por agentes de IA. O prazo depende da qualidade dos assets, da experiência da equipe e dos resultados dos testes.

| Semana | Foco | Entregável |
|---|---|---|
| 1 | Fundação e auditoria | Projeto inicial e relatório de assets |
| 2 | Primeiro ambiente | Terreno, câmera, iluminação e colisões |
| 3 | Creature Engine | Modelos, animações e entidades |
| 4 | Primeira autonomia | State Machine e movimento terrestre |
| 5 | Utility AI | Decisões, necessidades e personalidade |
| 6 | Múltiplos habitats | Setores e conexões |
| 7 | Ecossistema | Alimentação, água e interações |
| 8 | Locomoção avançada | Voo e natação |
| 9 | Mundo dinâmico | Dia/noite, clima e eventos |
| 10 | Interface | HUD, inspetor e diário |
| 11 | Persistência e escala | Saves e população 100+ |
| 12 | Polimento | Performance, testes e build demonstrável |

### Entregáveis por sprint

Cada sprint deve terminar com:

- Código executável.
- Critérios de aceitação verificados.
- Testes pertinentes.
- Atualização da documentação.
- Registro de decisões técnicas.
- Demonstração visual ou relatório de teste.
- Backlog atualizado.

---

## 18. Critérios de aceitação do MVP

- [ ] Existem pelo menos três habitats conectados.
- [ ] Existem pelo menos cinco espécies diferentes.
- [ ] Os assets reais do pacote foram integrados.
- [ ] Criaturas se movimentam sem comandos do usuário.
- [ ] Há exploração, descanso e alimentação.
- [ ] As criaturas respeitam características de seus habitats.
- [ ] Existem interações entre espécies.
- [ ] O mundo possui ciclo de dia e noite.
- [ ] É possível acompanhar uma criatura.
- [ ] O diário registra acontecimentos relevantes.
- [ ] O sistema suporta 100 criaturas lógicas em teste.
- [ ] O desempenho é medido em hardware de referência.
- [ ] O estado do mundo pode ser salvo e restaurado.
- [ ] A simulação continua funcionando quando setores deixam de ser renderizados.

---

## 19. Estratégia de agentes de IA

Os agentes devem trabalhar em domínios delimitados e respeitar contratos compartilhados.

| Agente | Responsabilidade |
|---|---|
| Architect Agent | Arquitetura, contratos e decisões técnicas |
| Three.js Agent | Renderização, câmera, iluminação e shaders |
| Asset Engineer | Inspeção, normalização e integração dos assets |
| Creature AI Agent | Utility AI, State Machine e personalidade |
| Navigation Agent | NavMesh, voo, natação e steering |
| Ecology Agent | Alimentação, recursos e relações ecológicas |
| Performance Agent | LOD, memória, FPS e profiling |
| QA Agent | Testes unitários, integração e simulação |

### Regras de colaboração

1. Nenhum agente altera contratos compartilhados sem revisão do Architect Agent.
2. Toda tarefa possui objetivo, escopo, critérios de aceitação e arquivos afetados.
3. IA e ecologia devem ser testáveis sem renderização.
4. Assets são acessados por manifestos.
5. Não duplicar sistemas existentes.
6. Mudanças de dependências devem ser justificadas.
7. Otimizações devem apresentar medição antes/depois.
8. Alterações arquiteturais relevantes devem ser registradas em ADRs.
9. Cada agente deve informar arquivos alterados, testes executados e limitações.
10. O agente de QA não deve aprovar funcionalidades apenas porque compilam; deve verificar comportamento.

---

## 20. Primeira sprint — instruções executáveis

### Objetivo

Descobrir o que existe nos pacotes de assets e preparar a fundação técnica sem assumir formatos ou capacidades ainda não verificadas.

### Tarefas

1. Criar projeto Vite + TypeScript.
2. Configurar Three.js e uma cena mínima.
3. Identificar os diretórios e arquivos dos pacotes de assets.
4. Inventariar extensões e tamanhos.
5. Identificar modelos de terreno e criaturas.
6. Inspecionar rigs, skeletons e animações.
7. Verificar materiais, texturas, escala e orientação.
8. Criar relatório de compatibilidade.
9. Criar primeiro manifesto dos assets utilizáveis.
10. Carregar um terreno real e uma criatura real na cena.
11. Registrar problemas e decisões pendentes.

### Critério de conclusão

A sprint termina quando existe uma aplicação executável que carrega pelo menos um asset real de terreno e um asset real de criatura, acompanhada de um inventário que descreve o restante do pacote.

Não implementar ainda uma IA complexa nem criar modelos substitutos antes da auditoria.

---

## 21. Riscos técnicos e decisões pendentes

| Risco | Mitigação |
|---|---|
| Assets sem rig ou animações | Auditoria e plano de adaptação por modelo |
| Animações com nomenclatura inconsistente | Manifesto semântico de animações |
| Muitos modelos esqueléticos ativos | Escalonamento de animação e LOD |
| IA alternando ações rapidamente | Histerese e custo de troca de comportamento |
| Setores distantes congelados | Simulação de background |
| Saves incompatíveis após atualizações | Versionamento e migrações |
| Navegação cara em mundo amplo | NavMesh por setor e cache de rotas |
| Desequilíbrio ecológico | Limites, taxas de recuperação e testes longos |
| Gargalo de GPU | Profiling, sombras seletivas e otimização de materiais |
| Escopo excessivo | Proteger os critérios do MVP e priorizar por sprint |

### Decisões ainda necessárias

- Formatos e quantidade real dos assets.
- Hardware mínimo de referência.
- Dimensão aproximada do mundo.
- Quantidade de setores carregados simultaneamente.
- Quais criaturas possuem animações de voo, natação ou escalada.
- Se haverá geração procedural ou mundo construído manualmente.
- Se o mundo terá apenas um jogador local ou exigirá sincronização futura.

Não bloquear a primeira sprint por decisões que podem ser tomadas após a auditoria.

---

## 22. Diretriz final de implementação

A ordem de prioridade é:

1. Conhecer e validar os assets.
2. Renderizar um habitat real.
3. Integrar uma criatura real com animações.
4. Implementar uma criatura autônoma.
5. Validar o ciclo de necessidades e navegação.
6. Expandir para múltiplas espécies e habitats.
7. Introduzir simulação de background.
8. Atingir e medir a meta de população.
9. Implementar persistência e interface de observação.
10. Expandir reprodução, ciclo de vida e ecologia avançada.

**Princípio de qualidade:** um habitat pequeno com criaturas que tomam decisões coerentes é mais valioso do que um mundo enorme com modelos que apenas se movimentam aleatoriamente.

O sucesso do Mythos Terrarium será medido pela capacidade de criar um ecossistema interessante de observar, coerente em suas regras e escalável em sua implementação.
