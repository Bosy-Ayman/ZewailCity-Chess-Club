import React, { useState, useEffect } from "react";
import { getPlayerAvatarUrl } from "../utils/api";
import WinnerCelebrationModal from "./WinnerCelebrationModal";
import "./GlobalWinnerAlert.css";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

/**
 * Floating Global Winner Alert Toast / Banner
 * Appears when any new winner announcement arrives or is broadcasted.
 */
export default function GlobalWinnerAlert({ notifications = [], customAvatars = {} }) {
  const [activeAlert, setActiveAlert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [podiumDetails, setPodiumDetails] = useState({
    winner: null,
    runnerUp: null,
    thirdPlace: null,
    avatars: {}
  });
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("dismissed_winner_alerts") || "[]");
    } catch (e) {
      return [];
    }
  });

  // Find most recent un-dismissed winner notification (within last 3 days)
  useEffect(() => {
    if (!Array.isArray(notifications) || notifications.length === 0) return;

    const winnerNotif = notifications.find((n) => {
      if (!n || dismissedIds.includes(n._id)) return false;
      const isWinnerType = n.type === "winner" || (n.message && (n.message.includes("CHAMPION") || n.message.includes("won the") || n.message.includes("🏆")));
      if (!isWinnerType) return false;

      // Check if created within last 72h
      if (n.createdAt) {
        const diffHours = (Date.now() - new Date(n.createdAt).getTime()) / (1000 * 60 * 60);
        if (diffHours > 72) return false;
      }
      return true;
    });

    if (winnerNotif) {
      setActiveAlert(winnerNotif);
    } else {
      setActiveAlert(null);
    }
  }, [notifications, dismissedIds]);

  // Load full podium data (1st, 2nd, 3rd) whenever activeAlert is set
  useEffect(() => {
    if (!activeAlert) return;

    const winnerName = activeAlert.actorName || activeAlert.metadata?.winner?.name || activeAlert.message?.match(/CHAMPION CROWNED:\s*([^!]+?)\s*(?:has won|won)/i)?.[1] || "Tactician";
    const avatarUrl = activeAlert.actorAvatar || activeAlert.metadata?.winner?.avatar || customAvatars[winnerName] || getPlayerAvatarUrl(winnerName, customAvatars);

    let initialWinner = activeAlert.metadata?.winner || { name: winnerName, points: "Champion", avatar: avatarUrl };
    let initialRunnerUp = activeAlert.metadata?.runnerUp || null;
    let initialThird = activeAlert.metadata?.thirdPlace || null;

    setPodiumDetails({
      winner: initialWinner,
      runnerUp: initialRunnerUp,
      thirdPlace: initialThird,
      avatars: customAvatars
    });

    const tourneyIdMatch = activeAlert.link?.match(/[?&]id=([a-f0-9]+)/i) || activeAlert.link?.match(/\/tournaments\/([a-f0-9]+)/i);
    if (tourneyIdMatch && (!initialRunnerUp || !initialThird)) {
      fetch(`${API_BASE}/api/tournaments/${tourneyIdMatch[1]}`)
        .then(res => res.json())
        .then(tData => {
          const tourney = tData?.data || tData;
          if (tourney) {
            let p1 = tourney.podium?.[0] || (tourney.winner ? { name: tourney.winner, points: "Champion" } : initialWinner);
            let p2 = tourney.podium?.[1] || initialRunnerUp;
            let p3 = tourney.podium?.[2] || initialThird;

            if (Array.isArray(tourney.playersList) && (!p2 || !p3)) {
              const sorted = [...tourney.playersList].sort((a, b) => (b.points || 0) - (a.points || 0));
              if (!p1 && sorted[0]) p1 = sorted[0];
              if (!p2 && sorted[1]) p2 = sorted[1];
              if (!p3 && sorted[2]) p3 = sorted[2];
            }

            setPodiumDetails(prev => ({
              ...prev,
              winner: p1 || prev.winner,
              runnerUp: p2 || prev.runnerUp,
              thirdPlace: p3 || prev.thirdPlace,
              avatars: { ...(prev.avatars || {}), ...(tourney.playerAvatars || {}) }
            }));
          }
        })
        .catch(() => {});
    }
  }, [activeAlert, customAvatars]);

  const handleDismiss = (e) => {
    if (e) e.stopPropagation();
    if (!activeAlert) return;
    const newDismissed = [...dismissedIds, activeAlert._id];
    setDismissedIds(newDismissed);
    try {
      sessionStorage.setItem("dismissed_winner_alerts", JSON.stringify(newDismissed));
    } catch (err) {}
    setActiveAlert(null);
  };

  const handleOpenCelebration = () => {
    setModalOpen(true);
  };

  if (!activeAlert) return null;

  const winnerName = activeAlert.actorName || activeAlert.metadata?.winner?.name || activeAlert.message?.match(/CHAMPION CROWNED:\s*([^!]+?)\s*(?:has won|won)/i)?.[1] || "Tactician";
  const avatarUrl = podiumDetails.winner?.avatar || activeAlert.actorAvatar || customAvatars[winnerName] || getPlayerAvatarUrl(winnerName, customAvatars);

  // Extract tournament title and format
  let tournamentTitle = activeAlert.metadata?.tournamentTitle || "ZC Chess Tournament";
  let tournamentType = activeAlert.metadata?.tournamentType || "Championship";

  if (activeAlert.message && (!activeAlert.metadata?.tournamentTitle || !activeAlert.metadata?.tournamentType)) {
    const titleMatch = activeAlert.message.match(/won(?: the)? (.+?)(?:\s*\((.+?)\))?!/i);
    if (titleMatch) {
      if (titleMatch[1] && !activeAlert.metadata?.tournamentTitle) tournamentTitle = titleMatch[1].trim();
      if (titleMatch[2] && !activeAlert.metadata?.tournamentType) tournamentType = titleMatch[2].trim();
    }
  }

  const hasAdminRibbon = typeof document !== "undefined" && !!document.querySelector(".home-admin-ribbon");
  
  return (
    <>
      <div className={`global-winner-alert-bar ${hasAdminRibbon ? "with-admin-ribbon" : ""}`} onClick={handleOpenCelebration}>
        <div className="global-winner-alert-glow"></div>
        <div className="global-winner-content">
          <div className="global-winner-trophy">🏆</div>
          <div className="global-winner-avatar-wrap">
            <img
              src={avatarUrl}
              alt={winnerName}
              className="global-winner-avatar"
              onError={(e) => { e.currentTarget.src = "/Icons/unknown.png"; }}
            />
            <span className="global-winner-crown">👑</span>
          </div>

          <div className="global-winner-text-wrap">
            <div className="global-winner-badge-row">
              <span className="global-winner-type-tag">
                {tournamentType.toUpperCase()}
              </span>
              <span className="global-winner-live-pulse"></span>
              <span className="global-winner-status">CHAMPION ALERT</span>
            </div>
            <div className="global-winner-headline">
              <strong>{winnerName}</strong> won <em>{tournamentTitle}</em>!
            </div>
          </div>
        </div>

        <div className="global-winner-actions">
          <button
            type="button"
            className="global-winner-view-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCelebration();
            }}
          >
            🎉 Celebrate Champion
          </button>
          <button
            type="button"
            className="global-winner-dismiss-btn"
            onClick={handleDismiss}
            aria-label="Dismiss winner alert"
          >
            &times;
          </button>
        </div>
      </div>

      {modalOpen && (
        <WinnerCelebrationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          tournamentTitle={tournamentTitle}
          tournamentType={tournamentType}
          winner={podiumDetails.winner || { name: winnerName, points: "Champion", avatar: avatarUrl }}
          runnerUp={podiumDetails.runnerUp}
          thirdPlace={podiumDetails.thirdPlace}
          customAvatars={podiumDetails.avatars || customAvatars}
        />
      )}
    </>
  );
}
