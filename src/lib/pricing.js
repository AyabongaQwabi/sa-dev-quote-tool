/**
 * Pure pricing logic for the developer quote tool.
 * All calculations use days_to_complete from feature JSON and config (no price_zar in math).
 * Used by GetAQuote.jsx and by __tests__/pricing.test.js.
 */

import {
  EXPERIENCE_MULTIPLIER_MIN,
  EXPERIENCE_MULTIPLIER_MAX,
  EXPERIENCE_INTERCEPT,
  EXPERIENCE_SLOPE,
  MIN_PRICE_MULTIPLIER,
  MAX_DESIRED_TIME_MULTIPLIER,
  HOURS_PER_DAY,
} from '@/config/config';

/**
 * Experience multiplier: how much longer (or shorter) this developer takes vs baseline.
 * Baseline (JSON days_to_complete) assumes mid-level (~5–10 years).
 * Juniors: multiplier > 1 (take longer). Seniors: multiplier < 1 (faster).
 * Formula: max(MIN, min(MAX, INTERCEPT - SLOPE * years)).
 * Examples: 0y → 1.5, 10y → 1.0, 20y → 0.7 (capped).
 *
 * @param {number} yearsExperience - Years of experience (>= 0).
 * @param {object} [config] - Optional override; uses module config if omitted.
 * @returns {number} Multiplier (0.7 to 1.5).
 */
export function experienceMultiplier(yearsExperience, config = {}) {
  const min = config.EXPERIENCE_MULTIPLIER_MIN ?? EXPERIENCE_MULTIPLIER_MIN;
  const max = config.EXPERIENCE_MULTIPLIER_MAX ?? EXPERIENCE_MULTIPLIER_MAX;
  const intercept = config.EXPERIENCE_INTERCEPT ?? EXPERIENCE_INTERCEPT;
  const slope = config.EXPERIENCE_SLOPE ?? EXPERIENCE_SLOPE;
  const years = Math.max(0, Number(yearsExperience) || 0);
  const raw = intercept - slope * years;
  return Math.max(min, Math.min(max, raw));
}

/**
 * Get totals and adjusted price for selected features.
 * - adjusted_days per feature = days_to_complete * experience_multiplier.
 * - base_price = sum(adjusted_days * hours_per_day * hourly_rate) = "our time" price.
 * - desired_days from user: longer → discount (ratio < 1, floored at MIN_PRICE_MULTIPLIER), shorter → premium (ratio > 1, no cap).
 * - effective_desired_days = min(desired_days, estimated_days * MAX_DESIRED_TIME_MULTIPLIER) so discount is capped.
 *
 * Edge cases:
 * - No features → all zeros, hasFeatures false.
 * - desired_days 0 or invalid → fallback to estimated_days (no timeline adjustment).
 *
 * @param {string[]} selectedFeatureIds - IDs of selected features.
 * @param {object[]} allFeatures - Full list of features (each: id, name, days_to_complete, complexity, ...).
 * @param {object} options - hourlyRate, yearsExperience, hoursPerDay, desiredDays (number or string), config (optional).
 * @param {number} [bufferPercent=0] - Optional buffer (0, 10, 20) applied to base_price and adjusted_price.
 * @returns {object} { estimated_days, estimated_hours, base_price, effective_desired_days, time_ratio, effective_ratio, adjusted_price, hasFeatures, totals_by_feature[], bufferPercent }
 */
