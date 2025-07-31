# Run this command several times
curl -I http://localhost```

You can inspect the `Set-Cookie` header or add a custom header in your Node.js app to see which server (`web-01` or `web-02`) is responding. The responses should alternate, confirming that the round-robin load balancing is working.

---

## 🔒 Security & Hardening

-   **Password Security:** User passwords are never stored in plain text. They are hashed using the strong `crypto.scrypt` algorithm with a unique salt for each user.
-   **Secret Management (API Keys):** The Jooble API key is handled securely.
    -   It is **never** exposed in the frontend JavaScript code.
    -   It is stored in a `.env` file on the server, which is included in `.gitignore` to prevent it from being committed to version control.
    -   In the Docker deployment, it is passed as a secure environment variable to the running container, not baked into the image.
-   **Backend Proxy:** The application uses the backend as a proxy to make all external API calls. This is the core of the security model, ensuring the client's browser never directly communicates with the Jooble API.

## 🌐 API Usage & Attribution

-   **Jooble Developer API:** Used to fetch job listings. All data is provided by Jooble. [Official Documentation](https://jooble.org/api/about).
-   **Font Awesome:** Used for icons throughout the dashboard interface. [Official Website](https://fontawesome.com/).

## 🧠 Challenges & Learning

A significant challenge encountered was an initial network block (`ENOTFOUND` error) when attempting to connect to a cloud-hosted PostgreSQL database. This led to a key architectural decision: switching to an embedded **SQLite** database for local development. This allowed the project to move forward and focus on application logic.

This decision, however, highlights a crucial concept for the deployment phase: **SQLite is not suitable for a load-balanced environment.** Each container (`web-01`, `web-02`) runs its own independent `quickhire.db` file. This means a user who registers on `web-01` will not exist on `web-02`. A production-grade solution would require all servers to connect to a single, centralized database (like the originally planned PostgreSQL). This limitation is a valuable learning outcome of the project.

## 🎥 Demo Video

https://www.youtube.com/watch?v=MPY1ruiR-ok