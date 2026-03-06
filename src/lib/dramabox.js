import axios from "axios";
import { DramaboxApp, headers, getSignatureHeaders } from "./sign.js";
import token from "./token.js";
import logger from "../utils/logger.js";

// Helper function untuk validasi response dari API Dramabox
const validateApiResponse = (response, functionName, fallbackValue = []) => {
  if (!response.data) {
    logger.error(`❌ ${functionName}: No data in response`, {
      status: response.status,
      headers: response.headers
    });
    return fallbackValue;
  }
  
  if (!response.data.data) {
    logger.error(`❌ ${functionName}: No data.data in response`, {
      status: response.status,
      dataKeys: Object.keys(response.data)
    });
    
    // Check for rate limiting or auth errors
    if (response.status === 429) {
      logger.warn(`⚠️ ${functionName}: Rate limited by Dramabox API`);
    } else if (response.status === 401 || response.status === 403) {
      logger.warn(`⚠️ ${functionName}: Authentication failed with Dramabox API`);
    }
    
    return fallbackValue;
  }
  
  return response.data.data;
};

function getRandomNumber() {
    return Math.floor(Math.random() * 2) + 1;
}

const randomdrama = async () => {
    try {
        const payload = {
            "pageNo": getRandomNumber(), // default 1
            "pageFlag": "", // ini harusnya hilang
            "startType": 0,
            "firstStartUp": false
        }

        // Coba generate signature saja untuk tes
        const testSig = getSignatureHeaders(payload);

        const url = `https://sapi.dramaboxdb.com/drama-box/he001/recommendChannel?timestamp=${testSig.timestamp}`;
        const requestHeaders = {
            ...headers,
            'sn': testSig.signature
        };
        
        // Add delay untuk menghindari rate limiting
        await delay(Math.random() * 1000 + 500); // 500-1500ms random delay
        
        const res = await axios.post(url, payload, { headers: requestHeaders })
        const responseData = validateApiResponse(res, 'GET CHAPTERS');
        return responseData.chapterList || []
    } catch (error) {
        throw error;
    }
}

const latest = async (pageNo = 1, pageSize = 20) => {
    try {
        const payload = { "rankType": 3, "pageNo": pageNo, "pageSize": pageSize };
        const localHeaders = { ...headers };
        const freshToken = await fetchTokenString();
        if (freshToken) localHeaders["tn"] = `Bearer ${freshToken}`;
        await delay(Math.random() * 1000 + 500);
        const sig = generateSignature(payload, localHeaders);
        const url = `https://sapi.dramaboxdb.com/drama-box/he001/rank?timestamp=${sig.timestamp}`;
        const res = await axios.post(url, payload, { headers: { ...localHeaders, 'sn': sig.signature } });
        const responseData = validateApiResponse(res, 'GET LATEST');
        return responseData.rankList || [];
    } catch (error) {
        logger.error(`❌ ERROR GET LATEST:`, error.response?.data || error.message);
        throw error;
    }
}

const search = async (keyword) => {
    try {
        const payload = {
            keyword: keyword, // keyword pencarian
        }

        const testSig = getSignatureHeaders(payload);

        const url = `https://sapi.dramaboxdb.com/drama-box/search/suggest?timestamp=${testSig.timestamp}`;
        const requestHeaders = {
            ...headers,
            'sn': testSig.signature
        };
        const res = await axios.post(url, payload, { headers: requestHeaders })
        return res.data.data.suggestList;
    } catch (error) {
        throw error;
    }
}

const populersearch = async () => {
    try {
        const payload = { "rankType": 2 };
        const localHeaders = { ...headers };
        const freshToken = await fetchTokenString();
        if (freshToken) localHeaders["tn"] = `Bearer ${freshToken}`;
        const sig = generateSignature(payload, localHeaders);
        const url = `https://sapi.dramaboxdb.com/drama-box/he001/rank?timestamp=${sig.timestamp}`;
        const res = await axios.post(url, payload, { headers: { ...localHeaders, 'sn': sig.signature } });
        return res.data.data.rankList;
    } catch (error) {
        throw error;
    }
}

const trendings = async () => {
    try {
        const payload = { "rankType": 1 };
        const localHeaders = { ...headers };
        const freshToken = await fetchTokenString();
        if (freshToken) localHeaders["tn"] = `Bearer ${freshToken}`;
        const sig = generateSignature(payload, localHeaders);
        const url = `https://sapi.dramaboxdb.com/drama-box/he001/rank?timestamp=${sig.timestamp}`;
        const res = await axios.post(url, payload, { headers: { ...localHeaders, 'sn': sig.signature } });
        return res.data.data.rankList;
    } catch (error) {
        throw error;
    }
}

