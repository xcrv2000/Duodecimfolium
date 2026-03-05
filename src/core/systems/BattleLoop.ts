import { BattleState, BattleUnit, BattleLogEntry, UnitBuff, CardInstanceBuff, CardFactoryBuff, DamageInfo } from '../domain/Battle';
import { CardInstance } from '../domain/Card';
import { CardScripts } from './CardScripts';

import { RNG } from '../../utils/rng';
import buffsData from '../../data/buffs.json';

export class BattleLoop {
  private state: BattleState;
  private currentCard: CardInstance | null = null;
  private rng: RNG;

  constructor(state: BattleState, rng: RNG) {
    this.state = state;
    this.rng = rng;
  }

  // Helper function to format buff descriptions with level
  private formatBuffDescription(template: string, level: number): string {
    return template.replace(/{level}/g, level.toString());
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
          factoryBuffs: [],
          buffs: []
      };
      
      this.initializeCardTags(newCard);
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

  // --- Helper Methods ---

  private initializeCardTags(card: CardInstance): void {
      // === 初始化卡的运行时标签 ===
      // tagsRuntime = factory.tags（基础标签）+ 修饰珠添加的标签
      // 
      // 基础标签来自卡的定义（例如 "攻击/物理", "辅助", "防御"）
      // 修饰珠可以添加额外标签（例如火灵珠添加 "魔法/火"）
      card.tagsRuntime = [...(card.factory.tags || [])];
      
      // 应用 attr_add 修饰珠效果
      card.modifiers.forEach(mod => {
          if (mod.effectId === 'attr_add') {
              // 根据 modifier.value 添加相应的标签路径
              if (mod.value === 'fire') {
                  if (!card.tagsRuntime!.includes('魔法/火')) {
                      card.tagsRuntime!.push('魔法/火');
                  }
              } else if (mod.value === 'ice') {
                  if (!card.tagsRuntime!.includes('魔法/冰')) {
                      card.tagsRuntime!.push('魔法/冰');
                  }
              } else if (mod.value === 'rock') {
                  if (!card.tagsRuntime!.includes('物理/岩')) {
                      card.tagsRuntime!.push('物理/岩');
                  }
              }
          }
      });
  }

  // --- Main Loop Methods ---

  public nextTick(): BattleState {
    if (this.state.isOver) return this.state;

    // 如果是新回合开始（tick == 0），调用onTurnStart回调
    if (this.state.tick === 0) {
      this.startTurn();
    }

    this.processTick(this.state.tick);

    this.state.tick++;
    if (this.state.tick > 12) {
      this.endTurn();
    }

    return { ...this.state };
  }

