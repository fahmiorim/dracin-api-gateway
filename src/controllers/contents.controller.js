import logger from '../utils/logger.js';
import supabaseService from '../database/supabase.js';
import { detail as dramaboxDetail } from '../lib/dramabox.js';
import reelshortAPI from '../lib/reelshort.js';
import meloloAPI from '../lib/melolo.js';
import { episodeList as dramabiteEpisodes } from '../lib/dramabite.js';

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message, timestamp: new Date().toISOString() });

// ─── GET /contents ────────────────────────────────────────────────────────────

export const listContents = async (req, res, next) => {
  try {
    const { q, platform, genre, limit = '20', offset = '0' } = req.query;

    const parsedLimit  = Math.min(parseInt(limit)  || 20, 100);
    const parsedOffset = parseInt(offset) || 0;

    let { data, count } = await supabaseService.searchContents({
      query: q,
      platform,
      limit: parsedLimit,
      offset: parsedOffset
    });

    if (genre && data.length > 0) {
      const g = genre.toLowerCase();
      data = data.filter(item =>
        Array.isArray(item.genres) && item.genres.some(tag => tag.toLowerCase().includes(g))
      );
    }

    logger.info('Contents listed', { requestId: req.id, count, q, platform });

    res.json({
      success: true,
      message: `${count} konten ditemukan`,
      data,
      count,
      limit: parsedLimit,
      offset: parsedOffset,
      hasMore: parsedOffset + parsedLimit < count,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /contents/:id ────────────────────────────────────────────────────────

export const getContentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await supabaseService.getContentById(id);

    if (!item) return fail(res, 404, 'Konten tidak ditemukan');

    logger.info('Content fetched', { requestId: req.id, id, platform: item.platform });

    res.json({
      success: true,
      message: 'OK',
      data: item,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /contents/:id/episodes ──────────────────────────────────────────────

export const getContentEpisodes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await supabaseService.getContentById(id);

    if (!item) return fail(res, 404, 'Konten tidak ditemukan');

    let episodes = [];

    switch (item.platform) {
      case 'dramabox': {
        const detail = await dramaboxDetail(item.external_id);
        const raw = detail?.data;
        episodes = raw?.chapters || raw?.chapterList || raw?.chapterVoList || [];
        break;
      }

      case 'reelshort': {
        const filteredTitle = item.metadata?.filtered_title;
        if (!filteredTitle) return fail(res, 400, 'filtered_title tidak tersedia, coba sync ulang konten ini');
        episodes = await reelshortAPI.getEpisodes(item.external_id, filteredTitle);
        break;
      }

      case 'melolo': {
        const result = await meloloAPI.getVideoDetails(item.external_id);
        episodes = result || [];
        break;
      }

      case 'dramabite': {
        episodes = await dramabiteEpisodes(item.external_id);
        break;
      }

      default:
        return fail(res, 400, `Platform '${item.platform}' tidak dikenali`);
    }

    logger.info('Episodes fetched', {
      requestId: req.id,
      id,
      platform: item.platform,
      count: Array.isArray(episodes) ? episodes.length : 0
    });

    res.json({
      success: true,
      message: `${Array.isArray(episodes) ? episodes.length : 0} episode ditemukan`,
      data: episodes,
      content: {
        id: item.id,
        title: item.title,
        platform: item.platform,
        external_id: item.external_id,
        cover_url: item.cover_url
      },
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
};
