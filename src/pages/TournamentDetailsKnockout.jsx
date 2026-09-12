import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChallongeBracket from "../components/ChallongeBracket";
import { FALL_2025_TOURNAMENT } from "../utils/knockoutHistoricalData";
import "./TournamentDetailsKnockout.css";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

export default function TournamentDetailsKnockout() {
  const [searchParams] = useSearchParams();
  const queryTournamentId = searchParams.get("id");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [dbTournament, setDbTournament] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (queryTournamentId) {
      setLoading(true);
      fetch(`${API_BASE}/api/tournaments/${queryTournamentId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load tournament");
          return res.json();
        })
        .then((data) => {
          setDbTournament(data);
        })
        .catch((err) => {
          console.warn("Could not fetch query tournament, falling back to showcase:", err);
          setDbTournament(null);
        })
        .finally(() => setLoading(false));
    }
  }, [queryTournamentId]);

  const activeTournament = dbTournament || FALL_2025_TOURNAMENT;

  return (
    <div className="tournament-knockout">
      <div className="layout-container">
        <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        <div className="main-content" style={{ maxWidth: "1400px", margin: "0 auto", padding: "40px 20px" }}>
          {/* Header Banner */}
          <div className="intro-text" style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(243, 193, 68, 0.15)", border: "1px solid rgba(243, 193, 68, 0.3)", padding: "5px 16px", borderRadius: "24px", marginBottom: "12px" }}>
              <span style={{ fontSize: "1rem" }}>⚡</span>
              <span style={{ color: "#f3c144", fontSize: "0.82rem", fontWeight: "800", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                Official Challonge Elimination Tree
              </span>
            </div>
            
            <h1 style={{ fontSize: "2.3rem", color: "#fff", margin: "6px 0 10px", fontWeight: "800", letterSpacing: "-0.5px" }}>
              {activeTournament.title || "1st Knockout Championship — Fall 2025"}
            </h1>
            
            <p style={{ color: "#b5afa1", maxWidth: "720px", margin: "0 auto 20px", lineHeight: "1.6", fontSize: "0.95rem" }}>
              Interactive tournament tree featuring campus competitors across Upper and Lower Brackets. Click on any player to highlight their bracket journey!
            </p>

            {/* Quick Stats Badges */}
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
              <div style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
                <span style={{ color: "#888", fontSize: "0.75rem", display: "block", textTransform: "uppercase", fontWeight: "700" }}>Format</span>
                <strong style={{ color: "#f3c144", fontSize: "0.95rem" }}>{activeTournament.type || "Double Elimination"}</strong>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
                <span style={{ color: "#888", fontSize: "0.75rem", display: "block", textTransform: "uppercase", fontWeight: "700" }}>Participants</span>
                <strong style={{ color: "#fff", fontSize: "0.95rem" }}>{activeTournament.playersList?.length || 16} Players</strong>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
                <span style={{ color: "#888", fontSize: "0.75rem", display: "block", textTransform: "uppercase", fontWeight: "700" }}>Matches</span>
                <strong style={{ color: "#fff", fontSize: "0.95rem" }}>{activeTournament.matches?.length || 29} Matches</strong>
              </div>
              <div style={{ background: "rgba(243, 193, 68, 0.1)", border: "1px solid rgba(243, 193, 68, 0.25)", borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
                <span style={{ color: "#d4a32a", fontSize: "0.75rem", display: "block", textTransform: "uppercase", fontWeight: "700" }}>Grand Champion</span>
                <strong style={{ color: "#f3c144", fontSize: "0.95rem" }}>🥇 {activeTournament.winner || "Ahmed Elkodariy"}</strong>
              </div>
            </div>
          </div>

          {/* Challonge Interactive Visual Bracket Component */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#f3c144" }}>Loading tournament bracket...</div>
          ) : (
            <ChallongeBracket 
              tournamentId={queryTournamentId}
              tournamentType={activeTournament.type}
              tournamentWinner={activeTournament.winner}
              tournamentStatus={activeTournament.status}
              matchesData={activeTournament.matches}
              playersData={activeTournament.playersList}
              playerAvatars={activeTournament.playerAvatars}
              tournamentTitle={activeTournament.title}
            />
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}
