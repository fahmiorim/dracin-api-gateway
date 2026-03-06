import logger from '../utils/logger.js';
import supabaseService from '../database/supabase.js';
import { latest as dramaboxLatest, trendings as dramaboxTrending, populersearch as dramaboxPopuler, foryou as dramaboxForyou, dubindo as dramaboxDubindo } from '../lib/dramabox.js';
import reelshortAPI from '../lib/reelshort.js';
import { getAllDramas as dramabiteGetAll } from '../lib/dramabite.js';
import meloloAPI from '../lib/melolo.js';

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
let syncTimer = null;
let isSyncing = false;

// ─── Normalizers ────────────────────────────────────────────────────────────

const normalizeDramabox = (item) => ({
  platform: 'dramabox',
  external_id: String(item.bookId),
  title: item.bookName || item.title || null,
  description: item.introduction || item.desc || null,
  cover_url: item.coverWap || item.cover || null,
  episode_count: item.chapterCount || item.episodeCount || 0,
  genres: Array.isArray(item.tags) ? item.tags : [],
  metadata: {
    protagonist: item.protagonist || null,
    rank: item.rankVo?.hotCode || null,
    shelf_time: item.shelfTime || null,
    card_type: item.cardType || null
  }
});

const normalizeReelShort = (item, shelfName) => ({
  platform: 'reelshort',
  external_id: String(item.book_id),
  title: item.book_title || null,
  description: item.description || null,
  cover_url: item.book_pic || null,
  episode_count: item.chapter_count || 0,
  genres: [],
  metadata: {
    filtered_title: item.filtered_title || null,
    bookshelf_name: shelfName || null
  }
});

const normalizeMelolo = (item) => ({
  platform: 'melolo',
  external_id: String(item.series_id),
  title: item.title || null,
  description: item.description || null,
  cover_url: item.thumb_url || null,
  episode_count: item.last_chapter_index || 0,
  genres: [],
  metadata: {
    last_chapter_index: item.last_chapter_index || 0
  }
});

const normalizeDramabite = (item) => ({
  platform: 'dramabite',
  external_id: String(item.cid),
  title: item.title || null,
  description: item.desc || null,
  cover_url: item.cover_url || item.video_poster_url || null,
  episode_count: item.total_episode || item.max_episode_can_watch || 0,
  genres: Array.isArray(item.label_list) ? item.label_list : [],
  metadata: {
    vid: item.vid || null,
    root_id: item.root_id || null,
    pay_episode: item.pay_episode || 0
  }
});

// ─── Platform Sync Functions ─────────────────────────────────────────────────

async function syncDramabox() {
  const logId = await supabaseService.startSyncLog('dramabox');
  let count = 0;
  try {
    logger.info('[Sync] Starting Dramabox sync...');
    const items = [];

    // Trending & popular — single page (no pagination support)
    for (const fetchFn of [dramaboxTrending, dramaboxPopuler]) {
      try {
        const list = await fetchFn();
        if (Array.isArray(list)) items.push(...list);
      } catch (e) {
        logger.warn('[Sync] Dramabox rank fetch failed:', e.message);
      }
    }

    // Latest — paginated (supports pageNo param)
    for (let page = 1; page <= 5; page++) {
      try {
        const list = await dramaboxLatest(page, 20);
        if (!Array.isArray(list) || list.length === 0) break;
        items.push(...list);
      } catch (e) {
        logger.warn(`[Sync] Dramabox latest page ${page} failed:`, e.message);
        break;
      }
    }

    // For-you recommendations (call 3x — uses random page internally)
    for (let i = 0; i < 3; i++) {
      try {
        const list = await dramaboxForyou();
        if (Array.isArray(list)) items.push(...list);
      } catch (e) {
        logger.warn('[Sync] Dramabox foryou failed:', e.message);
      }
    }

    // Classify (dubindo) — classify 1=terpopuler, 2=terbaru, pageSize=15
    for (const classify of [1, 2]) {
      for (let page = 1; page <= 10; page++) {
        try {
          const list = await dramaboxDubindo(classify, page);
          if (!Array.isArray(list) || list.length === 0) break;
          items.push(...list);
        } catch (e) {
          logger.warn(`[Sync] Dramabox dubindo c=${classify} p=${page} failed:`, e.message);
          break;
        }
      }
    }

    const normalized = items.map(normalizeDramabox);
    const unique = deduplicateByExternalId(normalized);
    count = await supabaseService.upsertContents(unique);
    await supabaseService.finishSyncLog(logId, 'success', count);
    logger.info(`[Sync] Dramabox done: ${count} items upserted`);
  } catch (error) {
    logger.error('[Sync] Dramabox failed:', error.message);
    await supabaseService.finishSyncLog(logId, 'failed', 0, error.message);
  }
  return count;
}

