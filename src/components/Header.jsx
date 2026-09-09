import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import "./Header.css";
import LoginModal from "./LoginModal";
import { safeFetchJson, safeSetLocalStorage, compressBase64Image } from "../utils/api";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: "♟", end: true },
  { to: "/community", label: "Community", icon: "👥" },
  { to: "/tournaments", label: "Tournaments", icon: "🏆" },
  { to: "/puzzlechallenge", label: "Puzzles", icon: "🧩" },
  { to: "/history", label: "History", icon: "📜" },
  { to: "/calendar", label: "Calendar", icon: "📅" },
  { to: "/about", label: "About", icon: "ℹ️" },
  { to: "/clubroles", label: "Club Roles", icon: "✨" },
];

const Header = ({ sidebarOpen, toggleSidebar }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("adminToken"));
  const [userRole, setUserRole] = useState(() => localStorage.getItem("userRole") || null);
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
  const [notifLoading, setNotifLoading] = useState(false);
  const [activeTacticians, setActiveTacticians] = useState(12);
  const location = useLocation();

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
    if (!email) return;
    try {
      setNotifLoading(true);
      const res = await fetch(`${API_BASE}/api/notifications?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setNotifications(data);
      }
    } catch (e) {
      // silently ignore
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    const email = localStorage.getItem('adminEmail');
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

  const handleNotifClick = async (n) => {
    if (!n.read) await handleMarkSingleRead(n._id);
    if (n.link && n.link !== '/') window.location.href = n.link;
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
    };

    window.addEventListener("userAvatarUpdated", handleAvatarUpdate);
    window.addEventListener("userNameUpdated", handleAvatarUpdate);
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
        window.removeEventListener("storage", handleAvatarUpdate);
        clearInterval(pollInterval);
      };
    }

    return () => {
      window.removeEventListener("userAvatarUpdated", handleAvatarUpdate);
      window.removeEventListener("userNameUpdated", handleAvatarUpdate);
      window.removeEventListener("storage", handleAvatarUpdate);
    };
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
                    <h3>Notifications</h3>
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
                        const typeIcon = n.type === 'follow' ? '🤝'
                          : n.type === 'tournament_join' ? '🏆'
                          : n.type === 'tournament_start' ? '🚀'
                          : '♟️';
                        const initials = n.actorName
                          ? n.actorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                          : '?';
                        return (
                          <div
                            key={n._id}
                            className={`notification-item ${n.read ? 'read' : 'unread'}`}
                            onClick={() => handleNotifClick(n)}
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Actor avatar or type icon */}
                            <div className="notification-icon" style={{ position: 'relative', flexShrink: 0 }}>
                              {n.actorAvatar ? (
                                <img
                                  src={n.actorAvatar}
                                  alt={n.actorName}
                                  style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(243,193,68,0.3)' }}
                                />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#3a3220,#2a2416)', border: '2px solid rgba(243,193,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#f3c144' }}>
                                  {initials}
                                </div>
                              )}
                              <span style={{ position: 'absolute', bottom: -2, right: -2, fontSize: '0.7rem', lineHeight: 1 }}>{typeIcon}</span>
                            </div>
                            <div className="notification-content">
                              <p className="notification-text">{n.message}</p>
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
              {(userRole === 'admin' || userEmail?.toLowerCase() === 'admin@zcchessclub.com') ? (
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
                <img src="\Icons\chess-clublogo.png" alt="logo" className="mobile-sidebar-logo" />
                <span>ZC Chess Club</span>
              </div>
              <button className="mobile-sidebar-close" onClick={toggleSidebar} aria-label="Close menu">
                ✕
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
              ✕
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
                  {userRole && <span className="drawer-role-tag">{userRole}</span>}
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
                <span className="drawer-link-icon">📜</span> History
              </Link>
              <Link to="/about" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/about" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">ℹ️</span> About Us
              </Link>

              {/* Management section for admins/hr/oc */}
              {(userRole === 'admin' || userRole === 'hr' || userRole === 'oc') && (
                <>
                  <div className="drawer-section-label" style={{ marginTop: "12px" }}>Management</div>
                  <Link to="/admin" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">📊</span> Dashboard
                  </Link>
                </>
              )}

              {userRole === 'admin' && (
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
                </>
              )}

              {userRole === 'hr' && (
                <Link to="/admin?tab=applications" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                  <span className="drawer-link-icon">📋</span> Applications
                </Link>
              )}

              {userRole === 'oc' && (
                <>
                  <Link to="/admin?tab=add-tournament" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">➕</span> Add Tournament
                  </Link>
                  <Link to="/admin?tab=tournaments-list" className="drawer-link drawer-link--sub" onClick={closeUserDrawer}>
                    <span className="drawer-link-icon">⚙️</span> Manage Tournaments
                  </Link>
                </>
              )}

              <Link to="/clubroles" onClick={closeUserDrawer} className={`drawer-link ${location.pathname === "/clubroles" ? "drawer-link--active" : ""}`}>
                <span className="drawer-link-icon">✨</span> Club Roles
              </Link>
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
    </>
  );
};

export default Header;
