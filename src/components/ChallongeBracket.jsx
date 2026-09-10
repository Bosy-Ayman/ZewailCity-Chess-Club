import React, { useState, useEffect } from "react";
import Xarrow, { Xwrapper } from "react-xarrows";
import { getPlayerAvatarUrl } from "../utils/api";
import "./ChallongeBracket.css";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

/**
 * Helper function to transform raw MongoDB matches into Challonge-style Round Columns
 * @param {Array} dbMatches - Array of matches from MongoDB [{ round, white, black, result }]
 * @param {Array} dbPlayers - Optional Array of players from MongoDB [{ name, rating }]
 */
function convertDBMatchesToBracket(dbMatches = [], dbPlayers = [], tournamentWinner = null, tournamentStatus = "") {
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
        status: (!m.result || m.result === "Pending") ? "Pending" : "Completed",
        matchTime: m.matchTime || "",
        location: m.location || ""
      };
    });
  };

  const isDoubleElimMatches = dbMatches.some(m => m.bracket === 'lower' || m.bracket === 'grand_finals');

  const groupRounds = (matchesArr, namePrefix) => {
    const map = {};
    matchesArr.forEach(m => {
      const r = m.round || 1;
      if (!map[r]) map[r] = [];
      map[r].push(m);
    });
    const sorted = Object.keys(map).map(Number).sort((a, b) => a - b);
    return sorted.map(rNum => {
      const parsedMatches = parseMatches(map[rNum]);
      const mCount = parsedMatches.length;
      let roundName = `${namePrefix} ${rNum}`;

      if (namePrefix === "Lower") {
        roundName = `Lower Round ${rNum}`;
      } else if (isDoubleElimMatches) {
        if (mCount === 1) roundName = "Upper Finals";
        else if (mCount === 2) roundName = "Upper Semifinals";
        else if (mCount === 4) roundName = "Upper Quarterfinals";
        else roundName = `Upper Round ${rNum}`;
      } else {
        if (mCount === 1) roundName = "Finals";
        else if (mCount === 2) roundName = "Semifinals";
        else if (mCount === 4) roundName = "Quarterfinals";
        else if (mCount === 8) roundName = "Round of 16";
        else if (mCount === 16) roundName = "Round of 32";
        else roundName = `Round ${rNum}`;
      }

      return {
        roundName,
        roundNumber: rNum,
        matches: parsedMatches
      };
    });
  };

  const upperMatches = dbMatches.filter(m => !m.bracket || m.bracket === 'upper');
  const lowerMatches = dbMatches.filter(m => m.bracket === 'lower');
  const gfMatch = dbMatches.find(m => m.bracket === 'grand_finals');
  const gfrMatch = dbMatches.find(m => m.bracket === 'grand_finals_reset');

  let upperRounds = groupRounds(upperMatches, "Upper");
  const lowerRounds = groupRounds(lowerMatches, "Lower");

  // For Single Elimination, if the database only has earlier rounds generated,
  // dynamically project the remaining rounds (Semifinals, Finals) so the full Challonge tree is immediately visible!
  if (!isDoubleElimMatches && upperRounds.length > 0) {
    let lastRound = upperRounds[upperRounds.length - 1];
    while (lastRound.matches.length > 1) {
      const nextRNum = lastRound.roundNumber + 1;
      const count = Math.ceil(lastRound.matches.length / 2);
      const projectedMatches = [];

      for (let i = 0; i < count; i++) {
        const feeder1 = lastRound.matches[i * 2];
        const feeder2 = lastRound.matches[i * 2 + 1];

        const f1Winner = feeder1 ? (feeder1.p1.isWinner ? feeder1.p1.name : (feeder1.p2.isWinner ? feeder1.p2.name : null)) : null;
        const f2Winner = feeder2 ? (feeder2.p1.isWinner ? feeder2.p1.name : (feeder2.p2.isWinner ? feeder2.p2.name : null)) : null;

        const p1Name = (f1Winner && f1Winner !== "BYE") ? f1Winner : `Winner of ${feeder1 ? feeder1.matchCode : `M${i * 2 + 1}`}`;
        const p2Name = (f2Winner && f2Winner !== "BYE") ? f2Winner : `Winner of ${feeder2 ? feeder2.matchCode : `M${i * 2 + 2}`}`;

        const isRealP1 = f1Winner && f1Winner !== "BYE";
        const isRealP2 = f2Winner && f2Winner !== "BYE";

        projectedMatches.push({
          id: `projected-${nextRNum}-${i}`,
          matchCode: `R${nextRNum}-M${i + 1}`,
          p1: {
            seed: isRealP1 ? (playerSeedMap[p1Name] || "-") : "—",
            name: p1Name,
            score: "-",
            isWinner: false
          },
          p2: {
            seed: isRealP2 ? (playerSeedMap[p2Name] || "-") : "—",
            name: p2Name,
            score: "-",
            isWinner: false
          },
          status: (isRealP1 && isRealP2) ? "Pending" : "Awaiting",
          isFeeder: true,
          matchTime: "",
          location: ""
        });
      }

      let roundName = "Round " + nextRNum;
      if (count === 1) roundName = "Championship Finals";
      else if (count === 2) roundName = "Semifinals";
      else if (count === 4) roundName = "Quarterfinals";
      else if (count === 8) roundName = "Round of 16";

      const newRoundObj = {
        roundName,
        roundNumber: nextRNum,
        matches: projectedMatches
      };
      upperRounds.push(newRoundObj);
      lastRound = newRoundObj;
    }
  }

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
  }

  let champion = null;
  const anyPending = dbMatches.some(m => !m.result || m.result === "Pending");
  const isDoubleElim = isDoubleElimMatches;

  // A champion can ONLY be crowned if NO match in the tournament is currently pending
  if (!anyPending && upperRounds.length > 0) {
    const finalRound = upperRounds[upperRounds.length - 1];

    // In single elimination, the final round must have exactly 1 match,
    // and cannot be Round 1 unless total players was only 2.
    const isSingleElimFinal = !isDoubleElim && finalRound.matches.length === 1 && (upperRounds.length > 1 || (dbPlayers && dbPlayers.length <= 2));
    const isDoubleElimFinal = isDoubleElim && (finalRound.roundName === "Grand Finals" || finalRound.roundName === "Bracket Reset") && finalRound.matches.length === 1;

    if (isSingleElimFinal || isDoubleElimFinal) {
      const finalMatch = finalRound.matches[0];
      if (finalMatch && finalMatch.status === "Completed") {
        const winnerName = finalMatch.p1.isWinner ? finalMatch.p1.name : (finalMatch.p2.isWinner ? finalMatch.p2.name : null);
        const winnerSeed = finalMatch.p1.isWinner ? finalMatch.p1.seed : (finalMatch.p2.isWinner ? finalMatch.p2.seed : "-");
        if (winnerName && winnerName !== "BYE") {
          champion = { name: winnerName, title: "Tournament Winner", seed: winnerSeed, trophy: "🥇 Grand Champion" };
        }
      }
    }
  }

  // Fallback: If tournament was explicitly marked Completed with a winner in DB
  if (!champion && (tournamentStatus === "Completed" || tournamentWinner)) {
    const winner = tournamentWinner;
    if (winner && winner !== "BYE") {
      const pSeed = playerSeedMap[winner] || "-";
      champion = { name: winner, title: "Tournament Winner", seed: pSeed, trophy: "🥇 Grand Champion" };
    }
  }

  return { upper: upperRounds, lower: lowerRounds, champion };
}

