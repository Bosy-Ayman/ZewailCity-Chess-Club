# Zewail City Chess Club — System Architecture & Technical Specification

Comprehensive architectural, infrastructure, and implementation breakdown of the Zewail City Chess Club web application.

---

## 1. Overall Architecture

### Architecture Diagram

```
+---------------------------------------------------------------------------------------------------------+
|                                              USER / CLIENT                                              |
|                                       (Browser on Mobile / Desktop)                                     |
+----------------------------------------------------+----------------------------------------------------+
                                                     |
                                                     | 1. HTTP/HTTPS Requests (Page visits & API calls)
                                                     v
+---------------------------------------------------------------------------------------------------------+
|                                           VERCEL EDGE NETWORK (CDN)                                     |
|                                                                                                         |
|   Static Asset Routing (vercel.json)               API Rewrites                                         |
|   "/(.*)" -> /index.html                          "/api/(.*)" -> /api/index                             |
+--------------------+-----------------------------------------------+------------------------------------+
                     |                                               |
                     | Serves Static HTML/JS/CSS                     | Invokes Serverless Function
                     v                                               v
+------------------------------------+   +----------------------------------------------------------------+
|       FRONTEND (Client-Side)       |   |             BACKEND (Serverless Compute Layer)                 |
|                                    |   |                                                                |
|  - React 19 SPA (React Router v7)  |   |  - AWS Lambda MicroVM managed by Vercel                        |
|  - chess.js (Chess engine logic)   |   |  - Entry point: api/index.js                                   |
|  - react-chessboard (UI board)     |   |  - Express 5.x App: server/server.js                           |
|  - ChallongeBracket & XArrows      |   |  - Custom connectDB Mongoose Middleware                        |
|  - safeFetchJson / api.js utils    |   |  - Tournament pairing algorithms (Swiss / Knockout)            |
+--------------------+---------------+   +-------------------------------+--------------------------------+
                     |                                                   |
                     | Fetches Data / Sends Actions                      | Database queries & Auth verification
                     +---------------------------------------------------+
                                     |
       +-----------------------------+-----------------------------+
       |                                                           |
       v                                                           v
+------------------------------------+   +----------------------------------------------------------------+
|      DATABASE (Cloud Hosted)       |   |                   EXTERNAL 3RD PARTY SERVICES                  |
|                                    |   |                                                                |
|  MongoDB Atlas Cluster             |   |  1. Google OAuth 2.0 Identity Platform                         |
|  (cluster0.d7yqddz.mongodb.net)    |   |     - Google Identity Services (Client ID token generation)    |
|  - Collections:                    |   |     - google-auth-library (Server token verification)           |
|    * users                         |   |                                                                |
|    * tournaments                   |   |  2. External Chess Communities                                 |
|    * puzzle_tournaments            |   |     - Lichess.org / Chess.com (Player profiles & team links)   |
|    * chess_club (applications)     |   |                                                                |
|    * notifications                 |   +----------------------------------------------------------------+
|    * contact_messages              |
+------------------------------------+
```

---

### Component Communication Workflow

1. **User $\rightarrow$ Edge CDN**: The user visits the website in a web browser. Vercel's global Edge CDN immediately delivers the precompiled, static Single Page Application (SPA) bundle (`build/index.html`, JavaScript, CSS, and static assets).
2. **Frontend $\rightarrow$ Backend**: When dynamic actions occur (e.g. user authentication, tournament registration, tactical puzzle scoring, or application submission), React issues asynchronous HTTP requests via `fetch` to `/api/...`.
3. **Edge Rewrite $\rightarrow$ Serverless Backend**: `vercel.json` intercepts incoming requests matching `/api/(.*)` and directs them to `/api/index.js`. Vercel spins up an isolated Node.js serverless execution context and invokes the Express application exported in `server/server.js`.
4. **Backend $\rightarrow$ Database**: The Express backend initializes or reuses an existing connection over TLS to **MongoDB Atlas** using Mongoose, queries or mutates the document store, and serializes the JSON response back to the client.
5. **Backend $\rightarrow$ External Auth**: For Google authentication, the client acquires a signed ID token from Google Identity Services and sends it to `/api/admin/google-login`. The server uses `google-auth-library` to verify cryptographic authenticity with Google before issuing a signed session JWT.

---

## 2. Is it Serverless?

### Verdict: **Partially Serverless / Hybrid Serverless Architecture**

In production, the project runs as a **Serverless Monolith** (an Express application executed inside a Vercel Serverless Function) paired with a cloud-managed database.

---

### Detailed Evaluation

