import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { X } from "lucide-react";
import "./OnlinePresenceWidget.css";
import { safeFetchJson } from "../utils/api";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : window.location.origin);

// Helper to derive a clean session ID for guest or logged in user
function getOrCreateSessionId() {
  try {
    let sid = sessionStorage.getItem("zc_session_id");
    if (!sid) {
      sid = "sess_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      sessionStorage.setItem("zc_session_id", sid);
    }
    return sid;
  } catch (e) {
    return "sess_" + Math.random().toString(36).substring(2, 9);
  }
}

// Convert path to user-friendly activity label
function getActivityFromPath(pathname) {
  if (!pathname || pathname === "/") return "🏠 Home Lounge";
  if (pathname.includes("puzzlechallenge")) return "🧩 Solving Tactics Arena";
  if (pathname.includes("tournamentdetailsKnockout")) return "⚡ Knockout Brackets";
  if (pathname.includes("tournamentdetails")) return "🏆 Swiss Tournament";
  if (pathname.includes("tournaments")) return "🏆 Viewing Tournaments";
  if (pathname.includes("community")) return "👥 Community Hub";
  if (pathname.includes("calendar")) return "📅 Checking Calendar";
  if (pathname.includes("profile")) return "👤 Player Profile";
  if (pathname.includes("admin")) return "👑 Arbiter Command";
  if (pathname.includes("history")) return "📜 Club History";
  if (pathname.includes("apply")) return "📝 Submitting Application";
  if (pathname.includes("clubroles")) return "✨ Exploring Club Roles";
  return "♟️ Browsing Club";
}

