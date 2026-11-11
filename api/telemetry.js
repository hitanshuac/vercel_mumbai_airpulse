// vercel_mumbai_airpulse/api/telemetry.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const dbUrl = process.env.DATABASE_URL;
  const cartoApiKey = process.env.CARTO_API_KEY || '';

  // 1. Try Neon Database if DATABASE_URL is configured
  if (dbUrl) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(dbUrl);
      const stations = await sql`SELECT * FROM stations_network ORDER BY is_target DESC, station_id ASC`;
      const telemetry = await sql`SELECT * FROM hourly_telemetry ORDER BY hour_start_ist ASC`;
      const kpis = await sql`SELECT * FROM leaderboard_kpis ORDER BY public_rmse ASC`;
      const alerts = await sql`SELECT * FROM civic_grap_alerts ORDER BY created_at DESC LIMIT 20`;

      return res.status(200).json({
        source: 'Neon Serverless Postgres',
        stations_network: stations,
        hourly_telemetry: telemetry,
        leaderboard_kpis: kpis,
        civic_grap_alerts: alerts,
        carto_api_key: cartoApiKey,
        cached_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Neon connection failed, falling back to static edge data:', err.message);
    }
  }

  // 2. Zero-Latency Fallback to bundled JSON
  try {
    let fallbackPath = path.join(process.cwd(), 'public', 'data', 'mumbai_airpulse_data.json');
    if (!fs.existsSync(fallbackPath)) {
      fallbackPath = path.resolve('./public/data/mumbai_airpulse_data.json');
    }
    if (fs.existsSync(fallbackPath)) {
      const fileData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      return res.status(200).json({
        source: 'Zero-Latency Edge JSON Fallback',
        ...fileData,
        carto_api_key: cartoApiKey
      });
    }
  } catch (err) {
    console.error('Edge JSON fallback error:', err.message);
  }

  return res.status(500).json({ error: 'Failed to retrieve telemetry data.' });
}
