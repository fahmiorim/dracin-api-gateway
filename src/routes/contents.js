import { Router } from 'express';
import { listContents, getContentById, getContentEpisodes } from '../controllers/contents.controller.js';

const router = Router();

/**
 * GET /contents
 * Query: q, platform, genre, limit, offset
 */
router.get('/', listContents);

/**
 * GET /contents/:id
 */
router.get('/:id', getContentById);

/**
 * GET /contents/:id/episodes
 * Real-time episode data from upstream platform
 */
router.get('/:id/episodes', getContentEpisodes);

export default router;
