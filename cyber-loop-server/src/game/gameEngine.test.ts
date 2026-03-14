/**
 * Unit tests for pure game logic (score calculation).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) })
      })
    })
  }
}));

import { computeScore } from './gameEngine';

describe('computeScore', () => {
  it('calculates score as 10 * correct - 2 * mistakes', () => {
    expect(computeScore(5, 0)).toBe(50);
    expect(computeScore(10, 2)).toBe(96);
    expect(computeScore(17, 3)).toBe(164);
  });

  it('returns minimum 0 for low scores', () => {
    expect(computeScore(0, 10)).toBe(0);
    expect(computeScore(1, 10)).toBe(0);
  });

  it('handles zero mistakes', () => {
    expect(computeScore(20, 0)).toBe(200);
  });

  it('handles zero correct', () => {
    expect(computeScore(0, 5)).toBe(0);
  });
});
