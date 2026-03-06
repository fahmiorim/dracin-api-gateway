import logger from '../utils/logger.js';
import supabaseService from '../database/supabase.js';
import { detail as dramaboxDetail, linkStream } from '../lib/dramabox.js';
import reelshortAPI from '../lib/reelshort.js';
import meloloAPI from '../lib/melolo.js';
import { episodeList as dramabiteEpisodes, episodeDetail } from '../lib/dramabite.js';

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

// ─── GET /contents/:id/stream ──────────────────────────────────────────────

export const getContentStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { episode } = req.query;

    const item = await supabaseService.getContentById(id);
    if (!item) return fail(res, 404, 'Konten tidak ditemukan');

    logger.info('Stream requested', { requestId: req.id, id, platform: item.platform, episode });

    switch (item.platform) {
      case 'dramabox': {
        if (!episode) return fail(res, 400, 'Parameter episode (nomor episode) diperlukan');
        const episodeNum = parseInt(episode);
        const chapters = await linkStream(item.external_id);
        if (!Array.isArray(chapters) || chapters.length === 0)
          return fail(res, 503, 'Gagal mengambil stream dari Dramabox');
        const chapter = chapters.find(c => c.chapterIndex === episodeNum);
        if (!chapter || !chapter.playUrl)
          return fail(res, 404, `Episode ${episodeNum} tidak ditemukan atau tidak bisa diputar`);
        return res.json({
          success: true,
          message: 'Stream URL berhasil diambil',
          data: {
            stream_url: chapter.playUrl,
            episode: episodeNum
          },
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }

      case 'reelshort': {
        if (!episode) return fail(res, 400, 'Parameter episode (nomor episode) diperlukan');
        const episodeNum = parseInt(episode);
        const filteredTitle = item.metadata?.filtered_title;
        if (!filteredTitle)
          return fail(res, 400, 'Konten ini perlu di-sync ulang sebelum bisa diputar');
        const eps = await reelshortAPI.getEpisodes(item.external_id, filteredTitle);
        const ep = eps.find(e => e.episode === episodeNum);
        if (!ep) return fail(res, 404, `Episode ${episodeNum} tidak ditemukan`);
        const videoData = await reelshortAPI.getVideoUrl(episodeNum, filteredTitle, item.external_id, ep.chapter_id);
        if (!videoData) return fail(res, 503, 'Gagal mengambil stream, coba lagi');
        return res.json({
          success: true,
          message: 'Stream URL berhasil diambil',
          data: {
            stream_url: videoData.video_url,
            episode: episodeNum,
            duration: videoData.duration
          },
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }

      case 'melolo': {
        if (!episode) return fail(res, 400, 'Parameter episode (nomor episode) diperlukan');
        const episodeNum = parseInt(episode);
        const { result: rawDetails } = await meloloAPI.getVideoDetails(item.external_id);
        if (!rawDetails) return fail(res, 503, 'Gagal mengambil daftar episode, coba lagi');
        const videos = meloloAPI._extractVideosFromDetails(rawDetails);
        const videoEntry = videos[episodeNum - 1] ||
          videos.find(v => String(v.chapter) === String(episodeNum));
        if (!videoEntry?.video_id)
          return fail(res, 404, `Episode ${episodeNum} tidak ditemukan`);
        const { result, error } = await meloloAPI.getVideoModel(videoEntry.video_id);
        if (error || !result) return fail(res, 503, 'Gagal mengambil stream, coba lagi');
        return res.json({
          success: true,
          message: 'Stream URL berhasil diambil',
          data: {
            stream_url: result.main_url,
            backup_url: result.backup_url,
            episode: episodeNum,
            duration: videoEntry.duration
          },
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }

      case 'dramabite': {
        if (!episode) return fail(res, 400, 'Parameter episode (nomor episode) diperlukan');
        const vid = parseInt(episode);
        const cid = parseInt(item.external_id);
        const detail = await episodeDetail(cid, vid);
        const linkInfo = detail?.data?.link_info || detail?.link_info;
        if (!linkInfo?.video_link)
          return fail(res, 503, 'Gagal mengambil stream dari Dramabite');
        return res.json({
          success: true,
          message: 'Stream URL berhasil diambil',
          data: {
            stream_url: linkInfo.video_link,
            stream_url_m3u8: linkInfo.video_link_m3u8,
            episode: vid,
            expires_at: linkInfo.validity_period
              ? new Date(Date.now() + linkInfo.validity_period * 1000).toISOString()
              : null
          },
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }

      default:
        return fail(res, 400, `Platform '${item.platform}' tidak dikenali`);
    }
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

// ─── GET /contents/featured ─────────────────────────────────────────────────

export const getContentFeatured = async (req, res, next) => {
  try {
    const { platform, limit = '20' } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 20, 100);

    const { data, count } = await supabaseService.searchContents({
      query: null,
      platform: platform || null,
      limit: parsedLimit,
      offset: 0
    });

    logger.info('Featured contents listed', { requestId: req.id, count: data.length, platform });

    res.json({
      success: true,
      message: `${data.length} konten unggulan`,
      data,
      count: data.length,
      limit: parsedLimit,
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
