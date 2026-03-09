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
      
      const buff = {
          id: 'charge',
          level: 1,
          onAttack: (unit, _t, damage, _battle) => {
              // Double damage
              // Remove buff manually (consume)
              const idx = unit.buffs.findIndex(b => b.id === 'charge');
              if (idx !== -1) unit.buffs.splice(idx, 1);
              return damage * 2;
          }
      } as Partial<UnitBuff>;
      loop.addUnitBuff(target, buff as UnitBuff);
  },
  
  // 4. Stab (刺)
  stab: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 3, 'physical');
      
      // Bleed Logic is handled in BattleLoop.dealDamage, we just apply the buff.
      const bleed = {
          id: 'bleed',
          level: 1
      } as Partial<UnitBuff>;
      loop.addUnitBuff(target, bleed as UnitBuff);
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
      
      const stun = {
          id: 'stun',
          level: 2 // +2.0 Speed (x10)
      } as Partial<UnitBuff>;
      loop.addUnitBuff(target, stun as UnitBuff);
  },
  
  // 10. Concentrate (凝)
  concentrate: (loop, source, targets) => {
      const target = targets[0] || source;
      const focus = {
          id: 'focus',
          level: 1,
          onAttack: (unit, _t, dmg) => {
              // +50%
              // Remove self
              const idx = unit.buffs.findIndex(b => b.id === 'focus');
              if (idx !== -1) unit.buffs.splice(idx, 1);
              return Math.floor(dmg * 1.5);
          }
      } as Partial<UnitBuff>;
      loop.addUnitBuff(target, focus as UnitBuff);
  },

  // 11. Fireball (火球)
  fireball: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      
      // Main Target: 6 Magic/Fire Damage
      loop.dealDamage(source, target, 6, 'magical');
      
      // AOE: 3 Magic/Fire Damage to others
      const others = loop.getAllUnits().filter(u => u.team !== source.team && u.id !== target.id && !u.isDead);
      others.forEach(u => {
          loop.dealDamage(source, u, 3, 'magical');
      });
  },

  // 12. Ice Orb (冰……球？)
  ice_orb: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      
      // 6 Damage (Phys + Mag/Ice). Treated as Magical for now or mixed?
      // "Physical + Magic/Ice" - BattleLoop dealDamage currently takes 'physical' or 'magical'.
      // If it's mixed, it triggers both? Or just one?
      // Simplified: Magical (Ice) but maybe checks physical armor too? 
      // Docs say: "Simultaneously has tags".
      // Let's treat as Magical for resistance but Physical for Armor?
      // Or just 'magical' as it's an orb.
      loop.dealDamage(source, target, 6, 'magical');

      // Slow all subsequent attack cards of target this turn by +1 speed.
      
      // Update: Target all subsequent ATTAKC cards
      const currentTick = loop.getCurrentTick();
      const targetCards = target.cards.filter(c => 
          c.currentSpeed10 !== null && 
          c.currentSpeed10 > (currentTick * 10) &&
          c.tagsRuntime?.includes('攻击')
      );
      
        targetCards.forEach(c => {
          loop.modifyCardSpeed(c, 10);
        });
  },

  // 13. Stone Orb (石球？？？)
  stone_orb: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      // 3 hits of 2 physical
      loop.dealDamage(source, target, 2, 'physical');
      if (target.isDead) return;
      loop.dealDamage(source, target, 2, 'physical');
      if (target.isDead) return;
      loop.dealDamage(source, target, 2, 'physical');
  },

  // 14. Clear Oil (清亮剑油)
  clear_oil: (loop, source, targets) => {
      const target = targets[0] || source; // Self
      // 给目标单位【清亮剑油】buff：下一次物理攻击后，那张卡从下回合起速度-2
      const buff: UnitBuff = {
          id: 'clear_oil_effect',
          name: '清亮剑油',
          description: '下一次物理攻击后，那张卡从下回合起速度-2。（至少为0）',
          duration: 999, // 战斗结束
          stackRule: 'nonStackable',
          level: 1,
          type: 'buff',
          // 在下一次物理攻击后触发，修改该卡的永久速度修正
          // 这是一个状态buff，需要在 BattleLoop 的 executeCard 中检查
          onAttack: (_unit, _target, damage, _state) => {
              // 仅物理攻击触发
              // 实际的速度修改需要在 BattleLoop.executeCard 中特殊处理
              return damage;
          }
      };
      loop.addUnitBuff(target, buff);
  },
  
  // 15. Bright Oil (明亮剑油)
  bright_oil: (loop, source, targets) => {
      const target = targets[0] || source;
      // 给目标单位【明亮剑油】buff：下一次物理攻击后，那张卡永久速度-3
      const buff: UnitBuff = {
          id: 'bright_oil_effect',
          name: '明亮剑油',
          description: '下一次物理攻击后，那张卡永久速度-3。（至少为0）',
          duration: 999,
          stackRule: 'nonStackable',
          level: 1,
          type: 'buff',
          // 与 clear_oil 相同，需要在 executeCard 中特殊处理
          onAttack: (_unit, _target, damage, _state) => {
              return damage;
          }
      };
      loop.addUnitBuff(target, buff);
  },

  // 16. Extend Slash (延势斩)
  extend_slash: (loop, source, _targets) => {
      // AOE all enemies
      const enemies = loop.getAllUnits().filter(u => u.team !== source.team && !u.isDead);
      enemies.forEach(u => {
          loop.dealDamage(source, u, 4, 'physical');
      });
  },

  // 17. Majesty (威仪)
  majesty: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 3, 'physical');

      let consumed = false;
      
      const debuff: UnitBuff = {
          id: 'majesty',
          name: '威仪',
          description: '下一次受到的魔法伤害翻倍。',
          duration: 1,
          stackRule: 'nonStackable',
          level: 1,
          type: 'debuff',
          onReceiveDamage: (_unit, damageInfo, _state) => {
              // Only double magical damage
              const hasMagicTag = damageInfo.tags.some(tag => tag.includes('魔法'));
              if (!consumed && hasMagicTag) {
                consumed = true;
                debuff.duration = 0;
                  return damageInfo.amount * 2;
              }
              return damageInfo.amount;
          }
      };
      loop.addUnitBuff(target, debuff);
  },

  // 18. Deterrence (震慑)
  deterrence: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 3, 'magical');

      let consumed = false;
      
      const debuff: UnitBuff = {
          id: 'deterrence',
          name: '震慑',
          description: '下一次受到的物理伤害翻倍。',
          duration: 1,
          stackRule: 'nonStackable',
          level: 1,
          type: 'debuff',
          onReceiveDamage: (_unit, damageInfo, _state) => {
              // Only double physical damage (not magical)
              const hasMagicTag = damageInfo.tags.some(tag => tag.includes('魔法'));
              if (!consumed && !hasMagicTag && damageInfo.type === 'physical') {
                consumed = true;
                debuff.duration = 0;
                  return damageInfo.amount * 2;
              }
              return damageInfo.amount;
          }
      };
      loop.addUnitBuff(target, debuff);
  },

  // 19. Spin Slash (回旋斩)
  spin_slash: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      const initialHp = target.hp;
      loop.dealDamage(source, target, 3, 'physical');
      
      // If damage dealt (HP reduced), spawn token.
      // Need to check if damage was dealt.
      // Simple check: target.hp < initialHp? Or just check if Armor blocked all?
      // "若该次伤害未被护甲完全格挡"
      // BattleLoop dealDamage logs this but doesn't return it.
      // Assuming if target lost HP, it wasn't fully blocked.
      if (target.hp < initialHp) {
          loop.spawnCard(source, 'spin_slash_token', 80); // Speed 8.0
      }
  },

  // 20. Spin Slash Token
  spin_slash_token: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 6, 'physical');
  },

  // 21. Upward Slash (上挑斩)
  upward_slash: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 4, 'physical');
      // Shuffle into deck? "向自身卡组中衍生"
      // "衍生一张...放入卡组" usually means add to deck for future?
      // Or add to current timeline?
      // "衍生" in this game context usually means "Add to current round timeline".
      // But "放入卡组" might mean permanent for battle?
      // Docs: "衍生 实际上是向本回合所在的时间点添加一个对应的卡实例" (for Spin Slash).
      // For Upward Slash: "向自身卡组中衍生" -> Maybe add to deck (next turn)?
      // Let's assume add to timeline for now, or check context.
      // "上挑斩·剑气" Speed 7.
      // If added to timeline, it plays this turn.
      loop.spawnCard(source, 'upward_slash_token', 70);
  },

  // 22. Upward Slash Token
  upward_slash_token: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 4, 'magical');
  },

  // 23. Calm Mind (气定神闲)
  calm_mind: (loop, source, targets) => {
      const target = targets[0] || source;
      const currentCard = (loop as any).currentCard;
      const buff: UnitBuff = {
          id: 'calm_mind',
          name: '气定神闲',
          description: '下一次魔法攻击重复结算5次，随后移除该攻击卡和本卡。',
          duration: 999, // Until used
          stackRule: 'nonStackable',
          level: 1,
          type: 'buff',
          sourceInstanceId: currentCard?.instanceId
      };
      loop.addUnitBuff(target, buff);
  },

  // 24. Wind Thunder Strike (风雷击)
  wind_thunder_strike: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 6, 'physical');
      
      // 本卡后续速度永久-1（至少为0）
      // 通过访问 loop 的 currentCard（假设已在 executeCard 中设置）
      const currentCard = (loop as any).currentCard;
      if (currentCard) {
          // 使用新的 API 方法修改卡的永久速度修正
          loop.modifyCardPermanentSpeed(currentCard, -10);
      }
  },

  // 25. Ration (便携干粮)
  ration: (_loop, _source, _targets) => {
     // 非回合卡，在战斗结束时触发
     // 战斗结束时，若生命值 < 70%，回复20点生命（限3次）
     // 这个逻辑应该由 BattleLoop.onBattleEnd() 处理，而不是在脚本中
     // 脚本执行时仅用于标记或初始化
     // 实际计数应存储在 CardInstance 或 Player 中
     
     // 由于 ration 不触发，这里为空实现
     // 触发逻辑应在 BattleLoop.onBattleEnd() 中实现
  },

  // 26. Whetstone (磨刀石)
  whetstone: (loop, source, _targets) => {
      // "精英战与 Boss 战开始时触发".
      // But user says: "磨刀石应该给玩家一个直到战斗结束为止的【力量1】效果（物理攻击+1，可叠加）"
      // The current prompt says: "whetstone logic ... should give Strength 1"
      // Wait, is Whetstone triggered via script or via StartOfBattle hook?
      // If it's a non-tick card, it won't be executed in normal loop.
      // But we can execute it manually in StartOfBattle if we want, OR
      // we can handle it inside BattleLoop.executeStartOfBattleEffects directly.
      // However, making the script functional allows BattleLoop to just call it.
      
      const buff: UnitBuff = {
          id: 'strength',
          name: '力量',
          description: '物理攻击伤害 +{level}。',
          duration: 999, // Battle end
          stackRule: 'stackable',
          level: 1,
          type: 'buff',
          onAttack: (_unit, _t, damage, _state) => {
              // Wait, onAttack receives raw damage.
              // We need to know if it's PHYSICAL.
              // BattleLoop.dealDamage applies onAttack buffs.
              // But onAttack doesn't get 'type'.
              // We need to assume physical or update BattleLoop?
              // Most attacks are physical.
              // Let's blindly add damage for now, OR rely on BattleLoop update.
              // Actually, BattleLoop.dealDamage calls onAttack BEFORE type check?
              // No, dealDamage signature is (source, target, amount, type).
              // It calls onAttack(source, target, damage, state).
              // It doesn't pass 'type'.
              // We should probably check the CARD tags if we could access it.
              // But we can't access currentCard easily here without context.
              // BUT, `strength` usually implies physical.
              // Let's add damage.
              return damage + 1; // Level is handled by stackable? 
              // Wait, onAttack is a function. It doesn't know 'level' unless we capture it?
              // The `buff` object passed to onAttack? No.
              // We need to find the buff on the unit to get current level.
          }
      };
      
      // We need a better onAttack that can access the buff level.
      // Or we define onAttack dynamically when adding/stacking?
      // BattleLoop.addUnitBuff handles stacking by merging levels.
      // But the `onAttack` function remains the one from the NEW buff or OLD buff?
      // Usually simple systems keep the old function.
      // So the function must find the buff instance on the unit.
      
      buff.onAttack = (unit, _t, damage, _state) => {
          const myBuff = unit.buffs.find(b => b.id === 'strength');
          return damage + (myBuff ? myBuff.level : 0);
      };
      
      loop.addUnitBuff(source, buff);
  },

  // 27. Flick Thrust (上撩突刺)
  flick_thrust: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      loop.dealDamage(source, target, 2, 'physical');
      
      // Find Next Attack Card & Speed -1 (-10)
      const currentTick = loop.getCurrentTick();
      const nextCard = target.cards.find(c => 
          c.currentSpeed10 !== null && 
          c.currentSpeed10 > (currentTick * 10) &&
          c.tagsRuntime?.includes('攻击')
      );
      
      if (nextCard) {
          loop.modifyCardSpeed(nextCard, -10);
      }
  },

  // 28. Moonlight Slash (月光斩)
  moonlight_slash: (loop, source, targets) => {
      const target = targets[0];
      if (!target) return;
      
      const turn = loop.getCurrentTurn();
      const dmg = turn === 1 ? 12 : 18;
      loop.dealDamage(source, target, dmg, 'physical'); // Phys+Mag?
  },

  // New cards for pack 3
  lakshir_ritual: (loop, source, _targets) => {
    // Lose 12 HP (not damage, direct HP loss)
    loop.directHpChange(source, -12);
    // Gain 24 shield (armor)
    loop.addArmor(source, 24);
  },

  duel_slash: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.dealDamage(source, target, 10, 'physical');
  },

  powerful_cleave: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.dealDamage(source, target, 15, 'physical');
  },

  sledgehammer: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.dealDamage(source, target, 18, 'physical');
  },

  maze_step: (loop, source, targets) => {
    const target = targets[0] || source;
    // 50% evade next attack
    const buff: UnitBuff = {
      id: 'evade',
      name: '闪避',
      description: '下一次攻击被闪避。',
      duration: -1, // Until triggered
      stackRule: 'nonStackable',
      level: 1,
      type: 'buff'
    };
    loop.addUnitBuff(target, buff);
  },

  temporary_ceasefire: (loop, _source, _targets) => {
    // Speed +1 to all unplayed attack cards of all characters this tick
    const currentTick = loop.getCurrentTick();
    const tickStart = currentTick * 10;
    const tickEnd = (currentTick + 1) * 10;
    loop.getAllUnits().forEach(unit => {
      unit.cards.forEach(card => {
        if (card.currentSpeed10 !== null &&
            card.currentSpeed10 >= tickStart &&
            card.currentSpeed10 < tickEnd &&
            card.tagsRuntime?.includes('攻击')) {
          loop.modifyCardSpeed(card, 10);
        }
      });
    });
  },

  conch_shell: (loop, source, targets) => {
    const target = targets[0] || source;
    // Nullify next damage
    const buff: UnitBuff = {
      id: 'damage_nullify',
      name: '伤害无效',
      description: '下次收到的伤害变为0。',
      duration: -1,
      stackRule: 'stackable',
      level: 1,
      type: 'buff'
    };
    loop.addUnitBuff(target, buff);
  },

  flame_arrow: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.dealDamage(source, target, 3, 'magical', ['火']);
    // Add scorch
    const scorchBuff: UnitBuff = {
      id: 'scorch',
      name: '灼烧',
      description: '回合结束时，对该角色造成1点伤害。',
      duration: -1,
      stackRule: 'stackable',
      level: 1,
      type: 'debuff',
      onTurnEnd: (unit, _battle) => {
        loop.directHpChange(unit, -1);
      }
    };
    loop.addUnitBuff(target, scorchBuff);
  },

  flame_arrow_ring: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.dealDamage(source, target, 6, 'magical', ['火']);
    const scorchBuff: UnitBuff = {
      id: 'scorch',
      name: '灼烧',
      description: '回合结束时，对该角色造成3点伤害。',
      duration: -1,
      stackRule: 'stackable',
      level: 3,
      type: 'debuff',
      onTurnEnd: (unit, _battle) => {
        loop.directHpChange(unit, -3);
      }
    };
    loop.addUnitBuff(target, scorchBuff);
  },

  resist_fire_ring: (loop, source, targets) => {
    const target = targets[0] || source;
    const buff: UnitBuff = {
      id: 'resist_fire_circle',
      name: '抗拒火环',
      description: '敌人每对该角色造成一次物理伤害，对其造成3点伤害。',
      duration: 1,
      stackRule: 'nonStackable',
      level: 3,
      type: 'buff'
    };
    loop.addUnitBuff(target, buff);
  },

  shadow_step: (loop, source, _targets) => {
    loop.directHpChange(source, -2);
    // Pierce for next attack
    const buff: UnitBuff = {
      id: 'pierce',
      name: '穿甲',
      description: '下一次攻击无视对方护甲。',
      duration: 1,
      stackRule: 'nonStackable',
      level: 1,
      type: 'buff'
    };
    // Shadow Step is a self-buff card: always grant pierce to the caster.
    loop.addUnitBuff(source, buff);
  },

  shadow_claw: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.directHpChange(source, -2);
    loop.dealDamage(source, target, 5, 'magical', ['暗影']);
  },

  shadow_beam: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.directHpChange(source, -3);
    const damage = Math.floor((source.maxHp - source.hp) / 6);
    loop.dealDamage(source, target, damage, 'magical', ['暗影']);
  },

  shadow_form: (loop, source, targets) => {
    const target = targets[0] || source;
    const buff: UnitBuff = {
      id: 'shadow_form',
      name: '暗影形态',
      description: '下一个回合中，每当你因为自己的效果失去血量，血量最低的对手失去同样多的血量。',
      duration: 2, // Next turn
      stackRule: 'nonStackable',
      level: 1,
      type: 'buff'
    };
    loop.addUnitBuff(target, buff);
  },

  // Armor cards - these apply buffs at battle start, handled separately
  steel_full_armor: (_loop, _source, _targets) => {
    // Buffs applied in battle initialization
  },

  leather_half_armor: (_loop, _source, _targets) => {
    // Buffs applied in battle initialization
  },

  cloth_light_armor: (_loop, _source, _targets) => {
    // Buffs applied in battle initialization
  },

  mother_of_pearl_helmet: (_loop, _source, _targets) => {
    // Buffs applied in battle initialization
  },

  gauze_skirt: (_loop, _source, _targets) => {
    // Buffs applied in battle initialization
  },

  tight_robe: (_loop, _source, _targets) => {
    // Buffs applied in battle initialization
  },

  // Pack 4: Variable Gear
  quick_start: (loop, source, _targets) => {
    const nextCard = loop.findNextCardOnTimeline(source);
    if (nextCard) {
      loop.modifyCardSpeed(nextCard, -24);
    }

    const currentCard = (loop as any).currentCard;
    if (currentCard) {
      const idx = source.cards.findIndex(c => c.instanceId === currentCard.instanceId);
      if (idx !== -1) {
        source.cards.splice(idx, 1);
      }
    }
  },

  life_recorder: (loop, source, _targets) => {
    const existing = source.buffs.find(b => b.id === 'life_record');
    const currentCard = (loop as any).currentCard;

    if (existing) {
      source.hp = Math.max(0, Math.min(source.maxHp, existing.level));
      if (currentCard) {
        const idx = source.cards.findIndex(c => c.instanceId === currentCard.instanceId);
        if (idx !== -1) source.cards.splice(idx, 1);
      }
      loop.removeBuff(source, 'life_record');
      return;
    }

    const buff: UnitBuff = {
      id: 'life_record',
      name: '生命记录',
      description: '记录生命值。',
      duration: -1,
      stackRule: 'nonStackable',
      level: source.hp,
      type: 'buff'
    };
    loop.addUnitBuff(source, buff);
  },

  kinetic_recovery_device: (loop, source, _targets) => {
    const buff: UnitBuff = {
      id: 'kinetic_recovery_device',
      name: '动能回收装置',
      description: '每次打出卡牌时，按当前tick与基础速度差获得护甲。',
      duration: -1,
      stackRule: 'stackable',
      level: 1,
      type: 'buff'
    };
    loop.addUnitBuff(source, buff);
  },

  big_torque_gear: (loop, source, targets) => {
    const target = targets[0] || source;
    const nextAttack = target.cards
      .filter(c => c.currentSpeed10 !== null && c.tagsRuntime?.includes('攻击'))
      .sort((a, b) => (a.currentSpeed10! - b.currentSpeed10!))[0];
    if (nextAttack) {
      loop.modifyCardSpeed(nextAttack, 30);
    }

    const buff: UnitBuff = {
      id: 'big_torque_gear',
      name: '大扭矩齿轮',
      description: '下一次攻击伤害+6。',
      duration: 1,
      stackRule: 'nonStackable',
      level: 6,
      type: 'buff',
      onAttack: (unit, _t, damage) => {
        const idx = unit.buffs.findIndex(b => b.id === 'big_torque_gear');
        if (idx !== -1) unit.buffs.splice(idx, 1);
        return damage + 6;
      }
    };
    loop.addUnitBuff(target, buff);
  },

  speed_magician: (loop, source, targets) => {
    const target = targets[0] || source;
    const candidates = target.cards.filter(c => c.currentSpeed10 !== null);
    if (candidates.length < 2) return;

    const sorted = [...candidates].sort((a, b) => (a.currentSpeed10! - b.currentSpeed10!));
    const fastest = sorted[0];
    const slowest = sorted[sorted.length - 1];
    if (!fastest || !slowest || fastest.instanceId === slowest.instanceId) return;

    const fastestSpeed = fastest.currentSpeed10!;
    const slowestSpeed = slowest.currentSpeed10!;
    loop.modifyCardPermanentSpeed(fastest, slowestSpeed - fastestSpeed);
    loop.modifyCardPermanentSpeed(slowest, fastestSpeed - slowestSpeed);
  },

  cancel: (loop, source, _targets) => {
    const currentCard = (loop as any).currentCard;
    if (!currentCard || currentCard.currentSpeed10 === null) return;

    const lowerCandidates = source.cards
      .filter(c => c.currentSpeed10 !== null && c.currentSpeed10 < currentCard.currentSpeed10!);

    if (lowerCandidates.length === 0) return;

    lowerCandidates.sort((a, b) => (b.currentSpeed10! - a.currentSpeed10!));
    loop.modifyCardSpeed(lowerCandidates[0], 20);
  },

  kinetic_impact: (loop, source, targets) => {
    const target = targets[0];
    const currentCard = (loop as any).currentCard;
    if (!target || !currentCard || currentCard.currentSpeed10 === null) return;

    const currentSpeed = Math.floor(currentCard.currentSpeed10 / 10);
    const damage = Math.max(3, currentSpeed + 3);
    loop.dealDamage(source, target, damage, 'physical');
  },

  super_kinetic_impact: (loop, source, targets) => {
    const target = targets[0];
    const currentCard = (loop as any).currentCard;
    if (!target || !currentCard || currentCard.currentSpeed10 === null) return;

    const currentSpeed = Math.floor(currentCard.currentSpeed10 / 10);
    const damage = Math.floor(currentSpeed * 2);
    loop.dealDamage(source, target, damage, 'physical');

    if (damage < 6) {
      const selfDamage = Math.max(0, Math.floor(6 - currentSpeed));
      if (selfDamage > 0) {
        loop.dealDamage(source, source, selfDamage, 'physical');
      }
    }
  },

  rush_attack: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.dealDamage(source, target, 2, 'physical');

    const currentCard = (loop as any).currentCard;
    if (currentCard) {
      // 本回合内加速，回合结束由 CardInstanceBuff 清空
      loop.modifyCardSpeed(currentCard, 20);
    }
  },

  superluminal: (loop, source, _targets) => {
    const currentCard = (loop as any).currentCard;
    const candidates = source.cards.filter(c => c.currentSpeed10 !== null && c.instanceId !== currentCard?.instanceId);
    if (candidates.length === 0) return;

    candidates.sort((a, b) => (b.currentSpeed10! - a.currentSpeed10!));
    const targetCard = candidates[0];
    const script = CardScripts[targetCard.factory.scriptId];
    if (!script) return;

    const targets = (loop as any).findTargets(source, targetCard);
    const previousCard = (loop as any).currentCard;
    (loop as any).currentCard = targetCard;
    script(loop, source, targets);
    (loop as any).currentCard = previousCard;
  },

  // Pack 5: Trick of God
  rebellion: (loop, source, targets) => {
    const target = targets[0];
    const currentCard = (loop as any).currentCard;
    if (!target || !currentCard) return;

    if (currentCard.baseSpeed10 !== null && currentCard.currentSpeed10 !== null) {
      const delta = currentCard.currentSpeed10 - currentCard.baseSpeed10;
      if (delta !== 0) {
        loop.modifyCardPermanentSpeed(currentCard, -2 * delta);
      }
    }

    loop.dealDamage(source, target, 10, 'physical');
    if (!target.isDead) {
      loop.dealDamage(source, target, 10, 'physical');
    }
  },

  spirit_song: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;

    loop.dealDamage(source, target, 3, 'magical');

    const currentTick = loop.getCurrentTick();
    const tickStart = currentTick * 10;
    loop.getAllUnits().forEach(unit => {
      unit.cards.forEach(card => {
        if (card.currentSpeed10 === null) return;
        if (card.currentSpeed10 < tickStart) return;
        if (card.tagsRuntime?.includes('物理')) {
          loop.modifyCardSpeed(card, 10);
        }
      });
    });
  },

  substitute: (loop, source, _targets) => {
    loop.directHpChange(source, -3);
    const buff: UnitBuff = {
      id: 'substitute_guard',
      name: '替身',
      description: '抵挡下一次受到的伤害。',
      duration: -1,
      stackRule: 'nonStackable',
      level: 1,
      type: 'buff',
      onReceiveDamage: (unit, _damageInfo, _battle) => {
        loop.removeBuff(unit, 'substitute_guard');
        return 0;
      }
    };
    loop.addUnitBuff(source, buff);
  },

  iron_wave: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.dealDamage(source, target, 5, 'physical');
    loop.addArmor(source, 5);
  },

  counterweight: (loop, source, _targets) => {
    const attacks = source.cards
      .filter(c => c.currentSpeed10 !== null && c.tagsRuntime?.includes('攻击'))
      .sort((a, b) => (b.currentSpeed10! - a.currentSpeed10!));
    const slowest = attacks[0];
    if (!slowest) return;

    const buff: UnitBuff = {
      id: 'counterweight_repeat',
      name: '秤砣',
      description: '初始最慢攻击牌额外释放一次。',
      duration: -1,
      stackRule: 'nonStackable',
      level: 1,
      type: 'buff',
      sourceInstanceId: slowest.instanceId
    };
    loop.addUnitBuff(source, buff);
  },

  storm: (loop, source, _targets) => {
    const buff: UnitBuff = {
      id: 'storm_current_turn',
      name: '暴风雨',
      description: '本回合每tick开始时，对随机敌人造成1点穿甲伤害。',
      duration: 1,
      stackRule: 'stackable',
      level: 1,
      type: 'debuff'
    };
    loop.addUnitBuff(source, buff);
  },

  swing_punch: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.dealDamage(source, target, 7, 'physical');
  },

  curiosity: (loop, source, _targets) => {
    // Grant empty max HP: raise maxHp only, do not heal current HP.
    source.maxHp += 12;
    const buff: UnitBuff = {
      id: 'curiosity_guard',
      name: '好奇心',
      description: '增加12点空生命值上限；被本战斗中未见过的攻击牌命中时，回复4生命。',
      duration: -1,
      stackRule: 'nonStackable',
      level: 1,
      type: 'buff'
    };
    loop.addUnitBuff(source, buff);
  },

  counter_magic: (loop, source, _targets) => {
    const enemy = loop.getAllUnits().find(u => u.team !== source.team && !u.isDead);
    if (!enemy) return;

    const sourceArmorBuff = source.buffs.find(b => b.id === 'armor');
    const enemyArmorBuff = enemy.buffs.find(b => b.id === 'armor');
    const sourceArmor = sourceArmorBuff?.level || 0;
    const enemyArmor = enemyArmorBuff?.level || 0;
    const diff = Math.abs(sourceArmor - enemyArmor);

    if (sourceArmorBuff) {
      sourceArmorBuff.level = 0;
      loop.removeBuff(source, 'armor');
    }
    if (enemyArmorBuff) {
      enemyArmorBuff.level = 0;
      loop.removeBuff(enemy, 'armor');
    }

    if (diff <= 0) return;
    const target = sourceArmor < enemyArmor ? source : enemy;
    loop.dealDamage(source, target, diff, 'magical');
  },

  seize_initiative: (loop, source, targets) => {
    const target = targets[0];
    const currentCard = (loop as any).currentCard;
    if (!target || !currentCard || currentCard.currentSpeed10 === null) return;

    const enemyUnits = loop.getAllUnits().filter(u => u.team !== source.team && !u.isDead);
    const hasSameSpeedCard = enemyUnits.some(unit =>
      unit.cards.some(card =>
        card.currentSpeed10 !== null &&
        card.currentSpeed10 === currentCard.currentSpeed10
      )
    );

    if (hasSameSpeedCard) {
      loop.dealDamage(source, target, 6, 'physical');
    }
  },

  moonlight_guidance: (loop, source, _targets) => {
    loop.spawnCard(source, 'moonlight_bombard', 10);
  },

  moonlight_bombard: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    loop.dealDamage(source, target, 15, 'magical');
  },

  high_speed_engine: (_loop, _source, _targets) => {
    // Buffs applied in battle initialization
  },

  overload_cargo: (_loop, _source, _targets) => {
    // Buffs applied in battle initialization
  }
};
