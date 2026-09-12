# ♟️ ZC Chess Club

The official web platform for the **Zewail City Chess Club** — a full member hub covering tournaments, puzzles, a social network, and club administration.

🔗 **Live site:** [zc-chess-club.vercel.app](https://zc-chess-club.vercel.app)

---

## 📖 About

This is the Zewail City Chess Club's all-in-one platform: members sign up, build a chess profile, join tournaments, solve timed puzzle sets, follow each other, and challenge friends to over-the-board games — while club admins run the whole thing (tournaments, applications, roles, and content) from a dedicated dashboard.

> Built and maintained by [Bosy Ayman](https://github.com/Bosy-Ayman), President of the Zewail City Chess Club.

---

## ✨ Features Implemented

### 👤 Accounts & Profiles
- Email/password sign-up and login (`bcryptjs` password hashing + JWT sessions)
- Google Sign-In (`google-auth-library`)
- Editable chess profile: FIDE / Chess.com / Lichess ratings & usernames, chess title, favorite opening, bio, playstyle, profile photo upload
- Admin-managed user roles and account verification

### 🏆 Tournaments
- Admin-created tournaments with title, dates, time, location, description, and cover image
- Two formats: **Swiss** and **Knockout**, each with dedicated bracket/details pages
- Player registration and self-registration, with approve/reject workflow
- Automatic **Swiss-round pairing generation** and **knockout-round generation**
- Match results tracking, editable matches, round rollback ("delete last round")
- Final podium/standings and winner tracking
- Bracket visualization component (Challonge-style)

### 🧩 Puzzle Tournaments
- Admin-built puzzle sets: custom board setup (FEN), mate-in-1/2/3, solution moves, per-puzzle description
- Timed puzzle challenges with a configurable time limit per puzzle
- Participant registration, live score submission, and a tournament leaderboard

### 🌐 Community / Social
- Follow / unfollow other members, with a personal network view
- "Cheer" other members (lightweight kudos/reactions)
- Direct **game challenges** between members (time control, location, message) with accept/decline
- Community-wide stats
- Online/last-seen presence via a heartbeat endpoint
- In-app notifications (new follower, tournament join/start, system messages), with mark-as-read

### 📅 Calendar & History
- Club events calendar with an admin edit view
- Archive/history of past events and tournaments

### 📝 Recruitment & Applications
- Public application forms for joining club departments: **HR, Multimedia, Organizing Committee, Trainer, Trainee**
- Admin applications table with accept/reject status management

### 🛠 Admin Dashboard
- Centralized panel to manage tournaments, puzzle tournaments, applications, users, roles, and contact inquiries
- Visual puzzle board editor (place pieces, set mate-in, record correct moves)

### 📄 Site Pages
- Home, About, Club Roles, Contact Us (with an inbox on the admin side), Privacy Policy, Terms of Service, custom 404 page

---

## 🛠 Tech Stack

**Frontend**
- React 19 (Create React App) + React Router v7
- `react-chessboard` + `chess.js` — interactive boards for puzzles/games
- `react-calendar` — events calendar
- `react-xarrows` — tournament bracket connectors
- `react-confetti` — celebratory UI moments
- `lucide-react` — icons

**Backend**
- Node.js + Express 5, MongoDB + Mongoose
- JWT auth + `bcryptjs` password hashing
- Google OAuth (`google-auth-library`)

**Deployment**
- Vercel (`vercel.json`, `/api` serverless entrypoint wrapping the Express app)

---

## 📁 Project Structure

```
ZewailCity-Chess-Club/
├── api/              # Vercel serverless entrypoint (wraps the Express app)
├── public/           # Static assets, images, team/winner photos
├── server/           # Express backend — all routes & Mongoose models (server.js)
├── src/
│   ├── components/   # Shared UI (Header, Footer, LoginModal, ChallongeBracket, ...)
│   ├── pages/        # Route-level pages (Tournaments, Admin, Community, ...)
│   └── utils/
├── vercel.json
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS recommended)
- npm
- A MongoDB connection string (local or Atlas)

### Installation

```bash
git clone https://github.com/Bosy-Ayman/ZewailCity-Chess-Club.git
cd ZewailCity-Chess-Club
npm install
```

### Environment Variables

Create a `.env` file inside `server/` with:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
PORT=5000
```

### Running Locally

Start the backend:

```bash
npm run server
```

In a separate terminal, start the frontend:

```bash
npm start
```

The app runs at `http://localhost:3000` and proxies API calls to `http://localhost:5000`.

### Available Scripts

| Command          | Description                               |
|------------------|--------------------------------------------|
| `npm start`      | Runs the React app in development mode    |
| `npm run server` | Runs the Express backend (with `--watch`) |
| `npm run build`  | Builds the frontend for production        |
| `npm test`       | Runs the test suite                       |

---

## 🌐 Deployment

Deployed on **Vercel** — `api/index.js` wraps the Express app as a serverless function, and `vercel.json` configures routing/build.

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a Pull Request

---

## 📄 License

MIT — see [LICENSE](./LICENSE).

---

## 👤 Author

**Bosy Ayman** — President, Zewail City Chess Club · [GitHub](https://github.com/Bosy-Ayman)
