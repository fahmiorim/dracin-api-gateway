import logger from '../utils/logger.js';
import { latest, trendings, foryou, vip, randomdrama, populersearch, linkStream, search, detail, dubindo } from '../lib/dramabox.js';

/**
 * Get latest dramas
 */
export const getLatest = async (req, res, next) => {
  try {
    logger.info('Getting latest dramas', { 
      requestId: req.id,
      query: req.query 
    });

    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = await latest(pageNo, pageSize);

    logger.info('Latest dramas retrieved successfully', {
      requestId: req.id,
      count: result.length
    });

    res.json({
      success: true,
      message: 'Latest dramas retrieved successfully',
      data: result,
      pagination: {
        page: parseInt(req.query.pageNo) || 1,
        limit: parseInt(req.query.pageSize) || 20,
        total: result.length
      },
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting latest dramas', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};

/**
 * Get trending dramas
 */
export const getTrending = async (req, res, next) => {
  try {
    logger.info('Getting trending dramas', { requestId: req.id });

    const result = await trendings();

    logger.info('Trending dramas retrieved successfully', {
      requestId: req.id,
      count: result.length
    });

    res.json({
      success: true,
      message: 'Trending dramas retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting trending dramas', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};

/**
 * Get for you dramas (recommended)
 */
export const getForYou = async (req, res, next) => {
  try {
    logger.info('Getting for-you dramas', { requestId: req.id });

    const result = await foryou();

    logger.info('For-you dramas retrieved successfully', {
      requestId: req.id,
      count: result.length
    });

    res.json({
      success: true,
      message: 'For-you dramas retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting for-you dramas', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};

/**
 * Get VIP dramas
 */
export const getVip = async (req, res, next) => {
  try {
    logger.info('Getting VIP dramas', { requestId: req.id });

    const result = await vip();

    logger.info('VIP dramas retrieved successfully', {
      requestId: req.id,
      count: Array.isArray(result) ? result.length : 1
    });

    res.json({
      success: true,
      message: 'VIP dramas retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting VIP dramas', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};

/**
 * Search dramas
 */
export const searchDramas = async (req, res, next) => {
  try {
    const { query } = req.query;
    
    logger.info('Searching dramas', {
      requestId: req.id,
      query
    });

    const result = await search(query);

    logger.info('Dramas search completed', {
      requestId: req.id,
      query,
      count: result.length
    });

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: result,
      query,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error searching dramas', {
      error: error.message,
      requestId: req.id,
      query: req.query
    });
    next(error);
  }
};

/**
 * Get drama details
 */
export const getDramaDetail = async (req, res, next) => {
  try {
    const { bookId } = req.query;
    
    logger.info('Getting drama details', {
      requestId: req.id,
      bookId
    });

    const result = await detail(bookId);

    logger.info('Drama details retrieved successfully', {
      requestId: req.id,
      bookId
    });

    res.json({
      success: true,
      message: 'Drama details retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting drama details', {
      error: error.message,
      requestId: req.id,
      bookId: req.query.bookId
    });
    next(error);
  }
};

/**
 * Get dubbed dramas
 */
export const getDubbedDramas = async (req, res, next) => {
  try {
    const { classify, page } = req.query;
    
    logger.info('Getting dubbed dramas', {
      requestId: req.id,
      classify,
      page
    });

    const result = await dubindo(classify, page);

    logger.info('Dubbed dramas retrieved successfully', {
      requestId: req.id,
      classify,
      page,
      count: result.length
    });

    res.json({
      success: true,
      message: 'Dubbed dramas retrieved successfully',
      data: result,
      classify,
      page: parseInt(page),
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting dubbed dramas', {
      error: error.message,
      requestId: req.id,
      classify: req.query.classify,
      page: req.query.page
    });
    next(error);
  }
};

/**
 * Get random drama
 */
export const getRandom = async (req, res, next) => {
  try {
    logger.info('Getting random drama', { requestId: req.id });

    const result = await randomdrama();

    logger.info('Random drama retrieved successfully', {
      requestId: req.id,
      count: result.length
    });

    res.json({
      success: true,
      message: 'Random drama retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting random drama', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};

/**
 * Get popular searches
 */
export const getPopularSearches = async (req, res, next) => {
  try {
    logger.info('Getting popular searches', { requestId: req.id });

    const result = await populersearch();

    logger.info('Popular searches retrieved successfully', {
      requestId: req.id,
      count: result.length
    });

    res.json({
      success: true,
      message: 'Popular searches retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting popular searches', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};

/**
 * Get drama episodes
 */
export const getEpisodes = async (req, res, next) => {
  try {
    const { bookId } = req.query;
    
    logger.info('Getting drama episodes', {
      requestId: req.id,
      bookId
    });

    const result = await linkStream(bookId);

    logger.info('Episodes retrieved successfully', {
      requestId: req.id,
      bookId,
      episodeCount: result.length
    });

    res.json({
      success: true,
      message: 'Episodes retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting episodes', {
      error: error.message,
      requestId: req.id,
      bookId: req.query.bookId
    });
    next(error);
  }
};
