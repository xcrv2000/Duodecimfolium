import { BattleLoop } from './BattleLoop';
import { BattleUnit, UnitBuff } from '../domain/Battle';

type CardScript = (loop: BattleLoop, source: BattleUnit, targets: BattleUnit[]) => void;

export const CardScripts: Record<string, CardScript> = {
  // 1. Thrust (突)
  thrust: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    
    // Deal 3 Damage
    loop.dealDamage(source, target, 3, 'physical');
    
    // Find Next Card & Slow (+10)
    // "若目标单位在本回合不存在后续卡实例，则该附加效果无效。"
    const nextCard = loop.findNextCardOnTimeline(target);
    if (nextCard) {
        loop.modifyCardSpeed(nextCard, 10); // +1.0 Speed
    }
  },
  
  // 2. Parry (镇)
  parry: (loop, source, targets) => {
      // Default target logic might pick enemy if no defense tag logic (but I added it in BattleLoop)
      // BattleLoop.findTargets handles '防御' -> [source].
      const target = targets[0] || source;
      loop.addArmor(target, 4);
  },
  
  // 3. Charge (蓄)
  charge: (loop, source, targets) => {
      const target = targets[0] || source;
      
      const buff: UnitBuff = {
          id: 'charge',
          name: '蓄势',
          description: '下一次攻击造成的伤害翻倍，且速度+1。',
          duration: 1, // Until turn end
          stackRule: 'nonStackable',
          level: 1,
          type: 'buff',
          onAttack: (unit, _t, damage, _battle) => {
              // Double damage
              // Remove buff manually (consume)
              const idx = unit.buffs.findIndex(b => b.id === 'charge');
              if (idx !== -1) unit.buffs.splice(idx, 1);
              return damage * 2;
          }
      };
      loop.addUnitBuff(target, buff);
  },
  
  // 4. Stab (刺)
  stab: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 3, 'physical');
      
      // Bleed Logic is handled in BattleLoop.dealDamage, we just apply the buff.
      const bleed: UnitBuff = {
          id: 'bleed',
          name: '流血',
          description: '受到未被护甲抵消的物理伤害增加{level}点。',
          duration: 1,
          stackRule: 'stackable',
          level: 1,
          type: 'debuff'
      };
      loop.addUnitBuff(target, bleed);
  },
  
  // 5. Slash (斩)
  slash: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 6, 'physical');
  },
  
  // 6. Flick (撩)
  flick: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 2, 'physical');
      const nextCard = loop.findNextCardOnTimeline(target);
      if (nextCard) {
          loop.modifyCardSpeed(nextCard, 30); // +3.0 Speed
      }
  },
  
  // 7. Ambush (伏)
  ambush: (loop, source, targets) => {
      const target = targets[0] || source;
      loop.addArmor(target, 12);
  },
  
  // 8. Sweep (扫)
  sweep: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      // 3 times 3 damage
      loop.dealDamage(source, target, 3, 'physical');
      if (target.isDead) return;
      loop.dealDamage(source, target, 3, 'physical');
      if (target.isDead) return;
      loop.dealDamage(source, target, 3, 'physical');
  },
  
  // 9. Throw (摔)
  throw: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 5, 'physical');
      
      const stun: UnitBuff = {
          id: 'stun',
          name: '眩晕',
          description: '下回合所有卡牌速度+{level}。',
          duration: 2, // Current + Next
          stackRule: 'nonStackable',
          level: 20, // +2.0 Speed (x10)
          type: 'debuff'
      };
      loop.addUnitBuff(target, stun);
  },
  
  // 10. Concentrate (凝)
  concentrate: (loop, source, targets) => {
      const target = targets[0] || source;
      const focus: UnitBuff = {
          id: 'focus',
          name: '专注',
          description: '下一次攻击伤害增加50%。',
          duration: 1,
          stackRule: 'nonStackable',
          level: 1,
          type: 'buff',
          onAttack: (unit, _t, dmg) => {
              // +50%
              // Remove self
              const idx = unit.buffs.findIndex(b => b.id === 'focus');
              if (idx !== -1) unit.buffs.splice(idx, 1);
              return Math.floor(dmg * 1.5);
          }
      };
      loop.addUnitBuff(target, focus);
  }
};
