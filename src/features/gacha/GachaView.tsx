import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import packsData from '../../data/packs.json';
import cardsData from '../../data/cards.json';
import { ShoppingBag, Sparkles, Box } from 'lucide-react';
import { Card } from '../../core/domain/Card';
import CardDisplay from '../common/CardDisplay';

import dungeonsData from '../../data/dungeons.json';
import { Dungeon } from '../../core/domain/Dungeon';

const packs = packsData as any[];
const cards = cardsData as Card[];
const dungeons = dungeonsData as Dungeon[];

const GachaView: React.FC<{ onNavigate: (tab: any) => void }> = () => {
  const { gold, unlockedPacks, addGold, addCards } = usePlayerStore();
  const clearedDungeons = usePlayerStore(state => state.clearedDungeons);
  const [openingPack, setOpeningPack] = useState<any[] | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [isAutoRevealing, setIsAutoRevealing] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const buyPack = (packId: string, price: number, count: number) => {
    // Determine cost
    // 5 cards = 10G
    // 50 cards = 100G
    
    const multiplier = count / 5;
    const finalCost = price * multiplier;
    
    if (gold < finalCost) return;
    
    // Deduct Gold
    addGold(-finalCost);

    // Open Pack Logic
    // 1. Filter cards in this pack
    const packCards = cards.filter(c => c.packId === packId);
    
    // 2. Create weighted pool based on rarity
    const pool: Card[] = [];
    packCards.forEach(card => {
        for (let i = 0; i < card.rarity; i++) {
            pool.push(card);
        }
    });

    // 3. Draw cards
    const drawnCards: Card[] = [];
    const drawnIds: string[] = [];
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        const card = pool[randomIndex];
        drawnCards.push(card);
        drawnIds.push(card.id);
    }
    
    // Add to collection in batch
    addCards(drawnIds);

    setOpeningPack(drawnCards);
    setRevealedIndices([]); // Reset revealed
    setPage(0); // Reset page
    
    // Start auto reveal for current page
    setIsAutoRevealing(true);
  };

  // Auto Reveal Effect
  useEffect(() => {
    if (isAutoRevealing && openingPack) {
      const startIdx = page * PAGE_SIZE;
      const endIdx = Math.min((page + 1) * PAGE_SIZE, openingPack.length);
      
      // Check if all cards in current page are revealed
      const allRevealed = Array.from({length: endIdx - startIdx}, (_, i) => startIdx + i)
        .every(idx => revealedIndices.includes(idx));
      
      if (!allRevealed) {
        const timeout = setTimeout(() => {
          // Find next unrevealed index
          for (let i = startIdx; i < endIdx; i++) {
              if (!revealedIndices.includes(i)) {
                  setRevealedIndices(prev => [...prev, i]);
                  break;
              }
          }
        }, 300); // Consistent delay
        return () => clearTimeout(timeout);
      } else {
        setIsAutoRevealing(false);
      }
    }
  }, [isAutoRevealing, revealedIndices, openingPack, page]);

  const handleManualFlip = (index: number) => {
    if (!revealedIndices.includes(index)) {
      setRevealedIndices(prev => [...prev, index]);
    }
  };

  const nextPage = () => {
      if (openingPack && (page + 1) * PAGE_SIZE < openingPack.length) {
          setPage(p => p + 1);
          setIsAutoRevealing(true);
      }
  };

  // Current page cards
  const currentCards = openingPack ? openingPack.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];
  const startIdx = page * PAGE_SIZE;

  // Click outside handler
  const handleOverlayClick = (e: React.MouseEvent) => {
      // If clicking on buttons or cards, ignore
      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.cursor-help')) return;

      if (!openingPack) return;

      const startIdx = page * PAGE_SIZE;
      const endIdx = Math.min((page + 1) * PAGE_SIZE, openingPack.length);
      
      // Check if all current page revealed
      const allRevealed = Array.from({length: endIdx - startIdx}, (_, i) => startIdx + i)
        .every(idx => revealedIndices.includes(idx));
      
      if (!allRevealed) {
          // Force stop auto reveal and reveal all instantly
          setIsAutoRevealing(false);
          const newIndices = [...revealedIndices];
          for (let i = startIdx; i < endIdx; i++) {
              if (!newIndices.includes(i)) newIndices.push(i);
          }
          setRevealedIndices(newIndices);
      } else {
          // If all revealed, go to next page
          if ((page + 1) * PAGE_SIZE < openingPack.length) {
              nextPage();
          }
      }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-emerald-400 flex items-center gap-2">
        <ShoppingBag /> 商店
      </h1>

      {openingPack ? (
          <div 
            className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-4 overflow-y-auto cursor-pointer"
            onClick={handleOverlayClick}
          >
              <h2 className="text-4xl font-bold mb-12 text-white animate-pulse pointer-events-none">
                {isAutoRevealing ? 'Revealing...' : `Draw Results (${page + 1}/${Math.ceil(openingPack.length / PAGE_SIZE)})`}
              </h2>
              
              <div className="relative flex justify-center w-full max-w-[95vw] pointer-events-auto cursor-default min-h-[500px] items-center">
                  <div className={`
                    grid grid-cols-5 gap-4
                  `}>
                      {currentCards.map((card, i) => {
                          const absoluteIndex = startIdx + i;
                          return (
                            <div key={absoluteIndex} className="w-40 transition-all duration-500">
                                <CardDisplay 
                                    card={card} 
                                    isFaceDown={!revealedIndices.includes(absoluteIndex)}
                                    disableHoverFlip={true} // Always disable hover flip for gacha to control reveal flow
                                    enableRevealAnimation={true}
                                    onFlip={() => handleManualFlip(absoluteIndex)}
                                    compact={true} // Enable compact mode to prevent overflow
                                    className="h-56" // Fixed height
                                />
                            </div>
                          );
                      })}
                  </div>

                  {/* Next Page Arrow - Always show if next page exists (even if auto revealing, though technically auto revealing handles flow, but arrow allows manual skip) */}
                  {(page + 1) * PAGE_SIZE < openingPack.length && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%-2rem)] pointer-events-auto">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                nextPage();
                            }}
                            className="bg-emerald-600 p-4 rounded-full hover:bg-emerald-500 transition-all hover:scale-110 animate-bounce"
                            title="Next Group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                      </div>
                  )}
              </div>
              
              {/* Finish Button */}
              {(!isAutoRevealing && (page + 1) * PAGE_SIZE >= openingPack.length) && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <button 
                        onClick={() => setOpeningPack(null)}
                        className="bg-emerald-600 px-8 py-3 rounded-full text-xl font-bold hover:bg-emerald-500 transition-all hover:scale-105 shadow-lg shadow-emerald-900/50"
                    >
                        Confirm
                    </button>
                </div>
              )}
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packs.map(pack => {
            // Check explicit unlock status
            let isUnlocked = unlockedPacks.includes(pack.id);
            let unlockCondition = "";
            
            // Also check dungeon requirements
            // Find dungeon that unlocks this pack
            const unlockingDungeon = dungeons.find(d => d.unlocksPackId === pack.id);
            if (unlockingDungeon) {
                if (clearedDungeons.includes(unlockingDungeon.id)) {
                    isUnlocked = true;
                } else {
                    unlockCondition = `需通关: ${unlockingDungeon.name}`;
                }
            } else {
                // If no dungeon unlocks it, maybe it's default unlocked?
                // Pack 'basic_swordsmanship' is in initial unlockedPacks.
                // If neither, show as Locked (Unknown condition).
                if (!isUnlocked) unlockCondition = "未知解锁条件";
            }
            
            const canAfford5 = gold >= pack.price;
            const canAfford50 = gold >= pack.price * 10;
            
            return (
                <div 
                key={pack.id}
                className={`relative p-6 rounded-lg border-2 transition-all group ${
                    isUnlocked 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-slate-900 border-slate-800 opacity-60' 
                }`}
                >
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-white">{pack.name}</h2>
                    <div className="bg-slate-900 px-3 py-1 rounded text-yellow-400 font-bold">
                        {pack.price} G / 5张
                    </div>
                </div>
                
                <p className="text-slate-400 text-sm mb-6 h-10">{pack.description}</p>
                
                {isUnlocked ? (
                    <div className="flex gap-2">
                    <button 
                        onClick={() => buyPack(pack.id, pack.price, 5)}
                        disabled={!canAfford5}
                        className={`flex-1 py-2 rounded font-bold transition-colors flex items-center justify-center gap-2 ${
                            canAfford5 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        <Sparkles size={16} />
                        抽卡 (5)
                    </button>

                    <button 
                        onClick={() => buyPack(pack.id, pack.price, 50)}
                        disabled={!canAfford50}
                        className={`flex-1 py-2 rounded font-bold transition-colors flex items-center justify-center gap-2 ${
                            canAfford50 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        <Box size={16} />
                        十连抽 (50)
                    </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-10 text-red-400 font-bold border border-red-900/50 bg-red-900/20 rounded">
                        <span className="flex items-center gap-2">
                            🔒 {unlockCondition}
                        </span>
                    </div>
                )}
                </div>
            );
            })}
        </div>
      )}
    </div>
  );
};

export default GachaView;
