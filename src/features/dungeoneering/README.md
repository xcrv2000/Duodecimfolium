# Dungeoneering Feature Notes

## v0.4.0 location map data source
The location map uses `src/data/locations.json` as the single source of truth for point-to-content mapping.

### Fields
- `id`: map point ID (`A` to `E`)
- `name`: location title shown in tooltip and detail page
- `defaultLabel`: label under map button when unlocked
- `mapPosition`: button position in percentage (`x`, `y`)
- `dungeonIds`: dungeons attached to this location
- `packIds`: packs attached to this location

### How to use
- Keep `dungeonIds` and `packIds` aligned with ids in:
  - `src/data/dungeons.json`
  - `src/data/packs.json`
- If a dungeon/pack is not implemented yet, keep the planned id here and finish linkage in the same PR that adds data/scripts.
- UI filtering rule target for v0.4.0:
  - hide location if both dungeon and pack are fully locked
  - hide hidden temporary packs in location tooltip/details

## v0.4.0 map UI behavior
- Main dungeon entry now renders map mode first.
- Location button assets:
  - normal: `/reference/docs/button.png`
  - selected: `/reference/docs/button-pressed.png`
  - background: `/reference/docs/地图.png`

### Interaction flow
- hover location button: show tooltip with dungeon and pack summary
- click location button: open location detail page
- location detail page:
  - unlocked dungeon: enter deck selection (or sandbox config)
  - unlocked pack: jump to shop tab

## v0.4.0 sandbox config updates
- Team count range for both sides is `1..12`.
- Each slot supports two inputs:
  - selected local deck
  - imported deck code / JSON (higher priority)
- `删除已导入内容` clears slot import text and restores local deck usage.

## v0.4.0 teamSize deck selection
- Dungeon deck selection respects `dungeon.teamSize`.
- When `teamSize > 1`, player must select exactly that many decks.
- Selected decks are numbered in selection order and become separate player units in battle.

## v0.4.0 dungeon data scaffold
- Added new dungeon IDs in data layer:
  - `hunter_hut`
  - `unrepaired_altar`
- Added corresponding enemy pool IDs in enemies data.

Usage note:
- These are currently wired with runtime-safe placeholder decks.
- Replace enemy deck lists with final designed cards when new pack scripts are completed.

Baseline note:
- Implementation baseline follows the latest edited `reference/docs/卡包4.md`.
- For hunter hut, stage composition is enforced by dedicated pools (`hunter_hut_hound`, `hunter_hut_hawk`) to keep sequence stable.

## Current script integration status
- `hunter_hut` boss deck has been switched to whistle/summon scripts.
- `unrepaired_altar` boss deck has been switched to blessing scripts.
- Added second-wave scripts for ranger/faith pack core cards (mark-shot, rally, healing, light retribution, hibernate, disrupt, etc.).
- Remaining cards are mostly advanced/edge-case mechanics and will be integrated in subsequent tasks.

## Multi-enemy stage mode
- Stage data now supports same-battle multi-enemy composition via:
  - `enemyIds` for explicit formation
  - `enemyCountMin`/`enemyCountMax` for random count sampling from pool
- `hunter_hut` currently uses explicit `enemyIds` to enforce design-doc layer composition.
