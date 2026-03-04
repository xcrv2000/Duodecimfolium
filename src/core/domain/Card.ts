import type { CardInstanceBuff, CardFactoryBuff } from './Battle';

export type CardRarity = number; // 卡包中的份数
export type CardSpeed = number | null; // 配置中的速度 (e.g. 2.1), null for passive

export interface Card {
  id: string;
  name: string; // 给玩家看的卡的名字
  description: string; // 给玩家看的卡的描述
  effectDescription: string; // 给玩家看的卡的效果
  packId: string; // 这张卡属于哪个卡包
  rarity: CardRarity; // 稀有度
  speed: CardSpeed; // 基础速度
  scriptId: string; // 给系统看的卡的脚本
  tags: string[]; // 属性 (e.g., "攻击/物理")
  factoryBuffs?: CardFactoryBuff[]; // 卡工厂级buff（持续到战斗结束）
}

export interface Modifier {
  id: string;
  name: string;
  description?: string;
  effectId: string; // e.g., "speed_mod"
  value?: number | string;
}

export interface CardInstance extends Card {
  instanceId: string; // 运行时唯一ID
  
  // New Speed System (0.1 precision, stored as integer x10)
  baseSpeed10: number | null; // 原始速度 x10
  currentSpeed10: number | null; // 当前速度 x10 (受buff影响)
  
  // Deprecated/Removed fields
  // originalSpeed: CardSpeed; 
  // currentSpeed: number | null; 

  permanentSpeedModifier?: number; // 永久速度修正 (e.g. NPC +0.1 -> +1)
  deckSpeedPenalty?: number; // 同名卡速度惩罚
  
  tagsRuntime?: string[]; // 运行时标签 (继承base tags + 修饰珠添加的标签)
  
  ownerId: string; // 持有者ID
  modifiers: Modifier[]; // 修饰珠
  
  buffs: CardInstanceBuff[]; // 卡实例Buff
}
