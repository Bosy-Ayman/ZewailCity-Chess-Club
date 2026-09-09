import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { 
  Users, Search, Swords, UserPlus, UserCheck, ExternalLink, 
  Crown, Heart, Send, X, CheckCircle2, Copy, Check, 
  Mail, Sparkles, User, MapPin
} from "lucide-react";
import { safeFetchJson } from "../utils/api";
import "./Community.css";
import "./HomePage.css";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

const DEFAULT_AVATARS = {
  "Bosy Ayman": "/Icons/bosy.png",
  "Omar Ezz": "/Icons/omar.png",
  "Youssef Tarek": "/Icons/youssef.png",
  "ZC Chess Club Admin": "/Icons/user.jpg"
};

const getPlayerAvatarUrl = (name, customAvatars = {}) => {
  if (customAvatars[name]) return customAvatars[name];
  if (DEFAULT_AVATARS[name]) return DEFAULT_AVATARS[name];
  return "/Icons/unknown.png";
};

const Community = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [customAvatars, setCustomAvatars] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'champions' | 'officers' | 'following' | 'active'
  const [isLoading, setIsLoading] = useState(true);

  // Social & Auth State
  const loggedInEmail = localStorage.getItem("adminEmail") || "";
  const userRole = localStorage.getItem("userRole") || "member";
  const isAdmin = userRole === "admin" || (loggedInEmail && loggedInEmail.toLowerCase() === "admin@zcchessclub.com");
  
  const [myProfile, setMyProfile] = useState(null);
  const [followingMap, setFollowingMap] = useState({});
  const [cheersMap, setCheersMap] = useState({});
  const [cheerBursts, setCheerBursts] = useState({});
  const [copiedEmail, setCopiedEmail] = useState(null);

  // Challenge Modal State
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [challengeTimeControl, setChallengeTimeControl] = useState("3+2 Blitz");
  const [challengeLocation, setChallengeLocation] = useState("Academic Building Lounge");
  const [challengeMessage, setChallengeMessage] = useState("");
  const [challengeSuccess, setChallengeSuccess] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Profile Preview Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalUser, setProfileModalUser] = useState(null);
  const [modalCheered, setModalCheered] = useState(false);


  // Fetch registered users & my profile
  useEffect(() => {
    const loadCommunity = async () => {
      setIsLoading(true);
      try {
        // Fetch all registered users
        const uList = await safeFetchJson(`${API_BASE}/api/users`);
        if (Array.isArray(uList)) {
        const validUsers = uList.filter(u => u.email && u.email.toLowerCase() !== "admin2@zcchessclub.com");
          setUsers(validUsers);
          // Seed cheer counts from real DB values
          const cMap = {};
          validUsers.forEach(u => { if (u.name) cMap[u.name] = u.cheers || 0; });
          setCheersMap(cMap);
        }

        // Fetch custom avatars
        const aData = await safeFetchJson(`${API_BASE}/api/players/avatars`);
        if (aData?.avatars) {
          setCustomAvatars(aData.avatars);
        }

        // Fetch current user profile if logged in
        if (loggedInEmail) {
          const myData = await safeFetchJson(`${API_BASE}/api/profile?email=${encodeURIComponent(loggedInEmail)}`);
          if (myData) {
            setMyProfile(myData);
            // Map following state
            const fMap = {};
            (myData.following || []).forEach(email => {
              fMap[email.toLowerCase()] = true;
            });
            setFollowingMap(fMap);
          }
        }
      } catch (err) {
        console.error("Error loading community:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCommunity();
  }, [loggedInEmail]);

  // Filter & Search Logic
  useEffect(() => {
    let result = [...users];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.major && u.major.toLowerCase().includes(q)) ||
        (u.chessTitle && u.chessTitle.toLowerCase().includes(q)) ||
        (u.favOpening && u.favOpening.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (activeFilter === "champions") {
      result = result.filter(u => 
        u.isChampion ||
        (u.chessTitle && u.chessTitle.trim().length > 0) ||
        (u.bio && (u.bio.toLowerCase().includes("champion") || u.bio.toLowerCase().includes("1st place"))) ||
        (u.fideRating && u.fideRating > 0) ||
        (u.chessComRating && u.chessComRating >= 1600)
      );
    } else if (activeFilter === "officers") {
      result = result.filter(u => u.role === "admin" || u.role === "officer" || u.role === "hr" || u.role === "oc");
    } else if (activeFilter === "following") {
      result = result.filter(u => followingMap[u.email?.toLowerCase()]);
    } else if (activeFilter === "followers") {
      const myFollowerEmails = (myProfile?.followers || []).map(e => e.toLowerCase());
      result = result.filter(u => 
        myFollowerEmails.includes(u.email?.toLowerCase()) ||
        (u.following || []).some(e => e.toLowerCase() === loggedInEmail.toLowerCase())
      );
    } else if (activeFilter === "active") {
      result = result.filter(u => u.fideRating > 0 || u.chessComRating > 0 || u.lichessRating > 0);
    }

    setFilteredUsers(result);
  }, [users, searchQuery, activeFilter, followingMap, myProfile, loggedInEmail]);

  // Social Actions
  const handleFollowToggle = async (targetEmail, targetName, e) => {
    e.stopPropagation();
    if (!loggedInEmail) {
      alert("Please log in with your Zewail City Google account to follow members!");
      window.location.href = "/?login=true";
      return;
    }

    const cleanTarget = targetEmail.toLowerCase();
    const isCurrentlyFollowing = !!followingMap[cleanTarget];

    // Optimistic UI update
    setFollowingMap(prev => ({
      ...prev,
      [cleanTarget]: !isCurrentlyFollowing
    }));

    try {
      const res = await safeFetchJson(`${API_BASE}/api/users/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerEmail: loggedInEmail, targetEmail })
      });

      if (res.success) {
        setFollowingMap(prev => ({ ...prev, [cleanTarget]: res.isFollowing }));
        // Update user followers count in local state
        setUsers(prev => prev.map(u => {
          if (u.email.toLowerCase() === cleanTarget) {
            return { ...u, followersCount: res.followersCount };
          }
          return u;
        }));
      }
    } catch (err) {
      // Revert optimistic update
      setFollowingMap(prev => ({ ...prev, [cleanTarget]: isCurrentlyFollowing }));
      alert("Follow update failed: " + err.message);
    }
  };

  const handleQuickCheer = async (member, e) => {
    if (e) e.stopPropagation();
    const name = member.name;
    const email = member.email;
    // Optimistic update
    setCheersMap(prev => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
    setCheerBursts(prev => ({ ...prev, [name]: true }));
    setTimeout(() => { setCheerBursts(prev => ({ ...prev, [name]: false })); }, 1200);
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
            setCheersMap(prev => ({ ...prev, [name]: data.cheers }));
          }
        }
      } catch (err) {
        console.warn('Cheer sync failed:', err.message);
      }
    }
  };

  const [modalChallengeSent, setModalChallengeSent] = useState(false);

  const handleOpenProfileModal = (member, e) => {
    if (e) e.stopPropagation();
    setProfileModalUser(member);
    setProfileModalOpen(true);
    setModalCheered(false);
    setModalChallengeSent(false);
  };

  const handleCloseProfileModal = () => {
    setProfileModalOpen(false);
    setProfileModalUser(null);
    setModalChallengeSent(false);
  };

  const handleModalCheer = async () => {
    if (!profileModalUser) return;
    await handleQuickCheer(profileModalUser, null);
    setModalCheered(true);
    setTimeout(() => setModalCheered(false), 2000);
  };

  const handleSendModalChallenge = async (e) => {
    e.preventDefault();
    if (!profileModalUser?.email) return;
    if (!loggedInEmail) {
      alert("Please log in with your Zewail City Google account to challenge members!");
      window.location.href = "/?login=true";
      return;
    }
    setModalChallengeSent(true);
    try {
      await safeFetchJson(`${API_BASE}/api/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: loggedInEmail,
          fromName: localStorage.getItem("userName") || (loggedInEmail ? loggedInEmail.split("@")[0] : "Campus Member"),
          targetEmail: profileModalUser.email,
          timeControl: challengeTimeControl,
          location: challengeLocation,
          message: `Challenge dispatched from Community Directory for a ${challengeTimeControl} match at ${challengeLocation}.`
        })
      });
    } catch (err) {
      console.warn("Could not record modal challenge:", err.message);
    }
  };

  const handleCopyEmail = (email, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const handleOpenChallengeModal = (player, e) => {
    if (e) e.stopPropagation();
    if (!loggedInEmail) {
      alert("Please log in with your Zewail City Google account to challenge members!");
      window.location.href = "/?login=true";
      return;
    }
    setSelectedPlayer(player);
    setChallengeSuccess("");
    setChallengeMessage("");
    setChallengeModalOpen(true);
  };

  const handleSendChallenge = async (e) => {
    e.preventDefault();
    if (!selectedPlayer || !loggedInEmail) return;

    setIsDispatching(true);
    try {
      const res = await safeFetchJson(`${API_BASE}/api/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: loggedInEmail,
          fromName: localStorage.getItem("userName") || loggedInEmail.split("@")[0],
          targetEmail: selectedPlayer.email,
          timeControl: challengeTimeControl,
          location: challengeLocation,
          message: challengeMessage || `Challenge for a ${challengeTimeControl} match at ${challengeLocation}.`
        })
      });

      setChallengeSuccess(res.message || "Duel challenge dispatched successfully!");
      setTimeout(() => {
        setChallengeModalOpen(false);
        setChallengeSuccess("");
      }, 2000);
    } catch (err) {
      alert("Error sending challenge: " + err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleCopyInviteText = (targetPlayer) => {
    const sender = localStorage.getItem("userName") || (loggedInEmail ? loggedInEmail.split("@")[0] : "A member");
    const target = targetPlayer ? targetPlayer.name : "tactician";
    const inviteText = `⚔️ Hey ${target}! I challenge you to a ${challengeTimeControl} chess match at ${challengeLocation}. Ready to play? — ${sender} (ZC Chess Club)`;
    navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  return (
    <div className="community-page">
      <Header />

      <main className="community-main">
        {/* Page Hero Header */}
        <section className="community-hero-section">
          <div className="community-hero-badge">
            <Users size={15} />
            <span>ZC Chess Club Network</span>
          </div>
          <h1 className="community-hero-title">ZC Chess Club Community</h1>
          <p className="community-hero-subtitle">
            Connect with your fellow campus chess players, follow peers, challenge members to 1-on-1 matches, and celebrate our university champions!
          </p>
        </section>

        {/* Logged-In User Social Bar */}
        {loggedInEmail && myProfile && (
          <section className="user-social-bar glass-panel">
            <div className="user-social-left">
              <div 
                className="user-social-avatar" 
                style={{ backgroundImage: `url("${myProfile.profileImage || '/Icons/user.jpg'}")` }}
              />
              <div className="user-social-info">
                <div className="user-social-name-row">
                  <h3>{myProfile.name || loggedInEmail.split('@')[0]}</h3>
                  <span className="user-self-pill">You</span>
                  {myProfile.chessTitle && (
                    <span className="user-title-pill"><Crown size={12} /> {myProfile.chessTitle}</span>
                  )}
                </div>
                <span className="user-social-email">{loggedInEmail}</span>
              </div>
            </div>

            <div className="user-social-stats">
              <button 
                type="button"
                className={`social-stat-item interactive ${activeFilter === 'followers' ? 'active' : ''}`}
                onClick={() => setActiveFilter(activeFilter === 'followers' ? 'all' : 'followers')}
                title="Filter directory to members who followed you"
              >
                <span className="stat-num">{myProfile.followers?.length || 0}</span>
                <span className="stat-lbl">Followers</span>
              </button>
              <div className="social-stat-divider" />
              <button 
                type="button"
                className={`social-stat-item interactive ${activeFilter === 'following' ? 'active' : ''}`}
                onClick={() => setActiveFilter(activeFilter === 'following' ? 'all' : 'following')}
                title="Filter directory to members you follow"
              >
                <span className="stat-num">{myProfile.following?.length || 0}</span>
                <span className="stat-lbl">Following</span>
              </button>
              <div className="social-stat-divider" />
              <div className="social-stat-item">
                <span className="stat-num gold">{myProfile.fideRating || myProfile.chessComRating || "1500"}</span>
                <span className="stat-lbl">Peak Elo</span>
              </div>
            </div>

            <div className="user-social-actions">
              <Link to="/profile" className="btn-social-profile">
                <User size={15} />
                <span>My Profile &amp; Challenges</span>
              </Link>
            </div>
          </section>
        )}

        {/* Search & Filter Controls */}
        <section className="community-controls-section">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text"
              placeholder="Search members by name, major, title, opening, or rating..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="community-search-input"
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery("")}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="community-filter-tabs">
            <button 
              className={`filter-tab-btn ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All Members ({users.length})
            </button>
            <button 
              className={`filter-tab-btn ${activeFilter === "champions" ? "active" : ""}`}
              onClick={() => setActiveFilter("champions")}
            >
              🏆 Campus Champions
            </button>
            <button 
              className={`filter-tab-btn ${activeFilter === "officers" ? "active" : ""}`}
              onClick={() => setActiveFilter("officers")}
            >
              👑 Club Leadership
            </button>
            {loggedInEmail && (
              <>
                <button 
                  className={`filter-tab-btn ${activeFilter === "followers" ? "active" : ""}`}
                  onClick={() => setActiveFilter("followers")}
                  title="Show members who followed you"
                >
                  🌟 Followed Me ({myProfile?.followers?.length || 0})
                </button>
                <button 
                  className={`filter-tab-btn ${activeFilter === "following" ? "active" : ""}`}
                  onClick={() => setActiveFilter("following")}
                  title="Show members you follow"
                >
                  👥 Following ({Object.values(followingMap).filter(Boolean).length})
                </button>
              </>
            )}
            <button 
              className={`filter-tab-btn ${activeFilter === "active" ? "active" : ""}`}
              onClick={() => setActiveFilter("active")}
            >
              ⚡ Rated Contenders
            </button>
          </div>
        </section>

        {/* Member Grid */}
        <section className="community-grid-section">
          {isLoading ? (
            <div className="community-loading-box">
              <div className="loading-spinner" />
              <p>Loading ZC Chess Club Community...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="community-members-grid">
              {filteredUsers.map((member, idx) => {
                const isSelf = loggedInEmail && member.email && member.email.toLowerCase() === loggedInEmail.toLowerCase();
                const isFollowing = !!followingMap[member.email?.toLowerCase()];
                const rating = member.fideRating || member.chessComRating || member.rating || 1500;
                const avatar = member.profileImage || getPlayerAvatarUrl(member.name, customAvatars);

                // Check mutual and follows-me relationships
                const memberFollowsMe = loggedInEmail && !isSelf && (
                  (myProfile?.followers || []).some(e => e.toLowerCase() === (member.email || "").toLowerCase()) ||
                  (member.following || []).some(e => e.toLowerCase() === loggedInEmail.toLowerCase())
                );
                const meFollowsMember = isFollowing;
                const isMutual = memberFollowsMe && meFollowsMember;

                return (
                  <div 
                    key={member.email || idx} 
                    className={`community-member-card glass-panel ${isSelf ? "is-self-card" : ""}`}
                    onClick={() => !isSelf && handleOpenProfileModal(member, null)}
                    style={{ cursor: isSelf ? "default" : "pointer" }}
                  >
                    {/* Top Identity Row */}
                    <div className="member-card-header">
                      <div className="member-avatar-box">
                        <img 
                          src={avatar} 
                          alt={member.name}
                          className="member-avatar-img"
                          onError={(e) => { e.target.src = "/Icons/unknown.png"; }}
                        />
                        <span className="member-rating-pill">{rating}</span>
                      </div>

                      <div className="member-header-meta">
                        {isSelf ? (
                          <span className="member-badge-self">
                            <Sparkles size={11} /> You
                          </span>
                        ) : isMutual ? (
                          <span className="member-badge-mutual" title="You both follow each other">
                            🤝 Mutual
                          </span>
                        ) : memberFollowsMe ? (
                          <span className="member-badge-follows-you" title="This tactician follows you">
                            Follows You
                          </span>
                        ) : member.chessTitle ? (
                          <span className="member-badge-title">
                            <Crown size={11} /> {member.chessTitle}
                          </span>
                        ) : member.role === "admin" ? (
                          <span className="member-badge-officer">
                            👑 Club Officer
                          </span>
                        ) : (
                          <span className="member-badge-standard">
                            ♟️ Club Member
                          </span>
                        )}

                        {member.isChampion && (
                          <span 
                            className="member-badge-champion" 
                            title={`Official Tournament Champion: ${Array.isArray(member.wonTournaments) && member.wonTournaments.length > 0 ? member.wonTournaments.join(', ') : 'Club Tournament Winner'}`}
                          >
                            🏆 Champion
                          </span>
                        )}

                        {member.email && (
                          <span 
                            className="member-email-copy-chip" 
                            onClick={(e) => handleCopyEmail(member.email, e)}
                            title={`Click to copy ${member.email}`}
                          >
                            <Mail size={11} />
                            <span>{member.email.split('@')[0]}</span>
                            {copiedEmail === member.email ? <Check size={10} className="copy-ok" /> : <Copy size={10} />}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Member Details */}
                    <div className="member-card-body">
                      <div className="member-name-row">
                        <h3 className="member-name">
                          {member.name || member.email.split('@')[0]}
                        </h3>
                        {isAdmin && !isSelf && (
                          <Link 
                            to={`/profile?email=${encodeURIComponent(member.email)}`}
                            className="member-admin-chip"
                            title="Administrator Dossier View"
                          >
                            <Crown size={11} /> Admin
                          </Link>
                        )}
                      </div>

                      <p className="member-subtitle">
                        {member.role === 'admin' ? "Club Administrator & Organizer" : (member.major ? `${member.major} • Class of ${member.batch || '2026'}` : "Zewailian Chess Tactician")}
                      </p>

                      <div className="member-opening-box">
                        <span className="op-label">Fav. Opening:</span>
                        <span className="op-val">{member.favOpening || "Flexible"}</span>
                      </div>
                    </div>

                    {/* Member Card Footer Actions */}
                    <div className="member-card-footer">
                      {isSelf ? (
                        /* Self Actions: No follow or duel yourself! */
                        <div className="self-actions-container">
                          <Link to="/profile" className="btn-member-self-profile">
                            <User size={14} />
                            <span>Manage My Profile</span>
                          </Link>
                        </div>
                      ) : (
                        /* Peer Actions: Cheer, Follow, Duel, Profile */
                        <>
                          <button 
                            className={`btn-member-cheer ${cheerBursts[member.name] ? "bursting" : ""}`}
                            onClick={(e) => handleQuickCheer(member, e)}
                            title="Send respect / cheer"
                          >
                            <Heart size={14} />
                            <span>{cheersMap[member.name] || 0}</span>
                          </button>

                          <button 
                            className={`btn-member-follow ${isFollowing ? "following" : "primary"}`}
                            onClick={(e) => handleFollowToggle(member.email, member.name, e)}
                            title={isFollowing ? "Unfollow" : (memberFollowsMe ? "Follow back" : "Follow")}
                          >
                            {isFollowing ? (
                              <>
                                <UserCheck size={14} />
                                <span>Following</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={14} />
                                <span>{memberFollowsMe ? "Follow Back" : "Follow"}</span>
                              </>
                            )}
                          </button>

                          <button 
                            className="btn-member-duel"
                            onClick={(e) => handleOpenChallengeModal(member, e)}
                            title={`Challenge ${member.name} to a 1-on-1 match`}
                          >
                            <Swords size={13} />
                            <span>Duel</span>
                          </button>

                          <Link 
                            to={`/profile?email=${encodeURIComponent(member.email)}`}
                            className="btn-member-profile"
                            title="View Full Profile"
                          >
                            <span>Profile</span>
                            <ExternalLink size={12} />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-community-box glass-panel">
              <Users size={36} className="empty-icon" />
              <h3>{activeFilter === 'followers' ? "No Followers Yet" : (activeFilter === 'following' ? "Not Following Anyone" : "No Members Found")}</h3>
              <p>
                {activeFilter === 'followers' 
                  ? "No one has followed your profile yet. Connect with fellow members and challenge them to friendly matches to build your campus network!" 
                  : activeFilter === 'following'
                    ? "You haven't followed any club members yet. Browse the directory below to find peers, officers, and champions to follow."
                    : "No club members match your search or filter criteria. Try clearing filters or searching for another student."}
              </p>
              <button className="btn-reset-filters" onClick={() => { setSearchQuery(""); setActiveFilter("all"); }}>
                View All Club Members
              </button>
            </div>
          )}
        </section>

        {/* Direct Challenge Modal Popup */}
        {challengeModalOpen && selectedPlayer && (
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
                <h3>Challenge {selectedPlayer.name}</h3>
                <p>Send an official 1-on-1 campus chess challenge</p>
              </div>

              {challengeSuccess ? (
                <div className="modal-success-state">
                  <CheckCircle2 size={40} className="success-icon" />
                  <h4>Challenge Dispatched!</h4>
                  <p>{challengeSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleSendChallenge} className="challenge-modal-form">
                  <div className="form-group">
                    <label>⚡ Time Control</label>
                    <select 
                      value={challengeTimeControl}
                      onChange={(e) => setChallengeTimeControl(e.target.value)}
                      className="modal-select"
                    >
                      <option value="3+2 Blitz">3+2 Blitz (Campus Standard)</option>
                      <option value="5+3 Blitz">5+3 Blitz (Tactical Precision)</option>
                      <option value="10+0 Rapid">10+0 Rapid (Strategic Combat)</option>
                      <option value="15+10 Rapid">15+10 Rapid (Championship Clock)</option>
                      <option value="Casual Over-the-Board">Casual Over-the-Board (Campus Meet)</option>
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
                      <option value="Zone E Chess Corner">Zone E Chess Corner</option>
                      <option value="Student Union Hall">Student Union Hall</option>
                      <option value="ZC Library Study Area">ZC Library Study Area</option>
                      <option value="Online (Chess.com / Lichess)">Online (Chess.com / Lichess)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>💬 Custom Note (Optional)</label>
                    <input 
                      type="text" 
                      value={challengeMessage}
                      onChange={(e) => setChallengeMessage(e.target.value)}
                      placeholder="e.g. Ready for blitz after physics lecture? White or Black?"
                      className="modal-input"
                    />
                  </div>

                  <div className="modal-actions-row">
                    <button 
                      type="button" 
                      className="btn-modal-cancel"
                      onClick={() => handleCopyInviteText(selectedPlayer)}
                      title="Copy invite text for WhatsApp or chat"
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      {copiedInvite ? <Check size={15} style={{ color: "#2ecc71" }} /> : <Copy size={15} />}
                      <span>{copiedInvite ? "Copied Invite! 📋" : "Copy Invite Text"}</span>
                    </button>
                    <button type="button" className="btn-modal-cancel" onClick={() => setChallengeModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-modal-submit" disabled={isDispatching}>
                      <Send size={16} />
                      <span>{isDispatching ? "Dispatching..." : "Dispatch Challenge ⚔️"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ===================== PROFILE PREVIEW MODAL (Synced with HomePage) ===================== */}
        {profileModalOpen && profileModalUser && (() => {
          const m = profileModalUser;
          const isSelf = loggedInEmail && m.email && m.email.toLowerCase() === loggedInEmail.toLowerCase();
          const isFollowing = !!followingMap[m.email?.toLowerCase()];
          const memberFollowsMe = loggedInEmail && !isSelf && (
            (myProfile?.followers || []).some(e => e.toLowerCase() === (m.email || "").toLowerCase()) ||
            (m.following || []).some(e => e.toLowerCase() === loggedInEmail.toLowerCase())
          );
          const isMutual = isFollowing && memberFollowsMe;
          const avatar = m.profileImage || getPlayerAvatarUrl(m.name, customAvatars);
          const cheerCount = cheersMap[m.name] ?? 0;

          return (
            <div className="tactician-modal-overlay" onClick={handleCloseProfileModal}>
              <div className="tactician-modal-content" onClick={e => e.stopPropagation()}>
                <button 
                  className="tactician-modal-close" 
                  onClick={handleCloseProfileModal}
                  aria-label="Close Profile"
                >
                  ✕
                </button>

                <div className="tactician-modal-header">
                  <div className="tactician-modal-avatar-frame">
                    <img 
                      src={avatar} 
                      alt={m.name} 
                      className="tactician-modal-avatar"
                      onError={(e) => { e.target.src = "/Icons/unknown.png"; }}
                    />
                    <span className="tactician-modal-glow"></span>
                  </div>
                  <div className="tactician-modal-hero-info">
                    <div className="tactician-modal-badge">
                      {m.chessTitle ? `${m.chessTitle} Titled` : (m.role === 'admin' ? '👑 Club Officer' : '♟️ Club Member')}
                    </div>
                    <h2 className="tactician-modal-name">{m.name || m.email?.split('@')[0]}</h2>
                    <p className="tactician-modal-title">
                      {m.role === 'admin' ? 'Club Administrator & Organizer' : (m.major ? `${m.major} Student` : 'ZC Chess Club Tactician')}
                    </p>

                    {/* Email Display with Copy */}
                    {m.email && (
                      <div 
                        className="modal-email-chip" 
                        onClick={() => handleCopyEmail(m.email, { stopPropagation: () => {} })}
                        title="Click to copy student email"
                      >
                        <Mail size={13} />
                        <span>{m.email}</span>
                        {copiedEmail === m.email ? (
                          <span className="copy-tag ok"><Check size={11} /> Copied!</span>
                        ) : (
                          <span className="copy-tag"><Copy size={11} /> Copy</span>
                        )}
                      </div>
                    )}

                    <div className="tactician-modal-chips-row">
                      <span className="modal-chip"><MapPin size={11} /> ZC Campus</span>
                      {m.major && <span className="modal-chip">{m.major}</span>}
                      {m.batch && <span className="modal-chip">Class of {m.batch}</span>}
                      {isMutual && <span className="modal-chip" style={{background: 'rgba(16,185,129,0.15)', color: '#34d399'}}>🤝 Mutual</span>}
                      {!isMutual && memberFollowsMe && <span className="modal-chip" style={{background: 'rgba(56,189,248,0.15)', color: '#38bdf8'}}>Follows You</span>}
                    </div>
                  </div>
                </div>

                {/* Direct Profile Link Row */}
                <div className="tactician-modal-links-bar">
                  <a 
                    href={`/profile?email=${encodeURIComponent(m.email)}`}
                    className="btn-modal-full-profile"
                  >
                    <span>View Full Profile, Tournaments &amp; Accolades ➔</span>
                  </a>

                  {isAdmin && (
                    <a 
                      href={`/profile?email=${encodeURIComponent(m.email)}`}
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
                    <span className="modal-stat-num">{m.fideRating > 0 ? m.fideRating : "—"}</span>
                    <span className="modal-stat-label">FIDE Elo</span>
                  </div>
                  <div className="modal-stat-box">
                    <span className="modal-stat-num">{m.chessComRating > 0 ? m.chessComRating : "—"}</span>
                    <span className="modal-stat-label">Chess.com</span>
                  </div>
                  <div className="modal-stat-box">
                    <span className="modal-stat-num">{m.lichessRating > 0 ? m.lichessRating : "—"}</span>
                    <span className="modal-stat-label">Lichess</span>
                  </div>
                  <div className="modal-stat-box">
                    <span className="modal-stat-num">{(m.followers || []).length}</span>
                    <span className="modal-stat-label">Followers</span>
                  </div>
                </div>

                {/* Bio & Tactical Details */}
                <div className="tactician-modal-section">
                  <h4>Tactical Profile &amp; Bio</h4>
                  <p className="tactician-modal-bio">{m.bio || "Active registered tactician of Zewail City Chess Club."}</p>
                  
                  <div className="tactician-attributes-row">
                    <div className="attribute-item">
                      <span className="attr-label">Signature Opening:</span>
                      <span className="attr-val">{m.favOpening || "Flexible Openings"}</span>
                    </div>
                    <div className="attribute-item">
                      <span className="attr-label">Campus Role:</span>
                      <span className="attr-val">{m.role === 'admin' ? 'Club Officer' : 'Club Tactician'}</span>
                    </div>
                  </div>
                </div>

                {/* Cheer & Challenge Actions */}
                {!isSelf && (
                  <div className="tactician-modal-actions-box">
                    <div className="tactician-cheer-action-row">
                      <button 
                        className={`modal-cheer-cta ${modalCheered ? "active" : ""}`}
                        onClick={handleModalCheer}
                      >
                        <Heart size={16} className={modalCheered ? "fill-heart" : ""} />
                        <span>Cheer for {(m.name || '').split(' ')[0]} ({cheerCount})</span>
                      </button>
                      <span className="cheer-hint">Cheer on your campus friends!</span>
                    </div>

                    <div className="tactician-modal-social-row" style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
                      <button
                        className={`ppm-btn-follow ${isFollowing ? 'following' : ''}`}
                        style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '10px', border: 'none', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', background: isFollowing ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.12)', color: isFollowing ? '#34d399' : '#60a5fa', transition: 'all 0.2s ease'}}
                        onClick={(e) => handleFollowToggle(m.email, m.name, e)}
                      >
                        {isFollowing ? <><UserCheck size={14} /><span>Following</span></> : <><UserPlus size={14} /><span>{memberFollowsMe ? 'Follow Back' : 'Follow'}</span></>}
                      </button>
                    </div>

                    {/* Challenge Form */}
                    <div className="tactician-challenge-form-wrapper">
                      <h4 className="challenge-form-title">
                        <Swords size={16} />
                        <span>Send a Friendly Campus Challenge</span>
                      </h4>

                      {modalChallengeSent ? (
                        <div className="challenge-sent-alert">
                          <CheckCircle2 size={24} className="challenge-check-icon" />
                          <div>
                            <h5>Challenge Invitation Recorded!</h5>
                            <p>An in-app invitation for a {challengeTimeControl} match at {challengeLocation} has been delivered to {m.name}'s account.</p>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleSendModalChallenge} className="campus-challenge-form">
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

                          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                            <button 
                              type="button" 
                              className="ppm-btn-message"
                              onClick={() => handleCopyInviteText(m)}
                              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#eee", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700 }}
                            >
                              {copiedInvite ? <Check size={14} style={{ color: "#2ecc71" }} /> : <Copy size={14} />}
                              <span>{copiedInvite ? "Copied! 📋" : "Copy Invite Text"}</span>
                            </button>
                            <button type="submit" className="challenge-submit-btn" style={{ flex: 1 }}>
                              <Send size={15} />
                              <span>Issue Campus Challenge</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </main>

      <Footer />
    </div>
  );
};

export default Community;
