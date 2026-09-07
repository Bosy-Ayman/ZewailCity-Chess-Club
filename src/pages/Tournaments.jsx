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

  const userEmail = localStorage.getItem("adminEmail");
  const isLoggedIn = !!localStorage.getItem("adminToken");

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
                          return (
                            <tr key={t._id}>
                              <td style={{ fontWeight: "700", color: "#fff" }}>{t.title}</td>
                              <td>{t.type}</td>
                              <td>
                                <span className={`status-button ${getStatusClass(t.status)}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td>{t.startDate}</td>
                              <td>{t.endDate || "—"}</td>
                              <td>👥 {t.players}</td>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS VIEW */}
                  <div className="tournaments-mobile-cards">
                    {tournaments.map((t) => {
                      const isRegistered = userEmail && t.registrations?.some(r => r.email === userEmail);
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
                              <span className="detail-val">👥 {t.players}</span>
                            </div>
                          </div>

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
