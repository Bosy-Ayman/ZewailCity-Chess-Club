import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import "./Header.css";
import LoginModal from "./LoginModal";
import GlobalWinnerAlert from "./GlobalWinnerAlert";
import WinnerCelebrationModal from "./WinnerCelebrationModal";
import { safeFetchJson, safeSetLocalStorage, compressBase64Image } from "../utils/api";
import { chessAudio } from "../utils/chessAudio";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

const deriveAuthorityRoleFromClubRoles = (clubRoles, fallbackRole = 'member') => {
  if (Array.isArray(clubRoles) && clubRoles.length > 0) {
    if (clubRoles.some(r => r.department === 'Executive High Board' && r.position === 'President')) return 'president';
    if (clubRoles.some(r => r.department === 'Executive High Board' && r.position === 'Vice President')) return 'vice_president';
    if (clubRoles.some(r => r.department === 'Tournament Organizing Committee' && r.position === 'Head')) return 'oc';
    if (clubRoles.some(r => r.department === 'Human Resources' && r.position === 'Head')) return 'hr';
    if (clubRoles.some(r => r.department === 'Public Relations' && r.position === 'Head')) return 'pr';
    if (clubRoles.some(r => r.department === 'Multimedia & Design' && r.position === 'Head')) return 'media';
    if (clubRoles.some(r => r.department === 'Training & Masterclasses' && r.position === 'Head')) return 'trainer';
    if (clubRoles.some(r => r.department === 'Executive High Board')) return 'president';
    if (clubRoles.some(r => r.department === 'Tournament Organizing Committee')) return 'oc';
    if (clubRoles.some(r => r.department === 'Human Resources')) return 'hr';
    if (clubRoles.some(r => r.department === 'Public Relations')) return 'pr';
    if (clubRoles.some(r => r.department === 'Multimedia & Design')) return 'media';
    if (clubRoles.some(r => r.department === 'Training & Masterclasses')) return 'trainer';
    if (clubRoles.some(r => r.department === 'Trainee Development Pathway')) return 'trainee';
  }
  if (fallbackRole === 'admin') return 'president';
  return fallbackRole || 'member';
};

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: "♟", end: true },
  { to: "/community", label: "Community", icon: "👥" },
  { to: "/tournaments", label: "Tournaments", icon: "🏆" },
  { to: "/puzzlechallenge", label: "Puzzles", icon: "🧩" },
  { to: "/history", label: "History", icon: "📜" },
  { to: "/calendar", label: "Calendar", icon: "📅" },
  { to: "/clubroles", label: "Club Roles", icon: "✨" },
  { to: "/about", label: "About", icon: "ℹ️" },
  { to: "/contact", label: "Contact", icon: "📬" },
];

