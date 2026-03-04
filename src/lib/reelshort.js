import axios from 'axios';
import logger from '../utils/logger.js';

class ReelShortAPI {
    constructor() {
        this.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
            "Referer": "https://www.reelshort.com/",
            "Origin": "https://www.reelshort.com"
        };
        this.baseUrl = null;
        this.buildId = null;
        this.updateBuildId();
    }

    async updateBuildId() {
        try {
            const homeUrl = "https://www.reelshort.com/id";
            logger.info(`Fetching build ID from ${homeUrl}`);
            
            const response = await axios.get(homeUrl, { 
                headers: this.headers, 
                timeout: 15000 
            });
            
            // Look for buildId in the HTML
            const buildIdMatch = response.data.match(/"buildId":"([^"]+)"/);
            if (buildIdMatch) {
                this.buildId = buildIdMatch[1];
                this.baseUrl = `https://www.reelshort.com/_next/data/${this.buildId}/id`;
                logger.info(`Successfully updated build ID: ${this.buildId}`);
            } else {
                // Try alternative pattern
                const altMatch = response.data.match(/\/id\/_next\/data\/([^\/]+)\//);
                if (altMatch) {
                    this.buildId = altMatch[1];
                    this.baseUrl = `https://www.reelshort.com/_next/data/${this.buildId}/id`;
                    logger.info(`Updated build ID (alt pattern): ${this.buildId}`);
                } else {
                    throw new Error("Build ID pattern not found in HTML");
                }
            }
        } catch (error) {
            // Fallback to hardcoded build ID
            this.buildId = "acf624d";
            this.baseUrl = `https://www.reelshort.com/_next/data/${this.buildId}/id`;
            logger.warn(`Using fallback build ID: ${this.buildId}`);
        }
    }

    async makeRequest(url) {
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 15000
            });
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                throw new Error("Build ID expired, updating...");
                await this.updateBuildId();
                // Retry with new build ID
                const newUrl = url.replace(/\/_next\/data\/[^\/]+/, `/_next/data/${this.buildId}`);
                const retryResponse = await axios.get(newUrl, {
                    headers: this.headers,
                    timeout: 15000
                });
                return retryResponse.data;
            }
            throw error;
        }
    }

    async getRawBookshelves() {
        const targetUrl = `https://www.reelshort.com/_next/data/${this.buildId}/id.json`;
        logger.info(`Fetching bookshelves from: ${targetUrl}`);
        
        try {
            const data = await this.makeRequest(targetUrl);
            
            // Debug: print structure (matching Python version)
            const pageProps = data.pageProps || {};
            const fallback = pageProps.fallback || {};
            const hallInfo = fallback["/api/video/hall/info"] || {};
            const bookShelfList = hallInfo.bookShelfList || [];
            
            logger.info(`Found ${bookShelfList.length} bookshelves`);
            bookShelfList.forEach(shelf => {
                logger.debug(` - ${shelf.bookshelf_name}`);
            });
            
            return bookShelfList;
        } catch (error) {
            logger.error(`Error fetching bookshelves: ${error.message}`);
            return null;
        }
    }

    async search(keywords) {
        try {
            logger.info(`Searching for: ${keywords}`);
            
            const bookShelfList = await this.getRawBookshelves();
            if (!bookShelfList) {
                logger.error("Failed to get bookshelves for search");
                return [];
            }

            const results = [];
            const searchLower = keywords.toLowerCase();

            // Search through all bookshelves
            for (const shelf of bookShelfList) {
                if (shelf.books && Array.isArray(shelf.books)) {
                    for (const book of shelf.books) {
                        // Generate filtered_title for all books in bookshelf
                        if (book.book_title && !book.filtered_title) {
                            book.filtered_title = book.book_title.toLowerCase()
                                .replace(/[^a-z0-9]+/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .replace(/ /g, '-');
                        }
                        
                        if (book.book_title && book.book_title.toLowerCase().includes(searchLower)) {
                            results.push({
                                book_id: book.book_id,
                                book_title: book.book_title,
                                filtered_title: book.filtered_title,
                                book_pic: book.book_pic,
                                chapter_count: book.chapter_count,
                                bookshelf_name: shelf.bookshelf_name
                            });
                        }
                    }
                }
            }

            logger.info(`Found ${results.length} results for "${keywords}"`);
            return results;
        } catch (error) {
            logger.error(`Error search: ${error.message}`);
            return [];
        }
    }

    async getEpisodes(bookId, filteredTitle) {
        try {
            const url = `${this.baseUrl}/movie/${filteredTitle}-${bookId}.json?slug=${filteredTitle}-${bookId}`;
            logger.info(`Getting episodes from: ${url}`);
            
            const data = await this.makeRequest(url);
            logger.debug(`Episodes response structure: ${JSON.stringify(Object.keys(data || {}), null, 2)}`);
            
            if (data && data.pageProps && data.pageProps.data) {
                const bookData = data.pageProps.data;
                logger.debug(`Book data keys: ${JSON.stringify(Object.keys(bookData), null, 2)}`);
                
                // Use online_base like Python reference
                let episodes = [];
                if (bookData.online_base && Array.isArray(bookData.online_base)) {
                    episodes = bookData.online_base.map(ep => ({
                        episode: ep.serial_number,
                        chapter_id: ep.chapter_id
                    }));
                } else if (bookData.episodeList) {
                    episodes = bookData.episodeList.map(ep => ({
                        episode: ep.episode,
                        chapter_id: ep.chapterId
                    }));
                } else if (bookData.episodes) {
                    episodes = bookData.episodes.map(ep => ({
                        episode: ep.episode || ep.episode_number,
                        chapter_id: ep.chapterId || ep.chapter_id
                    }));
                } else if (Array.isArray(bookData)) {
                    episodes = bookData.map((ep, index) => ({
                        episode: ep.episode || index + 1,
                        chapter_id: ep.chapterId || ep.chapter_id || ep.id
                    }));
                }
                
                logger.info(`Found ${episodes.length} episodes`);
                return episodes;
            } else {
                logger.error("Invalid episodes data structure");
                logger.debug(`Full response: ${JSON.stringify(data, null, 2)}`);
                return [];
            }
        } catch (error) {
            logger.error(`Error get episodes: ${error.message}`);
            return [];
        }
    }

    async getVideoUrl(episodeNum, filteredTitle, bookId, chapterId) {
        try {
            const url = `${this.baseUrl}/episodes/episode-${episodeNum}-${filteredTitle}-${bookId}-${chapterId}.json?play_time=1&slug=episode-${episodeNum}-${filteredTitle}-${bookId}-${chapterId}`;
            logger.info(`Getting video URL from: ${url}`);
            
            const data = await this.makeRequest(url);
            
            if (data && data.pageProps && data.pageProps.data) {
                const episodeData = data.pageProps.data;
                
                return {
                    video_url: episodeData.video_url || "",
                    serial_number: episodeData.serial_number || episodeNum,
                    duration: episodeData.duration || 0
                };
            } else {
                logger.error("Invalid video data structure");
                return null;
            }
        } catch (error) {
            logger.error(`Error get video URL: ${error.message}`);
            return null;
        }
    }

    async getDramaDub() {
        try {
            const bookShelfList = await this.getRawBookshelves();
            if (!bookShelfList) {
                return { result: null, error: "Failed to fetch bookshelves" };
            }

            const dramaDubShelf = bookShelfList.find(shelf => shelf.bookshelf_name === "Drama dengan Dub🎧");
            if (!dramaDubShelf) {
                const available = bookShelfList.map(s => s.bookshelf_name);
                return { result: null, error: `'Drama dengan dub' not found. Available: ${available.join(', ')}` };
            }

            return { result: dramaDubShelf, error: null };
        } catch (error) {
            logger.error(`Error get drama dub: ${error.message}`);
            return { result: null, error: "Failed to fetch drama dub" };
        }
    }

    async getNewRelease() {
        try {
            const bookShelfList = await this.getRawBookshelves();
            if (!bookShelfList) {
                return { result: null, error: "Failed to fetch bookshelves" };
            }

            const newReleaseShelf = bookShelfList.find(shelf => shelf.bookshelf_name === "Rilis Baru💥");
            if (!newReleaseShelf) {
                const available = bookShelfList.map(s => s.bookshelf_name);
                return { result: null, error: `'Rilis Baru' not found. Available: ${available.join(', ')}` };
            }

            return { result: newReleaseShelf, error: null };
        } catch (error) {
            logger.error(`Error get new release: ${error.message}`);
            return { result: null, error: "Failed to fetch new release" };
        }
    }

    async getRecommended() {
        try {
            const bookShelfList = await this.getRawBookshelves();
            if (!bookShelfList) {
                return { result: null, error: "Failed to fetch bookshelves" };
            }

            const recommendedShelf = bookShelfList.find(shelf => shelf.bookshelf_name === "Lebih Direkomendasikan 🔍");
            if (!recommendedShelf) {
                const available = bookShelfList.map(s => s.bookshelf_name);
                return { result: null, error: `'Lebih Direkomendasikan' not found. Available: ${available.join(', ')}` };
            }

            return { result: recommendedShelf, error: null };
        } catch (error) {
            logger.error(`Error get recommended: ${error.message}`);
            return { result: null, error: "Failed to fetch recommended" };
        }
    }
}

export default new ReelShortAPI();
