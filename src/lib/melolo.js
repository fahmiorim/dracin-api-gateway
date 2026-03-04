import axios from 'axios';
import logger from '../utils/logger.js';

class MeloloAPI {
    constructor() {
        this.base_url = "https://api.tmtreader.com";
        this.common_headers = {
            "Host": "api.tmtreader.com",
            "Accept": "application/json; charset=utf-8,application/x-protobuf",
            "X-Xs-From-Web": "false",
            "Age-Range": "8",
            "Sdk-Version": "2",
            "Passport-Sdk-Version": "50357",
            "X-Vc-Bdturing-Sdk-Version": "2.2.1.i18n",
            "User-Agent": "com.worldance.drama/49819 (Linux; U; Android 9; in; SM-N976N; Build/QP1A.190711.020;tt-ok/3.12.13.17)",
        };
        this.common_params = {
            "iid": "7549249992780367617",
            "device_id": "6944790948585719298",
            "ac": "wifi",
            "channel": "gp",
            "aid": "645713",
            "app_name": "Melolo",
            "version_code": "49819",
            "version_name": "4.9.8",
            "device_platform": "android",
            "os": "android",
            "ssmix": "a",
            "device_type": "SM-N976N",
            "device_brand": "samsung",
            "language": "in",
            "os_api": "28",
            "os_version": "9",
            "openudid": "707e4ef289dcc394",
            "manifest_version_code": "49819",
            "resolution": "900*1600",
            "dpi": "320",
            "update_version_code": "49819",
            "current_region": "ID",
            "carrier_region": "ID",
            "app_language": "id",
            "sys_language": "in",
            "app_region": "ID",
            "sys_region": "ID",
            "mcc_mnc": "46002",
            "carrier_region_v2": "460",
            "user_language": "id",
            "time_zone": "Asia/Bangkok",
            "ui_language": "in",
            "cdid": "a854d5a9-b6cd-4de7-9c43-8310f5bf513c",
        };
    }

    _generate_rticket() {
        return String(Date.now() + Math.floor(Math.random() * 1000000));
    }

    async searchNovels(query, offset = "0", limit = "10") {
        try {
            const url = `${this.base_url}/i18n_novel/search/page/v1/`;
            const headers = { ...this.common_headers };
            const params = { ...this.common_params };
            
            Object.assign(params, {
                "search_source_id": "clks###",
                "IsFetchDebug": "false",
                "offset": offset,
                "cancel_search_category_enhance": "false",
                "query": query,
                "limit": limit,
                "search_id": "",
                "_rticket": this._generate_rticket(),
            });
            
            const response = await axios.get(url, { headers, params });
            
            if (response.status !== 200) {
                return { result: null, error: `HTTP ${response.status}` };
            }
            
            const books = this._extractBooksFromSearch(response.data);
            return { result: books, error: null };
        } catch (error) {
            logger.error(`Error searching novels: ${error.message}`);
            return { result: null, error: error.message };
        }
    }

    _extractBooksFromSearch(jsonData) {
        const books = [];
        const searchData = jsonData.data?.search_data || [];
        
        for (const item of searchData) {
            const itemBooks = item.books || [];
            for (const book of itemBooks) {
                const bookInfo = {
                    series_id: book.book_id || "",
                    title: book.book_name || "",
                    last_chapter_index: book.last_chapter_index || "",
                    thumb_url: book.thumb_url || ""
                };
                books.push(bookInfo);
            }
        }
        
        return books;
    }

    async getVideoDetails(series_id) {
        try {
            const url = `${this.base_url}/novel/player/video_detail/v1/`;
            const headers = { ...this.common_headers };
            
            Object.assign(headers, {
                "X-Ss-Stub": "238B6268DE1F0B757306031C76B5397E",
                "Content-Encoding": "gzip",
                "Content-Type": "application/json; charset=utf-8",
            });
            
            const params = { ...this.common_params };
            params["_rticket"] = this._generate_rticket();
            
            const data = {
                "biz_param": {
                    "detail_page_version": 0,
                    "from_video_id": "",
                    "need_all_video_definition": false,
                    "need_mp4_align": false,
                    "source": 4,
                    "use_os_player": false,
                    "video_id_type": 1
                },
                "series_id": series_id
            };
            
            logger.info(`Making request to: ${url}`);
            logger.info(`Request params: ${JSON.stringify(params, null, 2)}`);
            logger.info(`Request data: ${JSON.stringify(data, null, 2)}`);
            
            const response = await axios.post(url, data, { headers, params });
            
            logger.info(`Response status: ${response.status}`);
            logger.info(`Response headers: ${JSON.stringify(response.headers, null, 2)}`);
            logger.info(`Response data: ${JSON.stringify(response.data, null, 2)}`);
            
            if (response.status !== 200) {
                return { result: null, error: `HTTP ${response.status}` };
            }
            
            return { result: response.data };
        } catch (error) {
            logger.error(`Error getting video details: ${error.message}`);
            logger.error(`Error stack: ${error.stack}`);
            return { result: null, error: error.message };
        }
    }

