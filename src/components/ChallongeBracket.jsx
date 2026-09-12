import React, { useState, useEffect, useRef, useMemo } from "react";
import { getPlayerAvatarUrl } from "../utils/api";
import "./ChallongeBracket.css";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

// Fixed geometric layout constants for pixel-perfect bracket geometry
const CARD_WIDTH = 345;
const CARD_HEIGHT = 138;
const COL_GAP = 75;
const HEADER_HEIGHT = 65;
const BASE_SLOT_HEIGHT = 186;

/**
 * Helpers for easy visual date & time picking
 */
export function extractDateForPicker(str, defaultYear = 2026) {
  if (!str || typeof str !== "string") return "";
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const monthMap = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const m = str.match(/([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i);
  if (m) {
    const mon = monthMap[m[1].substring(0, 3).toLowerCase()];
    if (mon) {
      const day = String(m[2]).padStart(2, "0");
      const year = m[3] || defaultYear;
      return `${year}-${mon}-${day}`;
    }
  }
  return "";
}

export function extractTimeForPicker(str) {
  if (!str || typeof str !== "string") return "10:00";
  const m = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return "10:00";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = (m[3] || "").toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

export function formatPickerToSchedule(dateStr, timeStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return "";
  const [, m, d] = parts;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mName = monthNames[parseInt(m, 10) - 1] || m;
  const dayNum = parseInt(d, 10);

  let formattedTime = "";
  if (timeStr) {
    const timeParts = timeStr.split(":");
    let h = parseInt(timeParts[0], 10);
    const minStr = timeParts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    formattedTime = `, ${h}:${minStr} ${ampm}`;
  }

  return `${mName} ${dayNum}${formattedTime}`;
}

/**
 * Helper function to transform raw MongoDB matches into Challonge-style Round Columns
 */
function convertDBMatchesToBracket(dbMatches = [], dbPlayers = [], tournamentWinner = null, tournamentStatus = "") {
  if (!dbMatches || dbMatches.length === 0) {
    return { upper: [], lower: [], champion: null };
  }

  const playerSeedMap = {};
  if (dbPlayers && dbPlayers.length > 0) {
    const sorted = [...dbPlayers].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    sorted.forEach((p, idx) => { playerSeedMap[p.name] = p.seed || idx + 1; });
  }

  const parseMatches = (matchesArr) => {
    return matchesArr.map((m, mIdx) => {
      const p1Winner = m.result === "1-0" || m.result === "1 - 0";
      const p2Winner = m.result === "0-1" || m.result === "0 - 1";
      const isDraw = m.result === "1/2-1/2" || m.result === "½ - ½" || m.result === "Draw";
      return {
        id: m._id || `db-match-${m.round}-${mIdx}`,
        matchCode: m.matchCode || `R${m.round}-M${mIdx + 1}`,
        p1: { 
          seed: playerSeedMap[m.white] || "-", 
          name: m.white || "TBD", 
          score: p1Winner ? "1" : isDraw ? "½" : (m.result && m.result !== "Pending" ? "0" : "-"), 
          isWinner: p1Winner 
        },
        p2: { 
          seed: playerSeedMap[m.black] || "-", 
          name: m.black || "TBD", 
          score: p2Winner ? "1" : isDraw ? "½" : (m.result && m.result !== "Pending" ? "0" : "-"), 
          isWinner: p2Winner 
        },
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
        if (mCount === 1) roundName = "Lower Finals";
        else if (mCount === 2) roundName = "Lower Semifinals";
        else roundName = `Lower Round ${rNum}`;
      } else if (isDoubleElimMatches) {
        if (mCount === 1) roundName = "Upper Finals";
        else if (mCount === 2) roundName = "Upper Semifinals";
        else if (mCount === 4) roundName = "Upper Quarterfinals";
        else if (mCount === 8) roundName = "Upper Round of 16";
        else roundName = `Upper Round ${rNum}`;
      } else {
        if (mCount === 1) roundName = "Championship Finals";
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

  // For Single Elimination, dynamically project remaining rounds if not in DB yet
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

        if (!feeder2) {
          // Odd match in the feeder round: feeder1 gets an automatic BYE advance into the next round!
          const p1Name = (f1Winner && f1Winner !== "BYE") ? f1Winner : `Winner of ${feeder1 ? feeder1.matchCode : `M${i * 2 + 1}`}`;
          const isRealP1 = f1Winner && f1Winner !== "BYE";

          projectedMatches.push({
            id: `projected-${nextRNum}-${i}`,
            matchCode: `R${nextRNum}-M${i + 1}`,
            p1: {
              seed: isRealP1 ? (playerSeedMap[p1Name] || "-") : "—",
              name: p1Name,
              score: isRealP1 ? "1" : "-",
              isWinner: isRealP1
            },
            p2: {
              seed: "—",
              name: "BYE",
              score: "0",
              isWinner: false
            },
            status: isRealP1 ? "Completed" : "Awaiting",
            isFeeder: true,
            matchTime: "",
            location: ""
          });
          continue;
        }

        const p1Name = (f1Winner && f1Winner !== "BYE") ? f1Winner : `Winner of ${feeder1 ? feeder1.matchCode : `M${i * 2 + 1}`}`;
        const p2Name = (f2Winner && f2Winner !== "BYE") ? f2Winner : `Winner of ${feeder2.matchCode}`;

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
      matches: parseMatches([{ ...gfMatch, round: maxU + 1, matchCode: "GF-1" }])
    });
    if (gfrMatch) {
      upperRounds.push({
        roundName: "Bracket Reset",
        roundNumber: maxU + 2,
        matches: parseMatches([{ ...gfrMatch, round: maxU + 2, matchCode: "GFR" }])
      });
    }
  }

  let champion = null;
  let runnerUp = null;
  const anyPending = dbMatches.some(m => !m.result || m.result === "Pending");
  const isDoubleElim = isDoubleElimMatches;

  if (!anyPending && upperRounds.length > 0) {
    const finalRound = upperRounds[upperRounds.length - 1];
    const isSingleElimFinal = !isDoubleElim && finalRound.matches.length === 1 && (upperRounds.length > 1 || (dbPlayers && dbPlayers.length <= 2));
    const isDoubleElimFinal = isDoubleElim && (finalRound.roundName === "Grand Finals" || finalRound.roundName === "Bracket Reset") && finalRound.matches.length === 1;

    if (isSingleElimFinal || isDoubleElimFinal) {
      const finalMatch = finalRound.matches[0];
      if (finalMatch && finalMatch.status === "Completed") {
        const winnerName = finalMatch.p1.isWinner ? finalMatch.p1.name : (finalMatch.p2.isWinner ? finalMatch.p2.name : null);
        const winnerSeed = finalMatch.p1.isWinner ? finalMatch.p1.seed : (finalMatch.p2.isWinner ? finalMatch.p2.seed : "-");
        const runnerUpName = finalMatch.p1.isWinner ? finalMatch.p2.name : finalMatch.p1.name;
        const runnerUpSeed = finalMatch.p1.isWinner ? finalMatch.p2.seed : finalMatch.p1.seed;

        if (winnerName && winnerName !== "BYE") {
          champion = { name: winnerName, title: "Tournament Champion", seed: winnerSeed, trophy: "🥇 Grand Champion" };
          if (runnerUpName && runnerUpName !== "BYE") {
            runnerUp = { name: runnerUpName, seed: runnerUpSeed, trophy: "🥈 Finalist" };
          }
        }
      }
    }
  }

  // Fallback: If tournament was explicitly marked Completed with a winner in DB
  if (!champion && (tournamentStatus === "Completed" || tournamentWinner)) {
    const winner = tournamentWinner;
    if (winner && winner !== "BYE") {
      const pSeed = playerSeedMap[winner] || "-";
      champion = { name: winner, title: "Tournament Champion", seed: pSeed, trophy: "🥇 Grand Champion" };
    }
  }

  return { upper: upperRounds, lower: lowerRounds, champion, runnerUp };
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
  const [highlightedPlayer, setHighlightedPlayer] = useState(null);
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [selectedMatchModal, setSelectedMatchModal] = useState(null);
  const [tempWhite, setTempWhite] = useState("");
  const [tempBlack, setTempBlack] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");

  const activeHighlight = highlightedPlayer || hoveredPlayer;

  const [dbMatches, setDbMatches] = useState(matchesData || []);
  const [dbPlayers, setDbPlayers] = useState(playersData || []);
  const [dbTitle, setDbTitle] = useState(tournamentTitle);
  const [dbType, setDbType] = useState(tournamentType || "");
  const [dbWinner, setDbWinner] = useState(tournamentWinner || null);
  const [dbStatus, setDbStatus] = useState(tournamentStatus || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pan & Drag handling
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

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
  const bracketData = useMemo(() => {
    return convertDBMatchesToBracket(dbMatches, dbPlayers, dbWinner || tournamentWinner, dbStatus || tournamentStatus);
  }, [dbMatches, dbPlayers, dbWinner, tournamentWinner, dbStatus, tournamentStatus]);

  const currentRounds = activeTab === "upper" ? bracketData.upper : bracketData.lower;
  const typeStr = (dbType || tournamentType || "").toLowerCase();
  const isDoubleElimination = typeStr.includes("double") || bracketData.lower.length > 0;

  // ── MATHEMATICAL BRACKET POSITIONING ENGINE ──
  const layoutGeometry = useMemo(() => {
    if (currentRounds.length === 0) {
      return { positions: [], canvasWidth: 800, canvasHeight: 600, championPos: null };
    }

    const round0Count = currentRounds[0]?.matches?.length || 1;
    const canvasHeight = Math.max(round0Count * BASE_SLOT_HEIGHT + HEADER_HEIGHT + 80, 640);
    const positions = [];

    // Calculate Y centers for Round 0
    const r0Positions = [];
    const r0Matches = currentRounds[0].matches;
    for (let i = 0; i < r0Matches.length; i++) {
      const topY = HEADER_HEIGHT + i * BASE_SLOT_HEIGHT + 16;
      r0Positions.push(topY + CARD_HEIGHT / 2);
    }
    positions.push(r0Positions);

    // Calculate deterministic midpoint Y centers for all subsequent rounds
    for (let r = 1; r < currentRounds.length; r++) {
      const rMatches = currentRounds[r].matches;
      const prevPos = positions[r - 1];
      const currPositions = [];

      for (let m = 0; m < rMatches.length; m++) {
        let centerY = 0;
        if (activeTab === "upper") {
          // In upper bracket, 2 feeders condense into 1
          const f1Y = prevPos[m * 2];
          const f2Y = prevPos[m * 2 + 1];

          if (f1Y !== undefined && f2Y !== undefined) {
            centerY = (f1Y + f2Y) / 2;
          } else if (f1Y !== undefined) {
            centerY = f1Y;
          } else {
            centerY = HEADER_HEIGHT + (m + 0.5) * (canvasHeight - HEADER_HEIGHT) / rMatches.length;
          }
        } else {
          // In lower bracket
          if (rMatches.length === prevPos.length) {
            // 1-to-1 match alignment
            centerY = prevPos[m];
          } else if (rMatches.length === Math.ceil(prevPos.length / 2)) {
            // 2-to-1 condensation
            const f1Y = prevPos[m * 2];
            const f2Y = prevPos[m * 2 + 1];
            centerY = (f1Y !== undefined && f2Y !== undefined) ? (f1Y + f2Y) / 2 : (f1Y || HEADER_HEIGHT + 100);
          } else {
            centerY = HEADER_HEIGHT + (m + 0.5) * (canvasHeight - HEADER_HEIGHT) / rMatches.length;
          }
        }
        currPositions.push(centerY);
      }
      positions.push(currPositions);
    }

    const colCount = currentRounds.length + (activeTab === "upper" && bracketData.champion ? 1 : 0);
    const canvasWidth = colCount * (CARD_WIDTH + COL_GAP) + 60;

    let championPos = null;
    if (activeTab === "upper" && bracketData.champion && positions.length > 0) {
      const lastRPos = positions[positions.length - 1];
      const champX = currentRounds.length * (CARD_WIDTH + COL_GAP);
      const champY = lastRPos[0] || (canvasHeight / 2);
      championPos = { x: champX, y: champY };
    }

    return { positions, canvasWidth, canvasHeight, championPos };
  }, [currentRounds, activeTab, bracketData.champion]);

  // Zoom control handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 1.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.6));
  const handleResetZoom = () => setZoomLevel(1);
  const handleFitToScreen = () => {
    if (!containerRef.current || layoutGeometry.canvasWidth === 0) return;
    const availableWidth = containerRef.current.clientWidth - 40;
    const ratio = Math.max(0.45, Math.min(1.15, availableWidth / layoutGeometry.canvasWidth));
    setZoomLevel(Number(ratio.toFixed(2)));
    containerRef.current.scrollLeft = 0;
  };

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("select") || e.target.closest(".match-card")) {
      return;
    }
    setIsDragging(true);
    setDragStart({
      x: e.pageX - containerRef.current.offsetLeft,
      y: e.pageY - containerRef.current.offsetTop,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = (x - dragStart.x) * 1.2;
    const walkY = (y - dragStart.y) * 1.2;
    containerRef.current.scrollLeft = dragStart.scrollLeft - walkX;
    containerRef.current.scrollTop = dragStart.scrollTop - walkY;
  };

  const handleMouseUp = () => setIsDragging(false);

  // Toggle player highlight on click
  const handlePlayerClick = (playerName, e) => {
    if (e) e.stopPropagation();
    if (!playerName || playerName === "BYE" || playerName.startsWith("Winner of")) return;
    setHighlightedPlayer(prev => prev === playerName ? null : playerName);
  };

  const rawMatch = selectedMatchModal 
    ? dbMatches.find(m => m._id === selectedMatchModal.id) 
    : null;
  const modalMatchRound = rawMatch?.round || 1;

  // ── CANVAS-RELATIVE SVG CONNECTOR PATHS ──
  const renderBracketLines = () => {
    if (currentRounds.length === 0 || layoutGeometry.positions.length === 0) return null;

    const paths = [];
    const { positions, championPos } = layoutGeometry;

    currentRounds.forEach((round, r) => {
      if (r === currentRounds.length - 1) return;

      const nextRound = currentRounds[r + 1];
      const currPos = positions[r];
      const nextPos = positions[r + 1];

      const x1 = r * (CARD_WIDTH + COL_GAP) + CARD_WIDTH;
      const x2 = (r + 1) * (CARD_WIDTH + COL_GAP);
      const xMid = x1 + COL_GAP / 2;

      round.matches.forEach((match, mIdx) => {
        let targetIdx = 0;
        if (activeTab === "upper") {
          targetIdx = Math.floor(mIdx / 2);
        } else {
          targetIdx = (nextRound.matches.length === round.matches.length) ? mIdx : Math.floor(mIdx / 2);
        }

        const nextMatch = nextRound.matches[targetIdx];
        if (!nextMatch) return;

        const y1 = currPos[mIdx];
        const yTarget = nextPos[targetIdx];

        if (y1 === undefined || yTarget === undefined) return;

        // Determine if line represents active highlighted/hovered player's winning pathway
        const winnerName = match.p1.isWinner ? match.p1.name : (match.p2.isWinner ? match.p2.name : null);
        const isPlayerLine = activeHighlight && winnerName === activeHighlight;

        // Orthogonal elbow bracket curve with rounded corner chamfer
        let d = "";
        const dy = yTarget - y1;
        if (Math.abs(dy) < 3) {
          // Perfectly straight horizontal line
          d = `M ${x1} ${y1} H ${x2}`;
        } else {
          const radius = Math.min(10, Math.abs(dy) / 2);
          const dirY = dy > 0 ? 1 : -1;
          d = `M ${x1} ${y1} H ${xMid - radius} Q ${xMid} ${y1} ${xMid} ${y1 + radius * dirY} V ${yTarget - radius * dirY} Q ${xMid} ${yTarget} ${xMid + radius} ${yTarget} H ${x2}`;
        }

        paths.push(
          <path
            key={`line-${round.roundNumber}-${mIdx}-${targetIdx}`}
            d={d}
            className={`bracket-connector-path ${isPlayerLine ? "path-highlighted" : ""}`}
            fill="none"
          />
        );

        // Circular junction node at the fork midpoint
        paths.push(
          <circle
            key={`node-${round.roundNumber}-${mIdx}-${targetIdx}`}
            cx={xMid}
            cy={yTarget}
            r={isPlayerLine ? 4 : 2.5}
            className={`bracket-junction-dot ${isPlayerLine ? "dot-highlighted" : ""}`}
          />
        );
      });
    });

    // Connector to Grand Champion Box
    if (activeTab === "upper" && championPos && positions.length > 0) {
      const lastR = currentRounds.length - 1;
      const xFinal = lastR * (CARD_WIDTH + COL_GAP) + CARD_WIDTH;
      const yFinal = positions[lastR][0];
      const xChamp = championPos.x;
      const isChampPlayer = activeHighlight && bracketData.champion?.name === activeHighlight;
      const yChamp = championPos.y;
      const champPath = Math.abs(yChamp - yFinal) < 2
        ? `M ${xFinal} ${yFinal} H ${xChamp}`
        : `M ${xFinal} ${yFinal} H ${xFinal + 35} V ${yChamp} H ${xChamp}`;

      paths.push(
        <path
          key="champ-line"
          d={champPath}
          className={`bracket-connector-path champ-line ${isChampPlayer ? "path-highlighted" : ""}`}
          fill="none"
        />
      );
    }

    return paths;
  };

  return (
    <div className="challonge-wrapper glass-panel">
      {/* ── TOP CONTROLS & HEADER ── */}
      <div className="challonge-header">
        <div className="challonge-title-area">
          <div className="badge-row">
            <span className="challonge-live-badge">⚡ Interactive Knockout Tree</span>
            {highlightedPlayer && (
              <span className="highlight-pill" onClick={() => setHighlightedPlayer(null)}>
                Tracing: <strong>{highlightedPlayer}</strong> ✕
              </span>
            )}
          </div>
          <h2 className="challonge-tournament-name">{dbTitle}</h2>
        </div>

        <div className="challonge-controls">
          {/* Upper / Lower Bracket Toggle */}
          {isDoubleElimination && (
            <div className="bracket-tab-group">
              <button
                className={`bracket-tab-btn ${activeTab === "upper" ? "active" : ""}`}
                onClick={() => setActiveTab("upper")}
              >
                👑 Upper Bracket
              </button>
              <button
                className={`bracket-tab-btn ${activeTab === "lower" ? "active" : ""}`}
                onClick={() => setActiveTab("lower")}
              >
                ⚡ Lower Bracket
              </button>
            </div>
          )}

          {/* Zoom & Reset Controls */}
          <div className="zoom-controls">
            <button onClick={handleZoomOut} title="Zoom Out" className="zoom-btn">−</button>
            <span className="zoom-percentage">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={handleZoomIn} title="Zoom In" className="zoom-btn">+</button>
            <button onClick={handleResetZoom} title="Reset Zoom to 100%" className="zoom-btn reset">Reset</button>
            <button onClick={handleFitToScreen} title="Fit Entire Bracket to View" className="zoom-btn reset fit-btn">Fit View</button>
          </div>
        </div>
      </div>

      {/* Round Quick Jump Navigation Bar */}
      {currentRounds.length > 0 && (
        <div className="round-jump-bar">
          <span className="jump-bar-label">⚡ Rounds:</span>
          <div className="round-jump-chips">
            {currentRounds.map((r, idx) => (
              <button
                key={idx}
                className="round-jump-chip"
                onClick={() => {
                  if (containerRef.current) {
                    const targetX = idx * (CARD_WIDTH + COL_GAP) * zoomLevel;
                    containerRef.current.scrollTo({ left: targetX, behavior: "smooth" });
                  }
                }}
              >
                <span className="chip-badge">R{r.roundNumber}</span>
                <span className="chip-name">{r.roundName}</span>
              </button>
            ))}
            {activeTab === "upper" && bracketData.champion && (
              <button
                className="round-jump-chip gold"
                onClick={() => {
                  if (containerRef.current) {
                    const targetX = (currentRounds.length * (CARD_WIDTH + COL_GAP) - 100) * zoomLevel;
                    containerRef.current.scrollTo({ left: targetX, behavior: "smooth" });
                  }
                }}
              >
                <span className="chip-badge gold">👑</span> Champion
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bracket Interaction Hint */}
      <div className="bracket-interaction-hint">
        <span>💡 Hover over any player to preview their winning route. Click to lock tracking. Click &amp; drag canvas to pan.</span>
      </div>

      {/* ── MAIN INTERACTIVE BRACKET CANVAS ── */}
      <div 
        ref={containerRef}
        className={`bracket-canvas-container ${isDragging ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading ? (
          <div className="bracket-empty-state">
            <div className="spinner-gold" />
            <p style={{ color: "#f3c144", marginTop: "12px", fontWeight: "700" }}>Loading tournament tree from database...</p>
          </div>
        ) : error ? (
          <div className="bracket-empty-state error">
            <p style={{ color: "#e74c3c", fontWeight: "700" }}>Database Error: {error}</p>
          </div>
        ) : currentRounds.length === 0 ? (
          <div className="bracket-empty-state">
            <p style={{ fontSize: "1.1rem", marginBottom: "8px", color: "#fff", fontWeight: "700" }}>No match results recorded yet.</p>
            <p style={{ fontSize: "0.88rem", color: "#888" }}>
              Staff members can generate matchups under <strong>Staff Actions</strong> to build the elimination tree live!
            </p>
          </div>
        ) : (
          <div
            className="bracket-tree-canvas"
            style={{
              width: `${layoutGeometry.canvasWidth}px`,
              height: `${layoutGeometry.canvasHeight}px`,
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left"
            }}
          >
            {/* SVG Elbow Bracket Connectors Layer */}
            <svg
              className="bracket-svg-layer"
              width={layoutGeometry.canvasWidth}
              height={layoutGeometry.canvasHeight}
            >
              <defs>
                <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {renderBracketLines()}
            </svg>

            {/* Round Columns with Geometrically Positioned Match Cards */}
            {currentRounds.map((round, rIndex) => {
              const colX = rIndex * (CARD_WIDTH + COL_GAP);
              const roundPositions = layoutGeometry.positions[rIndex] || [];

              return (
                <div
                  key={rIndex}
                  className="bracket-round-column"
                  style={{
                    left: `${colX}px`,
                    width: `${CARD_WIDTH}px`
                  }}
                >
                  {/* Round Header Bar */}
                  <div className="round-header-box">
                    <span className="round-number-tag">R{round.roundNumber}</span>
                    <span className="round-name-text">{round.roundName}</span>
                  </div>

                  {/* Matchup Cards */}
                  {round.matches.map((match, mIdx) => {
                    const centerY = roundPositions[mIdx] || (HEADER_HEIGHT + mIdx * BASE_SLOT_HEIGHT + CARD_HEIGHT / 2);
                    const topY = centerY - (CARD_HEIGHT / 2);

                    const isByeMatch = match.p1.name === "BYE" || match.p2.name === "BYE";
                    const isFeederP1 = match.p1.name && match.p1.name.startsWith("Winner of");
                    const isFeederP2 = match.p2.name && match.p2.name.startsWith("Winner of");

                    const hasHighlightedPlayer = activeHighlight && (
                      match.p1.name === activeHighlight || match.p2.name === activeHighlight
                    );
                    const isDimmed = activeHighlight && !hasHighlightedPlayer;

                    return (
                      <div
                        key={match.id}
                        id={`match-${activeTab}-${round.roundNumber}-${mIdx}`}
                        className={`match-card glass-panel-card clickable-match ${isByeMatch ? "match-bye-card" : ""} ${hasHighlightedPlayer ? "card-highlighted" : ""} ${isDimmed ? "card-dimmed" : ""}`}
                        style={{
                          position: "absolute",
                          top: `${topY}px`,
                          left: 0,
                          width: `${CARD_WIDTH}px`,
                          height: `${CARD_HEIGHT}px`
                        }}
                        onClick={() => {
                          if (isByeMatch) {
                            alert("⚡ This matchup was advanced automatically by BYE.");
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
                          const curTime = foundMatch?.matchTime || match.matchTime || "";
                          const parsedD = extractDateForPicker(curTime) || (matchesData?.[0]?.matchTime ? extractDateForPicker(matchesData[0].matchTime) : "2025-10-04");
                          const parsedT = extractTimeForPicker(curTime) || "10:00";
                          setScheduleDate(parsedD);
                          setScheduleTime(parsedT);
                        }}
                      >
                        {/* Match Header with Code & Scheduled Time */}
                        <div className="match-card-header">
                          <span className="match-code">{match.matchCode}</span>
                          {match.matchTime && (
                            <span className="match-scheduled-time" title={`Scheduled: ${match.matchTime}`}>
                              🕒 {match.matchTime}
                            </span>
                          )}
                          <span className={`match-status-badge ${isByeMatch ? "bye-advance" : (match.status ? match.status.toLowerCase() : "pending")}`}>
                            {isByeMatch ? "BYE ADVANCE" : match.status}
                          </span>
                        </div>

                        {/* Player 1 Row */}
                        <div 
                          className={`match-player-row ${match.p1.isWinner ? "winner" : (match.p1.name === "BYE" ? "bye-row" : "loser")} ${activeHighlight && match.p1.name === activeHighlight ? "player-highlighted" : ""}`}
                          onClick={(e) => handlePlayerClick(match.p1.name, e)}
                          onMouseEnter={() => match.p1.name !== "BYE" && !isFeederP1 && setHoveredPlayer(match.p1.name)}
                          onMouseLeave={() => setHoveredPlayer(null)}
                        >
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
                            <span className={`player-name ${match.p1.name === "BYE" ? "name-bye" : (isFeederP1 ? "name-feeder" : "")}`} title={match.p1.name}>
                              {match.p1.name === "BYE" ? "🚫 BYE (No Opponent)" : match.p1.name}
                            </span>
                          </div>
                          <div className="player-score">
                            {match.p1.name === "BYE" ? "—" : match.p1.score}
                            {match.p1.isWinner && <span className="winner-check">✓</span>}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="match-vs-divider" />

                        {/* Player 2 Row */}
                        <div 
                          className={`match-player-row ${match.p2.isWinner ? "winner" : (match.p2.name === "BYE" ? "bye-row" : "loser")} ${activeHighlight && match.p2.name === activeHighlight ? "player-highlighted" : ""}`}
                          onClick={(e) => handlePlayerClick(match.p2.name, e)}
                          onMouseEnter={() => match.p2.name !== "BYE" && !isFeederP2 && setHoveredPlayer(match.p2.name)}
                          onMouseLeave={() => setHoveredPlayer(null)}
                        >
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
                            <span className={`player-name ${match.p2.name === "BYE" ? "name-bye" : (isFeederP2 ? "name-feeder" : "")}`} title={match.p2.name}>
                              {match.p2.name === "BYE" ? "🚫 BYE (No Opponent)" : match.p2.name}
                            </span>
                          </div>
                          <div className="player-score">
                            {match.p2.name === "BYE" ? "—" : match.p2.score}
                            {match.p2.isWinner && <span className="winner-check">✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* ── GRAND CHAMPION PODIUM CARD ── */}
            {activeTab === "upper" && layoutGeometry.championPos && bracketData.champion && (
              <div 
                className="bracket-champion-podium"
                style={{
                  position: "absolute",
                  left: `${layoutGeometry.championPos.x}px`,
                  top: `${layoutGeometry.championPos.y - 120}px`,
                  width: `${CARD_WIDTH}px`
                }}
              >
                <div className="round-header-box gold">
                  <span className="round-number-tag gold">👑</span>
                  <span className="round-name-text gold">Tournament Winner</span>
                </div>

                <div 
                  id="champion-display-box" 
                  className={`champion-display-box glass-panel-card gold-glow ${activeHighlight && bracketData.champion.name === activeHighlight ? "card-highlighted" : ""}`}
                  onClick={() => handlePlayerClick(bracketData.champion.name)}
                  onMouseEnter={() => setHoveredPlayer(bracketData.champion.name)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                >
                  <div className="champion-trophy-icon">🏆</div>
                  <img 
                    src={getPlayerAvatarUrl(bracketData.champion.name, playerAvatars)} 
                    alt={bracketData.champion.name} 
                    className="bracket-champion-avatar"
                    onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                  />
                  <h3 className="champion-name">{bracketData.champion.name}</h3>
                  <span className="champion-title-tag">{bracketData.champion.title || "Grand Champion"}</span>
                  <span className="champion-seed-tag">Seed #{bracketData.champion.seed}</span>
                </div>

                {/* Runner-Up Recognition Badge */}
                {bracketData.runnerUp && (
                  <div 
                    className={`champion-runnerup-pill ${activeHighlight === bracketData.runnerUp.name ? "pill-highlighted" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayerClick(bracketData.runnerUp.name);
                    }}
                    onMouseEnter={() => setHoveredPlayer(bracketData.runnerUp.name)}
                    onMouseLeave={() => setHoveredPlayer(null)}
                    title={`Click or hover to trace ${bracketData.runnerUp.name}'s path`}
                  >
                    <span className="runnerup-medal">🥈</span>
                    <div className="runnerup-info">
                      <span className="runnerup-tag">Runner-Up</span>
                      <span className="runnerup-name">{bracketData.runnerUp.name}</span>
                    </div>
                    <span className="runnerup-seed">#{bracketData.runnerUp.seed}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MATCH DETAILS & STAFF ACTIONS MODAL ── */}
      {selectedMatchModal && (
        <div className="match-modal-overlay" onClick={() => setSelectedMatchModal(null)}>
          <div className="match-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="match-modal-close" onClick={() => setSelectedMatchModal(null)}>
              ✕
            </button>
            <div className="match-modal-header">
              <span className="match-code-tag">{selectedMatchModal.matchCode}</span>
              <h3 style={{ margin: "8px 0 0", color: "#fff", fontSize: "1.25rem" }}>Tournament Match Details</h3>
            </div>

            <div className="match-modal-vs-box">
              {/* Player 1 Details */}
              <div 
                className={`modal-player-card ${selectedMatchModal.p1.isWinner ? "winner" : ""}`}
                onClick={() => {
                  if (onSelectPlayer && selectedMatchModal.p1.name !== "BYE") {
                    onSelectPlayer(selectedMatchModal.p1.name);
                    setSelectedMatchModal(null);
                  }
                }}
              >
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

              {/* Player 2 Details */}
              <div 
                className={`modal-player-card ${selectedMatchModal.p2.isWinner ? "winner" : ""}`}
                onClick={() => {
                  if (onSelectPlayer && selectedMatchModal.p2.name !== "BYE") {
                    onSelectPlayer(selectedMatchModal.p2.name);
                    setSelectedMatchModal(null);
                  }
                }}
              >
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
              <p style={{ margin: "4px 0" }}>Match Status: <strong>{selectedMatchModal.status}</strong></p>
              <p style={{ margin: "4px 0", color: "#b5afa1" }}>
                Scheduled Match Time:{" "}
                <strong style={{ color: (rawMatch?.matchTime || selectedMatchModal.matchTime) ? "#f3c144" : "#888" }}>
                  {rawMatch?.matchTime || selectedMatchModal.matchTime || "TBD (Not scheduled yet)"}
                </strong>
              </p>
            </div>

            {/* Staff Scheduling Action */}
            {isStaff && onUpdateMatch && (
              <div style={{ marginTop: "14px", background: "rgba(243, 193, 68, 0.06)", border: "1px solid rgba(243, 193, 68, 0.25)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                  <label style={{ color: "#f3c144", fontSize: "0.82rem", fontWeight: "700", margin: 0 }}>
                    🕒 Set Match Schedule (Date &amp; Time):
                  </label>
                  <span style={{ fontSize: "0.7rem", color: "#2ecc71", fontWeight: "700", background: "rgba(46, 204, 113, 0.12)", border: "1px solid rgba(46, 204, 113, 0.3)", padding: "2px 7px", borderRadius: "4px" }}>
                    📅 Connected to Club Calendar
                  </span>
                </div>
                {/* Quick Date Presets */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "4px 0 8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.72rem", color: "#bab19c", fontWeight: "700" }}>
                    📅 Quick Dates:
                  </span>
                  {[
                    { label: "Oct 4 (R1)", val: "2025-10-04" },
                    { label: "Oct 5 (L1)", val: "2025-10-05" },
                    { label: "Oct 11 (Qtrs)", val: "2025-10-11" },
                    { label: "Oct 17 (Semis)", val: "2025-10-17" },
                    { label: "Oct 19 (Finals)", val: "2025-10-19" },
                    { label: "Today", val: new Date().toISOString().split("T")[0] }
                  ].map((dPreset, dIdx) => (
                    <button
                      key={dIdx}
                      type="button"
                      onClick={() => setScheduleDate(dPreset.val)}
                      style={{
                        background: scheduleDate === dPreset.val ? "#f3c144" : "rgba(255, 255, 255, 0.08)",
                        color: scheduleDate === dPreset.val ? "#15120c" : "#ddd",
                        border: "1px solid rgba(243, 193, 68, 0.25)",
                        padding: "3px 8px",
                        borderRadius: "10px",
                        fontSize: "0.72rem",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      {dPreset.label}
                    </button>
                  ))}
                </div>

                {/* Round-Specific Timing Presets */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "4px 0 10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.72rem", color: "#bab19c", fontWeight: "700" }}>
                    🎯 Round {modalMatchRound} Times:
                  </span>
                  {(modalMatchRound === 1 
                    ? [{ label: "10:00 AM", val: "10:00" }, { label: "10:30 AM", val: "10:30" }, { label: "11:00 AM", val: "11:00" }, { label: "11:30 AM", val: "11:30" }] 
                    : modalMatchRound === 2 
                    ? [{ label: "1:00 PM", val: "13:00" }, { label: "1:30 PM", val: "13:30" }, { label: "2:00 PM", val: "14:00" }]
                    : modalMatchRound === 3
                    ? [{ label: "3:00 PM", val: "15:00" }, { label: "3:30 PM", val: "15:30" }, { label: "4:30 PM", val: "16:30" }]
                    : modalMatchRound === 4
                    ? [{ label: "2:00 PM", val: "14:00" }, { label: "3:30 PM", val: "15:30" }]
                    : [{ label: "2:00 PM", val: "14:00" }, { label: "5:00 PM", val: "17:00" }]
                  ).map((tPreset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setScheduleTime(tPreset.val)}
                      style={{
                        background: scheduleTime === tPreset.val ? "#f3c144" : "rgba(243, 193, 68, 0.12)",
                        color: scheduleTime === tPreset.val ? "#15120c" : "#f3c144",
                        border: "1px solid rgba(243, 193, 68, 0.3)",
                        padding: "3px 8px",
                        borderRadius: "12px",
                        fontSize: "0.72rem",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      {tPreset.label}
                    </button>
                  ))}
                </div>

                {/* Visual Native Date & Time Pickers */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", alignItems: "flex-end" }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "#8c867a", display: "block", marginBottom: "3px", fontWeight: "600" }}>
                      Pick Date:
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      style={{ width: "100%", background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "7px 10px", borderRadius: "6px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "#8c867a", display: "block", marginBottom: "3px", fontWeight: "600" }}>
                      Pick Time:
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      style={{ width: "100%", background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "7px 10px", borderRadius: "6px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const formatted = formatPickerToSchedule(scheduleDate, scheduleTime);
                          if (!formatted) {
                            alert("Please select a date first!");
                            return;
                          }
                          await onUpdateMatch(selectedMatchModal.id, { matchTime: formatted });
                          alert(`Match scheduled for ${formatted} and synced with the club calendar!`);
                          setSelectedMatchModal(null);
                        } catch (err) {
                          alert("Error updating schedule: " + err.message);
                        }
                      }}
                      style={{ background: "#f3c144", color: "#15120c", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "800", cursor: "pointer", fontSize: "0.82rem", whiteSpace: "nowrap" }}
                    >
                      Save Schedule
                    </button>
                  </div>
                </div>

                {/* Live Preview Pill */}
                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(0,0,0,0.3)", padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: "0.74rem", color: "#8c867a" }}>Selected Schedule:</span>
                  <strong style={{ color: "#f3c144", fontSize: "0.84rem" }}>
                    📅 {formatPickerToSchedule(scheduleDate, scheduleTime) || "Please pick date & time"}
                  </strong>
                </div>
                <p style={{ margin: "7px 0 0", fontSize: "0.74rem", color: "#8c867a" }}>
                  💡 Setting a date &amp; time automatically syncs this match to the <strong>Club Calendar</strong> with round info and live scores.
                </p>
              </div>
            )}

            {/* Staff Score Submission Action */}
            {isStaff && onUpdateMatch && (
              <div className="match-modal-actions" style={{ marginTop: "20px", borderTop: "1px solid #36332b", paddingTop: "15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#bab19c", fontSize: "0.88rem", fontWeight: "600" }}>Record Winner:</span>
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
