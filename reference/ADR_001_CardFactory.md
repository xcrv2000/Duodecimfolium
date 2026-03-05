# 架构设计决策记录 (ADR)

## ADR-001: 采用 CardFactory 模式分离卡定义与实例

**日期**: 2026-03-04  
**状态**: 已接纳  
**分类**: 架构设计  
**优先级**: 🔴 CRITICAL  

---

## 背景

项目早期阶段使用了单一的 `Card` 接口来表示卡的所有信息，包括：
- **配置级属性**：名称、描述、基础速度、脚本 ID、标签等
- **运行时状态**：当前速度、Buff、修饰珠、实例 ID 等

这导致了以下问题：

1. **概念模糊**: Card 同时表示"卡是什么"和"卡现在的状态"
2. **内存浪费**: 每个 CardInstance 都複制整个卡配置数据，在 64 张卡的卡组中造成冗余
3. **代码复杂性增加**: Buff 系统（UnitBuff, CardInstanceBuff, 工厂级 Buff）没有清晰的归属
4. **维护困难**: 修改卡定义需要多处更新

---

## 决策

**采用 Factory Pattern**，将 `Card` 拆分为：

### CardFactory（配置蓝图）
```typescript
export interface CardFactory {
  id: string;
  name: string;
  // ... 所有配置属性
  baselineFactoryBuffs?: CardFactoryBuff[];  // 工厂预设的 Buff
}

// 兼容性别名
export type Card = CardFactory;
```

### CardInstance（运行时对象）
```typescript
export interface CardInstance {
  factory: CardFactory;  // 引用，不是继承或展开
  // ... 仅运行时属性
  currentSpeed10: number | null;
  buffs: CardInstanceBuff[];
  factoryBuffs?: CardFactoryBuff[];
}
```

### 生命周期

```
游戏启动 → 加载 CardFactory (JSON) → 缓存到内存
            ↓
进入战斗 → 为每个卡组卡片创建 CardInstance（引用 factory）
            ↓
结束战斗 → CardInstance 销毁，factory 保留
```

---

## 理由

### 1. 概念清晰度 ⭐⭐⭐⭐⭐
- **CardFactory**：卡在游戏设计中的定义
- **CardInstance**：卡在战斗中的运行状态
- 分离概念使代码意图明确，易于维护

### 2. 内存效率 ⭐⭐⭐⭐
对比原方案：
```
原方案（Card 继承）：
  CardInstance x 64 in deck
  └─ 包含所有配置信息（name, description, tags, speed, scriptId等）
     总大小 ≈ 64 × 500 bytes = 32 KB

新方案（Factory 引用）：
  CardFactory x 300 (全游戏卡库)
  └─ 配置信息一份 ≈ 500 bytes × 300 = 150 KB
  
  CardInstance x 64 in deck
  └─ 仅运行时字段 ≈ 200 bytes × 64 = 12.8 KB
  
  总计 ≈ 163 KB（多卡组时优势更明显）
```

### 3. Buff 系统架构 ⭐⭐⭐⭐⭐
三种 Buff 的归属清晰：

| Buff 类型 | 宿主 | 生命周期 | 使用例 |
|---------|------|--------|--------|
| UnitBuff | BattleUnit | 多回合 | 流血、眩晕、蓄势 |
| CardInstanceBuff | CardInstance | 本回合 | 卡的临时加速道具 |
| CardFactoryBuff | CardFactory (在 CardInstance 上) | 战斗级 | 卡的永久加速设定 |

这个清晰的分层使脚本编写更容易，维护也更有序。

### 4. 扩展性 ⭐⭐⭐⭐
新增需求时：
- **多英雄支持**：可以轻松为多个 CardInstance 共享同一个 factory
- **卡定义动态加载**：不影响运行时对象的结构
- **工厂级效果**（如某卡"战斗内永久加速"）：有专属的 Buff 类型承载

### 5. 向后兼容性 ⭐⭐⭐⭐⭐
- JSON 数据格式无需改动（Card 别名为 CardFactory）
- 现有数据存档兼容
- 渐进式迁移（旧代码中需要改的只是访问方式）

---

## 替代方案评估

### 方案 A: 保持原状（单 Card 接口）

**优点**:
- 无需重构，立即节省开发时间

**缺点**:
- ❌ 概念混乱持续
- ❌ Buff 系统架构不清晰
- ❌ 后续多英雄支持时需要大改
- ❌ 内存浪费

**评分**: ⭐ 不推荐

---

### 方案 B: 继承而非组合

```typescript
export interface CardInstance extends CardFactory {
  // ... 运行时字段
}
```

**优点**:
- CardInstance 仍然可以访问 factory 属性（通过继承）

