import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { safeFetchJson } from "../utils/api";
import "./Profile.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Profile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [profile, setProfile] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const email = localStorage.getItem("adminEmail");

  useEffect(() => {
    if (!email) {
      window.location.href = "/?login=true";
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Profile
      const profData = await safeFetchJson(`${API_BASE}/api/profile?email=${email}`);
      setProfile(profData);

      // Fetch User's Tournaments
      try {
        const tourData = await safeFetchJson(`${API_BASE}/api/users/${email}/tournaments`);
        setTournaments(tourData || []);
      } catch (tErr) {
        setTournaments([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Image must be smaller than 8MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result;
      try {
        const data = await safeFetchJson(`${API_BASE}/api/profile/image`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: profile?.email || email, profileImage: base64Image })
        });
        
        setProfile(prev => ({ ...prev, profileImage: data?.profileImage || base64Image }));
        alert("Profile image updated successfully!");
      } catch (err) {
        alert("Error updating profile image: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLeaveTournament = async (tournamentId) => {
    if (!profile) return;
    if (!window.confirm("Are you sure you want to leave this tournament?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, name: profile.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to leave tournament");
      alert("Successfully left the tournament!");
      fetchData(); // Refresh lists
    } catch (err) {
      alert(err.message);
    }
  };

  const renderMatches = (tournament) => {
    if (!profile) return null;
    const myMatches = tournament.matches?.filter(
      (m) => m.white === profile.name || m.black === profile.name
    );

    if (!myMatches || myMatches.length === 0) {
      return <p className="no-matches">No matches scheduled for you yet.</p>;
    }

    return (
      <div className="matches-list">
        <h4>Your Matches:</h4>
        {myMatches.map((match, idx) => (
          <div key={idx} className="match-card">
            <span className="match-round">Round {match.round}</span>
            <div className="match-players">
              <span className={match.white === profile.name ? "highlight" : ""}>
                ♔ {match.white}
              </span>
              <span className="vs">VS</span>
              <span className={match.black === profile.name ? "highlight" : ""}>
                ♚ {match.black}
              </span>
            </div>
            <div className="match-result">Result: {match.result}</div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) return (
    <div className="profile">
      <div className="page-loading">
        <div className="loading-spinner lg"></div>
        <p>Loading your profile…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="profile">
      <div className="page-error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="profile">
      <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      
      <main className="profile-wrapper profile-main" style={{ minHeight: "100vh" }}>
        <h1 className="section-title">My Dashboard</h1>

        {profile && (
          <section className="profile-top-info" style={{ flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
            <div className="profile-user">
              <div style={{ position: "relative" }}>
                <label htmlFor="profileImageUpload" className="profile-image-upload-label">
                  <div className="profile-user-img" style={{ backgroundImage: `url("${profile.profileImage || '/Icons/user.jpg'}")` }}>
                    <div className="profile-img-overlay">
                      <span>📷</span>
                    </div>
                  </div>
                </label>
                <input 
                  type="file" 
                  id="profileImageUpload" 
                  accept="image/*" 
                  style={{ display: "none" }} 
                  onChange={handleImageUpload}
                />
              </div>
              <div>
                <p className="user-name">{profile.name}</p>
                <p className="user-joined">Role: {(profile.role || 'member').toUpperCase()}</p>
              </div>
            </div>
            
            <div className="profile-details-grid">
              <div className="profile-detail-card">
                <span className="profile-detail-label">Email</span>
                <span className="profile-detail-value">{profile.email}</span>
              </div>
              <div className="profile-detail-card">
                <span className="profile-detail-label">Student ID</span>
                <span className="profile-detail-value">{profile.idNumber || "N/A"}</span>
              </div>
              <div className="profile-detail-card">
                <span className="profile-detail-label">Major</span>
                <span className="profile-detail-value">{profile.major || "N/A"}</span>
              </div>
              <div className="profile-detail-card">
                <span className="profile-detail-label">Phone</span>
                <span className="profile-detail-value">{profile.phone || "N/A"}</span>
              </div>
            </div>
          </section>
        )}

        <section className="dashboard-section">
          <h3 className="section-title">My Tournaments</h3>
          {tournaments.length === 0 ? (
            <p style={{ color: "var(--light-text)" }}>You haven't joined any tournaments yet.</p>
          ) : (
            <div className="tournament-grid-dashboard">
              {tournaments.map((t) => {
                const reg = t.registrations?.find((r) => r.email === email);
                const isPlayer = t.playersList?.some((p) => p.name === profile?.name);
                
                let status = "Pending";
                if (isPlayer) status = "Approved (Playing)";
                else if (reg) status = reg.status;

                return (
                  <div key={t._id} className="tournament-card-dashboard">
                    <div className="t-header">
                      <h3 className="t-title">{t.title}</h3>
                      <span className="t-status">{status}</span>
                    </div>
                    <div className="t-info-row">
                      <span className="t-info-text"><strong>Date:</strong> {t.startDate}</span>
                      <span className="t-info-text"><strong>Location:</strong> {t.location}</span>
                    </div>
                    {isPlayer && renderMatches(t)}
                    {t.status === "Upcoming" && (
                      <button 
                        onClick={() => handleLeaveTournament(t._id)}
                        className="btn-primary"
                        style={{ marginTop: "12px", background: "rgba(220, 53, 69, 0.15)", color: "#ff6b6b", border: "1px solid #ff6b6b" }}
                      >
                        Leave Tournament
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-section" style={{ marginBottom: "50px" }}>
          <div className="explore-tournaments-banner" style={{ background: "rgba(28, 25, 18, 0.85)", border: "1px solid rgba(243, 193, 68, 0.25)", borderRadius: "16px", padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ color: "#fff", margin: "0 0 8px 0", fontSize: "1.3rem", fontWeight: "800" }}>🏆 Explore & Join Championships</h3>
              <p style={{ color: "#b5afa1", margin: 0, fontSize: "0.95rem", maxWidth: "600px" }}>
                Browse our active schedule of Swiss & Knockout tournaments, view match pairings, check standings, and register directly from the official Tournaments Hub!
              </p>
            </div>
            <a 
              href="/tournaments" 
              className="btn-primary" 
              style={{ background: "#f3c144", color: "#15120c", padding: "12px 24px", borderRadius: "10px", fontWeight: "800", textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Go to Tournaments Page ➔
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
