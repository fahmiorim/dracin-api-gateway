import { Router } from 'express';
import {
  getHomepage,
  getEndModule,
  getAllDramas,
  searchDramas,
  getEpisodeList,
  getEpisodeDetail,
  getPlayEndRecommend,
  getDramaWithEpisodes
} from '../controllers/dramabite.controller.js';
import { validateQuery, schemas } from '../middleware/validation.js';

const router = Router();

// Homepage dramas
router.get('/homepage', getHomepage);

// Additional modules (infinite scroll)
router.get('/end-module', getEndModule);

// Get all available dramas
router.get('/all', validateQuery(schemas.dramabiteAll), getAllDramas);

// Search dramas
router.get('/search', validateQuery(schemas.search), searchDramas);

// Get episode list for a drama
router.get('/episodes', getEpisodeList);

// Get episode details with video links
router.get('/episode-detail', getEpisodeDetail);

// Get recommendations after video ends
router.get('/recommendations', getPlayEndRecommend);

// Get complete drama information with episodes
router.get('/drama-complete', getDramaWithEpisodes);

export default router;
