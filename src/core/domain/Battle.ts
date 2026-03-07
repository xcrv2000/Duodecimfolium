import { CardInstance } from './Card';

export type TeamType = 'player' | 'enemy';

export interface DamageInfo {
  amount: number;
  sourceUnit: BattleUnit;
  targetUnit: BattleUnit;
  type: 'physical' | 'magical';
  tags: string[]; // Card tags, may include modifier-added tags like '火'
}

export interface BattleUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  initialDeckSize: number; // 初始卡组大小，用于同速排序
  team: TeamType;
  cards: CardInstance[];
  buffs: UnitBuff[];
  isDead: boolean;
}

export interface BaseBuff {
  id: string;
  name: string;
  description: string;
  type: 'buff' | 'debuff';  // 统一类型字段，所有buff都应该有
  duration: number; // 剩余回合数. 默认 1 (本回合结束). 
  stackRule: 'stackable' | 'nonStackable';
  level: number; // 等级/层数
  sourceCardId?: string;
  sourceInstanceId?: string;
}

export interface UnitBuff extends BaseBuff {
  type: 'buff' | 'debuff';
  // Callbacks for Unit Buffs
  onTurnStart?: (unit: BattleUnit, battle: BattleState) => void;
  onTurnEnd?: (unit: BattleUnit, battle: BattleState) => void;
  onAttack?: (unit: BattleUnit, target: BattleUnit, damage: number, battle: BattleState) => number; // Returns modified damage
  onReceiveDamage?: (unit: BattleUnit, damageInfo: DamageInfo, battle: BattleState) => number; // Returns modified damage
}

export interface CardInstanceBuff extends BaseBuff {
    type: 'buff' | 'debuff';
    // Specific to Card Instances (e.g. speed modification)
    speedModification?: number; // 速度修正值 (x10)
}

export interface CardFactoryBuff extends BaseBuff {
    type: 'buff' | 'debuff';
    // Specific to Card Factories (e.g. permanent speed modification)
    speedModification?: number; // 速度修正值 (x10)
}

export interface BattleState {
  tick: number; // 0-12
  turn: number;
  
  /**
   * 当前战斗的所有单位
   * MVP: [playerUnit, enemyUnit] (单英雄)
   * 
   * 预留多英雄支持：
   * - playerUnits: BattleUnit[] (已来 2-4 个玩家角色)
   * - enemyUnits: BattleUnit[] (1-多个敌人)
   * 
   * 时间轴排序逻辑已支持多单位，只需拆分此字段
   */
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
