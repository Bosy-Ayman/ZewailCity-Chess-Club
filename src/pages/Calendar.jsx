import "./Calendar.css";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
        if (Array.isArray(data)) {
          const mappedEvents = data.map(t => ({
            date: t.startDate,
            title: t.title,
            time: t.time,
            location: t.location || 'Zewail Chess Club',
            description: t.description || ''
          }));
          setEvents(mappedEvents);
        }
      })
      .catch(err => console.error("Error fetching tournaments for calendar:", err));
  }, []);

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

  const selectedEvents = selectedDate
    ? events.filter((e) => e.date === selectedDate)
    : [];

  return (
    <div className="calendar-page">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="calendar-container">
        <section className="intro-text">
          <h1>Calendar of Events</h1>
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
                    <div key={idx} className="event-item">
                      {ev.title}
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
              <h3>
                Events on{" "}
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>

              {selectedEvents.length > 0 ? (
                selectedEvents.map((ev, i) => (
                  <div key={i} className="event-detail-card">
                    <h4>{ev.title}</h4>
                    <p>🕒 {ev.time}</p>
                    {ev.location && <p>📍 {ev.location}</p>}
                    {ev.description && <p style={{ marginTop: '5px', fontStyle: 'italic' }}>{ev.description}</p>}
                  </div>
                ))
              ) : (
                <p className="no-event-text">No events this day</p>
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
