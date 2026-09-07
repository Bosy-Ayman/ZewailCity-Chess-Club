import React, { useState, useEffect } from "react";
import Xarrow, { Xwrapper } from "react-xarrows";
import "./ChallongeBracket.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

/**
 * Helper function to transform raw MongoDB matches into Challonge-style Round Columns
 * @param {Array} dbMatches - Array of matches from MongoDB [{ round, white, black, result }]
 * @param {Array} dbPlayers - Optional Array of players from MongoDB [{ name, rating }]
 */
function convertDBMatchesToBracket(dbMatches = [], dbPlayers = []) {
  if (!dbMatches || dbMatches.length === 0) {
    return { upper: [], lower: [], champion: null };
  }

  const playerSeedMap = {};
  if (dbPlayers && dbPlayers.length > 0) {
    const sorted = [...dbPlayers].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    sorted.forEach((p, idx) => { playerSeedMap[p.name] = idx + 1; });
  }

  const parseMatches = (matchesArr) => {
    return matchesArr.map((m, mIdx) => {
      const p1Winner = m.result === "1-0" || m.result === "1 - 0";
      const p2Winner = m.result === "0-1" || m.result === "0 - 1";
      const isDraw = m.result === "1/2-1/2" || m.result === "½ - ½" || m.result === "Draw";
      return {
        id: m._id || `db-match-${m.round}-${mIdx}`,
        matchCode: `R${m.round}-M${mIdx + 1}`,
        p1: { seed: playerSeedMap[m.white] || "-", name: m.white || "TBD", score: p1Winner ? "1" : isDraw ? "½" : "0", isWinner: p1Winner },
        p2: { seed: playerSeedMap[m.black] || "-", name: m.black || "TBD", score: p2Winner ? "1" : isDraw ? "½" : "0", isWinner: p2Winner },
        status: (!m.result || m.result === "Pending") ? "Pending" : "Completed"
      };
    });
  };

  const groupRounds = (matchesArr, namePrefix) => {
    const map = {};
    matchesArr.forEach(m => {
      const r = m.round || 1;
      if (!map[r]) map[r] = [];
      map[r].push(m);
    });
    const sorted = Object.keys(map).map(Number).sort((a, b) => a - b);
    return sorted.map(rNum => ({
      roundName: `${namePrefix} ${rNum}`,
      roundNumber: rNum,
      matches: parseMatches(map[rNum])
    }));
  };

  const upperMatches = dbMatches.filter(m => !m.bracket || m.bracket === 'upper');
  const lowerMatches = dbMatches.filter(m => m.bracket === 'lower');
  const gfMatch = dbMatches.find(m => m.bracket === 'grand_finals');
  const gfrMatch = dbMatches.find(m => m.bracket === 'grand_finals_reset');

  const upperRounds = groupRounds(upperMatches, "Upper");
  const lowerRounds = groupRounds(lowerMatches, "Lower");

  if (gfMatch) {
    const maxU = upperRounds.length > 0 ? Math.max(...upperRounds.map(r => r.roundNumber)) : 0;
    upperRounds.push({
      roundName: "Grand Finals",
      roundNumber: maxU + 1,
      matches: parseMatches([{ ...gfMatch, round: maxU + 1 }])
    });
    if (gfrMatch) {
      upperRounds.push({
        roundName: "Bracket Reset",
        roundNumber: maxU + 2,
        matches: parseMatches([{ ...gfrMatch, round: maxU + 2 }])
      });
    }
  } else {
    // Rename last rounds for Single Elim / Upper
    if (upperRounds.length > 0) {
      const totalRounds = upperRounds.length;
      if (totalRounds > 1) upperRounds[totalRounds - 1].roundName = "Upper Finals";
      if (totalRounds > 2) upperRounds[totalRounds - 2].roundName = "Semifinals";
      if (totalRounds > 3) upperRounds[totalRounds - 3].roundName = "Quarterfinals";
    }
  }

  let champion = null;
  if (upperRounds.length > 0) {
    const finalRound = upperRounds[upperRounds.length - 1];
    const finalMatch = finalRound.matches[finalRound.matches.length - 1];
    if (finalMatch && finalMatch.status === "Completed") {
      const winnerName = finalMatch.p1.isWinner ? finalMatch.p1.name : (finalMatch.p2.isWinner ? finalMatch.p2.name : null);
      const winnerSeed = finalMatch.p1.isWinner ? finalMatch.p1.seed : (finalMatch.p2.isWinner ? finalMatch.p2.seed : "-");
      if (winnerName) {
        champion = { name: winnerName, title: "Tournament Winner", seed: winnerSeed, trophy: "🥇 Grand Champion" };
      }
    }
  }

  return { upper: upperRounds, lower: lowerRounds, champion };
}

