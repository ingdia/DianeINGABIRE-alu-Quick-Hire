// File: server.js (Refined for Clarity and Public Asset Handling)

require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('./database/database');

const sessions = {};

// --- Helper Functions (No changes needed) ---
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


const server = http.createServer((req, res) => {
    const { method, url } = req;
    const cookies = querystring.parse(req.headers.cookie, '; ');
    const sessionID = cookies.sessionID;
    const userEmail = sessions[sessionID];

    console.log(`[${new Date().toISOString()}] ${method} ${url}`);

    // --- GET REQUEST ROUTER ---
    if (method === 'GET') {
        // Route for main pages
        if (url === '/login') return serveStaticFile('views/login.html', 'text/html', res);
        if (url === '/register') return serveStaticFile('views/register.html', 'text/html', res);

        // Route for dashboard access control
        if (url === '/' || url === '/dashboard') {
            if (userEmail) return serveStaticFile('views/dashboard.html', 'text/html', res);
            // If not logged in, redirect to login page
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }

        // --- REFINED ASSET ROUTE ---
        // This single block handles all public assets:
        // /public/auth-styles.css
        // /public/styles.css
        // /public/app.js
        // etc.
        if (url.startsWith('/public/')) {
            const filePath = path.join(__dirname, url);
            let contentType = 'text/plain'; // Default content type
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
            return; // Important: Stop execution after handling the asset
        }
        
        // --- ADDED: Simple Logout Route ---
        if (url === '/logout') {
            if(sessionID) {
                delete sessions[sessionID]; // Remove the session from our memory
            }
            // Expire the cookie and redirect to login
            res.writeHead(302, {
                'Set-Cookie': `sessionID=; HttpOnly; Path=/; Max-Age=0`,
                'Location': '/login'
            });
            return res.end();
        }
        
        // Fallback for any other GET request that wasn't handled
        // res.writeHead(404);
        // res.end('Page Not Found');
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
                // Your register logic here... (it's correct)
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
                    res.end(JSON.stringify({ success: false, message: 'Server error.' }));
                }

            } else if (url === '/login') {
                 // Your login logic here... (it's correct)
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
                    res.end(JSON.stringify({ success: false, message: 'Server error.' }));
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