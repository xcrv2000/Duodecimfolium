# 战斗系统开发者手册

本文档描述了重构后的战斗系统核心机制、数据模型及脚本 API。

## 1. 核心机制 (Core Mechanics)

### 1.1 时间轴 (Timeline)
- **Tick**: 每回合分为 13 个 Tick (0-12)。
- **精度**: 速度计算采用 0.1 精度，内部存储为整数 `speed10` (即 speed * 10)。
- **触发条件**: 当卡牌的 `currentSpeed10` 落在 `[tick*10, (tick+1)*10)` 区间内时触发。
- **范围**: 速度可以是任意值，但只有 `[0, 130)` 范围内的卡牌会被触发。超速或负速卡牌保留在时间轴上但不执行。

### 1.2 动态重排 (Dynamic Re-sorting)
- 在同一个 Tick 内，卡牌按照 `currentSpeed10` 升序排列。
- **即时生效**: 任何改变卡牌速度的操作（如 Buff）都会立即触发本回合剩余时间轴的重排。
- **不补发原则**: 如果卡牌被加速/减速移出了当前 Tick，它将从当前执行队列中移除（如果是移入，则加入）。如果移到了已过去的 Tick，则本回合不再触发。

### 1.3 同速规则
当多张卡牌速度相同时，优先级如下：
1. **所属角色初始卡组大小** (Initial Deck Size): 卡组小的角色优先。
2. **随机**: 若仍相同，随机决定。

## 2. 数据模型 (Data Models)

### 2.1 CardInstance
运行时卡牌实例，包含动态状态：
- `instanceId`: 唯一标识。
- `baseSpeed10`: 基础速度 (x10)。
- `currentSpeed10`: 当前有效速度 (x10)。
- `buffs`: 挂载在卡牌上的 `CardInstanceBuff` 列表。
- `ownerId`: 持有者 ID。

### 2.2 BattleUnit
战斗单位，包含：
- `buffs`: 挂载在单位上的 `UnitBuff` 列表。
- `initialDeckSize`: 用于同速判定。

### 2.3 Buff
Buff 分为两类：
- **UnitBuff**: 挂载在单位上，具有生命周期和钩子函数。
    - `duration`: 剩余回合数。默认 1 (回合结束消失)。
    - `stackRule`: `stackable` (叠加等级) 或 `nonStackable` (取高等级)。
    - `onAttack`, `onReceiveDamage`, `onTurnEnd` 等钩子。
- **CardInstanceBuff**: 挂载在卡牌上，通常用于临时的速度修正。
    - `speedModification`: 速度修正值 (x10)。

## 3. 脚本 API (Scripting API)

`BattleLoop` 提供了供卡牌脚本调用的 API：

### 3.1 核心操作
- `dealDamage(source, target, amount, type)`: 造成伤害，自动处理护甲、Buff (如流血、蓄势、专注)。
- `addArmor(unit, amount)`: 增加护甲。
- `addUnitBuff(unit, buff)`: 添加或更新单位 Buff，自动处理堆叠规则。
- `removeBuff(unit, buffId)`: 移除 Buff。

### 3.2 时间轴操作
- `modifyCardSpeed(card, delta10)`: 修改指定卡牌的速度（增量 x10），并触发重排。
- `findNextCardOnTimeline(unit)`: 查找指定单位在当前时间轴上的下一张尚未触发的卡牌。

## 4. Buff 系统详解

### 4.1 生命周期
- **回合结束**: 所有 Buff 的 `duration` 减 1。若 `duration <= 0`，Buff 移除。
- **护甲**: 回合结束时清零。

### 4.2 堆叠规则
- `stackable`: `level` 相加，刷新 `duration`。
- `nonStackable`: 若新 Buff `level` 更高，则覆盖旧 Buff（更新 level 和 duration）。

### 4.3 内置 Buff 逻辑
- **蓄势 (Charge)**: 下一次攻击伤害 x2，且该单位所有卡牌速度 +1 (x10)。触发攻击后移除。
- **流血 (Bleed)**: 受到未被护甲完全抵消的物理伤害时，额外受到 `level` 点伤害。
- **眩晕 (Stun)**: 下回合所有卡牌速度 +`level`。
- **专注 (Focus)**: 下一次攻击伤害 x1.5。触发攻击后移除。

## 5. 开发指南

### 添加新卡牌
1. 在 `src/data/cards.json` 中定义卡牌数据，指定 `scriptId` 和 `speed` (整数)。
2. 在 `src/core/systems/CardScripts.ts` 中实现对应的脚本逻辑。

### 示例：实现“突” (Thrust)
```typescript
thrust: (loop, source, targets) => {
    const target = targets[0];
    if (!target) return;
    
    // 造成伤害
    loop.dealDamage(source, target, 3, 'physical');
    
    // 查找并减速下一张卡
    const nextCard = loop.findNextCardOnTimeline(target);
    if (nextCard) {
        loop.modifyCardSpeed(nextCard, 10); // 速度 +1.0
    }
}
```
