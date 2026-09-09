import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { safeFetchJson, getPlayerAvatarUrl } from "../utils/api";
import { chessAudio } from "../utils/chessAudio";
import "./PuzzleChallenge.css";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

export default function PuzzleChallenge() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [tournaments, setTournaments] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customAvatars, setCustomAvatars] = useState({});
  const [expandedTournaments, setExpandedTournaments] = useState({});

  const toggleTournamentExpanded = (id) => {
    setExpandedTournaments((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleAudio = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    chessAudio.toggleSound(nextState);
  };

  // Playing Game States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPuzzleIdx, setCurrentPuzzleIdx] = useState(0);
  const [trials, setTrials] = useState(3);
  const [score, setScore] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [gameFeedback, setGameFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState(""); // 'success' | 'error' | 'info'
  const [isFinished, setIsFinished] = useState(false);
  
  // Chess Instance State
  const [chessGame, setChessGame] = useState(new Chess());
  const [boardFen, setBoardFen] = useState("");
  const [correctMovesList, setCorrectMovesList] = useState([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(0); // tracks index in correctMovesList
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});

  const timerRef = useRef(null);
  const boardLocked = useRef(false); // blocks input while opponent replies or puzzle advances
  
  // Synchronous refs for accurate score tracking across async states
  const scoreRef = useRef(0);
  const solvedCountRef = useRef(0);

  // Dynamic Board Width calculation to prevent piece drag offset
  const boardContainerRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(() => Math.min(window.innerWidth - 32, 380));

  useEffect(() => {
    const updateBoardWidth = () => {
      if (boardContainerRef.current) {
        const innerW = boardContainerRef.current.clientWidth;
        if (innerW > 0) {
          setBoardWidth(innerW);
        }
      } else {
        const containerFallback = Math.min(window.innerWidth - 24, 380);
        setBoardWidth(containerFallback);
      }
    };

    updateBoardWidth();
    const t1 = setTimeout(updateBoardWidth, 50);
    const t2 = setTimeout(updateBoardWidth, 200);
    window.addEventListener("resize", updateBoardWidth);

    let observer;
    if (typeof ResizeObserver !== "undefined" && boardContainerRef.current) {
      observer = new ResizeObserver(() => updateBoardWidth());
      observer.observe(boardContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", updateBoardWidth);
      if (observer) observer.disconnect();
    };
  }, [isPlaying, currentPuzzleIdx]);

  // User session cache
  const isLoggedIn = !!localStorage.getItem("adminToken");
  const userEmail = localStorage.getItem("adminEmail") || "";
  const userRole = localStorage.getItem("userRole") || "member";
  const isAdmin = userRole === "admin" || userRole === "oc" || userRole === "hr";
  const userName = userEmail ? userEmail.split("@")[0] : "Guest Player";

  // Fetch puzzle tournaments and player avatars on load
  useEffect(() => {
    fetchTournaments();
    fetchAvatars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAvatars = async () => {
    try {
      const aData = await safeFetchJson(`${API_BASE}/api/players/avatars`);
      if (aData && aData.avatars) {
        setCustomAvatars((prev) => ({ ...prev, ...aData.avatars }));
      }
      const uList = await safeFetchJson(`${API_BASE}/api/users`);
      if (Array.isArray(uList)) {
        const map = {};
        uList.forEach((u) => {
          if (u.profileImage) {
            if (u.name) map[u.name.trim()] = u.profileImage;
            if (u.email) map[u.email.trim()] = u.profileImage;
          }
        });
        setCustomAvatars((prev) => ({ ...prev, ...map }));
      }
    } catch (err) {
      console.warn("Could not load player avatars:", err.message);
    }
  };

  const MOCK_TOURNAMENTS = [
    {
      _id: "default-arena-1",
      title: "Weekly Tactics Arena",
      startDate: new Date().toISOString().split("T")[0],
      timeLimit: 60,
      puzzles: [
        {
          initialFen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
          mateIn: 1,
          correctMoves: ["h5f7"],
          description: "Find the classic Scholar's Mate in 1 move!"
        },
        {
          initialFen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
          mateIn: 1,
          correctMoves: ["a1a8"],
          description: "Exploit the weak back rank to deliver mate in 1!"
        }
      ],
      leaderboard: []
    }
  ];

  const fetchTournaments = async () => {
    setIsLoading(true);
    try {
      const data = await safeFetchJson(`${API_BASE}/api/puzzle-tournaments`);
      if (Array.isArray(data) && data.length > 0) {
        setTournaments(data);
        return;
      }
      setTournaments(MOCK_TOURNAMENTS);
    } catch (err) {
      console.warn("Failed to load puzzle tournaments from server, using fallback:", err.message);
      setTournaments(MOCK_TOURNAMENTS);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePuzzleTimeout = () => {
    chessAudio.playError();
    setGameFeedback("Time ran out on this puzzle! ⏰");
    setFeedbackType("error");
    
    setTimeout(() => {
      advanceNextPuzzle(false);
    }, 2000);
  };

  // Puzzle Timer Loop
  useEffect(() => {
    if (isPlaying && !isFinished) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handlePuzzleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentPuzzleIdx, isFinished]);

  // Launch a tournament challenge
  const startTournamentChallenge = (tournament) => {
    if (!isLoggedIn) {
      alert("Please log in first to participate and submit scores to the leaderboard!");
      return;
    }
    if (!tournament.puzzles || tournament.puzzles.length === 0) {
      alert("This tournament has no puzzles added yet!");
      return;
    }
    
    scoreRef.current = 0;
    solvedCountRef.current = 0;
    setActiveTournament(tournament);
    setIsPlaying(true);
    setCurrentPuzzleIdx(0);
    setScore(0);
    setSolvedCount(0);
    setIsFinished(false);
    loadPuzzle(tournament.puzzles[0], tournament.timeLimit);
  };

  // Load a single puzzle
  const loadPuzzle = (puzzle, timeLimit) => {
    let freshChess;
    try {
      freshChess = new Chess(puzzle.initialFen);
    } catch (err) {
      console.warn("Invalid puzzle FEN, using default position:", err);
      freshChess = new Chess();
    }
    boardLocked.current = false;
    setChessGame(freshChess);
    setBoardFen(freshChess.fen());
    setCorrectMovesList(puzzle.correctMoves || []);
    setCurrentMoveIdx(0);
    setTrials(3);
    setTimeRemaining(timeLimit || 60);
    setGameFeedback("");
    setFeedbackType("");
    setSelectedSquare(null);
    setOptionSquares({});
  };

  // Helper to compute Lichess-style legal move dot overlay styles
  const getMoveOptionsStyles = (sourceSquare, gameInstance) => {
    if (!gameInstance || typeof gameInstance.moves !== "function") return {};

    const moves = gameInstance.moves({
      square: sourceSquare,
      verbose: true
    });

    if (!moves || moves.length === 0) return {};

    const newStyles = {};
    
    // Highlight selected piece square
    newStyles[sourceSquare] = {
      backgroundColor: "rgba(243, 193, 68, 0.4)",
      boxShadow: "inset 0 0 0 2px #f3c144"
    };

    moves.forEach((move) => {
      const targetPiece = gameInstance.get(move.to);
      if (targetPiece) {
        // Capture ring indicator (Lichess style)
        newStyles[move.to] = {
          background: "radial-gradient(circle, transparent 52%, rgba(243, 193, 68, 0.75) 53%, rgba(243, 193, 68, 0.75) 70%, transparent 71%)",
          borderRadius: "50%"
        };
      } else {
        // Empty destination dot indicator (Lichess style)
        newStyles[move.to] = {
          background: "radial-gradient(circle, rgba(243, 193, 68, 0.75) 24%, transparent 25%)",
          borderRadius: "50%"
        };
      }
    });

    return newStyles;
  };

  const handleSquareClick = (square) => {
    if (isFinished || boardLocked.current) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setOptionSquares({});
        return;
      }

      const clickedPiece = chessGame.get(square);
      if (clickedPiece && clickedPiece.color === chessGame.turn()) {
        const styles = getMoveOptionsStyles(square, chessGame);
        setSelectedSquare(square);
        setOptionSquares(styles);
        return;
      }

      const moveSuccess = onPieceDrop(selectedSquare, square);
      if (moveSuccess) {
        setSelectedSquare(null);
        setOptionSquares({});
        return;
      }

      setSelectedSquare(null);
      setOptionSquares({});
      return;
    }

    const piece = chessGame.get(square);
    if (piece && piece.color === chessGame.turn()) {
      const styles = getMoveOptionsStyles(square, chessGame);
      setSelectedSquare(square);
      setOptionSquares(styles);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  };

  const onPieceDragBegin = (piece, sourceSquare) => {
    if (isFinished || boardLocked.current) return;
    const styles = getMoveOptionsStyles(sourceSquare, chessGame);
    setSelectedSquare(sourceSquare);
    setOptionSquares(styles);
  };

  const onPieceDragEnd = () => {
    setSelectedSquare(null);
    setOptionSquares({});
  };

  // Move validation drag/drop handler
  const onPieceDrop = (sourceSquare, targetSquare) => {
    setSelectedSquare(null);
    setOptionSquares({});
    // Block input while opponent is replying, puzzle is advancing, or game is finished
    if (isFinished || boardLocked.current) return false;

    // Check if the move is legal in the current position first
    const legalMoves = chessGame.moves({ verbose: true });
    const isLegal = legalMoves.some(
      (m) => m.from === sourceSquare && m.to === targetSquare
    );

    if (!isLegal) {
      // Snap back silently for illegal moves (no penalty)
      return false;
    }

    try {
      const targetMove = correctMovesList[currentMoveIdx];
      if (!targetMove) return false;

      // Attempt move on a fresh Chess instance (immutable — never mutate state directly)
      const newChess = new Chess(chessGame.fen());
      const move = newChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q"
      });

      if (!move) return false; // illegal move

      const playerLan = move.lan || (move.from + move.to);
      const cleanTarget = targetMove.trim().toLowerCase();
      const cleanSan = move.san.toLowerCase();
      const cleanSanStripped = cleanSan.replace(/[#+]/g, '');

      if (
        playerLan.toLowerCase() === cleanTarget ||
        cleanSan === cleanTarget ||
        cleanSanStripped === cleanTarget
      ) {
        // Play appropriate sound effect
        if (move.captured) {
          chessAudio.playCapture();
        } else if (newChess.inCheck()) {
          chessAudio.playCheck();
        } else {
          chessAudio.playMove();
        }

        // ✅ Correct move — update board state immutably
        setChessGame(newChess);
        setBoardFen(newChess.fen());

        const nextMoveIdx = currentMoveIdx + 1;

        if (nextMoveIdx < correctMovesList.length) {
          // Opponent has a reply move — lock board and apply after delay
          boardLocked.current = true;
          setGameFeedback("Correct! Opponent is replying...");
          setFeedbackType("info");

          setTimeout(() => {
            try {
              const opponentMove = correctMovesList[nextMoveIdx];
              const afterOpponent = new Chess(newChess.fen());
              const opResult = afterOpponent.move(opponentMove);
              if (opResult && opResult.captured) {
                chessAudio.playCapture();
              } else if (afterOpponent.inCheck()) {
                chessAudio.playCheck();
              } else {
                chessAudio.playMove();
              }
              setChessGame(afterOpponent);
              setBoardFen(afterOpponent.fen());
              setCurrentMoveIdx(nextMoveIdx + 1);
              setGameFeedback("Your turn — find checkmate!");
              setFeedbackType("info");
              boardLocked.current = false;
            } catch (e) {
              console.error("Opponent reply failed:", e);
              boardLocked.current = false;
            }
          }, 700);
        } else {
          // 🎉 Puzzle fully solved!
          boardLocked.current = true;
          chessAudio.playVictory();
          setGameFeedback("Perfect! Puzzle Solved! 🎉");
          setFeedbackType("success");

          const baseScore = 100;
          const timeBonus = Math.floor(timeRemaining * 1.5);
          const earnedPoints = baseScore + timeBonus;

          scoreRef.current += earnedPoints;
          solvedCountRef.current += 1;

          setScore(scoreRef.current);
          setSolvedCount(solvedCountRef.current);
          clearInterval(timerRef.current);

          setTimeout(() => advanceNextPuzzle(true), 1500);
        }
        return true;

      } else {
        // ❌ Wrong move
        chessAudio.playError();
        handleWrongMove();
        return false;
      }
    } catch (err) {
      console.error("onPieceDrop threw exception:", err);
      chessAudio.playError();
      handleWrongMove();
      return false;
    }
  };

  const handleWrongMove = () => {
    setTrials((prev) => {
      const remaining = prev - 1;
      if (remaining <= 0) {
        setGameFeedback("No trials left on this puzzle! ❌");
        setFeedbackType("error");
        boardLocked.current = true;
        clearInterval(timerRef.current);
        setTimeout(() => advanceNextPuzzle(false), 1500);
      } else {
        setGameFeedback(`Wrong move! ${remaining} trial${remaining === 1 ? '' : 's'} remaining. Try again! ⚠️`);
        setFeedbackType("error");
        // Board FEN stays at the last valid position — no change needed
      }
      return remaining;
    });
  };

  const advanceNextPuzzle = (wasSolved) => {
    const nextIdx = currentPuzzleIdx + 1;
    if (nextIdx < activeTournament.puzzles.length) {
      setCurrentPuzzleIdx(nextIdx);
      loadPuzzle(activeTournament.puzzles[nextIdx], activeTournament.timeLimit);
    } else {
      // Completed all puzzles
      finishChallenge();
    }
  };

  const finishChallenge = async () => {
    setIsFinished(true);
    clearInterval(timerRef.current);
    
    const finalScore = scoreRef.current;
    const finalSolved = solvedCountRef.current;

    // Submit score to database
    try {
      const data = await safeFetchJson(`${API_BASE}/api/puzzle-tournaments/${activeTournament._id}/submit-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          score: finalScore,
          solvedCount: finalSolved
        })
      });
      if (data && data.data) {
        setActiveTournament(data.data);
        fetchTournaments();
      }
    } catch (err) {
      console.warn("Failed to submit score to server:", err.message);
    }
  };

  // Compute user statistics from tournaments leaderboard data
  const userStats = {
    totalScore: 0,
    arenasPlayed: 0,
    highestScore: 0,
    solvedTotal: 0
  };

  tournaments.forEach(t => {
    if (t.leaderboard) {
      const userEntry = t.leaderboard.find(entry => entry.email === userEmail);
      if (userEntry) {
        userStats.totalScore += userEntry.score;
        userStats.arenasPlayed += 1;
        userStats.highestScore = Math.max(userStats.highestScore, userEntry.score);
        userStats.solvedTotal += userEntry.solvedCount || 0;
      }
    }
  });

  const activePlayState = isPlaying && !isFinished;

  if (isLoading) {
    return (
      <div className="puzzle-challenge-root">
        <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <main className="puzzle-layout-container loading-centered">
          <div className="puzzle-loading-card">
            <div className="spinner-ring"></div>
            <span>Loading Arenas...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`puzzle-challenge-root ${activePlayState ? "playing" : ""}`}>
      {!activePlayState && <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />}

      <main className={`puzzle-layout-container ${activePlayState ? "playing" : ""}`}>
        {!isPlaying ? (
          /* SECTION 1: TOURNAMENT LISTING SCREEN (DASHBOARD REDESIGN) */
          <div className="puzzle-selection-view">
            <div className="puzzle-hero-section">
              <div className="puzzle-hero-badge">♟ Tactics Arena</div>
              <h1 className="puzzle-header-title">Chess Tactics Arena</h1>
              <p className="puzzle-description">
                Participate in active club puzzle challenges. Solve custom mate-in-1, mate-in-2, or mate-in-3 puzzles. You get 3 trials per puzzle. Earn speed bonus points!
              </p>
            </div>

            <div className="selection-layout">
              {/* Left Column: Player Stats HUD */}
              <div className="profile-stats-panel">
                <div className="profile-header-card">
                  {customAvatars[userName] || customAvatars[userEmail] || getPlayerAvatarUrl(userName, customAvatars) !== "/Icons/unknown.png" ? (
                    <img 
                      src={customAvatars[userName] || customAvatars[userEmail] || getPlayerAvatarUrl(userName, customAvatars)} 
                      alt={userName} 
                      className="user-avatar-badge-img"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <div className="user-avatar-badge">
                      {userName ? userName[0].toUpperCase() : "U"}
                    </div>
                  )}
                  <div className="user-meta">
                    <h3>{userName || "Club Member"}</h3>
                    <span className="role-tag">Tactician</span>
                  </div>
                </div>

                <div className="stats-indicator-grid">
                  <div className="stat-indicator-box">
                    <span className="stat-icon">🏆</span>
                    <span className="stat-label">Total Score</span>
                    <span className="stat-value">{userStats.totalScore} pts</span>
                  </div>
                  <div className="stat-indicator-box">
                    <span className="stat-icon">🎯</span>
                    <span className="stat-label">Arenas Played</span>
                    <span className="stat-value">{userStats.arenasPlayed}</span>
                  </div>
                  <div className="stat-indicator-box">
                    <span className="stat-icon">⚡</span>
                    <span className="stat-label">Highest Score</span>
                    <span className="stat-value">{userStats.highestScore} pts</span>
                  </div>
                  <div className="stat-indicator-box">
                    <span className="stat-icon">🧩</span>
                    <span className="stat-label">Puzzles Cleared</span>
                    <span className="stat-value">{userStats.solvedTotal}</span>
                  </div>
                </div>

                <div className="profile-tip-card">
                  <h4>💡 Pro Tip</h4>
                  <p>Solve puzzles quickly to earn speed bonus points! Each remaining second on the timer adds 1.5x points to your score.</p>
                </div>
              </div>

              {/* Right Column: Arenas Grid */}
              <div className="arenas-grid-panel">
                <div className="arenas-header-row">
                  <h3 className="section-title">Active Arenas</h3>
                  {isAdmin && (
                    <Link to="/admin" className="admin-manage-link">
                      ⚙️ Manage Challenges
                    </Link>
                  )}
                </div>
                {tournaments.length === 0 ? (
                  <div className="no-tournaments-card">
                    <h3>No Puzzle Tournaments Available</h3>
                    <p>Check back later for upcoming club chess tactics challenges.</p>
                  </div>
                ) : (
                  <div className="tournaments-grid">
                    {tournaments.map((t) => (
                      <div key={t._id} className="tournament-card">
                        <div className="card-top">
                          <span className="card-badge"><span className="card-badge-dot"></span>LIVE ARENA</span>
                          <h3>{t.title}</h3>
                        </div>
                        <div className="card-info">
                          <div className="info-item">
                            <span>📅</span>
                            <span><strong>Begins:</strong> {t.startDate} {t.startTime ? `at ${t.startTime}` : ""}</span>
                          </div>
                          {t.endDate && (
                            <div className="info-item">
                              <span>🏁</span>
                              <span><strong>Ends:</strong> {t.endDate} {t.endTime ? `at ${t.endTime}` : ""}</span>
                            </div>
                          )}
                          <div className="info-item">
                            <span>⏱️</span>
                            <span><strong>Time Limit:</strong> {t.timeLimit || 60}s / puzzle</span>
                          </div>
                          <div className="info-item">
                            <span>🧩</span>
                            <span><strong>Puzzles:</strong> {t.puzzles ? t.puzzles.length : 0} tactical challenge{t.puzzles && t.puzzles.length > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        
                        {/* Leaderboard Summary preview */}
                        <div className="card-leaderboard-preview">
                          <div className="preview-header-row">
                            <h4>Leaderboard Standings</h4>
                            {t.leaderboard && t.leaderboard.length > 0 && (
                              <span className="player-count-badge">
                                👥 {t.leaderboard.length} {t.leaderboard.length === 1 ? "Tactician" : "Tacticians"}
                              </span>
                            )}
                          </div>
                          {t.leaderboard && t.leaderboard.length > 0 ? (
                            <>
                              <div className="preview-list">
                                {(expandedTournaments[t._id] ? t.leaderboard : t.leaderboard.slice(0, 3)).map((entry, idx) => {
                                  const avatarUrl = customAvatars[entry.name] || customAvatars[entry.email] || getPlayerAvatarUrl(entry.name, customAvatars);
                                  return (
                                    <div key={idx} className={`leaderboard-preview-row ${entry.email === userEmail ? "highlight-user-row-preview" : ""}`}>
                                      <div className="preview-player-info">
                                        <span className="preview-rank">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}</span>
                                        <img 
                                          src={avatarUrl} 
                                          alt={entry.name} 
                                          className="preview-avatar"
                                          onError={(e) => { e.currentTarget.src = "/Icons/unknown.png"; }}
                                        />
                                        <span className="preview-name" title={entry.name}>{entry.name}</span>
                                      </div>
                                      <div className="preview-stats-col">
                                        <span className="preview-solved">{entry.solvedCount || 0} 🧩</span>
                                        <strong className="preview-score">{entry.score} pts</strong>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {t.leaderboard.length > 3 && (
                                <button 
                                  type="button" 
                                  className="view-all-players-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTournamentExpanded(t._id);
                                  }}
                                >
                                  {expandedTournaments[t._id] 
                                    ? "Show Top 3 ▲" 
                                    : `View all ${t.leaderboard.length} players ▼`}
                                </button>
                              )}
                            </>
                          ) : (
                            <p className="no-scores-text">Be the first to participate!</p>
                          )}
                        </div>

                        <button 
                          className="enter-btn" 
                          onClick={() => startTournamentChallenge(t)}
                        >
                          Join Challenge
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : isFinished ? (
          /* SECTION 2: END GAME REPORT CARD */
          <div className="end-game-card">
            <h2>Challenge Complete! 🏆</h2>
            <p>Well played, <strong>{userName}</strong>!</p>
            <div className="results-grid">
              <div className="result-box">
                <span className="result-icon">🏆</span>
                <span className="label">Total Score</span>
                <span className="val">{score}</span>
              </div>
              <div className="result-box">
                <span className="result-icon">✅</span>
                <span className="label">Solved Puzzles</span>
                <span className="val">{solvedCount} / {activeTournament.puzzles.length}</span>
              </div>
            </div>
            
            <div className="leaderboard-full-wrapper">
              <h3>Leaderboard Rankings</h3>
              <div className="leaderboard-table-container">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th className="col-rank">Rank</th>
                      <th className="col-player">Player</th>
                      <th className="col-solved">Solved</th>
                      <th className="col-score">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTournament.leaderboard && activeTournament.leaderboard.length > 0 ? (
                      activeTournament.leaderboard.map((entry, idx) => {
                        const avatarUrl = customAvatars[entry.name] || customAvatars[entry.email] || getPlayerAvatarUrl(entry.name, customAvatars);
                        return (
                          <tr key={idx} className={entry.email === userEmail ? "highlight-user-row" : ""}>
                            <td className="col-rank">
                              <span className={`rank-badge rank-${idx + 1}`}>
                                {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                              </span>
                            </td>
                            <td className="col-player">
                              <div className="table-player-cell">
                                <img 
                                  src={avatarUrl} 
                                  alt={entry.name} 
                                  className="table-player-avatar"
                                  onError={(e) => { e.currentTarget.src = "/Icons/unknown.png"; }}
                                />
                                <span className="player-name">{entry.name}</span>
                                {entry.email === userEmail && <span className="you-pill">YOU</span>}
                              </div>
                            </td>
                            <td className="col-solved">{entry.solvedCount}</td>
                            <td className="col-score">{entry.score} pts</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", color: "#888", padding: "20px" }}>No scores submitted yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button className="back-list-btn" onClick={() => { setIsPlaying(false); fetchTournaments(); }}>
              Back to Arena List
            </button>
          </div>
        ) : (
          /* SECTION 3: INTERACTIVE GAME BOARD SOLVER (FULL-SCREEN OPTIMIZED HUD) */
          <div className="puzzle-gameplay-container">
            <div className="game-status-bar">
              <button className="quit-btn" onClick={() => { if (window.confirm("Quit challenge? Your current progress will be lost.")) setIsPlaying(false); }}>
                Quit Arena
              </button>
              <div className="puzzle-header-title">
                {activeTournament.title}
              </div>
              <div className="game-status-right-controls">
                <button 
                  type="button" 
                  className="sound-toggle-btn"
                  onClick={toggleAudio}
                  title={soundEnabled ? "Mute Sounds" : "Unmute Sounds"}
                >
                  {soundEnabled ? "🔊" : "🔇"}
                </button>
                <div className={`timer-badge ${timeRemaining <= 10 ? 'timer-pulse' : timeRemaining <= 20 ? 'timer-warning' : ''}`}>
                  ⏱️ {timeRemaining}s
                </div>
              </div>
            </div>

            <div className="gameplay-grid">
              {/* Gameplay Left: Chessboard Panel */}
              <div className="gameplay-board-panel">
                <div className="game-feedback-banner" data-type={feedbackType}>
                  {gameFeedback || "Make your move to begin solving..."}
                </div>

                <div className="puzzle-progress-bar-container">
                  <span className="progress-text">Progress: {currentPuzzleIdx} / {activeTournament.puzzles.length} Cleared</span>
                  <div className="progress-bar-track">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${(currentPuzzleIdx / activeTournament.puzzles.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="game-board-wrapper" ref={boardContainerRef}>
                  <Chessboard
                    position={boardFen}
                    onPieceDrop={onPieceDrop}
                    onSquareClick={handleSquareClick}
                    onPieceDragBegin={onPieceDragBegin}
                    onPieceDragEnd={onPieceDragEnd}
                    customSquareStyles={optionSquares}
                    boardWidth={boardWidth}
                    arePiecesDraggable={!isFinished && !boardLocked.current}
                    customDarkSquareStyle={{ backgroundColor: "#b58863" }}
                    customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
                    customBoardStyle={{
                      borderRadius: "10px",
                      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.65), 0 0 1px rgba(243, 193, 68, 0.25)",
                      width: "100%",
                      height: "100%"
                    }}
                  />
                </div>
              </div>

              {/* Gameplay Right: Puzzle Metadata & Leaderboard preview */}
              <div className="gameplay-info-panel">
                <div className="stats-card">
                  <h4>Challenge Metrics</h4>
                  <div className="stat-row">
                    <span>Target:</span>
                    <strong>Mate in {activeTournament.puzzles[currentPuzzleIdx].mateIn}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Hint:</span>
                    <span style={{ fontSize: "0.85rem", color: "#caba91", maxWidth: "160px", textAlign: "right" }}>
                      {activeTournament.puzzles[currentPuzzleIdx].description || "Calculate best moves"}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span>Remaining Trials:</span>
                    <span className="hearts-indicator">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <span key={idx} className={`heart ${idx < trials ? "filled" : "empty"}`}>
                          {idx < trials ? "❤️" : "🖤"}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span>Current Score:</span>
                    <strong style={{ color: "#f3c144" }}>{score} pts</strong>
                  </div>
                </div>

                <div className="stats-card mini-leaderboard-card">
                  <h4>Live Leaderboard</h4>
                  <div className="mini-leaderboard">
                    {activeTournament.leaderboard && activeTournament.leaderboard.length > 0 ? (
                      activeTournament.leaderboard.map((entry, idx) => {
                        const avatarUrl = customAvatars[entry.name] || customAvatars[entry.email] || getPlayerAvatarUrl(entry.name, customAvatars);
                        return (
                          <div key={idx} className={`mini-leaderboard-row ${entry.email === userEmail ? 'highlight' : ''}`}>
                            <div className="mini-player-info">
                              <span className="mini-rank">{idx + 1}.</span>
                              <img 
                                src={avatarUrl} 
                                alt={entry.name} 
                                className="mini-avatar"
                                onError={(e) => { e.currentTarget.src = "/Icons/unknown.png"; }}
                              />
                              <span className="mini-name">{entry.name}</span>
                            </div>
                            <div className="mini-stats">
                              <span className="mini-solved">{entry.solvedCount} 🧩</span>
                              <strong className="mini-score">{entry.score} pts</strong>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-scores-text">No scores yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {!activePlayState && <Footer />}
    </div>
  );
}
