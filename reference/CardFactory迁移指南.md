# CardFactory 迁移指南

**版本**: 1.0  
**面向对象**: 后续开发者、AI 助手、设计师  
**背景**: CardFactory 架构将卡的配置（定义）与运行时实例分离

---

## 为什么需要 CardFactory？

### 问题

原来 `CardInstance` 直接继承了 `Card` 接口，导致：
- **概念混淆**：配置级属性与运行时属性混在一起
- **内存浪费**：每个卡实例都複制了整个卡配置
- **碎片化维护**：修改卡配置需要多处更新代码
- **扩展困难**：工厂级 Buff（持久化到战斗结束）无法优雅实现

### 解决方案

**CardFactory** 模式：
```
CardFactory（配置蓝图，共享）
     ↓
   [工厂在 BattleStore 初始化时加载]
     ↓
CardInstance（运行时对象，每回合新建）
     ↓ 引用关系（composition）
依赖 factory 字段访问配置
```

**收益**：
- ✅ 概念清晰：Card/CardFactory = 配置，CardInstance = 运行时
- ✅ 内存高效：多个 CardInstance 共享同一个 factory
- ✅ 维护便利：卡配置改动只需改 JSON + CardFactory 定义
- ✅ 扩展有序：cardFactoryBuffs, baselineFactoryBuffs 有清晰归属

---

## 迁移指南：从 Card 到 CardFactory

### 0. 了解新接口

#### CardFactory（原 Card）
```typescript
export interface CardFactory {
  id: string;
  name: string;
  description: string;
  effectDescription: string;
  packId: string;
  rarity: number;
  speed: number | null;  // 配置中以 0.1 精度存储（2.1 代表 2.1）
  scriptId: string;
  tags: string[];
  baselineFactoryBuffs?: CardFactoryBuff[];  // [新] 工厂级 buff 预设
}

// 兼容性
export type Card = CardFactory;  // Card 现在就是 CardFactory 的别名
```

#### CardInstance（已改动）
```typescript
export interface CardInstance {
  factory: CardFactory;  // [新] 引用卡的配置
  instanceId: string;

  // x10 格式的速度（运行时转换）
  baseSpeed10: number | null;  // factory.speed * 10，转为整数
  currentSpeed10: number | null;  // 当前速度，包含所有修正

  // 修正值
  permanentSpeedModifier: number;  // 永久修正（如 NPC +0.1）
  deckSpeedPenalty: number;  // 同名卡惩罚

  // 运行时标签（factory.tags + 修饰珠添加）
  tagsRuntime: string[];
  
  // 修修饰珠和 Buff
  modifiers: Modifier[];
  buffs: CardInstanceBuff[];
  factoryBuffs?: CardFactoryBuff[];  // [新] 运行时工厂级 buff

  // 执行序号
  executionOrder?: number;
}
```

---

### 1. 更新现有代码

#### 场景 A：访问卡的配置属性

**旧代码**:
```typescript
const cardName = card.name;
const cardSpeed = card.speed;
const scriptId = card.scriptId;
```

**新代码**:
```typescript
const cardName = card.factory.name;
const cardSpeed = card.factory.speed;  // 仍然是 0.1 精度的浮点数
const scriptId = card.factory.scriptId;
```

**所有配置属性**（需要加 `.factory.`）:
- name, description, effectDescription
- packId, rarity
- speed, scriptId, tags, id

#### 场景 B：访问运行时状态

**这些保留在 CardInstance 上，不需改动**:
```typescript
card.baseSpeed10;        // 转换后的速度（x10 整数）
card.currentSpeed10;     // 当前速度（包含修正）
card.tagsRuntime;        // 运行时标签（含修饰珠添加）
card.buffs;              // Buff 列表
card.modifiers;          // 镶嵌的修饰珠
card.deckSpeedPenalty;   // 同名卡惩罚
```

#### 场景 C：标签判断（⚠️ 重要变化）

**旧代码**（访问配置级标签）:
```typescript
const isAttack = card.tags?.includes('攻击');
const isMagic = card.tags?.includes('魔法');
```

**新代码**（访问运行时标签，包含修饰珠添加）:
```typescript
const isAttack = card.tagsRuntime?.includes('攻击');
const isMagic = card.tagsRuntime?.includes('魔法');
```

