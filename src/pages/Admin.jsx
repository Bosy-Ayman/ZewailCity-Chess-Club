import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./Admin.css";
import { safeFetchJson, compressImage } from "../utils/api";

// API Base URL - works for both local and production
const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [activeTab, setActiveTab] = useState("add-tournament");
  
  // Puzzle Challenge Tournament states
  const [puzzleTournaments, setPuzzleTournaments] = useState([]);
  const [editingPuzzleTournamentId, setEditingPuzzleTournamentId] = useState(null);
  const [puzzleTitle, setPuzzleTitle] = useState("");
  const [puzzleStartDate, setPuzzleStartDate] = useState("");
  const [puzzleStartTime, setPuzzleStartTime] = useState("");
  const [puzzleEndDate, setPuzzleEndDate] = useState("");
  const [puzzleEndTime, setPuzzleEndTime] = useState("");
  const [puzzleTimeLimit, setPuzzleTimeLimit] = useState(60);
  const [puzzlesList, setPuzzlesList] = useState([]);

  // Active puzzle setup state
  const [activePuzzleFen, setActivePuzzleFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [activePuzzleMateIn, setActivePuzzleMateIn] = useState(1);
  const [activePuzzleMoves, setActivePuzzleMoves] = useState([]);
  const [activePuzzleDesc, setActivePuzzleDesc] = useState("");
  const [setupMode, setSetupMode] = useState(true); // true = setup pieces; false = record solution moves
  const [selectedPiece, setSelectedPiece] = useState(null); // { type: 'p'|'r'..., color: 'w'|'b' } or 'clear'
  const [chessInstance, setChessInstance] = useState(new Chess());
  const [initialPuzzleFen, setInitialPuzzleFen] = useState("");
  const [boardOrientation, setBoardOrientation] = useState("white");
  const [customFenInput, setCustomFenInput] = useState("");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});

  const [tournaments, setTournaments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Dynamic container board width calculation for optimal ratio
  const boardWrapperRef = useRef(null);
  const boardDragRef = useRef(0);
  const [boardWidth, setBoardWidth] = useState(() => Math.min(window.innerWidth - 32, 480));

  useEffect(() => {
    const updateBoardWidth = () => {
      if (boardWrapperRef.current) {
        const innerW = boardWrapperRef.current.clientWidth;
        if (innerW > 0) {
          setBoardWidth(innerW);
        }
      } else {
        const containerFallback = Math.min(window.innerWidth - 24, 480);
        setBoardWidth(containerFallback);
      }
    };

    updateBoardWidth();
    const t1 = setTimeout(updateBoardWidth, 50);
    const t2 = setTimeout(updateBoardWidth, 200);
    window.addEventListener("resize", updateBoardWidth);

    let observer;
    if (typeof ResizeObserver !== "undefined" && boardWrapperRef.current) {
      observer = new ResizeObserver(() => updateBoardWidth());
      observer.observe(boardWrapperRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", updateBoardWidth);
      if (observer) observer.disconnect();
    };
  }, [activeTab, setupMode, editingPuzzleTournamentId]);

  // Modal state for applications
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  // Form state for new tournament
  const [form, setForm] = useState({
    title: "",
    type: "Swiss",
    status: "Upcoming",
    startDate: "",
    endDate: "",
    time: "",
    location: "Zewail Chess Club",
    description: "",
    image: "",
    detailsUrl: "",
    rounds: 5  // Swiss only — FIDE: N rounds needs ≥ N+1 players
  });

  // Tournament Photo Modal state for managing/completed tournaments
  const [photoModal, setPhotoModal] = useState({
    isOpen: false,
    tournamentId: null,
    tournamentTitle: "",
    previewUrl: "",
    isSaving: false
  });

  // Fetch tournaments and applications
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Tournaments
      try {
        const tourData = await safeFetchJson(`${API_BASE}/api/tournaments`);
        if (Array.isArray(tourData)) setTournaments(tourData);
      } catch (e) {
        console.warn("Failed to fetch tournaments:", e.message);
      }

      // Fetch Applications
      try {
        const appData = await safeFetchJson(`${API_BASE}/api/applications`);
        if (Array.isArray(appData)) setApplications(appData);
      } catch (e) {
        console.warn("Failed to fetch applications:", e.message);
      }

      // Fetch Puzzle Tournaments
      try {
        const pzData = await safeFetchJson(`${API_BASE}/api/puzzle-tournaments`);
        if (Array.isArray(pzData)) setPuzzleTournaments(pzData);
      } catch (e) {
        console.warn("Failed to fetch puzzle tournaments:", e.message);
      }

      // Fetch Users
      if (userRole === "admin") {
        try {
          const userData = await safeFetchJson(`${API_BASE}/api/users`);
          if (Array.isArray(userData)) setUsers(userData);
        } catch (e) {
          console.warn("Failed to fetch users:", e.message);
        }
      }

      // Fetch Inquiries / Contact Dispatches
      if (userRole === "admin" || userRole === "oc" || userRole === "hr") {
        try {
          const inqData = await safeFetchJson(`${API_BASE}/api/contact`);
          if (Array.isArray(inqData)) setInquiries(inqData);
        } catch (e) {
          console.warn("Failed to fetch inquiries:", e.message);
        }
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setErrorMessage("Failed to load dashboard data. Is the server running?");
    } finally {
      setIsLoading(false);
    }
  };

  const userRole = localStorage.getItem("userRole") || "member";

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/?login=true");
      return;
    }
    if (userRole !== "admin" && userRole !== "oc" && userRole !== "hr") {
      navigate("/");
      return;
    }
    
    // Set default active tab based on query param or role
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (userRole === "hr") {
      setActiveTab("applications");
    } else {
      setActiveTab("add-tournament");
    }
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, userRole, location.search]);

  // eslint-disable-next-line no-unused-vars
  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  const handleUpdateStatus = async (id, status) => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await safeFetchJson(`${API_BASE}/api/applications/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      setSuccessMessage(`Application ${status.toLowerCase()} successfully!`);
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to update status.");
    }
  };

  // Chess editor helpers & robust FEN tools
  const extractBoardMapFromFen = (fenStr) => {
    const map = {};
    if (!fenStr) return map;
    try {
      const tempChess = new Chess(fenStr);
      const board = tempChess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c]) {
            const sq = String.fromCharCode(97 + c) + (8 - r);
            map[sq] = { type: board[r][c].type, color: board[r][c].color };
          }
        }
      }
    } catch (e) {
      // Fallback manual FEN parser if chess.js rejects intermediate incomplete position
      const parts = fenStr.split(" ");
      const rows = parts[0].split("/");
      if (rows.length === 8) {
        for (let r = 0; r < 8; r++) {
          let c = 0;
          for (let i = 0; i < rows[r].length; i++) {
            const char = rows[r][i];
            if (!isNaN(char)) {
              c += parseInt(char, 10);
            } else {
              const color = char === char.toUpperCase() ? 'w' : 'b';
              const type = char.toLowerCase();
              const sq = String.fromCharCode(97 + c) + (8 - r);
              map[sq] = { type, color };
              c++;
            }
          }
        }
      }
    }
    return map;
  };

  const buildFenFromBoardMap = (boardMap, currentFen = "") => {
    let rows = [];
    for (let r = 7; r >= 0; r--) {
      let emptyCount = 0;
      let rowStr = "";
      for (let c = 0; c < 8; c++) {
        const sq = String.fromCharCode(97 + c) + (r + 1);
        const p = boardMap[sq];
        if (!p) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            rowStr += emptyCount;
            emptyCount = 0;
          }
          const char = p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
          rowStr += char;
        }
      }
      if (emptyCount > 0) rowStr += emptyCount;
      rows.push(rowStr);
    }
    const posPart = rows.join("/");
    const turn = (currentFen && currentFen.split(" ")[1]) || "w";
    return `${posPart} ${turn} - - 0 1`;
  };

  const getMoveOptionsStyles = (sourceSquare, gameInstance) => {
    if (!gameInstance || typeof gameInstance.moves !== "function") return {};

    const moves = gameInstance.moves({
      square: sourceSquare,
      verbose: true
    });

    if (!moves || moves.length === 0) return {};

    const newStyles = {};
    
    newStyles[sourceSquare] = {
      backgroundColor: "rgba(243, 193, 68, 0.4)",
      boxShadow: "inset 0 0 0 2px #f3c144"
    };

    moves.forEach((move) => {
      const targetPiece = gameInstance.get(move.to);
      if (targetPiece) {
        newStyles[move.to] = {
          background: "radial-gradient(circle, transparent 52%, rgba(243, 193, 68, 0.75) 53%, rgba(243, 193, 68, 0.75) 70%, transparent 71%)",
          borderRadius: "50%"
        };
      } else {
        newStyles[move.to] = {
          background: "radial-gradient(circle, rgba(243, 193, 68, 0.75) 24%, transparent 25%)",
          borderRadius: "50%"
        };
      }
    });

    return newStyles;
  };

  const handleSquareClick = (square) => {
    if (Date.now() - boardDragRef.current < 150) return;

    if (setupMode) {
      try {
        const boardMap = extractBoardMapFromFen(activePuzzleFen);

        if (selectedPiece === "clear") {
          delete boardMap[square];
        } else if (selectedPiece && typeof selectedPiece === "object") {
          boardMap[square] = { type: selectedPiece.type, color: selectedPiece.color };
        } else {
          // Erase / clear piece on click if no palette item selected
          if (boardMap[square]) {
            delete boardMap[square];
          }
        }

        const newFen = buildFenFromBoardMap(boardMap, activePuzzleFen);
        setActivePuzzleFen(newFen);
        try {
          setChessInstance(new Chess(newFen));
        } catch (e) {}
      } catch (err) {
        console.warn("Square click error:", err);
      }
      return;
    }

    // Record Solution Mode: click-to-move support
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setOptionSquares({});
        return;
      }

      const clickedPiece = chessInstance.get(square);
      if (clickedPiece && clickedPiece.color === chessInstance.turn()) {
        const styles = getMoveOptionsStyles(square, chessInstance);
        setSelectedSquare(square);
        setOptionSquares(styles);
        return;
      }

      const moveSuccess = handlePieceDrop(selectedSquare, square);
      if (moveSuccess) {
        setSelectedSquare(null);
        setOptionSquares({});
        return;
      }

      setSelectedSquare(null);
      setOptionSquares({});
      return;
    }

    const piece = chessInstance.get(square);
    if (piece && piece.color === chessInstance.turn()) {
      const styles = getMoveOptionsStyles(square, chessInstance);
      setSelectedSquare(square);
      setOptionSquares(styles);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  };

  const handlePieceDrop = (sourceSquare, targetSquare) => {
    boardDragRef.current = Date.now();
    setSelectedSquare(null);
    setOptionSquares({});
    if (setupMode) {
      // In Setup Mode: allow free dragging of pieces anywhere on the board
      const boardMap = extractBoardMapFromFen(activePuzzleFen);
      const movedPiece = boardMap[sourceSquare];
      if (movedPiece) {
        delete boardMap[sourceSquare];
        boardMap[targetSquare] = movedPiece;
        const newFen = buildFenFromBoardMap(boardMap, activePuzzleFen);
        setActivePuzzleFen(newFen);
        try {
          setChessInstance(new Chess(newFen));
        } catch (e) {}
      }
      return true;
    }

    // Record Mode: record legal solution moves
    try {
      const newChess = new Chess(chessInstance.fen());
      const move = newChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q"
      });
      
      if (move) {
        setChessInstance(newChess);
        setActivePuzzleFen(newChess.fen());
        setActivePuzzleMoves([...activePuzzleMoves, move.lan]);
        return true;
      }
    } catch (err) {
      alert("Invalid move! Pieces must follow legal chess rules during move recording.");
    }
    return false;
  };

  const onPieceDragBegin = (piece, sourceSquare) => {
    boardDragRef.current = Date.now();
    if (setupMode) return;
    const styles = getMoveOptionsStyles(sourceSquare, chessInstance);
    setSelectedSquare(sourceSquare);
    setOptionSquares(styles);
  };

  const onPieceDragEnd = () => {
    setSelectedSquare(null);
    setOptionSquares({});
  };

  const handleToggleTurn = () => {
    try {
      const currentFen = activePuzzleFen || (chessInstance ? chessInstance.fen() : "");
      const fenParts = currentFen.split(" ");
      if (fenParts.length >= 2) {
        fenParts[1] = fenParts[1] === "w" ? "b" : "w";
        const newFen = fenParts.join(" ");
        try {
          setChessInstance(new Chess(newFen));
        } catch (e) {}
        setActivePuzzleFen(newFen);
      }
    } catch (err) {
      alert("Invalid board state to change turn!");
    }
  };

  const handleClearBoard = () => {
    const emptyFen = "8/8/8/8/8/8/8/8 w - - 0 1";
    setActivePuzzleFen(emptyFen);
    try {
      const emptyChess = new Chess();
      emptyChess.clear();
      setChessInstance(emptyChess);
    } catch (e) {}
  };

  const handleResetStartBoard = () => {
    const startChess = new Chess();
    setChessInstance(startChess);
    setActivePuzzleFen(startChess.fen());
  };

  const handleLoadCustomFen = (fenString) => {
    const fen = (fenString || customFenInput).trim();
    if (!fen) return;
    try {
      const testChess = new Chess(fen);
      setChessInstance(testChess);
      setActivePuzzleFen(testChess.fen());
      setCustomFenInput("");
    } catch (e) {
      if (fen.split(" ").length >= 1 && fen.split("/").length === 8) {
        setActivePuzzleFen(fen);
        setCustomFenInput("");
      } else {
        alert("Invalid FEN string! Please check formatting (e.g. r1bqkb1r/pppp1ppp/...).");
      }
    }
  };

  const handleCopyFen = () => {
    if (navigator.clipboard && activePuzzleFen) {
      navigator.clipboard.writeText(activePuzzleFen);
      alert("Position FEN copied to clipboard!");
    }
  };

  const handleStartRecording = () => {
    const boardMap = extractBoardMapFromFen(activePuzzleFen);
    let whiteKing = false;
    let blackKing = false;

    Object.values(boardMap).forEach(p => {
      if (p.type === 'k') {
        if (p.color === 'w') whiteKing = true;
        if (p.color === 'b') blackKing = true;
      }
    });

    if (!whiteKing || !blackKing) {
      alert("Both White (♔) and Black (♚) Kings must be placed on the board before recording solution moves!");
      return;
    }

    try {
      const validChess = new Chess(activePuzzleFen);
      setChessInstance(validChess);
      setInitialPuzzleFen(validChess.fen());
      setSetupMode(false);
      setActivePuzzleMoves([]);
    } catch (err) {
      alert(`Invalid position for move recording: ${err.message || "Ensure position is legal."}`);
    }
  };

  const handleUndoMove = () => {
    if (activePuzzleMoves.length === 0) return;
    try {
      const replayChess = new Chess(initialPuzzleFen);
      const newMoves = activePuzzleMoves.slice(0, -1);
      newMoves.forEach(m => {
        replayChess.move(m);
      });
      setChessInstance(replayChess);
      setActivePuzzleFen(replayChess.fen());
      setActivePuzzleMoves(newMoves);
    } catch (err) {
      alert("Error undoing move!");
    }
  };

  const handleAddPuzzle = () => {
    if (activePuzzleMoves.length === 0) {
      alert("Please record the correct solution moves first!");
      return;
    }
    
    const newPuzzle = {
      initialFen: initialPuzzleFen,
      mateIn: activePuzzleMateIn,
      correctMoves: activePuzzleMoves,
      description: activePuzzleDesc || `Mate in ${activePuzzleMateIn}`
    };
    
    setPuzzlesList([...puzzlesList, newPuzzle]);
    
    // Reset editor for next puzzle
    const defaultChess = new Chess();
    setChessInstance(defaultChess);
    setActivePuzzleFen(defaultChess.fen());
    setInitialPuzzleFen("");
    setActivePuzzleMoves([]);
    setActivePuzzleDesc("");
    setSetupMode(true);
    setSelectedPiece(null);
  };

  const handleEditPuzzleInList = (index) => {
    const p = puzzlesList[index];
    if (!p) return;
    try {
      const c = new Chess(p.initialFen);
      setChessInstance(c);
    } catch (e) {}
    setActivePuzzleFen(p.initialFen);
    setActivePuzzleMateIn(p.mateIn || 1);
    setActivePuzzleMoves(p.correctMoves || []);
    setActivePuzzleDesc(p.description || "");
    setInitialPuzzleFen(p.initialFen);
    setSetupMode(false);
    setPuzzlesList(puzzlesList.filter((_, i) => i !== index));
  };

  const handleSavePuzzleTournament = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    
    if (puzzlesList.length === 0) {
      setErrorMessage("Please add at least one puzzle to the tournament!");
      return;
    }
    
    try {
      const url = editingPuzzleTournamentId 
        ? `${API_BASE}/api/puzzle-tournaments/${editingPuzzleTournamentId}`
        : `${API_BASE}/api/puzzle-tournaments`;
      const method = editingPuzzleTournamentId ? "PUT" : "POST";

      await safeFetchJson(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: puzzleTitle,
          startDate: puzzleStartDate,
          startTime: puzzleStartTime,
          endDate: puzzleEndDate,
          endTime: puzzleEndTime,
          timeLimit: puzzleTimeLimit,
          puzzles: puzzlesList
        })
      });
      
      setSuccessMessage(editingPuzzleTournamentId ? "Puzzle tournament updated successfully!" : "Puzzle tournament created successfully!");
      handleResetPuzzleForm();
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to save puzzle tournament.");
    }
  };

  const handleEditPuzzleTournament = (t) => {
    setEditingPuzzleTournamentId(t._id);
    setPuzzleTitle(t.title || "");
    setPuzzleStartDate(t.startDate || "");
    setPuzzleStartTime(t.startTime || "");
    setPuzzleEndDate(t.endDate || "");
    setPuzzleEndTime(t.endTime || "");
    setPuzzleTimeLimit(t.timeLimit || 60);
    setPuzzlesList(t.puzzles || []);
    setSuccessMessage(`Editing: ${t.title}`);
    
    // Scroll to form
    const element = document.getElementById("puzzle-form-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDeletePuzzleTournament = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the puzzle challenge "${title || 'Tournament'}"? This action cannot be undone.`)) return;
    try {
      await safeFetchJson(`${API_BASE}/api/puzzle-tournaments/${id}`, {
        method: "DELETE"
      });
      setSuccessMessage("Puzzle tournament deleted successfully!");
      if (editingPuzzleTournamentId === id) {
        handleResetPuzzleForm();
      }
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete puzzle tournament.");
    }
  };

  const handleRemovePuzzleParticipant = async (tournament, participant) => {
    if (!window.confirm(`Remove ${participant.name} from "${tournament.title}"?`)) return;
    try {
      const adminEmail = localStorage.getItem("adminEmail") || "";
      const updated = await safeFetchJson(
        `${API_BASE}/api/puzzle-tournaments/${tournament._id}/participants/${encodeURIComponent(participant.email)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Email": adminEmail
          },
          body: JSON.stringify({ adminEmail })
        }
      );
      if (updated?.data) {
        setPuzzleTournaments((prev) => prev.map((item) => item._id === tournament._id ? updated.data : item));
      }
      setSuccessMessage(`${participant.name} was removed from the tournament.`);
    } catch (err) {
      setErrorMessage(err.message || "Failed to remove participant.");
    }
  };

  const handleResetPuzzleForm = () => {
    setEditingPuzzleTournamentId(null);
    setPuzzleTitle("");
    setPuzzleStartDate("");
    setPuzzleStartTime("");
    setPuzzleEndDate("");
    setPuzzleEndTime("");
    setPuzzleTimeLimit(60);
    setPuzzlesList([]);
    const defaultChess = new Chess();
    setChessInstance(defaultChess);
    setActivePuzzleFen(defaultChess.fen());
    setInitialPuzzleFen("");
    setActivePuzzleMoves([]);
    setActivePuzzleDesc("");
    setSetupMode(true);
    setSelectedPiece(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // Create Tournament
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.title || !form.startDate || !form.time) {
      setErrorMessage("Please fill in all required fields (Title, Start Date, and Time).");
      return;
    }

    try {
      await safeFetchJson(`${API_BASE}/api/tournaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      setSuccessMessage("Tournament created successfully!");
      // Reset form (except defaults)
      setForm({
        title: "",
        type: "Swiss",
        status: "Upcoming",
        startDate: "",
        endDate: "",
        time: "",
        location: "Zewail Chess Club",
        description: "",
        image: "",
        detailsUrl: "",
        rounds: 5
      });
      fetchData(); // Refresh list
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong.");
    }
  };

  // Save/Update Tournament Photo from Modal
  const handleSaveTournamentPhoto = async () => {
    if (!photoModal.tournamentId) return;
    setPhotoModal((prev) => ({ ...prev, isSaving: true }));
    try {
      await safeFetchJson(`${API_BASE}/api/tournaments/${photoModal.tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photoModal.previewUrl })
      });
      setSuccessMessage(`Tournament photo updated for "${photoModal.tournamentTitle}"! It will now appear in History & Archives.`);
      setPhotoModal({ isOpen: false, tournamentId: null, tournamentTitle: "", previewUrl: "", isSaving: false });
      fetchData();
    } catch (err) {
      setErrorMessage("Failed to update tournament photo: " + err.message);
      setPhotoModal((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // Delete Tournament
  const handleDeleteTournament = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tournament?")) return;

    try {
      await safeFetchJson(`${API_BASE}/api/tournaments/${id}`, {
        method: "DELETE"
      });

      setSuccessMessage("Tournament deleted successfully.");
      fetchData(); // Refresh list
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Delete User
  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user completely? This cannot be undone.")) return;

    try {
      await safeFetchJson(`${API_BASE}/api/users/${id}`, {
        method: "DELETE"
      });

      setSuccessMessage("User deleted successfully.");
      fetchData(); // Refresh list
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Utility to format role specific details
  const PrettyRoleData = ({ data }) => {
    const formatKey = (key) =>
      key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const renderData = (obj) => {
      if (obj === null || obj === undefined)
        return <em style={{ color: "#888" }}>Not provided</em>;

      if (Array.isArray(obj)) {
        return obj.map((item, i) => (
          <div key={i} className="pretty-role-array-item">
            <h4>Entry #{i + 1}</h4>
            {renderData(item)}
          </div>
        ));
      }

      if (typeof obj === "object" && obj !== null) {
        return Object.entries(obj).map(([k, v]) => (
          <div key={k} className="pretty-field">
            <strong>{formatKey(k)}:</strong>
            <div style={{ paddingLeft: "15px" }}>{renderData(v)}</div>
          </div>
        ));
      }

      return <span>{obj}</span>;
    };

    return (
      <div className="pretty-role-data">
        {Object.keys(data || {}).length === 0 ? (
          <p style={{ color: "#caba91", fontStyle: "italic" }}>
            No role-specific data provided.
          </p>
        ) : (
          renderData(data)
        )}
      </div>
    );
  };

  return (
    <div className="admin-wrapper">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="admin-container">
        <section className="intro-header">
          <div className="admin-header-content">
            <div className="admin-header-titles">
              <span className="admin-role-badge">
                {userRole === "admin" ? "👑 Executive Admin Portal" : userRole === "oc" ? "⚡ Organizing Committee Portal" : "📋 HR Management Portal"}
              </span>
              <h1 className="site-page-title">Zewail City Chess Club Dashboard</h1>
              <p>Manage club tournaments, schedule rounds, review member applications, and set up daily puzzle challenges.</p>
            </div>

            <div className="admin-kpi-bar">
              <div className="kpi-pill">
                <span className="kpi-num">{tournaments.length}</span>
                <span className="kpi-label">Tournaments</span>
              </div>
              <div className="kpi-pill">
                <span className="kpi-num">{applications.length}</span>
                <span className="kpi-label">Applications</span>
              </div>
              {userRole === "admin" && (
                <div className="kpi-pill">
                  <span className="kpi-num">{users.length}</span>
                  <span className="kpi-label">Members</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Mobile Tab Selector (Visible on < 768px) */}
        <div className="admin-mobile-tab-select-wrapper">
          <label htmlFor="admin-mobile-tab-select" className="admin-mobile-tab-label">Switch Admin Section:</label>
          <select
            id="admin-mobile-tab-select"
            className="admin-mobile-tab-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {(userRole === "admin" || userRole === "oc") && (
              <option value="add-tournament">➕ Add Tournament</option>
            )}
            {(userRole === "admin" || userRole === "oc") && (
              <option value="tournaments-list">🏆 Manage Tournaments ({tournaments.length})</option>
            )}
            {(userRole === "admin" || userRole === "hr") && (
              <option value="applications">📋 Club Applications ({applications.length})</option>
            )}
            {userRole === "admin" && (
              <option value="manage-users">👥 Manage Users ({users.length})</option>
            )}
            {(userRole === "admin" || userRole === "oc") && (
              <option value="manage-puzzles">🧩 Chess Puzzles {puzzlesList.length > 0 ? `(${puzzlesList.length})` : ""}</option>
            )}
            <option value="inquiries">📬 Inquiries / Dispatches {inquiries.filter(m => !m.read).length > 0 ? `(${inquiries.filter(m => !m.read).length} new)` : `(${inquiries.length})`}</option>
          </select>
        </div>

        {/* Desktop Tab Controls (Visible on >= 768px) */}
        <div className="admin-tabs admin-desktop-tabs">
          {(userRole === "admin" || userRole === "oc") && (
            <button
              className={`tab-btn ${activeTab === "add-tournament" ? "active" : ""}`}
              onClick={() => setActiveTab("add-tournament")}
            >
              ➕ Add Tournament
            </button>
          )}
          {(userRole === "admin" || userRole === "oc") && (
            <button
              className={`tab-btn ${activeTab === "tournaments-list" ? "active" : ""}`}
              onClick={() => setActiveTab("tournaments-list")}
            >
              🏆 Manage Tournaments ({tournaments.length})
            </button>
          )}
          {(userRole === "admin" || userRole === "hr") && (
            <button
              className={`tab-btn ${activeTab === "applications" ? "active" : ""}`}
              onClick={() => setActiveTab("applications")}
            >
              📋 Club Applications ({applications.length})
            </button>
          )}
          {userRole === "admin" && (
            <button
              className={`tab-btn ${activeTab === "manage-users" ? "active" : ""}`}
              onClick={() => setActiveTab("manage-users")}
            >
              👥 Manage Users ({users.length})
            </button>
          )}
          {(userRole === "admin" || userRole === "oc") && (
            <button
              className={`tab-btn ${activeTab === "manage-puzzles" ? "active" : ""}`}
              onClick={() => setActiveTab("manage-puzzles")}
            >
              🧩 Chess Puzzles {puzzlesList.length > 0 ? `(${puzzlesList.length})` : ""}
            </button>
          )}
          <button
            className={`tab-btn ${activeTab === "inquiries" ? "active" : ""}`}
            onClick={() => setActiveTab("inquiries")}
          >
            📬 Inquiries / Dispatches {inquiries.filter(m => !m.read).length > 0 ? `(${inquiries.filter(m => !m.read).length} new)` : `(${inquiries.length})`}
          </button>
        </div>

        {/* Alert Messages */}
        {successMessage && <div className="alert-message success">{successMessage}</div>}
        {errorMessage && <div className="alert-message error">{errorMessage}</div>}

        {/* Tab Contents */}
        <div className="tab-content">
          
          {/* Tab 1: Add Tournament */}
          {activeTab === "add-tournament" && (
            <div className="form-card">
              <h2>Add New Tournament</h2>
              <form onSubmit={handleCreateTournament} className="admin-form">
                <div className="form-group">
                  <label htmlFor="title">Tournament Name *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={form.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Rapid Fall Tournament"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="type">Tournament Type</label>
                    <select
                      id="type"
                      name="type"
                      value={form.type}
                      onChange={handleInputChange}
                    >
                      <option value="Swiss">Swiss</option>
                      <option value="Single Elimination">Single Elimination (Knockout)</option>
                      <option value="Double Elimination">Double Elimination (Knockout)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={form.status}
                      onChange={handleInputChange}
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Swiss-only: Number of Rounds */}
                {form.type === "Swiss" && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="rounds">
                        Number of Rounds *
                        <span style={{ fontWeight: "400", color: "#f3c144", marginLeft: "8px", fontSize: "0.82rem" }}>
                          (Swiss only)
                        </span>
                      </label>
                      <input
                        type="number"
                        id="rounds"
                        name="rounds"
                        value={form.rounds}
                        onChange={handleInputChange}
                        min="1"
                        max="13"
                        required
                      />
                      <small style={{ color: "#888", fontSize: "0.78rem", marginTop: "5px", display: "block" }}>
                        📋 FIDE min. players needed:{" "}
                        <strong style={{ color: "#f3c144" }}>{Number(form.rounds) + 1}</strong>
                        {" "}· Ideal (no rematches):{" "}
                        <strong style={{ color: "#f3c144" }}>{Math.pow(2, Number(form.rounds))}</strong>
                      </small>
                    </div>
                    <div className="form-group" /> {/* spacer */}
                  </div>
                )}


                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="startDate">Start Date *</label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={form.startDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="endDate">End Date</label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={form.endDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="time">Time *</label>
                    {/* Quick Time Preset Buttons */}
                    <div style={{ display: "flex", gap: "6px", margin: "4px 0 8px", flexWrap: "wrap" }}>
                      {["10:00 AM", "12:00 PM", "2:00 PM", "5:00 PM", "6:30 PM", "8:00 PM"].map((tPreset) => (
                        <button
                          key={tPreset}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, time: tPreset }))}
                          style={{
                            background: form.time === tPreset ? "#f3c144" : "rgba(243, 193, 68, 0.12)",
                            color: form.time === tPreset ? "#15120c" : "#f3c144",
                            border: "1px solid rgba(243, 193, 68, 0.3)",
                            borderRadius: "10px",
                            padding: "2px 8px",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            cursor: "pointer"
                          }}
                        >
                          {tPreset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      id="time"
                      name="time"
                      value={form.time}
                      onChange={handleInputChange}
                      placeholder="e.g. 12:00 PM or 2:00 PM - 5:00 PM"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="location">Location</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={form.location}
                      onChange={handleInputChange}
                      placeholder="e.g. Zewail Chess Club Room"
                    />
                  </div>
                </div>


                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    placeholder="Provide details about the tournament rounds, rules, or prizes."
                    rows="4"
                  />
                </div>

                <div className="form-group">
                  <label>Tournament Poster / Cover Photo (Optional)</label>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1.5px dashed rgba(243, 193, 68, 0.35)", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                    {form.image ? (
                      <div>
                        <img 
                          src={form.image} 
                          alt="Tournament Preview" 
                          style={{ maxWidth: "100%", maxHeight: "160px", borderRadius: "8px", objectFit: "cover", marginBottom: "10px", border: "1px solid #f3c144" }} 
                        />
                        <br />
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, image: "" }))}
                          style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700" }}
                        >
                          ✕ Remove Image
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: "0 0 10px", color: "#bab19c", fontSize: "0.85rem" }}>
                          Upload event poster, banner, or hall photo (auto-compressed for fast loading)
                        </p>
                        <label style={{ display: "inline-block", background: "rgba(243, 193, 68, 0.15)", color: "#f3c144", border: "1px solid rgba(243, 193, 68, 0.4)", borderRadius: "8px", padding: "6px 16px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "700" }}>
                          📷 Select Image File
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 900, 600, 0.8);
                                  setForm(prev => ({ ...prev, image: compressed }));
                                } catch (err) {
                                  alert("Failed to process image: " + err.message);
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Create Tournament"}
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Manage Tournaments */}
          {activeTab === "tournaments-list" && (
            <div className="table-card">
              <h2>All Tournaments</h2>
              {tournaments.length === 0 ? (
                <p className="empty-message">No tournaments found. Go ahead and add one!</p>
              ) : (
                <>
                  <div className="admin-table-container tournaments-desktop-table">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Tournament</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Location</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournaments.map((t) => (
                          <tr key={t._id}>
                            <td className="strong">{t.title}</td>
                            <td>{t.type}</td>
                            <td>
                              <span className={`status-badge ${t.status.toLowerCase()}`}>
                                {t.status}
                              </span>
                            </td>
                            <td>{t.startDate}</td>
                            <td>{t.time}</td>
                            <td>{t.location}</td>
                            <td>
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <a
                                  href={`/tournamentdetails?id=${t._id}`}
                                  className="action-btn"
                                  style={{
                                    background: "rgba(243, 193, 68, 0.15)",
                                    color: "#f3c144",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    textDecoration: "none",
                                    fontSize: "0.8rem",
                                    fontWeight: "700",
                                    border: "1px solid rgba(243, 193, 68, 0.3)"
                                  }}
                                >
                                  View & Edit Matches ➔
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setPhotoModal({
                                    isOpen: true,
                                    tournamentId: t._id,
                                    tournamentTitle: t.title,
                                    previewUrl: t.image || "",
                                    isSaving: false
                                  })}
                                  style={{
                                    background: t.image ? "rgba(46, 204, 113, 0.15)" : "rgba(255, 255, 255, 0.08)",
                                    color: t.image ? "#2ecc71" : "#e5e5e5",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    border: t.image ? "1px solid rgba(46, 204, 113, 0.35)" : "1px solid rgba(255, 255, 255, 0.15)",
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: "700"
                                  }}
                                >
                                  📷 {t.image ? "Photo ✓" : "+ Photo"}
                                </button>
                                <button
                                  className="delete-btn"
                                  onClick={() => handleDeleteTournament(t._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Tournaments Cards View */}
                  <div className="tournaments-mobile-cards">
                    {tournaments.map((t) => (
                      <div key={t._id} className="mobile-tournament-card" style={{ padding: "16px" }}>
                        <div className="mobile-card-header">
                          <h3 className="mobile-card-title">{t.title}</h3>
                          <span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#bab19c", margin: "8px 0" }}>
                          <div>Format: <strong style={{ color: "#f3c144" }}>{t.type}</strong></div>
                          <div>Date: {t.startDate} ({t.time})</div>
                          <div>Location: {t.location}</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                          <a
                            href={`/tournamentdetails?id=${t._id}`}
                            className="mobile-full-btn"
                            style={{
                              background: "rgba(243, 193, 68, 0.15)",
                              color: "#f3c144",
                              textDecoration: "none",
                              textAlign: "center",
                              border: "1px solid rgba(243, 193, 68, 0.3)",
                              fontWeight: "bold",
                              padding: "8px",
                              flex: 1
                            }}
                          >
                            View Matches ➔
                          </a>
                          <button
                            type="button"
                            onClick={() => setPhotoModal({
                              isOpen: true,
                              tournamentId: t._id,
                              tournamentTitle: t.title,
                              previewUrl: t.image || "",
                              isSaving: false
                            })}
                            style={{
                              background: t.image ? "rgba(46, 204, 113, 0.15)" : "rgba(255, 255, 255, 0.08)",
                              color: t.image ? "#2ecc71" : "#e5e5e5",
                              border: t.image ? "1px solid rgba(46, 204, 113, 0.35)" : "1px solid rgba(255, 255, 255, 0.15)",
                              borderRadius: "6px",
                              padding: "8px 12px",
                              fontWeight: "700",
                              fontSize: "0.82rem",
                              cursor: "pointer"
                            }}
                          >
                            📷 {t.image ? "Photo ✓" : "+ Photo"}
                          </button>
                          <button
                            className="delete-btn"
                            style={{ flexShrink: 0, padding: "8px 14px" }}
                            onClick={() => handleDeleteTournament(t._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tournament Photo Management Modal */}
                  {photoModal.isOpen && (
                    <div className="modal-overlay" onClick={() => setPhotoModal(prev => ({ ...prev, isOpen: false }))}>
                      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: "460px" }}>
                        <button className="close-btn" onClick={() => setPhotoModal(prev => ({ ...prev, isOpen: false }))}>✕</button>
                        <h3 style={{ color: "#fff", margin: "0 0 6px", fontSize: "1.2rem" }}>📷 Tournament Photo</h3>
                        <p style={{ color: "#bab19c", fontSize: "0.85rem", margin: "0 0 16px" }}>
                          Upload or update photo for <strong style={{ color: "#f3c144" }}>{photoModal.tournamentTitle}</strong>. This photo will be highlighted in Tournaments and the permanent History & Archives.
                        </p>

                        {photoModal.previewUrl ? (
                          <div style={{ textAlign: "center", marginBottom: "16px" }}>
                            <img
                              src={photoModal.previewUrl}
                              alt="Tournament Preview"
                              style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "10px", border: "1.5px solid #f3c144", marginBottom: "10px" }}
                            />
                            <div>
                              <button
                                type="button"
                                onClick={() => setPhotoModal(prev => ({ ...prev, previewUrl: "" }))}
                                style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700" }}
                              >
                                ✕ Remove Photo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ border: "2px dashed rgba(243, 193, 68, 0.35)", borderRadius: "10px", padding: "24px", textAlign: "center", background: "rgba(243, 193, 68, 0.04)", marginBottom: "16px" }}>
                            <p style={{ color: "#bab19c", margin: "0 0 10px", fontSize: "0.88rem" }}>
                              Select tournament banner, podium celebration, or champion photo
                            </p>
                            <label style={{ display: "inline-block", background: "linear-gradient(135deg, #f3c144, #d4a32a)", color: "#15120c", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontSize: "0.88rem", fontWeight: "800" }}>
                              Select Image File
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const compressed = await compressImage(file, 900, 600, 0.8);
                                      setPhotoModal(prev => ({ ...prev, previewUrl: compressed }));
                                    } catch (err) {
                                      alert("Failed to process image: " + err.message);
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setPhotoModal(prev => ({ ...prev, isOpen: false }))}
                            style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", color: "#ddd", border: "1px solid #444", cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveTournamentPhoto}
                            disabled={photoModal.isSaving}
                            style={{ padding: "8px 20px", borderRadius: "8px", background: "linear-gradient(135deg, #f3c144, #d4a32a)", color: "#15120c", fontWeight: "800", border: "none", cursor: "pointer" }}
                          >
                            {photoModal.isSaving ? "Saving..." : "💾 Save Photo"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab 3: Applications */}
          {activeTab === "applications" && (
            <div className="table-card">
              <h2>Received Member Applications</h2>
              {applications.length === 0 ? (
                <p className="empty-message">No applications submitted yet.</p>
              ) : (
                <>
                  <div className="admin-table-container tournaments-desktop-table">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Applicant</th>
                          <th>Email</th>
                          <th>ID</th>
                          <th>Major & Batch</th>
                          <th>Department</th>
                          <th>Applied Role</th>
                          <th>Status</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => (
                          <tr key={app._id}>
                            <td className="strong">{app.name}</td>
                            <td>{app.email}</td>
                            <td>{app.idNumber}</td>
                            <td>{app.major} (Batch {app.batch})</td>
                            <td>{app.department}</td>
                            <td className="strong">{app.roleTitle}</td>
                            <td>
                              <span className={`status-badge ${(app.status || 'Pending').toLowerCase()}`}>
                                {app.status || 'Pending'}
                              </span>
                            </td>
                            <td>
                              <button className="view-btn" onClick={() => {
                                setSelectedApp(app);
                                setModalOpen(true);
                              }}>
                                View Answers
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Applications Cards View */}
                  <div className="tournaments-mobile-cards">
                    {applications.map((app) => (
                      <div key={app._id} className="mobile-tournament-card" style={{ padding: "16px" }}>
                        <div className="mobile-card-header">
                          <h3 className="mobile-card-title">{app.name}</h3>
                          <span className={`status-badge ${(app.status || 'Pending').toLowerCase()}`}>{app.status || 'Pending'}</span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#bab19c", margin: "8px 0", lineHeight: "1.5" }}>
                          <div>Role: <strong style={{ color: "#f3c144" }}>{app.roleTitle}</strong> ({app.department})</div>
                          <div>Email: {app.email}</div>
                          <div>Major: {app.major} (Batch {app.batch})</div>
                        </div>
                        <button 
                          className="view-btn mobile-full-btn" 
                          style={{ marginTop: "8px" }}
                          onClick={() => {
                            setSelectedApp(app);
                            setModalOpen(true);
                          }}
                        >
                          View Full Application ➔
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 4: Manage Users */}
          {activeTab === "manage-users" && (
            <div className="table-card">
              <h2>All Registered Users</h2>
              {users.length === 0 ? (
                <p className="empty-message">No users found.</p>
              ) : (
                <>
                  <div className="admin-table-container tournaments-desktop-table">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>ID Number</th>
                          <th>Major</th>
                          <th>Role</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u._id}>
                            <td className="strong">{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.idNumber || "N/A"}</td>
                            <td>{u.major || "N/A"}</td>
                            <td>
                              <span className={`status-badge ${u.role === 'admin' ? 'approved' : 'pending'}`}>
                                {u.role.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              {u.role !== 'admin' ? (
                                <button
                                  className="delete-btn"
                                  onClick={() => handleDeleteUser(u._id)}
                                >
                                  Delete
                                </button>
                              ) : (
                                <span style={{color: "#888", fontStyle: "italic"}}>Admin</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Users Cards View */}
                  <div className="tournaments-mobile-cards">
                    {users.map((u) => (
                      <div key={u._id} className="mobile-tournament-card" style={{ padding: "16px" }}>
                        <div className="mobile-card-header">
                          <h3 className="mobile-card-title">{u.name}</h3>
                          <span className={`status-badge ${u.role === 'admin' ? 'approved' : 'pending'}`}>{u.role.toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#bab19c", margin: "6px 0" }}>
                          <div>Email: {u.email}</div>
                          <div>Major: {u.major || "N/A"} | ID: {u.idNumber || "N/A"}</div>
                        </div>
                        {u.role !== 'admin' && (
                          <button
                            className="delete-btn mobile-full-btn"
                            style={{ marginTop: "8px" }}
                            onClick={() => handleDeleteUser(u._id)}
                          >
                            Delete User Account
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 5: Manage Puzzles */}
          {activeTab === "manage-puzzles" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* Card 1: Existing Puzzle Challenges List */}
              <div className="table-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <h2>Active & Upcoming Puzzle Challenges ({puzzleTournaments.length})</h2>
                    <p style={{ color: "#caba91", margin: "4px 0 0" }}>
                      View, edit dates/times, add or delete puzzles, or remove entire puzzle arenas.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="view-btn"
                    style={{ background: "#f3c144", color: "#181611", fontWeight: "bold" }}
                    onClick={handleResetPuzzleForm}
                  >
                    ➕ Create New Challenge
                  </button>
                </div>

                {puzzleTournaments.length === 0 ? (
                  <p style={{ color: "#888", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                    No puzzle challenge tournaments found. Use the form below to create one!
                  </p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <table className="admin-table tournaments-desktop-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Beginning</th>
                          <th>Ending</th>
                          <th>Time Limit</th>
                          <th>Puzzles</th>
                          <th>Players</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {puzzleTournaments.map((t) => (
                          <tr key={t._id} style={editingPuzzleTournamentId === t._id ? { background: "rgba(243, 193, 68, 0.12)" } : {}}>
                            <td>
                              <strong>{t.title}</strong>
                              {editingPuzzleTournamentId === t._id && (
                                <span style={{ marginLeft: "8px", fontSize: "0.75rem", background: "#f3c144", color: "#111", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                  EDITING
                                </span>
                              )}
                            </td>
                            <td>{t.startDate} {t.startTime ? `at ${t.startTime}` : ""}</td>
                            <td>{t.endDate ? `${t.endDate} ${t.endTime ? `at ${t.endTime}` : ""}` : "Ongoing"}</td>
                            <td>{t.timeLimit || 60}s / puzzle</td>
                            <td><span className="player-count-badge">{t.puzzles ? t.puzzles.length : 0} 🧩</span></td>
                            <td>
                              <strong>{t.participants ? t.participants.length : 0} registered</strong>
                              {t.participants && t.participants.length > 0 && (
                                <div className="admin-puzzle-participants">
                                  {t.participants.map((participant) => (
                                    <div className="admin-puzzle-participant" key={participant.email}>
                                      <span title={participant.email}>{participant.name}</span>
                                      <button
                                        type="button"
                                        className="admin-remove-participant-btn"
                                        onClick={() => handleRemovePuzzleParticipant(t, participant)}
                                        title={`Remove ${participant.name}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {t.leaderboard && t.leaderboard.length > 0 && (
                                <div className="admin-puzzle-participants admin-puzzle-results">
                                  <span className="admin-puzzle-list-label">{t.leaderboard.length} completed</span>
                                  {t.leaderboard.map((entry) => (
                                    <div className="admin-puzzle-participant" key={`score-${entry.email}`}>
                                      <span title={entry.email}>{entry.name} · {entry.score} pts</span>
                                      <button
                                        type="button"
                                        className="admin-remove-participant-btn"
                                        onClick={() => handleRemovePuzzleParticipant(t, entry)}
                                        title={`Remove ${entry.name} from this tournament`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  className="view-btn"
                                  style={{ padding: "6px 12px" }}
                                  onClick={() => handleEditPuzzleTournament(t)}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="delete-btn"
                                  style={{ padding: "6px 12px" }}
                                  onClick={() => handleDeletePuzzleTournament(t._id, t.title)}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Mobile Cards View */}
                    <div className="tournaments-mobile-cards">
                      {puzzleTournaments.map((t) => (
                        <div 
                          key={t._id} 
                          className="mobile-tournament-card"
                          style={editingPuzzleTournamentId === t._id ? { borderColor: "#f3c144", background: "rgba(243, 193, 68, 0.08)" } : {}}
                        >
                          <div className="mobile-card-header">
                            <h3 className="mobile-card-title">{t.title}</h3>
                            <span className="player-count-badge">{t.puzzles ? t.puzzles.length : 0} Puzzles</span>
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#caba91", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div>📅 <strong>Beginning:</strong> {t.startDate} {t.startTime && `(${t.startTime})`}</div>
                            <div>🏁 <strong>Ending:</strong> {t.endDate ? `${t.endDate} ${t.endTime ? `(${t.endTime})` : ''}` : "Ongoing"}</div>
                            <div>⏱️ <strong>Time Limit:</strong> {t.timeLimit || 60}s per puzzle</div>
                            <div>👥 <strong>Participants:</strong> {t.participants ? t.participants.length : 0} registered</div>
                            {t.participants && t.participants.length > 0 && (
                              <div className="admin-puzzle-participants mobile-participant-list">
                                {t.participants.map((participant) => (
                                  <div className="admin-puzzle-participant" key={participant.email}>
                                    <span title={participant.email}>{participant.name}</span>
                                    <button
                                      type="button"
                                      className="admin-remove-participant-btn"
                                      onClick={() => handleRemovePuzzleParticipant(t, participant)}
                                      title={`Remove ${participant.name}`}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {t.leaderboard && t.leaderboard.length > 0 && (
                              <div className="admin-puzzle-participants mobile-participant-list admin-puzzle-results">
                                <span className="admin-puzzle-list-label">{t.leaderboard.length} completed</span>
                                {t.leaderboard.map((entry) => (
                                  <div className="admin-puzzle-participant" key={`score-${entry.email}`}>
                                    <span title={entry.email}>{entry.name} · {entry.score} pts</span>
                                    <button
                                      type="button"
                                      className="admin-remove-participant-btn"
                                      onClick={() => handleRemovePuzzleParticipant(t, entry)}
                                      title={`Remove ${entry.name} from this tournament`}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <button
                              className="view-btn mobile-full-btn"
                              onClick={() => handleEditPuzzleTournament(t)}
                            >
                              ✏️ Edit Tournament & Puzzles
                            </button>
                            <button
                              className="delete-btn mobile-full-btn"
                              onClick={() => handleDeletePuzzleTournament(t._id, t.title)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Card 2: Create / Edit Form */}
              <div className="table-card" id="puzzle-form-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h2>{editingPuzzleTournamentId ? "✏️ Edit Puzzle Challenge Arena" : "➕ Create Puzzle Challenge Tournament"}</h2>
                    <p style={{ color: "#caba91", margin: "4px 0 0" }}>
                      {editingPuzzleTournamentId 
                        ? "Modify tournament dates, beginning & ending times, time limits, or add/delete puzzles." 
                        : "Set up board positions visually, record the solution moves, and define tournament beginning & ending dates and times."}
                    </p>
                  </div>
                  {editingPuzzleTournamentId && (
                    <button
                      type="button"
                      className="tab-btn"
                      style={{ borderColor: "#e74c3c", color: "#e74c3c" }}
                      onClick={handleResetPuzzleForm}
                    >
                      ❌ Cancel Edit (Create New)
                    </button>
                  )}
                </div>

                <form onSubmit={handleSavePuzzleTournament} className="admin-form" style={{ marginTop: "24px" }}>
                  <div className="form-group">
                    <label>Tournament Title *</label>
                    <input
                      type="text"
                      value={puzzleTitle}
                      onChange={(e) => setPuzzleTitle(e.target.value)}
                      placeholder="e.g. Weekly Tactics Arena - Grandmaster Mate in 2"
                      required
                    />
                  </div>

                  {/* Beginning & Ending Date and Time Row */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Beginning Date (Start Date) *</label>
                      <input
                        type="date"
                        value={puzzleStartDate}
                        onChange={(e) => setPuzzleStartDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Beginning Time (Start Time)</label>
                      <input
                        type="time"
                        value={puzzleStartTime}
                        onChange={(e) => setPuzzleStartTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Ending Date (End Date)</label>
                      <input
                        type="date"
                        value={puzzleEndDate}
                        onChange={(e) => setPuzzleEndDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Ending Time (End Time)</label>
                      <input
                        type="time"
                        value={puzzleEndTime}
                        onChange={(e) => setPuzzleEndTime(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Time Limit per Puzzle (Seconds) *</label>
                      <input
                        type="number"
                        value={puzzleTimeLimit}
                        onChange={(e) => setPuzzleTimeLimit(parseInt(e.target.value) || 60)}
                        min="5"
                        required
                      />
                    </div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid #393428", margin: "25px 0" }} />

                  {/* Puzzles in this Tournament */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3>Puzzles in this Challenge ({puzzlesList.length})</h3>
                    {puzzlesList.length > 0 && (
                      <span style={{ fontSize: "0.85rem", color: "#2ecc71" }}>
                        ✓ {puzzlesList.length} puzzle{puzzlesList.length > 1 ? "s" : ""} included
                      </span>
                    )}
                  </div>

                  {puzzlesList.length === 0 ? (
                    <p style={{ color: "#e74c3c", background: "rgba(231, 76, 60, 0.1)", padding: "12px 16px", borderRadius: "8px", fontStyle: "italic", margin: "0 0 20px 0" }}>
                      ⚠️ No puzzles added to this tournament yet! Use the interactive chessboard below to record and add at least one puzzle.
                    </p>
                  ) : (
                    <div className="puzzle-list-manager" style={{ marginBottom: "25px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {puzzlesList.map((p, index) => (
                        <div key={index} className="puzzle-item-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#17140f", border: "1px solid rgba(243, 193, 68, 0.2)", borderRadius: "10px", padding: "12px 16px" }}>
                          <div className="puzzle-item-info" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span className="puzzle-item-title" style={{ color: "#fff", fontWeight: "bold" }}>
                              Puzzle #{index + 1} - Mate in {p.mateIn}
                            </span>
                            <span className="puzzle-item-desc" style={{ color: "#caba91", fontSize: "0.85rem" }}>
                              {p.description || "Solve the tactic"}
                            </span>
                            <span style={{ fontSize: "0.78rem", fontFamily: "monospace", color: "#f3c144" }}>
                              Moves: {Array.isArray(p.correctMoves) ? p.correctMoves.join(" ➔ ") : p.correctMoves}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              className="view-btn"
                              style={{ cursor: "pointer", padding: "8px 14px", minWidth: "auto", borderRadius: "8px" }}
                              onClick={() => handleEditPuzzleInList(index)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              style={{ cursor: "pointer", padding: "8px 14px", minWidth: "auto", borderRadius: "8px" }}
                              onClick={() => setPuzzlesList(puzzlesList.filter((_, i) => i !== index))}
                            >
                              🗑️ Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interactive Position Setup & Move Recorder */}
                  <div className="puzzle-editor-card">
                    <h3 style={{ margin: "0 0 14px 0", color: "#f3c144" }}>
                      ♟️ Add a New Puzzle to this Tournament
                    </h3>

                    <div className="puzzle-dashboard-grid">
                      {/* Left Column: Interactive Chess Board & Setup Bar */}
                      <div className="puzzle-board-container">
                        <h4>{setupMode ? "⚙️ Step 1: Set Board Position" : "🔴 Step 2: Record Solution Moves"}</h4>
                        <p style={{ fontSize: "0.82rem", color: "#caba91", margin: "0 0 12px 0", textAlign: "center" }}>
                          {setupMode 
                            ? "Drag pieces freely on the board, or select a piece/eraser from the palette below and click squares."
                            : "Drag and drop pieces to make legal moves. Moves are recorded as the solution sequence."}
                        </p>

                        {/* Quick Board Tools Bar */}
                        {setupMode && (
                          <div className="quick-board-tools">
                            <button
                              type="button"
                              className="tab-btn"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#211d17" }}
                              onClick={handleResetStartBoard}
                            >
                              🔄 Standard Start
                            </button>
                            <button
                              type="button"
                              className="tab-btn"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#211d17", borderColor: "#e74c3c", color: "#e74c3c" }}
                              onClick={handleClearBoard}
                            >
                              🧹 Clear Board
                            </button>
                            <button
                              type="button"
                              className="tab-btn"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#211d17" }}
                              onClick={() => setBoardOrientation(prev => prev === "white" ? "black" : "white")}
                            >
                              🔄 Flip ({boardOrientation === "white" ? "White" : "Black"})
                            </button>
                            <button
                              type="button"
                              className="tab-btn"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#211d17" }}
                              onClick={handleCopyFen}
                            >
                              📋 Copy FEN
                            </button>
                          </div>
                        )}
                        
                        <div className="puzzle-board-wrapper" ref={boardWrapperRef}>
                          <Chessboard
                            position={activePuzzleFen}
                            onSquareClick={handleSquareClick}
                            onPieceDrop={handlePieceDrop}
                            onPieceDragBegin={onPieceDragBegin}
                            onPieceDragEnd={onPieceDragEnd}
                            customSquareStyles={optionSquares}
                            boardWidth={boardWidth}
                            boardOrientation={boardOrientation}
                            arePiecesDraggable={true}
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

                        {setupMode && (
                          <>
                            {/* Palette selection indicator */}
                            <div style={{ textAlign: "center", margin: "10px 0 6px", fontSize: "0.82rem", color: "#f3c144", fontWeight: "bold" }}>
                              {selectedPiece === "clear"
                                ? "Selected Action: ❌ Eraser (Click squares/pieces to remove)"
                                : selectedPiece
                                ? `Selected Piece: ${selectedPiece.color === 'w' ? 'White' : 'Black'} ${selectedPiece.type.toUpperCase()} (Click square to place)`
                                : "💡 Active Mode: Click/Drag pieces directly or select from palette below"}
                            </div>

                            <div className="piece-palette">
                              {[
                                { symbol: "❌", label: "Eraser", name: "Eraser (Clear Square)", value: "clear" },
                                { symbol: "♙", label: "Pawn", name: "White Pawn", value: { type: "p", color: "w" } },
                                { symbol: "♘", label: "Knight", name: "White Knight", value: { type: "n", color: "w" } },
                                { symbol: "♗", label: "Bishop", name: "White Bishop", value: { type: "b", color: "w" } },
                                { symbol: "♖", label: "Rook", name: "White Rook", value: { type: "r", color: "w" } },
                                { symbol: "♕", label: "Queen", name: "White Queen", value: { type: "q", color: "w" } },
                                { symbol: "♔", label: "King", name: "White King", value: { type: "k", color: "w" } },
                                { symbol: "♟", label: "Pawn", name: "Black Pawn", value: { type: "p", color: "b" } },
                                { symbol: "♞", label: "Knight", name: "Black Knight", value: { type: "n", color: "b" } },
                                { symbol: "♝", label: "Bishop", name: "Black Bishop", value: { type: "b", color: "b" } },
                                { symbol: "♜", label: "Rook", name: "Black Rook", value: { type: "r", color: "b" } },
                                { symbol: "♛", label: "Queen", name: "Black Queen", value: { type: "q", color: "b" } },
                                { symbol: "♚", label: "King", name: "Black King", value: { type: "k", color: "b" } },
                              ].map((piece, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`palette-btn ${selectedPiece === piece.value || (selectedPiece && piece.value && selectedPiece.type === piece.value.type && selectedPiece.color === piece.value.color) ? "active" : ""}`}
                                  onClick={() => setSelectedPiece(piece.value)}
                                  title={piece.name}
                                >
                                  <span className="palette-symbol">{piece.symbol}</span>
                                  <span className="palette-text">{piece.label}</span>
                                </button>
                              ))}
                            </div>

                            {/* FEN Paste / Load Field */}
                            <div className="fen-import-card">
                              <label style={{ fontSize: "0.8rem", color: "#caba91", display: "block", marginBottom: "6px" }}>
                                📋 Paste FEN Position String (e.g. from Lichess / Chess.com):
                              </label>
                              <div className="fen-input-row">
                                <input
                                  type="text"
                                  value={customFenInput}
                                  onChange={(e) => setCustomFenInput(e.target.value)}
                                  placeholder="Paste FEN string here..."
                                  style={{ flex: 1, padding: "6px 10px", fontSize: "0.85rem", background: "#110e0a", color: "#fff", border: "1px solid rgba(243, 193, 68, 0.3)", borderRadius: "6px" }}
                                />
                                <button
                                  type="button"
                                  className="tab-btn"
                                  style={{ padding: "6px 14px", fontSize: "0.85rem", background: "#f3c144", color: "#111", fontWeight: "bold" }}
                                  onClick={() => handleLoadCustomFen()}
                                >
                                  Load Position
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Right Column: Active Setup Controls */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        <div className="form-group">
                          <label>Turn to Move (Who Starts the Puzzle?)</label>
                          <button
                            type="button"
                            className="tab-btn"
                            style={{ width: "100%", textTransform: "uppercase", fontWeight: "bold" }}
                            onClick={handleToggleTurn}
                            disabled={!setupMode}
                          >
                            {activePuzzleFen.split(" ")[1] === "w" ? "⚪ White to Move" : "⚫ Black to Move"}
                          </button>
                        </div>

                        <div className="form-group">
                          <label>Mate In *</label>
                          <select
                            value={activePuzzleMateIn}
                            onChange={(e) => setActivePuzzleMateIn(parseInt(e.target.value) || 1)}
                            disabled={!setupMode}
                          >
                            <option value="1">Mate in 1</option>
                            <option value="2">Mate in 2</option>
                            <option value="3">Mate in 3</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Puzzle Description / Hint</label>
                          <input
                            type="text"
                            value={activePuzzleDesc}
                            onChange={(e) => setActivePuzzleDesc(e.target.value)}
                            placeholder="e.g. Find the killer bishop sacrifice on h7..."
                            disabled={!setupMode}
                          />
                        </div>

                        <div className="form-group" style={{ marginTop: "10px" }}>
                          {setupMode ? (
                            <button
                              type="button"
                              className="tab-btn"
                              style={{ width: "100%", background: "#e67e22", color: "white", borderColor: "#e67e22", padding: "12px", fontSize: "0.95rem" }}
                              onClick={handleStartRecording}
                            >
                              🔴 Start Recording Solution Moves
                            </button>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              <div style={{ background: "#211d17", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(243, 193, 68, 0.3)" }}>
                                <span style={{ fontSize: "0.85rem", color: "#caba91", display: "block" }}>
                                  Recorded Solution Moves:
                                </span>
                                <strong style={{ color: "#f3c144", fontSize: "0.95rem" }}>
                                  {activePuzzleMoves.length > 0 ? activePuzzleMoves.join(" ➔ ") : "Make moves on the board above"}
                                </strong>
                              </div>
                              <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                  type="button"
                                  className="tab-btn"
                                  style={{ flex: 1, borderColor: "#e74c3c", color: "#e74c3c" }}
                                  onClick={handleUndoMove}
                                >
                                  ↩️ Undo Move
                                </button>
                                <button
                                  type="button"
                                  className="tab-btn"
                                  style={{ flex: 1, borderColor: "#95a5a6", color: "#95a5a6" }}
                                  onClick={() => {
                                    const resetChess = new Chess(initialPuzzleFen);
                                    setChessInstance(resetChess);
                                    setActivePuzzleFen(initialPuzzleFen);
                                    setSetupMode(true);
                                    setActivePuzzleMoves([]);
                                  }}
                                >
                                  ✏️ Back to Setup
                                </button>
                              </div>
                              <button
                                type="button"
                                className="tab-btn"
                                style={{ width: "100%", background: "#2ecc71", color: "white", borderColor: "#2ecc71", padding: "12px", fontSize: "0.95rem", fontWeight: "bold" }}
                                onClick={handleAddPuzzle}
                              >
                                ✅ Add Puzzle to Tournament List
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="signup-btn"
                    style={{ width: "100%", marginTop: "10px", height: "50px", fontSize: "1.1rem", fontWeight: "bold" }}
                  >
                    {editingPuzzleTournamentId ? "💾 Save & Update Puzzle Challenge" : "🚀 Publish Puzzle Tournament"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 5: Inquiries & Dispatches */}
          {activeTab === "inquiries" && (
            <div className="table-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2>📬 Contact Inquiries & Dispatches ({inquiries.length})</h2>
                  <p style={{ color: "#caba91", margin: "4px 0 0", fontSize: "0.88rem" }}>
                    Messages submitted by students and visitors via the Contact Us page.
                  </p>
                </div>
                <button
                  type="button"
                  className="tab-btn"
                  onClick={fetchData}
                  style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                >
                  🔄 Refresh
                </button>
              </div>

              {inquiries.length === 0 ? (
                <p className="empty-message">No messages received yet. All inquiries from Contact Us will appear here.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {inquiries.map((inq) => (
                    <div
                      key={inq._id}
                      style={{
                        background: inq.read ? "rgba(255, 255, 255, 0.02)" : "rgba(243, 193, 68, 0.06)",
                        border: inq.read ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(243, 193, 68, 0.35)",
                        borderRadius: "12px",
                        padding: "16px 20px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "1rem", color: "#f5edd6" }}>{inq.name}</strong>
                            <span style={{ fontSize: "0.82rem", color: "#f3c144", background: "rgba(243, 193, 68, 0.15)", padding: "2px 8px", borderRadius: "12px" }}>
                              {inq.category}
                            </span>
                            {!inq.read && (
                              <span style={{ fontSize: "0.72rem", color: "#111", background: "#f3c144", fontWeight: "bold", padding: "2px 6px", borderRadius: "6px" }}>
                                NEW
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "#aaa", marginTop: "4px" }}>
                            ✉️ <a href={`mailto:${inq.email}`} style={{ color: "#f3c144", textDecoration: "none" }}>{inq.email}</a>
                            <span style={{ margin: "0 8px" }}>•</span>
                            <span>📅 {new Date(inq.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await safeFetchJson(`${API_BASE}/api/contact/${inq._id}/read`, { method: "PUT" });
                                setInquiries(prev => prev.map(m => m._id === inq._id ? { ...m, read: !m.read } : m));
                              } catch (e) {
                                alert("Failed to toggle read status: " + e.message);
                              }
                            }}
                            className="view-btn"
                            style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                          >
                            {inq.read ? "Mark Unread" : "Mark Read"}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Delete message from ${inq.name}?`)) return;
                              try {
                                await safeFetchJson(`${API_BASE}/api/contact/${inq._id}`, { method: "DELETE" });
                                setInquiries(prev => prev.filter(m => m._id !== inq._id));
                              } catch (e) {
                                alert("Failed to delete message: " + e.message);
                              }
                            }}
                            className="delete-btn"
                            style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      {inq.subject && (
                        <div style={{ marginTop: "10px", fontWeight: "600", fontSize: "0.9rem", color: "#f3c144" }}>
                          Subject: {inq.subject}
                        </div>
                      )}

                      <div style={{ marginTop: "8px", background: "rgba(0, 0, 0, 0.25)", padding: "12px", borderRadius: "8px", fontSize: "0.88rem", color: "#e0d8c3", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {inq.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal for Applicant Details */}
        {modalOpen && selectedApp && (
          <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal-btn" onClick={() => setModalOpen(false)}>
                &times;
              </button>
              <h3>Application Details: {selectedApp.name}</h3>
              <hr className="modal-divider" />
              <div className="modal-info-grid">
                <div><strong>Email:</strong> {selectedApp.email}</div>
                <div><strong>Phone:</strong> {selectedApp.phone}</div>
                <div><strong>ID:</strong> {selectedApp.idNumber}</div>
                <div><strong>Academic Path:</strong> {selectedApp.major} (Batch {selectedApp.batch})</div>
                <div><strong>Department:</strong> {selectedApp.department}</div>
                <div><strong>Position:</strong> {selectedApp.roleTitle}</div>
              </div>
              <hr className="modal-divider" />
              <h4>Role-Specific Answers</h4>
              <PrettyRoleData data={selectedApp.roleSpecificData} />
              
              {selectedApp.status === "Pending" && (
                <div className="modal-action-buttons" style={{ display: "flex", gap: "10px", marginTop: "25px", justifyContent: "flex-end" }}>
                  <button 
                    onClick={() => handleUpdateStatus(selectedApp._id, "Accepted")}
                    className="view-btn" 
                    style={{ cursor: "pointer" }}
                  >
                    Accept Application
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedApp._id, "Rejected")}
                    className="delete-btn" 
                    style={{ cursor: "pointer" }}
                  >
                    Reject Application
                  </button>
                </div>
              )}
              {selectedApp.status && selectedApp.status !== "Pending" && (
                <div style={{ marginTop: "25px", textAlign: "right", color: selectedApp.status === "Accepted" ? "#2ecc71" : "#e74c3c", fontWeight: "bold" }}>
                  Application Status: {selectedApp.status}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
