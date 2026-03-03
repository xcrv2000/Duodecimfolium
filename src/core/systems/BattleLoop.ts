import { BattleState, BattleUnit, BattleLogEntry, UnitBuff, CardInstanceBuff } from '../domain/Battle';
import { CardInstance } from '../domain/Card';
import { CardScripts } from './CardScripts';

import { RNG } from '../../utils/rng';

export class BattleLoop {
  private state: BattleState;
  private currentCard: CardInstance | null = null;
  private rng: RNG;

  constructor(state: BattleState, rng: RNG) {
    this.state = state;
    this.rng = rng;
  }

  public spawnCard(source: BattleUnit, cardId: string, baseSpeed10: number): void {
      // Find card definition if possible
      // Since we don't have access to global cards array directly in class unless passed,
      // we can try to find it in the source unit's deck if it exists there, OR use hardcoded fallback
      // BUT `cards.json` has the tokens defined.
      // Ideally, BattleLoop should have access to a card database.
      // For now, let's hardcode the KNOWN tokens from cards.json to ensure consistency.
      
      let name = 'Token';
      let desc = 'Token';
      let effectDesc = 'Token Effect';
      let tags = ['衍生'];
      
      if (cardId === 'spin_slash_token') {
          name = '回旋·斩';
          desc = '回旋斩的后续攻击。';
          effectDesc = '造成6点物理伤害。';
          tags = ["攻击", "物理", "衍生"];
      } else if (cardId === 'upward_slash_token') {
          name = '上挑斩·剑气';
          desc = '上挑斩激发的剑气。';
          effectDesc = '造成4点魔法伤害。';
          tags = ["攻击", "魔法", "衍生"];
      }

      const newCard: any = {
          id: cardId,
          name: name,
          description: desc,
          effectDescription: effectDesc,
          packId: 'token',
          rarity: 0,
          speed: baseSpeed10 / 10,
          scriptId: cardId,
          tags: tags,
          instanceId: `${source.id}_token_${Date.now()}_${this.rng.next()}`,
          baseSpeed10: baseSpeed10,
          currentSpeed10: baseSpeed10,
          deckSpeedPenalty: 0,
          permanentSpeedModifier: 0,
          ownerId: source.id,
          modifiers: [],
          buffs: []
      };
      
      source.cards.push(newCard);
      this.recalculateCardSpeed(source, newCard);
      this.log(source, null, `Spawned ${newCard.name}!`, 'info');
      
      // If it falls into current tick or future, it will be picked up by processTick loop if we re-scan?
      // processTick re-scans via `while(true)`. 
      // But we need to ensure it's sorted correctly.
      // The `while` loop re-gathers candidates. So yes.
  }

  public getCurrentTick(): number {
      return this.state.tick;
  }
  
  public getCurrentTurn(): number {
      return this.state.turn;
  }
  
  public getAllUnits(): BattleUnit[] {
      return this.state.units;
  }

  // --- Main Loop Methods ---

  public nextTick(): BattleState {
    if (this.state.isOver) return this.state;

    this.processTick(this.state.tick);

    this.state.tick++;
    if (this.state.tick > 12) {
      this.endTurn();
    }

    return { ...this.state };
  }

