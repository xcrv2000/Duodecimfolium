import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useBattleStore, CustomUnitConfig } from '../../stores/battleStore';
import { useReplayStore } from '../../stores/replayStore';
import { Card } from '../../core/domain/Card';
import cardsData from '../../data/cards.json';
import dungeonsData from '../../data/dungeons.json';
import packsData from '../../data/packs.json';
import locationsData from '../../data/locations.json';
import { Dungeon } from '../../core/domain/Dungeon';
import { decodeDeckCode } from '../../utils/deckCode';
import { Skull, Play, ArrowLeft, History, Star, Trash2 } from 'lucide-react';

const dungeons = dungeonsData as unknown as Dungeon[];
const cards = cardsData as Card[];
const packs = packsData as Array<{ id: string; name: string; description: string; isTemporary?: boolean; requiredTokenId?: string; requiredTokenCount?: number }>;
const locations = locationsData as Array<{
    id: string;
    name: string;
    defaultLabel: string;
    mapPosition: { x: number; y: number };
    dungeonIds: string[];
    packIds: string[];
}>;

const MAP_IMAGE_PATH = '/reference/docs/%E5%9C%B0%E5%9B%BE.png';
const BUTTON_IMAGE_PATH = '/reference/docs/button.png';
const BUTTON_PRESSED_IMAGE_PATH = '/reference/docs/button-pressed.png';

const DEFAULT_MAP_ZOOM = 1.2;
const MIN_MAP_ZOOM = 1;
const MAX_MAP_ZOOM = 2.5;