export default function ChallongeBracket({ 
  tournamentId, 
  tournamentType,
  matchesData, 
  playersData, 
  tournamentTitle = "Knockout Championship Bracket",
  isStaff = false,
  onUpdateMatch
}) {
  const [activeTab, setActiveTab] = useState("upper"); // "upper" or "lower"
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedMatchModal, setSelectedMatchModal] = useState(null);
  const [tempWhite, setTempWhite] = useState("");
  const [tempBlack, setTempBlack] = useState("");

  const [dbMatches, setDbMatches] = useState(matchesData || []);
  const [dbPlayers, setDbPlayers] = useState(playersData || []);
  const [dbTitle, setDbTitle] = useState(tournamentTitle);
  const [dbType, setDbType] = useState(tournamentType || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const rawMatch = selectedMatchModal 
    ? dbMatches.find(m => m._id === selectedMatchModal.id) 
    : null;

  // Fetch matches directly from MongoDB API if tournamentId is provided
  useEffect(() => {
    if (tournamentId) {
      fetchFromDatabase(tournamentId);
    } else if (matchesData) {
      setDbMatches(matchesData);
    }
  }, [tournamentId, matchesData]);

  const fetchFromDatabase = async (id) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${id}`);
      if (!res.ok) throw new Error("Failed to fetch tournament from database");
      const data = await res.json();
      setDbMatches(data.matches || []);
      setDbPlayers(data.playersList || []);
      if (data.type) setDbType(data.type);
      if (data.title) setDbTitle(data.title);
    } catch (err) {
      console.error("Database fetch error for Challonge bracket:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert raw DB matches into Challonge tree structure
  const bracketData = convertDBMatchesToBracket(dbMatches, dbPlayers);
  const currentRounds = activeTab === "upper" ? bracketData.upper : bracketData.lower;
  const typeStr = (dbType || tournamentType || "").toLowerCase();
  const isSingleElimination = typeStr.includes("single") || (!typeStr.includes("double") && !typeStr.includes("lower"));

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.4));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.7));
  const handleResetZoom = () => setZoomLevel(1);

  const renderXarrows = () => {
    if (isLoading || error || currentRounds.length === 0) return null;
    const arrows = [];
    currentRounds.forEach((round, rIndex) => {
      if (rIndex === currentRounds.length - 1) return;
      const nextRound = currentRounds[rIndex + 1];
      
      round.matches.forEach((match, mIdx) => {
        let targetMIdx = 0;
        if (activeTab === "upper" || isSingleElimination) {
          targetMIdx = Math.floor(mIdx / 2);
        } else {
          if (nextRound.roundNumber % 2 === 0) {
            targetMIdx = mIdx;
          } else {
            targetMIdx = Math.floor(mIdx / 2);
          }
        }
        
        const nextMatch = nextRound.matches[targetMIdx];
        if (nextMatch) {
          arrows.push(
            <Xarrow
              key={`${match.id}-${nextMatch.id}`}
              start={`match-${activeTab}-${round.roundNumber}-${mIdx}`}
              end={`match-${activeTab}-${nextRound.roundNumber}-${targetMIdx}`}
              color="#f3c144"
              strokeWidth={2}
              path="grid"
              startAnchor="right"
              endAnchor="left"
            />
          );
        }
      });
    });

    if (activeTab === "upper" && bracketData.champion && currentRounds.length > 0) {
      const lastRound = currentRounds[currentRounds.length - 1];
      if (lastRound.matches.length > 0) {
        arrows.push(
          <Xarrow
            key="champion-arrow"
            start={`match-${activeTab}-${lastRound.roundNumber}-0`}
            end="champion-display-box"
            color="#f3c144"
            strokeWidth={3}
            path="grid"
            startAnchor="right"
            endAnchor="left"
          />
        );
      }
    }
    return arrows;
  };

  return (
    <div className="challonge-wrapper glass-panel">
      {/* Bracket Top Navigation Bar */}
      <div className="challonge-header">
        <div className="challonge-title-area">
          <span className="challonge-live-badge">⚡ Live Database Bracket</span>
          <h2 className="challonge-tournament-name">{dbTitle}</h2>
        </div>

        <div className="challonge-controls">
          {/* Upper / Lower Bracket Toggle (Hide Lower Bracket for Single Elimination) */}
          {!isSingleElimination && (
            <div className="bracket-tab-group">
              <button
                className={`bracket-tab-btn ${activeTab === "upper" ? "active" : ""}`}
                onClick={() => setActiveTab("upper")}
              >
                👑 Main Bracket
              </button>
              <button
                className={`bracket-tab-btn ${activeTab === "lower" ? "active" : ""}`}
                onClick={() => setActiveTab("lower")}
              >
                ⚡ Lower Bracket
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="zoom-controls">
            <button onClick={handleZoomOut} title="Zoom Out" className="zoom-btn">
              -
            </button>
            <span className="zoom-percentage">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={handleZoomIn} title="Zoom In" className="zoom-btn">
              +
            </button>
            <button onClick={handleResetZoom} title="Reset Zoom" className="zoom-btn reset">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Bracket Canvas */}
      <div className="bracket-canvas-container">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#f3c144", fontSize: "1.1rem" }}>
            Connecting to MongoDB database...
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#e74c3c" }}>
            Database Error: {error}
          </div>
        ) : currentRounds.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#b5afa1" }}>
            <p style={{ fontSize: "1.1rem", marginBottom: "8px", color: "#fff" }}>No match results recorded in database yet.</p>
            <p style={{ fontSize: "0.9rem", color: "#888" }}>
              Staff members can add match results under <strong>Staff Actions</strong> to build the bracket tree live!
            </p>
          </div>
        ) : (
          <Xwrapper>
            <div
              className="bracket-tree-canvas"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
            >
              {currentRounds.map((round, rIndex) => (
              <div key={rIndex} className="bracket-round-column">
                {/* Round Header */}
                <div className="round-header-box">
                  <span className="round-number-tag">R{round.roundNumber}</span>
                  <span className="round-name-text">{round.roundName}</span>
                </div>

                {/* Round Matchup Cards */}
                <div className="round-matches-list">
                  {round.matches.map((match, mIdx) => (
                    <div
                      key={match.id}
                      id={`match-${activeTab}-${round.roundNumber}-${mIdx}`}
                      className="match-card glass-panel-card clickable-match"
                      onClick={() => {
                        setSelectedMatchModal(match);
                        setTempWhite(match.p1.name);
                        setTempBlack(match.p2.name);
                      }}
                    >
                      <div className="match-card-header">
                        <span className="match-code">{match.matchCode}</span>
                        <span className={`match-status-badge ${match.status.toLowerCase()}`}>
                          {match.status}
                        </span>
                      </div>

                      {/* Player 1 Row */}
                      <div className={`match-player-row ${match.p1.isWinner ? "winner" : "loser"}`}>
                        <div className="player-meta">
                          <span className="player-seed">#{match.p1.seed}</span>
                          <span className="player-name">{match.p1.name}</span>
                        </div>
                        <div className="player-score">
                          {match.p1.score}
                          {match.p1.isWinner && <span className="winner-check">✓</span>}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="match-vs-divider"></div>

                      {/* Player 2 Row */}
                      <div className={`match-player-row ${match.p2.isWinner ? "winner" : "loser"}`}>
                        <div className="player-meta">
                          <span className="player-seed">#{match.p2.seed}</span>
                          <span className="player-name">{match.p2.name}</span>
                        </div>
                        <div className="player-score">
                          {match.p2.score}
                          {match.p2.isWinner && <span className="winner-check">✓</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Grand Champion Trophy Feature */}
            {activeTab === "upper" && bracketData.champion && (
              <div className="bracket-round-column champion-column">
                <div className="round-header-box gold">
                  <span className="round-number-tag gold">👑</span>
                  <span className="round-name-text gold">Tournament Winner</span>
                </div>

                <div id="champion-display-box" className="champion-display-box glass-panel-card gold-glow">
                  <div className="champion-trophy-icon">🏆</div>
                  <h3 className="champion-name">{bracketData.champion.name}</h3>
                  <span className="champion-title-tag">{bracketData.champion.title}</span>
                  <span className="champion-seed-tag">Seed #{bracketData.champion.seed}</span>
                </div>
              </div>
            )}
            
            {renderXarrows()}
          </div>
          </Xwrapper>
        )}
      </div>

      {/* Match Details Modal Popup */}
      {selectedMatchModal && (
        <div className="match-modal-overlay" onClick={() => setSelectedMatchModal(null)}>
          <div className="match-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="match-modal-close" onClick={() => setSelectedMatchModal(null)}>
              ✕
            </button>
            <div className="match-modal-header">
              <span className="match-code-tag">{selectedMatchModal.matchCode}</span>
              <h3 style={{ margin: "8px 0 0", color: "#fff" }}>Database Match Details</h3>
            </div>

            <div className="match-modal-vs-box">
              <div className={`modal-player-card ${selectedMatchModal.p1.isWinner ? "winner" : ""}`}>
                <span className="modal-seed">Seed #{selectedMatchModal.p1.seed}</span>
                {isStaff && (rawMatch ? (!rawMatch.result || rawMatch.result === "Pending") : true) ? (
                  <select
                    value={tempWhite}
                    onChange={(e) => setTempWhite(e.target.value)}
                    style={{ background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "6px", borderRadius: "6px", width: "100%", marginTop: "8px", fontWeight: "600", fontSize: "0.85rem", outline: "none" }}
                  >
                    {dbPlayers.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <h4 className="modal-player-name">{selectedMatchModal.p1.name}</h4>
                )}
                <span className="modal-score-big">{selectedMatchModal.p1.score}</span>
              </div>

              <div className="modal-vs-symbol">VS</div>

              <div className={`modal-player-card ${selectedMatchModal.p2.isWinner ? "winner" : ""}`}>
                <span className="modal-seed">Seed #{selectedMatchModal.p2.seed}</span>
                {isStaff && (rawMatch ? (!rawMatch.result || rawMatch.result === "Pending") : true) ? (
                  <select
                    value={tempBlack}
                    onChange={(e) => setTempBlack(e.target.value)}
                    style={{ background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "6px", borderRadius: "6px", width: "100%", marginTop: "8px", fontWeight: "600", fontSize: "0.85rem", outline: "none" }}
                  >
                    <option value="BYE">BYE</option>
                    {dbPlayers.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <h4 className="modal-player-name">{selectedMatchModal.p2.name}</h4>
                )}
                <span className="modal-score-big">{selectedMatchModal.p2.score}</span>
              </div>
            </div>

            {isStaff && (rawMatch ? (!rawMatch.result || rawMatch.result === "Pending") : true) && (tempWhite !== selectedMatchModal.p1.name || tempBlack !== selectedMatchModal.p2.name) && (
              <button
                onClick={async () => {
                  try {
                    await onUpdateMatch(selectedMatchModal.id, { white: tempWhite, black: tempBlack });
                    setSelectedMatchModal(null);
                  } catch (err) {
                    alert("Error: " + err.message);
                  }
                }}
                style={{
                  background: "linear-gradient(135deg, #f3c144, #d4a32a)",
                  color: "#15120c",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontWeight: "800",
                  width: "100%",
                  marginTop: "15px",
                  cursor: "pointer"
                }}
              >
                💾 Save Matchup Pairing
              </button>
            )}

            <div className="match-modal-info">
              <p>Status: <strong>{selectedMatchModal.status}</strong></p>
            </div>

            {isStaff && onUpdateMatch && (
              <div className="match-modal-actions" style={{ marginTop: "20px", borderTop: "1px solid #36332b", paddingTop: "15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#bab19c", fontSize: "0.88rem", fontWeight: "600" }}>Record Score:</span>
                <select
                  value={rawMatch ? rawMatch.result : "Pending"}
                  onChange={async (e) => {
                    const newResult = e.target.value;
                    try {
                      await onUpdateMatch(selectedMatchModal.id, { result: newResult });
                      setSelectedMatchModal(null);
                    } catch (err) {
                      alert("Error: " + err.message);
                    }
                  }}
                  style={{
                    background: "#15120c",
                    color: "#f3c144",
                    border: "1px solid #f3c144",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="1-0">1 - 0 (White Wins)</option>
                  <option value="0-1">0 - 1 (Black Wins)</option>
                  <option value="1/2-1/2">½ - ½ (Draw)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