export function getTotals(selectedFeatureIds, allFeatures, options, bufferPercent = 0) {
  const {
    hourlyRate = 1000,
    yearsExperience = 0,
    hoursPerDay = HOURS_PER_DAY,
    desiredDays: desiredDaysInput,
    config = {},
  } = options;

  const rate = Math.max(0, Number(hourlyRate) || 0);
  const years = Math.max(0, Number(yearsExperience) || 0);
  const hoursDay = Math.max(0.1, Number(hoursPerDay) || HOURS_PER_DAY);
  const mult = experienceMultiplier(years, config);
  const minPriceMult = config.MIN_PRICE_MULTIPLIER ?? MIN_PRICE_MULTIPLIER;
  const maxTimeMult = config.MAX_DESIRED_TIME_MULTIPLIER ?? MAX_DESIRED_TIME_MULTIPLIER;

  const totalsByFeature = [];
  let estimatedDays = 0;
  let basePrice = 0;

  for (const id of selectedFeatureIds || []) {
    const f = allFeatures.find((x) => x.id === id);
    if (!f) continue;
    const baselineDays = Number(f.days_to_complete) || 0;
    const adjustedDays = baselineDays * mult;
    const featureHours = adjustedDays * hoursDay;
    const featureBasePrice = featureHours * rate;
    estimatedDays += adjustedDays;
    basePrice += featureBasePrice;
    totalsByFeature.push({
      id: f.id,
      name: f.name,
      complexity: f.complexity,
      baseline_days: baselineDays,
      adjusted_days: adjustedDays,
      feature_hours: featureHours,
      feature_base_price: featureBasePrice,
    });
  }

  const hasFeatures = totalsByFeature.length > 0;
  const estimatedHours = estimatedDays * hoursDay;

  // desired_days: invalid/0 → use estimated_days so ratio = 1
  let desiredDaysNum = parseInt(desiredDaysInput, 10);
  if (!hasFeatures || !Number.isFinite(desiredDaysNum) || desiredDaysNum <= 0) {
    desiredDaysNum = Math.max(1, Math.round(estimatedDays));
  }

  // Cap desired_days for discount: effective_desired_days = min(desired_days, estimated_days * MAX_DESIRED_TIME_MULTIPLIER)
  const effectiveDesiredDays = Math.max(
    1,
    Math.min(desiredDaysNum, Math.ceil(estimatedDays * maxTimeMult))
  );

  // time_ratio = estimated_days / effective_desired_days. >1 = rush (premium), <1 = discount.
  let timeRatio = estimatedDays / effectiveDesiredDays;
  let effectiveRatio = Math.max(timeRatio, minPriceMult);

  // When our time and desired time are the same (by rounded days), return original estimated price — no ratio, no drift.
  const estimatedDaysRounded = Math.round(estimatedDays);
  if (desiredDaysNum === estimatedDaysRounded) {
    effectiveRatio = 1;
    timeRatio = 1;
  }

  let adjustedPrice = basePrice * effectiveRatio;

  // Per-feature adjusted price for table (same effective_ratio for all)
  totalsByFeature.forEach((row) => {
    row.feature_adjusted_price = row.feature_base_price * effectiveRatio;
  });

  // Buffer: apply to base_price, adjusted_price, and each feature row so display shows buffered values
  const bufferFactor = 1 + (bufferPercent / 100);
  if (bufferPercent > 0) {
    basePrice = basePrice * bufferFactor;
    adjustedPrice = adjustedPrice * bufferFactor;
    totalsByFeature.forEach((row) => {
      row.feature_base_price = row.feature_base_price * bufferFactor;
      row.feature_adjusted_price = row.feature_adjusted_price * bufferFactor;
    });
  }

  return {
    estimated_days: estimatedDays,
    estimated_hours: estimatedHours,
    base_price: basePrice,
    effective_desired_days: effectiveDesiredDays,
    time_ratio: timeRatio,
    effective_ratio: effectiveRatio,
    adjusted_price: adjustedPrice,
    hasFeatures,
    totals_by_feature: totalsByFeature,
    bufferPercent,
  };
}

/**
 * Per-feature breakdown for the quote table: adjusted_days, feature_base_price, feature_adjusted_price.
 * Same inputs as getTotals; returns array of rows for display.
 *
 * @param {string[]} selectedFeatureIds
 * @param {object[]} allFeatures
 * @param {object} options - Same as getTotals.
 * @param {number} [bufferPercent=0]
 * @returns {object[]} Array of { id, name, complexity, adjusted_days, feature_base_price, feature_adjusted_price }
 */
export function getFeatureBreakdown(selectedFeatureIds, allFeatures, options, bufferPercent = 0) {
  const result = getTotals(selectedFeatureIds, allFeatures, options, bufferPercent);
  return result.totals_by_feature.map((row) => ({
    id: row.id,
    name: row.name,
    complexity: row.complexity,
    adjusted_days: row.adjusted_days,
    feature_base_price: row.feature_base_price,
    feature_adjusted_price: row.feature_adjusted_price,
  }));
}
