import { describe, it, expect, beforeEach } from 'vitest';
import { CardScripts } from '../CardScripts';
import { BattleLoop } from '../BattleLoop';
import { BattleState, BattleUnit } from '../../domain/Battle';
import { RNG } from '../../../utils/rng';

describe('CardScripts pack4', () => {
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

  it('卡包4（巡林101/信仰萌发之地）脚本应全部可用', () => {
    const pack4Scripts = [
      'hound_whistle_fast',
      'hound_whistle',
      'hawk_whistle',
      'hound_bite_token',
      'hawk_swoop_token',
      'coordinated_pounce',
      'full_power_bite_token',
      'guard_front',
      'inspire_summon',
      'care_summon',
      'tracking_order',
      'rally_hunt',
      'mark_shot',
      'mark_shot_sweep',
      'mark_shot_break',
      'disrupt_order',
      'disrupt_token',
      'blessing_prayer',
      'blessing_infusion',
      'blessing_accept',
      'blessing_stay',
      'glimmer_heal',
      'holy_heal',
      'radiant_touch',
      'holy_aoe_heal',
      'flow_armor',
      'light_retribution',
      'light_departure',
      'hibernate'
    ];

    pack4Scripts.forEach((scriptId) => {
      expect(CardScripts[scriptId]).toBeDefined();
      expect(typeof CardScripts[scriptId]).toBe('function');
    });
  });

  it('hibernate 应删除目标下一张卡实例与自身实例，且跨回合不恢复', () => {
    const hibernate = createCardInstance('hibernate_card', 'hibernate', 10, ['辅助']);
    const nextCard = createCardInstance('next_card', 'slash', 30, ['攻击', '物理']);
    const laterCard = createCardInstance('later_card', 'slash', 60, ['攻击', '物理']);
    playerUnit.cards = [hibernate, nextCard, laterCard];
    (battleLoop as any).currentCard = hibernate;

    CardScripts.hibernate(battleLoop, playerUnit, [playerUnit]);

    expect(playerUnit.cards.some((c: any) => c.instanceId === nextCard.instanceId)).toBe(false);
    expect(playerUnit.cards.some((c: any) => c.instanceId === hibernate.instanceId)).toBe(false);
    expect(playerUnit.cards.some((c: any) => c.instanceId === laterCard.instanceId)).toBe(true);

    battleLoop.endTurn();
    expect(playerUnit.cards.some((c: any) => c.instanceId === nextCard.instanceId)).toBe(false);
    expect(playerUnit.cards.some((c: any) => c.instanceId === hibernate.instanceId)).toBe(false);
  });

  it('blessing_stay 应在回合结束时保留一半庇佑层数（向下取整）', () => {
    playerUnit.buffs.push({
      id: 'blessing',
      name: '庇佑',
      description: '每个tick结束时回复生命。',
      duration: 1,
      stackRule: 'stackable',
      level: 5,
      type: 'buff'
    });

    CardScripts.blessing_stay(battleLoop, playerUnit, [playerUnit]);
    battleLoop.endTurn();

    const blessing = playerUnit.buffs.find((b) => b.id === 'blessing');
    expect(blessing).toBeDefined();
    expect(blessing?.level).toBe(2);
    expect(blessing?.duration).toBeGreaterThan(0);
  });

  it('rally_hunt 应先造成4点伤害，再由每个召唤物追击6点', () => {
    const summonA: BattleUnit = {
      id: 'summon_a',
      name: '猎犬',
      hp: 1,
      maxHp: 1,
      initialDeckSize: 1,
      team: 'player',
      cards: [],
      buffs: [],
      isDead: false,
      isSummon: true,
      summonOwnerId: playerUnit.id
    };
    const summonB: BattleUnit = {
      id: 'summon_b',
      name: '猎鹰',
      hp: 1,
      maxHp: 1,
      initialDeckSize: 1,
      team: 'player',
      cards: [],
      buffs: [],
      isDead: false,
      isSummon: true,
      summonOwnerId: playerUnit.id
    };
    battleState.units.push(summonA, summonB);

    const hpBefore = enemyUnit.hp;
    CardScripts.rally_hunt(battleLoop, playerUnit, [enemyUnit]);

    expect(enemyUnit.hp).toBe(hpBefore - 16);
  });
});
