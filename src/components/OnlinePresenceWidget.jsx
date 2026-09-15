import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import "./OnlinePresenceWidget.css";
import { safeFetchJson } from "../utils/api";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

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
  const location = useLocation();
  const heartbeatTimerRef = useRef(null);
  const fetchTimerRef = useRef(null);

  // Current user info from localStorage
  const userEmail = (localStorage.getItem("adminEmail") || localStorage.getItem("userEmail") || "").toLowerCase().trim();
  const userName = localStorage.getItem("userName") || (userEmail ? userEmail.split("@")[0] : "");
  const userRole = localStorage.getItem("userRole") || (userEmail ? "member" : "guest");
  const userAvatar = localStorage.getItem("userAvatar") || "";

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
      // Fire-and-forget, silent fail for heartbeat
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

  // Heartbeat and polling lifecycle
  useEffect(() => {
    // 1. Initial heartbeat and fetch
    sendHeartbeat();
    fetchOnlineUsers();

    // 2. Periodic heartbeat every 25 seconds
    heartbeatTimerRef.current = setInterval(() => {
      if (!document.hidden) {
        sendHeartbeat();
      }
    }, 25000);

    // 3. Periodic fetch of online list every 15 seconds
    fetchTimerRef.current = setInterval(() => {
      if (!document.hidden) {
        fetchOnlineUsers();
      }
    }, 15000);

    // 4. On tab visibility change, send immediate heartbeat
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

  // Filtered list based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return onlineData.users;
    const q = searchQuery.toLowerCase();
    return onlineData.users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.currentPage && u.currentPage.toLowerCase().includes(q))
    );
  }, [onlineData.users, searchQuery]);

  // Format display role
  const getRoleBadge = (role, email) => {
    const r = (role || "").toLowerCase();
    const e = (email || "").toLowerCase();
    if (r === "admin" || r === "president" || e.includes("chesszc") || e.includes("poussy.ayman")) {
      return { label: "👑 Admin", className: "role-admin" };
    }
    if (r.includes("vice") || r.includes("vp")) {
      return { label: "🎖️ Vice President", className: "role-vp" };
    }
    if (r.includes("trainer") || r.includes("coach")) {
      return { label: "♟️ Trainer", className: "role-trainer" };
    }
    if (r.includes("hr") || r.includes("pr") || r.includes("oc") || r.includes("multimedia")) {
      return { label: `✨ ${role.toUpperCase()}`, className: "role-committee" };
    }
    if (r === "guest") {
      return { label: "♟️ Guest Tactician", className: "role-guest" };
    }
    return { label: "♟️ Tactician", className: "role-member" };
  };

  const totalCount = onlineData.count || onlineData.users.length;

  return (
    <>
      {/* Floating Bottom-Right Presence Dock (Social Media Style) */}
      <div
        className={`online-presence-dock ${isOpen ? "active-dock" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="View Tacticians Online"
      >
        <div className="dock-pulse-indicator">
          <span className="pulse-dot"></span>
          <span className="pulse-ring"></span>
        </div>

        {/* Overlapping mini avatars */}
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

        <div className="dock-text-group">
          <span className="dock-count">
            {totalCount} {totalCount === 1 ? "Online" : "Online"}
          </span>
        </div>

        <span className="dock-expand-arrow">{isOpen ? "▾" : "▴"}</span>
      </div>

      {/* Expanded Social Online Drawer Modal */}
      {isOpen && (
        <div className="online-presence-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
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
                ✕
              </button>
            </div>

            <p className="drawer-subtitle">
              {totalCount} active {totalCount === 1 ? "member" : "members"} on ZC Chess Club right now
            </p>

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
                <span style={{ fontSize: "2rem" }}>♟️</span>
                <p>No tacticians match your search.</p>
              </div>
            ) : (
              <div className="online-users-list">
                {filteredUsers.map((u, idx) => {
                  const isSelf = userEmail && u.email && u.email.toLowerCase() === userEmail;
                  const roleObj = getRoleBadge(u.role, u.email);

                  return (
                    <div
                      key={u.id || idx}
                      className={`online-user-card ${isSelf ? "is-self" : ""}`}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="drawer-footer">
            <div className="drawer-footer-note">
              <span>🟢 Auto-refreshes every 15s</span>
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