export default function ChallongeBracket({ 
  tournamentId, 
  tournamentType,
  tournamentWinner,
  tournamentStatus,
  matchesData, 
  playersData, 
  playerAvatars = {},
  tournamentTitle = "Knockout Championship Bracket",
  isStaff = false,
  onUpdateMatch,
  onSelectPlayer
}) {
  const [activeTab, setActiveTab] = useState("upper"); // "upper" or "lower"
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedMatchModal, setSelectedMatchModal] = useState(null);
  const [tempWhite, setTempWhite] = useState("");
  const [tempBlack, setTempBlack] = useState("");
  const [tempMatchTime, setTempMatchTime] = useState("");

  const [dbMatches, setDbMatches] = useState(matchesData || []);
  const [dbPlayers, setDbPlayers] = useState(playersData || []);
  const [dbTitle, setDbTitle] = useState(tournamentTitle);
  const [dbType, setDbType] = useState(tournamentType || "");
  const [dbWinner, setDbWinner] = useState(tournamentWinner || null);
  const [dbStatus, setDbStatus] = useState(tournamentStatus || "");
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
      if (data.winner) setDbWinner(data.winner);
      if (data.status) setDbStatus(data.status);
    } catch (err) {
      console.error("Database fetch error for Challonge bracket:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert raw DB matches into Challonge tree structure
  const bracketData = convertDBMatchesToBracket(dbMatches, dbPlayers, dbWinner || tournamentWinner, dbStatus || tournamentStatus);
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
                  {round.matches.map((match, mIdx) => {
                    const isByeMatch = match.p1.name === "BYE" || match.p2.name === "BYE";
                    const isFeederP1 = match.p1.name && match.p1.name.startsWith("Winner of");
                    const isFeederP2 = match.p2.name && match.p2.name.startsWith("Winner of");

                    return (
                      <div
                        key={match.id}
                        id={`match-${activeTab}-${round.roundNumber}-${mIdx}`}
                        className={`match-card glass-panel-card clickable-match ${isByeMatch ? "match-bye-card" : ""}`}
                        onClick={() => {
                          if (isByeMatch) {
                            alert("⚡ This matchup was won automatically by BYE advance.");
                            return;
                          }
                          if (match.id && String(match.id).startsWith("projected-")) {
                            if (isFeederP1 || isFeederP2) {
                              alert(`⏳ Match ${match.matchCode} is awaiting earlier round matches to complete.`);
                              return;
                            }
                          }
                          setSelectedMatchModal(match);
                          setTempWhite(match.p1.name);
                          setTempBlack(match.p2.name);
                          const foundMatch = dbMatches.find(m => m._id === match.id);
                          setTempMatchTime(foundMatch?.matchTime || match.matchTime || "");
                        }}
                      >
                        <div className="match-card-header">
                          <span className="match-code">{match.matchCode}</span>
                          {match.matchTime && (
                            <span className="match-scheduled-time" title={`Scheduled: ${match.matchTime}`}>
                              🕒 {match.matchTime}
                            </span>
                          )}
                          <span className={`match-status-badge ${isByeMatch ? "bye-advance" : (match.status ? match.status.toLowerCase() : "pending")}`}>
                            {isByeMatch ? "BYE" : match.status}
                          </span>
                        </div>

                        {/* Player 1 Row */}
                        <div className={`match-player-row ${match.p1.isWinner ? "winner" : (match.p1.name === "BYE" ? "bye-row" : "loser")}`}>
                          <div className="player-meta">
                            {match.p1.name !== "BYE" && !isFeederP1 ? (
                              <img 
                                src={getPlayerAvatarUrl(match.p1.name, playerAvatars)} 
                                alt={match.p1.name} 
                                className="bracket-player-avatar"
                                onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                              />
                            ) : (
                              <span className="bracket-placeholder-icon">{match.p1.name === "BYE" ? "🚫" : "⏳"}</span>
                            )}
                            <span className={`player-seed ${match.p1.name === "BYE" ? "seed-bye" : ""}`}>
                              {match.p1.name === "BYE" ? "—" : (match.p1.seed !== "-" && match.p1.seed !== "—" ? `#${match.p1.seed}` : "—")}
                            </span>
                            <span className={`player-name ${match.p1.name === "BYE" ? "name-bye" : (isFeederP1 ? "name-feeder" : "")}`}>
                              {match.p1.name === "BYE" ? "— BYE —" : match.p1.name}
                            </span>
                          </div>
                          <div className="player-score">
                            {match.p1.score}
                            {match.p1.isWinner && <span className="winner-check">✓</span>}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="match-vs-divider"></div>

                        {/* Player 2 Row */}
                        <div className={`match-player-row ${match.p2.isWinner ? "winner" : (match.p2.name === "BYE" ? "bye-row" : "loser")}`}>
                          <div className="player-meta">
                            {match.p2.name !== "BYE" && !isFeederP2 ? (
                              <img 
                                src={getPlayerAvatarUrl(match.p2.name, playerAvatars)} 
                                alt={match.p2.name} 
                                className="bracket-player-avatar"
                                onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                              />
                            ) : (
                              <span className="bracket-placeholder-icon">{match.p2.name === "BYE" ? "🚫" : "⏳"}</span>
                            )}
                            <span className={`player-seed ${match.p2.name === "BYE" ? "seed-bye" : ""}`}>
                              {match.p2.name === "BYE" ? "—" : (match.p2.seed !== "-" && match.p2.seed !== "—" ? `#${match.p2.seed}` : "—")}
                            </span>
                            <span className={`player-name ${match.p2.name === "BYE" ? "name-bye" : (isFeederP2 ? "name-feeder" : "")}`}>
                              {match.p2.name === "BYE" ? "— BYE —" : match.p2.name}
                            </span>
                          </div>
                          <div className="player-score">
                            {match.p2.score}
                            {match.p2.isWinner && <span className="winner-check">✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  <img 
                    src={getPlayerAvatarUrl(bracketData.champion.name, playerAvatars)} 
                    alt={bracketData.champion.name} 
                    className="bracket-champion-avatar"
                    onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                  />
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
                <img 
                  src={getPlayerAvatarUrl(selectedMatchModal.p1.name, playerAvatars)} 
                  alt={selectedMatchModal.p1.name} 
                  className="modal-player-avatar"
                  onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                />
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
                <img 
                  src={getPlayerAvatarUrl(selectedMatchModal.p2.name, playerAvatars)} 
                  alt={selectedMatchModal.p2.name} 
                  className="modal-player-avatar"
                  onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                />
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

            <div className="match-modal-info" style={{ marginTop: "14px" }}>
              <p style={{ margin: "4px 0" }}>Status: <strong>{selectedMatchModal.status}</strong></p>
              <p style={{ margin: "4px 0", color: "#b5afa1" }}>
                Scheduled Time:{" "}
                <strong style={{ color: (rawMatch?.matchTime || selectedMatchModal.matchTime) ? "#f3c144" : "#888" }}>
                  {rawMatch?.matchTime || selectedMatchModal.matchTime || "TBD (Not scheduled yet)"}
                </strong>
              </p>
            </div>

            {isStaff && onUpdateMatch && (
              <div style={{ marginTop: "14px", background: "rgba(243, 193, 68, 0.06)", border: "1px solid rgba(243, 193, 68, 0.25)", borderRadius: "8px", padding: "12px" }}>
                <label style={{ color: "#f3c144", fontSize: "0.82rem", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                  🕒 Set Match Schedule (Date &amp; Time):
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="e.g. Tomorrow 8:00 PM, or Oct 12 at 18:00"
                    value={tempMatchTime}
                    onChange={(e) => setTempMatchTime(e.target.value)}
                    style={{ flex: 1, minWidth: "180px", background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "7px 10px", borderRadius: "6px", fontSize: "0.85rem", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onUpdateMatch(selectedMatchModal.id, { matchTime: tempMatchTime });
                        alert("Match scheduled time updated!");
                        setSelectedMatchModal(null);
                      } catch (err) {
                        alert("Error updating schedule: " + err.message);
                      }
                    }}
                    style={{ background: "#f3c144", color: "#15120c", border: "none", padding: "7px 14px", borderRadius: "6px", fontWeight: "800", cursor: "pointer", fontSize: "0.82rem" }}
                  >
                    Save Time
                  </button>
                </div>
              </div>
            )}

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
