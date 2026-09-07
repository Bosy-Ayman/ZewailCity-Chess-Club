import React, { useState, useEffect, useCallback } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Award, Bell, Images, Sparkles, ChevronDown, Pin, ExternalLink, Calendar, MapPin } from "lucide-react";
import "./HomePage.css";

const CountUp = ({ end, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const countRef = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let startTimestamp = null;
          const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) {
              window.requestAnimationFrame(step);
            }
          };
          window.requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={countRef}>{count}{suffix}</span>;
};

const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="countdown-timer">
      <div className="countdown-item"><span className="countdown-value">{timeLeft.days}</span><span className="countdown-label">Days</span></div>
      <div className="countdown-item"><span className="countdown-value">{timeLeft.hours}</span><span className="countdown-label">Hrs</span></div>
      <div className="countdown-item"><span className="countdown-value">{timeLeft.minutes}</span><span className="countdown-label">Min</span></div>
      <div className="countdown-item"><span className="countdown-value">{timeLeft.seconds}</span><span className="countdown-label">Sec</span></div>
    </div>
  );
};

const HomePage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const heroSlides = [
    "/Images/Tournaments/2024-2025/KingQuest1_1.jpg",
    "/Images/Tournaments/2024-2025/KingQuest2.jpg",
    "/Images/Tournaments/2025-2026/TeamsTournament.jpg",
    "/Images/Tournaments/2024-2025/NileUni.jpg",
    "/Images/Tournaments/2018-2019/adhamfawzy.jpg",
    "/Images/Tournaments/2025-2026/AASTUni.jpg",
  ];

  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const announcements = [
    {
      id: 1,
      pinned: true,
      category: "tournament",
      categoryLabel: "Tournament",
      title: "ZC Rapid Championship — Coming Soon",
      description:
        "Our biggest chess event of the semester is being prepared. Stay tuned for the official schedule, registration link, and prize pool announcement.",
      date: "Week 9, 2026",
      image: "/Images/Tournaments/2024-2025/KingQuest1_3.png",
      link: "/tournaments",
      linkLabel: "View Tournaments",
    },
    {
      id: 2,
      pinned: false,
      category: "puzzle",
      categoryLabel: "Puzzle Challenge",
      title: "Weekly Puzzle is Live!",
      description:
        "A new tactical puzzle challenge has been posted. Solve it to earn points and climb the leaderboard.",
      date: "Aug 27, 2026",
      image: null,
      link: "/puzzlechallenge",
      linkLabel: "Solve Now",
    },
    {
      id: 3,
      pinned: false,
      category: "recruitment",
      categoryLabel: "Join Us",
      title: "Club Applications Now Open",
      description:
        "We are recruiting for the Organizing Committee, HR, Multimedia, and Training departments. Apply before spots fill up!",
      date: "Aug 25, 2026",
      image: null,
      link: "/clubroles",
      linkLabel: "Apply Now",
    },
  ];

  const pinnedAnnouncement = announcements.find((a) => a.pinned);
  const otherAnnouncements = announcements.filter((a) => !a.pinned);

  const [activeTournamentIndex, setActiveTournamentIndex] = useState(0);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(null);

  const galleryImages = [
    "/Images/Tournaments/2024-2025/KingQuest1_1.jpg",
    "/Images/Tournaments/2025-2026/TeamsTournament.jpg",
    "/Images/Tournaments/2018-2019/adhamfawzy.jpg",
    "/Images/Tournaments/2025-2026/AASTUni.jpg",
  ];

  const handleNextLightbox = useCallback(() => {
    setActiveLightboxIndex((prev) => (prev !== null ? (prev + 1) % galleryImages.length : null));
  }, [galleryImages.length]);

  const handlePrevLightbox = useCallback(() => {
    setActiveLightboxIndex((prev) => (prev !== null ? (prev > 0 ? prev - 1 : galleryImages.length - 1) : null));
  }, [galleryImages.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeLightboxIndex === null) return;
      if (e.key === "Escape") setActiveLightboxIndex(null);
      if (e.key === "ArrowRight") handleNextLightbox();
      if (e.key === "ArrowLeft") handlePrevLightbox();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxIndex, handleNextLightbox, handlePrevLightbox]);

  const recentTournaments = [
    {
      id: "kq4-2026",
      name: "King's Quest IV Championship",
      season: "Spring 2026",
      date: "May 15, 2026",
      location: "Academic Building",
      badge: "Swiss Championship",
      icon: "👑",
      winners: [
        {
          name: "Abdelrahman Mohamed",
          place: "🥇 Champion",
          medal: "gold",
          image: "/Winners/AbdelrahmanMohamed.png",
          detail: "Undefeated 5-Round Run"
        },
        {
          name: "Abdelwahab Hamdi",
          place: "🥈 2nd Place",
          medal: "silver",
          image: "/Winners/AbdelwahabHamdi.jpg",
          detail: "Podium Master"
        },
        {
          name: "Mohamed Eslam",
          place: "🥉 3rd Place",
          medal: "bronze",
          image: "/Winners/MohamedEslam.png",
          detail: "Tiebreak Finalist"
        }
      ]
    },
    {
      id: "aast-2026",
      name: "AAST Inter-University Championship",
      season: "Spring 2026",
      date: "May 14, 2026",
      location: "AAST University",
      badge: "Inter-University",
      icon: "🏆",
      winners: [
        {
          name: "Bosy Ayman",
          place: "🥇 1st Place (Girls)",
          medal: "gold",
          image: "/Winners/BosyAyman.png",
          detail: "Inter-Uni Gold Medalist"
        },
        {
          name: "Salma Ashraf",
          place: "🏅 4th Place (Girls)",
          medal: "silver",
          image: "/Winners/SalmaAshraf.jpg",
          detail: "Inter-Uni Finalist"
        },
        {
          name: "Haneen Yasser",
          place: "🏅 6th Place (Girls)",
          medal: "bronze",
          image: "/Winners/HaneenYasser.png",
          detail: "Inter-Uni Double Finalist"
        }
      ]
    },
    {
      id: "esports-2026",
      name: "Esports Blitz Tournament",
      season: "Spring 2026",
      date: "Feb 15, 2026",
      location: "Zone E Arena",
      badge: "Fast Clock Blitz",
      icon: "⚡",
      winners: [
        {
          name: "Abdelrahman Mohamed",
          place: "🥇 Champion",
          medal: "gold",
          image: "/Winners/AbdelrahmanMohamed.png",
          detail: "Blitz Arena Champion"
        },
        {
          name: "Mazen Ayman",
          place: "🥈 Runner-up",
          medal: "silver",
          image: "/Winners/MazenAyman.jpg",
          detail: "Silver Medalist"
        },
        {
          name: "Omar Hafez",
          place: "🥉 3rd Place",
          medal: "bronze",
          image: "/Winners/OmarHafez.jpeg",
          detail: "Tactics Specialist"
        }
      ]
    },
    {
      id: "ramadan-2026",
      name: "Ramadan Knockout Tournament",
      season: "Spring 2026",
      date: "Mar 25, 2026",
      location: "Academic Building",
      badge: "Night Knockout",
      icon: "🌙",
      winners: [
        {
          name: "Omar Ezz",
          place: "🥇 Champion",
          medal: "gold",
          image: "/Winners/OmarEzz.jpg",
          detail: "Knockout Champion"
        },
        {
          name: "Omar Hafez",
          place: "🥈 Runner-up",
          medal: "silver",
          image: "/Winners/OmarHafez.jpeg",
          detail: "Silver Finalist"
        },
        {
          name: "Abdelwahab Hamdi",
          place: "🥉 3rd Place",
          medal: "bronze",
          image: "/Winners/AbdelwahabHamdi.jpg",
          detail: "Bronze Medalist"
        }
      ]
    },
    {
      id: "teams-2025",
      name: "Teams Championship 2025",
      season: "Fall 2025",
      date: "Nov 8, 2025",
      location: "Academic Palm Tree",
      badge: "Squad Tournament",
      icon: "🛡️",
      winners: [
        {
          name: "Knights",
          place: "🥇 Champions",
          medal: "gold",
          image: "/Teams/25/Knights.png",
          detail: "Ahmed Elkodariy, Omar Hafez, Omar Ezz"
        },
        {
          name: "Gambling",
          place: "🥈 Runners-up",
          medal: "silver",
          image: "/Teams/25/Gambling.png",
          detail: "Abdelrahman M., Abdelrahman M3, Mohamed Eslam"
        },
        {
          name: "Epsilon",
          place: "🥉 3rd Place",
          medal: "bronze",
          image: "/Teams/25/Epsilon.png",
          detail: "NourEldin Newer, Amr Khaled, Youssef Yasser"
        }
      ]
    }
  ];

  const activeTournament = recentTournaments[activeTournamentIndex] || recentTournaments[0];

  return (
    <div className="homepage">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Hero Section */}
      <section className="hero-section" id="hero">
        <div className="hero-slideshow" aria-hidden="true">
          {heroSlides.map((src, i) => (
            <div
              key={src}
              className={`hero-slide${i === heroIndex ? " active" : ""}`}
              style={{ backgroundImage: `url('${src}')` }}
            />
          ))}
        </div>
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={13} />
            <span>Zewail City Chess Community</span>
          </div>
          <h1>Welcome to ZC Chess Club</h1>
          <p>
            Master tactics, participate in championship arenas, and represent Zewail City across national leagues!
          </p>

          <div className="hero-buttons">
            <a href="/tournaments" className="btn-link">
              <button className="explore-btn">
                <span>Explore Tournaments</span>
                <span className="btn-emoji">🏆</span>
              </button>
            </a>
            <a href="/history?tab=halloffame" className="btn-link">
              <button className="hero-secondary-btn">
                <span>Hall of Fame &amp; Archives</span>
                <span className="btn-emoji">👑</span>
              </button>
            </a>
          </div>

          {/* Quick Metrics Strip */}
          <div className="hero-quick-stats">
            <div className="hero-stat-item">
              <span className="hero-stat-num"><CountUp end={20} suffix="+" /></span>
              <span className="hero-stat-lbl">Championships</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-num">🥇 1st</span>
              <span className="hero-stat-lbl">Inter-Uni Girls</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-num"><CountUp end={500} suffix="+" /></span>
              <span className="hero-stat-lbl">Games Played</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <span className="hero-stat-num"><CountUp end={100} suffix="%" /></span>
              <span className="hero-stat-lbl">Student Legacy</span>
            </div>
          </div>

          {/* Hero Slideshow Navigation Dots */}
          <div className="hero-slide-dots" aria-label="Slideshow slide navigation">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === heroIndex ? "active" : ""}`}
                onClick={() => setHeroIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <a className="scroll-indicator" href="#news" aria-label="Scroll down">
          <ChevronDown size={28} strokeWidth={1.8} />
        </a>
      </section>

      <div className="section-divider" />

      {/* Player of the Month Spotlight */}
      <section className="potm-section" id="spotlight">
        <div className="potm-glass-card">
          <div className="potm-badge">
            <Sparkles size={14} />
            <span>Player of the season</span>
          </div>
          <div className="potm-content">
            <div className="potm-image-wrapper">
              <img src="/Winners/AbdelrahmanMohamed.png" alt="Abdelrahman Mohamed" className="potm-image" />
              <div className="potm-rating-badge">2000+ Rating</div>
            </div>
            <div className="potm-details">
              <h2 className="potm-name">Abdelrahman Mohamed</h2>
              <div className="potm-signature">
                <span className="potm-label">Signature Opening:</span>
                <span className="potm-value">Bishop's Opening, Berlin Defense (1.e4 e5 2.Bc4 Nf6 3.Qf3)</span>
              </div>
              {/* <blockquote className="potm-quote">
                "Preparation in the opening is key, but adaptability in the middlegame is what truly wins tournaments."
              </blockquote> */}
              <div className="potm-achievements">
                <span className="potm-achievement-tag">🥇 5x Champion</span>
                <span className="potm-achievement-tag">⚡ Blitz Specialist</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* News & Announcements Section */}
      <section className="news-section" id="news">
        <div className="news-section-header">
          <div className="news-badge">
            <Bell size={14} />
            <span>Club Updates &amp; Bulletins</span>
          </div>
          <h2>News &amp; Announcements</h2>
          <p className="news-subtitle">
            Stay tuned with the latest tournament schedules, tactical puzzle challenges, and official club announcements.
          </p>
        </div>

        {/* Featured / Pinned announcement */}
        {pinnedAnnouncement && (
          <div className="news-featured-card">
            <div
              className="news-featured-image"
              style={{ backgroundImage: `url("${pinnedAnnouncement.image}")` }}
            >
              <div className="news-featured-overlay" />
              <div className="news-featured-body">
                <div className="news-featured-badges">
                  <span className="news-pin-badge">
                    <Pin size={11} />
                    Pinned
                  </span>
                  <span className={`news-category-tag news-category-tag--${pinnedAnnouncement.category}`}>
                    {pinnedAnnouncement.categoryLabel}
                  </span>
                </div>
                <h3 className="news-featured-title">{pinnedAnnouncement.title}</h3>
                <p className="news-featured-desc">{pinnedAnnouncement.description}</p>
                <CountdownTimer targetDate="2026-10-20T18:00:00" />
                <div className="news-featured-footer">
                  <span className="news-date">
                    <Calendar size={13} />
                    {pinnedAnnouncement.date}
                  </span>
                  <a href={pinnedAnnouncement.link} className="news-cta-btn">
                    {pinnedAnnouncement.linkLabel}
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smaller announcement cards */}
        {otherAnnouncements.length > 0 && (
          <div className="news-cards-grid">
            {otherAnnouncements.map((item) => (
              <div key={item.id} className="news-mini-card">
                <div className="news-mini-header">
                  <span className={`news-category-tag news-category-tag--${item.category}`}>
                    {item.categoryLabel}
                  </span>
                  <span className="news-date">
                    <Calendar size={12} />
                    {item.date}
                  </span>
                </div>
                <h4 className="news-mini-title">{item.title}</h4>
                <p className="news-mini-desc">{item.description}</p>
                <a href={item.link} className="news-mini-link">
                  {item.linkLabel} →
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="section-divider" />

      {/* Winners Section — Balanced Podium Showcase */}
      <section className="winners-section" id="winners">
        <div className="winners-section-header">
          <div className="winners-badge">
            <Award size={14} />
            <span>Championship Honors</span>
          </div>
          <h2>Recent Tournament Winners</h2>
          <p className="winners-subtitle">
            Celebrating the champions and top performers across our latest flagship tournaments.
          </p>
        </div>

        {/* Segmented Selector for Tournaments */}
        <div className="tournament-pills-scroll-wrapper">
          <div className="tournament-pills-bar">
            {recentTournaments.map((t, idx) => (
              <button
                key={t.id}
                className={`tournament-pill-btn ${idx === activeTournamentIndex ? "active" : ""}`}
                onClick={() => setActiveTournamentIndex(idx)}
              >
                <span className="pill-icon">{t.icon}</span>
                <span className="pill-title">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Tournament Info Header */}
        <div className="active-tournament-banner">
          <div className="active-tournament-meta">
            <span className="active-tournament-badge">{activeTournament.badge}</span>
            <h3 className="active-tournament-title">{activeTournament.name}</h3>
          </div>
          <div className="active-tournament-details">
            <span><Calendar size={13} style={{ marginRight: "4px", verticalAlign: "middle" }} />{activeTournament.date}</span>
            <span><MapPin size={13} style={{ marginRight: "4px", verticalAlign: "middle" }} />{activeTournament.location}</span>
          </div>
        </div>

        {/* Balanced Podium Showcase Grid */}
        <div className="podium-showcase-grid">
          {activeTournament.winners.map((winner, wIdx) => {
            const isGold = winner.medal === "gold";
            const isSilver = winner.medal === "silver";
            
            return (
              <div 
                key={wIdx} 
                className={`podium-card podium-card--${winner.medal} ${isGold ? "podium-card--gold" : ""}`}
              >
                <div className="podium-avatar-wrapper">
                  <img
                    src={winner.image}
                    alt={winner.name}
                    className="podium-avatar"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/Icons/unknown.png";
                    }}
                  />
                  <span className={`podium-medal-badge badge-${winner.medal}`}>
                    {isGold ? "🥇" : isSilver ? "🥈" : "🥉"}
                  </span>
                </div>

                <div className="podium-info">
                  <div className="podium-tag-row">
                    <span className={`podium-tag tag-${winner.medal}`}>{winner.place}</span>
                  </div>
                  <h4 className="podium-name">{winner.name}</h4>
                  <p className="podium-detail">{winner.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="winners-cta-row">
          <a href="/history?tab=halloffame" className="explore-hall-btn">
            🏆 Explore Full Hall of Fame &amp; Past Champions →
          </a>
          <a href="/history?tab=events" className="explore-archives-btn">
            📜 View Complete Tournament Archives
          </a>
        </div>
      </section>

      <div className="section-divider" />

      {/* 🧠 Interactive Tactician Section
      <section className="tactician-section">
        <div className="tactician-card glass-panel">
          <div className="tactician-header">
            <div className="tactician-title-badge">
              <Zap size={15} />
              <span>Tactician's Corner</span>
            </div>
            <div className="tactician-tabs">
              <button
                className={`tactician-tab-btn ${activeTacticianTab === "quote" ? "active" : ""}`}
                onClick={() => setActiveTacticianTab("quote")}
              >
                <Award size={13} /> Grandmaster Wisdom
              </button>
              <button
                className={`tactician-tab-btn ${activeTacticianTab === "tip" ? "active" : ""}`}
                onClick={() => setActiveTacticianTab("tip")}
              >
                <Lightbulb size={13} /> Opening Strategy
              </button>
              <button
                className="tactician-shuffle-btn"
                onClick={() => {
                  if (activeTacticianTab === "quote") {
                    setQuoteIndex((prev) => (prev + 1) % quotesList.length);
                  } else {
                    setTipIndex((prev) => (prev + 1) % tipsList.length);
                  }
                }}
                title="Shuffle insight"
                aria-label="Next insight"
              >
                <RefreshCw size={13} />
                <span>Next</span>
              </button>
            </div>
          </div>

          <div className="tactician-content">
            {activeTacticianTab === "quote" ? (
              <blockquote className="tactician-quote">
                <p>"{quotesList[quoteIndex].text}"</p>
                <cite>— {quotesList[quoteIndex].author}</cite>
              </blockquote>
            ) : (
              <div className="tactician-tip">
                <h4>{tipsList[tipIndex].title}</h4>
                <p>{tipsList[tipIndex].desc}</p>
              </div>
            )}
          </div>
        </div>
      </section> */}

      <div className="section-divider" />

      {/* Club Pillars Section */}
      <section className="pillars-section">
        <div className="pillars-header">
          <span className="pillars-badge">⚔️ The ZC Chess Experience</span>
          <h2>Built for Tacticians, Champions &amp; Enthusiasts</h2>
          <p>Whether you're looking to master openings, compete in speed arenas, or represent ZC in national leagues.</p>
        </div>
        <div className="pillars-grid">
          <div className="pillar-card premium-card">
            <div className="pillar-icon-box">🏆</div>
            <h3>Championship Arenas</h3>
            <p>From the King's Quest Swiss series to nocturnal Ramadan Knockouts and fast-paced Esports Blitz tournaments.</p>
          </div>
          <div className="pillar-card premium-card">
            <div className="pillar-icon-box">🧠</div>
            <h3>Tactical Training</h3>
            <p>Grandmaster simultaneous exhibitions, weekly puzzle battles, and masterclasses by top campus tacticians.</p>
          </div>
          <div className="pillar-card premium-card">
            <div className="pillar-icon-box">🏛️</div>
            <h3>Inter-University Glory</h3>
            <p>Official delegations representing Zewail City at AAST, Nile University, and Egyptian university leagues.</p>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Gallery Section */}
      <section className="gallery-section" id="gallery">
        <div className="gallery-section-header">
          <div className="gallery-badge">
            <Images size={14} />
            <span>Moments &amp; Memories</span>
          </div>
          <h2>Photo Gallery</h2>
          <p className="gallery-subtitle">
            Snapshots of intense campus showdowns, podium trophies, and collaborative chess sessions at Zewail City. Click any photo to expand.
          </p>
        </div>
        <div className="gallery-grid">
          {galleryImages.map((url, i) => (
            <div 
              key={i} 
              className="gallery-card premium-card"
              onClick={() => setActiveLightboxIndex(i)}
              style={{ cursor: "pointer" }}
            >
              <div
                className="gallery-image"
                style={{ backgroundImage: `url(${url})` }}
              >
                <div className="gallery-hover-overlay">
                  <span className="gallery-zoom-badge">🔍 View Moment</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🖼️ Gallery Lightbox Modal */}
      {activeLightboxIndex !== null && (
        <div className="gallery-lightbox-overlay" onClick={() => setActiveLightboxIndex(null)}>
          <div className="gallery-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="lightbox-close-btn" 
              onClick={() => setActiveLightboxIndex(null)}
              aria-label="Close Lightbox"
            >
              ✕
            </button>

            {/* Navigation buttons */}
            <button 
              className="lightbox-nav-btn lightbox-prev-btn"
              onClick={handlePrevLightbox}
              aria-label="Previous image"
            >
              ‹
            </button>

            <div className="lightbox-image-wrapper">
              <img 
                src={galleryImages[activeLightboxIndex]} 
                alt={`ZC Chess Club Moment ${activeLightboxIndex + 1}`} 
                className="lightbox-img"
              />
            </div>

            <button 
              className="lightbox-nav-btn lightbox-next-btn"
              onClick={handleNextLightbox}
              aria-label="Next image"
            >
              ›
            </button>

            <div className="lightbox-footer">
              <span className="lightbox-counter">
                Moment {activeLightboxIndex + 1} of {galleryImages.length}
              </span>
              <p className="lightbox-caption">
                Zewail City Chess Club Championship Moments &amp; Campus Memories
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="section-divider" />

      {/* Location Section */}
      <section className="location-section" id="location">
        <div className="location-section-header">
          <div className="location-badge">
            <MapPin size={14} />
            <span>Campus Headquarters</span>
          </div>
          <h2>Find Us on Campus</h2>
          <p className="location-subtitle">
            We're based at Zewail City of Science and Technology. Visit us to play, learn, and grow your chess skills!
          </p>
        </div>
        <div className="location-map-wrapper">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13829.260647009416!2d31.057944756637557!3d29.941612099605063!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x145851c4e4764643%3A0xc68aa33599a96301!2sZewail%20City%20of%20Science%20and%20Technology!5e0!3m2!1sen!2seg!4v1787918469421!5m2!1sen!2seg"
            width="100%"
            height="400"
            style={{ border: 0, borderRadius: "16px" }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title="Zewail City Location"
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
