import axios from 'axios';
import logger from '../utils/logger.js';

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
    logger.debug(`[dramabite] ${endpoint} status=${response.status} keys=${JSON.stringify(Object.keys(response.data || {})).slice(0,200)}`);
    return response.data ?? {};
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
  const raw = await apiRequest('/episode_list', { cid });
  logger.debug('episodeList keys:', Object.keys(raw || {}));
  return raw;
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
  const raw = await apiRequest('/play_end_recommend', { cid });
  logger.debug('playEndRecommend keys:', Object.keys(raw || {}));
  return raw;
};

/**
 * Get all available dramas from homepage and modules
 * @param {number} maxPages - Maximum pages to fetch (default: 3)
 */
export const getAllDramas = async (maxPages = 3) => {
  try {
    const allDramas = [];

    const extractVideos = (moduleList) => {
      if (!Array.isArray(moduleList)) return;
      moduleList.forEach(mod => {
        const videoList = mod.video_list || mod.drama_list || [];
        if (Array.isArray(videoList)) allDramas.push(...videoList);
      });
    };
    
    // Get homepage first
    const homepageData = await homepage(0);
    // homepage returns { module_list: [...] } at top level
    extractVideos(homepageData?.module_list);
    
    // Get additional modules
    // endModule returns a SINGLE module object: { video_list: [...], has_next_page: bool, ... }
    for (let page = 0; page < maxPages; page++) {
      try {
        const moduleData = await endModule(page);
        const videoList = moduleData?.video_list || moduleData?.drama_list || [];
        if (Array.isArray(videoList)) allDramas.push(...videoList);
        if (!moduleData?.has_next_page) break;
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
    const q = query.toLowerCase();
    const searchResults = allDramas.filter(drama => {
      const titleFields = [drama.title, drama.video_title, drama.name, drama.drama_name, drama.video_name];
      return titleFields.some(t => t && t.toLowerCase().includes(q));
    });
    
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
const extractArray = (raw, ...keys) => {
  if (Array.isArray(raw)) return raw;
  for (const key of keys) {
    const val = key.split('.').reduce((o, k) => o?.[k], raw);
    if (Array.isArray(val)) return val;
  }
  return [];
};

export const getDramaWithEpisodes = async (cid) => {
  try {
    const [episodeListData, recommendData] = await Promise.all([
      episodeList(cid),
      playEndRecommend(cid)
    ]);
    
    return {
      episodes: extractArray(episodeListData, 'data', 'data.episode_list', 'episode_list'),
      recommendations: extractArray(recommendData, 'data', 'data.recommend_list', 'data.video_list', 'recommend_list')
    };
  } catch (error) {
    logger.error('Error getting drama with episodes:', error.message);
    throw error;
  }
};
