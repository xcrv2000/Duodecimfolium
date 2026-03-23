import { create } from 'zustand';
import { BattleState, BattleUnit } from '../core/domain/Battle';
import { CardFactory, CardInstance } from '../core/domain/Card';
import { BattleLoop } from '../core/systems/BattleLoop';
import { usePlayerStore } from './playerStore';
import { useReplayStore } from './replayStore';
import { RNG } from '../utils/rng';
import dungeonsData from '../data/dungeons.json';
import enemiesData from '../data/enemies.json';
import cardsData from '../data/cards.json';
import modifiersData from '../data/modifiers.json';
import tokensData from '../data/tokens.json';

// Type assertion for JSON data
const dungeons = dungeonsData as any[];
const enemies = (enemiesData as any).definitions;
const cards = cardsData as any[];
const modifiers = modifiersData as any[];
const tokenIds = new Set((tokensData as Array<{ id: string }>).map((t) => t.id));

interface BattleStore {
  state: BattleState | null;
  loop: BattleLoop | null;
  currentDungeonId: string | null;
  currentStageIndex: number;
  isPaused: boolean;
  isLooping: boolean;
  isBossStage: boolean;
  speedMultiplier: number; // 1x, 2x, 12x
  collectedLoot: { gold: number, modifiers: string[] };
  activeDecks: any[];
  isReplayMode: boolean;

  startDungeon: (dungeonId: string, deckIndices: number[]) => void;
  startReplay: (initialState: BattleState, seed: number) => void;
  startCustomBattle: (playerTeams: CustomUnitConfig[], enemyTeams: CustomUnitConfig[]) => void;
  nextStage: () => void;
  tick: () => void;
  togglePause: () => void;
  toggleLoop: () => void;
  setSpeed: (multiplier: number) => void;
  exitBattle: () => void;
}

export interface CustomUnitConfig {
    name: string;
    cardIds: string[];
    hp: number;
    team: 'player' | 'enemy';
    modifierSlots?: Record<string, string>;
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  state: null,
  loop: null,
  currentDungeonId: null,
  currentStageIndex: 0,
  isPaused: false,
  isLooping: false,
  isBossStage: false,
  speedMultiplier: 1,
  collectedLoot: { gold: 0, modifiers: [] },

  activeDecks: [],
  isReplayMode: false,

  startReplay: (initialState, seed) => {
    // Deep clone to avoid mutating the original replay record
    const stateClone = JSON.parse(JSON.stringify(initialState));
    const loop = new BattleLoop(stateClone, new RNG(seed));
    loop.executeStartOfBattleEffects();
    
    set({
      state: stateClone,
      loop: loop,
      currentDungeonId: null,
      currentStageIndex: 0,
      isPaused: true,
      isLooping: false,
      isBossStage: false,
      speedMultiplier: 1,
      collectedLoot: { gold: 0, modifiers: [] },
      isReplayMode: true,
      activeDecks: []
    });
  },

  startDungeon: (dungeonId, deckIndices) => {
    const dungeon = dungeons.find(d => d.id === dungeonId);
    if (!dungeon) return;

    // Snapshot selected decks (supports teamSize > 1)
    const playerStore = usePlayerStore.getState();
    const selectedDecks = deckIndices
      .map((idx) => playerStore.decks[idx])
      .filter((deck) => !!deck);
    if (selectedDecks.length === 0) return;
    const deckSnapshots = selectedDecks.map((deck) => JSON.parse(JSON.stringify(deck)));

    set({
      currentDungeonId: dungeonId,
      currentStageIndex: 0,
      isPaused: false,
      isLooping: false,
      isBossStage: false,
      speedMultiplier: 1,
      collectedLoot: { gold: 0, modifiers: [] },
      isReplayMode: false,
      activeDecks: deckSnapshots
    });
    
    get().nextStage();
  },

