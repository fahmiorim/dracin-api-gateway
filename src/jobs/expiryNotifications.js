import cron from 'node-cron';
import supabaseService from '../database/supabase.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

async function checkAndNotify() {
  if (!supabaseService.isReady() || !emailService.isReady()) return;

  try {
    const clients = await supabaseService.listClients({ is_active: true });
    const now = new Date();

    for (const client of clients) {
      if (!client.expires_at || !client.email) continue;
      const expiresAt = new Date(client.expires_at);
      const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));

      if (daysLeft === 7 || daysLeft === 1) {
        await emailService.sendExpiryWarning(client, daysLeft);
      }
    }
  } catch (err) {
    logger.error('Expiry notification job failed:', err.message);
  }
}

export function startExpiryNotificationJob() {
  // Run every day at 08:00
  cron.schedule('0 8 * * *', () => {
    logger.info('Running expiry notification job');
    checkAndNotify();
  });
  logger.info('Expiry notification job scheduled (daily 08:00)');
}
