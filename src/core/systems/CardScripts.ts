import { BattleState, BattleUnit } from '../domain/Battle';
import { CardInstance } from '../domain/Card';
import { BattleLoop } from './BattleLoop';
import buffsData from '../../data/buffs.json';

// Create a map for quick lookup
const buffDefs = new Map(buffsData.map(b => [b.id, b]));

export type CardScript = (source: BattleUnit, targets: BattleUnit[], battle: BattleState, card: CardInstance) => void;

// Helper to get base buff data
const getBuffDef = (id: string) => {
    const def = buffDefs.get(id);
    if (!def) throw new Error(`Buff definition not found: ${id}`);
    return def as any;
};

export const CardScripts: Record<string, (loop: BattleLoop, source: BattleUnit, targets: BattleUnit[]) => void> = {
  
  // Thrust (突)
  "thrust": (loop, source, targets) => {
    targets.forEach(target => {
        loop.dealDamage(source, target, 3, 'physical');
    });
    targets.forEach(target => {
        const def = getBuffDef('slow');
        loop.addBuff(target, {
            ...def,
            value: 1,
            duration: 99
        });
    });
  },

  // Parry (镇)
  "parry": (loop, source, _targets) => {
    loop.addArmor(source, 4);
  },

  // Charge (蓄)
  "charge": (loop, source, _targets) => {
    if (source.buffs.some(b => b.id === 'charge')) return;
    const def = getBuffDef('charge');
    loop.addBuff(source, {
      ...def,
      value: 2,
      duration: 99
    });
  },

  // Stab (刺)
  "stab": (loop, source, targets) => {
    targets.forEach(target => {
      loop.dealDamage(source, target, 3, 'physical');
      const def = getBuffDef('bleed');
      loop.addBuff(target, {
        ...def,
        value: 1,
        duration: 1
      });
    });
  },

  // Slash (斩)
  "slash": (loop, source, targets) => {
    targets.forEach(target => {
      loop.dealDamage(source, target, 6, 'physical');
    });
  },

  // Flick (撩)
  "flick": (loop, source, targets) => {
    targets.forEach(target => {
      loop.dealDamage(source, target, 2, 'physical');
      
      const def = getBuffDef('slow');
      // Add 3 stacks
          loop.addBuff(target, {
            ...def,
            value: 3,
            duration: 99
          });
    });
  },

  // Ambush (伏)
  "ambush": (loop, source, _targets) => {
    loop.addArmor(source, 12);
  },

  // Sweep (扫)
  "sweep": (loop, source, targets) => {
    targets.forEach(target => {
        loop.dealDamage(source, target, 3, 'physical');
        loop.dealDamage(source, target, 3, 'physical');
        loop.dealDamage(source, target, 3, 'physical');
    });
  },

  // Throw (摔)
  "throw": (loop, source, targets) => {
    targets.forEach(target => {
      loop.dealDamage(source, target, 5, 'physical');
      const def = getBuffDef('stun'); // Changed from concussion to stun
      loop.addBuff(target, {
        ...def,
        value: 2, // Stun level 2 (Speed +2)
        duration: 2
      });
    });
  },

  // Concentrate (凝)
  "concentrate": (loop, source, _targets) => {
     const def = getBuffDef('focus');
     loop.addBuff(source, {
       ...def,
       value: 1.5,
       duration: 99
     });
  }
};
