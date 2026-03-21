import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

export async function initDB(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id            SERIAL PRIMARY KEY,
        type          VARCHAR(30) NOT NULL,
        data          JSONB NOT NULL,
        ip            VARCHAR(45),
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(type);
      CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);
    `);
    console.log('[DB] Tables initialized');
  } finally {
    client.release();
  }
}

export async function insertSubmission(
  type: string,
  data: Record<string, unknown>,
  ip?: string,
): Promise<number> {
  const result = await pool.query(
    'INSERT INTO submissions (type, data, ip) VALUES ($1, $2, $3) RETURNING id',
    [type, JSON.stringify(data), ip || null],
  );
  return result.rows[0].id;
}
