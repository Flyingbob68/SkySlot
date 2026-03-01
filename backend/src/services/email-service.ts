/**
 * Email sending service with SMTP transport, retry logic, and in-memory queue.
 *
 * - Loads SMTP config from ClubConfig (DB), falls back to env vars
 * - If SMTP is not configured, logs emails to console (development mode)
 * - Retry: 3 attempts with exponential backoff (1s, 2s, 4s)
 * - Queue: simple FIFO that processes one email at a time
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config/env.js';
import { prisma } from '../utils/prisma.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly pass: string;
  readonly from: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

// ---------------------------------------------------------------------------
// SMTP config resolution (DB first, env fallback)
// ---------------------------------------------------------------------------

async function resolveSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const clubConfig = await prisma.clubConfig.findUnique({
      where: { id: 'default' },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPass: true,
        mailFromAddress: true,
      },
    });

    // Prefer DB values if all required fields are set
    if (clubConfig?.smtpHost && clubConfig.smtpPort && clubConfig.smtpUser && clubConfig.smtpPass) {
      return {
        host: clubConfig.smtpHost,
        port: clubConfig.smtpPort,
        user: clubConfig.smtpUser,
        pass: clubConfig.smtpPass,
        from: clubConfig.mailFromAddress ?? config.smtp.from ?? 'noreply@skyslot.local',
      };
    }

    // Fall back to env vars
    if (config.smtp.host && config.smtp.port && config.smtp.user && config.smtp.pass) {
      return {
        host: config.smtp.host,
        port: config.smtp.port,
        user: config.smtp.user,
        pass: config.smtp.pass,
        from: clubConfig?.mailFromAddress ?? config.smtp.from ?? 'noreply@skyslot.local',
      };
    }
  } catch (error) {
    console.warn('[email] Failed to load SMTP config from DB, trying env vars:', error);

    if (config.smtp.host && config.smtp.port && config.smtp.user && config.smtp.pass) {
      return {
        host: config.smtp.host,
        port: config.smtp.port,
        user: config.smtp.user,
        pass: config.smtp.pass,
        from: config.smtp.from ?? 'noreply@skyslot.local',
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Transport factory
// ---------------------------------------------------------------------------

function createTransport(smtpConfig: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

const queue: EmailMessage[] = [];
let processing = false;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry(
  transport: Transporter,
  from: string,
  message: EmailMessage,
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      console.log(
        `[email] Sent to ${message.to}: "${message.subject}" (attempt ${attempt})`,
      );
      return;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;

      if (isLastAttempt) {
        console.error(
          `[email] Failed to send to ${message.to} after ${MAX_RETRIES} attempts:`,
          error,
        );
        return;
      }

      const backoff = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[email] Attempt ${attempt} failed for ${message.to}, retrying in ${backoff}ms...`,
      );
      await delay(backoff);
    }
  }
}

function logToConsole(message: EmailMessage): void {
  console.log('--- [email-dev] ---');
  console.log(`  To:      ${message.to}`);
  console.log(`  Subject: ${message.subject}`);
  console.log(`  Text:    ${message.text.slice(0, 200)}...`);
  console.log('--- /email-dev ---');
}

async function processQueue(): Promise<void> {
  if (processing) {
    return;
  }

  processing = true;

  try {
    // Resolve SMTP config fresh each time the queue starts processing
    const smtpConfig = await resolveSmtpConfig();

    while (queue.length > 0) {
      const message = queue.shift();

      if (!message) {
        break;
      }

      if (smtpConfig) {
        const transport = createTransport(smtpConfig);
        await sendWithRetry(transport, smtpConfig.from, message);
      } else {
        logToConsole(message);
      }
    }
  } finally {
    processing = false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Queue an email for sending.
 *
 * The email is added to an in-memory FIFO queue and processed sequentially.
 * If SMTP is not configured, the email is logged to console instead.
 */
export function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
): void {
  const message: EmailMessage = { to, subject, html, text };
  queue.push(message);

  // Kick off queue processing (fire-and-forget)
  void processQueue();
}

/**
 * Returns the current queue length (useful for testing/monitoring).
 */
export function getQueueLength(): number {
  return queue.length;
}

/**
 * Send a test email to verify SMTP configuration.
 *
 * Unlike `sendEmail`, this runs synchronously (not queued) so we can
 * return success/failure to the caller immediately.
 */
export async function sendTestEmail(recipientEmail: string): Promise<{ success: boolean; error?: string }> {
  const smtpConfig = await resolveSmtpConfig();

  if (!smtpConfig) {
    return { success: false, error: 'Configurazione SMTP non completa. Compila tutti i campi e salva prima di inviare il test.' };
  }

  const transport = createTransport(smtpConfig);

  try {
    // Verify connection first
    await transport.verify();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Connessione al server SMTP fallita: ${message}` };
  }

  try {
    await transport.sendMail({
      from: smtpConfig.from,
      to: recipientEmail,
      subject: 'SkySlot - Email di prova',
      text: 'Questa e\' un\'email di prova inviata da SkySlot per verificare la configurazione SMTP.\n\nSe ricevi questo messaggio, la configurazione e\' corretta!',
      html: [
        '<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">',
        '<h2 style="color: #1e40af;">SkySlot - Email di prova</h2>',
        '<p>Questa e\' un\'email di prova inviata da <strong>SkySlot</strong> per verificare la configurazione SMTP.</p>',
        '<p style="color: #16a34a; font-weight: bold;">Se ricevi questo messaggio, la configurazione e\' corretta!</p>',
        '</div>',
      ].join(''),
    });

    console.log(`[email] Test email sent successfully to ${recipientEmail}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] Test email failed to ${recipientEmail}:`, err);
    return { success: false, error: `Invio fallito: ${message}` };
  }
}