const foryou = async () => {
    try {
        const payload = { "isNeedRank": 1, "specialColumnId": 0, "pageNo": getRandomNumber() };
        const localHeaders = { ...headers };
        const freshToken = await fetchTokenString();
        if (freshToken) localHeaders["tn"] = `Bearer ${freshToken}`;
        const sig = generateSignature(payload, localHeaders);
        const url = `https://sapi.dramaboxdb.com/drama-box/he001/recommendChannel?timestamp=${sig.timestamp}`;
        const res = await axios.post(url, payload, { headers: { ...localHeaders, 'sn': sig.signature } })
        const responseData = validateApiResponse(res, 'GET FORYOU');
        
        // For-you endpoint has different response structure
        if (responseData.chapterList && Array.isArray(responseData.chapterList)) {
            return responseData.chapterList;
        } else if (Array.isArray(responseData)) {
            return responseData;
        } else if (responseData.recommendList && Array.isArray(responseData.recommendList.records)) {
            return responseData.recommendList.records;
        } else {
            logger.warn('GET FORYOU: Unexpected response structure', {
                isArray: Array.isArray(responseData),
                hasChapterList: !!responseData.chapterList,
                hasRecommendList: !!responseData.recommendList,
                availableKeys: Object.keys(responseData || {})
            });
            return [];
        }
    } catch (error) {
        throw error;
    }
}

const vip = async () => {
    try {
        const payload = { "homePageStyle": 0, "isNeedRank": 1, "index": 4, "type": 0, "channelId": 205 };
        const localHeaders = { ...headers };
        const freshToken = await fetchTokenString();
        if (freshToken) localHeaders["tn"] = `Bearer ${freshToken}`;
        const sig = generateSignature(payload, localHeaders);
        const url = `https://sapi.dramaboxdb.com/drama-box/he001/theater?timestamp=${sig.timestamp}`;
        const res = await axios.post(url, payload, { headers: { ...localHeaders, 'sn': sig.signature } });
        const responseData = validateApiResponse(res, 'GET VIP');
        return responseData || {};
    } catch (error) {
        throw error;
    }
}

const detail = async (bookId) => {
    try {
        const payload = {
            "boundaryIndex": 0,
            "comingPlaySectionId": -1,
            "index": 1,
            "currencyPlaySourceName": "首页发现_Untukmu_推荐列表",
            "rid": "",
            "enterReaderChapterIndex": 0,
            "loadDirection": 1,
            "startUpKey": "10942710-5e9e-48f2-8927-7c387e6f5fac",
            "bookId": bookId,
            "currencyPlaySource": "discover_175_rec",
            "needEndRecommend": 0,
            "preLoad": false,
            "pullCid": ""
        };

        const currentToken = await fetchTokenString();
        const localHeaders = { ...headers };
        if (currentToken) {
            localHeaders["tn"] = `Bearer ${currentToken}`;
        }

        const testSig = generateSignature(payload, localHeaders);
        const url = `https://sapi.dramaboxdb.com/drama-box/chapterv2/batch/load?timestamp=${testSig.timestamp}`;
        const requestHeaders = {
            ...localHeaders,
            'sn': testSig.signature
        };

        const res = await axios.post(url, payload, { headers: requestHeaders });

        const rawData = res.data.data;
        if (!rawData) {
            throw new Error(`Data drama untuk ID ${bookId} tidak ditemukan di server Dramabox.`);
        }

        // Mapping untuk frontend agar sesuai API lama (webfic)
        const mappedData = {
            data: {
                bookId: rawData.bookId,
                bookName: rawData.bookName,
                cover: rawData.bookCover,
                introduction: rawData.introduction,
                chapterCount: rawData.chapterCount,
                score: rawData.score || rawData.rating || "9.5",
                tags: rawData.tagV3s || []
            }
        };

        return mappedData;
    } catch (error) {
        logger.error("❌ Detail Fetch Error:", error.message);
        throw error;
    }
}

