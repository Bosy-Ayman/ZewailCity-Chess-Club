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
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.warn('Nodemailer not found.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'zcchessclub-super-secret-key-change-me';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '963065836254-h2pdhhkdgt5c9p4vim5ervkdc13iqhl9.apps.googleusercontent.com');

const isAdminEmail = (email) => {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return (
    e === 'admin@zcchessclub.com' ||
    e === 'chesszc@zewailcity.edu.eg' ||
    e.includes('chesszc') ||
    e.includes('admin') ||
    e.includes('poussy.ayman') ||
    e.includes('bosy.ayman') ||
    e.includes('poussyayman') ||
    e === 'poussyayman1@gmail.com' ||
    e === 'poussy.ayman1@gmail.com'
  );
};
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middlewares ---
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Serverless-friendly database connection manager with global promise caching
let cachedDbPromise = null;

const getMongoUri = () => {
  return process.env.MONGO_URI || 'mongodb+srv://poussyayman1_db_user:BzCJwFdQ7TSa2DmR@cluster0.d7yqddz.mongodb.net/chess_club?retryWrites=true&w=majority';
};

// In-memory micro-cache to smoothly handle high-concurrency spikes (100+ concurrent users)
const memCache = new Map();
const getCached = (key) => {
  const item = memCache.get(key);
  if (item && item.expiry > Date.now()) return item.data;
  memCache.delete(key);
  return null;
};
const setCached = (key, data, ttlMs = 5000) => {
  memCache.set(key, { data, expiry: Date.now() + ttlMs });
};
const clearCache = (prefix = '') => {
  if (!prefix) return memCache.clear();
  for (const key of memCache.keys()) {
    if (key.startsWith(prefix)) memCache.delete(key);
  }
};

const getMongoOptions = () => ({
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 30000,
  tls: true,
  tlsAllowInvalidCertificates: true,
  maxPoolSize: process.env.VERCEL ? 2 : 25, // Auto-scales to 25 connections in standalone node server (supports 100+ concurrent users effortlessly)
  minPoolSize: 0,
  maxIdleTimeMS: 15000
});

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

  try {
    if (!cachedDbPromise || state === 0 || state === 3) {
      console.log('Establishing MongoDB Atlas connection (serverless)...');
      const uri = getMongoUri();
      cachedDbPromise = mongoose.connect(uri, getMongoOptions());
    }
    await cachedDbPromise;
    next();
  } catch (err) {
    console.error('Database connection error in middleware:', err);
    cachedDbPromise = null;
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
  image: { type: String, default: '' },
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
    bracket: { type: String, default: 'upper' },
    matchTime: { type: String, default: '' },
    location: { type: String, default: '' },
    reminderSent15Min: { type: Boolean, default: false }
  }],
  rounds: { type: Number, default: 0 }, // Total planned rounds
  winner: { type: String, default: '' },
  podium: [{
    place: { type: Number },
    name: { type: String },
    points: { type: Number }
  }],
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
  
  // Chess Profile & Rating Fields
  fideRating: { type: Number, default: 0 },
  fideId: { type: String, default: "" },
  chessComRating: { type: Number, default: 0 },
  chessComUsername: { type: String, default: "" },
  lichessRating: { type: Number, default: 0 },
  lichessUsername: { type: String, default: "" },
  chessTitle: { type: String, default: "" },
  favOpening: { type: String, default: "" },
  bio: { type: String, default: "" },
  followers: [{ type: String }],
  following: [{ type: String }],
  challenges: [{
    fromEmail: { type: String, required: true },
    fromName: { type: String, required: true },
    timeControl: { type: String, default: '3+2 Blitz' },
    location: { type: String, default: 'Academic Building Lounge' },
    message: { type: String, default: '' },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Accepted', 'Declined'] },
    createdAt: { type: Date, default: Date.now }
  }],
  verified: { type: Boolean, default: false },
  cheers: { type: Number, default: 0 },
  clubRoles: [{
    department: { type: String },
    position: { type: String },
    assignedAt: { type: Date, default: Date.now }
  }],
  lastSeen: { type: Date, default: Date.now },
  playstyle: { type: String, default: "" },
  linkedHistoricalName: { type: String, default: "" },
  availability: [{
    day: { type: String, enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], default: 'Sunday' },
    from: { type: String, default: '08:00' },
    to: { type: String, default: '10:00' },
    note: { type: String, default: '' }
  }],

  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema, 'users');

// --- Notification Schema & Model ---
const NotificationSchema = new mongoose.Schema({
  recipientEmail: { type: String, required: true, index: true },
  type: { type: String, default: 'system' },
  actorName: { type: String, default: '' },
  actorEmail: { type: String, default: '' },
  actorAvatar: { type: String, default: '' },
  message: { type: String, required: true },
  link: { type: String, default: '/' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', NotificationSchema, 'notifications');

// --- Broadcast & Email Log Schema & Model ---
const BroadcastLogSchema = new mongoose.Schema({
  adminEmail: { type: String, required: true },
  recipientType: { type: String, default: 'all' }, // 'all' | 'specific'
  targetEmail: { type: String, default: '' },
  recipientCount: { type: Number, default: 0 },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '/' },
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true }
  },
  inAppCount: { type: Number, default: 0 },
  emailCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const BroadcastLog = mongoose.model('BroadcastLog', BroadcastLogSchema, 'broadcast_logs');

// --- Online Session & Presence Schema & Model ---
const OnlineSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  email: { type: String, default: '' },
  name: { type: String, default: 'Tactician' },
  role: { type: String, default: 'member' },
  avatar: { type: String, default: '' },
  currentPage: { type: String, default: 'Online' },
  currentPath: { type: String, default: '/' },
  lastSeen: { type: Date, default: Date.now, index: { expires: 300 } }
});

const OnlineSession = mongoose.model('OnlineSession', OnlineSessionSchema, 'online_sessions');

// Helper: create a notification record
async function createNotification({ recipientEmail, type, actorName, actorEmail, actorAvatar, message, link }) {
  try {
    if (!recipientEmail || !message) return;
    // Avoid self-notifications
    if (recipientEmail.toLowerCase() === actorEmail?.toLowerCase()) return;
    await Notification.create({ recipientEmail: recipientEmail.toLowerCase(), type, actorName, actorEmail, actorAvatar, message, link });
  } catch (err) {
    console.error('createNotification error:', err.message);
  }
}

// Dynamic resolution for application base URL in emails & notifications
const getAppBaseUrl = () => {
  if (process.env.CLIENT_URL && process.env.CLIENT_URL.trim()) {
    const url = process.env.CLIENT_URL.trim();
    return url.startsWith('http') ? url.replace(/\/+$/, '') : `https://${url.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()) {
    const url = process.env.VERCEL_PROJECT_PRODUCTION_URL.trim();
    return url.startsWith('http') ? url.replace(/\/+$/, '') : `https://${url.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim()) {
    const url = process.env.VERCEL_URL.trim();
    return url.startsWith('http') ? url.replace(/\/+$/, '') : `https://${url.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_BRANCH_URL && process.env.VERCEL_BRANCH_URL.trim()) {
    const url = process.env.VERCEL_BRANCH_URL.trim();
    return url.startsWith('http') ? url.replace(/\/+$/, '') : `https://${url.replace(/\/+$/, '')}`;
  }
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return 'https://zc-chess-club.vercel.app';
  }
  return 'http://localhost:3000';
};

