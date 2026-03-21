import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { config } from './config.js';
import { initDB, pool } from './services/db.js';
import { initMail } from './services/mail.js';
import { formRoutes } from './routes/forms.js';
import { adminRoutes } from './routes/admin.js';

async function main() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
    trustProxy: true, // Behind nginx
  });

  // ══════ Plugins ══════
  await app.register(helmet, {
    contentSecurityPolicy: false, // Handled by nginx
  });

  await app.register(cors, {
    origin: true, // Same-origin in prod (nginx handles it)
    methods: ['GET', 'POST', 'DELETE'],
  });

  // Rate limiting registered but NOT applied globally
  // Applied per-route in form routes only
  await app.register(rateLimit, {
    global: false, // ← Do NOT apply to all routes
    keyGenerator: (request) => {
      return (request.headers['x-real-ip'] as string) || request.ip;
    },
  });

  // ══════ Health check ══════
  app.get('/health', async () => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch {
      return { status: 'degraded', db: 'disconnected' };
    }
  });

  // ══════ Routes ══════
  await app.register(formRoutes);
  await app.register(adminRoutes);

  // ══════ Init services ══════
  await initDB();
  initMail();

  // ══════ Start ══════
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`[MSC] Backend listening on :${config.port}`);
}

main().catch((err) => {
  console.error('[MSC] Fatal error:', err);
  process.exit(1);
});
