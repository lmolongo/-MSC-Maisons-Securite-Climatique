export const config = {
  port: parseInt(process.env.BACKEND_PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'msc',
    user: process.env.POSTGRES_USER || 'msc',
    password: process.env.POSTGRES_PASSWORD || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'MSC <noreply@msc.fr>',
  },

  notifyEmail: process.env.NOTIFY_EMAIL || '',

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '120000', 10),
  },

  admin: {
    user: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASSWORD || '',
  },
} as const;
