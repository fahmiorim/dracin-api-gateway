# Dramabox API

API tidak resmi untuk mengakses konten dari Dramabox. Proyek ini menyediakan endpoint REST API untuk mengambil data drama, episode, dan link streaming.

## Prasyarat

- [Node.js](https://nodejs.org/) versi 18 atau lebih baru
- npm atau pnpm

## Instalasi

1.  Clone repository ini:
    ```bash
    git clone <url-repository>
    cd dramabox-api
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    # atau
    npm install
    ```

## Cara Menjalankan

Jalankan server dengan perintah:

```bash
node index.js
```

Server akan berjalan di `http://localhost:4343`. Dokumentasi API tersedia di halaman utama.

## Referensi API

Base URL: `http://localhost:4343/api`

| Endpoint             | Method | Parameter           | Deskripsi                                   |
| -------------------- | ------ | ------------------- | ------------------------------------------- |
| `/latest`            | GET    | -                   | Mendapatkan daftar drama terbaru            |
| `/trending`          | GET    | -                   | Mendapatkan daftar drama trending           |
| `/for-you`           | GET    | -                   | Mendapatkan rekomendasi drama               |
| `/vip`               | GET    | -                   | Mendapatkan konten VIP                      |
| `/random`            | GET    | -                   | Mendapatkan video drama acak                |
| `/popular-searches`  | GET    | -                   | Mendapatkan kata kunci pencarian populer    |
| `/search`            | GET    | `query` (wajib)     | Mencari drama berdasarkan kata kunci        |
| `/detail`            | GET    | `bookId` (wajib)    | Mendapatkan detail drama berdasarkan ID     |
| `/episodes`          | GET    | `bookId` (wajib)    | Mendapatkan daftar episode & link streaming |
| `/dubbed`            | GET    | `classify`, `page`  | Mendapatkan drama dengan dubbing Indonesia  |

### Contoh Penggunaan

**Mencari Drama:**
```bash
curl "http://localhost:4343/api/search?query=love"
```

**Mendapatkan Episode:**
```bash
curl "http://localhost:4343/api/episodes?bookId=12345"
```

**Drama Dubbing Indonesia:**
```bash
# classify: terpopuler atau terbaru
curl "http://localhost:4343/api/dubbed?classify=terpopuler&page=1"
```

## Catatan Penting

- API ini menggunakan cache selama 2 jam untuk menghemat resource.
- Jika terjadi error "IP terkena limit", tunggu beberapa menit sebelum mencoba lagi.
