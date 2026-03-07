import type { CardInstanceBuff, CardFactoryBuff } from './Battle';

export type CardRarity = number; // 卡包中的份数
export type CardSpeed = number | null; // 配置中的速度 (e.g. 2.1), null for passive

/**
 * CardFactory（卡工厂）
 * 
 * 配置级定义，表示一张"卡的蓝图"。
 * 所有该类卡的运行时实例（CardInstance）都是从这个工厂生成的。
 * 
 * 对应 JSON 中的卡配置，不包含任何运行时状态。
 * 在游戏启动时加载到 CardFactoryRegistry。
 */
export interface CardFactory {
  id: string;
  name: string; // 给玩家看的卡的名字
  description: string; // 给玩家看的卡的描述
  effectDescription: string; // 给玩家看的卡的效果文本
  designer?: string; // 设计者标注（可选）
  packId: string; // 这张卡属于哪个卡包
  rarity: CardRarity; // 稀有度（卡包中的份数）
  maxCopies?: number; // 单卡可携带上限，默认3
  speed: CardSpeed; // 基础速度 (0.1 精度，e.g. 2.1)
  scriptId: string; // 给系统看的卡的脚本 ID
  tags: string[]; // 属性标签 (e.g., "攻击/物理")
  baselineFactoryBuffs?: CardFactoryBuff[]; // 工厂级buff（战斗持续）
}

/**
 * 类型别名：兼容旧代码
 * 在迁移期间，Card 可视为 CardFactory
 */
export type Card = CardFactory;

export interface Modifier {
  id: string;
  name: string;
  description?: string;
  effectId: string; // e.g., "speed_mod", "attr_add"
  value?: number | string;
}

/**
 * CardInstance（卡实例）
 * 
 * 运行时临时对象，在每个回合的 CardGeneration 阶段创建。
 * 由 CardFactory 生成，但包含当前战斗场景的动态信息：
 * - 速度修正（修饰珠、buff、同名卡惩罚）
 * - 运行时标签（修饰珠附加）
 * - 实例级 buff
 * 
 * ❌ 不再继承 CardFactory，而是组合引用之
 * ✅ 所有运行时字段都在这里定义
 */
export interface CardInstance {
  // ----- 引用关系 -----
  factory: CardFactory; // 指向卡的配置
  instanceId: string; // 运行时唯一ID
  ownerId: string; // 持有者单位 ID
  
  // ----- 速度系统（x10 整数存储，精度 0.1） -----
  baseSpeed10: number | null; // 从 factory.speed 转换来，单位 x10
  currentSpeed10: number | null; // 当前速度 x10，受修正影响
  
  // ----- 速度修正与惩罚 -----
  permanentSpeedModifier: number; // 永久修正 (x10)，e.g. NPC +0.1 -> +1
  deckSpeedPenalty: number; // 同名卡速度惩罚 (x10)，第2张 +9, 第3张 +28
  
  // ----- 运行时扩展 -----
  tagsRuntime: string[]; // factory.tags + 修饰珠添加的标签
  modifiers: Modifier[]; // 该卡组上镶嵌的修饰珠
  
  // ----- Buff 系统 -----
  buffs: CardInstanceBuff[]; // 卡实例级 buff（本回合结束消失）
  factoryBuffs?: CardFactoryBuff[]; // 运行时添加的工厂级 buff（战斗持续）
  
  // ----- 执行顺序（可选，用于时间轴显示） -----
  executionOrder?: number; // 同 tick 内的执行序号（0, 1, 2...）
}