| Question | Answer | Technical Explanation |
| :--- | :--- | :--- |
| **What runs continuously?** | **Only MongoDB Atlas** | The cloud database cluster runs 24/7. **No backend Node.js compute instance is running continuously in production.** |
| **What runs only when an HTTP request happens?** | **The Backend API & Database Connection** | When an HTTP request reaches `/api/...`, Vercel invokes an ephemeral container (AWS Lambda microVM) running `api/index.js` and `server/server.js`. Once the response is sent, the execution environment goes idle and is torn down after a brief grace period. |
| **Where does the backend code execute?** | **Vercel Serverless Functions (AWS Lambda)** | In production, code executes on Vercel's managed serverless container runtime. In development, it runs locally on `http://localhost:5000` via `node --watch server/server.js`. |
| **Is there an actual server process?** | **In Dev: Yes. In Prod: No.** | In `server/server.js`, `app.listen(PORT)` is guarded by `if (process.env.NODE_ENV !== 'production')`. In production, Express is not listening on a network port; instead, it is invoked on-demand as a request handler. |
| **Are there serverless functions?** | **Yes (Single Entry Point / Serverless Monolith)** | `vercel.json` rewrites all `/api/*` traffic to `/api/index.js`. Vercel packages this file and its dependencies as a single serverless function bundle. |
| **What happens when there are no users?** | **Zero Compute Utilization ($0 compute cost)** | With no incoming requests, zero server processes exist. All function containers scale down to **0**. |
| **Who manages the infrastructure?** | **Vercel & MongoDB Inc.** | Vercel manages the Edge CDN, OS patching, SSL certificates, auto-scaling, and microVM lifecycle. MongoDB Inc. manages cluster maintenance, replication, and storage. |

---

### Serverless Cold Start & Database Connection Strategy

Because serverless functions start from zero, the application implements a dedicated connection-pooling middleware in `server/server.js` (lines 40–95):

```javascript
const connectDB = async (req, res, next) => {
  if (req.path.includes('db-test') || req.url.includes('db-test')) {
    return next();
  }

  const state = mongoose.connection.readyState;
  
  // 1 = connected (re-uses existing connection)
  if (state === 1) return next();
  
  // 2 = connecting (waits for ongoing handshake)
  if (state === 2) {
    // Awaits 'connected' event with timeout guard
    return next();
  }

  // 0 = disconnected (connects on cold start)
  try {
    await mongoose.connect(MONGO_URI, { 
      serverSelectionTimeoutMS: 5000,
      family: 4 // Forces IPv4 to avoid TLS Alert 80 errors in serverless
    });
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
};
```

---

## 3. Frontend Architecture

### Core Technologies
* **Framework**: React 19 (`react: ^19.1.0`, `react-dom: ^19.1.0`) with Create React App (`react-scripts: ^5.0.1`).
* **Routing**: `react-router-dom` v7.6.3 using client-side SPA routing (`BrowserRouter`, `Routes`, `Route`, `Navigate`).
* **Styling**: Pure **Vanilla CSS** with dedicated stylesheets per component (e.g. `HomePage.css`, `Profile.css`, `Community.css`), avoiding Tailwind runtime overhead.
* **Chess & UI Libraries**:
  * `chess.js`: Move validation, FEN parsing, and game state calculation on the client.
  * `react-chessboard`: Interactive drag-and-drop chessboard UI.
  * `react-xarrows`: Dynamic SVG connectors rendering bracket trees in `ChallongeBracket.jsx`.
  * `lucide-react`: Modern SVG iconography.
  * `react-confetti`: Victory animations on tournament and puzzle completion.

### Routing Table

| Route | Component | Purpose |
| :--- | :--- | :--- |
| `/` | `HomePage.jsx` | Landing page, club statistics, upcoming events, daily tactics preview |
| `/community` | `Community.jsx` | Tactician directory, player network, cheers, follow system, direct challenges |
| `/profile` | `Profile.jsx` | User profile, ratings (FIDE, Chess.com, Lichess), tactical stats, badges |
| `/tournaments` | `Tournaments.jsx` | List of upcoming and historical Swiss/Knockout tournaments |
| `/tournamentdetails` | `TournamentDetails.jsx` | Interactive Swiss tournament pairing board, rounds, and standings |
| `/tournamentdetailsKnockout` | `TournamentDetailsKnockout.jsx` | Knockout bracket tree visualization with dynamic lines |
| `/puzzlechallenge` | `PuzzleChallenge.jsx` | Real-time chess puzzle solver with countdown timers and leaderboard |
| `/calendar` | `Calendar.jsx` | Interactive club schedule and event timeline |
| `/calendaredit` | `CalendarEdit.jsx` | Admin interface for editing club calendar events |
| `/admin` | `Admin.jsx` | Admin dashboard for users, recruitment forms, tournaments, and messages |
| `/apply/*` | `ApplicationForm.jsx` (Variants) | Recruitment forms for HR, PR, Multimedia, OC, Trainer, and Trainee roles |
| `/history` | `History.jsx` | Club history, hall of fame, executive boards, and historical champions |
| `/contact` | `ContactUs.jsx` | Direct contact and feedback submission form |

