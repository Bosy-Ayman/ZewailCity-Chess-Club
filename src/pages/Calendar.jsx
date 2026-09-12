import "./Calendar.css";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FALL_2025_TOURNAMENT } from "../utils/knockoutHistoricalData";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

/**
 * Helper to determine round label based on round number and bracket type
 */
function getMatchRoundLabel(round, bracket, isDoubleElim = true) {
  const b = (bracket || "").toLowerCase();
  const r = Number(round) || 1;

  if (b === "grand_finals" || b === "grand_finals_reset") {
    return "Grand Championship Finals";
  }

  if (b === "lower") {
    if (r === 1) return "Lower Bracket — Round 1 (Elimination)";
    if (r === 2) return "Lower Bracket — Round 2";
    if (r === 3) return "Lower Bracket — Round 3";
    if (r === 4) return "Lower Bracket — Semifinals";
    if (r === 5) return "Lower Bracket — Finals";
    return `Lower Bracket — Round ${r}`;
  }

  // Upper bracket or single elimination
  if (isDoubleElim) {
    if (r === 1) return "Upper Bracket — Round of 16";
    if (r === 2) return "Upper Bracket — Quarterfinals";
    if (r === 3) return "Upper Bracket — Semifinals";
    if (r === 4) return "Upper Bracket — Finals";
    return `Upper Bracket — Round ${r}`;
  }

  if (r === 1) return "Round 1 (Round of 16)";
  if (r === 2) return "Quarterfinals";
  if (r === 3) return "Semifinals";
  if (r === 4) return "Championship Finals";
  return `Round ${r}`;
}

/**
 * Helper to parse scores and winners from match results
 */
function parseScoreDetails(result, white, black) {
  if (!result || result === "Pending" || result === "—" || result === "-") {
    return {
      whiteScore: "—",
      blackScore: "—",
      isCompleted: false,
      winner: null,
      resultText: "Pending / Upcoming"
    };
  }

  const clean = String(result).replace(/\s+/g, "");
  if (clean === "1-0") {
    return {
      whiteScore: "1",
      blackScore: "0",
      isCompleted: true,
      winner: white,
      resultText: "1 - 0"
    };
  }
  if (clean === "0-1") {
    return {
      whiteScore: "0",
      blackScore: "1",
      isCompleted: true,
      winner: black,
      resultText: "0 - 1"
    };
  }
  if (clean === "1/2-1/2" || clean === "½-½" || clean.toLowerCase() === "draw") {
    return {
      whiteScore: "½",
      blackScore: "½",
      isCompleted: true,
      winner: null,
      resultText: "½ - ½ (Draw)"
    };
  }

  return {
    whiteScore: result,
    blackScore: "",
    isCompleted: true,
    winner: null,
    resultText: result
  };
}

/**
 * Parse time string to minutes from midnight for chronological sorting
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 9999;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 9999;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const meridian = (match[3] || "").toUpperCase();
  if (meridian === "PM" && hours < 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;
  return hours * 60 + mins;
}

/**
 * Intelligent helper to parse diverse schedule strings (e.g. "Oct 4, 10:00 AM" or "2026-10-04 14:00")
 * into calendar dateKey (YYYY-MM-DD) and clean time string.
 */
