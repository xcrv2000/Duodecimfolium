export interface PlayerState {
  gold: number;
  dust: number;
  unlockedDungeons: string[]; // ID list
  clearedDungeons: string[]; // ID list of cleared dungeons
  unlockedPacks: string[]; // ID list
  openedPacks: string[]; // ID list of packs that have been opened at least once
  collection: Record<string, number>; // cardId -> count
  decks: Deck[];
  defaultDeckId?: string;
  
  /**
   * 修饰珠库存（永久配件库）
   * modifierId -> 拥有数量
   * 
   * 玩家永久拥有的修饰珠。
   * 修饰珠通过在卡组中"镶嵌"来改变该卡的属性，不会被消耗。
   * 入场时检查库存 >= 卡组镶嵌的修饰珠总数（确保不超过持有上限）
   */
  modifiers: Record<string, number>; // modifierId -> count

  /**
   * 信物库存
   * tokenId -> 拥有数量
   * 
   * 玩家通过击败特定敌人获得的特殊物品。
   * 用于解锁特定卡包。
   */
  tokens: Record<string, number>; // tokenId -> count
}

export interface Deck {
  id: string;
  name: string;
  cardIds: string[]; // Ordered list of card IDs
  modifierSlots: Record<string, string>; // cardIndex -> modifierId
  
  /**
   * 同名卡生效刻惩罚（预计算）
   * 用于在组卡界面中显示最终生效刻
   * 格式: cardIndex -> speedPenalty (x10)
   * 
   * 计算规则：
   * - 对每张卡统计在这个卡组中出现的次数
   * - 第 1 次：惩罚 = 0
   * - 第 2 次：惩罚 = 9 (0.9)
   * - 第 3 次及以上：惩罚 = 28 (2.8)
   */
  cardSpeedPenalties?: Record<string, number>;
}
