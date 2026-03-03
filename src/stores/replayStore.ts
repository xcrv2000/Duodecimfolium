import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BattleState } from '../core/domain/Battle';

export interface ReplayRecord {
  id: string;
  timestamp: number;
  dungeonId: string; // or 'custom'
  stageIndex: number;
  seed: number;
  initialState: BattleState; // Snapshot of the state BEFORE the battle starts
  enemyName: string;
  isFavorite: boolean;
}

interface ReplayStore {
  replays: ReplayRecord[];
  
  addReplay: (replay: Omit<ReplayRecord, 'id' | 'isFavorite'>) => void;
  toggleFavorite: (id: string) => void;
  deleteReplay: (id: string) => void;
  clearHistory: () => void; // Clears non-favorites
}

export const useReplayStore = create<ReplayStore>()(
  persist(
    (set) => ({
      replays: [],

      addReplay: (replayData) => {
        const newReplay: ReplayRecord = {
          ...replayData,
          id: `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isFavorite: false,
        };

        set((state) => {
          // 1. Add new replay
          let updated = [newReplay, ...state.replays];
          
          // 2. Separate favorites and non-favorites
          const favorites = updated.filter(r => r.isFavorite);
          let history = updated.filter(r => !r.isFavorite);
          
          // 3. Trim history to last 10
          if (history.length > 10) {
            history = history.slice(0, 10);
          }
          
          // 4. Combine (Favorites can be up to 100)
          // Sort by timestamp desc
          const combined = [...favorites, ...history].sort((a, b) => b.timestamp - a.timestamp);
          
          return { replays: combined };
        });
      },

      toggleFavorite: (id) => {
        set((state) => {
          const replay = state.replays.find(r => r.id === id);
          if (!replay) return state;

          // Check limits if favoriting
          if (!replay.isFavorite) {
            const favoritesCount = state.replays.filter(r => r.isFavorite).length;
            if (favoritesCount >= 100) {
              // Cannot favorite more
              return state;
            }
          }

          return {
            replays: state.replays.map(r => 
              r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
            )
          };
        });
      },

      deleteReplay: (id) => {
        set((state) => ({
          replays: state.replays.filter(r => r.id !== id)
        }));
      },
      
      clearHistory: () => {
          set(state => ({
              replays: state.replays.filter(r => r.isFavorite)
          }));
      }
    }),
    {
      name: 'duodecimfolium-replays',
    }
  )
);
