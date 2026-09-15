import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { safeFetchJson, safeSetLocalStorage, compressImage } from "../utils/api";
import { getUserTournamentAchievements, getHistoricalTournamentsForUser, ALL_HISTORICAL_PLAYERS } from "../utils/tournamentWinners";
import { findCommonFreeSlots, timeStringToMinutes, minutesToTimeString } from "../utils/availabilityMatcher";
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
  Plus,
  Trash2
} from "lucide-react";
import "./Profile.css";

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

export const deriveAuthorityRoleFromClubRoles = (clubRoles, fallbackRole = 'member') => {
  if (Array.isArray(clubRoles) && clubRoles.length > 0) {
    if (clubRoles.some(r => r.department === 'Executive High Board' && r.position === 'President')) return 'president';
    if (clubRoles.some(r => r.department === 'Executive High Board' && r.position === 'Vice President')) return 'vice_president';
    if (clubRoles.some(r => r.department === 'Tournament Organizing Committee' && r.position === 'Head')) return 'oc';
    if (clubRoles.some(r => r.department === 'Human Resources' && r.position === 'Head')) return 'hr';
    if (clubRoles.some(r => r.department === 'Public Relations' && r.position === 'Head')) return 'pr';
    if (clubRoles.some(r => r.department === 'Multimedia & Design' && r.position === 'Head')) return 'media';
    if (clubRoles.some(r => r.department === 'Training & Masterclasses' && r.position === 'Head')) return 'trainer';
    if (clubRoles.some(r => r.department === 'Executive High Board')) return 'president';
    if (clubRoles.some(r => r.department === 'Tournament Organizing Committee')) return 'oc';
    if (clubRoles.some(r => r.department === 'Human Resources')) return 'hr';
    if (clubRoles.some(r => r.department === 'Public Relations')) return 'pr';
    if (clubRoles.some(r => r.department === 'Multimedia & Design')) return 'media';
    if (clubRoles.some(r => r.department === 'Training & Masterclasses')) return 'trainer';
    if (clubRoles.some(r => r.department === 'Trainee Development Pathway')) return 'trainee';
  }
  if (fallbackRole === 'admin') return 'president';
  return fallbackRole || 'member';
};

export default function Profile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const queryParams = new URLSearchParams(window.location.search);
  const queryEmail = queryParams.get("email");
  const queryName = queryParams.get("name");
  
  const loggedInEmail = localStorage.getItem("adminEmail") || localStorage.getItem("userEmail") || "";
  const loggedInRole = localStorage.getItem("userRole") || "member";
  const isAdmin = loggedInRole === "admin" || (loggedInEmail && (
    loggedInEmail.toLowerCase() === "admin@zcchessclub.com" ||
    loggedInEmail.toLowerCase().includes("poussy.ayman") ||
    loggedInEmail.toLowerCase().includes("bosy.ayman") ||
    loggedInEmail.toLowerCase().includes("poussyayman")
  ));
  
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
  const [cheerCount, setCheerCount] = useState(0);

const DEPARTMENT_POSITIONS = {
  "Executive High Board": [
    { value: "President", label: "👑 President (Club Leader)" },
    { value: "Vice President", label: "⭐ Vice President (Deputy Club Leader)" }
  ],
  "Human Resources": [
    { value: "Head", label: "👑 Head of HR (Department Leader)" },
    { value: "Member", label: "✨ HR Member (Committee Member)" }
  ],
  "Public Relations": [
    { value: "Head", label: "👑 Head of PR (Department Leader)" },
    { value: "Member", label: "✨ PR Member (Committee Member)" }
  ],
  "Tournament Organizing Committee": [
    { value: "Head", label: "👑 Head of OC (Department Leader)" },
    { value: "Member", label: "✨ OC Member (Committee Member)" }
  ],
  "Multimedia & Design": [
    { value: "Head", label: "👑 Head of Multimedia (Department Leader)" },
    { value: "Member", label: "✨ Multimedia Member (Committee Member)" }
  ],
  "Training & Masterclasses": [
    { value: "Head", label: "👑 Head of Training (Department Leader)" },
    { value: "Member", label: "✨ Trainer Member (Committee Member)" }
  ],
  "Trainee Development Pathway": [
    { value: "Trainee", label: "♟️ Dedicated Trainee" }
  ]
};

