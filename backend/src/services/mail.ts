import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter: nodemailer.Transporter | null = null;

export function initMail(): void {
  if (!config.smtp.host) {
    console.warn('[MAIL] SMTP not configured — emails disabled');
    return;
  }

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  console.log(`[MAIL] SMTP configured → ${config.smtp.host}:${config.smtp.port}`);
}

export async function sendNotification(
  subject: string,
  html: string,
): Promise<boolean> {
  if (!transporter || !config.notifyEmail) {
    console.warn('[MAIL] Skipping email — not configured');
    return false;
  }

  try {
    await transporter.sendMail({
      from: config.smtp.from,
      to: config.notifyEmail,
      subject,
      html,
    });
    console.log(`[MAIL] Sent: ${subject}`);
    return true;
  } catch (err) {
    console.error('[MAIL] Send failed:', err);
    return false;
  }
}

// ══════ Email templates ══════

export function contactEmailHTML(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#2478a0,#2d8a4e);padding:24px 32px;border-radius:12px 12px 0 0;">
        <h2 style="color:#fff;margin:0;">📩 Nouveau message — MSC</h2>
      </div>
      <div style="background:#f8f9fa;padding:24px 32px;border:1px solid #e0e0e0;">
        <p><strong>Nom :</strong> ${esc(data.name)}</p>
        <p><strong>Email :</strong> <a href="mailto:${esc(data.email)}">${esc(data.email)}</a></p>
        ${data.phone ? `<p><strong>Tél :</strong> ${esc(data.phone)}</p>` : ''}
        <hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;">
        <p><strong>Message :</strong></p>
        <p style="white-space:pre-wrap;">${esc(data.message)}</p>
      </div>
      <div style="background:#fff;padding:16px 32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="color:#999;font-size:12px;margin:0;">MSC — Maisons Sécurité Climatique</p>
      </div>
    </div>
  `;
}

export function terrainVendeurEmailHTML(data: {
  name: string;
  email: string;
  phone?: string;
  location: string;
  area?: string;
  details?: string;
}): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#2d8a4e,#7d5e35);padding:24px 32px;border-radius:12px 12px 0 0;">
        <h2 style="color:#fff;margin:0;">🗺️ Proposition de terrain — MSC</h2>
      </div>
      <div style="background:#f8f9fa;padding:24px 32px;border:1px solid #e0e0e0;">
        <p><strong>Nom :</strong> ${esc(data.name)}</p>
        <p><strong>Email :</strong> <a href="mailto:${esc(data.email)}">${esc(data.email)}</a></p>
        ${data.phone ? `<p><strong>Tél :</strong> ${esc(data.phone)}</p>` : ''}
        <hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;">
        <p><strong>Localisation :</strong> ${esc(data.location)}</p>
        ${data.area ? `<p><strong>Superficie :</strong> ${esc(data.area)}</p>` : ''}
        ${data.details ? `<p><strong>Infos :</strong></p><p style="white-space:pre-wrap;">${esc(data.details)}</p>` : ''}
      </div>
      <div style="background:#fff;padding:16px 32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="color:#999;font-size:12px;margin:0;">MSC — Maisons Sécurité Climatique</p>
      </div>
    </div>
  `;
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
