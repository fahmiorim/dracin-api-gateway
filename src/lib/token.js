import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { DramaboxApp } from "./sign.js";
import crypto from "crypto";

// generate token function
function randomAndroidId() {
  return "00000000" + crypto.randomBytes(16).toString("hex") + "00000000";
}

async function token() {
  const headers =   {
          "accept-encoding": "gzip",
          "active-time": "48610",
          "afid": "1765426707100-3399426610238541236",
          "android-id": randomAndroidId(),
          "apn": "0",
          "brand": "vivo",
          "build": "Build/PQ3A.190705.09121607",
          "cid": "DAUAG1064236",
          "connection": "Keep-Alive",
          "content-type": "application/json; charset=UTF-8",
          "country-code": "ID",
          "current-language": "in",
          "device-id": uuidv4(),
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
          "nchid": "DRA1000000",
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
          "vn": "4.9.0",
        }

function getSignatureHeaders(payload) {
    const timestamp = Date.now();
    
    const deviceId = headers["device-id"];
    const androidId = headers["android-id"];
    const tn = headers["tn"];

    const strPayload = `timestamp=${timestamp}${JSON.stringify(payload)}${deviceId}${androidId}${tn}`;
    const signature = DramaboxApp.dramabox(strPayload);
    return {
        signature: signature,
        timestamp: timestamp.toString()
    };
}

const payload = {};
const testSig = getSignatureHeaders(payload);
const url = `https://sapi.dramaboxdb.com/drama-box/ap001/bootstrap?timestamp=${testSig.timestamp}`;
const requestHeaders = {
            ...headers,
            'sn': testSig.signature
        };
const res = await axios.post(url, payload, { headers: requestHeaders })
const result = {
    token: res.data.data.user.token,
    deviceid: uuidv4(),
    androidid: randomAndroidId()
    
}
return result;
}

export default token;