function parseScheduleToCalendarDate(matchTimeStr, fallbackYear = 2026) {
  if (!matchTimeStr || typeof matchTimeStr !== "string") return null;
  const str = matchTimeStr.trim();
  if (!str || str === "TBD" || str === "—") return null;

  // Pattern 1: ISO or standard YYYY-MM-DD (e.g. "2026-10-04 10:00 AM" or "2026-10-04")
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(.*))?$/);
  if (isoMatch) {
    return {
      dateKey: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`,
      timeStr: isoMatch[4] ? isoMatch[4].trim() : "Scheduled"
    };
  }

  // Pattern 2: Month Day with optional time (e.g. "Oct 4, 10:00 AM" or "October 4, 14:00" or "Oct 04 2026, 10:00 AM")
  const monthMap = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12"
  };

  const regex = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?(?:[\s,]+at\s*|[\s,]+)(.*)?$/i;
  const match = str.match(regex);
  if (match) {
    const mName = match[1].toLowerCase();
    const monthNum = monthMap[mName];
    if (monthNum) {
      const dayNum = String(match[2]).padStart(2, "0");
      const yearNum = match[3] || fallbackYear;
      return {
        dateKey: `${yearNum}-${monthNum}-${dayNum}`,
        timeStr: match[4] ? match[4].trim() : "Scheduled"
      };
    }
  }

  return null;
}

export default function Calendar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/tournaments`)
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return [];
      })
      .then(data => {
        const allEvents = [];
        const tournamentsList = Array.isArray(data) ? data : [];

        // 1. Map tournament start dates
        tournamentsList.forEach(t => {
          if (t.startDate) {
            allEvents.push({
              date: t.startDate,
              title: t.title,
              time: t.time || "All Day",
              location: t.location || 'Zewail Chess Club',
              description: t.description || `${t.type || "Chess"} Tournament`,
              type: "tournament",
              tournamentType: t.type || "Tournament",
              tournamentId: t._id
            });
          }

          // 2. Map scheduled matches for Knockout tournaments (Swiss tournaments do NOT have individual match schedules)
          const isKnockout = t.type === "Single Elimination" || t.type === "Double Elimination" || t.type === "Knockout" || (t.matches && t.matches.some(m => m.bracket));
          if (isKnockout && Array.isArray(t.matches)) {
            t.matches.forEach((m, mIdx) => {
              if (m.matchTime && m.matchTime !== "TBD" && m.white !== "BYE" && m.black !== "BYE") {
                const tYear = t.startDate ? parseInt(t.startDate.substring(0, 4), 10) : currentYear;
                const parsed = parseScheduleToCalendarDate(m.matchTime, tYear);
                if (parsed) {
                  const roundLabel = getMatchRoundLabel(m.round || 1, m.bracket, t.type === "Double Elimination");
                  const scoreDetails = parseScoreDetails(m.result, m.white, m.black);
                  allEvents.push({
                    date: parsed.dateKey,
                    title: `⚔️ ${m.white} vs ${m.black}`,
                    time: parsed.timeStr,
                    location: m.location || t.location || `ZC Chess Club / Board ${mIdx + 1}`,
                    description: `${t.title} — ${roundLabel}`,
                    type: "match",
                    round: m.round || 1,
                    bracket: m.bracket || "upper",
                    roundLabel,
                    white: m.white,
                    black: m.black,
                    result: m.result,
                    scoreDetails,
                    tournamentTitle: t.title,
                    tournamentId: t._id,
                    tournamentType: t.type
                  });
                }
              }
            });
          }
        });

        // 3. Fallback support: Also map scheduled matches from Fall 2025 Knockout Championship if not in DB response
        const hasFall2025 = tournamentsList.some(t => t.title && t.title.includes("1st Knockout Championship"));
        if (!hasFall2025 && FALL_2025_TOURNAMENT) {
          if (FALL_2025_TOURNAMENT.startDate) {
            allEvents.push({
              date: FALL_2025_TOURNAMENT.startDate,
              title: FALL_2025_TOURNAMENT.title,
              time: FALL_2025_TOURNAMENT.time || "10:00 AM",
              location: FALL_2025_TOURNAMENT.location || "Zewail City Chess Hall",
              description: "1st Double Elimination Knockout Championship",
              type: "tournament",
              tournamentType: "Double Elimination"
            });
          }
          if (Array.isArray(FALL_2025_TOURNAMENT.matches)) {
            FALL_2025_TOURNAMENT.matches.forEach((m, mIdx) => {
              if (m.matchTime && m.white !== "BYE" && m.black !== "BYE") {
                const parsed = parseScheduleToCalendarDate(m.matchTime, 2025);
                if (parsed) {
                  const roundLabel = getMatchRoundLabel(m.round, m.bracket, true);
                  const scoreDetails = parseScoreDetails(m.result, m.white, m.black);
                  allEvents.push({
                    date: parsed.dateKey,
                    title: `⚔️ ${m.white} vs ${m.black}`,
                    time: parsed.timeStr,
                    location: "ZC Chess Hall / Board " + (mIdx + 1),
                    description: `1st Knockout Championship — ${roundLabel}`,
                    type: "match",
                    round: m.round,
                    bracket: m.bracket || "upper",
                    roundLabel,
                    white: m.white,
                    black: m.black,
                    result: m.result,
                    scoreDetails,
                    tournamentTitle: "1st Knockout Championship — Fall 2025",
                    tournamentType: "Double Elimination"
                  });
                }
              }
            });
          }
        }

        setEvents(allEvents);
      })
      .catch(err => console.error("Error fetching tournaments for calendar:", err));
  }, [currentYear]);

  // Helper functions
  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }
  function firstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }
  function formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const totalDays = daysInMonth(currentYear, currentMonth);
  const firstDay = firstDayOfMonth(currentYear, currentMonth);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else setCurrentMonth(currentMonth + 1);
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else setCurrentMonth(currentMonth - 1);
  };

  const handleDayClick = (day) => {
    if (day === null) return;
    const selected = formatDate(currentYear, currentMonth, day);
    setSelectedDate(selected);
  };

  // Sort day's events chronologically by match time so morning rounds come first
  const selectedEvents = selectedDate
    ? [...events.filter((e) => e.date === selectedDate)].sort((a, b) => {
        if (a.type === "tournament" && b.type !== "tournament") return -1;
        if (b.type === "tournament" && a.type !== "tournament") return 1;
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      })
    : [];

  return (
    <div className="calendar-page">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="calendar-container">
        <section className="intro-text">
          <h1 className="site-page-title">Calendar of Events</h1>
        </section>

        {/* Header with month navigation */}
        <div className="calendar-header">
          <button onClick={prevMonth}>◀</button>
          <h2>
            {months[currentMonth]} {currentYear}
          </h2>
          <button onClick={nextMonth}>▶</button>
        </div>

        {/* Monthly Grid */}
        <div className="month-grid">
          <div className="day-name">Sun</div>
          <div className="day-name">Mon</div>
          <div className="day-name">Tue</div>
          <div className="day-name">Wed</div>
          <div className="day-name">Thu</div>
          <div className="day-name">Fri</div>
          <div className="day-name">Sat</div>

          {days.map((day, i) => {
            if (day === null)
              return <div key={i} className="day-cell empty"></div>;

            const dateKey = formatDate(currentYear, currentMonth, day);
            const dayEvents = events.filter((e) => e.date === dateKey);
            const isToday =
              day === today.getDate() &&
              currentMonth === today.getMonth() &&
              currentYear === today.getFullYear();

            return (
              <div
                key={i}
                className={`day-cell ${isToday ? "today" : ""}`}
                onClick={() => handleDayClick(day)}
              >
                <div className="date-num">{day}</div>
                <div className="event-list">
                  {dayEvents.slice(0, 2).map((ev, idx) => (
                    <div 
                      key={idx} 
                      className={`event-item ${ev.type === "match" ? "match-event" : "tournament-event"}`}
                      title={`${ev.roundLabel ? `${ev.roundLabel} • ` : ""}${ev.time} • ${ev.white || ""} vs ${ev.black || ""}${ev.scoreDetails?.isCompleted ? ` [${ev.scoreDetails.resultText}]` : ""}`}
                    >
                      {ev.type === "match" ? (
                        <div className="cal-cell-match-row">
                          <span className="cal-cell-time">{ev.time}</span>
                          <span className="cal-cell-match-names">
                            {ev.scoreDetails?.isCompleted ? (
                              <>
                                <span className={ev.scoreDetails.winner === ev.white ? "cal-winner-text" : ""}>{ev.white.split(" ")[0]}</span>
                                <span className="cal-cell-score-tag">{ev.scoreDetails.whiteScore}-{ev.scoreDetails.blackScore}</span>
                                <span className={ev.scoreDetails.winner === ev.black ? "cal-winner-text" : ""}>{ev.black.split(" ")[0]}</span>
                              </>
                            ) : (
                              <>{ev.white.split(" ")[0]} vs {ev.black.split(" ")[0]}</>
                            )}
                          </span>
                        </div>
                      ) : (
                        ev.title
                      )}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="more-events">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Day Details Modal */}
        {selectedDate && (
          <div className="day-details-overlay" onClick={() => setSelectedDate(null)}>
            <div
              className="day-details"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="day-details-header">
                <h3>
                  📅 Events on{" "}
                  {new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <span className="day-details-count">{selectedEvents.length} {selectedEvents.length === 1 ? "Event" : "Events"}</span>
              </div>

              {selectedEvents.length > 0 ? (
                <div className="modal-events-scrollable">
                  {selectedEvents.map((ev, i) => (
                    <div key={i} className={`event-detail-card ${ev.type === "match" ? "match-card" : ""}`}>
                      {ev.type === "match" ? (
                        <>
                          {/* Round Header & Timing Pill */}
                          <div className="cal-match-top-bar">
                            <span className="cal-round-pill">
                              🎯 {ev.roundLabel || `Round ${ev.round}`}
                            </span>
                            <span className="cal-time-pill">
                              🕒 {ev.time}
                            </span>
                          </div>

                          {/* Authentic Head-to-Head Scoreboard */}
                          <div className="cal-match-scoreboard">
                            {/* White Player */}
                            <div className={`cal-player-box white-side ${ev.scoreDetails?.winner === ev.white ? "winner" : ""}`}>
                              <div className="cal-player-meta">
                                <span className="cal-piece-icon">⚪</span>
                                <span className="cal-player-name">{ev.white}</span>
                                {ev.scoreDetails?.winner === ev.white && <span className="cal-crown">👑</span>}
                              </div>
                              <div className={`cal-score-digit ${ev.scoreDetails?.winner === ev.white ? "winner" : ""}`}>
                                {ev.scoreDetails?.whiteScore}
                              </div>
                            </div>

                            {/* VS Divider */}
                            <div className="cal-vs-divider">
                              <span className="cal-vs-text">VS</span>
                              {ev.scoreDetails?.isCompleted ? (
                                <span className="cal-final-badge">FINAL</span>
                              ) : (
                                <span className="cal-pending-badge">UPCOMING</span>
                              )}
                            </div>

                            {/* Black Player */}
                            <div className={`cal-player-box black-side ${ev.scoreDetails?.winner === ev.black ? "winner" : ""}`}>
                              <div className={`cal-score-digit ${ev.scoreDetails?.winner === ev.black ? "winner" : ""}`}>
                                {ev.scoreDetails?.blackScore}
                              </div>
                              <div className="cal-player-meta">
                                {ev.scoreDetails?.winner === ev.black && <span className="cal-crown">👑</span>}
                                <span className="cal-player-name">{ev.black}</span>
                                <span className="cal-piece-icon">⚫</span>
                              </div>
                            </div>
                          </div>

                          {/* Match Result / Outcome Banner */}
                          {ev.scoreDetails?.isCompleted ? (
                            <div className="cal-match-outcome-banner">
                              {ev.scoreDetails.winner ? (
                                <span>🏆 <strong>{ev.scoreDetails.winner}</strong> won with score <strong>{ev.scoreDetails.resultText}</strong></span>
                              ) : (
                                <span>🤝 Drawn match ({ev.scoreDetails.resultText})</span>
                              )}
                            </div>
                          ) : (
                            <div className="cal-match-outcome-banner pending">
                              <span>⏳ Scheduled match based on Round {ev.round} timing</span>
                            </div>
                          )}

                          {/* Match Footer Info & Action */}
                          <div className="cal-match-footer-info">
                            <span className="cal-footer-location">📍 {ev.location}</span>
                            <span className="cal-footer-tourney">🏆 {ev.tournamentTitle}</span>
                          </div>

                          <div style={{ marginTop: "12px" }}>
                            <Link 
                              to={ev.tournamentId ? `/tournamentdetailsKnockout?id=${ev.tournamentId}` : "/tournamentdetailsKnockout"} 
                              className="view-bracket-link"
                              onClick={() => setSelectedDate(null)}
                            >
                              ⚡ View Match in Tournament Bracket →
                            </Link>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span className="event-category-badge tournament">
                              🏆 TOURNAMENT EVENT
                            </span>
                            <span style={{ color: "#f3c144", fontWeight: "700", fontSize: "0.85rem" }}>🕒 {ev.time}</span>
                          </div>
                          <h4 style={{ color: "#fff", fontSize: "1.1rem", margin: "6px 0 4px" }}>{ev.title}</h4>
                          {ev.location && <p style={{ color: "#b5afa1", margin: "3px 0", fontSize: "0.85rem" }}>📍 {ev.location}</p>}
                          {ev.description && <p style={{ marginTop: '5px', fontStyle: 'italic', color: '#8c867a', fontSize: '0.82rem' }}>{ev.description}</p>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-event-text">No events scheduled on this day</p>
              )}

              <button
                className="close-btn"
                onClick={() => setSelectedDate(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
