import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardInstance } from '../../core/domain/Card';
import { getCardRarityBorderClass } from '../../utils/cardUtils';

interface CardDisplayProps {
  card: Card | CardInstance;
  count?: number; // Owned count (for collection)
  inDeck?: number; // Count in deck (for collection)
  onClick?: () => void;
  disabled?: boolean; // Visual state
  className?: string; // Extra styles
  isFaceDown?: boolean; // New prop for Gacha
  disableHoverFlip?: boolean; // Disable hover flip (for auto-reveal scenarios)
  enableRevealAnimation?: boolean; // Only animate jump on reveal if true
  onFlip?: () => void; // Callback when flipped
  compact?: boolean; // New prop for compact mode (flavor text only, hover for details)
}

const CardDisplay: React.FC<CardDisplayProps> = ({ 
  card, 
  count, 
  inDeck, 
  onClick, 
  disabled = false,
  className = '',
  isFaceDown = false,
  disableHoverFlip = false,
  enableRevealAnimation = false,
  onFlip,
  compact = false
}) => {
  const [internalFaceDown, setInternalFaceDown] = useState(isFaceDown);
  const [animateJump, setAnimateJump] = useState(false);
  const [showFullDetail, setShowFullDetail] = useState(false); // For compact hover
  
  // Tooltip state
  const [activeTooltip, setActiveTooltip] = useState<{keyword: string, text: string, x: number, y: number} | null>(null);

  useEffect(() => {
    setInternalFaceDown(isFaceDown);
    
    // If it flips from faceDown to faceUp (programmatically), trigger jump animation
    if (!isFaceDown && enableRevealAnimation) {
        // Check rarity for jump animation
        const borderClass = getCardRarityBorderClass(card);
        if (borderClass.includes('border-yellow-400') || borderClass.includes('border-purple-500')) {
            setAnimateJump(true);
            setTimeout(() => setAnimateJump(false), 500); 
        }
    }
  }, [isFaceDown, card, enableRevealAnimation]); // Depend on card to re-calc rarity if needed

  const isInstance = (c: any): c is CardInstance => c && typeof c === 'object' && 'instanceId' in c;

  // utility getters that work for both CardFactory and CardInstance
  const getName = (c: Card | CardInstance) => isInstance(c) ? c.factory.name : c.name;
  const getDescription = (c: Card | CardInstance) => isInstance(c) ? c.factory.description : c.description;
  const getEffectDescription = (c: Card | CardInstance) => isInstance(c) ? c.factory.effectDescription : c.effectDescription;
  const getTags = (c: Card | CardInstance) => isInstance(c) ? (c.tagsRuntime || c.factory.tags) : c.tags;

  // Determine Speed
  const baseSpeed = isInstance(card) ? (card.baseSpeed10 !== null ? card.baseSpeed10 / 10 : null) : card.speed;
  const currentSpeed = isInstance(card) ? (card.currentSpeed10 !== null ? card.currentSpeed10 / 10 : null) : card.speed;

  // Round for display
  // Use toFixed(1) for float speeds
  const displaySpeed = currentSpeed !== null && currentSpeed !== undefined ? Number(currentSpeed).toFixed(1).replace(/\.0$/, '') : '-';
  
  // Tooltip content
  let speedTooltip = `Speed: ${currentSpeed}`;
  
  if (isInstance(card) && currentSpeed !== null && baseSpeed !== null) {
    if (currentSpeed !== baseSpeed) {
      const diff = currentSpeed - baseSpeed;
      speedTooltip = `Current Speed: ${currentSpeed}\nBase Speed: ${baseSpeed}\nModifier: ${diff > 0 ? '+' + diff : diff} (Battle Effects)`;
    } else {
      speedTooltip = `Speed: ${currentSpeed} (Base)`;
    }
  } else {
    speedTooltip = `Base Speed: ${baseSpeed}`;
  }

  // Helper to format text with highlights
  const formatText = (text: string) => {
    // Replace keywords in 【】 with highlighted span
    const parts = text.split(/(【[^】]+】)/g);
    return parts.map((part, i) => {
        if (part.startsWith('【') && part.endsWith('】')) {
            const keyword = part.slice(1, -1);
            // Tooltip mapping (hardcoded for now, ideally from a dictionary)
            let tooltip = '';
            if (keyword === '流血') tooltip = '直到回合结束时，受到的没被护甲抵抗的物理伤害增加1点。';
            if (keyword === '迟缓') tooltip = '下一张卡牌速度+1。';
            if (keyword === '蓄力') tooltip = '下一次攻击造成的伤害翻倍，且速度+1。';
            if (keyword === '眩晕') tooltip = '下回合所有卡牌速度+2。';
            if (keyword === '专注') tooltip = '下一次攻击造成的伤害增加50%。';
            
            return (
                <span 
                    key={i} 
                    className="text-yellow-400 font-bold cursor-help border-b border-yellow-400/30 hover:bg-yellow-400/10 transition-colors relative group/keyword"
                    onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveTooltip({
                            keyword,
                            text: tooltip,
                            x: rect.left + rect.width / 2,
                            y: rect.top
                        });
                    }}
                    onMouseLeave={() => setActiveTooltip(null)}
                >
                    {part}
                </span>
            );
        }
        return part;
    });
  };

  // Render Portal Tooltip
  const renderTooltip = () => {
      if (!activeTooltip) return null;
      return createPortal(
          <div 
            className="fixed z-[9999] bg-slate-900 text-slate-200 text-[10px] p-2 rounded border border-slate-600 shadow-xl pointer-events-none whitespace-normal leading-normal w-48"
            style={{
                left: activeTooltip.x,
                top: activeTooltip.y - 8, // slightly above
                transform: 'translate(-50%, -100%)'
            }}
          >
              <span className="font-bold text-yellow-400 mb-1 block">{activeTooltip.keyword}</span>
              {activeTooltip.text}
          </div>,
          document.body
      );
  };

  // Rarity Border
  const borderClass = getCardRarityBorderClass(card);
  
  // Selection/Interactive styles
  const interactiveClass = onClick && !disabled ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : '';
  const opacityClass = disabled ? 'opacity-40 grayscale' : '';
  const finalBorderClass = disabled ? 'border-slate-800' : borderClass;

  // Handle Flip
  const handleMouseEnter = () => {
    if (compact) setShowFullDetail(true);

    if (internalFaceDown && !disableHoverFlip) {
      setInternalFaceDown(false);
      if (onFlip) onFlip();
      
      if (!onFlip) {
          setInternalFaceDown(false);
          if (borderClass.includes('border-yellow-400') || borderClass.includes('border-purple-500')) {
            setAnimateJump(true);
            setTimeout(() => setAnimateJump(false), 500); 
          }
      }
    }
  };

  const handleMouseLeave = () => {
      if (compact) setShowFullDetail(false);
  };

  if (internalFaceDown) {
    return (
      <div 
        className={`relative bg-slate-900 border-2 border-slate-700 rounded-lg p-3 flex items-center justify-center h-48 transition-all duration-300 cursor-help ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-600">?</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative bg-slate-800 border-2 rounded-lg p-3 flex flex-col justify-between h-48 transition-all duration-200 group ${finalBorderClass} ${interactiveClass} ${opacityClass} ${className} ${animateJump ? 'animate-bounce' : ''}`}
      onClick={!disabled ? onClick : undefined}
      title={isInstance(card) ? `Instance ID: ${card.instanceId}\n${speedTooltip}` : speedTooltip}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Full Detail Overlay for Compact Mode */}
      {compact && showFullDetail && (
          <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-64 z-[100] shadow-2xl">
              <div className={`bg-slate-900 border-2 rounded-lg p-4 flex flex-col gap-2 ${borderClass}`}>
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xl text-white">{getName(card)}</span>
                    <span className="text-yellow-400 font-bold text-lg bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center border border-slate-600">
                        {displaySpeed}</span>
                  </div>
                  {getTags(card) && getTags(card)!.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {getTags(card)!.map(tag => (
                            <span key={tag} className="text-xs bg-slate-800 text-cyan-300 px-1 rounded border border-slate-700">
                                {tag}
                            </span>
                        ))}
                    </div>
                  )}
                  <div className="text-sm text-slate-300 mt-2">
                    {formatText(getEffectDescription(card))}
                  </div>
                  {getDescription(card) && (
                    <div className="text-xs text-slate-500 italic mt-2 pt-2 border-t border-slate-700">
                        {getDescription(card)}
                    </div>
                  )}
              </div>
          </div>
      )}

      <div>
        <div className="flex justify-between items-start mb-1">
          <span className="font-bold text-lg text-slate-200 leading-tight truncate">{getName(card)}</span>
          
          {/* Speed Bubble */}
          {currentSpeed !== null && (
            <div 
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center shadow-lg z-10 group-hover:scale-110 transition-transform"
              title={speedTooltip}
            >
              <span className="text-yellow-400 font-bold text-lg">{displaySpeed}</span>
            </div>
          )}
        </div>

        {/* Tags - Hide in compact mode if overflowing, or keep small */}
        {getTags(card) && getTags(card)!.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
                {getTags(card)!.map(tag => (
                    <span key={tag} className="text-[10px] bg-slate-700/80 text-cyan-300 px-1 rounded border border-slate-600/50">
                        {tag}
                    </span>
                ))}
            </div>
        )}
        
        <div className="text-xs text-slate-400 line-clamp-4 leading-relaxed h-20 overflow-hidden flex flex-col gap-1">
            {/* Show description (flavor/rules) in italic if present */}
            {getDescription(card) && (
                <span className="italic text-slate-500 text-[10px] mb-1 border-b border-slate-700/50 pb-1">
                    {getDescription(card)}
                </span>
            )}
            {/* Show actual effect description */}
            <span className="text-slate-300">
                {formatText(getEffectDescription(card))}
            </span>
        </div>
      </div>
      
      {/* Footer Info (Collection View) */}
      {(count !== undefined || inDeck !== undefined) && (
        <div className="flex justify-between items-end mt-2 relative">
          {count !== undefined && (
            <div className="absolute -left-3 bottom-4 bg-red-600 text-white text-[10px] px-2 py-0.5 shadow-md transform -skew-x-12 origin-bottom-left font-bold z-20">
              持有: {count}
            </div>
          )}
          
          <div className="flex-1"></div>

          {inDeck !== undefined && inDeck > 0 && (
            <div className="bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded text-xs font-medium border border-emerald-900 z-10">
              {inDeck}/3
            </div>
          )}
        </div>
      )}

      {/* Render Portal Tooltip */}
      {renderTooltip()}
    </div>
  );
};

export default CardDisplay;
