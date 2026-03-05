import { Router } from 'express';
import {
  searchMelolo,
  getMeloloVideoDetails,
  getMeloloVideoUrl,
  getMeloloRecommendations
} from '../controllers/melolo.controller.js';
import { validateQuery, schemas } from '../middleware/validation.js';

const router = Router();

/**
 * @route   GET /melolo/search
 * @desc    Search Melolo novels
 * @access  Public
 */
router.get('/search', validateQuery(schemas.search), searchMelolo);

/**
 * @route   GET /melolo/video-details
 * @desc    Get video details for a series
 * @access  Public
 */
router.get('/video-details', getMeloloVideoDetails);

/**
 * @route   GET /melolo/video-model
 * @desc    Get video URL by video ID
 * @access  Public
 */
router.get('/video-model', getMeloloVideoUrl);

/**
 * @route   GET /melolo/recommend
 * @desc    Get recommended novels
 * @access  Public
 */
router.get('/recommend', getMeloloRecommendations);

export default router;
