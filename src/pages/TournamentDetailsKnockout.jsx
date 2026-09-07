import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChallongeBracket from "../components/ChallongeBracket";
import "./TournamentDetailsKnockout.css";

export default function TournamentDetailsKnockout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="tournament-knockout">
      <div className="layout-container">
        <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        <div className="main-content" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
          <div className="intro-text" style={{ textAlign: "center", marginBottom: "32px" }}>
            <span style={{ 
              background: "rgba(243, 193, 68, 0.15)", 
              color: "#f3c144", 
              padding: "4px 14px", 
              borderRadius: "20px", 
              fontSize: "0.8rem", 
              fontWeight: "800",
              textTransform: "uppercase" 
            }}>
              ⚡ Official Challonge Bracket View
            </span>
            <h1 style={{ fontSize: "2.2rem", color: "#fff", margin: "12px 0 8px", fontWeight: "800" }}>
              1st Knockout Championship — Fall 2025
            </h1>
            <p style={{ color: "#b5afa1", maxWidth: "680px", margin: "0 auto", lineHeight: "1.6" }}>
              Double Elimination Knockout Championship featuring 38 top players from Zewail City competing across Main and Lower Brackets.
            </p>
          </div>

          {/* Challonge Interactive Visual Bracket Component */}
          <ChallongeBracket tournamentTitle="1st Knockout Championship - Fall 2025 (Challonge Tree)" />
        </div>

        <Footer />
      </div>
    </div>
  );
}
