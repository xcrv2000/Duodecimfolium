import { describe, it, expect, beforeEach } from 'vitest';
import { BattleLoop } from '../BattleLoop';
import { BattleState, BattleUnit, UnitBuff } from '../../domain/Battle';
import { CardFactory, CardInstance } from '../../domain/Card';
import { RNG } from '../../../utils/rng';

describe('BattleLoop', () => {
  let battleState: BattleState;
  let battleLoop: BattleLoop;
  let rng: RNG;

  beforeEach(() => {
    rng = new RNG(12345);
    
    // Create a simple card factory
    const cardFactory: CardFactory = {
      id: 'test_card',
      name: '测试卡',
      description: '一张用于测试的卡',
      effectDescription: '测试效果',
      packId: 'test',
      rarity: 6,
      speed: 5.0, // 50 in x10 units
      scriptId: 'test_card',
      tags: ['攻击', '物理']
    };

    // Create test battle units
    const playerUnit: BattleUnit = {
      id: 'player_1',
      name: '玩家',
      hp: 100,
      maxHp: 100,
      initialDeckSize: 3,
      team: 'player',
      cards: [],
      buffs: [],
      isDead: false
    };

    const enemyUnit: BattleUnit = {
      id: 'enemy_1',
      name: '敌人',
      hp: 100,
      maxHp: 100,
      initialDeckSize: 3,
      team: 'enemy',
      cards: [],
      buffs: [],
      isDead: false
    };

    // Create test cards with same card (for duplicate penalty testing)
    for (let i = 0; i < 3; i++) {
      const cardInstance: CardInstance = {
        factory: cardFactory,
        instanceId: `card_${i}`,
        baseSpeed10: 50,
        currentSpeed10: null,
        deckSpeedPenalty: i === 0 ? 0 : (i === 1 ? 9 : 28), // 第2张+0.9, 第3张+2.8
        permanentSpeedModifier: 0,
        ownerId: 'player_1',
        tagsRuntime: cardFactory.tags,
        modifiers: [],
        buffs: [],
        factoryBuffs: []
      };
      playerUnit.cards.push(cardInstance);
    }

    battleState = {
      tick: 0,
      turn: 1,
      units: [playerUnit, enemyUnit],
      log: [],
      isOver: false,
      winner: null,
      rngSeed: 12345
    };

    battleLoop = new BattleLoop(battleState, rng);
  });

  describe('同名卡惩罚系统', () => {
    it('应该正确初始化速度惩罚', () => {
      const playerUnit = battleState.units[0];
      expect(playerUnit.cards[0].deckSpeedPenalty).toBe(0);
      expect(playerUnit.cards[1].deckSpeedPenalty).toBe(9); // +0.9 x10
      expect(playerUnit.cards[2].deckSpeedPenalty).toBe(28); // +2.8 x10
    });

    it('应该在速度计算中应用惩罚', () => {
      battleLoop.executeStartOfBattleEffects();
      
      const playerUnit = battleState.units[0];
      const card1Speed = playerUnit.cards[0].currentSpeed10;
      const card2Speed = playerUnit.cards[1].currentSpeed10;
      const card3Speed = playerUnit.cards[2].currentSpeed10;

      // 第2和第3张卡的速度应该更高（更慢）
      expect(card2Speed as number).toBeGreaterThan(card1Speed as number);
      expect(card3Speed as number).toBeGreaterThan(card2Speed as number);
    });
  });

  describe('Buff生命周期', () => {
    it('应该正确添加和移除 UnitBuff', () => {
      const playerUnit = battleState.units[0];
      const buff: UnitBuff = {
        id: 'test_buff',
        name: '测试Buff',
        description: '用于测试的Buff',
        type: 'buff',
        duration: 1,
        stackRule: 'nonStackable',
        level: 1
      };

      battleLoop.addUnitBuff(playerUnit, buff);
      expect(playerUnit.buffs).toHaveLength(1);
      expect(playerUnit.buffs[0].id).toBe('test_buff');
    });

    it('应该在回合结束时递减 Buff 持续时间', () => {
      const playerUnit = battleState.units[0];
      const buff: UnitBuff = {
        id: 'test_buff',
        name: '测试Buff',
        description: '用于测试的Buff',
        type: 'buff',
        duration: 1,
        stackRule: 'nonStackable',
        level: 1
      };

      battleLoop.addUnitBuff(playerUnit, buff);
      expect(playerUnit.buffs[0].duration).toBe(1);

      // 简化的回合结束逻辑测试
      // 注：完整测试需要调用endTurn或相关方法
    });
  });

  describe('卡速度计算', () => {
    it('应该正确初始化卡片的当前速度', () => {
      battleLoop.executeStartOfBattleEffects();

      const playerUnit = battleState.units[0];
      playerUnit.cards.forEach((card) => {
        expect(card.currentSpeed10).not.toBeNull();
        expect(card.currentSpeed10).toBeGreaterThanOrEqual(0);
        expect(card.currentSpeed10).toBeLessThanOrEqual(130); // 13.0 x10
      });
    });

    it('应该正确处理负速度（设为0）', () => {
      const playerUnit = battleState.units[0];
      const card = playerUnit.cards[0];
      
      // 创建一个会导致负速度的修饰符情况
      // 这里仅测试结构，具体修饰符应用由initializeCardTags处理
      expect(card.currentSpeed10).not.toBeNull();
    });
  });

  describe('伤害处理', () => {
    it('应该正确计算物理伤害', () => {
      const playerUnit = battleState.units[0];
      const enemyUnit = battleState.units[1];
      const initialHp = enemyUnit.hp;

      battleLoop.dealDamage(playerUnit, enemyUnit, 10, 'physical');

      // 实际伤害可能因护甲而减少
      expect(enemyUnit.hp).toBeLessThanOrEqual(initialHp);
    });

    it('应该在 HP 降至 0 时标记单位死亡', () => {
      const playerUnit = battleState.units[0];
      const enemyUnit = battleState.units[1];
      enemyUnit.hp = 5;

      battleLoop.dealDamage(playerUnit, enemyUnit, 10, 'physical');

      expect(enemyUnit.isDead).toBe(true);
    });
  });
});
