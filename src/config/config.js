/**
 * Developer Quote Tool — Pricing & behaviour configuration.
 *
 * All multipliers and formulas are centralized here so the app can be
 * customized for different markets or assumptions without touching component logic.
 * JSON feature data (app.json / website.json) uses days_to_complete as a
 * baseline for a mid-level developer (~5–10 years); this config adjusts for
 * the user's years of experience.
 */

// --- Time & rate defaults ---
/** Default billable hours per day. Used to convert estimated_days → estimated_hours. */
export const HOURS_PER_DAY = 8;

/** Default hourly rate in ZAR when user hasn't set one. All math is done in ZAR; currency selector is display-only. */
export const DEFAULT_HOURLY_RATE_ZAR = 1000;

// --- Timeline / price adjustment (desired_days vs our estimate) ---
/**
 * Price never goes below this fraction of the "our time" quote.
 * Rationale: very long timelines would otherwise drive price to zero; this floor keeps quotes sustainable.
 */
export const MIN_PRICE_MULTIPLIER = 0.4;

/**
 * Desired build time (days) is capped at (our estimate × this factor) for discount purposes.
 * Beyond that, the floor (MIN_PRICE_MULTIPLIER) applies.
 * Rationale: we don't give unlimited discount for "I want it in 2 years."
 */
export const MAX_DESIRED_TIME_MULTIPLIER = 3;

// --- Experience multiplier (adjusts days_to_complete by seniority) ---
/**
 * Years of experience at which the JSON baseline applies (multiplier = 1.0).
 * JSON days_to_complete is calibrated for roughly mid-level (~5–10 years).
 */
export const EXPERIENCE_BASELINE_YEARS = 7;

/**
 * Minimum experience multiplier (fastest / most senior).
 * Seniors take less time; we cap how much faster to avoid unrealistic estimates.
 */
export const EXPERIENCE_MULTIPLIER_MIN = 0.7;

/**
 * Maximum experience multiplier (slowest / junior).
 * Juniors take longer; we cap at 1.5× to avoid runaway estimates.
 */
export const EXPERIENCE_MULTIPLIER_MAX = 1.5;

/**
 * Slope for linear formula: multiplier = intercept - slope * years.
 * With intercept 1.5 and slope 0.05: 0y → 1.5, 10y → 1.0, 20y → 0.5 (then clamped to 0.7).
 * Empirical: productivity scales non-linearly with experience; this is a simple approximation.
 */
export const EXPERIENCE_SLOPE = 0.05;

/** Intercept for experience_multiplier when years = 0. Formula: max(MIN, min(MAX, INTERCEPT - SLOPE * years)). */
export const EXPERIENCE_INTERCEPT = 1.5;

// --- Buffer for unknowns ---
/** Options for "add buffer" toggle: 0, 10, 20 percent. Applied to base and adjusted price. */
export const BUFFER_PERCENT_OPTIONS = [0, 10, 20];

// --- Currency (display only; all calculations in ZAR) ---
/** Static rates for display: 1 ZAR = rate × this value in target currency. Extend with live API if needed. */
export const CURRENCY_OPTIONS = [
  { code: 'ZAR', label: 'ZAR', rateToZar: 1 },
  { code: 'USD', label: 'USD', rateToZar: 0.055 },
  { code: 'EUR', label: 'EUR', rateToZar: 0.05 },
];

/** Single export for pricing.js and components. */
export const pricingConfig = {
  HOURS_PER_DAY,
  DEFAULT_HOURLY_RATE_ZAR,
  MIN_PRICE_MULTIPLIER,
  MAX_DESIRED_TIME_MULTIPLIER,
  EXPERIENCE_BASELINE_YEARS,
  EXPERIENCE_MULTIPLIER_MIN,
  EXPERIENCE_MULTIPLIER_MAX,
  EXPERIENCE_SLOPE,
  EXPERIENCE_INTERCEPT,
  BUFFER_PERCENT_OPTIONS,
  CURRENCY_OPTIONS,
};

export default pricingConfig;