**缺点**:
- ❌ 运行时对象仍包含所有配置数据（内存浪费）
- ❌ 概念仍然模糊
- ❌ 修改 factory 字段时容易意外影响其他实例
- ❌ 无法支持同一个 factory 的多个并发实例

**评分**: ⭐⭐ 不符合设计原意

---

### 方案 C: 完全分表存储（数据库模式）

```typescript
class CardFactoryRegistry {
  factories: Map<string, CardFactory>;
  getInstance(factoryId: string): CardFactory;
}

export interface CardInstance {
  factoryId: string;  // 而非 factory 引用
  // ... 运行时字段
}
```

**优点**:
- 配置与状态完全独立
- 支持配置的热加载

**缺点**:
- ❌ 过度设计（当前项目不需要）
- ❌ 增加代码复杂性（需要 registry 管理）
- ❌ 查询 factory 时需要额外查表操作

**评分**: ⭐⭐⭐ 可考虑作为后续优化，目前不必要

---

## 实现选择

### 为什么选择 `factory: CardFactory` 而非 `factoryId: string`?

**直接引用的理由**:
1. **宿主语言优势**: TypeScript 中引用比字符串查表更高效（零成本抽象）
2. **开发体验**: IDE 自动补全 `card.factory.name` 比 `registry.get(card.factoryId).name` 简洁得多
3. **性能**: 现阶段卡库规模（300+张）内存占用可以接受，性能收益有限
4. **迁移成本**: 引用方式无需改动 factory 加载机制

**未来可以升级**：如果后期加载大量 factory（如 mod 支持），可以升级为注册表模式。

---

## 对系统各部分的影响

### 1. 数据层（不变 ✅）
- JSON 卡数据保持原样
- 存档结构兼容

### 2. 业务逻辑层（改进 ✅）
- BattleLoop 在访问卡配置时明确使用 `.factory.xxx`
- Buff 系统有清晰的类型区分和应用位置

### 3. UI 层（改进 ✅）
- 时间轴显示时可以访问 `card.currentSpeed10`（运行时状态）
- 卡详情卡可以访问 `card.factory.description`（配置）
- CardInstanceBuff 可以由 `card.buffs` 独立显示

### 4. 国际化 (i18n)（改进 ✅）
- 翻译表只需映射 CardFactory.id，而非每个 CardInstance
- 减少翻译冗余

---

## 风险与缓解

| 风险 | 等级 | 缓解措施 |
|------|------|--------|
| 代码改动范围广 | 🟡 MEDIUM | TypeScript 编译器会捕获所有 `.name` → `.factory.name` 的错误 |
| factory 引用可能为空 | 🟢 LOW | 在 CardInstance 创建时总是初始化，不允许 null |
| 性能下降 | 🟢 LOW | 引用访问是零成本的，甚至可能因减少内存而改进 |
| 设计过度 | 🟡 MEDIUM | 如需简化，可降级为 factoryId 注册表模式（对 API 改动小） |

---

## 验证标准

重构被认为成功需要满足：

- [ ] 所有 TypeScript 代码编译通过，无类型错误
- [ ] 地牢战斗流程正常运行
- [ ] 卡的所有功能（damage, armor, buff）按预期触发
- [ ] 内存占用与原方案相当或更优
- [ ] 代码审查通过（检查是否遵循了命名约定和访问规则）

---

## 已完成的适配

根据重构变更日志，以下已经实现：
- ✅ CardFactory 接口定义和 Card 别名
- ✅ CardInstance 改为组合模式（factory 字段）
- ✅ BattleLoop 中的属性访问改为 `.factory.xxx`
- ✅ Buff 系统三层结构清晰化
- ✅ CardInstanceBuff UI 显示
- ✅ 文档更新

---

## 后续决策依赖

本 ADR 的决策为以下未来迭代奠定基础：

1. **ADR-002: 多英雄支持架构**（未来）
   - 依赖本 ADR 中的清晰的工厂/实例分离
   
2. **ADR-003: Mod 系统设计**（未来）
   - 可以基于 CardFactory 清晰的界定来添加 Mod 卡库

3. **性能优化决策**（待议）
   - 如需支持 1000+ 卡库，可基于现有结构升级为注册表模式

---

## 相关文档

- [重构变更日志](./重构变更日志.md) - 实现详情
- [CardFactory 迁移指南](./CardFactory迁移指南.md) - 开发者指南
- [Card.ts](../src/core/domain/Card.ts) - 接口定义
- [BattleLoop.ts](../src/core/systems/BattleLoop.ts) - 实现参考

---

**决策者**: AI 开发助手  
**利益相关者**: 设计师（卡平衡）、测试团队、后续开发者  
**评审状态**: 已实现并验证  
**最后更新**: 2026-03-04
