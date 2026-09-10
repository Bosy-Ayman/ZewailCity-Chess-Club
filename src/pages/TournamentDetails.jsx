import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChallongeBracket from "../components/ChallongeBracket";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { getPlayerAvatarUrl } from "../utils/api";
import './TournamentDetails.css';

export default function TournamentDetails() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("bracket"); // "bracket" or "table"
  const [celebrationModalOpen, setCelebrationModalOpen] = useState(false);
  const { width, height } = useWindowSize();

  // Interactive Player Preview Modal State
  const [selectedPlayerModal, setSelectedPlayerModal] = useState(null);
  const [cheerCount, setCheerCount] = useState(0);
  const [cheered, setCheered] = useState(false);
  const [challengeSent, setChallengeSent] = useState(false);
  const [challengeTimeControl, setChallengeTimeControl] = useState("3+2 Blitz");

  // Check role
  const userRole = localStorage.getItem("userRole") || "member";
  const isLoggedIn = !!localStorage.getItem("adminToken");
  const isStaff = isLoggedIn && (userRole === "admin" || userRole === "oc");

  // Parse ID
  const queryParams = new URLSearchParams(window.location.search);
  const tournamentId = queryParams.get("id");

  const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

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
  const [matchForm, setMatchForm] = useState({ round: 1, white: "", black: "", result: "1-0", matchTime: "" });

  // Edit Tournament Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    type: "Swiss",
    status: "Upcoming",
    startDate: "",
    endDate: "",
    time: "",
    location: "",
    rounds: 5,
    description: ""
  });

  const handleOpenEditModal = () => {
    if (!tournament) return;
    setEditForm({
      title: tournament.title || "",
      type: tournament.type || "Swiss",
      status: tournament.status || "Upcoming",
      startDate: tournament.startDate || "",
      endDate: tournament.endDate && tournament.endDate !== "Unknown" ? tournament.endDate : "",
      time: tournament.time || "",
      location: tournament.location || "Zewail Chess Club",
      rounds: tournament.rounds || 5,
      description: tournament.description || ""
    });
    setEditModalOpen(true);
  };

  const handleEditTournamentSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (err) { throw new Error("Invalid server response"); }
      if (!res.ok) throw new Error(data.error || "Failed to update tournament");
      alert("Tournament information updated successfully!");
      setEditModalOpen(false);
      fetchTournamentDetails();
    } catch (err) {
      alert("Error updating tournament: " + err.message);
    }
  };

  const handleSetMatchSchedule = async (matchId, currentTime) => {
    const newTime = window.prompt("Set scheduled date & time for this match (e.g. Tomorrow 8:00 PM, or Sept 15, 18:30):", currentTime || "");
    if (newTime !== null) {
      await handleUpdateMatch(matchId, { matchTime: newTime.trim() });
    }
  };

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
      setMatchForm({ round: matchForm.round, white: "", black: "", result: "1-0", matchTime: "" });
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

  const handleResetBracket = async () => {
    if (!window.confirm("⚠️ Are you sure you want to reset the entire tournament bracket? This will remove all generated matches so you can generate a fresh bracket.")) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/matches`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset bracket");
      alert("Bracket reset successfully! You can now generate a fresh bracket.");
      fetchTournamentDetails();
    } catch (err) {
      alert("Error resetting bracket: " + err.message);
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
      const payload = { status: newStatus };
      if (newStatus === "Completed") {
        if (isSwissFormat && swissStandings && swissStandings.length > 0) {
          payload.winner = swissStandings[0].name;
          payload.podium = swissStandings.slice(0, 3).map((p, idx) => ({
            place: idx + 1,
            name: p.name,
            points: p.points
          }));
        } else {
          const matches = tournament?.matches || [];
          if (matches.length > 0) {
            const maxRound = Math.max(...matches.map(m => m.round || 1));
            const finalMatch = matches.find(m => m.round === maxRound);
            if (finalMatch && finalMatch.result) {
              if (finalMatch.result === "1-0") payload.winner = finalMatch.white;
              else if (finalMatch.result === "0-1") payload.winner = finalMatch.black;
            }
          }
        }
      }
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update tournament status");
      alert(`Tournament status updated to "${newStatus}"!`);
      fetchTournamentDetails();
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  };

  // Export Tournament Pairings & Match Results as PGN
  const handleExportPGN = () => {
    if (!tournament) return;
    const matches = tournament.matches || [];
    if (matches.length === 0) {
      alert("No matches recorded to export yet!");
      return;
    }

    const cleanTitle = (tournament.title || "ZC Chess Tournament").replace(/[^\w\s-]/g, "").trim();
    let pgnContent = `[Event "${cleanTitle}"]\n[Site "Zewail City of Science and Technology"]\n[Date "${tournament.startDate || new Date().toISOString().split("T")[0]}"]\n[TournamentType "${tournament.type || "Swiss"}"]\n\n`;

    matches.forEach((m, idx) => {
      const white = m.white || "White";
      const black = m.black || "Black";
      const round = m.round || 1;
      let result = m.result || "*";
      if (result === "1 - 0") result = "1-0";
      if (result === "0 - 1") result = "0-1";
      if (result === "1/2 - 1/2" || result === "½ - ½" || result === "Draw") result = "1/2-1/2";
      if (result === "Pending") result = "*";

      pgnContent += `[Event "${cleanTitle}"]\n`;
      pgnContent += `[Site "Zewail City"]\n`;
      pgnContent += `[Date "${tournament.startDate || "2026.09.09"}"]\n`;
      pgnContent += `[Round "${round}.${idx + 1}"]\n`;
      pgnContent += `[White "${white}"]\n`;
      pgnContent += `[Black "${black}"]\n`;
      pgnContent += `[Result "${result}"]\n\n`;
      pgnContent += `${result}\n\n`;
    });

    const blob = new Blob([pgnContent], { type: "application/x-chess-pgn;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cleanTitle.replace(/\s+/g, "_")}_Matches.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Standings and Results as CSV
  const handleExportCSV = () => {
    if (!tournament) return;
    const cleanTitle = (tournament.title || "ZC Chess Tournament").replace(/[^\w\s-]/g, "").trim();
    let csvContent = "";

    if (isSwissFormat) {
      csvContent = "Rank,Player Name,Points,Wins,Draws,Losses,Played,Byes,Rating,Major\n";
      swissStandings.forEach((p, idx) => {
        csvContent += `${idx + 1},"${p.name}",${p.points},${p.wins},${p.draws},${p.losses},${p.played},${p.byes},${p.rating},"${p.major}"\n`;
      });
    } else {
      csvContent = "Round,White,Black,Result\n";
      (tournament.matches || []).forEach((m) => {
        csvContent += `${m.round},"${m.white}","${m.black}","${m.result || "Pending"}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cleanTitle.replace(/\s+/g, "_")}_Standings.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const openPlayerPreview = (playerName, extra = {}) => {
    if (!playerName || playerName === "BYE" || playerName === "— BYE —" || playerName === "TBD") return;
    const clean = playerName.trim();
    const profileFromDb = tournament?.playerProfiles?.[clean] || tournament?.playerProfiles?.[clean.toLowerCase()] || {};
    const avatarUrl = getPlayerAvatarUrl(clean, tournament?.playerAvatars);
    
    // Find swiss standing if exists
    const standing = swissStandings.find(s => s.name.toLowerCase() === clean.toLowerCase());
    
    const dbCheers = typeof profileFromDb.cheers === "number" ? profileFromDb.cheers : 0;

    setSelectedPlayerModal({
      name: clean,
      email: profileFromDb.email || "",
      avatar: avatarUrl,
      major: profileFromDb.major || extra.major || standing?.major || "Zewail City Tactician",
      batch: profileFromDb.batch || "ZC '25",
      rating: profileFromDb.fideRating || extra.rating || standing?.rating || 1500,
      chessTitle: profileFromDb.chessTitle || (standing && standing.wins >= 2 ? "Candidate Master" : "Active Competitor"),
      favOpening: profileFromDb.favOpening || "Sicilian Defense / Queen's Gambit",
      bio: profileFromDb.bio || "Active tournament tactician competing for Zewail City honors.",
      standing: standing || null
    });
    setCheerCount(dbCheers);
    setCheered(false);
    setChallengeSent(false);

    // Fetch fresh profile from database to ensure up-to-date cheer count and email
    const fetchFreshProfile = async () => {
      try {
        const queryUrl = profileFromDb.email 
          ? `${API_BASE}/api/profile?email=${encodeURIComponent(profileFromDb.email)}`
          : `${API_BASE}/api/profile?name=${encodeURIComponent(clean)}`;
        const res = await fetch(queryUrl);
        if (res.ok) {
          const prof = await res.json();
          if (typeof prof.cheers === "number") {
            setCheerCount(prof.cheers);
            if (tournament?.playerProfiles) {
              if (!tournament.playerProfiles[clean]) tournament.playerProfiles[clean] = {};
              tournament.playerProfiles[clean].cheers = prof.cheers;
              if (prof.email) tournament.playerProfiles[clean].email = prof.email;
            }
          }
          if (prof.email) {
            setSelectedPlayerModal(prev => (prev && prev.name === clean ? { ...prev, email: prof.email } : prev));
          }
        }
      } catch (e) {}
    };
    fetchFreshProfile();
  };

  const handleSendCheer = async () => {
    if (!selectedPlayerModal) return;
    const newCount = cheerCount + 1;
    setCheerCount(newCount);
    setCheered(true);
    
    const playerName = selectedPlayerModal.name;
    const playerEmail = selectedPlayerModal.email;
    const loggedInEmail = localStorage.getItem("adminEmail") || localStorage.getItem("userEmail") || "";
    const loggedInName = localStorage.getItem("userName") || "";

    try {
      const res = await fetch(`${API_BASE}/api/users/cheer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmail: playerEmail || "",
          targetName: playerName || "",
          cheererEmail: loggedInEmail,
          cheererName: loggedInName
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.cheers === "number") {
          setCheerCount(data.cheers);
          if (tournament?.playerProfiles) {
            if (tournament.playerProfiles[playerName]) tournament.playerProfiles[playerName].cheers = data.cheers;
            if (playerEmail && tournament.playerProfiles[playerEmail]) tournament.playerProfiles[playerEmail].cheers = data.cheers;
          }
        }
      }
    } catch (err) {
      console.warn("Cheer failed:", err.message);
    }
  };

  const handleSendChallenge = (e) => {
    e.preventDefault();
    setChallengeSent(true);
  };

  // Derive podium winners for celebration modal (works for both Swiss and Knockout formats)
  let podiumP1 = (swissStandings && swissStandings[0]) || null;
  let podiumP2 = (swissStandings && swissStandings[1]) || null;
  let podiumP3 = (swissStandings && swissStandings[2]) || null;

  if (!podiumP1 && tournament) {
    if (tournament.winner) {
      podiumP1 = { name: tournament.winner, points: "Champion" };
    }
    const matches = tournament.matches || [];
    const allMatchesCompleted = matches.length > 0 && matches.every(m => m.result && m.result !== "Pending");
    if (allMatchesCompleted) {
      const maxRound = Math.max(...matches.map(m => m.round || 1));
      const roundMatches = matches.filter(m => (m.round || 1) === maxRound);
      const isKnockout = (tournament.type || "").toLowerCase().includes("knockout") || 
                         (tournament.type || "").toLowerCase().includes("elimination");
      if (isKnockout && roundMatches.length === 1 && (maxRound > 1 || (tournament.playersList && tournament.playersList.length <= 2))) {
        const finalMatch = roundMatches[0];
        if (finalMatch && finalMatch.result && finalMatch.result !== "Pending") {
          const champ = finalMatch.result === "1-0" ? finalMatch.white : (finalMatch.result === "0-1" ? finalMatch.black : null);
          const runnerUp = finalMatch.result === "1-0" ? finalMatch.black : (finalMatch.result === "0-1" ? finalMatch.white : null);
          if (champ && champ !== "BYE" && !podiumP1) podiumP1 = { name: champ, points: "1st Place" };
          if (runnerUp && runnerUp !== "BYE" && !podiumP2) podiumP2 = { name: runnerUp, points: "Finalist" };
        }
      }
    }
    if (tournament.podium && Array.isArray(tournament.podium)) {
      if (tournament.podium[0] && !podiumP1) podiumP1 = tournament.podium[0];
      if (tournament.podium[1] && !podiumP2) podiumP2 = tournament.podium[1];
      if (tournament.podium[2] && !podiumP3) podiumP3 = tournament.podium[2];
    }
  }

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
              {/* Premium Hero Banner */}
              <div className="tournament-hero-card">
                <div className="tournament-hero-top">
                  <div className="tournament-breadcrumb">
                    <a href="/tournaments" className="back-link">← All Tournaments</a>
                    <span className="breadcrumb-sep">/</span>
                    <span className="breadcrumb-curr">{tournament.type || "Tournament"}</span>
                  </div>
                  <div className="tournament-type-pill">
                    <span className="pill-dot"></span>
                    <span>{tournament.type || "Swiss Format"}</span>
                  </div>
                </div>

                <h1 className="tournament-hero-title">{tournament.title}</h1>
                
                <div className="tournament-hero-meta-grid">
                  <div className="hero-meta-item">
                    <span className="meta-icon">📅</span>
                    <div className="meta-texts">
                      <span className="meta-label">Dates</span>
                      <span className="meta-val">{tournament.startDate} {tournament.endDate && tournament.endDate !== 'Unknown' ? `to ${tournament.endDate}` : ""}</span>
                    </div>
                  </div>

                  <div className="hero-meta-item">
                    <span className="meta-icon">📍</span>
                    <div className="meta-texts">
                      <span className="meta-label">Location</span>
                      <span className="meta-val">{tournament.location || "Zewail City Campus"}</span>
                    </div>
                  </div>

                  <div className="hero-meta-item">
                    <span className="meta-icon">⏱️</span>
                    <div className="meta-texts">
                      <span className="meta-label">Time &amp; Clock</span>
                      <span className="meta-val">{tournament.time || "TBD"}</span>
                    </div>
                  </div>

                  <div className="hero-meta-item">
                    <span className="meta-icon">👥</span>
                    <div className="meta-texts">
                      <span className="meta-label">Competitors</span>
                      <span className="meta-val">{tournament.playersList?.length || tournament.players || 0} Registered</span>
                    </div>
                  </div>
                </div>

                {tournament.description && (
                  <p className="tournament-hero-desc">
                    {tournament.description}
                  </p>
                )}

                {/* Sleek Integrated Tournament Progress Tracker */}
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
                      progressMsg = `Round ${maxRound} of ${totalRounds} in Progress`;
                    } else {
                      progressPct = matches.length > 0 ? Math.min(Math.round((completedMatches.length / matches.length) * 100), 90) : 30;
                      progressMsg = `Knockout Bracket Ongoing`;
                    }
                    badgeColor = "#f3c144";
                  } else {
                    progressPct = 0;
                    progressMsg = `Registration Open — Starts ${tournament.startDate || "Soon"}`;
                    badgeColor = "#3498db";
                  }

                  return (
                    <div className="hero-progress-wrapper">
                      <div className="hero-progress-meta">
                        <div className="hero-progress-status">
                          <span className="hero-progress-indicator" style={{ background: badgeColor, boxShadow: `0 0 10px ${badgeColor}` }}></span>
                          <span className="hero-progress-label">{progressMsg}</span>
                        </div>
                        <span className="hero-progress-percent" style={{ color: badgeColor }}>{progressPct}% Completed</span>
                      </div>
                      <div className="hero-progress-track">
                        <div 
                          className="hero-progress-fill" 
                          style={{ 
                            width: `${progressPct}%`,
                            background: badgeColor === "#2ecc71" ? "#2ecc71" : badgeColor === "#f3c144" ? "linear-gradient(90deg, #f3c144, #e2b033)" : "#3498db"
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="tournament-export-actions">
                  {isStaff && (
                    <button 
                      type="button"
                      onClick={handleOpenEditModal}
                      className="export-tournament-btn edit-btn"
                      title="Manage tournament timings, dates, format, and campus venue"
                    >
                      <span>⚙️</span>
                      <span>Manage / Edit Info</span>
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={handleExportPGN}
                    className="export-tournament-btn pgn-btn"
                    title="Export All Match Pairings as PGN file"
                  >
                    <span>♟️</span>
                    <span>Download PGN</span>
                  </button>
                  <button 
                    type="button"
                    onClick={handleExportCSV}
                    className="export-tournament-btn csv-btn"
                    title="Export Standings Report as CSV"
                  >
                    <span>📊</span>
                    <span>Export CSV Report</span>
                  </button>
                </div>
              </div>

              {/* Staff controls for OC and Admins */}
              {isStaff && (
                <div style={{ marginTop: "30px" }}>
                  <h2 className="section-title">Staff Actions (Organizing Committee)</h2>
                  <div className="staff-actions" style={{ gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    <button 
                      type="button"
                      className="add-btn" 
                      onClick={handleOpenEditModal}
                      style={{ background: "linear-gradient(135deg, #3498db, #2980b9)", color: "#fff", fontWeight: "800" }}
                    >
                      ⚙️ Edit Tournament Details
                    </button>
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

                    {/* Reset Tournament Bracket (Knockout only) */}
                    {!isSwissFormat && tournament.matches && tournament.matches.length > 0 && (
                      <button 
                        className="add-btn" 
                        onClick={handleResetBracket}
                        style={{ background: "linear-gradient(135deg, #e67e22, #d35400)", color: "#fff", fontWeight: "800" }}
                        title="Reset bracket and clear all matches to re-seed"
                      >
                        🔄 Reset Bracket
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
                            <td style={{ fontWeight: "600", color: "#fff" }}>
                              <div 
                                className="tournament-player-cell"
                                onClick={() => openPlayerPreview(p.name, p)}
                                title={`Click to view ${p.name}'s Profile Card`}
                              >
                                <div className="player-avatar-ring">
                                  <img
                                    src={getPlayerAvatarUrl(p.name, tournament?.playerAvatars)}
                                    alt={p.name}
                                    className="player-avatar-mini"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                                  />
                                </div>
                                <span className="player-name-text">{p.name}</span>
                              </div>
                            </td>
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

                        <div 
                          className="mobile-player-cell"
                          onClick={() => openPlayerPreview(p.name, p)}
                          title={`Click to view ${p.name}'s Profile Card`}
                        >
                          <img
                            src={getPlayerAvatarUrl(p.name, tournament?.playerAvatars)}
                            alt={p.name}
                            className="player-avatar-mini"
                            onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                          />
                          <h3 className="mobile-card-title" style={{ margin: 0 }}>{p.name}</h3>
                        </div>

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
                                <th>Schedule</th>
                              </tr>
                            </thead>
                            <tbody>
                              {matchesByRound[rNum].map((m, idx) => {
                                const isByeRow = m.black === "BYE";
                                return (
                                  <tr key={m._id || idx} style={{ background: isByeRow ? "rgba(243,193,68,0.05)" : "transparent", opacity: isByeRow ? 0.8 : 1 }}>
                                    <td style={{ color: "#888" }}>Board {idx + 1}</td>
                                    <td style={{ fontWeight: (m.result === "1-0" || m.result === "1 - 0") ? "bold" : "normal", color: (m.result === "1-0" || m.result === "1 - 0") ? "#f3c144" : "#fff" }}>
                                      <div 
                                        className="pairing-player-cell"
                                        onClick={() => openPlayerPreview(m.white)}
                                        title={`Click to view ${m.white}'s Profile Card`}
                                      >
                                        <img
                                          src={getPlayerAvatarUrl(m.white, tournament?.playerAvatars)}
                                          alt={m.white}
                                          className="player-avatar-tiny"
                                          onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                                        />
                                        <span>{m.white} {!isByeRow && (m.result === "1-0" || m.result === "1 - 0") ? "✓" : ""}</span>
                                      </div>
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
                                      {isByeRow ? <em>— BYE —</em> : (
                                        <div 
                                          className="pairing-player-cell"
                                          onClick={() => openPlayerPreview(m.black)}
                                          title={`Click to view ${m.black}'s Profile Card`}
                                        >
                                          <img
                                            src={getPlayerAvatarUrl(m.black, tournament?.playerAvatars)}
                                            alt={m.black}
                                            className="player-avatar-tiny"
                                            onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                                          />
                                          <span>{m.black} {(m.result === "0-1" || m.result === "0 - 1") ? "✓" : ""}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ color: m.matchTime ? "#f3c144" : "#777", fontSize: "0.85rem", fontWeight: m.matchTime ? "600" : "normal" }}>
                                          {m.matchTime ? `🕒 ${m.matchTime}` : isByeRow ? "—" : "TBD"}
                                        </span>
                                        {isStaff && !isByeRow && m._id && (
                                          <button
                                            type="button"
                                            onClick={() => handleSetMatchSchedule(m._id, m.matchTime)}
                                            title="Schedule date and time for this match"
                                            style={{
                                              background: "rgba(243, 193, 68, 0.12)",
                                              border: "1px solid rgba(243, 193, 68, 0.3)",
                                              color: "#f3c144",
                                              borderRadius: "4px",
                                              padding: "2px 6px",
                                              fontSize: "0.72rem",
                                              cursor: "pointer"
                                            }}
                                          >
                                            ✏️ Time
                                          </button>
                                        )}
                                      </div>
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
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    {m.matchTime && (
                                      <span style={{ fontSize: "0.72rem", color: "#f3c144", background: "rgba(243, 193, 68, 0.12)", border: "1px solid rgba(243, 193, 68, 0.25)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                        🕒 {m.matchTime}
                                      </span>
                                    )}
                                    {isByeRow ? (
                                      <span style={{ color: "#f3c144", fontWeight: "bold", fontSize: "0.78rem", background: "rgba(243,193,68,0.12)", padding: "2px 8px", borderRadius: "4px" }}>
                                        BYE (+1 pt)
                                      </span>
                                    ) : (
                                      <span style={{ color: "#f3c144", fontWeight: "bold", fontSize: "0.85rem" }}>{m.result}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="mobile-match-pairing-row">
                                  <div 
                                    className="mobile-match-player" 
                                    onClick={() => openPlayerPreview(m.white)}
                                    title={`Click to view ${m.white}'s Profile Card`}
                                  >
                                    <img
                                      src={getPlayerAvatarUrl(m.white, tournament?.playerAvatars)}
                                      alt={m.white}
                                      className="player-avatar-tiny"
                                      onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                                    />
                                    <span style={{ fontWeight: (m.result === "1-0" || m.result === "1 - 0") ? "bold" : "normal", color: (m.result === "1-0" || m.result === "1 - 0") ? "#f3c144" : "#fff", fontSize: "0.92rem" }}>
                                      ⚪ {m.white}
                                    </span>
                                  </div>
                                  <span style={{ color: "#888", fontSize: "0.75rem", fontWeight: "bold" }}>VS</span>
                                  <div 
                                    className="mobile-match-player" 
                                    onClick={() => !isByeRow && openPlayerPreview(m.black)}
                                    title={!isByeRow ? `Click to view ${m.black}'s Profile Card` : ""}
                                  >
                                    {!isByeRow && (
                                      <img
                                        src={getPlayerAvatarUrl(m.black, tournament?.playerAvatars)}
                                        alt={m.black}
                                        className="player-avatar-tiny"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                                      />
                                    )}
                                    <span style={{ fontWeight: (m.result === "0-1" || m.result === "0 - 1") ? "bold" : "normal", color: (m.result === "0-1" || m.result === "0 - 1") ? "#f3c144" : isByeRow ? "#888" : "#fff", fontSize: "0.92rem" }}>
                                      ⚫ {isByeRow ? "BYE" : m.black}
                                    </span>
                                  </div>
                                </div>

                                {isStaff && !isByeRow && m._id && (
                                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                    <div style={{ flex: 1 }}>
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
                                    <button
                                      type="button"
                                      onClick={() => handleSetMatchSchedule(m._id, m.matchTime)}
                                      style={{
                                        background: "rgba(243, 193, 68, 0.12)",
                                        border: "1px solid rgba(243, 193, 68, 0.35)",
                                        color: "#f3c144",
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        fontWeight: "bold",
                                        fontSize: "0.82rem",
                                        cursor: "pointer",
                                        whiteSpace: "nowrap"
                                      }}
                                      title="Set or update scheduled match time"
                                    >
                                      ⏰ {m.matchTime ? "Time" : "Set Time"}
                                    </button>
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
                        tournamentWinner={tournament.winner}
                        tournamentStatus={tournament.status}
                        matchesData={tournament.matches} 
                        playersData={tournament.playersList}
                        playerAvatars={tournament?.playerAvatars}
                        tournamentTitle={`${tournament.title} (${tournament.type || "Knockout Bracket"})`} 
                        isStaff={isStaff}
                        onUpdateMatch={handleUpdateMatch}
                        onSelectPlayer={(pName) => openPlayerPreview(pName)}
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
                              <th>Schedule</th>
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
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ color: m.matchTime ? "#f3c144" : "#777", fontSize: "0.85rem", fontWeight: m.matchTime ? "600" : "normal" }}>
                                      {m.matchTime ? `🕒 ${m.matchTime}` : "TBD"}
                                    </span>
                                    {isStaff && m._id && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetMatchSchedule(m._id, m.matchTime)}
                                        title="Schedule date and time for this match"
                                        style={{
                                          background: "rgba(243, 193, 68, 0.12)",
                                          border: "1px solid rgba(243, 193, 68, 0.3)",
                                          color: "#f3c144",
                                          borderRadius: "4px",
                                          padding: "2px 6px",
                                          fontSize: "0.72rem",
                                          cursor: "pointer"
                                        }}
                                      >
                                        ✏️ Time
                                      </button>
                                    )}
                                  </div>
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
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {m.matchTime && (
                                  <span style={{ fontSize: "0.72rem", color: "#f3c144", background: "rgba(243, 193, 68, 0.12)", border: "1px solid rgba(243, 193, 68, 0.25)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                    🕒 {m.matchTime}
                                  </span>
                                )}
                                <span style={{ color: "#f3c144", fontWeight: "bold", fontSize: "0.85rem" }}>{m.result}</span>
                              </div>
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
                              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                <div style={{ flex: 1 }}>
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
                                <button
                                  type="button"
                                  onClick={() => handleSetMatchSchedule(m._id, m.matchTime)}
                                  style={{
                                    background: "rgba(243, 193, 68, 0.12)",
                                    border: "1px solid rgba(243, 193, 68, 0.35)",
                                    color: "#f3c144",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    fontWeight: "bold",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap"
                                  }}
                                  title="Set or update scheduled match time"
                                >
                                  ⏰ {m.matchTime ? "Time" : "Set Time"}
                                </button>
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
              <div>
                <label>Scheduled Match Time (Optional)</label>
                <input
                  type="text"
                  value={matchForm.matchTime || ""}
                  onChange={(e) => setMatchForm({ ...matchForm, matchTime: e.target.value })}
                  placeholder="e.g. Tomorrow 8:00 PM, or Sept 15, 18:30"
                  style={{ background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "8px", borderRadius: "8px", width: "100%", marginTop: "5px" }}
                />
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

      {/* --- EDIT TOURNAMENT DETAILS MODAL --- */}
      {editModalOpen && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-card edit-tournament-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "620px" }}>
            <button className="close-btn" onClick={() => setEditModalOpen(false)}>
              &times;
            </button>
            <h3 className="modal-title" style={{ color: "#f3c144" }}>⚙️ Manage Tournament Information</h3>
            <p style={{ color: "#b5afa1", fontSize: "0.84rem", marginTop: "-8px", marginBottom: "18px" }}>
              Configure tournament schedule, match timings, format, status, and campus location.
            </p>

            <form onSubmit={handleEditTournamentSubmit} className="modal-form">
              <div>
                <label>Tournament Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="e.g. ZC Annual Rapid Championship 2026"
                  required
                />
              </div>

              <div className="modal-grid-2">
                <div>
                  <label>Tournament Type / Format *</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    style={{ background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "8px", borderRadius: "8px", width: "100%", marginTop: "5px" }}
                  >
                    <option value="Swiss">Swiss System</option>
                    <option value="Single Elimination">Single Elimination (Knockout)</option>
                    <option value="Double Elimination">Double Elimination</option>
                  </select>
                </div>
                <div>
                  <label>Tournament Status *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "8px", borderRadius: "8px", width: "100%", marginTop: "5px" }}
                  >
                    <option value="Upcoming">Upcoming (Registration Open)</option>
                    <option value="Ongoing">Ongoing (Tournament Live)</option>
                    <option value="Completed">Completed (Finished)</option>
                  </select>
                </div>
              </div>

              <div className="modal-grid-2">
                <div>
                  <label>Start Date *</label>
                  <input
                    type="text"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    placeholder="e.g. 2026-09-20"
                    required
                  />
                </div>
                <div>
                  <label>End Date</label>
                  <input
                    type="text"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    placeholder="e.g. 2026-09-25 or Ongoing"
                  />
                </div>
              </div>

              <div className="modal-grid-2">
                <div>
                  <label>Time &amp; Clock (e.g. 11:00 PM) *</label>
                  <input
                    type="text"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    placeholder="e.g. 11:00 PM or 5:00 PM - 8:00 PM"
                    required
                  />
                </div>
                <div>
                  <label>Location / Venue *</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="e.g. Academic Building Lounge 2"
                    required
                  />
                </div>
              </div>

              <div className="modal-grid-2">
                <div>
                  <label>Total Planned Rounds</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editForm.rounds}
                    onChange={(e) => setEditForm({ ...editForm, rounds: Number(e.target.value) })}
                    placeholder="5"
                  />
                </div>
              </div>

              <div>
                <label>Description &amp; Rules</label>
                <textarea
                  rows="3"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Tournament guidelines, time controls, and eligibility details..."
                  style={{ background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "10px", borderRadius: "8px", width: "100%", fontFamily: "inherit" }}
                ></textarea>
              </div>

              <div className="modal-btn-row">
                <button type="button" className="btn-secondary" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: "linear-gradient(135deg, #f3c144, #d4a32a)", color: "#15120c", fontWeight: "800" }}>
                  💾 Save Changes
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
            <p style={{ color: "#bab19c", marginBottom: "24px", fontSize: "1.05rem" }}>
              Congratulations to our top tacticians for their outstanding tournament performance!
            </p>
            
            {/* Top 3 Podium with Player Photos & Profile Redirects */}
            <div className="celebration-podium-container">
              {/* 2nd Place */}
              {podiumP2 && (
                <div className="celebration-podium-col celebration-col-silver">
                  <div className="celebration-avatar-wrapper">
                    <img 
                      src={getPlayerAvatarUrl(podiumP2.name, tournament?.playerAvatars)} 
                      alt={podiumP2.name} 
                      className="celebration-avatar celebration-avatar-silver"
                      onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                    />
                    <span className="celebration-medal-badge">🥈</span>
                  </div>
                  <div className="celebration-pedestal celebration-pedestal-silver">
                    <h4 className="celebration-player-name" title={podiumP2.name}>{podiumP2.name}</h4>
                    <p className="celebration-player-pts">{podiumP2.points != null ? `${podiumP2.points} pts` : "Runner-Up"}</p>
                    <button 
                      type="button" 
                      className="celebration-profile-btn"
                      onClick={() => {
                        setCelebrationModalOpen(false);
                        navigate(`/profile?name=${encodeURIComponent(podiumP2.name)}`);
                      }}
                    >
                      Profile ↗
                    </button>
                  </div>
                </div>
              )}
              
              {/* 1st Place */}
              {podiumP1 && (
                <div className="celebration-podium-col celebration-col-gold">
                  <div className="celebration-avatar-wrapper celebration-gold-wrapper">
                    <div className="celebration-crown">👑</div>
                    <img 
                      src={getPlayerAvatarUrl(podiumP1.name, tournament?.playerAvatars)} 
                      alt={podiumP1.name} 
                      className="celebration-avatar celebration-avatar-gold"
                      onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                    />
                    <span className="celebration-medal-badge gold-badge">🥇</span>
                  </div>
                  <div className="celebration-pedestal celebration-pedestal-gold">
                    <span className="champion-ribbon">CHAMPION</span>
                    <h4 className="celebration-player-name gold-name" title={podiumP1.name}>{podiumP1.name}</h4>
                    <p className="celebration-player-pts gold-pts">{podiumP1.points != null ? `${podiumP1.points} pts` : "Champion"}</p>
                    <button 
                      type="button" 
                      className="celebration-profile-btn gold-btn"
                      onClick={() => {
                        setCelebrationModalOpen(false);
                        navigate(`/profile?name=${encodeURIComponent(podiumP1.name)}`);
                      }}
                    >
                      Profile ↗
                    </button>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {podiumP3 && (
                <div className="celebration-podium-col celebration-col-bronze">
                  <div className="celebration-avatar-wrapper">
                    <img 
                      src={getPlayerAvatarUrl(podiumP3.name, tournament?.playerAvatars)} 
                      alt={podiumP3.name} 
                      className="celebration-avatar celebration-avatar-bronze"
                      onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                    />
                    <span className="celebration-medal-badge">🥉</span>
                  </div>
                  <div className="celebration-pedestal celebration-pedestal-bronze">
                    <h4 className="celebration-player-name" title={podiumP3.name}>{podiumP3.name}</h4>
                    <p className="celebration-player-pts">{podiumP3.points != null ? `${podiumP3.points} pts` : "3rd Place"}</p>
                    <button 
                      type="button" 
                      className="celebration-profile-btn"
                      onClick={() => {
                        setCelebrationModalOpen(false);
                        navigate(`/profile?name=${encodeURIComponent(podiumP3.name)}`);
                      }}
                    >
                      Profile ↗
                    </button>
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
      {/* Interactive Player Profile Modal */}
      {selectedPlayerModal && (
        <div className="player-modal-overlay" onClick={() => setSelectedPlayerModal(null)}>
          <div className="player-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="player-modal-close" onClick={() => setSelectedPlayerModal(null)}>✕</button>
            
            <div className="player-modal-header">
              <div className="player-modal-avatar-box">
                <img 
                  src={selectedPlayerModal.avatar} 
                  alt={selectedPlayerModal.name}
                  className="player-modal-avatar"
                  onError={(e) => { e.target.onerror = null; e.target.src = "/Icons/unknown.png"; }}
                />
                <span className="player-modal-status-dot" title="Active Competitor"></span>
              </div>
              <div className="player-modal-identity">
                <h3 className="player-modal-name">{selectedPlayerModal.name}</h3>
                <span className="player-modal-tag">{selectedPlayerModal.chessTitle}</span>
                <p className="player-modal-major">{selectedPlayerModal.major} • {selectedPlayerModal.batch}</p>
              </div>
            </div>

            <div className="player-modal-stats-grid">
              <div className="player-stat-card">
                <span className="stat-label">Rating</span>
                <span className="stat-val">{selectedPlayerModal.rating}</span>
              </div>
              {selectedPlayerModal.standing ? (
                <>
                  <div className="player-stat-card">
                    <span className="stat-label">Tournament Pts</span>
                    <span className="stat-val gold">{selectedPlayerModal.standing.points} pts</span>
                  </div>
                  <div className="player-stat-card">
                    <span className="stat-label">Record</span>
                    <span className="stat-val">{selectedPlayerModal.standing.wins}W - {selectedPlayerModal.standing.draws}D - {selectedPlayerModal.standing.losses}L</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="player-stat-card">
                    <span className="stat-label">Status</span>
                    <span className="stat-val gold">In Tournament</span>
                  </div>
                  <div className="player-stat-card">
                    <span className="stat-label">Style</span>
                    <span className="stat-val">Tactical</span>
                  </div>
                </>
              )}
            </div>

            {selectedPlayerModal.favOpening && (
              <div className="player-modal-opening">
                <span className="opening-label">Favorite Opening:</span>
                <span className="opening-val">{selectedPlayerModal.favOpening}</span>
              </div>
            )}

            {/* Direct Profile Link Button */}
            <div className="player-modal-profile-action">
              <button
                type="button"
                className="player-view-profile-btn"
                onClick={() => {
                  const target = selectedPlayerModal.email
                    ? `/profile?email=${encodeURIComponent(selectedPlayerModal.email)}`
                    : `/profile?name=${encodeURIComponent(selectedPlayerModal.name)}`;
                  setSelectedPlayerModal(null);
                  navigate(target);
                }}
              >
                <span>👤 View Full Player Profile &amp; Stats</span>
                <span className="btn-arrow">↗</span>
              </button>
            </div>

            {/* Interactive Social Actions */}
            <div className="player-modal-actions">
              <button 
                className={`player-cheer-btn ${cheered ? "cheered" : ""}`}
                onClick={handleSendCheer}
              >
                <span>👏 Send Cheer</span>
                <span className="cheer-badge">{cheerCount}</span>
              </button>
            </div>

            {/* Interactive Campus Challenge Mini-Form */}
            <div className="player-challenge-box">
              {challengeSent ? (
                <div className="challenge-success-alert">
                  <span>🎉 Challenge Invitation Sent to {selectedPlayerModal.name}! ({challengeTimeControl})</span>
                </div>
              ) : (
                <form onSubmit={handleSendChallenge} className="challenge-form">
                  <div className="challenge-form-row">
                    <label>Challenge Game:</label>
                    <select 
                      value={challengeTimeControl} 
                      onChange={(e) => setChallengeTimeControl(e.target.value)}
                    >
                      <option value="3+2 Blitz">⚡ 3+2 Blitz</option>
                      <option value="5+3 Blitz">⚡ 5+3 Blitz</option>
                      <option value="10 min Rapid">⏱️ 10 min Rapid</option>
                      <option value="Campus Board Showdown">🏛️ Campus Palm Tree Board</option>
                    </select>
                    <button type="submit" className="challenge-submit-btn">
                      Send Challenge ⚔️
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
