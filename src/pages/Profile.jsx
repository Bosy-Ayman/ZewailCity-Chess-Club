import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { safeFetchJson, safeSetLocalStorage, compressImage } from "../utils/api";
import { getUserTournamentAchievements, getHistoricalTournamentsForUser, ALL_HISTORICAL_PLAYERS } from "../utils/tournamentWinners";
import { 
  Trophy, 
  Award, 
  Shield, 
  Swords, 
  Star, 
  Copy, 
  Check, 
  ExternalLink, 
  Camera, 
  Settings, 
  Mail, 
  Phone, 
  BookOpen, 
  Crown, 
  Flame, 
  Share2, 
  Sparkles, 
  User, 
  Calendar, 
  Hash, 
  Target, 
  ChevronRight,
  Lock,
  Compass,
  CheckCircle2,
  Clock,
  UserPlus,
  UserCheck,
  Send,
  Heart,
  X,
  Search,
  Users,
  Plus
} from "lucide-react";
import "./Profile.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Profile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const queryParams = new URLSearchParams(window.location.search);
  const queryEmail = queryParams.get("email");
  const queryName = queryParams.get("name");
  
  const loggedInEmail = localStorage.getItem("adminEmail") || "";
  const loggedInRole = localStorage.getItem("userRole") || "member";
  const isAdmin = loggedInRole === "admin" || (loggedInEmail && loggedInEmail.toLowerCase() === "admin@zcchessclub.com");
  
  const targetEmail = queryEmail || (queryName ? null : loggedInEmail);
  const isOwnProfile = (!queryEmail && !queryName) || (queryEmail && loggedInEmail && queryEmail.toLowerCase() === loggedInEmail.toLowerCase());

  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'tournaments' | 'challenges' | 'settings' | 'admin'

  const [profile, setProfile] = useState(() => {
    if (isOwnProfile && loggedInEmail) {
      const cachedAvatar = localStorage.getItem("userAvatar");
      const cachedName = localStorage.getItem("userName");
      const cachedRole = localStorage.getItem("userRole");
      return {
        email: loggedInEmail,
        name: cachedName || loggedInEmail.split("@")[0],
        role: cachedRole || "member",
        profileImage: (cachedAvatar && cachedAvatar !== "null" && cachedAvatar !== "undefined") ? cachedAvatar : ""
      };
    }
    return null;
  });

  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(!profile);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState(null);

  // Social Following & Challenge State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [networkModalTab, setNetworkModalTab] = useState("followers"); // 'followers' | 'following'
  const [networkSearch, setNetworkSearch] = useState("");
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);
  const [challenges, setChallenges] = useState([]);
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [challengeTimeControl, setChallengeTimeControl] = useState("3+2 Blitz");
  const [challengeLocation, setChallengeLocation] = useState("Academic Building Lounge");
  const [challengeMessage, setChallengeMessage] = useState("");
  const [challengeSuccess, setChallengeSuccess] = useState("");
  const [cheered, setCheered] = useState(false);
  const [cheerCount, setCheerCount] = useState(38);

  // Admin Management State
  const [adminRoleForm, setAdminRoleForm] = useState({
    name: "",
    idNumber: "",
    phone: "",
    major: "",
    batch: "",
    fideRating: 0,
    fideId: "",
    chessComUsername: "",
    chessComRating: 0,
    lichessUsername: "",
    lichessRating: 0,
    favOpening: "",
    chessTitle: "",
    bio: "",
    role: "member",
    clubRoles: []
  });
  const [newRoleDept, setNewRoleDept] = useState("Human Resources");
  const [newRolePos, setNewRolePos] = useState("Head");
  const [adminSaveSuccess, setAdminSaveSuccess] = useState("");
  const [adminSaveError, setAdminSaveError] = useState("");

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    name: localStorage.getItem("userName") || "",
    phone: "",
    idNumber: "",
    major: "",
    batch: "",
    chessTitle: "",
    favOpening: "",
    bio: "",
    fideRating: 0,
    fideId: "",
    chessComUsername: "",
    chessComRating: 0,
    lichessUsername: "",
    lichessRating: 0,
    linkedHistoricalName: "",
    password: "",
    confirmPassword: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!targetEmail && !queryName) {
      window.location.href = "/?login=true";
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetEmail, queryName]);

  const fetchData = async () => {
    if (!profile) setIsLoading(true);
    try {
      const fetchUrl = targetEmail 
        ? `${API_BASE}/api/profile?email=${encodeURIComponent(targetEmail)}&viewerEmail=${encodeURIComponent(loggedInEmail)}`
        : `${API_BASE}/api/profile?name=${encodeURIComponent(queryName)}&viewerEmail=${encodeURIComponent(loggedInEmail)}`;

      const profData = await safeFetchJson(fetchUrl);
      setProfile(profData);
      setIsFollowing(!!profData.isFollowing);
      setFollowersCount(profData.followersCount || 0);
      setFollowingCount(profData.followingCount || 0);
      setFollowersList(profData.followersList || []);
      setFollowingList(profData.followingList || []);
      setChallenges(profData.challenges || []);
      setAdminRoleForm({
        name: profData.name || "",
        idNumber: profData.idNumber || "",
        phone: profData.phone || "",
        major: profData.major || "",
        batch: profData.batch || "",
        fideRating: profData.fideRating || 0,
        fideId: profData.fideId || "",
        chessComUsername: profData.chessComUsername || "",
        chessComRating: profData.chessComRating || 0,
        lichessUsername: profData.lichessUsername || "",
        lichessRating: profData.lichessRating || 0,
        favOpening: profData.favOpening || "",
        chessTitle: profData.chessTitle || "",
        bio: profData.bio || "",
        role: profData.role || "member",
        clubRoles: Array.isArray(profData.clubRoles) ? profData.clubRoles : []
      });

      if (isOwnProfile && profData) {
        setSettingsForm({
          name: profData.name || "",
          phone: profData.phone || "",
          idNumber: profData.idNumber || "",
          major: profData.major || "",
          batch: profData.batch || "",
          chessTitle: profData.chessTitle || "",
          favOpening: profData.favOpening || "",
          bio: profData.bio || "",
          fideRating: profData.fideRating || 0,
          fideId: profData.fideId || "",
          chessComUsername: profData.chessComUsername || "",
          chessComRating: profData.chessComRating || 0,
          lichessUsername: profData.lichessUsername || "",
          lichessRating: profData.lichessRating || 0,
          linkedHistoricalName: profData.linkedHistoricalName || "",
          password: "",
          confirmPassword: ""
        });

        if (profData.name) {
          safeSetLocalStorage("userName", profData.name);
          window.dispatchEvent(new Event("userNameUpdated"));
        }
        if (profData.profileImage) {
          safeSetLocalStorage("userAvatar", profData.profileImage);
          window.dispatchEvent(new Event("userAvatarUpdated"));
        }
      }

      // Fetch User's Tournaments
      try {
        const tourEmail = profData.email || targetEmail;
        const tourData = await safeFetchJson(`${API_BASE}/api/users/${encodeURIComponent(tourEmail)}/tournaments`);
        setTournaments(tourData || []);
      } catch (tErr) {
        setTournaments([]);
      }
    } catch (err) {
      if (!profile) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB");
      return;
    }

    try {
      const compressedBase64 = await compressImage(file, 250, 250, 0.75);

      // Instant 0ms visual update in local state & cache
      setProfile(prev => ({ ...prev, profileImage: compressedBase64 }));
      safeSetLocalStorage("userAvatar", compressedBase64);
      window.dispatchEvent(new Event("userAvatarUpdated"));

      // Background DB sync
      try {
        const data = await safeFetchJson(`${API_BASE}/api/profile/image`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: profile?.email || loggedInEmail, profileImage: compressedBase64 })
        });
        if (data?.profileImage) {
          setProfile(prev => ({ ...prev, profileImage: data.profileImage }));
          safeSetLocalStorage("userAvatar", data.profileImage);
          window.dispatchEvent(new Event("userAvatarUpdated"));
        }
      } catch (saveErr) {
        console.warn("Background profile image save warning:", saveErr.message);
      }
    } catch (err) {
      alert("Error processing image: " + err.message);
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettingsForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveSuccess("");
    setSaveError("");

    if (settingsForm.password && settingsForm.password !== settingsForm.confirmPassword) {
      setSaveError("Passwords do not match!");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        email: loggedInEmail,
        name: settingsForm.name,
        phone: settingsForm.phone,
        idNumber: settingsForm.idNumber,
        major: settingsForm.major,
        batch: settingsForm.batch,
        chessTitle: settingsForm.chessTitle,
        favOpening: settingsForm.favOpening,
        bio: settingsForm.bio,
        fideRating: Number(settingsForm.fideRating) || 0,
        fideId: settingsForm.fideId,
        chessComUsername: settingsForm.chessComUsername,
        chessComRating: Number(settingsForm.chessComRating) || 0,
        lichessUsername: settingsForm.lichessUsername,
        lichessRating: Number(settingsForm.lichessRating) || 0,
        linkedHistoricalName: settingsForm.linkedHistoricalName || "",
      };

      if (settingsForm.password.trim()) {
        payload.password = settingsForm.password.trim();
      }

      let res;
      try {
        res = await safeFetchJson(`${API_BASE}/api/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (putErr) {
        res = await safeFetchJson(`${API_BASE}/api/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res?.user) {
        setProfile(prev => ({
          ...prev,
          ...res.user,
          linkedHistoricalName: settingsForm.linkedHistoricalName || ""
        }));
        if (res.user.name) {
          safeSetLocalStorage("userName", res.user.name);
          window.dispatchEvent(new Event("userNameUpdated"));
        }
      }

      // Re-fetch all data to ensure badges, tournament records, and network reload fresh
      await fetchData();

      const linkedName = settingsForm.linkedHistoricalName;
      if (linkedName) {
        setSaveSuccess(`Profile updated! Successfully linked to historical record "${linkedName}".`);
      } else {
        setSaveSuccess("Profile & chess ratings updated successfully!");
      }
      setSettingsForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
      setTimeout(() => setSaveSuccess(""), 6000);
    } catch (err) {
      setSaveError(err.message || "Failed to update profile settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!loggedInEmail) {
      alert("Please log in with your Zewail City account to follow tacticians!");
      window.location.href = "/?login=true";
      return;
    }
    const current = isFollowing;
    setIsFollowing(!current);
    setFollowersCount(prev => Math.max(0, prev + (current ? -1 : 1)));

    try {
      const res = await safeFetchJson(`${API_BASE}/api/users/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerEmail: loggedInEmail,
          targetEmail: profile.email
        })
      });
      setIsFollowing(res.isFollowing);
      setFollowersCount(res.followersCount);
    } catch (err) {
      setIsFollowing(current);
      alert(err.message);
    }
  };

  const handleOpenNetworkModal = async (tab = "followers") => {
    setNetworkModalTab(tab);
    setNetworkSearch("");
    setNetworkModalOpen(true);
    if (profile?.email) {
      setIsNetworkLoading(true);
      try {
        const netData = await safeFetchJson(`${API_BASE}/api/users/${encodeURIComponent(profile.email)}/network`);
        if (netData) {
          const freshFollowers = Array.isArray(netData.followers) ? netData.followers : [];
          const freshFollowing = Array.isArray(netData.following) ? netData.following : [];
          setFollowersList(freshFollowers);
          setFollowersCount(freshFollowers.length);
          setFollowingList(freshFollowing);
          setFollowingCount(freshFollowing.length);
        }
      } catch (err) {
        console.warn("Could not refresh live network:", err);
      } finally {
        setIsNetworkLoading(false);
      }
    }
  };

  const handleNetworkFollowToggle = async (targetEmail) => {
    if (!loggedInEmail) {
      window.location.href = "/?login=true";
      return;
    }
    const cleanTarget = targetEmail.toLowerCase();
    try {
      await safeFetchJson(`${API_BASE}/api/users/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerEmail: loggedInEmail, targetEmail: cleanTarget })
      });
      // Refresh network lists & counts
      if (profile?.email) {
        const netData = await safeFetchJson(`${API_BASE}/api/users/${encodeURIComponent(profile.email)}/network`);
        if (netData) {
          const freshFollowers = Array.isArray(netData.followers) ? netData.followers : [];
          const freshFollowing = Array.isArray(netData.following) ? netData.following : [];
          setFollowersList(freshFollowers);
          setFollowersCount(freshFollowers.length);
          setFollowingList(freshFollowing);
          setFollowingCount(freshFollowing.length);
        }
      }
    } catch (err) {
      alert("Follow failed: " + err.message);
    }
  };

  const handleSendDirectChallenge = async (e) => {
    e.preventDefault();
    try {
      const res = await safeFetchJson(`${API_BASE}/api/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: loggedInEmail || "guest@zcchessclub.com",
          fromName: localStorage.getItem("userName") || (loggedInEmail ? loggedInEmail.split("@")[0] : "Campus Tactician"),
          targetEmail: profile.email,
          timeControl: challengeTimeControl,
          location: challengeLocation,
          message: challengeMessage
        })
      });
      setChallengeSuccess(res.message);
      setTimeout(() => {
        setChallengeSuccess("");
        setChallengeModalOpen(false);
      }, 2000);
    } catch (err) {
      alert("Error sending challenge: " + err.message);
    }
  };

  const handleRespondChallenge = async (challengeId, status) => {
    try {
      await safeFetchJson(`${API_BASE}/api/challenges/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: profile.email,
          challengeId,
          status
        })
      });
      setChallenges(prev => prev.map(c => c._id === challengeId ? { ...c, status } : c));
    } catch (err) {
      alert("Error responding: " + err.message);
    }
  };

  const handleAddClubRole = () => {
    if (!newRoleDept || !newRolePos) return;
    setAdminRoleForm(prev => {
      const existing = prev.clubRoles || [];
      if (existing.some(r => r.department === newRoleDept && r.position === newRolePos)) {
        return prev;
      }
      return {
        ...prev,
        clubRoles: [...existing, { department: newRoleDept, position: newRolePos, assignedAt: new Date().toISOString() }]
      };
    });
  };

  const handleRemoveClubRole = (indexToRemove) => {
    setAdminRoleForm(prev => ({
      ...prev,
      clubRoles: (prev.clubRoles || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleAdminSaveUser = async (e) => {
    e.preventDefault();
    setAdminSaveSuccess("");
    setAdminSaveError("");
    try {
      const res = await safeFetchJson(`${API_BASE}/api/admin/manage-user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: loggedInEmail,
          targetEmail: profile.email,
          ...adminRoleForm
        })
      });
      setAdminSaveSuccess(res.message);
      setProfile(prev => ({
        ...prev,
        ...adminRoleForm
      }));
    } catch (err) {
      setAdminSaveError(err.message);
    }
  };

  const handleLeaveTournament = async (tournamentId) => {
    if (!profile) return;
    if (!window.confirm("Are you sure you want to leave this tournament?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email, name: profile.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to leave tournament");
      alert("Successfully left the tournament!");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const highestRating = Math.max(
    profile?.fideRating || 0,
    profile?.chessComRating || 0,
    profile?.lichessRating || 0
  );

  const tournamentAchievements = getUserTournamentAchievements(profile, tournaments);

  const renderMatches = (tournament) => {
    if (!profile) return null;
    const myMatches = tournament.matches?.filter(
      (m) => m.white === profile.name || m.black === profile.name
    );

    if (!myMatches || myMatches.length === 0) {
      return (
        <div className="no-matches-box">
          <Clock size={16} />
          <span>Pairings in progress — your match fixture will appear here soon.</span>
        </div>
      );
    }

    return (
      <div className="matches-list">
        <div className="matches-list-title">
          <Swords size={15} />
          <span>Your Tournament Fixtures</span>
        </div>
        {myMatches.map((match, idx) => (
          <div key={idx} className="match-card">
            <span className="match-round">Round {match.round}</span>
            <div className="match-players">
              <span className={`player-pill ${match.white === profile.name ? "highlight-white" : ""}`}>
                ♔ {match.white}
              </span>
              <span className="vs-badge">VS</span>
              <span className={`player-pill ${match.black === profile.name ? "highlight-black" : ""}`}>
                ♚ {match.black}
              </span>
            </div>
            <div className="match-result-pill">
              Result: <strong>{match.result || "Scheduled"}</strong>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) return (
    <div className="profile">
      <div className="page-loading">
        <div className="loading-spinner lg"></div>
        <p>Loading your dashboard…</p>
      </div>
    </div>
  );

  if (error) {
    const isUnregistered = error.toLowerCase().includes("not registered") || error.toLowerCase().includes("not found");
    return (
      <div className="profile">
        <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="profile-wrapper profile-main">
          <div className="page-error glass-panel" style={{ maxWidth: "580px", margin: "80px auto", padding: "40px 24px", textAlign: "center", borderRadius: "18px", border: "1px solid rgba(243, 193, 68, 0.25)", background: "linear-gradient(145deg, rgba(30, 26, 20, 0.95), rgba(18, 16, 13, 0.95))" }}>
            <div className="error-icon" style={{ fontSize: "3.2rem", marginBottom: "16px" }}>{isUnregistered ? "♟️" : "⚠️"}</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#f8fafc", marginBottom: "12px" }}>
              {isUnregistered ? "Tactician Account Not Registered Yet" : "Profile Unavailable"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: "1.65", marginBottom: "28px" }}>
              {isUnregistered
                ? "This player is a verified tactician competing in campus tournaments, but they have not created an online account on the website yet. Once they sign up, their official player card, ratings, and match history will be accessible here."
                : error}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/" className="btn-modal-full-profile" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 22px", textDecoration: "none", borderRadius: "10px", fontWeight: "700", background: "#f3c144", color: "#181611" }}>
                ← Return to Home
              </a>
              <a href="/tournaments" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 22px", textDecoration: "none", borderRadius: "10px", fontWeight: "700", background: "rgba(255,255,255,0.08)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.15)" }}>
                View Tournaments 🏆
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="profile">
      <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      
      <main className="profile-wrapper profile-main">
        
        {/* =========================================================================
            1. HERO DASHBOARD BANNER & CARD
           ========================================================================= */}
        {profile && (
          <section className="dashboard-hero-card">
            {/* Ambient Background Glow Effect */}
            <div className="hero-ambient-glow" />

            {/* Admin Viewing Notice Banner */}
            {isAdmin && !isOwnProfile && (
              <div className="admin-view-banner">
                <Crown size={14} />
                <span>Administrator Mode: Managing <strong>{profile.name}</strong> ({profile.email})</span>
                <button 
                  className="btn-admin-quick-tab" 
                  onClick={() => setActiveTab('admin')}
                >
                  Open Admin Controls ⚙️
                </button>
              </div>
            )}

            <div className="hero-top-layout">
              {/* Avatar Area */}
              <div className="hero-avatar-area">
                <div className="avatar-ring-container">
                  {isOwnProfile ? (
                    <label htmlFor="profileImageUpload" className="profile-image-upload-label" title="Click to upload profile photo">
                      <div 
                        className="profile-user-img" 
                        style={{ backgroundImage: `url("${profile.profileImage || '/Icons/user.jpg'}")` }}
                      >
                        <div className="profile-img-overlay">
                          <Camera size={26} />
                          <span>Change Photo</span>
                        </div>
                      </div>
                    </label>
                  ) : (
                    <div 
                      className="profile-user-img" 
                      style={{ backgroundImage: `url("${profile.profileImage || '/Icons/user.jpg'}")` }}
                    />
                  )}
                  <div className="avatar-status-dot" title="Active ZC Member" />
                  {isOwnProfile && (
                    <input 
                      type="file" 
                      id="profileImageUpload" 
                      accept="image/*" 
                      style={{ display: "none" }} 
                      onChange={handleImageUpload}
                    />
                  )}
                </div>
              </div>

              {/* Player Identity Details */}
              <div className="hero-details-area">
                <div className="hero-name-row">
                  {profile.chessTitle && (
                    <span className="chess-title-badge">
                      <Crown size={13} /> {profile.chessTitle}
                    </span>
                  )}
                  <h1 className="hero-user-name">{profile.name || "Zewailian Member"}</h1>
                  
                  {/* Assigned Club Roles Badges */}
                  {profile.clubRoles && profile.clubRoles.length > 0 && (
                    profile.clubRoles.map((cr, idx) => (
                      <span key={idx} className="badge-club-department-role" title={`${cr.position} of ${cr.department}`}>
                        👑 {cr.position} of {cr.department}
                      </span>
                    ))
                  )}

                  {!isOwnProfile && profile.followsViewer && (
                    <span className="badge-follows-you" title="This tactician follows your profile">
                      Follows You
                    </span>
                  )}

                  <span className={`hero-role-badge ${profile.role === 'admin' ? 'admin' : ''}`}>
                    {profile.role === 'admin' ? (
                      <>👑 Officer / Admin</>
                    ) : (
                      <>⚡ Club Member</>
                    )}
                  </span>

                  {tournamentAchievements.isChampion && (
                    <span 
                      className="badge-tournament-champion" 
                      title={`Official Tournament Champion:\n${tournamentAchievements.wonTournaments.map(t => '• ' + t).join('\n')}`}
                    >
                      {tournamentAchievements.primaryBadge}
                    </span>
                  )}

                  {!tournamentAchievements.isChampion && tournamentAchievements.isPodium && (
                    <span 
                      className="badge-tournament-podium" 
                      title={`Official Tournament Podium:\n${tournamentAchievements.podiumTournaments.map(t => '• ' + t).join('\n')}`}
                    >
                      🥈 Podium Finisher
                    </span>
                  )}
                </div>

                {/* Social Followers and Following Strip */}
                <div className="hero-social-strip">
                  <button 
                    type="button" 
                    className="hero-social-stat-btn"
                    onClick={() => handleOpenNetworkModal('followers')}
                    title="View members who follow this profile"
                  >
                    <strong>{followersCount}</strong> Followers
                  </button>
                  <span className="social-stat-dot">•</span>
                  <button 
                    type="button" 
                    className="hero-social-stat-btn"
                    onClick={() => handleOpenNetworkModal('following')}
                    title="View members this profile is following"
                  >
                    <strong>{followingCount}</strong> Following
                  </button>
                  <span className="social-stat-dot">•</span>
                  <span className="social-stat-item highlight">
                    ⚔️ {tournaments.length} Championships
                  </span>
                </div>

                <p className="hero-bio">
                  {profile.bio || "Passionate chess player at Zewail City of Science and Technology. Solving tactics, competing in Swiss arenas, and mastering opening theory."}
                </p>

                {/* Metadata Pills Strip */}
                <div className="hero-meta-strip">
                  <div className="hero-meta-item copyable" onClick={() => handleCopy(profile.email, 'email')} title="Click to copy email">
                    <Mail size={14} className="meta-icon" />
                    <span>{profile.email}</span>
                    {copiedField === 'email' ? <Check size={13} className="copy-check" /> : <Copy size={13} className="copy-icon" />}
                  </div>

                  {profile.idNumber && (
                    <div className="hero-meta-item copyable" onClick={() => handleCopy(profile.idNumber, 'id')} title="Click to copy Student ID">
                      <Hash size={14} className="meta-icon" />
                      <span>ID: {profile.idNumber}</span>
                      {copiedField === 'id' ? <Check size={13} className="copy-check" /> : <Copy size={13} className="copy-icon" />}
                    </div>
                  )}

                  {profile.major && (
                    <div className="hero-meta-item">
                      <BookOpen size={14} className="meta-icon" />
                      <span>{profile.major}</span>
                    </div>
                  )}

                  {profile.batch && (
                    <div className="hero-meta-item">
                      <Calendar size={14} className="meta-icon" />
                      <span>Batch {profile.batch}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hero Action Buttons */}
              <div className="hero-actions-area">
                {isOwnProfile ? (
                  <>
                    <button 
                      className={`btn-hero-action ${activeTab === 'settings' ? 'active' : ''}`}
                      onClick={() => setActiveTab('settings')}
                    >
                      <Settings size={16} />
                      <span>Edit Profile & Ratings</span>
                    </button>

                    <button 
                      className="btn-hero-action secondary"
                      onClick={() => handleCopy(window.location.href, 'share')}
                    >
                      {copiedField === 'share' ? <Check size={16} /> : <Share2 size={16} />}
                      <span>{copiedField === 'share' ? "Link Copied!" : "Share Profile"}</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Follow / Unfollow Button */}
                    <button 
                      className={`btn-hero-action ${isFollowing ? 'following' : 'primary-glow'}`}
                      onClick={handleFollowToggle}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck size={16} />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    {/* Direct Challenge Button */}
                    <button 
                      className="btn-hero-action challenge-btn"
                      onClick={() => setChallengeModalOpen(true)}
                    >
                      <Swords size={16} />
                      <span>Challenge ⚔️</span>
                    </button>

                    {/* Respect / Cheer Button */}
                    <button 
                      className={`btn-hero-action cheer-btn ${cheered ? 'cheered' : ''}`}
                      onClick={() => {
                        setCheered(true);
                        setCheerCount(prev => prev + 1);
                      }}
                    >
                      <Heart size={16} fill={cheered ? "#ef4444" : "none"} color={cheered ? "#ef4444" : "currentColor"} />
                      <span>{cheerCount} Respect</span>
                    </button>

                    {/* Admin Switch Tab */}
                    {isAdmin && (
                      <button 
                        className={`btn-hero-action admin-btn ${activeTab === 'admin' ? 'active' : ''}`}
                        onClick={() => setActiveTab('admin')}
                      >
                        <Crown size={16} />
                        <span>Admin Controls</span>
                      </button>
                    )}

                    <button 
                      className="btn-hero-action secondary"
                      onClick={() => handleCopy(window.location.href, 'share')}
                    >
                      {copiedField === 'share' ? <Check size={16} /> : <Share2 size={16} />}
                      <span>{copiedField === 'share' ? "Link Copied!" : "Share"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Hero Fast Stat Strip */}
            <div className="hero-stats-row">
              <div className="hero-stat-box">
                <div className="stat-label">Tournaments</div>
                <div className="stat-value">{tournaments.length}</div>
                <div className="stat-hint">Active Enrolled</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-box">
                <div className="stat-label">Peak Rating</div>
                <div className="stat-value gold">{highestRating > 0 ? highestRating : "—"}</div>
                <div className="stat-hint">All Platforms</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-box">
                <div className="stat-label">Preferred Opening</div>
                <div className="stat-value text-ellipsis">{profile.favOpening ? profile.favOpening.split(":")[0] : "Universal"}</div>
                <div className="stat-hint">Favorite Repertoire</div>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-box">
                <div className="stat-label">Campus Standing</div>
                <div className="stat-value green">Registered</div>
                <div className="stat-hint">{profile.role === 'admin' ? "Club Officer" : "Tactician"}</div>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            2. CHESS RATING SUMMARY CARDS (GLASSSMORPHIC GRID)
           ========================================================================= */}
        <section className="ratings-hero-grid">
          {/* FIDE Rating */}
          <div className="rating-card fide">
            <div className="rating-ambient-glow" />
            <div className="rating-badge-header">
              <span className="rating-platform-name">
                <Trophy size={16} className="platform-icon" /> FIDE Official
              </span>
              <span className="rating-platform-tag gold">FIDE</span>
            </div>
            <div className="rating-score-container">
              <span className="rating-score">{profile?.fideRating ? profile.fideRating : "Unrated"}</span>
              {profile?.fideRating > 0 && <span className="rating-delta">Official Elo</span>}
            </div>
            <div className="rating-subtext">
              {profile?.fideId ? (
                <div className="subtext-copy" onClick={() => handleCopy(profile.fideId, 'fideId')}>
                  <span>FIDE ID: {profile.fideId}</span>
                  {copiedField === 'fideId' ? <Check size={12} /> : <Copy size={12} />}
                </div>
              ) : (
                <span>No FIDE ID linked</span>
              )}
            </div>
          </div>

          {/* Chess.com */}
          <div className="rating-card chesscom">
            <div className="rating-ambient-glow" />
            <div className="rating-badge-header">
              <span className="rating-platform-name">
                <Target size={16} className="platform-icon" /> Chess.com
              </span>
              <span className="rating-platform-tag green">♟️ Live</span>
            </div>
            <div className="rating-score-container">
              <span className="rating-score">{profile?.chessComRating ? profile.chessComRating : "Unrated"}</span>
              {profile?.chessComRating > 0 && <span className="rating-delta green">Rapid / Blitz</span>}
            </div>
            <div className="rating-subtext">
              {profile?.chessComUsername ? (
                <a 
                  href={`https://www.chess.com/member/${profile.chessComUsername}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="rating-link"
                >
                  <span>@{profile.chessComUsername}</span>
                  <ExternalLink size={13} />
                </a>
              ) : (
                <span>No username linked</span>
              )}
            </div>
          </div>

          {/* Lichess.org */}
          <div className="rating-card lichess">
            <div className="rating-ambient-glow" />
            <div className="rating-badge-header">
              <span className="rating-platform-name">
                <Flame size={16} className="platform-icon" /> Lichess.org
              </span>
              <span className="rating-platform-tag amber">♞ Open</span>
            </div>
            <div className="rating-score-container">
              <span className="rating-score">{profile?.lichessRating ? profile.lichessRating : "Unrated"}</span>
              {profile?.lichessRating > 0 && <span className="rating-delta amber">Classical / Rapid</span>}
            </div>
            <div className="rating-subtext">
              {profile?.lichessUsername ? (
                <a 
                  href={`https://lichess.org/@/${profile.lichessUsername}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="rating-link"
                >
                  <span>@{profile.lichessUsername}</span>
                  <ExternalLink size={13} />
                </a>
              ) : (
                <span>No username linked</span>
              )}
            </div>
          </div>

          {/* ZC Club Championships */}
          <div className="rating-card zc-club">
            <div className="rating-ambient-glow" />
            <div className="rating-badge-header">
              <span className="rating-platform-name">
                <Crown size={16} className="platform-icon" /> ZC Championships
              </span>
              <span className="rating-platform-tag blue">Club Hub</span>
            </div>
            <div className="rating-score-container">
              <span className="rating-score">{tournaments.length}</span>
              <span className="rating-delta blue">Enrolled</span>
            </div>
            <div className="rating-subtext">
              <a href="/tournaments" className="rating-link blue">
                <span>Browse Tournaments</span>
                <ChevronRight size={13} />
              </a>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. DASHBOARD TABS NAVIGATION
           ========================================================================= */}
        <div className="dashboard-tabs">
          <button 
            type="button"
            className={`dashboard-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <User size={16} />
            <span>Overview & Dossier</span>
          </button>
          
          <button 
            type="button"
            className={`dashboard-tab-btn ${activeTab === 'tournaments' ? 'active' : ''}`}
            onClick={() => setActiveTab('tournaments')}
          >
            <Trophy size={16} />
            <span>Championships</span>
            <span className="tab-badge-count">{tournaments.length}</span>
          </button>

          <button 
            type="button"
            className={`dashboard-tab-btn ${activeTab === 'challenges' ? 'active' : ''}`}
            onClick={() => setActiveTab('challenges')}
          >
            <Swords size={16} />
            <span>Challenges Inbox</span>
            {challenges.length > 0 && <span className="tab-badge-count gold">{challenges.length}</span>}
          </button>

          {isOwnProfile && (
            <button 
              type="button"
              className={`dashboard-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} />
              <span>Account Settings</span>
            </button>
          )}

          {isAdmin && (
            <button 
              type="button"
              className={`dashboard-tab-btn admin ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Crown size={16} />
              <span>👑 Admin Controls</span>
            </button>
          )}
        </div>

        {/* =========================================================================
            4. TAB CONTENT: OVERVIEW
           ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="profile-tab-pane profile-fade-in">
            <div className="overview-bento-grid">
              
              {/* Card 1: Academic & Personal Dossier */}
              <div className="bento-card glass-panel">
                <div className="bento-card-header">
                  <div className="header-icon-box gold">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="card-title">Academic & Student Dossier</h3>
                    <p className="card-subtitle">Official university identity and member contact information</p>
                  </div>
                  {isAdmin && (
                    <button 
                      type="button" 
                      className="btn-bento-admin-edit"
                      onClick={() => setActiveTab('admin')}
                      title="Edit member dossier details as Administrator"
                    >
                      <Settings size={14} />
                      <span>Edit Dossier</span>
                    </button>
                  )}
                </div>

                <div className="details-list">
                  <div className="detail-item">
                    <span className="detail-label"><User size={14} /> Full Name</span>
                    <span className="detail-val">{profile?.name || "Not specified"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><Mail size={14} /> Email Address</span>
                    <span className="detail-val copyable" onClick={() => handleCopy(profile?.email, 'ov-email')}>
                      {profile?.email}
                      {copiedField === 'ov-email' ? <Check size={12} className="copy-check" /> : <Copy size={12} className="copy-icon" />}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><Hash size={14} /> Student ID</span>
                    <span className="detail-val">{profile?.idNumber || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><BookOpen size={14} /> Academic Major</span>
                    <span className="detail-val">{profile?.major || "General Academic"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><Calendar size={14} /> Batch / Year</span>
                    <span className="detail-val">{profile?.batch ? `Batch ${profile.batch}` : "N/A"}</span>
                  </div>
                  {(isOwnProfile || isAdmin) && (
                    <div className="detail-item">
                      <span className="detail-label"><Phone size={14} /> Contact Phone</span>
                      <span className="detail-val">
                        {profile?.phone || "Not set"}
                        {isOwnProfile && (
                          <span className="privacy-pill-badge" title="Strictly private: Only you and verified Club Administrators can see this">
                            🔒 Private (Admin only)
                          </span>
                        )}
                        {isAdmin && !isOwnProfile && (
                          <span className="admin-only-badge" title="Visible to Administrator">
                            👑 Admin View
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Chess Philosophy & Preferences */}
              <div className="bento-card glass-panel">
                <div className="bento-card-header">
                  <div className="header-icon-box amber">
                    <Swords size={18} />
                  </div>
                  <div>
                    <h3 className="card-title">Chess Identity & Philosophy</h3>
                    <p className="card-subtitle">Personal playing style, repertoire, and tournament motto</p>
                  </div>
                  {isAdmin && (
                    <button 
                      type="button" 
                      className="btn-bento-admin-edit"
                      onClick={() => setActiveTab('admin')}
                      title="Edit chess philosophy & title as Administrator"
                    >
                      <Settings size={14} />
                      <span>Edit Identity</span>
                    </button>
                  )}
                </div>

                <div className="details-list">
                  <div className="detail-item">
                    <span className="detail-label"><Crown size={14} /> FIDE Official Title</span>
                    <span className="detail-val highlight-gold">{profile?.chessTitle ? `${profile.chessTitle} Titleholder` : "Club Contender (Un-titled)"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><Compass size={14} /> Favorite Opening Repertoire</span>
                    <span className="detail-val opening-badge">
                      ♟️ {profile?.favOpening || "Universal / Sicilian Defense"}
                    </span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label"><Star size={14} /> Personal Chess Motto & Bio</span>
                    <blockquote className="bio-quote-box">
                      "{profile?.bio || "Every chess master was once a beginner. Striving for tactical precision and strategic mastery at Zewail City."}"
                    </blockquote>
                  </div>
                </div>
              </div>

              {/* Card 3: Club Accolades & Badges */}
              <div className="bento-card glass-panel full-width-card">
                <div className="bento-card-header">
                  <div className="header-icon-box blue">
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 className="card-title">Club Accolades & Milestones</h3>
                    <p className="card-subtitle">Badges unlocked as an active member of ZC Chess Club</p>
                  </div>
                </div>

                <div className="accolades-grid">
                  <div className="accolade-badge-card unlocked">
                    <div className="accolade-icon">👑</div>
                    <div className="accolade-info">
                      <div className="accolade-name">Club Member</div>
                      <div className="accolade-desc">Active Zewail City chess participant</div>
                    </div>
                    <CheckCircle2 size={16} className="accolade-status-icon" />
                  </div>

                  <div className={`accolade-badge-card ${tournamentAchievements.isChampion ? 'unlocked' : 'locked'}`}>
                    <div className="accolade-icon">🏆</div>
                    <div className="accolade-info">
                      <div className="accolade-name">Tournament Champion</div>
                      <div className="accolade-desc">
                        {tournamentAchievements.isChampion 
                          ? `Won ${tournamentAchievements.wonTournaments.length} championship(s): ${tournamentAchievements.wonTournaments.join(', ')}` 
                          : "Win 1st place in an official club tournament to unlock"}
                      </div>
                    </div>
                    {tournamentAchievements.isChampion ? <CheckCircle2 size={16} className="accolade-status-icon" /> : <Lock size={16} className="accolade-status-icon" />}
                  </div>

                  <div className={`accolade-badge-card ${tournamentAchievements.isPodium ? 'unlocked' : 'locked'}`}>
                    <div className="accolade-icon">🥈</div>
                    <div className="accolade-info">
                      <div className="accolade-name">Podium Finisher</div>
                      <div className="accolade-desc">
                        {tournamentAchievements.isPodium 
                          ? `Podium finish in: ${tournamentAchievements.podiumTournaments.join(', ')}` 
                          : "Place top 3 in an official club tournament to unlock"}
                      </div>
                    </div>
                    {tournamentAchievements.isPodium ? <CheckCircle2 size={16} className="accolade-status-icon" /> : <Lock size={16} className="accolade-status-icon" />}
                  </div>

                  <div className={`accolade-badge-card ${tournaments.length > 0 ? 'unlocked' : 'locked'}`}>
                    <div className="accolade-icon">⚔️</div>
                    <div className="accolade-info">
                      <div className="accolade-name">Tournament Competitor</div>
                      <div className="accolade-desc">
                        {tournaments.length > 0 
                          ? `Competed in ${tournaments.length} official championship(s)` 
                          : "Register and compete in an official tournament to unlock"}
                      </div>
                    </div>
                    {tournaments.length > 0 ? <CheckCircle2 size={16} className="accolade-status-icon" /> : <Lock size={16} className="accolade-status-icon" />}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =========================================================================
            5. TAB CONTENT: MY TOURNAMENTS
           ========================================================================= */}
        {activeTab === 'tournaments' && (
          <div className="profile-tab-pane profile-fade-in">
            <div className="tournaments-pane-header">
              <div>
                <h3 className="section-title">My Registered Championships</h3>
                <p className="section-subtitle">Track your upcoming tournament schedules, pairings, and match fixtures</p>
              </div>
              <a href="/tournaments" className="btn-browse-tournaments">
                <Sparkles size={16} />
                <span>Explore Tournaments</span>
              </a>
            </div>

            {tournaments.length === 0 && (!tournamentAchievements.historicalList || tournamentAchievements.historicalList.length === 0) ? (
              <div className="empty-state-card glass-panel">
                <div className="empty-icon-glow">
                  <Trophy size={48} />
                </div>
                <h4>No Active Championships Enrolled</h4>
                <p>You haven't registered for any Zewail City Chess Club tournaments yet. Join our Swiss & Knockout events to compete for trophies, club ratings, and campus glory!</p>
                <a href="/tournaments" className="btn-primary-action">
                  <span>Browse Active Championships ➔</span>
                </a>
              </div>
            ) : (
              <div className="tournament-grid-dashboard">
                {tournaments.map((t) => {
                  const reg = t.registrations?.find((r) => r.email === (profile?.email || loggedInEmail));
                  const isPlayer = t.playersList?.some((p) => p.name === profile?.name);
                  
                  let status = "Pending Review";
                  if (isPlayer) status = "Playing (Approved)";
                  else if (reg) status = reg.status;

                  return (
                    <div key={t._id} className="tournament-card-dashboard glass-panel">
                      <div className="t-header">
                        <div>
                          <div className="t-format-pill">{t.format || t.type || "Swiss System"}</div>
                          <h3 className="t-title">{t.title}</h3>
                        </div>
                        <span className={`t-status ${status.toLowerCase().includes('approved') || status.toLowerCase().includes('playing') ? 'approved' : ''}`}>
                          {status}
                        </span>
                      </div>

                      <div className="t-info-grid">
                        <div className="t-info-col">
                          <Calendar size={14} className="t-icon" />
                          <span><strong>Date:</strong> {t.startDate}</span>
                        </div>
                        <div className="t-info-col">
                          <Compass size={14} className="t-icon" />
                          <span><strong>Location:</strong> {t.location}</span>
                        </div>
                        <div className="t-info-col">
                          <Swords size={14} className="t-icon" />
                          <span><strong>Players:</strong> {t.players || t.playersList?.length || 0} Registered</span>
                        </div>
                      </div>

                      {isPlayer && renderMatches(t)}

                      {t.status === "Upcoming" && (
                        <div className="t-actions">
                          <button 
                            type="button"
                            onClick={() => handleLeaveTournament(t._id)}
                            className="btn-leave-tournament"
                          >
                            Leave Tournament
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Historical Championships & Hall of Fame Records */}
            {tournamentAchievements.historicalList && tournamentAchievements.historicalList.length > 0 && (
              <div className="historical-tournaments-section" style={{ marginTop: "40px" }}>
                <div className="tournaments-pane-header">
                  <div>
                    <h3 className="section-title">🏆 Historical Championships & Hall of Fame</h3>
                    <p className="section-subtitle">
                      Official tournaments completed prior to website launch (held via Challonge & campus events)
                    </p>
                  </div>
                  <a href="/history?tab=halloffame" className="btn-browse-tournaments">
                    <Trophy size={16} />
                    <span>View Hall of Fame</span>
                  </a>
                </div>

                <div className="tournament-grid-dashboard">
                  {tournamentAchievements.historicalList.map((ht, idx) => (
                    <div key={idx} className="tournament-card-dashboard glass-panel historical-card" style={{ borderColor: ht.isChampion ? "rgba(243, 193, 68, 0.4)" : "rgba(255, 255, 255, 0.1)" }}>
                      <div className="t-header">
                        <div>
                          <div className="t-format-pill" style={{ background: "rgba(243, 193, 68, 0.15)", color: "#f3c144", border: "1px solid rgba(243, 193, 68, 0.3)" }}>
                            📜 Historical Archive
                          </div>
                          <h3 className="t-title">{ht.title}</h3>
                        </div>
                        <span className="t-status approved" style={{ background: ht.isChampion ? "linear-gradient(135deg, rgba(243, 193, 68, 0.25), rgba(212, 163, 42, 0.15))" : "rgba(255,255,255,0.1)", color: ht.isChampion ? "#f3c144" : "#e2e8f0", borderColor: ht.isChampion ? "rgba(243, 193, 68, 0.5)" : "rgba(255,255,255,0.2)" }}>
                          {ht.award}
                        </span>
                      </div>

                      <p style={{ fontSize: "0.86rem", color: "#cbd5e1", margin: "12px 0", lineHeight: 1.5 }}>
                        {ht.description}
                      </p>

                      <div className="t-info-grid" style={{ marginBottom: "16px" }}>
                        <div className="t-info-col">
                          <span className="info-label">Date</span>
                          <span className="info-value">📅 {ht.date}</span>
                        </div>
                        <div className="t-info-col">
                          <span className="info-label">Location</span>
                          <span className="info-value">📍 {ht.location}</span>
                        </div>
                        <div className="t-info-col">
                          <span className="info-label">Format</span>
                          <span className="info-value">⚡ {ht.type}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
                        <a 
                          href={`/history?tab=events&q=${encodeURIComponent(profile?.name?.split(' ')[0] || "")}`} 
                          className="btn-primary-action" 
                          style={{ padding: "8px 16px", fontSize: "0.82rem", textDecoration: "none" }}
                        >
                          <span>📜 View in Tournament Timeline ➔</span>
                        </a>
                        <a 
                          href="/history?tab=halloffame" 
                          className="btn-browse-tournaments" 
                          style={{ padding: "8px 16px", fontSize: "0.82rem", textDecoration: "none" }}
                        >
                          <span>👑 Hall of Fame</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            5B. TAB CONTENT: CHALLENGES INBOX
           ========================================================================= */}
        {activeTab === 'challenges' && (
          <div className="profile-tab-pane profile-fade-in">
            <div className="challenges-container glass-panel">
              <div className="settings-header-strip">
                <div>
                  <h3 className="card-title">
                    <Swords size={20} /> Campus Challenges Inbox
                  </h3>
                  <p className="settings-subtitle">Direct 1-on-1 duel invitations and matches across Zewail City campus.</p>
                </div>
                {!isOwnProfile && (
                  <button 
                    type="button" 
                    className="btn-open-challenge-modal" 
                    onClick={() => setChallengeModalOpen(true)}
                  >
                    <Swords size={15} />
                    <span>Challenge {profile.name?.split(' ')[0]}</span>
                  </button>
                )}
              </div>

              {challenges.length === 0 ? (
                <div className="empty-state-box">
                  <div className="empty-icon-circle">
                    <Swords size={32} />
                  </div>
                  <h4>No Active Challenges Yet</h4>
                  <p>
                    {isOwnProfile 
                      ? "You have no incoming challenge invitations. Browse the campus roster to challenge fellow members to blitz or rapid!"
                      : `${profile.name} has no open public challenges right now. Be the first to issue a duel!`}
                  </p>
                  <a href="/#players" className="btn-browse-players">
                    <span>Browse Club Community ➔</span>
                  </a>
                </div>
              ) : (
                <div className="challenges-list-grid">
                  {challenges.map((c, idx) => {
                    const isPending = c.status === "Pending" || c.status === "pending";
                    const isAccepted = c.status === "Accepted" || c.status === "accepted";
                    const isDeclined = c.status === "Declined" || c.status === "declined";

                    return (
                      <div key={c._id || idx} className={`challenge-item-card ${c.status?.toLowerCase()}`}>
                        <div className="challenge-item-header">
                          <div className="challenger-identity">
                            <div className="challenger-avatar-placeholder">
                              {(c.fromName || "M")[0].toUpperCase()}
                            </div>
                            <div>
                              <h4 className="challenger-name">{c.fromName || "Club Member"}</h4>
                              <span className="challenger-email">{c.fromEmail}</span>
                            </div>
                          </div>
                          <span className={`challenge-status-badge ${c.status?.toLowerCase()}`}>
                            {isPending && "⏳ Pending"}
                            {isAccepted && "⚔️ Accepted"}
                            {isDeclined && "✕ Declined"}
                          </span>
                        </div>

                        <div className="challenge-details-grid">
                          <div className="c-detail-item">
                            <span className="c-label">Time Control:</span>
                            <span className="c-val">{c.timeControl || "3+2 Blitz"}</span>
                          </div>
                          <div className="c-detail-item">
                            <span className="c-label">Venue / Link:</span>
                            <span className="c-val">{c.location || "Academic Building Lounge"}</span>
                          </div>
                          {c.message && (
                            <div className="c-detail-item full">
                              <span className="c-label">Note:</span>
                              <span className="c-val message">"{c.message}"</span>
                            </div>
                          )}
                        </div>

                        {isOwnProfile && isPending && (
                          <div className="challenge-actions-row">
                            <button 
                              type="button" 
                              className="btn-challenge-accept"
                              onClick={() => handleRespondChallenge(c._id, "Accepted")}
                            >
                              <CheckCircle2 size={15} />
                              <span>Accept Duel</span>
                            </button>
                            <button 
                              type="button" 
                              className="btn-challenge-decline"
                              onClick={() => handleRespondChallenge(c._id, "Declined")}
                            >
                              <X size={15} />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}

                        {isAccepted && (
                          <div className="challenge-accepted-banner">
                            <CheckCircle2 size={16} />
                            <span>Duel accepted! Coordinate with {c.fromName} at {c.location}.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            6. TAB CONTENT: ACCOUNT SETTINGS
           ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="profile-tab-pane profile-fade-in">
            <div className="settings-container glass-panel">
              <div className="settings-header-strip">
                <div>
                  <h3 className="card-title">
                    <Settings size={20} /> Account & Profile Settings
                  </h3>
                  <p className="settings-subtitle">Manage your personal university details, official FIDE & online chess ratings, and credentials.</p>
                </div>
              </div>

              {saveSuccess && (
                <div className="alert-toast success" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={18} />
                    <span>{saveSuccess}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      type="button" 
                      onClick={() => setActiveTab('overview')} 
                      style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer", fontWeight: "600" }}
                    >
                      View Badge in Overview ➔
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setActiveTab('tournaments')} 
                      style={{ background: "#d97706", border: "none", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer", fontWeight: "600" }}
                    >
                      View Tournaments 🏆
                    </button>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="alert-toast error">
                  <Shield size={18} />
                  <span>{saveError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="settings-form">
                
                {/* SECTION 1: PERSONAL & STUDENT INFO */}
                <div className="form-section-card">
                  <div className="form-section-head">
                    <User size={18} className="head-icon gold" />
                    <div>
                      <h4 className="form-section-heading">Student & Academic Identity</h4>
                      <p className="form-section-desc">Your basic details displayed on match scorecards and club rosters</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label><User size={13} /> Full Name</label>
                      <input 
                        type="text" 
                        name="name"
                        value={settingsForm.name} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. Bosy Ayman"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label><Phone size={13} /> Phone Number <span style={{ color: "#f59e0b", fontSize: "0.72rem", fontWeight: "600" }}>🔒 Private</span></label>
                      <input 
                        type="tel" 
                        name="phone"
                        value={settingsForm.phone} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. 01012345678"
                      />
                      <span className="form-hint" style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                        🔒 Kept strictly private. Only visible to you and verified Club Administrators.
                      </span>
                    </div>

                    <div className="form-group">
                      <label><Hash size={13} /> Student ID Number</label>
                      <input 
                        type="text" 
                        name="idNumber"
                        value={settingsForm.idNumber} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. 202100123"
                      />
                    </div>

                    <div className="form-group">
                      <label><BookOpen size={13} /> Major / Program</label>
                      <input 
                        type="text" 
                        name="major"
                        value={settingsForm.major} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. Data Science & AI"
                      />
                    </div>

                    <div className="form-group">
                      <label><Calendar size={13} /> Academic Batch / Year</label>
                      <input 
                        type="text" 
                        name="batch"
                        value={settingsForm.batch} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. 2026 or Year 3"
                      />
                    </div>

                    <div className="form-group">
                      <label><Crown size={13} /> Official Chess Title</label>
                      <select name="chessTitle" value={settingsForm.chessTitle} onChange={handleSettingsChange}>
                        <option value="">None / Club Contender</option>
                        <option value="CM">Candidate Master (CM)</option>
                        <option value="FM">FIDE Master (FM)</option>
                        <option value="IM">International Master (IM)</option>
                        <option value="GM">Grandmaster (GM)</option>
                        <option value="WCM">Woman CM (WCM)</option>
                        <option value="WFM">Woman FM (WFM)</option>
                        <option value="WIM">Woman IM (WIM)</option>
                        <option value="WGM">Woman GM (WGM)</option>
                        <option value="NM">National Master (NM)</option>
                      </select>
                    </div>

                    <div className="form-group full">
                      <label><Compass size={13} /> Favorite Chess Opening Repertoire</label>
                      <input 
                        type="text" 
                        name="favOpening"
                        value={settingsForm.favOpening} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. Sicilian Defense: Najdorf / King's Indian"
                      />
                    </div>

                    <div className="form-group full">
                      <label><Award size={13} /> 🔗 Link to Historical Club Record (Hall of Fame / Timeline)</label>
                      <select 
                        name="linkedHistoricalName" 
                        value={settingsForm.linkedHistoricalName || ""} 
                        onChange={handleSettingsChange}
                      >
                        <option value="">-- Auto-match based on Name & Email --</option>
                        {ALL_HISTORICAL_PLAYERS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <small style={{ color: "#94a3b8", fontSize: "0.78rem", marginTop: "4px", display: "block" }}>
                        Connect your account to championships and tournament matches held via external applications (Challonge) prior to the website launch.
                      </small>

                      {/* Interactive Preview of Historical Tournaments & Honors */}
                      {(() => {
                        const targetPlayerName = settingsForm.linkedHistoricalName || profile?.name;
                        const previewTournaments = getHistoricalTournamentsForUser({
                          ...profile,
                          name: targetPlayerName,
                          linkedHistoricalName: settingsForm.linkedHistoricalName
                        });

                        if (previewTournaments && previewTournaments.length > 0) {
                          return (
                            <div style={{
                              marginTop: "12px",
                              padding: "14px 16px",
                              borderRadius: "10px",
                              background: "rgba(245, 158, 11, 0.08)",
                              border: "1px solid rgba(245, 158, 11, 0.25)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px"
                            }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                                <span style={{ color: "#fbbf24", fontWeight: "700", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                  <Trophy size={15} /> Verified Historical Record Found ({previewTournaments.length} Tournaments)
                                </span>
                                <span style={{ fontSize: "0.76rem", color: "#cbd5e1", background: "rgba(255,255,255,0.08)", padding: "3px 8px", borderRadius: "6px" }}>
                                  Will award: <strong>🏆 Tournament Champion</strong> badge
                                </span>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                                {previewTournaments.map((ht, idx) => (
                                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem", color: "#e2e8f0", background: "rgba(0,0,0,0.2)", padding: "6px 10px", borderRadius: "6px" }}>
                                    <span>🏅 <strong>{ht.title}</strong></span>
                                    <span style={{ color: ht.isChampion ? "#f3c144" : "#94a3b8", fontWeight: "600", fontSize: "0.78rem" }}>
                                      {ht.award}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } else if (settingsForm.linkedHistoricalName) {
                          return (
                            <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#94a3b8" }}>
                              No archived tournament wins found under this name.
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>


                    <div className="form-group full">
                      <label><Star size={13} /> Chess Motto & Personal Bio</label>
                      <textarea 
                        name="bio"
                        rows="3"
                        value={settingsForm.bio} 
                        onChange={handleSettingsChange}
                        placeholder="Tell fellow ZC chess players about your playing style, aspirations, or memorable games..."
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: CHESS RATINGS & PLATFORMS */}
                <div className="form-section-card">
                  <div className="form-section-head">
                    <Trophy size={18} className="head-icon amber" />
                    <div>
                      <h4 className="form-section-heading">Chess Ratings & Online Accounts</h4>
                      <p className="form-section-desc">Connect your official FIDE Elo and online gaming profiles</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label><Trophy size={13} /> FIDE Official Rating</label>
                      <input 
                        type="number" 
                        name="fideRating"
                        value={settingsForm.fideRating} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. 1850 (0 if unrated)"
                      />
                    </div>

                    <div className="form-group">
                      <label><Hash size={13} /> FIDE ID</label>
                      <input 
                        type="text" 
                        name="fideId"
                        value={settingsForm.fideId} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. 1250912"
                      />
                    </div>

                    <div className="form-group">
                      <label><Target size={13} /> Chess.com Username</label>
                      <input 
                        type="text" 
                        name="chessComUsername"
                        value={settingsForm.chessComUsername} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. magnuscarlsen"
                      />
                    </div>

                    <div className="form-group">
                      <label><Award size={13} /> Chess.com Rating</label>
                      <input 
                        type="number" 
                        name="chessComRating"
                        value={settingsForm.chessComRating} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. 1650"
                      />
                    </div>

                    <div className="form-group">
                      <label><Flame size={13} /> Lichess Username</label>
                      <input 
                        type="text" 
                        name="lichessUsername"
                        value={settingsForm.lichessUsername} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. DrNykterstein"
                      />
                    </div>

                    <div className="form-group">
                      <label><Award size={13} /> Lichess Rating</label>
                      <input 
                        type="number" 
                        name="lichessRating"
                        value={settingsForm.lichessRating} 
                        onChange={handleSettingsChange}
                        placeholder="e.g. 1950"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: SECURITY */}
                <div className="form-section-card">
                  <div className="form-section-head">
                    <Lock size={18} className="head-icon blue" />
                    <div>
                      <h4 className="form-section-heading">Security & Password</h4>
                      <p className="form-section-desc">Update your password to keep your chess club account secure</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label><Lock size={13} /> New Password (leave blank to keep current)</label>
                      <input 
                        type="password" 
                        name="password"
                        value={settingsForm.password} 
                        onChange={handleSettingsChange}
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="form-group">
                      <label><Lock size={13} /> Confirm New Password</label>
                      <input 
                        type="password" 
                        name="confirmPassword"
                        value={settingsForm.confirmPassword} 
                        onChange={handleSettingsChange}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Submit Button */}
                <div className="form-actions">
                  <button type="submit" className="btn-save-settings-primary" disabled={isSaving}>
                    <CheckCircle2 size={18} />
                    <span>{isSaving ? "Saving Updates…" : "Save Profile & Ratings"}</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            7. TAB CONTENT: CAMPUS CHALLENGES INBOX
           ========================================================================= */}
        {activeTab === 'challenges' && (
          <div className="profile-tab-pane profile-fade-in">
            <div className="tab-pane-header-row">
              <div>
                <h3 className="section-title">⚔️ Campus Match Challenges</h3>
                <p className="section-subtitle">Direct 1-on-1 chess faceoffs requested across Zewail City campus</p>
              </div>
              {!isOwnProfile && (
                <button 
                  className="btn-primary-action"
                  onClick={() => setChallengeModalOpen(true)}
                >
                  <Swords size={16} />
                  <span>Send Challenge to {profile.name?.split(" ")[0]}</span>
                </button>
              )}
            </div>

            {challenges.length === 0 ? (
              <div className="empty-state-card glass-panel">
                <div className="empty-icon-glow">
                  <Swords size={48} />
                </div>
                <h4>No Pending Challenges</h4>
                <p>
                  {isOwnProfile 
                    ? "You have no pending match challenges in your inbox. Fellow Zewailians can challenge you directly from your profile card or the Campus Tacticians showcase!"
                    : `${profile.name} currently has no open challenges. Be the first to challenge them to a campus faceoff!`
                  }
                </p>
                {!isOwnProfile && (
                  <button 
                    className="btn-primary-action"
                    onClick={() => setChallengeModalOpen(true)}
                  >
                    <span>Issue Challenge Now ⚔️</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="challenges-inbox-grid">
                {challenges.map((c) => (
                  <div key={c._id} className={`challenge-inbox-card glass-panel status-${c.status}`}>
                    <div className="challenge-card-header">
                      <div className="challenger-info">
                        <div className="challenger-avatar">
                          <Swords size={18} />
                        </div>
                        <div>
                          <h4 className="challenger-name">{c.fromName || c.fromEmail}</h4>
                          <span className="challenger-email">{c.fromEmail}</span>
                        </div>
                      </div>
                      <span className={`challenge-status-pill ${c.status}`}>
                        {c.status === 'accepted' ? '✓ Accepted' : c.status === 'declined' ? '✕ Declined' : '⏳ Pending Response'}
                      </span>
                    </div>

                    <div className="challenge-details-grid">
                      <div className="c-detail-item">
                        <Clock size={14} className="c-icon gold" />
                        <span><strong>Time Control:</strong> {c.timeControl}</span>
                      </div>
                      <div className="c-detail-item">
                        <Compass size={14} className="c-icon blue" />
                        <span><strong>Campus Location:</strong> {c.location}</span>
                      </div>
                      <div className="c-detail-item">
                        <Calendar size={14} className="c-icon" />
                        <span><strong>Issued:</strong> {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {c.message && (
                      <div className="challenge-quote">
                        "{c.message}"
                      </div>
                    )}

                    {isOwnProfile && c.status === 'pending' && (
                      <div className="challenge-card-actions">
                        <button 
                          className="btn-challenge-accept"
                          onClick={() => handleRespondChallenge(c._id, 'accepted')}
                        >
                          <Check size={15} />
                          <span>Accept Challenge</span>
                        </button>
                        <button 
                          className="btn-challenge-decline"
                          onClick={() => handleRespondChallenge(c._id, 'declined')}
                        >
                          <X size={15} />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}

                    {c.status === 'accepted' && (
                      <div className="challenge-notice success">
                        <CheckCircle2 size={15} />
                        <span>Match confirmed! Meet at <strong>{c.location}</strong> with your chess clock ready!</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            8. TAB CONTENT: 👑 ADMINISTRATOR COMMAND & REGISTRY
           ========================================================================= */}
        {isAdmin && activeTab === 'admin' && (
          <div className="profile-tab-pane profile-fade-in">
            <div className="admin-panel-card glass-panel">
              <div className="admin-panel-header">
                <div className="admin-header-icon">
                  <Crown size={24} />
                </div>
                <div>
                  <h3 className="admin-title">👑 Administrator Dossier & Privileges</h3>
                  <p className="admin-subtitle">
                    Authorized executive controls for <strong>{profile.name}</strong> ({profile.email})
                  </p>
                </div>
              </div>

              {adminSaveSuccess && (
                <div className="admin-alert success">
                  <CheckCircle2 size={16} />
                  <span>{adminSaveSuccess}</span>
                </div>
              )}

              {adminSaveError && (
                <div className="admin-alert error">
                  <X size={16} />
                  <span>{adminSaveError}</span>
                </div>
              )}

              {/* Dossier Quick Specs */}
              <div className="admin-dossier-specs">
                <div className="dossier-spec-item">
                  <span className="label">Registered Email</span>
                  <span className="value">{profile.email}</span>
                </div>
                <div className="dossier-spec-item">
                  <span className="label">Current Role</span>
                  <span className={`value role-pill ${profile.role}`}>{profile.role?.toUpperCase()}</span>
                </div>
                <div className="dossier-spec-item">
                  <span className="label">Followers Count</span>
                  <span className="value">{followersCount} Tacticians</span>
                </div>
              </div>

              {/* Privilege & Dossier Editor Form */}
              <form onSubmit={handleAdminSaveUser} className="admin-control-form">
                {/* Section 1: Academic & Personal Dossier */}
                <div className="admin-section-header">
                  <User size={18} className="section-icon gold" />
                  <h4>Academic & Student Dossier</h4>
                </div>

                <div className="admin-form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      value={adminRoleForm.name}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Student Full Name"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Student ID Number</label>
                    <input 
                      type="text" 
                      value={adminRoleForm.idNumber}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, idNumber: e.target.value }))}
                      placeholder="e.g. 202100123"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input 
                      type="text" 
                      value={adminRoleForm.phone}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Academic Major</label>
                    <input 
                      type="text" 
                      value={adminRoleForm.major}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, major: e.target.value }))}
                      placeholder="e.g. Computer Science, Aerospace Engineering"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Batch / Year</label>
                    <input 
                      type="text" 
                      value={adminRoleForm.batch}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, batch: e.target.value }))}
                      placeholder="e.g. 2026 or Year 3"
                      className="admin-input"
                    />
                  </div>
                </div>

                {/* Section 2: Ratings & Online Accounts */}
                <div className="admin-section-header" style={{ marginTop: '24px' }}>
                  <Trophy size={18} className="section-icon amber" />
                  <h4>Chess Ratings & Platform Handles</h4>
                </div>

                <div className="admin-form-grid">
                  <div className="form-group">
                    <label>FIDE Elo Rating</label>
                    <input 
                      type="number" 
                      value={adminRoleForm.fideRating}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, fideRating: e.target.value }))}
                      placeholder="0 if unrated"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>FIDE ID</label>
                    <input 
                      type="text" 
                      value={adminRoleForm.fideId}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, fideId: e.target.value }))}
                      placeholder="Official FIDE ID"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Chess.com Username</label>
                    <input 
                      type="text" 
                      value={adminRoleForm.chessComUsername}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, chessComUsername: e.target.value }))}
                      placeholder="Chess.com handle"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Chess.com Rating</label>
                    <input 
                      type="number" 
                      value={adminRoleForm.chessComRating}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, chessComRating: e.target.value }))}
                      placeholder="Rating"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Lichess Username</label>
                    <input 
                      type="text" 
                      value={adminRoleForm.lichessUsername}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, lichessUsername: e.target.value }))}
                      placeholder="Lichess handle"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Lichess Rating</label>
                    <input 
                      type="number" 
                      value={adminRoleForm.lichessRating}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, lichessRating: e.target.value }))}
                      placeholder="Rating"
                      className="admin-input"
                    />
                  </div>
                </div>

                {/* Section 3: Chess Identity & Philosophy */}
                <div className="admin-section-header" style={{ marginTop: '24px' }}>
                  <Crown size={18} className="section-icon gold" />
                  <h4>Chess Identity & Bio</h4>
                </div>

                <div className="admin-form-grid">
                  <div className="form-group">
                    <label>Official Chess Title</label>
                    <input 
                      type="text" 
                      value={adminRoleForm.chessTitle}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, chessTitle: e.target.value }))}
                      placeholder="e.g. CM, FM, IM, GM, Campus Contender"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Favorite Opening Repertoire</label>
                    <input 
                      type="text" 
                      value={adminRoleForm.favOpening}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, favOpening: e.target.value }))}
                      placeholder="e.g. Sicilian Defense, King's Indian"
                      className="admin-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>🔗 Link Historical Player Archive</label>
                    <select
                      value={adminRoleForm.linkedHistoricalName || ""}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, linkedHistoricalName: e.target.value }))}
                      className="admin-select"
                    >
                      <option value="">-- None / Auto-match --</option>
                      {ALL_HISTORICAL_PLAYERS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>


                  <div className="form-group full-width">
                    <label>Player Bio / Official Notes</label>
                    <textarea 
                      rows={3}
                      value={adminRoleForm.bio}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Official notes or custom player biography..."
                      className="admin-textarea"
                    />
                  </div>
                </div>

                {/* Section 4: Club Authority & Department Roles */}
                <div className="admin-section-header" style={{ marginTop: '24px' }}>
                  <Shield size={18} className="section-icon red" />
                  <h4>Executive Privileges & Department Assignments</h4>
                </div>

                <div className="admin-form-grid">
                  <div className="form-group full-width">
                    <label>Club Authority Role</label>
                    <select 
                      value={adminRoleForm.role}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, role: e.target.value }))}
                      className="admin-select"
                    >
                      <option value="member">Club Member (Standard Tactician)</option>
                      <option value="officer">Club Officer (Event Coordinator)</option>
                      <option value="admin">Administrator / Executive Officer</option>
                    </select>
                    <span className="form-hint">Grants permissions to manage tournaments and view club dossiers.</span>
                  </div>

                  {/* Direct Club Department Role Assignment */}
                  <div className="form-group full-width admin-club-roles-section">
                    <label>Club Department Roles (Executive & Member Positions)</label>
                    <span className="form-hint">Directly set or change this person's role (Head or Member) for any club department.</span>
                    
                    {/* Active Club Roles List */}
                    <div className="admin-roles-list">
                      {(adminRoleForm.clubRoles || []).length === 0 ? (
                        <div className="admin-no-roles">No club department roles assigned yet.</div>
                      ) : (
                        (adminRoleForm.clubRoles || []).map((r, idx) => (
                          <div key={idx} className="admin-role-tag">
                            <span className="role-tag-text">👑 <strong>{r.position}</strong> of {r.department}</span>
                            <button 
                              type="button" 
                              className="btn-remove-role" 
                              onClick={() => handleRemoveClubRole(idx)}
                              title="Remove Role"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add New Role Row */}
                    <div className="admin-add-role-row">
                      <select 
                        value={newRoleDept} 
                        onChange={(e) => setNewRoleDept(e.target.value)}
                        className="admin-select role-dept-select"
                      >
                        <option value="Human Resources">Human Resources (HR)</option>
                        <option value="Tournament Organizing Committee">Tournament Organizing Committee (OC)</option>
                        <option value="Multimedia & Design">Multimedia & Design (Media)</option>
                        <option value="Training & Masterclasses">Training & Masterclasses (Trainer)</option>
                        <option value="Trainee Development Pathway">Trainee Development Pathway (Trainee)</option>
                      </select>

                      <select 
                        value={newRolePos} 
                        onChange={(e) => setNewRolePos(e.target.value)}
                        className="admin-select role-pos-select"
                      >
                        <option value="Head">Head (Department Leader)</option>
                        <option value="Member">Member (Team Member)</option>
                      </select>

                      <button 
                        type="button" 
                        className="btn-add-role" 
                        onClick={handleAddClubRole}
                      >
                        <Plus size={16} />
                        <span>Add Role</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="admin-form-actions">
                  <button type="submit" className="btn-admin-save">
                    <CheckCircle2 size={18} />
                    <span>Save Privileges & Dossier to Database</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            9. DIRECT CHALLENGE MODAL POPUP
           ========================================================================= */}
        {challengeModalOpen && (
          <div className="modal-overlay-backdrop" onClick={() => setChallengeModalOpen(false)}>
            <div className="challenge-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <button 
                className="modal-close-btn" 
                onClick={() => setChallengeModalOpen(false)}
                title="Close"
              >
                <X size={20} />
              </button>

              <div className="modal-header-area">
                <div className="modal-icon-glow">
                  <Swords size={28} />
                </div>
                <h3>Challenge {profile.name}</h3>
                <p>Send an official 1-on-1 chess challenge across Zewail City campus</p>
              </div>

              {challengeSuccess ? (
                <div className="modal-success-state">
                  <CheckCircle2 size={40} className="success-icon" />
                  <h4>Challenge Dispatched!</h4>
                  <p>{challengeSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleSendDirectChallenge} className="challenge-modal-form">
                  <div className="form-group">
                    <label>⚡ Time Control</label>
                    <select 
                      value={challengeTimeControl}
                      onChange={(e) => setChallengeTimeControl(e.target.value)}
                      className="modal-select"
                    >
                      <option value="1+0 Bullet">1+0 Bullet (Lightning Reflexes)</option>
                      <option value="3+2 Blitz">3+2 Blitz (Campus Standard Favorite)</option>
                      <option value="5+3 Blitz">5+3 Blitz (Tactical Precision)</option>
                      <option value="10+0 Rapid">10+0 Rapid (Strategic Combat)</option>
                      <option value="30+0 Classical">30+0 Classical (Deep Calculation)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>📍 Campus Location</label>
                    <select 
                      value={challengeLocation}
                      onChange={(e) => setChallengeLocation(e.target.value)}
                      className="modal-select"
                    >
                      <option value="Academic Building Lounge">Academic Building Lounge</option>
                      <option value="Student Union Hall">Student Union Hall</option>
                      <option value="ZC Dorms Recreation Room">ZC Dorms Recreation Room</option>
                      <option value="Library Study Area (Silent Chess)">Library Study Area (Silent Chess)</option>
                      <option value="Lichess / Chess.com Online">Lichess / Chess.com Online</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>💬 Note / Custom Message (Optional)</label>
                    <input 
                      type="text" 
                      value={challengeMessage}
                      onChange={(e) => setChallengeMessage(e.target.value)}
                      placeholder="e.g. Ready for blitz after physics lecture? White or Black?"
                      className="modal-input"
                    />
                  </div>

                  <div className="modal-actions-row">
                    <button type="button" className="btn-modal-cancel" onClick={() => setChallengeModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-modal-submit">
                      <Send size={16} />
                      <span>Dispatch Challenge ⚔️</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            10. EXPLORE TOURNAMENTS BANNER (BOTTOM CTA)
           ========================================================================= */}
        <section className="dashboard-section" style={{ marginBottom: "50px" }}>
          <div className="explore-tournaments-banner glass-panel">
            <div className="banner-text-content">
              <div className="banner-chip">
                <Sparkles size={14} /> Official Championships Hub
              </div>
              <h3>Explore & Join Active Championships</h3>
              <p>
                Browse our active schedule of Swiss & Knockout tournaments, view match pairings, check standings, and register directly from the official Tournaments Hub!
              </p>
            </div>
            <a 
              href="/tournaments" 
              className="btn-banner-action"
            >
              <span>Go to Tournaments Page</span>
              <ChevronRight size={16} />
            </a>
          </div>
        </section>

        {/* =========================================================================
            11. FOLLOWERS & FOLLOWING NETWORK MODAL
           ========================================================================= */}
        {networkModalOpen && (
          <div className="modal-overlay-backdrop" onClick={() => setNetworkModalOpen(false)}>
            <div className="network-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <button 
                className="modal-close-btn" 
                onClick={() => setNetworkModalOpen(false)}
                title="Close"
              >
                <X size={20} />
              </button>

              <div className="network-modal-header">
                <div className="modal-icon-glow">
                  <Users size={26} />
                </div>
                <h3>{isOwnProfile ? "My Chess Network" : `${profile.name}'s Network`}</h3>
                <p>
                  {networkModalTab === 'followers' 
                    ? `Tacticians who followed ${isOwnProfile ? 'you' : profile.name}` 
                    : `Tacticians ${isOwnProfile ? 'you follow' : profile.name + ' is following'}`}
                </p>
              </div>

              {/* Tabs */}
              <div className="network-modal-tabs">
                <button 
                  className={`network-tab-btn ${networkModalTab === 'followers' ? 'active' : ''}`}
                  onClick={() => { setNetworkModalTab('followers'); setNetworkSearch(''); }}
                >
                  <Users size={14} />
                  <span>Followers ({followersList.length})</span>
                </button>
                <button 
                  className={`network-tab-btn ${networkModalTab === 'following' ? 'active' : ''}`}
                  onClick={() => { setNetworkModalTab('following'); setNetworkSearch(''); }}
                >
                  <UserCheck size={14} />
                  <span>Following ({followingList.length})</span>
                </button>
              </div>

              {/* Search Bar inside Modal */}
              <div className="network-search-box">
                <Search size={15} />
                <input 
                  type="text" 
                  placeholder={`Search ${networkModalTab === 'followers' ? 'followers' : 'following'} by name, major, or title...`}
                  value={networkSearch}
                  onChange={(e) => setNetworkSearch(e.target.value)}
                />
                {networkSearch && (
                  <button className="clear-search-mini" onClick={() => setNetworkSearch('')}>
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* List */}
              <div className="network-members-list">
                {isNetworkLoading ? (
                  <div className="network-empty-box" style={{ padding: "36px 12px" }}>
                    <div className="loading-spinner" style={{ width: "30px", height: "30px", margin: "0 auto 12px", border: "3px solid rgba(243, 193, 68, 0.2)", borderTopColor: "#f3c144", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.88rem" }}>Loading network roster...</p>
                  </div>
                ) : (() => {
                  const targetList = networkModalTab === 'followers' ? followersList : followingList;
                  const filtered = targetList.filter(u => 
                    !networkSearch || 
                    (u.name && u.name.toLowerCase().includes(networkSearch.toLowerCase())) ||
                    (u.email && u.email.toLowerCase().includes(networkSearch.toLowerCase())) ||
                    (u.major && u.major.toLowerCase().includes(networkSearch.toLowerCase())) ||
                    (u.chessTitle && u.chessTitle.toLowerCase().includes(networkSearch.toLowerCase()))
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="network-empty-box">
                        <Users size={32} className="empty-net-icon" />
                        <p>
                          {networkSearch 
                            ? `No members found matching "${networkSearch}".` 
                            : (networkModalTab === 'followers' 
                                ? `${isOwnProfile ? 'You have' : profile.name + ' has'} 0 followers currently.` 
                                : `${isOwnProfile ? 'You are' : profile.name + ' is'} following 0 members currently.`)}
                        </p>
                        <a href="/community" className="btn-explore-net" onClick={() => setNetworkModalOpen(false)}>
                          <span>Explore Campus Directory ➔</span>
                        </a>
                      </div>
                    );
                  }

                  return filtered.map((member, i) => {
                    const isSelf = loggedInEmail && member.email && member.email.toLowerCase() === loggedInEmail.toLowerCase();
                    const hasRating = (member.fideRating && member.fideRating > 0) || (member.chessComRating && member.chessComRating > 0) || (member.lichessRating && member.lichessRating > 0);
                    const displayRating = member.fideRating || member.chessComRating || member.lichessRating;
                    
                    // Relationship checks relative to logged-in user
                    const isFollowingThem = loggedInEmail && (
                      (isOwnProfile && networkModalTab === 'following') ||
                      (profile?.following || []).some(e => e.toLowerCase() === (member.email || "").toLowerCase()) ||
                      (member.followers || []).some(e => e.toLowerCase() === loggedInEmail.toLowerCase())
                    );

                    const theyFollowMe = loggedInEmail && (
                      (isOwnProfile && networkModalTab === 'followers') ||
                      (profile?.followers || []).some(e => e.toLowerCase() === (member.email || "").toLowerCase()) ||
                      (member.following || []).some(e => e.toLowerCase() === loggedInEmail.toLowerCase())
                    );

                    const isMutual = isFollowingThem && theyFollowMe;

                    return (
                      <div key={member.email || i} className="network-member-row">
                        <div className="net-member-info">
                          <img 
                            src={member.profileImage || "/Icons/user.jpg"} 
                            alt={member.name}
                            className="net-member-avatar"
                            onError={(e) => { e.target.src = "/Icons/unknown.png"; }}
                          />
                          <div className="net-member-texts">
                            <div className="net-name-row">
                              <span className="net-name">{member.name || member.email?.split('@')[0]}</span>
                              {isSelf ? (
                                <span className="net-self-tag">You</span>
                              ) : isMutual ? (
                                <span className="net-mutual-tag">🤝 Mutual</span>
                              ) : theyFollowMe ? (
                                <span className="net-follows-you-tag">Follows You</span>
                              ) : null}
                              {member.chessTitle && (
                                <span className="net-title-tag">{member.chessTitle}</span>
                              )}
                            </div>
                            <div className="net-subtext-row">
                              {hasRating ? (
                                <span className="net-rating">⭐ {displayRating} Elo</span>
                              ) : (
                                <span className="net-rating unrated" style={{ color: "#94a3b8" }}>♟️ Club Member</span>
                              )}
                              {member.major && (
                                <>
                                  <span className="net-dot">•</span>
                                  <span className="net-major">{member.major}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="net-member-actions">
                          {!isSelf && loggedInEmail && (
                            <button
                              type="button"
                              className={`btn-net-follow-toggle ${isFollowingThem ? 'following' : ''}`}
                              onClick={() => handleNetworkFollowToggle(member.email)}
                              title={isFollowingThem ? "Unfollow" : (theyFollowMe ? "Follow back" : "Follow")}
                            >
                              {isFollowingThem ? <UserCheck size={13} /> : <UserPlus size={13} />}
                              <span>{isFollowingThem ? "Following" : (theyFollowMe ? "Follow Back" : "Follow")}</span>
                            </button>
                          )}
                          {!isSelf && (
                            <button 
                              type="button" 
                              className="btn-net-duel"
                              onClick={() => {
                                setNetworkModalOpen(false);
                                setChallengeTimeControl("3+2 Blitz");
                                setChallengeModalOpen(true);
                              }}
                              title="Challenge to a duel"
                            >
                              <Swords size={13} />
                              <span>Duel</span>
                            </button>
                          )}
                          <a 
                            href={`/profile?email=${encodeURIComponent(member.email)}`}
                            className="btn-net-view"
                            onClick={() => setNetworkModalOpen(false)}
                          >
                            <span>Profile</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