const generateWinnerCelebrationEmailHtml = ({
  tournamentTitle,
  tournamentType,
  recipientName,
  winnerName,
  winnerScoreOrPoints,
  runnerUpName,
  runnerUpScoreOrPoints,
  thirdPlaceName,
  thirdPlaceScoreOrPoints,
  actionUrl
}) => {
  const appBaseUrl = getAppBaseUrl();
  const targetUrl = actionUrl ? (actionUrl.startsWith('http') ? actionUrl : `${appBaseUrl}${actionUrl}`) : appBaseUrl;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #100e0b; color: #f5f0e6; }
        .wrapper { max-width: 620px; margin: 20px auto; background-color: #17140e; border: 1.5px solid rgba(243, 193, 68, 0.45); border-radius: 18px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.75); }
        .header { background: radial-gradient(circle at 50% 0%, #2e2415 0%, #15120c 100%); padding: 32px 20px 24px; text-align: center; border-bottom: 2px solid #f3c144; }
        .trophy-icon { font-size: 44px; line-height: 1; margin-bottom: 8px; }
        .logo-title { color: #f3c144; font-size: 20px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin: 0; }
        .event-badge { display: inline-block; background: rgba(243, 193, 68, 0.15); border: 1px solid rgba(243, 193, 68, 0.35); color: #f3c144; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 4px 14px; border-radius: 999px; margin-top: 8px; }
        .content { padding: 32px 26px; }
        .champ-headline { color: #ffffff; font-size: 24px; font-weight: 900; margin: 0 0 10px; text-align: center; }
        .champ-sub { color: #bab19c; font-size: 14px; text-align: center; margin: 0 0 24px; line-height: 1.5; }
        
        .podium-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; margin: 20px 0; }
        .place-row { border-radius: 12px; }
        .gold-cell { background: linear-gradient(135deg, rgba(61, 48, 22, 0.9) 0%, rgba(30, 24, 14, 0.95) 100%); border: 1.5px solid #f3c144; padding: 14px 18px; border-radius: 12px; }
        .silver-cell { background: linear-gradient(135deg, rgba(43, 46, 51, 0.8) 0%, rgba(22, 24, 27, 0.9) 100%); border: 1.5px solid rgba(209, 213, 219, 0.5); padding: 12px 18px; border-radius: 12px; }
        .bronze-cell { background: linear-gradient(135deg, rgba(51, 35, 26, 0.8) 0%, rgba(27, 19, 14, 0.9) 100%); border: 1.5px solid rgba(205, 127, 50, 0.5); padding: 12px 18px; border-radius: 12px; }
        
        .cta-container { text-align: center; margin: 32px 0 12px; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #f7ce68 0%, #f3c144 60%, #c99522 100%); color: #12100d !important; font-weight: 900; font-size: 15px; text-decoration: none; padding: 14px 36px; border-radius: 999px; box-shadow: 0 4px 18px rgba(243, 193, 68, 0.45); }
        .footer { padding: 22px 20px; text-align: center; background: #0f0d0a; border-top: 1px solid rgba(255,255,255,0.06); color: #888072; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <img src="https://zc-chess-club.vercel.app/Icons/chess-clublogo.png" alt="ZC Chess Club Logo" width="48" height="48" style="display: block; margin: 0 auto 8px; border-radius: 8px;" />
          <h1 class="logo-title">Zewail City Chess Club</h1>
          <span class="event-badge">${tournamentType || 'Championship Tournament'}</span>
        </div>
        <div class="content">
          <h2 class="champ-headline">Official Tournament Results! 👑</h2>
          <p class="champ-sub">
            Dear <strong>${recipientName}</strong>, the decisive games of <strong>${tournamentTitle}</strong> have concluded. Congratulations to our podium champions!
          </p>
          
          <table class="podium-table" cellpadding="0" cellspacing="0">
            <!-- 1st Place -->
            <tr>
              <td class="gold-cell">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="42" valign="middle" style="font-size: 26px;">🥇</td>
                    <td valign="middle">
                      <div style="font-size: 18px; font-weight: 800; color: #ffffff;">${winnerName}</div>
                      <div style="font-size: 13px; color: #f3c144; font-weight: 700; margin-top: 2px;">${winnerScoreOrPoints || 'Grand Champion'}</div>
                    </td>
                    <td align="right" valign="middle">
                      <span style="background: linear-gradient(135deg, #f7ce68, #f3c144); color: #12100d; font-size: 11px; font-weight: 900; padding: 4px 12px; border-radius: 999px;">CHAMPION</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- 2nd Place -->
            ${runnerUpName && runnerUpName !== 'BYE' && runnerUpName !== 'TBD' ? `
            <tr>
              <td style="height: 10px;"></td>
            </tr>
            <tr>
              <td class="silver-cell">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="42" valign="middle" style="font-size: 24px;">🥈</td>
                    <td valign="middle">
                      <div style="font-size: 16px; font-weight: 800; color: #ffffff;">${runnerUpName}</div>
                      <div style="font-size: 13px; color: #d1d5db; margin-top: 2px;">${runnerUpScoreOrPoints || 'Runner-Up / 2nd Place'}</div>
                    </td>
                    <td align="right" valign="middle">
                      <span style="font-size: 12px; font-weight: 800; color: #d1d5db;">RUNNER-UP</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ` : ''}

            <!-- 3rd Place -->
            ${thirdPlaceName && thirdPlaceName !== 'BYE' && thirdPlaceName !== 'TBD' ? `
            <tr>
              <td style="height: 10px;"></td>
            </tr>
            <tr>
              <td class="bronze-cell">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="42" valign="middle" style="font-size: 24px;">🥉</td>
                    <td valign="middle">
                      <div style="font-size: 16px; font-weight: 800; color: #ffffff;">${thirdPlaceName}</div>
                      <div style="font-size: 13px; color: #cd7f32; margin-top: 2px;">${thirdPlaceScoreOrPoints || '3rd Place'}</div>
                    </td>
                    <td align="right" valign="middle">
                      <span style="font-size: 12px; font-weight: 800; color: #cd7f32;">3RD PLACE</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ` : ''}
          </table>

          <p style="color: #c4bcae; font-size: 14px; line-height: 1.6; text-align: center; margin: 24px 0 16px;">
            Thank you to all participants for competing with tactical excellence. Check out the full bracket tree, match scores, and updated ratings directly on the platform.
          </p>

          <div class="cta-container">
            <a href="${targetUrl}" class="cta-btn">View Official Standings & Podium →</a>
          </div>

          <div style="text-align: center; margin: 24px auto 8px;">
            <img src="https://zc-chess-club.vercel.app/Icons/official-stamp.png" alt="Official Zewail City Chess Club Seal" width="95" height="95" style="display: inline-block; transform: rotate(-5.2deg); filter: drop-shadow(0 4px 12px rgba(243, 193, 68, 0.4));" />
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Zewail City Chess Club. All rights reserved.</p>
          <p>Zewail City of Science, Technology and Innovation • Giza, Egypt</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Helper: Broadcast Champion / Winner Announcement & Email to all registered members
async function broadcastWinnerNotification({
  tournamentTitle,
  tournamentType,
  winnerName,
  winnerEmail,
  winnerAvatar,
  winnerScoreOrPoints,
  runnerUpName,
  runnerUpScoreOrPoints,
  thirdPlaceName,
  thirdPlaceScoreOrPoints,
  link
}) {
  try {
    if (!tournamentTitle || !winnerName || winnerName === 'BYE' || winnerName === 'TBD') return;

    // Resolve winner's avatar if not provided
    let finalAvatar = winnerAvatar || '';
    if (!finalAvatar) {
      const winnerUser = await User.findOne({
        $or: [
          { name: new RegExp(`^${winnerName.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') },
          { email: new RegExp(`^${(winnerEmail || winnerName).trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
        ]
      }).select('profileImage email');
      if (winnerUser) {
        if (winnerUser.profileImage) finalAvatar = winnerUser.profileImage;
        if (!winnerEmail && winnerUser.email) winnerEmail = winnerUser.email;
      }
    }

    // Resolve runner-up & 3rd place avatars if possible
    let finalRunnerUpAvatar = '';
    let finalThirdPlaceAvatar = '';

    if (runnerUpName && runnerUpName !== 'BYE' && runnerUpName !== 'TBD') {
      const runnerUser = await User.findOne({
        name: new RegExp(`^${runnerUpName.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i')
      }).select('profileImage');
      if (runnerUser && runnerUser.profileImage) finalRunnerUpAvatar = runnerUser.profileImage;
    }

    if (thirdPlaceName && thirdPlaceName !== 'BYE' && thirdPlaceName !== 'TBD') {
      const thirdUser = await User.findOne({
        name: new RegExp(`^${thirdPlaceName.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i')
      }).select('profileImage');
      if (thirdUser && thirdUser.profileImage) finalThirdPlaceAvatar = thirdUser.profileImage;
    }

    const allUsers = await User.find({}, 'name email');
    if (!allUsers || allUsers.length === 0) return;

    const formatBadge = tournamentType || 'Tournament';
    const notifMessage = `🏆 CHAMPION CROWNED: ${winnerName} won the ${tournamentTitle} (${formatBadge})! 👑`;
    const targetLink = link || '/tournaments';

    const podiumData = {
      tournamentTitle,
      tournamentType: formatBadge,
      winner: {
        name: winnerName,
        points: winnerScoreOrPoints || 'Champion',
        avatar: finalAvatar
      },
      runnerUp: (runnerUpName && runnerUpName !== 'BYE' && runnerUpName !== 'TBD') ? {
        name: runnerUpName,
        points: runnerUpScoreOrPoints || 'Runner-Up Finalist',
        avatar: finalRunnerUpAvatar
      } : null,
      thirdPlace: (thirdPlaceName && thirdPlaceName !== 'BYE' && thirdPlaceName !== 'TBD') ? {
        name: thirdPlaceName,
        points: thirdPlaceScoreOrPoints || '3rd Place',
        avatar: finalThirdPlaceAvatar
      } : null
    };

    // 1. In-App Notifications for all users
    const notifDocs = allUsers.map(u => ({
      recipientEmail: u.email.toLowerCase(),
      type: 'winner',
      actorName: winnerName,
      actorEmail: winnerEmail || 'chesszc@zewailcity.edu.eg',
      actorAvatar: finalAvatar,
      message: notifMessage,
      link: targetLink,
      metadata: podiumData,
      read: false,
      createdAt: new Date()
    }));

    if (notifDocs.length > 0) {
      await Notification.insertMany(notifDocs);
    }
    console.log(`[Winner Broadcast] In-App alerts dispatched to ${notifDocs.length} tacticians!`);

    // 2. Real Branded Emails for all registered users
    const appBaseUrl = getAppBaseUrl();
    const emailPromises = allUsers
      .filter(u => u.email)
      .map(u => {
        const html = generateWinnerCelebrationEmailHtml({
          tournamentTitle,
          tournamentType: formatBadge,
          recipientName: u.name || u.email.split('@')[0],
          winnerName,
          winnerScoreOrPoints,
          runnerUpName,
          runnerUpScoreOrPoints,
          thirdPlaceName,
          thirdPlaceScoreOrPoints,
          actionUrl: targetLink
        });

        return sendEmail({
          to: u.email,
          subject: `🏆 [ZC Chess Club] Champion Crowned: ${winnerName} won ${tournamentTitle}!`,
          html,
          text: `🏆 CHAMPION CROWNED: ${winnerName} won ${tournamentTitle} (${formatBadge})!\n\n🥇 1st Place: ${winnerName} (${winnerScoreOrPoints || 'Champion'})\n🥈 2nd Place: ${runnerUpName || 'Finalist'}\n🥉 3rd Place: ${thirdPlaceName || '3rd Place'}\n\nView Results: ${appBaseUrl}${targetLink}`
        });
      });

    const sendResults = await Promise.allSettled(emailPromises);
    const successCount = sendResults.filter(r => r.status === 'fulfilled' && r.value?.success && !r.value?.simulated).length;
    const simulatedCount = sendResults.filter(r => r.status === 'fulfilled' && r.value?.simulated).length;
    const failedCount = sendResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success)).length;

    console.log(`[Winner Broadcast] Podium emails summary: ${successCount} dispatched live, ${simulatedCount} simulated, ${failedCount} failed of ${allUsers.length} members.`);
  } catch (err) {
    console.warn('[Winner Broadcast Error]', err.message);
  }
}

// --- Email Service & SMTP Transporter ---
const getEmailTransporter = () => {
  if (!nodemailer) return null;
  const user = (process.env.SMTP_USER || 'chesszc@zewailcity.edu.eg').trim();
  const pass = (process.env.SMTP_PASS || '').trim();

  if (!pass) {
    console.warn('[Email Service Notice] SMTP_PASS environment variable is not defined on server. Emails are logged in simulated mode.');
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: isSecure,
    auth: {
      user: user,
      pass: pass
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });
};

const generateClubEmailHtml = ({ title, recipientName, message, actionLabel, actionUrl, senderName }) => {
  const appBaseUrl = getAppBaseUrl();
  const targetUrl = actionUrl ? (actionUrl.startsWith('http') ? actionUrl : `${appBaseUrl}${actionUrl}`) : appBaseUrl;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #12100d; color: #f5f0e6; }
        .wrapper { max-width: 600px; margin: 20px auto; background-color: #18150f; border: 1px solid rgba(243, 193, 68, 0.35); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
        .header { background: linear-gradient(135deg, #241f15 0%, #15120c 100%); padding: 26px; text-align: center; border-bottom: 2px solid #f3c144; }
        .logo-text { color: #f3c144; font-size: 20px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin: 6px 0 0; }
        .content { padding: 32px 28px; }
        .title { color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 16px; }
        .greeting { color: #c4bcae; font-size: 15px; margin-bottom: 14px; }
        .message-box { background: rgba(243, 193, 68, 0.06); border: 1px solid rgba(243, 193, 68, 0.25); border-radius: 12px; padding: 20px; color: #e8e2d6; font-size: 15px; line-height: 1.65; margin: 20px 0; white-space: pre-wrap; }
        .btn-container { text-align: center; margin: 28px 0 16px; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #f7ce68 0%, #f3c144 60%, #c99522 100%); color: #12100d !important; font-weight: 800; font-size: 15px; text-decoration: none; padding: 13px 32px; border-radius: 999px; box-shadow: 0 4px 16px rgba(243, 193, 68, 0.4); }
        .footer { padding: 20px; text-align: center; background: #110f0b; border-top: 1px solid rgba(255,255,255,0.06); color: #888072; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <img src="https://zc-chess-club.vercel.app/Icons/chess-clublogo.png" alt="ZC Chess Club Logo" width="48" height="48" style="display: block; margin: 0 auto 8px; border-radius: 8px;" />
          <p class="logo-text">Zewail City Chess Club</p>
        </div>
        <div class="content">
          <h1 class="title">${title || 'Official Club Announcement'}</h1>
          <p class="greeting">Dear ${recipientName || 'Tactician'},</p>
          <div class="message-box">${message}</div>
          <div class="btn-container">
            <a href="${targetUrl}" class="cta-btn">${actionLabel || 'Open ZC Chess Club →'}</a>
          </div>
          <p style="font-size: 13px; color: #9c9484; text-align: center; margin-top: 24px;">
            Dispatched by <strong>${senderName || 'Club Administration'}</strong> (${process.env.SMTP_USER || 'chesszc@zewailcity.edu.eg'})
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Zewail City Chess Club. All rights reserved.</p>
          <p>Zewail City of Science, Technology and Innovation • Giza, Egypt</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const sendEmail = async ({ to, subject, html, text, attachments }) => {
  try {
    const transporter = getEmailTransporter();
    const fromAddress = process.env.SMTP_FROM || `"Zewail City Chess Club" <${process.env.SMTP_USER || 'chesszc@zewailcity.edu.eg'}>`;
    
    if (!transporter) {
      console.log(`[Email Service - Simulated] To: ${to} | Subject: ${subject}`);
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      text: text || subject,
      html
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service - Sent] MessageId: ${info.messageId} to: ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email Service - Error] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// Helper: Resolve player contact email and display name for alerts
async function findPlayerContact(nameOrEmail, tournament) {
  if (!nameOrEmail || nameOrEmail === 'BYE' || nameOrEmail === 'TBD' || nameOrEmail.startsWith('Winner of')) {
    return null;
  }
  const clean = nameOrEmail.trim();

  // 1. Check tournament registrations
  if (tournament && Array.isArray(tournament.registrations)) {
    const reg = tournament.registrations.find(r => 
      (r.name && r.name.toLowerCase() === clean.toLowerCase()) ||
      (r.email && r.email.toLowerCase() === clean.toLowerCase())
    );
    if (reg && reg.email) {
      return { name: reg.name || clean, email: reg.email.toLowerCase() };
    }
  }

  // 2. Query User collection
  try {
    const user = await User.findOne({
      $or: [
        { name: new RegExp(`^${clean.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') },
        { email: new RegExp(`^${clean.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
      ]
    }).select('name email');

    if (user && user.email) {
      return { name: user.name || clean, email: user.email.toLowerCase() };
    }
  } catch (err) {
    console.warn('findPlayerContact lookup error:', err.message);
  }

  if (clean.includes('@')) {
    return { name: clean.split('@')[0], email: clean.toLowerCase() };
  }

  return null;
}

// Helper: Automatically dispatch in-app notifications and branded emails for match pairings
async function notifyTournamentPairings(tournament, matchesList) {
  if (!tournament || !Array.isArray(matchesList) || matchesList.length === 0) return;

  const typeStr = (tournament.type || '').toLowerCase();
  const isSwiss = typeStr.includes('swiss');
  const isDoubleKnockout = typeStr.includes('double');
  const isKnockout = !isSwiss && (
    typeStr.includes('knockout') || 
    typeStr.includes('elimination') ||
    typeStr.includes('single') ||
    isDoubleKnockout
  );

  let matchRuleNote = '';
  if (isDoubleKnockout) {
    matchRuleNote = `\n\n⚡ DOUBLE KNOCKOUT MATCH FORMAT & RULES:
• 🛡️ Two Lives: All players begin in the Winners Bracket. A loss drops you to the Losers Bracket. You are only eliminated after suffering a 2nd match loss.
• ⚔️ 2-Game Mini-Match: Each knockout tie consists of 2 games. Game 1 is played with the assigned colors below, and Game 2 is played immediately with REVERSED colors (White becomes Black, Black becomes White).
• First to 1.5 points (win + draw, or 2 wins) wins the match series.
• ⚡ Armageddon Decider (1 - 1 Tiebreaker): If the match ends tied 1 - 1, Armageddon is played with the Secret Time Bidding System: Both players write down the time they want for Black. The player who bids LESS TIME gets Black and plays with that exact time on their clock! White gets the standard base time.
• Draw Odds: White MUST WIN to advance. Black only needs a DRAW or WIN to win the match and advance!
• 👑 Grand Finals & Reset: The Winners Bracket Champion faces the Losers Bracket Champion. If the Losers Champion wins Match 1, a deciding Bracket Reset match is played!
• 📺 Video Guide on Armageddon Rules: https://www.youtube.com/watch?v=JAYrNhOG-OM`;
  } else if (isKnockout) {
    matchRuleNote = `\n\n⚔️ SINGLE KNOCKOUT MATCH FORMAT & RULES:
• ⚔️ 2-Game Mini-Match: Each knockout tie consists of 2 games. Game 1 is played with the assigned colors below, and Game 2 is played immediately with REVERSED colors (White becomes Black, Black becomes White).
• First to 1.5 points (win + draw, or 2 wins) advances to the next round.
• ⚡ Armageddon Decider (1 - 1 Tiebreaker): If the match ends tied 1 - 1, Armageddon is played with the Secret Time Bidding System: Both players write down the time they want for Black. The player who bids LESS TIME gets Black and plays with that exact time on their clock! White gets the standard base time.
• Draw Odds: White MUST WIN to advance. Black only needs a DRAW or WIN to win the match and advance!
• 📺 Video Guide on Armageddon Rules: https://www.youtube.com/watch?v=JAYrNhOG-OM`;
  } else if (isSwiss) {
    matchRuleNote = `\n\n🏛️ OFFICIAL FIDE SWISS SYSTEM FORMAT & RULES:
• ♾️ Non-Elimination: No player is eliminated. All players participate in all scheduled rounds.
• 🎯 Score-Group Pairings: In every round, players are paired against opponents with equal (or closest) scores. No two players meet twice.
• ⚖️ Color Balance: White ⚪ and Black ⚫ pieces alternate each round according to FIDE pairing regulations.
• 📊 Scoring: Win = 1.0 pt, Draw = 0.5 pt, Loss = 0.0 pt, Bye = 1.0 pt.
• 🏆 FIDE Tiebreaks: Direct Encounter • Buchholz Cut 1 • Sonneborn-Berger Score • Most Wins.`;
  }

  for (let i = 0; i < matchesList.length; i++) {
    const match = matchesList[i];
    const boardNumber = i + 1;
    const roundNumber = match.round || 1;
    const matchTimeStr = match.matchTime ? ` at ${match.matchTime}` : '';
    const locationStr = match.location || tournament.location || 'ZC Chess Club Lounge';

    // Look up both players
    const whitePlayer = await findPlayerContact(match.white, tournament);
    const blackPlayer = await findPlayerContact(match.black, tournament);

    // Notify White player
    if (whitePlayer && whitePlayer.email) {
      const oppText = blackPlayer ? blackPlayer.name : (match.black || 'TBD');
      const msg = isKnockout
        ? `⚔️ Knockout Match Alert: Round ${roundNumber} in "${tournament.title}" — 2-Game Match (Game 1: White ⚪ vs ${oppText} on Board #${boardNumber}${matchTimeStr}, Game 2: Reverse colors). Tied 1-1 goes to Armageddon (Secret Time Bid, Black has draw odds)!`
        : `⚔️ Match Alert: Round ${roundNumber} in "${tournament.title}" — You play White ⚪ vs ${oppText} on Board #${boardNumber}${matchTimeStr} (${locationStr})!`;

      await createNotification({
        recipientEmail: whitePlayer.email,
        type: 'tournament_start',
        actorName: 'ZC Chess Club Administration',
        actorEmail: process.env.SMTP_USER || 'chesszc@zewailcity.edu.eg',
        message: msg,
        link: `/tournamentdetails?id=${tournament._id}`
      });

      const emailHtml = generateClubEmailHtml({
        title: `⚔️ Round ${roundNumber} Match Pairing: ${tournament.title}`,
        recipientName: whitePlayer.name,
        message: `Your upcoming tournament match pairing has been scheduled:\n\n• Tournament: ${tournament.title}\n• Round: ${roundNumber}\n• Board: #${boardNumber}\n• Your Piece: White ⚪ (Game 1)\n• Opponent: ${oppText} ⚫\n• Location: ${locationStr}${match.matchTime ? `\n• Match Time: ${match.matchTime}` : ''}${matchRuleNote}\n\nPlease report to your designated board 5 minutes prior to the start time with your student ID.\n\nGood luck!`,
        actionLabel: 'View Tournament Bracket & Schedule →',
        actionUrl: `/tournamentdetails?id=${tournament._id}`,
        senderName: 'Tournament Arbiters & ZC Chess Club'
      });

      sendEmail({
        to: whitePlayer.email,
        subject: `[ZC Chess Club] ⚔️ Match Alert: Round ${roundNumber} Pairing in ${tournament.title}`,
        html: emailHtml,
        text: `${msg}\n${matchRuleNote}`
      }).catch(e => console.warn('Pairing email to white failed:', e.message));
    }

    // Notify Black player (if not BYE)
    if (blackPlayer && blackPlayer.email && match.black !== 'BYE') {
      const oppText = whitePlayer ? whitePlayer.name : (match.white || 'TBD');
      const msg = isKnockout
        ? `⚔️ Knockout Match Alert: Round ${roundNumber} in "${tournament.title}" — 2-Game Match (Game 1: Black ⚫ vs ${oppText} on Board #${boardNumber}${matchTimeStr}, Game 2: Reverse colors). Tied 1-1 goes to Armageddon (Secret Time Bid, Black has draw odds)!`
        : `⚔️ Match Alert: Round ${roundNumber} in "${tournament.title}" — You play Black ⚫ vs ${oppText} on Board #${boardNumber}${matchTimeStr} (${locationStr})!`;

      await createNotification({
        recipientEmail: blackPlayer.email,
        type: 'tournament_start',
        actorName: 'ZC Chess Club Administration',
        actorEmail: process.env.SMTP_USER || 'chesszc@zewailcity.edu.eg',
        message: msg,
        link: `/tournamentdetails?id=${tournament._id}`
      });

      const emailHtml = generateClubEmailHtml({
        title: `⚔️ Round ${roundNumber} Match Pairing: ${tournament.title}`,
        recipientName: blackPlayer.name,
        message: `Your upcoming tournament match pairing has been scheduled:\n\n• Tournament: ${tournament.title}\n• Round: ${roundNumber}\n• Board: #${boardNumber}\n• Your Piece: Black ⚫ (Game 1)\n• Opponent: ${oppText} ⚪\n• Location: ${locationStr}${match.matchTime ? `\n• Match Time: ${match.matchTime}` : ''}${matchRuleNote}\n\nPlease report to your designated board 5 minutes prior to the start time with your student ID.\n\nGood luck!`,
        actionLabel: 'View Tournament Bracket & Schedule →',
        actionUrl: `/tournamentdetails?id=${tournament._id}`,
        senderName: 'Tournament Arbiters & ZC Chess Club'
      });

      sendEmail({
        to: blackPlayer.email,
        subject: `[ZC Chess Club] ⚔️ Match Alert: Round ${roundNumber} Pairing in ${tournament.title}`,
        html: emailHtml,
        text: `${msg}\n${matchRuleNote}`
      }).catch(e => console.warn('Pairing email to black failed:', e.message));
    }
  }
}

// Helper: Parse tournament local date/time (Egypt/Cairo timezone) into a UTC Date object
function parseTournamentDateTime(dateStr, timeStr, isEnd = false) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleanDate = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    const direct = new Date(cleanDate);
    return isNaN(direct.getTime()) ? null : direct;
  }

  const defaultTime = isEnd ? '23:59:59' : '00:00:00';
  let time = timeStr ? timeStr.trim() : defaultTime;
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    time = `${time}:${isEnd ? '59' : '00'}`;
  }

  const isoString = `${cleanDate}T${time}`;

  try {
    const [y, m, d] = cleanDate.split('-').map(Number);
    const [hh, mm, ss] = time.split(':').map(Number);
    const utcMock = new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0, ss || 0));

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    });

    const parts = formatter.formatToParts(utcMock);
    const p = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }

    const cairoHour = parseInt(p.hour, 10) === 24 ? 0 : parseInt(p.hour, 10);
    const cairoDate = new Date(Date.UTC(
      parseInt(p.year, 10),
      parseInt(p.month, 10) - 1,
      parseInt(p.day, 10),
      cairoHour,
      parseInt(p.minute, 10),
      parseInt(p.second, 10)
    ));

    const offsetMs = cairoDate.getTime() - utcMock.getTime();
    const realUtcDate = new Date(utcMock.getTime() - offsetMs);
    if (!isNaN(realUtcDate.getTime())) {
      return realUtcDate;
    }
  } catch (e) {
    console.warn('[parseTournamentDateTime error]:', e.message);
  }

  const fallback = new Date(isoString);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// Helper: Parse matchTime string into a valid Date object for countdown checking
function parseMatchDateTime(matchTimeStr, fallbackDateStr = null) {
  if (!matchTimeStr || typeof matchTimeStr !== 'string') return null;
  const str = matchTimeStr.trim();
  if (!str || str === 'TBD' || str === 'Pending') return null;

  const currentYear = new Date().getFullYear();

  // Pattern 1: ISO or standard YYYY-MM-DD HH:MM
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d;
  }

  // Pattern 2: "Oct 4, 10:00 AM" or "Sep 15, 2:30 PM" or "Jan 1, 14:00"
  const m = str.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
  if (m) {
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthIdx = monthNames.indexOf(m[1].toLowerCase().slice(0, 3));
    if (monthIdx >= 0) {
      const day = parseInt(m[2], 10);
      let hour = 12;
      let minute = 0;
      if (m[3] && m[4]) {
        hour = parseInt(m[3], 10);
        minute = parseInt(m[4], 10);
        const ampm = (m[5] || '').toUpperCase();
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
      }
      return new Date(currentYear, monthIdx, day, hour, minute, 0);
    }
  }

  // Pattern 3: Time only like "14:30" or "2:30 PM" with fallbackDateStr (e.g. tournament.startDate)
  if (fallbackDateStr && /^\d{1,2}:\d{2}/.test(str)) {
    const timeMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2], 10);
      const ampm = (timeMatch[3] || '').toUpperCase();
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const d = new Date(fallbackDateStr);
      if (!isNaN(d.getTime())) {
        d.setHours(hour, minute, 0, 0);
        return d;
      }
    }
  }

  const directDate = new Date(str);
  if (!isNaN(directDate.getTime())) return directDate;
  return null;
}

// Helper: Dispatch 15-Minute Countdown Reminder Email and In-App notification
async function send15MinuteMatchReminder(tournament, match, boardIndex = 1) {
  if (!tournament || !match) return false;
  if (!match.white || !match.black || match.white === 'BYE' || match.black === 'BYE' || match.white === 'TBD' || match.black === 'TBD') return false;

  const typeStr = (tournament.type || '').toLowerCase();
  const isDoubleKnockout = typeStr.includes('double');
  const isKnockout = typeStr.includes('knockout') || typeStr.includes('elimination') || isDoubleKnockout;
  
  const whitePlayer = await findPlayerContact(match.white, tournament);
  const blackPlayer = await findPlayerContact(match.black, tournament);

  const boardNumber = boardIndex;
  const roundNumber = match.round || 1;
  const locationStr = match.location || tournament.location || 'ZC Chess Club Lounge';
  const matchTimeStr = match.matchTime || 'Soon';

  const roundName = match.bracket === 'grand_finals' ? 'Grand Finals' :
                    match.bracket === 'lower' ? `Lower Bracket Round ${roundNumber}` :
                    match.bracket === 'upper' ? `Upper Bracket Round ${roundNumber}` :
                    `Round ${roundNumber}`;

  let rulesQuickSummary = '';
  if (isDoubleKnockout) {
    rulesQuickSummary = `\n\n⚡ DOUBLE KNOCKOUT QUICK RULES:
• 2-Game Mini-Match: Game 1 (assigned pieces), Game 2 (colors reversed). First to 1.5 pts advances.
• ⚡ Armageddon (1-1 tie): Secret time bid for Black. Black gets draw odds (draw or win wins match). White must win.
• 🛡️ Two Lives: Losing this match moves you to Lower Bracket. You are only eliminated on 2nd loss!`;
  } else if (isKnockout) {
    rulesQuickSummary = `\n\n⚔️ KNOCKOUT QUICK RULES:
• 2-Game Mini-Match: Game 1 (assigned pieces), Game 2 (colors reversed). First to 1.5 pts advances.
• ⚡ Armageddon (1-1 tie): Secret time bid for Black + Draw odds (White must win).`;
  }

  // Notify White player
  if (whitePlayer && whitePlayer.email) {
    const oppName = blackPlayer ? blackPlayer.name : (match.black || 'Opponent');
    const msg = `⏰ 15-MINUTE MATCH ALERT: Your ${roundName} match in "${tournament.title}" starts in 15 minutes! You are White ⚪ vs ${oppName} ⚫ on Board #${boardNumber} at ${locationStr}. Please head to your board!`;

    await createNotification({
      recipientEmail: whitePlayer.email,
      type: 'tournament_start',
      actorName: 'Tournament Arbiters',
      actorEmail: process.env.SMTP_USER || 'chesszc@zewailcity.edu.eg',
      message: msg,
      link: `/tournamentdetails?id=${tournament._id}`
    });

    const emailHtml = generateClubEmailHtml({
      title: `⏰ 15-Minute Warning: Match Starting Soon!`,
      recipientName: whitePlayer.name,
      message: `Your scheduled tournament match is starting in approximately 15 minutes:\n\n• Tournament: ${tournament.title}\n• Stage: ${roundName}\n• Board: #${boardNumber}\n• Your Starting Color: White ⚪ (Game 1)\n• Opponent: ${oppName} ⚫\n• Location: ${locationStr}\n• Scheduled Time: ${matchTimeStr}${rulesQuickSummary}\n\nPlease proceed to the match board and prepare your scoresheet and student ID. Clocks will start promptly!`,
      actionLabel: 'View Live Tournament Board →',
      actionUrl: `/tournamentdetails?id=${tournament._id}`,
      senderName: 'Tournament Arbiters & ZC Chess Club'
    });

    sendEmail({
      to: whitePlayer.email,
      subject: `[ZC Chess Club] ⏰ 15-Minute Alert: Your Match in ${tournament.title} Starts Soon!`,
      html: emailHtml,
      text: `${msg}${rulesQuickSummary}`
    }).catch(e => console.warn('15-min reminder email to white failed:', e.message));
  }

  // Notify Black player
  if (blackPlayer && blackPlayer.email) {
    const oppName = whitePlayer ? whitePlayer.name : (match.white || 'Opponent');
    const msg = `⏰ 15-MINUTE MATCH ALERT: Your ${roundName} match in "${tournament.title}" starts in 15 minutes! You are Black ⚫ vs ${oppName} ⚪ on Board #${boardNumber} at ${locationStr}. Please head to your board!`;

    await createNotification({
      recipientEmail: blackPlayer.email,
      type: 'tournament_start',
      actorName: 'Tournament Arbiters',
      actorEmail: process.env.SMTP_USER || 'chesszc@zewailcity.edu.eg',
      message: msg,
      link: `/tournamentdetails?id=${tournament._id}`
    });

    const emailHtml = generateClubEmailHtml({
      title: `⏰ 15-Minute Warning: Match Starting Soon!`,
      recipientName: blackPlayer.name,
      message: `Your scheduled tournament match is starting in approximately 15 minutes:\n\n• Tournament: ${tournament.title}\n• Stage: ${roundName}\n• Board: #${boardNumber}\n• Your Starting Color: Black ⚫ (Game 1)\n• Opponent: ${oppName} ⚪\n• Location: ${locationStr}\n• Scheduled Time: ${matchTimeStr}${rulesQuickSummary}\n\nPlease proceed to the match board and prepare your scoresheet and student ID. Clocks will start promptly!`,
      actionLabel: 'View Live Tournament Board →',
      actionUrl: `/tournamentdetails?id=${tournament._id}`,
      senderName: 'Tournament Arbiters & ZC Chess Club'
    });

    sendEmail({
      to: blackPlayer.email,
      subject: `[ZC Chess Club] ⏰ 15-Minute Alert: Your Match in ${tournament.title} Starts Soon!`,
      html: emailHtml,
      text: `${msg}${rulesQuickSummary}`
    }).catch(e => console.warn('15-min reminder email to black failed:', e.message));
  }

  return true;
}

// Background 15-minute match reminder worker (Runs every 60 seconds)
async function checkAndDispatch15MinuteReminders() {
  try {
    const now = Date.now();
    const tournaments = await Tournament.find({
      status: { $in: ['Ongoing', 'Upcoming', 'Active'] }
    });

    for (const t of tournaments) {
      if (!Array.isArray(t.matches) || t.matches.length === 0) continue;
      let tournamentUpdated = false;

      for (let i = 0; i < t.matches.length; i++) {
        const m = t.matches[i];
        const resStr = String(m.result || '').toLowerCase().trim();
        const isFinished = resStr === '1-0' || resStr === '0-1' || resStr === '1/2-1/2' || resStr === '2-0' || resStr === '0-2' || resStr === '1.5-0.5' || resStr === '0.5-1.5' || resStr.includes('wins') || resStr.includes('armageddon');
        
        if (isFinished) continue;
        if (!m.matchTime || m.reminderSent15Min) continue;
        if (!m.white || !m.black || m.white === 'BYE' || m.black === 'BYE' || m.white === 'TBD' || m.black === 'TBD') continue;

        const matchDate = parseMatchDateTime(m.matchTime, t.startDate);
        if (!matchDate) continue;

        const timeDiffMs = matchDate.getTime() - now;
        // Trigger window: between 0 and 18 minutes before match start (approx 15 min)
        if (timeDiffMs > 0 && timeDiffMs <= 18 * 60 * 1000) {
          console.log(`[Auto-Reminder] Dispatching 15-min alert for match: ${m.white} vs ${m.black} in "${t.title}" (starts in ${Math.round(timeDiffMs / 60000)} mins)`);
          await send15MinuteMatchReminder(t, m, i + 1);
          m.reminderSent15Min = true;
          tournamentUpdated = true;
        }
      }

      if (tournamentUpdated) {
        await t.save();
      }
    }

    // Also auto-broadcast closed puzzle tournaments
    await checkAndAutoBroadcastPuzzleTournaments();
  } catch (err) {
    console.warn('[Auto-Reminder Error]:', err.message);
  }
}

// Start recurring 15-min reminder and auto-broadcast checker on long-running servers (not serverless functions)
if (!process.env.VERCEL) {
  setInterval(checkAndDispatch15MinuteReminders, 60 * 1000);
  setTimeout(checkAndDispatch15MinuteReminders, 3000);
}

// --- Puzzle Tournament Schema & Model ---
const PuzzleSchema = new mongoose.Schema({
  initialFen: { type: String, required: true },
  mateIn: { type: Number, required: true, min: 0, max: 10, default: 1 },
  correctMoves: [{ type: String, required: true }],
  description: { type: String, default: "" },
  timeLimit: { type: Number, default: null } // Custom seconds for this specific puzzle (e.g. 45, 90, 120)
});

const PuzzleTournamentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  startDate: { type: String, required: true }, // Beginning Date: YYYY-MM-DD
  startTime: { type: String, default: "" },    // Beginning Time: HH:MM
  endDate: { type: String, default: "" },      // Ending Date: YYYY-MM-DD
  endTime: { type: String, default: "" },      // Ending Time: HH:MM
  timeLimit: { type: Number, required: true, default: 60 }, // seconds per puzzle
  image: { type: String, default: "" },
  puzzles: [PuzzleSchema],
  participants: [{
    email: { type: String, required: true },
    name: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now }
  }],
  leaderboard: [{
    email: { type: String, required: true },
    name: { type: String, required: true },
    score: { type: Number, required: true },
    solvedCount: { type: Number, required: true }
  }],
  startBroadcasted: { type: Boolean, default: false },
  winnersBroadcasted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const PuzzleTournament = mongoose.model('PuzzleTournament', PuzzleTournamentSchema, 'puzzle_tournaments');

// Helper: Broadcast live announcement when a puzzle challenge starts
async function broadcastPuzzleStartNotification(tournament) {
  try {
    const allUsers = await User.find({}).select('email name role profileImage');
    if (!allUsers || allUsers.length === 0) return;

    // 1. In-app notifications
    try {
      const notifDocs = allUsers.map(u => ({
        recipientEmail: u.email.toLowerCase(),
        type: 'puzzle_start',
        actorName: 'ZC Chess Club Tactics Arena',
        actorEmail: process.env.SMTP_USER || 'chesszc@zewailcity.edu.eg',
        message: `♟️ Tactics Arena Live: "${tournament.title}" has officially begun! Solve puzzles, earn speed bonus points, and claim your spot on the leaderboard.`,
        link: '/puzzlechallenge',
        read: false,
        createdAt: new Date()
      }));

      if (notifDocs.length > 0) {
        await Notification.insertMany(notifDocs);
        console.log(`[Puzzle Start Broadcast] In-App alerts dispatched to ${notifDocs.length} tacticians!`);
      }
    } catch (notifErr) {
      console.warn('[Puzzle Start Broadcast - InApp Error]:', notifErr.message);
    }

    // 2. Real Emails
    const puzzleCount = (tournament.puzzles || []).length;
    const puzzleText = `${puzzleCount} tactical puzzle${puzzleCount > 1 ? 's' : ''}`;

    const emailPromises = allUsers
      .filter(u => u.email)
      .map(u => {
        const emailHtml = generateClubEmailHtml({
          title: `♟️ Puzzle Arena Live: ${tournament.title}`,
          recipientName: u.name || u.email.split('@')[0],
          message: `A new Puzzle Challenge tournament is now officially live and open for participation!\n\n• Challenge Arena: ${tournament.title}\n• Begins: ${tournament.startDate}${tournament.startTime ? ` at ${tournament.startTime}` : ''}\n• Ends: ${tournament.endDate || 'TBD'}${tournament.endTime ? ` at ${tournament.endTime}` : ''}\n• Time Limit: ${tournament.timeLimit || 60}s per puzzle\n• Challenge Size: ${puzzleText}\n\nEach tactician gets 1 official attempt with 3 trials per puzzle. Speed bonuses are awarded for rapid calculation.\n\nGood luck!`,
          actionLabel: '⚡ Enter Puzzle Arena Now →',
          actionUrl: '/puzzlechallenge',
          senderName: 'ZC Chess Club Arbiters'
        });

        return sendEmail({
          to: u.email,
          subject: `[ZC Chess Club] ♟️ Challenge Live: "${tournament.title}" is now open!`,
          html: emailHtml,
          text: `♟️ Tactics Arena Live: "${tournament.title}" is now open! Play at /puzzlechallenge`
        });
      });

    await Promise.allSettled(emailPromises);
    console.log(`[Puzzle Start Broadcast] Dispatched start alert emails for "${tournament.title}" to ${allUsers.length} tacticians!`);
  } catch (err) {
    console.warn('[Puzzle Start Broadcast Error]:', err.message);
  }
}

// Helper: Automatically check puzzle arenas for start and closed announcements
async function checkAndAutoBroadcastPuzzleTournaments() {
  try {
    const now = new Date();

    // 1. Check arenas that have started and need a "Live / Started" announcement
    const unbroadcastedLive = await PuzzleTournament.find({ startBroadcasted: { $ne: true } });
    for (const t of unbroadcastedLive) {
      if (!t.startDate || !t.puzzles || t.puzzles.length === 0) continue;
      const startAt = parseTournamentDateTime(t.startDate, t.startTime, false);
      const endAt = parseTournamentDateTime(t.endDate, t.endTime, true);

      if (!startAt || isNaN(startAt.getTime()) || now < startAt) continue;
      if (endAt && now > endAt) {
        // Tournament already concluded without start announcement, mark start as handled
        t.startBroadcasted = true;
        await t.save();
        continue;
      }

      console.log(`[Auto-Broadcast] Puzzle Arena "${t.title}" is now LIVE! Broadcasting start announcement...`);
      await broadcastPuzzleStartNotification(t);
      t.startBroadcasted = true;
      await t.save();
    }

    // 2. Check closed arenas that need a "Champions / Podium" announcement
    const closedTournaments = await PuzzleTournament.find({ winnersBroadcasted: { $ne: true } });
    for (const t of closedTournaments) {
      if (!t.endDate) continue;
      const endAt = parseTournamentDateTime(t.endDate, t.endTime, true);
      if (!endAt || isNaN(endAt.getTime()) || now < endAt) continue;

      // Arena deadline has passed (Closed)
      if (Array.isArray(t.leaderboard) && t.leaderboard.length > 0) {
        const sorted = [...t.leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0));
        const p1 = sorted[0];
        const p2 = sorted[1];
        const p3 = sorted[2];

        console.log(`[Auto-Broadcast] Puzzle Arena "${t.title}" deadline reached! Broadcasting champion ${p1.name}...`);
        await broadcastWinnerNotification({
          tournamentTitle: t.title,
          tournamentType: "Puzzle Tactics Arena",
          winnerName: p1.name,
          winnerEmail: p1.email,
          winnerScoreOrPoints: `${p1.score} pts (${p1.solvedCount || 0} solved)`,
          runnerUpName: p2 ? p2.name : '',
          runnerUpScoreOrPoints: p2 ? `${p2.score} pts (${p2.solvedCount || 0} solved)` : '',
          thirdPlaceName: p3 ? p3.name : '',
          thirdPlaceScoreOrPoints: p3 ? `${p3.score} pts (${p3.solvedCount || 0} solved)` : '',
          link: `/puzzlechallenge`
        });
      }

      t.winnersBroadcasted = true;
      await t.save();
    }
  } catch (err) {
    console.warn('[Auto-Broadcast Error]:', err.message);
  }
}

// --- Contact Message Schema & Model ---
const ContactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  category: { type: String, default: "General Inquiry" },
  subject: { type: String, default: "" },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const ContactMessage = mongoose.model('ContactMessage', ContactMessageSchema, 'contact_messages');

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://poussyayman1_db_user:BzCJwFdQ7TSa2DmR@cluster0.d7yqddz.mongodb.net/chess_club?retryWrites=true&w=majority';
if (!MONGO_URI) {
  console.error("Error: MONGO_URI not defined in environment variables.");
}

// Removed bufferCommands: false to allow Mongoose to wait for DB connection in serverless

mongoose.connection.on('connected', () => console.log('Mongoose connected to DB'));
mongoose.connection.on('error', (err) => console.error('Mongoose connection error:', err));
mongoose.connection.on('disconnected', () => console.warn('Mongoose disconnected'));

// Initialize connection on startup
if (mongoose.connection.readyState === 0) {
  const uri = getMongoUri();
  cachedDbPromise = mongoose.connect(uri, getMongoOptions()).then(async () => {
    seedAdminUser();
    seedPuzzleTournament();
  }).catch(err => {
    console.error('Initial background MongoDB connection error:', err.message);
  });
}

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
    await mongoose.connect(testUri, getMongoOptions());
    
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

    const derivedBatch = batch || (idNumber && /^\d{4}/.test(String(idNumber).trim()) ? String(idNumber).trim().slice(0, 4) : '2026');

    const newApp = new Application({
      name: name || 'Applicant',
      email: email.trim().toLowerCase(),
      idNumber: idNumber || '',
      phone: phone || '',
      major: major || 'General',
      batch: derivedBatch,
      roleTitle: roleTitle || 'Member',
      department: department || roleTitle || 'General Committee',
      roleSpecificData: roleSpecificData || {}
    });

    const savedApp = await newApp.save();
    clearCache('applications');
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
    const cached = getCached('applications_all');
    if (cached) return res.json(cached);

    const apps = await Application.find().sort({ submissionDate: -1 }).lean();
    setCached('applications_all', apps, 5000);
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
  }
});

// --- Real-time Online Presence & Heartbeat API ---
const handleHeartbeat = async (req, res) => {
  try {
    const { sessionId, email, name, role, avatar, currentPage, currentPath } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const id = sessionId || cleanEmail || `guest_${req.ip || 'anon'}`;
    const now = new Date();

    let resolvedName = name || (cleanEmail ? cleanEmail.split('@')[0] : 'Guest Tactician');
    let resolvedAvatar = avatar || '';
    let resolvedRole = role || (cleanEmail ? 'member' : 'guest');

    // If email provided, verify and enrich with User record if available
    if (cleanEmail) {
      try {
        const u = await User.findOne({ email: cleanEmail }).select('name profileImage role');
        if (u) {
          if (u.name) resolvedName = u.name;
          if (u.profileImage && !resolvedAvatar) resolvedAvatar = u.profileImage;
          if (u.role) resolvedRole = u.role;
          await User.updateOne({ _id: u._id }, { $set: { lastSeen: now } }).catch(() => {});
        }
      } catch (lookupErr) {}
    }

    await OnlineSession.findOneAndUpdate(
      { sessionId: id },
      {
        $set: {
          sessionId: id,
          email: cleanEmail,
          name: resolvedName,
          role: resolvedRole,
          avatar: resolvedAvatar,
          currentPage: currentPage || 'Online',
          currentPath: currentPath || '/',
          lastSeen: now
        }
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.json({ success: true, timestamp: now });
  } catch (err) {
    console.error('Heartbeat endpoint error:', err.message);
    res.status(500).json({ error: 'Heartbeat error', details: err.message });
  }
};

const handleGetOnlineUsers = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 3 * 60 * 1000); // active within last 3 minutes
    const rawSessions = await OnlineSession.find({ lastSeen: { $gte: cutoff } })
      .sort({ lastSeen: -1 })
      .limit(60)
      .lean();

    // Deduplicate in case a user has multiple tabs open
    const seenKeys = new Set();
    const activeUsers = [];

    for (const s of rawSessions) {
      const key = s.email ? s.email.toLowerCase() : s.sessionId;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      activeUsers.push({
        id: s.sessionId,
        name: s.name || 'Tactician',
        email: s.email || '',
        role: s.role || 'member',
        avatar: s.avatar || '',
        currentPage: s.currentPage || 'Online',
        currentPath: s.currentPath || '/',
        lastSeen: s.lastSeen
      });
    }

    res.json({
      count: activeUsers.length,
      users: activeUsers
    });
  } catch (err) {
    console.error('Get online users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch online users', count: 0, users: [] });
  }
};

app.post('/api/heartbeat', handleHeartbeat);
app.post('/api/presence/heartbeat', handleHeartbeat);
app.get('/api/users/online', handleGetOnlineUsers);
app.get('/api/presence/online', handleGetOnlineUsers);

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
        role: user.role,
        name: user.name,
        picture: user.profileImage
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
      
      const derivedBatch = batch || (idNumber && /^\d{4}/.test(String(idNumber).trim()) ? String(idNumber).trim().slice(0, 4) : '2026');
      
      // Auto-register google users when they provide sign-up profile fields
      user = new User({
        email,
        password: `google-auth-${Date.now()}`,
        name: name || payload.name || "",
        idNumber: idNumber || "",
        phone: phone || "",
        major: major || "",
        batch: derivedBatch,
        role: isAdminEmail(email) ? 'admin' : 'member',
        profileImage: payload.picture || ""
      });
      await user.save();
    } else {
      // Update details if passed during profile completion
      if (name) user.name = name;
      if (idNumber) {
        user.idNumber = idNumber;
        if (!user.batch || user.batch === '2026') {
          const autoB = String(idNumber).trim().slice(0, 4);
          if (/^\d{4}/.test(autoB)) user.batch = autoB;
        }
      }
      if (phone) user.phone = phone;
      if (major) user.major = major;
      if (batch) user.batch = batch;
      if (payload.picture && !user.profileImage) {
        user.profileImage = payload.picture;
      }
      if (isAdminEmail(user.email) && user.role !== 'admin') {
        user.role = 'admin';
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
        role: user.role,
        name: user.name,
        picture: user.profileImage
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

    const derivedBatch = batch || (idNumber && /^\d{4}/.test(String(idNumber).trim()) ? String(idNumber).trim().slice(0, 4) : '2026');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword,
      name: name || "",
      idNumber: idNumber || "",
      phone: phone || "",
      major: major || "",
      batch: derivedBatch,
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

// GET: Retrieve user profile (supports email or name query)
app.get('/api/profile', async (req, res) => {
  try {
    const { email, name, viewerEmail } = req.query;
    if (!email && !name) {
      return res.status(400).json({ error: 'Email or name query parameter is required' });
    }

    let query = null;
    if (email) {
      const cleanEmail = email.trim();
      const emailRegex = new RegExp(`^${cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
      query = { email: emailRegex };
    } else if (name) {
      const cleanName = name.trim();
      const nameRegex = new RegExp(`^${cleanName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
      query = { name: nameRegex };
    }

    let user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ 
        error: 'Tactician profile not found. This player has not registered an account on the website yet.',
        unregistered: true 
      });
    }

    const cleanViewer = viewerEmail ? viewerEmail.trim().toLowerCase() : "";
    const isOwner = cleanViewer && cleanViewer === (user.email || "").toLowerCase();
    let viewerIsAdmin = false;
    if (cleanViewer) {
      if (cleanViewer === 'admin@zcchessclub.com') {
        viewerIsAdmin = true;
      } else {
        const viewerDoc = await User.findOne({ email: new RegExp(`^${cleanViewer}$`, 'i') });
        if (viewerDoc && viewerDoc.role === 'admin') {
          viewerIsAdmin = true;
        }
      }
    }
    const canViewPrivatePhone = isOwner || viewerIsAdmin;

    let isFollowing = false;
    let followsViewer = false;
    if (cleanViewer) {
      const cleanUserEmail = (user.email || '').trim().toLowerCase();
      isFollowing = (user.followers || []).some(f => (f || '').trim().toLowerCase() === cleanViewer);
      followsViewer = (user.following || []).some(f => (f || '').trim().toLowerCase() === cleanViewer);

      // Bi-directional check: if targetUser.followers didn't have viewer, check if viewerDoc.following has target
      if (!isFollowing) {
        const viewerDoc = await User.findOne({ email: new RegExp(`^${cleanViewer.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') });
        if (viewerDoc) {
          if ((viewerDoc.following || []).some(f => (f || '').trim().toLowerCase() === cleanUserEmail)) {
            isFollowing = true;
            // Self-heal: ensure user has cleanViewer in followers
            await User.updateOne({ _id: user._id }, { $addToSet: { followers: cleanViewer } });
          }
          if (!followsViewer && (viewerDoc.followers || []).some(f => (f || '').trim().toLowerCase() === cleanUserEmail)) {
            followsViewer = true;
            await User.updateOne({ _id: user._id }, { $addToSet: { following: cleanViewer } });
          }
        }
      }
    }

    // Populate user details for followers and following lists
    const followerEmails = (user.followers || []).map(e => (e || '').trim().toLowerCase()).filter(Boolean);
    const followingEmails = (user.following || []).map(e => (e || '').trim().toLowerCase()).filter(Boolean);

    const followersList = followerEmails.length > 0
      ? await User.find(
          { email: { $in: followerEmails.map(e => new RegExp(`^${e}$`, 'i')) } },
          { name: 1, email: 1, profileImage: 1, role: 1, chessTitle: 1, fideRating: 1, chessComRating: 1, major: 1, verified: 1, followers: 1, following: 1 }
        )
      : [];

    const followingList = followingEmails.length > 0
      ? await User.find(
          { email: { $in: followingEmails.map(e => new RegExp(`^${e}$`, 'i')) } },
          { name: 1, email: 1, profileImage: 1, role: 1, chessTitle: 1, fideRating: 1, chessComRating: 1, major: 1, verified: 1, followers: 1, following: 1 }
        )
      : [];

    res.json({
      name: user.name || "",
      email: user.email,
      idNumber: user.idNumber || "",
      phone: canViewPrivatePhone ? (user.phone || "") : "",
      major: user.major || "",
      batch: user.batch || "",
      role: user.role || "member",
      profileImage: user.profileImage || "",
      fideRating: user.fideRating || 0,
      fideId: user.fideId || "",
      chessComRating: user.chessComRating || 0,
      chessComUsername: user.chessComUsername || "",
      lichessRating: user.lichessRating || 0,
      lichessUsername: user.lichessUsername || "",
      chessTitle: user.chessTitle || "",
      favOpening: user.favOpening || "",
      bio: user.bio || "",
      playstyle: user.playstyle || "",
      linkedHistoricalName: user.linkedHistoricalName || "",
      verified: user.verified || false,
      cheers: user.cheers || 0,
      createdAt: user.createdAt || null,
      followersCount: Math.max(followersList.length, (user.followers || []).length),
      followingCount: Math.max(followingList.length, (user.following || []).length),
      followers: user.followers || [],
      following: user.following || [],
      followersList,
      followingList,
      challenges: user.challenges || [],
      clubRoles: user.clubRoles || [],
      availability: user.availability || [],
      isFollowing,
      followsViewer
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching user profile', details: error.message });
  }
});

// GET: Fetch network (followers and following) with full user objects
app.get('/api/users/:email/network', async (req, res) => {
  try {
    const cleanEmail = req.params.email.trim().toLowerCase();
    const user = await User.findOne({ email: new RegExp(`^${cleanEmail}$`, 'i') });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const followerEmails = (user.followers || []).map(e => e.toLowerCase());
    const followingEmails = (user.following || []).map(e => e.toLowerCase());

    const followers = followerEmails.length > 0
      ? await User.find(
          { email: { $in: followerEmails.map(e => new RegExp(`^${e}$`, 'i')) } },
          { name: 1, email: 1, profileImage: 1, role: 1, chessTitle: 1, fideRating: 1, chessComRating: 1, major: 1, verified: 1, followers: 1, following: 1 }
        )
      : [];

    const following = followingEmails.length > 0
      ? await User.find(
          { email: { $in: followingEmails.map(e => new RegExp(`^${e}$`, 'i')) } },
          { name: 1, email: 1, profileImage: 1, role: 1, chessTitle: 1, fideRating: 1, chessComRating: 1, major: 1, verified: 1, followers: 1, following: 1 }
        )
      : [];

    res.json({ followers, following });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch network', details: err.message });
  }
});

// POST: Follow or Unfollow a player
app.post('/api/users/follow', express.json(), async (req, res) => {
  try {
    const { followerEmail, targetEmail } = req.body;
    if (!followerEmail || !targetEmail) {
      return res.status(400).json({ error: 'Both followerEmail and targetEmail are required' });
    }

    const cleanFollower = followerEmail.trim().toLowerCase();
    const cleanTarget = targetEmail.trim().toLowerCase();

    if (cleanFollower === cleanTarget) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findOne({ email: new RegExp(`^${cleanTarget.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') });
    const followerUser = await User.findOne({ email: new RegExp(`^${cleanFollower.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') });

    if (!targetUser || !followerUser) {
      return res.status(404).json({ error: 'One or both users not found in club directory' });
    }

    const isFollowing = (targetUser.followers || []).some(f => (f || '').trim().toLowerCase() === cleanFollower) ||
                        (followerUser.following || []).some(f => (f || '').trim().toLowerCase() === cleanTarget);

    if (isFollowing) {
      // Unfollow: sanitize both arrays cleanly
      const newTargetFollowers = (targetUser.followers || []).filter(f => (f || '').trim().toLowerCase() !== cleanFollower);
      const newFollowerFollowing = (followerUser.following || []).filter(f => (f || '').trim().toLowerCase() !== cleanTarget);
      await User.updateOne({ _id: targetUser._id }, { $set: { followers: newTargetFollowers } });
      await User.updateOne({ _id: followerUser._id }, { $set: { following: newFollowerFollowing } });

      return res.json({
        success: true,
        isFollowing: false,
        followersCount: newTargetFollowers.length,
        message: `Unfollowed ${targetUser.name || cleanTarget}`
      });
    } else {
      // Follow: ensure unique lowercased emails in both arrays
      const newTargetFollowers = Array.from(new Set([...(targetUser.followers || []).map(f => (f || '').trim().toLowerCase()).filter(Boolean), cleanFollower]));
      const newFollowerFollowing = Array.from(new Set([...(followerUser.following || []).map(f => (f || '').trim().toLowerCase()).filter(Boolean), cleanTarget]));
      await User.updateOne({ _id: targetUser._id }, { $set: { followers: newTargetFollowers } });
      await User.updateOne({ _id: followerUser._id }, { $set: { following: newFollowerFollowing } });

      // Notify the target that someone followed them
      await createNotification({
        recipientEmail: cleanTarget,
        type: 'follow',
        actorName: followerUser.name || cleanFollower,
        actorEmail: cleanFollower,
        actorAvatar: followerUser.profileImage || '',
        message: `${followerUser.name || cleanFollower} started following you`,
        link: `/profile?email=${encodeURIComponent(cleanFollower)}`
      });

      return res.json({
        success: true,
        isFollowing: true,
        followersCount: newTargetFollowers.length,
        message: `Now following ${targetUser.name || cleanTarget}`
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update follow status', details: err.message });
  }
});

// POST: Cheer for a player (increment their cheer count + optional notification)
app.post('/api/users/cheer', express.json(), async (req, res) => {
  try {
    const { targetEmail, targetName, cheererEmail, cheererName } = req.body;
    if (!targetEmail && !targetName) return res.status(400).json({ error: 'targetEmail or targetName required' });

    let query = null;
    if (targetEmail) {
      const cleanTarget = targetEmail.trim().toLowerCase();
      query = { email: new RegExp(`^${cleanTarget.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') };
    } else if (targetName) {
      const cleanName = targetName.trim();
      query = { name: new RegExp(`^${cleanName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') };
    }

    let updatedUser = await User.findOneAndUpdate(
      query,
      { $inc: { cheers: 1 } },
      { returnDocument: 'after' }
    );

    // If query by email failed but targetName was also provided, try targetName
    if (!updatedUser && targetEmail && targetName) {
      const cleanName = targetName.trim();
      updatedUser = await User.findOneAndUpdate(
        { name: new RegExp(`^${cleanName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') },
        { $inc: { cheers: 1 } },
        { returnDocument: 'after' }
      );
    }

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    // Optional: notify the person being cheered
    const cleanTargetEmail = updatedUser.email ? updatedUser.email.toLowerCase() : '';
    if (cheererEmail && cleanTargetEmail && cheererEmail.toLowerCase() !== cleanTargetEmail) {
      await createNotification({
        recipientEmail: cleanTargetEmail,
        type: 'system',
        actorName: cheererName || cheererEmail,
        actorEmail: cheererEmail.toLowerCase(),
        actorAvatar: '',
        message: `${cheererName || cheererEmail} cheered for you! 👏`,
        link: `/profile?email=${encodeURIComponent(cheererEmail.toLowerCase())}`
      });
    }

    res.json({ success: true, cheers: updatedUser.cheers || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cheer', details: err.message });
  }
});

// POST: Send a friendly campus challenge
app.post('/api/challenges', express.json(), async (req, res) => {
  try {
    const { fromEmail, fromName, targetEmail, timeControl, location, message } = req.body;
    if (!fromEmail || !targetEmail) {
      return res.status(400).json({ error: 'fromEmail and targetEmail are required' });
    }

    const cleanTarget = targetEmail.trim().toLowerCase();
    const targetUser = await User.findOne({ email: new RegExp(`^${cleanTarget}$`, 'i') });
    if (!targetUser) {
      return res.status(404).json({ error: 'Target tactician not found' });
    }

    const senderDisplayName = fromName || fromEmail.split('@')[0];
    const matchTimeControl = timeControl || '3+2 Blitz';
    const matchLocation = location || 'Academic Building Lounge';

    const newChallenge = {
      fromEmail: fromEmail.trim(),
      fromName: senderDisplayName,
      timeControl: matchTimeControl,
      location: matchLocation,
      message: message || '',
      status: 'Pending',
      createdAt: new Date()
    };

    await User.updateOne(
      { _id: targetUser._id },
      { $push: { challenges: newChallenge } }
    );

    // 🔔 1. In-App Notification for Challenged Student
    await createNotification({
      recipientEmail: cleanTarget,
      type: 'system',
      actorName: senderDisplayName,
      actorEmail: fromEmail.trim().toLowerCase(),
      actorAvatar: '',
      message: `⚔️ Duel Challenge: ${senderDisplayName} challenged you to a ${matchTimeControl} match at ${matchLocation}!`,
      link: '/profile'
    });

    // 📧 2. Instant Branded Email Invite with Accept / Respond details
    const emailHtml = generateClubEmailHtml({
      title: `⚔️ 1-on-1 Chess Duel Challenge!`,
      recipientName: targetUser.name || cleanTarget.split('@')[0],
      message: `${senderDisplayName} (${fromEmail.trim()}) has challenged you to an official 1-on-1 chess duel on campus!\n\n• Time Control: ${matchTimeControl}\n• Location: ${matchLocation}${message ? `\n• Note from ${senderDisplayName}: "${message}"` : ''}\n\nReady to battle on the 64 squares? Open your profile dashboard to accept or decline the challenge.`,
      actionLabel: 'Accept / Decline Challenge →',
      actionUrl: '/profile',
      senderName: senderDisplayName
    });

    const appBaseUrl = getAppBaseUrl();
    sendEmail({
      to: cleanTarget,
      subject: `[ZC Chess Club] ⚔️ Match Challenge from ${senderDisplayName}! (${matchTimeControl})`,
      html: emailHtml,
      text: `${senderDisplayName} challenged you to a ${matchTimeControl} chess match at ${matchLocation}! Visit ${appBaseUrl}/profile to respond.`
    }).catch(e => console.warn('Challenge invite email error:', e.message));

    res.json({
      success: true,
      message: `Friendly challenge delivered to ${targetUser.name || cleanTarget}!`,
      challenge: newChallenge
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send challenge', details: err.message });
  }
});

// PUT: Respond to a campus challenge (Accept / Decline)
app.put('/api/challenges/respond', express.json(), async (req, res) => {
  try {
    const { userEmail, challengeId, status } = req.body;
    if (!userEmail || !challengeId || !status) {
      return res.status(400).json({ error: 'userEmail, challengeId, and status are required' });
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const userDoc = await User.findOne({ email: new RegExp(`^${cleanEmail}$`, 'i') });
    if (!userDoc) return res.status(404).json({ error: 'User not found' });

    const challenge = (userDoc.challenges || []).find(c => c._id && c._id.toString() === challengeId.toString());

    await User.updateOne(
      { email: new RegExp(`^${cleanEmail}$`, 'i'), "challenges._id": challengeId },
      { $set: { "challenges.$.status": status } }
    );

    // 🔔 Notify challenger about the response
    if (challenge && challenge.fromEmail) {
      const challengerEmail = challenge.fromEmail.toLowerCase().trim();
      const responderName = userDoc.name || cleanEmail.split('@')[0];
      const isAccepted = status.toLowerCase() === 'accepted';
      const statusIcon = isAccepted ? '✅' : '❌';
      const msg = `⚔️ Challenge ${status}: ${responderName} has ${status.toLowerCase()} your ${challenge.timeControl} duel invite!`;

      await createNotification({
        recipientEmail: challengerEmail,
        type: 'system',
        actorName: responderName,
        actorEmail: cleanEmail,
        actorAvatar: userDoc.profileImage || '',
        message: msg,
        link: '/profile'
      });

      const emailHtml = generateClubEmailHtml({
        title: `${statusIcon} Challenge ${status}: ${responderName}`,
        recipientName: challenge.fromName || challengerEmail.split('@')[0],
        message: `${responderName} (${cleanEmail}) has ${status.toLowerCase()} your challenge for a ${challenge.timeControl} match at ${challenge.location}.\n\n${isAccepted ? '🎉 Get ready for battle! Coordinate with your opponent and set up the clock.' : 'The player declined this challenge. You can challenge other tacticians in the Community Hub.'}`,
        actionLabel: 'Open Profile & Challenges →',
        actionUrl: '/profile',
        senderName: 'ZC Chess Club Match Arbiter'
      });

      sendEmail({
        to: challengerEmail,
        subject: `[ZC Chess Club] ${statusIcon} Challenge ${status} by ${responderName}`,
        html: emailHtml,
        text: msg
      }).catch(e => console.warn('Challenge response email failed:', e.message));
    }

    res.json({ success: true, message: `Challenge ${status.toLowerCase()}ed successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to respond to challenge', details: err.message });
  }
});

// POST: Heartbeat ping for real-time presence tracking
app.post('/api/heartbeat', express.json(), async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      await User.updateOne(
        { email: new RegExp(`^${cleanEmail}$`, 'i') },
        { $set: { lastSeen: new Date() } }
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Heartbeat error' });
  }
});

// GET: Community Stats (Real Active Online Tacticians & Emails)
app.get('/api/community/stats', async (req, res) => {
  try {
    const total = await User.countDocuments({});
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
    const realOnlineCount = await User.countDocuments({ lastSeen: { $gte: twoMinsAgo } });
    const onlineUsers = await User.find(
      { lastSeen: { $gte: twoMinsAgo } },
      { email: 1, name: 1 }
    );
    res.json({
      success: true,
      totalTacticians: total || 1,
      activeNow: realOnlineCount,
      onlineEmails: onlineUsers.map(u => u.email)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// GET: Dynamic Club Activity & Winner Feed
app.get('/api/activity', async (req, res) => {
  try {
    const activities = [];

    // 1. Check for tournaments and recent winners / status
    const tournaments = await Tournament.find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(5);
    tournaments.forEach(t => {
      if (t.status === 'Completed' && (t.winner || (t.playersList && t.playersList[0]))) {
        const winnerName = t.winner || t.playersList[0].name;
        activities.push({
          id: `tour-win-${t._id}`,
          type: 'tournament_win',
          title: `🏆 ${winnerName} won ${t.title}!`,
          description: `Crowned Champion of the campus ${t.type} tournament.`,
          badge: 'Champion',
          timestamp: t.endDate || t.createdAt || new Date(),
          icon: 'trophy'
        });
      } else if (t.status === 'Ongoing') {
        activities.push({
          id: `tour-ongoing-${t._id}`,
          type: 'tournament_live',
          title: `⚡ ${t.title} is LIVE!`,
          description: `Round battles currently in progress at ${t.location || 'ZC Campus'}.`,
          badge: 'Live Tournament',
          timestamp: t.startDate || t.createdAt || new Date(),
          icon: 'swords'
        });
      }
    });

    // 2. Fetch challenges from registered users
    const usersWithChallenges = await User.find(
      { "challenges.0": { $exists: true } },
      { name: 1, email: 1, challenges: 1 }
    ).limit(10);

    usersWithChallenges.forEach(u => {
      (u.challenges || []).slice(-3).forEach((c, idx) => {
        activities.push({
          id: `chal-${u._id}-${c._id || idx}`,
          type: 'challenge',
          title: `⚔️ ${c.fromName || 'A member'} challenged ${u.name || 'a member'}`,
          description: `${c.timeControl} at ${c.location} • Status: ${c.status}`,
          badge: c.status === 'Accepted' ? 'Accepted' : 'Duel Invite',
          timestamp: c.createdAt || new Date(),
          icon: 'swords'
        });
      });
    });

    // 3. New registered club members
    const recentUsers = await User.find({}, { name: 1, email: 1, chessTitle: 1, role: 1, createdAt: 1 })
      .sort({ _id: -1 })
      .limit(6);

    recentUsers.forEach(u => {
      activities.push({
        id: `user-${u._id}`,
        type: 'member_joined',
        title: `♟️ ${u.name || u.email.split('@')[0]} joined the Club`,
        description: u.chessTitle ? `Titled ${u.chessTitle}` : (u.role === 'admin' ? 'Officer & Administrator' : 'Active Member'),
        badge: 'New Member',
        timestamp: u.createdAt || new Date(),
        icon: 'user'
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, 15));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity feed', details: err.message });
  }
});


// PUT: Admin management for player accounts
app.put('/api/admin/manage-user', express.json(), async (req, res) => {
  try {
    const { 
      adminEmail, 
      targetEmail, 
      name,
      idNumber,
      phone,
      major,
      batch,
      fideRating,
      fideId,
      chessComRating,
      chessComUsername,
      lichessRating,
      lichessUsername,
      favOpening,
      chessTitle, 
      bio, 
      playstyle,
      linkedHistoricalName,
      role, 
      clubRoles,
      verified,
      profileImage
    } = req.body;
    if (!adminEmail || !targetEmail) {
      return res.status(400).json({ error: 'adminEmail and targetEmail are required' });
    }

    const admin = await User.findOne({ email: new RegExp(`^${adminEmail.trim()}$`, 'i') });
    const isAuthorized = (admin && ['admin', 'president', 'vice_president'].includes(admin.role)) || isAdminEmail(adminEmail);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized. Administrator access required.' });
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (idNumber !== undefined) updateFields.idNumber = idNumber;
    if (phone !== undefined) updateFields.phone = phone;
    if (major !== undefined) updateFields.major = major;
    if (batch !== undefined) updateFields.batch = batch;
    if (fideRating !== undefined) updateFields.fideRating = Number(fideRating) || 0;
    if (fideId !== undefined) updateFields.fideId = fideId;
    if (chessComRating !== undefined) updateFields.chessComRating = Number(chessComRating) || 0;
    if (chessComUsername !== undefined) updateFields.chessComUsername = chessComUsername;
    if (lichessRating !== undefined) updateFields.lichessRating = Number(lichessRating) || 0;
    if (lichessUsername !== undefined) updateFields.lichessUsername = lichessUsername;
    if (favOpening !== undefined) updateFields.favOpening = favOpening;
    if (chessTitle !== undefined) updateFields.chessTitle = chessTitle;
    if (bio !== undefined) updateFields.bio = bio;
    if (playstyle !== undefined) updateFields.playstyle = playstyle;
    if (linkedHistoricalName !== undefined) updateFields.linkedHistoricalName = linkedHistoricalName;
    if (role !== undefined) updateFields.role = role;
    if (clubRoles !== undefined) updateFields.clubRoles = Array.isArray(clubRoles) ? clubRoles : [];
    if (verified !== undefined) updateFields.verified = !!verified;
    if (profileImage !== undefined) updateFields.profileImage = profileImage;

    const existingUser = await User.findOne({ email: new RegExp(`^${targetEmail.trim()}$`, 'i') });

    const roleLabels = {
      president: '👑 President / Club Leader',
      vice_president: '⭐ Vice President / Deputy Club Leader',
      admin: '👑 High Board Executive / Administrator',
      oc: '⚡ Head of Tournament Organizing Committee (OC)',
      hr: '👥 Head of Human Resources (HR)',
      pr: '📢 Head of Public Relations (PR)',
      media: '🎨 Head of Multimedia & Design',
      trainer: '🎓 Head of Training & Masterclasses',
      trainee: '♟️ Dedicated Club Trainee',
      member: '♟️ Official Club Member'
    };

    // Two-way synchronization between role and clubRoles
    if (role !== undefined && clubRoles === undefined) {
      updateFields.role = role;
      const deptMap = {
        president: [{ department: 'Executive High Board', position: 'President', assignedAt: new Date().toISOString() }],
        vice_president: [{ department: 'Executive High Board', position: 'Vice President', assignedAt: new Date().toISOString() }],
        admin: [{ department: 'Executive High Board', position: 'President', assignedAt: new Date().toISOString() }],
        oc: [{ department: 'Tournament Organizing Committee', position: 'Head', assignedAt: new Date().toISOString() }],
        hr: [{ department: 'Human Resources', position: 'Head', assignedAt: new Date().toISOString() }],
        pr: [{ department: 'Public Relations', position: 'Head', assignedAt: new Date().toISOString() }],
        media: [{ department: 'Multimedia & Design', position: 'Head', assignedAt: new Date().toISOString() }],
        trainer: [{ department: 'Training & Masterclasses', position: 'Head', assignedAt: new Date().toISOString() }],
        trainee: [{ department: 'Trainee Development Pathway', position: 'Trainee', assignedAt: new Date().toISOString() }],
        member: []
      };
      if (deptMap[role] !== undefined) {
        updateFields.clubRoles = deptMap[role];
      }
    } else if (clubRoles !== undefined && Array.isArray(clubRoles)) {
      updateFields.clubRoles = clubRoles;
      
      // Auto-derive synchronized authority role from assigned positions
      let derivedRole = 'member';
      if (clubRoles.some(r => r.department === 'Executive High Board' && r.position === 'President')) derivedRole = 'president';
      else if (clubRoles.some(r => r.department === 'Executive High Board' && r.position === 'Vice President')) derivedRole = 'vice_president';
      else if (clubRoles.some(r => r.department === 'Tournament Organizing Committee' && r.position === 'Head')) derivedRole = 'oc';
      else if (clubRoles.some(r => r.department === 'Human Resources' && r.position === 'Head')) derivedRole = 'hr';
      else if (clubRoles.some(r => r.department === 'Public Relations' && r.position === 'Head')) derivedRole = 'pr';
      else if (clubRoles.some(r => r.department === 'Multimedia & Design' && r.position === 'Head')) derivedRole = 'media';
      else if (clubRoles.some(r => r.department === 'Training & Masterclasses' && r.position === 'Head')) derivedRole = 'trainer';
      else if (clubRoles.some(r => r.department === 'Executive High Board')) derivedRole = 'president';
      else if (clubRoles.some(r => r.department === 'Tournament Organizing Committee')) derivedRole = 'oc';
      else if (clubRoles.some(r => r.department === 'Human Resources')) derivedRole = 'hr';
      else if (clubRoles.some(r => r.department === 'Public Relations')) derivedRole = 'pr';
      else if (clubRoles.some(r => r.department === 'Multimedia & Design')) derivedRole = 'media';
      else if (clubRoles.some(r => r.department === 'Training & Masterclasses')) derivedRole = 'trainer';
      else if (clubRoles.some(r => r.department === 'Trainee Development Pathway')) derivedRole = 'trainee';
      else if (role && role !== 'member') derivedRole = role;

      updateFields.role = derivedRole;
    }

    const isRoleChanged = role !== undefined && (!existingUser || existingUser.role !== (updateFields.role || role));
    const isClubRolesChanged = (clubRoles !== undefined || updateFields.clubRoles !== undefined) && (
      !existingUser || JSON.stringify(existingUser.clubRoles || []) !== JSON.stringify(updateFields.clubRoles || clubRoles || [])
    );

    const defaultPassword = await bcrypt.hash(`guest-${Date.now()}`, 10);
    const updatedUser = await User.findOneAndUpdate(
      { email: new RegExp(`^${targetEmail.trim()}$`, 'i') },
      { 
        $set: updateFields,
        $setOnInsert: {
          email: targetEmail.trim().toLowerCase(),
          password: defaultPassword
        }
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    // If role or executive department roles were directly granted/changed, dispatch instant In-App Notification and Branded Email!
    if (isRoleChanged || (isClubRolesChanged && (updatedUser.clubRoles || []).length > 0)) {
      const appointedRoleTitle = roleLabels[updatedUser.role] || `🎖️ ${String(updatedUser.role).toUpperCase()} Role`;
      const departmentList = Array.isArray(updatedUser.clubRoles) && updatedUser.clubRoles.length > 0
        ? updatedUser.clubRoles.map(r => `• ${r.department} — ${r.position}`).join('\n')
        : '';

      let appointmentDetails = `Dear ${updatedUser.name || 'Tactician'},\n\nYou have been officially appointed and granted executive club privileges directly by the Zewail City Chess Club Leadership.\n\n• Assigned Executive Authority: ${appointedRoleTitle}\n`;
      
      if (departmentList) {
        appointmentDetails += `• Department & Position Assignments:\n${departmentList}\n`;
      }
      if (updatedUser.chessTitle) {
        appointmentDetails += `• Official Chess Title: ${updatedUser.chessTitle}\n`;
      }
      if (updatedUser.batch) {
        appointmentDetails += `• Academic Batch: ${updatedUser.batch}\n`;
      }
      appointmentDetails += `• Appointed By: ${admin.name || adminEmail} (Executive High Board)\n• Effective Status: Active & Operational ✅\n\nYour account has been granted full executive privileges corresponding to your new role. You can now access administrative controls, organize campus championships, manage committee operations, and lead club initiatives.\n\nCongratulations on your appointment, and may your leadership inspire our club!`;

      // 1. Direct In-App Notification
      await createNotification({
        recipientEmail: updatedUser.email,
        type: 'general',
        actorName: admin.name || 'Executive High Board',
        actorEmail: adminEmail,
        message: `👑 Executive Appointment: You have been directly assigned as ${appointedRoleTitle} with updated departmental privileges by ${admin.name || 'Club Leadership'}!`,
        link: updatedUser.role === 'admin' ? '/admin' : '/profile'
      });

      // 2. Direct Branded HTML Email
      const emailHtml = generateClubEmailHtml({
        title: `👑 Official Appointment: Executive Privileges & Role Assigned!`,
        recipientName: updatedUser.name || 'Club Leader',
        message: appointmentDetails,
        actionLabel: updatedUser.role === 'admin' ? 'Open Executive Dashboard →' : 'View Your Member Profile →',
        actionUrl: updatedUser.role === 'admin' ? '/admin' : '/profile',
        senderName: 'ZC Chess Club Executive Board'
      });

      sendEmail({
        to: updatedUser.email,
        subject: `[ZC Chess Club] 👑 Official Appointment: Executive Privileges & Department Role Assigned`,
        html: emailHtml,
        text: appointmentDetails
      }).catch(err => console.warn('Direct role appointment email error:', err.message));
    }

    res.json({
      success: true,
      message: `Player ${updatedUser?.name || targetEmail} updated successfully by Admin.`,
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to manage user', details: err.message });
  }
});

// Helper function to update profile fields
const updateProfileHandler = async (req, res) => {
  try {
    const {
      email,
      name,
      phone,
      idNumber,
      major,
      batch,
      fideRating,
      fideId,
      chessComRating,
      chessComUsername,
      lichessRating,
      lichessUsername,
      chessTitle,
      favOpening,
      bio,
      playstyle,
      linkedHistoricalName,
      availability,
      password
    } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const cleanEmail = email.trim();
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (idNumber !== undefined) updateFields.idNumber = idNumber;
    if (major !== undefined) updateFields.major = major;
    if (batch !== undefined) updateFields.batch = batch;
    if (fideRating !== undefined) updateFields.fideRating = Number(fideRating) || 0;
    if (fideId !== undefined) updateFields.fideId = fideId;
    if (chessComRating !== undefined) updateFields.chessComRating = Number(chessComRating) || 0;
    if (chessComUsername !== undefined) updateFields.chessComUsername = chessComUsername;
    if (lichessRating !== undefined) updateFields.lichessRating = Number(lichessRating) || 0;
    if (lichessUsername !== undefined) updateFields.lichessUsername = lichessUsername;
    if (chessTitle !== undefined) updateFields.chessTitle = chessTitle;
    if (favOpening !== undefined) updateFields.favOpening = favOpening;
    if (bio !== undefined) updateFields.bio = bio;
    if (playstyle !== undefined) updateFields.playstyle = playstyle;
    if (linkedHistoricalName !== undefined) updateFields.linkedHistoricalName = linkedHistoricalName;
    if (Array.isArray(availability)) updateFields.availability = availability;

    if (password && password.trim().length > 0) {
      updateFields.password = await bcrypt.hash(password.trim(), 10);
    }

    const emailRegex = new RegExp(`^${cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');

    const user = await User.findOneAndUpdate(
      { email: emailRegex },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User account not found. Please register first.' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        name: user.name || "",
        email: user.email,
        idNumber: user.idNumber || "",
        phone: user.phone || "",
        major: user.major || "",
        batch: user.batch || "",
        role: user.role || "member",
        profileImage: user.profileImage || "",
        fideRating: user.fideRating || 0,
        fideId: user.fideId || "",
        chessComRating: user.chessComRating || 0,
        chessComUsername: user.chessComUsername || "",
        lichessRating: user.lichessRating || 0,
        lichessUsername: user.lichessUsername || "",
        chessTitle: user.chessTitle || "",
        favOpening: user.favOpening || "",
        bio: user.bio || "",
        playstyle: user.playstyle || "",
        linkedHistoricalName: user.linkedHistoricalName || "",
        availability: user.availability || []
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
};

// PUT & POST profile updates
app.put('/api/profile', express.json(), updateProfileHandler);
app.post('/api/profile', express.json(), updateProfileHandler);
app.post('/api/profile/update', express.json(), updateProfileHandler);

// GET: Fetch player availability
app.get('/api/users/:email/availability', async (req, res) => {
  try {
    const cleanEmail = req.params.email.trim();
    const emailRegex = new RegExp(`^${cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
    const user = await User.findOne({ email: emailRegex }).select('name email availability');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ name: user.name, email: user.email, availability: user.availability || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch availability', details: err.message });
  }
});

// POST & PUT: Update player availability
const updateAvailabilityHandler = async (req, res) => {
  try {
    const { email, availability } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!Array.isArray(availability)) return res.status(400).json({ error: 'Availability must be an array of time slots' });

    const cleanEmail = email.trim();
    const emailRegex = new RegExp(`^${cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
    const user = await User.findOneAndUpdate(
      { email: emailRegex },
      { $set: { availability } },
      { returnDocument: 'after' }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Availability updated successfully', availability: user.availability || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update availability', details: err.message });
  }
};

app.post('/api/users/availability', express.json(), updateAvailabilityHandler);
app.put('/api/users/availability', express.json(), updateAvailabilityHandler);

// PUT & POST: Update user profile image (base64 or URL)
const updateProfileImageHandler = async (req, res) => {
  try {
    const { email, profileImage } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const cleanEmail = email.trim();
    const emailRegex = new RegExp(`^${cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');

    const user = await User.findOneAndUpdate(
      { email: emailRegex },
      { $set: { profileImage } },
      { returnDocument: 'after' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }
    
    res.json({ message: 'Profile image updated successfully', profileImage: user.profileImage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile image', details: error.message });
  }
};

app.put('/api/profile/image', express.json({limit: '15mb'}), updateProfileImageHandler);
app.post('/api/profile/image', express.json({limit: '15mb'}), updateProfileImageHandler);

// GET: List all emails of users who have actually registered on the website
app.get('/api/users/registered-emails', async (req, res) => {
  try {
    const users = await User.find({}, { email: 1, _id: 0 });
    const registeredEmails = users.map(u => (u.email || '').toLowerCase().trim());
    res.json({ registeredEmails });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registered emails', details: err.message });
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

// GET: fetch all users (for admin dashboard / public directory)
app.get('/api/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        if (decoded && (['admin', 'president', 'vice_president'].includes(decoded.role) || isAdminEmail(decoded.email))) {
          isAdmin = true;
        }
      } catch (e) {}
    }

    // Phone is private: only returned to authenticated admins
    const projection = isAdmin ? '-password' : '-password -phone';
    const users = await User.find().select(projection);
    const completedTournaments = await Tournament.find({ status: 'Completed' });
    
    // Track winners from both live completed tournaments and historical input championships
    const tournamentWinners = new Map();

    const historicalWinners = [
      { name: "abdelrahman mohamed", title: "Spring 2026 Swiss Championship" },
      { name: "abdelrahman mohamed", title: "Fast Clock Blitz 2026" },
      { name: "bosy ayman", title: "Inter-University Championship 2026 (Girls)" },
      { name: "omar ezz", title: "Night Knockout 2026" },
      { name: "omar ezz", title: "Squad Tournament 2025 (Knights)" },
      { name: "ahmed elkodariy", title: "Squad Tournament 2025 (Knights)" },
      { name: "omar hafez", title: "Squad Tournament 2025 (Knights)" }
    ];
    historicalWinners.forEach(hw => {
      const arr = tournamentWinners.get(hw.name) || [];
      arr.push(hw.title);
      tournamentWinners.set(hw.name, arr);
    });

    completedTournaments.forEach(t => {
      let winName = (t.winner || '').toLowerCase().trim();
      if (!winName && t.playersList && t.playersList[0] && t.playersList[0].name) {
        winName = t.playersList[0].name.toLowerCase().trim();
      }
      if (winName) {
        const arr = tournamentWinners.get(winName) || [];
        arr.push(t.title);
        tournamentWinners.set(winName, arr);
      }
    });

    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
    const usersWithOnlineStatus = users.map(u => {
      const uObj = u.toObject();
      uObj.isOnline = uObj.lastSeen ? (new Date(uObj.lastSeen) >= twoMinsAgo) : false;

      const nameClean = (uObj.name || '').toLowerCase().trim();
      const emailClean = (uObj.email || '').toLowerCase().trim();

      const wonList = tournamentWinners.get(nameClean) || tournamentWinners.get(emailClean) || [];
      uObj.isChampion = wonList.length > 0;
      uObj.wonTournaments = wonList;

      return uObj;
    });
    res.json(usersWithOnlineStatus);
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
    const cached = getCached('tournaments_all');
    if (cached) return res.json(cached);

    const tournaments = await Tournament.find().sort({ startDate: 1 }).lean();
    // Dynamically compute player count to ensure it's always accurate
    const dynamicTournaments = tournaments.map(t => {
      t.players = t.playersList ? t.playersList.length : 0;
      return t;
    });
    setCached('tournaments_all', dynamicTournaments, 5000);
    res.json(dynamicTournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournaments', details: error.message });
  }
});

// GET: fetch a single tournament by ID (with dynamic player avatars and profiles)
app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const obj = tournament.toObject();
    obj.players = obj.playersList ? obj.playersList.length : 0;

    // Collect all player names in this tournament
    const playerNames = new Set();
    if (obj.playersList) {
      obj.playersList.forEach(p => { if (p.name) playerNames.add(p.name.trim()); });
    }
    if (obj.matches) {
      obj.matches.forEach(m => {
        if (m.white && m.white !== 'TBD' && m.white !== 'BYE') playerNames.add(m.white.trim());
        if (m.black && m.black !== 'TBD' && m.black !== 'BYE') playerNames.add(m.black.trim());
      });
    }

    const nameArray = Array.from(playerNames);
    const users = await User.find({
      $or: [
        { name: { $in: nameArray } },
        { email: { $in: nameArray } }
      ]
    }).select('name email profileImage major batch fideRating fideId chessTitle favOpening bio cheers availability');

    const playerAvatars = {};
    const playerProfiles = {};
    const playersAvailability = {};
    users.forEach(u => {
      if (u.profileImage) {
        if (u.name) playerAvatars[u.name.trim()] = u.profileImage;
        if (u.email) playerAvatars[u.email.trim()] = u.profileImage;
      }
      const profileData = {
        name: u.name,
        email: u.email,
        profileImage: u.profileImage || "",
        major: u.major || "",
        batch: u.batch || "",
        fideRating: u.fideRating || 0,
        fideId: u.fideId || "",
        chessTitle: u.chessTitle || "",
        favOpening: u.favOpening || "",
        bio: u.bio || "",
        cheers: u.cheers || 0
      };
      if (u.name) {
        playerProfiles[u.name.trim()] = profileData;
        playersAvailability[u.name.trim()] = u.availability || [];
        playersAvailability[u.name.trim().toLowerCase()] = u.availability || [];
      }
      if (u.email) {
        playerProfiles[u.email.trim().toLowerCase()] = profileData;
        playersAvailability[u.email.trim().toLowerCase()] = u.availability || [];
      }
    });

    obj.playerAvatars = playerAvatars;
    obj.playerProfiles = playerProfiles;
    obj.playersAvailability = playersAvailability;

    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament details', details: error.message });
  }
});

// GET: Dedicated endpoint for tournament player availability
app.get('/api/tournaments/:id/players-availability', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const playerNames = new Set();
    const playerEmails = new Set();
    (tournament.playersList || []).forEach(p => { if (p.name) playerNames.add(p.name.trim()); });
    (tournament.registrations || []).forEach(r => {
      if (r.name) playerNames.add(r.name.trim());
      if (r.email) playerEmails.add(r.email.trim().toLowerCase());
    });
    (tournament.matches || []).forEach(m => {
      if (m.white && m.white !== 'TBD' && m.white !== 'BYE') playerNames.add(m.white.trim());
      if (m.black && m.black !== 'TBD' && m.black !== 'BYE') playerNames.add(m.black.trim());
    });

    const userQueries = [];
    if (playerNames.size > 0) {
      userQueries.push({ name: { $in: Array.from(playerNames) } });
    }
    if (playerEmails.size > 0) {
      userQueries.push({ email: { $in: Array.from(playerEmails) } });
    }

    const users = userQueries.length > 0
      ? await User.find({ $or: userQueries }).select('name email availability profileImage')
      : [];

    const playersAvailability = {};
    users.forEach(u => {
      const avail = u.availability || [];
      if (u.name) {
        playersAvailability[u.name.trim()] = avail;
        playersAvailability[u.name.trim().toLowerCase()] = avail;
      }
      if (u.email) {
        playersAvailability[u.email.trim().toLowerCase()] = avail;
      }
    });

    res.json({ playersAvailability });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tournament player availability', details: err.message });
  }
});

// GET: fetch all player avatars from registered profiles
app.get('/api/players/avatars', async (req, res) => {
  try {
    const users = await User.find({ profileImage: { $exists: true, $ne: "" } })
      .select('name email profileImage major batch fideRating chessTitle favOpening bio');
    const avatarMap = {};
    const profileMap = {};
    users.forEach(u => {
      if (u.name) {
        avatarMap[u.name.trim()] = u.profileImage;
        profileMap[u.name.trim()] = {
          name: u.name,
          profileImage: u.profileImage,
          major: u.major || "",
          batch: u.batch || "",
          fideRating: u.fideRating || 0,
          chessTitle: u.chessTitle || "",
          favOpening: u.favOpening || "",
          bio: u.bio || ""
        };
      }
      if (u.email) avatarMap[u.email.trim()] = u.profileImage;
    });
    res.json({ avatars: avatarMap, profiles: profileMap });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch player avatars", details: err.message });
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
    const { round, white, black, result, matchTime, location } = req.body;
    if (!round || !white || !black || !result) {
      return res.status(400).json({ error: "Round, white, black, and result are required" });
    }
    
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    
    const newMatch = { 
      round: Number(round), 
      white, 
      black, 
      result,
      matchTime: matchTime || "",
      location: location || ""
    };
    tournament.matches.push(newMatch);
    await tournament.save();

    // 🔔 Automated pairing alert
    notifyTournamentPairings(tournament, [newMatch]).catch(e => console.warn('Pairing alert error:', e.message));

    res.json({ message: "Match result added successfully!", data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error adding match result', details: error.message });
  }
});

// Helper to determine match winner across single-game, 2-game match, and Armageddon results
const getMatchWinner = (result, white, black) => {
  if (!result || result === "Pending" || result === "1/2-1/2" || result === "1/2 - 1/2" || result === "0.5-0.5") return null;
  const res = String(result).toLowerCase().trim();
  // White wins
  if (
    res === "1-0" || res === "1 - 0" ||
    res.startsWith("1.5 - 0.5") || res.startsWith("1.5-0.5") ||
    res.startsWith("2 - 0") || res.startsWith("2-0") ||
    res.includes("white wins") || res.includes("white won") ||
    res.includes("armageddon: white")
  ) {
    return white;
  }
  // Black wins
  if (
    res === "0-1" || res === "0 - 1" ||
    res.startsWith("0.5 - 1.5") || res.startsWith("0.5-1.5") ||
    res.startsWith("0 - 2") || res.startsWith("0-2") ||
    res.includes("black wins") || res.includes("black won") ||
    res.includes("armageddon: black")
  ) {
    return black;
  }
  return null;
};

const getMatchLoser = (result, white, black) => {
  const winner = getMatchWinner(result, white, black);
  if (!winner) return null;
  return winner === white ? black : white;
};

// PUT: update an existing match result or pairing details
app.put('/api/tournaments/:id/matches/:matchId', async (req, res) => {
  try {
    const { result, white, black, matchTime, location } = req.body;
    if (result === undefined && white === undefined && black === undefined && matchTime === undefined && location === undefined) {
      return res.status(400).json({ error: "At least one update field (result, white, black, matchTime, or location) is required" });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const match = tournament.matches.id(req.params.matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    if (result !== undefined) match.result = result;
    if (white !== undefined) match.white = white;
    if (black !== undefined) match.black = black;
    if (matchTime !== undefined) match.matchTime = matchTime;
    if (location !== undefined) match.location = location;

    // Automatically advance the winner to the next round in the knockout bracket tree
    const isDoubleElim = tournament.type === "Double Elimination";
    if (!isDoubleElim && match.round) {
      const currentRound = match.round;
      const nextRound = currentRound + 1;
      const roundMatches = tournament.matches.filter(m => (!m.bracket || m.bracket === "upper") && m.round === currentRound);
      const mIdx = roundMatches.findIndex(m => m._id.toString() === match._id.toString());

      if (mIdx !== -1) {
        const nextRoundMatches = tournament.matches.filter(m => (!m.bracket || m.bracket === "upper") && m.round === nextRound);
        const targetIdx = Math.floor(mIdx / 2);
        const targetMatch = nextRoundMatches[targetIdx];

        if (targetMatch) {
          const winner = getMatchWinner(match.result, match.white, match.black);
          
          const isWhiteSlot = (mIdx % 2 === 0);
          if (winner && winner !== "BYE") {
            if (isWhiteSlot) targetMatch.white = winner;
            else targetMatch.black = winner;
          } else if (!match.result || match.result === "Pending") {
            const placeholder = `Winner of R${currentRound}-M${mIdx + 1}`;
            if (isWhiteSlot) targetMatch.white = placeholder;
            else targetMatch.black = placeholder;
            targetMatch.result = "Pending";
          }
        }
      }
    }

    // Check if this match finishes the tournament
    const allMatches = tournament.matches || [];
    const uMax = allMatches.reduce((max, m) => Math.max(max, m.round || 1), 0);
    const uLast = allMatches.filter(m => (!m.bracket || m.bracket === "upper") && m.round === uMax);
    const gfMatch = allMatches.find(m => m.bracket === "grand_finals");
    const gfrMatch = allMatches.find(m => m.bracket === "grand_finals_reset");
    const allCompleted = allMatches.every(m => m.result && m.result !== "Pending");

    if (allCompleted) {
      if (!isDoubleElim && uLast.length === 1 && (uMax > 1 || (tournament.playersList && tournament.playersList.length <= 2))) {
        const finalM = uLast[0];
        const winner = getMatchWinner(finalM.result, finalM.white, finalM.black);
        if (winner && winner !== "BYE") {
          tournament.winner = winner;
          tournament.status = "Completed";
        }
      } else if (isDoubleElim) {
        if (gfrMatch && gfrMatch.result && gfrMatch.result !== "Pending") {
          const winner = getMatchWinner(gfrMatch.result, gfrMatch.white, gfrMatch.black);
          if (winner && winner !== "BYE") {
            tournament.winner = winner;
            tournament.status = "Completed";
          }
        } else if (gfMatch && gfMatch.result && getMatchWinner(gfMatch.result, gfMatch.white, gfMatch.black) === gfMatch.white) {
          tournament.winner = gfMatch.white;
          tournament.status = "Completed";
        }
      }

      // 🏆 Dispatch Champion Alert & Emails to all members if winner is crowned
      if (tournament.winner && tournament.winner !== "BYE" && tournament.winner !== "TBD") {
        let runnerUp = null;
        if (!isDoubleElim && uLast.length === 1) {
          runnerUp = getMatchLoser(uLast[0]?.result, uLast[0]?.white, uLast[0]?.black);
        } else if (isDoubleElim) {
          if (gfrMatch && gfrMatch.result) runnerUp = getMatchLoser(gfrMatch.result, gfrMatch.white, gfrMatch.black);
          else if (gfMatch && gfMatch.result) runnerUp = gfMatch.black;
        }

        broadcastWinnerNotification({
          tournamentTitle: tournament.title,
          tournamentType: isDoubleElim ? "Double Elimination Knockout" : "Knockout Championship",
          winnerName: tournament.winner,
          winnerScoreOrPoints: "Grand Finals Champion",
          runnerUpName: runnerUp && runnerUp !== "BYE" ? runnerUp : "Finalist",
          runnerUpScoreOrPoints: "Runner-Up Finalist",
          thirdPlaceName: tournament.podium && tournament.podium[2]?.name ? tournament.podium[2].name : "",
          thirdPlaceScoreOrPoints: tournament.podium && tournament.podium[2]?.points ? `${tournament.podium[2].points} pts` : "3rd Place",
          link: `/tournamentdetails?id=${tournament._id}`
        }).catch(e => console.warn('Knockout winner broadcast error:', e.message));
      }
    }

    await tournament.save();

    // 🔔 Automated pairing alert if matchTime, location, or players were modified
    if (matchTime !== undefined || location !== undefined || white !== undefined || black !== undefined) {
      notifyTournamentPairings(tournament, [match]).catch(e => console.warn('Pairing alert error:', e.message));
    }

    res.json({ message: "Match updated successfully!", data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating match', details: error.message });
  }
});

// POST: Propose or Arbiter-set match schedule and dispatch alerts
app.post('/api/tournaments/:id/matches/:matchId/schedule-notice', async (req, res) => {
  try {
    const { 
      senderName, 
      senderEmail, 
      matchTime, 
      isArbiterOverride, 
      arbiterNote, 
      targetPlayerEmail 
    } = req.body;

    if (!matchTime) {
      return res.status(400).json({ error: "matchTime is required" });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const match = tournament.matches.id(req.params.matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    match.matchTime = matchTime;
    await tournament.save();

    const p1 = match.white;
    const p2 = match.black;
    const appUrl = `/tournaments?id=${tournament._id}`;

    // Find user docs for email & notification
    const playerNames = [p1, p2].filter(p => p && p !== 'TBD' && p !== 'BYE');
    const userQueryList = [{ name: { $in: playerNames } }];
    if (senderEmail) userQueryList.push({ email: new RegExp(`^${senderEmail.trim()}$`, 'i') });
    if (targetPlayerEmail) userQueryList.push({ email: new RegExp(`^${targetPlayerEmail.trim()}$`, 'i') });

    const matchedUsers = await User.find({ $or: userQueryList });

    const userEmailMap = {};
    matchedUsers.forEach(u => {
      if (u.name) userEmailMap[u.name.trim().toLowerCase()] = u.email;
    });

    const titlePrefix = isArbiterOverride 
      ? `👑 Arbiter Match Order: Round ${match.round}` 
      : `⚔️ Match Schedule Proposed: Round ${match.round}`;

    const messageBody = isArbiterOverride
      ? `👑 Official Tournament Arbiter Notice:\n\nYour Round ${match.round} match (${p1} vs ${p2}) has been officially scheduled by the Tournament Arbiter for:\n📅 ${matchTime}\nLocation: Zewail Chess Club Lounge\n${arbiterNote ? `Arbiter Note: "${arbiterNote}"\n\n` : '\n'}Both competitors must be present at the board on time.`
      : `⚔️ Match Schedule Proposal:\n\n${senderName || 'Your opponent'} proposed playing your Round ${match.round} match on:\n📅 ${matchTime}\nLocation: Zewail Chess Club Lounge\n\nPlease check the tournament page to view or confirm.`;

    const whiteEmail = userEmailMap[p1.toLowerCase()] || (p1.includes('@') ? p1 : null);
    const blackEmail = userEmailMap[p2.toLowerCase()] || (p2.includes('@') ? p2 : null);

    const recipients = Array.from(new Set([whiteEmail, blackEmail, targetPlayerEmail].filter(Boolean)));

    for (const recipientEmail of recipients) {
      await createNotification({
        recipientEmail,
        type: 'tournament_start',
        actorName: isArbiterOverride ? 'Tournament Arbiter' : (senderName || 'Opponent'),
        message: `${titlePrefix}: ${p1} vs ${p2} scheduled for ${matchTime}`,
        link: appUrl
      });

      const emailHtml = generateClubEmailHtml({
        title: titlePrefix,
        recipientName: recipientEmail.split('@')[0],
        message: messageBody,
        actionLabel: 'View Match in Tournament Bracket →',
        actionUrl: appUrl,
        senderName: isArbiterOverride ? 'ZC Tournament Arbiter' : (senderName || 'ZC Chess Club')
      });

      sendEmail({
        to: recipientEmail,
        subject: `[ZC Chess Club] ${titlePrefix}: ${p1} vs ${p2}`,
        html: emailHtml,
        text: messageBody
      }).catch(e => console.warn('Match schedule email error:', e.message));
    }

    res.json({
      message: isArbiterOverride ? "Official schedule set & players notified" : "Schedule proposed & opponent notified",
      matchTime: match.matchTime
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to dispatch match schedule notice", details: err.message });
  }
});

// POST: Manually dispatch 15-minute match reminder for a specific match
app.post('/api/tournaments/:id/matches/:matchId/send-15min-reminder', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const matchIndex = tournament.matches.findIndex(m => String(m._id) === String(req.params.matchId));
    if (matchIndex === -1) return res.status(404).json({ error: "Match not found" });

    const match = tournament.matches[matchIndex];
    const success = await send15MinuteMatchReminder(tournament, match, matchIndex + 1);
    if (!success) {
      return res.status(400).json({ error: "Cannot send reminder for TBD or BYE match" });
    }

    match.reminderSent15Min = true;
    await tournament.save();

    res.json({ message: "⏰ 15-minute game reminder dispatched successfully via Email and In-App notification!", data: match });
  } catch (error) {
    res.status(500).json({ error: "Failed to dispatch reminder", details: error.message });
  }
});

// DELETE: clear/reset all matches for a tournament (allows restarting bracket)
app.delete('/api/tournaments/:id/matches', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    tournament.matches = [];
    tournament.winner = null;
    tournament.status = "Upcoming";
    await tournament.save();
    res.json({ message: "Tournament matches reset successfully!", data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error resetting tournament matches', details: error.message });
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

    // 🔔 Automated tournament match pairing alert dispatch
    notifyTournamentPairings(tournament, newMatches).catch(e => console.warn('Pairing alert error:', e.message));

    const byeMsg = byePlayer ? ` Player "${byePlayer.name}" receives a BYE (+1 pt).` : '';
    res.json({ message: `Round ${nextRound} FIDE Swiss pairings generated successfully!${byeMsg}`, data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error generating Swiss pairings', details: error.message });
  }
});


// Helper to determine match winner across single-game, 2-game match, and Armageddon results
const getKnockoutSeedOrder = (size) => {
  let roundsCount = Math.log2(size) - 1;
  let order = [1, 2];
  for (let r = 0; r < roundsCount; r++) {
    const nextOrder = [];
    const sum = (order.length * 2) + 1;
    for (let j = 0; j < order.length; j++) {
      nextOrder.push(order[j]);
      nextOrder.push(sum - order[j]);
    }
    order = nextOrder;
  }
  return order;
};

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

      // Bracket size is next power of 2 >= n (minimum 2)
      const n = list.length;
      let bracketSize = 2;
      while (bracketSize < n) {
        bracketSize *= 2;
      }

      const isDoubleElim = tournament.type === "Double Elimination";
      const totalRounds = Math.log2(bracketSize);
      const bracketOrder = getKnockoutSeedOrder(bracketSize);
      const newMatches = [];
      const matchCount = bracketSize / 2;

      // 1. Generate Round 1 matches
      const round1Matches = [];
      for (let i = 0; i < matchCount; i++) {
        const seedA = bracketOrder[i * 2];
        const seedB = bracketOrder[i * 2 + 1];
        const playerA = seedA <= n ? list[seedA - 1].name : "BYE";
        const playerB = seedB <= n ? list[seedB - 1].name : "BYE";

        let result = "Pending";
        if (playerA === "BYE" && playerB !== "BYE") {
          result = "0-1"; // Automatic bye win for Black
        } else if (playerB === "BYE" && playerA !== "BYE") {
          result = "1-0"; // Automatic bye win for White
        }

        const mObj = {
          round: 1,
          white: playerA,
          black: playerB,
          bracket: isDoubleElim ? "upper" : undefined,
          result: result
        };
        round1Matches.push(mObj);
      }
      newMatches.push(...round1Matches);

      // 2. Pre-generate all subsequent rounds (Round 2 through Finals) for Single Elimination
      // so the complete Challonge elimination tree is immediately visible from the start!
      if (!isDoubleElim && totalRounds > 1) {
        let prevMatches = round1Matches;
        for (let r = 2; r <= totalRounds; r++) {
          const currCount = prevMatches.length / 2;
          const currMatches = [];
          for (let i = 0; i < currCount; i++) {
            const feeder1 = prevMatches[i * 2];
            const feeder2 = prevMatches[i * 2 + 1];

            const feeder1Winner = getMatchWinner(feeder1.result, feeder1.white, feeder1.black);
            const feeder2Winner = getMatchWinner(feeder2.result, feeder2.white, feeder2.black);

            const whiteName = (feeder1Winner && feeder1Winner !== "BYE") 
              ? feeder1Winner 
              : `Winner of R${r - 1}-M${i * 2 + 1}`;
            
            const blackName = (feeder2Winner && feeder2Winner !== "BYE") 
              ? feeder2Winner 
              : `Winner of R${r - 1}-M${i * 2 + 2}`;

            currMatches.push({
              round: r,
              white: whiteName,
              black: blackName,
              bracket: "upper",
              result: "Pending"
            });
          }
          newMatches.push(...currMatches);
          prevMatches = currMatches;
        }
      }

      tournament.matches.push(...newMatches);
      await tournament.save();

      // 🔔 Automated knockout pairing alerts
      notifyTournamentPairings(tournament, newMatches).catch(e => console.warn('Knockout pairing alert error:', e.message));

      return res.json({ message: "Knockout tournament tree generated successfully!", data: tournament });
    }

    // CASE 2: Advance to Next Round (Round 2, 3, etc.)
    // For single elimination, if the tree was already pre-generated, verify feeder progression
    if (tournament.type !== "Double Elimination") {
      const allM = tournament.matches || [];
      const uMax = allM.reduce((max, m) => Math.max(max, m.round || 1), 0);
      const uLast = allM.filter(m => (!m.bracket || m.bracket === "upper") && m.round === uMax);
      
      if (uLast.length === 1 && uLast[0].result && uLast[0].result !== "Pending") {
        const finalWinner = getMatchWinner(uLast[0].result, uLast[0].white, uLast[0].black);
        if (finalWinner && tournament.winner !== finalWinner) {
          tournament.winner = finalWinner;
          tournament.status = "Completed";
          await tournament.save();
        }
        return res.status(400).json({ error: "The tournament is already completed! The Grand Finals match is finished.", winner: finalWinner });
      }

      // If matches exist across multiple rounds, check if all pending feeder slots can be refreshed
      let updatedCount = 0;
      for (let r = 1; r < uMax; r++) {
        const currRMatches = allM.filter(m => (!m.bracket || m.bracket === "upper") && m.round === r);
        const nextRMatches = allM.filter(m => (!m.bracket || m.bracket === "upper") && m.round === r + 1);

        currRMatches.forEach((m, mIdx) => {
          if (m.result && m.result !== "Pending") {
            const winner = getMatchWinner(m.result, m.white, m.black);
            const targetIdx = Math.floor(mIdx / 2);
            const targetMatch = nextRMatches[targetIdx];
            if (targetMatch && winner && winner !== "BYE") {
              if (mIdx % 2 === 0 && targetMatch.white !== winner) {
                targetMatch.white = winner;
                updatedCount++;
              } else if (mIdx % 2 === 1 && targetMatch.black !== winner) {
                targetMatch.black = winner;
                updatedCount++;
              }
            }
          }
        });
      }

      if (updatedCount > 0) {
        await tournament.save();
        return res.json({ message: "Tournament bracket matchups updated successfully!", data: tournament });
      }

      const pendingMatches = existingMatches.filter(m => !m.result || m.result === "Pending");
      if (pendingMatches.length > 0) {
        return res.status(400).json({ 
          error: `Cannot advance further. There are still ${pendingMatches.length} pending match(es) waiting to be scored.` 
        });
      }
      return res.json({ message: "Tournament bracket tree is fully generated and up to date!", data: tournament });
    }

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

    const getWinners = (matches) => matches.map(m => getMatchWinner(m.result, m.white, m.black) || m.white);
    const getLosers = (matches) => matches.map(m => getMatchLoser(m.result, m.white, m.black) || m.black);

    // Handle Grand Finals completion
    if (isDoubleElim && gfMatches.length > 0) {
       if (gfrMatches.length > 0) {
         return res.status(400).json({ error: "The tournament is fully completed! Grand Finals Reset is finished." });
       }
       const gf = gfMatches[0];
       // Did the lower bracket winner (black) win?
       if (getMatchWinner(gf.result, gf.white, gf.black) === gf.black) {
         newMatches.push({ round: 1, white: gf.white, black: gf.black, bracket: "grand_finals_reset", result: "Pending" });
         tournament.matches.push(...newMatches);
         await tournament.save();
         return res.json({ message: "Grand Finals Reset generated!", data: tournament });
       } else {
         return res.status(400).json({ error: "The tournament is fully completed! Upper Bracket Champion won the Grand Finals." });
       }
    }

    if (!isDoubleElim && uLast.length === 1) {
       const finalWinner = getWinners(uLast)[0];
       if (finalWinner && tournament.winner !== finalWinner) {
         tournament.winner = finalWinner;
         tournament.status = "Completed";
         await tournament.save();
       }
       return res.status(400).json({ error: "The tournament is already completed! The Grand Finals match is finished.", winner: finalWinner });
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
        newMatches.push({ 
          round: nextU, 
          white: uWinners[i * 2], 
          black: uWinners[i * 2 + 1], 
          bracket: isDoubleElim ? "upper" : undefined, 
          result: "Pending" 
        });
      }
      if (wCount % 2 !== 0) {
        newMatches.push({ 
          round: nextU, 
          white: uWinners[wCount - 1], 
          black: "BYE", 
          bracket: isDoubleElim ? "upper" : undefined, 
          result: "1-0" 
        });
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

    // 🔔 Automated knockout pairing alerts
    notifyTournamentPairings(tournament, newMatches).catch(e => console.warn('Knockout pairing alert error:', e.message));

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
      { returnDocument: 'after' }
    );
    
    if (!updatedApp) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    // Update user role if application accepted
    if (status === 'Accepted') {
      let normalizedRole = 'member';
      const title = (updatedApp.roleTitle || '').toLowerCase();
      if (title.includes('oc')) normalizedRole = 'oc';
      else if (title.includes('hr')) normalizedRole = 'hr';
      else if (title.includes('media')) normalizedRole = 'media';
      else if (title.includes('trainer')) normalizedRole = 'trainer';
      else if (title.includes('trainee')) normalizedRole = 'trainee';
      
      await User.findOneAndUpdate(
        { email: updatedApp.email },
        { role: normalizedRole }
      );

      // 1-Click Direct In-App Notification to accepted member
      await createNotification({
        recipientEmail: updatedApp.email,
        type: 'general',
        actorName: 'ZC Chess Club Executive Board',
        actorEmail: process.env.SMTP_USER || 'chesszc@zewailcity.edu.eg',
        message: `🎉 Congratulations ${updatedApp.name}! Your application for "${updatedApp.roleTitle}" (${updatedApp.department || 'General Committee'}) has been officially ACCEPTED! Welcome to the ZC Chess Club family.`,
        link: '/profile'
      });

      // 1-Click Direct Branded Email to accepted member
      const welcomeHtml = generateClubEmailHtml({
        title: `🎉 Welcome to ZC Chess Club: Application Accepted!`,
        recipientName: updatedApp.name,
        message: `Congratulations! We are delighted to inform you that your application to join the Zewail City Chess Club has been officially approved.\n\n• Assigned Role: ${updatedApp.roleTitle}\n• Department / Committee: ${updatedApp.department || 'General Committee'}\n• Academic Batch: ${updatedApp.batch || 'ZC Student'}\n• Membership Status: Officially Accepted ✅\n\nYour account has been upgraded with official member privileges. You can now access all club resources, compete in official university championships, assist in organizing club events, and connect with your fellow tacticians!\n\nWelcome aboard, and may the sharpest mind prevail!`,
        actionLabel: 'Visit Your Member Profile →',
        actionUrl: '/profile',
        senderName: 'ZC Chess Club Executive Board'
      });

      sendEmail({
        to: updatedApp.email,
        subject: `[ZC Chess Club] 🎉 Congratulations! Your Application for ${updatedApp.roleTitle} Has Been Accepted`,
        html: welcomeHtml,
        text: `Congratulations ${updatedApp.name}! Your application for ${updatedApp.roleTitle} in ${updatedApp.department || 'ZC Chess Club'} has been officially accepted. Welcome to the club!`
      }).catch(err => console.warn('Acceptance email dispatch error:', err.message));

    } else if (status === 'Rejected') {
      // Revert user role back to member
      await User.findOneAndUpdate(
        { email: updatedApp.email },
        { role: 'member' }
      );

      await createNotification({
        recipientEmail: updatedApp.email,
        type: 'general',
        actorName: 'ZC Chess Club Administration',
        actorEmail: process.env.SMTP_USER || 'chesszc@zewailcity.edu.eg',
        message: `Application Update: Your application for "${updatedApp.roleTitle}" was reviewed. Thank you for your interest in ZC Chess Club.`,
        link: '/profile'
      });
    }
    
    res.json({ message: `Application status updated to ${status}`, data: updatedApp });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating application status', details: error.message });
  }
});

// POST: create a new tournament
app.post('/api/tournaments', async (req, res) => {
  try {
    const { title, type, status, startDate, endDate, time, location, description, image, players, detailsUrl, rounds } = req.body;
    
    const newTournament = new Tournament({
      title: title || 'Untitled Tournament',
      type: type || 'Swiss',
      status: status || 'Upcoming',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || 'Unknown',
      time: time || 'TBD',
      location: location || 'Zewail Chess Club',
      description: description || '',
      image: image || '',
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
      { returnDocument: 'after' }
    );
    if (!updatedTournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // 🏆 If tournament was marked Completed or winner was set, dispatch champion alert & emails
    if (
      (req.body.status === 'Completed' || req.body.winner) &&
      (updatedTournament.winner || (updatedTournament.podium && updatedTournament.podium[0]?.name))
    ) {
      const p1 = (updatedTournament.podium && updatedTournament.podium[0]?.name) || updatedTournament.winner;
      const p1Pts = updatedTournament.podium?.[0]?.points != null ? `${updatedTournament.podium[0].points} pts` : "1st Place (Champion)";
      const p2 = (updatedTournament.podium && updatedTournament.podium[1]?.name) || "";
      const p2Pts = updatedTournament.podium?.[1]?.points != null ? `${updatedTournament.podium[1].points} pts` : "Runner-Up";
      const p3 = (updatedTournament.podium && updatedTournament.podium[2]?.name) || "";
      const p3Pts = updatedTournament.podium?.[2]?.points != null ? `${updatedTournament.podium[2].points} pts` : "3rd Place";

      if (p1 && p1 !== 'BYE' && p1 !== 'TBD') {
        broadcastWinnerNotification({
          tournamentTitle: updatedTournament.title,
          tournamentType: updatedTournament.type || "Swiss Tournament",
          winnerName: p1,
          winnerScoreOrPoints: p1Pts,
          runnerUpName: p2,
          runnerUpScoreOrPoints: p2Pts,
          thirdPlaceName: p3,
          thirdPlaceScoreOrPoints: p3Pts,
          link: `/tournamentdetails?id=${updatedTournament._id}`
        }).catch(e => console.warn('Tournament status winner broadcast error:', e.message));
      }
    }

    res.json({ message: 'Tournament updated successfully!', data: updatedTournament });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating tournament', details: error.message });
  }
});

// POST: Broadcast tournament champion alert to all tacticians
app.post('/api/tournaments/:id/broadcast-winner', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const { winnerName, tournamentType } = req.body;
    const finalWinner = winnerName || tournament.winner || (tournament.podium && tournament.podium[0]?.name) || (tournament.playersList && tournament.playersList[0]?.name);

    if (!finalWinner || finalWinner === 'BYE' || finalWinner === 'TBD') {
      return res.status(400).json({ error: "No winner found for this tournament yet." });
    }

    const p1 = finalWinner;
    const p1Pts = tournament.podium?.[0]?.points != null ? `${tournament.podium[0].points} pts` : "Champion";
    const p2 = (tournament.podium && tournament.podium[1]?.name) || "";
    const p2Pts = tournament.podium?.[1]?.points != null ? `${tournament.podium[1].points} pts` : "Runner-Up";
    const p3 = (tournament.podium && tournament.podium[2]?.name) || "";
    const p3Pts = tournament.podium?.[2]?.points != null ? `${tournament.podium[2].points} pts` : "3rd Place";

    await broadcastWinnerNotification({
      tournamentTitle: tournament.title,
      tournamentType: tournamentType || tournament.type || "Tournament",
      winnerName: p1,
      winnerScoreOrPoints: p1Pts,
      runnerUpName: p2,
      runnerUpScoreOrPoints: p2Pts,
      thirdPlaceName: p3,
      thirdPlaceScoreOrPoints: p3Pts,
      link: `/tournamentdetails?id=${tournament._id}`
    });

    res.json({ success: true, message: `Champion alert for ${finalWinner} broadcast to all members!` });
  } catch (err) {
    res.status(500).json({ error: "Failed to broadcast winner", details: err.message });
  }
});

// --- Server-side Vector PDF Certificate Generator ---
function generateVectorCertificatePdfBuffer({
  playerName,
  rank = "Honored Participant",
  tournamentTitle = "ZC Tournament",
  tournamentType = "Chess Tournament",
  pointsOrScore = "",
  certCode = "",
  date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  isPuzzle = false
}) {
  const sanitize = (str) => (str || "").toString().replace(/[()\\]/g, "");
  const cleanPlayer = sanitize(playerName);
  const cleanTitle = sanitize(tournamentTitle);
  const cleanType = sanitize(tournamentType);
  const rankStr = (rank || "").toString().toLowerCase();
  const isChamp = rankStr.includes("champ") || rankStr === "1st place" || rankStr === "1";
  const isRunnerUp = rankStr.includes("runner") || rankStr === "2nd place" || rankStr === "2";
  const isThird = rankStr.includes("3rd") || rankStr === "3";
  const isPodium = isChamp || isRunnerUp || isThird;

  const mainHeader = isPodium 
    ? (isPuzzle ? "CERTIFICATE OF TACTICAL EXCELLENCE" : "CERTIFICATE OF EXCELLENCE & MERIT")
    : (isPuzzle ? "CERTIFICATE OF TACTICAL APPRECIATION" : "CERTIFICATE OF PARTICIPATION & APPRECIATION");

  const citation = isPodium
    ? (isPuzzle 
        ? "In recognition of extraordinary tactical foresight and speed," 
        : "In recognition of exceptional strategic mastery and tactical rigor,")
    : (isPuzzle
        ? "In grateful appreciation and recognition of tactical dedication,"
        : "In grateful appreciation of passionate participation and sportsmanship,");

  const rankBadgeText = isChamp ? "CHAMPION (1ST PLACE)" : isRunnerUp ? "RUNNER-UP (2ND PLACE)" : isThird ? "3RD PLACE PODIUM" : (sanitize(rank) || "DISTINGUISHED PARTICIPANT");
  const subCitation = isPodium ? "finishing as the honored" : "competing with honor and distinction in";

  const stream = `q
0.05 0.04 0.03 rg 0 0 842 595 re f
0.95 0.76 0.27 RG 4 w 20 20 802 555 re S
0.95 0.76 0.27 RG 1 w 28 28 786 539 re S
BT /F1 15 Tf 0.95 0.76 0.27 rg 305 520 Td (ZEWAIL CITY CHESS CLUB) Tj ET
BT /F3 20 Tf 1 1 1 rg 210 478 Td (${mainHeader}) Tj ET
BT /F2 11 Tf 0.68 0.64 0.58 rg 270 440 Td (THIS CERTIFICATE IS PROUDLY CONFERRED UPON) Tj ET
BT /F3 28 Tf 0.98 0.84 0.28 rg 260 380 Td (${cleanPlayer}) Tj ET
BT /F2 12 Tf 0.82 0.78 0.72 rg 150 330 Td (${citation}) Tj ET
BT /F2 12 Tf 0.82 0.78 0.72 rg 280 310 Td (${subCitation}) Tj ET
0.95 0.76 0.27 RG 1.5 w 230 260 382 34 re S
BT /F1 13 Tf 0.95 0.76 0.27 rg 250 272 Td (${rankBadgeText} ${pointsOrScore ? ` - ${sanitize(pointsOrScore)}` : ""}) Tj ET
BT /F3 15 Tf 1 1 1 rg 240 225 Td (in the ${cleanTitle}) Tj ET
BT /F2 10 Tf 0.65 0.62 0.58 rg 240 195 Td (Format: ${cleanType} - Venue: Zewail City of Science and Technology) Tj ET
BT /F2 10 Tf 0.65 0.62 0.58 rg 330 175 Td (Date of Conferral: ${sanitize(date)}) Tj ET
0.95 0.76 0.27 RG 2 w 130 90 40 0 360 arc S
BT /F1 7 Tf 0.95 0.76 0.27 rg 100 98 Td (ZC CHESS CLUB) Tj ET
BT /F1 7 Tf 0.95 0.76 0.27 rg 102 82 Td (OFFICIAL SEAL) Tj ET
0.95 0.76 0.27 RG 1 w 440 90 150 0 re S
BT /F4 15 Tf 1 0.85 0.35 rg 460 102 Td (A. Salama) Tj ET
BT /F1 10 Tf 1 1 1 rg 475 75 Td (Alaa Salama) Tj ET
BT /F2 8 Tf 0.95 0.76 0.27 rg 445 62 Td (CHIEF ARBITER & ORGANIZING HEAD) Tj ET
0.95 0.76 0.27 RG 1 w 630 90 150 0 re S
BT /F4 15 Tf 1 0.85 0.35 rg 645 102 Td (A. Elkhodiry) Tj ET
BT /F1 10 Tf 1 1 1 rg 660 75 Td (Ahmed Elkhodiry) Tj ET
BT /F2 8 Tf 0.95 0.76 0.27 rg 672 62 Td (CLUB PRESIDENT) Tj ET
BT /F5 8 Tf 0.95 0.76 0.27 rg 270 30 Td (Official Verification ID: ${certCode} - zc-chess-club.vercel.app) Tj ET
Q`;

  const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R /F5 9 0 R >> >> >>\nendobj\n`;
  const obj4 = `4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`;
  const obj5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";
  const obj6 = "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  const obj7 = "7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>\nendobj\n";
  const obj8 = "8 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>\nendobj\n";
  const obj9 = "9 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n";

  const parts = [header, obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8, obj9];
  const offsets = [];
  offsets[1] = Buffer.byteLength(header);
  for (let i = 1; i <= 9; i++) {
    offsets[i + 1] = offsets[i] + Buffer.byteLength(parts[i]);
  }

  const xrefOffset = offsets[10];
  let xref = "xref\n0 10\n0000000000 65535 f \n";
  for (let i = 1; i <= 9; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  const trailer = `trailer\n<< /Size 10 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(parts.join("") + xref + trailer, "utf-8");
}

const generateOfficialCertificateEmailHtml = ({
  recipientName,
  certTitle,
  rank = "Participant",
  pointsOrScore = "",
  tournamentTitle = "ZC Chess Event",
  tournamentType = "Tournament",
  date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  certCode = "",
  actionUrl = ""
}) => {
  const appBaseUrl = getAppBaseUrl();
  const targetUrl = actionUrl ? (actionUrl.startsWith("http") ? actionUrl : `${appBaseUrl}${actionUrl}`) : `${appBaseUrl}/history?tab=events`;
  const isPuzzle = (tournamentType || "").toLowerCase().includes("puzzle") || (tournamentType || "").toLowerCase().includes("tactic");
  const rankStr = (rank || "").toString().toLowerCase();
  const isPodium = rankStr.includes("champ") || rankStr.includes("runner") || rankStr.includes("3rd") || rankStr.includes("1st") || rankStr.includes("2nd");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${certTitle}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #0c0a08; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f2ece1; -webkit-font-smoothing: antialiased; }
        .email-container { max-width: 620px; margin: 24px auto; background-color: #14110b; border: 1.5px solid #d4a32a; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.85); }
        .crest-header { background: radial-gradient(circle at 50% 0%, #292014 0%, #120f0a 100%); padding: 32px 24px 20px; text-align: center; border-bottom: 2px solid #f3c144; }
        .crest-logo { width: 56px; height: 56px; border-radius: 10px; display: block; margin: 0 auto 10px; box-shadow: 0 4px 14px rgba(243, 193, 68, 0.35); }
        .crest-org { color: #f3c144; font-size: 16px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
        .crest-sub { color: #a39b8c; font-size: 12px; margin: 4px 0 0; letter-spacing: 1px; text-transform: uppercase; }
        
        .main-body { padding: 36px 28px 28px; }
        .formal-salutation { font-size: 15px; color: #d4ccbd; margin: 0 0 16px; line-height: 1.6; }
        .cert-card { background: linear-gradient(145deg, #1b160e 0%, #100d08 100%); border: 1.5px solid rgba(243, 193, 68, 0.5); border-radius: 12px; padding: 26px 20px; text-align: center; margin: 20px 0; box-shadow: inset 0 0 20px rgba(0,0,0,0.5); }
        .cert-category-tag { display: inline-block; background: rgba(243, 193, 68, 0.12); border: 1px solid rgba(243, 193, 68, 0.35); color: #f3c144; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 14px; border-radius: 999px; margin-bottom: 12px; }
        .cert-headline { color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 8px; letter-spacing: 0.5px; }
        .conferred-line { color: #9e9585; font-size: 13px; text-transform: uppercase; letter-spacing: 1.2px; margin: 12px 0 6px; }
        .recipient-display { color: #f3c144; font-size: 26px; font-weight: 800; margin: 0 0 12px; font-family: 'Georgia', serif; }
        .citation-body { color: #d1c7b7; font-size: 14px; line-height: 1.6; margin: 0 auto 16px; max-width: 480px; }
        
        .honor-pill { display: inline-block; background: linear-gradient(135deg, rgba(243, 193, 68, 0.22) 0%, rgba(212, 163, 42, 0.12) 100%); border: 1.5px solid #f3c144; color: #ffffff; font-weight: 800; font-size: 14px; padding: 7px 22px; border-radius: 999px; margin-bottom: 18px; }
        
        .metadata-table { width: 100%; border-top: 1px solid rgba(243, 193, 68, 0.2); margin-top: 16px; padding-top: 14px; font-size: 12px; color: #a39b8c; text-align: left; }
        .metadata-table td { padding: 4px 0; }
        
        .attachment-banner { background: rgba(46, 204, 113, 0.1); border: 1px solid rgba(46, 204, 113, 0.4); border-radius: 10px; padding: 14px 18px; margin: 24px 0 20px; text-align: center; }
        .attachment-title { color: #2ecc71; font-weight: 800; font-size: 14px; margin: 0 0 3px; }
        .attachment-sub { color: #a8bba8; font-size: 12px; margin: 0; }
        
        .signatures-row { width: 100%; margin: 26px 0 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }
        .sig-name-script { font-family: 'Brush Script MT', 'Dancing Script', 'Georgia', cursive; font-size: 22px; color: #ffd768; font-style: italic; margin-bottom: 4px; }
        .sig-name-print { color: #ffffff; font-size: 13px; font-weight: 700; margin: 0; }
        .sig-role { color: #f3c144; font-size: 10px; font-weight: 700; text-transform: uppercase; margin: 2px 0 0; }
        
        .cta-box { text-align: center; margin: 28px 0 10px; }
        .portal-btn { display: inline-block; background: linear-gradient(135deg, #f7ce68 0%, #f3c144 60%, #c99522 100%); color: #12100d !important; font-weight: 900; font-size: 14px; text-decoration: none; padding: 13px 34px; border-radius: 999px; box-shadow: 0 4px 18px rgba(243, 193, 68, 0.4); letter-spacing: 0.5px; }
        
        .footer-sec { background: #0c0a08; border-top: 1px solid rgba(255,255,255,0.06); padding: 22px 20px; text-align: center; color: #787063; font-size: 11px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="crest-header">
          <img class="crest-logo" src="https://zc-chess-club.vercel.app/Icons/chess-clublogo.png" alt="ZC Chess Crest" />
          <h1 class="crest-org">Zewail City Chess Club</h1>
          <p class="crest-sub">Official Office of Arbiters & Club Presidency</p>
        </div>

        <!-- Content -->
        <div class="main-body">
          <p class="formal-salutation">
            Dear <strong>${recipientName}</strong>,
          </p>
          <p class="formal-salutation">
            On behalf of the Highboard and the Tournament Organizing Committee of <strong>Zewail City Chess Club</strong>, we are pleased to officially confer upon you this Certificate of Honors in recognition of your dedication, competitive excellence, and sportsmanship.
          </p>

          <!-- Certificate Visual Box -->
          <div class="cert-card">
            <span class="cert-category-tag">${isPuzzle ? "Tactics Arena Award" : "Tournament Honors"}</span>
            <h2 class="cert-headline">${certTitle}</h2>
            <div class="conferred-line">Conferred Upon</div>
            <div class="recipient-display">${recipientName}</div>
            
            <div class="honor-pill">
              ${rank}${pointsOrScore ? ` • ${pointsOrScore}` : ''}
            </div>

            <p class="citation-body">
              ${isPodium
                ? `Awarded for exceptional tactical calculation, strategic rigor, and outstanding competitive achievement in <strong>${tournamentTitle}</strong>.`
                : `Awarded with sincere appreciation for dedicated participation, sporting integrity, and strategic passion in <strong>${tournamentTitle}</strong>.`}
            </p>

            <!-- Official Stamp Badge -->
            <div style="text-align: center; margin: 22px auto 16px;">
              <img src="https://zc-chess-club.vercel.app/Icons/official-stamp.png" alt="Official Zewail City Chess Club Stamp" width="125" height="125" style="display: inline-block; transform: rotate(-5.2deg); filter: drop-shadow(0 6px 16px rgba(243, 193, 68, 0.4));" />
              <div style="color: #f3c144; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px;">★ Official Arbiter &amp; Presidential Seal ★</div>
            </div>

            <table class="metadata-table" cellpadding="0" cellspacing="0">
              <tr>
                <td width="35%"><strong>Event:</strong></td>
                <td>${tournamentTitle}</td>
              </tr>
              <tr>
                <td><strong>Format / Venue:</strong></td>
                <td>${tournamentType} • Zewail City of Science and Technology</td>
              </tr>
              <tr>
                <td><strong>Date of Conferral:</strong></td>
                <td>${date}</td>
              </tr>
              <tr>
                <td><strong>Verification Code:</strong></td>
                <td style="font-family: monospace; color: #f3c144;">${certCode}</td>
              </tr>
              <tr>
                <td><strong>Issued Timestamp:</strong></td>
                <td style="font-family: monospace; color: #a39b8c;">${new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" })}</td>
              </tr>
            </table>
          </div>

          <!-- Attachment Notice -->
          <div class="attachment-banner">
            <div class="attachment-title">📎 Official Certificate Attached (PDF Document)</div>
            <p class="attachment-sub">A high-resolution, vector-rendered official PDF certificate bearing the Arbiter Seal and President Signature has been attached to this email for your permanent records and portfolio.</p>
          </div>

          <!-- Handwritten Signatures -->
          <table class="signatures-row" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" align="center" valign="top">
                <div class="sig-name-script">Alaa Salama</div>
                <p class="sig-name-print">Alaa Salama</p>
                <p class="sig-role">${isPuzzle ? "Puzzle Arbiter & Organizing Head" : "Chief Arbiter & Organizing Head"}</p>
              </td>
              <td width="50%" align="center" valign="top">
                <div class="sig-name-script">Ahmed Elkhodiry</div>
                <p class="sig-name-print">Ahmed Elkhodiry</p>
                <p class="sig-role">Club President</p>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <div class="cta-box">
            <a href="${targetUrl}" class="portal-btn">View Event Archive & Standings →</a>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-sec">
          <p style="margin: 0 0 4px;">© ${new Date().getFullYear()} Zewail City Chess Club. All rights reserved.</p>
          <p style="margin: 0;">Zewail City of Science, Technology and Innovation • Giza, Egypt</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// POST: Universal single certificate email dispatcher with attached PDF
app.post('/api/certificates/send-email', async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      tournamentTitle,
      tournamentType = "Tournament",
      rank = "Participant",
      pointsOrScore = "",
      pdfBase64 = ""
    } = req.body;

    if (!recipientEmail || !recipientName) {
      return res.status(400).json({ error: "recipientEmail and recipientName are required" });
    }

    const cleanName = recipientName.trim();
    const cleanId = Math.abs(cleanName.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7)).toString(16).toUpperCase();
    const certCode = `ZC-CERT-${cleanId}-${new Date().getFullYear()}`;

    const isPuzzle = (tournamentType || "").toLowerCase().includes("puzzle") || (tournamentType || "").toLowerCase().includes("tactic");
    const rankStr = (rank || "").toString().toLowerCase();
    const isChamp = rankStr.includes("champ") || rankStr === "1st place" || rankStr === "1";
    const isRunnerUp = rankStr.includes("runner") || rankStr === "2nd place" || rankStr === "2";
    const isThird = rankStr.includes("3rd") || rankStr === "3";
    const isPodium = isChamp || isRunnerUp || isThird;

    const certTitle = isPodium 
      ? (isPuzzle ? "CERTIFICATE OF TACTICAL EXCELLENCE" : "CERTIFICATE OF EXCELLENCE & ACHIEVEMENT")
      : (isPuzzle ? "CERTIFICATE OF TACTICAL APPRECIATION" : "CERTIFICATE OF PARTICIPATION & APPRECIATION");

    let pdfBuffer;
    if (pdfBase64 && typeof pdfBase64 === "string" && pdfBase64.length > 50) {
      pdfBuffer = Buffer.from(pdfBase64, "base64");
    } else {
      pdfBuffer = generateVectorCertificatePdfBuffer({
        playerName: cleanName,
        rank,
        tournamentTitle,
        tournamentType,
        pointsOrScore,
        certCode,
        isPuzzle
      });
    }

    const certHtml = generateOfficialCertificateEmailHtml({
      recipientName: cleanName,
      certTitle,
      rank,
      pointsOrScore,
      tournamentTitle,
      tournamentType,
      certCode
    });

    const fileSafeName = cleanName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
    const mailResult = await sendEmail({
      to: recipientEmail,
      subject: `📜 [ZC Chess Club] ${certTitle}: ${tournamentTitle}`,
      html: certHtml,
      text: `Dear ${cleanName},\n\nAttached is your official ${certTitle} for "${tournamentTitle}".\nVerification ID: ${certCode}\n\nZewail City Chess Club`,
      attachments: [
        {
          filename: `Certificate_${fileSafeName}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    });

    res.json({
      success: true,
      message: `Official certificate successfully emailed to ${recipientEmail} with PDF attached!`,
      mailResult
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to send certificate email", details: err.message });
  }
});

// POST: Dispatch official certificates for tournament participants/winners with PDF attached
app.post('/api/tournaments/:id/send-certificates', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const targetMode = req.body?.target || "all"; // 'all' (all participants) or 'winners' (podium only)
    const candidates = [];
    const seenNames = new Set();

    // 1. Identify Podium Winners
    const podiumNames = new Map();
    if (tournament.podium && Array.isArray(tournament.podium)) {
      tournament.podium.forEach((p, idx) => {
        if (p && p.name && p.name !== 'BYE' && p.name !== 'TBD') {
          const rankName = idx === 0 ? "Champion (1st Place)" : idx === 1 ? "Runner-Up (2nd Place)" : "3rd Place";
          podiumNames.set(p.name.toLowerCase().trim(), {
            name: p.name,
            rank: rankName,
            points: p.points != null ? `${p.points} pts` : ""
          });
        }
      });
    } else if (tournament.winner && tournament.winner !== 'BYE' && tournament.winner !== 'TBD') {
      podiumNames.set(tournament.winner.toLowerCase().trim(), {
        name: tournament.winner,
        rank: "Champion (1st Place)",
        points: ""
      });
    }

    // 2. Gather recipients
    if (targetMode === "winners") {
      podiumNames.forEach(val => candidates.push(val));
    } else {
      // Gather all participants (podium + active roster/registrations)
      podiumNames.forEach(val => {
        candidates.push(val);
        seenNames.add(val.name.toLowerCase().trim());
      });

      const allRoster = [
        ...(tournament.playersList || []),
        ...(tournament.registrations || [])
      ];

      allRoster.forEach(p => {
        if (p && p.name && p.name !== 'BYE' && p.name !== 'TBD') {
          const key = p.name.toLowerCase().trim();
          if (!seenNames.has(key)) {
            seenNames.add(key);
            candidates.push({
              name: p.name,
              email: p.email || "",
              rank: "Honored Participant",
              points: p.points != null ? `${p.points} pts` : ""
            });
          }
        }
      });
    }

    if (candidates.length === 0) {
      return res.status(400).json({ error: "No participants found for certificate dispatch." });
    }

    let sentCount = 0;
    for (const c of candidates) {
      let email = c.email;
      if (!email) {
        const contact = await findPlayerContact(c.name, tournament);
        if (contact && contact.email) email = contact.email;
      }

      if (email) {
        const cleanName = c.name.trim();
        const cleanId = Math.abs(cleanName.split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7)).toString(16).toUpperCase();
        const certCode = `ZC-CERT-${cleanId}-${new Date().getFullYear()}`;

        const isPodium = c.rank.toLowerCase().includes("champ") || c.rank.toLowerCase().includes("runner") || c.rank.toLowerCase().includes("3rd");
        const certTitle = isPodium ? "CERTIFICATE OF EXCELLENCE & ACHIEVEMENT" : "CERTIFICATE OF PARTICIPATION & APPRECIATION";

        const pdfBuffer = generateVectorCertificatePdfBuffer({
          playerName: cleanName,
          rank: c.rank,
          tournamentTitle: tournament.title,
          tournamentType: tournament.type || "Swiss Championship",
          pointsOrScore: c.points,
          certCode,
          isPuzzle: false
        });

        const fileSafeName = cleanName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
        const certHtml = generateOfficialCertificateEmailHtml({
          recipientName: cleanName,
          certTitle,
          rank: c.rank,
          pointsOrScore: c.points,
          tournamentTitle: tournament.title,
          tournamentType: tournament.type || "Swiss Championship",
          certCode
        });

        await sendEmail({
          to: email,
          subject: `📜 [ZC Chess Club] ${certTitle}: ${tournament.title}`,
          html: certHtml,
          text: `Dear ${cleanName},\n\nAttached is your official ${certTitle} for "${tournament.title}".\nVerification ID: ${certCode}\n\nZewail City Chess Club`,
          attachments: [
            {
              filename: `Certificate_${fileSafeName}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf"
            }
          ]
        });

        sentCount++;
      }
    }

    res.json({
      success: true,
      message: `Official certificates successfully dispatched to ${sentCount} participant(s) with PDF attached!`,
      sentCount
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to dispatch tournament certificates", details: err.message });
  }
});

// POST: Dispatch Puzzle Challenge Certificates of Tactical Appreciation / Excellence to all solvers
app.post('/api/puzzle-tournaments/:id/send-certificates', async (req, res) => {
  try {
    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Puzzle tournament not found" });

    // Gather solvers
    const solvers = [];
    const seenEmails = new Set();

    if (tournament.solvers && Array.isArray(tournament.solvers)) {
      tournament.solvers.forEach((s) => {
        if (s && (s.name || s.email)) {
          const email = (s.email || "").toLowerCase().trim();
          if (email && !seenEmails.has(email)) {
            seenEmails.add(email);
            solvers.push(s);
          }
        }
      });
    }

    // Also look in registered participants / attempts if any
    if (tournament.registrations && Array.isArray(tournament.registrations)) {
      tournament.registrations.forEach(r => {
        const email = (r.email || "").toLowerCase().trim();
        if (email && !seenEmails.has(email)) {
          seenEmails.add(email);
          solvers.push({ name: r.name, email: email, score: 0, solvedCount: 0 });
        }
      });
    }

    if (solvers.length === 0) {
      return res.status(400).json({ error: "No recorded solvers found for this puzzle challenge arena." });
    }

    // Sort by score desc, time asc
    solvers.sort((a, b) => (b.score || 0) - (a.score || 0) || (a.timeUsed || 0) - (b.timeUsed || 0));

    let sentCount = 0;
    for (let idx = 0; idx < solvers.length; idx++) {
      const solver = solvers[idx];
      const email = solver.email;
      if (email) {
        const cleanName = solver.name || email.split("@")[0];
        const rankLabel = idx === 0 ? "Champion (1st Place)" : idx === 1 ? "Runner-Up (2nd Place)" : idx === 2 ? "3rd Place" : `#${idx + 1} Rank Solver`;
        const isPodium = idx < 3;
        const certTitle = isPodium ? "CERTIFICATE OF TACTICAL EXCELLENCE" : "CERTIFICATE OF TACTICAL APPRECIATION & PARTICIPATION";
        const cleanId = Math.abs(cleanName.split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7)).toString(16).toUpperCase();
        const certCode = `ZC-CERT-${cleanId}-${new Date().getFullYear()}`;

        const pdfBuffer = generateVectorCertificatePdfBuffer({
          playerName: cleanName,
          rank: rankLabel,
          tournamentTitle: tournament.title,
          tournamentType: "Puzzle Tactics Arena",
          pointsOrScore: `${solver.score || 0} pts (${solver.solvedCount || 0} solved)`,
          certCode,
          isPuzzle: true
        });

        const fileSafeName = cleanName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
        const certHtml = generateOfficialCertificateEmailHtml({
          recipientName: cleanName,
          certTitle,
          rank: rankLabel,
          pointsOrScore: `${solver.score || 0} pts (${solver.solvedCount || 0} solved)`,
          tournamentTitle: tournament.title,
          tournamentType: "Puzzle Tactics Arena",
          certCode
        });

        await sendEmail({
          to: email,
          subject: `📜 [ZC Chess Club] ${certTitle}: ${tournament.title}`,
          html: certHtml,
          text: `Dear ${cleanName},\n\nAttached is your official ${certTitle} for "${tournament.title}".\nVerification ID: ${certCode}\n\nZewail City Chess Club`,
          attachments: [
            {
              filename: `Certificate_${fileSafeName}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf"
            }
          ]
        });

        sentCount++;
      }
    }

    res.json({
      success: true,
      message: `Official puzzle certificates successfully dispatched to ${sentCount} participant(s) with PDF attached!`,
      sentCount
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to dispatch puzzle certificates", details: err.message });
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
    if (tournament.registrations.some(reg => reg.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'Already registered for this tournament' });
    }

    const emailRegex = new RegExp(`^${email.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
    const joiningUser = await User.findOne({ email: emailRegex });

    // Enforce weekly free time / availability for Knockout tournaments
    const isKnockout = tournament.type && (
      tournament.type.toLowerCase().includes('knockout') || 
      tournament.type.toLowerCase().includes('elimination') ||
      tournament.type === 'Single Elimination' ||
      tournament.type === 'Double Elimination'
    );

    if (isKnockout) {
      if (!joiningUser || !Array.isArray(joiningUser.availability) || joiningUser.availability.length === 0) {
        return res.status(400).json({
          error: "Campus Free Time & Match Schedule Required: Knockout tournaments require players to register their weekly free hours (Sunday–Thursday) in their Profile before joining.",
          requiresAvailability: true
        });
      }
    }

    // Auto-approve and add to players list immediately
    tournament.registrations.push({ email, name, status: 'Approved' });
    
    // Check if user is already in playersList (just in case)
    if (!tournament.playersList.some(p => p.name === name)) {
      tournament.playersList.push({ 
        name, 
        rating: joiningUser?.fideRating || joiningUser?.chessComRating || 1500, // Rating from profile or default
        major: joiningUser?.major || 'N/A' 
      });
      tournament.players = tournament.playersList.length;
    }

    const saved = await tournament.save();

    // 🔔 Notify all followers of the person who just joined
    if (joiningUser) {
      const followerEmails = (joiningUser.followers || []).map(e => e.toLowerCase());
      if (followerEmails.length > 0) {
        const notifPromises = followerEmails.map(followerEmail =>
          createNotification({
            recipientEmail: followerEmail,
            type: 'tournament_join',
            actorName: joiningUser.name || name,
            actorEmail: email.toLowerCase(),
            actorAvatar: joiningUser.profileImage || '',
            message: `${joiningUser.name || name} joined ${tournament.title}`,
            link: `/tournamentdetails?id=${tournament._id}`
          })
        );
        await Promise.all(notifPromises);
      }
    }

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

// ============================================================
// NOTIFICATION ROUTES
// ============================================================

// GET: Fetch notifications for a user (last 30, newest first)
app.get('/api/notifications', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: 'email query param required' });
    const notifications = await Notification.find({ recipientEmail: email.toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

// POST: Mark all notifications as read for a user
app.post('/api/notifications/mark-read', express.json(), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    await Notification.updateMany({ recipientEmail: email.toLowerCase(), read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications read', details: err.message });
  }
});

// POST: Mark a single notification as read
app.post('/api/notifications/mark-one-read', express.json(), async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    await Notification.findByIdAndUpdate(id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification read', details: err.message });
  }
});

// DELETE: Delete a single notification
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });
    await Notification.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification', details: err.message });
  }
});

// POST: Admin Broadcast / Direct Notification & Email Dispatch
app.post('/api/admin/broadcast-notification', express.json(), async (req, res) => {
  try {
    const { 
      adminEmail, 
      recipientType, 
      targetEmail, 
      title, 
      message, 
      link, 
      sendEmailNotification, 
      sendInAppNotification 
    } = req.body;

    // Check if email matches admin list OR exists in DB as an admin/staff user
    let isAuthorized = isAdminEmail(adminEmail);
    if (!isAuthorized && adminEmail) {
      const staffUser = await User.findOne({ 
        email: new RegExp(`^${adminEmail.trim()}$`, 'i'),
        role: { $in: ['admin', 'president', 'vice_president', 'oc', 'hr', 'pr', 'media'] }
      });
      if (staffUser) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized. Administrator access required.' });
    }

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message body are required.' });
    }

    let recipients = [];
    if (recipientType === 'all') {
      const allUsers = await User.find({}, 'name email profileImage');
      recipients = allUsers;
    } else if (recipientType === 'specific') {
      if (!targetEmail) {
        return res.status(400).json({ error: 'Target email is required for direct player message.' });
      }
      const user = await User.findOne({ email: targetEmail.toLowerCase().trim() });
      if (user) {
        recipients = [user];
      } else {
        recipients = [{ email: targetEmail.toLowerCase().trim(), name: targetEmail.split('@')[0] }];
      }
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients found to dispatch notification.' });
    }

    let inAppCount = 0;
    let emailSuccessCount = 0;

    // 1. In-App Notifications
    if (sendInAppNotification !== false) {
      const notifDocs = recipients.map(r => ({
        recipientEmail: r.email.toLowerCase(),
        type: 'broadcast',
        actorName: 'ZC Chess Administration',
        actorEmail: adminEmail,
        message: `📢 ${title}: ${message.length > 90 ? message.substring(0, 90) + '...' : message}`,
        link: link || '/community',
        read: false,
        createdAt: new Date()
      }));

      if (notifDocs.length > 0) {
        await Notification.insertMany(notifDocs);
        inAppCount = notifDocs.length;
      }
    }

    // 2. Email Notifications
    if (sendEmailNotification !== false) {
      const appBaseUrl = getAppBaseUrl();
      for (const r of recipients) {
        const html = generateClubEmailHtml({
          title,
          recipientName: r.name,
          message,
          actionLabel: 'Open ZC Chess Club →',
          actionUrl: link || '/',
          senderName: 'ZC Chess Club Administration'
        });

        const mailResult = await sendEmail({
          to: r.email,
          subject: `[ZC Chess Club] ${title}`,
          html,
          text: `${title}\n\n${message}\n\nVisit: ${appBaseUrl}${link || '/'}`
        });

        if (mailResult.success) {
          emailSuccessCount++;
        }
      }
    }

    // 3. Save to Broadcast / Sent Emails History Log
    try {
      await BroadcastLog.create({
        adminEmail,
        recipientType,
        targetEmail: recipientType === 'specific' ? targetEmail : '',
        recipientCount: recipients.length,
        title,
        message,
        link: link || '/',
        channels: {
          inApp: sendInAppNotification !== false,
          email: sendEmailNotification !== false
        },
        inAppCount,
        emailCount: emailSuccessCount,
        createdAt: new Date()
      });
    } catch (logErr) {
      console.warn('Could not save BroadcastLog:', logErr.message);
    }

    res.json({
      success: true,
      message: `Dispatched successfully to ${recipients.length} tactician(s)! (${inAppCount} in-app notification(s), ${emailSuccessCount} email(s) sent)`,
      inAppCount,
      emailSuccessCount,
      totalRecipients: recipients.length
    });
  } catch (err) {
    console.error('Error in broadcast-notification:', err);
    res.status(500).json({ error: 'Failed to dispatch broadcast notification', details: err.message });
  }
});

// GET: Fetch all sent broadcasts / dispatched emails log (staff only)
app.get('/api/admin/broadcast-logs', async (req, res) => {
  try {
    const logs = await BroadcastLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch broadcast logs', details: err.message });
  }
});

// DELETE: Delete a broadcast log record
app.delete('/api/admin/broadcast-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await BroadcastLog.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete broadcast log', details: err.message });
  }
});


// ============================================================
// CONTACT MESSAGES / INQUIRIES
// ============================================================

// POST: submit a message from Contact Us form
app.post('/api/contact', express.json(), async (req, res) => {
  try {
    const { name, email, category, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const newMsg = new ContactMessage({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      category: category || 'General Inquiry',
      subject: (subject || '').trim(),
      message: message.trim()
    });

    const savedMsg = await newMsg.save();

    // Notify admins / staff
    try {
      const admins = await User.find({ role: { $in: ['admin', 'president', 'vice_president', 'oc', 'hr', 'pr', 'media'] } });
      for (const admin of admins) {
        await createNotification({
          recipientEmail: admin.email,
          type: 'system',
          actorName: name,
          actorEmail: email,
          message: `📬 New inquiry from ${name}: "${(subject || message).substring(0, 45)}..."`,
          link: '/admin?tab=inquiries'
        });
      }
    } catch (notifErr) {
      console.warn('Could not broadcast contact message notification:', notifErr.message);
    }

    res.status(201).json({ message: 'Message sent successfully!', data: savedMsg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

// GET: fetch all contact messages (staff only)
app.get('/api/contact', async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
  }
});

// PUT: toggle or mark contact message read status
app.put('/api/contact/:id/read', express.json(), async (req, res) => {
  try {
    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    msg.read = !msg.read;
    await msg.save();
    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message status', details: error.message });
  }
});

// DELETE: delete a contact message
app.delete('/api/contact/:id', async (req, res) => {
  try {
    const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message', details: error.message });
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
    checkAndAutoBroadcastPuzzleTournaments().catch(err => console.warn('[Auto-Broadcast on create error]:', err.message));
    res.status(201).json({ message: 'Puzzle tournament created successfully!', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create puzzle tournament', details: error.message });
  }
});

// GET: fetch all puzzle tournaments
app.get('/api/puzzle-tournaments', async (req, res) => {
  try {
    await checkAndAutoBroadcastPuzzleTournaments();
    const tournaments = await PuzzleTournament.find().sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch puzzle tournaments', details: error.message });
  }
});

// GET: fetch a single puzzle tournament
app.get('/api/puzzle-tournaments/:id', async (req, res) => {
  try {
    await checkAndAutoBroadcastPuzzleTournaments();
    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament', details: error.message });
  }
});

// POST: register a tactician before a puzzle tournament starts
app.post('/api/puzzle-tournaments/:id/register', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const now = new Date();
    const startAt = parseTournamentDateTime(tournament.startDate, tournament.startTime, false);
    const endAt = parseTournamentDateTime(tournament.endDate, tournament.endTime, true);
    if (startAt && now >= startAt) return res.status(403).json({ error: 'Registration is closed because this challenge has started.' });
    if (endAt && now > endAt) return res.status(403).json({ error: 'This challenge is closed.' });

    const normalizedEmail = email.trim().toLowerCase();
    const registeredUser = await User.findOne({ email: new RegExp(`^${normalizedEmail}$`, 'i') }, { name: 1 });
    const displayName = (name && name.trim() && name.trim() !== 'ZC Chess Club')
      ? name.trim()
      : (registeredUser?.name?.trim() || (name && name.trim()) || normalizedEmail.split('@')[0] || 'Tactician');
    tournament.participants = tournament.participants || [];
    if (!tournament.participants.some((participant) => participant.email.toLowerCase() === normalizedEmail)) {
      tournament.participants.push({ name: displayName, email: normalizedEmail });
      await tournament.save();
    }

    res.json({ message: 'Registered successfully!', data: tournament });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register for tournament', details: error.message });
  }
});

// POST: record that a player has initiated their 1 single challenge attempt
app.post('/api/puzzle-tournaments/:id/start-attempt', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const normalizedEmail = email.trim().toLowerCase();
    tournament.participants = tournament.participants || [];

    const registeredUser = await User.findOne({ email: new RegExp(`^${normalizedEmail}$`, 'i') }, { name: 1 });
    const displayName = (name && name.trim() && name.trim() !== 'ZC Chess Club')
      ? name.trim()
      : (registeredUser?.name?.trim() || (name && name.trim()) || normalizedEmail.split('@')[0] || 'Tactician');

    if (!tournament.participants.some(p => p.email && p.email.trim().toLowerCase() === normalizedEmail)) {
      tournament.participants.push({ name: displayName, email: normalizedEmail, registeredAt: new Date() });
    }

    const saved = await tournament.save();
    res.json({ message: 'Attempt logged.', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record attempt start', details: error.message });
  }
});

// DELETE: admin removes a registered tactician from a puzzle tournament
app.delete('/api/puzzle-tournaments/:id/participants/:email', async (req, res) => {
  try {
    const adminEmail = req.body?.adminEmail || req.headers['x-admin-email'];
    const admin = adminEmail && await User.findOne({ email: new RegExp(`^${adminEmail.trim()}$`, 'i') });
    const isAuthorized = (admin && admin.role === 'admin') || (adminEmail && isAdminEmail(adminEmail));
    if (!isAuthorized) return res.status(403).json({ error: 'Unauthorized. Administrator access required.' });

    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const participantEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    const originalParticipantCount = (tournament.participants || []).length;
    const originalLeaderboardCount = (tournament.leaderboard || []).length;
    tournament.participants = (tournament.participants || []).filter(
      (participant) => participant.email.trim().toLowerCase() !== participantEmail
    );
    tournament.leaderboard = (tournament.leaderboard || []).filter(
      (entry) => entry.email.trim().toLowerCase() !== participantEmail
    );
    if (tournament.participants.length === originalParticipantCount && tournament.leaderboard.length === originalLeaderboardCount) {
      return res.status(404).json({ error: 'Player is not registered or scored in this tournament' });
    }

    const saved = await tournament.save();
    res.json({ message: 'Player removed successfully!', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove participant', details: error.message });
  }
});

// PUT: update an entire puzzle tournament (dates, times, puzzles, etc.)
app.put('/api/puzzle-tournaments/:id', async (req, res) => {
  try {
    const { title, startDate, startTime, endDate, endTime, timeLimit, image, puzzles } = req.body;
    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    if (title !== undefined) tournament.title = title;
    if (startDate !== undefined) tournament.startDate = startDate;
    if (startTime !== undefined) tournament.startTime = startTime;
    if (endDate !== undefined) tournament.endDate = endDate;
    if (endTime !== undefined) tournament.endTime = endTime;
    if (timeLimit !== undefined) tournament.timeLimit = timeLimit;
    if (image !== undefined) tournament.image = image;
    if (puzzles !== undefined) tournament.puzzles = puzzles;

    const saved = await tournament.save();
    checkAndAutoBroadcastPuzzleTournaments().catch(err => console.warn('[Auto-Broadcast on update error]:', err.message));
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

// POST: add a puzzle to an existing tournament
app.post('/api/puzzle-tournaments/:id/puzzles', express.json(), async (req, res) => {
  try {
    const { initialFen, mateIn, correctMoves, description, timeLimit } = req.body;
    if (!initialFen || !correctMoves || correctMoves.length === 0) {
      return res.status(400).json({ error: 'initialFen and correctMoves are required' });
    }

    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    tournament.puzzles.push({
      initialFen,
      mateIn: mateIn !== undefined ? mateIn : 1,
      correctMoves,
      description: description || "",
      timeLimit: timeLimit !== undefined && timeLimit !== null && timeLimit !== "" ? Number(timeLimit) : null
    });

    const saved = await tournament.save();
    res.status(201).json({ message: 'Puzzle added successfully!', data: saved });
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
    let { name, email, score, solvedCount } = req.body;
    if (!email && req.headers['x-user-email']) email = req.headers['x-user-email'];
    if (!email && req.headers['x-admin-email']) email = req.headers['x-admin-email'];

    if (!email || score === undefined || solvedCount === undefined) {
      return res.status(400).json({ error: 'Valid email, score, and solvedCount are required to submit scores.' });
    }

    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const now = new Date();
    const startAt = parseTournamentDateTime(tournament.startDate, tournament.startTime, false);
    const endAt = parseTournamentDateTime(tournament.endDate, tournament.endTime, true);

    // NOTE: We do NOT block score submission based on start time — the client enforces
    // timing. A hard 403 here causes silent score loss when clocks are slightly off.
    if (endAt && now > endAt) {
      // If challenge has concluded, still allow recording score within grace period
      const gracePeriodMs = 1000 * 60 * 60 * 24; // 24h grace
      if (now.getTime() - endAt.getTime() > gracePeriodMs) {
        return res.json({ message: 'This challenge is closed.', data: tournament });
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const registeredUser = await User.findOne({ email: new RegExp(`^${normalizedEmail}$`, 'i') }, { name: 1 });
    const displayName = (name && name.trim() && name.trim() !== 'ZC Chess Club')
      ? name.trim()
      : (registeredUser?.name?.trim() || (name && name.trim()) || normalizedEmail.split('@')[0] || 'Tactician');

    tournament.leaderboard = tournament.leaderboard || [];
    tournament.participants = tournament.participants || [];

    // Ensure player is also listed in participants roster
    if (!tournament.participants.some(p => p.email && p.email.trim().toLowerCase() === normalizedEmail)) {
      tournament.participants.push({ name: displayName, email: normalizedEmail, registeredAt: new Date() });
    }

    const existingIndex = tournament.leaderboard.findIndex(entry => entry.email && entry.email.trim().toLowerCase() === normalizedEmail);
    if (existingIndex !== -1) {
      tournament.leaderboard[existingIndex].name = displayName;
      tournament.leaderboard[existingIndex].score = Number(score) || 0;
      tournament.leaderboard[existingIndex].solvedCount = Number(solvedCount) || 0;
    } else {
      tournament.leaderboard.push({
        name: displayName,
        email: normalizedEmail,
        score: Number(score) || 0,
        solvedCount: Number(solvedCount) || 0
      });
    }

    // Sort leaderboard descending
    tournament.leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0));

    const saved = await tournament.save();

    res.json({ message: 'Score submitted successfully!', data: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit score', details: error.message });
  }
});

// POST: Broadcast puzzle arena champion alert to all tacticians (only after challenge deadline passed or forced by admin)
app.post('/api/puzzle-tournaments/:id/broadcast-winner', express.json(), async (req, res) => {
  try {
    const tournament = await PuzzleTournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ error: "Puzzle arena not found" });

    const { force } = req.body || {};
    const now = new Date();
    const endAt = parseTournamentDateTime(tournament.endDate, tournament.endTime, true);

    if (!endAt && !force) {
      return res.status(400).json({ error: "This challenge does not have an end deadline configured and cannot be officially closed yet." });
    }

    if (!force && endAt && now < endAt) {
      return res.status(400).json({
        error: `Cannot broadcast official results until the puzzle challenge is finished (deadline: ${tournament.endDate} ${tournament.endTime || '23:59'}).`
      });
    }

    if (!tournament.leaderboard || tournament.leaderboard.length === 0) {
      return res.status(400).json({ error: "No scores recorded on this arena leaderboard yet." });
    }

    const sorted = [...tournament.leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0));
    const p1 = sorted[0];
    const p2 = sorted[1];
    const p3 = sorted[2];

    await broadcastWinnerNotification({
      tournamentTitle: tournament.title,
      tournamentType: "Puzzle Tactics Arena",
      winnerName: p1.name,
      winnerEmail: p1.email,
      winnerScoreOrPoints: `${p1.score} pts (${p1.solvedCount || 0} solved)`,
      runnerUpName: p2 ? p2.name : '',
      runnerUpScoreOrPoints: p2 ? `${p2.score} pts (${p2.solvedCount || 0} solved)` : '',
      thirdPlaceName: p3 ? p3.name : '',
      thirdPlaceScoreOrPoints: p3 ? `${p3.score} pts (${p3.solvedCount || 0} solved)` : '',
      link: `/puzzlechallenge`
    });

    tournament.winnersBroadcasted = true;
    await tournament.save();

    res.json({ success: true, message: `Champion alert for ${p1.name} broadcast to all members!` });
  } catch (err) {
    res.status(500).json({ error: "Failed to broadcast puzzle winner", details: err.message });
  }
});

// --- Start server ---
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

