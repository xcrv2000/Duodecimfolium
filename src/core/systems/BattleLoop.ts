import { BattleState, BattleUnit, BattleLogEntry, Buff } from '../domain/Battle';
import { CardInstance } from '../domain/Card';
import { CardScripts } from './CardScripts';

export class BattleLoop {
  private state: BattleState;

  constructor(state: BattleState) {
    this.state = state;
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
    this.log(null, null, "--- Battle Start ---", 'info');
    this.state.units.forEach(unit => {
      unit.cards.forEach(card => {
        if (card.originalSpeed === null) {
          // Trigger passive/start-of-battle effects
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
      unit.buffs.forEach(buff => {
        if (buff.onTurnEnd) buff.onTurnEnd(unit, this.state);
        buff.duration--;
      });
      unit.buffs = unit.buffs.filter(b => b.duration > 0);
    });

    this.log(null, null, "--- Turn End ---", 'info');
  }

  private processTick(tick: number): void {
    // 1. Gather all valid actions for this tick
    const actions: { unit: BattleUnit; card: CardInstance; usedBuffs: { id: string; value: number }[] }[] = [];

    this.state.units.forEach(unit => {
      if (unit.isDead) return;

      unit.cards.forEach(card => {
        // Calculate current speed
        let speed = card.originalSpeed;
        if (speed === null) return; // Passive card

        // Apply permanent modifiers
        speed += (card.permanentSpeedModifier || 0);

        // Apply Item Modifiers (Beads)
        card.modifiers.forEach(mod => {
            if (mod.effectId === 'speed_mod') {
                speed = (speed || 0) + Number(mod.value);
            }
        });

        // Apply speed modifiers from buffs
        let speedModifier = 0;
        const usedBuffs: { id: string; value: number }[] = [];
        
        unit.buffs.forEach(buff => {
          if (buff.id === 'slow') {
              const val = buff.value || 0;
              speedModifier += val;
              usedBuffs.push({ id: buff.id, value: val });
          }
          if (buff.id === 'haste') {
              const val = buff.value || 0;
              speedModifier -= val;
              usedBuffs.push({ id: buff.id, value: val });
          }
          
          // Handle 'stun' (formerly concussion) (next turn slow)
          // Stun is not stackable, but higher level overwrites lower level.
          // Stun effect is "Next Turn Speed +{value}".
          // If we are IN the "next turn" (buff is active), apply modifier.
          // Current implementation: Stun duration 2 (this turn + next turn).
          // Assuming buff logic ticks duration at end of turn.
          // So if duration > 0, it applies?
          // Wait, "Next Turn" means it shouldn't affect THIS turn.
          // CardScript adds duration 2.
          // Turn 1: Duration 2. Apply? No.
          // End Turn 1: Duration -> 1.
          // Turn 2: Duration 1. Apply? Yes.
          // End Turn 2: Duration -> 0. Removed.
          
          // We need a way to check if it's "active".
          // Simple heuristic: If duration === 1 (it's the last turn of effect), apply it.
          // OR: Use a specific field `applyOnTurn`?
          // OR: Check `buff.initialDuration - buff.duration >= 1`?
          // Let's assume Stun applies if duration === 1 (since it lasts 2 turns, 1st turn is setup).
          
          if (buff.id === 'stun' && buff.duration === 1) {
              const val = buff.value || 0;
              speedModifier += val;
              // Stun is not "consumed" by next card, but by next turn. So don't add to usedBuffs for removal.
          }
        });
        
        // Apply deck duplicate penalty
        const duplicatePenalty = card.deckSpeedPenalty || 0;
        
        let finalSpeed = Math.round(speed + speedModifier + duplicatePenalty);

        // Global Speed Limit Check: If speed < 0 or > 13, card fizzles (cannot be played)
        if (finalSpeed < 0 || finalSpeed >= 13) {
            // Effectively disabled for this tick/turn.
            // Since we check `finalSpeed === tick`, if finalSpeed is out of 0-12 range,
            // it will naturally not match any valid tick (0-12).
            // However, we need to ensure it doesn't trigger if it coincidentally matches a tick outside range?
            // Ticks go 0..12.
            // If finalSpeed is 13, it never matches tick <= 12.
            // If finalSpeed is -1, it never matches tick >= 0.
            // So the logic holds: strictly > 12 or < 0 means it won't play in standard ticks.
            // BUT, the user said "If speed >= 13... attack will disappear".
            // It just won't trigger. Correct.
            return;
        }

        if (finalSpeed === tick) {
          actions.push({ unit, card, usedBuffs });
        }
      });
    });

    // 2. Sort actions
    // Priority: Smaller Deck Size -> Random
    actions.sort((a, b) => {
      if (a.unit.cards.length !== b.unit.cards.length) {
        return a.unit.cards.length - b.unit.cards.length;
      }
      return Math.random() - 0.5; // Simple random for MVP
    });

    // 3. Execute actions
    actions.forEach(action => {
      if (action.unit.isDead) return;
      this.executeCard(action.unit, action.card, action.usedBuffs);
    });
  }

  private executeCard(source: BattleUnit, card: CardInstance, usedBuffs: { id: string; value: number }[] = []): void {
    this.log(source, null, `${source.name} uses ${card.name}!`, 'info', undefined, card.name);

    // Find targets
    const targets = this.findTargets(source, card);
    
    // Execute Script
    const script = CardScripts[card.scriptId];
    if (script) {
      script(this, source, targets);
    } else {
      this.log(source, null, `Script ${card.scriptId} not found!`, 'info');
    }

    // Check Deaths
    this.checkDeaths();

    // Consume "Next Card" buffs
    this.consumeNextCardBuffs(source, usedBuffs);
  }

  private consumeNextCardBuffs(unit: BattleUnit, usedBuffs: { id: string; value: number }[]): void {
    // Only remove buffs that are in nextCardBuffs AND were used (present in usedBuffs)
    const consumableBuffs = ['slow', 'haste'];
    
    usedBuffs.forEach(used => {
        if (!consumableBuffs.includes(used.id)) return;
        
        const buff = unit.buffs.find(b => b.id === used.id);
        if (buff) {
            if (buff.stackable) {
                // Decrement value by amount used
                buff.value = (buff.value || 0) - used.value;
                if ((buff.value || 0) <= 0) {
                    this.removeBuff(unit, buff.id);
                }
            } else {
                // Non-stackable, just remove
                this.removeBuff(unit, buff.id);
            }
        }
    });
  }

  private findTargets(source: BattleUnit, card: CardInstance): BattleUnit[] {
    // Targeting Logic Heuristic based on tags/intent
    
    // Check for Self-Targeting tags
    const isSupport = card.tags?.includes('辅助');
    const isDefense = card.tags?.includes('防御');
    
    // If it's explicitly support or defense, default to self
    if (isSupport || isDefense || card.scriptId === 'concentrate') {
        return [source];
    }
    
    // Default logic: single target, enemy
    const enemies = this.state.units.filter(u => u.team !== source.team && !u.isDead);
    if (enemies.length === 0) return [];
    
    // Random target
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    return [target];
  }

  private checkDeaths(): void {
    let teamAlive = { player: false, enemy: false };

    this.state.units.forEach(unit => {
      if (unit.hp <= 0) {
        unit.hp = 0;
        unit.isDead = true;
        this.log(unit, null, `${unit.name} is defeated!`, 'death');
      }
      if (!unit.isDead) {
        if (unit.team === 'player') teamAlive.player = true;
        if (unit.team === 'enemy') teamAlive.enemy = true;
      }
    });

    if (!teamAlive.player) {
      this.state.isOver = true;
      this.state.winner = 'enemy';
    } else if (!teamAlive.enemy) {
      this.state.isOver = true;
      this.state.winner = 'player';
    }
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

  // --- Helper Methods for Scripts ---

  public dealDamage(source: BattleUnit, target: BattleUnit, amount: number, type: 'physical' | 'magical'): void {
    // 1. Apply Source Buffs (Damage Up, e.g. Focus/Charge)
    let damage = amount;
    
    // Check for Charge (Damage x2)
    const chargeBuff = source.buffs.find(b => b.id === 'charge');
    if (chargeBuff) {
        damage *= (chargeBuff.value || 1);
        this.log(source, source, `Charge doubles damage!`, 'buff');
        // Consume charge
        this.removeBuff(source, 'charge');
    }
    
    // Check for Focus (+50%)
    const focusBuff = source.buffs.find(b => b.id === 'focus');
    if (focusBuff) {
        damage *= (focusBuff.value || 1);
        this.log(source, source, `Focus increases damage!`, 'buff');
        // Consume focus if intended (usually single use)
        // Design says "Next attack", so consume.
        this.removeBuff(source, 'focus');
    }

    // 2. Apply Target Buffs (Defense Up / Vulnerable / Bleed)
    // Bleed (as implemented): +1 damage taken from unmitigated physical
    
    // 3. Apply Armor (if physical)
    let unmitigated = false;
    if (type === 'physical') {
      if (target.armor > 0) {
        const armorDamage = Math.min(target.armor, damage);
        target.armor -= armorDamage;
        damage -= armorDamage;
        this.log(source, target, `Armor absorbed ${armorDamage} damage.`, 'info');
      } else {
        unmitigated = true;
      }
    } else {
        unmitigated = true; // Magic ignores armor? Usually yes.
    }
    
    // Apply Bleed extra damage if unmitigated physical
    if (type === 'physical' && unmitigated && damage > 0) {
        const bleedBuffs = target.buffs.filter(b => b.id === 'bleed');
        if (bleedBuffs.length > 0) {
            const bleedDmg = bleedBuffs.reduce((acc, b) => acc + (b.value || 0), 0);
            damage += bleedDmg;
            this.log(source, target, `Bleed adds ${bleedDmg} damage!`, 'buff');
        }
    }

    // 4. Apply HP Damage
    if (damage > 0) {
      target.hp -= damage;
      this.log(source, target, `${target.name} takes ${damage} damage!`, 'attack', damage);
    } else {
      this.log(source, target, `${target.name} takes no damage.`, 'info');
    }
  }

  public addArmor(unit: BattleUnit, amount: number): void {
    unit.armor += amount;
    this.log(unit, unit, `Gained ${amount} armor.`, 'buff', amount);
  }

  public addBuff(unit: BattleUnit, buff: Buff): void {
    // Check for stacking if stackable
    if (buff.stackable) {
        const existing = unit.buffs.find(b => b.id === buff.id);
        if (existing) {
            existing.value = (existing.value || 0) + (buff.value || 0);
            // Refresh duration? Usually yes.
            if (buff.duration > existing.duration) existing.duration = buff.duration;
            this.log(unit, unit, `Stacked buff: ${buff.name} (Value: ${existing.value})`, 'buff');
            return;
        }
    } else {
        // Non-stackable: Higher level (value) overwrites lower level
        const existing = unit.buffs.find(b => b.id === buff.id);
        if (existing) {
            if ((buff.value || 0) > (existing.value || 0)) {
                // Overwrite
                existing.value = buff.value;
                existing.duration = buff.duration;
                this.log(unit, unit, `Upgraded buff: ${buff.name} (Level ${existing.value})`, 'buff');
            } else {
                this.log(unit, unit, `Buff ${buff.name} (Level ${buff.value}) ineffective against existing Level ${existing.value}`, 'info');
            }
            return;
        }
    }
    
    unit.buffs.push(buff);
    this.log(unit, unit, `Applied buff: ${buff.name} (Level ${buff.value})`, 'buff');
  }
  
  public removeBuff(unit: BattleUnit, buffId: string): void {
      const idx = unit.buffs.findIndex(b => b.id === buffId);
      if (idx !== -1) {
          unit.buffs.splice(idx, 1);
      }
  }
}
