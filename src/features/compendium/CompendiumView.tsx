import React, { useState, useMemo } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import cardsData from '../../data/cards.json';
import packsData from '../../data/packs.json';
import modifiersData from '../../data/modifiers.json';
import { Book, Search, Hammer, Gem } from 'lucide-react';
import { Card } from '../../core/domain/Card';
import CardDisplay from '../common/CardDisplay';

const cards = cardsData as Card[];
const packs = packsData as any[];
const modifiers = modifiersData as any[];

const CompendiumView: React.FC = () => {
  const { collection, dust, unlockedPacks, craftCard, modifiers: ownedModifiers } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<'cards' | 'modifiers'>('cards');
  const [selectedPack, setSelectedPack] = useState<string>('all');
  const [selectedCost, setSelectedCost] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    cards.forEach(card => {
        if (card.tags) {
            card.tags.forEach(t => tags.add(t));
        }
    });
    return Array.from(tags).sort();
  }, []);

  // Pre-calculate pack total rarity for crafting cost
  const packWeights = useMemo(() => {
     const weights: Record<string, number> = {};
     cards.forEach(c => {
       if (!weights[c.packId]) weights[c.packId] = 0;
       weights[c.packId] += c.rarity;
     });
     return weights;
  }, []);

  const getCraftingCost = (card: Card) => {
    const total = packWeights[card.packId] || 0;
    if (total === 0) return 999;
    return Math.ceil(total / card.rarity);
  };

  // Filtering Logic
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // Unlocked Pack Check (Requirement: Only show cards from unlocked packs)
      if (!unlockedPacks.includes(card.packId)) return false;

      // Pack Filter
      if (selectedPack !== 'all' && card.packId !== selectedPack) return false;
      
      // Cost (Speed) Filter
      if (selectedCost !== 'all') {
        const cost = parseInt(selectedCost);
        if (card.speed !== cost) return false;
      }

      // Tag Filter
      if (selectedTag !== 'all') {
        if (!card.tags || !card.tags.includes(selectedTag)) return false;
      }

      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          card.name.toLowerCase().includes(query) ||
          card.description.toLowerCase().includes(query) ||
          card.effectDescription.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [selectedPack, selectedCost, selectedTag, searchQuery, unlockedPacks]);

  // Statistics
  const totalCards = cards.filter(c => unlockedPacks.includes(c.packId)).length;
  const ownedCardsCount = Object.keys(collection).length; 
  const progress = totalCards > 0 ? Math.round((ownedCardsCount / totalCards) * 100) : 0;

  const getModifierStyle = (modId: string) => {
    switch (modId) {
        case 'breeze_orb':
            return {
                bg: 'bg-cyan-900/30',
                border: 'border-cyan-500',
                text: 'text-cyan-400',
                shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]'
            };
        case 'iron_orb':
            return {
                bg: 'bg-slate-700/50',
                border: 'border-slate-400',
                text: 'text-slate-300',
                shadow: 'shadow-[0_0_15px_rgba(148,163,184,0.3)]'
            };
        case 'fire_spirit_orb':
            return {
                bg: 'bg-red-900/30',
                border: 'border-red-500',
                text: 'text-red-400',
                shadow: 'shadow-[0_0_15px_rgba(248,113,113,0.3)]'
            };
        default:
            return {
                bg: 'bg-purple-900/30',
                border: 'border-purple-500',
                text: 'text-purple-400',
                shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]'
            };
    }
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end mb-6 sm:mb-8">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-emerald-400 flex items-center gap-2">
            <Book /> 图鉴 (Compendium)
            </h1>
            <div className="text-slate-400 text-xs sm:text-sm mt-2 flex flex-wrap gap-2 sm:gap-4">
                <span>收集进度: {ownedCardsCount} / {totalCards} ({progress}%)</span>
                <span className="text-purple-400 font-bold flex items-center gap-1">
                    <Hammer size={14} /> 粉尘: {dust}
                </span>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex gap-2 mt-4">
                <button 
                    onClick={() => setActiveTab('cards')}
                    className={`px-4 py-1 rounded-full text-sm font-bold transition-colors ${activeTab === 'cards' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    卡牌
                </button>
                <button 
                    onClick={() => setActiveTab('modifiers')}
                    className={`px-4 py-1 rounded-full text-sm font-bold transition-colors flex items-center gap-1 ${activeTab === 'modifiers' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    <Gem size={14} /> 修饰珠
                </button>
            </div>
        </div>
        
        {/* Filters - Only for cards tab */}
        {activeTab === 'cards' && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-end">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Search cards..." 
                    className="bg-slate-800 border border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none w-full sm:w-48"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Pack Filter */}
            <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-bold">卡包</label>
                <select 
                    className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-emerald-500"
                    value={selectedPack}
                    onChange={(e) => setSelectedPack(e.target.value)}
                >
                    <option value="all">全部已解锁</option>
                    {packs.filter(p => unlockedPacks.includes(p.id)).map(pack => (
                        <option key={pack.id} value={pack.id}>{pack.name}</option>
                    ))}
                </select>
            </div>

            {/* Cost Filter */}
            <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-bold">速度</label>
                <select 
                    className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-emerald-500"
                    value={selectedCost}
                    onChange={(e) => setSelectedCost(e.target.value)}
                >
                    <option value="all">全部</option>
                    {Array.from({length: 12}, (_, i) => i + 1).map(cost => (
                        <option key={cost} value={cost}>{cost}</option>
                    ))}
                </select>
            </div>

            {/* Tag Filter */}
            <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-bold">标签</label>
                <select 
                    className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-emerald-500"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                >
                    <option value="all">全部</option>
                    {allTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                    ))}
                </select>
            </div>
        </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-0 sm:pr-2">
        {activeTab === 'cards' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 pb-8">
                {filteredCards.map(card => {
                    const count = collection[card.id] || 0;
                    const cost = getCraftingCost(card);
                    const canCraft = dust >= cost && count < 3;
                    
                    return (
                        <div key={card.id} className="flex flex-col gap-2 group relative">
                            <CardDisplay
                                card={card}
                                count={count}
                                disabled={count === 0}
                            />
                            
                            {/* Crafting Button Overlay or Below */}
                            {count < 3 && (
                                <button 
                                    onClick={() => craftCard(card.id, cost)}
                                    disabled={!canCraft}
                                    className={`
                                        w-full py-1 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors
                                        ${canCraft 
                                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg' 
                                            : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}
                                    `}
                                    title={canCraft ? `Craft for ${cost} Dust` : `Need ${cost} Dust`}
                                >
                                    <Hammer size={12} />
                                    合成 ({cost})
                                </button>
                            )}
                            {count >= 3 && (
                                <div className="text-center text-xs text-emerald-500 font-bold py-1 bg-slate-900/50 rounded border border-emerald-900/30">
                                    Max Limit
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {filteredCards.length === 0 && (
                    <div className="col-span-full text-center text-slate-500 py-20">
                        No cards found matching filters.
                    </div>
                )}
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pb-8">
                {modifiers.map(mod => {
                    const count = ownedModifiers[mod.id] || 0;
                    const style = getModifierStyle(mod.id);
                    return (
                        <div key={mod.id} className={`bg-slate-800 border-2 ${style.border} rounded-lg p-6 flex flex-col items-center justify-center relative transition-colors group`}>
                            {/* Texture Placeholder */}
                            <div className={`w-16 h-16 rounded-full ${style.bg} border ${style.border} flex items-center justify-center mb-4 ${style.shadow} overflow-hidden`}>
                                {/* Placeholder for custom texture */}
                                {/* <img src={`/textures/modifiers/${mod.id}.png`} alt={mod.name} className="w-full h-full object-cover opacity-80" /> */}
                                <Gem size={32} className={style.text} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-200 mb-2">{mod.name}</h3>
                            <p className="text-sm text-slate-400 text-center mb-4">{mod.description}</p>
                            
                            <div className="bg-slate-900 px-3 py-1 rounded text-xs font-bold text-slate-300 border border-slate-700">
                                持有: {count}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default CompendiumView;