  public executeStartOfBattleEffects(): void {
    this.log(null, null, "--- 战斗开始 ---", 'info');
    
    // 1. Initialize Speeds & Apply NPC Bonus
    this.state.units.forEach(unit => {
        // Apply NPC Speed Bonus (+0.1 -> +1 speed10)
        if (unit.team === 'enemy') {
            unit.cards.forEach(c => {
                 if (c.baseSpeed10 !== null) {
                     c.permanentSpeedModifier = (c.permanentSpeedModifier || 0) + 1;
                 }
            });
        }
        
        // Initial Speed Calculation
        unit.cards.forEach(card => {
            this.recalculateCardSpeed(unit, card);
        });
    });

    // 2. Execute passive effects (Start of Battle)
    // Check for Whetstone (Elite/Boss only)
    const isEliteOrBoss = this.state.units.some(u => 
        u.team === 'enemy' && (u.id.includes('elite') || u.id.includes('boss') || u.name.includes('精英') || u.name.includes('Boss') || u.name.includes('BOSS'))
    );
    
    this.state.units.forEach(unit => {
      unit.cards.forEach(card => {
        // Handle Whetstone separately
        if (card.scriptId === 'whetstone') {
             if (isEliteOrBoss) {
                 this.executeCard(unit, card);
             }
             return;
        }
        
        // Skip Ration (handled at end)
        if (card.scriptId === 'ration') return;
        
        // Execute other passives
        if (card.baseSpeed10 === null) {
          this.executeCard(unit, card);
        }
      });
    });
  }

  public endTurn(): void {
    this.state.turn++;
    this.state.tick = 0;
    
    // Clear armor, update buffs
    this.state.units.forEach(unit => {
      unit.armor = 0;
      
      // Update Unit Buffs
      unit.buffs.forEach(buff => {
        if (buff.onTurnEnd) buff.onTurnEnd(unit, this.state);
        buff.duration--;
      });
      unit.buffs = unit.buffs.filter(b => b.duration > 0);
      
      // Reset Card Instances (Clear Buffs, Recalculate Speed)
      unit.cards.forEach(card => {
          card.buffs = []; // Clear round-based buffs
          this.recalculateCardSpeed(unit, card);
      });
    });

    this.log(null, null, "--- 回合结束 ---", 'info');
  }

  private recalculateCardSpeed(unit: BattleUnit, card: CardInstance): void {
      if (card.baseSpeed10 === null) {
          card.currentSpeed10 = null;
          return;
      }
      
      let speed = card.baseSpeed10 + (card.permanentSpeedModifier || 0);
      
      // Apply beads (modifiers)
      // Assuming modifiers.value is numeric string or number.
      // Need to convert to speed10 integer.
      // Example: value "0.5" -> 5
      if (card.modifiers) {
        card.modifiers.forEach(mod => {
            if (mod.effectId === 'speed_mod') {
                const val = Number(mod.value);
                if (!isNaN(val)) {
                    speed += Math.round(val * 10);
                }
            }
        });
      }

      // Apply CardInstanceBuffs
      if (card.buffs) {
        card.buffs.forEach(buff => {
            if (buff.speedModification) {
                speed += buff.speedModification;
            }
        });
      }

      // Apply Unit Buffs that affect speed
      // Charge: +10 speed (immediate)
      // Stun: +Level speed (next turn only, i.e., duration === 1)
      unit.buffs.forEach(buff => {
          if (buff.id === 'charge') {
              speed += 10; // +1.0 speed
          }
          if (buff.id === 'stun' && buff.duration === 1) {
              speed += buff.level;
          }
      });
      
      // Apply Deck Speed Penalty
      speed += (card.deckSpeedPenalty || 0);
      
      // Ensure speed is not below 0
      // "所有卡的减速效果，除非有额外描述，不应该将其减速至0以下。"
      // speed 0 means it executes at tick 0.
      // Negative speed is invalid in this system as tick starts at 0.
      if (speed < 0) speed = 0;
      
      card.currentSpeed10 = speed;
  }

