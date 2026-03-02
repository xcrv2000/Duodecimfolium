# 项目计划：十二叶草 (Duodecimfolium)

## 1. 项目概述
这是一个基于 Web 的卡牌收集与自动战斗地牢爬行游戏。
- **技术栈**: React + TypeScript + Vite + TailwindCSS。
- **状态管理**: Zustand (用于全局游戏状态)。
- **持久化**: LocalStorage (带简单的加密与校验和)。
- **部署**: Cloudflare Pages (单页应用 SPA)。
- **设计模式**: 解耦架构，分离核心游戏逻辑 (Core) 与 UI (React)。

## 2. 目录结构
```
src/
├── assets/          # 图片、静态资源
├── core/            # 游戏核心逻辑 (平台无关)
│   ├── domain/      # 接口与类型定义 (Card, Dungeon, Player, Battle)
│   ├── systems/     # 游戏系统 (BattleLoop, DropSystem, Crafting)
│   └── data/        # JSON 数据加载器与 Schema 定义
├── data/            # 原始 JSON 数据文件 (游戏内容)
│   ├── cards.json
│   ├── packs.json
│   ├── dungeons.json
│   └── enemies.json
├── features/        # 按功能划分的 React 组件
│   ├── battle/      # 战斗界面、时间轴、单位框体
│   ├── collection/  # 卡牌图鉴、卡组构筑器
│   ├── dungeoneering/# 地牢选择、奖励界面
│   ├── gacha/       # 开包动画
│   └── layout/      # 主布局、导航栏、侧边栏
├── hooks/           # 自定义 React Hooks (useGameLoop, usePersist)
├── stores/          # Zustand Stores (playerStore, battleStore)
├── utils/           # 辅助函数 (Math, RNG, Encryption)
└── App.tsx
```

## 3. 实施步骤

### 第一阶段：基础框架与数据结构
- [ ] **初始化项目**: 配置 Vite + React + TS + TailwindCSS。
- [ ] **定义核心接口**: 创建 `Card` (卡牌), `CardPack` (卡包), `Dungeon` (地牢), `Enemy` (敌人), `BattleState` (战斗状态) 的 TypeScript 类型定义。
- [ ] **创建 JSON 数据**: 实现“最小可行版本”的数据结构：
    - `cards.json`: 基础剑术卡牌 (突, 镇, 蓄, 等)。
    - `packs.json`: 基础剑术卡包。
    - `dungeons.json`: 训练场地牢。
    - `enemies.json`: 训练场的小怪与 Boss。

### 第二阶段：核心游戏逻辑 (引擎层)
- [ ] **战斗系统**: 实现 13-tick 回合制战斗逻辑。
    - 速度计算与排序。
    - 动作执行队列。
    - Buff/Debuff 系统 (持续时间管理)。
- [ ] **玩家系统**: 管理金币、粉尘、已解锁的地牢/卡包。
- [ ] **库存系统**: 卡组管理、卡牌收集、重复卡牌自动转化为粉尘 (>3 张)。

### 第三阶段：UI 实现
- [ ] **主布局**: 侧边栏/标签页导航 (主页, 开包, 图鉴, 组卡, 地牢, 设置)。
- [ ] **抽卡界面**: 卡包选择与开包动画。
- [ ] **图鉴与组卡器**:
    - 卡牌网格视图。
    - 拖拽或点击添加组卡功能。
    - 按稀有度/费用筛选。
- [ ] **地牢选择器**: 列出可用地牢，显示奖励/要求。
- [ ] **战斗界面**:
    - 时间轴可视化 (0-12 ticks)。
    - 单位框体 (HP, Buffs)。
    - 战斗日志/简单的文本或视觉提示。

### 第四阶段：持久化与优化
- [ ] **存档系统**: 实现 `SaveManager` 将 `PlayerState` 序列化并保存到 LocalStorage (带校验和)。
- [ ] **导入/导出**: 增加卡组代码和存档数据的剪贴板导入导出功能。
- [ ] **响应式设计**: 确保布局在移动端 (触摸目标、字体大小) 和桌面端均表现良好。

## 4. 关键技术决策
- **数据驱动**: 所有游戏内容 (卡牌、敌人、地牢) 将从 JSON 文件加载。这允许在不修改代码的情况下轻松进行平衡调整和内容添加。
- **战斗逻辑解耦**: `BattleCore` 将是一个纯 TypeScript 类/模块，可以独立于 React 运行。React 仅负责渲染 `BattleState`。
- **响应式 UI**: Zustand 将作为命令式游戏逻辑与响应式 UI 之间的桥梁。
