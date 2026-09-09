import React, { useState, useEffect, useCallback } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { 
  Award, Bell, Images, Sparkles, ChevronDown, Pin, ExternalLink, 
  Calendar, MapPin, Users, Swords, Heart, 
  CheckCircle2, Send,
  Mail, Copy, Check, Crown, UserPlus, UserCheck, User
} from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { getPlayerAvatarUrl } from "../utils/api";
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

  // Window size for Confetti
  const { width, height } = useWindowSize();

  // Dynamic tournament & avatar data from backend
  const [customAvatars, setCustomAvatars] = useState({});
  const [liveTournament, setLiveTournament] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState([
    {
      email: "s-bosy.mohamed@zewailcity.edu.eg",
      name: "Bosy Ayman",
      role: "hr",
      fideRating: 1845,
      chessComRating: 1980,
      major: "Computer Science & AI (CSAI)",
      batch: "2026",
      verified: true
    },
    {
      email: "ezzomar123ahmed@gmail.com",
      name: "Omar Ezz",
      role: "member",
      fideRating: 1810,
      chessComRating: 1960,
      major: "Communications & Info Eng (CIE)",
      batch: "2025",
      verified: true
    },
    {
      email: "s-youssef.elkha@zewailcity.edu.eg",
      name: "Youssef Tarek",
      role: "member",
      fideRating: 1680,
      chessComRating: 1795,
      major: "Environmental Engineering (ENV)",
      batch: "2027",
      verified: true
    },
    {
      email: "admin@zcchessclub.com",
      name: "ZC Chess Club Admin",
      role: "admin",
      major: "Board & Governance",
      batch: "Faculty / Board",
      verified: true
    }
  ]);

  // Campus Tacticians Community Network State
  const [tacticiansFilter, setTacticiansFilter] = useState("all");
  const [selectedTactician, setSelectedTactician] = useState(null);
  const [tacticianModalOpen, setTacticianModalOpen] = useState(false);
  const [tacticianCheers, setTacticianCheers] = useState({});
  const [cheerBursts, setCheerBursts] = useState({});
  const [challengeTimeControl, setChallengeTimeControl] = useState("3+2 Blitz");
  const [challengeLocation, setChallengeLocation] = useState("Academic Building Lounge");
  const [challengeSent, setChallengeSent] = useState(false);
  const [modalCheered, setModalCheered] = useState(false);

  // Social & Admin State
  const loggedInEmail = localStorage.getItem("adminEmail") || "";
  const userRole = localStorage.getItem("userRole") || "member";
  const isAdmin = userRole === "admin" || (loggedInEmail && loggedInEmail.toLowerCase() === "admin@zcchessclub.com");
  const [followingState, setFollowingState] = useState({});
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [clubActivity, setClubActivity] = useState([]);


  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchLiveAndAvatars = async () => {
      try {
        const tRes = await fetch(`${API_BASE}/api/tournaments`);
        if (tRes.ok) {
          const tList = await tRes.json();
          const ongoing = tList.find((t) => t.status === "Ongoing" || t.status === "In Progress");
          if (ongoing) {
            const detRes = await fetch(`${API_BASE}/api/tournaments/${ongoing._id}`);
            if (detRes.ok) {
              const detData = await detRes.json();
              setLiveTournament(detData);
              if (detData.playerAvatars) {
                setCustomAvatars((prev) => ({ ...prev, ...detData.playerAvatars }));
              }
            } else {
              setLiveTournament(ongoing);
            }
          }
        }

        const aRes = await fetch(`${API_BASE}/api/players/avatars`);
        if (aRes.ok) {
          const aData = await aRes.json();
          if (aData.avatars) {
            setCustomAvatars((prev) => ({ ...prev, ...aData.avatars }));
          }
        }

        const uRes = await fetch(`${API_BASE}/api/users`);
        if (uRes.ok) {
          const uList = await uRes.json();
          if (Array.isArray(uList)) {
            const valid = uList.filter(u => u.email && u.email.toLowerCase() !== "admin2@zcchessclub.com");
            if (valid.length > 0) {
              setRegisteredUsers(valid);
              // Initialize cheer counts from real DB values
              const cheerMap = {};
              valid.forEach(u => {
                if (u.name) cheerMap[u.name] = u.cheers || 0;
              });
              setTacticianCheers(prev => ({ ...prev, ...cheerMap }));
            }
          }
        }

        const actRes = await fetch(`${API_BASE}/api/activity`);
        if (actRes.ok) {
          const actData = await actRes.json();
          if (Array.isArray(actData)) {
            setClubActivity(actData);
          }
        }
      } catch (err) {
        console.log("Could not fetch live tournament / avatars / registered users / activity:", err);
      }
    };
    fetchLiveAndAvatars();
  }, [API_BASE]);

  const handleCopyEmail = (email, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const handleToggleFollow = async (targetEmail, targetName, e) => {
    if (e) e.stopPropagation();
    if (!loggedInEmail) {
      alert("Please log in with your Zewail City account to follow tacticians!");
      window.location.href = "/?login=true";
      return;
    }
    const current = !!followingState[targetEmail];
    setFollowingState(prev => ({ ...prev, [targetEmail]: !current }));

    try {
      await fetch(`${API_BASE}/api/users/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerEmail: loggedInEmail, targetEmail })
      });
    } catch (err) {
      console.warn("Follow toggle warning:", err.message);
    }
  };

  const handleQuickCheer = async (name, email, e) => {
    e.stopPropagation();
    // Optimistic update
    setTacticianCheers((prev) => ({
      ...prev,
      [name]: (prev[name] || 0) + 1,
    }));
    setCheerBursts((prev) => ({ ...prev, [name]: true }));
    setTimeout(() => {
      setCheerBursts((prev) => ({ ...prev, [name]: false }));
    }, 1200);

    // Persist to server
    if (email) {
      try {
        const res = await fetch(`${API_BASE}/api/users/cheer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetEmail: email,
            cheererEmail: loggedInEmail || '',
            cheererName: localStorage.getItem('userName') || ''
          })
        });
        if (res.ok) {
          const data = await res.json();
          // Update with confirmed server count
          if (typeof data.cheers === 'number') {
            setTacticianCheers(prev => ({ ...prev, [name]: data.cheers }));
          }
        }
      } catch (err) {
        console.warn('Cheer sync failed:', err.message);
      }
    }
  };

  const handleOpenTacticianModal = (tactician) => {
    setSelectedTactician(tactician);
    setTacticianModalOpen(true);
    setChallengeSent(false);
    setModalCheered(false);
  };

  const handleModalCheer = async () => {
    if (!selectedTactician) return;
    const name = selectedTactician.name;
    const email = selectedTactician.email;
    // Optimistic update
    setTacticianCheers((prev) => ({
      ...prev,
      [name]: (prev[name] || 0) + 1,
    }));
    setModalCheered(true);
    setTimeout(() => setModalCheered(false), 2000);

    // Persist to server
    if (email) {
      try {
        const res = await fetch(`${API_BASE}/api/users/cheer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetEmail: email,
            cheererEmail: loggedInEmail || '',
            cheererName: localStorage.getItem('userName') || ''
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.cheers === 'number') {
            setTacticianCheers(prev => ({ ...prev, [name]: data.cheers }));
          }
        }
      } catch (err) {
        console.warn('Modal cheer sync failed:', err.message);
      }
    }
  };

  const handleSendChallenge = async (e) => {
    e.preventDefault();
    setChallengeSent(true);
    if (selectedTactician?.email) {
      try {
        await fetch(`${API_BASE}/api/challenges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromEmail: loggedInEmail || "guest@zcchessclub.com",
            fromName: localStorage.getItem("userName") || (loggedInEmail ? loggedInEmail.split("@")[0] : "Campus Visitor"),
            targetEmail: selectedTactician.email,
            timeControl: challengeTimeControl,
            location: challengeLocation,
            message: `Challenge dispatched from Home Page showcase for a ${challengeTimeControl} match at ${challengeLocation}.`
          })
        });
      } catch (err) {
        console.warn("Could not record challenge:", err.message);
      }
    }
  };


  const campusTacticians = registeredUsers.map((u) => {
    const emailKey = (u.email || "").toLowerCase().trim();
    const fideRating = u.fideRating || 0;
    const chessComRating = u.chessComRating || 0;
    const lichessRating = u.lichessRating || 0;
    const topRating = Math.max(fideRating, chessComRating, lichessRating);

    const title = u.chessTitle || (u.role === "admin" ? "Chief Club Administrator" : (u.role === "hr" ? "HR & Operations Lead" : (u.role === "oc" ? "Organizing Committee" : "Club Tactician")));
    const category = (u.role === "admin" || u.role === "hr" || u.role === "oc") ? "leaders" : (topRating >= 1800 ? "champions" : "competitors");
    const badge = u.chessTitle 
      ? `👑 ${u.chessTitle}` 
      : (u.role === "admin" 
          ? "👑 Club Leadership" 
          : (u.role === "hr" 
              ? "📋 Executive Board" 
              : (u.role === "oc" 
                  ? "⚡ Organizing Committee" 
                  : (topRating > 0 ? `⚡ ${topRating} Elo` : "♟️ Verified Member"))));

    return {
      name: u.name || emailKey.split("@")[0],
      email: u.email,
      role: u.role || "member",
      title,
      category,
      badge,
      fideRating,
      chessComRating,
      lichessRating,
      topRating,
      major: u.major || "Zewail City",
      batch: u.batch || "ZC",
      opening: u.favOpening || "",
      favOpening: u.favOpening || "",
      bio: u.bio || "",
      cheers: tacticianCheers[u.name] ?? u.cheers ?? 0,
      followers: u.followers || [],
      following: u.following || [],
      verified: u.verified !== undefined ? u.verified : true,
      profileImage: u.profileImage || ""
    };
  });

  const filteredTacticians = campusTacticians.filter((t) => {
    if (tacticiansFilter === "champions") return t.category === "champions";
    if (tacticiansFilter === "leaders") return t.category === "leaders";
    if (tacticiansFilter === "competitors") return t.category === "competitors";
    return true;
  });


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
      isTeam: true,
      winners: [
        {
          name: "Knights",
          place: "🥇 Champions",
          medal: "gold",
          image: "/Teams/25/Knights.png",
          logoBg: "#0d0b09",
          detail: "Ahmed Elkodariy, Omar Hafez, Omar Ezz",
          members: [
            { name: "Ahmed Elkodariy", image: "/Winners/AhmedElkodariy.PNG", board: "Board 1" },
            { name: "Omar Hafez", image: "/Winners/OmarHafez.jpeg", board: "Board 2" },
            { name: "Omar Ezz", image: "/Winners/OmarEzz.jpg", board: "Board 3" }
          ]
        },
        {
          name: "Gambling",
          place: "🥈 Runners-up",
          medal: "silver",
          image: "/Teams/25/Gambling.png",
          logoBg: "#f8f9fa",
          detail: "Abdelrahman Mohamed, Abdelrahman Mane3, Mohamed Eslam",
          members: [
            { name: "Abdelrahman Mohamed", image: "/Winners/AbdelrahmanMohamed.png", board: "Board 1" },
            { name: "Abdelrahman Mane3", image: "/Winners/AbdelrahmanMane3.png", board: "Board 2" },
            { name: "Mohamed Eslam", image: "/Winners/MohamedEslam.png", board: "Board 3" }
          ]
        },
        {
          name: "Epsilon",
          place: "🥉 3rd Place",
          medal: "bronze",
          image: "/Teams/25/Epsilon.png",
          logoBg: "#f8f9fa",
          detail: "NourEldin Newer, Amr Khaled, Youssef Yasser",
          members: [
            { name: "NourEldin Newer", image: "/Winners/NourEldinNewer.png", board: "Board 1" },
            { name: "Amr Khaled", image: "/Winners/AmrKhaled.jpg", board: "Board 2" },
            { name: "Youssef Yasser", image: "/Winners/YoussefYasser.jpg", board: "Board 3" }
          ]
        }
      ]
    }
  ];

  const activeTournament = recentTournaments[activeTournamentIndex] || recentTournaments[0];

  const liveMatch = liveTournament && liveTournament.matches 
    ? (liveTournament.matches.find((m) => m.round === (liveTournament.currentRound || 3) && m.result === "Pending") || liveTournament.matches[0])
    : { white: "Bosy Ayman", black: "Omar Ezz", round: 3 };

  return (
    <div className="homepage">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* 👑 Executive Administrator Mode Active Ribbon */}
      {isAdmin && (
        <div className="home-admin-ribbon">
          <div className="admin-ribbon-left">
            <span className="admin-ribbon-badge">
              <Crown size={14} /> Executive Admin
            </span>
            <span className="admin-ribbon-text">
              Active Administrator: <strong>{loggedInEmail || "admin@zcchessclub.com"}</strong>. You have full oversight over all tactician dossiers, pairings & roles.
            </span>
          </div>
          <div className="admin-ribbon-links">
            <a href="/profile" className="admin-ribbon-btn">
              Admin Profile &amp; Inbox
            </a>
            <a href="/createtournament" className="admin-ribbon-btn highlight">
              + Create Championship
            </a>
          </div>
        </div>
      )}

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

      {/* 🔴 Live Running Tournament Banner */}
      {liveTournament && (
        <section className="live-tourney-banner-section">
          <div className="live-tourney-container">
            <div className="live-tourney-left">
              <div className="live-pulse-badge">
                <span className="live-pulse-dot"></span>
                <span className="live-pulse-text">LIVE TOURNAMENT IN PROGRESS</span>
              </div>
              <h2 className="live-tourney-heading">
                {liveTournament.title || liveTournament.name || "King's Quest IV Championship"}
              </h2>
              <div className="live-tourney-submeta">
                <span className="live-round-badge">
                  ⚔️ Round {liveTournament.currentRound || 3} Active
                </span>
                <span className="live-system-badge">
                  {liveTournament.type || "Swiss System"}
                </span>
                <span className="live-venue-badge">
                  <MapPin size={12} /> {liveTournament.location || "Academic Building Lounge"}
                </span>
              </div>
            </div>

            <div className="live-tourney-center">
              <div className="live-board-preview-card">
                <span className="live-board-header-tag">BOARD 1 • FEATURED CLASH</span>
                <div className="live-board-players-row">
                  <div className="live-player-cell live-player-white">
                    <div className="live-avatar-frame">
                      <img 
                        src={getPlayerAvatarUrl(liveMatch?.white || "Bosy Ayman", customAvatars)} 
                        alt={liveMatch?.white || "White"} 
                        className="live-avatar-img"
                        onError={(e) => { e.target.src = "/Icons/unknown.png"; }}
                      />
                      <span className="live-color-indicator white-indicator" title="Playing White">⚪</span>
                    </div>
                    <span className="live-player-name">{liveMatch?.white || "Bosy Ayman"}</span>
                    <span className="live-player-score">White • Round {liveTournament.currentRound || 3}</span>
                  </div>

                  <div className="live-vs-divider">
                    <span className="live-swords-icon">⚔️</span>
                    <span className="live-vs-text">VS</span>
                  </div>

                  <div className="live-player-cell live-player-black">
                    <div className="live-avatar-frame">
                      <img 
                        src={getPlayerAvatarUrl(liveMatch?.black || "Abdelrahman Mohamed", customAvatars)} 
                        alt={liveMatch?.black || "Black"} 
                        className="live-avatar-img"
                        onError={(e) => { e.target.src = "/Icons/unknown.png"; }}
                      />
                      <span className="live-color-indicator black-indicator" title="Playing Black">⚫</span>
                    </div>
                    <span className="live-player-name">{liveMatch?.black || "Abdelrahman Mohamed"}</span>
                    <span className="live-player-score">Black • Round {liveTournament.currentRound || 3}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="live-tourney-right">
              <a 
                href={`/tournamentdetails?id=${liveTournament._id || '6aa0079fa457e9dc7b1adac1'}`} 
                className="live-tourney-cta-btn"
              >
                <span>Watch Live Standings & Bracket</span>
                <ExternalLink size={16} />
              </a>
              <span className="live-players-status">
                <Users size={13} /> {liveTournament.players || (liveTournament.playersList ? liveTournament.playersList.length : 10)} Tacticians Competing Now
              </span>
            </div>
          </div>
        </section>
      )}

      <div className="section-divider" />

      {/* Player of the Month Spotlight */}
      {/* <section className="potm-section" id="spotlight">
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
               <blockquote className="potm-quote">
                "Preparation in the opening is key, but adaptability in the middlegame is what truly wins tournaments."
              </blockquote> 
              <div className="potm-achievements">
                <span className="potm-achievement-tag">🥇 5x Champion</span>
                <span className="potm-achievement-tag">⚡ Blitz Specialist</span>
              </div>
            </div>
          </div>
        </div>
      </section> */}

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
        <div className={`podium-showcase-grid ${activeTournament.isTeam ? "podium-showcase-grid--teams" : ""}`}>
          {activeTournament.winners.map((winner, wIdx) => {
            const isGold = winner.medal === "gold";
            const isSilver = winner.medal === "silver";
            const isTeamCard = !!(activeTournament.isTeam || winner.members);
            
            return (
              <div 
                key={wIdx} 
                className={`podium-card podium-card--${winner.medal} ${isGold ? "podium-card--gold" : ""} ${isTeamCard ? "podium-card--team" : ""}`}
              >
                <div className="podium-card-main">
                  <div 
                    className={`podium-avatar-wrapper ${isTeamCard ? "podium-avatar-wrapper--team" : ""}`}
                    style={isTeamCard && winner.logoBg ? { background: winner.logoBg } : {}}
                  >
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
                    {!isTeamCard && <p className="podium-detail">{winner.detail}</p>}
                  </div>
                </div>

                {isTeamCard && winner.members && (
                  <div className="podium-team-roster">
                    <div className="podium-roster-header">
                      <Users size={12} className="podium-roster-icon" />
                      <span>Squad Roster</span>
                    </div>
                    <div className="podium-members-list">
                      {winner.members.map((member, mIdx) => (
                        <div key={mIdx} className="podium-member-chip">
                          <div className="podium-member-chip-left">
                            <img
                              src={member.image}
                              alt={member.name}
                              className="podium-member-avatar"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/Icons/unknown.png";
                              }}
                            />
                            <span className="podium-member-name">{member.name}</span>
                          </div>
                          <span className="podium-member-board">{member.board}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {/* 👥 ZC Chess Club Community — Interactive Member Roster & Social Feed */}
      <section className="tacticians-section" id="players">
        <div className="tacticians-header">
          <div className="tacticians-badge">
            <Users size={14} />
            <span>ZC Chess Community</span>
          </div>
          <h2>ZC Chess Club Community</h2>
          <p className="tacticians-subtitle">
            Connect with fellow campus chess players, follow your peers, challenge members to 1-on-1 matches, and celebrate tournament champions!
          </p>
        </div>

        {/* Live Club Activity & Winner Feed */}
        {clubActivity.length > 0 && (
          <div className="club-activity-feed-wrapper">
            <div className="activity-feed-pill">
              <span className="live-dot" />
              <span className="feed-title">Club Feed</span>
            </div>
            <div className="activity-feed-slider">
              {clubActivity.map((act, i) => (
                <div key={act.id || i} className="activity-feed-chip">
                  <span className={`act-type-tag ${act.type}`}>
                    {act.badge}
                  </span>
                  <span className="act-title">{act.title}</span>
                  <span className="act-desc">{act.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="tacticians-filter-bar">
          <button 
            className={`tactician-filter-btn ${tacticiansFilter === "all" ? "active" : ""}`}
            onClick={() => setTacticiansFilter("all")}
          >
            All Members ({campusTacticians.length})
          </button>
          <button 
            className={`tactician-filter-btn ${tacticiansFilter === "champions" ? "active" : ""}`}
            onClick={() => setTacticiansFilter("champions")}
          >
            🏆 Campus Champions
          </button>
          <button 
            className={`tactician-filter-btn ${tacticiansFilter === "leaders" ? "active" : ""}`}
            onClick={() => setTacticiansFilter("leaders")}
          >
            👑 Club Leadership
          </button>
          <button 
            className={`tactician-filter-btn ${tacticiansFilter === "competitors" ? "active" : ""}`}
            onClick={() => setTacticiansFilter("competitors")}
          >
            ⚡ Active Players
          </button>
        </div>

        {/* Tacticians Grid */}
        <div className="tacticians-grid">
          {filteredTacticians.length > 0 ? (
            filteredTacticians.map((player, idx) => {
              const isSelf = loggedInEmail && player.email && player.email.toLowerCase() === loggedInEmail.toLowerCase();
              return (
                <div 
                  key={player.email || idx} 
                  className={`tactician-card premium-card ${isSelf ? "is-self-card" : ""}`}
                  onClick={() => handleOpenTacticianModal(player)}
                >
                  <div className="tactician-card-header">
                    <div className="tactician-avatar-wrap">
                      <img 
                        src={player.profileImage || getPlayerAvatarUrl(player.name, customAvatars)} 
                        alt={player.name}
                        className="tactician-avatar-img"
                        onError={(e) => { e.target.src = "/Icons/unknown.png"; }}
                      />
                      <span className="tactician-rating-badge">{player.topRating > 0 ? player.topRating : (player.chessTitle || "ZC")}</span>
                    </div>

                    <div className="tactician-header-meta">
                      {isSelf ? (
                        <span className="tactician-badge-pill self-pill">✨ You</span>
                      ) : (
                        <span className="tactician-badge-pill">{player.badge}</span>
                      )}
                      {player.email && (
                        <span 
                          className="tactician-email-chip" 
                          onClick={(e) => handleCopyEmail(player.email, e)}
                          title={`Click to copy ${player.email}`}
                        >
                          <Mail size={11} />
                          <span>{player.email.split('@')[0]}</span>
                          {copiedEmail === player.email ? <Check size={10} className="copy-ok" /> : <Copy size={10} />}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="tactician-body">
                    <div className="tactician-title-row">
                      <h3 className="tactician-name">{player.name}</h3>
                      {isAdmin && (
                        <a 
                          href={`/profile?email=${encodeURIComponent(player.email)}`}
                          className="tactician-card-admin-pill"
                          onClick={(e) => e.stopPropagation()}
                          title="Admin Controls"
                        >
                          <Crown size={11} /> Admin
                        </a>
                      )}
                    </div>
                    <p className="tactician-title">{player.title}</p>
                    <span className="tactician-major-tag">{player.major}</span>

                    <div className="tactician-opening-box">
                      <span className="opening-label">Fav. Opening:</span>
                      <span className="opening-val">{player.favOpening || player.opening || "Flexible"}</span>
                    </div>
                  </div>

                  <div className="tactician-card-footer" onClick={(e) => e.stopPropagation()}>
                    {isSelf ? (
                      <a 
                        href="/profile"
                        className="tactician-self-profile-btn"
                        title="Manage your profile and view your challenge invitations"
                      >
                        <User size={14} />
                        <span>Manage My Profile</span>
                      </a>
                    ) : (
                      <>
                        <button 
                          className={`tactician-cheer-btn ${cheerBursts[player.name] ? "bursting" : ""}`}
                          onClick={(e) => handleQuickCheer(player.name, player.email, e)}
                          title="Send a cheer to this player"
                        >
                          <Heart size={14} className={cheerBursts[player.name] ? "fill-heart" : ""} />
                          <span>{tacticianCheers[player.name] ?? 0}</span>
                        </button>

                        <button 
                          className={`tactician-follow-btn ${followingState[player.email] ? "active" : ""}`}
                          onClick={(e) => handleToggleFollow(player.email, player.name, e)}
                          title={followingState[player.email] ? "Following" : "Follow"}
                        >
                          {followingState[player.email] ? (
                            <>
                              <UserCheck size={13} />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={13} />
                              <span>Follow</span>
                            </>
                          )}
                        </button>

                        <button 
                          className="tactician-challenge-direct-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTacticianModal(player);
                          }}
                          title={`Challenge ${player.name} to a 1-on-1 match`}
                        >
                          <Swords size={13} />
                          <span>Duel</span>
                        </button>

                        <a 
                          href={`/profile?email=${encodeURIComponent(player.email)}`}
                          className="tactician-connect-btn"
                          title="View Full Profile & Dossier"
                        >
                          <span>Profile</span>
                          <ExternalLink size={12} />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-tacticians-notice glass-panel" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
              <p style={{ fontSize: "1.1rem", marginBottom: "8px", color: "#f8fafc" }}>No registered tacticians in this category.</p>
              <p style={{ fontSize: "0.9rem" }}>Players will automatically appear here once they create their website account!</p>
            </div>
          )}
        </div>

        {/* Explore Full Community CTA */}
        <div className="community-explore-cta-container">
          <a href="/community" className="btn-explore-full-community">
            <Users size={18} />
            <span>Explore Full Community &amp; Member Directory ({registeredUsers.length}) ➔</span>
          </a>
        </div>
      </section>

      {/* ♟️ Interactive Player Profile & Challenge Modal */}
      {tacticianModalOpen && selectedTactician && (
        <div className="tactician-modal-overlay" onClick={() => setTacticianModalOpen(false)}>
          <div className="tactician-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="tactician-modal-close" 
              onClick={() => setTacticianModalOpen(false)}
              aria-label="Close Profile"
            >
              ✕
            </button>

            {modalCheered && (
              <Confetti width={width} height={height} recycle={false} numberOfPieces={80} />
            )}

            <div className="tactician-modal-header">
              <div className="tactician-modal-avatar-frame">
                <img 
                  src={selectedTactician.profileImage || getPlayerAvatarUrl(selectedTactician.name, customAvatars)} 
                  alt={selectedTactician.name} 
                  className="tactician-modal-avatar"
                  onError={(e) => { e.target.src = "/Icons/unknown.png"; }}
                />
                <span className="tactician-modal-glow"></span>
              </div>
              <div className="tactician-modal-hero-info">
                <div className="tactician-modal-badge">{selectedTactician.badge}</div>
                <h2 className="tactician-modal-name">{selectedTactician.name}</h2>
                <p className="tactician-modal-title">{selectedTactician.title}</p>
                
                {/* Email Display with Copy */}
                {selectedTactician.email && (
                  <div 
                    className="modal-email-chip" 
                    onClick={() => handleCopyEmail(selectedTactician.email)}
                    title="Click to copy student email"
                  >
                    <Mail size={13} />
                    <span>{selectedTactician.email}</span>
                    {copiedEmail === selectedTactician.email ? (
                      <span className="copy-tag ok"><Check size={11} /> Copied!</span>
                    ) : (
                      <span className="copy-tag"><Copy size={11} /> Copy</span>
                    )}
                  </div>
                )}

                <div className="tactician-modal-chips-row">
                  <span className="modal-chip"><MapPin size={11} /> ZC Campus</span>
                  <span className="modal-chip">{selectedTactician.major}</span>
                  <span className="modal-chip">Class of {selectedTactician.batch}</span>
                </div>
              </div>
            </div>

            {/* Direct Profile Link Row */}
            <div className="tactician-modal-links-bar">
              <a 
                href={`/profile?email=${encodeURIComponent(selectedTactician.email)}`}
                className="btn-modal-full-profile"
              >
                <span>View Full Profile, Tournaments &amp; Accolades ➔</span>
              </a>

              {isAdmin && (
                <a 
                  href={`/profile?email=${encodeURIComponent(selectedTactician.email)}`}
                  className="btn-modal-admin-ctrl"
                >
                  <Crown size={14} />
                  <span>Admin Controls (Manage User)</span>
                </a>
              )}
            </div>

            {/* Ratings & Real Profile Stats Strip */}
            <div className="tactician-modal-stats-grid">
              <div className="modal-stat-box">
                <span className="modal-stat-num">{selectedTactician.fideRating > 0 ? selectedTactician.fideRating : "—"}</span>
                <span className="modal-stat-label">FIDE Elo</span>
              </div>
              <div className="modal-stat-box">
                <span className="modal-stat-num">{selectedTactician.chessComRating > 0 ? selectedTactician.chessComRating : "—"}</span>
                <span className="modal-stat-label">Chess.com</span>
              </div>
              <div className="modal-stat-box">
                <span className="modal-stat-num">{selectedTactician.lichessRating > 0 ? selectedTactician.lichessRating : "—"}</span>
                <span className="modal-stat-label">Lichess</span>
              </div>
              <div className="modal-stat-box">
                <span className="modal-stat-num">{(selectedTactician.followers || []).length}</span>
                <span className="modal-stat-label">Followers</span>
              </div>
            </div>

            {/* Bio & Tactical Details */}
            <div className="tactician-modal-section">
              <h4>Tactical Profile &amp; Bio</h4>
              <p className="tactician-modal-bio">{selectedTactician.bio || "Active registered tactician of Zewail City Chess Club."}</p>
              
              <div className="tactician-attributes-row">
                <div className="attribute-item">
                  <span className="attr-label">Signature Opening:</span>
                  <span className="attr-val">{selectedTactician.favOpening || selectedTactician.opening || "Flexible Openings"}</span>
                </div>
                <div className="attribute-item">
                  <span className="attr-label">Campus Role:</span>
                  <span className="attr-val">{selectedTactician.title || "Club Tactician"}</span>
                </div>
              </div>
            </div>

            {/* Cheer & Challenge Actions */}
            <div className="tactician-modal-actions-box">
              <div className="tactician-cheer-action-row">
                <button 
                  className={`modal-cheer-cta ${modalCheered ? "active" : ""}`}
                  onClick={handleModalCheer}
                >
                  <Heart size={16} className={modalCheered ? "fill-heart" : ""} />
                  <span>Cheer for {selectedTactician.name.split(' ')[0]} ({tacticianCheers[selectedTactician.name] || 0})</span>
                </button>
                <span className="cheer-hint">Cheer on your campus friends!</span>
              </div>

              {/* Challenge Form */}
              <div className="tactician-challenge-form-wrapper">
                <h4 className="challenge-form-title">
                  <Swords size={16} />
                  <span>Send a Friendly Campus Challenge</span>
                </h4>

                {challengeSent ? (
                  <div className="challenge-sent-alert">
                    <CheckCircle2 size={24} className="challenge-check-icon" />
                    <div>
                      <h5>Challenge Invitation Recorded!</h5>
                      <p>An in-app invitation for a {challengeTimeControl} match at {challengeLocation} has been delivered to {selectedTactician.name}'s account.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendChallenge} className="campus-challenge-form">
                    <div className="challenge-inputs-row">
                      <div className="challenge-input-group">
                        <label>Time Control</label>
                        <select 
                          value={challengeTimeControl} 
                          onChange={(e) => setChallengeTimeControl(e.target.value)}
                        >
                          <option value="3+2 Blitz">⚡ 3+2 Blitz</option>
                          <option value="5+3 Blitz">⚡ 5+3 Blitz</option>
                          <option value="10+0 Rapid">⏱️ 10+0 Rapid</option>
                          <option value="15+10 Rapid">⏱️ 15+10 Rapid</option>
                          <option value="30+0 Classical">🏛️ 30+0 Classical</option>
                        </select>
                      </div>

                      <div className="challenge-input-group">
                        <label>Campus Venue</label>
                        <select 
                          value={challengeLocation} 
                          onChange={(e) => setChallengeLocation(e.target.value)}
                        >
                          <option value="Academic Building Lounge">Academic Building Lounge</option>
                          <option value="Zone E Chess Corner">Zone E Chess Corner</option>
                          <option value="Student Union Courtyard">Student Union Courtyard</option>
                          <option value="Online (Chess.com / Lichess)">Online (Chess.com / Lichess)</option>
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="challenge-submit-btn">
                      <Send size={15} />
                      <span>Issue Campus Challenge</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}



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

      {/* Location Section
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
      </section> */}

      <Footer />
    </div>
  );
};

export default HomePage;
