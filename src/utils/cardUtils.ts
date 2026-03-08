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
 * < 0.5%: Gold
 * < 3%: Purple
 * < 12%: Blue
 * < 50%: Green
 * >= 50%: White
 */
export const getCardRarityBorderClass = (card: Card | import('../core/domain/Card').CardInstance): string => {
    // Support CardInstance by dereferencing factory if necessary
    const packId = 'packId' in card ? card.packId : card.factory.packId;
    const rarity = 'rarity' in card ? card.rarity : card.factory.rarity;
    const totalWeight = packWeights[packId];
    // If pack not found or total weight is 0, default to White (most common style)
    if (!totalWeight) return 'border-white';

    const percentage = rarity / totalWeight;

    if (percentage < 0.005) return 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]'; // Gold with glow
    if (percentage < 0.03) return 'border-purple-500'; // Purple
    if (percentage < 0.12) return 'border-blue-500'; // Blue
    if (percentage < 0.5) return 'border-emerald-600'; // Green
    return 'border-white'; // White
};

/**
 * Get the text color class based on rarity.
 */
export const getCardRarityTextClass = (card: Card | import('../core/domain/Card').CardInstance): string => {
    const packId = 'packId' in card ? card.packId : card.factory.packId;
    const rarity = 'rarity' in card ? card.rarity : card.factory.rarity;
    const totalWeight = packWeights[packId];
    if (!totalWeight) return 'text-white';

    const percentage = rarity / totalWeight;

    if (percentage < 0.005) return 'text-yellow-400';
    if (percentage < 0.03) return 'text-purple-400';
    if (percentage < 0.12) return 'text-blue-400';
    if (percentage < 0.5) return 'text-emerald-400';
    return 'text-white';
};
