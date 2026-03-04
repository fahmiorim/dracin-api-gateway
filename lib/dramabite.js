import axios from 'axios';
import logger from '../src/utils/logger.js';

const BASE_URL = 'https://www.dramabite.media/short_video/video_svr';

// Helper function untuk generate timestamp
const getTimestamp = () => Date.now().toString();

// Helper function untuk request ke API
const apiRequest = async (endpoint, params = {}) => {
  try {
    const timestamp = getTimestamp();
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: {
        ...params,
        lang: 'id', // Force Bahasa Indonesia
        time: timestamp
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.dramabite.media/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 10000
    });
    
    // Dramabite API returns response directly, not wrapped in .data
    return response.data || response;
  } catch (error) {
    logger.error(`Error fetching ${endpoint}:`, error.message);
    throw new Error(`Failed to fetch ${endpoint}: ${error.message}`);
  }
};

/**
 * Get homepage dramas
 * @param {number} page - Page number (default: 0)
 */
export const homepage = async (page = 0) => {
  return await apiRequest('/homepage', { page });
};

/**
 * Get additional modules (infinite scroll)
 * @param {number} page - Page number (default: 0)
 */
export const endModule = async (page = 0) => {
  return await apiRequest('/end_module', { page });
};

/**
 * Get episode list for a drama
 * @param {number} cid - Drama ID
 */
export const episodeList = async (cid) => {
  if (!cid) {
    throw new Error('CID (drama ID) is required');
  }
  return await apiRequest('/episode_list', { cid });
};

/**
 * Get episode details with video links
 * @param {number} cid - Drama ID
 * @param {number} vid - Episode number
 */
export const episodeDetail = async (cid, vid) => {
  if (!cid || !vid) {
    throw new Error('CID (drama ID) and VID (episode number) are required');
  }
  return await apiRequest('/episode_detail', { cid, vid });
};

/**
 * Get recommendations after video ends
 * @param {number} cid - Drama ID
 */
export const playEndRecommend = async (cid) => {
  if (!cid) {
    throw new Error('CID (drama ID) is required');
  }
  return await apiRequest('/play_end_recommend', { cid });
};

/**
 * Get all available dramas from homepage and modules
 * @param {number} maxPages - Maximum pages to fetch (default: 3)
 */
export const getAllDramas = async (maxPages = 3) => {
  try {
    const allDramas = [];
    
    // Get homepage first
    const homepageData = await homepage(0);
    if (homepageData && homepageData.module_list) {
      homepageData.module_list.forEach(module => {
        if (module.video_list && Array.isArray(module.video_list)) {
          allDramas.push(...module.video_list);
        }
      });
    }
    
    // Get additional modules
    for (let page = 0; page < maxPages; page++) {
      try {
        const moduleData = await endModule(page);
        if (moduleData && moduleData.module_list) {
          moduleData.module_list.forEach(module => {
            if (module.video_list && Array.isArray(module.video_list)) {
              allDramas.push(...module.video_list);
            }
          });
        }
      } catch (error) {
        logger.warn(`Failed to fetch module page ${page}:`, error.message);
        break;
      }
    }
    
    // Remove duplicates based on cid
    const uniqueDramas = allDramas.filter((drama, index, self) => 
      index === self.findIndex((d) => d.cid === drama.cid)
    );
    
    return uniqueDramas;
  } catch (error) {
    logger.error('Error getting all dramas:', error.message);
    throw error;
  }
};

/**
 * Search dramas by title (from all dramas)
 * @param {string} query - Search query
 */
export const searchDramas = async (query) => {
  if (!query) {
    throw new Error('Search query is required');
  }
  
  try {
    const allDramas = await getAllDramas();
    const searchResults = allDramas.filter(drama => 
      drama.title && drama.title.toLowerCase().includes(query.toLowerCase())
    );
    
    return searchResults;
  } catch (error) {
    logger.error('Error searching dramas:', error.message);
    throw error;
  }
};

/**
 * Get complete drama information with episodes
 * @param {number} cid - Drama ID
 */
export const getDramaWithEpisodes = async (cid) => {
  try {
    const [episodeListData, recommendData] = await Promise.all([
      episodeList(cid),
      playEndRecommend(cid)
    ]);
    
    return {
      episodes: episodeListData.data || [],
      recommendations: recommendData.data || []
    };
  } catch (error) {
    logger.error('Error getting drama with episodes:', error.message);
    throw error;
  }
};