  public executeStartOfBattleEffects(): void {
    this.log(null, null, "--- 战斗开始 ---", 'info');
    
    // 0. Apply Duplicate Card Speed Penalty
    // "同名卡第2张速度+0.9，第3张速度+2.8"
    this.state.units.forEach(unit => {
        const cardNameCount = new Map<string, number>();
        
        unit.cards.forEach(card => {
            const count = cardNameCount.get(card.factory.id) ?? 0;
            cardNameCount.set(card.factory.id, count + 1);
            
            if (count === 1) {
                // Second occurrence: +0.9 speed = +9 speed10
                card.deckSpeedPenalty = (card.deckSpeedPenalty || 0) + 9;
                this.log(unit, null, `${card.factory.name} (第2张): 速度惩罚 +0.9`, 'info');
            } else if (count === 2) {
                // Third occurrence: +2.8 speed = +28 speed10
                card.deckSpeedPenalty = (card.deckSpeedPenalty || 0) + 28;
                this.log(unit, null, `${card.factory.name} (第3张): 速度惩罚 +2.8`, 'info');
            }
        });
    });

    // 0.5. Initialize Card Tags (including modifier-added tags) and Factory Buffs
    this.state.units.forEach(unit => {
        unit.cards.forEach(card => {
            this.initializeCardTags(card);
            
            // Initialize factoryBuffs if not already present
            if (!card.factoryBuffs) {
                card.factoryBuffs = [];
            }
            
            // Apply baseline factory buffs from CardFactory definition
            if (card.factory.baselineFactoryBuffs) {
                card.factory.baselineFactoryBuffs.forEach(buff => {
                    this.addCardFactoryBuff(card, buff);
                });
            }
        });
    });
    
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
        if (card.factory.scriptId === 'whetstone') {
             if (isEliteOrBoss) {
                 this.executeCard(unit, card);
             }
             return;
        }
        
        // Skip Ration (handled at end)
        if (card.factory.scriptId === 'ration') return;
        
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
    
    // === 回合结束结算流程 ===
    // 这个阶段结算本回合残留的状态并准备下一回合
    // 
    // 执行顺序（确保buff生命周期与速度计算一致）：
    // 1. duration递减
    // 2. buff清除（duration <= 0）
    // 3. 重新计算速度（应用仍然存活的buff）
    // 
    // 【例：眩晕buff的完整生命周期】
    // T1回合：【摔】卡执行 → addUnitBuff({id: 'stun', duration: 2, level: 2})
    //        duration=2时，recalculateCardSpeed检查`buff.duration === 1`不满足 → 不应用速度修正
    // T1回合结束：duration递减 2→1，buff保留（duration > 0）→ 下一回合应用速度修正
    // T2回合：recalculateCardSpeed检查`buff.duration === 1`满足 → 应用速度修正(+2.0)
    // T2回合结束：duration递减 1→0，buff删除（duration <= 0）→ 速度修正解除
    this.state.units.forEach(unit => {
      // 1. 结算单位 buff（UnitBuff）
      // 【顺序很重要】先触发回调，再递减duration
      unit.buffs.forEach(buff => {
        if (buff.onTurnEnd) buff.onTurnEnd(unit, this.state);
        buff.duration--;  // ← 关键：在这里递减，之后的recalculateCardSpeed会读到新的duration值
      });
      
      // 清除已过期的单位 buff（duration <= 0）
      // 包括护甲buff在内的所有buff都会在此处根据duration自动清除
      unit.buffs = unit.buffs.filter(b => b.duration > 0);
      
      // 3. 重置卡实例并重算速度
      // CardInstanceBuff清除（这些是本回合临时buff，如"下一张卡速度+X"）
      // 然后重新计算速度，此时：
      //   - unit.buffs已更新（duration已递减，已删除多余的）
      //   - 新的recalculateCardSpeed会读到最新的buff状态
      unit.cards.forEach(card => {
          card.buffs = []; // Clear CardInstanceBuffs (清除本回合临时buff)
          this.recalculateCardSpeed(unit, card); // 重新计算速度，应用仍然存活的UnitBuff
      });
    });

    this.log(null, null, "--- 回合结束 ---", 'info');
  }

  private startTurn(): void {
    // === 回合开始处理 ===
    // 调用所有UnitBuff的onTurnStart回调
    this.state.units.forEach(unit => {
      unit.buffs.forEach(buff => {
        if (buff.onTurnStart) {
          buff.onTurnStart(unit, this.state);
        }
      });
    });
  }

