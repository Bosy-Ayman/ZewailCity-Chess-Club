/**
 * Unified Tournament Winners, Historical Registry & User Account Linking
 *
 * Connects registered user accounts (by email, name, or explicit link)
 * with the historical tournament records from the Tournament Timeline and Hall of Fame.
 */

export const ALL_HISTORICAL_PLAYERS = [
  "Abdelrahman Mohamed",
  "Bosy Ayman",
  "Omar Ezz",
  "Ahmed Elkodariy",
  "Omar Hafez",
  "Abdelwahab Hamdi",
  "Mohamed Eslam",
  "Salma Ashraf",
  "Haneen Yasser",
  "Mazen Ayman",
  "Raphael Robier",
  "Abdelrahman Mane3",
  "NourEldin Newer",
  "Youssef Yasser"
];

export const HISTORICAL_TOURNAMENTS = [
  {
    id: "hist-2026-spring",
    title: "King's Quest IV Championship 2026",
    type: "Swiss System (5 Rounds)",
    category: "tournament",
    date: "2026-05-15",
    location: "Academic Building, Zewail City",
    image: "/Images/Tournaments/2025-2026/KingQuest4.jpg",
    description: "5-round Swiss championship featuring the top players of Zewail City competing for the 2026 season title.",
    winners: [
      { name: "Abdelrahman Mohamed", place: 1, title: "🥇 1st Place Champion" },
      { name: "Abdelwahab Hamdi", place: 2, title: "🥈 2nd Place" },
      { name: "Mohamed Eslam", place: 3, title: "🥉 3rd Place" }
    ]
  },
  {
    id: "hist-2026-aast",
    title: "AAST University Championship",
    type: "Swiss System (5 Rounds)",
    category: "tournament",
    date: "2026-05-14",
    location: "AAST University",
    image: "/Images/Tournaments/2025-2026/AASTUni.jpg",
    description: "Inter-university championship for October sector — 9 ZC members represented the university with stellar achievements.",
    winners: [
      { name: "Bosy Ayman", place: 1, title: "👑 1st Place (Girls Champion)" },
      { name: "Salma Ashraf", place: 2, title: "🏅 4th Place (Girls)" },
      { name: "Haneen Yasser", place: 3, title: "🏅 6th Place (Girls)" },
      { name: "Abdelrahman Mohamed", place: 4, title: "🏅 4th Place (Boys)" },
      { name: "Raphael Robier", place: 5, title: "🏅 5th Place (Boys)" },
      { name: "Omar Ezz", place: 6, title: "🏅 6th Place (Boys)" },
      { name: "Omar Hafez", place: 7, title: "🏅 7th Place (Boys)" },
      { name: "Ahmed Elkodariy", place: 8, title: "🏅 8th Place (Boys)" }
    ]
  },
  {
    id: "hist-2025-nile",
    title: "Nile University Championship",
    type: "Inter-University Championship",
    category: "tournament",
    date: "2025-05-06",
    location: "Nile University",
    image: "/Images/Tournaments/2024-2025/NileUni.jpg",
    description: "6 members represented Zewail City at the Nile University Chess Tournament, bringing home historic achievements including 🥇 1st place in the girls' category.",
    winners: [
      { name: "Bosy Ayman", place: 1, title: "👑 1st Place (Girls Champion)" },
      { name: "Haneen Yasser", place: 4, title: "🏅 4th Place (Girls)" }
    ]
  },
  {
    id: "hist-2026-blitz",
    title: "Fast Clock Blitz Championship 2026",
    type: "Esports Blitz Arena",
    category: "tournament",
    date: "2026-02-15",
    location: "Zone E Arena, Zewail City",
    image: "/Images/Tournaments/2025-2026/EsportsBlitz26.jpg",
    description: "Speed chess championship testing rapid tactical calculation and fast-clock mastery.",
    winners: [
      { name: "Abdelrahman Mohamed", place: 1, title: "🥇 Champion" },
      { name: "Mazen Ayman", place: 2, title: "🥈 2nd Place" },
      { name: "Omar Hafez", place: 3, title: "🥉 3rd Place" }
    ]
  },
  {
    id: "hist-2026-ramadan",
    title: "Ramadan Knockout Tournament 2026",
    type: "Rapid Knockout",
    category: "tournament",
    date: "2026-03-25",
    location: "Academic Building, Zewail City",
    image: "/Images/Tournaments/2025-2026/RamadanKnockout26.jpg",
    description: "Annual Ramadan nighttime rapid knockout championship bringing together campus competitors.",
    winners: [
      { name: "Omar Ezz", place: 1, title: "🥇 Champion" },
      { name: "Omar Hafez", place: 2, title: "🥈 Runner-up" },
      { name: "Abdelwahab Hamdi", place: 3, title: "🥉 3rd Place" }
    ]
  },
  {
    id: "hist-2025-squad",
    title: "King's Quest Squad Tournament 2025",
    type: "3v3 Team Squad Tournament",
    category: "tournament",
    date: "2025-11-08",
    location: "Academic Palm Tree, Zewail City",
    image: "/Images/Tournaments/2025-2026/SquadTournament25.jpg",
    description: "Flagship 3v3 team championship with squad board pairings across Zewail City.",
    winners: [
      { name: "Ahmed Elkodariy", place: 1, title: "🥇 Squad Champion (Knights - Board 1)" },
      { name: "Omar Hafez", place: 1, title: "🥇 Squad Champion (Knights - Board 2)" },
      { name: "Omar Ezz", place: 1, title: "🥇 Squad Champion (Knights - Board 3)" },
      { name: "Abdelrahman Mohamed", place: 2, title: "🥈 2nd Place Squad (Gambling - Board 1)" },
      { name: "Abdelrahman Mane3", place: 2, title: "🥈 2nd Place Squad (Gambling - Board 2)" },
      { name: "Mohamed Eslam", place: 2, title: "🥈 2nd Place Squad (Gambling - Board 3)" },
      { name: "NourEldin Newer", place: 3, title: "🥉 3rd Place Squad (Epsilon - Board 1)" },
      { name: "Raphael Robier", place: 3, title: "🥉 3rd Place Squad (Epsilon - Board 2)" },
      { name: "Youssef Yasser", place: 3, title: "🥉 3rd Place Squad (Epsilon - Board 3)" }
    ]
  }
];

