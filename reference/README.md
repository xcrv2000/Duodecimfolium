# Duodecimfolium 项目文档

**最后更新**: 2026-03-05  
**项目版本**: v0.2.5  
**位置**: reference/

欢迎来到 Duodecimfolium 卡牌游戏项目！

---

## 📁 文件夹结构

```
reference/
├── README.md              ← 本文件（项目概览）
├── docs/                  ← 设计文档
│   ├── INDEX.md          ← 设计文档导航
│   ├── 设计思路.md       ← 系统架构和游戏规则
│   ├── 战斗系统修正文档.md ← 战斗机制详解
│   ├── 卡包2：剑与魔法.md ← 卡牌设计范例
│   └── 卡包3：拉克希尔之仪.md ← 新卡包设计
├── logs/                  ← 版本日志和审计报告
│   ├── INDEX.md          ← 日志文件导航
│   ├── CHANGELOG_*.md    ← 版本变更记录
│   └── CODE_AUDIT_REPORT_*.md ← 质量审计
├── archived/              ← 已归档的历史文档
│   └── CardFactory迁移指南.md ← 迁移完成后的指南
└── ADR_001_CardFactory.md ← 架构决策记录
```

---

## 🎯 快速导航

### 👥 不同角色用户

**🎮 游戏设计师/策划**
- [设计思路](docs/设计思路.md) - 了解游戏规则和系统架构
- [战斗系统修正文档](docs/战斗系统修正文档.md) - 深入理解战斗机制
- [卡牌设计范例](docs/卡包2：剑与魔法.md) - 学习卡牌设计模式

**👨‍💻 开发者**
- [架构决策记录](ADR_001_CardFactory.md) - 理解核心设计决策
- [版本变更日志](logs/CHANGELOG_2026-03-05.md) - 了解最新更新
- [代码审计报告](logs/CODE_AUDIT_REPORT_2026-03-05.md) - 查看代码质量

**🤖 AI开发助手**
- [文档导航](docs/INDEX.md) - 快速找到所需文档
- [日志索引](logs/INDEX.md) - 追踪项目历史
- [版本历史](logs/VERSION_HISTORY.md) - 了解开发路线图

---

## 📋 项目状态

### 当前版本: v0.2.5 (2026-03-05)

**核心功能** ✅
- CardFactory 架构重构完成
- 三层Buff系统实现
- 13tick战斗循环稳定运行
- 28张卡牌脚本全部实现

**质量指标** 📊
- 代码合规度: 85/100
- 测试覆盖: 50% (框架已搭建)
- 文档完整性: 90%

### 近期更新 🔄

- ✅ 修复3个高优先级bug (clear_oil, bright_oil, wind_thunder_strike)
- ✅ 添加永久生效刻修改API
- ✅ 文档结构重组 (logs/docs/archived)
- ✅ 版本号升级至 v0.2.5

---

## 🚀 快速开始

### 1. 了解项目架构
```markdown
阅读顺序：
1. [设计思路](docs/设计思路.md) - 游戏规则概览
2. [战斗系统修正文档](docs/战斗系统修正文档.md) - 核心机制
3. [架构决策](ADR_001_CardFactory.md) - 技术设计背景
```

### 2. 运行项目
```bash
npm install          # 安装依赖
npm test            # 运行单元测试
npm run dev         # 启动开发服务器
```

### 3. 贡献代码
```markdown
开发流程：
1. 查看 [最新变更](logs/CHANGELOG_2026-03-05.md)
2. 阅读相关设计文档
3. 编写测试用例
4. 提交代码前运行测试
```

---

## 📚 文档索引

### 🎨 设计文档 (docs/)

| 文档 | 描述 | 重要性 |
|-----|------|--------|
| [INDEX](docs/INDEX.md) | 设计文档导航 | ⭐⭐⭐ |
| [设计思路](docs/设计思路.md) | 系统架构、游戏循环 | ⭐⭐⭐ |
| [战斗系统修正文档](docs/战斗系统修正文档.md) | 战斗机制详解 | ⭐⭐⭐ |
| [卡包2：剑与魔法](docs/卡包2：剑与魔法.md) | 卡牌设计范例 | ⭐⭐ |
| [卡包3：热烈的决斗者](docs/卡包3：热烈的决斗者.md) | 新卡包设计 | ⭐⭐ |

