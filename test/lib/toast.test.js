import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toast, dismissToast } from '../../src/lib/toast.js';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('toast()', () => {
  it('returns unique monotonic ids', () => {
    const a = toast('one');
    const b = toast('two');
    const c = toast('three');
    expect(b).toBe(a + 1);
    expect(c).toBe(b + 1);
  });

  it('auto-dismisses after ttl (timer fires without throwing)', () => {
    toast('hello', { ttl: 500 });
    expect(() => vi.advanceTimersByTime(600)).not.toThrow();
  });

  it('uses default ttl when none provided', () => {
    const id = toast('default');
    expect(typeof id).toBe('number');
    expect(() => vi.advanceTimersByTime(2500)).not.toThrow();
  });
});

describe('dismissToast()', () => {
  it('clears the pending timer (advancing past ttl stays safe)', () => {
    const id = toast('manual', { ttl: 1000 });
    expect(() => dismissToast(id)).not.toThrow();
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
  });

  it('is a no-op for unknown ids', () => {
    expect(() => dismissToast(999_999)).not.toThrow();
  });

  it('is idempotent (safe to call twice)', () => {
    const id = toast('x', { ttl: 1000 });
    dismissToast(id);
    expect(() => dismissToast(id)).not.toThrow();
  });
});