  private recalculateCardSpeed(unit: BattleUnit, card: CardInstance): void {
      if (card.baseSpeed10 === null) {
          card.currentSpeed10 = null;
          return;
      }
      
      // === 速度计算说明 ===
      // 底层逻辑全部使用 speed10 单位（整数0-130）
      // UI层显示时除以10得到玩家可见的速度（浮点0-13）
      //
      // speed10 = baseSpeed10 + permanentSpeedModifier + modifiers_speedMod + UnitBuffs + CardBuffs + deckPenalty
      //
      // 【单位转换规则】
      // 玩家看到的速度值：         底层speed10：
      // 0.1 → 1,   0.9 → 9,   2.0 → 20,   2.8 → 28
      // （所有计算保留整数，避免浮点误差）
      
      // baseSpeed10 not null here, so start with a numeric speed
      let speed: number | null = card.baseSpeed10 + (card.permanentSpeedModifier || 0);

      // we know speed is a number right now; later boundary checks may set it to null
      let numericSpeed: number = speed as number;
      
      // === 应用修饰珠效果 ===
      // 修饰珠系统支持两种效果：
      // 1. speed_mod: 修改卡的速度 (微风珠 -0.5, 黑铁珠 +0.5)
      // 2. attr_add: 添加属性标签 (火灵珠 "火", 冰灵珠 "冰", 岩灵珠 "岩")
      //
      // 速度修饰是在这里应用的，属性修饰在 initializeCardTags() 中应用
      if (card.modifiers) {
        card.modifiers.forEach(mod => {
            if (mod.effectId === 'speed_mod') {
                const val = Number(mod.value);
                if (!isNaN(val)) {
                    // value 在 modifiers.json 中是浮点数，需要转为 x10
                    numericSpeed += Math.round(val * 10);
                }
            }
            // attr_add 效果在 initializeCardTags() 中处理
        });
      }

      // Apply CardFactoryBuffs
      if (card.factoryBuffs) {
        card.factoryBuffs.forEach(buff => {
            if (buff.speedModification) {
                numericSpeed += buff.speedModification;
            }
        });
      }

      // Apply CardInstanceBuffs
      if (card.buffs) {
        card.buffs.forEach(buff => {
            if (buff.speedModification) {
                numericSpeed += buff.speedModification;
            }
        });
      }

      // Apply Unit Buffs that affect speed
      // Charge: +10 speed10 (immediate) → +1.0 speed
      // Stun: +level*10 speed10 (next turn only, i.e., duration === 1) → speed increase by level
      //
      // 【眩晕】例：level=2 意味着目标卡速度+2.0，转换为speed10则为+20
      unit.buffs.forEach(buff => {
          if (buff.id === 'charge') {
              numericSpeed += 10; // +1.0 speed（蓄势：下一次攻击前加速1.0）
          }
          // 【眩晕】在duration===1时才应用，此时buff已在上一个回合结束时由duration从2递减至1
          if (buff.id === 'stun' && buff.duration === 1) {
              numericSpeed += buff.level * 10; // ✅ FIX: 乘以10转换为speed10单位（level:2 → +20 speed10 → +2.0 speed）
          }
      });
      
      // Apply Deck Speed Penalty
      numericSpeed += (card.deckSpeedPenalty || 0);
      
      // === 速度边界值处理 ===
      // now assign back to speed variable so boundary logic can set null if needed
      speed = numericSpeed;
      // 
      // 下限（<0）：根据战斗系统修正文档 §1.3
      // "speed < 0 invalid" - 速度不能为负
      // 含义：卡不能放在时间轴之前，minimum speed = 0（tick 0）
      if (speed !== null && speed < 0) speed = 0;
      
      // 上限（≥130）：根据战斗系统修正文档 §1.3
      // "speed ≥ 13 invalid" - 这里指的是 0.1 精度的速度值
      // 约等于 currentSpeed10 >= 130（即 >= 13.0，超出时间轴范围）
      // 含义：卡被加速过度，超出时间轴最大值 12.9，无法在战斗中触发
      // 
      // 处理方案：标记为"失效"，不会在 tick 循环中触发
      // TODO: 在 UI 中显示失效卡，鼠标悬停告知理由
      if (speed !== null && speed >= 130) {
        speed = null; // 无效速度，不会被触发
      }
      
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
    this.log(source, null, `${source.name} 发动了 ${card.factory.name}!`, 'info', undefined, card.factory.name);

    // Find targets
    const targets = this.findTargets(source, card);
    
    // Execute Script
    const script = CardScripts[card.factory.scriptId];
    if (script) {
      try {
          // Check for Calm Mind buff on source
          const calmMindBuff = source.buffs.find(b => b.id === 'calm_mind');
          const isMagicAttack = card.tagsRuntime?.includes('魔法') && card.tagsRuntime?.includes('攻击');

          if (calmMindBuff && isMagicAttack) {
              this.log(source, null, `触发气定神闲: ${card.factory.name} 重复结算5次!`, 'buff');
              
              // Execute 5 times
              for(let i=0; i<5; i++) {
                  script(this, source, targets);
                  this.checkDeaths(); // Check deaths between hits?
                  if (this.state.isOver) break;
              }
              
              // Remove the attack card (current card) from source deck
              const cardIdx = source.cards.findIndex(c => c.instanceId === card.instanceId);
              if (cardIdx !== -1) {
                  source.cards.splice(cardIdx, 1);
                  this.log(source, null, `移除攻击卡: ${card.factory.name}`, 'info');
              }
              
              // Remove the Calm Mind card from source deck (using sourceInstanceId from buff)
              if (calmMindBuff.sourceInstanceId) {
                  const cmIdx = source.cards.findIndex(c => c.instanceId === calmMindBuff.sourceInstanceId);
                  if (cmIdx !== -1) {
                      const cmCard = source.cards[cmIdx];
                      source.cards.splice(cmIdx, 1);
                      this.log(source, null, `移除气定神闲卡: ${cmCard.factory.name}`, 'info');
                  }
              }
              
              // Remove the buff
              this.removeBuff(source, 'calm_mind');
          } else {
              script(this, source, targets);
          }
      } catch (e) {
          console.error(`Error executing script ${card.factory.scriptId}`, e);
          this.log(source, null, `执行卡牌 ${card.factory.name} 失败: ${e}`, 'info');
      }
    } else {
      this.log(source, null, `找不到脚本 ${card.factory.scriptId}!`, 'info');
    }

    this.currentCard = null;

    // Check Deaths
    this.checkDeaths();
  }

