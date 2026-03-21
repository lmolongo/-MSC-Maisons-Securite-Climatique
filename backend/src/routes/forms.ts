import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { insertSubmission } from '../services/db.js';
import { config } from '../config.js';
import {
  sendNotification,
  contactEmailHTML,
  terrainVendeurEmailHTML,
} from '../services/mail.js';

// ══════ Schemas ══════

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional().default(''),
  message: z.string().min(10).max(5000),
});

const terrainVendeurSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional().default(''),
  location: z.string().min(2).max(300),
  area: z.string().max(50).optional().default(''),
  details: z.string().max(5000).optional().default(''),
});

// Rate limit config applied only to form submissions
const formRateLimit = {
  config: {
    rateLimit: {
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.windowMs,
    },
  },
};

// ══════ Routes ══════

export async function formRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/contact — rate limited
  app.post('/api/contact', formRateLimit, async (request, reply) => {
    const parsed = contactSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const ip = request.headers['x-real-ip'] as string || request.ip;

    try {
      const id = await insertSubmission('contact', data, ip);
      console.log(`[FORM] Contact #${id} from ${data.email}`);

      // Send email (non-blocking)
      sendNotification(
        `📩 Nouveau contact MSC — ${data.name}`,
        contactEmailHTML(data),
      ).catch((err) => console.error('[FORM] Email error:', err));

      return reply.status(201).send({ success: true, id });
    } catch (err) {
      console.error('[FORM] Contact submission error:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/terrain-vendeur — rate limited
  app.post('/api/terrain-vendeur', formRateLimit, async (request, reply) => {
    const parsed = terrainVendeurSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const ip = request.headers['x-real-ip'] as string || request.ip;

    try {
      const id = await insertSubmission('terrain-vendeur', data, ip);
      console.log(`[FORM] Terrain vendeur #${id} from ${data.email} — ${data.location}`);

      sendNotification(
        `🗺️ Proposition terrain MSC — ${data.name} (${data.location})`,
        terrainVendeurEmailHTML(data),
      ).catch((err) => console.error('[FORM] Email error:', err));

      return reply.status(201).send({ success: true, id });
    } catch (err) {
      console.error('[FORM] Terrain submission error:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