async function syncReelShort() {
  const logId = await supabaseService.startSyncLog('reelshort');
  let count = 0;
  try {
    logger.info('[Sync] Starting ReelShort sync...');
    const bookshelves = await reelshortAPI.getRawBookshelves();
    if (!bookshelves || !Array.isArray(bookshelves)) {
      throw new Error('Failed to get bookshelves');
    }

    const items = [];
    for (const shelf of bookshelves) {
      if (shelf.books && Array.isArray(shelf.books)) {
        for (const book of shelf.books) {
          if (book.book_title && !book.filtered_title) {
            book.filtered_title = book.book_title.toLowerCase()
              .replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '-');
          }
          items.push(normalizeReelShort(book, shelf.bookshelf_name));
        }
      }
    }

    const unique = deduplicateByExternalId(items);
    count = await supabaseService.upsertContents(unique);
    await supabaseService.finishSyncLog(logId, 'success', count);
    logger.info(`[Sync] ReelShort done: ${count} items upserted`);
  } catch (error) {
    logger.error('[Sync] ReelShort failed:', error.message);
    await supabaseService.finishSyncLog(logId, 'failed', 0, error.message);
  }
  return count;
}

async function syncMelolo() {
  const logId = await supabaseService.startSyncLog('melolo');
  let count = 0;
  try {
    logger.info('[Sync] Starting Melolo sync...');
    const items = [];

    // searchNovels(query, offset, limit) returns { result: [...], error }
    // result items: { series_id, title, last_chapter_index, thumb_url }
    const keywords = [
      'cinta', 'takdir', 'dendam', 'rahasia', 'wanita',
      'kaya', 'raja', 'istri', 'suami', 'balas',
      'menantu', 'pewaris', 'pengkhianatan', 'dokter', 'CEO',
      'miliarder', 'tuan', 'misteri', 'benci', 'jodoh'
    ];
    for (const kw of keywords) {
      for (const offset of [0, 20, 40]) {
        try {
          const { result, error } = await meloloAPI.searchNovels(kw, offset, 20);
          if (error || !Array.isArray(result) || result.length === 0) break;
          items.push(...result.map(normalizeMelolo));
        } catch (e) {
          logger.warn(`[Sync] Melolo search '${kw}' offset=${offset} failed:`, e.message);
          break;
        }
      }
    }

    const unique = deduplicateByExternalId(items);
    count = await supabaseService.upsertContents(unique);
    await supabaseService.finishSyncLog(logId, 'success', count);
    logger.info(`[Sync] Melolo done: ${count} items upserted`);
  } catch (error) {
    logger.error('[Sync] Melolo failed:', error.message);
    await supabaseService.finishSyncLog(logId, 'failed', 0, error.message);
  }
  return count;
}

async function syncDramabite() {
  const logId = await supabaseService.startSyncLog('dramabite');
  let count = 0;
  try {
    logger.info('[Sync] Starting Dramabite sync...');
    const dramas = await dramabiteGetAll(10);
    const normalized = dramas.map(normalizeDramabite);
    const unique = deduplicateByExternalId(normalized);
    count = await supabaseService.upsertContents(unique);
    await supabaseService.finishSyncLog(logId, 'success', count);
    logger.info(`[Sync] Dramabite done: ${count} items upserted`);
  } catch (error) {
    logger.error('[Sync] Dramabite failed:', error.message);
    await supabaseService.finishSyncLog(logId, 'failed', 0, error.message);
  }
  return count;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deduplicateByExternalId(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.platform}:${item.external_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Main Sync Entry ─────────────────────────────────────────────────────────

export async function runSync(platforms = ['dramabox', 'reelshort', 'melolo', 'dramabite']) {
  if (isSyncing) {
    logger.warn('[Sync] Sync already in progress, skipping');
    return { skipped: true };
  }

  isSyncing = true;
  const results = {};
  const start = Date.now();

  logger.info(`[Sync] Starting sync for platforms: ${platforms.join(', ')}`);

  try {
    if (platforms.includes('dramabox'))  results.dramabox  = await syncDramabox();
    if (platforms.includes('reelshort')) results.reelshort = await syncReelShort();
    if (platforms.includes('melolo'))    results.melolo    = await syncMelolo();
    if (platforms.includes('dramabite')) results.dramabite = await syncDramabite();
  } finally {
    isSyncing = false;
  }

  const total = Object.values(results).reduce((a, b) => a + b, 0);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  logger.info(`[Sync] All done: ${total} total items in ${elapsed}s`, results);

  return { results, total, elapsed: `${elapsed}s` };
}

export function startCronSync() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    logger.info('[Sync] Cron triggered sync');
    runSync().catch(err => logger.error('[Sync] Cron sync error:', err.message));
  }, SYNC_INTERVAL_MS);
  logger.info(`[Sync] Cron scheduled every ${SYNC_INTERVAL_MS / 3600000}h`);
}

export function stopCronSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

export function getSyncStatus() {
  return { isSyncing, nextSyncIn: syncTimer ? `${SYNC_INTERVAL_MS / 3600000}h interval` : 'not scheduled' };
}
