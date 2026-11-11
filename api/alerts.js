// vercel_mumbai_airpulse/api/alerts.js
import fs from 'fs';
import path from 'path';

let inMemoryAlerts = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const dbUrl = process.env.DATABASE_URL;

  if (req.method === 'POST') {
    const { station_id, persona, severity, directive } = req.body || {};
    if (!persona || !directive) {
      return res.status(400).json({ error: 'Missing persona or directive' });
    }

    if (dbUrl) {
      try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(dbUrl);
        const inserted = await sql`
          INSERT INTO civic_grap_alerts (station_id, persona, severity, directive)
          VALUES (${station_id || '3409511'}, ${persona}, ${severity || 'ALERT'}, ${directive})
          RETURNING *;
        `;
        return res.status(201).json({ source: 'Neon Postgres', alert: inserted[0] });
      } catch (err) {
        console.warn('Neon insert error, saving to ephemeral memory:', err.message);
      }
    }

    const localAlert = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      station_id: station_id || '3409511',
      persona,
      severity: severity || 'ALERT',
      directive
    };
    inMemoryAlerts.unshift(localAlert);
    return res.status(201).json({ source: 'Local Memory Store', alert: localAlert });
  }

  // GET: Retrieve alerts
  if (dbUrl) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(dbUrl);
      const alerts = await sql`SELECT * FROM civic_grap_alerts ORDER BY created_at DESC LIMIT 30`;
      return res.status(200).json({ source: 'Neon Postgres', alerts });
    } catch (err) {
      console.warn('Neon alerts query error:', err.message);
    }
  }

  return res.status(200).json({ source: 'Local Memory Store', alerts: inMemoryAlerts });
}
