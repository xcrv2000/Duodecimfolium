import { Card } from '../core/domain/Card';
import cardsData from '../data/cards.json';

const cards = cardsData as Card[];

// Pre-calculate pack weights
const packWeights: Record<string, number> = {};
cards.forEach(card => {
    if (!packWeights[card.packId]) packWeights[card.packId] = 0;
    packWeights[card.packId] += card.rarity;
});

/**
 * Get the CSS class for the card border based on rarity percentage.
 * < 1%: Gold
 * < 12%: Purple
 * < 36%: Blue
 * Rest: Green
 */
export const getCardRarityBorderClass = (card: Card): string => {
    const totalWeight = packWeights[card.packId];
    // If pack not found or total weight is 0, default to Green (Common)
    if (!totalWeight) return 'border-emerald-500';

    const percentage = card.rarity / totalWeight;

    if (percentage < 0.01) return 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]'; // Gold with glow
    if (percentage < 0.12) return 'border-purple-500'; // Purple
    if (percentage < 0.36) return 'border-blue-500'; // Blue
    return 'border-emerald-600'; // Green
};

/**
 * Get the text color class based on rarity.
 */
export const getCardRarityTextClass = (card: Card): string => {
    const totalWeight = packWeights[card.packId];
    if (!totalWeight) return 'text-emerald-400';

    const percentage = card.rarity / totalWeight;

    if (percentage < 0.01) return 'text-yellow-400';
    if (percentage < 0.12) return 'text-purple-400';
    if (percentage < 0.36) return 'text-blue-400';
    return 'text-emerald-400';
};
