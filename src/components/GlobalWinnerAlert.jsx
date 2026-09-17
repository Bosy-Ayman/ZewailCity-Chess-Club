import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getPlayerAvatarUrl } from "../utils/api";
import WinnerCelebrationModal from "./WinnerCelebrationModal";
import "./GlobalWinnerAlert.css";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

const getAlertKeys = (n) => {
  if (!n) return [];
  const keys = [];
  if (n._id) keys.push(String(n._id));
  if (n.id) keys.push(String(n.id));
  if (n.message) keys.push(n.message.trim());
  return keys;
};

/**
 * Floating Global Winner Alert Toast / Banner
 * Appears only ONCE per new winner announcement across app sessions.
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

  const getDismissedData = () => {
    try {
      const seen = JSON.parse(localStorage.getItem("seen_winner_alerts") || "[]");
      const dismissed = JSON.parse(localStorage.getItem("dismissed_winner_alerts") || "[]");
      const dismissedUntil = parseInt(localStorage.getItem("winner_alerts_dismissed_until") || "0", 10);
      return {
        keys: new Set([...seen, ...dismissed]),
        dismissedUntil
      };
    } catch (e) {
      return { keys: new Set(), dismissedUntil: 0 };
    }
  };

  const [dismissedState, setDismissedState] = useState(getDismissedData);

  // Find most recent un-seen / un-dismissed winner notification (within last 3 days)
  useEffect(() => {
    if (!Array.isArray(notifications) || notifications.length === 0) return;

    const { keys, dismissedUntil } = getDismissedData();

    const winnerNotif = notifications.find((n) => {
      if (!n) return false;
      const isWinnerType = n.type === "winner" || (n.message && (n.message.includes("CHAMPION") || n.message.includes("won the") || n.message.includes("🏆")));
      if (!isWinnerType) return false;

      const nKeys = getAlertKeys(n);
      const isDismissedByKey = nKeys.some(k => keys.has(k));
      if (isDismissedByKey) return false;

      // Check if created before or at dismissal cutoff timestamp
      if (n.createdAt) {
        const notifTime = new Date(n.createdAt).getTime();
        if (dismissedUntil && notifTime <= dismissedUntil) return false;

        // Check if older than 72h
        const diffHours = (Date.now() - notifTime) / (1000 * 60 * 60);
        if (diffHours > 72) return false;
      }
      return true;
    });

    if (winnerNotif) {
      setActiveAlert(winnerNotif);
      // Automatically register this alert key as seen
      const nKeys = getAlertKeys(winnerNotif);
      try {
        const currentSeen = JSON.parse(localStorage.getItem("seen_winner_alerts") || "[]");
        let updated = false;
        nKeys.forEach(k => {
          if (!currentSeen.includes(k)) {
            currentSeen.push(k);
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem("seen_winner_alerts", JSON.stringify(currentSeen));
        }
      } catch (e) {}
    } else {
      setActiveAlert(null);
    }
  }, [notifications, dismissedState]);

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
    
    // Collect all keys of ALL winner notifications currently in the feed to dismiss them all at once
    const allWinnerKeys = [];
    if (Array.isArray(notifications)) {
      notifications.forEach(n => {
        if (n && (n.type === "winner" || (n.message && (n.message.includes("CHAMPION") || n.message.includes("won the") || n.message.includes("🏆"))))) {
          getAlertKeys(n).forEach(k => allWinnerKeys.push(k));
        }
      });
    }
    if (activeAlert) {
      getAlertKeys(activeAlert).forEach(k => allWinnerKeys.push(k));
    }

    const now = Date.now();
    try {
      const existingDismissed = JSON.parse(localStorage.getItem("dismissed_winner_alerts") || "[]");
      const merged = Array.from(new Set([...existingDismissed, ...allWinnerKeys]));
      localStorage.setItem("dismissed_winner_alerts", JSON.stringify(merged));
      localStorage.setItem("seen_winner_alerts", JSON.stringify(merged));
      localStorage.setItem("winner_alerts_dismissed_until", String(now));
    } catch (err) {}

    setDismissedState({
      keys: new Set(allWinnerKeys),
      dismissedUntil: now
    });
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
            <span className="btn-text-desktop">🎉 Celebrate Champion</span>
            <span className="btn-text-mobile">🎉 Celebrate</span>
          </button>
          <button
            type="button"
            className="global-winner-dismiss-btn"
            onClick={handleDismiss}
            aria-label="Dismiss winner alert"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {modalOpen && (
        <WinnerCelebrationModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            handleDismiss();
          }}
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