### Client-Side API Strategy & Resiliency
* **Dynamic API URL Resolution** (`src/App.js`):
  ```javascript
  export const API_URL = process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
  ```
  In production, relative paths (`/api/...`) are used, eliminating cross-origin preflight latency.
* **Client-Side Image Compression** (`src/utils/api.js`):
  Profile photos and avatars are compressed using HTML5 `<canvas>` before upload, minimizing payload sizes and staying within Vercel and MongoDB document limits.

---

## 4. Backend & API Architecture

The backend is built with **Express 5.2.1** and modularized within `server/server.js`.

### API Routes Overview

```
+---------------------------------------------------------------------------------------------------------+
|                                           EXPRESS 5.x API LAYER                                         |
+-------------------+--------------------+-----------------------+--------------------+-------------------+
|  Authentication   |   User & Social    |  Tournament Engine    |  Tactics Puzzles   |  Club Operations  |
+-------------------+--------------------+-----------------------+--------------------+-------------------+
| /admin/login      | /profile           | /tournaments          | /puzzle-tournaments| /applications     |
| /admin/google-log | /users/follow      | /generate-swiss-round | /puzzles           | /contact          |
| /admin/signup     | /users/cheer       | /generate-knockout-rd | /submit-score      | /notifications    |
| /admin/manage-user| /challenges        | /matches              |                    | /heartbeat        |
+-------------------+--------------------+-----------------------+--------------------+-------------------+
```

### Key API Capabilities

1. **Swiss & Knockout Pairing Engines** (`server.js:1656-2210`):
   * Computes dynamic player pairings based on scores, color history (avoiding three consecutive same colors), and prior matchups.
   * Handles "BYE" matches for odd participant counts and computes tiebreak scores (Buchholz / Sonneborn-Berger).
2. **Social & Challenge System** (`server.js:742-970`):
   * Enables tacticians to challenge peers to in-person matches, follow players, cheer colleagues, and track real-time online presence via heartbeat pings.
3. **Notification System** (`server.js:209-235`):
   * Automatically creates user notifications when a player is followed, registered for a tournament, or assigned a club role.

---

## 5. Database Architecture

* **Database Engine**: MongoDB Atlas (Cloud Hosted Replica Set)
* **ODM Layer**: Mongoose 9.7.2
* **Database Name**: `chess_club`

### Schema Definitions

| Collection | Schema | Key Fields |
| :--- | :--- | :--- |
| `users` | `UserSchema` | `email` (unique), `password` (bcrypt hash), `name`, `idNumber`, `phone`, `major`, `batch`, `role` (`admin`/`member`), `profileImage` (Base64), `fideRating`, `chessComRating`, `lichessRating`, `followers`, `following`, `challenges`, `cheers`, `clubRoles`, `lastSeen` |
| `tournaments` | `TournamentSchema` | `title`, `type` (`Swiss`/`Knockout`), `status` (`Upcoming`/`Ongoing`/`Completed`), `startDate`, `endDate`, `location`, `playersList`, `registrations`, `matches` (round, white, black, result, matchTime), `rounds`, `winner`, `podium` |
| `puzzle_tournaments` | `PuzzleTournamentSchema` | `title`, `startDate`, `endDate`, `timeLimit`, `puzzles` (`initialFen`, `mateIn`, `correctMoves`, `description`), `participants`, `leaderboard` (`name`, `email`, `score`, `solvedCount`) |
| `chess_club` | `ApplicationSchema` | `name`, `email`, `idNumber`, `phone`, `major`, `batch`, `roleTitle`, `department`, `status` (`Pending`/`Accepted`/`Rejected`), `roleSpecificData`, `submissionDate` |
| `notifications` | `NotificationSchema` | `recipientEmail`, `type`, `actorName`, `actorEmail`, `actorAvatar`, `message`, `link`, `read`, `createdAt` |
| `contact_messages` | `ContactMessageSchema` | `name`, `email`, `category`, `subject`, `message`, `read`, `createdAt` |

---

## 6. Authentication & Security

