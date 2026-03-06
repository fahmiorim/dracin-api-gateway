import { Router } from 'express';
import supabaseService from '../database/supabase.js';

const router = Router();

/**
 * @route   GET /search
 * @desc    Cross-platform search from cached metadata
 * @access  Public (requires tenant API key)
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, platform, limit = '20', offset = '0' } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required (min 2 characters)',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    const { data, count } = await supabaseService.searchContents({
      query: q.trim(),
      platform: platform || null,
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0
    });

    res.json({
      success: true,
      message: `Found ${count} result(s) for "${q}"`,
      data,
      count,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    next(error);
  }
});

export default router;
