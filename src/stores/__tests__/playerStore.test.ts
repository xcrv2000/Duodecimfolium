import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../playerStore';

describe('playerStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    // Note: In a real setup, you'd want to properly isolate store state between tests
    const store = usePlayerStore.getState();
    usePlayerStore.setState({
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
          modifierSlots: {},
          cardSpeedPenalties: {}
        }
      ],
      modifiers: {
        'breeze_orb': 3,
        'iron_orb': 3,
        'fire_spirit_orb': 3
      }
    });
  });

  describe('粉尘合成系统', () => {
    it('应该能够合成卡牌（粉尘足够）', () => {
      const store = usePlayerStore.getState();
      const initialDust = store.dust;
      const initialCount = store.collection['thrust'] || 0;
      const craftCost = 50;

      // 确保粉尘足够
      usePlayerStore.setState({ dust: 100 });

      store.craftCard('thrust', craftCost);

      const newStore = usePlayerStore.getState();
      expect(newStore.dust).toBe(100 - craftCost);
      expect(newStore.collection['thrust']).toBe(initialCount + 1);
    });

    it('应该拒绝合成（粉尘不足）', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ dust: 10 });

      const initialDust = usePlayerStore.getState().dust;
      const initialCount = usePlayerStore.getState().collection['thrust'] || 0;

      store.craftCard('thrust', 50);

      const newStore = usePlayerStore.getState();
      expect(newStore.dust).toBe(initialDust); // 粉尘不变
      expect(newStore.collection['thrust']).toBe(initialCount); // 卡牌数不变
    });

    it('应该拒绝合成（卡牌已满 3 张）', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ 
        dust: 100,
        collection: { 'thrust': 3 }
      });

      store.craftCard('thrust', 50);

      const newStore = usePlayerStore.getState();
      expect(newStore.collection['thrust']).toBe(3); // 仍为 3 张
    });
  });

  describe('金币系统', () => {
    it('应该能够增加金币', () => {
      const store = usePlayerStore.getState();
      const initialGold = store.gold;

      store.addGold(50);

      const newStore = usePlayerStore.getState();
      expect(newStore.gold).toBe(initialGold + 50);
    });

    it('应该能够增加粉尘', () => {
      const store = usePlayerStore.getState();
      const initialDust = store.dust;

      store.addDust(30);

      const newStore = usePlayerStore.getState();
      expect(newStore.dust).toBe(initialDust + 30);
    });
  });

  describe('修饰珠系统', () => {
    it('应该能够增加修饰珠库存', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ 
        modifiers: {
          'breeze_orb': 1
        }
      });

      store.addModifier('breeze_orb', 1);

      const newStore = usePlayerStore.getState();
      expect(newStore.modifiers['breeze_orb']).toBe(2);
    });

    it('应该能够创建新的修饰珠类型', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ 
        modifiers: {}
      });

      store.addModifier('new_orb', 1);

      const newStore = usePlayerStore.getState();
      expect(newStore.modifiers['new_orb']).toBe(1);
    });

    it('应该支持移除修饰珠（用于数据修复，已废弃）', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ 
        modifiers: {
          'breeze_orb': 5
        }
      });

      store.removeModifier('breeze_orb', 2);

      const newStore = usePlayerStore.getState();
      expect(newStore.modifiers['breeze_orb']).toBe(3);
    });
  });

  describe('卡牌收集', () => {
    it('应该能够增加单张卡牌', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ collection: {} });

      store.addCard('thrust', 1);

      const newStore = usePlayerStore.getState();
      expect(newStore.collection['thrust']).toBe(1);
    });

    it('应该能够增加多张相同卡牌', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ collection: { 'thrust': 1 } });

      store.addCard('thrust', 2);

      const newStore = usePlayerStore.getState();
      expect(newStore.collection['thrust']).toBe(3);
    });

    it('应该在超过 3 张时自动转换为粉尘', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ 
        collection: { 'thrust': 2 },
        dust: 0
      });

      store.addCard('thrust', 2);

      const newStore = usePlayerStore.getState();
      expect(newStore.collection['thrust']).toBe(3); // 最多 3 张
      expect(newStore.dust).toBe(1); // 超出部分变为 1 粉尘
    });

    it('应该能够批量增加卡牌', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ 
        collection: {},
        dust: 0
      });

      store.addCards(['thrust', 'parry', 'charge']);

      const newStore = usePlayerStore.getState();
      expect(newStore.collection['thrust']).toBe(1);
      expect(newStore.collection['parry']).toBe(1);
      expect(newStore.collection['charge']).toBe(1);
    });

    it('应该能够移除卡牌', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ 
        collection: { 'thrust': 3 }
      });

      store.removeCard('thrust', 1);

      const newStore = usePlayerStore.getState();
      expect(newStore.collection['thrust']).toBe(2);
    });
  });

  describe('地牢系统', () => {
    it('应该能够解锁地牢', () => {
      const store = usePlayerStore.getState();
      const initialDungeons = usePlayerStore.getState().unlockedDungeons;

      store.unlockDungeon('forest_temple');

      const newStore = usePlayerStore.getState();
      expect(newStore.unlockedDungeons).toContain('forest_temple');
      expect(newStore.unlockedDungeons.length).toBe(initialDungeons.length + 1);
    });

    it('应该能够标记地牢为已通过', () => {
      const store = usePlayerStore.getState();
      store.clearDungeon('training_ground');

      const newStore = usePlayerStore.getState();
      expect(newStore.clearedDungeons).toContain('training_ground');
    });

    it('应该不重复标记已通过的地牢', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ clearedDungeons: ['training_ground'] });

      store.clearDungeon('training_ground');

      const newStore = usePlayerStore.getState();
      expect(newStore.clearedDungeons.filter((d) => d === 'training_ground')).toHaveLength(1);
    });
  });

  describe('卡包系统', () => {
    it('应该能够解锁卡包', () => {
      const store = usePlayerStore.getState();
      store.unlockPack('sword_and_magic');

      const newStore = usePlayerStore.getState();
      expect(newStore.unlockedPacks).toContain('sword_and_magic');
    });

    it('应该不重复解锁已解锁的卡包', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({ unlockedPacks: ['basic_swordsmanship'] });

      store.unlockPack('basic_swordsmanship');

      const newStore = usePlayerStore.getState();
      expect(newStore.unlockedPacks.filter((p) => p === 'basic_swordsmanship')).toHaveLength(1);
    });
  });

  describe('卡组管理', () => {
    it('应该能够创建新卡组', () => {
      const store = usePlayerStore.getState();
      const initialDeckCount = usePlayerStore.getState().decks.length;

      store.createDeck('新卡组');

      const newStore = usePlayerStore.getState();
      expect(newStore.decks.length).toBe(initialDeckCount + 1);
      expect(newStore.decks[newStore.decks.length - 1].name).toBe('新卡组');
    });

    it('应该能够删除卡组', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({
        decks: [
          { id: 'deck_1', name: '卡组1', cardIds: [], modifierSlots: {}, cardSpeedPenalties: {} },
          { id: 'deck_2', name: '卡组2', cardIds: [], modifierSlots: {}, cardSpeedPenalties: {} }
        ]
      });

      store.deleteDeck('deck_1');

      const newStore = usePlayerStore.getState();
      expect(newStore.decks).toHaveLength(1);
      expect(newStore.decks[0].id).toBe('deck_2');
    });

    it('应该能够重命名卡组', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({
        decks: [
          { id: 'deck_1', name: '旧名字', cardIds: [], modifierSlots: {}, cardSpeedPenalties: {} }
        ]
      });

      store.renameDeck('deck_1', '新名字');

      const newStore = usePlayerStore.getState();
      expect(newStore.decks[0].name).toBe('新名字');
    });

    it('应该能够更新卡组中的卡牌', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({
        decks: [
          { id: 'deck_1', name: '卡组1', cardIds: [], modifierSlots: {}, cardSpeedPenalties: {} }
        ]
      });

      store.updateDeck('deck_1', ['thrust', 'parry', 'charge']);

      const newStore = usePlayerStore.getState();
      expect(newStore.decks[0].cardIds).toEqual(['thrust', 'parry', 'charge']);
    });

    it('应该在更新卡组时计算同名卡惩罚', () => {
      const store = usePlayerStore.getState();
      usePlayerStore.setState({
        decks: [
          { id: 'deck_1', name: '卡组1', cardIds: [], modifierSlots: {}, cardSpeedPenalties: {} }
        ]
      });

      // 添加 3 张相同的卡
      store.updateDeck('deck_1', ['thrust', 'thrust', 'thrust']);

      const newStore = usePlayerStore.getState();
      const penalties = newStore.decks[0].cardSpeedPenalties;
      expect(penalties['0']).toBe(0); // 第 1 张无惩罚
      expect(penalties['1']).toBe(9); // 第 2 张 +0.9 x10
      expect(penalties['2']).toBe(28); // 第 3 张 +2.8 x10
    });
  });
});
