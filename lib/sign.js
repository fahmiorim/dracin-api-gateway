import crypto from "crypto";
import axios from "axios";

export function decodeString (str = "") {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 33 && c <= 126) { // printable ASCII
      c -= 20;
      if (c < 33) c += 126 - 33;
    }
    result += String.fromCharCode(c);
  }
  return result;
}

export class DramaboxApp {
  static #privateKey = null;

  static #initPrivateKey() {
    try {
      const part1 =
        "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Q4Y5QX5j08HrnbY3irfKdkEllAU2OORnAjlXDyCzcm2Z6ZRrGvtTZUAMelfU5PWS6XGEm3d4kJEKbXi4Crl8o2E/E3YJPk1lQD1d0JTdrvZleETN1ViHZFSQwS3L94Woh0E3TPebaEYq88eExvKu1tDdjSoFjBbgMezySnas5Nc2xF28";
      const part2 = decodeString(
        `l|d,WL$EI,?xyw+*)^#?U\`[whXlG\`-GZif,.jCxbKkaY"{w*y]_jax^/1iVDdyg(Wbz+z/$xVjCiH0lZf/d|%gZglW)"~J,^~}w"}m(E'eEunz)eyEy\`XGaVF|_(Kw)|awUG"'{{e#%$0E.ffHVU++$giHzdvC0ZLXG|U{aVUUYW{{YVU^x),J'If\`nG|C[\`ZF),xLv(-H'}ZIEyCfke0dZ%aU[V)"V0}mhKvZ]Gw%-^a|m'\`\\f}{(~kzi&zjG+|fXX0$IH#j\`+hfnME"|fa/{.j.xf,"LZ.K^bZy%c.W^/v{x#(J},Ua,ew#.##K(ki)$LX{a-1\\MG/zL&JlEKEw'Hg|D&{EfuKYM[nGKx1V#lFu^V_LjVzw+n%+,Xd`
      );
      const part3 =
        "x52e71nafqfbjXxZuEtpu92oJd6A9mWbd0BZTk72ZHUmDcKcqjfcEH19SWOphMJFYkxU5FRoIEr3/zisyTO4Mt33ZmwELOrY9PdlyAAyed7ZoH+hlTr7c025QROvb2LmqgRiUT56tMECgYEA+jH5m6iMRK6XjiBhSUnlr3DzRybwlQrtIj5sZprWe2my5uYHG3jbViYIO7GtQvMTnDrBCxNhuM6dPrL0cRnbsp/iBMXe3pyjT/aWveBkn4R+UpBsnbtDn28r1MZpCDtr5UNc0TPj4KFJvjnV/e8oGoyYEroECqcw1LqNOGDiLhkCgYEAwaemNePYrXW+MVX/hatfLQ96tpxwf7yuHdENZ2q5AFw73GJWYvC8VY+TcoKPAmeoCUMltI3TrS6K5Q/GoLd5K2BsoJrSxQNQFd3ehWAtdOuPDvQ5rn/2fsvgvc3rOvJh7uNnwEZCI/45WQg+UFWref4PPc+ArNtp9Xj2y7LndwkCgYARojIQeXmhYZjG6JtSugWZLuHGkwUDzChYcIPd";
      const part4 =
        "W25gdluokG/RzNvQn4+W/XfTryQjr7RpXm1VxCIrCBvYWNU2KrSYV4XUtL+B5ERNj6In6AOrOAifuVITy5cQQQeoD+AT4YKKMBkQfO2gnZzqb8+ox130e+3K/mufoqJPZeyrCQKBgC2fobjwhQvYwYY+DIUharri+rYrBRYTDbJYnh/PNOaw1CmHwXJt5PEDcml3+NlIMn58I1X2U/hpDrAIl3MlxpZBkVYFI8LmlOeR7ereTddN59ZOE4jY/OnCfqA480Jf+FKfoMHby5lPO5OOLaAfjtae1FhrmpUe3EfIx9wVuhKBAoGBAPFzHKQZbGhkqmyPW2ctTEIWLdUHyO37fm8dj1WjN4wjRAI4ohNiKQJRh3QE11E1PzBTl9lZVWT8QtEsSjnrA/tpGr378fcUT7WGBgTmBRaAnv1P1n/Tp0TSvh5XpIhhMuxcitIgrhYMIG3GbP9JNAarxO/qPW6Gi0xWaF7il7Or";

      const fullPem = part1 + part2 + part3 + part4;
      const formattedKey = `-----BEGIN PRIVATE KEY-----\n${fullPem}\n-----END PRIVATE KEY-----`;

      DramaboxApp.#privateKey = crypto.createPrivateKey({
        key: formattedKey,
        format: "pem",
      });
      // console.log(DramaboxApp.#privateKey);
    } catch (err) {
      console.error("[dramaboxapp] Failed to initialize private key:", err);
    }
  }

  static sign(str) {
    if (!DramaboxApp.#privateKey) DramaboxApp.#initPrivateKey();
    try {
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(Buffer.from(str, "utf-8"));
      const signature = sign.sign(DramaboxApp.#privateKey);
      return signature.toString("base64");
    } catch (err) {
      console.error("[dramaboxapp] Sign error:", err);
      return null;
    }
  }

  static dramabox(str) {
    return DramaboxApp.sign(str);
  }
}

export function getSignatureHeaders(payload) {
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

export const headers = {
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
          "nchid": "DRA1000000",
          "ov": "9",
          "over-flow": "new-fly",
          "p": "51",
          "package-name": "com.storymatrix.drama",
          "pline": "ANDROID",
          // "sn":
          //   "MfRjQ1HTcBCf5jX3XU4IPqF3w0/DA/osrXA5BWd4P6R2N4fZhLHomNzaUtK7ANCblV1FmO1W4njfzOL1WUT9FPKIJxs1geI+nw6wxFFlZLlpEnpoPCSAWbjfdovg3CLXt7Nfm1PAzETQcoOQCppfjyQn+DeHHtR1aoAOoMXkEc+haAVlN2k4+O1LpXWFA+5vntVQVzwA4w8oemj4Usm7tF9XmG5s9hYAcziOh/bVm2O2uLmz+KC0CGm12Xr+gZN3L9XPRirE4oCt5AfmVXQAAsR7ntC6M6VejiOoD3xx4NAJmsSXVq8uS/rHk5ocNHumCtFtB2b8ADkpc+a9ikw9Zw==",
          "srn": "900x1600",
          "store-source": "store_google",
          "time-zone": "+0800",
          "tn":
            "Bearer ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnlaV2RwYzNSbGNsUjVjR1VpT2lKVVJVMVFJaXdpZFhObGNrbGtJam96TURNeE5qVXpOREo5LkZqak1QT2sxbGo3Rkp3Z2NQdElBU0d3eWRzUnFDbXYyMV90RlJSN0dHTms=",
          "tz": "-480",
          "user-agent": "okhttp/4.10.0",
          "userid": "359146421",
          "version": "490",
          "vn": "4.9.0",
        }


// console.log(DramaboxApp.dramabox("test string"));
export const dramabox = DramaboxApp.dramabox;