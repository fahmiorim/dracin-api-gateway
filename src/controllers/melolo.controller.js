import meloloAPI from '../lib/melolo.js';
import logger from '../utils/logger.js';

/**
 * Search Melolo novels
 */
export const searchMelolo = async (req, res, next) => {
  try {
    const { query, offset = '0', limit = '10' } = req.query;

    logger.info('Searching Melolo novels', {
      requestId: req.id,
      query,
      offset,
      limit
    });

    const { result, error } = await meloloAPI.searchNovels(query, offset, limit);

    if (error) {
      if (error.includes('HTTP 404')) {
        return res.status(404).json({
          success: false,
          message: 'No novels found',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to search novels',
        error: error,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    logger.info('Melolo search completed successfully', {
      requestId: req.id,
      query,
      count: result.length
    });

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error searching Melolo novels', {
      error: error.message,
      requestId: req.id,
      query: req.query.query
    });
    next(error);
  }
};

/**
 * Get Melolo video details
 */
export const getMeloloVideoDetails = async (req, res, next) => {
  try {
    const { series_id } = req.query;
    
    if (!series_id) {
      return res.status(400).json({
        success: false,
        message: 'Series ID parameter is required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    logger.info('Getting Melolo video details', {
      requestId: req.id,
      series_id
    });

    const { result, error } = await meloloAPI.getVideoDetails(series_id);

    if (error) {
      if (error.includes('HTTP 404')) {
        return res.status(404).json({
          success: false,
          message: 'Video details not found',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to get video details',
        error: error,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    logger.info('Melolo video details retrieved successfully', {
      requestId: req.id,
      series_id,
      count: result.length
    });

    res.json({
      success: true,
      message: 'Video details retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Melolo video details', {
      error: error.message,
      requestId: req.id,
      series_id: req.query.series_id
    });
    next(error);
  }
};

/**
 * Get Melolo video URL
 */
export const getMeloloVideoUrl = async (req, res, next) => {
  try {
    const { video_id } = req.query;
    
    if (!video_id) {
      return res.status(400).json({
        success: false,
        message: 'Video ID parameter is required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    logger.info('Getting Melolo video URL', {
      requestId: req.id,
      video_id
    });

    const { result, error } = await meloloAPI.getVideoModel(video_id);

    if (error) {
      if (error.includes('HTTP 404')) {
        return res.status(404).json({
          success: false,
          message: 'Video URL not found',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to get video URL',
        error: error,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    logger.info('Melolo video URL retrieved successfully', {
      requestId: req.id,
      video_id,
      hasMainUrl: !!result.main_url,
      hasBackupUrl: !!result.backup_url
    });

    res.json({
      success: true,
      message: 'Video URL retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Melolo video URL', {
      error: error.message,
      requestId: req.id,
      video_id: req.query.video_id
    });
    next(error);
  }
};

/**
 * Get Melolo recommendations
 */
export const getMeloloRecommendations = async (req, res, next) => {
  try {
    logger.info('Getting Melolo recommendations', {
      requestId: req.id
    });

    const { result, error } = await meloloAPI.getRecommendations();

    if (error) {
      if (error.includes('HTTP 404')) {
        return res.status(404).json({
          success: false,
          message: 'No recommendations found',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to get recommendations',
        error: error,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    logger.info('Melolo recommendations retrieved successfully', {
      requestId: req.id,
      count: result.length
    });

    res.json({
      success: true,
      message: 'Recommendations retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Melolo recommendations', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};
