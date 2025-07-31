// File: database/database.js

const sqlite3 = require('sqlite3').verbose();

// This will create a file named 'quickhire.db' in your project folder.
const db = new sqlite3.Database('./quickhire.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create the users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// We wrap the database calls in Promises to use async/await in server.js
function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], (err, row) => {
      if (err) {
        reject(err);
      }
      resolve(row);
    });
  });
}

function createUser(email, passwordHash) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO users (email, password_hash) VALUES (?, ?)';
    db.run(sql, [email, passwordHash], function(err) {
      if (err) {
        reject(err);
      }
      // 'this.lastID' gives us the ID of the new user
      resolve({ id: this.lastID, email: email });
    });
  });
}

module.exports = { findUserByEmail, createUser };