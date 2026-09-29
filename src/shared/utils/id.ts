let fallbackSequence = 0;

/**
 * Creates a client-side identifier. UUIDs are preferred, but randomUUID is
 * unavailable on some browsers and on non-secure HTTP origins.
 */
export function createClientId(): string {
  const cryptoApi = typeof globalThis.crypto === 'undefined' ? undefined : globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last-resort fallback for browsers without Web Crypto; IDs here are for
  // local UI records and idempotency keys, not authentication or secrets.
  fallbackSequence += 1;
  const entropy = Math.random().toString(36).slice(2, 12);
  return `local-${Date.now().toString(36)}-${fallbackSequence.toString(36)}-${entropy}`;
}
