import { Router } from 'express';
import { 
  searchReelShort,
  getReelShortEpisodes,
  getReelShortVideo,
  getDramaDub,
  getNewRelease,
  getRecommended
} from '../controllers/reelshort.controller.js';

const router = Router();

/**
 * @route   GET /api/reelshort/search
 * @desc    Search ReelShort dramas
 * @access  Public
 * @param   {string} keywords - Search keywords
 */
router.get('/search', searchReelShort);

/**
 * @route   GET /api/reelshort/episodes/:bookId
 * @desc    Get episodes for a drama
 * @access  Public
 * @param   {string} bookId - Drama book ID
 * @param   {string} filtered_title - Filtered title from search
 */
router.get('/episodes/:bookId', getReelShortEpisodes);

/**
 * @route   GET /api/reelshort/video/:bookId/:episodeNum
 * @desc    Get video URL for episode
 * @access  Public
 * @param   {string} bookId - Drama book ID
 * @param   {number} episodeNum - Episode number
 * @param   {string} filtered_title - Filtered title from search
 * @param   {string} chapter_id - Chapter ID from episodes
 */
router.get('/video/:bookId/:episodeNum', getReelShortVideo);

/**
 * @route   GET /api/reelshort/dramadub
 * @desc    Get Drama dengan dub bookshelf
 * @access  Public
 */
router.get('/dramadub', getDramaDub);

/**
 * @route   GET /api/reelshort/newrelease
 * @desc    Get Rilis Baru bookshelf
 * @access  Public
 */
router.get('/newrelease', getNewRelease);

/**
 * @route   GET /api/reelshort/recommend
 * @desc    Get Lebih Direkomendasikan bookshelf
 * @access  Public
 */
router.get('/recommend', getRecommended);

export default router;
