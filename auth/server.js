// Import Node.js built-in modules
const http = require('http');
const fs = require('fs');
const querystring = require('querystring');
const crypto = require('crypto'); // For password hashing

// A simple in-memory database to store users.
// In a real application, you would use a proper database (e.g., PostgreSQL, MongoDB).
// NOTE: This data is wiped every time the server restarts.
const users = {};

/**
 * A helper function to serve static files (HTML, CSS)
 * @param {string} filePath - Path to the file to serve
 * @param {string} contentType - The MIME type of the file
 * @param {http.ServerResponse} res - The response object
 */
function serveFile(filePath, contentType, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 - Internal Server Error');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Create the HTTP server
const server = http.createServer((req, res) => {
    const { method, url } = req;

    // --- ROUTING ---

    // GET requests: Serve the HTML/CSS files
    if (method === 'GET') {
        if (url === '/' || url === '/register') {
            return serveFile('/register.html', 'text/html', res);
        }
        if (url === '/login') {
            return serveFile('/login.html', 'text/html', res);
        }
        if (url === '/styles.css') {
            return serveFile('/style.css', 'text/css', res);
        }
    }

    // POST requests: Handle form submissions
    if (method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString(); // Collect form data
        });

        req.on('end', () => {
            const formData = querystring.parse(body);
            const { email, password } = formData;

            // --- REGISTRATION LOGIC ---
            if (url === '/register') {
                if (!email || !password) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    return res.end('Email and password are required.');
                }
                if (users[email]) {
                    res.writeHead(409, { 'Content-Type': 'text/plain' });
                    return res.end('User with this email already exists.');
                }

                // Securely hash the password
                const salt = crypto.randomBytes(16).toString('hex');
                crypto.scrypt(password, salt, 64, (err, derivedKey) => {
                    if (err) throw err;
                    
                    // Store the user with the hashed password and salt
                    users[email] = {
                        password: `${salt}:${derivedKey.toString('hex')}`
                    };
                    
                    console.log('New user registered:', email);
                    console.log('Current users:', users);

                    // Redirect to login page on success
                    res.writeHead(302, { 'Location': '/login' });
                    res.end();
                });
            }

            // --- LOGIN LOGIC ---
            if (url === '/login') {
                if (!email || !password) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    return res.end('Email and password are required.');
                }

                const user = users[email];
                if (!user) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    return res.end('Invalid email or password.');
                }
                
                const [salt, key] = user.password.split(':');
                crypto.scrypt(password, salt, 64, (err, derivedKey) => {
                    if (err) throw err;

                    // Use crypto.timingSafeEqual to prevent timing attacks
                    const keyBuffer = Buffer.from(key, 'hex');
                    const derivedKeyBuffer = Buffer.from(derivedKey);

                    if (crypto.timingSafeEqual(keyBuffer, derivedKeyBuffer)) {
                        // In a real app, you would create a session here
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<h1>Login Successful!</h1><p>Welcome back.</p>');
                    } else {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Invalid email or password.');
                    }
                });
            }
        });
        return; // Return early to avoid falling through
    }
    
    // Handle 404 Not Found for any other requests
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Go to http://localhost:3000/register to sign up.');
});