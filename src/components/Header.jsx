import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import "./Header.css";
import LoginModal from "./LoginModal";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: "♟", end: true },
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const location = useLocation();

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "tournament",
      text: "The ZC Rapid Championship begins tomorrow at 6:00 PM.",
      time: "2 hours ago",
      read: false
    },
    {
      id: 2,
      type: "puzzle",
      text: "New Weekly Puzzle Challenge is now live. Solve to earn points!",
      time: "1 day ago",
      read: false
    },
    {
      id: 3,
      type: "role",
      text: "Your application status has been updated to 'Under Review'.",
      time: "2 days ago",
      read: false
    }
  ]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("adminToken"));
    setUserRole(localStorage.getItem("userRole"));
    const email = localStorage.getItem("adminEmail") || "";
    setUserEmail(email);
    setUserName(localStorage.getItem("userName") || (email ? email.split("@")[0] : ""));
    setUserAvatar(localStorage.getItem("userAvatar") || "");
    
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "true") {
      setShowLoginModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleHeaderLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userAvatar");
    setIsLoggedIn(false);
    setUserDrawerOpen(false);
    window.location.reload();
  };

  const closeUserDrawer = () => setUserDrawerOpen(false);

  const getInitials = (str) => {
    if (!str) return "?";
    const name = str.includes("@") ? str.split("@")[0] : str;
    const parts = name.split(/[\s._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="header">
        <div className="logo-title">
          <div className="logo-icon">
            <img src="\Icons\chess-clublogo.png" alt="Chess Rook Logo" />
          </div>
          <a href='/'>
            <h2 className="logo-text">ZC Chess Club</h2>
          </a>
        </div>

        {/* LOGGED IN USER INTERFACE */}
        {isLoggedIn ? (
          <div className="logged-in-menu">
            {/* Notifications */}
            <div className="notification-wrapper">
              <button
                className="notification-bell-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
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
                    {notifications.map((n) => (
                      <div key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>
                        <div className="notification-icon">
                          {n.type === 'tournament' ? '🏆' : n.type === 'puzzle' ? '🧩' : '♟️'}
                        </div>
                        <div className="notification-content">
                          <p className="notification-text">{n.text}</p>
                          <span className="notification-time">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User menu button */}
            <button className="user-menu-btn" onClick={() => setUserDrawerOpen(true)}>
              {userAvatar ? (
                <img src={userAvatar} alt="Avatar" className="user-menu-avatar-img" referrerPolicy="no-referrer" />
              ) : (
                <span className="user-menu-avatar-initials">{getInitials(userName || userEmail)}</span>
              )}
              <span className="user-menu-text">{userName || userEmail.split('@')[0]}</span>
              {userRole && <span className="user-role-badge">{userRole}</span>}
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
              <div className="drawer-avatar-initials" style={userAvatar ? { padding: 0, overflow: 'hidden' } : {}}>
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                ) : (
                  getInitials(userName || userEmail)
                )}
              </div>
              <div className="drawer-user-info">
                <span className="drawer-user-name">{userName || userEmail.split('@')[0]}</span>
                <span className="drawer-user-email">{userEmail}</span>
                {userRole && <span className="drawer-role-tag">{userRole}</span>}
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
