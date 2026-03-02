import { create } from 'zustand';
import { BattleState, BattleUnit, BattleLogEntry } from '../core/domain/Battle';
import { BattleLoop } from '../core/systems/BattleLoop';
import { CardScripts } from '../core/systems/CardScripts';
import { usePlayerStore } from './playerStore';
import dungeonsData from '../data/dungeons.json';
import enemiesData from '../data/enemies.json';
import cardsData from '../data/cards.json';
import modifiersData from '../data/modifiers.json';

// Type assertion for JSON data
const dungeons = dungeonsData as any[];
const enemies = (enemiesData as any).definitions;
const cards = cardsData as any[];
const modifiers = modifiersData as any[];

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

  startDungeon: (dungeonId: string) => void;
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

  startDungeon: (dungeonId) => {
    const dungeon = dungeons.find(d => d.id === dungeonId);
    if (!dungeon) return;

    set({
      currentDungeonId: dungeonId,
      currentStageIndex: 0,
      isPaused: false,
      isLooping: false,
      isBossStage: false,
      speedMultiplier: 1,
      collectedLoot: { gold: 0, modifiers: [] }
    });
    
    get().nextStage();
  },

  startCustomBattle: (playerTeams, enemyTeams) => {
      // Helper to create unit
      const createUnit = (config: CustomUnitConfig, index: number): BattleUnit => {
          const cardCounts: Record<string, number> = {};
          
          return {
              id: `${config.team}_${index}_${Date.now()}`,
              name: config.name,
              hp: config.hp,
              maxHp: config.hp,
              armor: 0,
              team: config.team,
              cards: config.cardIds.map((id, idx) => {
                  const cardDef = cards.find(c => c.id === id);
                  if (!cardDef) return null;
                  
                  const count = (cardCounts[id] || 0) + 1;
                  cardCounts[id] = count;
                  
                  let penalty = 0;
                  if (count === 2) penalty = 0.9;
                  if (count >= 3) penalty = 2.8;
                  
                  const baseSpeed = cardDef.speed;
                  // NPC Speed Mod if enemy
                  const npcSpeedMod = config.team === 'enemy' ? 0.1 : 0;
                  const initialSpeed = baseSpeed !== null ? baseSpeed + penalty + npcSpeedMod : null;
                  
                  // Modifiers
                  const modId = config.modifierSlots?.[idx];
                  const cardModifiers = [];
                  if (modId) {
                      const modDef = modifiers.find(m => m.id === modId);
                      if (modDef) cardModifiers.push(modDef);
                  }
                  
                  return {
                      ...cardDef,
                      instanceId: `${config.team}_c_${index}_${idx}`,
                      originalSpeed: baseSpeed,
                      currentSpeed: initialSpeed,
                      deckSpeedPenalty: penalty,
                      permanentSpeedModifier: npcSpeedMod,
                      ownerId: `${config.team}_${index}`,
                      modifiers: cardModifiers
                  };
              }).filter((c: any) => c) as any[],
              buffs: [],
              isDead: false
          };
      };

      const playerUnits = playerTeams.map((c, i) => createUnit(c, i));
      const enemyUnits = enemyTeams.map((c, i) => createUnit(c, i));
      
      const initialState: BattleState = {
          tick: 0,
          turn: 1,
          units: [...playerUnits, ...enemyUnits],
          log: [],
          isOver: false,
          winner: null,
          rngSeed: Date.now()
      };
      
      const loop = new BattleLoop(initialState);
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
          // Exit
          set({ state: null, loop: null, currentDungeonId: null });
      }
      return;
    }

    const stage = dungeon.stages[currentStageIndex];
    const enemyPool = (enemiesData as any).pools[stage.enemyPoolId];
    const enemyId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    const enemyDef = enemies[enemyId];

    const isBossStage = stage.type === 'boss';

    // Create Player Unit
    // TODO: Load from player's selected deck
    const playerStore = usePlayerStore.getState();
    const playerDeck = playerStore.decks[0]; // Default deck
    
    // Count duplicates for penalty
    const playerCardCounts: Record<string, number> = {};

    const playerUnit: BattleUnit = {
      id: 'player',
      name: 'Player',
      hp: 100, // Default HP
      maxHp: 100,
      armor: 0,
      team: 'player',
      cards: playerDeck.cardIds.map((id: string, idx: number) => {
        const cardDef = cards.find(c => c.id === id);
        if (!cardDef) return null;
        
        // Calculate penalty
        const count = (playerCardCounts[id] || 0) + 1;
        playerCardCounts[id] = count;
        
        let penalty = 0;
        if (count === 2) penalty = 0.9;
        if (count >= 3) penalty = 2.8;

        const baseSpeed = cardDef.speed;
        const initialSpeed = baseSpeed !== null ? baseSpeed + penalty : null;

        // Modifiers
        const modId = playerDeck.modifierSlots?.[idx];
        const cardModifiers = [];
        if (modId) {
            const modDef = modifiers.find(m => m.id === modId);
            if (modDef) cardModifiers.push(modDef);
        }

        return {
          ...cardDef,
          instanceId: `p_card_${idx}`,
          originalSpeed: baseSpeed,
          currentSpeed: initialSpeed, // Initial with penalty
          deckSpeedPenalty: penalty,
          permanentSpeedModifier: 0,
          ownerId: 'player',
          modifiers: cardModifiers
        };
      }).filter((c: any) => c), // Filter undefined
      buffs: [],
      isDead: false
    };

    // Create Enemy Unit
    // Enemies also subject to penalty
    const enemyCardCounts: Record<string, number> = {};

    const enemyUnit: BattleUnit = {
      id: enemyDef.id,
      name: enemyDef.name,
      hp: enemyDef.hpMax, // Start at max
      maxHp: enemyDef.hpMax,
      armor: 0,
      team: 'enemy',
      cards: enemyDef.deck.map((id: string, idx: number) => {
        const cardDef = cards.find(c => c.id === id);
        if (!cardDef) return null;

        const count = (enemyCardCounts[id] || 0) + 1;
        enemyCardCounts[id] = count;
        
        let penalty = 0;
        if (count === 2) penalty = 0.9;
        if (count >= 3) penalty = 2.8;

        const baseSpeed = cardDef.speed;
        const npcSpeedMod = 0.1;
        const initialSpeed = baseSpeed !== null ? baseSpeed + penalty + npcSpeedMod : null;

        return {
          ...cardDef,
          instanceId: `e_card_${idx}`,
          originalSpeed: baseSpeed,
          currentSpeed: initialSpeed,
          deckSpeedPenalty: penalty,
          permanentSpeedModifier: npcSpeedMod,
          ownerId: enemyDef.id,
          modifiers: []
        };
      }).filter((c: any) => c),
      buffs: [],
      isDead: false
    };

    // Initial Battle State
    const initialState: BattleState = {
      tick: 0,
      turn: 1,
      units: [playerUnit, enemyUnit],
      log: [],
      isOver: false,
      winner: null,
      rngSeed: Date.now()
    };
    
    const loop = new BattleLoop(initialState);
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
    
    // Check for Battle End Trigger (Just happened)
    if (newState.isOver && !state.isOver) {
      if (newState.winner === 'player') {
        // Battle Won - Process Drops
        const enemyUnit = newState.units.find(u => u.team === 'enemy');
        if (enemyUnit) {
            // Find definition to get drop table
            // We need to look up by ID. Assuming enemyUnit.id is the def ID (it is set to enemyDef.id above)
            const enemyDef = (enemiesData as any).definitions[enemyUnit.id];
            if (enemyDef && enemyDef.dropTable) {
                const table = enemyDef.dropTable;
                if (Math.random() < table.chance) {
                    // Drop!
                    const count = Math.floor(Math.random() * (table.max - table.min + 1)) + table.min;
                    const newDrops: string[] = [];
                    for(let i=0; i<count; i++) {
                        const item = table.pool[Math.floor(Math.random() * table.pool.length)];
                        newDrops.push(item);
                    }
                    
                    if (newDrops.length > 0) {
                        set(state => ({
                            collectedLoot: {
                                ...state.collectedLoot,
                                modifiers: [...state.collectedLoot.modifiers, ...newDrops]
                            }
                        }));
                        // We could log this drop in battle log too if we want
                         // But loop.log is internal.
                         // For now, console log.
                         console.log("Drops:", newDrops);
                    }
                }
            }
        }
        
        // Auto Advance to Next Stage
        const { state, isLooping, isBossStage } = get();
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

    set({ state: newState });
  },

  togglePause: () => set(state => ({ isPaused: !state.isPaused })),
  toggleLoop: () => set(state => ({ isLooping: !state.isLooping })),
  
  setSpeed: (multiplier) => set({ speedMultiplier: multiplier }),
  
  exitBattle: () => {
      // Save collected modifiers
      const { collectedLoot } = get();
      const playerStore = usePlayerStore.getState();
      collectedLoot.modifiers.forEach(modId => playerStore.addModifier(modId));
      
      set({ state: null, loop: null, currentDungeonId: null });
  }
}));
