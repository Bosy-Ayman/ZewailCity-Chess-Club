import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./Tournaments.css"; 

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Tournaments() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null); // track which tournament's registrants are expanded
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
      case "ongoing":
        return "proceeding";
      case "upcoming":
        return "upcoming";
      case "completed":
        return "completed";
      default:
        return "";
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

  return (
    <div className="app-container">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="layout-container">
        <div className="content-wrapper">
          <div className="layout-content-container">
            {/* Page Header */}
            <div className="page-header-section">
              <div className="header-text-group">
                <p className="page-title">Tournaments</p>
                <p className="page-description">
                  Explore and join exciting chess tournaments happening now or soon.
                </p>
              </div>
            </div>

            {/* Table / Cards Section */}
            <div className="tournaments-table-section">
              {isLoading ? (
                <div className="tournaments-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading tournaments…</p>
                </div>
              ) : tournaments.length === 0 ? (
                <div className="tournaments-empty-state">
                  <div className="empty-icon">♟</div>
                  <p>No tournaments scheduled yet. Check back soon!</p>
                </div>
              ) : (
                <>
                  {/* DESKTOP TABLE */}
                  <div className="table-container tournaments-desktop-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Tournament Name</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Players</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournaments.map((t) => {
                          const isRegistered = userEmail && t.registrations?.some(r => r.email === userEmail);
                          const isExpanded = expandedRow === t._id;
                          const regCount = t.registrations?.length || 0;
                          const showReg = t.status === "Upcoming";
                          return (
                            <React.Fragment key={t._id}>
                              <tr>
                                <td style={{ fontWeight: "700", color: "#fff" }}>{t.title}</td>
                                <td>{t.type}</td>
                                <td>
                                  <span className={`status-button ${getStatusClass(t.status)}`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td>{t.startDate}</td>
                                <td>{t.endDate || "—"}</td>
                                <td>
                                  {showReg ? (
                                    <button
                                      className="reg-count-btn"
                                      onClick={() => toggleExpanded(t._id)}
                                      title="Show registered players"
                                    >
                                      👥 {regCount}
                                      <span className="reg-chevron">{isExpanded ? "▲" : "▼"}</span>
                                    </button>
                                  ) : (
                                    <span>👥 {t.players}</span>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <a href={`/tournamentdetails?id=${t._id}`} className="view-button">
                                      Details ➔
                                    </a>
                                    {t.status === "Upcoming" && (
                                      isRegistered ? (
                                        <span style={{ color: "#2ecc71", fontWeight: "bold", fontSize: "0.85rem", background: "rgba(46,204,113,0.12)", padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(46,204,113,0.3)" }}>
                                          ✓ Joined
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => handleJoinTournament(t._id)}
                                          className="view-button"
                                          style={{ background: "#f3c144", color: "#15120c", border: "none", fontWeight: "800" }}
                                        >
                                          ⚡ Join
                                        </button>
                                      )
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {/* Expanded registrants row */}
                              {showReg && isExpanded && (
                                <tr className="reg-expanded-row">
                                  <td colSpan={7}>
                                    <div className="reg-expanded-panel">
                                      <div className="reg-expanded-header">
                                        <span className="reg-expanded-title">
                                          🏆 Registered Players ({regCount})
                                        </span>
                                        <span className="reg-expanded-subtitle">
                                          These players have signed up for this upcoming tournament
                                        </span>
                                      </div>
                                      {renderRegistrantChips(t.registrations)}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS VIEW */}
                  <div className="tournaments-mobile-cards">
                    {tournaments.map((t) => {
                      const isRegistered = userEmail && t.registrations?.some(r => r.email === userEmail);
                      const isExpanded = expandedRow === t._id;
                      const regCount = t.registrations?.length || 0;
                      const showReg = t.status === "Upcoming";
                      return (
                        <div key={t._id} className="mobile-tournament-card">
                          <div className="mobile-card-header">
                            <span className={`status-button ${getStatusClass(t.status)}`}>
                              {t.status}
                            </span>
                            <span className="type-badge">{t.type}</span>
                          </div>
                          
                          <h3 className="mobile-card-title">{t.title}</h3>
                          
                          <div className="mobile-card-details">
                            <div className="detail-item">
                              <span className="detail-label">Start Date</span>
                              <span className="detail-val">{t.startDate}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">End Date</span>
                              <span className="detail-val">{t.endDate || "—"}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Players</span>
                              <span className="detail-val">👥 {regCount || t.players}</span>
                            </div>
                          </div>

                          {/* Registered players panel for Upcoming */}
                          {showReg && (
                            <div className="mobile-reg-section">
                              <button
                                className="mobile-reg-toggle"
                                onClick={() => toggleExpanded(t._id)}
                              >
                                <span>👥 {regCount} Registered Players</span>
                                <span>{isExpanded ? "▲" : "▼"}</span>
                              </button>
                              {isExpanded && (
                                <div className="mobile-reg-panel">
                                  {renderRegistrantChips(t.registrations)}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mobile-card-action" style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                            {t.status === "Upcoming" && (
                              isRegistered ? (
                                <div style={{ textAlign: "center", color: "#2ecc71", fontWeight: "bold", fontSize: "0.9rem", background: "rgba(46,204,113,0.12)", padding: "8px", borderRadius: "8px", border: "1px solid rgba(46,204,113,0.3)" }}>
                                  ✓ Registered for Tournament
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleJoinTournament(t._id)}
                                  className="view-button mobile-full-btn"
                                  style={{ background: "#f3c144", color: "#15120c", border: "none", fontWeight: "800" }}
                                >
                                  ⚡ Join Tournament Now
                                </button>
                              )
                            )}
                            <a href={`/tournamentdetails?id=${t._id}`} className="view-button mobile-full-btn" style={{ textAlign: "center" }}>
                              View Tournament Details ➔
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
