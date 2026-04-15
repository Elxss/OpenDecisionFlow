<a name="readme-top"></a>

<br />
<div align="center">
  <a href="https://github.com/Elxss/OpenDecisionFlow">
    <img src="https://raw.githubusercontent.com/Elxss/Elxss.github.io/main/src/img/logo.png" alt="Logo" width="300" height="300">
  </a>
  <h2>OpenDecisionFlow</h2>
  <p>Build and share interactive decision trees in a simple web app.</p>
  <p>
    <a href="https://github.com/Elxss/OpenDecisionFlow/issues">Report Bug</a>
    ·
    <a href="https://github.com/Elxss/OpenDecisionFlow/issues">Request Feature</a>
  </p>
</div>

---

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about">About</a></li>
    <li><a href="#stack">Stack</a></li>
    <li><a href="#self-host">Self-host</a></li>
    <li><a href="#quick-start">Quick Start</a></li>
    <li><a href="#https">HTTPS</a></li>
    <li><a href="#configuration">Configuration</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#node-types">Node Types</a></li>
    <li><a href="#security">Security</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

---

## About

Easy, Free, Opensource

No SaaS, no tracking, no nonsense. Run it yourself, on your own server, and own the data completely!

- **Decision trees** - questions with branching choices, free-text inputs, date pickers, final result
- **Auth** - server-side sessions, `httpOnly` cookie, bcrypt passwords
- **Access control** - public questionnaires, private ones behind an access code, guest mode (no account required)
- **Share page** - every questionnaire has a shareable link with title, description, and author
- **Response history** - per-user and per-questionnaire history (public or private)
- **Rate limiting** - configurable per route, out of the box
- **Docker ready** - HTTP by default, HTTPS via Caddy with automatic Let's Encrypt

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite |
| Backend | Hono + Bun |
| Database | SQLite (`bun:sqlite`) |
| Reverse proxy | nginx (container) + optional Caddy (HTTPS) |
| CI/CD | GitHub Actions, GHCR |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Self-host ( fastest way to )

**Requirements:** a machine with Docker. No domain needed.

```bash
curl -O https://raw.githubusercontent.com/Elxss/OpenDecisionFlow/main/docker-compose.yml
```
you should edit it, for it to fit your needs

then you can compose up using
```bash
docker compose up -d
```

Open [http://localhost](http://localhost). Default account: `admin` / `admin` - you'll be asked to change the password on first login.

Optionally set credentials before starting:

```bash
ADMIN_USERNAME=myname ADMIN_PASSWORD=mypassword docker compose up -d
```

To update:

```bash
docker compose pull
docker compose up -d
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Quick Start

**Requirements:** [Bun](https://bun.sh) ≥ 1.0

```bash
# Terminal 1 - backend
cd backend
cp .env.example .env
bun install
bun run dev

# Terminal 2 - frontend
cd frontend
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).  
Default account: `admin` / `admin` - change it.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## HTTPS

Requires a domain pointing to your server and ports 80/443 open. Clone the repo first.

1. Edit `docker-compose.yml` — set `CORS_ORIGIN` to `https://yourdomain.com` and `COOKIE_SECURE` to `true`.

2. Ensure DNS points to your server and ports 80/443 are open.

3. Start:

```bash
DOMAIN=yourdomain.com docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

Caddy fetches the Let's Encrypt certificate automatically on first boot.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Configuration

`backend/.env` (copy from `backend/.env.example`):

```env
# Admin account — set before first run
# If omitted, created as admin / admin with a forced password change on first login
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme

PORT=3001
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
DB_PATH=./data.db

SESSION_DURATION_DAYS=7

# Rate limiting (requests per minute)
RATE_WINDOW_MS=60000
RATE_LIMIT_AUTH=10
RATE_LIMIT_STRICT=20
RATE_LIMIT_SEARCH=10
RATE_LIMIT_DECISIONFLOW=15
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Project Structure

### backend
Contains the API built with Hono and the SQLite database layer.

- `index.js`: main entry point (routes, middleware, rate limiting)
- `db.js`: database setup and migrations
- `Dockerfile`: backend container configuration
- `.env.example`: environment variables template

---

### frontend
Frontend application handling the user interface and client-side logic.

- `src/pages/`: main views (Dashboard, Questionnaire, History, etc.)
- `src/components/`: reusable UI components (Navbar, Pagination)
- `src/context/`: global state management (AuthContext)
- `src/api/mock.js`: API abstraction layer (mock requests)
- `nginx.conf`: Nginx configuration (SPA routing + `/api` proxy)
- `Dockerfile`: frontend container configuration

---

### docker-compose.yml
HTTP stack — pulls prebuilt images from GHCR.

### docker-compose.https.yml
HTTPS override — adds Caddy with automatic Let’s Encrypt.

### Caddyfile
Reverse proxy configuration and TLS setup.

### .github/workflows/ci.yml
CI pipeline for building and pushing Docker images to GHCR.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Node Types

```json
{ "type": "question", "text": "Your question?", "branches": { "Yes": {}, "No": {} } }
{ "type": "action",   "text": "Final result" }
{ "type": "text",     "text": "Your name?",    "key": "name", "next": {} }
{ "type": "date",     "text": "Which date?",   "key": "date", "next": {} }
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Security

- Passwords hashed with bcrypt
- Server-side sessions (httpOnly cookie, 256-bit token)
- Parameterized SQL queries throughout
- CORS restricted to the configured origin
- CSRF protection via `SameSite=Lax`
- Rate limiting on all sensitive routes
- Backend container runs as non-root user

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feature/my-feature`)
3. Copy `backend/.env.example` -> `backend/.env`
4. Run in dev (see [Quick Start](#quick-start))
5. Open a pull request against `main`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

MIT

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Elxss - [elxssgitcontact@gmail.com](mailto:elxssgitcontact@gmail.com) - [elxss.me](https://elxss.me/?e=odf)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
