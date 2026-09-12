import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./Tournaments.css";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

export default function Tournaments() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [avatarMap, setAvatarMap] = useState({});

  const userEmail = localStorage.getItem("adminEmail");
  const isLoggedIn = !!localStorage.getItem("adminToken");

  // Fetch player avatars once
  useEffect(() => {
    fetch(`${API_BASE}/api/players/avatars`)
      .then(r => r.ok ? r.json() : {})
      .then(data => { if (data.avatars) setAvatarMap(data.avatars); })
      .catch(() => {});
  }, []);

  const fetchTournaments = () => {
    setIsLoading(true);
    fetch(`${API_BASE}/api/tournaments`)
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return [];
      })
      .then(data => {
        if (Array.isArray(data)) {
          setTournaments(data);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching tournaments:", err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleJoinTournament = async (tId) => {
    if (!isLoggedIn || !userEmail) {
      window.location.href = "/?login=true";
      return;
    }

    try {
      const userRes = await fetch(`${API_BASE}/api/profile?email=${userEmail}`);
      const userData = await userRes.json();
      const name = userData.name || userEmail.split("@")[0];

      const res = await fetch(`${API_BASE}/api/tournaments/${tId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register for tournament");

      alert("🎉 Successfully registered for " + (data.data?.title || "the tournament") + "!");
      fetchTournaments();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case "ongoing": return "proceeding";
      case "upcoming": return "upcoming";
      case "completed": return "completed";
      default: return "";
    }
  };

  const toggleExpanded = (tId) => {
    setExpandedRow(prev => (prev === tId ? null : tId));
  };

  // Render registered players chips
  const renderRegistrantChips = (registrations) => {
    if (!registrations || registrations.length === 0) {
      return (
        <div className="reg-empty">
          No players registered yet. Be the first to join!
        </div>
      );
    }
    return (
      <div className="reg-chips-grid">
        {registrations.map((reg, i) => {
          const avatar = avatarMap[reg.name] || avatarMap[reg.email] || null;
          const initials = reg.name
            ? reg.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
            : "?";
          return (
            <div className="reg-chip" key={i}>
              <div className="reg-chip-avatar">
                {avatar
                  ? <img src={avatar} alt={reg.name} className="reg-chip-img" />
                  : <span className="reg-chip-initials">{initials}</span>
                }
              </div>
              <span className="reg-chip-name">{reg.name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const liveCount = tournaments.filter(t => t.status === 'Ongoing').length;
  const upcomingCount = tournaments.filter(t => t.status === 'Upcoming').length;
  const completedCount = tournaments.filter(t => t.status === 'Completed').length;

  return (
    <div className="app-container">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="layout-container">
        <div className="content-wrapper">
          <div className="layout-content-container">

            {/* Page Header */}
            <div className="page-header-section">
              <div className="header-text-group">
                <p className="page-title site-page-title">Tournaments</p>
                <p className="page-description">
                  Explore and join exciting chess tournaments happening now or soon.
                </p>
              </div>
              <div className="page-header-stats">
                {liveCount > 0 && (
                  <div className="header-stat-pill pill-live">
                    <span className="header-stat-dot" />
                    <span>{liveCount} Live Now</span>
                  </div>
                )}
                <div className="header-stat-pill pill-upcoming">
                  <span>{upcomingCount} Upcoming</span>
                </div>
                <div className="header-stat-pill pill-completed">
                  <span>{completedCount} Completed</span>
                </div>
              </div>
            </div>

            {/* Card Grid Section */}
            <div className="tournaments-table-section">
              {isLoading ? (
                <div className="tournaments-loading site-loading-state">
                  <div className="loading-spinner site-loading-spinner"></div>
                  <p>Loading tournaments…</p>
                </div>
              ) : tournaments.length === 0 ? (
                <div className="tournaments-empty-state">
                  <div className="empty-icon">♟</div>
                  <p>No tournaments scheduled yet. Check back soon!</p>
                </div>
              ) : (
                <div className="tournaments-card-grid">
                  {tournaments.map((t) => {
                    const isRegistered = userEmail && t.registrations?.some(r => r.email === userEmail);
                    const isExpanded = expandedRow === t._id;
                    const regCount = t.registrations?.length || 0;
                    const showReg = t.status === "Upcoming";
                    const statusClass = getStatusClass(t.status);

                    // Color accent per format type
                    const accentColor = t.type?.includes('Swiss')
                      ? '#16a34a'
                      : t.type?.includes('Double')
                        ? '#ea580c'
                        : '#7c3aed';

                    const formatIcon = t.type?.includes('Swiss') ? '⚔️' : t.type?.includes('Double') ? '⚡' : '🏹';

                    return (
                      <div key={t._id} className={`t-card t-card--${statusClass}`} style={{ '--accent': accentColor }}>
                        {/* Card Top Banner */}
                        <div className="t-card-banner">
                          <div className="t-card-banner-left">
                            <span className={`t-status-pill t-status-pill--${statusClass}`}>
                              {t.status === 'Ongoing' ? '🟢 LIVE' : t.status === 'Upcoming' ? '🕜 Upcoming' : '✓ Completed'}
                            </span>
                            <span className="t-format-badge">{formatIcon} {t.type || 'Swiss'}</span>
                          </div>
                          {t.status === 'Ongoing' && (
                            <span className="t-live-pulse">
                              <span className="t-live-dot" />
                              Live
                            </span>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="t-card-body">
                          <h3 className="t-card-title">{t.title}</h3>

                          <div className="t-card-meta-row">
                            <div className="t-meta-item">
                              <span className="t-meta-icon">📅</span>
                              <div className="t-meta-texts">
                                <span className="t-meta-label">Start</span>
                                <span className="t-meta-val">{t.startDate || '—'}</span>
                              </div>
                            </div>
                            {t.endDate && t.endDate !== 'Unknown' && (
                              <div className="t-meta-item">
                                <span className="t-meta-icon">🏁</span>
                                <div className="t-meta-texts">
                                  <span className="t-meta-label">End</span>
                                  <span className="t-meta-val">{t.endDate}</span>
                                </div>
                              </div>
                            )}
                            <div className="t-meta-item">
                              <span className="t-meta-icon">👥</span>
                              <div className="t-meta-texts">
                                <span className="t-meta-label">Players</span>
                                <span className="t-meta-val">
                                  {showReg ? `${regCount} Registered` : (t.players || regCount || '—')}
                                </span>
                              </div>
                            </div>
                            {t.location && (
                              <div className="t-meta-item">
                                <span className="t-meta-icon">📍</span>
                                <div className="t-meta-texts">
                                  <span className="t-meta-label">Venue</span>
                                  <span className="t-meta-val">{t.location}</span>
                                </div>
                              </div>
                            )}
                            {t.time && (
                              <div className="t-meta-item">
                                <span className="t-meta-icon">⏱️</span>
                                <div className="t-meta-texts">
                                  <span className="t-meta-label">Time</span>
                                  <span className="t-meta-val">{t.time}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Description snippet */}
                          {t.description && (
                            <p className="t-card-desc">{t.description.slice(0, 90)}{t.description.length > 90 ? '…' : ''}</p>
                          )}

                          {/* Registrant Avatar Stack */}
                          {showReg && regCount > 0 && (
                            <>
                              <button
                                className="t-registrants-toggle"
                                onClick={() => toggleExpanded(t._id)}
                              >
                                <div className="t-avatar-stack">
                                  {(t.registrations || []).slice(0, 5).map((reg, i) => {
                                    const av = avatarMap[reg.name] || avatarMap[reg.email] || null;
                                    const ini = reg.name ? reg.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
                                    return (
                                      <div key={i} className="t-avatar-chip" style={{ zIndex: 10 - i }}>
                                        {av ? <img src={av} alt={reg.name} /> : <span>{ini}</span>}
                                      </div>
                                    );
                                  })}
                                  {regCount > 5 && <div className="t-avatar-chip t-avatar-more">+{regCount - 5}</div>}
                                </div>
                                <span className="t-reg-label">{regCount} Registered {isExpanded ? '▲' : '▼'}</span>
                              </button>

                              {isExpanded && (
                                <div className="t-registrants-expanded">
                                  {renderRegistrantChips(t.registrations)}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Card Footer Actions */}
                        <div className="t-card-footer">
                          <a href={`/tournamentdetails?id=${t._id}`} className="t-btn-details">
                            View Details ➜
                          </a>
                          {t.status === 'Upcoming' && (
                            isRegistered ? (
                              <span className="t-btn-joined">✓ Joined</span>
                            ) : (
                              <button
                                onClick={() => handleJoinTournament(t._id)}
                                className="t-btn-join"
                              >
                                ⚡ Join
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