/**
 * Checks whether a given user name/email corresponds to a historical player name.
 */
export const matchUserToHistoricalPlayer = (user, historicalPlayerName) => {
  if (!user || !historicalPlayerName) return false;

  const hName = historicalPlayerName.toLowerCase().trim();
  const explicitLink = (user.linkedHistoricalName || "").toLowerCase().trim();
  if (explicitLink && explicitLink === hName) return true;

  const userName = (user.name || "").toLowerCase().trim();
  const userEmail = (user.email || "").toLowerCase().trim();

  // Direct name match or substring match (e.g. "Bosy Ayman Mohamed" matches "Bosy Ayman")
  if (userName === hName || userName.includes(hName) || hName.includes(userName)) return true;

  // Common email aliases
  if (hName === "bosy ayman" && (userEmail.includes("bosy") || userEmail.includes("poussy.ayman"))) return true;
  if (hName === "omar ezz" && (userEmail.includes("ezzomar") || userEmail.includes("omar.ezz"))) return true;
  if (hName === "abdelrahman mohamed" && (userEmail.includes("abdelrahman.mohamed") || userEmail.includes("abdo.mohamed"))) return true;
  if (hName === "ahmed elkodariy" && (userEmail.includes("elkodariy") || userEmail.includes("ahmed.elkodariy"))) return true;
  if (hName === "omar hafez" && userEmail.includes("omar.hafez")) return true;

  return false;
};