  private findTargets(source: BattleUnit, card: CardInstance): BattleUnit[] {
    // Targeting Logic
    const isSupport = card.tagsRuntime?.includes('辅助');
    const isDefense = card.tagsRuntime?.includes('防御');
    
    if (isSupport || isDefense || card.factory.scriptId === 'concentrate') {
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
                 if (card.factory.scriptId === 'ration') {
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
    
    // 3. Apply Armor (if physical)
    // Use card.tagsRuntime to determine damage type (includes modifier-added tags)
    let effectiveType = type;
    
    const cardTags = this.currentCard?.tagsRuntime || [];
    // Check if card has magic tags
    const hasMagicTag = cardTags.some(tag => tag.includes('魔法'));
    
    if (hasMagicTag && type === 'physical') {
        // Mixed damage - treat as magical for armor purposes
        effectiveType = 'magical';
    } else if (cardTags.some(tag => tag === '物理/岩')) {
        // Rock explicitly marked as physical
        effectiveType = 'physical';
    }
    
    let unmitigated = false;
    if (effectiveType === 'physical') {
      const armorBuff = target.buffs.find(b => b.id === 'armor');
      if (armorBuff && armorBuff.level > 0) {
        const armorDamage = Math.min(armorBuff.level, damage);
        armorBuff.level -= armorDamage;
        damage -= armorDamage;
        this.log(source, target, `护甲吸收了 ${armorDamage} 点伤害。`, 'info');
        // Remove armor buff if depleted
        if (armorBuff.level <= 0) {
          const idx = target.buffs.findIndex(b => b.id === 'armor');
          if (idx !== -1) target.buffs.splice(idx, 1);
        }
      }
      if (damage > 0) unmitigated = true;
    }
    
    // 2. Apply Target Buffs (onReceiveDamage)
    // Build DamageInfo structure
    const damageInfo: DamageInfo = {
        amount: damage,
        sourceUnit: source,
        targetUnit: target,
        type: effectiveType,
        tags: cardTags
    };
    
    target.buffs.forEach(buff => {
        if (buff.onReceiveDamage) {
            damage = buff.onReceiveDamage(target, damageInfo, this.state);
            // Update damageInfo for next callbacks
            damageInfo.amount = damage;
        }
    });
    
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
    const armorBuff: UnitBuff = {
      id: 'armor',
      level: amount
    };
    this.addUnitBuff(unit, armorBuff);
  }

  public addUnitBuff(unit: BattleUnit, buff: UnitBuff): void {
    // 从buffs.json查找定义，如果存在则使用定义中的信息
    const buffDef = buffsData.find(b => b.id === buff.id);
    if (buffDef) {
      buff.name = buffDef.name;
      buff.description = this.formatBuffDescription(buffDef.description, buff.level);
      buff.type = buffDef.type;
      buff.stackRule = buffDef.stackRule;
      buff.duration = buffDef.duration; // 使用定义中的默认duration，除非明确指定
    }

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
    
    // === Buff应用时机说明 ===
    // 立即生效buff（如【蓄势】Charge）：
    //   - duration通常为1，在添加时立即应用到下一张卡
    //   - addUnitBuff后的recalculateCardSpeed会检查buff.id === 'charge'
    //
    // 延迟生效buff（如【眩晕】Stun）：
    //   - duration为2（当前回合+下一回合）
    //   - 添加时duration=2，recalculateCardSpeed检查`buff.duration === 1`不满足 → 暂不应用
    //   - 回合结束时duration递减至1 → 下一回合时应用速度修正
    //   - 这样设计确保【眩晕】的减速效果在"下一回合开始"时才应用
    //
    // 对于speed相关的buff，记住：
    //   - 速度值都用speed10单位（0-130），需要乘以10
    //   - buff.level是效果等级，应用时需确认单位转换（例：level=2意味着+2.0速度，应加20到numericSpeed）
    
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

  // API: Add Card Factory Buff (持续到战斗结束)
  public addCardFactoryBuff(card: CardInstance, buff: CardFactoryBuff): void {
      if (!card.factoryBuffs) card.factoryBuffs = [];
      card.factoryBuffs.push(buff);
      
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
