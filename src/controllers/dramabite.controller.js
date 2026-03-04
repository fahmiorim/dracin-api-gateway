import logger from '../utils/logger.js';
import { 
  homepage as getHomepageData, 
  endModule as getEndModuleData, 
  episodeList as getEpisodeListData, 
  episodeDetail as getEpisodeDetailData, 
  playEndRecommend as getPlayEndRecommendData, 
  getAllDramas as getAllAvailableDramas, 
  searchDramas as searchDramasData, 
  getDramaWithEpisodes as getDramaWithEpisodesData 
} from '../../lib/dramabite.js';

/**
 * Get homepage dramas
 */
export const getHomepage = async (req, res, next) => {
  try {
    const { page = 0 } = req.query;
    
    logger.info('Getting Dramabite homepage', { 
      requestId: req.id,
      page: parseInt(page)
    });

    const result = await getHomepageData(parseInt(page));

    logger.info('Dramabite homepage retrieved successfully', {
      requestId: req.id,
      count: result.data?.drama_module?.length || 0
    });

    res.json({
      success: true,
      message: 'Homepage dramas retrieved successfully',
      data: result.data || result,
      pagination: {
        page: parseInt(page),
        limit: 20,
        total: result.data?.drama_module?.length || 0
      },
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Dramabite homepage', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};

/**
 * Get additional modules (infinite scroll)
 */
export const getEndModule = async (req, res, next) => {
  try {
    const { page = 0 } = req.query;
    
    logger.info('Getting Dramabite end module', { 
      requestId: req.id,
      page: parseInt(page)
    });

    const result = await getEndModuleData(parseInt(page));

    logger.info('Dramabite end module retrieved successfully', {
      requestId: req.id,
      count: result.data?.drama_module?.length || 0
    });

    res.json({
      success: true,
      message: 'End module retrieved successfully',
      data: result.data || result,
      pagination: {
        page: parseInt(page),
        limit: 20,
        total: result.data?.drama_module?.length || 0
      },
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Dramabite end module', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};

/**
 * Get all available dramas
 */
export const getAllDramas = async (req, res, next) => {
  try {
    const { maxPages = 3 } = req.query;
    
    logger.info('Getting all Dramabite dramas', { 
      requestId: req.id,
      maxPages: parseInt(maxPages)
    });

    const result = await getAllAvailableDramas(parseInt(maxPages));

    logger.info('All Dramabite dramas retrieved successfully', {
      requestId: req.id,
      count: result.length
    });

    res.json({
      success: true,
      message: 'All dramas retrieved successfully',
      data: result,
      count: result.length,
      maxPages: parseInt(maxPages),
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting all Dramabite dramas', {
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
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    logger.info('Searching Dramabite dramas', {
      requestId: req.id,
      query
    });

    const result = await searchDramasData(query);

    logger.info('Dramabite dramas search completed', {
      requestId: req.id,
      query,
      count: result.length
    });

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: result,
      query,
      count: result.length,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error searching Dramabite dramas', {
      error: error.message,
      requestId: req.id,
      query: req.query
    });
    next(error);
  }
};

/**
 * Get episode list for a drama
 */
export const getEpisodeList = async (req, res, next) => {
  try {
    const { cid } = req.query;
    
    if (!cid) {
      return res.status(400).json({
        success: false,
        message: 'CID (drama ID) is required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    logger.info('Getting Dramabite episode list', {
      requestId: req.id,
      cid: parseInt(cid)
    });

    const result = await getEpisodeListData(parseInt(cid));

    logger.info('Dramabite episode list retrieved successfully', {
      requestId: req.id,
      cid: parseInt(cid),
      episodeCount: result.data?.length || 0
    });

    res.json({
      success: true,
      message: 'Episode list retrieved successfully',
      data: result.data || result,
      cid: parseInt(cid),
      episodeCount: result.data?.length || 0,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Dramabite episode list', {
      error: error.message,
      requestId: req.id,
      cid: req.query.cid
    });
    next(error);
  }
};

/**
 * Get episode details with video links
 */
export const getEpisodeDetail = async (req, res, next) => {
  try {
    const { cid, vid } = req.query;
    
    if (!cid || !vid) {
      return res.status(400).json({
        success: false,
        message: 'CID (drama ID) and VID (episode number) are required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    logger.info('Getting Dramabite episode detail', {
      requestId: req.id,
      cid: parseInt(cid),
      vid: parseInt(vid)
    });

    const result = await getEpisodeDetailData(parseInt(cid), parseInt(vid));

    logger.info('Dramabite episode detail retrieved successfully', {
      requestId: req.id,
      cid: parseInt(cid),
      vid: parseInt(vid)
    });

    res.json({
      success: true,
      message: 'Episode detail retrieved successfully',
      data: result.data || result,
      cid: parseInt(cid),
      vid: parseInt(vid),
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Dramabite episode detail', {
      error: error.message,
      requestId: req.id,
      cid: req.query.cid,
      vid: req.query.vid
    });
    next(error);
  }
};

/**
 * Get recommendations after video ends
 */
export const getPlayEndRecommend = async (req, res, next) => {
  try {
    const { cid } = req.query;
    
    if (!cid) {
      return res.status(400).json({
        success: false,
        message: 'CID (drama ID) is required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    logger.info('Getting Dramabite play end recommendations', {
      requestId: req.id,
      cid: parseInt(cid)
    });

    const result = await getPlayEndRecommendData(parseInt(cid));

    logger.info('Dramabite play end recommendations retrieved successfully', {
      requestId: req.id,
      cid: parseInt(cid),
      count: result.data?.length || 0
    });

    res.json({
      success: true,
      message: 'Play end recommendations retrieved successfully',
      data: result.data || result,
      cid: parseInt(cid),
      count: result.data?.length || 0,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Dramabite play end recommendations', {
      error: error.message,
      requestId: req.id,
      cid: req.query.cid
    });
    next(error);
  }
};

/**
 * Get complete drama information with episodes
 */
export const getDramaWithEpisodes = async (req, res, next) => {
  try {
    const { cid } = req.query;
    
    if (!cid) {
      return res.status(400).json({
        success: false,
        message: 'CID (drama ID) is required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    logger.info('Getting complete Dramabite drama with episodes', {
      requestId: req.id,
      cid: parseInt(cid)
    });

    const result = await getDramaWithEpisodesData(parseInt(cid));

    logger.info('Complete Dramabite drama retrieved successfully', {
      requestId: req.id,
      cid: parseInt(cid),
      episodeCount: result.episodes?.length || 0,
      recommendationCount: result.recommendations?.length || 0
    });

    res.json({
      success: true,
      message: 'Complete drama information retrieved successfully',
      data: result,
      cid: parseInt(cid),
      episodeCount: result.episodes?.length || 0,
      recommendationCount: result.recommendations?.length || 0,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting complete Dramabite drama', {
      error: error.message,
      requestId: req.id,
      cid: req.query.cid
    });
    next(error);
  }
};