  private processTick(tick: number): void {
    const tickStart = tick * 10;
    const tickEnd = (tick + 1) * 10;
    
    // Track executed cards in this tick to avoid loops/duplicates
    const executedCardIds = new Set<string>();

    // Dynamic Re-sorting Loop
    while (true) {
        // 1. Gather candidates
        let candidates: { unit: BattleUnit, card: CardInstance }[] = [];
        
        this.state.units.forEach(unit => {
            if (unit.isDead) return;
            unit.cards.forEach(card => {
                // Check range
                if (card.currentSpeed10 !== null && 
                    card.currentSpeed10 >= tickStart && 
                    card.currentSpeed10 < tickEnd) {
                    
                    if (!executedCardIds.has(card.instanceId)) {
                        candidates.push({ unit, card });
                    }
                }
            });
        });
        
        if (candidates.length === 0) break;
        
        // 2. Sort
        candidates.sort((a, b) => {
            // Speed asc
            if (a.card.currentSpeed10 !== b.card.currentSpeed10) {
                return (a.card.currentSpeed10!) - (b.card.currentSpeed10!);
            }
            // Deck size asc
            if (a.unit.initialDeckSize !== b.unit.initialDeckSize) {
                return a.unit.initialDeckSize - b.unit.initialDeckSize;
            }
            // Random
            return this.rng.next() - 0.5;
        });
        
        // 3. Execute ONE (the first)
        const action = candidates[0];
        executedCardIds.add(action.card.instanceId); 
        
        this.executeCard(action.unit, action.card);
        
        // 4. Loop continues to re-evaluate
    }
  }

  private executeCard(source: BattleUnit, card: CardInstance): void {
    this.currentCard = card;
    this.log(source, null, `${source.name} 发动了 ${card.name}!`, 'info', undefined, card.name);

    // Find targets
    const targets = this.findTargets(source, card);
    
    // Execute Script
    const script = CardScripts[card.scriptId];
    if (script) {
      try {
          script(this, source, targets);
      } catch (e) {
          console.error(`Error executing script ${card.scriptId}`, e);
          this.log(source, null, `执行卡牌 ${card.name} 失败: ${e}`, 'info');
      }
    } else {
      this.log(source, null, `找不到脚本 ${card.scriptId}!`, 'info');
    }

    this.currentCard = null;

    // Check Deaths
    this.checkDeaths();
  }

  private findTargets(source: BattleUnit, card: CardInstance): BattleUnit[] {
    // Targeting Logic
    const isSupport = card.tags?.includes('辅助');
    const isDefense = card.tags?.includes('防御');
    
    if (isSupport || isDefense || card.scriptId === 'concentrate') {
        return [source];
    }
    
    const enemies = this.state.units.filter(u => u.team !== source.team && !u.isDead);
    if (enemies.length === 0) return [];
    
    const target = enemies[Math.floor(this.rng.next() * enemies.length)];
    return [target];
  }

  private checkDeaths(): void {
    let teamAlive = { player: false, enemy: false };

    this.state.units.forEach(unit => {
      if (unit.hp <= 0) {
        unit.hp = 0;
        unit.isDead = true;
        this.log(unit, null, `${unit.name} 被击败了!`, 'death');
      }
      if (!unit.isDead) {
        if (unit.team === 'player') teamAlive.player = true;
        if (unit.team === 'enemy') teamAlive.enemy = true;
      }
    });

    if (!teamAlive.player) {
      this.state.isOver = true;
      this.state.winner = 'enemy';
      this.onBattleEnd();
    } else if (!teamAlive.enemy) {
      this.state.isOver = true;
      this.state.winner = 'player';
      this.onBattleEnd();
    }
  }

  private onBattleEnd(): void {
    // Trigger "Supply" cards (补给品)
    this.state.units.forEach(unit => {
        if (unit.team === 'player' && !unit.isDead) {
             unit.cards.forEach(card => {
                 if (card.scriptId === 'ration') {
                     const hpPercent = unit.hp / unit.maxHp;
                     if (hpPercent < 0.7) {
                         // Need to track usage. CardInstance is recreated per battle from BattleStore usually?
                         // If BattleStore preserves unit.cards across stages, this works.
                         // But BattleStore creates new BattleLoop each stage.
                         // We need to mutate the UNIT's card instance which is passed back to store?
                         // The unit in BattleState is a clone?
                         // Let's assume for now we mutate this instance. 
                         // To make it persist across dungeon stages, BattleStore must copy this unit state back.
                         
                         const triggers = (card as any).triggerCount || 0;
                         if (triggers < 3) {
                             const heal = 20;
                             unit.hp = Math.min(unit.hp + heal, unit.maxHp);
                             (card as any).triggerCount = triggers + 1;
                             this.log(unit, unit, `便携干粮触发: 回复${heal}生命 (剩余次数: ${2 - triggers})`, 'buff', heal);
                         }
                     }
                 }
             });
        }
    });
  }

