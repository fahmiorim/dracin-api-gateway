import { Router } from 'express';
import { 
  getLatest, 
  getTrending, 
  getForYou,
  getVip,
  getRandom,
  getPopularSearches,
  searchDramas, 
  getDramaDetail, 
  getDubbedDramas,
  getEpisodes
} from '../controllers/drama.controller.js';
import { validateQuery, schemas } from '../middleware/validation.js';

const router = Router();

/**
 * @route   GET /api/latest
 * @desc    Get latest dramas
 * @access  Public
 */
router.get('/latest', validateQuery(schemas.pagination), getLatest);

/**
 * @route   GET /api/trending
 * @desc    Get trending dramas
 * @access  Public
 */
router.get('/trending', getTrending);

/**
 * @route   GET /api/for-you
 * @desc    Get recommended dramas
 * @access  Public
 */
router.get('/for-you', getForYou);

/**
 * @route   GET /api/vip
 * @desc    Get VIP dramas
 * @access  Public
 */
router.get('/vip', getVip);

/**
 * @route   GET /api/search
 * @desc    Search dramas
 * @access  Public
 */
router.get('/search', validateQuery(schemas.search), searchDramas);

/**
 * @route   GET /api/detail
 * @desc    Get drama details
 * @access  Public
 */
router.get('/detail', validateQuery(schemas.bookId), getDramaDetail);

/**
 * @route   GET /api/dubbed
 * @desc    Get dubbed dramas
 * @access  Public
 */
router.get('/dubbed', validateQuery(schemas.dubbed), getDubbedDramas);

/**
 * @route   GET /api/random
 * @desc    Get random drama
 * @access  Public
 */
router.get('/random', getRandom);

/**
 * @route   GET /api/popular-searches
 * @desc    Get popular searches
 * @access  Public
 */
router.get('/popular-searches', getPopularSearches);

/**
 * @route   GET /api/episodes
 * @desc    Get drama episodes
 * @access  Public
 */
router.get('/episodes', validateQuery(schemas.bookId), getEpisodes);

export default router;
