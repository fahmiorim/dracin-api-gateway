import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'Dracin API Gateway <noreply@dracin.com>';
    this.init();
  }

  init() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      logger.warn('Email service not configured - SMTP_HOST, SMTP_USER, SMTP_PASS required');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465,
      auth: { user, pass }
    });
  }

  isReady() {
    return !!this.transporter;
  }

  async sendExpiryWarning(client, daysLeft) {
    if (!this.isReady()) return false;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: client.email,
        subject: `[Dracin API] API Key kamu akan expire dalam ${daysLeft} hari`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
            <div style="background: #4f6ef7; padding: 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: white; margin: 0;">Dracin API Gateway</h2>
            </div>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
              <p>Halo <strong>${client.name}</strong>,</p>
              <p>API key kamu akan <strong>expire dalam ${daysLeft} hari</strong> 
                (${new Date(client.expires_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}).</p>
              <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                  ⚠️ Setelah expire, semua request menggunakan API key ini akan ditolak.
                </p>
              </div>
              <p>Segera hubungi admin untuk perpanjangan.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                Email ini dikirim otomatis dari Dracin API Gateway.
              </p>
            </div>
          </div>
        `
      });
      logger.info(`Expiry warning email sent to ${client.email}`);
      return true;
    } catch (err) {
      logger.error('Failed to send expiry email:', err.message);
      return false;
    }
  }

  async sendWelcome(client, apiKey) {
    if (!this.isReady()) return false;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: client.email,
        subject: '[Dracin API] API Key kamu sudah siap!',
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
            <div style="background: #4f6ef7; padding: 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: white; margin: 0;">Dracin API Gateway</h2>
            </div>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
              <p>Halo <strong>${client.name}</strong>,</p>
              <p>Selamat datang! API key kamu sudah aktif.</p>
              <div style="background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">API KEY (simpan dengan aman):</p>
                <code style="font-size: 13px; color: #1e1b4b; word-break: break-all;">${apiKey}</code>
              </div>
              <p>Gunakan header berikut di setiap request:</p>
              <pre style="background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 13px;">x-api-key: ${apiKey}</pre>
              <p>Rate limit: <strong>${client.rate_limit?.toLocaleString()} request / 15 menit</strong></p>
              <p>Expires: <strong>${client.expires_at ? new Date(client.expires_at).toLocaleDateString('id-ID', { dateStyle: 'long' }) : 'Tidak ada batas'}</strong></p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                Email ini dikirim otomatis dari Dracin API Gateway.
              </p>
            </div>
          </div>
        `
      });
      logger.info(`Welcome email sent to ${client.email}`);
      return true;
    } catch (err) {
      logger.error('Failed to send welcome email:', err.message);
      return false;
    }
  }
}

const emailService = new EmailService();
export default emailService;
