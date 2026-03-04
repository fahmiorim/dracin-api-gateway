import axios from "axios";
import crypto from "crypto";
import { DramaboxApp, headers, getSignatureHeaders } from "./sign.js";
import token from "./token.js";

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
        // console.log(testSig);

        // console.log(DramaboxApp.dramabox("test string"));

        const url = `https://sapi.dramaboxdb.com/drama-box/he001/recommendChannel?timestamp=${testSig.timestamp}`;
        const requestHeaders = {
            ...headers,
            'sn': testSig.signature
        };
        const res = await axios.post(url, payload, { headers: requestHeaders })
        return res.data.data.chapterList
    } catch (error) {
        throw error;
    }
}

const latest = async (pageNo = 1, pageSize = 20) => {
    try {
        const payload = {
            "rankType": 3,
            "pageNo": pageNo,
            "pageSize": pageSize
        }

        // Coba generate signature saja untuk tes
        const testSig = getSignatureHeaders(payload);

        const url = `https://sapi.dramaboxdb.com/drama-box/he001/rank?timestamp=${testSig.timestamp}`;
        const requestHeaders = {
            ...headers,
            'sn': testSig.signature
        };
        const res = await axios.post(url, payload, { headers: requestHeaders })
        return res.data.data.rankList
    } catch (error) {
        console.error(`❌ ERROR GET LATEST:`, error.response?.data || error.message);
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
        // console.log(res.data.data.suggestList); 
        return res.data.data.suggestList;
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

// Template Header
const BASE_HEADERS = {
    "accept-encoding": "gzip",
    "active-time": "48610",
    "afid": "1765426707100-3399426610238541236",
    "android-id": "ffffffffbc0195cebc03a54e00000000",
    "apn": "0",
    "brand": "vivo",
    "build": "Build/PQ3A.190705.09121607",
    "cid": "DAUAG1050238",
    "connection": "Keep-Alive",
    "content-type": "application/json; charset=UTF-8",
    "country-code": "ID",
    "current-language": "in",
    "device-id": "dab6c1c5-7248-3e12-898d-37f045b1acff",
    "device-score": "55",
    "host": "sapi.dramaboxdb.com",
    "ins": "1765426707269",
    "instanceid": "8f1ff8f305a5fe5a1a09cb6f0e6f1265",
    "is_emulator": "0",
    "is_root": "1",
    "is_vpn": "1",
    "language": "in",
    "lat": "0",
    "local-time": "2025-12-11 12:32:12.278 +0800",
    "locale": "in_ID",
    "mbid": "60000000000",
    "mcc": "510",
    "mchid": "DAUAG1050238",
    "md": "V2309A",
    "mf": "VIVO",
    "nchid": "DRA1000042",
    "ov": "9",
    "over-flow": "new-fly",
    "p": "51",
    "package-name": "com.storymatrix.drama",
    "pline": "ANDROID",
    "srn": "900x1600",
    "store-source": "store_google",
    "time-zone": "+0800",
    "tn": "",
    "tz": "-480",
    "user-agent": "okhttp/4.10.0",
    "userid": "359146421",
    "version": "490",
    "vn": "4.9.0"
}

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
        console.error("❌ Gagal fetch token list:", e.message);
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
        console.log(`⚡ [CACHE] ID: ${targetBookId} - Cache Size: ${cache.size}`);
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
                console.log(`⚡ [CACHE] Size: ${cache.size}, delete cache`);
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

    console.log(`🚀 Start [${activeRequests}/${MAX_CONCURRENT_REQUESTS}]: ${targetBookId}`);

    // TOKEN AWAL
    const initToken = await fetchTokenString();
    if (initToken) {
        localHeaders["tn"] = `Bearer ${initToken}`;
    } else {
        console.error(`❌ Gagal dapat token awal untuk ${targetBookId}`);
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
                        // console.log(`🔓 Unlocking trigger ${savedPayChapterNum}...`);
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

            console.log(`📖 [${targetBookId}] ${bookName} (${totalChapters} eps) | PayEps: ${savedPayChapterNum}`);

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
                    console.log(`❌ [${targetBookId}] Gagal idx ${currentIdx}. (${retryCount}/${MAX_RETRIES})`);

                    if (retryCount >= MAX_RETRIES) {
                        console.error(`🚨 [${targetBookId}] Skip idx ${currentIdx}.`);
                        currentIdx += 5;
                        retryCount = 0;
                        consecutiveSkips++;

                        if (consecutiveSkips >= 2) {
                            console.error(`💀 [${targetBookId}] Terlalu banyak error beruntun. Stop.`);
                            break;
                        }

                    } else {
                        await delay(2000 + (Math.random() * 1000));
                    }
                }

                await delay(800);
            }
        } else {
            console.log(`⚠️ [${targetBookId}] Gagal Batch 1.`);
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

        console.log(`✅ DONE [${targetBookId}]. Total: ${uniqueResult.length}`);

        return uniqueResult;

    } catch (error) {
        console.error(`Critical Error [${targetBookId}]:`, error.message);
        return [];
    }
}

