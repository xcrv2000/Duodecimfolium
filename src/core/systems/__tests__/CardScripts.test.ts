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

  const createCardInstance = (
    id: string,
    scriptId: string,
    speed10: number | null,
    tags: string[] = ['攻击', '物理']
  ): any => ({
    instanceId: id,
    ownerId: playerUnit.id,
    baseSpeed10: speed10,
    currentSpeed10: speed10,
    deckSpeedPenalty: 0,
    permanentSpeedModifier: 0,
    tagsRuntime: [...tags],
    modifiers: [],
    buffs: [],
    factoryBuffs: [],
    factory: {
      id,
      name: id,
      description: id,
      effectDescription: id,
      packId: 'test',
      rarity: 1,
      speed: speed10 === null ? null : speed10 / 10,
      scriptId,
      tags
    }
  });

  describe('卡脚本注册', () => {
    it('应该包含所有已定义的卡脚本', () => {
      const expectedCards = [
        'thrust', 'parry', 'charge', 'stab', 'slash', 'flick', 'ambush', 'sweep',
        'throw', 'concentrate', 'fireball', 'ice_orb', 'stone_orb', 'clear_oil',
        'bright_oil', 'extend_slash', 'majesty', 'deterrence', 'spin_slash',
        'spin_slash_token', 'upward_slash', 'upward_slash_token', 'calm_mind',
        'wind_thunder_strike', 'ration', 'whetstone', 'flick_thrust', 'moonlight_slash',
        'quick_start', 'life_recorder', 'kinetic_recovery_device', 'big_torque_gear',
        'speed_magician', 'cancel', 'kinetic_impact', 'super_kinetic_impact',
        'rush_attack', 'superluminal', 'high_speed_engine', 'overload_cargo',
        'rebellion', 'spirit_song', 'substitute', 'iron_wave', 'counterweight',
        'storm', 'swing_punch', 'curiosity', 'counter_magic', 'seize_initiative',
        'moonlight_guidance', 'moonlight_bombard'
      ];

      expectedCards.forEach((cardId) => {
        expect(CardScripts[cardId]).toBeDefined();
        expect(typeof CardScripts[cardId]).toBe('function');
      });
    });

    it('脚本总数应至少覆盖已声明清单', () => {
      const scriptCount = Object.keys(CardScripts).length;
      expect(scriptCount).toBeGreaterThanOrEqual(52);
    });
  });

  describe('0.3.5 新卡脚本行为', () => {
    it('quick_start 应降低下一张卡速度并移除自身', () => {
      const quickStart = createCardInstance('quick_start_card', 'quick_start', 10, ['辅助']);
      const nextCard = createCardInstance('next_card', 'slash', 60, ['攻击', '物理']);
      playerUnit.cards = [quickStart, nextCard];
      (battleLoop as any).currentCard = quickStart;

      CardScripts.quick_start(battleLoop, playerUnit, [playerUnit]);

      expect(nextCard.currentSpeed10).toBe(36);
      expect(playerUnit.cards.some((c: any) => c.instanceId === quickStart.instanceId)).toBe(false);
    });

    it('life_recorder 应先记录生命，再将生命重设为记录值并移除本卡', () => {
      const lifeRecorder = createCardInstance('life_recorder_card', 'life_recorder', 60, ['辅助']);
      playerUnit.cards = [lifeRecorder];
      playerUnit.hp = 72;

      CardScripts.life_recorder(battleLoop, playerUnit, [playerUnit]);
      expect(playerUnit.buffs.find((b) => b.id === 'life_record')?.level).toBe(72);

      playerUnit.hp = 40;
      (battleLoop as any).currentCard = lifeRecorder;
      CardScripts.life_recorder(battleLoop, playerUnit, [playerUnit]);

      expect(playerUnit.hp).toBe(72);
      expect(playerUnit.buffs.find((b) => b.id === 'life_record')).toBeUndefined();
      expect(playerUnit.cards.length).toBe(0);
    });

    it('kinetic_recovery_device 应施加可叠加 buff', () => {
      CardScripts.kinetic_recovery_device(battleLoop, playerUnit, [playerUnit]);
      CardScripts.kinetic_recovery_device(battleLoop, playerUnit, [playerUnit]);

      const buff = playerUnit.buffs.find((b) => b.id === 'kinetic_recovery_device');
      expect(buff).toBeDefined();
      expect(buff?.level).toBe(2);
    });

    it('big_torque_gear 应让下一张攻击卡速度+3并使下一次攻击伤害+6', () => {
      const attackCard = createCardInstance('atk', 'slash', 50, ['攻击', '物理']);
      playerUnit.cards = [attackCard];

      CardScripts.big_torque_gear(battleLoop, playerUnit, [playerUnit]);

      expect(attackCard.currentSpeed10).toBe(80);

      const hpBefore = enemyUnit.hp;
      battleLoop.dealDamage(playerUnit, enemyUnit, 3, 'physical');
      expect(enemyUnit.hp).toBe(hpBefore - 9);
      expect(playerUnit.buffs.find((b) => b.id === 'big_torque_gear')).toBeUndefined();
    });

    it('speed_magician 应交换最快与最慢卡的速度', () => {
      const fast = createCardInstance('fast', 'slash', 20, ['攻击', '物理']);
      const slow = createCardInstance('slow', 'slash', 90, ['攻击', '物理']);
      const mid = createCardInstance('mid', 'slash', 50, ['攻击', '物理']);
      playerUnit.cards = [fast, slow, mid];

      CardScripts.speed_magician(battleLoop, playerUnit, [playerUnit]);

      expect(fast.currentSpeed10).toBe(90);
      expect(slow.currentSpeed10).toBe(20);
      expect(mid.currentSpeed10).toBe(50);
    });

    it('cancel 应提高比当前卡更慢中最接近的一张卡速度+2', () => {
      const current = createCardInstance('cancel_current', 'cancel', 70, ['辅助']);
      const c1 = createCardInstance('c1', 'slash', 40, ['攻击', '物理']);
      const c2 = createCardInstance('c2', 'slash', 60, ['攻击', '物理']);
      playerUnit.cards = [current, c1, c2];
      (battleLoop as any).currentCard = current;

      CardScripts.cancel(battleLoop, playerUnit, [playerUnit]);

      expect(c1.currentSpeed10).toBe(40);
      expect(c2.currentSpeed10).toBe(80);
    });

    it('kinetic_impact 伤害应为当前速度+3且不低于3', () => {
      const kineticImpact = createCardInstance('kinetic', 'kinetic_impact', 60, ['攻击', '物理']);
      (battleLoop as any).currentCard = kineticImpact;

      const hpBefore = enemyUnit.hp;
      CardScripts.kinetic_impact(battleLoop, playerUnit, [enemyUnit]);

      expect(enemyUnit.hp).toBe(hpBefore - 9);
    });

    it('super_kinetic_impact 应按速度*2伤害并在低于6时自伤', () => {
      const superKinetic = createCardInstance('super_kinetic', 'super_kinetic_impact', 20, ['攻击', '物理']);
      (battleLoop as any).currentCard = superKinetic;

      const enemyHpBefore = enemyUnit.hp;
      const playerHpBefore = playerUnit.hp;
      CardScripts.super_kinetic_impact(battleLoop, playerUnit, [enemyUnit]);

      expect(enemyUnit.hp).toBe(enemyHpBefore - 4);
      expect(playerUnit.hp).toBe(playerHpBefore - 4);
    });

    it('rush_attack 应造成2伤害并使本卡速度+2，回合结束后恢复', () => {
      const rush = createCardInstance('rush', 'rush_attack', 50, ['攻击', '物理']);
      playerUnit.cards = [rush];
      (battleLoop as any).currentCard = rush;

      const hpBefore = enemyUnit.hp;
      CardScripts.rush_attack(battleLoop, playerUnit, [enemyUnit]);

      expect(enemyUnit.hp).toBe(hpBefore - 2);
      expect(rush.currentSpeed10).toBe(70);

      battleLoop.endTurn();
      expect(rush.currentSpeed10).toBe(50);
    });

    it('superluminal 应触发当前最慢卡的脚本效果', () => {
      const superluminal = createCardInstance('superluminal', 'superluminal', 100, ['辅助']);
      const slowAttack = createCardInstance('slow_attack', 'slash', 120, ['攻击', '物理']);
      playerUnit.cards = [superluminal, slowAttack];
      (battleLoop as any).currentCard = superluminal;

      const hpBefore = enemyUnit.hp;
      CardScripts.superluminal(battleLoop, playerUnit, [playerUnit]);

      expect(enemyUnit.hp).toBe(hpBefore - 6);
    });

    it('superluminal 触发 super_kinetic_impact 时应使用被触发卡速度', () => {
      const superluminal = createCardInstance('superluminal', 'superluminal', 100, ['辅助']);
      const superKinetic = createCardInstance('super_kinetic', 'super_kinetic_impact', 40, ['攻击', '物理']);
      playerUnit.cards = [superluminal, superKinetic];
      (battleLoop as any).currentCard = superluminal;

      const hpBefore = enemyUnit.hp;
      CardScripts.superluminal(battleLoop, playerUnit, [playerUnit]);

      // 被触发卡速度=4，伤害应为 4*2=8；若错误使用超光速速度10则会是20
      expect(enemyUnit.hp).toBe(hpBefore - 8);
    });
  });

  describe('0.3.5 新护具与战斗循环联动', () => {
    it('high_speed_engine 应使受到伤害+1，且打牌后下一张卡速度-0.4', () => {
      const engine = createCardInstance('engine', 'high_speed_engine', null, ['护具']);
      const played = createCardInstance('played', 'slash', 30, ['攻击', '物理']);
      const next = createCardInstance('next', 'slash', 60, ['攻击', '物理']);
      playerUnit.cards = [engine, played, next];

      battleLoop.executeStartOfBattleEffects();

      const hpBefore = playerUnit.hp;
      battleLoop.dealDamage(enemyUnit, playerUnit, 5, 'physical');
      expect(playerUnit.hp).toBe(hpBefore - 6);

      (battleLoop as any).currentCard = played;
      (battleLoop as any).applyPerCardPlayEffects(playerUnit, played);
      expect(next.currentSpeed10).toBe(56);
    });

    it('overload_cargo 应使受到伤害+1、造成伤害+2，且打牌后下一张卡速度+0.4', () => {
      const cargo = createCardInstance('cargo', 'overload_cargo', null, ['护具']);
      const played = createCardInstance('played', 'slash', 30, ['攻击', '物理']);
      const next = createCardInstance('next', 'slash', 60, ['攻击', '物理']);
      playerUnit.cards = [cargo, played, next];

      battleLoop.executeStartOfBattleEffects();

      const enemyHpBefore = enemyUnit.hp;
      battleLoop.dealDamage(playerUnit, enemyUnit, 3, 'physical');
      expect(enemyUnit.hp).toBe(enemyHpBefore - 5);

      const playerHpBefore = playerUnit.hp;
      battleLoop.dealDamage(enemyUnit, playerUnit, 4, 'physical');
      expect(playerUnit.hp).toBe(playerHpBefore - 5);

      (battleLoop as any).currentCard = played;
      (battleLoop as any).applyPerCardPlayEffects(playerUnit, played);
      expect(next.currentSpeed10).toBe(64);
    });

    it('kinetic_recovery_device 在打牌后应按 tick 与基础速度差获得护甲', () => {
      const kinetic = createCardInstance('kinetic_device', 'kinetic_recovery_device', 40, ['辅助']);
      const played = createCardInstance('played', 'slash', 60, ['攻击', '物理']);
      playerUnit.cards = [kinetic, played];
      battleState.tick = 2;

      CardScripts.kinetic_recovery_device(battleLoop, playerUnit, [playerUnit]);
      (battleLoop as any).applyPerCardPlayEffects(playerUnit, played);

      const armor = playerUnit.buffs.find((b) => b.id === 'armor');
      expect(armor?.level).toBe(4);
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

    it('暗影步提供的穿甲应使下一次攻击无视护甲', () => {
      CardScripts.shadow_step(battleLoop, playerUnit, [playerUnit]);
      battleLoop.addArmor(enemyUnit, 10);

      const hpBefore = enemyUnit.hp;
      const armorBefore = enemyUnit.buffs.find((b) => b.id === 'armor')?.level;

      const slashCard = createCardInstance('slash_card', 'slash', 60, ['攻击', '物理']);
      (battleLoop as any).currentCard = slashCard;
      CardScripts.slash(battleLoop, playerUnit, [enemyUnit]);

      const armorAfter = enemyUnit.buffs.find((b) => b.id === 'armor')?.level;
      expect(enemyUnit.hp).toBe(hpBefore - 6);
      expect(armorAfter).toBe(armorBefore);
      expect(playerUnit.buffs.find((b) => b.id === 'pierce')).toBeUndefined();
    });

    it('暗影步穿甲在多段攻击中应仅首段生效', () => {
      CardScripts.shadow_step(battleLoop, playerUnit, [playerUnit]);
      battleLoop.addArmor(enemyUnit, 10);

      const hpBefore = enemyUnit.hp;
      const armorBefore = enemyUnit.buffs.find((b) => b.id === 'armor')?.level || 0;

      const sweepCard = createCardInstance('sweep_card', 'sweep', 90, ['攻击', '物理']);
      (battleLoop as any).currentCard = sweepCard;
      CardScripts.sweep(battleLoop, playerUnit, [enemyUnit]);

      const armorAfter = enemyUnit.buffs.find((b) => b.id === 'armor')?.level || 0;
      // 首段穿甲直伤3，后两段各3点被护甲吸收
      expect(enemyUnit.hp).toBe(hpBefore - 3);
      expect(armorAfter).toBe(armorBefore - 6);
      expect(playerUnit.buffs.find((b) => b.id === 'pierce')).toBeUndefined();
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

    it('威仪只应影响首个魔法命中', () => {
      CardScripts.majesty(battleLoop, playerUnit, [enemyUnit]);
      const hpBefore = enemyUnit.hp;

      battleLoop.dealDamage(playerUnit, enemyUnit, 5, 'magical', ['魔法']);
      battleLoop.dealDamage(playerUnit, enemyUnit, 5, 'magical', ['魔法']);

      expect(enemyUnit.hp).toBe(hpBefore - 15);
    });

    it('震慑只应影响首个物理命中', () => {
      CardScripts.deterrence(battleLoop, playerUnit, [enemyUnit]);
      const hpBefore = enemyUnit.hp;

      battleLoop.dealDamage(playerUnit, enemyUnit, 5, 'physical');
      battleLoop.dealDamage(playerUnit, enemyUnit, 5, 'physical');

      expect(enemyUnit.hp).toBe(hpBefore - 15);
    });

    it('拉克希尔之仪应作用于发动者自身', () => {
      const enemyHpBefore = enemyUnit.hp;
      CardScripts.lakshir_ritual(battleLoop, enemyUnit, [playerUnit]);

      expect(enemyUnit.hp).toBe(enemyHpBefore - 12);
      const enemyArmor = enemyUnit.buffs.find((b) => b.id === 'armor');
      const playerArmor = playerUnit.buffs.find((b) => b.id === 'armor');
      expect(enemyArmor?.level).toBe(24);
      expect(playerArmor).toBeUndefined();
    });
  });
});
