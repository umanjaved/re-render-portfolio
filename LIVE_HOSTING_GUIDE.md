# Live Admin Panel & Free Hosting Guide

This guide details how to host your **RE-RENDER** website and CMS for **100% free**, replace the browser cache/localStorage admin panel with a real permanent live backend, and manage live content updates worldwide.

---

## 1. What Was Fixed in Your Project

| Issue | What Was Wrong | How It Is Fixed |
|---|---|---|
| **Cannot Add Gallery Items** | Button opened empty media library; base64 uploads exceeded 5MB localStorage quota; no manual add option. | Added direct **`+ Add New Item`** button in folder modal; items can be images, videos, or ads; fixed array syncing and ID preservation. |
| **No Ad Option in Gallery** | No sponsor/banner/ad capabilities in gallery. | Added **Top Gallery Ad Banner** in admin settings and **In-Grid Ad Cards** (`type="ad"`) with sponsor links and glowing badges. |
| **Missing Cover Images** | Broken images if `f-preview` was left blank. | Added **`Auto Pick Cover`** button in folder editor + automatic dynamic fallback in `content-loader.js` from first video/image. |
| **Missing Video Posters** | Empty video posters caused black/broken squares. | Added **`Auto Poster`** per video + **`Auto Pick All Posters`** batch tool (extracts YouTube thumbnails and HTML5 video frames). |
| **Cache-Only Admin Panel** | Changes saved only to local browser cache, not visible to live visitors. | Created **`server.js`** live backend with `/api/save`, `/api/upload`, and `/api/site-data` to save permanently to disk. |
| **Auto-Save Annoyance** | Every keystroke auto-saved, causing lag and overwriting good data. | Replaced with prominent **`💾 PERMANENT SAVE`** button + optional draft auto-save toggle (disabled by default). |
| **Security Issues** | Plaintext password check in frontend code; no session management. | Added server-side token authentication (`/api/login`), password masking toggle, and secure session management. |

---

## 2. Best 100% Free Hosting Providers for Live Changes

To make your admin panel update live for all visitors worldwide (not just in your browser's local cache), you need a host that runs your Node.js backend. Here are the top free options:

### Option A: Render.com (Recommended — Easiest & 100% Free)
- **Free Tier**: Free Web Service with Node.js support, free SSL, custom domain support, and automated Git deploys.
- **Why It's Best**: Runs `server.js` directly with zero modifications. When you click **PERMANENT SAVE** in the admin panel, the changes are immediately live for all visitors worldwide.
- **Deploy Steps**:
  1. Create a free account at [render.com](https://render.com).
  2. Push your project folder to a GitHub repository (e.g., `re-render-site`).
  3. In Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
  4. Connect your GitHub repository.
  5. Set settings:
     - **Build Command**: `npm install` (or leave empty)
     - **Start Command**: `node server.js`
     - **Instance Type**: Free
  6. Under **Environment Variables**, set:
     - `ADMIN_PASSWORD`: Your secret admin password (e.g., `MySuperSecret2026`)
     - `PORT`: `8000`
  7. Click **Deploy Web Service**. You will get a live URL like `https://re-render.onrender.com`.

---

### Option B: Railway.app (Free Trial & Super Fast)
- **Free Tier**: Free monthly usage credits.
- **Why It's Great**: One-click deployment from GitHub.
- **Deploy Steps**:
  1. Go to [railway.app](https://railway.app) and sign in with GitHub.
  2. Click **New Project** $\rightarrow$ **Deploy from GitHub repo**.
  3. Select your repository. Railway automatically detects `package.json` and runs `node server.js`.
  4. Under **Variables**, add `ADMIN_PASSWORD`.
  5. Go to **Settings** $\rightarrow$ **Generate Domain** to get your live URL.

---

### Option C: Vercel + Supabase (Serverless + Free Cloud Database)
- **Free Tier**: Generous free tier on both Vercel and Supabase.
- **How It Works**:
  - Frontend hosted on Vercel.
  - Data stored in Supabase (free PostgreSQL + REST API).
  - Admin panel writes to Supabase REST API instead of a local JSON file.

---

## 3. How to Run & Test the Live Server Locally Right Now

You can run the live server on your machine immediately:

1. Open PowerShell or Command Prompt in the `POR` folder:
   ```powershell
   cd C:\Users\utech\Downloads\POR7\POR
   ```
2. Start the server:
   ```powershell
   node server.js
   ```
3. Open your browser:
   - **Website**: [http://localhost:8000](http://localhost:8000)
   - **Admin Panel**: [http://localhost:8000/admin/](http://localhost:8000/admin/)
4. Enter your master password (default: `rerender2026`).
5. Notice the sidebar status badge:
   `● LIVE SERVER (Permanent Save)`
6. Edit any folder, add new gallery items, configure ads, and click **PERMANENT SAVE**. Changes are saved directly to `site-data.json` and `folders.json` on disk!

---

## 4. How the New Gallery Features Work

### A. Adding Items to Any Folder
1. Go to **Folders** in the Admin sidebar.
2. Click **Edit Media** on any folder.
3. In the modal, click **`+ Add New Item`**.
4. Choose **Asset Type**:
   - **Image**: Enter title and image URL.
   - **Video**: Enter title, Video Source URL (YouTube, Vimeo, or MP4), and Aspect Ratio (16:9 for PC or 9:16 for Mobile/Shorts).
   - **Ad / Sponsor Card**: Enter sponsor title, banner media URL, sponsor website link, badge label (e.g. `SPONSORED`), and button text.
5. Click **Save Folder**, then click **`💾 PERMANENT SAVE`** in the sidebar.

### B. Auto Picking Video Poster & Folder Cover
- **For a single video**: Click **`📸 Auto Poster`** next to the poster input field. If it's a YouTube link, it pulls the high-resolution YouTube thumbnail. If it's a video file, it captures a video frame.
- **For all videos in a folder**: Click **`⚡ Auto Pick All Posters`** in the folder header.
- **For the folder cover preview**: Click **`📸 Auto Pick Cover`** next to the folder cover input field.

### C. Top Gallery Ad Banner
1. Go to **Folders** in the Admin sidebar.
2. Scroll to **Gallery Area Ad & Sponsor Settings**.
3. Check **Enable Top Ad Banner in Gallery**.
4. Fill in:
   - **Ad Title / Sponsor**: e.g., `EXCLUSIVE 20% DISCOUNT`
   - **Ad Description**: e.g., `Get the complete motion graphics template pack.`
   - **Ad Banner Image URL**: e.g., Unsplash or uploaded asset.
   - **Ad Link URL**: e.g., `https://partner.com`
   - **CTA Button**: e.g., `CLAIM OFFER`
5. Click **`💾 PERMANENT SAVE`**.
6. Open `gallery.html?folder=thumbnails` to see the glowing sponsor banner above the grid.
