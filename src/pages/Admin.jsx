import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Search, Users, Filter, Eye, Send, Mail, Bell, CheckCircle2, Sparkles, Camera, X } from "lucide-react";
import "./Admin.css";
import { safeFetchJson, compressImage } from "../utils/api";

// API Base URL - works for both local and production
const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

// Helper function to resolve effective user role across both direct role and clubRoles
export const getEffectiveUserRole = (user) => {
  if (!user) return "member";
  // 1. clubRoles array is ALWAYS the primary source of truth
  if (Array.isArray(user.clubRoles) && user.clubRoles.length > 0) {
    if (user.clubRoles.some(r => r.department === "Executive High Board" && r.position === "President")) return "president";
    if (user.clubRoles.some(r => r.department === "Executive High Board" && r.position === "Vice President")) return "vice_president";
    if (user.clubRoles.some(r => r.department === "Tournament Organizing Committee" && r.position === "Head")) return "oc";
    if (user.clubRoles.some(r => r.department === "Tournament Organizing Committee" && r.position === "Member")) return "member_oc";
    if (user.clubRoles.some(r => r.department === "Human Resources" && r.position === "Head")) return "hr";
    if (user.clubRoles.some(r => r.department === "Human Resources" && r.position === "Member")) return "member_hr";
    if (user.clubRoles.some(r => r.department === "Public Relations" && r.position === "Head")) return "pr";
    if (user.clubRoles.some(r => r.department === "Public Relations" && r.position === "Member")) return "member_pr";
    if (user.clubRoles.some(r => r.department === "Multimedia & Design" && r.position === "Head")) return "media";
    if (user.clubRoles.some(r => r.department === "Multimedia & Design" && r.position === "Member")) return "member_media";
    if (user.clubRoles.some(r => r.department === "Training & Masterclasses" && r.position === "Head")) return "trainer";
    if (user.clubRoles.some(r => r.department === "Executive High Board")) return "president";
    if (user.clubRoles.some(r => r.department === "Tournament Organizing Committee")) return "member_oc";
    if (user.clubRoles.some(r => r.department === "Human Resources")) return "member_hr";
    if (user.clubRoles.some(r => r.department === "Public Relations")) return "member_pr";
    if (user.clubRoles.some(r => r.department === "Multimedia & Design")) return "member_media";
    if (user.clubRoles.some(r => r.department === "Training & Masterclasses")) return "trainer";
    if (user.clubRoles.some(r => r.department === "Trainee Development Pathway")) return "trainee";
  }
  // 2. Direct user.role fallback
  if (user.role && ["president", "vice_president", "oc", "member_oc", "hr", "member_hr", "pr", "member_pr", "media", "member_media", "trainer", "trainee"].includes(user.role)) {
    return user.role;
  }
  if (user.role === "admin") return "president";
  return user.role || "member";
};

// Assignable club roles — a user can now hold more than one of these at once.
const CLUB_ROLE_OPTIONS = [
  { key: 'president', label: '👑 President', department: 'Executive High Board', position: 'President' },
  { key: 'vice_president', label: '⭐ Vice President', department: 'Executive High Board', position: 'Vice President' },
  { key: 'oc', label: '⚡ Head of OC', department: 'Tournament Organizing Committee', position: 'Head' },
  { key: 'member_oc', label: '✨ Member of OC', department: 'Tournament Organizing Committee', position: 'Member' },
  { key: 'hr', label: '👥 Head of HR', department: 'Human Resources', position: 'Head' },
  { key: 'member_hr', label: '👥 Member of HR', department: 'Human Resources', position: 'Member' },
  { key: 'pr', label: '📢 Head of PR', department: 'Public Relations', position: 'Head' },
  { key: 'member_pr', label: '📢 Member of PR', department: 'Public Relations', position: 'Member' },
  { key: 'media', label: '🎨 Head of Multimedia', department: 'Multimedia & Design', position: 'Head' },
  { key: 'member_media', label: '🎨 Member of Multimedia', department: 'Multimedia & Design', position: 'Member' },
  { key: 'trainer', label: '🎓 Head of Training', department: 'Training & Masterclasses', position: 'Head' },
  { key: 'trainee', label: '♟️ Trainee', department: 'Trainee Development Pathway', position: 'Trainee' },
];

// Priority order used only to derive a single legacy "role" string for old
// code paths that still read u.role (e.g. delete-button guard).
const ROLE_PRIORITY = [
  'president', 'vice_president', 'oc', 'hr', 'pr', 'media', 'trainer',
  'member_oc', 'member_hr', 'member_pr', 'member_media', 'trainee'
];

const getSelectedRoleKeysFromClubRoles = (clubRoles) => {
  if (!Array.isArray(clubRoles)) return [];
  return CLUB_ROLE_OPTIONS
    .filter(opt => clubRoles.some(r => r.department === opt.department && r.position === opt.position))
    .map(opt => opt.key);
};

const computeLegacyRoleFromKeys = (selectedKeys) => {
  const found = ROLE_PRIORITY.find(key => selectedKeys.includes(key));
  return found || 'member';
};