  private log(source: BattleUnit | null, target: BattleUnit | null, message: string, type: BattleLogEntry['type'], value?: number, cardName?: string): void {
    this.state.log.push({
      tick: this.state.tick,
      sourceUnitId: source?.id || 'system',
      targetUnitId: target?.id,
      cardName,
      message,
      type,
      value
    });
  }

  // --- API for Scripts ---

  public dealDamage(source: BattleUnit, target: BattleUnit, amount: number, type: 'physical' | 'magical'): void {
    // 1. Apply Source Buffs (onAttack)
    let damage = amount;
    source.buffs.forEach(buff => {
        if (buff.onAttack) {
            damage = buff.onAttack(source, target, damage, this.state);
        }
    });
    
    // Explicitly handle "Strength" buff if not handled by onAttack (or to be safe)
    // Actually, we implemented onAttack in the Whetstone script.
    // But let's verify if onAttack is called correctly.
    // Yes, above loop calls it.
    
    // 2. Apply Target Buffs (onReceiveDamage)
    target.buffs.forEach(buff => {
        if (buff.onReceiveDamage) {
            damage = buff.onReceiveDamage(target, source, damage, this.state);
        }
    });
    
    // 3. Apply Armor (if physical)
    // Assume Physical unless specified magical
    let effectiveType = type;
    
    // Check for Magic Attribute (fire, ice, etc.)
    // If card has attr_add modifiers, we might change damage type OR just add tags.
    // For now, if "fire" or "ice", treat as magical for armor purposes?
    // Docs say: "fire_orb: 攻击附加【魔法/火】属性"
    // "rock_orb: 攻击附加【物理/冰】属性" (Weird, but okay. Rock usually Physical.)
    // "ice_orb: 攻击附加【魔法/冰】属性"
    
    // Logic: 
    // If base type is physical:
    //   - fire_orb -> adds magic -> mixed? Armor applies?
    //   - rock_orb -> adds physical/ice -> still physical -> Armor applies.
    //   - ice_orb -> adds magic/ice -> mixed?
    
    // Simplified Logic for now:
    // If ANY modifier makes it 'Magical' (Fire, Ice), we treat as Magical for Armor bypass?
    // BUT Rock is 'Physical/Ice'.
    // Let's check the modifier values.
    const modifiers = this.currentCard?.modifiers || [];
    
    if (modifiers.some(m => m.effectId === 'attr_add' && (m.value === 'fire' || m.value === 'ice'))) {
        effectiveType = 'magical';
    }
    // Rock is Physical/Ice, so it stays Physical (Armor works).
    
    let unmitigated = false;
    if (effectiveType === 'physical') {
      if (target.armor > 0) {
        const armorDamage = Math.min(target.armor, damage);
        target.armor -= armorDamage;
        damage -= armorDamage;
        this.log(source, target, `护甲吸收了 ${armorDamage} 点伤害。`, 'info');
      }
      // If damage remains (or armor was 0), it pierced armor partially?
      // Bleed usually means "if HP damage is taken" or "if armor didn't block ALL"?
      // "unmitigated by armor" usually means if armor was 0 or bypassed.
      // But here: "target received unmitigated physical damage" -> "受到未被护甲抵消的..."
      // This usually means the PORTION of damage that went through.
      // "Every time target takes physical damage NOT blocked by armor..."
      // So if damage > 0 after armor, it triggers.
      if (damage > 0) unmitigated = true;
    }
    
    // 4. Apply Bleed (Hardcoded mechanic)
    if (effectiveType === 'physical' && unmitigated) {
         const bleed = target.buffs.find(b => b.id === 'bleed');
         if (bleed) {
             damage += bleed.level;
             this.log(source, target, `流血效果追加 ${bleed.level} 点伤害!`, 'buff');
         }
    }
    
    // 5. Apply HP Damage
    if (damage > 0) {
      target.hp -= damage;
      this.log(source, target, `${target.name} 受到了 ${damage} 点伤害!`, 'attack', damage);
    } else {
      this.log(source, target, `${target.name} 未受到伤害。`, 'info');
    }
    
    // 6. Recalculate Source Speed (in case Charge/Focus was consumed)
    // Optimization: only if source buffs changed? But we don't know easily.
    // Just recalc.
    source.cards.forEach(c => this.recalculateCardSpeed(source, c));
  }

