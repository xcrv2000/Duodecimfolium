import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardInstance } from '../../core/domain/Card';
import { getCardRarityBorderClass } from '../../utils/cardUtils';
import cardsData from '../../data/cards.json';
import buffsData from '../../data/buffs.json';

interface CardDisplayProps {
  card: Card | CardInstance;
  count?: number;
  inDeck?: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  isFaceDown?: boolean;
  disableHoverFlip?: boolean;
  enableRevealAnimation?: boolean;
  onFlip?: () => void;
  compact?: boolean;
}

type TooltipContent =
  | { type: 'text'; keyword: string; text: string }
  | { type: 'card'; keyword: string; card: Card };

type TooltipPayload = TooltipContent & { x: number; y: number };

const allCards = cardsData as Card[];
const allBuffs = buffsData as Array<{ name: string; description: string }>;
const buffByName = new Map(allBuffs.map((b) => [b.name, b]));
const keywordDescriptions: Record<string, string> = {
  全力: '该卡结算时，会优先以当前血量最高的敌方单位为目标。'
};

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
  const [showFullDetail, setShowFullDetail] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<TooltipPayload | null>(null);

  useEffect(() => {
    setInternalFaceDown(isFaceDown);
    if (!isFaceDown && enableRevealAnimation) {
      const borderClass = getCardRarityBorderClass(card);
      if (borderClass.includes('border-yellow-400') || borderClass.includes('border-purple-500')) {
        setAnimateJump(true);
        setTimeout(() => setAnimateJump(false), 500);
      }
    }
  }, [isFaceDown, card, enableRevealAnimation]);

  const isInstance = (c: Card | CardInstance): c is CardInstance =>
    typeof c === 'object' && c !== null && 'instanceId' in c;

  const getName = (c: Card | CardInstance) => (isInstance(c) ? c.factory.name : c.name);
  const getDescription = (c: Card | CardInstance) => (isInstance(c) ? c.factory.description : c.description);
  const getEffectDescription = (c: Card | CardInstance) => (isInstance(c) ? c.factory.effectDescription : c.effectDescription);
  const getTags = (c: Card | CardInstance) => (isInstance(c) ? c.tagsRuntime || c.factory.tags : c.tags);
  const getMaxCopies = (c: Card | CardInstance) => (isInstance(c) ? c.factory.maxCopies : c.maxCopies);
  const getDesigner = (c: Card | CardInstance) => (isInstance(c) ? c.factory.designer : c.designer);

  const descriptionText = getDescription(card) || '';
  const effectText = getEffectDescription(card) || '';
  const maxCopies = getMaxCopies(card) ?? 3;
  const isLongTextCard = `${descriptionText} ${effectText}`.length > 70;
  const effectPreview = effectText.length > 28 ? `${effectText.slice(0, 28)}...` : effectText;

  const baseSpeed = isInstance(card) ? (card.baseSpeed10 !== null ? card.baseSpeed10 / 10 : null) : card.speed;
  const currentSpeed = isInstance(card) ? (card.currentSpeed10 !== null ? card.currentSpeed10 / 10 : null) : card.speed;
  const displaySpeed = currentSpeed !== null && currentSpeed !== undefined ? Number(currentSpeed).toFixed(1).replace(/\.0$/, '') : '-';

  let speedTooltip = `Base Speed: ${baseSpeed}`;
  if (isInstance(card) && currentSpeed !== null && baseSpeed !== null) {
    if (currentSpeed !== baseSpeed) {
      const diff = currentSpeed - baseSpeed;
      speedTooltip = `Current Speed: ${currentSpeed}\nBase Speed: ${baseSpeed}\nModifier: ${diff > 0 ? `+${diff}` : diff} (Battle Effects)`;
    } else {
      speedTooltip = `Speed: ${currentSpeed} (Base)`;
    }
  } else if (currentSpeed !== null) {
    speedTooltip = `Speed: ${currentSpeed}`;
  }

  const resolveTooltipPayload = (rawKeyword: string): TooltipContent => {
    const compactKeyword = rawKeyword.replace(/\s+/g, '');
    const levelMatch = compactKeyword.match(/^(.+?)(\d+)$/);
    const buffName = levelMatch ? levelMatch[1] : compactKeyword;
    const buffLevel = levelMatch ? parseInt(levelMatch[2], 10) : null;

    const buff = buffByName.get(buffName);
    if (buff) {
      const text =
        buffLevel !== null ? buff.description.replace(/\{level\}/g, String(buffLevel)) : buff.description;
      return { type: 'text', keyword: rawKeyword, text };
    }

    const derivedCard =
      allCards.find((c) => c.name === compactKeyword) ||
      allCards.find((c) => c.tags?.includes('衍生') && c.name.includes(compactKeyword));
    if (derivedCard) {
      return { type: 'card', keyword: rawKeyword, card: derivedCard };
    }

    const common = keywordDescriptions[compactKeyword];
    if (common) {
      return { type: 'text', keyword: rawKeyword, text: common };
    }

    return { type: 'text', keyword: rawKeyword, text: '暂无词条解释。' };
  };

  const formatText = (text: string) => {
    const parts = text.split(/(【[^】]+】)/g);
    return parts.map((part, i) => {
      if (part.startsWith('【') && part.endsWith('】')) {
        const keyword = part.slice(1, -1).trim();
        return (
          <span
            key={`${part}-${i}`}
            className="text-yellow-400 font-bold cursor-help border-b border-yellow-400/30 hover:bg-yellow-400/10 transition-colors relative group/keyword"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const payload = resolveTooltipPayload(keyword);
              setActiveTooltip({
                ...payload,
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

  const tooltipNode = useMemo(() => {
    if (!activeTooltip) return null;
    return createPortal(
      <div
        className="fixed z-[9999] bg-slate-900 text-slate-200 text-[10px] p-2 rounded border border-slate-600 shadow-xl pointer-events-none whitespace-normal leading-normal w-60"
        style={{
          left: activeTooltip.x,
          top: activeTooltip.y - 8,
          transform: 'translate(-50%, -100%)'
        }}
      >
        <span className="font-bold text-yellow-400 mb-1 block">{activeTooltip.keyword}</span>
        {activeTooltip.type === 'text' ? (
          <div>{activeTooltip.text}</div>
        ) : (
          <div className="space-y-1">
            <div className="font-bold text-slate-100">{activeTooltip.card.name}</div>
            <div className="text-cyan-300">速度: {activeTooltip.card.speed === null ? '-' : activeTooltip.card.speed}</div>
            <div className="text-slate-300">{activeTooltip.card.effectDescription}</div>
            {activeTooltip.card.description && (
              <div className="text-slate-500 italic">{activeTooltip.card.description}</div>
            )}
          </div>
        )}
      </div>,
      document.body
    );
  }, [activeTooltip]);

  const borderClass = getCardRarityBorderClass(card);
  const interactiveClass = onClick && !disabled ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : '';
  const opacityClass = disabled ? 'opacity-40 grayscale' : '';
  const finalBorderClass = disabled ? 'border-slate-800' : borderClass;

  const handleMouseEnter = () => {
    if (compact || isLongTextCard) setShowFullDetail(true);
    if (internalFaceDown && !disableHoverFlip) {
      setInternalFaceDown(false);
      if (onFlip) onFlip();
      if (!onFlip && (borderClass.includes('border-yellow-400') || borderClass.includes('border-purple-500'))) {
        setAnimateJump(true);
        setTimeout(() => setAnimateJump(false), 500);
      }
    }
  };

  const handleMouseLeave = () => {
    if (compact || isLongTextCard) setShowFullDetail(false);
  };

  if (internalFaceDown) {
    return (
      <div
        className={`relative bg-slate-900 border-2 border-slate-700 rounded-lg p-3 flex items-center justify-center h-44 sm:h-48 transition-all duration-300 cursor-help ${className}`}
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
      className={`relative bg-slate-800 border-2 rounded-lg p-2 sm:p-3 flex flex-col justify-between h-44 sm:h-48 transition-all duration-200 group ${finalBorderClass} ${interactiveClass} ${opacityClass} ${className} ${animateJump ? 'animate-bounce' : ''}`}
      onClick={!disabled ? onClick : undefined}
      title={isInstance(card) ? `Instance ID: ${card.instanceId}\n${speedTooltip}` : speedTooltip}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {(compact || isLongTextCard) && showFullDetail && (
        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-64 z-[100] shadow-2xl">
          <div className={`bg-slate-900 border-2 rounded-lg p-4 flex flex-col gap-2 ${borderClass}`}>
            <div className="flex justify-between items-start">
              <span className="font-bold text-xl text-white">{getName(card)}</span>
              <span className="text-yellow-400 font-bold text-lg bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center border border-slate-600">
                {displaySpeed}
              </span>
            </div>
            {getTags(card) && getTags(card)!.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {getTags(card)!.map((tag) => (
                  <span key={tag} className="text-xs bg-slate-800 text-cyan-300 px-1 rounded border border-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="text-sm text-slate-300 mt-2">{formatText(getEffectDescription(card))}</div>
            {getDescription(card) && (
              <div className="text-xs text-slate-500 italic mt-2 pt-2 border-t border-slate-700">{getDescription(card)}</div>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between items-start mb-1">
          <span className="font-bold text-sm sm:text-lg text-slate-200 leading-tight truncate">{getName(card)}</span>
          {currentSpeed !== null && (
            <div
              className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center shadow-lg z-10 group-hover:scale-110 transition-transform"
              title={speedTooltip}
            >
              <span className="text-yellow-400 font-bold text-sm sm:text-lg">{displaySpeed}</span>
            </div>
          )}
        </div>

        {getTags(card) && getTags(card)!.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {getTags(card)!.map((tag) => (
              <span key={tag} className="text-[10px] bg-slate-700/80 text-cyan-300 px-1 rounded border border-slate-600/50">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="text-[10px] sm:text-xs text-slate-400 line-clamp-4 leading-relaxed h-20 overflow-hidden flex flex-col gap-1">
          {isLongTextCard ? (
            <>
              <span className="text-slate-300">核心效果: {effectPreview}</span>
              <span className="text-[10px] text-cyan-300 italic">悬停查看更多完整说明</span>
            </>
          ) : (
            <>
              {getDescription(card) && (
                <span className="italic text-slate-500 text-[10px] mb-1 border-b border-slate-700/50 pb-1">{getDescription(card)}</span>
              )}
              <span className="text-slate-300">{formatText(getEffectDescription(card))}</span>
            </>
          )}
        </div>

        {getDesigner(card) && (
          <div className="mt-1 text-right text-[9px] text-slate-500">设计师: {getDesigner(card)}</div>
        )}
      </div>

      {(count !== undefined || inDeck !== undefined) && (
        <div className="flex justify-between items-end mt-2 relative">
          {count !== undefined && (
            <div className="absolute -left-3 bottom-4 bg-red-600 text-white text-[10px] px-2 py-0.5 shadow-md transform -skew-x-12 origin-bottom-left font-bold z-20">
              持有: {count}
            </div>
          )}
          {count !== undefined && maxCopies !== 3 && (
            <div className="absolute -left-2 bottom-0 bg-blue-600 text-white text-[10px] px-2 py-0.5 shadow-md transform -skew-x-12 origin-bottom-left font-bold z-20">
              上限: {maxCopies}
            </div>
          )}
          <div className="flex-1"></div>
          {inDeck !== undefined && inDeck > 0 && (
            <div className="bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded text-xs font-medium border border-emerald-900">
              {inDeck}/{maxCopies}
            </div>
          )}
        </div>
      )}

      {tooltipNode}
    </div>
  );
};

export default CardDisplay;
