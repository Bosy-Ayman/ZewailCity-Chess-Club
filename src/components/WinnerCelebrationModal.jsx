import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Confetti from "react-confetti";
import { X } from "lucide-react";
import { chessAudio } from "../utils/chessAudio";
import { getPlayerAvatarUrl } from "../utils/api";
import "./WinnerCelebrationModal.css";

/**
 * Universal Champion / Winner Celebration Modal
 * Supports:
 *  - Knockout Championship (1st, 2nd, 3rd / Semifinalist)
 *  - Swiss Tournament (1st, 2nd, 3rd Standings & Points)
 *  - Puzzle Challenge / Tactics Arena (1st, 2nd, 3rd Solved Count & Scores)
 */
export default function WinnerCelebrationModal({
  isOpen,
  onClose,
  tournamentTitle = "ZC Championship",
  tournamentType = "Knockout", // 'Knockout' | 'Swiss' | 'Puzzle' | 'Championship'
  winner = null,      // { name, points, score, solvedCount, avatar, rating, matchScore, subtitle }
  runnerUp = null,    // { name, points, score, solvedCount, avatar, rating }
  thirdPlace = null,  // { name, points, score, solvedCount, avatar, rating }
  customAvatars = {},
  onMarkCompleted = null,
  onViewBracketOrStandings = null,
  isStaff = false,
  isCompletedStatus = false,
  tournamentId = null
}) {
  const navigate = useNavigate();

  // Play fanfare / victory sound on open
  useEffect(() => {
    if (isOpen) {
      chessAudio.playVictory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const windowW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const windowH = typeof window !== "undefined" ? window.innerHeight : 900;

  const formatKey = (tournamentType || "").toLowerCase();
  const isPuzzle = formatKey.includes("puzzle") || formatKey.includes("tactic");
  const isKnockout = formatKey.includes("knockout") || formatKey.includes("elimination");
  const isSwiss = formatKey.includes("swiss");

  const badgeIcon = isPuzzle ? "🧩" : isKnockout ? "⚔️" : "👑";
  const badgeText = isPuzzle
    ? "PUZZLE TACTICS ARENA"
    : isKnockout
    ? "KNOCKOUT CHAMPIONSHIP"
    : isSwiss
    ? "FIDE SWISS TOURNAMENT"
    : "CHESS CHAMPIONSHIP";

  const getAvatar = (player) => {
    if (!player) return "/Icons/unknown.png";
    if (player.avatar) return player.avatar;
    if (player.name && customAvatars[player.name]) return customAvatars[player.name];
    if (player.email && customAvatars[player.email]) return customAvatars[player.email];
    return getPlayerAvatarUrl(player.name, customAvatars);
  };

  const getScoreDisplay = (player, fallback) => {
    if (!player) return fallback;
    if (isPuzzle) {
      if (player.score != null) {
        return `${player.score} pts${player.solvedCount != null ? ` (${player.solvedCount} solved)` : ""}`;
      }
      return `${player.solvedCount || 0} puzzles solved`;
    }
    if (player.points != null) {
      return typeof player.points === "number" ? `${player.points} pts` : `${player.points}`;
    }
    if (player.matchScore) {
      return `Score: ${player.matchScore}`;
    }
    return fallback;
  };

  const handleProfileClick = (playerName) => {
    if (!playerName || playerName === "BYE" || playerName === "TBD") return;
    onClose();
    navigate(`/profile?name=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="winner-celebration-overlay" onClick={onClose}>
      <Confetti
        width={windowW}
        height={windowH}
        recycle={false}
        numberOfPieces={600}
        gravity={0.15}
        colors={["#f3c144", "#ffd700", "#ffffff", "#e056fd", "#68d391", "#48bb78", "#ff7675"]}
      />

      <div
        className="winner-celebration-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close celebration modal"
        >
          <X size={18} />
        </button>

        {/* Format Badge */}
        <div className="winner-celebration-badge">
          <span className="badge-sparkle">✨</span>
          <span>{badgeIcon} {badgeText}</span>
          <span className="badge-sparkle">✨</span>
        </div>

        {/* Title & Subtitle */}
        <h2 className="winner-celebration-title">
          🏆 Champion Crowned! 🏆
        </h2>
        <p className="winner-celebration-tournament-name">
          {tournamentTitle}
        </p>
        <p className="winner-celebration-subtitle">
          {isPuzzle
            ? "Tactical mastery at its finest! Congratulations to our top puzzle solvers."
            : isKnockout
            ? "Through every high-stakes knockout round, the ultimate champion emerges victorious!"
            : "After rigorous Swiss rounds and decisive battles, here are the podium champions!"}
        </p>

        {/* Podium Layout */}
        <div className="winner-podium-wrapper">
          {/* 2nd Place (Silver) */}
          {runnerUp && runnerUp.name && runnerUp.name !== "BYE" && (
            <div className="podium-col podium-silver">
              <div className="podium-avatar-box">
                <img
                  src={getAvatar(runnerUp)}
                  alt={runnerUp.name}
                  className="podium-avatar avatar-silver"
                  onError={(e) => { e.currentTarget.src = "/Icons/unknown.png"; }}
                />
                <span className="podium-medal medal-silver">🥈</span>
              </div>
              <div className="podium-pedestal pedestal-silver">
                <span className="podium-rank-tag">RUNNER-UP</span>
                <h4 className="podium-name" title={runnerUp.name}>
                  {runnerUp.name}
                </h4>
                <p className="podium-score">
                  {getScoreDisplay(runnerUp, "2nd Place")}
                </p>
                <button
                  type="button"
                  className="podium-profile-link"
                  onClick={() => handleProfileClick(runnerUp.name)}
                >
                  View Profile ↗
                </button>
              </div>
            </div>
          )}

          {/* 1st Place (Gold Champion) */}
          {winner && winner.name && (
            <div className="podium-col podium-gold">
              <div className="podium-avatar-box gold-box">
                <div className="winner-champion-crown">
                  <svg
                    className="winner-crown-svg"
                    viewBox="0 0 64 48"
                    width="46"
                    height="36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="goldCrownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fff2a8" />
                        <stop offset="35%" stopColor="#f3c144" />
                        <stop offset="75%" stopColor="#c99522" />
                        <stop offset="100%" stopColor="#ffd875" />
                      </linearGradient>
                      <filter id="crownDropGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#f3c144" floodOpacity="0.75" />
                      </filter>
                    </defs>
                    <path
                      d="M6 36L10 16L24 27L32 8L40 27L54 16L58 36H6Z"
                      fill="url(#goldCrownGrad)"
                      filter="url(#crownDropGlow)"
                      stroke="#7c5305"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="10" cy="15" r="2.8" fill="#ffffff" stroke="#7c5305" strokeWidth="1" />
                    <circle cx="32" cy="8" r="3.4" fill="#ffffff" stroke="#f3c144" strokeWidth="1.2" />
                    <circle cx="54" cy="15" r="2.8" fill="#ffffff" stroke="#7c5305" strokeWidth="1" />
                    <rect
                      x="7"
                      y="36"
                      width="50"
                      height="6"
                      rx="2"
                      fill="url(#goldCrownGrad)"
                      stroke="#7c5305"
                      strokeWidth="1.2"
                    />
                    <circle cx="19" cy="39" r="1.8" fill="#e74c3c" />
                    <circle cx="32" cy="39" r="2.2" fill="#3498db" />
                    <circle cx="45" cy="39" r="1.8" fill="#2ecc71" />
                  </svg>
                </div>
                <div className="gold-ring-glow"></div>
                <img
                  src={getAvatar(winner)}
                  alt={winner.name}
                  className="podium-avatar avatar-gold"
                  onError={(e) => { e.currentTarget.src = "/Icons/unknown.png"; }}
                />
                <span className="podium-medal medal-gold">🥇</span>
              </div>
              <div className="podium-pedestal pedestal-gold">
                <span className="champion-banner-pill">CHAMPION</span>
                <h3 className="podium-name gold-name" title={winner.name}>
                  {winner.name}
                </h3>
                <p className="podium-score gold-score">
                  {getScoreDisplay(winner, "Grand Champion")}
                </p>
                {winner.rating && (
                  <span className="podium-rating-badge">⚡ {winner.rating} Elo</span>
                )}
                <button
                  type="button"
                  className="podium-profile-link gold-link"
                  onClick={() => handleProfileClick(winner.name)}
                >
                  Congratulate Profile ↗
                </button>
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {thirdPlace && thirdPlace.name && thirdPlace.name !== "BYE" && (
            <div className="podium-col podium-bronze">
              <div className="podium-avatar-box">
                <img
                  src={getAvatar(thirdPlace)}
                  alt={thirdPlace.name}
                  className="podium-avatar avatar-bronze"
                  onError={(e) => { e.currentTarget.src = "/Icons/unknown.png"; }}
                />
                <span className="podium-medal medal-bronze">🥉</span>
              </div>
              <div className="podium-pedestal pedestal-bronze">
                <span className="podium-rank-tag">3RD PLACE</span>
                <h4 className="podium-name" title={thirdPlace.name}>
                  {thirdPlace.name}
                </h4>
                <p className="podium-score">
                  {getScoreDisplay(thirdPlace, "3rd Place")}
                </p>
                <button
                  type="button"
                  className="podium-profile-link"
                  onClick={() => handleProfileClick(thirdPlace.name)}
                >
                  View Profile ↗
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="winner-celebration-actions">
          {onViewBracketOrStandings && (
            <button
              type="button"
              className="action-btn secondary-btn"
              onClick={() => {
                onClose();
                onViewBracketOrStandings();
              }}
            >
              📊 View Tactical Standings & Honors
            </button>
          )}

          {isStaff && !isCompletedStatus && onMarkCompleted && (
            <button
              type="button"
              className="action-btn primary-gold-btn"
              onClick={() => {
                onClose();
                onMarkCompleted();
              }}
            >
              ✅ Finalize & Mark Completed
            </button>
          )}

          <button
            type="button"
            className="action-btn close-action-btn"
            onClick={onClose}
          >
            Close Celebration
          </button>
        </div>
      </div>
    </div>
  );
}
