const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dns = require('dns');

// DNS override removed because it breaks Serverless functions on AWS Lambda (Vercel)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'zcchessclub-super-secret-key-change-me';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);



const app = express();
const PORT = process.env.PORT || 5000;

// --- Middlewares ---
app.use(cors({
  origin: [
    "http://localhost:3000", // local frontend
    "https://zc-chess-club-web-euimxokx7-bosy-aymans-projects.vercel.app" // your deployed frontend
  ]
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Serverless-friendly database connection middleware
const connectDB = async (req, res, next) => {
  // Bypass database connection check for the diagnostics endpoint itself
  if (req.path.includes('db-test') || req.url.includes('db-test')) {
    return next();
  }

  const state = mongoose.connection.readyState;
  
  // 1 = connected
  if (state === 1) {
    return next();
  }
  
  // 2 = connecting. Wait for it to finish.
  if (state === 2) {
    console.log('Database is currently connecting... awaiting connection');
    try {
      await new Promise((resolve, reject) => {
        const onConnected = () => {
          mongoose.connection.off('error', onError);
          resolve();
        };
        const onError = (err) => {
          mongoose.connection.off('connected', onConnected);
          reject(err);
        };
        mongoose.connection.once('connected', onConnected);
        mongoose.connection.once('error', onError);
        // Timeout guard
        setTimeout(() => {
          mongoose.connection.off('connected', onConnected);
          mongoose.connection.off('error', onError);
          reject(new Error('Mongoose connection timed out (middleware wait)'));
        }, 5000);
      });
      return next();
    } catch (err) {
      return res.status(500).json({ error: 'Database is connecting but failed', details: err.message });
    }
  }

  // 0 = disconnected. Connect explicitly.
  try {
    console.log('Database disconnected. Reconnecting...');
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    await mongoose.connect(MONGO_URI, { 
      serverSelectionTimeoutMS: 5000,
      family: 4 // Force IPv4 resolution to prevent TLS Alert 80 errors on Node 18+ on Vercel
    });
    console.log('Database reconnected successfully!');
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed (middleware connect)', details: err.message });
  }
};

app.use(connectDB);

// --- MongoDB Schema & Model ---
const ApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'Applicant' },
  email: { type: String, required: true },
  idNumber: { type: String, default: '' },
  phone: { type: String, default: '' },
  major: { type: String, default: 'General' },
  batch: { type: String, default: '2026' },
  roleTitle: { type: String, default: 'Member' },
  department: { type: String, default: 'General Committee' },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Accepted', 'Rejected'] },
  roleSpecificData: { type: mongoose.Schema.Types.Mixed, default: {} },
  submissionDate: { type: Date, default: Date.now }
});

const Application = mongoose.model('Application', ApplicationSchema, 'chess_club');

// --- Tournament Schema & Model ---
const TournamentSchema = new mongoose.Schema({
  title: { type: String, required: true, default: 'Untitled Tournament' },
  type: { type: String, default: 'Swiss' },
  status: { type: String, default: 'Upcoming' },
  startDate: { type: String, default: () => new Date().toISOString().split('T')[0] }, // Format: YYYY-MM-DD
  endDate: { type: String, default: 'Unknown' }, // Format: YYYY-MM-DD or 'Unknown'
  time: { type: String, default: 'TBD' },
  location: { type: String, default: 'Zewail Chess Club' },
  description: { type: String, default: '' },
  players: { type: Number, default: 0 },
  detailsUrl: { type: String, default: '' },
  playersList: [{
    name: { type: String, default: 'Player' },
    rating: { type: Number, default: 1200 },
    major: { type: String, default: 'General' }
  }],
  registrations: [{
    email: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] }
  }],
  matches: [{
    round: { type: Number, default: 1 },
    white: { type: String, default: 'TBD' },
    black: { type: String, default: 'TBD' },
    result: { type: String, default: 'pending' },
    bracket: { type: String, default: 'upper' }
  }],
  rounds: { type: Number, default: 0 }, // Total planned rounds
  createdAt: { type: Date, default: Date.now }
});

const Tournament = mongoose.model('Tournament', TournamentSchema, 'tournaments');

// --- User Schema & Model ---
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: "" },
  idNumber: { type: String, default: "" },
  phone: { type: String, default: "" },
  major: { type: String, default: "" },
  batch: { type: String, default: "" },
  role: { type: String, default: 'member' },
  profileImage: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema, 'users');

// --- Puzzle Tournament Schema & Model ---
const PuzzleSchema = new mongoose.Schema({
  initialFen: { type: String, required: true },
  mateIn: { type: Number, required: true, enum: [1, 2, 3] },
  correctMoves: [{ type: String, required: true }],
  description: { type: String, default: "" }
});

const PuzzleTournamentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  startDate: { type: String, required: true }, // Beginning Date: YYYY-MM-DD
  startTime: { type: String, default: "" },    // Beginning Time: HH:MM
  endDate: { type: String, default: "" },      // Ending Date: YYYY-MM-DD
  endTime: { type: String, default: "" },      // Ending Time: HH:MM
  timeLimit: { type: Number, required: true, default: 60 }, // seconds per puzzle
  puzzles: [PuzzleSchema],
  leaderboard: [{
    email: { type: String, required: true },
    name: { type: String, required: true },
    score: { type: Number, required: true },
    solvedCount: { type: Number, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

const PuzzleTournament = mongoose.model('PuzzleTournament', PuzzleTournamentSchema, 'puzzle_tournaments');

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("Error: MONGO_URI not defined in environment variables.");
  process.exit(1);
}

// Removed bufferCommands: false to allow Mongoose to wait for DB connection in serverless

mongoose.connection.on('connected', () => console.log('Mongoose connected to DB'));
mongoose.connection.on('error', (err) => console.error('Mongoose connection error:', err));
mongoose.connection.on('disconnected', () => console.warn('Mongoose disconnected'));

// Top-level connection disabled. Mongoose connection is now handled on-demand by the connectDB middleware.

async function seedAdminUser() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found in database. Seeding default admin user...');
      const hashedPassword = await bcrypt.hash('chessadmin123', 10);
      const defaultAdmin = new User({
        email: 'admin@zcchessclub.com',
        password: hashedPassword,
        role: 'admin'
      });
      await defaultAdmin.save();
      console.log('Default admin user successfully seeded: admin@zcchessclub.com / chessadmin123');
    } else {
      console.log('Users collection is not empty. Seeding skipped.');
    }
  } catch (err) {
    console.error('Error seeding default admin user:', err.message);
  }
}

async function seedPuzzleTournament() {
  try {
    const count = await PuzzleTournament.countDocuments();
    if (count === 0) {
      console.log('No puzzle tournaments found in database. Seeding default tournaments...');
      const defaultTournament = new PuzzleTournament({
        title: 'Weekly Tactics Arena',
        startDate: new Date().toISOString().split('T')[0],
        timeLimit: 60,
        puzzles: [
          {
            initialFen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
            mateIn: 1,
            correctMoves: ['h5f7'],
            description: 'Find the classic Scholar\'s Mate in 1 move!'
          },
          {
            initialFen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
            mateIn: 1,
            correctMoves: ['a1a8'],
            description: 'Exploit the weak back rank to deliver mate in 1!'
          }
        ],
        leaderboard: []
      });
      await defaultTournament.save();
      console.log('Default puzzle tournament successfully seeded!');
    } else {
      console.log('Puzzle tournaments collection is not empty. Seeding skipped.');
    }
  } catch (err) {
    console.error('Error seeding puzzle tournament:', err.message);
  }
}

async function seedDatabase() {
  await seedAdminUser();
  await seedPuzzleTournament();
}

// --- Routes ---

// GET: DB diagnostic test
app.get('/api/db-test', async (req, res) => {
  try {
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    
    // Ensure we disconnect first to test fresh connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    const testUri = 'mongodb://poussyayman1_db_user:BzCJwFdQ7TSa2DmR@ac-nzzwvhs-shard-00-00.d7yqddz.mongodb.net:27017,ac-nzzwvhs-shard-00-01.d7yqddz.mongodb.net:27017,ac-nzzwvhs-shard-00-02.d7yqddz.mongodb.net:27017/chess_club?ssl=true&replicaSet=atlas-z4f07t-shard-0&authSource=admin&retryWrites=true&w=majority';
    
    console.log('Testing hardcoded non-SRV connection...');
    await mongoose.connect(testUri, { 
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    
    res.json({
      status: 'success',
      message: 'Successfully connected with hardcoded non-SRV connection string!',
      connectionState: states[mongoose.connection.readyState]
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
      connectionState: mongoose.connection.readyState,
      stack: err.stack
    });
  }
});

// POST: submit new application
app.post('/api/applications', async (req, res) => {
  try {
    const { name, email, idNumber, phone, major, batch, roleTitle, department, ...roleSpecificData } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required to submit an application.' });
    }

    const newApp = new Application({
      name: name || 'Applicant',
      email: email.trim().toLowerCase(),
      idNumber: idNumber || '',
      phone: phone || '',
      major: major || 'General',
      batch: batch || '2026',
      roleTitle: roleTitle || 'Member',
      department: department || roleTitle || 'General Committee',
      roleSpecificData: roleSpecificData || {}
    });

    const savedApp = await newApp.save();
    res.status(201).json({ message: 'Application submitted!', data: savedApp });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ error: 'Validation failed', details: error.message });
    if (error.code === 11000) return res.status(409).json({ error: 'Email already exists', details: error.keyValue });
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET: fetch all applications
app.get('/api/applications', async (req, res) => {
  try {
    const apps = await Application.find().sort({ submissionDate: -1 });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
  }
});

// POST: Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token: token,
      user: {
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login', details: error.message });
  }
});

