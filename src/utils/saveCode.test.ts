import { describe, expect, it } from 'vitest';
import { initialPlayerState } from '../stores/playerStore';
import { decodeSaveCode, encodeSaveCode } from './saveCode';

describe('saveCode', () => {
  it('should round-trip a save snapshot', async () => {
    const player = {
      ...initialPlayerState,
      gold: 321,
      dust: 45,
      collection: { thrust: 2, parry: 1 }
    };

    const code = await encodeSaveCode({
      exportedAt: '2026-03-14T10:00:00.000Z',
      player,
      replays: []
    });

    const decoded = await decodeSaveCode(code);

    expect(decoded.exportedAt).toBe('2026-03-14T10:00:00.000Z');
    expect(decoded.player.gold).toBe(321);
    expect(decoded.player.collection).toEqual({ thrust: 2, parry: 1 });
    expect(decoded.replays).toEqual([]);
  });

  it('should reject tampered save codes', async () => {
    const code = await encodeSaveCode({
      exportedAt: '2026-03-14T10:00:00.000Z',
      player: initialPlayerState,
      replays: []
    });

    const tampered = `${code.slice(0, -2)}AA`;

    await expect(decodeSaveCode(tampered)).rejects.toThrow(/校验失败|损坏|修改/);
  });
});
