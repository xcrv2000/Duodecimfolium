import React, { useEffect, useRef, useState } from 'react';
import { useBattleStore } from '../../stores/battleStore';
import { usePlayerStore } from '../../stores/playerStore';
import { Play, Pause, FastForward, SkipForward, Repeat, Eye } from 'lucide-react';
import { CardInstance } from '../../core/domain/Card';
import { BattleUnit, UnitBuff } from '../../core/domain/Battle';
import { getCardRarityBorderClass } from '../../utils/cardUtils';

const BattleView: React.FC = () => {
  const { state, tick, isPaused, togglePause, speedMultiplier, setSpeed, exitBattle, isLooping, toggleLoop, currentDungeonId, isBossStage } = useBattleStore();
  const clearedDungeons = usePlayerStore(state => state.clearedDungeons);
  const timerRef = useRef<number | null>(null);

  const isCleared = currentDungeonId && clearedDungeons.includes(currentDungeonId);
  
  // Local state for result overlay visibility
  const [isResultOverlayVisible, setIsResultOverlayVisible] = useState(false);
  
  // Track if battle just ended to show overlay once
  useEffect(() => {
      if (state?.isOver) {
          // Only show if not auto-looping (or if boss stage)
          if (!isLooping || isBossStage || state.winner === 'enemy') {
             setIsResultOverlayVisible(true);
          }
      } else {
          setIsResultOverlayVisible(false);
      }
  }, [state?.isOver, isLooping, isBossStage, state?.winner]);

  const [hoveredCard, setHoveredCard] = React.useState<{ card: CardInstance, unit: BattleUnit, rect: DOMRect } | null>(null);
  const [hoveredBuff, setHoveredBuff] = React.useState<{ buff: UnitBuff, rect: DOMRect } | null>(null);

  useEffect(() => {
    if (state && !state.isOver && !isPaused) {
      const interval = 1000 / speedMultiplier;
      timerRef.current = window.setInterval(() => {
        tick();
      }, interval);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state?.isOver, isPaused, speedMultiplier, tick]);

  if (!state) return <div>Loading Battle...</div>;

  const playerUnits = state.units.filter(u => u.team === 'player');
  const enemyUnits = state.units.filter(u => u.team === 'enemy');

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white p-4 gap-4 relative">
      {/* Top Bar: Controls & Timeline */}
      <div className="flex items-center justify-between bg-slate-800 p-2 rounded">
        <div className="flex gap-2">
          <button onClick={togglePause} className="p-2 hover:bg-slate-700 rounded" disabled={state.isOver}>
            {isPaused || state.isOver ? <Play size={20} /> : <Pause size={20} />}
          </button>
          <button onClick={() => setSpeed(1)} className={`p-2 rounded ${speedMultiplier === 1 ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>1x</button>
          
          {isCleared && (
            <>
              <button onClick={() => setSpeed(2)} className={`p-2 rounded ${speedMultiplier === 2 ? 'bg-blue-600' : 'hover:bg-slate-700'}`}><FastForward size={20} /></button>
              <button onClick={() => setSpeed(12)} className={`p-2 rounded ${speedMultiplier === 12 ? 'bg-blue-600' : 'hover:bg-slate-700'}`}><SkipForward size={20} /></button>
              <button onClick={toggleLoop} className={`p-2 rounded ${isLooping ? 'bg-green-600' : 'hover:bg-slate-700'}`} title="Auto-Loop Dungeon">
                <Repeat size={20} />
              </button>
            </>
          )}
        </div>
        <div className="text-xl font-bold">Turn: {state.turn} | Tick: {state.tick}/12</div>
        <button onClick={exitBattle} className="bg-red-600 px-4 py-2 rounded hover:bg-red-700">Exit</button>
      </div>

      {/* Timeline Visualizer (Simple) */}
      <div className="h-16 bg-slate-800 rounded relative overflow-hidden">
        {/* Tick Markers */}
        {Array.from({ length: 13 }).map((_, i) => (
           <div key={i} className="absolute h-full w-px bg-slate-600" style={{ left: `${(i / 12) * 100}%` }}>
             <span className="text-xs text-slate-400 ml-1">{i}</span>
           </div>
        ))}
        {/* Progress Bar */}
        <div className="absolute h-full w-1 bg-yellow-500 opacity-50 transition-all duration-100" style={{ left: `${(state.tick / 12) * 100}%` }} />
      </div>

      {/* Battle Area */}
      <div className="flex-1 flex justify-between items-center gap-4 overflow-hidden">
        {/* Player Side */}
        <div className="flex flex-col gap-2 overflow-y-auto h-full p-2 no-scrollbar">
            {playerUnits.map(unit => (
                <UnitFrame key={unit.id} unit={unit} onCardHover={setHoveredCard} onBuffHover={setHoveredBuff} />
            ))}
        </div>
        
        {/* Battle Log (Center) */}
        <div className="flex-1 h-full max-h-[80vh] bg-slate-950 rounded p-2 overflow-y-auto font-mono text-sm opacity-80 min-w-[200px]">
          {state.log.slice().reverse().map((entry, i) => ( // Show newest first
            <div key={i} className={`mb-1 ${entry.type === 'attack' ? 'text-red-400' : entry.type === 'death' ? 'text-purple-500 font-bold' : 'text-slate-300'}`}>
              [{entry.tick}] {entry.message}
            </div>
          ))}
        </div>

        {/* Enemy Side */}
        <div className="flex flex-col gap-2 overflow-y-auto h-full p-2 no-scrollbar">
            {enemyUnits.map(unit => (
                <UnitFrame key={unit.id} unit={unit} isEnemy onCardHover={setHoveredCard} onBuffHover={setHoveredBuff} />
            ))}
        </div>
      </div>

      {/* Card Hover Overlay */}
      {hoveredCard && (
        <CardHoverOverlay 
            card={hoveredCard.card} 
            unit={hoveredCard.unit} 
            rect={hoveredCard.rect} 
        />
      )}

      {/* Buff Hover Overlay */}
      {hoveredBuff && (
        <BuffHoverOverlay 
            buff={hoveredBuff.buff} 
            rect={hoveredBuff.rect} 
        />
      )}

      {/* Result Overlay */}
      {isResultOverlayVisible && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded shadow-xl text-center border border-slate-700 max-w-md w-full relative">
            
            <h2 className={`text-4xl font-bold mb-4 ${state.winner === 'player' ? 'text-emerald-400' : 'text-red-500'}`}>
                {state.winner === 'player' ? 'Victory!' : 'Defeat!'}
            </h2>
            
            {state.winner === 'player' ? (
              <div className="flex flex-col gap-4">
                  <div className="text-xl text-green-400 animate-pulse">
                      {isLooping ? "Looping..." : "Advancing..."}
                  </div>
                  {!isLooping && (
                       <button onClick={exitBattle} className="bg-slate-600 px-6 py-3 rounded text-xl hover:bg-slate-700 w-full">
                           Return to Town
                       </button>
                  )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                  <p className="text-slate-400 mb-4">You have been defeated.</p>
                  
                  <button 
                    onClick={() => setIsResultOverlayVisible(false)} 
                    className="bg-slate-700 px-6 py-3 rounded text-xl hover:bg-slate-600 w-full flex items-center justify-center gap-2"
                  >
                      <Eye size={20} /> View Log
                  </button>
                  
                  <button onClick={exitBattle} className="bg-red-900/50 px-6 py-3 rounded text-xl hover:bg-red-800 border border-red-800 w-full">
                      Return to Town
                  </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const UnitFrame: React.FC<{ 
    unit?: BattleUnit, 
    isEnemy?: boolean, 
    onCardHover?: (data: { card: CardInstance, unit: BattleUnit, rect: DOMRect } | null) => void,
    onBuffHover?: (data: { buff: UnitBuff, rect: DOMRect } | null) => void
}> = ({ unit, onCardHover, onBuffHover }) => {
  if (!unit) return <div className="w-64 h-96 bg-slate-800/50 rounded flex items-center justify-center">Empty</div>;

  return (
    <div className={`w-80 bg-slate-800 rounded-lg p-4 border-2 ${unit.isDead ? 'border-red-900 opacity-50' : 'border-slate-600'}`}>
      <h3 className="text-2xl font-bold mb-2">{unit.name}</h3>
      <div className="flex justify-between mb-2">
        <span className="text-green-400">HP: {unit.hp}/{unit.maxHp}</span>
        <span className="text-blue-400">Armor: {unit.armor}</span>
      </div>
      {/* Health Bar */}
      <div className="w-full h-4 bg-slate-700 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-green-600 transition-all duration-300" style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }} />
      </div>

      {/* Buffs */}
      <div className="flex gap-1 flex-wrap mb-4 min-h-[2rem]">
        {unit.buffs.map((buff, i) => (
          <div 
            key={i} 
            className="bg-slate-700 px-2 py-1 rounded text-xs cursor-help hover:bg-slate-600 transition-colors"
            onMouseEnter={(e) => onBuffHover?.({ buff, rect: e.currentTarget.getBoundingClientRect() })}
            onMouseLeave={() => onBuffHover?.(null)}
          >
            {buff.name} {buff.level > 1 ? `Lv.${buff.level}` : ''} {buff.duration < 10 ? `(${buff.duration})` : ''}
          </div>
        ))}
      </div>

      {/* Cards (Deck Cycle) */}
      <div className="space-y-2">
        <div className="text-sm text-slate-400">Deck Cycle:</div>
        <div className="flex flex-wrap gap-1">
            {unit.cards.map((card, i) => (
                <CardMini 
                    key={i} 
                    card={card} 
                    onMouseEnter={(rect) => onCardHover?.({ card, unit, rect })}
                    onMouseLeave={() => onCardHover?.(null)}
                />
            ))}
        </div>
      </div>
    </div>
  );
};

const CardMini: React.FC<{ card: CardInstance, onMouseEnter?: (rect: DOMRect) => void, onMouseLeave?: () => void }> = ({ card, onMouseEnter, onMouseLeave }) => {
    // Determine color based on rarity or type
    const borderClass = getCardRarityBorderClass(card);
    const ref = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        if (ref.current && onMouseEnter) {
            onMouseEnter(ref.current.getBoundingClientRect());
        }
    };
    
    // 判断卡是否失效（速度超出范围）
    const isCardInvalid = card.currentSpeed10 === null || card.currentSpeed10 >= 130;
    const speedDisplay = card.currentSpeed10 !== null && card.currentSpeed10 < 130 
        ? (card.currentSpeed10 / 10).toFixed(1) 
        : (card.currentSpeed10 === null ? '✗' : '∞');
    
    // 判断卡是否有实例 buff
    const hasBuffs = card.buffs && card.buffs.length > 0;
    
    return (
        <div 
            ref={ref}
            className={`w-12 h-16 bg-slate-700 border-2 rounded flex flex-col items-center justify-center text-xs relative ${borderClass} cursor-help hover:scale-110 transition-transform ${isCardInvalid ? 'opacity-50' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={onMouseLeave}
            title={isCardInvalid ? `卡已失效 (${card.currentSpeed10 === null ? '无效速度' : '>= 13.0'})` : ''}
        >
            <span className="font-bold">{card.factory.name[0]}</span>
            {/* 显示卡实例 buff 标志 */}
            {hasBuffs && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></span>
            )}
            <span className={`absolute bottom-0 right-1 text-[10px] ${isCardInvalid ? 'text-red-400 font-bold' : 'text-yellow-400'}`}>
                {speedDisplay}
            </span>
        </div>
    )
}

const CardHoverOverlay: React.FC<{ card: CardInstance, unit: BattleUnit, rect: DOMRect }> = ({ card, unit }) => {
    const isPlayer = unit.team === 'player';
    
    // Positioning
    // If Player (Left): Card Entity at Left (near edge), Modifiers at Right (near center)
    // If Enemy (Right): Card Entity at Right (near edge), Modifiers at Left (near center)
    
    // Card Entity Position
    // We want it to be "Near Screen Edge".
    // Let's fix it relative to the UnitFrame or Screen?
    // User says "Near (closer to screen edge) is card entity".
    // Let's use fixed positioning.
    
    const cardEntityStyle: React.CSSProperties = isPlayer 
        ? { left: '20px', bottom: '20px' } 
        : { right: '20px', bottom: '20px' };
        
    const modifiersStyle: React.CSSProperties = isPlayer
        ? { left: '340px', bottom: '100px' } // Right of Player Frame
        : { right: '340px', bottom: '100px' }; // Left of Enemy Frame
        
    const borderClass = getCardRarityBorderClass(card);

    return (
        <div className="fixed inset-0 pointer-events-none z-50">
            {/* Card Entity (Large Preview) */}
            <div 
                className={`absolute w-64 h-96 bg-slate-800 border-4 rounded-xl p-6 shadow-2xl flex flex-col gap-4 ${borderClass}`}
                style={cardEntityStyle}
            >
                <div className="text-2xl font-bold text-center border-b border-slate-600 pb-2">{card.factory.name}</div>
                
                <div className="flex justify-between text-lg">
                    <span className="text-yellow-400">Speed: {card.currentSpeed10 !== null ? (card.currentSpeed10 / 10).toFixed(1) : '-'}</span>
                    <span className="text-slate-400">Base: {card.baseSpeed10 !== null ? (card.baseSpeed10 / 10).toFixed(1) : '-'}</span>
                </div>
                
                <div className="flex-1 bg-slate-900/50 p-4 rounded text-slate-200 leading-relaxed">
                    {/* If token, might not have description? Check if 'Token' */}
                    {/* User says: "上挑斩·剑气没有写出自己的描述。" -> effectDescription */}
                    {/* In BattleLoop.spawnCard, we set name, description, effectDescription to 'Token' for tokens. */}
                    {/* We need to update BattleLoop to provide real description for tokens. */}
                    {/* But here, we just display what is in card.effectDescription. */}
                    {card.factory.effectDescription || "No effect description."}
                </div>
                
                <div className="text-sm text-slate-500 italic text-center">
                    {card.factory.description}
                </div>
                
                {/* Tags */}
                <div className="flex gap-2 justify-center">
                    {card.tagsRuntime?.map(tag => (
                        <span key={tag} className="bg-slate-700 px-2 py-1 rounded text-xs">{tag}</span>
                    ))}
                </div>
            </div>

            {/* Modifiers (Bubbles) */}
            {card.modifiers.length > 0 && (
                <div 
                    className="absolute flex flex-col gap-2 items-start"
                    style={modifiersStyle}
                >
                    {card.modifiers.map((mod, i) => (
                        <div key={i} className="bg-indigo-900/90 border border-indigo-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="w-2 h-2 rounded-full bg-indigo-400" />
                            <span className="font-bold">{mod.name}</span>
                            <span className="text-xs text-indigo-300">{mod.description}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const BuffHoverOverlay: React.FC<{ buff: UnitBuff, rect: DOMRect }> = ({ buff, rect }) => {
    const style: React.CSSProperties = {
        left: rect.left,
        top: rect.bottom + 8, // Below
        position: 'fixed',
        zIndex: 50
    };

    return (
        <div className="bg-slate-800 border border-slate-500 p-3 rounded shadow-xl text-xs w-48 pointer-events-none" style={style}>
            <div className="font-bold text-emerald-400 mb-1">{buff.name}</div>
            <div className="text-slate-200 leading-relaxed">{buff.description}</div>
            <div className="text-slate-500 mt-2 text-[10px]">
                {buff.duration < 999 ? `Expires in ${buff.duration} turn(s)` : 'Permanent'}
            </div>
        </div>
    );
};

export default BattleView;
