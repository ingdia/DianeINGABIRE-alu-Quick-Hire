// File: server.js

require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('./database/database');
const fetch = require('node-fetch');

// In-memory session store. A real application would use a database like Redis.
const sessions = {};

// --- HELPER FUNCTIONS ---

function serveStaticFile(filePath, contentType, res) {
    const fullPath = path.join(__dirname, filePath);
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            console.error(`Error reading file: ${fullPath}`, err);
            res.writeHead(500);
            return res.end('Error loading file.');
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    try {
        if (!password || !storedHash) return false;
        const [salt, key] = storedHash.split(':');
        if (!salt || !key) return false;
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        const keyBuffer = Buffer.from(key, 'hex');
        const hashBuffer = Buffer.from(hash, 'hex');
        if (keyBuffer.length !== hashBuffer.length) return false;
        return crypto.timingSafeEqual(keyBuffer, hashBuffer);
    } catch (error) {
        console.error("Error verifying password:", error);
        return false;
    }
}


// --- MAIN HTTP SERVER ---

const server = http.createServer(async (req, res) => {
    const { method, url } = req;
    const cookies = querystring.parse(req.headers.cookie, '; ');
    const sessionID = cookies.sessionID;
    const userEmail = sessions[sessionID];

    // Log every incoming request for easier debugging
    console.log(`[${new Date().toISOString()}] ${method} ${url}`);

    // --- GET REQUEST ROUTER ---
    if (method === 'GET') {
        // Serve main HTML pages
        if (url === '/login') return serveStaticFile('views/login.html', 'text/html', res);
        if (url === '/register') return serveStaticFile('views/register.html', 'text/html', res);

        // Serve all static assets (CSS, Frontend JS) from the /public directory
        if (url.startsWith('/public/')) {
            const filePath = path.join(__dirname, url);
            let contentType = 'text/plain';
            if (url.endsWith('.css')) contentType = 'text/css';
            if (url.endsWith('.js')) contentType = 'application/javascript';
            
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    console.error(`Asset not found: ${filePath}`);
                    res.writeHead(404);
                    return res.end('Asset Not Found');
                }
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            });
            return;
        }
        
        // Protect the dashboard route
        if (url === '/' || url === '/dashboard') {
            if (userEmail) return serveStaticFile('views/dashboard.html', 'text/html', res);
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }

        // Secure Backend API Proxy for Jooble
        if (url.startsWith('/api/jobs')) {
            if (!userEmail) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ message: 'Unauthorized. Please log in first.' }));
            }

            const joobleApiKey = process.env.JOOBLE_API_KEY;
            if (!joobleApiKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ message: 'Jooble API Key not configured on the server.' }));
            }

            const requestUrl = new URL(req.url, `http://${req.headers.host}`);
            const query = requestUrl.searchParams.get('query') || 'Project Manager';
            
            const joobleApiUrl = 'https://jooble.org/api/' + joobleApiKey;
            const joobleRequestOptions = {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keywords: query })
            };

            try {
                const apiResponse = await fetch(joobleApiUrl, joobleRequestOptions);
                const joobleData = await apiResponse.json();

                // Translate Jooble's data structure to the one our frontend expects
                const mappedJobs = (joobleData.jobs || []).map(job => ({
                    job_id: job.link,
                    job_title: job.title,
                    employer_name: job.company,
                    employer_logo: 'https://i.imgur.com/DNLN3Q1.png', // Default logo
                    job_city: job.location,
                    job_employment_type: job.type || 'Full-time',
                    job_apply_link: job.link,
                    job_description: job.snippet,
                    job_highlights: { Qualifications: [], Responsibilities: [] }
                }));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ data: mappedJobs })); // Wrap in 'data' property
            } catch (error) {
                console.error('Jooble API Proxy Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to fetch data from Jooble API.' }));
            }
            return;
        }

        // +++ ADDED: Secure API Route to get the current user's profile info +++
        if (url === '/api/me') {
            if (!userEmail) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, message: 'Not authenticated' }));
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, email: userEmail }));
            return;
        }

        // Functional logout route
        if (url === '/logout') {
            if (sessionID) delete sessions[sessionID];
            res.writeHead(302, {
                'Set-Cookie': 'sessionID=; HttpOnly; Path=/; Max-Age=0',
                'Location': '/login'
            });
            return res.end();
        }
    }

    // --- POST REQUEST ROUTER ---
    if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            let formData;
            const contentType = req.headers['content-type'];

            if (contentType === 'application/json') {
                try {
                    formData = JSON.parse(body);
                } catch (e) {
                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ success: false, message: 'Invalid JSON format.' }));
                }
            } else {
                formData = querystring.parse(body);
            }
            
            res.setHeader('Content-Type', 'application/json');

            if (url === '/register') {
                try {
                    if (!formData.email || !formData.password) {
                        res.statusCode = 400;
                        return res.end(JSON.stringify({ success: false, message: 'Email and password are required.' }));
                    }
                    const existingUser = await db.findUserByEmail(formData.email);
                    if (existingUser) {
                        res.statusCode = 409;
                        return res.end(JSON.stringify({ success: false, message: 'User already exists.' }));
                    }
                    const passwordHash = hashPassword(formData.password);
                    await db.createUser(formData.email, passwordHash);
                    res.statusCode = 201;
                    res.end(JSON.stringify({ success: true, redirectUrl: '/login' }));
                } catch (err) {
                    console.error('Registration error:', err);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, message: 'Server error during registration.' }));
                }
            } else if (url === '/login') {
                try {
                    if (!formData.email || !formData.password) {
                        res.statusCode = 400;
                        return res.end(JSON.stringify({ success: false, message: 'Email and password are required.' }));
                    }
                    const user = await db.findUserByEmail(formData.email);
                    if (!user || !verifyPassword(formData.password, user.password_hash)) {
                        res.statusCode = 401;
                        return res.end(JSON.stringify({ success: false, message: 'Invalid credentials.' }));
                    }
                    const newSessionID = uuidv4();
                    sessions[newSessionID] = user.email;
                    res.setHeader('Set-Cookie', `sessionID=${newSessionID}; HttpOnly; Path=/; Max-Age=86400`);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, redirectUrl: '/dashboard' }));
                } catch (err) {
                    console.error('Login error:', err);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, message: 'Server error during login.' }));
                }
            } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, message: 'Endpoint not found.' }));
            }
        });
    }
});


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});