  startCustomBattle: (playerTeams, enemyTeams) => {
      // Helper to create unit
      const createUnit = (config: CustomUnitConfig, index: number): BattleUnit => {
          const cardCounts: Record<string, number> = {};
          const cardIds = config.cardIds;
          
          return {
              id: `${config.team}_${index}_${Date.now()}`,
              name: config.name,
              hp: config.hp,
              maxHp: config.hp,
              initialDeckSize: cardIds.length,
              team: config.team,
              cards: cardIds.map((id, idx) => {
                  const cardDef = cards.find(c => c.id === id);
                  if (!cardDef) return null;
                  
                  const count = (cardCounts[id] || 0) + 1;
                  cardCounts[id] = count;
                  
                  // Penalty in x10 integer
                  let penalty = 0;
                  if (count === 2) penalty = 9; // 0.9
                  if (count >= 3) penalty = 28; // 2.8
                  
                  const baseSpeed10 = cardDef.speed !== null ? Math.round(cardDef.speed * 10) : null;
                  const npcSpeedMod = 0; // Training Mode: No speed mod
                  
                  // Modifiers
                  const modId = config.modifierSlots?.[idx];
                  const cardModifiers = [];
                  if (modId) {
                      const modDef = modifiers.find(m => m.id === modId);
                      if (modDef) cardModifiers.push(modDef);
                  }
                  
                  return {
                      factory: cardDef,
                      instanceId: `${config.team}_c_${index}_${idx}`,
                      baseSpeed10: baseSpeed10,
                      currentSpeed10: null, // Will be calc'd
                      deckSpeedPenalty: penalty,
                      permanentSpeedModifier: npcSpeedMod,
                      ownerId: `${config.team}_${index}`,
                      tagsRuntime: [...(cardDef.tags || [])],
                      modifiers: cardModifiers,
                      buffs: [],
                      factoryBuffs: []
                  };
              }).filter((c: any) => c) as any[],
              buffs: [],
                isDead: false,
                isSummon: false
          };
      };

      const playerUnits = playerTeams.map((c, i) => createUnit(c, i));
      const enemyUnits = enemyTeams.map((c, i) => createUnit(c, i));
      
      const seed = Date.now();
      const initialState: BattleState = {
          tick: 0,
          turn: 1,
          units: [...playerUnits, ...enemyUnits],
          log: [],
          isOver: false,
          winner: null,
          rngSeed: seed
      };
      
      // Save Replay for Custom Battle
      const replayState = JSON.parse(JSON.stringify(initialState));
      useReplayStore.getState().addReplay({
          timestamp: Date.now(),
          dungeonId: 'custom',
          stageIndex: 0,
          seed: seed,
          initialState: replayState,
          enemyName: enemyTeams[0]?.name || 'Unknown'
      });

      const loop = new BattleLoop(initialState, new RNG(seed));
      loop.executeStartOfBattleEffects();
      
      set({
          currentDungeonId: 'sandbox_training',
          currentStageIndex: 1, // Treat as if we are in stage 1 (of 1)
          isPaused: false,
          isLooping: false,
          isBossStage: false,
          speedMultiplier: 1,
          collectedLoot: { gold: 0, modifiers: [] },
          state: initialState,
          loop: loop
      });
  },