const Header = ({ sidebarOpen: externalSidebarOpen, toggleSidebar: externalToggleSidebar }) => {
  const navigate = useNavigate();
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);
  const sidebarOpen = externalSidebarOpen !== undefined ? externalSidebarOpen : internalSidebarOpen;
  const toggleSidebar = externalToggleSidebar || (() => setInternalSidebarOpen(prev => !prev));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("adminToken"));
  const [userRole, setUserRole] = useState(() => localStorage.getItem("userRole") || null);
  const [userClubRoles, setUserClubRoles] = useState(() => { try { return JSON.parse(localStorage.getItem("userClubRoles") || "[]"); } catch { return []; } });
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("adminEmail") || "");
  const [userName, setUserName] = useState(() => {
    const email = localStorage.getItem("adminEmail") || "";
    return localStorage.getItem("userName") || (email ? email.split("@")[0] : "");
  });
  const [userAvatar, setUserAvatar] = useState(() => {
    const rawAvatar = localStorage.getItem("userAvatar");
    return (rawAvatar && rawAvatar !== "null" && rawAvatar !== "undefined") ? rawAvatar : "";
  });
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [winnerCelebrationData, setWinnerCelebrationData] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [activeTacticians, setActiveTacticians] = useState(12);
  const [soundActive, setSoundActive] = useState(() => chessAudio.isSoundEnabled());
  const prevUnreadRef = useRef(-1);
  const location = useLocation();

  const getDestinationLabel = (link) => {
    if (!link || link === '/' || link === '#' || link.trim() === '') return null;
    const l = link.toLowerCase();
    if (l.includes('tournament')) return '🏆 View Tournaments ➔';
    if (l.includes('puzzle')) return '🧩 Solve Puzzles ➔';
    if (l.includes('profile')) return '👤 View Player Dossier ➔';
    if (l.includes('community')) return '👥 View Community ➔';
    if (l.includes('calendar')) return '📅 View Calendar ➔';
    if (l.includes('history')) return '📜 View History ➔';
    if (l.includes('clubroles')) return '✨ View Club Roles ➔';
    if (l.includes('contact') || l.includes('inquiries')) return '📬 View Inquiries ➔';
    return '🚀 Open Related Page ➔';
  };

  const handleNavigateToDestination = (link) => {
    setSelectedNotif(null);
    if (!link || link === '/' || link === '#' || link.trim() === '') return;
    let target = link.trim();
    if (target.startsWith('http://') || target.startsWith('https://')) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      if (!target.startsWith('/')) target = `/${target}`;
      navigate(target);
    }
  };

  // Relative time helper
  const relativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async (email) => {
    const targetEmail = email || userEmail || localStorage.getItem('adminEmail') || localStorage.getItem('userEmail');
    if (!targetEmail) return;
    try {
      setNotifLoading(true);
      const res = await fetch(`${API_BASE}/api/notifications?email=${encodeURIComponent(targetEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const count = data.filter(n => !n.read).length;
          if (prevUnreadRef.current !== -1 && count > prevUnreadRef.current) {
            chessAudio.playNotification();
          }
          prevUnreadRef.current = count;
          setNotifications(data);
        }
      }
    } catch (e) {
      // silently ignore
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    const email = userEmail || localStorage.getItem('adminEmail') || localStorage.getItem('userEmail');
    if (!email) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch(`${API_BASE}/api/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch (e) {}
  };

  const handleMarkSingleRead = async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    try {
      await fetch(`${API_BASE}/api/notifications/mark-one-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {}
  };

  const handleDeleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (selectedNotif && selectedNotif._id === id) {
      setSelectedNotif(null);
    }
    try {
      await fetch(`${API_BASE}/api/notifications/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {}
  };

  const handleNotifClick = async (n) => {
    if (!n.read) await handleMarkSingleRead(n._id);
    if (n.type === 'winner' || (n.message && (n.message.includes('CHAMPION CROWNED') || n.message.includes('won the')))) {
      const winnerName = n.actorName || n.metadata?.winner?.name || n.message?.match(/CHAMPION CROWNED:\s*([^!]+?)\s*(?:has won|won)/i)?.[1] || "Champion";
      const titleMatch = n.message?.match(/won(?: the)? (.+?)(?:\s*\((.+?)\))?!/i);
      const tournamentTitle = n.metadata?.tournamentTitle || titleMatch?.[1]?.trim() || "ZC Chess Championship";
      const tournamentType = n.metadata?.tournamentType || titleMatch?.[2]?.trim() || "Tournament";

      let winner = n.metadata?.winner || { name: winnerName, points: "Champion", avatar: n.actorAvatar };
      let runnerUp = n.metadata?.runnerUp || null;
      let thirdPlace = n.metadata?.thirdPlace || null;
      let customAvatars = n.metadata?.customAvatars || {};

      setWinnerCelebrationData({
        tournamentTitle,
        tournamentType,
        winner,
        runnerUp,
        thirdPlace,
        customAvatars,
        link: n.link
      });
      setShowNotifications(false);

      // Fetch full podium (2nd & 3rd place) if not in notification metadata
      const tourneyIdMatch = n.link?.match(/[?&]id=([a-f0-9]+)/i) || n.link?.match(/\/tournaments\/([a-f0-9]+)/i);
      if (tourneyIdMatch && (!runnerUp || !thirdPlace)) {
        try {
          const res = await fetch(`${API_BASE}/api/tournaments/${tourneyIdMatch[1]}`);
          if (res.ok) {
            const tData = await res.json();
            const tourney = tData?.data || tData;
            if (tourney) {
              let p1 = tourney.podium?.[0] || (tourney.winner ? { name: tourney.winner, points: "Champion" } : winner);
              let p2 = tourney.podium?.[1] || runnerUp;
              let p3 = tourney.podium?.[2] || thirdPlace;

              if (Array.isArray(tourney.playersList) && (!p2 || !p3)) {
                const sorted = [...tourney.playersList].sort((a, b) => (b.points || 0) - (a.points || 0));
                if (!p1 && sorted[0]) p1 = sorted[0];
                if (!p2 && sorted[1]) p2 = sorted[1];
                if (!p3 && sorted[2]) p3 = sorted[2];
              }

              setWinnerCelebrationData(prev => prev ? {
                ...prev,
                winner: p1 || prev.winner,
                runnerUp: p2 || prev.runnerUp,
                thirdPlace: p3 || prev.thirdPlace,
                customAvatars: { ...(prev.customAvatars || {}), ...(tourney.playerAvatars || {}) }
              } : null);
            }
          }
        } catch (e) {}
      }
      return;
    }
    setSelectedNotif(n);
    setShowNotifications(false);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const sendHeartbeat = () => {
      const email = localStorage.getItem("adminEmail");
      if (email) {
        fetch(`${API_BASE}/api/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        }).catch(() => {});
      }
      fetch(`${API_BASE}/api/community/stats`)
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.activeNow === 'number') {
            setActiveTacticians(data.activeNow);
          }
        })
        .catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".notification-wrapper")) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [showNotifications]);

  const syncUserData = async () => {
    const token = localStorage.getItem("adminToken");
    const email = localStorage.getItem("adminEmail") || "";
    const role = localStorage.getItem("userRole");
    const rawAvatar = localStorage.getItem("userAvatar");
    const cachedAvatar = (rawAvatar && rawAvatar !== "null" && rawAvatar !== "undefined") ? rawAvatar : "";
    const cachedName = localStorage.getItem("userName") || (email ? email.split("@")[0] : "");

    setIsLoggedIn(!!token);
    setUserRole(role);
    setUserEmail(email);
    setUserName(cachedName);
    setUserAvatar(cachedAvatar);

    if (email) {
      try {
        const data = await safeFetchJson(`${API_BASE}/api/profile?email=${email}`);
        if (data) {
          if (data.profileImage && data.profileImage !== "null" && data.profileImage !== "undefined") {
            let imgToUse = data.profileImage;
            if (imgToUse.length > 25000 && imgToUse.startsWith("data:image")) {
              imgToUse = await compressBase64Image(imgToUse, 200, 200, 0.75);
            }
            setUserAvatar(imgToUse);
            safeSetLocalStorage("userAvatar", imgToUse);
          }
          if (data.name) {
            setUserName(data.name);
            safeSetLocalStorage("userName", data.name);
          }
          const effectiveRole = (Array.isArray(data.clubRoles) && data.clubRoles.length > 0)
            ? deriveAuthorityRoleFromClubRoles(data.clubRoles, data.role)
            : (data.role || "member");
          setUserRole(effectiveRole);
          safeSetLocalStorage("userRole", effectiveRole);
          if (Array.isArray(data.clubRoles)) {
            setUserClubRoles(data.clubRoles);
            safeSetLocalStorage("userClubRoles", JSON.stringify(data.clubRoles));
          }
        }
      } catch (err) {
        // Ignore background sync errors
      }
    }
  };

  useEffect(() => {
    syncUserData();

    const handleAvatarUpdate = () => {
      const rawAvatar = localStorage.getItem("userAvatar");
      const updatedAvatar = (rawAvatar && rawAvatar !== "null" && rawAvatar !== "undefined") ? rawAvatar : "";
      setUserAvatar(updatedAvatar);
      const updatedName = localStorage.getItem("userName");
      if (updatedName) setUserName(updatedName);
      const updatedRole = localStorage.getItem("userRole");
      if (updatedRole) setUserRole(updatedRole);
    };

    window.addEventListener("userAvatarUpdated", handleAvatarUpdate);
    window.addEventListener("userNameUpdated", handleAvatarUpdate);
    window.addEventListener("userRoleUpdated", handleAvatarUpdate);
    window.addEventListener("userClubRolesUpdated", handleAvatarUpdate);
    window.addEventListener("storage", handleAvatarUpdate);

    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "true") {
      setShowLoginModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Fetch notifications on mount and set up 60s polling
    const email = localStorage.getItem('adminEmail');
    if (email) {
      fetchNotifications(email);
      const pollInterval = setInterval(() => fetchNotifications(email), 30000);
      return () => {
        window.removeEventListener("userAvatarUpdated", handleAvatarUpdate);
        window.removeEventListener("userNameUpdated", handleAvatarUpdate);
        window.removeEventListener("userRoleUpdated", handleAvatarUpdate);
        window.removeEventListener("storage", handleAvatarUpdate);
        clearInterval(pollInterval);
      };
    }

    return () => {
      window.removeEventListener("userAvatarUpdated", handleAvatarUpdate);
      window.removeEventListener("userNameUpdated", handleAvatarUpdate);
      window.removeEventListener("userRoleUpdated", handleAvatarUpdate);
      window.removeEventListener("storage", handleAvatarUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const handleHeaderLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userAvatar");
    setIsLoggedIn(false);
    setUserRole(null);
    setUserEmail("");
    setUserName("");
    setUserAvatar("");
    setUserDrawerOpen(false);
  };

  const closeUserDrawer = () => setUserDrawerOpen(false);

  const getInitials = (nameStr) => {
    if (!nameStr) return "ZC";
    const parts = nameStr.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="header">
        <div className="logo-title">
          <div className="logo-icon">
            <img src="/Icons/chess-clublogo.png" alt="ZC Chess Club Logo" />
          </div>
          <Link to="/">
            <h2 className="logo-text">ZC Chess Club</h2>
          </Link>
        </div>

        {/* LOGGED-IN INTERFACE */}
        {isLoggedIn ? (
          <div className="logged-in-menu">
            {/* Notification Bell */}
            <div className="notification-wrapper">
              <button 
                className={`notification-bell-btn ${showNotifications ? 'active' : ''}`}
                onClick={() => {
                  const newState = !showNotifications;
                  setShowNotifications(newState);
                  // Refresh notifications each time bell is opened
                  if (newState) {
                    const em = localStorage.getItem('adminEmail');
                    if (em) fetchNotifications(em);
                  }
                }}
                aria-label="Notifications"
              >
                🔔
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3>Notifications</h3>
                      <button
                        type="button"
                        className="notif-sound-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = chessAudio.toggleSound();
                          setSoundActive(next);
                          if (next) chessAudio.playNotification();
                        }}
                        title={soundActive ? "Sound alerts on (click to test / toggle)" : "Sound muted (click to unmute)"}
                      >
                        {soundActive ? "🔊" : "🔇"}
                      </button>
                    </div>
                    {unreadCount > 0 && (
                      <button className="mark-read-btn" onClick={handleMarkAllRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notifications-list">
                    {notifLoading && notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '20px 0', fontSize: '0.82rem' }}>
                        Loading…
                      </div>
                    ) : notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: '20px 0', fontSize: '0.82rem' }}>
                        No notifications yet. Follow players to see their activity here!
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const isWinnerNotif = n.type === 'winner' || (n.message && (n.message.includes('CHAMPION CROWNED') || n.message.includes('won the')));
                        const typeIcon = isWinnerNotif ? '👑'
                          : n.type === 'follow' ? '🤝'
                          : n.type === 'tournament_join' ? '🏆'
                          : n.type === 'tournament_start' ? '🚀'
                          : '♟️';
                        const initials = n.actorName
                          ? n.actorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                          : '?';
                        return (
                          <div
                            key={n._id}
                            className={`notification-item ${n.read ? 'read' : 'unread'} ${isWinnerNotif ? 'winner-notif-row' : ''}`}
                            onClick={() => handleNotifClick(n)}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Actor avatar or type icon */}
                            <div className="notification-icon" style={{ position: 'relative', flexShrink: 0 }}>
                              {n.actorAvatar ? (
                                <img
                                  src={n.actorAvatar}
                                  alt={n.actorName}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: isWinnerNotif ? '2px solid #f3c144' : '2px solid rgba(243,193,68,0.3)',
                                    boxShadow: isWinnerNotif ? '0 0 10px rgba(243,193,68,0.5)' : 'none'
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  background: isWinnerNotif ? 'linear-gradient(135deg, #423518, #201a0d)' : 'linear-gradient(135deg,#3a3220,#2a2416)',
                                  border: isWinnerNotif ? '2px solid #f3c144' : '2px solid rgba(243,193,68,0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  color: '#f3c144'
                                }}>
                                  {initials}
                                </div>
                              )}
                              <span style={{ position: 'absolute', bottom: -2, right: -2, fontSize: isWinnerNotif ? '0.85rem' : '0.7rem', lineHeight: 1 }}>{typeIcon}</span>
                            </div>
                            <div className="notification-content">
                              <p className={`notification-text ${isWinnerNotif ? 'winner-notif-text' : ''}`}>{n.message}</p>
                              <span className="notification-time">{relativeTime(n.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {unreadCount === 0 && notifications.length > 0 && (
                    <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--muted-foreground)", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                      ✨ You're all caught up!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User menu button */}
            <button className="user-menu-btn" onClick={() => setUserDrawerOpen(true)}>
              {userAvatar && userAvatar !== "null" && userAvatar !== "undefined" ? (
                <img 
                  src={userAvatar} 
                  alt="Avatar" 
                  className="user-menu-avatar-img" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span className="user-menu-avatar-initials">{getInitials(userName || userEmail)}</span>
              )}
              <span className="user-menu-text">{userName || userEmail.split('@')[0]}</span>
              {userRole === 'president' ? (
                <span className="user-role-badge admin">👑 President</span>
              ) : userRole === 'vice_president' ? (
                <span className="user-role-badge" style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.4)" }}>⭐ Vice President</span>
              ) : (userRole === 'admin' || userEmail?.toLowerCase() === 'admin@zcchessclub.com') ? (
                <span className="user-role-badge admin">👑 Admin</span>
              ) : (
                userRole && <span className="user-role-badge">{userRole}</span>
              )}
            </button>
          </div>
        ) : (
          /* GUEST VISITOR INTERFACE */
          <>
            {!isMobile && (
              <>
                <nav className="nav-links">
                  {NAV_ITEMS.map(({ to, label, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) => isActive ? "nav-active" : ""}
                    >
                      {label}
                    </NavLink>
                  ))}
                </nav>

                <div className="auth-buttons">
                  <Link to="/signup">
                    <button className="signup-btn">Sign Up</button>
                  </Link>
                  <button className="login-btn" onClick={() => setShowLoginModal(true)}>Log In</button>
                </div>
              </>
            )}

            {isMobile && (
              <button
                className="hamburger"
                onClick={toggleSidebar}
                aria-label="Open menu"
                aria-expanded={sidebarOpen}
              >
                <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`} />
                <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`} />
                <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`} />
              </button>
            )}
          </>
        )}
      </header>

      {/* ==============================
          GUEST MOBILE SIDEBAR
      ============================== */}
      {!isLoggedIn && isMobile && sidebarOpen && (
        <>
          <div className="mobile-sidebar-overlay" onClick={toggleSidebar} />
          <aside className="mobile-sidebar">
            {/* Sidebar Header */}
            <div className="mobile-sidebar-head">
              <div className="mobile-sidebar-brand">
                <img src="/Icons/chess-clublogo.png" alt="logo" className="mobile-sidebar-logo" />
                <span>ZC Chess Club</span>
              </div>
              <button className="mobile-sidebar-close" onClick={toggleSidebar} aria-label="Close menu">
                <X size={18} />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="mobile-sidebar-nav">
              {NAV_ITEMS.map(({ to, label, icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={toggleSidebar}
                  className={({ isActive }) =>
                    `mobile-sidebar-link ${isActive ? "mobile-sidebar-link--active" : ""}`
                  }
                >
                  <span className="mobile-sidebar-link-icon">{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Auth Buttons */}
            <div className="mobile-sidebar-auth">
              <Link to="/signup" onClick={toggleSidebar} className="mobile-auth-signup">
                Sign Up
              </Link>
              <button
                className="mobile-auth-login"
                onClick={() => { setShowLoginModal(true); toggleSidebar(); }}
              >
                Log In
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ==============================
          LOGGED-IN USER DRAWER (right)
      ============================== */}
      {isLoggedIn && userDrawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeUserDrawer} />
          <aside className="user-drawer">
            {/* Close Button */}
            <button className="close-drawer-btn" onClick={closeUserDrawer} aria-label="Close menu">
              <X size={18} />
            </button>

            {/* User Header */}
            <div className="drawer-header">
              <div className="drawer-avatar-initials" style={userAvatar && userAvatar !== "null" && userAvatar !== "undefined" ? { padding: 0, overflow: 'hidden' } : {}}>
                {userAvatar && userAvatar !== "null" && userAvatar !== "undefined" ? (
                  <img 
                    src={userAvatar} 
                    alt="Profile" 
                    referrerPolicy="no-referrer" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} 
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  getInitials(userName || userEmail)
                )}
              </div>
              <div className="drawer-user-info">
                <span className="drawer-user-name">{userName || userEmail.split('@')[0]}</span>
                <span className="drawer-user-email">{userEmail}</span>
                <div className="drawer-sub-badges-row">
                  {(() => {
                    const labels = [];
                    if (Array.isArray(userClubRoles) && userClubRoles.length > 0) {
                      userClubRoles.forEach(cr => {
                        if (cr.position && cr.department) {
                          const deptShort = (cr.department || '')
                            .replace('Tournament Organizing Committee', 'OC')
                            .replace('Human Resources', 'HR')
                            .replace('Public Relations', 'PR')
                            .replace('Multimedia & Design', 'Media')
                            .replace('Training & Masterclasses', 'Training')
                            .replace('Executive High Board', 'High Board')
                            .replace('Trainee Development Pathway', 'Trainee');
                          labels.push(`✨ ${cr.position === 'Member' ? deptShort + ' Member' : cr.position === 'Head' ? deptShort + ' Head' : cr.position} `);
                        }
                      });
                    }
                    if (labels.length === 0 && userRole && userRole !== 'member') {
                      const roleMap = {
                        president: '👑 President',
                        vice_president: '⭐ Vice President',
                        oc: '⚡ Head of OC',
                        member_oc: '✨ Member of OC',
                        hr: '👥 Head of HR',
                        member_hr: '👥 Member of HR',
                        pr: '📢 Head of PR',
                        member_pr: '📢 Member of PR',
                        media: '🎨 Head of Multimedia',
                        member_media: '🎨 Member of Multimedia',
                        trainer: '🎓 Head of Training',
                        trainee: '♟️ Trainee'
                      };
                      labels.push(roleMap[userRole] || userRole);
                    }
                    if (labels.length === 0) labels.push('🎓 ZC Student');
                    return labels.map((l, i) => <span key={i} className="drawer-role-tag">{l}</span>);
                  })()}
                  <span className="drawer-active-community-badge" title="Active tacticians in campus community">
                    <span className="live-dot-pulse" /> {activeTacticians} Online
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="drawer-links">
              <div className="drawer-section-label">Navigation</div>

              <Link to="/" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">🏠</span> Home
              </Link>
              <Link to="/profile" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/profile" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">👤</span> My Profile
              </Link>
              <Link to="/community" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/community" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">👥</span>
                <span style={{ flex: 1 }}>Community Hub</span>
                <span className="drawer-live-pill">🟢 Live</span>
              </Link>
              <Link to="/tournaments" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/tournaments" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">🏆</span> Tournaments
              </Link>
              <Link to="/puzzlechallenge" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/puzzlechallenge" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">🧩</span> Puzzles
              </Link>
              <Link to="/calendar" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/calendar" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">📅</span> Calendar
              </Link>
              <Link to="/history" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/history" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">📜</span> History & Archives
              </Link>
              <Link to="/clubroles" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/clubroles" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">✨</span> Club Roles
              </Link>
              <Link to="/about" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/about" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">ℹ️</span> About Us
              </Link>
              <Link to="/contact" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/contact" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">📬</span> Contact Us
              </Link>

              {/* Management section for admins/presidents/vps/hr/oc */}
              {(['admin', 'president', 'vice_president', 'hr', 'oc'].includes(userRole)
                || (Array.isArray(userClubRoles) && userClubRoles.length > 0)) && (
                <>
                  <div className="drawer-section-label" style={{ marginTop: "12px" }}>Management</div>
                  <Link to="/admin" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">📊</span> Admin Dashboard
                  </Link>
                </>
              )}

              {['admin', 'president', 'vice_president'].includes(userRole) && (
                <>
                  <Link to="/admin?tab=add-tournament" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">➕</span> Add Tournament
                  </Link>
                  <Link to="/admin?tab=tournaments-list" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">⚙️</span> Manage Tournaments
                  </Link>
                  <Link to="/admin?tab=applications" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">📋</span> Applications
                  </Link>
                  <Link to="/admin?tab=manage-users" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">👥</span> Manage Users
                  </Link>
                  <Link to="/admin?tab=manage-puzzles" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">🧩</span> Manage Puzzles
                  </Link>
                  <Link to="/admin?tab=broadcast" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">📢</span> Broadcast & Email
                  </Link>
                  <Link to="/admin?tab=inquiries" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">📬</span> Inquiries & Messages
                  </Link>
                </>
              )}

              {(['hr', 'member_hr'].includes(userRole) || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Human Resources'))) && (
                <>
                  <Link to="/admin?tab=manage-users" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">👥</span> Manage Users
                  </Link>
                  <Link to="/admin?tab=applications" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">📋</span> Applications
                  </Link>
                  <Link to="/admin?tab=broadcast" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">📢</span> Broadcast & Email
                  </Link>
                  <Link to="/admin?tab=inquiries" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">📬</span> Inquiries & Messages
                  </Link>
                </>
              )}

              {(userRole === 'oc' || (Array.isArray(userClubRoles) && userClubRoles.some(r => r.department === 'Tournament Organizing Committee'))) && (
                <>
                  <Link to="/admin?tab=add-tournament" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">➕</span> Add Tournament
                  </Link>
                  <Link to="/admin?tab=tournaments-list" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">⚙️</span> Manage Tournaments
                  </Link>
                  <Link to="/admin?tab=manage-puzzles" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">🧩</span> Manage Puzzles
                  </Link>
                </>
              )}
            </nav>

            {/* Footer: Logout */}
            <div className="drawer-footer">
              <button className="logout-btn-drawer" onClick={handleHeaderLogout}>
                <span>🚪</span> Log Out
              </button>
            </div>
          </aside>
        </>
      )}

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}

      {/* ============================================================
          NOTIFICATION DETAIL MODAL
      ============================================================ */}
      {selectedNotif && (
        <div className="notif-modal-overlay" onClick={() => setSelectedNotif(null)}>
          <div className="notif-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <div className="notif-modal-type-wrap">
                <span className="notif-modal-icon">
                  {selectedNotif.type === 'broadcast' ? '📢'
                    : selectedNotif.type === 'follow' ? '🤝'
                    : selectedNotif.type === 'tournament_join' ? '🏆'
                    : selectedNotif.type === 'tournament_start' ? '🚀'
                    : selectedNotif.type === 'direct_message' ? '✉️'
                    : '♟️'}
                </span>
                <div>
                  <h3 className="notif-modal-title">
                    {selectedNotif.type === 'broadcast' ? 'Club Announcement'
                      : selectedNotif.type === 'follow' ? 'Player Connection'
                      : selectedNotif.type === 'tournament_join' || selectedNotif.type === 'tournament_start' ? 'Tournament Alert'
                      : 'Notification Details'}
                  </h3>
                  <span className="notif-modal-time">
                    {new Date(selectedNotif.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} ({relativeTime(selectedNotif.createdAt)})
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                className="notif-modal-close-btn" 
                onClick={() => setSelectedNotif(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="notif-modal-body">
              {/* Sender Info */}
              <div className="notif-modal-sender-bar">
                {selectedNotif.actorAvatar ? (
                  <img
                    src={selectedNotif.actorAvatar}
                    alt={selectedNotif.actorName || 'Sender'}
                    className="notif-modal-sender-avatar"
                  />
                ) : (
                  <div className="notif-modal-sender-initials">
                    {(selectedNotif.actorName || 'ZC').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="notif-modal-sender-info">
                  <span className="notif-modal-sender-name">
                    {selectedNotif.actorName || 'Zewail City Chess Club'}
                  </span>
                  <span className="notif-modal-sender-sub">
                    {selectedNotif.actorEmail || 'chesszc@zewailcity.edu.eg'}
                  </span>
                </div>
              </div>

              {/* Message Content */}
              <div className="notif-modal-message-box">
                {selectedNotif.message}
              </div>
            </div>

            <div className="notif-modal-actions">
              <button
                type="button"
                className="notif-modal-delete-btn"
                onClick={() => handleDeleteNotification(selectedNotif._id)}
              >
                🗑️ Delete
              </button>

              <div className="notif-modal-right-actions">
                <button
                  type="button"
                  className="notif-modal-cancel-btn"
                  onClick={() => setSelectedNotif(null)}
                >
                  Close
                </button>
                {(() => {
                  const destLabel = getDestinationLabel(selectedNotif.link);
                  return destLabel ? (
                    <button
                      type="button"
                      className="notif-modal-cta-btn"
                      onClick={() => handleNavigateToDestination(selectedNotif.link)}
                    >
                      {destLabel}
                    </button>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Floating Winner Announcement Banner */}
      <GlobalWinnerAlert notifications={notifications} />

      {/* Champion Celebration Modal triggered from notifications */}
      {winnerCelebrationData && (
        <WinnerCelebrationModal
          isOpen={!!winnerCelebrationData}
          onClose={() => setWinnerCelebrationData(null)}
          tournamentTitle={winnerCelebrationData.tournamentTitle}
          tournamentType={winnerCelebrationData.tournamentType}
          winner={winnerCelebrationData.winner}
          runnerUp={winnerCelebrationData.runnerUp}
          thirdPlace={winnerCelebrationData.thirdPlace}
          customAvatars={winnerCelebrationData.customAvatars}
          onViewBracketOrStandings={() => {
            if (winnerCelebrationData.link) {
              handleNavigateToDestination(winnerCelebrationData.link);
            }
          }}
        />
      )}
    </>
  );
};

export default Header;
