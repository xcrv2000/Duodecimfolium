import React, { useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useBattleStore, CustomUnitConfig } from '../../stores/battleStore';
import { useReplayStore } from '../../stores/replayStore';
import { Card } from '../../core/domain/Card';
import cardsData from '../../data/cards.json';
import dungeonsData from '../../data/dungeons.json';
import { Dungeon } from '../../core/domain/Dungeon';
import { Skull, Coins, Lock, Play, ArrowLeft, History, Star, Trash2 } from 'lucide-react';

const dungeons = dungeonsData as unknown as Dungeon[];
const cards = cardsData as Card[];

const DungeonSelect: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const unlockedDungeons = usePlayerStore(state => state.unlockedDungeons);
  const clearedDungeons = usePlayerStore(state => state.clearedDungeons);
  const decks = usePlayerStore(state => state.decks);
  const startDungeon = useBattleStore(state => state.startDungeon);
  const startCustomBattle = useBattleStore(state => state.startCustomBattle);
  const startReplay = useBattleStore(state => state.startReplay);
  
  const { replays, toggleFavorite, deleteReplay } = useReplayStore();

  const [viewMode, setViewMode] = useState<'dungeon' | 'replay'>('dungeon');
  const [selectedDungeonId, setSelectedDungeonId] = useState<string | null>(null);
  const [selectedDeckIndex, setSelectedDeckIndex] = useState<number>(0);

  const [sandboxConfig, setSandboxConfig] = useState<{
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

  const handleStartDungeon = () => {
    if (!selectedDungeonId) return;

    if (selectedDungeonId === 'sandbox_training') {
        setSandboxConfig({
            ...sandboxConfig,
            isOpen: true,
            playerDeckIds: Array(sandboxConfig.playerCount).fill(decks[0]?.id || ''),
            enemyDeckJsons: Array(sandboxConfig.enemyCount).fill('')
        });
        return;
    }

    const playerStore = usePlayerStore.getState();
    const deck = playerStore.decks[selectedDeckIndex];
    if (!deck) return;
    
    // Check Deck Size
    if (deck.cardIds.length < 8 || deck.cardIds.length > 12) {
        alert("卡组必须包含8到12张卡牌！");
        return;
    }

    // Check Consumables
    const consumableCount = deck.cardIds.filter(id => {
        const c = cards.find(x => x.id === id);
        return c?.tags?.includes('补给品');
    }).length;

    if (consumableCount > 3) {
        alert(`补给品最多携带3张! (当前: ${consumableCount})`);
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
    
    startDungeon(selectedDungeonId, selectedDeckIndex);
    onNavigate('battle');
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
      onNavigate('battle');
  };

  // Replay List View
  if (viewMode === 'replay') {
      return (
          <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                  <button 
                    onClick={() => setViewMode('dungeon')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white"
                  >
                      <ArrowLeft size={20} /> 返回地牢列表
                  </button>
                  <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                      <History /> 战斗回放
                  </h2>
              </div>
              
              <div className="space-y-4">
                  {replays.length === 0 && (
                      <div className="text-center text-slate-500 py-12">暂无回放记录</div>
                  )}
                  {replays.map(replay => {
                      const dungeonName = dungeons.find(d => d.id === replay.dungeonId)?.name || replay.dungeonId;
                      const date = new Date(replay.timestamp).toLocaleString();
                      
                      return (
                          <div key={replay.id} className="bg-slate-800 p-4 rounded flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border border-slate-700 hover:border-slate-500 transition-colors">
                              <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold text-lg text-white">{dungeonName}</span>
                                      <span className="text-sm text-slate-400">Stage {replay.stageIndex + 1}</span>
                                      <span className="text-sm text-slate-400">vs {replay.enemyName}</span>
                                  </div>
                                  <div className="text-xs text-slate-500">{date}</div>
                              </div>
                              
                              <div className="flex items-center gap-2 sm:gap-4">
                                  <button 
                                    onClick={() => toggleFavorite(replay.id)}
                                    className={`p-2 rounded hover:bg-slate-700 ${replay.isFavorite ? 'text-yellow-400' : 'text-slate-600'}`}
                                    title="收藏回放"
                                  >
                                      <Star fill={replay.isFavorite ? "currentColor" : "none"} />
                                  </button>
                                  
                                  <button 
                                    onClick={() => deleteReplay(replay.id)}
                                    className="p-2 rounded hover:bg-slate-700 text-slate-600 hover:text-red-400"
                                    title="删除回放"
                                  >
                                      <Trash2 size={20} />
                                  </button>
                                  
                                  <button 
                                    onClick={() => {
                                        startReplay(replay.initialState, replay.seed);
                                        onNavigate('battle');
                                    }}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold flex items-center gap-2"
                                  >
                                      <Play size={16} /> 回放
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  // Deck Selection View
  if (selectedDungeonId && selectedDungeonId !== 'sandbox_training') {
      const dungeon = dungeons.find(d => d.id === selectedDungeonId);
      
      return (
          <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
              <button 
                onClick={() => setSelectedDungeonId(null)}
                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"
              >
                  <ArrowLeft size={20} /> 返回地牢列表
              </button>

              <div className="flex flex-col md:flex-row gap-8">
                  {/* Dungeon Info */}
                  <div className="w-full md:w-1/3 bg-slate-800 p-6 rounded-lg border border-slate-700">
                      <h2 className="text-2xl font-bold mb-4 text-emerald-400">{dungeon?.name}</h2>
                      <p className="text-slate-400 mb-6">{dungeon?.description}</p>
                      
                      <div className="space-y-4">
                          <div className="flex justify-between border-b border-slate-700 pb-2">
                              <span className="text-slate-500">关卡数</span>
                              <span>{dungeon?.stages.length}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700 pb-2">
                              <span className="text-slate-500">金币奖励</span>
                              <span className="text-yellow-400">{dungeon?.goldRewardMin}-{dungeon?.goldRewardMax}</span>
                          </div>
                      </div>
                  </div>

                  {/* Deck Selection */}
                  <div className="flex-1">
                      <h3 className="text-xl font-bold mb-4">选择出战卡组</h3>
                      <div className="grid grid-cols-1 gap-3 sm:gap-4 max-h-[60vh] overflow-y-auto pr-0 sm:pr-2">
                          {decks.map((deck, index) => {
                              const isValid = deck.cardIds.length >= 8 && deck.cardIds.length <= 12;
                              return (
                                  <div 
                                    key={deck.id}
                                    onClick={() => setSelectedDeckIndex(index)}
                                    className={`p-4 rounded border-2 cursor-pointer transition-all flex justify-between items-center ${
                                        selectedDeckIndex === index 
                                            ? 'bg-slate-800 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                                    }`}
                                  >
                                      <div>
                                          <h4 className={`font-bold ${selectedDeckIndex === index ? 'text-emerald-400' : 'text-slate-200'}`}>
                                              {deck.name}
                                          </h4>
                                          <div className="flex gap-4 text-xs mt-1">
                                              <span className={isValid ? 'text-slate-400' : 'text-red-400'}>
                                                  {deck.cardIds.length} 张卡牌
                                              </span>
                                              {/* Could show modifiers count here */}
                                          </div>
                                      </div>
                                      {selectedDeckIndex === index && <div className="w-4 h-4 rounded-full bg-emerald-500" />}
                                  </div>
                              );
                          })}
                      </div>

                      <button 
                        onClick={handleStartDungeon}
                        className="mt-8 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-lg font-bold text-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
                      >
                          <Play fill="currentColor" /> 开始挑战
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto relative">
      {/* Sandbox Modal */}
      {sandboxConfig.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            {/* ... Keep Sandbox Modal UI ... */}
            <div className="bg-slate-800 p-4 sm:p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">训练场配置</h2>
                {/* ... (Sandbox UI content same as before, abbreviated for brevity in this specific write, but I should output full content) ... */}
                {/* To save tokens and time, I will just copy paste the sandbox UI structure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-400 flex items-center gap-2">
            <Skull /> 选择地牢
          </h1>
          <button 
              onClick={() => setViewMode('replay')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-300 hover:text-white"
          >
              <History size={20} /> 查看回放
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dungeons.map(dungeon => {
          const isRequirementMet = !dungeon.unlockRequirementId || clearedDungeons.includes(dungeon.unlockRequirementId);
          const isExplicitlyUnlocked = unlockedDungeons.includes(dungeon.id);
          
          const isUnlocked = isRequirementMet || isExplicitlyUnlocked;
          const isCleared = clearedDungeons.includes(dungeon.id);
          
          return (
            <div 
              key={dungeon.id}
              className={`relative p-4 sm:p-6 rounded-lg border-2 transition-all group overflow-hidden ${
                isUnlocked 
                  ? 'bg-slate-800 border-slate-700 hover:border-emerald-500 cursor-pointer' 
                  : 'bg-slate-900 border-slate-800 opacity-60 cursor-not-allowed'
              }`}
              onClick={() => {
                if (isUnlocked) {
                  if (dungeon.id === 'sandbox_training') {
                      // Sandbox opens its own modal
                      handleStartDungeon(); // Will trigger sandbox config logic if I pass id... wait, I need to pass ID.
                      // Let's fix handleStartDungeon to use local state, but for sandbox, we need to trigger it.
                      // Sandbox is special.
                      setSelectedDungeonId('sandbox_training');
                      // Wait, if I set SelectedDungeonId to sandbox, it renders the deck selection view?
                      // No, I added a check `if (selectedDungeonId && selectedDungeonId !== 'sandbox_training')`
                      // So for sandbox, it just falls through to the main view, but `useEffect` or something needs to open the modal?
                      // Or I can just call setSandboxConfig directly here.
                      setSandboxConfig(prev => ({ ...prev, isOpen: true }));
                  } else {
                      setSelectedDungeonId(dungeon.id);
                  }
                }
              }}
            >
              {isCleared && (
                  <div className="absolute -left-8 top-4 bg-yellow-600 w-32 text-center transform -rotate-45 text-[10px] font-bold shadow-lg border-y border-yellow-400 text-white z-10">
                      已通关
                  </div>
              )}

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
              
              {!isUnlocked && dungeon.unlockRequirementId && (
                  <div className="mt-4 text-xs text-red-400">
                      需要通关: {dungeons.find(d => d.id === dungeon.unlockRequirementId)?.name || dungeon.unlockRequirementId}
                  </div>
              )}

              {isUnlocked && (
                <button className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded font-bold transition-colors">
                  {dungeon.id === 'sandbox_training' ? '进入配置' : '选择卡组'}
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
