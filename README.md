#  QuickHire

QuickHire is a simple Node.js-based job board web application. It allows users to register, log in, and view a personalized dashboard. The project uses a local SQLite database and features a minimal frontend built with HTML/CSS and JavaScript.

---

##  Features

- User Registration & Login
- Basic Authentication (without Express)
- Dashboard for logged-in users
- SQLite for data storage
- Docker-ready for containerized deployment

---

##  Tech Stack

- **Backend:** Node.js (No Express)
- **Frontend:** HTML, CSS, JavaScript
- **Database:** SQLite (via `quickhire.db`)
- **Containerization:** Docker

---

##  Folder Structure

├── database/ # Database setup and connection
│ └── database.js
├── public/ # Public static files (scripts and styles)
│ ├── app.js
│ ├── auth_handler.js
│ ├── dashboard_handler.js
│ ├── auth-styles.css
│ └── styles.css
├── views/ # HTML pages
│ ├── login.html
│ ├── register.html
│ └── dashboard.html
├── .env # Environment variables (e.g., PORT)
├── Dockerfile # Docker container configuration
├── server.js # Main server file (Node.js, no Express)
├── quickhire.db # SQLite database file
├── package.json # NPM dependencies
└── README.md # Project documentation


##  Getting Started (Locally)

### 1. Clone the repository

```bash
git clone https://github.com/ingdia/DianeINGABIRE-alu-Quick-Hire.git
cd DianeINGABIRE-alu-Quick-Hire
2. Install dependencies
npm install
3. Configure environment
Create a .env file:

## 📺 Demo Video

Watch a short 2-minute demo on YouTube:  
 [![Watch on YouTube](https://img.shields.io/badge/Watch-Demo-red?logo=youtube)](https://youtu.be/KNNZ-KkE1Ig)

---

## 🌐 Live Demo

Try the deployed app here:  
 [QuickHire Live Site](https://dianeingabire-alu-quick-hire.onrender.com/login)

---