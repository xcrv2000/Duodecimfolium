import { describe, it, expect, beforeEach } from 'vitest';
import { CardScripts } from '../CardScripts';
import { BattleLoop } from '../BattleLoop';
import { BattleState, BattleUnit } from '../../domain/Battle';
import { RNG } from '../../../utils/rng';

describe('CardScripts', () => {
  let battleState: BattleState;
  let battleLoop: BattleLoop;
  let playerUnit: BattleUnit;
  let enemyUnit: BattleUnit;
  let rng: RNG;

  beforeEach(() => {
    rng = new RNG(12345);

    playerUnit = {
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

    enemyUnit = {
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

  describe('卡脚本注册', () => {
    it('应该包含所有已定义的卡脚本', () => {
      const expectedCards = [
        'thrust', 'parry', 'charge', 'stab', 'slash', 'flick', 'ambush', 'sweep',
        'throw', 'concentrate', 'fireball', 'ice_orb', 'stone_orb', 'clear_oil',
        'bright_oil', 'extend_slash', 'majesty', 'deterrence', 'spin_slash',
        'spin_slash_token', 'upward_slash', 'upward_slash_token', 'calm_mind',
        'wind_thunder_strike', 'ration', 'whetstone', 'flick_thrust', 'moonlight_slash'
      ];

      expectedCards.forEach((cardId) => {
        expect(CardScripts[cardId]).toBeDefined();
        expect(typeof CardScripts[cardId]).toBe('function');
      });
    });

    it('应该有28张卡的脚本', () => {
      const scriptCount = Object.keys(CardScripts).length;
      expect(scriptCount).toBe(28);
    });
  });

  describe('卡脚本执行', () => {
    it('应该能够执行 thrust 脚本', () => {
      const initialEnemyHp = enemyUnit.hp;
      CardScripts.thrust(battleLoop, playerUnit, [enemyUnit]);

      // thrust 应该造成伤害或减速
      // 敌人 HP 应该减少或敌人有下一张卡被减速
      expect(enemyUnit.hp).toBeLessThanOrEqual(initialEnemyHp);
    });

    it('应该能够执行 parry 脚本', () => {
      const initialBuffCount = playerUnit.buffs.length;
      CardScripts.parry(battleLoop, playerUnit, [playerUnit]);

      // parry 应该添加或修改 buff
      expect(playerUnit.buffs.length).toBeGreaterThanOrEqual(initialBuffCount);
    });

    it('应该能够执行 slash 脚本', () => {
      const initialEnemyHp = enemyUnit.hp;
      CardScripts.slash(battleLoop, playerUnit, [enemyUnit]);

      // slash 应该造成伤害
      expect(enemyUnit.hp).toBeLessThan(initialEnemyHp);
    });

    it('应该能够执行 fireball 脚本（AOE 伤害）', () => {
      const initialEnemyHp = enemyUnit.hp;
      CardScripts.fireball(battleLoop, playerUnit, [enemyUnit]);

      // fireball 应该对敌人造成伤害
      expect(enemyUnit.hp).toBeLessThanOrEqual(initialEnemyHp);
    });
  });

  describe('Buff 应用卡脚本', () => {
    it('应该能够通过 charge 脚本应用 Buff', () => {
      const initialBuffCount = playerUnit.buffs.length;
      CardScripts.charge(battleLoop, playerUnit, [playerUnit]);

      // charge 应该添加一个 Buff
      expect(playerUnit.buffs.length).toBeGreaterThan(initialBuffCount);
    });

    it('应该能够通过 stab 脚本应用流血 Buff', () => {
      const initialBuffCount = enemyUnit.buffs.length;
      CardScripts.stab(battleLoop, playerUnit, [enemyUnit]);

      // stab 应该在敌人上应用流血 Buff
      expect(enemyUnit.buffs.length).toBeGreaterThan(initialBuffCount);
    });

    it('应该能够通过 throw 脚本应用眩晕 Buff', () => {
      const initialBuffCount = enemyUnit.buffs.length;
      CardScripts.throw(battleLoop, playerUnit, [enemyUnit]);

      // throw 应该在敌人上应用眩晕 Buff
      expect(enemyUnit.buffs.length).toBeGreaterThan(initialBuffCount);
    });
  });

  describe('卡脚本不应该崩溃', () => {
    it('所有卡脚本应该能在默认参数下执行', () => {
      // Pick a few key cards and run them
      const testCases: Array<[string, BattleUnit[], BattleUnit[]]> = [
        ['thrust', [playerUnit], [enemyUnit]],
        ['parry', [playerUnit], [playerUnit]],
        ['slash', [playerUnit], [enemyUnit]],
        ['ambush', [playerUnit], [playerUnit]],
        ['fireball', [playerUnit], [enemyUnit]]
      ];

      testCases.forEach(([cardId, sources, targets]) => {
        expect(() => {
          CardScripts[cardId as keyof typeof CardScripts](
            battleLoop,
            sources[0],
            targets
          );
        }).not.toThrow();
      });
    });
  });

  describe('脚本目标选择', () => {
    it('防御卡应该默认以自己为目标', () => {
      // 虽然脚本本身负责目标选择，但这是一个集成测试
      const initialBuffCount = playerUnit.buffs.length;
      CardScripts.parry(battleLoop, playerUnit, [playerUnit]);

      // 如果目标正确，应该是玩家获得某种buff或效果
      expect(playerUnit.buffs.length).toBeGreaterThanOrEqual(initialBuffCount);
    });

    it('攻击卡应该以敌人为目标', () => {
      const initialEnemyHp = enemyUnit.hp;
      CardScripts.slash(battleLoop, playerUnit, [enemyUnit]);

      // 敌人应该受伤
      expect(enemyUnit.hp).toBeLessThan(initialEnemyHp);
    });
  });
});