1. **Authentication Methods**:
   * **Email & Password**: Passwords hashed with `bcryptjs` (salt rounds = 10).
   * **Google OAuth 2.0**: ID tokens cryptographically validated on the server using `googleClient.verifyIdToken`.
2. **Session Authorization**:
   * Successful logins issue a **JSON Web Token (JWT)** signed with `JWT_SECRET` and a 7-day expiration (`expiresIn: '7d'`).
   * The token is stored in client `localStorage` and sent in subsequent authorized API calls.
3. **Role-Based Access Control (RBAC)**:
   * Roles: `admin` and `member`.
   * Protected endpoints verify admin authority through email whitelists (`isAdminEmail`) and token role validation.

---

## 7. Development vs. Production Lifecycle

| Feature | Local Development | Production Deployment (Vercel) | Docker Containerized (Self-Hosted) |
| :--- | :--- | :--- | :--- |
| **Frontend Host** | Webpack Dev Server (`localhost:3000`) | Vercel Global Edge CDN (Static Files) | Nginx Alpine Container (Port `3000` $\rightarrow$ `80`) |
| **Backend Host** | Node.js Process (`localhost:5000`) | Vercel Serverless Function (AWS Lambda) | Node.js Alpine Container (`backend:5000`) |
| **Execution Model** | Long-running Node process | On-demand ephemeral function invocations | Dedicated continuous Docker containers |
| **Routing & Rewrites** | `package.json` proxy (`localhost:5000`) | `vercel.json` rewrites (`/api/*` $\rightarrow$ `/api/index.js`) | Nginx reverse proxy (`location /api/` $\rightarrow$ `backend:5000`) |
| **Zero-Traffic State** | Local process remains in memory | Function containers scale down to **0** | Containers idle in memory (ready instantly) |
| **Database Connection** | Persistent Mongoose connection | Dynamic `connectDB` middleware on-demand | Persistent Mongoose connection to Atlas/Mongo |

---

## 8. Containerization & Docker Architecture (Self-Hosted Option)

The project supports containerized deployment via Docker and Docker Compose for running on any Linux/Windows server, cloud VM (AWS EC2, DigitalOcean, GCP Compute Engine), or local machine without depending on Vercel.

### Container Architecture Diagram

```
+---------------------------------------------------------------------------------------------------------+
|                                              DOCKER HOST                                                |
|                                                                                                         |
|   +------------------------------------+   HTTP /api/   +------------------------------------------+    |
|   |         FRONTEND CONTAINER         | -------------> |            BACKEND CONTAINER             |    |
|   |            (zc_chess_frontend)     |   (internal)   |             (zc_chess_backend)           |    |
|   |                                    |                |                                          |    |
|   |  - Image: nginx:alpine             |                |  - Image: node:20-alpine                 |    |
|   |  - Exposes: 80 (mapped to 3000)    |                |  - Exposes: 5000                         |    |
|   |  - Serves: React SPA production    |                |  - Runs: Express 5 API server            |    |
|   |  - Reverse Proxies: /api/ -> 5000  |                |  - Connects to: MongoDB Atlas            |    |
|   +------------------------------------+                +--------------------+---------------------+    |
|                     ^                                                        |                          |
|                     | (Port 3000)                                            | (Mongoose over TLS)      |
+---------------------+--------------------------------------------------------+--------------------------+
                      |                                                        |
                      |                                                        v
            User Web Browser                                      MongoDB Atlas (or local Mongo)
```

### Docker Components

1. **Backend Container (`Dockerfile.server`)**:
   * Uses `node:20-alpine` base image.
   * Installs production dependencies (`npm install --omit=dev`).
   * Runs `node server/server.js` continuously on port `5000`.

2. **Frontend Container (`Dockerfile.client` & `nginx.conf`)**:
   * **Multi-Stage Build**:
     * Stage 1 (`build`): Builds the React single-page app via `npm run build`.
     * Stage 2 (`production`): Copies built HTML/JS/CSS assets to `nginx:alpine`.
   * Configures Nginx to:
     * Serve static assets with client-side SPA routing (`try_files $uri /index.html`).
     * Reverse proxy `/api/*` requests directly to `http://backend:5000/api/` with streaming and 15MB body limit.

3. **Orchestration (`docker-compose.yml`)**:
   * Launches both frontend and backend on an isolated bridge network (`chess_network`).
   * Configures automatic restarts and shared environment variables.
   * Provides an optional commented local MongoDB 7 service for fully offline testing.

### Running with Docker

```bash
# Build and start all services in detached mode
docker compose up --build -d

# View service logs
docker compose logs -f

# Stop and remove containers
docker compose down
```

