// SubTrack — Sync API
// GET  /api/data?key=xxx  → returns user data
// POST /api/data?key=xxx  → saves user data

const { neon } = require("@neondatabase/serverless");

async function getDb() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`
    CREATE TABLE IF NOT EXISTS user_data (
      user_key  TEXT PRIMARY KEY,
      subs      JSONB        NOT NULL DEFAULT '[]',
      rates     JSONB        NOT NULL DEFAULT '{}',
      budget    NUMERIC               DEFAULT 0,
      dark      BOOLEAN               DEFAULT false,
      updated_at TIMESTAMPTZ          DEFAULT NOW()
    )
  `;
  return sql;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const key = (req.query.key || "").trim();
  if (!key || key.length < 6) {
    return res.status(400).json({ error: "invalid key" });
  }

  try {
    const sql = await getDb();

    if (req.method === "GET") {
      const rows = await sql`SELECT subs, rates, budget, dark FROM user_data WHERE user_key = ${key}`;
      if (!rows.length) return res.status(200).json({ subs: [], rates: {}, budget: 0, dark: false, fresh: true });
      return res.status(200).json(rows[0]);
    }

    if (req.method === "POST") {
      const { subs, rates, budget, dark } = req.body;
      await sql`
        INSERT INTO user_data (user_key, subs, rates, budget, dark, updated_at)
        VALUES (${key}, ${JSON.stringify(subs)}, ${JSON.stringify(rates)}, ${budget}, ${dark}, NOW())
        ON CONFLICT (user_key) DO UPDATE
          SET subs = ${JSON.stringify(subs)},
              rates = ${JSON.stringify(rates)},
              budget = ${budget},
              dark = ${dark},
              updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "server error" });
  }
};