  nextStage: () => {
    const { currentDungeonId, currentStageIndex, collectedLoot, isLooping } = get();
    const dungeon = dungeons.find(d => d.id === currentDungeonId);
    if (!dungeon) return;

    if (currentStageIndex >= dungeon.stages.length) {
      // Dungeon Cleared!
      const playerStore = usePlayerStore.getState();
      
      // Mark as Cleared
      playerStore.clearDungeon(dungeon.id);

      // Calculate Gold Reward (Min-Max)
      const goldReward = Math.floor(Math.random() * (dungeon.goldRewardMax - dungeon.goldRewardMin + 1)) + dungeon.goldRewardMin;
      playerStore.addGold(goldReward);
      
      // Add collected modifiers
      collectedLoot.modifiers.forEach(modId => playerStore.addModifier(modId));
      
      // Unlock Pack logic
      if (dungeon.unlocksPackId) {
          playerStore.unlockPack(dungeon.unlocksPackId);
      }
      
      if (isLooping) {
          // Restart Dungeon
          set({
              currentStageIndex: 0,
              collectedLoot: { gold: 0, modifiers: [] }
          });
          // Recursive call to start stage 0
          get().nextStage();
      } else {
          // Exit, unless it's training_ground
          if (currentDungeonId !== 'training_ground') {
            set({ state: null, loop: null, currentDungeonId: null, isReplayMode: false, activeDecks: [] });
          }
      }
      return;
    }

    const stage = dungeon.stages[currentStageIndex];
    const isBossStage = stage.type === 'boss';

    const { activeDecks } = get();
    if (!activeDecks || activeDecks.length === 0) return;

    const { state: previousState } = get();
    const playerUnits: BattleUnit[] = activeDecks.map((activeDeck, unitIndex) => {
      const playerCardIds = activeDeck.cardIds || [];
      const playerCardCounts: Record<string, number> = {};
      let initialHp = 100;

      if (currentStageIndex > 0 && previousState && previousState.units) {
        const prevPlayer = previousState.units.find(u => u.id === `player_${unitIndex}`);
        if (prevPlayer) {
          initialHp = prevPlayer.hp;
        }
      }

      return {
        id: `player_${unitIndex}`,
        name: activeDeck.name || `Player ${unitIndex + 1}`,
        hp: initialHp,
        maxHp: 100,
        initialDeckSize: playerCardIds.length,
        team: 'player',
        cards: (initialHp <= 0 ? [] : playerCardIds.map((id: string, idx: number) => {
          const cardDef = cards.find(c => c.id === id);
          if (!cardDef) return null;

          const count = (playerCardCounts[id] || 0) + 1;
          playerCardCounts[id] = count;

          let penalty = 0;
          if (count === 2) penalty = 9;
          if (count >= 3) penalty = 28;

          const baseSpeed10 = cardDef.speed !== null ? Math.round(cardDef.speed * 10) : null;

          const modId = activeDeck.modifierSlots?.[idx];
          const cardModifiers = [];
          if (modId) {
            const modDef = modifiers.find(m => m.id === modId);
            if (modDef) cardModifiers.push(modDef);
          }

          return {
            factory: cardDef as CardFactory,
            instanceId: `p_${unitIndex}_card_${idx}`,
            ownerId: `player_${unitIndex}`,
            baseSpeed10: baseSpeed10,
            currentSpeed10: null,
            deckSpeedPenalty: penalty,
            permanentSpeedModifier: 0,
            tagsRuntime: [...(cardDef.tags || [])],
            modifiers: cardModifiers,
            buffs: [],
            factoryBuffs: []
          } as CardInstance;
        }).filter((c: any) => c)),
        buffs: [],
        isDead: initialHp <= 0,
        isSummon: false
      };
    });

    const explicitEnemyIds = Array.isArray(stage.enemyIds) && stage.enemyIds.length > 0
      ? [...stage.enemyIds]
      : null;
    const enemyPool = (enemiesData as any).pools[stage.enemyPoolId] || [];
    const enemyCountMin = Math.max(1, Number(stage.enemyCountMin || 1));
    const enemyCountMax = Math.max(enemyCountMin, Number(stage.enemyCountMax || enemyCountMin));
    const enemyCount = explicitEnemyIds
      ? explicitEnemyIds.length
      : (Math.floor(Math.random() * (enemyCountMax - enemyCountMin + 1)) + enemyCountMin);

    const sampledEnemyIds: string[] = explicitEnemyIds || Array.from({ length: enemyCount }).map(() => {
      const enemyId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      return enemyId;
    });

    const createEnemyUnit = (enemyDef: any, enemyIndex: number): BattleUnit => {
      const enemyCardCounts: Record<string, number> = {};
      const enemyCardIds = enemyDef.deck;
      const enemyModifierSlots: Record<string, string> = enemyDef.modifierSlots || {};

      return {
        id: `${enemyDef.id}_${enemyIndex}`,
        name: enemyDef.name,
        hp: enemyDef.hpMax,
        maxHp: enemyDef.hpMax,
        initialDeckSize: enemyCardIds.length,
        team: 'enemy',
        cards: enemyCardIds.map((id: string, idx: number) => {
          const cardDef = cards.find(c => c.id === id);
          if (!cardDef) return null;

          const count = (enemyCardCounts[id] || 0) + 1;
          enemyCardCounts[id] = count;

          let penalty = 0;
          if (count === 2) penalty = 9;
          if (count >= 3) penalty = 28;

          const baseSpeed10 = cardDef.speed !== null ? Math.round(cardDef.speed * 10) : null;
          const modId = enemyModifierSlots[idx.toString()];
          const cardModifiers = [];
          if (modId) {
            const modDef = modifiers.find(m => m.id === modId);
            if (modDef) cardModifiers.push(modDef);
          }

          return {
            factory: cardDef as CardFactory,
            instanceId: `e_${enemyIndex}_card_${idx}`,
            ownerId: `${enemyDef.id}_${enemyIndex}`,
            baseSpeed10: baseSpeed10,
            currentSpeed10: null,
            deckSpeedPenalty: penalty,
            permanentSpeedModifier: 0,
            tagsRuntime: [...(cardDef.tags || [])],
            modifiers: cardModifiers,
            buffs: [],
            factoryBuffs: []
          } as CardInstance;
        }).filter((c: any) => c),
        buffs: [],
        isDead: false,
        isSummon: false
      };
    };

    const enemyUnits = sampledEnemyIds
      .map((enemyId) => enemies[enemyId])
      .filter((def) => !!def)
      .map((def, idx) => createEnemyUnit(def, idx));

    if (enemyUnits.length === 0) return;

    const seed = Date.now();
    const initialState: BattleState = {
      tick: 0,
      turn: 1,
      units: [...playerUnits, ...enemyUnits],
      log: [],
      isOver: false,
      winner: null,
      rngSeed: seed
    };

    const replayState = JSON.parse(JSON.stringify(initialState));
    useReplayStore.getState().addReplay({
        timestamp: Date.now(),
        dungeonId: currentDungeonId || 'unknown',
        stageIndex: currentStageIndex,
        seed: seed,
        initialState: replayState,
        enemyName: enemyUnits.map((u) => u.name).join(' + ')
    });

    const loop = new BattleLoop(initialState, new RNG(seed));
    // Execute Start of Battle Effects
    loop.executeStartOfBattleEffects();

    set({
      state: initialState,
      loop: loop,
      currentStageIndex: currentStageIndex + 1,
      isBossStage
    });
  },