    _extractVideosFromDetails(jsonData) {
        const videos = [];
        
        let videoList = [];
        
        if (jsonData.data && Array.isArray(jsonData.data)) {
            videoList = jsonData.data;
        } else if (jsonData.data && jsonData.data.video_list) {
            videoList = jsonData.data.video_list;
        } else if (jsonData.data?.videos) {
            videoList = jsonData.data.videos;
        } else if (Array.isArray(jsonData.data)) {
            videoList = jsonData.data;
        }
        
        for (const video of videoList) {
            const videoInfo = {
                duration: video.duration || 0,
                digged_count: video.digged_count || 0,
                video_id: video.vid || video.video_id || "",
                chapter: video.vid_index || video.chapter || ""
            };
            videos.push(videoInfo);
        }
        
        return videos;
    }

    async getVideoModel(video_id) {
        try {
            const url = `${this.base_url}/novel/player/video_model/v1/`;
            const headers = { ...this.common_headers };
            
            Object.assign(headers, {
                "X-Ss-Stub": "B7FB786F2CAA8B9EFB7C67A524B73AFB",
                "Content-Encoding": "gzip",
                "Content-Type": "application/json; charset=utf-8",
            });
            
            const params = { ...this.common_params };
            params["_rticket"] = this._generate_rticket();
            
            const data = {
                "biz_param": {
                    "detail_page_version": 0,
                    "device_level": 3,
                    "from_video_id": "",
                    "need_all_video_definition": true,
                    "need_mp4_align": false,
                    "source": 4,
                    "use_os_player": false,
                    "video_id_type": 0,
                    "video_platform": 3
                },
                "video_id": video_id
            };
            
            const response = await axios.post(url, data, { headers, params });
            
            if (response.status !== 200) {
                return { result: null, error: `HTTP ${response.status}` };
            }
            
            const videoUrls = this._extractVideoUrls(response.data);
            return { result: videoUrls, error: null };
        } catch (error) {
            logger.error(`Error getting video model: ${error.message}`);
            return { result: null, error: error.message };
        }
    }

    _extractVideoUrls(jsonData) {
        const data = jsonData.data || {};
        return {
            backup_url: data.backup_url || "",
            main_url: data.main_url || ""
        };
    }

    async getRecommendations() {
        try {
            const url = `${this.base_url}/i18n_novel/search/scroll_recommend/v1/`;
            const headers = { ...this.common_headers };
            
            Object.assign(headers, {
                "User-Agent": "com.worldance.drama/50018 (Linux; U; Android 9; en; ASUS_Z01QD; Build/PI;tt-ok/3.12.13.17)",
            });
            
            const params = { ...this.common_params };
            
            Object.assign(params, {
                "from_scene": "0",
                "iid": "7555696322994947858",
                "device_id": "7555694633755166216",
                "channel": "gp",
                "version_code": "50018",
                "version_name": "5.0.0",
                "device_type": "ASUS_Z01QD",
                "device_brand": "Asus",
                "language": "in",
                "os_api": "28",
                "os_version": "9",
                "openudid": "e86253b3c442b20a",
                "manifest_version_code": "50018",
                "resolution": "900*1600",
                "dpi": "300",
                "update_version_code": "50018",
                "current_region": "ID",
                "carrier_region": "id",
                "app_language": "id",
                "sys_language": "in",
                "app_region": "ID",
                "sys_region": "ID",
                "mcc_mnc": "51001",
                "carrier_region_v2": "510",
                "user_language": "id",
                "time_zone": "Asia/Bangkok",
                "ui_language": "in",
                "cdid": "69a17f9e-cbed-49b2-9523-4d5397905fdc",
                "_rticket": this._generate_rticket(),
            });
            
            const response = await axios.get(url, { headers, params });
            
            if (response.status !== 200) {
                return { result: null, error: `HTTP ${response.status}` };
            }
            
            const recommendations = this._extractRecommendations(response.data);
            return { result: recommendations, error: null };
        } catch (error) {
            logger.error(`Error getting recommendations: ${error.message}`);
            return { result: null, error: error.message };
        }
    }

    _extractRecommendations(jsonData) {
        const recommendations = [];
        const scrollWords = jsonData.data?.scroll_words || [];
        const searchInfos = jsonData.data?.search_infos || [];
        
        for (let i = 0; i < Math.min(scrollWords.length, searchInfos.length); i++) {
            const recommendation = {
                drama_name: scrollWords[i],
                series_id: searchInfos[i]?.search_source_book_id || ""
            };
            recommendations.push(recommendation);
        }
        
        return recommendations;
    }
}

export default new MeloloAPI();