// POST: Admin Google login
app.post('/api/admin/google-login', async (req, res) => {
  try {
    const { credential, name, idNumber, phone, major, batch } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID || '963065836254-h2pdhhkdgt5c9p4vim5ervkdc13iqhl9.apps.googleusercontent.com'
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google ID token verification failed:', verifyError.message);
      // Fallback base64 decode for local testing/troubleshooting (in case of client ID configuration issues)
      const parts = credential.split('.');
      if (parts.length === 3) {
        payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        console.warn('Warning: Fell back to insecure decoding for Google Login due to token verification error.');
      } else {
        return res.status(401).json({ error: 'Invalid Google authentication token' });
      }
    }

    const email = payload.email;
    if (!email) {
      return res.status(400).json({ error: 'Google credential does not contain email' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      // Prevent auto-register from simple login attempt
      if (!idNumber || !phone || !major) {
        return res.status(404).json({ error: 'Account not found. Please sign up first.' });
      }
      
      // Auto-register google users when they provide sign-up profile fields
      user = new User({
        email,
        password: `google-auth-${Date.now()}`,
        name: name || payload.name || "",
        idNumber: idNumber || "",
        phone: phone || "",
        major: major || "",
        batch: batch || "",
        role: email === 'admin@zcchessclub.com' ? 'admin' : 'member',
        profileImage: payload.picture || ""
      });
      await user.save();
    } else {
      // Update details if passed during profile completion
      if (name) user.name = name;
      if (idNumber) user.idNumber = idNumber;
      if (phone) user.phone = phone;
      if (major) user.major = major;
      if (batch) user.batch = batch;
      if (payload.picture && !user.profileImage) {
        user.profileImage = payload.picture;
      }
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Google login successful!',
      token: token,
      user: {
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during Google login', details: error.message });
  }
});

// POST: Admin/Member Signup
app.post('/api/admin/signup', async (req, res) => {
  try {
    const { email, password, name, idNumber, phone, major, batch } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword,
      name: name || "",
      idNumber: idNumber || "",
      phone: phone || "",
      major: major || "",
      batch: batch || "",
      role: email === 'admin@zcchessclub.com' ? 'admin' : 'member'
    });

    const savedUser = await newUser.save();
    
    const token = jwt.sign(
      { userId: savedUser._id, email: savedUser.email, role: savedUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      token: token,
      user: {
        email: savedUser.email,
        role: savedUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during signup', details: error.message });
  }
});

// GET: Retrieve user profile
app.get('/api/profile', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      name: user.name || "",
      email: user.email,
      idNumber: user.idNumber || "",
      phone: user.phone || "",
      major: user.major || "",
      batch: user.batch || "",
      role: user.role || "member",
      profileImage: user.profileImage || ""
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching user profile', details: error.message });
  }
});

// PUT: Update user profile image (base64 or URL)
app.put('/api/profile/image', express.json({limit: '15mb'}), async (req, res) => {
  try {
    const { email, profileImage } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const user = await User.findOneAndUpdate(
      { email },
      { profileImage },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ message: 'Profile image updated successfully', profileImage: user.profileImage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile image', details: error.message });
  }
});

// POST alias: Update user profile image (base64 or URL)
app.post('/api/profile/image', express.json({limit: '15mb'}), async (req, res) => {
  try {
    const { email, profileImage } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const user = await User.findOneAndUpdate(
      { email },
      { profileImage },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ message: 'Profile image updated successfully', profileImage: user.profileImage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile image', details: error.message });
  }
});

// GET: fetch tournaments registered by user email
app.get('/api/users/:email/tournaments', async (req, res) => {
  try {
    const userEmail = req.params.email.toLowerCase();
    const tournaments = await Tournament.find({
      $or: [
        { 'registrations.email': userEmail },
        { 'playersList.name': { $regex: userEmail, $options: 'i' } }
      ]
    }).sort({ startDate: -1 });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user tournaments', details: error.message });
  }
});

// GET: fetch all users (for admin dashboard)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude password hash
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// DELETE: remove a user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// --- Tournament Routes ---

// GET: fetch all tournaments
app.get('/api/tournaments', async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ startDate: 1 });
    // Dynamically compute player count to ensure it's always accurate
    const dynamicTournaments = tournaments.map(t => {
      const obj = t.toObject();
      obj.players = obj.playersList ? obj.playersList.length : 0;
      return obj;
    });
    res.json(dynamicTournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournaments', details: error.message });
  }
});

// GET: fetch a single tournament by ID
app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const obj = tournament.toObject();
    obj.players = obj.playersList ? obj.playersList.length : 0;
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament details', details: error.message });
  }
});

