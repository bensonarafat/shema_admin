# Shema Admin Portal — Hymns & Cloudflare R2 Upload Studio

A dedicated, minimalist web studio for uploading hymns, multi-stem audio files, and lyrics to **Cloudflare R2** and **Firebase Firestore** for the Shema iOS app.

Built following the clean Paydora flat aesthetic: **strictly zero gradients, zero borders, and zero shadows**.

---

## Features

- 🔐 **OAuth Login**: Google Sign-In powered by Firebase Auth (`shema-63731`), with an instant "Dev Preview" mode for local development.
- 📁 **Smart Folder Generator**: Automatically maps titles like `"Amazing Grace"` to `hymns/amazing-grace/`.
- 🎛 **4 Dedicated Asset Slots**:
  - **Cover Artwork / Background**: `cover.jpg` / `cover.mp4`
  - **Lead Vocal Stem**: `vocal.mp3` (with in-browser player preview & automatic duration calculator)
  - **Instrumental Backing**: `instrumental.mp3` (with in-browser player preview)
  - **Congregation Choir**: `congregation.mp3` (with in-browser player preview)
- 📝 **`lyricsFullText` Editor**: Dedicated editor formatted for verses and chorus (`Verse 1\n...\n\nChorus\n...`).
- ⚡️ **Direct Cloudflare R2 Uploads**: Browser-to-R2 streaming via S3-compatible parallel upload with real-time percentage progress bars.
- 📋 **Catalog & Multi-Stem Library**: Browse, search, filter, and listen to individual audio stems.

---

## Getting Started

### 1. Install & Run Dev Server

```bash
cd shema_admin
npm install --legacy-peer-deps
npm run dev
```

Visit: `http://localhost:5173`

### 2. Configure Cloudflare R2

Click **"Cloudflare R2"** in the sidebar (or top right settings) to enter your credentials:
- **Cloudflare Account ID**
- **R2 Access Key ID**
- **R2 Secret Access Key**
- **Bucket Name** (e.g. `shema-assets`)
- **Public Domain** (e.g. `https://pub-xxxxxx.r2.dev` or `https://cdn.shema.app`)

Credentials are saved locally in browser storage or can be placed in `shema_admin/.env`.

### 3. Cloudflare R2 Bucket CORS

In **Cloudflare Dashboard > R2 > Your Bucket > Settings > CORS Policy**, add:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