  public addArmor(unit: BattleUnit, amount: number): void {
    unit.armor += amount;
    this.log(unit, unit, `获得了 ${amount} 点护甲。`, 'buff', amount);
  }

  public addUnitBuff(unit: BattleUnit, buff: UnitBuff): void {
    if (buff.stackRule === 'stackable') {
        const existing = unit.buffs.find(b => b.id === buff.id);
        if (existing) {
            existing.level += buff.level;
            // Refresh duration
            if (buff.duration > existing.duration) existing.duration = buff.duration;
            this.log(unit, unit, `Buff叠加: ${buff.name} (等级 ${existing.level})`, 'buff');
            unit.cards.forEach(card => this.recalculateCardSpeed(unit, card));
            return;
        }
    } else {
        // nonStackable: keep higher level
        const existing = unit.buffs.find(b => b.id === buff.id);
        if (existing) {
            if (buff.level > existing.level) {
                existing.level = buff.level;
                existing.duration = buff.duration;
                this.log(unit, unit, `Buff升级: ${buff.name} (等级 ${existing.level})`, 'buff');
                unit.cards.forEach(card => this.recalculateCardSpeed(unit, card));
            }
            return;
        }
    }
    unit.buffs.push(buff);
    this.log(unit, unit, `获得Buff: ${buff.name} (等级 ${buff.level})`, 'buff');
    
    // Recalculate speeds (e.g. for Charge)
    unit.cards.forEach(card => this.recalculateCardSpeed(unit, card));
  }
  
  public removeBuff(unit: BattleUnit, buffId: string): void {
      const idx = unit.buffs.findIndex(b => b.id === buffId);
      if (idx !== -1) {
          unit.buffs.splice(idx, 1);
          // Recalculate speeds
          unit.cards.forEach(card => this.recalculateCardSpeed(unit, card));
      }
  }

  // API: Modify Card Speed
  public modifyCardSpeed(card: CardInstance, delta10: number): void {
      const buff: CardInstanceBuff = {
          id: 'speed_mod_dynamic',
          name: 'Speed Mod',
          description: '',
          duration: 1, // This turn
          stackRule: 'stackable',
          level: delta10,
          speedModification: delta10
      };
      this.addCardInstanceBuff(card, buff);
  }
  
  public addCardInstanceBuff(card: CardInstance, buff: CardInstanceBuff): void {
      if (!card.buffs) card.buffs = [];
      card.buffs.push(buff);
      
      const unit = this.state.units.find(u => u.id === card.ownerId);
      if (unit) {
          this.recalculateCardSpeed(unit, card);
      }
  }

  // API: Find Next Card
  public findNextCardOnTimeline(unit: BattleUnit): CardInstance | null {
      const currentSpeed = this.currentCard?.currentSpeed10 ?? (this.state.tick * 10);
      
      const candidates = unit.cards.filter(c => 
          c.currentSpeed10 !== null && 
          c.instanceId !== this.currentCard?.instanceId &&
          c.currentSpeed10 > currentSpeed
      );
      
      candidates.sort((a, b) => (a.currentSpeed10!) - (b.currentSpeed10!));
      
      return candidates.length > 0 ? candidates[0] : null;
  }
}