**为什么改**？
- 修饰珠（如火灵珠）会动态添加标签（如 "魔法/火"）
- 使用 tagsRuntime 确保判断时包含这些动态标签
- 这影响卡牌效果计算（如某卡"魔法攻击触发特效"）

---

### 2. 创建 CardInstance 时

#### 用 factory 替代展开操作符

**旧代码**:
```typescript
const instance: CardInstance = {
  ...cardDef,  // ❌ 展开所有属性
  instanceId: `card_${idx}`,
  baseSpeed10: Math.round(cardDef.speed * 10),
  currentSpeed10: null,
  buffs: []
};
```

**新代码**:
```typescript
const instance: CardInstance = {
  factory: cardDef,  // ✅ 引用而非展开
  instanceId: `card_${idx}`,
  ownerId: owner.id,
  baseSpeed10: Math.round(cardDef.speed * 10),
  currentSpeed10: null,
  tagsRuntime: [...cardDef.tags],  // 初始化为工厂标签
  modifiers: [],
  buffs: [],
  factoryBuffs: [],  // [新] 初始化空数组
  permanentSpeedModifier: 0,
  deckSpeedPenalty: 0
};
```

**参考实现**: [battleStore.ts](../src/stores/battleStore.ts) § nextStage()

---

### 3. 在脚本中使用新 API

#### API 变化

| 原 API | 新 API | 说明 |
|-------|--------|------|
| `dealDamage()` | 不变 | 仍在 CardScripts 中可用 |
| `gainArmor()` | 不变 | 仍在 CardScripts 中可用 |
| 无 | `addCardFactoryBuff()` | [新] 为卡添加工厂级 buff |
| 无 | `addCardInstanceBuff()` | [新] 为卡添加实例级 buff |
| 无 | `addTag()` | [新] 动态添加标签（修饰珠也用此）|

#### 示例：编写使用工厂级 Buff 的卡脚本

```typescript
// 例：一张卡"本战斗永久获得 +0.5 速度"
const myCardScript = {
  execute: (context) => {
    const { battle, card, source } = context;
    
    // 添加工厂级 buff（战斗持久）
    battle.addCardFactoryBuff(card, {
      id: 'my_speed_boost',
      name: '加速 Buff',
      description: '+0.5 速度',
      duration: Infinity,  // 持续到战斗结束
      stackRule: 'nonStackable',
      level: 1,
      speedModification: 5  // +0.5 x10
    });
    
    // 或者：为单位添加工厂级 buff
    battle.addCardFactoryBuff(card, {
      // ...buff 定义...（同上）
    });
  }
};
```

#### 示例：动态改变标签

```typescript
// 修饰珠的实现示例
const fireModifier = {
  effectId: 'attr_add',
  value: 'fire'
};

// 在 BattleLoop.initializeCardTags() 中应用
if (mod.effectId === 'attr_add' && mod.value === 'fire') {
  if (!card.tagsRuntime!.includes('魔法/火')) {
    card.tagsRuntime!.push('魔法/火');
  }
}

// 或者将来可能有脚本动态添加标签
battle.addTag(card, '魔法/火');
```

---

### 4. 数据格式检查清单

**JSON 卡牌数据** [src/data/cards.json](../src/data/cards.json)

✅ 以下格式**无需改动**（兼容 CardFactory）:
```json
{
  "id": "slash",
  "name": "斩击",
  "description": "普通攻击",
  "effectDescription": "造成 20 点伤害",
  "packId": "basic_swordsmanship",
  "rarity": 3,
  "speed": 2.1,
  "scriptId": "attack",
  "tags": ["攻击", "物理"],
  "baselineFactoryBuffs": []  // [可选] 工厂级 buff 预设
}
```

**不需要分离成两个文件**，JSON 数据保持原样 ✅

---

### 5. 代码扩展清单

如果在后续开发中需要：

#### ① 添加新的修饰珠效果

1. 在 [modifiers.json](../src/data/modifiers.json) 中定义新修饰珠：
   ```json
   {
     "id": "wind_spirit_orb",
     "name": "风灵珠",
     "effectId": "attr_add",
     "value": "wind"
   }
   ```

2. 在 [BattleLoop.ts](../src/core/systems/BattleLoop.ts) 的 `initializeCardTags()` 中添加分支：
   ```typescript
   } else if (mod.value === 'wind') {
     if (!card.tagsRuntime!.includes('魔法/风')) {
       card.tagsRuntime!.push('魔法/风');
     }
   }
   ```