const dubindo = async (classify, page) => {
    try {
        const payload = {
            "typeList": [
                { "type": 1, "value": "" },
                { "type": 2, "value": "1" },
                { "type": 3, "value": "" },
                { "type": 4, "value": "" },
                { "type": 4, "value": "" },
                { "type": 5, "value": classify }
            ],
            "showLabels": false, "pageNo": page, "pageSize": 15
        };
        const localHeaders = { ...headers };
        const freshToken = await fetchTokenString();
        if (freshToken) localHeaders["tn"] = `Bearer ${freshToken}`;
        await delay(Math.random() * 1000 + 500);
        const sig = generateSignature(payload, localHeaders);
        const url = `https://sapi.dramaboxdb.com/drama-box/he001/classify?timestamp=${sig.timestamp}`;
        const res = await axios.post(url, payload, { headers: { ...localHeaders, 'sn': sig.signature } })
        const responseData = validateApiResponse(res, 'GET DUB INDO');
        
        // Check if classifyBookList exists
        if (!responseData.classifyBookList) {
            return [];
        }
        
        return responseData.classifyBookList.records || [];
    } catch (error) {
        throw error;
    }
}

// Biasanya token limit karena terlalu sering request (limit IP)
// jadi sarankan untuk pakai proxy
async function tokenx() {
    const tokendata = await token();
    return tokendata.token;
}

// 1. LIMITER CONFIG (Tetap pakai limiter agar RAM 1GB aman)
const MAX_CONCURRENT_REQUESTS = 10;
let activeRequests = 0;
const queue = [];

// 2. CACHE SYSTEM
// 120 menit (2 jam)
const cache = new Map();
const CACHE_DURATION = 120 * 60 * 1000;

// Template Header (alias dari headers sign.js untuk fungsi yang butuh token dinamis)
const BASE_HEADERS = headers;

// Fungsi Helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- HELPER: AMBIL TOKEN STRING ---
async function fetchTokenString() {
    try {
        const tokenValue = await tokenx();
        if (tokenValue) {
            return tokenValue;
        }
        return null;
    } catch (e) {
        logger.error("❌ Gagal fetch token list:", e.message);
        return null;
    }
}

// --- HELPER: SIGNATURE ---
function generateSignature(payload, currentHeaders) {
    const timestamp = Date.now();
    const deviceId = currentHeaders["device-id"];
    const androidId = currentHeaders["android-id"];
    const tn = currentHeaders["tn"];

    const strPayload = `timestamp=${timestamp}${JSON.stringify(payload)}${deviceId}${androidId}${tn}`;
    const signature = DramaboxApp.dramabox(strPayload);
    return {
        signature: signature,
        timestamp: timestamp.toString()
    };
}

// --- QUEUE PROCESSOR ---
async function runWithLimit(fn) {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
        await new Promise(resolve => queue.push(resolve));
    }

    activeRequests++;
    try {
        return await fn();
    } finally {
        activeRequests--;
        if (queue.length > 0) {
            const next = queue.shift();
            next();
        }
    }
}

// ================= MAIN FUNCTION (EXPORTED) =================
const linkStream = async (targetBookId) => {

    // CACHING
    const cachedData = cache.get(targetBookId);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        cache.delete(targetBookId);
        cache.set(targetBookId, cachedData)
        return cachedData.data;
    }

    return runWithLimit(async () => {
        const resultData = await scrapeProcess(targetBookId);

        if (resultData && resultData.length > 0) {
            cache.set(targetBookId, {
                data: resultData,
                timestamp: Date.now()
            });
            if (cache.size > 700) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
        }

        return resultData;
    });
};

