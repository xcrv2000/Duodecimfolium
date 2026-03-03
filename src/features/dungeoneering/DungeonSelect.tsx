import React from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useBattleStore } from '../../stores/battleStore';
import dungeonsData from '../../data/dungeons.json';
import { Dungeon } from '../../core/domain/Dungeon';
import { Skull, Coins, Lock } from 'lucide-react';
import { CustomUnitConfig } from '../../stores/battleStore';

const dungeons = dungeonsData as unknown as Dungeon[];

const DungeonSelect: React.FC<{ onNavigate: (tab: any) => void }> = () => {
  const unlockedDungeons = usePlayerStore(state => state.unlockedDungeons);
  const decks = usePlayerStore(state => state.decks);
  const startDungeon = useBattleStore(state => state.startDungeon);
  const startCustomBattle = useBattleStore(state => state.startCustomBattle);

  const [sandboxConfig, setSandboxConfig] = React.useState<{
      isOpen: boolean;
      playerCount: number;
      enemyCount: number;
      playerDeckIds: string[];
      enemyDeckJsons: string[];
  }>({
      isOpen: false,
      playerCount: 1,
      enemyCount: 1,
      playerDeckIds: [decks[0]?.id || ''],
      enemyDeckJsons: ['']
  });

  const handleStartDungeon = (dungeonId: string) => {
    if (dungeonId === 'sandbox_training') {
        setSandboxConfig({
            ...sandboxConfig,
            isOpen: true,
            playerDeckIds: Array(sandboxConfig.playerCount).fill(decks[0]?.id || ''),
            enemyDeckJsons: Array(sandboxConfig.enemyCount).fill('')
        });
        return;
    }

    const playerStore = usePlayerStore.getState();
    const deck = playerStore.decks[0];
    
    // Check Deck Size
    if (deck.cardIds.length < 8 || deck.cardIds.length > 12) {
        alert("卡组必须包含8到12张卡牌！");
        return;
    }
    
    // Check Modifiers
    const usedModifiers: Record<string, number> = {};
    if (deck.modifierSlots) {
        Object.values(deck.modifierSlots).forEach(modId => {
            usedModifiers[modId] = (usedModifiers[modId] || 0) + 1;
        });
    }
    
    for (const [modId, count] of Object.entries(usedModifiers)) {
        const inventoryCount = playerStore.modifiers[modId] || 0;
        if (count > inventoryCount) {
             alert(`修饰珠不足: ${modId} (需要 ${count}, 拥有 ${inventoryCount})`);
             return;
        }
    }
    
    startDungeon(dungeonId);
  };

  const handleStartSandbox = () => {
      // Validate Player Decks
      const playerConfigs: CustomUnitConfig[] = [];
      for (let i = 0; i < sandboxConfig.playerCount; i++) {
          const deckId = sandboxConfig.playerDeckIds[i];
          const deck = decks.find(d => d.id === deckId);
          if (!deck) {
              alert(`Player ${i+1} deck invalid.`);
              return;
          }
          if (deck.cardIds.length < 8 || deck.cardIds.length > 12) {
              alert(`Player ${i+1} 卡组必须包含8到12张卡牌！`);
              return;
          }
          playerConfigs.push({
              name: `Player ${i+1}`,
              cardIds: deck.cardIds,
              modifierSlots: deck.modifierSlots,
              hp: 100,
              team: 'player'
          });
      }

      // Validate Enemy Decks
      const enemyConfigs: CustomUnitConfig[] = [];
      for (let i = 0; i < sandboxConfig.enemyCount; i++) {
          const json = sandboxConfig.enemyDeckJsons[i];
          try {
              const parsed = JSON.parse(json);
              if (!parsed || !Array.isArray(parsed.cardIds)) throw new Error("Invalid Format");
              
              enemyConfigs.push({
                  name: parsed.name || `Dummy ${i+1}`,
                  cardIds: parsed.cardIds,
                  modifierSlots: parsed.modifierSlots,
                  hp: parsed.hp || 100, // Allow custom HP if in JSON, else 100
                  team: 'enemy'
              });
          } catch (e) {
              alert(`Enemy ${i+1} deck JSON is invalid. Please paste a valid deck JSON.`);
              return;
          }
      }

      startCustomBattle(playerConfigs, enemyConfigs);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto relative">
      {/* Sandbox Modal */}
      {sandboxConfig.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">训练场配置</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Player Config */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-green-400">Player Team</h3>
                        <div className="flex items-center gap-2">
                            <label>Count:</label>
                            <input 
                                type="number" min="1" max="3" 
                                value={sandboxConfig.playerCount}
                                onChange={(e) => {
                                    const count = Math.min(3, Math.max(1, parseInt(e.target.value) || 1));
                                    setSandboxConfig(prev => ({
                                        ...prev,
                                        playerCount: count,
                                        playerDeckIds: Array(count).fill(prev.playerDeckIds[0] || decks[0]?.id || '')
                                    }));
                                }}
                                className="bg-slate-700 p-1 rounded w-16"
                            />
                        </div>
                        
                        {Array.from({ length: sandboxConfig.playerCount }).map((_, i) => (
                            <div key={i} className="p-2 bg-slate-700/50 rounded">
                                <label className="block text-sm mb-1">Unit {i+1} Deck:</label>
                                <select 
                                    className="w-full bg-slate-700 p-2 rounded"
                                    value={sandboxConfig.playerDeckIds[i] || ''}
                                    onChange={(e) => {
                                        const newIds = [...sandboxConfig.playerDeckIds];
                                        newIds[i] = e.target.value;
                                        setSandboxConfig(prev => ({ ...prev, playerDeckIds: newIds }));
                                    }}
                                >
                                    {decks.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Enemy Config */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-red-400">Enemy Team</h3>
                        <div className="flex items-center gap-2">
                            <label>Count:</label>
                            <input 
                                type="number" min="1" max="3" 
                                value={sandboxConfig.enemyCount}
                                onChange={(e) => {
                                    const count = Math.min(3, Math.max(1, parseInt(e.target.value) || 1));
                                    setSandboxConfig(prev => ({
                                        ...prev,
                                        enemyCount: count,
                                        enemyDeckJsons: Array(count).fill('')
                                    }));
                                }}
                                className="bg-slate-700 p-1 rounded w-16"
                            />
                        </div>

                        {Array.from({ length: sandboxConfig.enemyCount }).map((_, i) => (
                            <div key={i} className="p-2 bg-slate-700/50 rounded">
                                <label className="block text-sm mb-1">Unit {i+1} Deck JSON:</label>
                                <textarea 
                                    className="w-full bg-slate-700 p-2 rounded h-24 text-xs font-mono"
                                    placeholder='Paste JSON here... {"cardIds": ["thrust", ...]}'
                                    value={sandboxConfig.enemyDeckJsons[i] || ''}
                                    onChange={(e) => {
                                        const newJsons = [...sandboxConfig.enemyDeckJsons];
                                        newJsons[i] = e.target.value;
                                        setSandboxConfig(prev => ({ ...prev, enemyDeckJsons: newJsons }));
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <button 
                        onClick={() => setSandboxConfig(prev => ({ ...prev, isOpen: false }))}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleStartSandbox}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold"
                    >
                        Start Battle
                    </button>
                </div>
            </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8 text-emerald-400 flex items-center gap-2">
        <Skull /> 选择地牢
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dungeons.map(dungeon => {
          const isUnlocked = unlockedDungeons.includes(dungeon.id);
          
          return (
            <div 
              key={dungeon.id}
              className={`relative p-6 rounded-lg border-2 transition-all group ${
                isUnlocked 
                  ? 'bg-slate-800 border-slate-700 hover:border-emerald-500 cursor-pointer' 
                  : 'bg-slate-900 border-slate-800 opacity-60 cursor-not-allowed'
              }`}
              onClick={() => {
                if (isUnlocked) {
                  handleStartDungeon(dungeon.id);
                }
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-white group-hover:text-emerald-400">{dungeon.name}</h2>
                {!isUnlocked && <Lock className="text-slate-500" />}
              </div>
              
              <p className="text-slate-400 text-sm mb-6 h-10">{dungeon.description}</p>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Coins size={16} />
                  <span>{dungeon.goldRewardMin}-{dungeon.goldRewardMax}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                    <span>Stages: {dungeon.stages.length}</span>
                </div>
              </div>

              {isUnlocked && (
                <button className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded font-bold transition-colors">
                  开始挑战
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DungeonSelect;
