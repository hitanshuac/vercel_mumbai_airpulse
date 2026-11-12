// vercel_mumbai_airpulse/api/alerts.js
let inMemoryAlerts = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const dbUrl = process.env.DATABASE_URL;

  // Live Gemini Waterfall Proxy with Quota Guard
  if (req.method === 'POST' && req.body && req.body.action === 'generate_gemini') {
    const geminiKey = req.body.apiKey || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      // 4-Tier Free-Tier Waterfall: 3.5-Flash-Lite (500 RPD) -> 3.1-Flash-Lite -> 2.5-Flash-Lite -> 2.5-Flash
      const modelsWaterfall = [
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash'
      ];

      for (const model of modelsWaterfall) {
        try {
          const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: req.body.prompt || 'Synthesize Mumbai air quality directive' }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
            })
          });

          if (geminiResp.ok) {
            const geminiData = await geminiResp.json();
            return res.status(200).json({
              source: `Live Gemini API (${model})`,
              modelUsed: model,
              quotaCost: 1,
              data: geminiData
            });
          } else {
            console.warn(`Model ${model} returned status ${geminiResp.status}, falling to next tier`);
          }
        } catch (err) {
          console.warn(`Gemini proxy error on ${model}:`, err.message);
        }
      }
    }
    return res.status(200).json({
      source: 'Deterministic Fallback',
      quotaCost: 0,
      message: 'No Gemini key configured or all waterfall models exhausted'
    });
  }

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
