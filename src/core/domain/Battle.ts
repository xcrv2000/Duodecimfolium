import { CardInstance } from './Card';

export type TeamType = 'player' | 'enemy';

export interface BattleUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  armor: number; // 护甲，回合结束清空
  team: TeamType;
  cards: CardInstance[];
  buffs: Buff[];
  isDead: boolean;
}

export interface Buff {
  id: string;
  name: string;
  description: string;
  duration: number; // 剩余回合数
  type: 'buff' | 'debuff';
  stackable?: boolean;
  value?: number; // 数值 (e.g., speed +1, damage +2)
  sourceCardId?: string;
  onTurnStart?: (unit: BattleUnit, battle: BattleState) => void;
  onTurnEnd?: (unit: BattleUnit, battle: BattleState) => void;
  onAttack?: (unit: BattleUnit, target: BattleUnit, damage: number, battle: BattleState) => number; // Returns modified damage
  onReceiveDamage?: (unit: BattleUnit, source: BattleUnit, damage: number, battle: BattleState) => number; // Returns modified damage
}

export interface BattleState {
  tick: number; // 0-12
  turn: number;
  units: BattleUnit[];
  log: BattleLogEntry[];
  isOver: boolean;
  winner: TeamType | null;
  rngSeed: number; // For deterministic replay
}

export interface BattleLogEntry {
  tick: number;
  sourceUnitId: string;
  targetUnitId?: string;
  cardName?: string;
  message: string;
  type: 'info' | 'attack' | 'heal' | 'buff' | 'death';
  value?: number;
}
