# Developer quote tool

A developer-centric quote tool for pricing app and website projects. Set your **hourly rate** and **years of experience**, select app type and features from configurable JSON, and adjust the **desired timeline** to see a dynamic price (longer timeline = discount with floor, shorter = premium). Open-source, self-hostable, and customizable via a single config file.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000/get-a-quote](http://localhost:3000/get-a-quote).

## How it works

### Inputs (your details)

- **Hourly rate (ZAR)** — All math is done in ZAR; you can switch display to USD/EUR via static rates in config.
- **Years of experience** — Drives the **experience multiplier**: juniors take longer (multiplier &gt; 1), seniors faster (multiplier &lt; 1). Baseline `days_to_complete` in the feature JSON is calibrated for a mid-level dev (~5–10 years).
- **Hours per day** — Billable hours per day (default 8). Converts estimated days into hours for pricing.
- **Buffer** — Optional 10% or 20% buffer for unknowns, applied to both base and adjusted price.
- **Display currency** — ZAR, USD, or EUR (static rates in `config.js`; replace with an API if needed).

### Experience multiplier

Formula (configurable in `src/config/config.js`):

- `multiplier = max(0.7, min(1.5, 1.5 - 0.05 × years))`
- **0 years** → 1.5 (50% longer)
- **10 years** → 1.0 (baseline)
- **20+ years** → 0.7 (30% faster, capped)

So: **adjusted_days per feature** = `days_to_complete` (from JSON) × experience_multiplier.

### Time-based pricing

- **Base price (“our time”)** = Σ (adjusted_days × hours_per_day × hourly_rate) over selected features.
- **Desired days** — You enter how many days you want to aim for.
- **Longer timeline** → price is discounted (ratio &lt; 1), with a **floor** (default 0.4× base) so the quote never goes below a sustainable minimum. Desired days are capped at 3× estimated days for discount purposes.
- **Shorter timeline** → price gets a **premium** (ratio &gt; 1); no upper cap (rush pricing).

So: **adjusted price** = base_price × effective_ratio, where effective_ratio = max(estimated_days / effective_desired_days, 0.4).

### Buffer

If you enable a 10% or 20% buffer, both base and adjusted prices are multiplied by 1.1 or 1.2. Useful for unknowns or contingency.

## Customization

### Features and app types

- **App features**: Edit `src/config/pricing/app.json`. Each app type has a `type` and `features` array. Each feature has `id`, `name`, `days_to_complete`, `complexity`, `survey_question`, and optional `type` (used for grouping into Core / Advanced / Polish).
- **Website features**: Edit `src/config/pricing/website.json`. Same idea; IDs are derived from `name` if not set.
- Do **not** rely on `price_zar` in logic; it is legacy. All pricing uses `days_to_complete` and your config (rate, experience, hours/day).

### Multipliers and formulas

Edit `src/config/config.js`:

- `HOURS_PER_DAY`, `DEFAULT_HOURLY_RATE_ZAR`
- `MIN_PRICE_MULTIPLIER` (discount floor), `MAX_DESIRED_TIME_MULTIPLIER` (max timeline for discount)
- `EXPERIENCE_MULTIPLIER_MIN`, `EXPERIENCE_MULTIPLIER_MAX`, `EXPERIENCE_SLOPE`, `EXPERIENCE_INTERCEPT` for the experience formula
- `BUFFER_PERCENT_OPTIONS`, `CURRENCY_OPTIONS` (add or change currencies; use static `rateToZar` or plug in an API)

### Logic (for developers)

- **Pricing logic** lives in `src/lib/pricing.js`: `experienceMultiplier`, `getTotals`, `getFeatureBreakdown`. Pure functions, no React; easy to unit test.
- **UI** is `src/components/GetAQuote.jsx`: wizard (Your details → App type → Core → Advanced → Polish → Quote), feature selection, timeline input, summary table, and optional “Export quote” (mailto by default).

## Tests

```bash
npm test
```

Jest runs `__tests__/pricing.test.js` against `src/lib/pricing.js`: experience multiplier values, getTotals for one feature (base price, desired = estimated, 2× discount, half-time premium), edge cases (no features, desired_days 0), and optional buffer.

## Deployment

- **Vercel**: Connect the repo; build command `npm run build`, output Next.js. No server required for the quote flow.
- **Netlify**: Same; use “Next on Netlify” or the default Next runtime.
- **Form submission**: The app ships with a **mailto** export (opens email client with quote summary). Replace the `handleBuildRequestSubmit` logic in `GetAQuote.jsx` with your own API (e.g. Netlify Functions, Vercel serverless) if you want to store or send server-side.

## License

MIT. See [LICENSE](LICENSE).

## Repo setup

```bash
git init
# Add .gitignore (node_modules, .next, .env, etc.)
# Create repo on GitHub and push
```

To open-source: add a clear README (this file), keep config and feature JSON editable, and document how to run and customize.
