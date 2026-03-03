import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import cardsData from '../../data/cards.json';
import modifiersData from '../../data/modifiers.json';
import { Layers, Plus, Minus, Trash2, Edit2, Download, Upload, Check, X, Gem } from 'lucide-react';
import { Card } from '../../core/domain/Card';
import CardDisplay from '../common/CardDisplay';

const cards = cardsData as Card[];
const modifiers = modifiersData as any[];

const CollectionView: React.FC<{ onNavigate: (tab: any) => void }> = () => {
  const { collection, decks, updateDeck, createDeck, deleteDeck, renameDeck, importDeck, modifiers: ownedModifiers } = usePlayerStore();
  const [selectedDeckId, setSelectedDeckId] = useState(decks[0]?.id || '');
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // Modifier selection state
  const [modifierTargetIndex, setModifierTargetIndex] = useState<number | null>(null);

  // Sync selectedDeckId if current one is deleted or invalid
  useEffect(() => {
    if (!decks.find(d => d.id === selectedDeckId)) {
      if (decks.length > 0) setSelectedDeckId(decks[decks.length - 1].id);
    }
  }, [decks, selectedDeckId]);

  // Filter cards: show only owned cards or cards from unlocked packs?
  // User Requirement: "在没有打开过对应卡包（剑魔法）前，卡组编辑页面不应显示对应的卡。这个设定应该和图鉴同步。"
  // Interpretation: If I own 0 copies of a card AND I haven't unlocked its pack, hide it?
  // Or: Just hide cards if I own 0 copies?
  // But Compendium usually shows "???" for unknown cards.
  // User says "不应显示对应的卡" (Should not show the corresponding card).
  // Let's hide cards where owned count is 0.
  // BUT what if I want to see what I'm missing?
  // "这个设定应该和图鉴同步" -> Sync with Compendium.
  // Compendium logic (usually): Show all if pack unlocked, or show if owned.
  // Here in DeckBuilder, we usually only show owned cards anyway?
  // Current logic: `collection[card.id] || 0`
  // `cards.map(...)` iterates ALL cards.
  // And `className={count === 0 ? 'opacity-30 grayscale' : ''}`.
  // So currently it shows unowned cards as grayed out.
  // We need to filter `cards` before mapping.
  
  // Logic: Show card IF (count > 0) OR (Pack is Unlocked).
  // But wait, "在没有打开过对应卡包...不应显示".
  // Means if Pack is LOCKED and count is 0 -> Hide.
  // If Pack is UNLOCKED and count is 0 -> Show (Grayed out)? Or Hide?
  // Usually Deck Builder only shows cards you CAN put in deck?
  // But maybe you want to see what you are missing from a pack you own.
  // Let's implement: Filter out cards where (count === 0 AND Pack is not unlocked).
  // How to know if pack is unlocked?
  // We don't have `unlockedPacks` in playerStore in this file scope.
  // Let's check `usePlayerStore`.
  const unlockedPacks = usePlayerStore(state => state.unlockedPacks);
  
  const visibleCards = cards.filter(card => {
      const count = collection[card.id] || 0;
      if (count > 0) return true;
      // If count is 0, only show if its pack is unlocked
      // Basic cards might not have a packId or be in 'basic' pack?
      // Check data/cards.json: "packId": "basic_swordsmanship" etc.
      if (!card.packId) return true; // Always show base cards?
      return unlockedPacks.includes(card.packId);
  });

  const currentDeck = decks.find(d => d.id === selectedDeckId) || decks[0];

  // Helper to count cards in deck
  const getDeckCardCount = (cardId: string) => {
    if (!currentDeck) return 0;
    return currentDeck.cardIds.filter(id => id === cardId).length;
  };

  const addToDeck = (cardId: string) => {
    if (!currentDeck) return;

    // Check max copies (3)
    if (getDeckCardCount(cardId) >= 3) return;
    
    // Check ownership
    const ownedCount = collection[cardId] || 0;
    if (getDeckCardCount(cardId) >= ownedCount) return;

    // Check deck size (max 12)
    // Prompt: "对于每个卡组，都可以携带不超过某张卡持有张数那么多的卡。" (Each deck can carry cards up to the owned count.)
    // Prompt also says: "一个卡组中最多有三张同名卡。" (Max 3 copies of same card in a deck.)
    // New Requirement: Deck must be 8-12 cards.
    if (currentDeck.cardIds.length >= 12) {
        alert("卡组最多包含12张卡牌。");
        return;
    }

    // When adding a card, we just append ID. Modifiers are managed by index map.
    updateDeck(currentDeck.id, [...currentDeck.cardIds, cardId]);
  };

  const removeFromDeck = (index: number) => {
    // Remove by index to ensure we remove the correct instance (and its modifier)
    const newIds = [...currentDeck.cardIds];
    newIds.splice(index, 1);
    
    // Update modifier slots: shift keys or rebuild
    // Since modifiers are keyed by index, removing an item shifts indices of subsequent items.
    // We need to rebuild the modifier map.
    const newModifiers: Record<string, string> = {};
    Object.entries(currentDeck.modifierSlots || {}).forEach(([key, value]) => {
        const keyIdx = parseInt(key);
        if (keyIdx < index) {
            newModifiers[key] = value;
        } else if (keyIdx > index) {
            newModifiers[(keyIdx - 1).toString()] = value;
        }
        // If keyIdx === index, it's deleted.
    });

    updateDeck(currentDeck.id, newIds, newModifiers);
  };

  const attachModifier = (index: number, modifierId: string | null) => {
    const newModifiers = { ...(currentDeck.modifierSlots || {}) };
    if (modifierId) {
        newModifiers[index] = modifierId;
    } else {
        delete newModifiers[index];
    }
    updateDeck(currentDeck.id, currentDeck.cardIds, newModifiers);
    setModifierTargetIndex(null);
  };

  const handleCreate = () => {
    createDeck(`Deck ${decks.length + 1}`);
  };

  const handleDelete = () => {
    if (decks.length <= 1) return;
    if (window.confirm('Delete this deck?')) {
      deleteDeck(currentDeck.id);
    }
  };

  const handleRenameStart = () => {
    setTempName(currentDeck.name);
    setIsRenaming(true);
  };

  const handleRenameSave = () => {
    if (tempName.trim()) {
        renameDeck(currentDeck.id, tempName.trim());
    }
    setIsRenaming(false);
  };

  const handleExport = () => {
    if (currentDeck.cardIds.length < 8 || currentDeck.cardIds.length > 12) {
        alert("无法导出：卡组必须包含8到12张卡牌。");
        return;
    }
    const data = JSON.stringify(currentDeck);
    navigator.clipboard.writeText(data).then(() => alert('Deck copied to clipboard!'));
  };

  const handleImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const deck = JSON.parse(text);
      if (deck && deck.cardIds) {
        importDeck(deck);
        alert('Deck imported!');
      } else {
        alert('Invalid deck data');
      }
    } catch (e) {
      alert('Failed to import: ' + e);
    }
  };

  const sortDeck = (criteria: 'id' | 'speed') => {
    if (!currentDeck) return;
    
    // Sorting shuffles indices, so modifiers will be mismatched unless we track them.
    // We need to pair cards with their modifiers, sort the pairs, then unzip.
    
    const deckItems = currentDeck.cardIds.map((id, index) => ({
        id,
        modifierId: currentDeck.modifierSlots?.[index]
    }));
    
    deckItems.sort((a, b) => {
        const cardA = cards.find(c => c.id === a.id);
        const cardB = cards.find(c => c.id === b.id);
        if (!cardA || !cardB) return 0;

        if (criteria === 'id') {
            return cardA.id.localeCompare(cardB.id);
        } else {
            // Speed sort
            const speedA = cardA.speed ?? 999;
            const speedB = cardB.speed ?? 999;
            if (speedA !== speedB) return speedA - speedB;
            return cardA.id.localeCompare(cardB.id);
        }
    });
    
    const newIds = deckItems.map(item => item.id);
    const newModifiers: Record<string, string> = {};
    deckItems.forEach((item, index) => {
        if (item.modifierId) {
            newModifiers[index] = item.modifierId;
        }
    });
    
    updateDeck(currentDeck.id, newIds, newModifiers);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Collection */}
      <div className="flex-1 p-8 overflow-y-auto border-r border-slate-700">
        <h1 className="text-3xl font-bold mb-8 text-emerald-400 flex items-center gap-2">
          <Layers /> 卡组编辑 (Deck Builder)
        </h1>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
          {visibleCards.map(card => {
            const count = collection[card.id] || 0;
            const inDeck = getDeckCardCount(card.id);
            const canAdd = count > inDeck && inDeck < 3;

            return (
              <CardDisplay
                key={card.id}
                card={card}
                count={count}
                inDeck={inDeck}
                onClick={() => canAdd && addToDeck(card.id)}
                disabled={count === 0}
                className={count === 0 ? 'opacity-30 grayscale' : ''}
              />
            );
          })}
        </div>
      </div>

      {/* Right: Deck View */}
      <div className="w-80 bg-slate-900 p-4 flex flex-col border-l border-slate-700 shadow-xl">
        {/* Deck Controls */}
        <div className="mb-6 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
                <label className="text-slate-400 text-xs font-bold">当前卡组 (CURRENT DECK)</label>
                <div className={`text-xs font-bold ${
                    currentDeck.cardIds.length >= 8 && currentDeck.cardIds.length <= 12 
                    ? 'text-emerald-400' 
                    : 'text-red-400'
                }`}>
                    {currentDeck.cardIds.length} 张 {
                        (currentDeck.cardIds.length < 8 || currentDeck.cardIds.length > 12) && '(不可用)'
                    }
                </div>
            </div>
            
            <div className="flex gap-2 mb-2">
                <select 
                    className="flex-1 bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-emerald-500"
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                >
                    {decks.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
                <button onClick={handleCreate} className="bg-emerald-600 p-2 rounded hover:bg-emerald-500 text-white" title="新建卡组">
                    <Plus size={16} />
                </button>
            </div>

            {isRenaming ? (
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={tempName} 
                        onChange={(e) => setTempName(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded p-1 text-sm text-white"
                        autoFocus
                    />
                    <button onClick={handleRenameSave} className="text-emerald-400"><Check size={16} /></button>
                    <button onClick={() => setIsRenaming(false)} className="text-red-400"><X size={16} /></button>
                </div>
            ) : (
                <div className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700">
                    <span className="font-bold truncate flex-1">{currentDeck.name}</span>
                    <button onClick={handleRenameStart} className="text-slate-400 hover:text-white ml-2" title="重命名"><Edit2 size={14} /></button>
                </div>
            )}

            <div className="flex justify-between mt-2 gap-2">
                <button onClick={handleImport} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-1 rounded flex items-center justify-center gap-1 text-slate-300">
                    <Download size={12} /> 导入
                </button>
                <button onClick={handleExport} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-1 rounded flex items-center justify-center gap-1 text-slate-300">
                    <Upload size={12} /> 导出
                </button>
                <button onClick={handleDelete} className="bg-red-900/50 hover:bg-red-800 text-red-400 p-1 rounded disabled:opacity-30" disabled={decks.length <= 1} title="删除卡组">
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Sort Buttons */}
            <div className="flex gap-2">
                <button 
                    onClick={() => sortDeck('id')}
                    className="flex-1 bg-slate-800 border border-slate-700 hover:border-emerald-500 text-[10px] py-1 rounded text-slate-400 hover:text-white transition-colors"
                >
                    按ID排序
                </button>
                <button 
                    onClick={() => sortDeck('speed')}
                    className="flex-1 bg-slate-800 border border-slate-700 hover:border-emerald-500 text-[10px] py-1 rounded text-slate-400 hover:text-white transition-colors"
                >
                    按速度排序
                </button>
            </div>
        </div>

        {/* Deck Cards List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {currentDeck.cardIds.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-sm">
                    卡组为空。<br/>点击左侧卡牌添加。
                </div>
            ) : (
                // Group cards by ID for display, BUT track counts for penalties
                // Actually, let's just map over the array and calculate penalties on the fly
                // But user wants "clear modifier next to them".
                // We should list them individually if they have different stats.
                // Or group them but show "x2 (Speed 2, 3)"
                
                // Let's list individually for clarity as requested.
                // To keep track of "which copy this is", we can iterate with index or reduce.
                
                (() => {
                    const counts: Record<string, number> = {};
                    return currentDeck.cardIds.map((id, index) => {
                        const card = cards.find(c => c.id === id);
                        if (!card) return null;
                        
                        const count = (counts[id] || 0) + 1;
                        counts[id] = count;
                        
                        let penalty = 0;
                        let penaltyText = "";
                        if (count === 2) { penalty = 0.9; penaltyText = "+0.9"; }
                        if (count >= 3) { penalty = 2.8; penaltyText = "+2.8"; }
                        
                        const finalSpeed = card.speed !== null ? Math.round(card.speed + penalty) : '-';
                        const displaySpeed = card.speed !== null ? card.speed : '-';

                        const modifierId = currentDeck.modifierSlots?.[index];
                        const modifier = modifierId ? modifiers.find(m => m.id === modifierId) : null;

                        return (
                            <div key={`${id}-${index}`} className="relative bg-slate-800 border border-slate-700 p-2 rounded flex flex-col gap-2 group hover:border-red-500 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col flex-1" onClick={() => removeFromDeck(index)}>
                                        <span className="font-bold text-sm text-slate-200">{card.name}</span>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                            <span>速度: {displaySpeed}</span>
                                            {penalty > 0 && (
                                                <span className="text-red-400 font-bold bg-red-900/30 px-1 rounded">
                                                    {penaltyText} ({finalSpeed})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {/* Modifier Slot */}
                                        <div className="relative">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModifierTargetIndex(modifierTargetIndex === index ? null : index);
                                                }}
                                                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${modifier ? 'bg-purple-900 border-purple-500' : 'bg-slate-900 border-slate-700 hover:border-emerald-500'}`}
                                                title={modifier ? `${modifier.name}: ${modifier.description}` : "添加修饰珠"}
                                            >
                                                {modifier ? <Gem size={12} className="text-purple-400" /> : <Plus size={10} className="text-slate-600" />}
                                            </button>
                                            
                                            {/* Modifier Dropdown */}
                                            {modifierTargetIndex === index && (
                                                <div className="absolute right-0 top-8 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
                                                    <div className="text-xs font-bold text-slate-400 mb-2 px-1">选择修饰珠</div>
                                                    <button 
                                                        className="w-full text-left px-2 py-1 text-xs text-red-400 hover:bg-slate-700 rounded mb-1"
                                                        onClick={() => attachModifier(index, null)}
                                                    >
                                                        无 (移除)
                                                    </button>
                                                    {modifiers.map(mod => {
                                                        const owned = ownedModifiers[mod.id] || 0;
                                                        // Count used in current deck (excluding self if already equipped)
                                                        const usedInDeck = Object.entries(currentDeck.modifierSlots || {})
                                                            .filter(([k, v]) => parseInt(k) !== index && v === mod.id)
                                                            .length;
                                                        const available = owned - usedInDeck;
                                                        
                                                        return (
                                                            <button 
                                                                key={mod.id}
                                                                disabled={available <= 0}
                                                                className={`w-full text-left px-2 py-1 text-xs rounded mb-1 flex justify-between items-center ${available > 0 ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
                                                                onClick={() => available > 0 && attachModifier(index, mod.id)}
                                                            >
                                                                <span className="truncate flex-1">{mod.name}</span>
                                                                <span className={available > 0 ? 'text-emerald-400' : 'text-slate-600'}>{available}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <button onClick={() => removeFromDeck(index)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Minus size={14} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Modifier Effect Display */}
                                {modifier && (
                                    <div className="text-[10px] text-purple-300 bg-purple-900/20 px-2 py-1 rounded border border-purple-500/30 flex items-center gap-1">
                                        <Gem size={10} />
                                        <span>{modifier.description}</span>
                                    </div>
                                )}
                            </div>
                        );
                    });
                })()
            )}
        </div>
      </div>
    </div>
  );
};

export default CollectionView;