const deriveAuthorityRoleFromClubRoles = (roles) => {
  if (!Array.isArray(roles) || roles.length === 0) return "member";
  if (roles.some(r => r.department === "Executive High Board" && r.position === "President")) return "president";
  if (roles.some(r => r.department === "Executive High Board" && r.position === "Vice President")) return "vice_president";
  if (roles.some(r => r.department === "Human Resources" && r.position === "Head")) return "hr";
  if (roles.some(r => r.department === "Public Relations" && r.position === "Head")) return "pr";
  if (roles.some(r => r.department === "Tournament Organizing Committee" && r.position === "Head")) return "oc";
  if (roles.some(r => r.department === "Multimedia & Design" && r.position === "Head")) return "media";
  if (roles.some(r => r.department === "Training & Masterclasses" && r.position === "Head")) return "trainer";
  if (roles.some(r => r.department === "Executive High Board")) return "president";
  if (roles.some(r => r.department === "Human Resources")) return "hr";
  if (roles.some(r => r.department === "Public Relations")) return "pr";
  if (roles.some(r => r.department === "Tournament Organizing Committee")) return "oc";
  if (roles.some(r => r.department === "Multimedia & Design")) return "media";
  if (roles.some(r => r.department === "Training & Masterclasses")) return "trainer";
  if (roles.some(r => r.department === "Trainee Development Pathway")) return "trainee";
  return "member";
};

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
  const [newRoleDept, setNewRoleDept] = useState("Executive High Board");
  const [newRolePos, setNewRolePos] = useState("President");
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

  // Weekly Free Hours & Match Availability State
  const [availability, setAvailability] = useState([]);
  const [viewerAvailability, setViewerAvailability] = useState([]);
  const [newSlotDay, setNewSlotDay] = useState("Tuesday");
  const [newSlotFrom, setNewSlotFrom] = useState("08:00");
  const [newSlotTo, setNewSlotTo] = useState("09:00");
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [availSuccessMsg, setAvailSuccessMsg] = useState("");

  const handleSaveAvailability = async (updatedList) => {
    setIsSavingAvailability(true);
    setAvailSuccessMsg("");
    try {
      const email = profile?.email || loggedInEmail;
      const res = await fetch(`${API_BASE}/api/users/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, availability: updatedList })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update availability");
      setAvailability(updatedList);
      setProfile(prev => prev ? { ...prev, availability: updatedList } : prev);
      setAvailSuccessMsg("Weekly free hours saved & synced with tournament matchmaker!");
      setTimeout(() => setAvailSuccessMsg(""), 4000);
    } catch (err) {
      alert("Error saving availability: " + err.message);
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleAddSlot = (e) => {
    if (e) e.preventDefault();
    if (!newSlotFrom || !newSlotTo) {
      alert("Please specify both start and end time.");
      return;
    }
    const updated = [...availability, {
      day: newSlotDay,
      from: newSlotFrom,
      to: newSlotTo
    }];
    handleSaveAvailability(updated);
  };

  const handleRemoveSlot = (indexToRemove) => {
    const updated = availability.filter((_, idx) => idx !== indexToRemove);
    handleSaveAvailability(updated);
  };

  const handleQuickPreset = (day, from, to) => {
    const updated = [...availability, { day, from, to }];
    handleSaveAvailability(updated);
  };

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
      if (!profData) return;

      const effectiveLoadedRole = deriveAuthorityRoleFromClubRoles(profData.clubRoles, profData.role);

      setProfile({
        ...profData,
        role: effectiveLoadedRole
      });
      setAvailability(profData.availability || []);
      setCheerCount(profData.cheers || 0);
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
        role: effectiveLoadedRole,
        clubRoles: Array.isArray(profData.clubRoles) ? profData.clubRoles : []
      });

      if (isOwnProfile && profData) {
        safeSetLocalStorage("userRole", effectiveLoadedRole);
        window.dispatchEvent(new Event("userRoleUpdated"));
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

      // If viewing another tactician, fetch viewer's availability to calculate mutual free windows
      if (!isOwnProfile && loggedInEmail) {
        try {
          const myAvailRes = await safeFetchJson(`${API_BASE}/api/users/${encodeURIComponent(loggedInEmail)}/availability`);
          if (myAvailRes && Array.isArray(myAvailRes.availability)) {
            setViewerAvailability(myAvailRes.availability);
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      if (!profile) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCheer = async () => {
    setCheered(true);
    setCheerCount(prev => prev + 1);
    try {
      const res = await fetch(`${API_BASE}/api/users/cheer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmail: profile?.email || targetEmail || "",
          targetName: profile?.name || queryName || "",
          cheererEmail: loggedInEmail || "",
          cheererName: localStorage.getItem("userName") || ""
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.cheers === "number") {
          setCheerCount(data.cheers);
        }
      }
    } catch (e) {
      console.warn("Cheer failed:", e.message);
    }
    setTimeout(() => setCheered(false), 2000);
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
      const targetUserEmail = profile?.email || queryEmail || loggedInEmail;

      // Instant 0ms visual update in local state
      setProfile(prev => ({ ...prev, profileImage: compressedBase64 }));
      setAdminRoleForm(prev => ({ ...prev, profileImage: compressedBase64 }));

      if (isOwnProfile) {
        safeSetLocalStorage("userAvatar", compressedBase64);
        window.dispatchEvent(new Event("userAvatarUpdated"));
      }

      // Background DB sync
      try {
        const data = await safeFetchJson(`${API_BASE}/api/profile/image`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetUserEmail, profileImage: compressedBase64 })
        });
        if (data?.profileImage) {
          setProfile(prev => ({ ...prev, profileImage: data.profileImage }));
          setAdminRoleForm(prev => ({ ...prev, profileImage: data.profileImage }));
          if (isOwnProfile) {
            safeSetLocalStorage("userAvatar", data.profileImage);
            window.dispatchEvent(new Event("userAvatarUpdated"));
          }
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
      if (typeof res.followersCount === "number") {
        setFollowersCount(res.followersCount);
      }
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

  const handleDeptChange = (dept) => {
    setNewRoleDept(dept);
    const available = DEPARTMENT_POSITIONS[dept] || [];
    if (available.length > 0) {
      setNewRolePos(available[0].value);
    }
  };

  const handleAddClubRole = () => {
    if (!newRoleDept || !newRolePos) return;
    setAdminRoleForm(prev => {
      const existing = prev.clubRoles || [];
      if (existing.some(r => r.department === newRoleDept && r.position === newRolePos)) {
        return prev;
      }
      const updatedRoles = [...existing, { department: newRoleDept, position: newRolePos, assignedAt: new Date().toISOString() }];
      const newAuthorityRole = deriveAuthorityRoleFromClubRoles(updatedRoles);

      return {
        ...prev,
        role: newAuthorityRole,
        clubRoles: updatedRoles
      };
    });
  };

  const handleRemoveClubRole = (indexToRemove) => {
    setAdminRoleForm(prev => {
      const updatedRoles = (prev.clubRoles || []).filter((_, idx) => idx !== indexToRemove);
      const newAuthorityRole = deriveAuthorityRoleFromClubRoles(updatedRoles);
      return {
        ...prev,
        role: newAuthorityRole,
        clubRoles: updatedRoles
      };
    });
  };

  const handleAdminSaveUser = async (e) => {
    e.preventDefault();
    setAdminSaveSuccess("");
    setAdminSaveError("");

    if (!loggedInEmail) {
      setAdminSaveError("Please log in with your administrator account before managing user dossiers.");
      return;
    }

    const effectiveTargetEmail = profile?.email || targetEmail;
    if (!effectiveTargetEmail) {
      setAdminSaveError("Target player email is missing. Make sure this tactician has an email assigned.");
      return;
    }

    try {
      const res = await safeFetchJson(`${API_BASE}/api/admin/manage-user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: loggedInEmail,
          targetEmail: effectiveTargetEmail,
          ...adminRoleForm
        })
      });

      const effectiveSavedRole = (adminRoleForm.clubRoles && adminRoleForm.clubRoles.length > 0)
        ? deriveAuthorityRoleFromClubRoles(adminRoleForm.clubRoles)
        : (adminRoleForm.role === 'admin' ? 'president' : (adminRoleForm.role || 'member'));

      setAdminSaveSuccess(res.message || "Player dossier and privileges updated successfully!");
      setProfile(prev => ({
        ...prev,
        ...adminRoleForm,
        role: effectiveSavedRole
      }));
      setAdminRoleForm(prev => ({
        ...prev,
        role: effectiveSavedRole
      }));

      // If editing current user, sync localStorage and broadcast update
      if (isOwnProfile || (effectiveTargetEmail && loggedInEmail && effectiveTargetEmail.toLowerCase() === loggedInEmail.toLowerCase())) {
        safeSetLocalStorage("userRole", effectiveSavedRole);
        window.dispatchEvent(new Event("userRoleUpdated"));
      }
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

  const getDynamicCampusStanding = () => {
    if (!profile) return { value: "Registered", hint: "Tactician", badgeClass: "green", detailTitle: "Club Contender" };

    // 1. Executive Board Roles
    if (profile.role === 'president') {
      return { value: "President", hint: "👑 High Board Executive", badgeClass: "gold", detailTitle: "👑 Club President & High Board" };
    }
    if (profile.role === 'vice_president') {
      return { value: "Vice President", hint: "⭐ High Board Executive", badgeClass: "purple", detailTitle: "⭐ Vice President & High Board" };
    }
    if (profile.role === 'admin') {
      return { value: "High Board", hint: "👑 Club Administrator", badgeClass: "gold", detailTitle: "👑 High Board Executive" };
    }
    if (profile.role === 'oc') {
      return { value: "Head of OC", hint: "⚡ Tournament Organizing", badgeClass: "gold", detailTitle: "⚡ Head of Tournament Organizing Committee" };
    }
    if (profile.role === 'hr') {
      return { value: "Head of HR", hint: "👥 Human Resources", badgeClass: "gold", detailTitle: "👥 Head of Human Resources" };
    }
    if (profile.role === 'pr') {
      return { value: "Head of PR", hint: "📢 Public Relations", badgeClass: "gold", detailTitle: "📢 Head of Public Relations" };
    }
    if (profile.role === 'media') {
      return { value: "Head of Media", hint: "🎨 Multimedia & Design", badgeClass: "gold", detailTitle: "🎨 Head of Multimedia & Design" };
    }
    if (profile.role === 'trainer') {
      return { value: "Head Trainer", hint: "🎓 Training & Masterclasses", badgeClass: "gold", detailTitle: "🎓 Masterclass Head Trainer" };
    }
    if (profile.role === 'trainee') {
      return { value: "Club Trainee", hint: "♟️ Trainee Pathway", badgeClass: "cyan", detailTitle: "♟️ Trainee Development Pathway" };
    }

    // 2. Department Committee Role in clubRoles array
    if (Array.isArray(profile.clubRoles) && profile.clubRoles.length > 0) {
      const primaryRole = profile.clubRoles[0];
      const deptShort = (primaryRole.department || "")
        .replace("Tournament Organizing Committee", "OC")
        .replace("Human Resources", "HR")
        .replace("Public Relations", "PR")
        .replace("Multimedia & Design", "Media")
        .replace("Training & Masterclasses", "Training");
      return {
        value: primaryRole.position || "Staff",
        hint: `✨ ${deptShort}`,
        badgeClass: "gold",
        detailTitle: `✨ ${primaryRole.position} of ${primaryRole.department}`
      };
    }

    // 3. Tournament Champion
    if (tournamentAchievements?.isChampion) {
      const topWon = tournamentAchievements.wonTournaments?.[0] || "Tournament Victor";
      return {
        value: "Champion 🏆",
        hint: `🥇 ${topWon}`,
        badgeClass: "gold",
        detailTitle: `🏆 Tournament Champion (${topWon})`
      };
    }

    // 4. Tournament Podium
    if (tournamentAchievements?.isPodium) {
      const topPodium = tournamentAchievements.podiumTournaments?.[0] || "Top 3";
      return {
        value: "Podium 🥈",
        hint: `🥈 ${topPodium}`,
        badgeClass: "cyan",
        detailTitle: `🥈 Podium Finisher (${topPodium})`
      };
    }

    // 5. Official Chess Title
    if (profile.chessTitle) {
      return {
        value: profile.chessTitle,
        hint: "🎖️ Official Title",
        badgeClass: "gold",
        detailTitle: `🎖️ ${profile.chessTitle} (Official Title)`
      };
    }

    // 6. Active Competitor
    if (tournaments.length > 0) {
      return {
        value: "Competitor",
        hint: `⚔️ Enrolled in ${tournaments.length} Event${tournaments.length > 1 ? 's' : ''}`,
        badgeClass: "cyan",
        detailTitle: `⚔️ Active Competitor (${tournaments.length} Tournament${tournaments.length > 1 ? 's' : ''})`
      };
    }

    // 7. Rated Contender
    if (highestRating > 0) {
      return {
        value: "Rated Player",
        hint: `⚡ Peak ${highestRating} Elo`,
        badgeClass: "green",
        detailTitle: `⚡ Rated Contender (Peak ${highestRating} Elo)`
      };
    }

    // 8. Academic Affiliation
    if (profile.major) {
      return {
        value: profile.batch ? `Batch ${profile.batch}` : "ZC Student",
        hint: `🎓 ${profile.major.split(' ')[0]}`,
        badgeClass: "green",
        detailTitle: `🎓 ${profile.major} ${profile.batch ? `(Batch ${profile.batch})` : ''}`
      };
    }

    return {
      value: "Verified Member",
      hint: "♟️ ZC Chess Club",
      badgeClass: "green",
      detailTitle: "♟️ Verified Zewail City Member"
    };
  };

  const dynamicStanding = getDynamicCampusStanding();

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
      <div className="page-loading site-loading-state">
        <div className="loading-spinner lg site-loading-spinner"></div>
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
                  {(isOwnProfile || isAdmin) ? (
                    <label 
                      htmlFor="profileImageUpload" 
                      className="profile-image-upload-label" 
                      title={isAdmin && !isOwnProfile ? `Change ${profile.name || 'Member'}'s Profile Picture (Admin Mode)` : "Click to upload profile photo"}
                      style={{ cursor: "pointer" }}
                    >
                      <div 
                        className="profile-user-img" 
                        style={{ backgroundImage: `url("${profile.profileImage || '/Icons/unknown.png'}")` }}
                      >
                        <div className="profile-img-overlay">
                          <Camera size={26} />
                          <span>{isAdmin && !isOwnProfile ? "Change Member Photo" : "Change Photo"}</span>
                        </div>
                      </div>
                    </label>
                  ) : (
                    <div 
                      className="profile-user-img" 
                      style={{ backgroundImage: `url("${profile.profileImage || '/Icons/unknown.png'}")` }}
                    />
                  )}
                  <div className="avatar-status-dot" title="Active ZC Member" />
                  {(isOwnProfile || isAdmin) && (
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
                  <h1 className="hero-player-name">{profile.name}</h1>
                  <span className="hero-user-handle">@{profile.email ? profile.email.split("@")[0] : "tactician"}</span>
                </div>

                <div className="hero-badges-wrap">
                  {profile.chessTitle && (
                    <span className="badge-chess-title" title={`Official FIDE Title: ${profile.chessTitle}`}>
                      🏆 {profile.chessTitle}
                    </span>
                  )}

                  {profile.clubRoles && profile.clubRoles.length > 0 && (
                    profile.clubRoles.map((cr, idx) => (
                      <span key={idx} className="badge-club-department-role" title={`${cr.position} of ${cr.department}`}>
                        {cr.position === 'President' ? '👑' : cr.position === 'Vice President' ? '⭐' : cr.position === 'Head' ? '👑' : '✨'} {cr.position} of {cr.department}
                      </span>
                    ))
                  )}

                  {!isOwnProfile && profile.followsViewer && (
                    <span className={`badge-follows-you ${isFollowing ? 'mutual' : ''}`} title={isFollowing ? "You follow each other" : "This tactician follows your profile"}>
                      {isFollowing ? "✨ Mutual Tacticians" : "Follows You"}
                    </span>
                  )}

                  <span className={`hero-role-badge ${profile.role || 'member'}`}>
                    {profile.role === 'president' && <>👑 Club President</>}
                    {profile.role === 'vice_president' && <>⭐ Vice President</>}
                    {profile.role === 'oc' && <>⚡ Head of OC</>}
                    {profile.role === 'hr' && <>👥 Head of HR</>}
                    {profile.role === 'pr' && <>📢 Head of PR</>}
                    {profile.role === 'media' && <>🎨 Head of Multimedia</>}
                    {profile.role === 'trainer' && <>🎓 Head of Training</>}
                    {profile.role === 'trainee' && <>♟️ Dedicated Trainee</>}
                    {profile.role === 'admin' && <>👑 High Board Executive</>}
                    {(!profile.role || profile.role === 'member') && (
                      profile.chessTitle 
                        ? <>🎖️ {profile.chessTitle}</>
                        : tournamentAchievements.isChampion
                        ? <>🏆 Arena Champion</>
                        : tournamentAchievements.isPodium
                        ? <>🥈 Podium Finisher</>
                        : tournaments.length > 0
                        ? <>⚔️ Tournament Contender</>
                        : profile.major
                        ? <>🎓 {profile.major.split(' ')[0]} Tactician</>
                        : <>♟️ Club Contender</>
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
                  <span className="social-stat-dot">•</span>
                  <span className="social-stat-item highlight-cheers">
                    👏 <strong>{cheerCount}</strong> Cheers
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

                  {profile.playstyle && (
                    <div className="hero-meta-item" title="Chess Playstyle">
                      <Flame size={14} className="meta-icon" />
                      <span>{profile.playstyle}</span>
                    </div>
                  )}

                  {profile.createdAt && (
                    <div className="hero-meta-item" title="Club Join Date">
                      <Clock size={14} className="meta-icon" />
                      <span>Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                    </div>
                  )}

                  {profile.verified && (
                    <div className="hero-meta-item verified-tag" title="Verified Zewail City Student Tactician">
                      <CheckCircle2 size={14} className="meta-icon verified-icon" />
                      <span>Verified Tactician</span>
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

                    {/* Cheer Button */}
                    <button 
                      className={`btn-hero-action cheer-btn ${cheered ? 'cheered' : ''}`}
                      onClick={handleSendCheer}
                      title="Send Cheers"
                    >
                      <Heart size={16} fill={cheered ? "#ef4444" : "none"} color={cheered ? "#ef4444" : "currentColor"} />
                      <span>{cheerCount} Cheers</span>
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
                <div className={`stat-value ${dynamicStanding.badgeClass}`}>{dynamicStanding.value}</div>
                <div className="stat-hint" title={dynamicStanding.hint}>{dynamicStanding.hint}</div>
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

          <button 
            type="button"
            className={`dashboard-tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            <Clock size={16} />
            <span>Free Hours &amp; Match Schedule</span>
            {availability.length > 0 && <span className="tab-badge-count gold">{availability.length}</span>}
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
                  <div className="detail-item">
                    <span className="detail-label"><Clock size={14} /> Member Since</span>
                    <span className="detail-val">
                      {profile?.createdAt 
                        ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) 
                        : "Active ZC Tactician"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><Shield size={14} /> Campus Standing</span>
                    <span className="detail-val">
                      {dynamicStanding.detailTitle}
                    </span>
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
                  <div className="detail-item">
                    <span className="detail-label"><Flame size={14} /> Preferred Playing Style</span>
                    <span className="detail-val playstyle-badge">
                      ⚡ {profile?.playstyle || "Dynamic & Tactical / Universal"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label"><Heart size={14} /> Campus Cheers Received</span>
                    <span className="detail-val cheer-count-badge">
                      👏 {cheerCount} Community Cheers
                    </span>
                  </div>
                  {profile?.linkedHistoricalName && (
                    <div className="detail-item">
                      <span className="detail-label"><Trophy size={14} /> Historical Champion Profile</span>
                      <span className="detail-val highlight-gold">
                        🏅 Linked to: {profile.linkedHistoricalName}
                      </span>
                    </div>
                  )}
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
                      <select 
                        name="major"
                        value={settingsForm.major || ""} 
                        onChange={handleSettingsChange}
                      >
                        <option value="">-- Select Your Major / Program --</option>
                        
                        <optgroup label="🏛️ School of Engineering">
                          <option value="Aerospace Engineering">Aerospace Engineering</option>
                          <option value="Chemical and Environmental Engineering">Chemical and Environmental Engineering</option>
                          <option value="Communications and Computer Engineering">Communications and Computer Engineering</option>
                          <option value="Mechatronics Engineering">Mechatronics Engineering</option>
                          <option value="Nanotechnology and Nanoelectronics Engineering">Nanotechnology and Nanoelectronics Engineering</option>
                          <option value="Renewable Energy Engineering">Renewable Energy Engineering</option>
                        </optgroup>

                        <optgroup label="🔬 School of Science">
                          <option value="Biomedical Sciences">Biomedical Sciences</option>
                          <option value="Biotechnology">Biotechnology</option>
                          <option value="Nano Science">Nano Science</option>
                          <option value="Physics (Physics of the Universe)">Physics (Physics of the Universe)</option>
                        </optgroup>

                        <optgroup label="💻 School of Business & Computing (CSAI)">
                          <option value="Data Science and Artificial Intelligence (DSAI)">Data Science and Artificial Intelligence (DSAI)</option>
                          <option value="Software Development (SW)">Software Development (SW)</option>
                          <option value="Information Technology (IT)">Information Technology (IT)</option>
                          <option value="Computer Science and Artificial Intelligence (CSAI - General)">Computer Science and Artificial Intelligence (CSAI - General)</option>
                          <option value="Business Informatics">Business Informatics</option>
                        </optgroup>

                        <optgroup label="✨ General & Other">
                          <option value="General / Foundation Year">General / Foundation Year</option>
                          <option value="Other">Other</option>
                        </optgroup>
                      </select>
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
            7. TAB CONTENT: 🕒 WEEKLY FREE HOURS & MATCH AVAILABILITY
           ========================================================================= */}
        {activeTab === 'availability' && (() => {
          const DAYS_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
          const mutualSlots = (!isOwnProfile && viewerAvailability.length > 0 && availability.length > 0)
            ? findCommonFreeSlots(viewerAvailability, availability)
            : [];

          return (
            <div className="profile-tab-pane profile-fade-in">
              {/* Header Hero */}
              <div className="tab-pane-header-row" style={{ marginBottom: "20px" }}>
                <div>
                  <h3 className="section-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Clock size={22} className="gold" />
                    <span>Campus Free Time &amp; Match Schedule (Sun – Thu)</span>
                  </h3>
                  <p className="section-subtitle">
                    {isOwnProfile
                      ? "Set your weekly open hours on campus (Sunday through Thursday). The tournament pairing engine automatically cross-references your availability with opponents to effortlessly schedule knockout rounds!"
                      : `View ${profile.name}'s weekly campus availability (Sunday–Thursday) and check common free hours for scheduling casual duels or tournament matches.`}
                  </p>
                </div>
              </div>

              {/* Success Notification Alert */}
              {availSuccessMsg && (
                <div style={{ background: "rgba(46, 204, 113, 0.15)", border: "1px solid #2ecc71", color: "#2ecc71", padding: "12px 18px", borderRadius: "10px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", fontWeight: "700", fontSize: "0.9rem" }}>
                  <CheckCircle2 size={18} />
                  <span>{availSuccessMsg}</span>
                </div>
              )}

              {/* MUTUAL FREE TIME OVERLAP BANNER (when viewing another profile) */}
              {!isOwnProfile && loggedInEmail && (
                <div style={{ background: mutualSlots.length > 0 ? "linear-gradient(135deg, rgba(243, 193, 68, 0.15), rgba(46, 204, 113, 0.15))" : "rgba(255, 255, 255, 0.04)", border: `1px solid ${mutualSlots.length > 0 ? "rgba(243, 193, 68, 0.4)" : "rgba(255, 255, 255, 0.1)"}`, borderRadius: "14px", padding: "20px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                    <h4 style={{ margin: 0, color: "#f3c144", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                      🤝 Mutual Free Windows with You
                    </h4>
                    <span style={{ fontSize: "0.8rem", color: "#bab19c", background: "rgba(0,0,0,0.3)", padding: "4px 10px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {mutualSlots.length} overlapping window{mutualSlots.length === 1 ? "" : "s"} found
                    </span>
                  </div>

                  {mutualSlots.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                      {mutualSlots.map((ms, idx) => (
                        <div key={idx} style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(243, 193, 68, 0.3)", borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontWeight: "800", color: "#fff", fontSize: "0.95rem" }}>
                              📅 {ms.day}
                            </div>
                            <div style={{ color: "#f3c144", fontSize: "0.85rem", fontWeight: "700", marginTop: "2px" }}>
                              🕒 {ms.from} – {ms.to}
                            </div>
                          </div>
                          <span style={{ background: "rgba(46, 204, 113, 0.15)", color: "#2ecc71", border: "1px solid rgba(46, 204, 113, 0.3)", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700" }}>
                            {ms.durationLabel} window
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: "#9c9484", fontSize: "0.88rem" }}>
                      {viewerAvailability.length === 0
                        ? "You haven't set your own weekly availability yet. Add your free hours in your profile to auto-detect matching match times!"
                        : `No direct overlapping hours detected between your schedule and ${profile.name}'s current open slots.`}
                    </p>
                  )}
                </div>
              )}

              {/* QUICK ADD PRESETS & SLOT CREATION (For Profile Owner) */}
              {isOwnProfile && (
                <div className="glass-panel" style={{ padding: "20px", borderRadius: "14px", marginBottom: "24px", border: "1px solid rgba(243, 193, 68, 0.25)" }}>
                  <h4 style={{ margin: "0 0 8px", color: "#f3c144", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Plus size={18} /> Add New Free Time Window
                  </h4>
                  <p style={{ margin: "0 0 16px", color: "#9c9484", fontSize: "0.84rem" }}>
                    Enter the hours you are typically available on campus for chess matches and tournament rounds.
                  </p>

                  {/* 1-Click Quick Presets */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <span style={{ fontSize: "0.76rem", color: "#bab19c", fontWeight: "700" }}>⚡ Quick Presets:</span>
                    {[
                      { day: "Tuesday", from: "08:00", to: "09:00" },
                      { day: "Tuesday", from: "12:00", to: "14:00" },
                      { day: "Sunday", from: "10:00", to: "12:00" },
                      { day: "Thursday", from: "16:00", to: "18:00" },
                      { day: "Monday", from: "13:00", to: "15:00" }
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleQuickPreset(preset.day, preset.from, preset.to)}
                        disabled={isSavingAvailability}
                        style={{
                          background: "rgba(243, 193, 68, 0.1)",
                          color: "#f3c144",
                          border: "1px solid rgba(243, 193, 68, 0.25)",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        + {preset.day} {minutesToTimeString(timeStringToMinutes(preset.from))}–{minutesToTimeString(timeStringToMinutes(preset.to))}
                      </button>
                    ))}
                  </div>

                  {/* Form Inputs Grid */}
                  <form onSubmit={handleAddSlot} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr)) auto", gap: "10px", alignItems: "flex-end" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "#bab19c", fontWeight: "700", marginBottom: "4px" }}>
                        Day of Week
                      </label>
                      <select
                        value={newSlotDay}
                        onChange={(e) => setNewSlotDay(e.target.value)}
                        style={{ width: "100%", background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "8px 10px", borderRadius: "8px", fontSize: "0.85rem", outline: "none" }}
                      >
                        {DAYS_LIST.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "#bab19c", fontWeight: "700", marginBottom: "4px" }}>
                        From Time
                      </label>
                      <input
                        type="time"
                        value={newSlotFrom}
                        onChange={(e) => setNewSlotFrom(e.target.value)}
                        style={{ width: "100%", background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "8px 10px", borderRadius: "8px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "#bab19c", fontWeight: "700", marginBottom: "4px" }}>
                        To Time
                      </label>
                      <input
                        type="time"
                        value={newSlotTo}
                        onChange={(e) => setNewSlotTo(e.target.value)}
                        style={{ width: "100%", background: "#15120c", color: "#fff", border: "1px solid #36332b", padding: "8px 10px", borderRadius: "8px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isSavingAvailability}
                        style={{
                          background: "linear-gradient(135deg, #f7ce68 0%, #f3c144 100%)",
                          color: "#15120c",
                          border: "none",
                          padding: "9px 18px",
                          borderRadius: "8px",
                          fontWeight: "800",
                          fontSize: "0.88rem",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          height: "38px"
                        }}
                      >
                        {isSavingAvailability ? "Saving…" : "+ Add Slot"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* CURRENT WEEKLY SCHEDULE BY DAY */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                {DAYS_LIST.map((day) => {
                  const daySlots = availability.filter(s => s && s.day === day);
                  return (
                    <div
                      key={day}
                      className="glass-panel"
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        border: daySlots.length > 0 ? "1px solid rgba(243, 193, 68, 0.3)" : "1px solid rgba(255, 255, 255, 0.06)",
                        background: daySlots.length > 0 ? "rgba(243, 193, 68, 0.03)" : "rgba(0, 0, 0, 0.2)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "6px" }}>
                        <h5 style={{ margin: 0, color: daySlots.length > 0 ? "#f3c144" : "#888", fontSize: "0.95rem", fontWeight: "800" }}>
                          📅 {day}
                        </h5>
                        <span style={{ fontSize: "0.72rem", color: daySlots.length > 0 ? "#2ecc71" : "#666", fontWeight: "700" }}>
                          {daySlots.length > 0 ? `${daySlots.length} slot${daySlots.length === 1 ? "" : "s"}` : "Free hours not set"}
                        </span>
                      </div>

                      {daySlots.length === 0 ? (
                        <p style={{ margin: 0, color: "#666", fontSize: "0.8rem", fontStyle: "italic" }}>
                          No availability listed
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {daySlots.map((slot, slotIdx) => {
                            const globalIdx = availability.findIndex(s => s === slot);
                            const fromFormatted = minutesToTimeString(timeStringToMinutes(slot.from));
                            const toFormatted = minutesToTimeString(timeStringToMinutes(slot.to));
                            const durMinutes = timeStringToMinutes(slot.to) - timeStringToMinutes(slot.from);
                            const durLabel = durMinutes > 0 ? (durMinutes >= 60 ? `${Math.floor(durMinutes / 60)}h${durMinutes % 60 > 0 ? ` ${durMinutes % 60}m` : ""}` : `${durMinutes}m`) : "";

                            return (
                              <div
                                key={slotIdx}
                                style={{
                                  background: "rgba(0, 0, 0, 0.4)",
                                  border: "1px solid rgba(243, 193, 68, 0.18)",
                                  borderRadius: "8px",
                                  padding: "8px 12px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "8px"
                                }}
                              >
                                <div>
                                  <div style={{ color: "#fff", fontWeight: "800", fontSize: "0.88rem" }}>
                                    🕒 {fromFormatted} – {toFormatted}
                                  </div>
                                  <div style={{ color: "#bab19c", fontSize: "0.74rem", marginTop: "2px" }}>
                                    {durLabel && <span style={{ color: "#f3c144", fontWeight: "700" }}>{durLabel} window</span>}
                                  </div>
                                </div>

                                {isOwnProfile && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSlot(globalIdx)}
                                    title="Delete this time slot"
                                    style={{
                                      background: "rgba(231, 76, 60, 0.15)",
                                      color: "#e74c3c",
                                      border: "1px solid rgba(231, 76, 60, 0.3)",
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      fontSize: "0.75rem",
                                      fontWeight: "700"
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
                {/* Section 0: Member Profile Picture */}
                <div className="admin-section-header">
                  <Camera size={18} className="section-icon gold" />
                  <h4>Member Profile Picture & Avatar</h4>
                </div>

                <div className="admin-photo-mgmt-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', background: 'rgba(243, 193, 68, 0.05)', border: '1px solid rgba(243, 193, 68, 0.2)', borderRadius: '12px', marginBottom: '20px' }}>
                  <div 
                    style={{ 
                      width: '72px', 
                      height: '72px', 
                      borderRadius: '50%', 
                      backgroundImage: `url("${profile.profileImage || adminRoleForm.profileImage || '/Icons/unknown.png'}")`, 
                      backgroundSize: 'cover', 
                      backgroundPosition: 'center', 
                      border: '2px solid #f3c144',
                      flexShrink: 0
                    }} 
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>
                      {profile.profileImage ? "Custom Profile Photo Active" : "Default Avatar (No Custom Image)"}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px' }}>
                      Admins have executive authority to upload, replace, or reset this player's profile image.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <label 
                        className="btn-modal-action primary" 
                        style={{ padding: '6px 14px', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Camera size={15} />
                        <span>Upload / Replace Photo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }} 
                          onChange={handleImageUpload} 
                        />
                      </label>
                      {profile.profileImage && (
                        <button
                          type="button"
                          className="btn-modal-action secondary"
                          style={{ padding: '6px 14px', fontSize: '0.85rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          onClick={async () => {
                            if (window.confirm("Remove this player's custom profile picture?")) {
                              try {
                                setProfile(prev => ({ ...prev, profileImage: "" }));
                                setAdminRoleForm(prev => ({ ...prev, profileImage: "" }));
                                await safeFetchJson(`${API_BASE}/api/profile/image`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ email: profile.email, profileImage: "" })
                                });
                              } catch (e) {
                                alert("Failed to remove photo: " + e.message);
                              }
                            }
                          }}
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

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
                      onChange={(e) => {
                        const val = e.target.value;
                        const autoBatch = val.trim().length >= 4 && /^\d{4}/.test(val.trim()) ? val.trim().slice(0, 4) : "";
                        setAdminRoleForm(prev => ({ 
                          ...prev, 
                          idNumber: val,
                          batch: autoBatch || prev.batch
                        }));
                      }}
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
                    <select 
                      value={adminRoleForm.major || ""}
                      onChange={(e) => setAdminRoleForm(prev => ({ ...prev, major: e.target.value }))}
                      className="admin-input"
                    >
                      <option value="">-- Select ZC Major / Program --</option>
                      
                      <optgroup label="🏛️ School of Engineering">
                        <option value="Aerospace Engineering">Aerospace Engineering</option>
                        <option value="Chemical and Environmental Engineering">Chemical and Environmental Engineering</option>
                        <option value="Communications and Computer Engineering">Communications and Computer Engineering</option>
                        <option value="Mechatronics Engineering">Mechatronics Engineering</option>
                        <option value="Nanotechnology and Nanoelectronics Engineering">Nanotechnology and Nanoelectronics Engineering</option>
                        <option value="Renewable Energy Engineering">Renewable Energy Engineering</option>
                      </optgroup>

                      <optgroup label="🔬 School of Science">
                        <option value="Biomedical Sciences">Biomedical Sciences</option>
                        <option value="Biotechnology">Biotechnology</option>
                        <option value="Nano Science">Nano Science</option>
                        <option value="Physics (Physics of the Universe)">Physics (Physics of the Universe)</option>
                      </optgroup>

                      <optgroup label="💻 School of Business & Computing (CSAI)">
                        <option value="Data Science and Artificial Intelligence (DSAI)">Data Science and Artificial Intelligence (DSAI)</option>
                        <option value="Software Development (SW)">Software Development (SW)</option>
                        <option value="Information Technology (IT)">Information Technology (IT)</option>
                        <option value="Computer Science and Artificial Intelligence (CSAI - General)">Computer Science and Artificial Intelligence (CSAI - General)</option>
                        <option value="Business Informatics">Business Informatics</option>
                      </optgroup>

                      <optgroup label="✨ General & Other">
                        <option value="General / Foundation Year">General / Foundation Year</option>
                        <option value="Other">Other</option>
                      </optgroup>
                    </select>
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

                {/* Section 4: Unified Club Leadership & Department Roles */}
                <div className="admin-section-header" style={{ marginTop: '24px' }}>
                  <Shield size={18} className="section-icon red" />
                  <h4>Club Leadership & Department Roles</h4>
                </div>

                <div className="admin-form-grid">
                  <div className="form-group full-width admin-club-roles-section">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <label style={{ margin: 0, fontWeight: 700, color: "#fff" }}>Official Assigned Positions</label>
                      <span className={`hero-role-badge ${adminRoleForm.role || 'member'}`} style={{ fontSize: "0.74rem", padding: "3px 12px" }}>
                        {adminRoleForm.role === 'president' ? '👑 President Level' :
                         adminRoleForm.role === 'vice_president' ? '⭐ Vice President Level' :
                         adminRoleForm.role === 'oc' ? '⚡ Head of OC / OC Level' :
                         adminRoleForm.role === 'hr' ? '👥 Head of HR / HR Level' :
                         adminRoleForm.role === 'pr' ? '📢 Head of PR / PR Level' :
                         adminRoleForm.role === 'media' ? '🎨 Head of Multimedia Level' :
                         adminRoleForm.role === 'trainer' ? '🎓 Head of Training Level' :
                         adminRoleForm.role === 'trainee' ? '♟️ Dedicated Trainee Level' :
                         adminRoleForm.role === 'admin' ? '👑 High Board Executive Level' :
                         '♟️ Standard Member Level'}
                      </span>
                    </div>
                    <span className="form-hint">Assign specific leadership or committee positions. System authority & administrative privileges automatically synchronize with the assigned positions.</span>
                    
                    {/* Active Club Roles List */}
                    <div className="admin-roles-list">
                      {(adminRoleForm.clubRoles || []).length === 0 ? (
                        <div className="admin-no-roles">No department positions assigned (Standard Member).</div>
                      ) : (
                        (adminRoleForm.clubRoles || []).map((r, idx) => (
                          <div key={idx} className="admin-role-tag">
                            <span className="role-tag-text">{r.position === 'President' || r.position === 'Head' ? '👑' : r.position === 'Vice President' ? '⭐' : '✨'} <strong>{r.position}</strong> of {r.department}</span>
                            <button 
                              type="button" 
                              className="btn-remove-role" 
                              onClick={() => handleRemoveClubRole(idx)}
                              title="Remove Position"
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
                        onChange={(e) => handleDeptChange(e.target.value)}
                        className="admin-select role-dept-select"
                      >
                        <option value="Executive High Board">Executive High Board (President / Vice President)</option>
                        <option value="Human Resources">Human Resources (HR)</option>
                        <option value="Public Relations">Public Relations (PR)</option>
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
                        {(DEPARTMENT_POSITIONS[newRoleDept] || []).map((pos) => (
                          <option key={pos.value} value={pos.value}>
                            {pos.label}
                          </option>
                        ))}
                      </select>

                      <button 
                        type="button" 
                        className="btn-add-role" 
                        onClick={handleAddClubRole}
                      >
                        <Plus size={16} />
                        <span>Add Position</span>
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
                            src={member.profileImage || "/Icons/unknown.png"} 
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
                              {member.role === 'president' && <span className="net-role-tag president">👑 President</span>}
                              {member.role === 'vice_president' && <span className="net-role-tag vp">⭐ VP</span>}
                              {member.role === 'admin' && <span className="net-role-tag admin">👑 Admin</span>}
                              {member.role === 'oc' && <span className="net-role-tag oc">🏆 OC</span>}
                              {member.role === 'hr' && <span className="net-role-tag hr">🤝 HR</span>}
                              {member.role === 'pr' && <span className="net-role-tag pr">📢 PR</span>}
                              {member.role === 'media' && <span className="net-role-tag media">🎨 Media</span>}
                              {member.role === 'trainer' && <span className="net-role-tag trainer">♟️ Trainer</span>}
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
                            {Array.isArray(member.clubRoles) && member.clubRoles.length > 0 && (
                              <div className="net-club-roles-mini-row" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "3px" }}>
                                {member.clubRoles.map((cr, crIdx) => (
                                  <span key={crIdx} style={{ fontSize: "0.68rem", background: "rgba(243, 193, 68, 0.1)", color: "#f3c144", padding: "1px 5px", borderRadius: "3px", border: "1px solid rgba(243, 193, 68, 0.25)" }}>
                                    {cr.position === "President" || cr.position === "Head" ? "👑" : "✨"} {cr.position} ({cr.department.replace("Executive High Board", "High Board").replace("Tournament Organizing Committee", "OC").replace("Human Resources", "HR").replace("Public Relations", "PR").replace("Multimedia & Design", "Media").replace("Training & Masterclasses", "Trainer").replace("Trainee Development Pathway", "Trainee")})
                                  </span>
                                ))}
                              </div>
                            )}
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