/**
 * Given a historical player name (from Hall of Fame or Tournament Timeline),
 * find their registered website user account.
 */
export const findRegisteredUserForHistoricalPlayer = (historicalPlayerName, registeredUsers = []) => {
  if (!historicalPlayerName || !registeredUsers.length) return null;

  return registeredUsers.find(user => matchUserToHistoricalPlayer(user, historicalPlayerName)) || null;
};

/**
 * Returns all historical tournaments that a user competed in or placed in.
 */
export const getHistoricalTournamentsForUser = (user) => {
  if (!user) return [];

  const matched = [];
  HISTORICAL_TOURNAMENTS.forEach(t => {
    (t.winners || []).forEach(w => {
      if (matchUserToHistoricalPlayer(user, w.name)) {
        matched.push({
          id: t.id,
          title: t.title,
          type: t.type,
          date: t.date,
          location: t.location,
          image: t.image,
          description: t.description,
          award: w.title,
          isChampion: w.place === 1
        });
      }
    });
  });

  return matched;
};

/**
 * Returns authentic tournament honors for a user.
 * Badges are STRICTLY based on real tournament results:
 * - Won tournaments (1st place / champion)
 * - Podium finishes (1st, 2nd, or 3rd place)
 *
 * @param {Object} user - { name, email, linkedHistoricalName }
 * @param {Array} dbTournaments - list of tournaments from API/database
 */
export const getUserTournamentAchievements = (user, dbTournaments = []) => {
  if (!user) {
    return {
      wonTournaments: [],
      podiumTournaments: [],
      isChampion: false,
      isPodium: false,
      primaryBadge: null,
      historicalList: []
    };
  }

  const cleanName = (user.name || "").toLowerCase().trim();
  const cleanEmail = (user.email || "").toLowerCase().trim();

  const wonSet = new Set();
  const podiumSet = new Set();

  // 1. Check historical input tournaments
  const historicalList = getHistoricalTournamentsForUser(user);
  historicalList.forEach(item => {
    if (item.isChampion) {
      wonSet.add(item.title);
    }
    podiumSet.add(`${item.title} (${item.award})`);
  });

  // 2. Check live/localhost database tournaments
  (dbTournaments || []).forEach(t => {
    if (t.status === "Completed") {
      const winName = (t.winner || "").toLowerCase().trim();
      const firstPlayerName = (t.playersList && t.playersList[0] && t.playersList[0].name ? t.playersList[0].name.toLowerCase().trim() : "");
      
      if (
        (winName && (winName === cleanName || winName === cleanEmail)) ||
        (!winName && firstPlayerName && (firstPlayerName === cleanName || firstPlayerName === cleanEmail))
      ) {
        wonSet.add(t.title);
        podiumSet.add(`${t.title} (🥇 1st Place)`);
      }

      if (Array.isArray(t.podium)) {
        t.podium.forEach(p => {
          const pName = (p.name || "").toLowerCase().trim();
          if (pName && (pName === cleanName || pName === cleanEmail)) {
            if (p.place === 1) wonSet.add(t.title);
            podiumSet.add(`${t.title} (#${p.place})`);
          }
        });
      }
    }
  });

  const wonTournaments = Array.from(wonSet);
  const podiumTournaments = Array.from(podiumSet);

  let primaryBadge = null;
  if (wonTournaments.length > 1) {
    primaryBadge = `🏆 ${wonTournaments.length}x Tournament Champion`;
  } else if (wonTournaments.length === 1) {
    primaryBadge = `🏆 ${wonTournaments[0]} Champion`;
  } else if (podiumTournaments.length > 0) {
    primaryBadge = `🥈 Podium Finisher`;
  }

  return {
    wonTournaments,
    podiumTournaments,
    isChampion: wonTournaments.length > 0,
    isPodium: podiumTournaments.length > 0,
    primaryBadge,
    historicalList
  };
};
