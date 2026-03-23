# Game Systems
Core game logic implementation (BattleLoop, DropSystem, etc.).

## v0.4.0 battle log spacing
- `BattleLoop.processTick` now appends one empty log entry after each tick.
- `BattleLoop.endTurn` now appends one empty log entry after the end-turn marker.
- `BattleView` treats empty log messages as visual separators.

How to use:
- No extra config is needed. Start any battle and open the center log panel.
- You should see blank separators between tick blocks and after each turn-end block.

## v0.4.0 death cleanup behavior
- Death handling now applies once per unit (no repeated death logs on later checks).
- On death, unit buffs and card instances are immediately cleared.
- This supports cross-stage dead-unit carryover in dungeon runs.

## v0.4.0 summon and blessing runtime
- New script-facing APIs in `BattleLoop`:
	- `summonUnit(...)`
	- `addTokenCardToUnit(...)`
	- `heal(...)`
- Runtime rules:
	- summon can be configured to leave at turn end
	- if a team only has summons alive, that team loses
	- `blessing` heals at each tick end
	- random target selection prefers units with `mark`

	## v0.4.0 tracking follow-up
	- After a physical attack resolves, allied hawks with `tracking` perform a bonus 4 physical hit on the same target.
	- Implemented in `BattleLoop.executeCard -> triggerTrackingFollowups`.
