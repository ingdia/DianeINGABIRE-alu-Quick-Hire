// File: server.js

// We no longer need dotenv for the database, but it's good practice to keep it
// in case you add other environment variables later (like for an API key).
require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
// This now correctly requires your new SQLite database module
const db = require('./database/database');

const sessions = {};

// --- Helper Functions ---
// (These functions are correct, no changes needed)

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

// --- Main Server Logic ---
// (This logic is correct, no changes needed)

const server = http.createServer((req, res) => {
    const { method, url } = req;
    const cookies = querystring.parse(req.headers.cookie, '; ');
    const sessionID = cookies.sessionID;
    const userEmail = sessions[sessionID];

    console.log(`[${new Date().toISOString()}] ${method} ${url}`);

    if (method === 'GET') {
        if (url === '/login') return serveStaticFile('views/login.html', 'text/html', res);
        if (url === '/register') return serveStaticFile('views/register.html', 'text/html', res);
        if (url === '/style.css') return serveStaticFile('views/style.css', 'text/css', res);

        if (url === '/' || url === '/dashboard') {
            if (userEmail) return serveStaticFile('views/dashboard.html', 'text/html', res);
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }

        if (url.startsWith('/public/')) {
            const filePath = path.join('.', url);
            const contentType = url.endsWith('.css') ? 'text/css' : (url.endsWith('.js') ? 'application/javascript' : 'text/plain');
            return serveStaticFile(filePath, contentType, res);
        }
    }

    if (method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            const formData = querystring.parse(body);

            if (url === '/register') {
                try {
                    const existingUser = await db.findUserByEmail(formData.email);
                    if (existingUser) {
                        res.writeHead(409);
                        return res.end('User already exists.');
                    }
                    const passwordHash = hashPassword(formData.password);
                    await db.createUser(formData.email, passwordHash);
                    res.writeHead(302, { 'Location': '/login' });
                    res.end();
                } catch (err) {
                    console.error('Registration error:', err);
                    res.writeHead(500);
                    res.end('Server error during registration.');
                }
            } else if (url === '/login') {
                try {
                    const user = await db.findUserByEmail(formData.email);
                    if (!user || !verifyPassword(formData.password, user.password_hash)) {
                        res.writeHead(401);
                        return res.end('Invalid credentials.');
                    }
                    const newSessionID = uuidv4();
                    sessions[newSessionID] = user.email;
                    res.writeHead(302, {
                        'Set-Cookie': `sessionID=${newSessionID}; HttpOnly; Path=/; Max-Age=86400`,
                        'Location': '/dashboard'
                    });
                    res.end();
                } catch (err) {
                    console.error('Login error:', err);
                    res.writeHead(500);
                    res.end('Server error during login.');
                }
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });
    }
});

// --- Server Startup ---
// (This is the corrected part)

const PORT = process.env.PORT || 3000;

// The database connection is now handled inside 'database/database.js'.
// We can just start the server directly.
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});