export default function OnlinePresenceWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [onlineData, setOnlineData] = useState({ count: 0, users: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all"); // "all", "tactics", "tournaments", "lounge"
  const [isCompactOnScroll, setIsCompactOnScroll] = useState(false);

  const location = useLocation();
  const heartbeatTimerRef = useRef(null);
  const fetchTimerRef = useRef(null);

  // Current user info from localStorage
  const userEmail = (localStorage.getItem("adminEmail") || localStorage.getItem("userEmail") || "").toLowerCase().trim();
  const userName = localStorage.getItem("userName") || (userEmail ? userEmail.split("@")[0] : "");
  const userRole = localStorage.getItem("userRole") || (userEmail ? "member" : "guest");
  const userAvatar = localStorage.getItem("userAvatar") || "";

  // Smart Auto-Collapse on Mobile Scroll Down
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 140 && currentScrollY > lastScrollY + 10) {
        setIsCompactOnScroll(true);
      } else if (currentScrollY < lastScrollY - 15 || currentScrollY <= 80) {
        setIsCompactOnScroll(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Send Heartbeat ping to server
  const sendHeartbeat = async () => {
    try {
      const sessionId = getOrCreateSessionId();
      const currentActivity = getActivityFromPath(location.pathname);

      await fetch(`${API_BASE}/api/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          email: userEmail || "",
          name: userName || (userEmail ? userEmail.split("@")[0] : "Guest Tactician"),
          role: userRole,
          avatar: userAvatar || "",
          currentPage: currentActivity,
          currentPath: location.pathname
        })
      });
    } catch (err) {
      // Fire-and-forget
    }
  };

  // Fetch online users list from server
  const fetchOnlineUsers = async () => {
    try {
      const res = await safeFetchJson(`${API_BASE}/api/users/online`);
      if (res && Array.isArray(res.users)) {
        setOnlineData({
          count: res.count || res.users.length,
          users: res.users
        });
      }
    } catch (err) {
      // Silent fail
    }
  };

  // Heartbeat & polling lifecycle
  useEffect(() => {
    sendHeartbeat();
    fetchOnlineUsers();

    heartbeatTimerRef.current = setInterval(() => {
      if (!document.hidden) sendHeartbeat();
    }, 25000);

    fetchTimerRef.current = setInterval(() => {
      if (!document.hidden) fetchOnlineUsers();
    }, 15000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        sendHeartbeat();
        fetchOnlineUsers();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (fetchTimerRef.current) clearInterval(fetchTimerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, userEmail, userName, userAvatar, userRole]);

  // Category counts for quick filter chips
  const categoryCounts = useMemo(() => {
    const list = onlineData.users || [];
    return {
      all: list.length,
      tactics: list.filter((u) => u.currentPage && u.currentPage.toLowerCase().includes("tactics")).length,
      tournaments: list.filter((u) => u.currentPage && (u.currentPage.toLowerCase().includes("tournament") || u.currentPage.toLowerCase().includes("knockout"))).length,
      lounge: list.filter((u) => u.currentPage && (u.currentPage.toLowerCase().includes("lounge") || u.currentPage.toLowerCase().includes("browsing") || u.currentPage.toLowerCase().includes("community"))).length
    };
  }, [onlineData.users]);

  // Filtered users by category + search query
  const filteredUsers = useMemo(() => {
    let list = onlineData.users || [];

    if (activeCategory === "tactics") {
      list = list.filter((u) => u.currentPage && u.currentPage.toLowerCase().includes("tactics"));
    } else if (activeCategory === "tournaments") {
      list = list.filter((u) => u.currentPage && (u.currentPage.toLowerCase().includes("tournament") || u.currentPage.toLowerCase().includes("knockout")));
    } else if (activeCategory === "lounge") {
      list = list.filter((u) => u.currentPage && (u.currentPage.toLowerCase().includes("lounge") || u.currentPage.toLowerCase().includes("browsing") || u.currentPage.toLowerCase().includes("community")));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.currentPage && u.currentPage.toLowerCase().includes(q))
    );
  }, [onlineData.users, activeCategory, searchQuery]);

  // Format display role
  const getRoleBadge = (role, email) => {
    const r = (role || "").toLowerCase();
    const e = (email || "").toLowerCase();
    if (r === "admin" || r === "president" || e.includes("chesszc") || e.includes("poussy.ayman")) {
      return { label: "👑 Admin", className: "role-admin" };
    }
    if (r.includes("vice") || r.includes("vp")) {
      return { label: "🎖️ VP", className: "role-vp" };
    }
    if (r.includes("trainer") || r.includes("coach")) {
      return { label: "♟️ Trainer", className: "role-trainer" };
    }
    if (r.includes("hr") || r.includes("pr") || r.includes("oc") || r.includes("multimedia")) {
      return { label: `✨ ${role.toUpperCase()}`, className: "role-committee" };
    }
    if (r === "guest") {
      return { label: "♟️ Guest", className: "role-guest" };
    }
    return { label: "♟️ Tactician", className: "role-member" };
  };

  const totalCount = onlineData.count || onlineData.users.length;

  return (
    <>
      {/* Backdrop for mobile drawer dismissal */}
      {isOpen && (
        <div
          className="online-presence-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Presence Dock */}
      <div
        className={`online-presence-dock ${isOpen ? "active-dock" : ""} ${isCompactOnScroll ? "compact-scrolled" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Tacticians Online (Click to expand)"
      >
        <div className="dock-pulse-indicator">
          <span className="pulse-dot"></span>
          <span className="pulse-ring"></span>
        </div>

        {/* Stacked Avatars (hidden when scrolled compact on mobile) */}
        {!isCompactOnScroll && (
          <div className="dock-avatar-stack">
            {onlineData.users.slice(0, 3).map((u, i) => (
              <img
                key={u.id || i}
                src={u.avatar || "/Icons/unknown.png"}
                alt={u.name}
                className="dock-avatar"
                style={{ zIndex: 4 - i }}
                onError={(e) => {
                  e.currentTarget.src = "/Icons/unknown.png";
                }}
              />
            ))}
          </div>
        )}

        <div className="dock-text-group">
          <span className="dock-count">
            {totalCount} <span className="dock-count-label">{totalCount === 1 ? "Online" : "Online"}</span>
          </span>
        </div>

        <span className="dock-expand-arrow">{isOpen ? "▾" : "▴"}</span>
      </div>

      {/* Expanded Social Drawer / Mobile Bottom Sheet */}
      {isOpen && (
        <div className="online-presence-drawer" onClick={(e) => e.stopPropagation()}>
          {/* Mobile Drag Indicator Handle */}
          <div className="drawer-drag-handle" />

          <div className="presence-drawer-header">
            <div className="drawer-title-row">
              <div className="drawer-title-group">
                <span className="drawer-live-badge">
                  <span className="live-dot"></span> LIVE
                </span>
                <h3 className="drawer-title">Tacticians Online</h3>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="drawer-subtitle">
              {totalCount} active {totalCount === 1 ? "member" : "members"} on ZC Chess Club right now
            </p>

            {/* Activity Category Filter Chips */}
            <div className="drawer-filter-chips">
              <button
                type="button"
                className={`chip-btn ${activeCategory === "all" ? "active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                All ({categoryCounts.all})
              </button>
              <button
                type="button"
                className={`chip-btn ${activeCategory === "tactics" ? "active" : ""}`}
                onClick={() => setActiveCategory("tactics")}
              >
                🧩 Tactics ({categoryCounts.tactics})
              </button>
              <button
                type="button"
                className={`chip-btn ${activeCategory === "tournaments" ? "active" : ""}`}
                onClick={() => setActiveCategory("tournaments")}
              >
                🏆 Events ({categoryCounts.tournaments})
              </button>
              <button
                type="button"
                className={`chip-btn ${activeCategory === "lounge" ? "active" : ""}`}
                onClick={() => setActiveCategory("lounge")}
              >
                🏠 Lounge ({categoryCounts.lounge})
              </button>
            </div>

            {/* Quick Search */}
            {totalCount > 3 && (
              <div className="drawer-search-wrap">
                <input
                  type="text"
                  className="drawer-search-input"
                  placeholder="🔍 Search online members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="drawer-body">
            {filteredUsers.length === 0 ? (
              <div className="drawer-empty-state">
                <span className="empty-icon">♟️</span>
                <p>No tacticians match your current filter.</p>
              </div>
            ) : (
              <div className="online-users-list">
                {filteredUsers.map((u, idx) => {
                  const isSelf = userEmail && u.email && u.email.toLowerCase() === userEmail;
                  const roleObj = getRoleBadge(u.role, u.email);
                  const profileHref = u.email
                    ? `/profile?email=${encodeURIComponent(u.email)}`
                    : null;

                  return (
                    <div
                      key={u.id || idx}
                      className={`online-user-card ${isSelf ? "is-self" : ""}`}
                    >
                      {profileHref ? (
                        <Link
                          to={profileHref}
                          className="online-user-profile-link"
                          onClick={() => setIsOpen(false)}
                        >
                          <div className="user-avatar-wrap">
                            <img
                              src={u.avatar || "/Icons/unknown.png"}
                              alt={u.name}
                              className="online-user-avatar"
                              onError={(e) => {
                                e.currentTarget.src = "/Icons/unknown.png";
                              }}
                            />
                            <span className="avatar-online-dot"></span>
                          </div>

                          <div className="online-user-details">
                            <div className="user-name-row">
                              <strong className="online-user-name">
                                {u.name || "Tactician"}
                              </strong>
                              {isSelf && <span className="you-pill-tag">YOU</span>}
                            </div>

                            <div className="user-badges-row">
                              <span className={`user-role-pill ${roleObj.className}`}>
                                {roleObj.label}
                              </span>
                            </div>

                            <div className="user-activity-status">
                              <span className="activity-icon">📍</span>
                              <span className="activity-text">{u.currentPage || "Online"}</span>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <>
                          <div className="user-avatar-wrap">
                            <img
                              src={u.avatar || "/Icons/unknown.png"}
                              alt={u.name}
                              className="online-user-avatar"
                              onError={(e) => {
                                e.currentTarget.src = "/Icons/unknown.png";
                              }}
                            />
                            <span className="avatar-online-dot"></span>
                          </div>

                          <div className="online-user-details">
                            <div className="user-name-row">
                              <strong className="online-user-name">
                                {u.name || "Tactician"}
                              </strong>
                              {isSelf && <span className="you-pill-tag">YOU</span>}
                            </div>

                            <div className="user-badges-row">
                              <span className={`user-role-pill ${roleObj.className}`}>
                                {roleObj.label}
                              </span>
                            </div>

                            <div className="user-activity-status">
                              <span className="activity-icon">📍</span>
                              <span className="activity-text">{u.currentPage || "Online"}</span>
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="drawer-footer">
            <div className="drawer-footer-note">
              <span>🟢 Live Sync (15s)</span>
            </div>
            <Link
              to="/community"
              className="drawer-community-link"
              onClick={() => setIsOpen(false)}
            >
              👥 Open Community Lounge →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
