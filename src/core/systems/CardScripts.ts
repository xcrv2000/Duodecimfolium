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

      // Slow all SUBSEQUENT attack cards of target this turn by 1 (-10 speed10)
      // "使敌方单位在本回合后续所有攻击的速度获得 -1" => Speed -1 means FASTER (Speed is wait time? NO. Speed is time slot.)
      // Wait, in this system:
      // Speed 2 triggers at tick 2. Speed 12 triggers at tick 12.
      // So "Speed -1" means it triggers EARLIER (Faster).
      // BUT "Speed -1" in card game context usually means "Slow Down"?
      // Let's check "Thrust": "Speed +1" -> "+1.0 Speed".
      // If Thrust (Speed 2) makes target Speed +1 -> Target becomes Speed 3 (Slower/Later).
      // So "Speed -1" here means Speed becomes Smaller -> Faster/Earlier.
      // Description: "获得 -1 的卡类速度 buff"
      // Ice Orb usually slows people down (Chill).
      // If it makes them Faster (-1), that's weird for Ice.
      // Let's re-read: "后续所有攻击的速度获得 -1 ... 立即重排"
      // Maybe in this game Speed value IS Speed (Higher is Faster)?
      // NO. Tick 0..12. 0 is start. 12 is end.
      // So Small Speed = Early/Fast. Large Speed = Late/Slow.
      // If Ice Orb gives -1 Speed, it makes them FASTER.
      // Unless "Speed" property on card means "Velocity"? No, it means "Time Cost/Delay".
      // Let's check "Thrust" again: "使该卡在本回合获得 速度 +1（【迟缓 1】）".
      // So +1 is Slow (Delay).
      // Then -1 must be Haste (Accelerate).
      // Does Ice Orb make enemy faster?
      // "冰……球？" -> "Is it an ice orb?"
      // Maybe it's slippery?
      // "使敌方单位在本回合后续所有攻击的速度获得 -1" -> Haste.
      // Okay, I will implement as -10 speed10.
      
      // Update: Target all subsequent ATTAKC cards
      const currentTick = loop.getCurrentTick();
      const targetCards = target.cards.filter(c => 
          c.currentSpeed10 !== null && 
          c.currentSpeed10 > (currentTick * 10) &&
          c.tagsRuntime?.includes('攻击')
      );
      
      targetCards.forEach(c => {
          loop.modifyCardSpeed(c, -10);
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
      // Buff: Next Phys Attack -> Reduce that card's speed by 2 (Faster) from NEXT turn
      const buff: UnitBuff = {
          id: 'clear_oil',
          name: '清亮剑油',
          description: '下一次物理攻击后，那张卡从下回合起速度-2。（至少为0）',
          duration: 999, // Until battle end
          stackRule: 'nonStackable',
          level: 1,
          type: 'buff',
          onAttack: (_unit, _t, _dmg, _battle) => {
               // We need to know WHICH card triggered this to apply factory buff.
               // BattleLoop needs to expose current card context or pass it.
               // Currently onAttack doesn't pass card.
               // We might need to hook into BattleLoop more deeply or use a workaround.
               // Workaround: BattleLoop.currentCard is public/accessible if we pass loop?
               // But onAttack signature is (unit, target, damage, battleState).
               // We can't easily access currentCard from State unless we store it in State.
               // Let's assume we can access loop.currentCard if we change onAttack signature or usage.
               // For now, let's implement a "Trigger" in BattleLoop that checks for this buff AFTER card execution.
               return _dmg;
          }
      };
      // To properly implement "On Next Attack Card", we need a better hook.
      // "在该次攻击结算完成后" -> After Execute.
      // Let's add a special logic in BattleLoop or just use a placeholder for now.
      // I'll add a specific check in BattleLoop.executeCard for this pattern if possible,
      // Or better, add a `onCardPlayed` hook to UnitBuff.
      loop.addUnitBuff(target, buff);
  },
  
  // 15. Bright Oil (明亮剑油)
  bright_oil: (loop, source, targets) => {
      const target = targets[0] || source;
      const buff: UnitBuff = {
          id: 'bright_oil',
          name: '明亮剑油',
          description: '下一次物理攻击后，那张卡永久速度-3。（至少为0）',
          duration: 999,
          stackRule: 'nonStackable',
          level: 1,
          type: 'buff'
          // Logic handled via hook
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
              if (hasMagicTag) {
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
              if (!hasMagicTag && damageInfo.type === 'physical') {
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
      
      // Permanent Speed -1 to THIS card (Factory).
      // Need to access CardFactory or modify CardInstance's permanent modifier.
      // BattleLoop needs API for this.
      // loop.modifyCardFactorySpeed(cardId, -10);
      // For now, modify instance permanent modifier?
      // But instance is recreated.
      // We need to persist this change to the Unit's deck configuration in BattleState.
      // But BattleState has 'units' which have 'cards'.
      // If we modify the Unit's card list in BattleState, does it persist across turns?
      // Yes, BattleLoop.state.units persists.
      // However, units.cards are Instances.
      // We need to find the "Source Definition" or modify `permanentSpeedModifier` on the instance
      // AND ensure `BattleLoop.endTurn` preserves it or re-applies it?
      // BattleLoop re-creates instances? No, it re-calculates speed.
      // But it doesn't re-create instances from factory every turn in current impl.
      // Current impl: Instances created ONCE at start.
      // So modifying `permanentSpeedModifier` on instance IS permanent for battle.
      if (loop['currentCard']) {
          const card = loop['currentCard'];
          card.permanentSpeedModifier = (card.permanentSpeedModifier || 0) - 10;
      }
  },

  // 25. Ration (便携干粮)
  ration: (_loop, _source, _targets) => {
     // Non-tick card. Handled in BattleLoop.endTurn or special check?
     // "在战斗结束时触发".
     // This needs a hook `onBattleEnd`.
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
  }
};
