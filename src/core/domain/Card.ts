export type CardRarity = number; // 卡包中的份数
export type CardSpeed = number | null; // 1-12 或 null

export interface Card {
  id: string;
  name: string; // 给玩家看的卡的名字
  description: string; // 给玩家看的卡的描述
  effectDescription: string; // 给玩家看的卡的效果
  packId: string; // 这张卡属于哪个卡包
  rarity: CardRarity; // 稀有度
  speed: CardSpeed; // 速度
  scriptId: string; // 给系统看的卡的脚本
  tags: string[]; // 属性 (e.g., "攻击/物理")
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
  originalSpeed: CardSpeed; // 原始速度
  permanentSpeedModifier?: number; // 永久速度修正 (e.g. NPC +0.1)
  currentSpeed: number | null; // 当前速度 (受buff影响)
  deckSpeedPenalty?: number; // 同名卡速度惩罚
  ownerId: string; // 持有者ID
  modifiers: Modifier[]; // 修饰珠
}
