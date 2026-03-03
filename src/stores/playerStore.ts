import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlayerState } from '../core/domain/Player';

interface PlayerStore extends PlayerState {
  addGold: (amount: number) => void;
  addDust: (amount: number) => void;
  unlockDungeon: (id: string) => void;
  clearDungeon: (id: string) => void;
  unlockPack: (id: string) => void;
  addCard: (id: string, count?: number) => void;
  removeCard: (id: string, count?: number) => void;
  
  // Deck Management
  createDeck: (name: string) => void;
  deleteDeck: (deckId: string) => void;
  renameDeck: (deckId: string, newName: string) => void;
  updateDeck: (deckId: string, cardIds: string[], modifierSlots?: Record<string, string>) => void;
  importDeck: (deck: any) => void; // Accepts deck object
  
  // Modifiers
  addModifier: (id: string, count?: number) => void;
  removeModifier: (id: string, count?: number) => void;

  // Crafting
  craftCard: (cardId: string, cost: number) => void;
}

const initialState: PlayerState = {
  gold: 100,
  dust: 0,
  unlockedDungeons: ['training_ground', 'sandbox_training'],
  clearedDungeons: [],
  unlockedPacks: ['basic_swordsmanship'],
  collection: {},
  decks: [
    {
      id: 'default_deck',
      name: '初始卡组',
      cardIds: [],
      modifierSlots: {}
    }
  ],
  modifiers: {
    'breeze_orb': 3,
    'iron_orb': 3,
    'fire_spirit_orb': 3
  }
};

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      ...initialState,

      addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
      
      addDust: (amount) => set((state) => ({ dust: state.dust + amount })),
      
      addModifier: (id, count = 1) => set((state) => ({
        modifiers: { ...state.modifiers, [id]: (state.modifiers[id] || 0) + count }
      })),

      removeModifier: (id, count = 1) => set((state) => ({
        modifiers: { ...state.modifiers, [id]: Math.max(0, (state.modifiers[id] || 0) - count) }
      })),

      unlockDungeon: (id) => set((state) => {
        if (state.unlockedDungeons.includes(id)) return state;
        return { unlockedDungeons: [...state.unlockedDungeons, id] };
      }),

      clearDungeon: (id) => set((state) => {
        if (state.clearedDungeons.includes(id)) return state;
        return { clearedDungeons: [...state.clearedDungeons, id] };
      }),
      
      unlockPack: (id) => set((state) => {
        if (state.unlockedPacks.includes(id)) return state;
        return { unlockedPacks: [...state.unlockedPacks, id] };
      }),
      
      addCard: (id, count = 1) => set((state) => {
        const currentCount = state.collection[id] || 0;
        const newCount = currentCount + count;
        
        if (newCount > 3) {
          const kept = 3;
          const dusted = newCount - 3;
          return {
            collection: { ...state.collection, [id]: kept },
            dust: state.dust + dusted
          };
        }
        
        return {
          collection: { ...state.collection, [id]: newCount }
        };
      }),

      removeCard: (id, count = 1) => set((state) => {
        const currentCount = state.collection[id] || 0;
        const newCount = Math.max(0, currentCount - count);
        return {
          collection: { ...state.collection, [id]: newCount }
        };
      }),

      createDeck: (name) => set((state) => {
        if (state.decks.length >= 100) return state;
        const newDeck = {
          id: `deck_${Date.now()}`,
          name,
          cardIds: [],
          modifierSlots: {}
        };
        return { decks: [...state.decks, newDeck] };
      }),

      deleteDeck: (deckId) => set((state) => {
        if (state.decks.length <= 1) return state; // Prevent deleting last deck
        return { decks: state.decks.filter(d => d.id !== deckId) };
      }),

      renameDeck: (deckId, newName) => set((state) => ({
        decks: state.decks.map(d => d.id === deckId ? { ...d, name: newName } : d)
      })),

      updateDeck: (deckId, cardIds, modifierSlots) => set((state) => ({
        decks: state.decks.map(d => d.id === deckId ? { 
            ...d, 
            cardIds, 
            modifierSlots: modifierSlots || d.modifierSlots 
        } : d)
      })),

      importDeck: (deck) => set((state) => {
        // Validate deck structure
        if (!deck || !Array.isArray(deck.cardIds)) return state;
        
        // Create new deck with new ID
        const newDeck = {
            ...deck,
            id: `deck_imported_${Date.now()}`,
            name: deck.name || `Imported Deck`
        };
        
        // Check limits
        if (state.decks.length >= 100) return state;
        
        return { decks: [...state.decks, newDeck] };
      }),

      craftCard: (cardId, cost) => set((state) => {
        if (state.dust < cost) return state;
        
        const currentCount = state.collection[cardId] || 0;
        if (currentCount >= 3) return state; // Should not craft if full

        return {
            dust: state.dust - cost,
            collection: { ...state.collection, [cardId]: currentCount + 1 }
        };
      })
    }),
    {
      name: 'duodecimfolium-player-storage', // unique name
      partialize: (state) => ({
        gold: state.gold,
        dust: state.dust,
        unlockedDungeons: state.unlockedDungeons,
        clearedDungeons: state.clearedDungeons,
        unlockedPacks: state.unlockedPacks,
        collection: state.collection,
        decks: state.decks,
        modifiers: state.modifiers
      }),
    }
  )
);
