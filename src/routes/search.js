import { Router } from 'express';
import supabaseService from '../database/supabase.js';

const router = Router();

/**
 * @route   GET /search
 * @desc    Cross-platform search from cached metadata
 * @access  Public (requires tenant API key)
 */
const sanitize = (item) => {
  if (!item) return item;
  const { platform, external_id, metadata, last_synced_at, ...clean } = item;
  return clean;
};

router.get('/', async (req, res, next) => {
  try {
    const { q, limit = '20', offset = '0' } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Parameter "q" wajib diisi (minimal 2 karakter)',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    const parsedLimit  = Math.min(parseInt(limit)  || 20, 100);
    const parsedOffset = parseInt(offset) || 0;

    const { data, count } = await supabaseService.searchContents({
      query: q.trim(),
      platform: null,
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json({
      success: true,
      message: `${count} konten ditemukan untuk "${q.trim()}"`,
      data: data.map(sanitize),
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
});

export default router;
