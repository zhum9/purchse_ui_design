import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientId } from './id';

afterEach(() => vi.unstubAllGlobals());

describe('createClientId', () => {
  it('creates a UUID using secure random bytes when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xab);
        return bytes;
      },
    });

    expect(createClientId()).toMatch(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  });

  it('still creates distinct client IDs when Web Crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);

    expect(createClientId()).not.toBe(createClientId());
  });
});
