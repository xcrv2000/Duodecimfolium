import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PlayerState } from '../core/domain/Player';

interface PlayerStore extends PlayerState {
  addGold: (amount: number) => void;
  addDust: (amount: number) => void;
  unlockDungeon: (id: string) => void;
  clearDungeon: (id: string) => void;
  unlockPack: (id: string) => void;
  markPackOpened: (id: string) => void;
  addCard: (id: string, count?: number) => void;
  addCards: (ids: string[]) => void;
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

  // Tokens
  addToken: (id: string, count?: number) => void;
  removeToken: (id: string, count?: number) => void;

  // Crafting
  craftCard: (cardId: string, cost: number) => void;
}

const initialState: PlayerState = {
  gold: 100,
  dust: 0,
  unlockedDungeons: ['training_ground', 'sandbox_training'],
  clearedDungeons: [],
  unlockedPacks: ['basic_swordsmanship'],
  openedPacks: [],
  collection: {},
  decks: [
    {
      id: 'default_deck',
      name: '初始卡组',
      cardIds: [],
      modifierSlots: {},
      cardSpeedPenalties: {}
    }
  ],
  modifiers: {
    'breeze_orb': 3,
    'iron_orb': 3,
    'fire_spirit_orb': 3
  },
  tokens: {}
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

      /** @deprecated 修饰珠不会被消耗，只用于数据修复 */
      removeModifier: (id, count = 1) => set((state) => ({
        modifiers: { ...state.modifiers, [id]: Math.max(0, (state.modifiers[id] || 0) - count) }
      })),

      addToken: (id, count = 1) => set((state) => ({
        tokens: { ...state.tokens, [id]: (state.tokens[id] || 0) + count }
      })),

      removeToken: (id, count = 1) => set((state) => ({
        tokens: { ...state.tokens, [id]: Math.max(0, (state.tokens[id] || 0) - count) }
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

      markPackOpened: (id) => set((state) => {
        if (state.openedPacks.includes(id)) return state;
        return { openedPacks: [...state.openedPacks, id] };
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

      addCards: (ids) => set((state) => {
        const newCollection = { ...state.collection };
        let newDust = state.dust;
        
        ids.forEach(id => {
            const currentCount = newCollection[id] || 0;
            if (currentCount >= 3) {
                newDust += 1;
            } else {
                newCollection[id] = currentCount + 1;
            }
        });
        
        return {
            collection: newCollection,
            dust: newDust
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
          modifierSlots: {},
          cardSpeedPenalties: {}
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
        decks: state.decks.map(d => {
          if (d.id !== deckId) return d;
          
          // Calculate speed penalties for duplicate cards
          const cardCounts: Record<string, number> = {};
          const penalties: Record<string, number> = {};
          
          cardIds.forEach((cardId: string, idx: number) => {
            const count = (cardCounts[cardId] || 0) + 1;
            cardCounts[cardId] = count;
            
            let penalty = 0;
            if (count === 2) {
              penalty = 9; // 0.9 x10
            } else if (count >= 3) {
              penalty = 28; // 2.8 x10
            }
            
            penalties[idx.toString()] = penalty;
          });
          
          return {
            ...d,
            cardIds,
            modifierSlots: modifierSlots || d.modifierSlots,
            cardSpeedPenalties: penalties
          };
        })
      })),

      importDeck: (deck) => set((state) => {
        // Validate deck structure
        if (!deck || !Array.isArray(deck.cardIds)) return state;
        
        // Calculate speed penalties for duplicate cards
        const cardIds = deck.cardIds || [];
        const cardCounts: Record<string, number> = {};
        const penalties: Record<string, number> = {};
        
        cardIds.forEach((cardId: string, idx: number) => {
          const count = (cardCounts[cardId] || 0) + 1;
          cardCounts[cardId] = count;
          
          let penalty = 0;
          if (count === 2) {
            penalty = 9; // 0.9 x10
          } else if (count >= 3) {
            penalty = 28; // 2.8 x10
          }
          
          penalties[idx.toString()] = penalty;
        });
        
        // Create new deck with new ID
        const newDeck = {
            ...deck,
            id: `deck_imported_${Date.now()}`,
            name: deck.name || `Imported Deck`,
            cardSpeedPenalties: penalties
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
      name: 'duodecimfolium-player-storage-v1', // unique name with version
      storage: createJSONStorage(() => localStorage), // Explicitly use localStorage
      version: 2,
      migrate: (persistedState: any, version) => {
        if (!persistedState || version >= 2) return persistedState;
        return {
          ...persistedState,
          openedPacks: persistedState.openedPacks || [],
          tokens: persistedState.tokens || {}
        };
      },
      partialize: (state) => ({
        gold: state.gold,
        dust: state.dust,
        unlockedDungeons: state.unlockedDungeons,
        clearedDungeons: state.clearedDungeons,
        unlockedPacks: state.unlockedPacks,
        openedPacks: state.openedPacks,
        collection: state.collection,
        decks: state.decks,
        modifiers: state.modifiers,
        tokens: state.tokens
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Storage rehydrated:', state);
      },
    }
  )
);
