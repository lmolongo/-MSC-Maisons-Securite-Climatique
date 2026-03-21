import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../services/db.js';
import { config } from '../config.js';

// Verify auth header — returns true if valid
function checkAuth(request: FastifyRequest): boolean {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) return false;

  const decoded = Buffer.from(auth.slice(6), 'base64').toString();
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return false;

  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);

  return user === config.admin.user && pass === config.admin.password;
}

// Hook for protected routes
async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  if (!config.admin.password) {
    reply.status(503).send({ error: 'Admin not configured' });
    return;
  }
  if (!checkAuth(request)) {
    // NO WWW-Authenticate header — just a plain 401 JSON
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/admin/login — test credentials without triggering browser popup
  app.post('/api/admin/login', async (request, reply) => {
    if (!config.admin.password) {
      return reply.status(503).send({ error: 'Admin not configured' });
    }

    const body = request.body as { user?: string; password?: string };
    if (!body?.user || !body?.password) {
      return reply.status(400).send({ error: 'Missing user or password' });
    }

    if (body.user === config.admin.user && body.password === config.admin.password) {
      return { ok: true };
    }

    return reply.status(401).send({ error: 'Invalid credentials' });
  });

  // All other admin routes require Basic Auth header
  app.get('/api/admin/submissions', { onRequest: authGuard }, async (request) => {
    const query = request.query as { type?: string; page?: string; limit?: string };
    const type = query.type || null;
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (type) {
      conditions.push(`type = $${paramIdx++}`);
      params.push(type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM submissions ${where}`, params),
      pool.query(
        `SELECT id, type, data, ip, created_at FROM submissions ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        [...params, limit, offset],
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return {
      submissions: dataResult.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  });

  app.get('/api/admin/submissions/:id', { onRequest: authGuard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await pool.query(
      'SELECT id, type, data, ip, created_at FROM submissions WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return result.rows[0];
  });

  app.delete('/api/admin/submissions/:id', { onRequest: authGuard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await pool.query(
      'DELETE FROM submissions WHERE id = $1 RETURNING id',
      [id],
    );
    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return { deleted: true, id: result.rows[0].id };
  });

  app.get('/api/admin/stats', { onRequest: authGuard }, async () => {
    const result = await pool.query(`
      SELECT type, COUNT(*) as count, MIN(created_at) as first_at, MAX(created_at) as last_at
      FROM submissions GROUP BY type ORDER BY type
    `);
    const total = await pool.query('SELECT COUNT(*) FROM submissions');
    return { total: parseInt(total.rows[0].count, 10), by_type: result.rows };
  });
}
