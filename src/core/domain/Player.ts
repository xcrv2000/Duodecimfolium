export interface PlayerState {
  gold: number;
  dust: number;
  unlockedDungeons: string[]; // ID list
  clearedDungeons: string[]; // ID list of cleared dungeons
  unlockedPacks: string[]; // ID list
  collection: Record<string, number>; // cardId -> count
  decks: Deck[];
  modifiers: Record<string, number>; // modifierId -> count
}

export interface Deck {
  id: string;
  name: string;
  cardIds: string[]; // Ordered list of card IDs
  modifierSlots: Record<string, string>; // cardIndex -> modifierId
}
