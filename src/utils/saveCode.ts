import { PlayerState } from '../core/domain/Player';
import { ReplayRecord } from '../stores/replayStore';

const SAVE_CODE_PREFIX = 'DDS1';
const SAVE_CODE_KEY = 'duodecimfolium-save-v1';

export interface SaveSnapshot {
  exportedAt: string;
  player: PlayerState;
  replays: ReplayRecord[];
}

interface EncodedSavePayload {
  v: 1;
  exportedAt: string;
  player: PlayerState;
  replays: ReplayRecord[];
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (input: string): Uint8Array => {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const xorBytes = (data: Uint8Array, key: Uint8Array): Uint8Array => {
  const output = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    output[i] = data[i] ^ key[i % key.length];
  }
  return output;
};

const hexFromBytes = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

const sha256 = async (input: string): Promise<string> => {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return hexFromBytes(new Uint8Array(digest));
};

const ensureCompressionSupport = () => {
  if (typeof CompressionStream === 'undefined' || typeof DecompressionStream === 'undefined') {
    throw new Error('当前环境不支持存档压缩');
  }
};

const streamToUint8Array = async (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> => {
  const response = new Response(stream);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

const toArrayBuffer = (input: Uint8Array): ArrayBuffer => {
  const normalized = new Uint8Array(input.byteLength);
  normalized.set(input);
  return normalized.buffer;
};

const compressString = async (input: string): Promise<Uint8Array> => {
  ensureCompressionSupport();
  const bytes = new TextEncoder().encode(input);
  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new CompressionStream('gzip'));
  return streamToUint8Array(stream);
};

const decompressToString = async (input: Uint8Array): Promise<string> => {
  ensureCompressionSupport();
  const stream = new Blob([toArrayBuffer(input)]).stream().pipeThrough(new DecompressionStream('gzip'));
  const bytes = await streamToUint8Array(stream);
  return new TextDecoder().decode(bytes);
};

const mixChecksum = (body: string, checksum: string): string =>
  body
    .split('')
    .map((ch, index) => `${ch}${checksum[index % checksum.length]}`)
    .join('');

const unmixChecksum = (mixed: string): string => {
  let body = '';
  for (let i = 0; i < mixed.length; i += 2) {
    body += mixed[i];
  }
  return body;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isRecordOfNumbers = (value: unknown): value is Record<string, number> =>
  !!value &&
  typeof value === 'object' &&
  Object.values(value as Record<string, unknown>).every((item) => typeof item === 'number' && Number.isFinite(item));

const isRecordOfStrings = (value: unknown): value is Record<string, string> =>
  !!value &&
  typeof value === 'object' &&
  Object.values(value as Record<string, unknown>).every((item) => typeof item === 'string');

const isRecordOfOptionalNumbers = (value: unknown): value is Record<string, number> | undefined =>
  value === undefined || isRecordOfNumbers(value);

const sanitizePlayerState = (input: unknown): PlayerState => {
  if (!input || typeof input !== 'object') {
    throw new Error('玩家存档结构无效');
  }

  const state = input as Record<string, unknown>;
  if (
    typeof state.gold !== 'number' ||
    typeof state.dust !== 'number' ||
    !isStringArray(state.unlockedDungeons) ||
    !isStringArray(state.clearedDungeons) ||
    !isStringArray(state.unlockedPacks) ||
    !isStringArray(state.openedPacks) ||
    !isRecordOfNumbers(state.collection) ||
    !Array.isArray(state.decks) ||
    !isRecordOfNumbers(state.modifiers) ||
    !isRecordOfNumbers(state.tokens)
  ) {
    throw new Error('玩家存档内容无效');
  }

  const decks = state.decks.map((deck, index) => {
    if (!deck || typeof deck !== 'object') {
      throw new Error(`卡组 ${index + 1} 数据无效`);
    }

    const rawDeck = deck as Record<string, unknown>;
    if (
      typeof rawDeck.id !== 'string' ||
      typeof rawDeck.name !== 'string' ||
      !isStringArray(rawDeck.cardIds) ||
      !isRecordOfStrings(rawDeck.modifierSlots) ||
      !isRecordOfOptionalNumbers(rawDeck.cardSpeedPenalties)
    ) {
      throw new Error(`卡组 ${index + 1} 结构无效`);
    }

    return {
      id: rawDeck.id,
      name: rawDeck.name,
      cardIds: rawDeck.cardIds,
      modifierSlots: rawDeck.modifierSlots,
      cardSpeedPenalties: rawDeck.cardSpeedPenalties
    };
  });

  return {
    gold: state.gold,
    dust: state.dust,
    unlockedDungeons: state.unlockedDungeons,
    clearedDungeons: state.clearedDungeons,
    unlockedPacks: state.unlockedPacks,
    openedPacks: state.openedPacks,
    collection: state.collection,
    decks,
    defaultDeckId: typeof state.defaultDeckId === 'string' ? state.defaultDeckId : undefined,
    modifiers: state.modifiers,
    tokens: state.tokens
  };
};

const sanitizeReplayRecords = (input: unknown): ReplayRecord[] => {
  if (!Array.isArray(input)) {
    throw new Error('战报存档结构无效');
  }

  return input.map((record, index) => {
    if (!record || typeof record !== 'object') {
      throw new Error(`战报 ${index + 1} 数据无效`);
    }

    const rawRecord = record as Record<string, unknown>;
    if (
      typeof rawRecord.id !== 'string' ||
      typeof rawRecord.timestamp !== 'number' ||
      typeof rawRecord.dungeonId !== 'string' ||
      typeof rawRecord.stageIndex !== 'number' ||
      typeof rawRecord.seed !== 'number' ||
      typeof rawRecord.enemyName !== 'string' ||
      typeof rawRecord.isFavorite !== 'boolean' ||
      !rawRecord.initialState ||
      typeof rawRecord.initialState !== 'object'
    ) {
      throw new Error(`战报 ${index + 1} 结构无效`);
    }

    return {
      id: rawRecord.id,
      timestamp: rawRecord.timestamp,
      dungeonId: rawRecord.dungeonId,
      stageIndex: rawRecord.stageIndex,
      seed: rawRecord.seed,
      initialState: rawRecord.initialState as ReplayRecord['initialState'],
      enemyName: rawRecord.enemyName,
      isFavorite: rawRecord.isFavorite
    };
  });
};

export const buildSaveFilename = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `duodecimfolium-save-${year}-${month}-${day}-${hours}${minutes}.txt`;
};

export const encodeSaveCode = async (snapshot: SaveSnapshot): Promise<string> => {
  const payload: EncodedSavePayload = {
    v: 1,
    exportedAt: snapshot.exportedAt,
    player: snapshot.player,
    replays: snapshot.replays
  };
  const serialized = JSON.stringify(payload);
  const checksum = await sha256(serialized);
  const compressed = await compressString(serialized);
  const key = new TextEncoder().encode(`${SAVE_CODE_KEY}:${checksum.slice(0, 16)}`);
  const encrypted = xorBytes(compressed, key);
  const body = toBase64(encrypted);
  const mixed = mixChecksum(body, checksum);
  return `${SAVE_CODE_PREFIX}.${mixed}.${checksum}`;
};

export const decodeSaveCode = async (text: string): Promise<SaveSnapshot> => {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new Error('存档码为空');
  }

  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== SAVE_CODE_PREFIX) {
    throw new Error('无法识别存档码格式');
  }

  const mixedBody = parts[1];
  const expectedChecksum = parts[2];
  if (!mixedBody || !expectedChecksum) {
    throw new Error('存档码结构不完整');
  }

  const body = unmixChecksum(mixedBody);
  const encrypted = fromBase64(body);
  const key = new TextEncoder().encode(`${SAVE_CODE_KEY}:${expectedChecksum.slice(0, 16)}`);
  const compressed = xorBytes(encrypted, key);
  const serialized = await decompressToString(compressed);
  const actualChecksum = await sha256(serialized);

  if (actualChecksum !== expectedChecksum) {
    throw new Error('存档码校验失败，内容可能已损坏或被修改');
  }

  const parsed = JSON.parse(serialized) as Partial<EncodedSavePayload>;
  if (parsed.v !== 1) {
    throw new Error('不支持该存档版本');
  }

  return {
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    player: sanitizePlayerState(parsed.player),
    replays: sanitizeReplayRecords(parsed.replays)
  };
};