  tick: () => {
    const { loop, isPaused, state } = get();
    if (!loop || isPaused || !state || state.isOver) return;

    const newState = loop.nextTick();
    set({ state: newState });
    
    // Check for Battle End Trigger (Just happened)
    if (newState.isOver && !state.isOver) {
      if (newState.winner === 'player') {
        // Battle Won - Process Drops for all enemy units.
        const enemyUnits = newState.units.filter(u => u.team === 'enemy');
        enemyUnits.forEach((enemyUnit) => {
            const baseEnemyId = enemyUnit.id.replace(/_\d+$/, '');
            const enemyDef = (enemiesData as any).definitions[baseEnemyId];
            if (enemyDef && enemyDef.dropTable) {
                const table = enemyDef.dropTable;
                if (Math.random() < table.chance) {
                    const count = Math.floor(Math.random() * (table.max - table.min + 1)) + table.min;
                    const newDrops: string[] = [];
                    for(let i=0; i<count; i++) {
                        const item = table.pool[Math.floor(Math.random() * table.pool.length)];
                        newDrops.push(item);
                    }

                    if (newDrops.length > 0) {
                        const droppedTokens = newDrops.filter((id) => tokenIds.has(id));
                        const droppedModifiers = newDrops.filter((id) => !tokenIds.has(id));

                        droppedTokens.forEach((tokenId) => {
                            usePlayerStore.getState().addToken(tokenId, 1);
                        });

                        if (droppedModifiers.length > 0) {
                          set(state => ({
                              collectedLoot: {
                                  ...state.collectedLoot,
                                  modifiers: [...state.collectedLoot.modifiers, ...droppedModifiers]
                              }
                          }));
                        }
                        console.log('Drops:', enemyUnit.name, newDrops);
                    }
                }
            }
        });
        
        // Auto Advance to Next Stage
        const { isLooping, isBossStage, isReplayMode } = get();
        if (isReplayMode) return;

        let delay = 1000;
        
        if (isLooping) {
            delay = isBossStage ? 500 : 50; 
        }

        setTimeout(() => {
            const { state: currentState } = get();
            // Only advance if we are still in the same battle state (user didn't exit)
            if (currentState && currentState.isOver && currentState.winner === 'player') {
                get().nextStage();
            }
        }, delay);

      }
    }

  },

  togglePause: () => set(state => ({ isPaused: !state.isPaused })),
  toggleLoop: () => set(state => ({ isLooping: !state.isLooping })),
  
  setSpeed: (multiplier) => set({ speedMultiplier: multiplier }),
  
  exitBattle: () => {
      // Save collected modifiers
      const { collectedLoot } = get();
      const playerStore = usePlayerStore.getState();
      collectedLoot.modifiers.forEach(modId => playerStore.addModifier(modId));
      
      set({ state: null, loop: null, currentDungeonId: null, isReplayMode: false, activeDecks: [] });
  }
}));