const DungeonSelect: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const unlockedDungeons = usePlayerStore(state => state.unlockedDungeons);
  const clearedDungeons = usePlayerStore(state => state.clearedDungeons);
    const unlockedPacks = usePlayerStore(state => state.unlockedPacks);
    const tokens = usePlayerStore(state => state.tokens);
  const decks = usePlayerStore(state => state.decks);
    const defaultDeckId = usePlayerStore(state => state.defaultDeckId);
  const startDungeon = useBattleStore(state => state.startDungeon);
  const startCustomBattle = useBattleStore(state => state.startCustomBattle);
  const startReplay = useBattleStore(state => state.startReplay);
    const runningBattleState = useBattleStore(state => state.state);
  
  const { replays, toggleFavorite, deleteReplay } = useReplayStore();

  const [viewMode, setViewMode] = useState<'dungeon' | 'replay'>('dungeon');
  const [selectedDungeonId, setSelectedDungeonId] = useState<string | null>(null);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
    const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);
    const [selectedDeckIndices, setSelectedDeckIndices] = useState<number[]>([]);
    const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
    const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
    const [isMapDragging, setIsMapDragging] = useState(false);
    const mapViewportRef = useRef<HTMLDivElement | null>(null);
    const dragStartRef = useRef<{ pointerX: number; pointerY: number; offsetX: number; offsetY: number } | null>(null);
    const dragMovedRef = useRef(false);

    useEffect(() => {
        if (!selectedDungeonId || selectedDungeonId === 'sandbox_training') return;
                const dungeon = dungeons.find((d) => d.id === selectedDungeonId);
                const teamSize = Math.max(1, dungeon?.teamSize || 1);
        const defaultIndex = decks.findIndex((d) => d.id === defaultDeckId);
        if (defaultIndex >= 0) {
                        if (teamSize === 1) {
                            setSelectedDeckIndices([defaultIndex]);
                        } else {
                            const fallback = Array.from({ length: teamSize }, (_, i) => i).filter((idx) => idx < decks.length);
                            setSelectedDeckIndices(fallback.length > 0 ? fallback : [defaultIndex]);
                        }
        }
    }, [selectedDungeonId, defaultDeckId, decks]);

  const [sandboxConfig, setSandboxConfig] = useState<{
      isOpen: boolean;
      playerCount: number;
      enemyCount: number;
      playerDeckIds: string[];
      playerDeckJsons: string[];
      enemyDeckIds: string[];
      enemyDeckJsons: string[];
  }>({
      isOpen: false,
      playerCount: 1,
      enemyCount: 1,
      playerDeckIds: [decks[0]?.id || ''],
      playerDeckJsons: [''],
      enemyDeckIds: [decks[0]?.id || ''],
      enemyDeckJsons: ['']
  });

    const isDungeonUnlocked = (dungeon: Dungeon): boolean => {
        const isRequirementMet = !dungeon.unlockRequirementId || clearedDungeons.includes(dungeon.unlockRequirementId);
        const isExplicitlyUnlocked = unlockedDungeons.includes(dungeon.id);
        return isRequirementMet || isExplicitlyUnlocked;
    };

    const isPackVisible = (pack: { isTemporary?: boolean; requiredTokenId?: string; requiredTokenCount?: number }): boolean => {
        if (!pack.isTemporary) return true;
        if (!pack.requiredTokenId) return false;
        return (tokens[pack.requiredTokenId] || 0) >= (pack.requiredTokenCount || 1);
    };

    const isPackUnlocked = (packId: string): boolean => {
        if (unlockedPacks.includes(packId)) return true;
        const unlockingDungeon = dungeons.find(d => d.unlocksPackId === packId);
        return !!(unlockingDungeon && clearedDungeons.includes(unlockingDungeon.id));
    };

    const openSandboxConfig = () => {
        const defaultDeck = decks.find((d) => d.id === defaultDeckId) || decks[0];
        setSandboxConfig(prev => ({
            ...prev,
            isOpen: true,
            playerDeckIds: Array(prev.playerCount).fill(defaultDeck?.id || ''),
            playerDeckJsons: Array(prev.playerCount).fill(''),
            enemyDeckIds: Array(prev.enemyCount).fill(defaultDeck?.id || ''),
            enemyDeckJsons: Array(prev.enemyCount).fill('')
        }));
    };

  const handleStartDungeon = () => {
        if (runningBattleState && !runningBattleState.isOver) {
            onNavigate('battle');
            return;
        }

    if (!selectedDungeonId) return;

    if (selectedDungeonId === 'sandbox_training') {
        openSandboxConfig();
        return;
    }

        const playerStore = usePlayerStore.getState();
        const dungeon = dungeons.find(d => d.id === selectedDungeonId);
        const teamSize = Math.max(1, dungeon?.teamSize || 1);

        if (selectedDeckIndices.length !== teamSize) {
            alert(`该地牢需要选择 ${teamSize} 套卡组（当前 ${selectedDeckIndices.length}）。`);
            return;
        }

        const selectedDecks = selectedDeckIndices.map((idx) => playerStore.decks[idx]).filter((deck) => !!deck);
        if (selectedDecks.length !== teamSize) {
            alert('卡组选择无效，请重新选择。');
            return;
        }

        for (let deckPos = 0; deckPos < selectedDecks.length; deckPos++) {
            const deck = selectedDecks[deckPos];

            if (deck.cardIds.length < 8 || deck.cardIds.length > 12) {
                alert(`队伍槽位 ${deckPos + 1} 的卡组必须包含8到12张卡牌！`);
                return;
            }

            const consumableCount = deck.cardIds.filter(id => {
                const c = cards.find(x => x.id === id);
                return c?.tags?.includes('补给品');
            }).length;
            if (consumableCount > 3) {
                alert(`队伍槽位 ${deckPos + 1} 补给品最多携带3张! (当前: ${consumableCount})`);
                return;
            }

            const armorCount = deck.cardIds.filter(id => {
                const c = cards.find(x => x.id === id);
                return c?.tags?.includes('护具');
            }).length;
            if (armorCount > 1) {
                alert(`队伍槽位 ${deckPos + 1} 护具最多携带1张! (当前: ${armorCount})`);
                return;
            }
        }
    
    // Check Modifiers
    const usedModifiers: Record<string, number> = {};
        selectedDecks.forEach((deck) => {
            if (deck.modifierSlots) {
                Object.values(deck.modifierSlots).forEach(modId => {
                    usedModifiers[modId] = (usedModifiers[modId] || 0) + 1;
                });
            }
        });
    
    for (const [modId, count] of Object.entries(usedModifiers)) {
        const inventoryCount = playerStore.modifiers[modId] || 0;
        if (count > inventoryCount) {
             alert(`修饰珠不足: ${modId} (需要 ${count}, 拥有 ${inventoryCount})`);
             return;
        }
    }
    
    startDungeon(selectedDungeonId, selectedDeckIndices);
    onNavigate('battle');
  };

  const handleStartSandbox = () => {
      if (runningBattleState && !runningBattleState.isOver) {
          onNavigate('battle');
          return;
      }

      // Validate Player Decks
      const playerConfigs: CustomUnitConfig[] = [];
      for (let i = 0; i < sandboxConfig.playerCount; i++) {
          const inputText = sandboxConfig.playerDeckJsons[i]?.trim() || '';
          let cardIds: string[] = [];
          let modifierSlots: Record<string, string> | undefined = undefined;
          let unitName = `Player ${i+1}`;

          if (inputText) {
              try {
                  const parsed = decodeDeckCode(inputText);
                  if (!parsed || !Array.isArray(parsed.cardIds)) throw new Error('Invalid format');
                  cardIds = parsed.cardIds;
                  modifierSlots = parsed.modifierSlots;
                  unitName = parsed.name || unitName;
              } catch {
                  alert(`Player ${i+1} 牌组输入无效。请粘贴有效卡组码或 JSON。`);
                  return;
              }
          } else {
              const deckId = sandboxConfig.playerDeckIds[i];
              const deck = decks.find(d => d.id === deckId);
              if (!deck) {
                  alert(`Player ${i+1} deck invalid.`);
                  return;
              }
              cardIds = deck.cardIds;
              modifierSlots = deck.modifierSlots;
              unitName = deck.name || unitName;
          }

          if (cardIds.length < 8 || cardIds.length > 12) {
              alert(`Player ${i+1} 卡组必须包含8到12张卡牌！`);
              return;
          }

          playerConfigs.push({
              name: unitName,
              cardIds,
              modifierSlots,
              hp: 100,
              team: 'player'
          });
      }

      // Validate Enemy Decks
      const enemyConfigs: CustomUnitConfig[] = [];
      for (let i = 0; i < sandboxConfig.enemyCount; i++) {
          const inputText = sandboxConfig.enemyDeckJsons[i]?.trim() || '';
          let cardIds: string[] = [];
          let modifierSlots: Record<string, string> | undefined = undefined;
          let unitName = `Dummy ${i+1}`;
          let customHp = 100;

          if (inputText) {
              try {
                  const parsed = decodeDeckCode(inputText);
                  if (!parsed || !Array.isArray(parsed.cardIds)) throw new Error('Invalid format');
                  cardIds = parsed.cardIds;
                  modifierSlots = parsed.modifierSlots;
                  unitName = parsed.name || unitName;

                  try {
                      const raw = JSON.parse(inputText);
                      if (raw && typeof raw.hp === 'number' && Number.isFinite(raw.hp)) {
                          customHp = raw.hp;
                      }
                  } catch {
                      // Deck code / non-JSON input does not carry hp override.
                  }
              } catch {
                  alert(`Enemy ${i+1} 牌组输入无效。请粘贴有效卡组码或 JSON。`);
                  return;
              }
          } else {
              const deckId = sandboxConfig.enemyDeckIds[i];
              const deck = decks.find(d => d.id === deckId);
              if (!deck) {
                  alert(`Enemy ${i+1} deck invalid.`);
                  return;
              }
              cardIds = deck.cardIds;
              modifierSlots = deck.modifierSlots;
              unitName = deck.name || unitName;
          }

          if (cardIds.length < 8 || cardIds.length > 12) {
              alert(`Enemy ${i+1} 卡组必须包含8到12张卡牌！`);
              return;
          }

          enemyConfigs.push({
              name: unitName,
              cardIds,
              modifierSlots,
              hp: customHp,
              team: 'enemy'
          });
      }

      startCustomBattle(playerConfigs, enemyConfigs);
      onNavigate('battle');
  };

  const clampMapOffset = (offset: { x: number; y: number }, zoom: number) => {
      const viewport = mapViewportRef.current;
      if (!viewport) return offset;

      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const scaledWidth = width * zoom;
      const scaledHeight = height * zoom;

      const minX = Math.min(0, width - scaledWidth);
      const minY = Math.min(0, height - scaledHeight);

      return {
          x: Math.min(0, Math.max(minX, offset.x)),
          y: Math.min(0, Math.max(minY, offset.y))
      };
  };

  const getCenteredOffset = (zoom: number) => {
      const viewport = mapViewportRef.current;
      if (!viewport) return { x: 0, y: 0 };

      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      return {
          x: (width - width * zoom) / 2,
          y: (height - height * zoom) / 2
      };
  };

  useEffect(() => {
      const viewport = mapViewportRef.current;
      if (!viewport) return;
      setMapOffset(clampMapOffset(getCenteredOffset(DEFAULT_MAP_ZOOM), DEFAULT_MAP_ZOOM));
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      const handleResize = () => {
          setMapOffset((prev) => clampMapOffset(prev, mapZoom));
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapZoom]);

  const handleMapWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const viewport = mapViewportRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;
      const nextZoom = Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, mapZoom * zoomDelta));

      if (nextZoom === mapZoom) return;

      const worldX = (pointerX - mapOffset.x) / mapZoom;
      const worldY = (pointerY - mapOffset.y) / mapZoom;
      const nextOffsetX = pointerX - worldX * nextZoom;
      const nextOffsetY = pointerY - worldY * nextZoom;

      setMapZoom(nextZoom);
      setMapOffset(clampMapOffset({ x: nextOffsetX, y: nextOffsetY }, nextZoom));
  };

  const handleMapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      dragStartRef.current = {
          pointerX: e.clientX,
          pointerY: e.clientY,
          offsetX: mapOffset.x,
          offsetY: mapOffset.y
      };
      dragMovedRef.current = false;
      setIsMapDragging(true);
  };

  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragStartRef.current) return;
      const deltaX = e.clientX - dragStartRef.current.pointerX;
      const deltaY = e.clientY - dragStartRef.current.pointerY;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          dragMovedRef.current = true;
      }

      setMapOffset(clampMapOffset({
          x: dragStartRef.current.offsetX + deltaX,
          y: dragStartRef.current.offsetY + deltaY
      }, mapZoom));
  };

  const stopMapDragging = () => {
      dragStartRef.current = null;
      setIsMapDragging(false);
  };

  const handleMapDoubleClick = () => {
      const resetOffset = clampMapOffset(getCenteredOffset(DEFAULT_MAP_ZOOM), DEFAULT_MAP_ZOOM);
      setMapZoom(DEFAULT_MAP_ZOOM);
      setMapOffset(resetOffset);
      dragMovedRef.current = false;
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
                                            <ArrowLeft size={20} /> 返回地图
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
                                        if (runningBattleState && !runningBattleState.isOver) {
                                            onNavigate('battle');
                                            return;
                                        }
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
      const teamSize = Math.max(1, dungeon?.teamSize || 1);
      
      return (
          <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
              <button 
                onClick={() => setSelectedDungeonId(null)}
                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"
              >
                                    <ArrowLeft size={20} /> 返回地点详情
              </button>

              <div className="flex flex-col md:flex-row gap-8">
                  {/* Dungeon Info */}
                  <div className="w-full md:w-1/3 bg-slate-800 p-6 rounded-lg border border-slate-700">
                      <h2 className="text-2xl font-bold mb-4 text-emerald-400">{dungeon?.name}</h2>
                      <p className="text-slate-400 mb-6">{dungeon?.description}</p>
                                            {dungeon?.designer && (
                                                <p className="text-right text-xs text-slate-500 -mt-4 mb-4">设计师: {dungeon.designer}</p>
                                            )}
                      
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
                                            <h3 className="text-xl font-bold mb-2">选择出战卡组</h3>
                                            <p className="text-sm text-slate-400 mb-4">需要选择 {teamSize} 套卡组（已选 {selectedDeckIndices.length}）</p>
                      <div className="grid grid-cols-1 gap-3 sm:gap-4 max-h-[60vh] overflow-y-auto pr-0 sm:pr-2">
                          {decks.map((deck, index) => {
                              const isValid = deck.cardIds.length >= 8 && deck.cardIds.length <= 12;
                                                            const selectedPos = selectedDeckIndices.indexOf(index);
                              return (
                                  <div 
                                    key={deck.id}
                                                                        onClick={() => {
                                                                            if (teamSize === 1) {
                                                                                setSelectedDeckIndices([index]);
                                                                                return;
                                                                            }

                                                                            setSelectedDeckIndices((prev) => {
                                                                                if (prev.includes(index)) {
                                                                                    return prev.filter((v) => v !== index);
                                                                                }
                                                                                if (prev.length >= teamSize) {
                                                                                    return prev;
                                                                                }
                                                                                return [...prev, index];
                                                                            });
                                                                        }}
                                    className={`p-4 rounded border-2 cursor-pointer transition-all flex justify-between items-center ${
                                                                                selectedPos !== -1
                                            ? 'bg-slate-800 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                                    }`}
                                  >
                                      <div>
                                                                                    <h4 className={`font-bold ${selectedPos !== -1 ? 'text-emerald-400' : 'text-slate-200'}`}>
                                              {deck.name}
                                          </h4>
                                          <div className="flex gap-4 text-xs mt-1">
                                              <span className={isValid ? 'text-slate-400' : 'text-red-400'}>
                                                  {deck.cardIds.length} 张卡牌
                                              </span>
                                              {/* Could show modifiers count here */}
                                          </div>
                                      </div>
                                                                            {selectedPos !== -1 && (
                                                                                <div className="min-w-7 h-7 px-2 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                                                                                    {selectedPos + 1}
                                                                                </div>
                                                                            )}
                                  </div>
                              );
                          })}
                      </div>

                      <button 
                        onClick={handleStartDungeon}
                                                disabled={selectedDeckIndices.length !== teamSize}
                                                className={`mt-8 w-full py-4 rounded-lg font-bold text-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] ${
                                                    selectedDeckIndices.length === teamSize
                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                                }`}
                      >
                          <Play fill="currentColor" /> 开始挑战
                      </button>
                  </div>
              </div>
          </div>
      );
  }

    if (selectedLocationId) {
            const location = locations.find(l => l.id === selectedLocationId);
            if (location) {
                    const locationDungeons = location.dungeonIds
                            .map((id) => dungeons.find((d) => d.id === id))
                            .filter((d): d is Dungeon => !!d);
                    const locationPacks = location.packIds
                            .map((id) => packs.find((p) => p.id === id))
                            .filter((p): p is { id: string; name: string; description: string; isTemporary?: boolean; requiredTokenId?: string; requiredTokenCount?: number } => !!p)
                            .filter(isPackVisible);

                    return (
                            <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
                                    <button
                                        onClick={() => setSelectedLocationId(null)}
                                        className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"
                                    >
                                        <ArrowLeft size={20} /> 返回地图
                                    </button>

                                    <div className="mb-8">
                                        <h2 className="text-2xl sm:text-3xl font-bold text-emerald-400">{location.name}</h2>
                                        <p className="text-slate-400 mt-2">选择地点内的地牢或查看对应卡包。</p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                                            <h3 className="text-xl font-bold mb-4">地牢</h3>
                                            <div className="space-y-3">
                                                {locationDungeons.map((dungeon) => {
                                                    const unlocked = isDungeonUnlocked(dungeon);
                                                    const isCleared = clearedDungeons.includes(dungeon.id);
                                                    return (
                                                        <div key={dungeon.id} className={`rounded border p-4 ${unlocked ? 'border-slate-600 bg-slate-900' : 'border-slate-800 bg-slate-900/70'}`}>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div>
                                                                    <div className="font-bold text-white">{dungeon.name}</div>
                                                                    <div className="text-xs text-slate-400 mt-1">{dungeon.description}</div>
                                                                </div>
                                                                {isCleared && <span className="text-xs text-yellow-400">已通关</span>}
                                                            </div>
                                                            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                                                                <span>战斗数: {dungeon.stages.length}</span>
                                                                <span>金币: {dungeon.goldRewardMin}-{dungeon.goldRewardMax}</span>
                                                            </div>
                                                            <button
                                                                disabled={!unlocked}
                                                                onClick={() => {
                                                                    if (!unlocked) return;
                                                                    if (dungeon.id === 'sandbox_training') {
                                                                        setSelectedDungeonId('sandbox_training');
                                                                        openSandboxConfig();
                                                                        return;
                                                                    }
                                                                    setSelectedDungeonId(dungeon.id);
                                                                }}
                                                                className={`mt-4 w-full py-2 rounded font-bold ${unlocked ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                                                            >
                                                                {unlocked ? '选择卡组并挑战' : '未解锁'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                                            <h3 className="text-xl font-bold mb-4">卡包</h3>
                                            <div className="space-y-3">
                                                {locationPacks.map((pack) => {
                                                    const unlocked = isPackUnlocked(pack.id);
                                                    return (
                                                        <div key={pack.id} className={`rounded border p-4 ${unlocked ? 'border-slate-600 bg-slate-900' : 'border-slate-800 bg-slate-900/70'}`}>
                                                            <div className="font-bold text-white">{pack.name}</div>
                                                            <div className="text-xs text-slate-400 mt-1">{pack.description}</div>
                                                            <button
                                                                disabled={!unlocked}
                                                                onClick={() => onNavigate('gacha')}
                                                                className={`mt-4 w-full py-2 rounded font-bold ${unlocked ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                                                            >
                                                                {unlocked ? '前往商店查看' : '未解锁'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                {locationPacks.length === 0 && (
                                                    <div className="text-sm text-slate-500">当前地点没有可见卡包。</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                            </div>
                    );
            }
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto relative">
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
                                type="number" min="1" max="12" 
                                value={sandboxConfig.playerCount}
                                onChange={(e) => {
                                    const count = Math.min(12, Math.max(1, parseInt(e.target.value) || 1));
                                    setSandboxConfig(prev => ({
                                        ...prev,
                                        playerCount: count,
                                        playerDeckIds: Array(count).fill(prev.playerDeckIds[0] || decks[0]?.id || ''),
                                        playerDeckJsons: Array(count).fill(prev.playerDeckJsons[0] || '')
                                    }));
                                }}
                                className="bg-slate-700 p-1 rounded w-16"
                            />
                        </div>
                        {Array.from({ length: sandboxConfig.playerCount }).map((_, i) => (
                            <div key={i} className="p-2 bg-slate-700/50 rounded">
                                <label className="block text-sm mb-1">Unit {i+1} Deck (Select):</label>
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
                                <label className="block text-sm mt-3 mb-1">Or Import Deck Code / JSON:</label>
                                <textarea 
                                    className="w-full bg-slate-700 p-2 rounded h-24 text-xs font-mono"
                                    placeholder='Paste deck code or JSON here... DDF3.xxx / {"cardIds": ["thrust", ...]}'
                                    value={sandboxConfig.playerDeckJsons[i] || ''}
                                    onChange={(e) => {
                                        const newJsons = [...sandboxConfig.playerDeckJsons];
                                        newJsons[i] = e.target.value;
                                        setSandboxConfig(prev => ({ ...prev, playerDeckJsons: newJsons }));
                                    }}
                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newJsons = [...sandboxConfig.playerDeckJsons];
                                                                        newJsons[i] = '';
                                                                        setSandboxConfig(prev => ({ ...prev, playerDeckJsons: newJsons }));
                                                                    }}
                                                                    className="mt-2 text-xs px-2 py-1 rounded bg-slate-600 hover:bg-slate-500"
                                                                >
                                                                    删除已导入内容
                                                                </button>
                                <p className="text-xs text-slate-400 mt-1">若填写导入内容，将优先使用导入卡组。</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-red-400">Enemy Team</h3>
                        <div className="flex items-center gap-2">
                            <label>Count:</label>
                            <input 
                                type="number" min="1" max="12" 
                                value={sandboxConfig.enemyCount}
                                onChange={(e) => {
                                    const count = Math.min(12, Math.max(1, parseInt(e.target.value) || 1));
                                    setSandboxConfig(prev => ({
                                        ...prev,
                                        enemyCount: count,
                                        enemyDeckIds: Array(count).fill(prev.enemyDeckIds[0] || decks[0]?.id || ''),
                                        enemyDeckJsons: Array(count).fill(prev.enemyDeckJsons[0] || '')
                                    }));
                                }}
                                className="bg-slate-700 p-1 rounded w-16"
                            />
                        </div>
                        {Array.from({ length: sandboxConfig.enemyCount }).map((_, i) => (
                            <div key={i} className="p-2 bg-slate-700/50 rounded">
                                <label className="block text-sm mb-1">Unit {i+1} Deck (Select):</label>
                                <select 
                                    className="w-full bg-slate-700 p-2 rounded"
                                    value={sandboxConfig.enemyDeckIds[i] || ''}
                                    onChange={(e) => {
                                        const newIds = [...sandboxConfig.enemyDeckIds];
                                        newIds[i] = e.target.value;
                                        setSandboxConfig(prev => ({ ...prev, enemyDeckIds: newIds }));
                                    }}
                                >
                                    {decks.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                                <label className="block text-sm mt-3 mb-1">Or Import Deck Code / JSON:</label>
                                <textarea 
                                    className="w-full bg-slate-700 p-2 rounded h-24 text-xs font-mono"
                                    placeholder='Paste deck code or JSON here... DDF3.xxx / {"cardIds": ["thrust", ...]}'
                                    value={sandboxConfig.enemyDeckJsons[i] || ''}
                                    onChange={(e) => {
                                        const newJsons = [...sandboxConfig.enemyDeckJsons];
                                        newJsons[i] = e.target.value;
                                        setSandboxConfig(prev => ({ ...prev, enemyDeckJsons: newJsons }));
                                    }}
                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newJsons = [...sandboxConfig.enemyDeckJsons];
                                                                        newJsons[i] = '';
                                                                        setSandboxConfig(prev => ({ ...prev, enemyDeckJsons: newJsons }));
                                                                    }}
                                                                    className="mt-2 text-xs px-2 py-1 rounded bg-slate-600 hover:bg-slate-500"
                                                                >
                                                                    删除已导入内容
                                                                </button>
                                <p className="text-xs text-slate-400 mt-1">若填写导入内容，将优先使用导入卡组。JSON 可额外包含 hp 字段。</p>
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
                        <Skull /> 地图探索
          </h1>
          <button 
              onClick={() => setViewMode('replay')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-300 hover:text-white"
          >
              <History size={20} /> 查看回放
          </button>
      </div>

            <div
                ref={mapViewportRef}
                className={`relative w-full aspect-[3/2] rounded-xl border border-slate-700 bg-slate-900 overflow-hidden select-none ${isMapDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onWheel={handleMapWheel}
                onMouseDown={handleMapMouseDown}
                onMouseMove={handleMapMouseMove}
                onMouseUp={stopMapDragging}
                onMouseLeave={stopMapDragging}
                onDoubleClick={handleMapDoubleClick}
            >
                <div className="absolute right-3 top-3 z-30 rounded-md border border-slate-600/80 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 pointer-events-none">
                    <div>滚轮：缩放地图</div>
                    <div>左键拖拽：平移地图</div>
                    <div>双击：复位视图</div>
                </div>

                <div
                    className="absolute inset-0"
                    style={{
                        transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapZoom})`,
                        transformOrigin: '0 0'
                    }}
                >
                    <img src={MAP_IMAGE_PATH} alt="世界地图" className="w-full h-full object-fill opacity-90 pointer-events-none" draggable={false} />

                    {locations.map((location) => {
                        const locationDungeons = location.dungeonIds
                            .map((id) => dungeons.find((d) => d.id === id))
                            .filter((d): d is Dungeon => !!d);
                        const locationPacks = location.packIds
                            .map((id) => packs.find((p) => p.id === id))
                            .filter((p): p is { id: string; name: string; description: string; isTemporary?: boolean; requiredTokenId?: string; requiredTokenCount?: number } => !!p)
                            .filter(isPackVisible);

                        const hasUnlockedDungeon = locationDungeons.some((dungeon) => isDungeonUnlocked(dungeon));
                        const hasUnlockedPack = locationPacks.some((pack) => isPackUnlocked(pack.id));
                        if (!hasUnlockedDungeon && !hasUnlockedPack) {
                            return null;
                        }

                        const tooltipText = [
                            `地点: ${location.name}`,
                            `地牢: ${locationDungeons.map((d) => d.name).join('、') || '无'}`,
                            `卡包: ${locationPacks.map((p) => p.name).join('、') || '无'}`
                        ].join('\n');

                        const isPressed = selectedLocationId === location.id;

                        return (
                            <div
                                key={location.id}
                                className="absolute"
                                style={{ left: `${location.mapPosition.x}%`, top: `${location.mapPosition.y}%` }}
                            >
                                <div
                                    className="relative w-11 h-11 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ transform: `translate(-50%, -50%) scale(${1 / mapZoom})`, transformOrigin: 'center center' }}
                                >
                                    <button
                                        onMouseEnter={() => setHoveredLocationId(location.id)}
                                        onMouseLeave={() => setHoveredLocationId((curr) => (curr === location.id ? null : curr))}
                                        onClick={() => {
                                            if (dragMovedRef.current) return;
                                            setSelectedLocationId(location.id);
                                        }}
                                        title={tooltipText}
                                        className="w-11 h-11 bg-contain bg-center bg-no-repeat hover:scale-105 transition-transform pointer-events-auto"
                                        style={{ backgroundImage: `url(${isPressed ? BUTTON_PRESSED_IMAGE_PATH : BUTTON_IMAGE_PATH})` }}
                                        aria-label={`地点 ${location.name}`}
                                    />
                                    <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-center text-white text-sm font-bold leading-tight whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none">{location.defaultLabel}</div>

                                    {hoveredLocationId === location.id && (
                                        <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 w-72 bg-slate-900/95 border border-slate-600 rounded p-3 z-20 shadow-xl pointer-events-none">
                                            <div className="text-emerald-400 font-bold mb-1">{location.name}</div>
                                            <div className="text-xs text-slate-300">地牢：{locationDungeons.map((d) => d.name).join('、') || '无'}</div>
                                            <div className="text-xs text-slate-300 mt-1">卡包：{locationPacks.map((p) => p.name).join('、') || '无'}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
      </div>
    </div>
  );
};

export default DungeonSelect;
