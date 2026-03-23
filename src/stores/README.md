# Stores

## v0.4.0 dungeon entry update
- `battleStore.startDungeon` now supports multiple deck indices.
- Use dungeon `teamSize` to determine how many decks should be passed.
- Battle stage creation materializes one player unit per selected deck.

## v0.4.0 multi-enemy stage generation
- Stage generation now supports both single-enemy and same-battle multi-enemy.
- New stage fields:
  - `enemyIds`: explicit enemy id list for deterministic composition
  - `enemyCountMin`/`enemyCountMax`: sampled count from `enemyPoolId`
- Drop resolution now processes all enemy units present in a won battle.
Zustand stores for global state.
