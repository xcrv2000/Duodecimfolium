# README.md - Duodecimfolium 重构指南

欢迎来到 Duodecimfolium 的代码仓库！

## 📚 快速导航

这个项目在 **2026-03-04** 完成了一次重要的架构重构。

### 🎮 游戏设计师
- 查看 [设计思路.md](./设计思路.md) 了解游戏规则
- 查看 [战斗系统修正文档.md](./战斗系统修正文档.md) 了解最新的战斗机制
- 查看 [卡包2：剑与魔法.md](./卡包2：剑与魔法.md) 了解卡牌设计范例

### 👨‍💻 开发者（代码维护）
- **如果是第一次接触 Duodecimfolium**：
  1. 读 [CardFactory 迁移指南.md](./CardFactory迁移指南.md) 理解核心架构变化
  2. 读 [重构变更日志.md](./重构变更日志.md) 了解具体改动
  3. 查看源代码实现（特别是 `src/core/domain/Card.ts` 和 `src/core/systems/BattleLoop.ts`）

- **如果是继续维护已有功能**：
  1. 查看 [ADR_001_CardFactory.md](./ADR_001_CardFactory.md) 理解设计决策
  2. 参考 [CardFactory 迁移指南.md](./CardFactory迁移指南.md) 做相关改动

### 🤖 AI 开发助手（后续迭代）
- 核心文档已整理在 reference 文件夹
- 任何架构改动之前，优先查看 ADR 文档
- 实现新功能时参考 [重构变更日志.md](./重构变更日志.md) 中的"后续迭代"部分

---

## 📋 重构概览

### 重构版本: v0.2.0

**4 个重要改动**：

#### 1. CardFactory 模式 🏭
- **问题**: Card 接口混合了卡定义和运行时状态
- **解决**: 拆分为 `CardFactory`（定义）和 `CardInstance`（运行时）
- **文档**: [ADR_001_CardFactory.md](./ADR_001_CardFactory.md)
- **迁移**: [CardFactory 迁移指南.md](./CardFactory迁移指南.md)

