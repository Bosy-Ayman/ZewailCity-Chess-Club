import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import Header from "../components/Header";
import Footer from "../components/Footer";
import WinnerCelebrationModal from "../components/WinnerCelebrationModal";
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
  const [playerNamesByEmail, setPlayerNamesByEmail] = useState({});
  const [expandedTournaments, setExpandedTournaments] = useState({});
  const [selectedSolutionsTournament, setSelectedSolutionsTournament] = useState(null);
  const [solutionPuzzleIdx, setSolutionPuzzleIdx] = useState(0);
  const [solutionMoveStep, setSolutionMoveStep] = useState(0);
  const [solutionsModalTab, setSolutionsModalTab] = useState("solutions"); // 'solutions' | 'standings' | 'roster'
  const [celebrationModalOpen, setCelebrationModalOpen] = useState(false);
  const [celebrationTournament, setCelebrationTournament] = useState(null);

  const handleOpenTournamentCelebration = (tournament) => {
    setCelebrationTournament(tournament);
    setCelebrationModalOpen(true);
  };

  const handleOpenSolutionsModal = (tournament, initialTab = "solutions") => {
    const closed = isTournamentClosed(tournament);
    let resolvedTab = initialTab;
    if (!closed && initialTab === "solutions") {
      resolvedTab = getTournamentPhase(tournament) === "registration" ? "roster" : "standings";
    }
    setSelectedSolutionsTournament(tournament);
    setSolutionPuzzleIdx(0);
    setSolutionMoveStep(0);
    setSolutionsModalTab(resolvedTab);
  };

  const toggleTournamentExpanded = (id) => {
    setExpandedTournaments((prev) => ({
      ...prev,
      [id]: prev[id] === false
    }));
  };

  // Helper: Get board FEN position at a specific step in the solution replay
  const getSolutionBoardAtStep = (puzzle, step) => {
    if (!puzzle || !puzzle.initialFen) return "";
    try {
      const g = new Chess(puzzle.initialFen);
      const moves = puzzle.correctMoves || [];
      for (let i = 0; i < step && i < moves.length; i++) {
        const uci = moves[i];
        if (uci && uci.length >= 4) {
          const from = uci.slice(0, 2);
          const to = uci.slice(2, 4);
          const promotion = uci.length > 4 ? uci[4] : "q";
          g.move({ from, to, promotion });
        }
      }
      return g.fen();
    } catch (err) {
      return puzzle.initialFen;
    }
  };

  // Helper: Get detailed algebraic SAN notation for the solution moves
  const getSolutionMovesDetails = (puzzle) => {
    if (!puzzle || !puzzle.initialFen) return [];
    try {
      const g = new Chess(puzzle.initialFen);
      const moves = puzzle.correctMoves || [];
      const result = [];
      moves.forEach((uci) => {
        if (!uci || uci.length < 4) return;
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci[4] : "q";
        const isWhite = g.turn() === "w";
        const moveNumber = Math.floor(result.length / 2) + 1;
        const m = g.move({ from, to, promotion });
        if (m) {
          result.push({
            uci,
            san: m.san,
            isWhite,
            moveNumber,
            piece: m.piece,
            captured: m.captured
          });
        }
      });
      return result;
    } catch (err) {
      return (puzzle.correctMoves || []).map((uci, i) => ({
        uci,
        san: uci,
        isWhite: i % 2 === 0,
        moveNumber: Math.floor(i / 2) + 1
      }));
    }
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

  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [submitScoreError, setSubmitScoreError] = useState(null);

  // User session cache
  const isLoggedIn = !!localStorage.getItem("adminToken") || !!localStorage.getItem("userEmail") || !!localStorage.getItem("adminEmail");
  const userEmail = localStorage.getItem("adminEmail") || localStorage.getItem("userEmail") || localStorage.getItem("email") || "";
  const userRole = localStorage.getItem("userRole") || "member";
  const isAdmin = userRole === "admin" || userRole === "oc" || userRole === "hr";
  const userName = localStorage.getItem("userName") || (userEmail ? userEmail.split("@")[0] : "Club Tactician");

  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Fetch puzzle tournaments and player avatars on load
  useEffect(() => {
    fetchTournaments(true);
    fetchAvatars();
    const refreshTimer = setInterval(() => {
      if (!isPlayingRef.current && !document.hidden) {
        fetchTournaments(false);
      }
    }, 45000);
    return () => clearInterval(refreshTimer);
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
        const nameMap = {};
        uList.forEach((u) => {
          if (u.email && u.name) nameMap[u.email.trim().toLowerCase()] = u.name.trim();
          if (u.profileImage) {
            if (u.name) map[u.name.trim()] = u.profileImage;
            if (u.email) map[u.email.trim()] = u.profileImage;
          }
        });
        setCustomAvatars((prev) => ({ ...prev, ...map }));
        setPlayerNamesByEmail((prev) => ({ ...prev, ...nameMap }));
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

  const fetchTournaments = async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    }
    try {
      const data = await safeFetchJson(`${API_BASE}/api/puzzle-tournaments`);
      if (Array.isArray(data)) {
        setTournaments((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
        return;
      }
      setTournaments(MOCK_TOURNAMENTS);
    } catch (err) {
      console.warn("Failed to load puzzle tournaments from server, using fallback:", err.message);
      if (isInitial) setTournaments(MOCK_TOURNAMENTS);
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
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

  const isUserRegistered = (tournament) => {
    if (!tournament || !userEmail) return false;
    const norm = userEmail.trim().toLowerCase();
    return (tournament.participants || []).some(
      (p) => p.email && p.email.trim().toLowerCase() === norm
    );
  };

  const hasUserCompleted = (tournament) => {
    if (!tournament || !userEmail) return false;
    const norm = userEmail.trim().toLowerCase();
    const inLeaderboard = (tournament.leaderboard || []).some(
      (e) => e.email && e.email.trim().toLowerCase() === norm
    );
    const localAttemptKey = `puzzle_attempted_${tournament._id}_${norm}`;
    const localCompletedKey = `puzzle_completed_${tournament._id}_${norm}`;
    let hasLocalFlag = false;
    try {
      hasLocalFlag = localStorage.getItem(localAttemptKey) === "true" || localStorage.getItem(localCompletedKey) === "true";
    } catch (e) {}
    return inLeaderboard || hasLocalFlag;
  };

  // Launch a tournament challenge
  const startTournamentChallenge = async (tournament) => {
    if (!isLoggedIn) {
      alert("Please log in first to enter and participate in the puzzle challenge!");
      return;
    }
    if (!tournament.puzzles || tournament.puzzles.length === 0) {
      alert("This tournament has no puzzles added yet!");
      return;
    }

    const now = new Date();
    const startAt = tournament.startDate
      ? new Date(`${tournament.startDate}T${tournament.startTime || "00:00"}:00`)
      : null;
    const endAt = tournament.endDate
      ? new Date(`${tournament.endDate}T${tournament.endTime || "23:59"}:59`)
      : null;
    if (startAt && now < startAt) {
      alert(`This challenge starts on ${tournament.startDate}${tournament.startTime ? ` at ${tournament.startTime}` : ""}.`);
      return;
    }
    if (endAt && now > endAt) {
      alert("This challenge is closed.");
      return;
    }
    if (hasUserCompleted(tournament)) {
      alert("You have already participated in this challenge. Each player is allowed only 1 attempt!");
      return;
    }

    const norm = userEmail.trim().toLowerCase();
    try {
      localStorage.setItem(`puzzle_attempted_${tournament._id}_${norm}`, "true");
    } catch (e) {}

    if (tournament._id && !tournament._id.startsWith("default-")) {
      try {
        safeFetchJson(`${API_BASE}/api/puzzle-tournaments/${tournament._id}/start-attempt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: localStorage.getItem("userName") || userName, email: userEmail })
        }).catch(() => {});
      } catch (e) {}
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

  const registerForTournament = async (tournament) => {
    if (!isLoggedIn) {
      alert("Please log in first to register for a challenge.");
      return;
    }
    try {
      const response = await safeFetchJson(`${API_BASE}/api/puzzle-tournaments/${tournament._id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: localStorage.getItem("userName") || userName, email: userEmail })
      });
      if (response?.data) {
        setTournaments((prev) => prev.map((item) => item._id === tournament._id ? response.data : item));
        handleOpenSolutionsModal(response.data, "roster");
      }
    } catch (error) {
      alert(error.message || "Could not register for this challenge.");
    }
  };

  const isTournamentClosed = (tournament) => {
    if (!tournament) return false;
    const now = new Date();
    const endAt = tournament.endDate
      ? new Date(`${tournament.endDate}T${tournament.endTime || "23:59"}:59`)
      : null;
    return !!(endAt && now > endAt);
  };

  const getTournamentState = (tournament) => {
    if (!tournament) return "upcoming";
    const now = new Date();
    const startAt = tournament.startDate
      ? new Date(`${tournament.startDate}T${tournament.startTime || "00:00"}:00`)
      : null;
    const endAt = tournament.endDate
      ? new Date(`${tournament.endDate}T${tournament.endTime || "23:59"}:59`)
      : null;
    if (startAt && now < startAt) return "upcoming";
    if (endAt && now > endAt) return "closed";
    if (hasUserCompleted(tournament)) return "completed";
    return "open";
  };

  const getTournamentPhase = (tournament) => {
    const state = getTournamentState(tournament);
    return state === "upcoming" ? "registration" : state === "closed" || state === "completed" ? "results" : "live";
  };

  // Helper: Get standings dynamically based on tournament lifecycle
  // When ongoing/live: only show participants who attempted and scored > 0
  // When closed: include all participants (even those who scored 0 or didn't attempt)
  const getTournamentStandings = (tournament) => {
    if (!tournament) return [];
    const closed = isTournamentClosed(tournament);
    const rawLeaderboard = tournament.leaderboard || [];

    if (closed) {
      const scoredEmails = new Set(
        rawLeaderboard
          .filter((e) => e.email)
          .map((e) => e.email.trim().toLowerCase())
      );
      const unattemptedParticipants = (tournament.participants || [])
        .filter((p) => p.email && !scoredEmails.has(p.email.trim().toLowerCase()))
        .map((p) => ({
          name: p.name,
          email: p.email,
          score: 0,
          solvedCount: 0,
          unattempted: true
        }));

      return [...rawLeaderboard, ...unattemptedParticipants].sort(
        (a, b) => (b.score || 0) - (a.score || 0)
      );
    }

    const activeScored = rawLeaderboard.filter((entry) => (entry.score || 0) > 0 || (entry.solvedCount || 0) > 0);
    if (activeScored.length > 0) {
      return [...activeScored].sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    return [...rawLeaderboard].sort((a, b) => (b.score || 0) - (a.score || 0));
  };

  const getRosterAvatar = (player) => (
    player.profileImage ||
    customAvatars[player.name] ||
    customAvatars[player.email] ||
    getPlayerAvatarUrl(player.name, customAvatars)
  );

  const getPlayerDisplayName = (player) => {
    if (!player) return "Tactician";
    const pEmail = (player.email || "").trim().toLowerCase();
    const currEmail = (userEmail || "").trim().toLowerCase();

    // If this entry belongs to the current user, show their local name
    if (pEmail && currEmail && pEmail === currEmail) {
      const storedName = localStorage.getItem("userName");
      if (storedName && storedName.trim() && storedName.trim() !== "ZC Chess Club") return storedName.trim();
      if (userName && userName.trim() && userName.trim() !== "ZC Chess Club") return userName.trim();
    }

    if (player.name && player.name.trim() && player.name.trim() !== "ZC Chess Club") {
      return player.name.trim();
    }

    if (pEmail && playerNamesByEmail[pEmail] && playerNamesByEmail[pEmail] !== "ZC Chess Club") {
      return playerNamesByEmail[pEmail];
    }

    return player.name || (pEmail ? pEmail.split("@")[0] : "Tactician");
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
    const restoreBoardPosition = () => {
      setBoardFen(chessGame.fen());
    };
    // Block input while opponent is replying, puzzle is advancing, or game is finished
    if (isFinished || boardLocked.current) {
      restoreBoardPosition();
      return false;
    }

    // Check if the move is legal in the current position first
    const legalMoves = chessGame.moves({ verbose: true });
    const isLegal = legalMoves.some(
      (m) => m.from === sourceSquare && m.to === targetSquare
    );

    if (!isLegal) {
      // Snap back silently for illegal moves (no penalty)
      restoreBoardPosition();
      return false;
    }

    try {
      const targetMove = correctMovesList[currentMoveIdx];
      if (!targetMove) {
        restoreBoardPosition();
        return false;
      }

      // Attempt move on a fresh Chess instance (immutable — never mutate state directly)
      const newChess = new Chess(chessGame.fen());
      const move = newChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q"
      });

      if (!move) {
        restoreBoardPosition();
        return false;
      }

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
              let opResult = null;
              try {
                opResult = afterOpponent.move(opponentMove);
              } catch (e1) {
                if (typeof opponentMove === "string" && opponentMove.length >= 4) {
                  const from = opponentMove.slice(0, 2);
                  const to = opponentMove.slice(2, 4);
                  const promotion = opponentMove.length > 4 ? opponentMove[4] : "q";
                  opResult = afterOpponent.move({ from, to, promotion });
                }
              }

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
              setGameFeedback(
                activeTournament?.puzzles?.[currentPuzzleIdx]?.mateIn === 0
                  ? "Your turn — find the best move!"
                  : "Your turn — find checkmate!"
              );
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
        restoreBoardPosition();
        chessAudio.playError();
        handleWrongMove();
        return false;
      }
    } catch (err) {
      console.error("onPieceDrop threw exception:", err);
      restoreBoardPosition();
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

    let targetEmail = userEmail || localStorage.getItem("adminEmail") || localStorage.getItem("userEmail") || localStorage.getItem("email") || "";
    let targetName = localStorage.getItem("userName") || userName || (targetEmail ? targetEmail.split("@")[0] : "Club Tactician");

    if (!targetEmail) {
      const promptEmail = window.prompt("Enter your email to submit your score to the arena leaderboard:", "");
      if (promptEmail && promptEmail.trim()) {
        targetEmail = promptEmail.trim();
        targetName = promptEmail.split("@")[0];
        try {
          localStorage.setItem("userEmail", targetEmail);
          localStorage.setItem("userName", targetName);
        } catch (e) {}
      } else {
        targetEmail = `tactician_${Date.now().toString().slice(-4)}@zewailcity.edu.eg`;
      }
    }

    const normEmail = targetEmail.trim().toLowerCase();
    try {
      if (activeTournament?._id) {
        localStorage.setItem(`puzzle_completed_${activeTournament._id}_${normEmail}`, "true");
        localStorage.setItem(`puzzle_attempted_${activeTournament._id}_${normEmail}`, "true");
      }
    } catch (e) {}

    // 🏆 Optimistically update local active tournament leaderboard so podium is immediately populated!
    if (activeTournament) {
      const currentBoard = [...(activeTournament.leaderboard || [])];
      const existingIdx = currentBoard.findIndex(
        (e) => e.email && e.email.trim().toLowerCase() === targetEmail.trim().toLowerCase()
      );
      if (existingIdx !== -1) {
        currentBoard[existingIdx] = {
          ...currentBoard[existingIdx],
          name: targetName,
          score: Math.max(currentBoard[existingIdx].score || 0, finalScore),
          solvedCount: Math.max(currentBoard[existingIdx].solvedCount || 0, finalSolved)
        };
      } else {
        currentBoard.push({
          name: targetName,
          email: targetEmail,
          score: finalScore,
          solvedCount: finalSolved
        });
      }
      currentBoard.sort((a, b) => (b.score || 0) - (a.score || 0));

      const updatedTourney = {
        ...activeTournament,
        leaderboard: currentBoard
      };
      setActiveTournament(updatedTourney);
      setCelebrationTournament(updatedTourney);
    }

    setIsSubmittingScore(true);
    setSubmitScoreError(null);

    // Submit score to database safely
    try {
      if (activeTournament && activeTournament._id && !activeTournament._id.startsWith("default-")) {
        const data = await safeFetchJson(`${API_BASE}/api/puzzle-tournaments/${activeTournament._id}/submit-score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: targetName,
            email: targetEmail,
            score: finalScore,
            solvedCount: finalSolved
          })
        });

        if (data && data.data) {
          setActiveTournament(data.data);
          setCelebrationTournament(data.data);
          setTournaments((prev) => prev.map((item) => (item._id === data.data._id ? data.data : item)));
          fetchTournaments();
        }
      }
    } catch (err) {
      console.warn("Notice: Score saved locally; server response:", err.message);
      // Keep optimistic state intact so user smoothly views champions podium without disruption
    } finally {
      setIsSubmittingScore(false);
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
          <div className="puzzle-loading-card site-loading-state">
            <div className="spinner-ring site-loading-spinner"></div>
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
              <h1 className="puzzle-header-title site-page-title">Chess Tactics Arena</h1>
              <p className="puzzle-description">
                Participate in active club puzzle challenges. Solve tactics, find the best moves, and deliver decisive mates. You get 3 trials per puzzle. Earn speed bonus points!
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
                      <div key={t._id} className={`tournament-card tournament-${getTournamentState(t)}`}>
                        <div className="card-top">
                          <span className="card-badge"><span className="card-badge-dot"></span>{getTournamentState(t) === "upcoming" ? "UPCOMING" : getTournamentState(t) === "closed" ? "CLOSED" : getTournamentState(t) === "completed" ? "COMPLETED" : "LIVE ARENA"}</span>
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
                        {(() => {
                          const standings = getTournamentStandings(t);
                          return (
                            <div className="card-leaderboard-preview">
                              <div className="preview-header-row">
                                <h4>Leaderboard Standings</h4>
                                {standings.length > 0 && (
                                  <span className="player-count-badge">
                                    👥 {standings.length} {standings.length === 1 ? "Tactician" : "Tacticians"}
                                  </span>
                                )}
                              </div>
                              {standings.length > 0 ? (
                                <>
                                  <div className="preview-list">
                                    {standings
                                      .slice(0, expandedTournaments[t._id] === false ? 3 : undefined)
                                      .map((entry, idx) => {
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
                                            <span className="preview-name" title={getPlayerDisplayName(entry)}>{getPlayerDisplayName(entry)}</span>
                                          </div>
                                          <div className="preview-stats-col">
                                            <span className="preview-solved">{entry.solvedCount || 0} 🧩</span>
                                            <strong className="preview-score">{entry.score || 0} pts</strong>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {standings.length > 3 && (
                                    <button 
                                      type="button" 
                                      className="view-all-players-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTournamentExpanded(t._id);
                                      }}
                                    >
                                      {expandedTournaments[t._id] === false
                                        ? `View all ${standings.length} players ▼`
                                        : "Show Top 3 ▲"}
                                    </button>
                                  )}
                                </>
                              ) : (
                                <p className="no-scores-text">
                                  {getTournamentState(t) === "upcoming" ? "Registration is open. Challenge begins soon!" : "Be the first to participate!"}
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Standardized Non-Redundant Card Actions Container */}
                        <div className="card-actions-wrapper">
                          {/* STATE 1: UPCOMING CHALLENGE */}
                          {getTournamentState(t) === "upcoming" && (
                            <>
                              {isUserRegistered(t) ? (
                                <button 
                                  type="button"
                                  className="card-action-btn enter-btn upcoming-btn registered-badge" 
                                  style={{ opacity: 0.9, cursor: "default", background: "rgba(46, 204, 113, 0.15)", borderColor: "#2ecc71", color: "#2ecc71", fontWeight: "bold" }}
                                  disabled
                                >
                                  ✅ Registered · Starts {t.startDate}
                                </button>
                              ) : (
                                <button 
                                  type="button"
                                  className="card-action-btn enter-btn upcoming-btn" 
                                  onClick={() => registerForTournament(t)}
                                >
                                  📝 Register for Challenge
                                </button>
                              )}
                              <button
                                type="button"
                                className="card-action-btn solutions-btn"
                                onClick={() => handleOpenSolutionsModal(t, "roster")}
                              >
                                <span>👥</span>
                                <span>View Registered Roster ({t.participants?.length || 0})</span>
                              </button>
                            </>
                          )}

                          {/* STATE 2: LIVE / OPEN CHALLENGE */}
                          {getTournamentState(t) === "open" && (
                            <>
                              <button 
                                type="button"
                                className="card-action-btn enter-btn live-btn" 
                                onClick={() => {
                                  if (!isLoggedIn) {
                                    alert("Please log in first to enter and participate in the puzzle challenge!");
                                    return;
                                  }
                                  startTournamentChallenge(t);
                                }}
                              >
                                ⚡ Join Challenge
                              </button>
                              <button
                                type="button"
                                className="card-action-btn solutions-btn"
                                onClick={() => handleOpenSolutionsModal(t, "standings")}
                              >
                                <span>📊</span>
                                <span>Standings & Roster ({getTournamentStandings(t).length})</span>
                              </button>
                            </>
                          )}

                          {/* STATE 3: COMPLETED CHALLENGE (USER FINISHED BUT ARENA STILL LIVE BEFORE DEADLINE) */}
                          {getTournamentState(t) === "completed" && (
                            <>
                              <button
                                type="button"
                                className="card-action-btn enter-btn completed-btn"
                                onClick={() => handleOpenSolutionsModal(t, "standings")}
                              >
                                ✅ 1 Attempt Used · View Standings
                              </button>
                            </>
                          )}

                          {/* STATE 4: CLOSED CHALLENGE (ARENA HAS CONCLUDED / DEADLINE PASSED) */}
                          {getTournamentState(t) === "closed" && (
                            <>
                              <button
                                type="button"
                                className="card-action-btn celebration-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenTournamentCelebration(t);
                                }}
                              >
                                <span>🏆</span>
                                <span>Champions Podium</span>
                              </button>
                              <button
                                type="button"
                                className="card-action-btn solutions-btn"
                                onClick={() => handleOpenSolutionsModal(t, "solutions")}
                              >
                                <span>🧩</span>
                                <span>Solutions & Standings ({getTournamentStandings(t).length})</span>
                              </button>
                            </>
                          )}
                        </div>
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
                <span className="val">{solvedCount} / {activeTournament?.puzzles?.length || 0}</span>
              </div>
            </div>
            
            {submitScoreError && (
              <div style={{ background: "rgba(220, 53, 69, 0.15)", border: "1px solid rgba(220, 53, 69, 0.4)", color: "#ff8585", padding: "12px 16px", borderRadius: "8px", margin: "14px 0", textAlign: "center" }}>
                <p style={{ margin: "0 0 8px" }}>⚠️ {submitScoreError}</p>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ padding: "6px 14px", fontSize: "0.85rem", background: "#f3c144", color: "#111", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                  onClick={finishChallenge}
                  disabled={isSubmittingScore}
                >
                  {isSubmittingScore ? "Retrying..." : "🔄 Retry Submitting Score"}
                </button>
              </div>
            )}

            {/* 🏆 Top 3 Champions Podium: ONLY SHOWN AFTER DEADLINE HAS PASSED */}
            {isTournamentClosed(activeTournament) ? (
              (() => {
                const currentBoard = activeTournament?.leaderboard && activeTournament.leaderboard.length > 0
                  ? [...activeTournament.leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0))
                  : [];
                if (currentBoard.length === 0) return null;
                const top3 = currentBoard.slice(0, 3);
                const totalPuzzles = activeTournament?.puzzles?.length || 0;

                return (
                  <div className="solutions-podium-section" style={{ marginTop: "18px", marginBottom: "20px" }}>
                    <div className="podium-section-title">
                      <span>🏆</span>
                      <h3>Official Arena Champions Podium</h3>
                    </div>
                    <div className="solutions-winners-grid">
                      {top3.map((winner, idx) => {
                        const avatar = getRosterAvatar(winner);
                        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                        const rankClass = idx === 0 ? "rank-gold" : idx === 1 ? "rank-silver" : "rank-bronze";
                        const label = idx === 0 ? "1st Champion" : idx === 1 ? "2nd Runner-Up" : "3rd Place";
                        return (
                          <div key={winner.email || idx} className={`solution-winner-card ${rankClass}`}>
                            <div className="winner-medal">{medal}</div>
                            <img 
                              src={avatar} 
                              alt={winner.name} 
                              className="winner-avatar"
                              onError={(e) => { e.currentTarget.src = "/Icons/unknown.png"; }}
                            />
                            <div className="winner-info">
                              <span className="winner-rank-label">{label}</span>
                              <strong className="winner-name" title={getPlayerDisplayName(winner)}>
                                {getPlayerDisplayName(winner)}
                              </strong>
                              <div className="winner-stats-row">
                                <span className="winner-score">{winner.score || 0} pts</span>
                                <span className="winner-solved">{winner.solvedCount || 0} / {totalPuzzles} 🧩</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="pending-podium-notice" style={{ background: "rgba(243, 193, 68, 0.05)", border: "1px solid rgba(243, 193, 68, 0.2)", borderRadius: "12px", padding: "14px 18px", margin: "16px 0", textAlign: "center", color: "#caba91", fontSize: "0.9rem" }}>
                ⏳ <strong>Challenge in Progress:</strong> Your score has been submitted to the live leaderboard below! The official <strong>Champions Podium</strong> will be announced once the challenge deadline passes.
              </div>
            )}

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
                    {(() => {
                      const currentBoard = activeTournament?.leaderboard && activeTournament.leaderboard.length > 0
                        ? [...activeTournament.leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0))
                        : [];

                      if (currentBoard.length > 0) {
                        return currentBoard.map((entry, idx) => {
                          const avatarUrl = customAvatars[entry.name] || customAvatars[entry.email] || getPlayerAvatarUrl(entry.name, customAvatars);
                          return (
                            <tr key={idx} className={entry.email?.toLowerCase() === userEmail.toLowerCase() ? "highlight-user-row" : ""}>
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
                                  <span className="player-name">{getPlayerDisplayName(entry)}</span>
                                  {entry.email?.toLowerCase() === userEmail.toLowerCase() && <span className="you-pill">YOU</span>}
                                </div>
                              </td>
                              <td className="col-solved">{entry.solvedCount || 0}</td>
                              <td className="col-score">{entry.score || 0} pts</td>
                            </tr>
                          );
                        });
                      }

                      return (
                        <tr>
                          <td colSpan="4" style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                            {isSubmittingScore ? "Submitting score to leaderboard..." : "No scores submitted yet."}
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px" }}>
              {isTournamentClosed(activeTournament) && (
                <button 
                  className="btn-primary" 
                  style={{
                    background: "linear-gradient(135deg, #f7ce68 0%, #f3c144 60%, #c99522 100%)",
                    color: "#12100d",
                    border: "none",
                    fontWeight: "900",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    setCelebrationTournament(activeTournament);
                    setCelebrationModalOpen(true);
                  }}
                >
                  🏆 View Arena Champions Podium
                </button>
              )}
              <button className="back-list-btn" onClick={() => { setIsPlaying(false); fetchTournaments(); }}>
                Back to Arena Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* SECTION 3: INTERACTIVE GAME BOARD SOLVER (FULL-SCREEN OPTIMIZED HUD) */
          <div className="puzzle-gameplay-container">
            <div className="game-status-bar">
              <button 
                type="button" 
                className="quit-btn" 
                onClick={() => { 
                  if (window.confirm("Are you sure you want to quit? Each player is only allowed 1 attempt and your score so far will be submitted.")) { 
                    finishChallenge(); 
                  } 
                }}
              >
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
                    <strong>
                      {activeTournament.puzzles[currentPuzzleIdx].mateIn === 0
                        ? "Find the Best Move"
                        : `Mate in ${activeTournament.puzzles[currentPuzzleIdx].mateIn} ${activeTournament.puzzles[currentPuzzleIdx].mateIn === 1 ? "Move" : "Moves"}`}
                    </strong>
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
                              <span className="mini-name">{getPlayerDisplayName(entry)}</span>
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
      {/* Interactive Puzzle Solutions, Standings & 3-Winners Modal */}
      {selectedSolutionsTournament && (
        <div className="solutions-modal-backdrop" onClick={() => setSelectedSolutionsTournament(null)}>
          <section className="solutions-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="solutions-modal-close" 
              onClick={() => setSelectedSolutionsTournament(null)} 
              aria-label="Close solutions modal"
            >
              ×
            </button>

            {/* Modal Header */}
            <div className="solutions-modal-header">
              <div className="solutions-header-badge-row">
                <span className="card-badge">
                  <span className="card-badge-dot"></span>
                  {getTournamentState(selectedSolutionsTournament) === "upcoming" 
                    ? "UPCOMING" 
                    : getTournamentState(selectedSolutionsTournament) === "closed" 
                    ? "CLOSED" 
                    : getTournamentState(selectedSolutionsTournament) === "completed" 
                    ? "COMPLETED" 
                    : "LIVE ARENA"}
                </span>
                <span className="format-tag">♟️ TACTICS ARENA</span>
              </div>
              <h2>{selectedSolutionsTournament.title}</h2>
              <p className="solutions-modal-subtitle">
                {getTournamentState(selectedSolutionsTournament) === "closed" || getTournamentState(selectedSolutionsTournament) === "completed"
                  ? "Explore step-by-step puzzle solutions, grand overall scores across all puzzles, and the official 3 champions."
                  : "Review challenge puzzles, current standings, and registered tacticians."}
              </p>
            </div>

            {/* 🏆 Top 3 Winners Podium Cards & Overall Cumulative Score Bar */}
            {(() => {
              const modalStandings = getTournamentStandings(selectedSolutionsTournament);
              if (modalStandings.length === 0) return null;
              const top3 = modalStandings.slice(0, 3);
              const totalScoreAll = modalStandings.reduce((acc, curr) => acc + (curr.score || 0), 0);
              const totalSolvedAll = modalStandings.reduce((acc, curr) => acc + (curr.solvedCount || 0), 0);
              const maxScore = modalStandings[0]?.score || 0;
              const puzzleCount = selectedSolutionsTournament.puzzles?.length || 0;

              return (
                <div className="solutions-podium-section">
                  <div className="podium-section-title">
                    <span>🏆</span>
                    <h3>Arena Champions Podium & Overall Scores</h3>
                  </div>
                  <div className="solutions-winners-grid">
                    {top3.map((winner, idx) => {
                      const avatar = getRosterAvatar(winner);
                      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                      const rankClass = idx === 0 ? "rank-gold" : idx === 1 ? "rank-silver" : "rank-bronze";
                      const label = idx === 0 ? "1st Champion" : idx === 1 ? "2nd Runner-Up" : "3rd Place";
                      const totalPuzzles = selectedSolutionsTournament.puzzles?.length || 0;
                      return (
                        <div key={winner.email || idx} className={`solution-winner-card ${rankClass}`}>
                          <div className="winner-medal">{medal}</div>
                          <img 
                            src={avatar} 
                            alt={winner.name} 
                            className="winner-avatar"
                            onError={(e) => { e.currentTarget.src = "/Icons/unknown.png"; }}
                          />
                          <div className="winner-info">
                            <span className="winner-rank-label">{label}</span>
                            <strong className="winner-name" title={getPlayerDisplayName(winner)}>
                              {getPlayerDisplayName(winner)}
                            </strong>
                            <div className="winner-stats-row">
                              <span className="winner-score">{winner.score || 0} pts</span>
                              <span className="winner-solved">{winner.solvedCount || 0} / {totalPuzzles} 🧩</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall Score Metrics Bar */}
                  <div className="overall-metrics-bar">
                    <div className="metric-box">
                      <span className="metric-icon">👥</span>
                      <span className="metric-label">Competitors</span>
                      <strong className="metric-val">{modalStandings.length}</strong>
                    </div>
                    <div className="metric-box">
                      <span className="metric-icon">🧩</span>
                      <span className="metric-label">Total Puzzles</span>
                      <strong className="metric-val">{puzzleCount}</strong>
                    </div>
                    <div className="metric-box">
                      <span className="metric-icon">⚡</span>
                      <span className="metric-label">Top Score</span>
                      <strong className="metric-val">{maxScore} pts</strong>
                    </div>
                    <div className="metric-box">
                      <span className="metric-icon">📊</span>
                      <span className="metric-label">Total Solved</span>
                      <strong className="metric-val">{totalSolvedAll}</strong>
                    </div>
                    <div className="metric-box">
                      <span className="metric-icon">🏆</span>
                      <span className="metric-label">Overall Points</span>
                      <strong className="metric-val">{totalScoreAll} pts</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Tabs Switcher */}
            <div className="solutions-tabs-nav">
              <button
                type="button"
                className={`tab-btn ${solutionsModalTab === "solutions" ? "active" : ""}`}
                onClick={() => setSolutionsModalTab("solutions")}
              >
                {isTournamentClosed(selectedSolutionsTournament)
                  ? `🧩 Puzzle Solutions (${selectedSolutionsTournament.puzzles?.length || 0})`
                  : "🔒 Solutions (Locked)"}
              </button>
              <button
                type="button"
                className={`tab-btn ${solutionsModalTab === "standings" ? "active" : ""}`}
                onClick={() => setSolutionsModalTab("standings")}
              >
                📊 Overall Standings ({getTournamentStandings(selectedSolutionsTournament).length})
              </button>
              <button
                type="button"
                className={`tab-btn ${solutionsModalTab === "roster" ? "active" : ""}`}
                onClick={() => setSolutionsModalTab("roster")}
              >
                👥 Registered Roster ({selectedSolutionsTournament.participants?.length || 0})
              </button>
            </div>

            {/* TAB 1: INTERACTIVE PUZZLE SOLUTIONS */}
            {solutionsModalTab === "solutions" && (
              <div className="solutions-tab-content">
                {!isTournamentClosed(selectedSolutionsTournament) ? (
                  <div className="solutions-locked-view" style={{ textAlign: "center", padding: "48px 24px", background: "rgba(25, 23, 19, 0.7)", borderRadius: "14px", border: "1px solid rgba(243, 193, 68, 0.2)", margin: "16px 0" }}>
                    <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🔒</div>
                    <h3 style={{ color: "#f3c144", margin: "0 0 12px", fontSize: "1.35rem" }}>
                      Tactical Solutions are Locked
                    </h3>
                    <p style={{ color: "#aaa08f", maxWidth: "520px", margin: "0 auto 24px", lineHeight: "1.6", fontSize: "0.95rem" }}>
                      To preserve tournament integrity, step-by-step puzzle solutions and tactical checkmate sequences remain hidden while the challenge is live. Solutions will be automatically revealed once this arena closes on{" "}
                      <strong style={{ color: "#fff" }}>
                        {selectedSolutionsTournament.endDate} {selectedSolutionsTournament.endTime || "23:59"}
                      </strong>.
                    </p>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        background: "linear-gradient(135deg, #f7ce68 0%, #f3c144 60%, #c99522 100%)",
                        color: "#12100d",
                        border: "none",
                        fontWeight: "bold",
                        padding: "10px 24px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "0.95rem"
                      }}
                      onClick={() => setSolutionsModalTab("standings")}
                    >
                      📊 View Arena Standings
                    </button>
                  </div>
                ) : (!selectedSolutionsTournament.puzzles || selectedSolutionsTournament.puzzles.length === 0) ? (
                  <p className="no-scores-text">No tactical puzzles registered in this tournament.</p>
                ) : (
                  <div className="solutions-viewer-grid">
                    {/* Left Column: Solution Chessboard & Step Controller */}
                    <div className="solution-board-panel">
                      {(() => {
                        const currentPuzzle = selectedSolutionsTournament.puzzles[solutionPuzzleIdx] || selectedSolutionsTournament.puzzles[0];
                        const currentFen = getSolutionBoardAtStep(currentPuzzle, solutionMoveStep);
                        const movesDetails = getSolutionMovesDetails(currentPuzzle);
                        const maxSteps = movesDetails.length;
                        let isWhiteTurn = true;
                        try {
                          isWhiteTurn = new Chess(currentFen).turn() === "w";
                        } catch (e) {}

                        return (
                          <>
                            <div className="solution-board-header">
                              <div className="puzzle-target-badge">
                                {currentPuzzle.mateIn === 0
                                  ? "🎯 Find the Best Move"
                                  : `🎯 Mate in ${currentPuzzle.mateIn} ${currentPuzzle.mateIn === 1 ? "Move" : "Moves"}`}
                              </div>
                              <div className="turn-indicator">
                                {isWhiteTurn ? "⚪ White to move" : "⚫ Black to move"}
                              </div>
                            </div>

                            <div className="solution-board-wrapper">
                              <Chessboard
                                position={currentFen}
                                boardWidth={320}
                                arePiecesDraggable={false}
                                customDarkSquareStyle={{ backgroundColor: "#b58863" }}
                                customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
                                customBoardStyle={{
                                  borderRadius: "10px",
                                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.65)"
                                }}
                              />
                            </div>

                            {/* Step Controller Bar */}
                            <div className="solution-controls-bar">
                              <button
                                type="button"
                                className="step-ctrl-btn"
                                onClick={() => setSolutionMoveStep(0)}
                                disabled={solutionMoveStep === 0}
                                title="Reset to Initial Position"
                              >
                                ⏮ Start
                              </button>
                              <button
                                type="button"
                                className="step-ctrl-btn"
                                onClick={() => setSolutionMoveStep(prev => Math.max(0, prev - 1))}
                                disabled={solutionMoveStep === 0}
                                title="Previous Move"
                              >
                                ◀ Prev
                              </button>
                              <span className="step-counter">
                                Move {solutionMoveStep} / {maxSteps}
                              </span>
                              <button
                                type="button"
                                className="step-ctrl-btn"
                                onClick={() => setSolutionMoveStep(prev => Math.min(maxSteps, prev + 1))}
                                disabled={solutionMoveStep >= maxSteps}
                                title="Next Move"
                              >
                                Next ▶
                              </button>
                              <button
                                type="button"
                                className="step-ctrl-btn auto-play-btn"
                                onClick={() => setSolutionMoveStep(maxSteps)}
                                disabled={solutionMoveStep >= maxSteps}
                                title="Show Full Solution"
                              >
                                💡 Solution ⏭
                              </button>
                            </div>

                            {/* Move Notation Path */}
                            <div className="solution-moves-box">
                              <span className="moves-box-label">Official Solution Sequence:</span>
                              <div className="moves-tags-row">
                                {movesDetails.map((m, mIdx) => (
                                  <button
                                    key={mIdx}
                                    type="button"
                                    className={`move-tag ${solutionMoveStep === mIdx + 1 ? "active-move" : ""}`}
                                    onClick={() => setSolutionMoveStep(mIdx + 1)}
                                  >
                                    <span className="move-num">{m.isWhite ? `${m.moveNumber}.` : `${m.moveNumber}...`}</span>
                                    <strong>{m.san}</strong>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Right Column: Puzzle Selector List & Tactical Insights */}
                    <div className="solution-puzzles-list-panel">
                      <h4 className="panel-heading">Puzzles in this Challenge</h4>
                      <div className="puzzles-selector-list">
                        {selectedSolutionsTournament.puzzles.map((p, pIdx) => {
                          const isActive = pIdx === solutionPuzzleIdx;
                          return (
                            <div
                              key={pIdx}
                              className={`puzzle-selector-card ${isActive ? "active" : ""}`}
                              onClick={() => {
                                setSolutionPuzzleIdx(pIdx);
                                setSolutionMoveStep(0);
                              }}
                            >
                              <div className="puzzle-card-left">
                                <span className="puzzle-index-badge">#{pIdx + 1}</span>
                                <div className="puzzle-details">
                                  <strong className="puzzle-title">
                                    {p.mateIn === 0
                                      ? "Find the Best Move"
                                      : `Mate in ${p.mateIn} ${p.mateIn === 1 ? "Move" : "Moves"}`}
                                  </strong>
                                  <p className="puzzle-desc">
                                    {p.description || "Calculate the decisive winning combination"}
                                  </p>
                                </div>
                              </div>
                              <div className="puzzle-card-right">
                                <span className="moves-count-tag">
                                  {(p.correctMoves || []).length} ply
                                </span>
                                <span className="arrow-icon">{isActive ? "▶" : "›"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: OVERALL SCORES & STANDINGS */}
            {solutionsModalTab === "standings" && (
              <div className="standings-tab-content">
                <div className="leaderboard-table-container">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th className="col-rank">Rank</th>
                        <th className="col-player">Tactician</th>
                        <th className="col-solved">Puzzles Cleared</th>
                        <th className="col-rate">Solve Rate</th>
                        <th className="col-score">Total Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const standings = getTournamentStandings(selectedSolutionsTournament);
                        if (standings.length > 0) {
                          return standings.map((entry, idx) => {
                            const avatarUrl = getRosterAvatar(entry);
                            const puzzleCount = selectedSolutionsTournament.puzzles?.length || 1;
                            const solvePct = Math.round(((entry.solvedCount || 0) / puzzleCount) * 100);
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
                                    <span className="player-name">{getPlayerDisplayName(entry)}</span>
                                    {entry.email === userEmail && <span className="you-pill">YOU</span>}
                                    {entry.unattempted && (
                                      <span
                                        className="unattempted-pill"
                                        style={{
                                          marginLeft: "8px",
                                          fontSize: "0.72rem",
                                          padding: "2px 6px",
                                          borderRadius: "4px",
                                          background: "rgba(255, 255, 255, 0.08)",
                                          color: "#a89f91",
                                          border: "1px solid rgba(255, 255, 255, 0.12)"
                                        }}
                                      >
                                        Unattempted
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="col-solved">
                                  <strong>{entry.solvedCount || 0}</strong> / {puzzleCount} 🧩
                                </td>
                                <td className="col-rate">
                                  <div className="rate-bar-wrap">
                                    <div className="rate-bar-fill" style={{ width: `${solvePct}%` }}></div>
                                    <span className="rate-pct">{solvePct}%</span>
                                  </div>
                                </td>
                                <td className="col-score">
                                  <strong className="score-val">{entry.score || 0} pts</strong>
                                </td>
                              </tr>
                            );
                          });
                        }
                        return (
                          <tr>
                            <td colSpan="5" style={{ textAlign: "center", color: "#888", padding: "24px" }}>
                              {isTournamentClosed(selectedSolutionsTournament)
                                ? "No registered participants or scores for this challenge."
                                : "No scores recorded yet for this active challenge."}
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: REGISTERED ROSTER */}
            {solutionsModalTab === "roster" && (
              <div className="roster-tab-content">
                {(selectedSolutionsTournament.participants || []).length > 0 ? (
                  <div className="roster-grid">
                    {selectedSolutionsTournament.participants.map((p, idx) => (
                      <div className="roster-card" key={p.email || idx}>
                        <span className="roster-rank-badge">#{idx + 1}</span>
                        <img
                          src={getRosterAvatar(p)}
                          alt={p.name}
                          className="roster-avatar"
                          onError={(e) => { e.currentTarget.src = "/Icons/unknown.png"; }}
                        />
                        <div className="roster-meta">
                          <strong className="roster-player-name">{getPlayerDisplayName(p)}</strong>
                          <span className="roster-status-pill">♟️ Registered Tactician</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="roster-empty-state">
                    <span style={{ fontSize: "2rem" }}>👥</span>
                    <p style={{ color: "#aaa08f", margin: "8px 0 0" }}>
                      No tacticians have registered for this challenge yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      {/* Universal Winner Celebration Modal for Tactics Arena */}
      {(() => {
        const sortedLb = celebrationTournament ? getTournamentStandings(celebrationTournament) : [];
        const puzzleP1 = sortedLb[0] ? { name: getPlayerDisplayName(sortedLb[0]), score: sortedLb[0].score, solvedCount: sortedLb[0].solvedCount, email: sortedLb[0].email } : null;
        const puzzleP2 = sortedLb[1] ? { name: getPlayerDisplayName(sortedLb[1]), score: sortedLb[1].score, solvedCount: sortedLb[1].solvedCount, email: sortedLb[1].email } : null;
        const puzzleP3 = sortedLb[2] ? { name: getPlayerDisplayName(sortedLb[2]), score: sortedLb[2].score, solvedCount: sortedLb[2].solvedCount, email: sortedLb[2].email } : null;

        return (
          <WinnerCelebrationModal
            isOpen={celebrationModalOpen}
            onClose={() => setCelebrationModalOpen(false)}
            tournamentTitle={celebrationTournament?.title || "Tactics Arena"}
            tournamentType="Puzzle Tactics Arena"
            winner={puzzleP1}
            runnerUp={puzzleP2}
            thirdPlace={puzzleP3}
            customAvatars={customAvatars}
            onViewBracketOrStandings={() => {
              if (celebrationTournament) {
                handleOpenSolutionsModal(
                  celebrationTournament,
                  isTournamentClosed(celebrationTournament) ? "solutions" : "standings"
                );
              }
            }}
          />
        );
      })()}

      {!activePlayState && <Footer />}
    </div>
  );
}
