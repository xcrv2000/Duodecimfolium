# Gacha Feature Notes

## v0.4.0 empty-pack guard
When a pack has no cards in `cards.json`, opening it now aborts safely.

### Behavior
- The open action shows an alert message.
- Gold and token costs are refunded immediately.
- No draw result overlay is created.

### Why
This allows pack data and unlock flow to be integrated before all card definitions/scripts are fully landed, without causing runtime crashes.