#### 2. Buff 系统三层结构 🎯
- UnitBuff（角色级，多回合）
- CardInstanceBuff（卡实例级，本回合）
- CardFactoryBuff（工厂级，战斗持续）
- **文档**: [重构变更日志.md](./重构变更日志.md#change-21-cardfactorybuff-落地)

#### 3. 同名卡速度惩罚双重机制 ⚡
- **组卡时**：显示预计算的速度惩罚
- **战斗时**：实际应用惩罚并校验
- **文档**: [重构变更日志.md](./重构变更日志.md#change-22-同名卡惩罚双重机制)

#### 4. 速度边界值处理 📊
- **下限** (< 0)：clamp 到 0
- **上限** (≥ 130)：标记为失效，不会触发
- **UI**: 失效卡显示为半透明 + 红色速度值
- **文档**: [重构变更日志.md](./重构变更日志.md#change-24-越界速度与边界值处理)

---

## 🗂️ 文件结构

### reference 文件夹（设计文档）
```
reference/
├── 设计思路.md                      ← 游戏规则、地牢、存档设计
├── 战斗系统修正文档.md              ← 最新的战斗机制定义
├── 卡包2：剑与魔法.md              ← 具体卡牌范例
├── 重构变更日志.md                  ← 💙 [必读] 本次重构的全部改动
├── CardFactory迁移指南.md           ← 💙 [必读] 开发者指南
├── ADR_001_CardFactory.md           ← 架构决策的理由和权衡
├── 设计修正_修饰珠系统.md            ← ⚠️ 发现的设计误理解及修正方案
└── README.md                        ← 本文件

```

### src 文件夹（源代码）
```
src/
├── core/domain/
│   ├── Card.ts                      ← CardFactory 和 CardInstance 接口
│   ├── Battle.ts                    ← Buff 系统（UnitBuff, CardInstanceBuff, CardFactoryBuff）
│   └── ...
├── core/systems/
│   ├── BattleLoop.ts                ← 战斗主循环（速度计算、Buff 应用、生命周期）
│   └── CardScripts.ts               ← 卡牌脚本定义
├── stores/
│   ├── battleStore.ts               ← 战斗初始化（CardInstance 创建）
│   ├── playerStore.ts               ← 玩家存档（同名卡惩罚计算）
│   └── ...
└── ...
```

---

## 🎯 快速查询表

| 需求 | 查看位置 | 说明 |
|------|--------|------|
| 理解 CardFactory 概念 | [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § 为什么需要 CardFactory | 问题背景和解决方案 |
| 修改卡的配置属性访问 | [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § 更新现有代码 | 从 `card.name` 改为 `card.factory.name` |
| 修改标签判断逻辑 | [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § 场景 C | 使用 `card.tagsRuntime` 代替 `card.tags` |
| 实现新的 Buff 效果 | [重构变更日志.md](./重构变更日志.md#change-21-cardfactorybuff-落地) | 调用 `addCardInstanceBuff()` 或 `addCardFactoryBuff()` |
| 添加新的修饰珠 | [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § ① 添加新的修饰珠效果 | 修改 modifiers.json 和 BattleLoop.ts |
| 处理速度边界值 | [重构变更日志.md](./重构变更日志.md#change-24-越界速度与边界值处理) | < 0 clamp, >= 130 标记失效 |
| 声明多英雄支持 | [重构变更日志.md](./重构变更日志.md) § 后续迭代 | 已预留架构，可在 Phase N 实现 |
| 验证重构完整性 | [重构变更日志.md](./重构变更日志.md#验证清单) | 15+ 项检查清单 |

---

## ✅ 提交前检查清单

在修改代码后，提交前请检查：

### 类型安全
- [ ] TypeScript 编译通过 (`tsc --noEmit`)
- [ ] 没有 `any` 类型强制转换（除非有注释说明）
- [ ] CardInstance 属性访问正确（factory 访问配置，运行时访问自身字段）

### 业务逻辑
- [ ] 卡牌脚本中使用的 Buff API 正确（UnitBuff vs CardInstanceBuff vs CardFactoryBuff）
- [ ] 速度修正值使用 x10 整数格式（不是浮点数）
- [ ] 标签判断使用 `tagsRuntime`（包含修饰珠添加的标签）

### 代码质量
- [ ] 新增功能在 [重构变更日志.md](./重构变更日志.md) 中记录
- [ ] 相关文档更新（尤其是 Buff 系统、修饰珠、多英雄相关）
- [ ] 新接口添加到相应的 domain 文件
- [ ] 新 API 有使用示例注释

### 测试
- [ ] 手动测试一个完整的地牢战斗
- [ ] 测试多张同名卡的速度惩罚
- [ ] 测试修饰珠效果应用
- [ ] 如涉及 Buff，测试生命周期和清理

---

## 📞 常见问题

### Q: 我看到 `card.name` 报错了，怎么办？
A: 改为 `card.factory.name`。详见 [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § 场景 A。

### Q: 卡的标签判断 `card.tags?.includes(...)` 不工作？
A: 改为 `card.tagsRuntime?.includes(...)`，这样修饰珠添加的标签才能被正确识别。详见 [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § 场景 C。

### Q: 如何给某卡添加"战斗内永久加速"效果？
A: 使用 `addCardFactoryBuff()` API。详见 [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § 场景 B。

### Q: JSON 卡数据要改吗？
A: 不需要。现有格式自动视为 CardFactory。可选的是在卡定义中添加 `baselineFactoryBuffs`。

### Q: 多英雄功能什么时候实现？
A: 架构已预留。可以在下一个迭代中实现，详见 [重构变更日志.md](./重构变更日志.md) § 多英雄架构预留。

---

## 📖 完整文档阅读顺序（推荐）

**对于新手开发者**：
1. ⭐ 本文 (README.md)
2. ⭐ [CardFactory 迁移指南.md](./CardFactory迁移指南.md) - 15 分钟
3. ⭐ [重构变更日志.md](./重构变更日志.md) - 20 分钟
4. 源代码 (Card.ts, Battle.ts, BattleLoop.ts) - 根据需要查看
5. 🔖 [ADR_001_CardFactory.md](./ADR_001_CardFactory.md) - 架构原理深入讨论

**对于设计师**：
1. [设计思路.md](./设计思路.md) - 规则和系统概述
2. [战斗系统修正文档.md](./战斗系统修正文档.md) - 最新战斗机制
3. [卡包2：剑与魔法.md](./卡包2：剑与魔法.md) - 具体卡牌例子

**对于已有贡献的开发者**：
1. [重构变更日志.md](./重构变更日志.md) § 影响范围总结 - 快速查看受影响的文件
2. [CardFactory 迁移指南.md](./CardFactory迁移指南.md) - 查找需要改动的代码模式
3. [ADR_001_CardFactory.md](./ADR_001_CardFactory.md) - 理解设计决策

---

## 🚀 后续任务 (优先级排序)

根据 [重构变更日志.md](./重构变更日志.md) 中的"后续迭代"：

### 高优先级 🔴
1. [ ] 实现多英雄支持 (需要 ~2-3 周)
   - 修改 nextStage() 签名
   - 实现多角色单位创建

2. [ ] 添加 CardFactory Buff 的具体卡牌示例 (~1 周)
   - 设计一张需要工厂级 Buff 的新卡
   - 在 CardScripts.ts 中实现

3. [ ] 地牢内修饰珠消耗逻辑 (~1 周)
   - 入场库存检查
   - 失败时退还机制

### 中优先级 🟡
4. [ ] 补充单元测试 (~2 周)
5. [ ] UI 改进（执行顺序显示、Buff 详情卡）(~1 周)

### 低优先级 🟢
6. [ ] 性能监控工具
7. [ ] 文档国际化

---

## 📊 项目统计

- **重构规模**: 7 个主要文件改动，~300 行代码变更
- **新增文档**: 3 份（变更日志、迁移指南、ADR）
- **兼容性**: 100% 向后兼容（数据和 JSON 格式）
- **测试覆盖**: 需要补充（标记为后续任务）

---

## 🔗 相关资源

- [Duodecimfolium 项目主页](../../)
- [GitHub Issues](../../issues) - 报告 Bug 或提出功能建议
- [Discussions](../../discussions) - 架构讨论和设计反馈

---

**最后更新**: 2026-03-04  
**维护者**: AI 开发助手 + 核心团队  
**状态**: ✅ 重构完成，待实装验证
