import logger from '../utils/logger.js';
import reelshortAPI from '../lib/reelshort.js';

/**
 * Search ReelShort dramas
 */
export const searchReelShort = async (req, res, next) => {
  try {
    const { keywords } = req.query;
    
    if (!keywords) {
      return res.status(400).json({
        success: false,
        message: 'Keywords parameter is required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    logger.info('Searching ReelShort dramas', {
      requestId: req.id,
      keywords
    });

    const results = await reelshortAPI.search(keywords);

    logger.info('ReelShort search completed', {
      requestId: req.id,
      keywords,
      count: results.length
    });

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: results,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error searching ReelShort dramas', {
      error: error.message,
      requestId: req.id,
      keywords: req.query.keywords
    });
    next(error);
  }
};

/**
 * Get ReelShort episodes
 */
export const getReelShortEpisodes = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const { filtered_title } = req.query;
    
    if (!filtered_title) {
      return res.status(400).json({
        success: false,
        message: 'filtered_title parameter is required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    logger.info('Getting ReelShort episodes', {
      requestId: req.id,
      bookId,
      filtered_title
    });

    const episodes = await reelshortAPI.getEpisodes(bookId, filtered_title);

    logger.info('ReelShort episodes retrieved successfully', {
      requestId: req.id,
      bookId,
      count: episodes.length
    });

    res.json({
      success: true,
      message: 'Episodes retrieved successfully',
      data: episodes,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting ReelShort episodes', {
      error: error.message,
      requestId: req.id,
      bookId: req.params.bookId
    });
    next(error);
  }
};

/**
 * Get ReelShort video URL
 */
export const getReelShortVideo = async (req, res, next) => {
  try {
    const { bookId, episodeNum } = req.params;
    const { filtered_title, chapter_id } = req.query;
    
    if (!filtered_title || !chapter_id) {
      return res.status(400).json({
        success: false,
        message: 'filtered_title and chapter_id parameters are required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    logger.info('Getting ReelShort video URL', {
      requestId: req.id,
      bookId,
      episodeNum,
      filtered_title,
      chapter_id
    });

    const videoData = await reelshortAPI.getVideoUrl(
      parseInt(episodeNum),
      filtered_title,
      bookId,
      chapter_id
    );

    if (!videoData || !videoData.video_url) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    // Get episodes list for next/prev episode info
    const episodesList = await reelshortAPI.getEpisodes(bookId, filtered_title);
    const currentEpisodeIndex = episodesList.findIndex(ep => ep.chapter_id === chapter_id);
    
    const nextEpisode = currentEpisodeIndex < episodesList.length - 1 
      ? episodesList[currentEpisodeIndex + 1] 
      : null;
    
    const prevEpisode = currentEpisodeIndex > 0 
      ? episodesList[currentEpisodeIndex - 1] 
      : null;

    logger.info('ReelShort video URL retrieved successfully', {
      requestId: req.id,
      bookId,
      episodeNum
    });

    res.json({
      success: true,
      message: 'Video URL retrieved successfully',
      data: {
        ...videoData,
        next_episode: nextEpisode ? {
          episode_num: nextEpisode.episode,
          chapter_id: nextEpisode.chapter_id,
          filtered_title: filtered_title,
          book_id: bookId
        } : null,
        prev_episode: prevEpisode ? {
          episode_num: prevEpisode.episode,
          chapter_id: prevEpisode.chapter_id,
          filtered_title: filtered_title,
          book_id: bookId
        } : null
      },
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting ReelShort video URL', {
      error: error.message,
      requestId: req.id,
      bookId: req.params.bookId,
      episodeNum: req.params.episodeNum
    });
    next(error);
  }
};

/**
 * Get Drama dengan dub bookshelf
 */
export const getDramaDub = async (req, res, next) => {
  try {
    logger.info('Getting Drama dengan dub bookshelf', { requestId: req.id });

    const { result, error } = await reelshortAPI.getDramaDub();
    
    if (error) {
      if (error.includes("Failed to fetch")) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch bookshelves',
          error: error,
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Bookshelf not found',
          error: error,
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
    }

    logger.info('Drama dengan dub retrieved successfully', {
      requestId: req.id,
      count: result.books?.length || 0
    });

    res.json({
      success: true,
      message: 'Drama dengan dub retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Drama dengan dub', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};

/**
 * Get Rilis Baru bookshelf
 */
export const getNewRelease = async (req, res, next) => {
  try {
    logger.info('Getting Rilis Baru bookshelf', { requestId: req.id });

    const { result, error } = await reelshortAPI.getNewRelease();
    
    if (error) {
      if (error.includes("Failed to fetch")) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch bookshelves',
          error: error,
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Bookshelf not found',
          error: error,
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
    }

    logger.info('Rilis Baru retrieved successfully', {
      requestId: req.id,
      count: result.books?.length || 0
    });

    res.json({
      success: true,
      message: 'Rilis Baru retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Rilis Baru', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};

/**
 * Get Lebih Direkomendasikan bookshelf
 */
export const getRecommended = async (req, res, next) => {
  try {
    logger.info('Getting Lebih Direkomendasikan bookshelf', { requestId: req.id });

    const { result, error } = await reelshortAPI.getRecommended();
    
    if (error) {
      if (error.includes("Failed to fetch")) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch bookshelves',
          error: error,
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Bookshelf not found',
          error: error,
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
    }

    logger.info('Lebih Direkomendasikan retrieved successfully', {
      requestId: req.id,
      count: result.books?.length || 0
    });

    res.json({
      success: true,
      message: 'Lebih Direkomendasikan retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    logger.error('Error getting Lebih Direkomendasikan', {
      error: error.message,
      requestId: req.id
    });
    next(error);
  }
};
