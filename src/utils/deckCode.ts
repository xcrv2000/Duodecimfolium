const DECK_CODE_PREFIX = 'DDF3';
const DECK_CODE_KEY = 'duodecimfolium-v030';

export interface DeckPayload {
  cardIds: string[];
  modifierSlots?: Record<string, string>;
  name?: string;
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const fromBase64 = (input: string): Uint8Array => {
  const binary = atob(input);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
};

const xorBytes = (data: Uint8Array, key: Uint8Array): Uint8Array => {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i % key.length];
  }
  return out;
};

const checksum = (input: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase();
};

export const encodeDeckCode = (deck: DeckPayload): string => {
  const payload = JSON.stringify({
    v: 3,
    c: deck.cardIds,
    m: deck.modifierSlots || {},
    n: deck.name || 'Imported Deck'
  });

  const payloadChecksum = checksum(payload);
  const payloadBytes = new TextEncoder().encode(payload);
  const keyBytes = new TextEncoder().encode(DECK_CODE_KEY);
  const obfuscated = toBase64(xorBytes(payloadBytes, keyBytes));

  // Mix checksum into body to make manual tampering harder.
  const mixed = obfuscated
    .split('')
    .map((ch, i) => `${ch}${payloadChecksum[i % payloadChecksum.length]}`)
    .join('');

  return `${DECK_CODE_PREFIX}.${mixed}.${payloadChecksum}`;
};

const decodeV3DeckCode = (text: string): DeckPayload | null => {
  const parts = text.split('.');
  if (parts.length !== 3 || parts[0] !== DECK_CODE_PREFIX) return null;

  const mixed = parts[1];
  const expectedChecksum = parts[2];
  if (!mixed || !expectedChecksum) return null;

  let obfuscated = '';
  for (let i = 0; i < mixed.length; i += 2) {
    obfuscated += mixed[i];
  }

  const keyBytes = new TextEncoder().encode(DECK_CODE_KEY);
  const payloadBytes = xorBytes(fromBase64(obfuscated), keyBytes);
  const payload = new TextDecoder().decode(payloadBytes);

  if (checksum(payload) !== expectedChecksum) {
    throw new Error('卡组码校验失败');
  }

  const decoded = JSON.parse(payload);
  if (!decoded || !Array.isArray(decoded.c)) {
    throw new Error('卡组码内容无效');
  }

  return {
    cardIds: decoded.c,
    modifierSlots: decoded.m || {},
    name: decoded.n || 'Imported Deck'
  };
};

export const decodeDeckCode = (text: string): DeckPayload => {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new Error('卡组码为空');
  }

  // v0.3.0 format
  if (trimmed.startsWith(`${DECK_CODE_PREFIX}.`)) {
    const v3 = decodeV3DeckCode(trimmed);
    if (v3) return v3;
  }

  // legacy base64-obfuscated format
  try {
    const decoded = JSON.parse(atob(trimmed));
    if (decoded && Array.isArray(decoded.c)) {
      return {
        cardIds: decoded.c,
        modifierSlots: decoded.m || {},
        name: decoded.n || 'Imported Deck'
      };
    }
  } catch {
    // continue
  }

  // plain JSON format
  const raw = JSON.parse(trimmed);
  if (!raw || !Array.isArray(raw.cardIds)) {
    throw new Error('无法识别卡组码格式');
  }

  return {
    cardIds: raw.cardIds,
    modifierSlots: raw.modifierSlots || {},
    name: raw.name || 'Imported Deck'
  };
};
