# Card Instance Lifecycle (卡实例生命周期)

## Status

- This file is preserved as a historical analysis note.
- Parts of this file (especially the "Proposed Changes" section) are outdated.
- Current canonical behavior is documented in:
  - `reference/docs/卡实例与卡工厂.md`
  - runtime code in `src/stores/battleStore.ts` and `src/core/systems/BattleLoop.ts`

## Current System (v0.4.0)

### 1. Battle Initialization Phase
- **When**: `BattleStore.nextStage()` calls `new BattleLoop(initialState)` 
- **Action**: Each `BattleUnit` receives a list of `CardInstance[]` created from `CardFactory` definitions
- **Key Detail**: Cards are created once at battle start, with unique `instanceId` for identification

### 2. Battle Execution Phase (Turn-based)
- **Turn Start** (`startTurn()`): 
  - Unit buffs' `onTurnStart` callbacks execute
  - NO card instance regeneration occurs
  - Existing cards remain in `unit.cards` array

- **During Turn** (`processTick()`):
  - Timeline logic: Each tick, find the next card with the lowest `currentSpeed10` >= current tick speed
  - Execute the card: Call its script function, perform effects
  - **Crucially**: The card instance is NOT removed from `unit.cards` after execution
  - Card remains available for potential future turns

- **Turn End** (`endTurn()`):
  - Unit buff durations decrement
  - Dead unit buff/cards are cleared
  - CardInstanceBuffs are reset (cleared)
  - **But**: Card instances themselves persist in `unit.cards`

### 3. Card Reuse Mechanism (Current Issue)
- Since cards are never removed from `unit.cards` (except via special effects), the same card instance can execute multiple times
- The same `CardInstance` object can be the "next card" in subsequent turns
- Example: A card with speed 5 executes in turn 1, can still be the next card in turn 2 if no competing cards

### 4. Special Cases Where Cards Are Removed
- `calm_mind` effect: Removes the executed attack card and the calm_mind card itself
- Player death: All unit cards cleared immediately
- Summon with `leavesAtTurnEnd: true`: All unit cards cleared at turn end

---

## Proposed Changes for Hibernate Mechanic (Outdated Archive)

### Problem
The current system **reuses card instances across turns**. If Hibernate deletes only the target card instance (T1) without removing its factory, the card will re-execute in T2 as a new action within the same timeline.

### Solution Approach
**Option A: Remove Card Factory (Pending Design Confirmation)**
- Assume future system will regenerate card instances from factories each turn
- Hibernate deletes:
  1. Target card instance (current turn)
  2. Its factory from the unit's deck definition
- T2: Only active factories generate instances, target card doesn't appear

**Option B: Manage Card Factory Reference (Current Feasible Method)**
If the system cannot be changed to regenerate cards each turn:
- Store `factories: CardFactory[]` on each BattleUnit during initialization
- Maintain a parallel `activeFactories: CardFactory[]` list
- Hibernate deletes from `activeFactories`
- During `endTurn()`, regenerate all `unit.cards` from `activeFactories`

---

## Recommended Next Step (Historical)

**Clarification Needed**: Does O.44.0 expect:
1. **No regeneration** (current): Card instances created once, persisted forever (except deletions)
2. **Per-turn regeneration** (proposed): All card instances deleted at turn end, regenerated at turn start

**Current code assumes (1)**. The Hibernate mechanic as you described assumes (2).

To implement (2), we'd need to:
- Remove card instance regeneration from battle initialization
- Add card instance generation to `startTurn()` based on factory list
- Modify `endTurn()` to delete all card instances (except those with special persistence flags)

---

## Timeline for v0.4.0 Ranger/Faith Implementation (Historical)

If using **current system (1)**:
- Hibernate can delete both target instance + own factory, but effect only lasts current turn
- Next turn: If factories are recreated, behavior matches spec; if not, target card reappears

If switching to **system (2)**:
- Hibernate effect matches spec perfectly
- Requires refactoring `startTurn()` and `endTurn()`
- May impact cooldown/persistence mechanics across turns

**Recommendation**: Clarify with user which system is intended before completing Ranger/Faith card scripts.