// Returns the list of admin tab IDs this role is actually allowed to view.
// Used to validate the `?tab=` URL param so it can't be used to bypass RBAC.
export const getAccessibleAdminTabs = (userRole) => {
  const rawUserClubRoles = localStorage.getItem("userClubRoles");
  let userClubRoles = [];
  try { if (rawUserClubRoles) userClubRoles = JSON.parse(rawUserClubRoles); } catch (e) {}

  const isExec = ['admin', 'president', 'vice_president'].includes(userRole);
  const isHeadHR = userRole === 'hr' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Human Resources' && (r.position === 'Head' || r.position === 'President' || r.position === 'Vice President')));
  const isHeadOC = userRole === 'oc' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Tournament Organizing Committee' && (r.position === 'Head' || r.position === 'President' || r.position === 'Vice President')));
  const isHeadPR = userRole === 'pr' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Public Relations' && (r.position === 'Head' || r.position === 'President' || r.position === 'Vice President')));
  const isHeadMedia = userRole === 'media' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Multimedia & Design' && (r.position === 'Head' || r.position === 'President' || r.position === 'Vice President')));
  const isHeadTrainer = userRole === 'trainer' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Training & Masterclasses' && (r.position === 'Head' || r.position === 'President' || r.position === 'Vice President')));

  const isOCMember = userRole === 'member_oc' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Tournament Organizing Committee'));
  const isPRMember = userRole === 'member_pr' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Public Relations'));

  if (isExec) {
    return ["add-tournament", "tournaments-list", "applications", "manage-users", "manage-puzzles", "broadcast", "inquiries"];
  }

  const tabIds = [];
  if (isHeadHR) tabIds.push("manage-users", "applications", "broadcast", "inquiries");
  if (isHeadOC) tabIds.push("add-tournament", "tournaments-list", "manage-puzzles", "inquiries");
  else if (isOCMember) tabIds.push("add-tournament", "tournaments-list", "manage-puzzles");
  if (isHeadPR || isPRMember) tabIds.push("broadcast", "inquiries");
  if (isHeadMedia) tabIds.push("broadcast", "inquiries");
  if (isHeadTrainer) tabIds.push("manage-puzzles");

  return Array.from(new Set(tabIds));
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [activeTab, setActiveTab] = useState("add-tournament");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Puzzle Challenge Tournament states
  const [puzzleTournaments, setPuzzleTournaments] = useState([]);
  const [editingPuzzleTournamentId, setEditingPuzzleTournamentId] = useState(null);
  const [puzzleTitle, setPuzzleTitle] = useState("");
  const [puzzleStartDate, setPuzzleStartDate] = useState("");
  const [puzzleStartTime, setPuzzleStartTime] = useState("");
  const [puzzleEndDate, setPuzzleEndDate] = useState("");
  const [puzzleEndTime, setPuzzleEndTime] = useState("");
  const [puzzleTimeLimit, setPuzzleTimeLimit] = useState(60);
  const [puzzleTimingMode, setPuzzleTimingMode] = useState("fixed"); // 'fixed' | 'custom'
  const [puzzlesList, setPuzzlesList] = useState([]);

  // Active puzzle setup state
  const [activePuzzleFen, setActivePuzzleFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [activePuzzleMateIn, setActivePuzzleMateIn] = useState(1);
  const [activePuzzleMoves, setActivePuzzleMoves] = useState([]);
  const [activePuzzleDesc, setActivePuzzleDesc] = useState("");
  const [activePuzzleTimeLimit, setActivePuzzleTimeLimit] = useState("");
  const [setupMode, setSetupMode] = useState(true); // true = setup pieces; false = record solution moves
  const [selectedPiece, setSelectedPiece] = useState(null); // { type: 'p'|'r'..., color: 'w'|'b' } or 'clear'
  const [chessInstance, setChessInstance] = useState(new Chess());
  const [initialPuzzleFen, setInitialPuzzleFen] = useState("");
  const [boardOrientation, setBoardOrientation] = useState("white");
  const [customFenInput, setCustomFenInput] = useState("");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});

  const [tournaments, setTournaments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [roleModal, setRoleModal] = useState({ isOpen: false, user: null, selectedKeys: [] });
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [inquiries, setInquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Broadcast Notification & Email Dispatch states
  const [broadcastRecipientType, setBroadcastRecipientType] = useState("all"); // 'all' | 'specific'
  const [broadcastTargetEmail, setBroadcastTargetEmail] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLink, setBroadcastLink] = useState("");
  const [sendInApp, setSendInApp] = useState(true);
  const [sendEmailFlag, setSendEmailFlag] = useState(true);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastSuccessInfo, setBroadcastSuccessInfo] = useState(null);
  const [broadcastLogs, setBroadcastLogs] = useState([]);
  const [selectedLogPreview, setSelectedLogPreview] = useState(null);
  const [logSearch, setLogSearch] = useState("");

  // Dynamic container board width calculation for optimal ratio
  const boardWrapperRef = useRef(null);
  const boardDragRef = useRef(0);
  const [boardWidth, setBoardWidth] = useState(() => {
    if (typeof window === "undefined") return 400;
    const vw = window.innerWidth;
    return Math.max(200, Math.min(vw < 768 ? vw - 48 : 480, 480));
  });

  useEffect(() => {
    const updateBoardWidth = () => {
      let available = 0;
      if (boardWrapperRef.current && boardWrapperRef.current.parentElement) {
        const parentEl = boardWrapperRef.current.parentElement;
        const computedStyle = window.getComputedStyle(parentEl);
        const padLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const padRight = parseFloat(computedStyle.paddingRight) || 0;
        available = parentEl.clientWidth - padLeft - padRight;
      }

      if (!available || available <= 0) {
        const vw = typeof window !== "undefined" ? window.innerWidth : 400;
        const estimatedPad = vw < 768 ? 56 : 48;
        available = vw - estimatedPad;
      }

      const maxAllowed = Math.min(typeof window !== "undefined" ? window.innerWidth - 24 : 480, 480);
      let calculatedW = Math.min(available - 2, maxAllowed);
      calculatedW = Math.max(200, Math.floor(calculatedW));

      setBoardWidth((prev) => (Math.abs(prev - calculatedW) >= 1 ? calculatedW : prev));
    };

    updateBoardWidth();

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined" && boardWrapperRef.current?.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        updateBoardWidth();
      });
      resizeObserver.observe(boardWrapperRef.current.parentElement);
    }

    const t1 = setTimeout(updateBoardWidth, 50);
    const t2 = setTimeout(updateBoardWidth, 150);
    const t3 = setTimeout(updateBoardWidth, 350);
    window.addEventListener("resize", updateBoardWidth);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", updateBoardWidth);
    };
  }, [activeTab, setupMode, editingPuzzleTournamentId]);

  // Modal state for applications
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  // Form state for new tournament
  const [form, setForm] = useState({
    title: "",
    type: "Swiss",
    status: "Upcoming",
    startDate: "",
    endDate: "",
    time: "",
    location: "Zewail Chess Club",
    description: "",
    image: "",
    detailsUrl: "",
    rounds: 5  // Swiss only — FIDE: N rounds needs ≥ N+1 players
  });

  // Tournament Photo Modal state for managing/completed tournaments
  const [photoModal, setPhotoModal] = useState({
    isOpen: false,
    tournamentId: null,
    tournamentTitle: "",
    previewUrl: "",
    isSaving: false
  });

  // Fetch tournaments and applications
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      // Fetch Tournaments
      const tData = await safeFetchJson(`${API_BASE}/api/tournaments`);
      if (Array.isArray(tData)) setTournaments(tData);

      // Fetch Applications
      try {
        const appData = await safeFetchJson(`${API_BASE}/api/applications`);
        if (Array.isArray(appData)) setApplications(appData);
      } catch (e) {
        console.warn("Failed to fetch applications:", e.message);
      }

      // Fetch Puzzle Tournaments
      try {
        const pzData = await safeFetchJson(`${API_BASE}/api/puzzle-tournaments`);
        if (Array.isArray(pzData)) setPuzzleTournaments(pzData);
      } catch (e) {
        console.warn("Failed to fetch puzzle tournaments:", e.message);
      }

      // Fetch Users
      if (["admin", "president", "vice_president", "oc", "hr", "pr", "media"].includes(userRole)) {
        try {
          const userData = await safeFetchJson(`${API_BASE}/api/users`);
          if (Array.isArray(userData)) setUsers(userData);
        } catch (e) {
          console.warn("Failed to fetch users:", e.message);
        }
      }

      // Fetch Inquiries / Contact Dispatches
      if (["admin", "president", "vice_president", "oc", "hr", "pr", "media"].includes(userRole)) {
        try {
          const inqData = await safeFetchJson(`${API_BASE}/api/contact`);
          if (Array.isArray(inqData)) setInquiries(inqData);
        } catch (e) {
          console.warn("Failed to fetch inquiries:", e.message);
        }
      }

      // Fetch Dispatched Announcements & Emails History
      if (["admin", "president", "vice_president", "hr", "pr", "media"].includes(userRole)) {
        try {
          const logData = await safeFetchJson(`${API_BASE}/api/admin/broadcast-logs`);
          if (Array.isArray(logData)) setBroadcastLogs(logData);
        } catch (e) {
          console.warn("Failed to fetch broadcast logs:", e.message);
        }
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setErrorMessage("Failed to load dashboard data. Is the server running?");
    } finally {
      setIsLoading(false);
    }
  };

  const userRole = localStorage.getItem("userRole") || "member";

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/?login=true");
      return;
    }

    const allowedAdminRoles = [
      "admin", "president", "vice_president",
      "oc", "hr", "pr", "media", "trainer",
      "member_oc", "member_pr"
    ];
    if (!allowedAdminRoles.includes(userRole)) {
      navigate("/");
      return;
    }

    const accessibleTabs = getAccessibleAdminTabs(userRole);
    if (accessibleTabs.length === 0) {
      // This role has a valid admin login but no permitted tabs — bounce out.
      navigate("/");
      return;
    }

    // Pick a safe default tab for this role, falling back to the first
    // tab they're actually permitted to see.
    let defaultTab = "add-tournament";
    if (userRole === "hr") defaultTab = "applications";
    else if (userRole === "pr" || userRole === "member_pr" || userRole === "media") defaultTab = "broadcast";
    else if (userRole === "trainer") defaultTab = "manage-puzzles";
    if (!accessibleTabs.includes(defaultTab)) {
      defaultTab = accessibleTabs[0];
    }

    // Validate the ?tab= param against this role's permitted tabs —
    // never trust it blindly, or anyone can type ?tab=broadcast in the URL.
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");

    if (tabParam && accessibleTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab(defaultTab);
      if (tabParam) {
        // Strip the unauthorized tab out of the URL bar too
        navigate(`/admin?tab=${defaultTab}`, { replace: true });
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, userRole, location.search]);

  // eslint-disable-next-line no-unused-vars
  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  const handleUpdateStatus = async (id, status) => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await safeFetchJson(`${API_BASE}/api/applications/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      setSuccessMessage(`Application ${status.toLowerCase()} successfully!`);
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to update status.");
    }
  };

  const openRoleModal = (user) => {
    setRoleModal({
      isOpen: true,
      user,
      selectedKeys: getSelectedRoleKeysFromClubRoles(user.clubRoles)
    });
  };

  const closeRoleModal = () => setRoleModal({ isOpen: false, user: null, selectedKeys: [] });

  const toggleRoleKey = (key) => {
    setRoleModal(prev => ({
      ...prev,
      selectedKeys: prev.selectedKeys.includes(key)
        ? prev.selectedKeys.filter(k => k !== key)
        : [...prev.selectedKeys, key]
    }));
  };

  const handleSaveUserRoles = async () => {
    const targetUser = roleModal.user;
    if (!targetUser) return;

    setErrorMessage("");
    setSuccessMessage("");

    const newClubRoles = CLUB_ROLE_OPTIONS
      .filter(opt => roleModal.selectedKeys.includes(opt.key))
      .map(opt => ({ department: opt.department, position: opt.position }));
    const legacyRole = computeLegacyRoleFromKeys(roleModal.selectedKeys);

    // Optimistic UI update
    setUsers(prev => prev.map(u => {
      if (u.email?.toLowerCase() === targetUser.email?.toLowerCase()) {
        return { ...u, role: legacyRole, clubRoles: newClubRoles };
      }
      return u;
    }));
    closeRoleModal();

    try {
      const adminEmail = localStorage.getItem("adminEmail") || localStorage.getItem("userEmail") || "chesszc@zewailcity.edu.eg";
      await safeFetchJson(`${API_BASE}/api/admin/manage-user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail,
          targetEmail: targetUser.email,
          role: legacyRole,
          clubRoles: newClubRoles
        })
      });

      const currentEmail = localStorage.getItem("adminEmail") || localStorage.getItem("userEmail") || "";
      if (targetUser.email?.toLowerCase() === currentEmail.toLowerCase()) {
        localStorage.setItem("userRole", legacyRole);
        localStorage.setItem("userClubRoles", JSON.stringify(newClubRoles));
        window.dispatchEvent(new Event("userRoleUpdated"));
        window.dispatchEvent(new Event("userClubRolesUpdated"));
      }

      setSuccessMessage(`👑 Roles updated for ${targetUser.name}! Direct appointment email & in-app notification dispatched.`);
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to update user roles.");
      fetchData();
    }
  };

  // Direct Photo Upload for any registered user (Admin authority)
  const handleUserPhotoUpload = async (targetUser, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const compressedBase64 = await compressImage(file, 250, 250, 0.75);
      
      // Optimistic visual update
      setUsers(prev => prev.map(u => {
        if (u.email?.toLowerCase() === targetUser.email?.toLowerCase()) {
          return { ...u, profileImage: compressedBase64 };
        }
        return u;
      }));

      await safeFetchJson(`${API_BASE}/api/profile/image`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetUser.email,
          profileImage: compressedBase64
        })
      });

      const currentEmail = localStorage.getItem("adminEmail") || localStorage.getItem("userEmail") || "";
      if (targetUser.email?.toLowerCase() === currentEmail.toLowerCase()) {
        localStorage.setItem("userAvatar", compressedBase64);
        window.dispatchEvent(new Event("userAvatarUpdated"));
      }

      setSuccessMessage(`Profile image updated for ${targetUser.name || targetUser.email}!`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setErrorMessage(err.message || "Failed to upload profile photo.");
    }
  };

  // Quick Templates for Broadcasts
  const handleApplyTemplate = (templateKey) => {
    switch (templateKey) {
      case "tournament":
        setBroadcastTitle("🏆 New Chess Tournament Announced!");
        setBroadcastMessage("Dear Tacticians,\n\nA new official Zewail City Chess Club tournament has been announced. Check the tournament schedule, formats, and register your spot on the dashboard.\n\nMay the best minds prevail!");
        setBroadcastLink("/tournaments");
        break;
      case "match":
        setBroadcastTitle("⚡ Upcoming Match & Pairing Alert");
        setBroadcastMessage("Greetings,\n\nYour tournament pairings and match timings have been posted. Please be at the chess lounge 10 minutes before the clock starts with your student ID.\n\nGood luck!");
        setBroadcastLink("/tournaments");
        break;
      case "swiss_rules":
        setBroadcastTitle("🏛️ Official FIDE Swiss System Rules & Match Format");
        setBroadcastMessage("Dear Tacticians,\n\nWelcome to our official FIDE Swiss System Tournament! Here is an overview of the championship rules:\n\n1. ♾️ NON-ELIMINATION SYSTEM:\n• No player is eliminated! All registered participants play all scheduled rounds from start to finish.\n• Every win, draw, or loss counts toward your final cumulative score and rating.\n\n2. 🎯 SCORE-GROUP DUTCH PAIRINGS:\n• In every round, players are paired strictly against opponents with the same (or closest) accumulated score.\n• No Rematches: You will never play the same opponent more than once.\n\n3. ⚖️ COLOR BALANCE & ALTERNATION:\n• White ⚪ and Black ⚫ pieces alternate each round according to FIDE regulations to ensure fairness.\n\n4. 📊 FIDE SCORING & TIEBREAKS:\n• Win = 1.0 pt, Draw = 0.5 pt, Loss = 0.0 pt, Bye = 1.0 pt.\n• Standings are decided by Direct Encounter, Buchholz Cut 1, and Sonneborn-Berger tiebreaks.\n\nPlay with honor and may the best tactician triumph!");
        setBroadcastLink("/tournaments");
        break;
      case "double_knockout_rules":
        setBroadcastTitle("⚡ Double Knockout (Double Elimination) Rules & Match Format");
        setBroadcastMessage("Dear Competitors,\n\nWelcome to the Zewail City Double Knockout Championship! Please review the tournament rules:\n\n1. 🛡️ TWO LIVES (WINNERS & LOSERS BRACKETS):\n• All players begin in the Winners (Upper) Bracket.\n• Losing one match drops you to the Losers (Lower) Bracket.\n• You are only eliminated after suffering your SECOND match loss!\n\n2. ⚔️ TWO-GAME MINI-MATCHES:\n• Each knockout round is a 2-game series with alternating colors.\n• Game 1: Initial assigned colors (White vs Black).\n• Game 2: Immediate color reversal (Black vs White).\n• First player to score 1.5 points wins the match!\n\n3. ⚡ ARMAGEDDON DECIDER (1 - 1 TIEBREAKER):\n• If the series ends tied 1 - 1, Armageddon is played with the Secret Time Bidding System!\n• Time Bidding: Both players write down the time they want for Black. The player who bids LESS TIME gets Black and plays with that exact time on their clock. The other player gets White with the standard base time.\n• Draw Odds: White MUST WIN to advance. Black only needs a DRAW or WIN to win the match and advance!\n\n4. 👑 GRAND FINALS & BRACKET RESET:\n• The Winners Champion battles the Losers Champion. If the Losers Champion wins Match 1, a deciding Bracket Reset Match is immediately played for the title!\n\n📺 Video Guide on Armageddon Rules: https://www.youtube.com/watch?v=JAYrNhOG-OM\n\nMay the sharpest mind win!");
        setBroadcastLink("/tournaments");
        break;
      case "knockout_rules":
        setBroadcastTitle("⚔️ Single Knockout Format & Armageddon Rules Guide");
        setBroadcastMessage("Dear Competitors,\n\nWelcome to the Zewail City Chess Club Knockout Championship! Please review the tournament rules:\n\n1. ⚔️ TWO-GAME MINI-MATCHES:\n• Each round is a 2-game match with alternating colors.\n• Game 1: Initial assigned colors (White vs Black).\n• Game 2: Colors are reversed (Black vs White).\n• First player to score 1.5 points advances to the next round!\n\n2. ⚡ ARMAGEDDON DECIDER (1 - 1 TIEBREAKER):\n• If the match ends tied 1 - 1, Armageddon is played with the Secret Time Bidding System!\n• Time Bidding: Both players write down the time they want for Black. The player who bids LESS TIME gets Black and plays with that exact time on their clock. The other player gets White with the standard base time.\n• Draw Odds: White MUST WIN to advance. Black only needs a DRAW or WIN to win the match and advance!\n\n📺 Video Guide on Armageddon Rules: https://www.youtube.com/watch?v=JAYrNhOG-OM\n\nMay the sharpest tactician prevail!");
        setBroadcastLink("/tournaments");
        break;
      case "puzzle":
        setBroadcastTitle("🧩 New Tactical Puzzle Challenge Live!");
        setBroadcastMessage("Tacticians,\n\nA brand-new puzzle challenge has just gone live! Test your tactical prowess, solve the sequence under time pressure, and climb the club leaderboard.");
        setBroadcastLink("/puzzletournaments");
        break;
      case "challenge":
        setBroadcastTitle("⚔️ Campus Duel & Casual Blitz Challenge Alert");
        setBroadcastMessage("Dear Tactician,\n\nYou have been challenged to a friendly campus chess match! Visit the Community Hub on the club website to accept or decline the duel, arrange the clock, and choose your preferred location.");
        setBroadcastLink("/community");
        break;
      case "meeting":
        setBroadcastTitle("📢 General Club Assembly & Practice Session");
        setBroadcastMessage("Dear Club Members,\n\nWe are hosting an in-person blitz practice and club strategy assembly this week. Come meet fellow players, analyze historic Grandmaster games, and participate in casual matches!");
        setBroadcastLink("/community");
        break;
      default:
        break;
    }
  };

  // Dispatch Broadcast Notification & Real Email
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setBroadcastSuccessInfo(null);

    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setErrorMessage("Please enter both an Announcement Title and Message body.");
      return;
    }

    if (broadcastRecipientType === "specific" && !broadcastTargetEmail.trim()) {
      setErrorMessage("Please select or enter the recipient player's email address.");
      return;
    }

    if (!sendInApp && !sendEmailFlag) {
      setErrorMessage("Please select at least one delivery channel (In-App Notification or Real Email).");
      return;
    }

    const adminEmail = localStorage.getItem("adminEmail") || localStorage.getItem("userEmail") || "chesszc@zewailcity.edu.eg";

    setIsSendingBroadcast(true);
    try {
      const response = await safeFetchJson(`${API_BASE}/api/admin/broadcast-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail,
          recipientType: broadcastRecipientType,
          targetEmail: broadcastRecipientType === "specific" ? broadcastTargetEmail.trim() : undefined,
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          link: broadcastLink.trim() || "/",
          sendInAppNotification: sendInApp,
          sendEmailNotification: sendEmailFlag
        })
      });

      setBroadcastSuccessInfo(response);
      setSuccessMessage(response.message || "Notification and email dispatched successfully!");
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to dispatch broadcast.");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleDeleteBroadcastLog = async (id) => {
    if (!window.confirm("Delete this broadcast log entry from history?")) return;
    try {
      await safeFetchJson(`${API_BASE}/api/admin/broadcast-logs/${id}`, { method: "DELETE" });
      setBroadcastLogs(prev => prev.filter(l => l._id !== id));
      if (selectedLogPreview?._id === id) setSelectedLogPreview(null);
    } catch (err) {
      alert("Failed to delete log: " + err.message);
    }
  };

  const handleReuseBroadcastLog = (log) => {
    setBroadcastTitle(log.title || "");
    setBroadcastMessage(log.message || "");
    setBroadcastLink(log.link || "");
    setBroadcastRecipientType(log.recipientType || "all");
    if (log.recipientType === "specific" && log.targetEmail) {
      setBroadcastTargetEmail(log.targetEmail);
    }
    setSendInApp(log.channels?.inApp !== false);
    setSendEmailFlag(log.channels?.email !== false);
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  // Chess editor helpers & robust FEN tools
  const extractBoardMapFromFen = (fenStr) => {
    const map = {};
    if (!fenStr) return map;
    try {
      const tempChess = new Chess(fenStr);
      const board = tempChess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c]) {
            const sq = String.fromCharCode(97 + c) + (8 - r);
            map[sq] = { type: board[r][c].type, color: board[r][c].color };
          }
        }
      }
    } catch (e) {
      // Fallback manual FEN parser if chess.js rejects intermediate incomplete position
      const parts = fenStr.split(" ");
      const rows = parts[0].split("/");
      if (rows.length === 8) {
        for (let r = 0; r < 8; r++) {
          let c = 0;
          for (let i = 0; i < rows[r].length; i++) {
            const char = rows[r][i];
            if (!isNaN(char)) {
              c += parseInt(char, 10);
            } else {
              const color = char === char.toUpperCase() ? 'w' : 'b';
              const type = char.toLowerCase();
              const sq = String.fromCharCode(97 + c) + (8 - r);
              map[sq] = { type, color };
              c++;
            }
          }
        }
      }
    }
    return map;
  };

  const buildFenFromBoardMap = (boardMap, currentFen = "") => {
    let rows = [];
    for (let r = 7; r >= 0; r--) {
      let emptyCount = 0;
      let rowStr = "";
      for (let c = 0; c < 8; c++) {
        const sq = String.fromCharCode(97 + c) + (r + 1);
        const p = boardMap[sq];
        if (!p) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            rowStr += emptyCount;
            emptyCount = 0;
          }
          const char = p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
          rowStr += char;
        }
      }
      if (emptyCount > 0) rowStr += emptyCount;
      rows.push(rowStr);
    }
    const posPart = rows.join("/");
    const turn = (currentFen && currentFen.split(" ")[1]) || "w";
    return `${posPart} ${turn} - - 0 1`;
  };

  const getMoveOptionsStyles = (sourceSquare, gameInstance) => {
    if (!gameInstance || typeof gameInstance.moves !== "function") return {};

    const moves = gameInstance.moves({
      square: sourceSquare,
      verbose: true
    });

    if (!moves || moves.length === 0) return {};

    const newStyles = {};
    
    newStyles[sourceSquare] = {
      backgroundColor: "rgba(243, 193, 68, 0.4)",
      boxShadow: "inset 0 0 0 2px #f3c144"
    };

    moves.forEach((move) => {
      const targetPiece = gameInstance.get(move.to);
      if (targetPiece) {
        newStyles[move.to] = {
          background: "radial-gradient(circle, transparent 52%, rgba(243, 193, 68, 0.75) 53%, rgba(243, 193, 68, 0.75) 70%, transparent 71%)",
          borderRadius: "50%"
        };
      } else {
        newStyles[move.to] = {
          background: "radial-gradient(circle, rgba(243, 193, 68, 0.75) 24%, transparent 25%)",
          borderRadius: "50%"
        };
      }
    });

    return newStyles;
  };

  const handleSquareClick = (square) => {
    if (Date.now() - boardDragRef.current < 150) return;

    if (setupMode) {
      try {
        const boardMap = extractBoardMapFromFen(activePuzzleFen);

        if (selectedPiece === "clear") {
          delete boardMap[square];
        } else if (selectedPiece && typeof selectedPiece === "object") {
          boardMap[square] = { type: selectedPiece.type, color: selectedPiece.color };
        } else {
          // Erase / clear piece on click if no palette item selected
          if (boardMap[square]) {
            delete boardMap[square];
          }
        }

        const newFen = buildFenFromBoardMap(boardMap, activePuzzleFen);
        setActivePuzzleFen(newFen);
        try {
          setChessInstance(new Chess(newFen));
        } catch (e) {}
      } catch (err) {
        console.warn("Square click error:", err);
      }
      return;
    }

    // Record Solution Mode: click-to-move support
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setOptionSquares({});
        return;
      }

      const clickedPiece = chessInstance.get(square);
      if (clickedPiece && clickedPiece.color === chessInstance.turn()) {
        const styles = getMoveOptionsStyles(square, chessInstance);
        setSelectedSquare(square);
        setOptionSquares(styles);
        return;
      }

      const moveSuccess = handlePieceDrop(selectedSquare, square);
      if (moveSuccess) {
        setSelectedSquare(null);
        setOptionSquares({});
        return;
      }

      setSelectedSquare(null);
      setOptionSquares({});
      return;
    }

    const piece = chessInstance.get(square);
    if (piece && piece.color === chessInstance.turn()) {
      const styles = getMoveOptionsStyles(square, chessInstance);
      setSelectedSquare(square);
      setOptionSquares(styles);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  };

  const handlePieceDrop = (sourceSquare, targetSquare) => {
    boardDragRef.current = Date.now();
    setSelectedSquare(null);
    setOptionSquares({});
    if (setupMode) {
      // In Setup Mode: allow free dragging of pieces anywhere on the board
      const boardMap = extractBoardMapFromFen(activePuzzleFen);
      const movedPiece = boardMap[sourceSquare];
      if (movedPiece) {
        delete boardMap[sourceSquare];
        boardMap[targetSquare] = movedPiece;
        const newFen = buildFenFromBoardMap(boardMap, activePuzzleFen);
        setActivePuzzleFen(newFen);
        try {
          setChessInstance(new Chess(newFen));
        } catch (e) {}
      }
      return true;
    }

    // Record Mode: record legal solution moves
    try {
      const newChess = new Chess(chessInstance.fen());
      const move = newChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q"
      });
      
      if (move) {
        setChessInstance(newChess);
        setActivePuzzleFen(newChess.fen());
        const uciMove = move.lan || `${move.from}${move.to}${move.promotion || ""}`;
        setActivePuzzleMoves([...activePuzzleMoves, uciMove]);
        return true;
      }
    } catch (err) {
      alert("Invalid move! Pieces must follow legal chess rules during move recording.");
    }
    return false;
  };

  const onPieceDragBegin = (piece, sourceSquare) => {
    boardDragRef.current = Date.now();
    if (setupMode) return;
    const styles = getMoveOptionsStyles(sourceSquare, chessInstance);
    setSelectedSquare(sourceSquare);
    setOptionSquares(styles);
  };

  const onPieceDragEnd = () => {
    setSelectedSquare(null);
    setOptionSquares({});
  };

  const handleToggleTurn = () => {
    try {
      const currentFen = activePuzzleFen || (chessInstance ? chessInstance.fen() : "");
      const fenParts = currentFen.split(" ");
      if (fenParts.length >= 2) {
        fenParts[1] = fenParts[1] === "w" ? "b" : "w";
        const newFen = fenParts.join(" ");
        try {
          setChessInstance(new Chess(newFen));
        } catch (e) {}
        setActivePuzzleFen(newFen);
      }
    } catch (err) {
      alert("Invalid board state to change turn!");
    }
  };

  const handleClearBoard = () => {
    const emptyFen = "8/8/8/8/8/8/8/8 w - - 0 1";
    setActivePuzzleFen(emptyFen);
    try {
      const emptyChess = new Chess();
      emptyChess.clear();
      setChessInstance(emptyChess);
    } catch (e) {}
  };

  const handleResetStartBoard = () => {
    const startChess = new Chess();
    setChessInstance(startChess);
    setActivePuzzleFen(startChess.fen());
  };

  const handleLoadCustomFen = (fenString) => {
    const fen = (fenString || customFenInput).trim();
    if (!fen) return;
    try {
      const testChess = new Chess(fen);
      setChessInstance(testChess);
      setActivePuzzleFen(testChess.fen());
      setCustomFenInput("");
    } catch (e) {
      if (fen.split(" ").length >= 1 && fen.split("/").length === 8) {
        setActivePuzzleFen(fen);
        setCustomFenInput("");
      } else {
        alert("Invalid FEN string! Please check formatting (e.g. r1bqkb1r/pppp1ppp/...).");
      }
    }
  };

  const handleCopyFen = () => {
    if (navigator.clipboard && activePuzzleFen) {
      navigator.clipboard.writeText(activePuzzleFen);
      alert("Position FEN copied to clipboard!");
    }
  };

  const handleStartRecording = () => {
    const boardMap = extractBoardMapFromFen(activePuzzleFen);
    let whiteKing = false;
    let blackKing = false;

    Object.values(boardMap).forEach(p => {
      if (p.type === 'k') {
        if (p.color === 'w') whiteKing = true;
        if (p.color === 'b') blackKing = true;
      }
    });

    if (!whiteKing || !blackKing) {
      alert("Both White (♔) and Black (♚) Kings must be placed on the board before recording solution moves!");
      return;
    }

    try {
      const validChess = new Chess(activePuzzleFen);
      setChessInstance(validChess);
      setInitialPuzzleFen(validChess.fen());
      setSetupMode(false);
      setActivePuzzleMoves([]);
    } catch (err) {
      alert(`Invalid position for move recording: ${err.message || "Ensure position is legal."}`);
    }
  };

  const handleUndoMove = () => {
    if (activePuzzleMoves.length === 0) return;
    try {
      const replayChess = new Chess(initialPuzzleFen);
      const newMoves = activePuzzleMoves.slice(0, -1);
      newMoves.forEach(m => {
        replayChess.move(m);
      });
      setChessInstance(replayChess);
      setActivePuzzleFen(replayChess.fen());
      setActivePuzzleMoves(newMoves);
    } catch (err) {
      alert("Error undoing move!");
    }
  };

  const handleAddPuzzle = async () => {
    if (activePuzzleMoves.length === 0) {
      alert("Please record the correct solution moves first!");
      return;
    }
    
    const newPuzzle = {
      initialFen: initialPuzzleFen,
      mateIn: activePuzzleMateIn,
      correctMoves: activePuzzleMoves,
      description: activePuzzleDesc || (activePuzzleMateIn === 0 ? "Find the Best Move" : `Mate in ${activePuzzleMateIn}`),
      timeLimit: puzzleTimingMode === "custom" && activePuzzleTimeLimit ? Number(activePuzzleTimeLimit) : null
    };
    
    // If editing an existing tournament, directly save it to the backend tournament!
    if (editingPuzzleTournamentId) {
      try {
        setIsLoading(true);
        const res = await safeFetchJson(`${API_BASE}/api/puzzle-tournaments/${editingPuzzleTournamentId}/puzzles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPuzzle)
        });
        
        if (res?.data?.puzzles) {
          setPuzzlesList(res.data.puzzles);
        } else {
          setPuzzlesList(prev => [...prev, newPuzzle]);
        }
        
        setSuccessMessage(`✅ Puzzle successfully added to "${puzzleTitle || 'Challenge'}"!`);
        fetchData();
      } catch (err) {
        setErrorMessage(err.message || "Failed to add puzzle to tournament.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setPuzzlesList([...puzzlesList, newPuzzle]);
      setSuccessMessage("✅ Puzzle added to list! Publish the tournament when ready.");
    }
    
    // Reset editor for next puzzle
    const defaultChess = new Chess();
    setChessInstance(defaultChess);
    setActivePuzzleFen(defaultChess.fen());
    setInitialPuzzleFen("");
    setActivePuzzleMoves([]);
    setActivePuzzleDesc("");
    setActivePuzzleTimeLimit("");
    setSetupMode(true);
    setSelectedPiece(null);
  };

  const handleRemovePuzzleFromList = async (index) => {
    const puzzleToDelete = puzzlesList[index];
    if (!puzzleToDelete) return;
    
    if (editingPuzzleTournamentId) {
      try {
        const puzzleIdOrIndex = puzzleToDelete._id || index;
        await safeFetchJson(`${API_BASE}/api/puzzle-tournaments/${editingPuzzleTournamentId}/puzzles/${puzzleIdOrIndex}`, {
          method: "DELETE"
        });
        setPuzzlesList(prev => prev.filter((_, i) => i !== index));
        setSuccessMessage("Puzzle removed from tournament.");
        fetchData();
      } catch (err) {
        setErrorMessage(err.message || "Failed to delete puzzle.");
      }
    } else {
      setPuzzlesList(puzzlesList.filter((_, i) => i !== index));
    }
  };

  const handleQuickAddPuzzle = (t) => {
    handleEditPuzzleTournament(t);
    setTimeout(() => {
      const editor = document.getElementById("puzzle-board-editor-anchor") || document.getElementById("puzzle-form-section");
      if (editor) {
        editor.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleEditPuzzleInList = (index) => {
    const p = puzzlesList[index];
    if (!p) return;
    try {
      const c = new Chess(p.initialFen);
      setChessInstance(c);
    } catch (e) {}
    setActivePuzzleFen(p.initialFen);
    setActivePuzzleMateIn(p.mateIn !== undefined && p.mateIn !== null ? p.mateIn : 1);
    setActivePuzzleMoves(p.correctMoves || []);
    setActivePuzzleDesc(p.description || "");
    setActivePuzzleTimeLimit(p.timeLimit ? String(p.timeLimit) : "");
    if (p.timeLimit) {
      setPuzzleTimingMode("custom");
    }
    setInitialPuzzleFen(p.initialFen);
    setSetupMode(false);
    setPuzzlesList(puzzlesList.filter((_, i) => i !== index));
  };

  const handleSavePuzzleTournament = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    
    if (puzzlesList.length === 0) {
      setErrorMessage("Please add at least one puzzle to the tournament!");
      return;
    }

    const payload = {
      title: puzzleTitle,
      startDate: puzzleStartDate,
      startTime: puzzleStartTime,
      endDate: puzzleEndDate,
      endTime: puzzleEndTime,
      timeLimit: Number(puzzleTimeLimit) || 60,
      puzzles: puzzlesList
    };
    
    try {
      const url = editingPuzzleTournamentId 
        ? `${API_BASE}/api/puzzle-tournaments/${editingPuzzleTournamentId}`
        : `${API_BASE}/api/puzzle-tournaments`;
      const method = editingPuzzleTournamentId ? "PUT" : "POST";

      const res = await safeFetchJson(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      setSuccessMessage(res.message || (editingPuzzleTournamentId ? "Puzzle tournament updated!" : "Puzzle tournament created!"));
      handleResetPuzzleForm();
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to save puzzle tournament.");
    }
  };

  const handleEditPuzzleTournament = (t) => {
    setEditingPuzzleTournamentId(t._id);
    setPuzzleTitle(t.title || "");
    setPuzzleStartDate(t.startDate || "");
    setPuzzleStartTime(t.startTime || "");
    setPuzzleEndDate(t.endDate || "");
    setPuzzleEndTime(t.endTime || "");
    setPuzzleTimeLimit(t.timeLimit || 60);
    setPuzzlesList(t.puzzles || []);
    const hasCustom = (t.puzzles || []).some(
      (p) => p.timeLimit && Number(p.timeLimit) > 0 && Number(p.timeLimit) !== Number(t.timeLimit)
    );
    setPuzzleTimingMode(hasCustom ? "custom" : "fixed");
    setSuccessMessage(`Editing: ${t.title}`);
    
    // Scroll to form
    const element = document.getElementById("puzzle-form-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDeletePuzzleTournament = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the puzzle challenge "${title || 'Tournament'}"? This action cannot be undone.`)) return;
    try {
      await safeFetchJson(`${API_BASE}/api/puzzle-tournaments/${id}`, {
        method: "DELETE"
      });
      setSuccessMessage("Puzzle tournament deleted successfully!");
      if (editingPuzzleTournamentId === id) {
        handleResetPuzzleForm();
      }
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete puzzle tournament.");
    }
  };

  const handleRemovePuzzleParticipant = async (tournament, participant) => {
    if (!window.confirm(`Remove ${participant.name} from "${tournament.title}"?`)) return;
    try {
      const adminEmail = localStorage.getItem("adminEmail") || "";
      const updated = await safeFetchJson(
        `${API_BASE}/api/puzzle-tournaments/${tournament._id}/participants/${encodeURIComponent(participant.email)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Email": adminEmail
          },
          body: JSON.stringify({ adminEmail })
        }
      );
      if (updated?.data) {
        setPuzzleTournaments((prev) => prev.map((item) => item._id === tournament._id ? updated.data : item));
      }
      setSuccessMessage(`${participant.name} was removed from the tournament.`);
    } catch (err) {
      setErrorMessage(err.message || "Failed to remove participant.");
    }
  };

  const isPuzzleChallengeFinished = (t) => {
    if (!t || !t.endDate) return false;
    const endStr = `${t.endDate}T${t.endTime || "23:59"}:59`;
    const end = new Date(endStr);
    return !isNaN(end.getTime()) && new Date() >= end;
  };

  const handleBroadcastPuzzleWinners = async (tournament) => {
    if (!tournament.leaderboard || tournament.leaderboard.length === 0) {
      alert("No scores recorded on this puzzle challenge yet.");
      return;
    }
    const isFinished = isPuzzleChallengeFinished(tournament);
    const sorted = [...tournament.leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0));
    const champ = sorted[0]?.name || "Tactician";

    const confirmMsg = isFinished
      ? `📢 Broadcast official Champions Podium & winner announcement for "${tournament.title}" to all club members?\n\n🥇 Champion: ${champ} (${sorted[0]?.score || 0} pts)`
      : `⚠️ Note: According to local clock, challenge deadline is ${tournament.endDate || "TBD"} ${tournament.endTime || ""}.\n\nAs Tournament Admin, do you want to officially close this challenge and broadcast results for "${tournament.title}" now?\n\n🥇 Champion: ${champ} (${sorted[0]?.score || 0} pts)`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await safeFetchJson(`${API_BASE}/api/puzzle-tournaments/${tournament._id}/broadcast-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true })
      });
      setSuccessMessage(res.message || `🏆 Champions Podium announcement for "${tournament.title}" broadcast to all tacticians!`);
      setPuzzleTournaments((prev) => prev.map((item) => item._id === tournament._id ? { ...item, winnersBroadcasted: true } : item));
    } catch (err) {
      setErrorMessage(err.message || "Failed to broadcast puzzle champions announcement.");
    }
  };

  const handleResetPuzzleForm = () => {
    setEditingPuzzleTournamentId(null);
    setPuzzleTitle("");
    setPuzzleStartDate("");
    setPuzzleStartTime("");
    setPuzzleEndDate("");
    setPuzzleEndTime("");
    setPuzzleTimeLimit(60);
    setPuzzleTimingMode("fixed");
    setPuzzlesList([]);
    const defaultChess = new Chess();
    setChessInstance(defaultChess);
    setActivePuzzleFen(defaultChess.fen());
    setInitialPuzzleFen("");
    setActivePuzzleMoves([]);
    setActivePuzzleDesc("");
    setActivePuzzleTimeLimit("");
    setSetupMode(true);
    setSelectedPiece(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // Create Tournament
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.title || !form.startDate || !form.time) {
      setErrorMessage("Please fill in all required fields (Title, Start Date, and Time).");
      return;
    }

    try {
      await safeFetchJson(`${API_BASE}/api/tournaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      setSuccessMessage("Tournament created successfully!");
      // Reset form (except defaults)
      setForm({
        title: "",
        type: "Swiss",
        status: "Upcoming",
        startDate: "",
        endDate: "",
        time: "",
        location: "Zewail Chess Club",
        description: "",
        image: "",
        detailsUrl: "",
        rounds: 5
      });
      fetchData(); // Refresh list
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong.");
    }
  };

  // Save/Update Tournament Photo from Modal
  const handleSaveTournamentPhoto = async () => {
    if (!photoModal.tournamentId) return;
    setPhotoModal((prev) => ({ ...prev, isSaving: true }));
    try {
      await safeFetchJson(`${API_BASE}/api/tournaments/${photoModal.tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photoModal.previewUrl })
      });
      setSuccessMessage(`Tournament photo updated for "${photoModal.tournamentTitle}"! It will now appear in History & Archives.`);
      setPhotoModal({ isOpen: false, tournamentId: null, tournamentTitle: "", previewUrl: "", isSaving: false });
      fetchData();
    } catch (err) {
      setErrorMessage("Failed to update tournament photo: " + err.message);
      setPhotoModal((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // Delete Tournament
  const handleDeleteTournament = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tournament?")) return;

    try {
      await safeFetchJson(`${API_BASE}/api/tournaments/${id}`, {
        method: "DELETE"
      });

      setSuccessMessage("Tournament deleted successfully.");
      fetchData(); // Refresh list
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Delete User
  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user completely? This cannot be undone.")) return;

    try {
      await safeFetchJson(`${API_BASE}/api/users/${id}`, {
        method: "DELETE"
      });

      setSuccessMessage("User deleted successfully.");
      fetchData(); // Refresh list
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Utility to format role specific details
  const PrettyRoleData = ({ data }) => {
    const formatKey = (key) =>
      key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const renderData = (obj) => {
      if (obj === null || obj === undefined)
        return <em style={{ color: "#888" }}>Not provided</em>;

      if (Array.isArray(obj)) {
        return obj.map((item, i) => (
          <div key={i} className="pretty-role-array-item">
            <h4>Entry #{i + 1}</h4>
            {renderData(item)}
          </div>
        ));
      }

      if (typeof obj === "object" && obj !== null) {
        return Object.entries(obj).map(([k, v]) => (
          <div key={k} className="pretty-field">
            <strong>{formatKey(k)}:</strong>
            <div style={{ paddingLeft: "15px" }}>{renderData(v)}</div>
          </div>
        ));
      }

      return <span>{obj}</span>;
    };

    return (
      <div className="pretty-role-data">
        {Object.keys(data || {}).length === 0 ? (
          <p style={{ color: "#caba91", fontStyle: "italic" }}>
            No role-specific data provided.
          </p>
        ) : (
          renderData(data)
        )}
      </div>
    );
  };

  return (
    <div className="admin-wrapper">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="admin-container">
        <section className="intro-header">
          <div className="admin-header-content">
            <div className="admin-header-titles">
              <span className="admin-role-badge">
                {userRole === "president" ? "👑 President Portal" : userRole === "vice_president" ? "⭐ Vice President Portal" : userRole === "admin" ? "👑 Executive Admin Portal" : userRole === "oc" ? "⚡ Organizing Committee Portal" : "📋 HR Management Portal"}
              </span>
              <h1 className="site-page-title">Zewail City Chess Club Dashboard</h1>
              <p>Manage club tournaments, schedule rounds, review member applications, and set up daily puzzle challenges.</p>
            </div>

            <div className="admin-kpi-bar">
              <div className="kpi-pill">
                <span className="kpi-num">{tournaments.length}</span>
                <span className="kpi-label">Tournaments</span>
              </div>
              <div className="kpi-pill">
                <span className="kpi-num">{applications.length}</span>
                <span className="kpi-label">Applications</span>
              </div>
              {['admin', 'president', 'vice_president'].includes(userRole) && (
                <div className="kpi-pill">
                  <span className="kpi-num">{users.length}</span>
                  <span className="kpi-label">Members</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 📱 2-Level Mobile Admin Navigation: Compact Current-Section Header & Expandable Menu */}
        {(() => {
          const adminNavItems = [
            {
              id: "add-tournament",
              label: "Add Tournament",
              icon: "➕",
              desc: "Create and publish a new Swiss or Knockout tournament",
              roles: ['admin', 'president', 'vice_president', 'oc'],
              badge: null
            },
            {
              id: "tournaments-list",
              label: "Manage Tournaments",
              icon: "🏆",
              desc: "Update rounds, pairings, standings, and statuses",
              roles: ['admin', 'president', 'vice_president', 'oc'],
              badge: tournaments.length
            },
            {
              id: "applications",
              label: "Club Applications",
              icon: "📋",
              desc: "Review and evaluate candidate member applications",
              roles: ['admin', 'president', 'vice_president', 'hr'],
              badge: applications.length
            },
            {
              id: "manage-users",
              label: "Manage Users",
              icon: "👥",
              desc: "Manage club members, edit roles, and oversee accounts",
              roles: ['admin', 'president', 'vice_president'],
              badge: users.length
            },
            {
              id: "manage-puzzles",
              label: "Chess Puzzles",
              icon: "🧩",
              desc: "Create tactical puzzles and arena competitions",
              roles: ['admin', 'president', 'vice_president', 'oc'],
              badge: puzzlesList.length > 0 ? puzzlesList.length : null
            },
            {
              id: "broadcast",
              label: "Broadcast & Email",
              icon: "📢",
              desc: "Send announcements, in-app alerts, and emails",
              roles: ['admin', 'president', 'vice_president'],
              badge: null
            },
            {
              id: "inquiries",
              label: "Inquiries / Dispatches",
              icon: "📬",
              desc: "Direct messages, member feedback, and support inquiries",
              roles: ['admin', 'president', 'vice_president', 'hr', 'oc', 'pr', 'media', 'multimedia'],
              badge: inquiries.filter(m => !m.read).length > 0 ? `${inquiries.filter(m => !m.read).length} new` : inquiries.length
            }
          ];

          const rawUserClubRoles = localStorage.getItem("userClubRoles");
          let userClubRoles = [];
          try { if (rawUserClubRoles) userClubRoles = JSON.parse(rawUserClubRoles); } catch (e) {}

          const isExec = ['admin', 'president', 'vice_president'].includes(userRole);
          const isHeadHR = userRole === 'hr' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Human Resources' && (r.position === 'Head' || r.position === 'President' || r.position === 'Vice President')));
          const isHeadOC = userRole === 'oc' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Tournament Organizing Committee' && (r.position === 'Head' || r.position === 'President' || r.position === 'Vice President')));
          const isHeadPR = userRole === 'pr' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Public Relations' && (r.position === 'Head' || r.position === 'President' || r.position === 'Vice President')));
          const isHeadMedia = userRole === 'media' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Multimedia & Design' && (r.position === 'Head' || r.position === 'President' || r.position === 'Vice President')));
          const isHeadTrainer = userRole === 'trainer' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Training & Masterclasses' && (r.position === 'Head' || r.position === 'President' || r.position === 'Vice President')));

          const isOCMember = userRole === 'member_oc' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Tournament Organizing Committee'));
          const isPRMember = userRole === 'member_pr' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Public Relations'));

          const accessibleNavItems = adminNavItems.filter(item => {
            if (isExec) return true;
            if (item.id === "manage-users" && isHeadHR) return true;
            if (item.id === "applications" && isHeadHR) return true;
            if (item.id === "broadcast" && (isHeadHR || isHeadPR || isPRMember || isHeadMedia)) return true;
            if (item.id === "inquiries" && (isHeadHR || isHeadOC || isOCMember || isHeadPR || isPRMember || isHeadMedia)) return true;
            if (item.id === "add-tournament" && (isHeadOC || isOCMember)) return true;
            if (item.id === "tournaments-list" && (isHeadOC || isOCMember)) return true;
            if (item.id === "manage-puzzles" && (isHeadOC || isOCMember || isHeadTrainer)) return true;
            return false;
          });
          const currentNavItem = accessibleNavItems.find(item => item.id === activeTab) || accessibleNavItems[0] || { id: activeTab, icon: "⚙️", label: "Admin Section" };

          return (
            <>
              {/* Level 1: Compact Current-Section Header Trigger */}
              <div className="admin-mobile-nav-wrapper">
                <button
                  type="button"
                  className="admin-mobile-nav-trigger"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open Admin Sections Menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <div className="admin-mobile-nav-left">
                    <span className="admin-mobile-nav-menu-icon">☰</span>
                    <span className="admin-mobile-nav-active-icon">{currentNavItem.icon}</span>
                    <div className="admin-mobile-nav-text">
                      <span className="admin-mobile-nav-section-label">Active Section</span>
                      <span className="admin-mobile-nav-active-title">
                        {currentNavItem.label}
                        {currentNavItem.badge !== null && currentNavItem.badge !== undefined && (
                          <span className="admin-mobile-nav-badge">{currentNavItem.badge}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="admin-mobile-nav-right">
                    <span className="admin-mobile-nav-switch-hint">Switch</span>
                    <span className="admin-mobile-nav-arrow">›</span>
                  </div>
                </button>
              </div>

              {/* Level 2: Full-Screen / Bottom-Sheet Expandable Admin Menu Drawer */}
              {mobileMenuOpen && (
                <div className="admin-mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
                  <div 
                    className="admin-mobile-menu-drawer" 
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="admin-mobile-menu-header">
                      <div className="admin-mobile-menu-title-row">
                        <span className="admin-menu-icon">⚙️</span>
                        <h3>Admin Menu</h3>
                      </div>
                      <button
                        type="button"
                        className="admin-mobile-menu-close"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Close menu"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <p className="admin-mobile-menu-subtitle">
                      Tap a section to navigate instantly:
                    </p>

                    <div className="admin-mobile-menu-list">
                      {accessibleNavItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`admin-mobile-menu-item ${isActive ? "active-item" : ""}`}
                            onClick={() => {
                              setActiveTab(item.id);
                              setMobileMenuOpen(false);
                            }}
                          >
                            <div className="admin-item-status-icon">
                              {isActive ? "✓" : ""}
                            </div>
                            <span className="admin-item-icon">{item.icon}</span>
                            <div className="admin-item-content">
                              <div className="admin-item-title-row">
                                <span className="admin-item-title">{item.label}</span>
                                {item.badge !== null && item.badge !== undefined && (
                                  <span className={`admin-item-badge ${isActive ? "active-badge" : ""}`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <span className="admin-item-desc">{item.desc}</span>
                            </div>
                            <span className="admin-item-arrow">›</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop Tab Controls (Visible on >= 768px) */}
              <div className="admin-tabs admin-desktop-tabs">
                {accessibleNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`tab-btn ${activeTab === item.id ? "active" : ""}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    {item.icon} {item.label} {item.badge !== null && item.badge !== undefined ? `(${item.badge})` : ""}
                  </button>
                ))}
              </div>
            </>
          );
        })()}

        {/* Alert Messages */}
        {successMessage && <div className="alert-message success">{successMessage}</div>}
        {errorMessage && <div className="alert-message error">{errorMessage}</div>}

        {/* Tab Contents */}
        <div className="tab-content" key={activeTab}>
          
          {/* Tab 1: Add Tournament */}
          {activeTab === "add-tournament" && (
            <div className="form-card">
              <h2>Add New Tournament</h2>
              <form onSubmit={handleCreateTournament} className="admin-form">
                <div className="form-group">
                  <label htmlFor="title">Tournament Name *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={form.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Rapid Fall Tournament"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="type">Tournament Type</label>
                    <select
                      id="type"
                      name="type"
                      value={form.type}
                      onChange={handleInputChange}
                    >
                      <option value="Swiss">Swiss</option>
                      <option value="Single Elimination">Single Elimination (Knockout)</option>
                      <option value="Double Elimination">Double Elimination (Knockout)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={form.status}
                      onChange={handleInputChange}
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Swiss-only: Number of Rounds */}
                {form.type === "Swiss" && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="rounds">
                        Number of Rounds *
                        <span style={{ fontWeight: "400", color: "#f3c144", marginLeft: "8px", fontSize: "0.82rem" }}>
                          (Swiss only)
                        </span>
                      </label>
                      <input
                        type="number"
                        id="rounds"
                        name="rounds"
                        value={form.rounds}
                        onChange={handleInputChange}
                        min="1"
                        max="13"
                        required
                      />
                      <small style={{ color: "#888", fontSize: "0.78rem", marginTop: "5px", display: "block" }}>
                        📋 FIDE min. players needed:{" "}
                        <strong style={{ color: "#f3c144" }}>{Number(form.rounds) + 1}</strong>
                        {" "}· Ideal (no rematches):{" "}
                        <strong style={{ color: "#f3c144" }}>{Math.pow(2, Number(form.rounds))}</strong>
                      </small>
                    </div>
                    <div className="form-group" /> {/* spacer */}
                  </div>
                )}


                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="startDate">Start Date *</label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={form.startDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="endDate">End Date</label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={form.endDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="time">⏱️ Clock &amp; Time Control *</label>
                    {/* Quick Time Preset Buttons */}
                    <div style={{ display: "flex", gap: "6px", margin: "4px 0 8px", flexWrap: "wrap" }}>
                      {["3 min Blitz", "3+2 Blitz", "5 min Blitz", "5+3 Blitz", "10 min Rapid", "10+2 Rapid", "15+10 Classical"].map((tPreset) => (
                        <button
                          key={tPreset}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, time: tPreset }))}
                          style={{
                            background: form.time === tPreset ? "#f3c144" : "rgba(243, 193, 68, 0.12)",
                            color: form.time === tPreset ? "#15120c" : "#f3c144",
                            border: "1px solid rgba(243, 193, 68, 0.3)",
                            borderRadius: "10px",
                            padding: "2px 8px",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            cursor: "pointer"
                          }}
                        >
                          {tPreset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      id="time"
                      name="time"
                      value={form.time}
                      onChange={handleInputChange}
                      placeholder="e.g. 10 min Rapid, 5+3 Blitz, 3+2 Blitz"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="location">Location</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={form.location}
                      onChange={handleInputChange}
                      placeholder="e.g. Zewail Chess Club Room"
                    />
                  </div>
                </div>


                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    placeholder="Provide details about the tournament rounds, rules, or prizes."
                    rows="4"
                  />
                </div>

                <div className="form-group">
                  <label>Tournament Poster / Cover Photo (Optional)</label>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1.5px dashed rgba(243, 193, 68, 0.35)", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                    {form.image ? (
                      <div>
                        <img 
                          src={form.image} 
                          alt="Tournament Preview" 
                          style={{ maxWidth: "100%", maxHeight: "160px", borderRadius: "8px", objectFit: "cover", marginBottom: "10px", border: "1px solid #f3c144" }} 
                        />
                        <br />
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, image: "" }))}
                          style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700" }}
                        >
                          ✕ Remove Image
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: "0 0 10px", color: "#bab19c", fontSize: "0.85rem" }}>
                          Upload event poster, banner, or hall photo (auto-compressed for fast loading)
                        </p>
                        <label style={{ display: "inline-block", background: "rgba(243, 193, 68, 0.15)", color: "#f3c144", border: "1px solid rgba(243, 193, 68, 0.4)", borderRadius: "8px", padding: "6px 16px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "700" }}>
                          📷 Select Image File
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 900, 600, 0.8);
                                  setForm(prev => ({ ...prev, image: compressed }));
                                } catch (err) {
                                  alert("Failed to process image: " + err.message);
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Create Tournament"}
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Manage Tournaments */}
          {activeTab === "tournaments-list" && (
            <div className="table-card">
              <h2>All Tournaments</h2>
              {tournaments.length === 0 ? (
                <p className="empty-message">No tournaments found. Go ahead and add one!</p>
              ) : (
                <>
                  <div className="admin-table-container tournaments-desktop-table">
                    <table className="admin-table tournaments-table">
                      <thead>
                        <tr>
                          <th>Tournament</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Location</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournaments.map((t) => (
                          <tr key={t._id}>
                            <td className="strong">{t.title}</td>
                            <td>{t.type}</td>
                            <td>
                              <span className={`status-badge ${t.status.toLowerCase()}`}>
                                {t.status}
                              </span>
                            </td>
                            <td>{t.startDate}</td>
                            <td>{t.time}</td>
                            <td>{t.location}</td>
                            <td>
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <a
                                  href={`/tournamentdetails?id=${t._id}`}
                                  className="action-btn"
                                  style={{
                                    background: "rgba(243, 193, 68, 0.15)",
                                    color: "#f3c144",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    textDecoration: "none",
                                    fontSize: "0.8rem",
                                    fontWeight: "700",
                                    border: "1px solid rgba(243, 193, 68, 0.3)"
                                  }}
                                >
                                  View & Edit Matches ➔
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setPhotoModal({
                                    isOpen: true,
                                    tournamentId: t._id,
                                    tournamentTitle: t.title,
                                    previewUrl: t.image || "",
                                    isSaving: false
                                  })}
                                  style={{
                                    background: t.image ? "rgba(46, 204, 113, 0.15)" : "rgba(255, 255, 255, 0.08)",
                                    color: t.image ? "#2ecc71" : "#e5e5e5",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    border: t.image ? "1px solid rgba(46, 204, 113, 0.35)" : "1px solid rgba(255, 255, 255, 0.15)",
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: "700"
                                  }}
                                >
                                  📷 {t.image ? "Photo ✓" : "+ Photo"}
                                </button>
                                <button
                                  className="delete-btn"
                                  onClick={() => handleDeleteTournament(t._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Tournaments Cards View */}
                  <div className="tournaments-mobile-cards">
                    {tournaments.map((t) => (
                      <div key={t._id} className="mobile-tournament-card" style={{ padding: "16px" }}>
                        <div className="mobile-card-header">
                          <h3 className="mobile-card-title">{t.title}</h3>
                          <span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#bab19c", margin: "8px 0" }}>
                          <div>Format: <strong style={{ color: "#f3c144" }}>{t.type}</strong></div>
                          <div>Date: {t.startDate} ({t.time})</div>
                          <div>Location: {t.location}</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                          <a
                            href={`/tournamentdetails?id=${t._id}`}
                            className="mobile-full-btn"
                            style={{
                              background: "rgba(243, 193, 68, 0.15)",
                              color: "#f3c144",
                              textDecoration: "none",
                              textAlign: "center",
                              border: "1px solid rgba(243, 193, 68, 0.3)",
                              fontWeight: "bold",
                              padding: "8px",
                              flex: 1
                            }}
                          >
                            View Matches ➔
                          </a>
                          <button
                            type="button"
                            onClick={() => setPhotoModal({
                              isOpen: true,
                              tournamentId: t._id,
                              tournamentTitle: t.title,
                              previewUrl: t.image || "",
                              isSaving: false
                            })}
                            style={{
                              background: t.image ? "rgba(46, 204, 113, 0.15)" : "rgba(255, 255, 255, 0.08)",
                              color: t.image ? "#2ecc71" : "#e5e5e5",
                              border: t.image ? "1px solid rgba(46, 204, 113, 0.35)" : "1px solid rgba(255, 255, 255, 0.15)",
                              borderRadius: "6px",
                              padding: "8px 12px",
                              fontWeight: "700",
                              fontSize: "0.82rem",
                              cursor: "pointer"
                            }}
                          >
                            📷 {t.image ? "Photo ✓" : "+ Photo"}
                          </button>
                          <button
                            className="delete-btn"
                            style={{ flexShrink: 0, padding: "8px 14px" }}
                            onClick={() => handleDeleteTournament(t._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tournament Photo Management Modal */}
                  {photoModal.isOpen && (
                    <div className="modal-overlay" onClick={() => setPhotoModal(prev => ({ ...prev, isOpen: false }))}>
                      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: "460px" }}>
                        <button className="modal-close-btn" onClick={() => setPhotoModal(prev => ({ ...prev, isOpen: false }))} aria-label="Close photo modal">
                          <X size={18} />
                        </button>
                        <h3 style={{ color: "#fff", margin: "0 0 6px", fontSize: "1.2rem" }}>📷 Tournament Photo</h3>
                        <p style={{ color: "#bab19c", fontSize: "0.85rem", margin: "0 0 16px" }}>
                          Upload or update photo for <strong style={{ color: "#f3c144" }}>{photoModal.tournamentTitle}</strong>. This photo will be highlighted in Tournaments and the permanent History & Archives.
                        </p>

                        {photoModal.previewUrl ? (
                          <div style={{ textAlign: "center", marginBottom: "16px" }}>
                            <img
                              src={photoModal.previewUrl}
                              alt="Tournament Preview"
                              style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "10px", border: "1.5px solid #f3c144", marginBottom: "10px" }}
                            />
                            <div>
                              <button
                                type="button"
                                onClick={() => setPhotoModal(prev => ({ ...prev, previewUrl: "" }))}
                                style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700" }}
                              >
                                ✕ Remove Photo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ border: "2px dashed rgba(243, 193, 68, 0.35)", borderRadius: "10px", padding: "24px", textAlign: "center", background: "rgba(243, 193, 68, 0.04)", marginBottom: "16px" }}>
                            <p style={{ color: "#bab19c", margin: "0 0 10px", fontSize: "0.88rem" }}>
                              Select tournament banner, podium celebration, or champion photo
                            </p>
                            <label style={{ display: "inline-block", background: "linear-gradient(135deg, #f3c144, #d4a32a)", color: "#15120c", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontSize: "0.88rem", fontWeight: "800" }}>
                              Select Image File
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const compressed = await compressImage(file, 900, 600, 0.8);
                                      setPhotoModal(prev => ({ ...prev, previewUrl: compressed }));
                                    } catch (err) {
                                      alert("Failed to process image: " + err.message);
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setPhotoModal(prev => ({ ...prev, isOpen: false }))}
                            style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", color: "#ddd", border: "1px solid #444", cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveTournamentPhoto}
                            disabled={photoModal.isSaving}
                            style={{ padding: "8px 20px", borderRadius: "8px", background: "linear-gradient(135deg, #f3c144, #d4a32a)", color: "#15120c", fontWeight: "800", border: "none", cursor: "pointer" }}
                          >
                            {photoModal.isSaving ? "Saving..." : "💾 Save Photo"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab 3: Applications */}
          {activeTab === "applications" && (
            <div className="table-card">
              <h2>Received Member Applications</h2>
              {applications.length === 0 ? (
                <p className="empty-message">No applications submitted yet.</p>
              ) : (
                <>
                  <div className="admin-table-container tournaments-desktop-table">
                    <table className="admin-table applications-table">
                      <thead>
                        <tr>
                          <th>Applicant</th>
                          <th>Email</th>
                          <th>ID</th>
                          <th>Major & Batch</th>
                          <th>Department</th>
                          <th>Applied Role</th>
                          <th>Status</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => (
                          <tr key={app._id}>
                            <td className="strong">{app.name}</td>
                            <td>{app.email}</td>
                            <td>{app.idNumber}</td>
                            <td>{app.major} (Batch {app.batch})</td>
                            <td>{app.department}</td>
                            <td className="strong">{app.roleTitle}</td>
                            <td>
                              <span className={`status-badge ${(app.status || 'Pending').toLowerCase()}`}>
                                {app.status || 'Pending'}
                              </span>
                            </td>
                            <td>
                              <button className="view-btn" onClick={() => {
                                setSelectedApp(app);
                                setModalOpen(true);
                              }}>
                                View Answers
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Applications Cards View */}
                  <div className="tournaments-mobile-cards">
                    {applications.map((app) => (
                      <div key={app._id} className="mobile-tournament-card" style={{ padding: "16px" }}>
                        <div className="mobile-card-header">
                          <h3 className="mobile-card-title">{app.name}</h3>
                          <span className={`status-badge ${(app.status || 'Pending').toLowerCase()}`}>{app.status || 'Pending'}</span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#bab19c", margin: "8px 0", lineHeight: "1.5" }}>
                          <div>Role: <strong style={{ color: "#f3c144" }}>{app.roleTitle}</strong> ({app.department})</div>
                          <div>Email: {app.email}</div>
                          <div>Major: {app.major} (Batch {app.batch})</div>
                        </div>
                        <button 
                          className="view-btn mobile-full-btn" 
                          style={{ marginTop: "8px" }}
                          onClick={() => {
                            setSelectedApp(app);
                            setModalOpen(true);
                          }}
                        >
                          View Full Application ➔
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 4: Manage Users */}
          {activeTab === "manage-users" && (() => {
            const filteredUsers = users.filter((u) => {
              const query = (userSearch || "").trim().toLowerCase();
              const matchesQuery = !query ||
                (u.name && u.name.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query)) ||
                (u.major && u.major.toLowerCase().includes(query)) ||
                (u.idNumber && u.idNumber.toLowerCase().includes(query));
              
              let matchesRole = true;
              if (userRoleFilter === "all") matchesRole = true;
              else matchesRole = getEffectiveUserRole(u) === userRoleFilter;

              return matchesQuery && matchesRole;
            });

            return (
              <div className="table-card">
                <div className="admin-user-tab-header">
                  <div>
                    <h2>All Registered Users ({users.length})</h2>
                    <p className="admin-user-tab-desc">Search, filter, inspect player dossiers, and manage membership accounts.</p>
                  </div>
                  
                  {/* Search and Filters Bar */}
                  <div className="admin-user-filters-bar">
                    <div className="admin-user-search-wrap">
                      <Search size={16} className="admin-search-icon" />
                      <input
                        type="text"
                        placeholder="Search name, email, major, ID..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="admin-user-search-input"
                      />
                      {userSearch && (
                        <button 
                          type="button" 
                          className="admin-search-clear-btn"
                          onClick={() => setUserSearch("")}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="admin-role-filter-wrap">
                      <Filter size={15} className="admin-filter-icon" />
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="admin-role-filter-select"
                      >
                        <option value="all">All Roles ({users.length})</option>
                        <option value="president">👑 Presidents ({users.filter(u => getEffectiveUserRole(u) === 'president').length})</option>
                        <option value="vice_president">⭐ Vice Presidents ({users.filter(u => getEffectiveUserRole(u) === 'vice_president').length})</option>
                        <option value="oc">⚡ Head of OC ({users.filter(u => getEffectiveUserRole(u) === 'oc').length})</option>
                        <option value="member_oc">✨ Member of OC ({users.filter(u => getEffectiveUserRole(u) === 'member_oc').length})</option>
                        <option value="hr">👥 Head of HR ({users.filter(u => getEffectiveUserRole(u) === 'hr').length})</option>
                        <option value="member_hr">👥 Member of HR ({users.filter(u => getEffectiveUserRole(u) === 'member_hr').length})</option>
                        <option value="pr">📢 Head of PR ({users.filter(u => getEffectiveUserRole(u) === 'pr').length})</option>
                        <option value="member_pr">📢 Member of PR ({users.filter(u => getEffectiveUserRole(u) === 'member_pr').length})</option>
                        <option value="media">🎨 Head of Multimedia ({users.filter(u => getEffectiveUserRole(u) === 'media').length})</option>
                        <option value="member_media">🎨 Member of Multimedia ({users.filter(u => getEffectiveUserRole(u) === 'member_media').length})</option>
                        <option value="trainer">🎓 Head of Training ({users.filter(u => getEffectiveUserRole(u) === 'trainer').length})</option>
                        <option value="trainee">♟️ Trainees ({users.filter(u => getEffectiveUserRole(u) === 'trainee').length})</option>
                        <option value="member">♟️ General Members ({users.filter(u => getEffectiveUserRole(u) === 'member').length})</option>
                      </select>
                    </div>
                  </div>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="admin-empty-users-state">
                    <Users size={36} className="admin-empty-icon" />
                    <p>{users.length === 0 ? "No users registered yet." : "No users match your search criteria."}</p>
                    {userSearch && (
                      <button 
                        type="button" 
                        className="admin-filter-reset-btn"
                        onClick={() => { setUserSearch(""); setUserRoleFilter("all"); }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="admin-table-container tournaments-desktop-table">
                      <table className="admin-table users-table">
                        <thead>
                          <tr>
                            <th>Player / Member</th>
                            <th>Student ID</th>
                            <th>Major & Batch</th>
                            <th>Ratings</th>
                            <th>Role</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => {
                            const initials = (u.name || "?")
                              .split(" ")
                              .map(w => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();

                            return (
                              <tr key={u._id}>
                                <td className="admin-user-cell">
                                  <div 
                                    className="admin-user-avatar-wrap"
                                    onClick={() => navigate(`/profile?email=${encodeURIComponent(u.email)}`)}
                                    title={`View ${u.name}'s Profile`}
                                  >
                                    {u.profileImage ? (
                                      <img src={u.profileImage} alt={u.name} className="admin-user-avatar-img" />
                                    ) : (
                                      <span className="admin-user-avatar-initials">{initials}</span>
                                    )}
                                  </div>
                                  <div className="admin-user-info-col">
                                    <button 
                                      type="button" 
                                      className="admin-user-name-link"
                                      onClick={() => navigate(`/profile?email=${encodeURIComponent(u.email)}`)}
                                      title="Open Player Dossier"
                                    >
                                      {u.name}
                                    </button>
                                    <span className="admin-user-email-sub">{u.email}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="admin-id-badge">{u.idNumber || "N/A"}</span>
                                </td>
                                <td>
                                  <div className="admin-major-line">
                                    <strong>{u.major || "General"}</strong>
                                    {u.batch && <span className="admin-batch-pill">B{u.batch}</span>}
                                  </div>
                                </td>
                                <td>
                                  <div className="admin-ratings-cell">
                                    {u.fideRating > 0 && <span className="admin-rating-chip fide">FIDE {u.fideRating}</span>}
                                    {u.chessComRating > 0 && <span className="admin-rating-chip chesscom">C.com {u.chessComRating}</span>}
                                    {u.lichessRating > 0 && <span className="admin-rating-chip lichess">Lichess {u.lichessRating}</span>}
                                    {(!u.fideRating && !u.chessComRating && !u.lichessRating) && <span className="admin-rating-none">Unrated</span>}
                                  </div>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => openRoleModal(u)}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "6px",
                                      width: "100%",
                                      background: "rgba(243, 193, 68, 0.12)",
                                      color: "#f3c144",
                                      border: "1px solid rgba(243, 193, 68, 0.35)",
                                      borderRadius: "6px",
                                      padding: "6px 10px",
                                      fontSize: "0.8rem",
                                      fontWeight: "700",
                                      cursor: "pointer"
                                    }}
                                    title="Manage this member's roles"
                                  >
                                    🛠️ {Array.isArray(u.clubRoles) && u.clubRoles.length > 0 ? "Manage Roles" : "Assign Roles"}
                                  </button>
                                  {Array.isArray(u.clubRoles) && u.clubRoles.length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                                      {u.clubRoles.map((cr, cIdx) => (
                                        <span
                                          key={cIdx}
                                          style={{
                                            fontSize: "0.7rem",
                                            background: "rgba(243, 193, 68, 0.1)",
                                            color: "#f3c144",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            border: "1px solid rgba(243, 193, 68, 0.25)"
                                          }}
                                          title={`${cr.position} of ${cr.department}`}
                                        >
                                          {cr.position === "Head" ? "👑" : "✨"} {cr.position} ({cr.department.replace("Tournament Organizing Committee", "OC").replace("Human Resources", "HR").replace("Public Relations", "PR").replace("Multimedia & Design", "Media").replace("Training & Masterclasses", "Trainer").replace("Trainee Development Pathway", "Trainee")})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div className="admin-user-actions-group">
                                    <button
                                      type="button" 
                                      className="admin-view-profile-btn"
                                      onClick={() => navigate(`/profile?email=${encodeURIComponent(u.email)}`)}
                                      title={`View ${u.name}'s Profile`}
                                    >
                                      <Eye size={14} />
                                      <span>Profile</span>
                                    </button>
                                    <label
                                      className="admin-view-profile-btn"
                                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                      title={`Change ${u.name}'s Profile Photo`}
                                    >
                                      <Camera size={14} />
                                      <span>Photo</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            handleUserPhotoUpload(u, e.target.files[0]);
                                          }
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      className="admin-message-user-btn"
                                      onClick={() => {
                                        setBroadcastRecipientType("specific");
                                        setBroadcastTargetEmail(u.email);
                                        setActiveTab("broadcast");
                                      }}
                                      title={`Direct Message ${u.name}`}
                                    >
                                      <Mail size={14} />
                                      <span>Direct Message</span>
                                    </button>
                                    {!['admin', 'president', 'vice_president'].includes(u.role) && (
                                      <button
                                        className="delete-btn"
                                        onClick={() => handleDeleteUser(u._id)}
                                        title="Delete user account"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Users Cards View */}
                    <div className="tournaments-mobile-cards">
                      {filteredUsers.map((u) => {
                        const initials = (u.name || "?")
                          .split(" ")
                          .map(w => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <div key={u._id} className="mobile-tournament-card" style={{ padding: "18px" }}>
                            <div className="mobile-card-header" style={{ alignItems: "center" }}>
                              <div 
                                className="admin-mobile-user-head"
                                onClick={() => navigate(`/profile?email=${encodeURIComponent(u.email)}`)}
                              >
                                <div className="admin-user-avatar-wrap mobile">
                                  {u.profileImage ? (
                                    <img src={u.profileImage} alt={u.name} className="admin-user-avatar-img" />
                                  ) : (
                                    <span className="admin-user-avatar-initials">{initials}</span>
                                  )}
                                </div>
                                <div>
                                  <h3 className="mobile-card-title link">{u.name}</h3>
                                  <div style={{ fontSize: "0.8rem", color: "#bab19c" }}>{u.email}</div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => openRoleModal(u)}
                                style={{
                                  background: "rgba(243, 193, 68, 0.12)",
                                  color: "#f3c144",
                                  border: "1px solid rgba(243, 193, 68, 0.35)",
                                  borderRadius: "6px",
                                  padding: "4px 10px",
                                  fontSize: "0.8rem",
                                  fontWeight: "700",
                                  cursor: "pointer"
                                }}
                              >
                                🛠️ Manage Roles
                              </button>
                            </div>
                            {Array.isArray(u.clubRoles) && u.clubRoles.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", margin: "6px 0 10px" }}>
                                {u.clubRoles.map((cr, cIdx) => (
                                  <span
                                    key={cIdx}
                                    style={{
                                      fontSize: "0.7rem",
                                      background: "rgba(243, 193, 68, 0.1)",
                                      color: "#f3c144",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      border: "1px solid rgba(243, 193, 68, 0.25)"
                                    }}
                                  >
                                    {cr.position === "Head" ? "👑" : "✨"} {cr.position} of {cr.department}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="admin-mobile-user-meta">
                              <div><strong>ID:</strong> {u.idNumber || "N/A"}</div>
                              <div><strong>Major:</strong> {u.major || "General"} {u.batch ? `(Batch ${u.batch})` : ""}</div>
                              {(u.fideRating > 0 || u.chessComRating > 0 || u.lichessRating > 0) && (
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                                  {u.fideRating > 0 && <span className="admin-rating-chip fide">FIDE {u.fideRating}</span>}
                                  {u.chessComRating > 0 && <span className="admin-rating-chip chesscom">C.com {u.chessComRating}</span>}
                                  {u.lichessRating > 0 && <span className="admin-rating-chip lichess">Lichess {u.lichessRating}</span>}
                                </div>
                              )}
                            </div>

                            <div className="admin-mobile-user-actions" style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="admin-view-profile-btn mobile-full-btn"
                                onClick={() => navigate(`/profile?email=${encodeURIComponent(u.email)}`)}
                              >
                                <Eye size={14} />
                                <span>Profile</span>
                              </button>
                              <label
                                className="admin-view-profile-btn mobile-full-btn"
                                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                              >
                                <Camera size={14} />
                                <span>Photo</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleUserPhotoUpload(u, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                className="admin-message-user-btn mobile-full-btn"
                                onClick={() => {
                                  setBroadcastRecipientType("specific");
                                  setBroadcastTargetEmail(u.email);
                                  setActiveTab("broadcast");
                                }}
                              >
                                <Send size={13} />
                                <span>Message</span>
                              </button>
                              {u.role !== 'admin' && (
                                <button
                                  className="delete-btn mobile-full-btn"
                                  onClick={() => handleDeleteUser(u._id)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Tab 5: Manage Puzzles */}
          {activeTab === "manage-puzzles" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* Card 1: Existing Puzzle Challenges List */}
              <div className="table-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <h2>Active & Upcoming Puzzle Challenges ({puzzleTournaments.length})</h2>
                    <p style={{ color: "#caba91", margin: "4px 0 0" }}>
                      View, edit dates/times, add or delete puzzles, or remove entire puzzle arenas.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="view-btn"
                    style={{ background: "#f3c144", color: "#181611", fontWeight: "bold" }}
                    onClick={handleResetPuzzleForm}
                  >
                    ➕ Create New Challenge
                  </button>
                </div>

                {puzzleTournaments.length === 0 ? (
                  <p style={{ color: "#888", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                    No puzzle challenge tournaments found. Use the form below to create one!
                  </p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="admin-table-container tournaments-desktop-table">
                      <table className="admin-table puzzle-tournaments-table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Beginning</th>
                            <th>Ending</th>
                            <th>Time Limit</th>
                            <th>Puzzles</th>
                            <th>Players</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {puzzleTournaments.map((t) => (
                            <tr key={t._id} style={editingPuzzleTournamentId === t._id ? { background: "rgba(243, 193, 68, 0.12)" } : {}}>
                              <td>
                                <strong>{t.title}</strong>
                                {editingPuzzleTournamentId === t._id && (
                                  <span style={{ marginLeft: "8px", fontSize: "0.75rem", background: "#f3c144", color: "#111", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                    EDITING
                                  </span>
                                )}
                              </td>
                              <td>{t.startDate} {t.startTime ? `at ${t.startTime}` : ""}</td>
                              <td>{t.endDate ? `${t.endDate} ${t.endTime ? `at ${t.endTime}` : ""}` : "Ongoing"}</td>
                              <td>{t.timeLimit || 60}s / puzzle</td>
                              <td><span className="player-count-badge">{t.puzzles ? t.puzzles.length : 0} 🧩</span></td>
                              <td>
                                <strong>{t.participants ? t.participants.length : 0} registered</strong>
                                {t.participants && t.participants.length > 0 && (
                                  <div className="admin-puzzle-participants">
                                    {t.participants.map((participant) => (
                                      <div className="admin-puzzle-participant" key={participant.email}>
                                        <span title={participant.email}>{participant.name}</span>
                                        <button
                                          type="button"
                                          className="admin-remove-participant-btn"
                                          onClick={() => handleRemovePuzzleParticipant(t, participant)}
                                          title={`Remove ${participant.name}`}
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {t.leaderboard && t.leaderboard.length > 0 && (
                                  <div className="admin-puzzle-participants admin-puzzle-results">
                                    <span className="admin-puzzle-list-label">{t.leaderboard.length} completed</span>
                                    {t.leaderboard.map((entry) => (
                                      <div className="admin-puzzle-participant" key={`score-${entry.email}`}>
                                        <span title={entry.email}>{entry.name} · {entry.score} pts</span>
                                        <button
                                          type="button"
                                          className="admin-remove-participant-btn"
                                          onClick={() => handleRemovePuzzleParticipant(t, entry)}
                                          title={`Remove ${entry.name}`}
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                                <td>
                                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    {t.leaderboard && t.leaderboard.length > 0 && (
                                      isPuzzleChallengeFinished(t) ? (
                                        <button
                                          type="button"
                                          className="btn-status"
                                          style={{
                                            padding: "6px 12px",
                                            background: "linear-gradient(135deg, #f7ce68 0%, #f3c144 60%, #c99522 100%)",
                                            color: "#12100d",
                                            border: "none",
                                            fontWeight: "800",
                                            borderRadius: "6px",
                                            cursor: "pointer"
                                          }}
                                          onClick={() => handleBroadcastPuzzleWinners(t)}
                                          title="Broadcast Champions Podium & In-App / Email Announcement to all members"
                                        >
                                          🏆 Announce
                                        </button>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: "0.75rem",
                                            color: "#f3c144",
                                            background: "rgba(243, 193, 68, 0.1)",
                                            padding: "5px 9px",
                                            borderRadius: "6px",
                                            border: "1px dashed rgba(243, 193, 68, 0.35)",
                                            fontWeight: "600",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px"
                                          }}
                                          title="Competition is active. Official winner broadcast unlocks once deadline passes."
                                        >
                                          ⏳ In Progress
                                        </span>
                                      )
                                    )}
                                    <button
                                      type="button"
                                      className="view-btn"
                                      style={{ padding: "6px 12px", background: "#f3c144", color: "#111", fontWeight: "700" }}
                                      onClick={() => handleQuickAddPuzzle(t)}
                                      title={`Add a new puzzle directly to "${t.title}"`}
                                    >
                                      ➕ Add Puzzle
                                    </button>
                                    <button
                                      className="edit-btn"
                                      style={{ padding: "6px 12px" }}
                                      onClick={() => handleEditPuzzleTournament(t)}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      className="delete-btn"
                                      style={{ padding: "6px 12px" }}
                                      onClick={() => handleDeletePuzzleTournament(t._id, t.title)}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="tournaments-mobile-cards">
                      {puzzleTournaments.map((t) => (
                        <div 
                          key={t._id} 
                          className="mobile-tournament-card"
                          style={editingPuzzleTournamentId === t._id ? { borderColor: "#f3c144", background: "rgba(243, 193, 68, 0.08)" } : {}}
                        >
                          <div className="mobile-card-header">
                            <h3 className="mobile-card-title">{t.title}</h3>
                            <span className="player-count-badge">{t.puzzles ? t.puzzles.length : 0} Puzzles</span>
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#caba91", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div>📅 <strong>Beginning:</strong> {t.startDate} {t.startTime && `(${t.startTime})`}</div>
                            <div>🏁 <strong>Ending:</strong> {t.endDate ? `${t.endDate} ${t.endTime ? `(${t.endTime})` : ''}` : "Ongoing"}</div>
                            <div>⏱️ <strong>Time Limit:</strong> {t.timeLimit || 60}s per puzzle</div>
                            <div>👥 <strong>Participants:</strong> {t.participants ? t.participants.length : 0} registered</div>
                            {t.participants && t.participants.length > 0 && (
                              <div className="admin-puzzle-participants mobile-participant-list">
                                {t.participants.map((participant) => (
                                  <div className="admin-puzzle-participant" key={participant.email}>
                                    <span title={participant.email}>{participant.name}</span>
                                    <button
                                      type="button"
                                      className="admin-remove-participant-btn"
                                      onClick={() => handleRemovePuzzleParticipant(t, participant)}
                                      title={`Remove ${participant.name}`}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {t.leaderboard && t.leaderboard.length > 0 && (
                              <div className="admin-puzzle-participants mobile-participant-list admin-puzzle-results">
                                <span className="admin-puzzle-list-label">{t.leaderboard.length} completed</span>
                                {t.leaderboard.map((entry) => (
                                  <div className="admin-puzzle-participant" key={`score-${entry.email}`}>
                                    <span title={entry.email}>{entry.name} · {entry.score} pts</span>
                                    <button
                                      type="button"
                                      className="admin-remove-participant-btn"
                                      onClick={() => handleRemovePuzzleParticipant(t, entry)}
                                      title={`Remove ${entry.name} from this tournament`}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                            {t.leaderboard && t.leaderboard.length > 0 && (
                              isPuzzleChallengeFinished(t) ? (
                                <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%", flexWrap: "wrap" }}>
                                  {t.winnersBroadcasted ? (
                                    <span style={{ fontSize: "0.8rem", color: "#2ecc71", background: "rgba(46, 204, 113, 0.15)", border: "1px solid rgba(46, 204, 113, 0.3)", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold" }}>
                                      ✅ Podium Auto-Broadcasted
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="btn-status mobile-full-btn"
                                    style={{
                                      background: "linear-gradient(135deg, #f7ce68 0%, #f3c144 60%, #c99522 100%)",
                                      color: "#12100d",
                                      border: "none",
                                      fontWeight: "800"
                                    }}
                                    onClick={() => handleBroadcastPuzzleWinners(t)}
                                  >
                                    {t.winnersBroadcasted ? "📢 Re-Broadcast Announcement" : "🏆 Announce Podium & Email"}
                                  </button>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    width: "100%",
                                    textAlign: "center",
                                    fontSize: "0.8rem",
                                    color: "#f3c144",
                                    background: "rgba(243, 193, 68, 0.1)",
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px dashed rgba(243, 193, 68, 0.35)",
                                    fontWeight: "600"
                                  }}
                                >
                                  ⏳ In Progress (Results broadcast unlocks after deadline)
                                </div>
                              )
                            )}
                            <button
                              type="button"
                              className="view-btn mobile-full-btn"
                              style={{ background: "#f3c144", color: "#111", fontWeight: "700" }}
                              onClick={() => handleQuickAddPuzzle(t)}
                            >
                              ➕ Add Puzzle
                            </button>
                            <button
                              className="edit-btn mobile-full-btn"
                              onClick={() => handleEditPuzzleTournament(t)}
                            >
                              ✏️ Edit Tournament & Puzzles
                            </button>
                            <button
                              className="delete-btn mobile-full-btn"
                              onClick={() => handleDeletePuzzleTournament(t._id, t.title)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Card 2: Create / Edit Form */}
              <div className="table-card" id="puzzle-form-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h2>{editingPuzzleTournamentId ? "✏️ Edit Puzzle Challenge Arena" : "➕ Create Puzzle Challenge Tournament"}</h2>
                    <p style={{ color: "#caba91", margin: "4px 0 0" }}>
                      {editingPuzzleTournamentId 
                        ? "Modify tournament dates, beginning & ending times, time limits, or add/delete puzzles." 
                        : "Set up board positions visually, record the solution moves, and define tournament beginning & ending dates and times."}
                    </p>
                  </div>
                  {editingPuzzleTournamentId && (
                    <button
                      type="button"
                      className="tab-btn"
                      style={{ borderColor: "#e74c3c", color: "#e74c3c" }}
                      onClick={handleResetPuzzleForm}
                    >
                      ❌ Cancel Edit (Create New)
                    </button>
                  )}
                </div>

                <form onSubmit={handleSavePuzzleTournament} className="admin-form" style={{ marginTop: "24px" }}>
                  <div className="form-group">
                    <label>Tournament Title *</label>
                    <input
                      type="text"
                      value={puzzleTitle}
                      onChange={(e) => setPuzzleTitle(e.target.value)}
                      placeholder="e.g. Weekly Tactics Arena - Grandmaster Mate in 2"
                      required
                    />
                  </div>

                  {/* Beginning & Ending Date and Time Row */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Beginning Date (Start Date) *</label>
                      <input
                        type="date"
                        value={puzzleStartDate}
                        onChange={(e) => setPuzzleStartDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Beginning Time (Start Time)</label>
                      <input
                        type="time"
                        value={puzzleStartTime}
                        onChange={(e) => setPuzzleStartTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Ending Date (End Date)</label>
                      <input
                        type="date"
                        value={puzzleEndDate}
                        onChange={(e) => setPuzzleEndDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Ending Time (End Time)</label>
                      <input
                        type="time"
                        value={puzzleEndTime}
                        onChange={(e) => setPuzzleEndTime(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Timing Mode Selection */}
                  <div className="form-group" style={{ background: "rgba(255, 255, 255, 0.03)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(243, 193, 68, 0.2)", marginTop: "8px" }}>
                    <label style={{ fontWeight: 600, color: "#f3c144", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      ⏱️ Timing Strategy per Puzzle:
                    </label>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: puzzleTimingMode === "fixed" ? "14px" : "0" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          padding: "10px 16px",
                          borderRadius: "8px",
                          background: puzzleTimingMode === "fixed" ? "rgba(243, 193, 68, 0.15)" : "rgba(255, 255, 255, 0.05)",
                          border: `1px solid ${puzzleTimingMode === "fixed" ? "#f3c144" : "rgba(255, 255, 255, 0.15)"}`,
                          color: puzzleTimingMode === "fixed" ? "#f3c144" : "#caba91",
                          fontWeight: puzzleTimingMode === "fixed" ? 600 : 400,
                          transition: "all 0.2s ease",
                          flex: "1 1 220px"
                        }}
                      >
                        <input
                          type="radio"
                          name="puzzleTimingMode"
                          value="fixed"
                          checked={puzzleTimingMode === "fixed"}
                          onChange={() => setPuzzleTimingMode("fixed")}
                          style={{ accentColor: "#f3c144", cursor: "pointer" }}
                        />
                        <span>⏱️ Fixed Duration for All Puzzles</span>
                      </label>

                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          padding: "10px 16px",
                          borderRadius: "8px",
                          background: puzzleTimingMode === "custom" ? "rgba(243, 193, 68, 0.15)" : "rgba(255, 255, 255, 0.05)",
                          border: `1px solid ${puzzleTimingMode === "custom" ? "#f3c144" : "rgba(255, 255, 255, 0.15)"}`,
                          color: puzzleTimingMode === "custom" ? "#f3c144" : "#caba91",
                          fontWeight: puzzleTimingMode === "custom" ? 600 : 400,
                          transition: "all 0.2s ease",
                          flex: "1 1 220px"
                        }}
                      >
                        <input
                          type="radio"
                          name="puzzleTimingMode"
                          value="custom"
                          checked={puzzleTimingMode === "custom"}
                          onChange={() => setPuzzleTimingMode("custom")}
                          style={{ accentColor: "#f3c144", cursor: "pointer" }}
                        />
                        <span>🎛️ Custom Duration per Puzzle</span>
                      </label>
                    </div>

                    {puzzleTimingMode === "fixed" ? (
                      <div className="form-group" style={{ margin: "10px 0 0" }}>
                        <label style={{ fontSize: "0.9rem" }}>Fixed Time Limit per Puzzle (Seconds) *</label>
                        <input
                          type="number"
                          value={puzzleTimeLimit}
                          onChange={(e) => setPuzzleTimeLimit(parseInt(e.target.value, 10) || 60)}
                          min="5"
                          max="600"
                          required
                          style={{ maxWidth: "240px" }}
                        />
                        <small style={{ color: "#caba91", fontSize: "0.78rem", marginTop: "4px", display: "block" }}>
                          Every puzzle in this challenge will give tacticians exactly {puzzleTimeLimit || 60} seconds.
                        </small>
                      </div>
                    ) : (
                      <div style={{ background: "rgba(52, 152, 219, 0.1)", border: "1px solid rgba(52, 152, 219, 0.3)", borderRadius: "8px", padding: "10px 14px", color: "#6cb2eb", fontSize: "0.85rem", marginTop: "10px" }}>
                        ℹ️ <strong>Custom Mode Active:</strong> You will set the specific countdown seconds for each puzzle individually below in the Puzzle Editor.
                      </div>
                    )}
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid #393428", margin: "25px 0" }} />

                  {/* Puzzles in this Tournament */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3>Puzzles in this Challenge ({puzzlesList.length})</h3>
                    {puzzlesList.length > 0 && (
                      <span style={{ fontSize: "0.85rem", color: "#2ecc71" }}>
                        ✓ {puzzlesList.length} puzzle{puzzlesList.length > 1 ? "s" : ""} included
                      </span>
                    )}
                  </div>

                  {puzzlesList.length === 0 ? (
                    <p style={{ color: "#e74c3c", background: "rgba(231, 76, 60, 0.1)", padding: "12px 16px", borderRadius: "8px", fontStyle: "italic", margin: "0 0 20px 0" }}>
                      ⚠️ No puzzles added to this tournament yet! Use the interactive chessboard below to record and add at least one puzzle.
                    </p>
                  ) : (
                    <div className="puzzle-list-manager" style={{ marginBottom: "25px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {puzzlesList.map((p, index) => (
                        <div key={index} className="puzzle-item-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#17140f", border: "1px solid rgba(243, 193, 68, 0.2)", borderRadius: "10px", padding: "12px 16px" }}>
                          <div className="puzzle-item-info" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span className="puzzle-item-title" style={{ color: "#fff", fontWeight: "bold" }}>
                                Puzzle #{index + 1} - {p.mateIn === 0 ? "Find the Best Move" : `Mate in ${p.mateIn}`}
                              </span>
                              <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", background: p.timeLimit ? "rgba(243, 193, 68, 0.2)" : "rgba(255, 255, 255, 0.08)", color: p.timeLimit ? "#f3c144" : "#caba91", border: `1px solid ${p.timeLimit ? 'rgba(243, 193, 68, 0.4)' : 'rgba(255, 255, 255, 0.15)'}` }}>
                                ⏱️ {p.timeLimit ? `${p.timeLimit}s (custom)` : `${puzzleTimeLimit || 60}s (${puzzleTimingMode === "custom" ? "default" : "fixed"})`}
                              </span>
                            </div>
                            <span className="puzzle-item-desc" style={{ color: "#caba91", fontSize: "0.85rem" }}>
                              {p.description || "Solve the tactic"}
                            </span>
                            <span style={{ fontSize: "0.78rem", fontFamily: "monospace", color: "#f3c144" }}>
                              Moves: {Array.isArray(p.correctMoves) ? p.correctMoves.join(" ➔ ") : p.correctMoves}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              className="view-btn"
                              style={{ cursor: "pointer", padding: "8px 14px", minWidth: "auto", borderRadius: "8px" }}
                              onClick={() => handleEditPuzzleInList(index)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              style={{ cursor: "pointer", padding: "8px 14px", minWidth: "auto", borderRadius: "8px" }}
                              onClick={() => handleRemovePuzzleFromList(index)}
                            >
                              🗑️ Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interactive Position Setup & Move Recorder */}
                  <div className="puzzle-editor-card" id="puzzle-board-editor-anchor">
                    <h3 style={{ margin: "0 0 14px 0", color: "#f3c144" }}>
                      {editingPuzzleTournamentId ? `♟️ Add a New Puzzle to "${puzzleTitle || 'Challenge'}"` : "♟️ Add a New Puzzle to this Tournament"}
                    </h3>

                    <div className="puzzle-dashboard-grid">
                      {/* Left Column: Interactive Chess Board & Setup Bar */}
                      <div className="puzzle-board-container">
                        <h4>{setupMode ? "⚙️ Step 1: Set Board Position" : "🔴 Step 2: Record Solution Moves"}</h4>
                        <p style={{ fontSize: "0.82rem", color: "#caba91", margin: "0 0 12px 0", textAlign: "center" }}>
                          {setupMode 
                            ? "Drag pieces freely on the board, or select a piece/eraser from the palette below and click squares."
                            : "Drag and drop pieces to make legal moves. Moves are recorded as the solution sequence."}
                        </p>

                        {/* Quick Board Tools Bar */}
                        {setupMode && (
                          <div className="quick-board-tools">
                            <button
                              type="button"
                              className="tab-btn"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#211d17" }}
                              onClick={handleResetStartBoard}
                            >
                              🔄 Standard Start
                            </button>
                            <button
                              type="button"
                              className="tab-btn"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#211d17", borderColor: "#e74c3c", color: "#e74c3c" }}
                              onClick={handleClearBoard}
                            >
                              🧹 Clear Board
                            </button>
                            <button
                              type="button"
                              className="tab-btn"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#211d17" }}
                              onClick={() => setBoardOrientation(prev => prev === "white" ? "black" : "white")}
                            >
                              🔄 Flip ({boardOrientation === "white" ? "White" : "Black"})
                            </button>
                            <button
                              type="button"
                              className="tab-btn"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#211d17" }}
                              onClick={handleCopyFen}
                            >
                              📋 Copy FEN
                            </button>
                          </div>
                        )}
                        
                        <div className="puzzle-board-wrapper" ref={boardWrapperRef}>
                          <Chessboard
                            position={activePuzzleFen}
                            onSquareClick={handleSquareClick}
                            onPieceDrop={handlePieceDrop}
                            onPieceDragBegin={onPieceDragBegin}
                            onPieceDragEnd={onPieceDragEnd}
                            customSquareStyles={optionSquares}
                            boardWidth={boardWidth}
                            boardOrientation={boardOrientation}
                            arePiecesDraggable={true}
                            customDarkSquareStyle={{ backgroundColor: "#b58863" }}
                            customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
                            customBoardStyle={{
                              borderRadius: "10px",
                              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.65), 0 0 1px rgba(243, 193, 68, 0.25)",
                              width: "100%",
                              height: "100%"
                            }}
                          />
                        </div>

                        {setupMode && (
                          <>
                            {/* Palette selection indicator */}
                            <div style={{ textAlign: "center", margin: "10px 0 6px", fontSize: "0.82rem", color: "#f3c144", fontWeight: "bold" }}>
                              {selectedPiece === "clear"
                                ? "Selected Action: ❌ Eraser (Click squares/pieces to remove)"
                                : selectedPiece
                                ? `Selected Piece: ${selectedPiece.color === 'w' ? 'White' : 'Black'} ${selectedPiece.type.toUpperCase()} (Click square to place)`
                                : "💡 Active Mode: Click/Drag pieces directly or select from palette below"}
                            </div>

                            <div className="piece-palette">
                              {[
                                { symbol: "❌", label: "Eraser", name: "Eraser (Clear Square)", value: "clear" },
                                { symbol: "♙", label: "Pawn", name: "White Pawn", value: { type: "p", color: "w" } },
                                { symbol: "♘", label: "Knight", name: "White Knight", value: { type: "n", color: "w" } },
                                { symbol: "♗", label: "Bishop", name: "White Bishop", value: { type: "b", color: "w" } },
                                { symbol: "♖", label: "Rook", name: "White Rook", value: { type: "r", color: "w" } },
                                { symbol: "♕", label: "Queen", name: "White Queen", value: { type: "q", color: "w" } },
                                { symbol: "♔", label: "King", name: "White King", value: { type: "k", color: "w" } },
                                { symbol: "♟", label: "Pawn", name: "Black Pawn", value: { type: "p", color: "b" } },
                                { symbol: "♞", label: "Knight", name: "Black Knight", value: { type: "n", color: "b" } },
                                { symbol: "♝", label: "Bishop", name: "Black Bishop", value: { type: "b", color: "b" } },
                                { symbol: "♜", label: "Rook", name: "Black Rook", value: { type: "r", color: "b" } },
                                { symbol: "♛", label: "Queen", name: "Black Queen", value: { type: "q", color: "b" } },
                                { symbol: "♚", label: "King", name: "Black King", value: { type: "k", color: "b" } },
                              ].map((piece, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`palette-btn ${selectedPiece === piece.value || (selectedPiece && piece.value && selectedPiece.type === piece.value.type && selectedPiece.color === piece.value.color) ? "active" : ""}`}
                                  onClick={() => setSelectedPiece(piece.value)}
                                  title={piece.name}
                                >
                                  <span className="palette-symbol">{piece.symbol}</span>
                                  <span className="palette-text">{piece.label}</span>
                                </button>
                              ))}
                            </div>

                            {/* FEN Paste / Load Field */}
                            <div className="fen-import-card">
                              <label style={{ fontSize: "0.8rem", color: "#caba91", display: "block", marginBottom: "6px" }}>
                                📋 Paste FEN Position String (e.g. from Lichess / Chess.com):
                              </label>
                              <div className="fen-input-row">
                                <input
                                  type="text"
                                  value={customFenInput}
                                  onChange={(e) => setCustomFenInput(e.target.value)}
                                  placeholder="Paste FEN string here..."
                                  style={{ flex: 1, padding: "6px 10px", fontSize: "0.85rem", background: "#110e0a", color: "#fff", border: "1px solid rgba(243, 193, 68, 0.3)", borderRadius: "6px" }}
                                />
                                <button
                                  type="button"
                                  className="tab-btn"
                                  style={{ padding: "6px 14px", fontSize: "0.85rem", background: "#f3c144", color: "#111", fontWeight: "bold" }}
                                  onClick={() => handleLoadCustomFen()}
                                >
                                  Load Position
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Right Column: Active Setup Controls */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        <div className="form-group">
                          <label>Turn to Move (Who Starts the Puzzle?)</label>
                          <button
                            type="button"
                            className="tab-btn"
                            style={{ width: "100%", textTransform: "uppercase", fontWeight: "bold" }}
                            onClick={handleToggleTurn}
                            disabled={!setupMode}
                          >
                            {activePuzzleFen.split(" ")[1] === "w" ? "⚪ White to Move" : "⚫ Black to Move"}
                          </button>
                        </div>

                        <div className="form-group">
                          <label>Objective / Mate In *</label>
                          <select
                            value={activePuzzleMateIn}
                            onChange={(e) => setActivePuzzleMateIn(parseInt(e.target.value, 10))}
                            disabled={!setupMode}
                          >
                            <option value="0">🎯 Find the Best Move (Tactical / Advantage)</option>
                            <option value="1">⚡ Mate in 1</option>
                            <option value="2">⚡ Mate in 2</option>
                            <option value="3">⚡ Mate in 3</option>
                            <option value="4">⚡ Mate in 4</option>
                            <option value="5">⚡ Mate in 5</option>
                            <option value="6">⚡ Mate in 6</option>
                            <option value="7">⚡ Mate in 7</option>
                            <option value="8">⚡ Mate in 8</option>
                            <option value="9">⚡ Mate in 9</option>
                            <option value="10">⚡ Mate in 10</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Puzzle Description / Hint</label>
                          <input
                            type="text"
                            value={activePuzzleDesc}
                            onChange={(e) => setActivePuzzleDesc(e.target.value)}
                            placeholder="e.g. Find the killer bishop sacrifice on h7..."
                            disabled={!setupMode}
                          />
                        </div>

                        {puzzleTimingMode === "custom" ? (
                          <div className="form-group" style={{ background: "rgba(243, 193, 68, 0.08)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(243, 193, 68, 0.25)" }}>
                            <label style={{ color: "#f3c144", fontWeight: 600 }}>⏱️ Time Limit for this Puzzle (Seconds) *</label>
                            <input
                              type="number"
                              min="5"
                              max="600"
                              value={activePuzzleTimeLimit}
                              onChange={(e) => setActivePuzzleTimeLimit(e.target.value)}
                              placeholder={`e.g. 45, 90, 120 (fallback: ${puzzleTimeLimit || 60}s)`}
                              disabled={!setupMode}
                              style={{ borderColor: "#f3c144" }}
                            />
                            <small style={{ color: "#caba91", fontSize: "0.78rem", marginTop: "4px", display: "block" }}>
                              Enter individual timer in seconds for this specific puzzle.
                            </small>
                          </div>
                        ) : (
                          <div className="form-group" style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                            <span style={{ color: "#caba91", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                              ⏱️ <strong>Timing:</strong> Fixed at <strong>{puzzleTimeLimit || 60} seconds</strong> for all puzzles in this challenge.
                            </span>
                          </div>
                        )}

                        <div className="form-group" style={{ marginTop: "10px" }}>
                          {setupMode ? (
                            <button
                              type="button"
                              className="tab-btn"
                              style={{ width: "100%", background: "#e67e22", color: "white", borderColor: "#e67e22", padding: "12px", fontSize: "0.95rem" }}
                              onClick={handleStartRecording}
                            >
                              🔴 Start Recording Solution Moves
                            </button>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              <div style={{ background: "#211d17", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(243, 193, 68, 0.3)" }}>
                                <span style={{ fontSize: "0.85rem", color: "#caba91", display: "block" }}>
                                  Recorded Solution Moves:
                                </span>
                                <strong style={{ color: "#f3c144", fontSize: "0.95rem" }}>
                                  {activePuzzleMoves.length > 0 ? activePuzzleMoves.join(" ➔ ") : "Make moves on the board above"}
                                </strong>
                              </div>
                              <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                  type="button"
                                  className="tab-btn"
                                  style={{ flex: 1, borderColor: "#e74c3c", color: "#e74c3c" }}
                                  onClick={handleUndoMove}
                                >
                                  ↩️ Undo Move
                                </button>
                                <button
                                  type="button"
                                  className="tab-btn"
                                  style={{ flex: 1, borderColor: "#95a5a6", color: "#95a5a6" }}
                                  onClick={() => {
                                    const resetChess = new Chess(initialPuzzleFen);
                                    setChessInstance(resetChess);
                                    setActivePuzzleFen(initialPuzzleFen);
                                    setSetupMode(true);
                                    setActivePuzzleMoves([]);
                                  }}
                                >
                                  ✏️ Back to Setup
                                </button>
                              </div>
                              <button
                                type="button"
                                className="tab-btn"
                                style={{ width: "100%", background: "#2ecc71", color: "white", borderColor: "#2ecc71", padding: "12px", fontSize: "0.95rem", fontWeight: "bold" }}
                                onClick={handleAddPuzzle}
                              >
                                {editingPuzzleTournamentId ? `✅ Add & Save Puzzle to "${puzzleTitle || 'Challenge'}"` : "✅ Add Puzzle to Tournament List"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="signup-btn"
                    style={{ width: "100%", marginTop: "10px", height: "50px", fontSize: "1.1rem", fontWeight: "bold" }}
                  >
                    {editingPuzzleTournamentId ? "💾 Save & Update Challenge Dates / Settings" : "🚀 Publish Puzzle Tournament"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab: Broadcast Notification & Email Dispatch */}
          {activeTab === "broadcast" && (
            <div className="admin-broadcast-container">
              <div className="form-card admin-broadcast-card">
                <div className="admin-broadcast-header">
                  <div>
                    <h2>📢 Member Broadcast & Email Dispatch</h2>
                    <p className="admin-broadcast-subtitle">
                      Publish in-app notifications to member navigation bells and dispatch real branded emails directly from <strong style={{ color: "#f3c144" }}>chesszc@zewailcity.edu.eg</strong>.
                    </p>
                  </div>
                  <span className="admin-sender-badge">
                    <Mail size={14} />
                    <span>Sender: chesszc@zewailcity.edu.eg</span>
                  </span>
                </div>

                {/* Quick Announcement Templates */}
                <div className="admin-template-shortcuts">
                  <span className="admin-template-label">
                    <Sparkles size={14} /> Quick Presets:
                  </span>
                  <div className="admin-template-btns">
                    <button
                      type="button"
                      className="admin-template-pill"
                      onClick={() => handleApplyTemplate("tournament")}
                    >
                      🏆 Tournament Announcement
                    </button>
                    <button
                      type="button"
                      className="admin-template-pill"
                      onClick={() => handleApplyTemplate("match")}
                    >
                      ⚡ Match Pairings Alert
                    </button>
                    <button
                      type="button"
                      className="admin-template-pill"
                      onClick={() => handleApplyTemplate("swiss_rules")}
                    >
                      🏛️ Swiss System Rules
                    </button>
                    <button
                      type="button"
                      className="admin-template-pill"
                      onClick={() => handleApplyTemplate("double_knockout_rules")}
                    >
                      ⚡ Double Knockout Rules
                    </button>
                    <button
                      type="button"
                      className="admin-template-pill"
                      onClick={() => handleApplyTemplate("knockout_rules")}
                    >
                      ⚔️ Single Knockout Rules
                    </button>
                    <button
                      type="button"
                      className="admin-template-pill"
                      onClick={() => handleApplyTemplate("puzzle")}
                    >
                      🧩 Puzzle Challenge Live
                    </button>
                    <button
                      type="button"
                      className="admin-template-pill"
                      onClick={() => handleApplyTemplate("challenge")}
                    >
                      ⚔️ Match Challenge Invite
                    </button>
                    <button
                      type="button"
                      className="admin-template-pill"
                      onClick={() => handleApplyTemplate("meeting")}
                    >
                      📢 General Assembly / News
                    </button>
                  </div>
                </div>

                <div className="admin-broadcast-grid">
                  {/* Left Column: Dispatch Form */}
                  <form onSubmit={handleSendBroadcast} className="admin-broadcast-form">
                    
                    {/* Audience Selection */}
                    <div className="form-group">
                      <label>Target Audience *</label>
                      <div className="admin-recipient-toggle-group">
                        <label className={`admin-recipient-radio-card ${broadcastRecipientType === 'all' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="recipientType"
                            value="all"
                            checked={broadcastRecipientType === 'all'}
                            onChange={() => setBroadcastRecipientType('all')}
                          />
                          <div className="radio-card-body">
                            <span className="radio-card-title">🌐 All Registered Members</span>
                            <span className="radio-card-meta">Broadcasts to all {users.length} registered player accounts</span>
                          </div>
                        </label>

                        <label className={`admin-recipient-radio-card ${broadcastRecipientType === 'specific' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="recipientType"
                            value="specific"
                            checked={broadcastRecipientType === 'specific'}
                            onChange={() => setBroadcastRecipientType('specific')}
                          />
                          <div className="radio-card-body">
                            <span className="radio-card-title">👤 Specific Player</span>
                            <span className="radio-card-meta">Send directly to one specific student or member</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Specific Recipient Selector */}
                    {broadcastRecipientType === "specific" && (
                      <div className="form-group">
                        <label htmlFor="broadcastTargetEmail">Select Member or Enter Student Email *</label>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          <select
                            value={broadcastTargetEmail}
                            onChange={(e) => setBroadcastTargetEmail(e.target.value)}
                            style={{ flex: 1, minWidth: "220px" }}
                          >
                            <option value="">-- Choose from registered members ({users.length}) --</option>
                            {users.map(u => (
                              <option key={u._id} value={u.email}>
                                {u.name} ({u.email}) {u.major ? `• ${u.major}` : ""}
                              </option>
                            ))}
                          </select>
                          <input
                            type="email"
                            id="broadcastTargetEmail"
                            value={broadcastTargetEmail}
                            onChange={(e) => setBroadcastTargetEmail(e.target.value)}
                            placeholder="Or type custom email address..."
                            style={{ flex: 1, minWidth: "220px" }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Announcement Subject */}
                    <div className="form-group">
                      <label htmlFor="broadcastTitle">Announcement Subject / Title *</label>
                      <input
                        type="text"
                        id="broadcastTitle"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        placeholder="e.g. 🏆 Spring Blitz Open - Round 1 Starts Tomorrow at 2 PM"
                        required
                      />
                    </div>

                    {/* Message Body */}
                    <div className="form-group">
                      <label htmlFor="broadcastMessage">Message Body *</label>
                      <textarea
                        id="broadcastMessage"
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        placeholder="Write your message here... You can include match reminders, schedules, or club updates."
                        rows={6}
                        required
                        style={{ resize: "vertical", minHeight: "130px", lineHeight: "1.5" }}
                      />
                    </div>

                    {/* Target Link */}
                    <div className="form-group">
                      <label htmlFor="broadcastLink">Action Button Link (Optional)</label>
                      <input
                        type="text"
                        id="broadcastLink"
                        value={broadcastLink}
                        onChange={(e) => setBroadcastLink(e.target.value)}
                        placeholder="e.g. /tournaments or /community or /puzzletournaments"
                      />
                      <small style={{ color: "#8e8677", fontSize: "0.78rem", marginTop: "4px", display: "block" }}>
                        Clicking the email or in-app notification button will navigate members to this URL.
                      </small>
                    </div>

                    {/* Delivery Channels */}
                    <div className="form-group">
                      <label>Delivery Channels</label>
                      <div className="admin-channels-row">
                        <label className={`admin-channel-checkbox ${sendInApp ? 'checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={sendInApp}
                            onChange={(e) => setSendInApp(e.target.checked)}
                          />
                          <Bell size={16} className="channel-icon" />
                          <span>
                            <strong>In-App Notification Bell</strong>
                            <small>Instant notification badge in member navbar</small>
                          </span>
                        </label>

                        <label className={`admin-channel-checkbox ${sendEmailFlag ? 'checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={sendEmailFlag}
                            onChange={(e) => setSendEmailFlag(e.target.checked)}
                          />
                          <Mail size={16} className="channel-icon" />
                          <span>
                            <strong>Official Email Dispatch</strong>
                            <small>Sent from chesszc@zewailcity.edu.eg</small>
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSendingBroadcast}
                      className="admin-broadcast-submit-btn"
                    >
                      {isSendingBroadcast ? (
                        <span>🔄 Dispatching to {broadcastRecipientType === 'all' ? `All ${users.length} Members` : 'Recipient'}...</span>
                      ) : (
                        <span>
                          <Send size={18} />
                          <span>
                            Dispatch Announcement {broadcastRecipientType === 'all' ? `to All Members (${users.length})` : 'to Selected Player'}
                          </span>
                        </span>
                      )}
                    </button>

                    {/* Dispatch Success Info Card */}
                    {broadcastSuccessInfo && (
                      <div className="admin-dispatch-result-card">
                        <div className="result-header">
                          <CheckCircle2 size={20} color="#2ecc71" />
                          <strong>Dispatch Successful!</strong>
                        </div>
                        <p>{broadcastSuccessInfo.message}</p>
                        <div className="result-stats">
                          <div className="result-stat-pill">
                            <span className="stat-label">In-App Alerts:</span>
                            <span className="stat-val">{broadcastSuccessInfo.inAppCount || 0}</span>
                          </div>
                          <div className="result-stat-pill">
                            <span className="stat-label">Emails Sent:</span>
                            <span className="stat-val">{broadcastSuccessInfo.emailSuccessCount || 0}</span>
                          </div>
                          <div className="result-stat-pill">
                            <span className="stat-label">Total Recipients:</span>
                            <span className="stat-val">{broadcastSuccessInfo.totalRecipients || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </form>

                  {/* Right Column: Live Email & Notification Mockup Preview */}
                  <div className="admin-broadcast-preview-col">
                    <div className="admin-preview-header">
                      <span>👁️ Live Email Mockup Preview</span>
                      <span className="preview-tag">Branded HTML Template</span>
                    </div>

                    <div className="admin-email-mockup-frame">
                      <div className="mockup-window-bar">
                        <div className="mockup-dots">
                          <span></span><span></span><span></span>
                        </div>
                        <div className="mockup-window-title">
                          ✉️ {broadcastTitle || "Official Club Announcement"}
                        </div>
                      </div>

                      <div className="mockup-email-content">
                        <div className="mockup-email-header">
                          <img src="/Icons/chess-clublogo.png" alt="ZC Chess Club Logo" className="mockup-logo-img" />
                          <div className="mockup-logo-title">ZEWAIL CITY CHESS CLUB</div>
                        </div>

                        <div className="mockup-email-body">
                          <h3 className="mockup-heading">
                            {broadcastTitle || "Official Club Announcement"}
                          </h3>
                          
                          <p className="mockup-salutation">
                            Dear {broadcastRecipientType === 'specific' && broadcastTargetEmail ? (users.find(u => u.email === broadcastTargetEmail)?.name || broadcastTargetEmail.split('@')[0]) : 'Tactician'},
                          </p>

                          <div className="mockup-message-box">
                            {broadcastMessage ? (
                              broadcastMessage
                            ) : (
                              <span style={{ color: "#777", fontStyle: "italic" }}>
                                Your message text will appear here with responsive typography and high-contrast dark-gold styling...
                              </span>
                            )}
                          </div>

                          <div className="mockup-btn-wrapper">
                            <span className="mockup-cta-btn">
                              Open ZC Chess Club →
                            </span>
                          </div>

                          <div className="mockup-sender-footer">
                            Dispatched by <strong>ZC Chess Club Administration</strong> (chesszc@zewailcity.edu.eg)
                          </div>
                        </div>

                        <div className="mockup-email-footer">
                          <p>© {new Date().getFullYear()} Zewail City Chess Club. All rights reserved.</p>
                          <p>Zewail City of Science, Technology and Innovation • Giza, Egypt</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sent Broadcasts / Emails History Table Section */}
                <div className="admin-broadcast-history-section" style={{ marginTop: "36px", paddingTop: "24px", borderTop: "1px solid rgba(243, 193, 68, 0.2)" }}>
                  <div className="admin-user-tab-header">
                    <div>
                      <h2 style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
                        <span>📜 Sent Announcements & Email History</span>
                        <span className="kpi-num" style={{ fontSize: "0.95rem", padding: "2px 10px", background: "rgba(243, 193, 68, 0.15)", borderRadius: "8px", border: "1px solid rgba(243, 193, 68, 0.3)" }}>
                          {broadcastLogs.length} Total
                        </span>
                      </h2>
                      <p className="admin-user-tab-desc" style={{ marginTop: "4px" }}>
                        Log of all broadcast announcements and real emails dispatched from <strong style={{ color: "#f3c144" }}>chesszc@zewailcity.edu.eg</strong>. Inspect delivery stats or click Reuse to quickly re-dispatch.
                      </p>
                    </div>

                    {/* Search & Refresh */}
                    <div className="admin-user-filters-bar">
                      <div className="admin-user-search-wrap">
                        <Search size={16} className="admin-search-icon" />
                        <input
                          type="text"
                          placeholder="Search past emails, subjects..."
                          value={logSearch}
                          onChange={(e) => setLogSearch(e.target.value)}
                          className="admin-user-search-input"
                        />
                        {logSearch && (
                          <button
                            type="button"
                            className="admin-search-clear-btn"
                            onClick={() => setLogSearch("")}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        className="tab-btn"
                        onClick={fetchData}
                        style={{ fontSize: "0.8rem", padding: "6px 14px", height: "38px" }}
                      >
                        🔄 Refresh
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const filteredLogs = broadcastLogs.filter(l => {
                      const q = (logSearch || "").trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (l.title && l.title.toLowerCase().includes(q)) ||
                        (l.message && l.message.toLowerCase().includes(q)) ||
                        (l.targetEmail && l.targetEmail.toLowerCase().includes(q)) ||
                        (l.adminEmail && l.adminEmail.toLowerCase().includes(q))
                      );
                    });

                    if (filteredLogs.length === 0) {
                      return (
                        <div className="admin-empty-users-state" style={{ padding: "40px 20px" }}>
                          <Mail size={36} className="admin-empty-icon" />
                          <p>{broadcastLogs.length === 0 ? "No announcements or emails dispatched yet. Send your first announcement above!" : "No logs match your search query."}</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="admin-table-container tournaments-desktop-table" style={{ marginTop: "16px" }}>
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Date & Time</th>
                                <th>Announcement Subject</th>
                                <th>Target Audience</th>
                                <th>Channels</th>
                                <th>Delivered Stats</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredLogs.map((log) => (
                                <tr key={log._id}>
                                  <td>
                                    <div style={{ fontSize: "0.82rem", color: "#e5ded0" }}>
                                      <strong>{new Date(log.createdAt).toLocaleDateString()}</strong>
                                    </div>
                                    <span style={{ fontSize: "0.74rem", color: "#8c8577" }}>
                                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: "700", color: "#f5edd6", fontSize: "0.92rem", marginBottom: "4px" }}>
                                      {log.title}
                                    </div>
                                    <div style={{ fontSize: "0.78rem", color: "#9c9484", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {log.message}
                                    </div>
                                  </td>
                                  <td>
                                    {log.recipientType === "all" ? (
                                      <span style={{ background: "rgba(243, 193, 68, 0.15)", color: "#f3c144", padding: "3px 8px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: "700" }}>
                                        🌐 All Members ({log.recipientCount || log.totalRecipients || 0})
                                      </span>
                                    ) : (
                                      <div>
                                        <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "3px 8px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: "700" }}>
                                          👤 Direct Player
                                        </span>
                                        <div style={{ fontSize: "0.76rem", color: "#aaa", marginTop: "3px" }}>
                                          {log.targetEmail || "Single User"}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                      {log.channels?.inApp !== false && (
                                        <span style={{ background: "rgba(243, 193, 68, 0.12)", color: "#f3c144", border: "1px solid rgba(243, 193, 68, 0.3)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.74rem", fontWeight: "700" }}>
                                          🔔 In-App
                                        </span>
                                      )}
                                      {log.channels?.email !== false && (
                                        <span style={{ background: "rgba(46, 204, 113, 0.12)", color: "#2ecc71", border: "1px solid rgba(46, 204, 113, 0.3)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.74rem", fontWeight: "700" }}>
                                          ✉️ Email
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: "0.82rem", color: "#bab19c" }}>
                                      <div>In-App: <strong style={{ color: "#f3c144" }}>{log.inAppCount || 0}</strong></div>
                                      <div>Emails: <strong style={{ color: "#2ecc71" }}>{log.emailCount || 0}</strong></div>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                      <button
                                        type="button"
                                        className="admin-view-profile-btn"
                                        onClick={() => setSelectedLogPreview(log)}
                                        title="View dispatched email & message"
                                        style={{ padding: "4px 8px", fontSize: "0.76rem" }}
                                      >
                                        👁️ View
                                      </button>
                                      <button
                                        type="button"
                                        className="tab-btn"
                                        onClick={() => handleReuseBroadcastLog(log)}
                                        title="Copy into composer to resend or edit"
                                        style={{ padding: "4px 8px", fontSize: "0.76rem" }}
                                      >
                                        🔄 Reuse
                                      </button>
                                      <button
                                        type="button"
                                        className="delete-btn"
                                        onClick={() => handleDeleteBroadcastLog(log._id)}
                                        title="Delete log entry"
                                        style={{ padding: "4px 8px", fontSize: "0.76rem" }}
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Broadcast Logs Cards */}
                        <div className="tournaments-mobile-cards" style={{ marginTop: "14px" }}>
                          {filteredLogs.map((log) => (
                            <div key={log._id} className="mobile-tournament-card" style={{ padding: "16px" }}>
                              <div className="mobile-card-header">
                                <h3 className="mobile-card-title">{log.title}</h3>
                                {log.recipientType === "all" ? (
                                  <span style={{ background: "rgba(243, 193, 68, 0.15)", color: "#f3c144", padding: "3px 8px", borderRadius: "6px", fontSize: "0.74rem", fontWeight: "700" }}>
                                    🌐 All ({log.recipientCount || log.totalRecipients || 0})
                                  </span>
                                ) : (
                                  <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "3px 8px", borderRadius: "6px", fontSize: "0.74rem", fontWeight: "700" }}>
                                    👤 Direct
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "0.82rem", color: "#8c8577", margin: "4px 0" }}>
                                📅 {new Date(log.createdAt).toLocaleString()}
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "#d8cebc", margin: "6px 0", background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: "6px", lineHeight: "1.4" }}>
                                {log.message}
                              </div>
                              <div style={{ display: "flex", gap: "12px", fontSize: "0.8rem", color: "#bab19c", flexWrap: "wrap", margin: "4px 0 8px" }}>
                                <div>🔔 In-App: <strong style={{ color: "#f3c144" }}>{log.inAppCount || 0}</strong></div>
                                <div>✉️ Email: <strong style={{ color: "#2ecc71" }}>{log.emailCount || 0}</strong></div>
                              </div>
                              <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="admin-view-profile-btn mobile-full-btn"
                                  onClick={() => setSelectedLogPreview(log)}
                                >
                                  👁️ View Full Dispatch
                                </button>
                                <button
                                  type="button"
                                  className="tab-btn mobile-full-btn"
                                  onClick={() => handleReuseBroadcastLog(log)}
                                >
                                  🔄 Reuse in Composer
                                </button>
                                <button
                                  type="button"
                                  className="delete-btn mobile-full-btn"
                                  onClick={() => handleDeleteBroadcastLog(log._id)}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Inquiries & Dispatches */}
          {activeTab === "inquiries" && (
            <div className="table-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2>📬 Contact Inquiries & Dispatches ({inquiries.length})</h2>
                  <p style={{ color: "#caba91", margin: "4px 0 0", fontSize: "0.88rem" }}>
                    Messages submitted by students and visitors via the Contact Us page.
                  </p>
                </div>
                <button
                  type="button"
                  className="tab-btn"
                  onClick={fetchData}
                  style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                >
                  🔄 Refresh
                </button>
              </div>

              {inquiries.length === 0 ? (
                <p className="empty-message">No messages received yet. All inquiries from Contact Us will appear here.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {inquiries.map((inq) => (
                    <div
                      key={inq._id}
                      style={{
                        background: inq.read ? "rgba(255, 255, 255, 0.02)" : "rgba(243, 193, 68, 0.06)",
                        border: inq.read ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(243, 193, 68, 0.35)",
                        borderRadius: "12px",
                        padding: "16px 20px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "1rem", color: "#f5edd6" }}>{inq.name}</strong>
                            <span style={{ fontSize: "0.82rem", color: "#f3c144", background: "rgba(243, 193, 68, 0.15)", padding: "2px 8px", borderRadius: "12px" }}>
                              {inq.category}
                            </span>
                            {!inq.read && (
                              <span style={{ fontSize: "0.72rem", color: "#111", background: "#f3c144", fontWeight: "bold", padding: "2px 6px", borderRadius: "6px" }}>
                                NEW
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "#aaa", marginTop: "4px" }}>
                            ✉️ <a href={`mailto:${inq.email}`} style={{ color: "#f3c144", textDecoration: "none" }}>{inq.email}</a>
                            <span style={{ margin: "0 8px" }}>•</span>
                            <span>📅 {new Date(inq.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await safeFetchJson(`${API_BASE}/api/contact/${inq._id}/read`, { method: "PUT" });
                                setInquiries(prev => prev.map(m => m._id === inq._id ? { ...m, read: !m.read } : m));
                              } catch (e) {
                                alert("Failed to toggle read status: " + e.message);
                              }
                            }}
                            className="view-btn"
                            style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                          >
                            {inq.read ? "Mark Unread" : "Mark Read"}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Delete message from ${inq.name}?`)) return;
                              try {
                                await safeFetchJson(`${API_BASE}/api/contact/${inq._id}`, { method: "DELETE" });
                                setInquiries(prev => prev.filter(m => m._id !== inq._id));
                              } catch (e) {
                                alert("Failed to delete message: " + e.message);
                              }
                            }}
                            className="delete-btn"
                            style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      {inq.subject && (
                        <div style={{ marginTop: "10px", fontWeight: "600", fontSize: "0.9rem", color: "#f3c144" }}>
                          Subject: {inq.subject}
                        </div>
                      )}

                      <div style={{ marginTop: "8px", background: "rgba(0, 0, 0, 0.25)", padding: "12px", borderRadius: "8px", fontSize: "0.88rem", color: "#e0d8c3", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {inq.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal for Applicant Details */}
        {modalOpen && selectedApp && (
          <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)} aria-label="Close modal">
                <X size={18} />
              </button>
              <h3>Application Details: {selectedApp.name}</h3>
              <hr className="modal-divider" />
              <div className="modal-info-grid">
                <div><strong>Email:</strong> {selectedApp.email}</div>
                <div><strong>Phone:</strong> {selectedApp.phone}</div>
                <div><strong>ID:</strong> {selectedApp.idNumber}</div>
                <div><strong>Academic Path:</strong> {selectedApp.major} (Batch {selectedApp.batch})</div>
                <div><strong>Department:</strong> {selectedApp.department}</div>
                <div><strong>Position:</strong> {selectedApp.roleTitle}</div>
              </div>
              <hr className="modal-divider" />
              <h4>Role-Specific Answers</h4>
              <PrettyRoleData data={selectedApp.roleSpecificData} />
              
              {selectedApp.status === "Pending" && (
                <div className="modal-action-buttons" style={{ display: "flex", gap: "10px", marginTop: "25px", justifyContent: "flex-end" }}>
                  <button 
                    onClick={() => handleUpdateStatus(selectedApp._id, "Accepted")}
                    className="view-btn" 
                    style={{ cursor: "pointer" }}
                  >
                    Accept Application
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedApp._id, "Rejected")}
                    className="delete-btn" 
                    style={{ cursor: "pointer" }}
                  >
                    Reject Application
                  </button>
                </div>
              )}
              {selectedApp.status && selectedApp.status !== "Pending" && (
                <div style={{ marginTop: "25px", textAlign: "right", color: selectedApp.status === "Accepted" ? "#2ecc71" : "#e74c3c", fontWeight: "bold" }}>
                  Application Status: {selectedApp.status}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Multi-Role Assignment Modal */}
        {roleModal.isOpen && roleModal.user && (
          <div className="modal-overlay" onClick={closeRoleModal}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
              <button className="modal-close-btn" onClick={closeRoleModal} aria-label="Close role editor">
                <X size={18} />
              </button>
              <h3 style={{ color: "#fff", margin: "0 0 6px", fontSize: "1.15rem" }}>
                🛠️ Manage Roles for {roleModal.user.name}
              </h3>
              <p style={{ color: "#bab19c", fontSize: "0.85rem", margin: "0 0 16px" }}>
                Select all department roles that apply. A member can hold more than one role at once — leave everything unchecked for a general ZC Student.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto", marginBottom: "18px" }}>
                {CLUB_ROLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background: roleModal.selectedKeys.includes(opt.key) ? "rgba(243, 193, 68, 0.15)" : "rgba(255, 255, 255, 0.04)",
                      border: `1px solid ${roleModal.selectedKeys.includes(opt.key) ? "rgba(243, 193, 68, 0.5)" : "rgba(255, 255, 255, 0.1)"}`
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={roleModal.selectedKeys.includes(opt.key)}
                      onChange={() => toggleRoleKey(opt.key)}
                      style={{ accentColor: "#f3c144", cursor: "pointer" }}
                    />
                    <span style={{ color: roleModal.selectedKeys.includes(opt.key) ? "#f3c144" : "#ddd", fontWeight: 600, fontSize: "0.88rem" }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>

              {roleModal.selectedKeys.length === 0 && (
                <p style={{ color: "#caba91", fontSize: "0.78rem", fontStyle: "italic", margin: "0 0 14px" }}>
                  No roles selected — this member will be treated as a general ZC Student.
                </p>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeRoleModal}
                  style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", color: "#ddd", border: "1px solid #444", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserRoles}
                  style={{ padding: "8px 20px", borderRadius: "8px", background: "linear-gradient(135deg, #f3c144, #d4a32a)", color: "#15120c", fontWeight: "800", border: "none", cursor: "pointer" }}
                >
                  💾 Save Roles
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sent Broadcast Log Detail / Email Preview Modal */}
        {selectedLogPreview && (
          <div className="notif-modal-overlay" onClick={() => setSelectedLogPreview(null)}>
            <div className="notif-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "580px" }}>
              <div className="notif-modal-header">
                <div className="notif-modal-type-wrap">
                  <span className="notif-modal-icon">✉️</span>
                  <div>
                    <h3 className="notif-modal-title">{selectedLogPreview.title}</h3>
                    <span className="notif-modal-time">
                      Dispatched on {new Date(selectedLogPreview.createdAt).toLocaleString()} by {selectedLogPreview.adminEmail}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setSelectedLogPreview(null)}
                  aria-label="Close notification log modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="notif-modal-body">
                <div className="notif-modal-sender-bar">
                  <div className="notif-modal-sender-initials">ZC</div>
                  <div className="notif-modal-sender-info">
                    <span className="notif-modal-sender-name">Zewail City Chess Club Administration</span>
                    <span className="notif-modal-sender-sub">
                      Sender: chesszc@zewailcity.edu.eg • Target: {selectedLogPreview.recipientType === 'all' ? 'All Members' : selectedLogPreview.targetEmail}
                    </span>
                  </div>
                </div>

                <div className="notif-modal-message-box">
                  {selectedLogPreview.message}
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "0.82rem", color: "#bab19c", background: "rgba(0,0,0,0.3)", padding: "10px 14px", borderRadius: "8px" }}>
                  <div><strong>In-App Notifications:</strong> {selectedLogPreview.inAppCount || 0}</div>
                  <div><strong>Emails Sent:</strong> {selectedLogPreview.emailCount || 0}</div>
                  {selectedLogPreview.link && <div><strong>Target URL:</strong> {selectedLogPreview.link}</div>}
                </div>
              </div>

              <div className="notif-modal-actions">
                <button
                  type="button"
                  className="notif-modal-delete-btn"
                  onClick={() => handleDeleteBroadcastLog(selectedLogPreview._id)}
                >
                  🗑️ Delete Record
                </button>

                <div className="notif-modal-right-actions">
                  <button
                    type="button"
                    className="tab-btn"
                    onClick={() => {
                      handleReuseBroadcastLog(selectedLogPreview);
                      setSelectedLogPreview(null);
                    }}
                    style={{ padding: "8px 16px", fontSize: "0.84rem" }}
                  >
                    🔄 Reuse in Composer
                  </button>
                  <button
                    type="button"
                    className="notif-modal-cancel-btn"
                    onClick={() => setSelectedLogPreview(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
