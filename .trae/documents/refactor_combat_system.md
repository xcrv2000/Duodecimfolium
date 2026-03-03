# 战斗系统重构计划

## 目标
根据《战斗系统修正文档.md》重构现有的战斗系统，实现基于 0.1 精度时间轴、动态重排、复杂的 Buff 系统及新的卡牌逻辑。

## 涉及文件
- `src/core/domain/Battle.ts`: 战斗与 Buff 模型
- `src/core/domain/Card.ts`: 卡牌模型
- `src/core/systems/BattleLoop.ts`: 战斗核心循环
- `src/core/systems/CardScripts.ts`: 卡牌脚本实现
- `src/data/cards.json`: 卡牌数据

## 详细步骤

### Phase 1: 领域模型重构 (Domain Model)

1.  **修改 `Card.ts`**:
    -   `Card` 接口：`speed` 改为 `baseSpeed` (number | null)，文档中虽提及 `baseSpeed10`，但在配置中保留可读性可能更好，或者直接存整数。建议配置中存浮点，加载时转为整数 `baseSpeed10`。或者直接遵循文档，运行时模型使用 `baseSpeed10`。
    -   `CardInstance` 接口：
        -   替换 `originalSpeed` 为 `baseSpeed10: number | null`。
        -   替换 `currentSpeed` 为 `currentSpeed10: number | null`。
        -   添加 `buffs: CardInstanceBuff[]`。
        -   确保 `instanceId` 唯一性生成策略。

2.  **修改 `Battle.ts`**:
    -   `BattleUnit` 接口：
        -   添加 `initialDeckSize: number`。
        -   `buffs` 字段类型明确为 `UnitBuff[]`。
    -   **重构 `Buff` 体系**:
        -   定义 `BaseBuff`: `id`, `name`, `duration`, `stackRule` ('stackable' | 'nonStackable'), `level` (int).
        -   定义 `UnitBuff` extends `BaseBuff`.
        -   定义 `CardInstanceBuff` extends `BaseBuff`.
        -   定义 `CardFactoryBuff` extends `BaseBuff`.

### Phase 2: 核心循环重写 (Core Loop)

1.  **重构 `BattleLoop` 类**:
    -   **状态管理**:
        -   维护 `timeline`: 本回合所有 `CardInstance` 的集合。
    -   **`nextTick` 逻辑**:
        -   Tick 范围判断：`currentSpeed10 >= tick * 10` && `currentSpeed10 < (tick + 1) * 10`。
    -   **`processTick` (核心难点)**:
        -   实现“动态重排”循环：
            -   `executedThisTick` 集合防止重复执行。
            -   `while(true)` 循环寻找当前 Tick 可执行的卡。
            -   **排序规则**: `currentSpeed10` 升序 -> `initialDeckSize` 升序 -> 随机。
            -   执行卡牌后，立即重新扫描所有卡的速度（因为脚本可能修改了任意卡的速度），重新判断是否还有卡落在当前 Tick 且未执行。
    -   **`executeCard`**:
        -   执行脚本。
        -   死亡结算：在卡牌执行完全结束后调用。
        -   Buff 触发：卡牌执行时的 Buff 结算。

### Phase 3: 脚本 API 与 Buff 系统

1.  **实现 `BattleLoop` 提供的 API**:
    -   `modifyCardSpeed(cardInstanceId, delta10)`: 修改速度并标记需要重排（或直接更新状态）。
    -   `findNextCardOnTimeline(unitId, currentTick)`: 查找指定单位在当前时间轴未来的下一张卡。
    -   `applyBuff`: 通用 Buff 添加逻辑，处理堆叠规则。

2.  **实现 Buff 生命周期**:
    -   回合结束清理：`duration` 递减，移除过期 Buff。
    -   护甲清理：回合结束清零。

### Phase 4: 卡牌脚本更新 (Card Scripts)

根据文档逐个实现/更新卡牌脚本：
-   **突 (Thrust)**: 伤害 + 查找下一张卡并加速 (+10 speed10).
-   **镇 (Parry)**: 护甲.
-   **蓄 (Charge)**: 自身 Buff (下一次攻击速度+10, 伤害x2).
-   **刺 (Stab)**: 伤害 + 流血 Buff.
-   **斩 (Slash)**: 纯伤害.
-   **撩 (Flick)**: 伤害 + 下一张卡减速 (+30 speed10).
-   **伏 (Ambush)**: 大量护甲.
-   **扫 (Sweep)**: 3次攻击 (多段伤害逻辑).
-   **摔 (Throw)**: 伤害 + 眩晕 (下回合所有卡速度+20).
-   **凝 (Concentrate)**: 专注 (Buff).

### Phase 5: 数据更新

1.  **更新 `src/data/cards.json`**:
    -   确保所有卡牌字段符合新模型（如 `speed` 对应文档值）。
    -   移除旧的、不再使用的字段。

2.  **更新 `src/data/buffs.json`**:
    -   重构 Buff 定义以匹配新的 `BaseBuff` 接口。
    -   添加 `stackRule` ('stackable' | 'nonStackable')。
    -   明确 `duration` (默认 'round' 或具体数值)。
    -   确保 `CardScripts.ts` 中引用的 ID 与新 JSON 一致。

### Phase 6: 验证与清理

1.  **验证**:
    -   创建简单的测试脚本或利用现有测试，模拟一场战斗，验证：
        -   速度排序是否正确。
        -   动态变速是否生效（突/撩）。
        -   Buff 堆叠与清除。
        -   Tick 跳过逻辑（超速不执行）。

2.  **清理**:
    -   检查 `src/core` 下是否还有旧的战斗逻辑残留。
    -   移除不再使用的类型定义或辅助函数。

### Phase 7: 文档编写

1.  **编写战斗系统说明书**:
    -   创建 `reference/combat_system_manual.md`。
    -   详细描述新的时间轴机制、Buff 系统、卡牌脚本接口。
    -   提供示例和开发指南。
