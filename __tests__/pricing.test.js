/**
 * Unit tests for src/lib/pricing.js.
 * Run: npm test
 */

import {
  experienceMultiplier,
  getTotals,
  getFeatureBreakdown,
} from '../src/lib/pricing.js';

// pricing.js uses ESM imports from @/config/config; Jest with next/jest resolves that.
// If running without Next's Jest env, we'd need to mock or use relative imports.
// Assumes Jest is run via next/jest (see jest.config.js).

describe('experienceMultiplier', () => {
  it('returns 1.5 for 0 years (newbie cap)', () => {
    expect(experienceMultiplier(0)).toBe(1.5);
  });

  it('returns 1.0 for 10 years (baseline)', () => {
    expect(experienceMultiplier(10)).toBe(1);
  });

  it('returns 0.7 for 20 years (senior cap)', () => {
    expect(experienceMultiplier(20)).toBe(0.7);
  });

  it('returns 0.7 for 30 years (still capped)', () => {
    expect(experienceMultiplier(30)).toBe(0.7);
  });

  it('accepts config override', () => {
    expect(
      experienceMultiplier(10, {
        EXPERIENCE_INTERCEPT: 2,
        EXPERIENCE_SLOPE: 0.1,
        EXPERIENCE_MULTIPLIER_MIN: 0.5,
        EXPERIENCE_MULTIPLIER_MAX: 2,
      })
    ).toBe(1);
  });
});

describe('getTotals', () => {
  const oneFeature = [
    {
      id: 'test-feature',
      name: 'Test Feature',
      days_to_complete: 2,
      complexity: 2,
    },
  ];

  it('returns base_price = 2 days * 8 h * 1000 = 16000 for one feature at baseline', () => {
    const result = getTotals(
      ['test-feature'],
      oneFeature,
      {
        hourlyRate: 1000,
        yearsExperience: 10,
        hoursPerDay: 8,
        desiredDays: 2,
      },
      0
    );
    expect(result.hasFeatures).toBe(true);
    expect(result.estimated_days).toBe(2);
    expect(result.estimated_hours).toBe(16);
    expect(result.base_price).toBe(16000);
    expect(result.adjusted_price).toBe(16000);
    expect(result.effective_ratio).toBe(1);
  });

  it('applies discount when desired_days is 2x estimated', () => {
    const result = getTotals(
      ['test-feature'],
      oneFeature,
      {
        hourlyRate: 1000,
        yearsExperience: 10,
        hoursPerDay: 8,
        desiredDays: 4,
      },
      0
    );
    expect(result.base_price).toBe(16000);
    expect(result.time_ratio).toBe(0.5);
    expect(result.effective_ratio).toBe(0.5);
    expect(result.adjusted_price).toBe(8000);
  });

  it('applies premium when desired_days is half estimated', () => {
    const result = getTotals(
      ['test-feature'],
      oneFeature,
      {
        hourlyRate: 1000,
        yearsExperience: 10,
        hoursPerDay: 8,
        desiredDays: 1,
      },
      0
    );
    expect(result.base_price).toBe(16000);
    expect(result.time_ratio).toBe(2);
    expect(result.adjusted_price).toBe(32000);
  });

  it('returns base price when desired_days equals our estimated days (same time)', () => {
    const result = getTotals(
      ['test-feature'],
      oneFeature,
      {
        hourlyRate: 1000,
        yearsExperience: 10,
        hoursPerDay: 8,
        desiredDays: 2,
      },
      0
    );
    expect(result.estimated_days).toBe(2);
    expect(result.effective_ratio).toBe(1);
    expect(result.adjusted_price).toBe(result.base_price);
  });

  it('returns zeros and hasFeatures false when no features selected', () => {
    const result = getTotals([], oneFeature, {
      hourlyRate: 1000,
      yearsExperience: 10,
      hoursPerDay: 8,
      desiredDays: 10,
    });
    expect(result.hasFeatures).toBe(false);
    expect(result.estimated_days).toBe(0);
    expect(result.base_price).toBe(0);
    expect(result.adjusted_price).toBe(0);
  });

  it('falls back to estimated_days when desired_days is 0', () => {
    const result = getTotals(
      ['test-feature'],
      oneFeature,
      {
        hourlyRate: 1000,
        yearsExperience: 10,
        hoursPerDay: 8,
        desiredDays: 0,
      },
      0
    );
    expect(result.effective_desired_days).toBeGreaterThanOrEqual(1);
    expect(result.base_price).toBe(16000);
  });

  it('applies 10% buffer when bufferPercent is 10', () => {
    const without = getTotals(
      ['test-feature'],
      oneFeature,
      {
        hourlyRate: 1000,
        yearsExperience: 10,
        hoursPerDay: 8,
        desiredDays: 2,
      },
      0
    );
    const withBuffer = getTotals(
      ['test-feature'],
      oneFeature,
      {
        hourlyRate: 1000,
        yearsExperience: 10,
        hoursPerDay: 8,
        desiredDays: 2,
      },
      10
    );
    expect(withBuffer.base_price).toBe(without.base_price * 1.1);
    expect(withBuffer.adjusted_price).toBe(without.adjusted_price * 1.1);
  });
});

describe('getFeatureBreakdown', () => {
  const oneFeature = [
    {
      id: 'test-feature',
      name: 'Test Feature',
      days_to_complete: 2,
      complexity: 2,
    },
  ];

  it('returns one row with adjusted_days, feature_base_price, feature_adjusted_price', () => {
    const rows = getFeatureBreakdown(
      ['test-feature'],
      oneFeature,
      {
        hourlyRate: 1000,
        yearsExperience: 10,
        hoursPerDay: 8,
        desiredDays: 2,
      },
      0
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('test-feature');
    expect(rows[0].name).toBe('Test Feature');
    expect(rows[0].adjusted_days).toBe(2);
    expect(rows[0].feature_base_price).toBe(16000);
    expect(rows[0].feature_adjusted_price).toBe(16000);
  });
});