### 📝 版本日志 (logs/)

| 文档 | 描述 | 重要性 |
|-----|------|--------|
| [INDEX](logs/INDEX.md) | 日志文件导航 | ⭐⭐⭐ |
| [CHANGELOG_2026-03-05](logs/CHANGELOG_2026-03-05.md) | 最新版本变更 | ⭐⭐⭐ |
| [CODE_AUDIT_REPORT_2026-03-05](logs/CODE_AUDIT_REPORT_2026-03-05.md) | 代码质量审计 | ⭐⭐ |
| [VERSION_HISTORY](logs/VERSION_HISTORY.md) | 版本时间线 | ⭐⭐ |

### 🏛️ 架构文档

| 文档 | 描述 | 重要性 |
|-----|------|--------|
| [ADR_001_CardFactory](ADR_001_CardFactory.md) | 架构决策记录 | ⭐⭐⭐ |

### 📦 已归档文档 (archived/)

| 文档 | 描述 | 归档原因 |
|-----|------|----------|
| [CardFactory迁移指南](archived/CardFactory迁移指南.md) | 迁移完成后的技术指南 | 迁移工作已完成 |

---

## 🔍 常见问题

### Q: 我是新来的开发者，应该先看什么？
**A:** 按以下顺序阅读：
1. [设计思路](docs/设计思路.md) - 理解游戏规则
2. [架构决策](ADR_001_CardFactory.md) - 了解技术架构
3. [最新变更](logs/CHANGELOG_2026-03-05.md) - 掌握当前状态

### Q: 如何找到特定功能的实现？
**A:** 使用文档导航：
- [设计文档索引](docs/INDEX.md) - 按功能查找
- [日志索引](logs/INDEX.md) - 按时间查找变更

### Q: 文档是如何组织的？
**A:**
- **docs/**: 当前活跃的设计文档
- **logs/**: 版本历史和质量报告
- **archived/**: 过时的参考文档
- **根目录**: 重要的架构决策记录

---

## 📞 联系与支持

**项目维护者**: Development Team  
**文档负责人**: AI Assistant  
**最后审查**: 2026-03-05

---

## 🔄 文档维护

### 更新频率
- **设计文档**: 功能变更时更新
- **版本日志**: 每次发布时更新
- **审计报告**: 重大重构后生成

### 贡献指南
1. 更新文档前先查看相关日志
2. 保持链接有效性
3. 更新相应的索引文件
4. 添加最后更新日期

---

*本项目采用模块化文档管理，确保开发者能够快速找到所需信息。如有问题请及时反馈。*
|------|--------|------|
| 理解 CardFactory 概念 | [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § 为什么需要 CardFactory | 问题背景和解决方案 |
| 修改卡的配置属性访问 | [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § 更新现有代码 | 从 `card.name` 改为 `card.factory.name` |
| 修改标签判断逻辑 | [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § 场景 C | 使用 `card.tagsRuntime` 代替 `card.tags` |
| 实现新的 Buff 效果 | [重构变更日志.md](./重构变更日志.md#change-21-cardfactorybuff-落地) | 调用 `addCardInstanceBuff()` 或 `addCardFactoryBuff()` |
| 添加新的修饰珠 | [CardFactory 迁移指南.md](./CardFactory迁移指南.md) § ① 添加新的修饰珠效果 | 修改 modifiers.json 和 BattleLoop.ts |
| 处理生效刻边界值 | [重构变更日志.md](./重构变更日志.md#change-24-越界生效刻与边界值处理) | < 0 clamp, >= 130 标记失效 |
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
- [ ] 生效刻修正值使用 x10 整数格式（不是浮点数）
- [ ] 标签判断使用 `tagsRuntime`（包含修饰珠添加的标签）

### 代码质量
- [ ] 新增功能在 [重构变更日志.md](./重构变更日志.md) 中记录
- [ ] 相关文档更新（尤其是 Buff 系统、修饰珠、多英雄相关）
- [ ] 新接口添加到相应的 domain 文件
- [ ] 新 API 有使用示例注释

### 测试
- [ ] 手动测试一个完整的地牢战斗
- [ ] 测试多张同名卡的生效刻惩罚
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