// ================= CORE SCRAPING LOGIC =================
async function scrapeProcess(targetBookId) {
    let savedPayChapterNum = 0;
    let result = [];

    const localHeaders = { ...BASE_HEADERS };

    // TOKEN AWAL
    const initToken = await fetchTokenString();
    if (initToken) {
        localHeaders["tn"] = `Bearer ${initToken}`;
    } else {
        logger.error(`❌ Gagal dapat token awal untuk ${targetBookId}`);
        return [];
    }

    // INTERNAL FETCH
    async function fetchBatch(index, bookId, isRetry = false) {
        const payload = {
            "boundaryIndex": 0,
            "comingPlaySectionId": -1,
            "index": index,
            "currencyPlaySourceName": "首页发现_Untukmu_推荐列表",
            "rid": "",
            "enterReaderChapterIndex": 0,
            "loadDirection": 1,
            "startUpKey": "10942710-5e9e-48f2-8927-7c387e6f5fac",
            "bookId": bookId,
            "currencyPlaySource": "discover_175_rec",
            "needEndRecommend": 0,
            "preLoad": false,
            "pullCid": ""
        };

        const currentSig = generateSignature(payload, localHeaders);
        const url = `https://sapi.dramaboxdb.com/drama-box/chapterv2/batch/load?timestamp=${currentSig.timestamp}`;
        const requestHeaders = { ...localHeaders, 'sn': currentSig.signature };

        try {
            const res = await axios.post(url, payload, { headers: requestHeaders });

            // Validasi Response
            if (!res.data || !res.data.data || !res.data.data.chapterList || res.data.data.chapterList.length === 0) {
                // Ignore error message jika sedang unlock payChapterNum (misal fetch -1, hasilnya error, tetap dianggap sukses unlock)
                if (index !== savedPayChapterNum) {
                    // Throw error agar masuk ke catch dan trigger refresh token
                    throw new Error("Soft Error: Data kosong / Token Expired");
                }
            }
            return res.data;

        } catch (error) {
            if (!isRetry) {
                // REFRESH TOKEN
                const newToken = await fetchTokenString();

                if (newToken) {
                    localHeaders["tn"] = `Bearer ${newToken}`;

                    // --- PERBAIKAN LOGIKA PAY CHAPTER ---
                    // Cek: savedPayChapterNum TIDAK SAMA DENGAN 0. 
                    // Artinya: Angka positif (13, 15) atau negatif (-1) akan diproses.
                    // Jika savedPayChapterNum == -1, maka kondisi (-1 !== 0) adalah TRUE, jadi fetch(-1) dijalankan.
                    if (savedPayChapterNum !== 0 && index !== savedPayChapterNum) {
                        await fetchBatch(savedPayChapterNum, bookId, true).catch(() => { });
                        await delay(1000);
                    }

                    // Langsung coba lagi ambil chapter target
                    await delay(1500);
                    return fetchBatch(index, bookId, true);
                }
            }
            return null;
        }
    }

    // FLOW UTAMA
    try {
        const firstBatchData = await fetchBatch(1, targetBookId);

        if (firstBatchData && firstBatchData.data) {
            const totalChapters = firstBatchData.data.chapterCount;
            const bookName = firstBatchData.data.bookName;

            // Simpan PayChapterNum
            // Jika API return -1, variabel ini jadi -1. 
            if (firstBatchData.data.payChapterNum !== undefined) {
                savedPayChapterNum = firstBatchData.data.payChapterNum;
            }

            if (firstBatchData.data.chapterList) {
                result.push(...firstBatchData.data.chapterList);
            }

            let currentIdx = 6;
            let retryCount = 0;
            let consecutiveSkips = 0;
            const MAX_RETRIES = 3;

            while (currentIdx <= totalChapters) {
                const batchData = await fetchBatch(currentIdx, targetBookId);

                let isValid = false;
                if (batchData && batchData.data && batchData.data.chapterList && batchData.data.chapterList.length > 0) {
                    const receivedIndex = batchData.data.chapterList[0].chapterIndex;
                    if (receivedIndex >= (currentIdx - 5)) {
                        isValid = true;
                    }
                }

                if (isValid) {
                    result.push(...batchData.data.chapterList);
                    currentIdx += 5;
                    retryCount = 0;
                    consecutiveSkips = 0;
                } else {
                    retryCount++;

                    if (retryCount >= MAX_RETRIES) {
                        logger.error(`🚨 [${targetBookId}] Skip idx ${currentIdx}.`);
                        currentIdx += 5;
                        retryCount = 0;
                        consecutiveSkips++;

                        if (consecutiveSkips >= 2) {
                            logger.error(`💀 [${targetBookId}] Terlalu banyak error beruntun. Stop.`);
                            break;
                        }

                    } else {
                        await delay(2000 + (Math.random() * 1000));
                    }
                }

                await delay(800);
            }
        } else {
            logger.warn(`⚠️ [${targetBookId}] Gagal Batch 1.`);
        }

        const uniqueResult = Array.from(new Map(result.map(item => [item.chapterId, item])).values());
        uniqueResult.sort((a, b) => a.chapterIndex - b.chapterIndex);

        // Map playUrl for frontend compatibility
        uniqueResult.forEach(item => {
            if (item.cdnList && item.cdnList.length > 0) {
                const defaultCdn = item.cdnList.find(cdn => cdn.isDefault === 1) || item.cdnList[0];
                if (defaultCdn && defaultCdn.videoPathList && defaultCdn.videoPathList.length > 0) {
                    const defaultPath = defaultCdn.videoPathList.find(v => v.isDefault === 1) || defaultCdn.videoPathList[0];
                    item.playUrl = defaultPath.videoPath;
                }
            }
        });

        return uniqueResult;

    } catch (error) {
        logger.error(`Critical Error [${targetBookId}]:`, error.message);
        return [];
    }
}

export { latest, search, linkStream, trendings, foryou, populersearch, randomdrama, vip, detail, dubindo };