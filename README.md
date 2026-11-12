# Mumbai AirPulse: Vercel + Neon Serverless Dashboard
**Zindi Google Mumbai Air Quality Forecasting Challenge**

Production-ready serverless full-stack web application designed for instant 1-click deployment on Vercel with optional Neon Serverless Postgres.

## Features
- **Interactive Dark Map**: 32 stations (4 CAAQMS Targets + 28 ClimateVerse stations with IDW spatial interpolation).
- **Time-Scrubber**: 48h timeline scrubber & animation across Nov 05 through Nov 12 IST.
- **Model Switcher**: Dynamic live forecasts across all competitive submissions (Slot #1, #2, #4, #5, Safe Blend).
- **Zero-Latency Fallback**: Bundled edge dataset `public/data/mumbai_airpulse_data.json` ensures zero cold-start delay even without an external database.
- **Neon Serverless Postgres**: Endpoints in `/api/telemetry` and `/api/alerts` connect dynamically when `DATABASE_URL` is set.

## Deploy to Vercel (1-Click)
1. In Vercel, click **Add New > Project** and import repository (`hitanshuac/vercel_mumbai_airpulse`).
2. Accept the default settings (**Root Directory: `./`**, **Framework Preset: `Other`**).
3. (Optional) In project settings or Storage tab, connect Neon Serverless Postgres to populate `DATABASE_URL`.
4. Click **Deploy**!

