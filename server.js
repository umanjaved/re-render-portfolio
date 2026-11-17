// ==============================================================================
// RE-RENDER LIVE CMS SERVER
// Lightweight, Zero-Dependency Node.js Live Backend & Static Server
// Handles: Live API data sync, Permanent Save to disk, Media uploads, Auth
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 8000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Active session tokens
const activeSessions = new Set();

// MIME Types Map
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf'
};

// Helper: Get Admin Password from environment or site-data.json
function getAdminPassword() {
    if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
    try {
        const siteDataPath = path.join(DATA_DIR, 'site-data.json');
        if (fs.existsSync(siteDataPath)) {
            const raw = fs.readFileSync(siteDataPath, 'utf8');
            const data = JSON.parse(raw);
            if (data.global && data.global.adminPassword) {
                return data.global.adminPassword;
            }
        }
    } catch (e) {
        console.error('Error reading admin password from site-data.json:', e);
    }
    return 'rerender2026';
}

// Helper: Parse JSON body
function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 50 * 1024 * 1024) { // 50MB limit
                req.destroy();
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

// Helper: Send JSON response
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token, X-File-Name'
    });
    res.end(JSON.stringify(data));
}

// Helper: Verify Session Token
function isAuthorized(req) {
    const authHeader = req.headers['authorization'] || '';
    const tokenHeader = req.headers['x-admin-token'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || tokenHeader;
    return activeSessions.has(token);
}

// HTTP Server
const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token, X-File-Name',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // ----------------------------------------------------
    // API ROUTES
    // ----------------------------------------------------

    // 1. Health check & live status
    if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
            status: 'ok',
            live: true,
            message: 'RE-RENDER Live Backend Active',
            timestamp: new Date().toISOString()
        });
    }

    // 2. Login Endpoint
    if (pathname === '/api/login' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            const masterPass = getAdminPassword();
            if (body.password === masterPass) {
                const token = crypto.randomBytes(32).toString('hex');
                activeSessions.add(token);
                return sendJson(res, 200, {
                    success: true,
                    token: token,
                    message: 'Authentication successful'
                });
            } else {
                return sendJson(res, 401, {
                    success: false,
                    error: 'Incorrect admin password'
                });
            }
        } catch (e) {
            return sendJson(res, 400, { success: false, error: 'Invalid request' });
        }
    }

    // 3. GET /api/site-data
    if (pathname === '/api/site-data' && req.method === 'GET') {
        try {
            const filePath = path.join(DATA_DIR, 'site-data.json');
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Access-Control-Allow-Origin': '*'
                });
                return res.end(content);
            } else {
                return sendJson(res, 404, { error: 'site-data.json not found' });
            }
        } catch (e) {
            return sendJson(res, 500, { error: e.message });
        }
    }

    // 4. GET /api/folders
    if (pathname === '/api/folders' && req.method === 'GET') {
        try {
            const filePath = path.join(DATA_DIR, 'folders.json');
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Access-Control-Allow-Origin': '*'
                });
                return res.end(content);
            } else {
                return sendJson(res, 404, { error: 'folders.json not found' });
            }
        } catch (e) {
            return sendJson(res, 500, { error: e.message });
        }
    }

    // 5. POST /api/save (Permanent Save to Disk)
    if (pathname === '/api/save' && req.method === 'POST') {
        try {
            // Check authorization token
            if (!isAuthorized(req)) {
                // If token missing, check if provided in body or allow local development
                // We also check password in body if provided
            }

            const body = await parseJsonBody(req);
            
            // Password or token validation
            const masterPass = getAdminPassword();
            const tokenValid = isAuthorized(req);
            const passValid = body.adminPassword === masterPass || body.password === masterPass;

            if (!tokenValid && !passValid && process.env.NODE_ENV === 'production') {
                return sendJson(res, 403, { success: false, error: 'Unauthorized save attempt' });
            }

            let savedFiles = [];

            // 1) Save siteData
            if (body.siteData) {
                const siteDataPath = path.join(DATA_DIR, 'site-data.json');
                // Create backup before writing
                if (fs.existsSync(siteDataPath)) {
                    fs.copyFileSync(siteDataPath, path.join(DATA_DIR, 'site-data.json.bak'));
                }
                fs.writeFileSync(siteDataPath, JSON.stringify(body.siteData, null, 2), 'utf8');
                savedFiles.push('site-data.json');
            }

            // 2) Save foldersData (ensure it is always a clean array)
            if (body.foldersData) {
                let foldersToSave = body.foldersData;
                if (!Array.isArray(foldersToSave) && foldersToSave.value && Array.isArray(foldersToSave.value)) {
                    foldersToSave = foldersToSave.value;
                }
                const foldersPath = path.join(DATA_DIR, 'folders.json');
                // Create backup before writing
                if (fs.existsSync(foldersPath)) {
                    fs.copyFileSync(foldersPath, path.join(DATA_DIR, 'folders.json.bak'));
                }
                fs.writeFileSync(foldersPath, JSON.stringify(foldersToSave, null, 2), 'utf8');
                savedFiles.push('folders.json');
            }

            console.log(`[PERMANENT SAVE SUCCESS] Updated: ${savedFiles.join(', ')} at ${new Date().toISOString()}`);

            return sendJson(res, 200, {
                success: true,
                savedFiles: savedFiles,
                timestamp: new Date().toISOString(),
                message: 'All changes permanently saved to disk & live server!'
            });
        } catch (e) {
            console.error('[SAVE ERROR]:', e);
            return sendJson(res, 500, { success: false, error: e.message });
        }
    }

    // 6. POST /api/upload (Permanent Media File Upload)
    if (pathname === '/api/upload' && req.method === 'POST') {
        try {
            const fileNameHeader = req.headers['x-file-name'] || ('media_' + Date.now());
            // Sanitize file name
            const ext = path.extname(fileNameHeader) || '.png';
            const base = path.basename(fileNameHeader, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
            const finalFileName = `${base}_${Date.now()}${ext}`;
            const targetPath = path.join(UPLOADS_DIR, finalFileName);

            const fileStream = fs.createWriteStream(targetPath);
            req.pipe(fileStream);

            fileStream.on('finish', () => {
                const publicUrl = `/uploads/${finalFileName}`;
                return sendJson(res, 200, {
                    success: true,
                    path: publicUrl,
                    filename: finalFileName
                });
            });

            fileStream.on('error', (err) => {
                console.error('[UPLOAD STREAM ERROR]:', err);
                return sendJson(res, 500, { success: false, error: 'Upload stream failed' });
            });
            return;
        } catch (e) {
            console.error('[UPLOAD ERROR]:', e);
            return sendJson(res, 500, { success: false, error: e.message });
        }
    }

    // ----------------------------------------------------
    // STATIC FILE SERVING
    // ----------------------------------------------------
    let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        return res.end('Access Denied');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Check if it's a directory with index.html
            const possibleIndex = path.join(filePath, 'index.html');
            if (fs.existsSync(possibleIndex)) {
                filePath = possibleIndex;
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                return res.end('404 Not Found');
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Add Cache-Control:
        // No-cache for JSON files and HTML to ensure live updates
        const headers = { 'Content-Type': contentType };
        if (ext === '.json' || ext === '.html') {
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        } else {
            headers['Cache-Control'] = 'public, max-age=86400';
        }

        res.writeHead(200, headers);
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 RE-RENDER LIVE CMS SERVER RUNNING`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🛠️  Admin Panel: http://localhost:${PORT}/admin/`);
    console.log(`💾 Live Permanent Save: ACTIVE`);
    console.log(`=======================================================`);
});
