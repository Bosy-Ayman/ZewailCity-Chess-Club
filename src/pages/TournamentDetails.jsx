import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChallongeBracket from "../components/ChallongeBracket";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import './TournamentDetails.css';

export default function TournamentDetails() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("bracket"); // "bracket" or "table"
  const [celebrationModalOpen, setCelebrationModalOpen] = useState(false);
  const { width, height } = useWindowSize();

  // Check role
  const userRole = localStorage.getItem("userRole") || "member";
  const isLoggedIn = !!localStorage.getItem("adminToken");
  const isStaff = isLoggedIn && (userRole === "admin" || userRole === "oc");

  // Parse ID
  const queryParams = new URLSearchParams(window.location.search);
  const tournamentId = queryParams.get("id");

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const fetchTournamentDetails = async () => {
    if (!tournamentId) {
      setError("No tournament selected.");
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}`);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("Could not connect to backend server on port 5000."); }
      if (!res.ok) throw new Error(data.error || "Tournament not found");
      setTournament(data);
      if (data.type === "Swiss") {
        setViewMode("table");
      } else {
        setViewMode("bracket");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  // Modals state
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [playerForm, setPlayerForm] = useState({ name: "", rating: "", major: "" });

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchForm, setMatchForm] = useState({ round: 1, white: "", black: "", result: "1-0" });

  const handleAddPlayerSubmit = async (e) => {
    e.preventDefault();
    if (!playerForm.name || !playerForm.rating || !playerForm.major) {
      alert("All fields are required.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/players`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playerForm)
      });
      const text = await res.text();
      let result;
      try { result = JSON.parse(text); } catch (e) { throw new Error("Could not parse server response."); }
      if (!res.ok) {
        throw new Error(result.error || "Failed to add player.");
      }
      setPlayerForm({ name: "", rating: "", major: "" });
      setPlayerModalOpen(false);
      fetchTournamentDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddMatchSubmit = async (e) => {
    e.preventDefault();
    if (!matchForm.white || !matchForm.black) {
      alert("Please fill in both player names.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/matches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matchForm)
      });
      const text = await res.text();
      let result;
      try { result = JSON.parse(text); } catch (e) { throw new Error("Could not parse server response."); }
      if (!res.ok) {
        throw new Error(result.error || "Failed to add match result.");
      }
      setMatchForm({ round: matchForm.round, white: "", black: "", result: "1-0" });
      setMatchModalOpen(false);
      fetchTournamentDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateMatch = async (matchId, updateData) => {
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("Invalid response from server"); }
      if (!res.ok) throw new Error(data.error || "Failed to update match");
      fetchTournamentDetails();
    } catch (err) {
      alert("Error updating match: " + err.message);
    }
  };

  const handleGenerateNextRound = async () => {
    // Check for pending matches in frontend first
    const pendingMatches = (tournament?.matches || []).filter(m => !m.result || m.result === "Pending");
    if (pendingMatches.length > 0) {
      alert(`⚠️ Cannot generate next round! There are still ${pendingMatches.length} pending match(es) in the current round. Please select all match results first.`);
      return;
    }

    // Enforce minimum players requirement for Swiss tournaments before the first round starts
    const isFirstRound = !tournament?.matches || tournament.matches.length === 0;
    const minPlayersRequired = tournament?.rounds ? tournament.rounds + 1 : 2;
    if (isFirstRound && (tournament?.playersList?.length || 0) < minPlayersRequired) {
      alert(`⚠️ Not enough players! A ${tournament.rounds}-round Swiss tournament requires at least ${minPlayersRequired} players to begin. Currently registered: ${tournament?.playersList?.length || 0}`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/generate-swiss-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("Invalid response from server. Check backend terminal on port 5000."); }
      if (!res.ok) throw new Error(data.error || "Failed to generate Swiss pairings");
      alert(data.message || "Next round pairings generated!");
      fetchTournamentDetails();
    } catch (err) {
      alert("Error generating pairings: " + err.message);
    }
  };

  const handleGenerateKnockoutBracket = async (shuffle = false) => {
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/generate-knockout-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shuffle })
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("Invalid response from server."); }
      if (!res.ok) throw new Error(data.error || "Failed to generate bracket");
      alert(data.message || "Knockout bracket generated successfully!");
      fetchTournamentDetails();
    } catch (err) {
      alert("Error generating bracket: " + err.message);
    }
  };

  const handleGenerateNextKnockoutRound = async () => {
    const pendingMatches = (tournament?.matches || []).filter(m => !m.result || m.result === "Pending");
    if (pendingMatches.length > 0) {
      alert(`⚠️ Cannot generate next round! There are still ${pendingMatches.length} pending match(es) in the current round. Please score all matches first.`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/generate-knockout-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("Invalid response from server."); }
      if (!res.ok) throw new Error(data.error || "Failed to generate next round");
      alert(data.message || "Next round matchups generated successfully!");
      fetchTournamentDetails();
    } catch (err) {
      alert("Error generating next round: " + err.message);
    }
  };

  const handleRollbackLastRound = async () => {
    if (!window.confirm("⚠️ Are you sure you want to rollback the last round? This will permanently delete all pairings and scores for the latest round!")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/rounds/last`, {
        method: "DELETE"
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("Invalid response from server."); }
      if (!res.ok) throw new Error(data.error || "Failed to rollback round");
      alert(data.message || "Last round rolled back successfully!");
      fetchTournamentDetails();
    } catch (err) {
      alert("Error rolling back round: " + err.message);
    }
  };

  const handleRemovePlayer = async (playerName) => {
    if (!window.confirm(`⚠️ Are you sure you want to remove player "${playerName}" from this tournament? They will be removed from standing lists and will not be paired in future rounds.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/players/${encodeURIComponent(playerName)}`, {
        method: "DELETE"
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("Invalid response from server."); }
      if (!res.ok) throw new Error(data.error || "Failed to remove player");
      alert(data.message || "Player removed successfully!");
      fetchTournamentDetails();
    } catch (err) {
      alert("Error removing player: " + err.message);
    }
  };

  const handleUpdateTournamentStatus = async (newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update tournament status");
      alert(`Tournament status updated to "${newStatus}"!`);
      fetchTournamentDetails();
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  };

  // Calculate Swiss Standings from live database matches (FIDE rules)
  const calculateSwissStandings = (players = [], matches = []) => {
    const statsMap = {};
    players.forEach((p) => {
      statsMap[p.name] = {
        name: p.name,
        rating: p.rating || 1500,
        major: p.major || "-",
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        byes: 0,
        points: 0
      };
    });

    matches.forEach((m) => {
      const white = m.white;
      const black = m.black;
      const isWhiteBye = black === "BYE";

      if (!statsMap[white]) statsMap[white] = { name: white, rating: 1500, major: "-", played: 0, wins: 0, draws: 0, losses: 0, byes: 0, points: 0 };

      if (isWhiteBye) {
        // BYE: full point, doesn't count as a played game in W-D-L
        statsMap[white].byes += 1;
        statsMap[white].points += 1;
        return;
      }

      if (!statsMap[black]) statsMap[black] = { name: black, rating: 1500, major: "-", played: 0, wins: 0, draws: 0, losses: 0, byes: 0, points: 0 };

      statsMap[white].played += 1;
      statsMap[black].played += 1;

      if (m.result === "1-0" || m.result === "1 - 0") {
        statsMap[white].wins += 1;
        statsMap[white].points += 1;
        statsMap[black].losses += 1;
      } else if (m.result === "0-1" || m.result === "0 - 1") {
        statsMap[black].wins += 1;
        statsMap[black].points += 1;
        statsMap[white].losses += 1;
      } else if (m.result === "1/2-1/2" || m.result === "½ - ½" || m.result === "Draw") {
        statsMap[white].draws += 1;
        statsMap[white].points += 0.5;
        statsMap[black].draws += 1;
        statsMap[black].points += 0.5;
      }
    });

    return Object.values(statsMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.rating - a.rating;
    });
  };

  const isSwissFormat = tournament?.type === "Swiss";
  const swissStandings = isSwissFormat ? calculateSwissStandings(tournament?.playersList, tournament?.matches) : [];

  // Group matches by Round for Swiss Round-by-Round display
  const matchesByRound = {};
  if (tournament?.matches) {
    tournament.matches.forEach((m) => {
      const r = m.round || 1;
      if (!matchesByRound[r]) matchesByRound[r] = [];
      matchesByRound[r].push(m);
    });
  }
  const sortedRounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
  const maxCurrentRound = sortedRounds.length > 0 ? Math.max(...sortedRounds) : 0;
  const nextRoundNum = maxCurrentRound + 1;

  return (
    <div className="tournament-wrapper">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="layout-container">
        <div className="main-content">
          {isLoading ? (
            <div className="details-loading-container">
              <div className="spinner-ring"></div>
              <span>Loading tournament details...</span>
            </div>
          ) : error || !tournament ? (
            <div style={{ color: "#e74c3c", textAlign: "center", padding: "50px", fontSize: "1.2rem" }}>
              {error || "Could not retrieve tournament details. Please verify the URL."}
            </div>
          ) : (
            <>
              {/* Intro Banner */}
              <div className="intro-text">
                <h1>{tournament.title}</h1>
                <p>
                  {tournament.startDate} {tournament.endDate && tournament.endDate !== 'Unknown' ? `to ${tournament.endDate}` : ""} — {tournament.location} ({tournament.type})
                </p>
                {tournament.description && (
                  <p style={{ marginTop: "12px", color: "#bab19c", fontStyle: "italic", fontSize: "15px", maxWidth: "800px", lineHeight: "1.5" }}>
                    {tournament.description}
                  </p>
                )}
              </div>

              {/* Tournament Progress Box */}
              {(() => {
                const currentStatus = tournament.status || "Upcoming";
                let progressPct = 0;
                let progressMsg = "";
                let badgeColor = "#3498db";

                if (currentStatus === "Completed") {
                  progressPct = 100;
                  progressMsg = "Tournament Finished (100% Completed)";
                  badgeColor = "#2ecc71";
                } else if (currentStatus === "Ongoing") {
                  const totalRounds = tournament.rounds || 5;
                  const matches = tournament.matches || [];
                  const maxRound = matches.reduce((max, m) => Math.max(max, m.round || 1), 1);
                  const completedMatches = matches.filter(m => m.result && m.result !== "Pending");

                  if (isSwissFormat) {
                    progressPct = Math.min(Math.round((maxRound / totalRounds) * 100), 90);
                    progressMsg = `Round ${maxRound} of ${totalRounds} in Progress (${progressPct}% Completed)`;
                  } else {
                    progressPct = matches.length > 0 ? Math.min(Math.round((completedMatches.length / matches.length) * 100), 90) : 30;
                    progressMsg = `Knockout Bracket Ongoing (${progressPct}% Completed)`;
                  }
                  badgeColor = "#f3c144";
                } else {
                  // Upcoming
                  progressPct = 0;
                  progressMsg = `Registration Open — Starts ${tournament.startDate || "Soon"} (0% Completed)`;
                  badgeColor = "#3498db";
                }

                return (
                  <>
                    <h2 className="section-title">Tournament Progress</h2>
                    <div className="role-card" style={{ padding: "20px 24px", background: "#1f1d18", border: `1px solid ${badgeColor}` }}>
                      <div className="role-info" style={{ width: "100%" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "#fff" }}>
                            Status: <span style={{ color: badgeColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>{currentStatus}</span>
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "#caba91", fontWeight: "600" }}>
                            {progressMsg}
                          </span>
                        </div>

                        <div className="progress-bar-bg" style={{ height: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "6px", overflow: "hidden", marginTop: "8px" }}>
                          <div 
                            className="progress-bar-fill" 
                            style={{ 
                              width: `${progressPct}%`,
                              background: badgeColor === "#2ecc71" ? "#2ecc71" : badgeColor === "#f3c144" ? "linear-gradient(90deg, #f3c144, #e2b033)" : "#3498db",
                              height: "100%",
                              transition: "width 0.5s ease"
                            }}
                          ></div>
                        </div>

                        <div style={{ display: "flex", gap: "20px", marginTop: "12px", fontSize: "0.88rem", color: "#b5afa1", flexWrap: "wrap" }}>
                          <span>⏰ <strong>Time:</strong> {tournament.time || "TBD"}</span>
                          <span>👥 <strong>Participants:</strong> {tournament.playersList?.length || tournament.players || 0} Registered</span>
                          {isSwissFormat && <span>📋 <strong>Rounds:</strong> {tournament.rounds || 5} Total Rounds</span>}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Staff controls for OC and Admins */}
              {isStaff && (
                <div style={{ marginTop: "30px" }}>
                  <h2 className="section-title">Staff Actions (Organizing Committee)</h2>
                  <div className="staff-actions" style={{ gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#15120c", padding: "8px 14px", borderRadius: "8px", border: "1px solid #f3c144" }}>
                      <span style={{ color: "#f3c144", fontWeight: "bold", fontSize: "0.85rem" }}>Update Status:</span>
                      <select
                        value={tournament.status || "Upcoming"}
                        onChange={(e) => handleUpdateTournamentStatus(e.target.value)}
                        style={{ background: "transparent", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer", outline: "none" }}
                      >
                        <option value="Upcoming" style={{ background: "#15120c" }}>Upcoming (Registration Open)</option>
                        <option value="Ongoing" style={{ background: "#15120c" }}>Ongoing (Tournament Live)</option>
                        <option value="Completed" style={{ background: "#15120c" }}>Completed (Finished)</option>
                      </select>
                    </div>

                    <button className="add-btn" onClick={() => setPlayerModalOpen(true)}>
                      + Add Participant
                    </button>
                    
                    {/* Add Match Pairing only makes sense for Knockout if no bracket is generated yet */}
                    {!isSwissFormat && (!tournament.matches || tournament.matches.length === 0) && (
                      <button className="add-btn" onClick={() => setMatchModalOpen(true)}>
                        + Add Manual Matchup
                      </button>
                    )}

                    {/* Bracket Generation buttons for Knockout */}
                    {!isSwissFormat && (!tournament.matches || tournament.matches.length === 0) && (
                      <button 
                        className="add-btn" 
                        onClick={() => handleGenerateKnockoutBracket(false)}
                        style={{ background: "linear-gradient(135deg, #f3c144, #d4a32a)", color: "#15120c", fontWeight: "800" }}
                      >
                        ⚡ Generate Seeded Bracket
                      </button>
                    )}
                    {!isSwissFormat && (!tournament.matches || tournament.matches.length === 0) && (
                      <button 
                        className="add-btn" 
                        onClick={() => handleGenerateKnockoutBracket(true)}
                        style={{ background: "linear-gradient(135deg, #bab19c, #8c8575)", color: "#15120c", fontWeight: "800" }}
                      >
                        🎲 Generate Random Bracket
                      </button>
                    )}

                    {/* Advance to next round for Knockout */}
                    {!isSwissFormat && tournament.matches && tournament.matches.length > 0 && (
                      <button 
                        className="add-btn" 
                        onClick={handleGenerateNextKnockoutRound}
                        style={{ background: "linear-gradient(135deg, #f3c144, #d4a32a)", color: "#15120c", fontWeight: "800" }}
                      >
                        ⚡ Generate Next Round Pairings ➔
                      </button>
                    )}

                    {/* Swiss pairings generation */}
                    {isSwissFormat && (
                      <button 
                        className="add-btn" 
                        onClick={handleGenerateNextRound}
                        style={{ background: "linear-gradient(135deg, #f3c144, #d4a32a)", color: "#15120c", fontWeight: "800" }}
                      >
                        ⚡ Generate Round {nextRoundNum} Pairings
                      </button>
                    )}

                    {/* Rollback Last Round button (only visible if tournament has matches) */}
                    {tournament.matches && tournament.matches.length > 0 && (
                      <button 
                        className="add-btn" 
                        onClick={handleRollbackLastRound}
                        style={{ background: "linear-gradient(135deg, #d9534f, #c9302c)", color: "#fff", fontWeight: "800" }}
                      >
                        ↩ Rollback Last Round
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* SWISS FORMAT SPECIFIC DISPLAY */}
              {isSwissFormat ? (
                <>
                  {/* Swiss Standings Table & Mobile Cards */}
                  <h2 className="section-title">🏆 Swiss System Standings (Live Table)</h2>
                  
                  {/* Desktop Table View */}
                  <div className="application-table-wrapper tournaments-desktop-table" style={{ marginBottom: "40px" }}>
                    <table className="application-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Player Name</th>
                          <th>Points</th>
                          <th>Record (W-D-L)</th>
                          <th>Played</th>
                          <th>Byes</th>
                          <th>Rating</th>
                          <th>Major</th>
                          {isStaff && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {swissStandings.map((p, idx) => (
                          <tr key={idx} style={{ background: idx === 0 ? "rgba(243, 193, 68, 0.08)" : "transparent" }}>
                            <td style={{ fontWeight: "bold", color: idx === 0 ? "#f3c144" : idx === 1 ? "#d0d0d0" : idx === 2 ? "#cd7f32" : "#e8e8e8" }}>
                              {idx === 0 ? "🥇 1st" : idx === 1 ? "🥈 2nd" : idx === 2 ? "🥉 3rd" : `#${idx + 1}`}
                            </td>
                            <td style={{ fontWeight: "600", color: "#fff" }}>{p.name}</td>
                            <td style={{ color: "#f3c144", fontWeight: "800", fontSize: "1.05rem" }}>{p.points} pts</td>
                            <td style={{ color: "#bab19c" }}>{p.wins}W - {p.draws}D - {p.losses}L</td>
                            <td>{p.played}</td>
                            <td>{p.byes > 0 ? <span style={{ color: "#f3c144", fontWeight: "bold" }}>{p.byes} BYE</span> : "—"}</td>
                            <td>{p.rating}</td>
                            <td>{p.major}</td>
                            {isStaff && (
                              <td>
                                <button
                                  onClick={() => handleRemovePlayer(p.name)}
                                  style={{
                                    background: "rgba(217, 83, 79, 0.15)",
                                    color: "#d9534f",
                                    border: "1px solid #d9534f",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                  }}
                                >
                                  Remove
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Standings Cards View */}
                  <div className="tournaments-mobile-cards" style={{ marginBottom: "40px" }}>
                    {swissStandings.map((p, idx) => (
                      <div key={idx} className="mobile-tournament-card" style={{ borderColor: idx === 0 ? "rgba(243, 193, 68, 0.5)" : "rgba(57, 52, 40, 0.6)" }}>
                        <div className="mobile-card-header">
                          <span style={{ fontWeight: "bold", fontSize: "0.95rem", color: idx === 0 ? "#f3c144" : idx === 1 ? "#d0d0d0" : idx === 2 ? "#cd7f32" : "#e8e8e8" }}>
                            {idx === 0 ? "🥇 1st Rank" : idx === 1 ? "🥈 2nd Rank" : idx === 2 ? "🥉 3rd Rank" : `#${idx + 1} Rank`}
                          </span>
                          <span style={{ color: "#f3c144", fontWeight: "800", fontSize: "1.1rem" }}>{p.points} pts</span>
                        </div>

                        <h3 className="mobile-card-title">{p.name}</h3>

                        <div className="mobile-card-details">
                          <div className="detail-item">
                            <span className="detail-label">Record</span>
                            <span className="detail-val">{p.wins}W - {p.draws}D - {p.losses}L</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Played</span>
                            <span className="detail-val">{p.played}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Rating</span>
                            <span className="detail-val">{p.rating}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Major</span>
                            <span className="detail-val">{p.major}</span>
                          </div>
                          {p.byes > 0 && (
                            <div className="detail-item">
                              <span className="detail-label">Byes</span>
                              <span className="detail-val" style={{ color: "#f3c144" }}>{p.byes} BYE</span>
                            </div>
                          )}
                        </div>

                        {isStaff && (
                          <button
                            onClick={() => handleRemovePlayer(p.name)}
                            className="mobile-full-btn"
                            style={{
                              background: "rgba(217, 83, 79, 0.15)",
                              color: "#d9534f",
                              border: "1px solid #d9534f",
                              borderRadius: "8px",
                              fontWeight: "bold"
                            }}
                          >
                            Remove Participant
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Swiss Round-by-Round Results */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: "15px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      <h2 className="section-title" style={{ margin: 0 }}>🗓️ Round-by-Round Pairings & Results</h2>
                      {tournament?.rounds > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <span style={{ fontSize: "0.78rem", color: "#888" }}>
                            Round{" "}
                            <strong style={{ color: "#f3c144" }}>{sortedRounds.length}</strong>
                            {" "}of{" "}
                            <strong style={{ color: "#f3c144" }}>{tournament.rounds}</strong>
                            {" "}played
                          </span>
                          <div style={{ width: "120px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min((sortedRounds.length / tournament.rounds) * 100, 100)}%`, background: "linear-gradient(90deg, #f3c144, #d4a32a)", borderRadius: "2px", transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      )}
                    </div>
                    {isStaff && (
                      tournament?.rounds > 0 && sortedRounds.length >= tournament.rounds ? (
                        <button 
                          onClick={() => setCelebrationModalOpen(true)}
                          style={{
                            background: "linear-gradient(135deg, #4dbd74, #28a745)",
                            color: "#fff",
                            border: "none",
                            padding: "8px 18px",
                            borderRadius: "8px",
                            fontWeight: "800",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            boxShadow: "0 4px 12px rgba(77, 189, 116, 0.25)"
                          }}
                        >
                          🎉 Finish Tournament & Show Winners
                        </button>
                      ) : (
                        <button 
                          onClick={handleGenerateNextRound}
                          style={{
                            background: "linear-gradient(135deg, #f3c144, #d4a32a)",
                            color: "#15120c",
                            border: "none",
                            padding: "8px 18px",
                            borderRadius: "8px",
                            fontWeight: "800",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            boxShadow: "0 4px 12px rgba(243, 193, 68, 0.25)"
                          }}
                        >
                          ⚡ Generate Round {nextRoundNum} Pairings ➔
                        </button>
                      )
                    )}
                  </div>

                  {sortedRounds.length === 0 ? (
                    <p style={{ color: "#888", fontStyle: "italic", margin: "10px 0 30px" }}>No round results recorded yet.</p>
                  ) : (
                    sortedRounds.map((rNum) => (
                      <div key={rNum} style={{ marginBottom: "28px" }}>
                        <h3 style={{ color: "#f3c144", fontSize: "1.1rem", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Round {rNum} Pairings & Results
                        </h3>
                        {/* Desktop Table View */}
                        <div className="application-table-wrapper tournaments-desktop-table">
                          <table className="application-table">
                            <thead>
                              <tr>
                                <th>Board</th>
                                <th>White Player</th>
                                <th>Result / Toggle (Staff)</th>
                                <th>Black Player</th>
                              </tr>
                            </thead>
                            <tbody>
                              {matchesByRound[rNum].map((m, idx) => {
                                const isByeRow = m.black === "BYE";
                                return (
                                  <tr key={m._id || idx} style={{ background: isByeRow ? "rgba(243,193,68,0.05)" : "transparent", opacity: isByeRow ? 0.8 : 1 }}>
                                    <td style={{ color: "#888" }}>Board {idx + 1}</td>
                                    <td style={{ fontWeight: (m.result === "1-0" || m.result === "1 - 0") ? "bold" : "normal", color: (m.result === "1-0" || m.result === "1 - 0") ? "#f3c144" : "#fff" }}>
                                      {m.white} {!isByeRow && (m.result === "1-0" || m.result === "1 - 0") ? "✓" : ""}
                                    </td>
                                    <td>
                                      {isByeRow ? (
                                        <span style={{ color: "#f3c144", fontWeight: "bold", fontSize: "0.9rem", background: "rgba(243,193,68,0.12)", padding: "2px 8px", borderRadius: "4px" }}>
                                          BYE (+1 pt)
                                        </span>
                                      ) : isStaff && m._id ? (
                                        <select
                                          value={m.result}
                                          onChange={(e) => handleUpdateMatch(m._id, { result: e.target.value })}
                                          style={{ background: "#15120c", color: "#f3c144", border: "1px solid #f3c144", padding: "4px 10px", borderRadius: "6px", fontWeight: "800", fontSize: "0.88rem", cursor: "pointer" }}
                                        >
                                          <option value="1-0">1 - 0 (White Wins)</option>
                                          <option value="0-1">0 - 1 (Black Wins)</option>
                                          <option value="1/2-1/2">½ - ½ (Draw)</option>
                                          <option value="Pending">Pending</option>
                                        </select>
                                      ) : (
                                        <span style={{ color: "#f4c653", fontWeight: "bold", fontSize: "1rem" }}>{m.result}</span>
                                      )}
                                    </td>
                                    <td style={{ fontWeight: (m.result === "0-1" || m.result === "0 - 1") ? "bold" : "normal", color: (m.result === "0-1" || m.result === "0 - 1") ? "#f3c144" : isByeRow ? "#888" : "#fff" }}>
                                      {isByeRow ? <em>— BYE —</em> : `${m.black} ${(m.result === "0-1" || m.result === "0 - 1") ? "✓" : ""}`}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Match Cards View */}
                        <div className="tournaments-mobile-cards">
                          {matchesByRound[rNum].map((m, idx) => {
                            const isByeRow = m.black === "BYE";
                            return (
                              <div key={m._id || idx} className="mobile-tournament-card" style={{ padding: "14px" }}>
                                <div className="mobile-card-header">
                                  <span style={{ fontSize: "0.78rem", color: "#888", fontWeight: "bold" }}>Board {idx + 1}</span>
                                  {isByeRow ? (
                                    <span style={{ color: "#f3c144", fontWeight: "bold", fontSize: "0.78rem", background: "rgba(243,193,68,0.12)", padding: "2px 8px", borderRadius: "4px" }}>
                                      BYE (+1 pt)
                                    </span>
                                  ) : (
                                    <span style={{ color: "#f3c144", fontWeight: "bold", fontSize: "0.85rem" }}>{m.result}</span>
                                  )}
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", margin: "6px 0" }}>
                                  <span style={{ fontWeight: (m.result === "1-0" || m.result === "1 - 0") ? "bold" : "normal", color: (m.result === "1-0" || m.result === "1 - 0") ? "#f3c144" : "#fff", fontSize: "0.95rem" }}>
                                    ⚪ {m.white}
                                  </span>
                                  <span style={{ color: "#888", fontSize: "0.75rem", fontWeight: "bold" }}>VS</span>
                                  <span style={{ fontWeight: (m.result === "0-1" || m.result === "0 - 1") ? "bold" : "normal", color: (m.result === "0-1" || m.result === "0 - 1") ? "#f3c144" : isByeRow ? "#888" : "#fff", fontSize: "0.95rem" }}>
                                    ⚫ {isByeRow ? "BYE" : m.black}
                                  </span>
                                </div>

                                {isStaff && !isByeRow && m._id && (
                                  <div style={{ marginTop: "6px" }}>
                                    <select
                                      value={m.result}
                                      onChange={(e) => handleUpdateMatch(m._id, { result: e.target.value })}
                                      style={{ width: "100%", background: "#15120c", color: "#f3c144", border: "1px solid #f3c144", padding: "8px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "0.85rem", cursor: "pointer" }}
                                    >
                                      <option value="1-0">1 - 0 (White Wins)</option>
                                      <option value="0-1">0 - 1 (Black Wins)</option>
                                      <option value="1/2-1/2">½ - ½ (Draw)</option>
                                      <option value="Pending">Pending</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                /* KNOCKOUT FORMAT SPECIFIC DISPLAY (Challonge Tree + Table View) */
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", margin: "30px 0 15px" }}>
                    <h2 className="section-title" style={{ margin: 0 }}>Knockout Matches & Bracket</h2>
                    
                    {/* View Mode Toggle Buttons */}
                    <div style={{ display: "flex", gap: "8px", background: "#15120c", padding: "4px", borderRadius: "8px", border: "1px solid #36332b" }}>
                      <button
                        onClick={() => setViewMode("bracket")}
                        style={{
                          background: viewMode === "bracket" ? "#f3c144" : "transparent",
                          color: viewMode === "bracket" ? "#15120c" : "#b5afa1",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontWeight: "700",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        ⚡ Challonge Bracket Tree
                      </button>
                      <button
                        onClick={() => setViewMode("table")}
                        style={{
                          background: viewMode === "table" ? "#f3c144" : "transparent",
                          color: viewMode === "table" ? "#15120c" : "#b5afa1",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontWeight: "700",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        📋 Table View
                      </button>
                    </div>
                  </div>

                  {viewMode === "bracket" ? (
                    <>
                      <ChallongeBracket 
                        tournamentId={tournamentId}
                        tournamentType={tournament.type}
                        matchesData={tournament.matches} 
                        playersData={tournament.playersList}
                        tournamentTitle={`${tournament.title} (${tournament.type || "Knockout Bracket"})`} 
                        isStaff={isStaff}
                        onUpdateMatch={handleUpdateMatch}
                      />
                      
                      {!isSwissFormat && (!tournament.matches || tournament.matches.length === 0) && (
                        <div style={{ marginTop: "40px" }}>
                          <h2 className="section-title">👥 Registered Participants ({tournament.playersList?.length || 0})</h2>
                          {(!tournament.playersList || tournament.playersList.length === 0) ? (
                            <p style={{ color: "#888", fontStyle: "italic" }}>No participants registered yet.</p>
                          ) : (
                            <>
                              {/* Desktop Table View */}
                              <div className="application-table-wrapper tournaments-desktop-table">
                            <table className="application-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Rating</th>
                                  <th>Major</th>
                                  {isStaff && <th>Actions</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {tournament.playersList.map((p, idx) => (
                                  <tr key={idx}>
                                    <td style={{ fontWeight: "600", color: "#fff" }}>{p.name}</td>
                                    <td>{p.rating}</td>
                                    <td>{p.major}</td>
                                    {isStaff && (
                                      <td>
                                        <button
                                          onClick={() => handleRemovePlayer(p.name)}
                                          style={{
                                            background: "rgba(217, 83, 79, 0.15)",
                                            color: "#d9534f",
                                            border: "1px solid #d9534f",
                                            padding: "3px 8px",
                                            borderRadius: "4px",
                                            fontSize: "0.75rem",
                                            fontWeight: "bold",
                                            cursor: "pointer"
                                          }}
                                        >
                                          Remove
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Participants View */}
                          <div className="tournaments-mobile-cards">
                            {tournament.playersList.map((p, idx) => (
                              <div key={idx} className="mobile-tournament-card" style={{ padding: "14px" }}>
                                <div className="mobile-card-header">
                                  <h3 className="mobile-card-title">{p.name}</h3>
                                  <span className="type-badge">{p.major}</span>
                                </div>
                                <div style={{ fontSize: "0.85rem", color: "#bab19c", marginTop: "4px" }}>
                                  Rating: <strong style={{ color: "#f3c144" }}>{p.rating}</strong>
                                </div>
                                {isStaff && (
                                  <button
                                    onClick={() => handleRemovePlayer(p.name)}
                                    className="mobile-full-btn"
                                    style={{
                                      marginTop: "8px",
                                      background: "rgba(217, 83, 79, 0.15)",
                                      color: "#d9534f",
                                      border: "1px solid #d9534f",
                                      borderRadius: "6px",
                                      fontWeight: "bold"
                                    }}
                                  >
                                    Remove Participant
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                    </>
                  ) : (!tournament.matches || tournament.matches.length === 0) ? (
                    <p style={{ color: "#888", fontStyle: "italic", margin: "10px 0" }}>No match results recorded yet.</p>
                  ) : (
                    <>
                      {/* Desktop Knockout Table View */}
                      <div className="application-table-wrapper tournaments-desktop-table">
                        <table className="application-table">
                          <thead>
                            <tr>
                              <th>Round</th>
                              <th>White Player</th>
                              <th>Black Player</th>
                              <th>Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tournament.matches.map((m, index) => (
                              <tr key={index}>
                                <td>Round {m.round}</td>
                                <td style={{ fontWeight: m.result === "1-0" || m.result === "1 - 0" ? "bold" : "normal", color: m.result === "1-0" || m.result === "1 - 0" ? "#f3c144" : "#fff" }}>
                                  {m.white} {m.result === "1-0" || m.result === "1 - 0" ? "✓" : ""}
                                </td>
                                <td style={{ fontWeight: m.result === "0-1" || m.result === "0 - 1" ? "bold" : "normal", color: m.result === "0-1" || m.result === "0 - 1" ? "#f3c144" : "#fff" }}>
                                  {m.black} {m.result === "0-1" || m.result === "0 - 1" ? "✓" : ""}
                                </td>
                                <td>
                                  {isStaff && m._id ? (
                                    <select
                                      value={m.result}
                                      onChange={(e) => handleUpdateMatch(m._id, { result: e.target.value })}
                                      style={{
                                        background: "#15120c",
                                        color: "#f3c144",
                                        border: "1px solid #f3c144",
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        fontWeight: "800",
                                        fontSize: "0.88rem",
                                        cursor: "pointer"
                                      }}
                                    >
                                      <option value="1-0">1 - 0 (White Wins)</option>
                                      <option value="0-1">0 - 1 (Black Wins)</option>
                                      <option value="1/2-1/2">½ - ½ (Draw)</option>
                                      <option value="Pending">Pending</option>
                                    </select>
                                  ) : (
                                    <span style={{ color: "#f4c653", fontWeight: "bold", fontSize: "1rem" }}>{m.result}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Knockout Cards View */}
                      <div className="tournaments-mobile-cards">
                        {tournament.matches.map((m, index) => (
                          <div key={index} className="mobile-tournament-card" style={{ padding: "14px" }}>
                            <div className="mobile-card-header">
                              <span style={{ fontSize: "0.78rem", color: "#888", fontWeight: "bold" }}>Round {m.round}</span>
                              <span style={{ color: "#f3c144", fontWeight: "bold", fontSize: "0.85rem" }}>{m.result}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", margin: "6px 0" }}>
                              <span style={{ fontWeight: (m.result === "1-0" || m.result === "1 - 0") ? "bold" : "normal", color: (m.result === "1-0" || m.result === "1 - 0") ? "#f3c144" : "#fff", fontSize: "0.95rem" }}>
                                ⚪ {m.white}
                              </span>
                              <span style={{ color: "#888", fontSize: "0.75rem", fontWeight: "bold" }}>VS</span>
                              <span style={{ fontWeight: (m.result === "0-1" || m.result === "0 - 1") ? "bold" : "normal", color: (m.result === "0-1" || m.result === "0 - 1") ? "#f3c144" : "#fff", fontSize: "0.95rem" }}>
                                ⚫ {m.black}
                              </span>
                            </div>

                            {isStaff && m._id && (
                              <div style={{ marginTop: "6px" }}>
                                <select
                                  value={m.result}
                                  onChange={(e) => handleUpdateMatch(m._id, { result: e.target.value })}
                                  style={{ width: "100%", background: "#15120c", color: "#f3c144", border: "1px solid #f3c144", padding: "8px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "0.85rem", cursor: "pointer" }}
                                >
                                  <option value="1-0">1 - 0 (White Wins)</option>
                                  <option value="0-1">0 - 1 (Black Wins)</option>
                                  <option value="1/2-1/2">½ - ½ (Draw)</option>
                                  <option value="Pending">Pending</option>
                                </select>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* --- ADD PLAYER MODAL --- */}
      {playerModalOpen && (
        <div className="modal-overlay" onClick={() => setPlayerModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setPlayerModalOpen(false)}>
              &times;
            </button>
            <h3 className="modal-title">Add Participant</h3>
            <form onSubmit={handleAddPlayerSubmit} className="modal-form">
              <div>
                <label>Player Name *</label>
                <input 
                  type="text" 
                  value={playerForm.name} 
                  onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })} 
                  placeholder="e.g. Magnus Carlsen"
                  required 
                />
              </div>
              <div>
                <label>Rating *</label>
                <input 
                  type="number" 
                  value={playerForm.rating} 
                  onChange={(e) => setPlayerForm({ ...playerForm, rating: e.target.value })} 
                  placeholder="e.g. 2100"
                  required 
                />
              </div>
              <div>
                <label>Major *</label>
                <input 
                  type="text" 
                  value={playerForm.major} 
                  onChange={(e) => setPlayerForm({ ...playerForm, major: e.target.value })} 
                  placeholder="e.g. Computer Science"
                  required 
                />
              </div>
              <div className="modal-btn-row">
                <button type="button" className="btn-secondary" onClick={() => setPlayerModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD MATCH MODAL --- */}
      {matchModalOpen && (
        <div className="modal-overlay" onClick={() => setMatchModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setMatchModalOpen(false)}>
              &times;
            </button>
            <h3 className="modal-title">Record Match Result</h3>
            <form onSubmit={handleAddMatchSubmit} className="modal-form">
              <div>
                <label>Round *</label>
                <input 
                  type="number" 
                  value={matchForm.round} 
                  onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })} 
                  min="1"
                  required 
                />
              </div>
              <div>
                <label>White Player *</label>
                <select
                  value={matchForm.white}
                  onChange={(e) => setMatchForm({ ...matchForm, white: e.target.value })}
                  style={{ background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "8px", borderRadius: "8px", width: "100%", marginTop: "5px" }}
                  required
                >
                  <option value="">-- Select White Player --</option>
                  {(tournament.playersList || []).map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.rating || 1500})</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Black Player *</label>
                <select
                  value={matchForm.black}
                  onChange={(e) => setMatchForm({ ...matchForm, black: e.target.value })}
                  style={{ background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "8px", borderRadius: "8px", width: "100%", marginTop: "5px" }}
                  required
                >
                  <option value="">-- Select Black Player --</option>
                  <option value="BYE">BYE (Free Win)</option>
                  {(tournament.playersList || []).map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.rating || 1500})</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Result *</label>
                <select 
                  value={matchForm.result} 
                  onChange={(e) => setMatchForm({ ...matchForm, result: e.target.value })}
                >
                  <option value="1-0">1 - 0 (White Wins)</option>
                  <option value="0-1">0 - 1 (Black Wins)</option>
                  <option value="1/2-1/2">½ - ½ (Draw)</option>
                </select>
              </div>
              <div className="modal-btn-row">
                <button type="button" className="btn-secondary" onClick={() => setMatchModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CELEBRATION MODAL --- */}
      {celebrationModalOpen && (
        <div className="modal-overlay" onClick={() => setCelebrationModalOpen(false)}>
          <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />
          <div className="modal-card celebration-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", maxWidth: "600px", padding: "40px 20px" }}>
            <button className="close-btn" onClick={() => setCelebrationModalOpen(false)}>
              &times;
            </button>
            <h2 style={{ fontSize: "2rem", color: "#f3c144", marginBottom: "10px" }}>🏆 Tournament Complete! 🏆</h2>
            <p style={{ color: "#bab19c", marginBottom: "30px", fontSize: "1.1rem" }}>
              Congratulations to our top players for their outstanding performance!
            </p>
            
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "15px", marginBottom: "30px" }}>
              {/* 2nd Place */}
              {swissStandings[1] && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "10px" }}>🥈</div>
                  <div style={{ background: "linear-gradient(180deg, #d0d0d0, #888)", padding: "15px", borderRadius: "12px 12px 0 0", minWidth: "120px", height: "100px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <h4 style={{ color: "#fff", margin: 0, fontSize: "1.1rem" }}>{swissStandings[1].name}</h4>
                    <p style={{ color: "#fff", margin: 0, fontWeight: "bold" }}>{swissStandings[1].points} pts</p>
                  </div>
                </div>
              )}
              
              {/* 1st Place */}
              {swissStandings[0] && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                  <div style={{ fontSize: "4rem", marginBottom: "10px" }}>🥇</div>
                  <div style={{ background: "linear-gradient(180deg, #f3c144, #d4a32a)", padding: "20px", borderRadius: "12px 12px 0 0", minWidth: "140px", height: "130px", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: "0 -4px 15px rgba(243, 193, 68, 0.4)" }}>
                    <h4 style={{ color: "#15120c", margin: 0, fontSize: "1.3rem", fontWeight: "900" }}>{swissStandings[0].name}</h4>
                    <p style={{ color: "#15120c", margin: 0, fontWeight: "bold" }}>{swissStandings[0].points} pts</p>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {swissStandings[2] && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🥉</div>
                  <div style={{ background: "linear-gradient(180deg, #cd7f32, #a05a2c)", padding: "10px", borderRadius: "12px 12px 0 0", minWidth: "110px", height: "80px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <h4 style={{ color: "#fff", margin: 0, fontSize: "1rem" }}>{swissStandings[2].name}</h4>
                    <p style={{ color: "#fff", margin: 0, fontWeight: "bold" }}>{swissStandings[2].points} pts</p>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              className="btn-primary" 
              onClick={() => {
                setCelebrationModalOpen(false);
                handleUpdateTournamentStatus("Completed");
              }}
              style={{ padding: "12px 30px", fontSize: "1.1rem" }}
            >
              Mark Tournament as Completed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
