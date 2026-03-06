import { Router } from 'express';
import { listContents, getContentById, getContentEpisodes, getContentStream, getContentFeatured } from '../controllers/contents.controller.js';

const router = Router();

/**
 * GET /contents
 * Query: q, platform, genre, limit, offset
 */
router.get('/', listContents);

/**
 * GET /contents/featured
 * Must be BEFORE /:id to avoid "featured" being matched as an ID
 */
router.get('/featured', getContentFeatured);

/**
 * GET /contents/:id
 */
router.get('/:id', getContentById);

/**
 * GET /contents/:id/episodes
 * Real-time episode data from upstream platform
 */
router.get('/:id/episodes', getContentEpisodes);

/**
 * GET /contents/:id/stream
 * Real-time streaming URL for a specific episode
 * Query: episode (required for dramabox/reelshort/dramabite), video_id (required for melolo), chapter_id (optional for reelshort)
 */
router.get('/:id/stream', getContentStream);

export default router;