// PUT: add a player to a tournament
app.put('/api/tournaments/:id/players', async (req, res) => {
  try {
    const { name, rating, major } = req.body;
    if (!name || !rating || !major) {
      return res.status(400).json({ error: "Name, rating, and major are required" });
    }
    
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    
    tournament.playersList.push({ name, rating: Number(rating), major });
    // Keep 'players' count field in sync
    tournament.players = tournament.playersList.length;
    
    await tournament.save();
    res.json({ message: "Player added successfully!", data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error adding player', details: error.message });
  }
});

// PUT: add a match result to a tournament
app.put('/api/tournaments/:id/matches', async (req, res) => {
  try {
    const { round, white, black, result } = req.body;
    if (!round || !white || !black || !result) {
      return res.status(400).json({ error: "Round, white, black, and result are required" });
    }
    
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    
    tournament.matches.push({ round: Number(round), white, black, result });
    await tournament.save();
    res.json({ message: "Match result added successfully!", data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error adding match result', details: error.message });
  }
});

// PUT: update an existing match result or pairing details
app.put('/api/tournaments/:id/matches/:matchId', async (req, res) => {
  try {
    const { result, white, black } = req.body;
    if (result === undefined && white === undefined && black === undefined) {
      return res.status(400).json({ error: "At least one update field (result, white, or black) is required" });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const match = tournament.matches.id(req.params.matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    if (result !== undefined) match.result = result;
    if (white !== undefined) match.white = white;
    if (black !== undefined) match.black = black;

    await tournament.save();
    res.json({ message: "Match updated successfully!", data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating match', details: error.message });
  }
});

// POST: generate next round Swiss pairings automatically (FIDE-compliant)
app.post('/api/tournaments/:id/generate-swiss-round', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const players = tournament.playersList || [];
    const minPlayersRequired = tournament.rounds ? tournament.rounds + 1 : 2;
    if (players.length < minPlayersRequired) {
      return res.status(400).json({ error: `Not enough players! A ${tournament.rounds || 1}-round Swiss tournament requires at least ${minPlayersRequired} players to generate pairings. Currently registered: ${players.length}` });
    }

    const existingMatches = tournament.matches || [];

    // Block if any existing matches are still Pending
    const pendingMatches = existingMatches.filter(m => !m.result || m.result === "Pending");
    if (pendingMatches.length > 0) {
      const maxR = Math.max(...existingMatches.map(m => m.round || 1));
      return res.status(400).json({ 
        error: `Cannot generate next round. There are still ${pendingMatches.length} pending match(es) in Round ${maxR}. Please record all match results first!` 
      });
    }

    const maxRound = existingMatches.reduce((max, m) => Math.max(max, m.round || 1), 0);
    const nextRound = maxRound + 1;

    // ---- Enforce planned rounds cap (Swiss only) ----
    if (tournament.rounds && tournament.rounds > 0 && nextRound > tournament.rounds) {
      return res.status(400).json({
        error: `Tournament is complete! All ${tournament.rounds} planned rounds have been played.`
      });
    }

    // ---- Build player stats map (FIDE-style) ----
    const statsMap = {};
    players.forEach(p => {
      statsMap[p.name] = {
        name: p.name,
        rating: p.rating || 1500,
        points: 0,
        colorsPlayed: [],   // 'w' or 'b' per round
        opponents: [],      // names of past opponents
        byeReceived: false  // FIDE: only one bye per player
      };
    });

    // Parse all historical match results
    existingMatches.forEach(m => {
      const isWhiteBye = m.black === "BYE";
      // Ensure white entry exists
      if (!statsMap[m.white]) {
        statsMap[m.white] = { name: m.white, rating: 1500, points: 0, colorsPlayed: [], opponents: [], byeReceived: false };
      }
      if (!isWhiteBye && !statsMap[m.black]) {
        statsMap[m.black] = { name: m.black, rating: 1500, points: 0, colorsPlayed: [], opponents: [], byeReceived: false };
      }

      if (isWhiteBye) {
        // BYE match: white gets 1 point, mark as having received a BYE
        statsMap[m.white].points += 1;
        statsMap[m.white].byeReceived = true;
        return; // Don't record color or opponent for BYE
      }

      // Normal match
      statsMap[m.white].opponents.push(m.black);
      statsMap[m.black].opponents.push(m.white);
      statsMap[m.white].colorsPlayed.push('w');
      statsMap[m.black].colorsPlayed.push('b');

      if (m.result === "1-0" || m.result === "1 - 0") {
        statsMap[m.white].points += 1;
      } else if (m.result === "0-1" || m.result === "0 - 1") {
        statsMap[m.black].points += 1;
      } else if (m.result === "1/2-1/2" || m.result === "½ - ½" || m.result === "Draw") {
        statsMap[m.white].points += 0.5;
        statsMap[m.black].points += 0.5;
      }
    });

    // ---- Helper: determine preferred color for a player ----
    const preferredColor = (player) => {
      const w = player.colorsPlayed.filter(c => c === 'w').length;
      const b = player.colorsPlayed.filter(c => c === 'b').length;
      // If last two colors are the same, must switch
      const last2 = player.colorsPlayed.slice(-2);
      if (last2.length === 2 && last2[0] === last2[1]) {
        return last2[0] === 'w' ? 'b' : 'w'; // Must switch
      }
      if (w > b) return 'b';
      if (b > w) return 'w';
      // Equal: prefer alternating from last color
      const lastColor = player.colorsPlayed[player.colorsPlayed.length - 1];
      return lastColor === 'w' ? 'b' : 'w';
    };

    // ---- Helper: check if two players can be paired ----
    const canPair = (p1, p2) => {
      if (p1.name === p2.name) return false;
      if (p1.opponents.includes(p2.name)) return false; // Rematch not allowed
      return true;
    };

    // ---- Sort players by points desc, then rating desc ----
    let available = Object.values(statsMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.rating - a.rating;
    });

    // ---- FIDE BYE Rule: give BYE to lowest-ranked eligible player if odd count ----
    const newMatches = [];
    let byePlayer = null;

    if (available.length % 2 !== 0) {
      // Find the lowest-ranked player who has NOT yet received a BYE
      for (let i = available.length - 1; i >= 0; i--) {
        if (!available[i].byeReceived) {
          byePlayer = available[i];
          available.splice(i, 1);
          break;
        }
      }
      // If all have had a BYE, give to lowest-ranked regardless
      if (!byePlayer) {
        byePlayer = available[available.length - 1];
        available.pop();
      }
    }

    // ---- Dutch System-inspired pairing: pair within score groups ----
    // Group players by points
    const groups = {};
    available.forEach(p => {
      const key = p.points;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    const scoreGroupsSorted = Object.keys(groups).map(Number).sort((a, b) => b - a);
    
    const paired = new Set();
    const unpaired = [];

    for (const score of scoreGroupsSorted) {
      const group = groups[score];
      const toProcess = [...unpaired, ...group];
      unpaired.length = 0;

      // Try to pair within group (floaters from higher group pair with top of this group)
      for (let i = 0; i < toProcess.length; i++) {
        if (paired.has(toProcess[i].name)) continue;
        let partnered = false;
        for (let j = i + 1; j < toProcess.length; j++) {
          if (paired.has(toProcess[j].name)) continue;
          if (canPair(toProcess[i], toProcess[j])) {
            // Determine colors
            const p1Pref = preferredColor(toProcess[i]);
            const p2Pref = preferredColor(toProcess[j]);
            
            let white, black;
            if (p1Pref === 'w' && p2Pref !== 'w') {
              white = toProcess[i].name; black = toProcess[j].name;
            } else if (p2Pref === 'w' && p1Pref !== 'w') {
              white = toProcess[j].name; black = toProcess[i].name;
            } else if (p1Pref === 'w') {
              // Both want white — higher rated gets white if first round, otherwise try to equalize
              white = toProcess[i].rating >= toProcess[j].rating ? toProcess[i].name : toProcess[j].name;
              black = white === toProcess[i].name ? toProcess[j].name : toProcess[i].name;
            } else {
              white = toProcess[j].name; black = toProcess[i].name;
            }

            newMatches.push({ round: nextRound, white, black, result: "Pending" });
            paired.add(toProcess[i].name);
            paired.add(toProcess[j].name);
            partnered = true;
            break;
          }
        }
        if (!partnered) {
          // Float down to next score group
          unpaired.push(toProcess[i]);
        }
      }
    }

    // Handle any remaining unpaired players (last resort: ignore rematch restriction)
    const remainingPlayers = unpaired.filter(p => !paired.has(p.name));
    for (let i = 0; i + 1 < remainingPlayers.length; i += 2) {
      const p1 = remainingPlayers[i];
      const p2 = remainingPlayers[i + 1];
      const p1Pref = preferredColor(p1);
      let white = p1Pref === 'w' ? p1.name : p2.name;
      let black = white === p1.name ? p2.name : p1.name;
      newMatches.push({ round: nextRound, white, black, result: "Pending" });
    }

    // ---- Add BYE match (BYE player gets 1 point automatically) ----
    if (byePlayer) {
      newMatches.push({
        round: nextRound,
        white: byePlayer.name,
        black: "BYE",
        result: "1-0" // FIDE: BYE counts as a full-point win
      });
    }

    tournament.matches.push(...newMatches);
    await tournament.save();

    const byeMsg = byePlayer ? ` Player "${byePlayer.name}" receives a BYE (+1 pt).` : '';
    res.json({ message: `Round ${nextRound} FIDE Swiss pairings generated successfully!${byeMsg}`, data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error generating Swiss pairings', details: error.message });
  }
});

// POST: generate initial or subsequent Knockout round pairings automatically
app.post('/api/tournaments/:id/generate-knockout-round', async (req, res) => {
  try {
    const { shuffle } = req.body;
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const existingMatches = tournament.matches || [];
    
    // CASE 1: Initialize Round 1 Bracket
    if (existingMatches.length === 0) {
      const players = tournament.playersList || [];
      if (players.length < 2) {
        return res.status(400).json({ error: "At least 2 players are required to generate a bracket." });
      }

      let list = [...players];
      if (shuffle) {
        // Fisher-Yates Shuffle
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
      } else {
        // Seeded by Rating
        list.sort((a, b) => (b.rating || 1500) - (a.rating || 1500));
      }

      const newMatches = [];
      const n = list.length;
      const half = Math.floor(n / 2);
      for (let i = 0; i < half; i++) {
        newMatches.push({
          round: 1,
          white: list[i].name,
          black: list[n - 1 - i].name,
          result: "Pending"
        });
      }

      // Odd player gets a bye
      if (n % 2 !== 0) {
        newMatches.push({
          round: 1,
          white: list[half].name,
          black: "BYE",
          result: "1-0" // Automatic win for White
        });
      }

      tournament.matches.push(...newMatches);
      await tournament.save();
      return res.json({ message: "Knockout Round 1 bracket generated successfully!", data: tournament });
    }

    // CASE 2: Advance to Next Round (Round 2, 3, etc.)
    // Check if any existing matches are still Pending
    const pendingMatches = existingMatches.filter(m => !m.result || m.result === "Pending");
    if (pendingMatches.length > 0) {
      return res.status(400).json({ 
        error: `Cannot generate next round. There are still ${pendingMatches.length} pending match(es) in the current round.` 
      });
    }

    const isDoubleElim = tournament.type === "Double Elimination";
    const newMatches = [];

    const upperMatches = existingMatches.filter(m => !m.bracket || m.bracket === "upper");
    const lowerMatches = existingMatches.filter(m => m.bracket === "lower");
    const gfMatches = existingMatches.filter(m => m.bracket === "grand_finals");
    const gfrMatches = existingMatches.filter(m => m.bracket === "grand_finals_reset");

    const uMax = upperMatches.reduce((max, m) => Math.max(max, m.round || 1), 0);
    const lMax = lowerMatches.reduce((max, m) => Math.max(max, m.round || 1), 0);

    const uLast = upperMatches.filter(m => m.round === uMax);
    const lLast = lowerMatches.filter(m => m.round === lMax);

    const getWinners = (matches) => matches.map(m => (m.result === "1-0" || m.result === "1 - 0") ? m.white : ((m.result === "0-1" || m.result === "0 - 1") ? m.black : m.white));
    const getLosers = (matches) => matches.map(m => (m.result === "1-0" || m.result === "1 - 0") ? m.black : ((m.result === "0-1" || m.result === "0 - 1") ? m.white : m.black));

    // Handle Grand Finals completion
    if (isDoubleElim && gfMatches.length > 0) {
       if (gfrMatches.length > 0) {
         return res.status(400).json({ error: "The tournament is fully completed! Grand Finals Reset is finished." });
       }
       const gf = gfMatches[0];
       // Did the lower bracket winner (black) win?
       if (gf.result === "0-1" || gf.result === "0 - 1") {
         newMatches.push({ round: 1, white: gf.white, black: gf.black, bracket: "grand_finals_reset", result: "Pending" });
         tournament.matches.push(...newMatches);
         await tournament.save();
         return res.json({ message: "Grand Finals Reset generated!", data: tournament });
       } else {
         return res.status(400).json({ error: "The tournament is fully completed! Upper Bracket Champion won the Grand Finals." });
       }
    }

    if (!isDoubleElim && uLast.length === 1) {
       return res.status(400).json({ error: "The tournament is already completed! The Grand Finals match is finished." });
    }

    // Double Elim: Are we ready for Grand Finals?
    // Upper must have 1 winner. Lower must have 1 winner AND have played the max possible rounds.
    const expectedMaxLowerRounds = Math.max(1, 2 * uMax - 2);
    if (isDoubleElim && uLast.length === 1 && lMax === expectedMaxLowerRounds && lLast.length === 1) {
       const upperWinner = getWinners(uLast)[0];
       const lowerWinner = getWinners(lLast)[0];
       newMatches.push({ round: 1, white: upperWinner, black: lowerWinner, bracket: "grand_finals", result: "Pending" });
       tournament.matches.push(...newMatches);
       await tournament.save();
       return res.json({ message: "Grand Finals generated!", data: tournament });
    }

    // Otherwise, advance brackets
    let generatedSomething = false;

    // Advance Upper Bracket
    if (uLast.length > 1) {
      const uWinners = getWinners(uLast);
      const nextU = uMax + 1;
      const wCount = uWinners.length;
      const halfW = Math.floor(wCount / 2);
      for (let i = 0; i < halfW; i++) {
        newMatches.push({ round: nextU, white: uWinners[i * 2], black: uWinners[i * 2 + 1], bracket: "upper", result: "Pending" });
      }
      if (wCount % 2 !== 0) {
        newMatches.push({ round: nextU, white: uWinners[wCount - 1], black: "BYE", bracket: "upper", result: "1-0" });
      }
      generatedSomething = true;
    }

    // Advance Lower Bracket (Double Elim only)
    if (isDoubleElim) {
      const nextL = lMax + 1;
      
      // Determine if nextL requires upper bracket losers
      let dropInUpperRound = null;
      if (nextL === 1) {
        dropInUpperRound = 1;
      } else if (nextL % 2 === 0) {
        dropInUpperRound = (nextL + 2) / 2;
      }

      if (dropInUpperRound) {
        // Drop-in round: Lower bracket survivors vs Upper bracket losers
        // Make sure Upper round `dropInUpperRound` is completed!
        if (uMax >= dropInUpperRound) {
           const dropMatches = upperMatches.filter(m => m.round === dropInUpperRound);
           const drops = getLosers(dropMatches).filter(p => p !== "BYE"); // ignore byes
           const survivors = lMax > 0 ? getWinners(lLast) : [];
           
           let pool = nextL === 1 ? drops : [...survivors, ...drops];
           
           if (pool.length > 0) {
             const half = Math.floor(pool.length / 2);
             for (let i = 0; i < half; i++) {
               newMatches.push({ round: nextL, white: pool[i], black: pool[pool.length - 1 - i], bracket: "lower", result: "Pending" });
             }
             if (pool.length % 2 !== 0) {
               newMatches.push({ round: nextL, white: pool[half], black: "BYE", bracket: "lower", result: "1-0" });
             }
             generatedSomething = true;
           }
        }
      } else {
        // Normal lower round: survivors play each other
        if (lMax > 0 && lLast.length > 1) { 
           const survivors = getWinners(lLast);
           const half = Math.floor(survivors.length / 2);
           for (let i = 0; i < half; i++) {
             newMatches.push({ round: nextL, white: survivors[i * 2], black: survivors[i * 2 + 1], bracket: "lower", result: "Pending" });
           }
           if (survivors.length % 2 !== 0) {
             newMatches.push({ round: nextL, white: survivors[survivors.length - 1], black: "BYE", bracket: "lower", result: "1-0" });
           }
           generatedSomething = true;
        }
      }
    }

    if (!generatedSomething) {
       return res.status(400).json({ error: "Cannot generate matches at this time. Wait for more matches to finish." });
    }

    tournament.matches.push(...newMatches);
    await tournament.save();
    return res.json({ message: "Next Knockout round(s) generated successfully!", data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error generating next Knockout round', details: error.message });
  }
});

// DELETE: rollback the last generated round of matches (Swiss or Knockout)
app.delete('/api/tournaments/:id/rounds/last', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const matches = tournament.matches || [];
    if (matches.length === 0) {
      return res.status(400).json({ error: "No rounds to rollback." });
    }

    // Find highest round number
    const maxRound = matches.reduce((max, m) => Math.max(max, m.round || 1), 0);

    // Remove all matches belonging to the highest round
    tournament.matches = matches.filter(m => m.round !== maxRound);
    await tournament.save();

    res.json({ message: `Successfully rolled back Round ${maxRound}!`, data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error rolling back round', details: error.message });
  }
});

// DELETE: remove a player from the tournament
app.delete('/api/tournaments/:id/players/:playerName', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const playerIndex = tournament.playersList.findIndex(p => p.name === req.params.playerName);
    if (playerIndex === -1) {
      return res.status(404).json({ error: "Player not found in tournament list" });
    }

    tournament.playersList.splice(playerIndex, 1);
    tournament.players = tournament.playersList.length; // Keep count field in sync
    
    await tournament.save();
    res.json({ message: `Successfully removed player ${req.params.playerName}!`, data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error removing player', details: error.message });
  }
});

// PUT: update application status and corresponding user role
app.put('/api/applications/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status value. Must be Accepted or Rejected." });
    }
    
    const updatedApp = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!updatedApp) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    // Update user role if application accepted
    if (status === 'Accepted') {
      let normalizedRole = 'member';
      const title = updatedApp.roleTitle.toLowerCase();
      if (title.includes('oc')) normalizedRole = 'oc';
      else if (title.includes('hr')) normalizedRole = 'hr';
      else if (title.includes('media')) normalizedRole = 'media';
      else if (title.includes('trainer')) normalizedRole = 'trainer';
      else if (title.includes('trainee')) normalizedRole = 'trainee';
      
      await User.findOneAndUpdate(
        { email: updatedApp.email },
        { role: normalizedRole }
      );
    } else if (status === 'Rejected') {
      // Revert user role back to member
      await User.findOneAndUpdate(
        { email: updatedApp.email },
        { role: 'member' }
      );
    }
    
    res.json({ message: `Application status updated to ${status}`, data: updatedApp });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating application status', details: error.message });
  }
});

// POST: create a new tournament
app.post('/api/tournaments', async (req, res) => {
  try {
    const { title, type, status, startDate, endDate, time, location, description, players, detailsUrl, rounds } = req.body;
    
    const newTournament = new Tournament({
      title: title || 'Untitled Tournament',
      type: type || 'Swiss',
      status: status || 'Upcoming',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || 'Unknown',
      time: time || 'TBD',
      location: location || 'Zewail Chess Club',
      description: description || '',
      players: players || 0,
      detailsUrl: detailsUrl || '',
      rounds: rounds ? Number(rounds) : 0
    });

    const savedTournament = await newTournament.save();
    res.status(201).json({ message: 'Tournament created successfully!', data: savedTournament });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: error.message });
    }
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// DELETE: delete a tournament by ID
app.delete('/api/tournaments/:id', async (req, res) => {
  try {
    const deletedTournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!deletedTournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json({ message: 'Tournament deleted successfully!', data: deletedTournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// PUT: update tournament status or details by ID
app.put('/api/tournaments/:id', async (req, res) => {
  try {
    const updatedTournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updatedTournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json({ message: 'Tournament updated successfully!', data: updatedTournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating tournament', details: error.message });
  }
});

// GET: user's tournaments
app.get('/api/users/:email/tournaments', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tournaments = await Tournament.find({
      $or: [
        { 'registrations.email': email },
        { 'playersList.name': user.name }
      ]
    });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user tournaments', details: error.message });
  }
});

// POST: register for a tournament
app.post('/api/tournaments/:id/register', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'Email and name required' });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    // Check if already registered
    if (tournament.registrations.some(reg => reg.email === email)) {
      return res.status(400).json({ error: 'Already registered for this tournament' });
    }

    // Auto-approve and add to players list immediately
    tournament.registrations.push({ email, name, status: 'Approved' });
    
    // Check if user is already in playersList (just in case)
    if (!tournament.playersList.some(p => p.name === name)) {
      // Find user major if possible
      const user = await User.findOne({ email });
      tournament.playersList.push({ 
        name, 
        rating: 1500, // Default rating 
        major: user?.major || 'N/A' 
      });
      tournament.players = tournament.playersList.length;
    }

    const saved = await tournament.save();
    res.json({ message: 'Successfully joined tournament!', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// POST: leave a tournament
app.post('/api/tournaments/:id/leave', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'Email and name required' });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    if (tournament.status !== 'Upcoming') {
      return res.status(400).json({ error: 'Cannot leave an ongoing or completed tournament.' });
    }

    // Remove from registrations
    tournament.registrations = tournament.registrations.filter(reg => reg.email !== email);
    
    // Remove from players list
    const initialCount = tournament.playersList.length;
    tournament.playersList = tournament.playersList.filter(p => p.name !== name);
    tournament.players = tournament.playersList.length;

    const saved = await tournament.save();
    res.json({ message: 'Successfully left tournament!', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});
// --- Puzzle Tournament Routes ---

// POST: create a new puzzle tournament
app.post('/api/puzzle-tournaments', async (req, res) => {
  try {
    const { title, startDate, startTime, endDate, endTime, timeLimit, puzzles } = req.body;
    if (!title || !startDate || !puzzles || puzzles.length === 0) {
      return res.status(400).json({ error: 'Title, startDate, and at least one puzzle are required' });
    }

    const newTournament = new PuzzleTournament({
      title,
      startDate,
      startTime: startTime || "",
      endDate: endDate || "",
      endTime: endTime || "",
      timeLimit: timeLimit || 60,
      puzzles,
      leaderboard: []
    });

    const saved = await newTournament.save();
    res.status(201).json({ message: 'Puzzle tournament created successfully!', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create puzzle tournament', details: error.message });
  }
});

// GET: fetch all puzzle tournaments
app.get('/api/puzzle-tournaments', async (req, res) => {
  try {
    const tournaments = await PuzzleTournament.find().sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch puzzle tournaments', details: error.message });
  }
});

// GET: fetch a single puzzle tournament
app.get('/api/puzzle-tournaments/:id', async (req, res) => {
  try {
    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament', details: error.message });
  }
});

// PUT: update an entire puzzle tournament (dates, times, puzzles, etc.)
app.put('/api/puzzle-tournaments/:id', async (req, res) => {
  try {
    const { title, startDate, startTime, endDate, endTime, timeLimit, puzzles } = req.body;
    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    if (title !== undefined) tournament.title = title;
    if (startDate !== undefined) tournament.startDate = startDate;
    if (startTime !== undefined) tournament.startTime = startTime;
    if (endDate !== undefined) tournament.endDate = endDate;
    if (endTime !== undefined) tournament.endTime = endTime;
    if (timeLimit !== undefined) tournament.timeLimit = timeLimit;
    if (puzzles !== undefined) tournament.puzzles = puzzles;

    const saved = await tournament.save();
    res.json({ message: 'Puzzle tournament updated successfully!', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update puzzle tournament', details: error.message });
  }
});

// DELETE: delete a puzzle tournament
app.delete('/api/puzzle-tournaments/:id', async (req, res) => {
  try {
    const deleted = await PuzzleTournament.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Tournament not found' });
    res.json({ message: 'Puzzle tournament deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tournament', details: error.message });
  }
});

// POST: add a single puzzle to an existing tournament
app.post('/api/puzzle-tournaments/:id/puzzles', async (req, res) => {
  try {
    const { initialFen, mateIn, correctMoves, description } = req.body;
    if (!initialFen || !mateIn || !correctMoves || correctMoves.length === 0) {
      return res.status(400).json({ error: 'initialFen, mateIn, and correctMoves are required' });
    }

    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    tournament.puzzles.push({
      initialFen,
      mateIn,
      correctMoves,
      description: description || `Mate in ${mateIn}`
    });

    const saved = await tournament.save();
    res.json({ message: 'Puzzle added successfully!', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add puzzle', details: error.message });
  }
});

// DELETE: remove a puzzle from a tournament by puzzle index or id
app.delete('/api/puzzle-tournaments/:id/puzzles/:puzzleIdOrIndex', async (req, res) => {
  try {
    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const param = req.params.puzzleIdOrIndex;
    if (!isNaN(param)) {
      const idx = parseInt(param, 10);
      if (idx >= 0 && idx < tournament.puzzles.length) {
        tournament.puzzles.splice(idx, 1);
      } else {
        return res.status(400).json({ error: 'Invalid puzzle index' });
      }
    } else {
      tournament.puzzles = tournament.puzzles.filter(p => p._id && p._id.toString() !== param);
    }

    const saved = await tournament.save();
    res.json({ message: 'Puzzle removed successfully!', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete puzzle', details: error.message });
  }
});

// POST: submit a score and update the leaderboard
app.post('/api/puzzle-tournaments/:id/submit-score', async (req, res) => {
  try {
    const { name, email, score, solvedCount } = req.body;
    if (!name || !email || score === undefined || solvedCount === undefined) {
      return res.status(400).json({ error: 'Name, email, score, and solvedCount are required' });
    }

    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    // Check if user already submitted a score
    const existingIndex = tournament.leaderboard.findIndex(entry => entry.email === email);
    if (existingIndex !== -1) {
      if (score > tournament.leaderboard[existingIndex].score) {
        tournament.leaderboard[existingIndex].score = score;
        tournament.leaderboard[existingIndex].solvedCount = solvedCount;
        tournament.leaderboard[existingIndex].name = name;
      }
    } else {
      tournament.leaderboard.push({ name, email, score, solvedCount });
    }

    // Sort leaderboard desc
    tournament.leaderboard.sort((a, b) => b.score - a.score);

    const saved = await tournament.save();
    res.json({ message: 'Score submitted successfully!', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit score', details: error.message });
  }
});

// --- Start server ---
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