const populersearch = async () => {
    try {
        const payload = {
            "rankType": 2
        }


        // Coba generate signature saja untuk tes
        const testSig = getSignatureHeaders(payload);
        // console.log(testSig);

        // console.log(DramaboxApp.dramabox("test string"));

        const url = `https://sapi.dramaboxdb.com/drama-box/he001/rank?timestamp=${testSig.timestamp}`;
        const requestHeaders = {
            ...headers,
            'sn': testSig.signature
        };
        const res = await axios.post(url, payload, { headers: requestHeaders })
        console.log(`✅ SUCCESS GET POPULERSEARCH`);
        return res.data.data.rankList
    } catch (error) {
        throw error;
    }
}

const trendings = async () => {
    try {
        const payload = {
            "rankType": 1
        }


        // Coba generate signature saja untuk tes
        const testSig = getSignatureHeaders(payload);

        const url = `https://sapi.dramaboxdb.com/drama-box/he001/rank?timestamp=${testSig.timestamp}`;
        const requestHeaders = {
            ...headers,
            'sn': testSig.signature
        };
        const res = await axios.post(url, payload, { headers: requestHeaders })
        console.log(`✅ SUCCESS GET TRENDING`);
        return res.data.data.rankList;
    } catch (error) {
        throw error;
    }
}

const foryou = async () => {
    try {
        const payload = {
            "isNeedRank": 1,
            "specialColumnId": 0,
            "pageNo": getRandomNumber()
        }

        // Coba generate signature saja untuk tes
        const testSig = getSignatureHeaders(payload);

        const url = `https://sapi.dramaboxdb.com/drama-box/he001/recommendBook?timestamp=${testSig.timestamp}`;
        const requestHeaders = {
            ...headers,
            'sn': testSig.signature
        };
        const res = await axios.post(url, payload, { headers: requestHeaders })
        console.log(`✅ SUCCESS GET FORYOU`);
        return res.data.data.recommendList.records;
    } catch (error) {
        throw error;
    }
}

const vip = async () => {
    try {
        const payload = {
            "homePageStyle": 0,
            "isNeedRank": 1,
            "index": 4,
            "type": 0,
            "channelId": 205
        }

        // Coba generate signature saja untuk tes
        const testSig = getSignatureHeaders(payload);
        // console.log(testSig);

        // console.log(DramaboxApp.dramabox("test string"));

        const url = `https://sapi.dramaboxdb.com/drama-box/he001/theater?timestamp=${testSig.timestamp}`;
        const requestHeaders = {
            ...headers,
            'sn': testSig.signature
        };
        const res = await axios.post(url, payload, { headers: requestHeaders })
        console.log(`✅ SUCCESS GET VIP`);
        return res.data.data;
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
        console.log(`✅ SUCCESS GET DETAIL FOR ${bookId}`);

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
        console.error("❌ Detail Fetch Error:", error.message);
        throw error;
    }
}

const dubindo = async (classify, page) => {
    try {
        const payload = {
            "typeList": [
                {
                    "type": 1,
                    "value": ""
                },
                {
                    "type": 2,
                    "value": "1"
                },
                {
                    "type": 3,
                    "value": ""
                },
                {
                    "type": 4,
                    "value": ""
                },
                {
                    "type": 4,
                    "value": ""
                },
                {
                    "type": 5,
                    "value": classify // 1 = terpopuler, 2 = terbaru
                }
            ],
            "showLabels": false,
            "pageNo": page,
            "pageSize": 15
        }

        // Coba generate signature saja untuk tes
        const testSig = getSignatureHeaders(payload);
        // console.log(testSig);

        // console.log(DramaboxApp.dramabox("test string"));

        const url = `https://sapi.dramaboxdb.com/drama-box/he001/classify?timestamp=${testSig.timestamp}`;
        const requestHeaders = {
            ...headers,
            'sn': testSig.signature
        };
        const res = await axios.post(url, payload, { headers: requestHeaders })
        console.log(`✅ SUCCESS GET DUB INDO`);
        return res.data.data.classifyBookList.records;
    } catch (error) {
        throw error;
    }
}

export { latest, search, linkStream, trendings, foryou, populersearch, randomdrama, vip, detail, dubindo };
export default { latest, search, linkStream, trendings, foryou, populersearch, randomdrama, vip, detail, dubindo };