#### ② 添加工厂级 Buff 的脚本

在 [CardScripts.ts](../src/core/systems/CardScripts.ts) 中：
```typescript
// 某卡定义中调用
context.battle.addCardFactoryBuff(card, {
  id: 'card_boost_123',
  name: '卡自身加速',
  duration: Infinity,
  stackRule: 'nonStackable',
  level: 1,
  speedModification: 5  // +0.5
});
```

#### ③ 多英雄支持（后续迭代）

当实现多英雄时，只需改动 `nextStage()` 签名：
```typescript
// 将来的改动
nextStage(deckIds: string[]) {  // 接收数组而非单个 deck
  const playerUnits = deckIds.map(id => {
    const deck = playerStore.decks.find(d => d.id === id);
    return this.createUnit(deck, 'player');
  });
  // ...
}
```

其他代码（时间轴排序、Buff 逻辑）无需改动 ✅

---

## 常见问题 (FAQ)

### Q1: 为什么要改 `card.tags` 为 `card.factory.tags`？

**A**: 区分两个概念：
- `card.factory.tags`：卡的**基础标签**（来自定义）
- `card.tagsRuntime`：**运行时标签**（基础 + 修饰珠添加）

例如，火灵珠会添加 "魔法/火" 标签。如果脚本判断"该卡是否是魔法攻击"，应使用 tagsRuntime，这样修饰珠的效果才能被正确计入。

---

### Q2: CardInstance 还保留了 modifiers, buffs, deckSpeedPenalty 这些，为什么不也合并到 factory？

**A**: 因为这些是**运行时动态的**：
- `modifiers`：同一张卡在不同卡组中可能镶嵌不同的修饰珠
- `buffs`：同一张卡在不同战场中可能受到不同的 buff
- `deckSpeedPenalty`：同一张卡在不同卡组中可能因为出现次数不同而有不同惩罚

所以这些都应该在 CardInstance 中，而不是 factory。

---

### Q3: JSON 卡数据要改吗？

**A**: **不要改**。现在 `Card` 是 `CardFactory` 的别名，JSON 数据自动被视为 CardFactory。

唯一的可选改进是在卡定义中添加 `baselineFactoryBuffs`，但不是必须的。

---

### Q4: 现有的卡脚本要改吗？

**A**: **部分改**。
- 如果脚本中访问了 `card.name`, `card.scriptId` 等配置属性，需要改为 `card.factory.xxx`
- 如果脚本判断标签（`card.tags.includes(...)`），改为 `card.tagsRuntime.includes(...)`
- 如果脚本使用 BattleLoop API（dealDamage 等），无需改动

---

### Q5: 未来想给某张卡添加"工厂级缓冲效果"，怎么做？

**A**: 
1. 在卡的脚本中调用：
   ```typescript
   context.battle.addCardFactoryBuff(card, buffDefinition);
   ```
2. 或者在卡的 JSON 定义中预设：
   ```json
   "baselineFactoryBuffs": [{ ... }]
   ```
   这样卡在战斗开始时会自动应用这些 buff。

---

## 验证检查清单

完成迁移后，检查以下项目：

- [ ] 所有 `card.property` 都改为 `card.factory.property`（除了运行时字段）
- [ ] 所有 `card.tags` 改为 `card.tagsRuntime`（标签判断）
- [ ] CardInstance 创建时使用 factory 引用，不展开属性
- [ ] 初始化 CardInstance 的 tagsRuntime, buffs, factoryBuffs 等字段
- [ ] 脚本中使用 addCardFactoryBuff() 和 addCardInstanceBuff()
- [ ] 编译通过，无类型错误
- [ ] 地牢战斗运行正常
- [ ] 卡功能按预期触发

---

## 参考链接

- [重构变更日志](./重构变更日志.md) - 全面的改动总结
- [架构设计决策 - CardFactory](./ADR_001_CardFactory.md) - 为什么选择这个设计
- [Card.ts](../src/core/domain/Card.ts) - CardFactory 接口定义
- [BattleLoop.ts](../src/core/systems/BattleLoop.ts) - 实现参考
- [battleStore.ts](../src/stores/battleStore.ts) - CardInstance 创建示例

---

**更新日期**: 2026-03-04  
**维护者**: AI 开发助手 / 后续开发团队
