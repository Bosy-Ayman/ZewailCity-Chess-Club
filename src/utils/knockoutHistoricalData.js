// Historical data for 1st Knockout Championship — Fall 2025
// Double Elimination Championship held at Zewail City Academic Hall

export const FALL_2025_PLAYERS = [
  { name: "Ahmed Elkodariy", rating: 1980, major: "CSAI", seed: 1 },
  { name: "Abdelrahman Mohamed", rating: 1950, major: "BME", seed: 2 },
  { name: "Omar Ezz", rating: 1920, major: "CSAI", seed: 3 },
  { name: "Mazen Allam", rating: 1890, major: "REE", seed: 4 },
  { name: "Kareem Mahmoud", rating: 1860, major: "CSAI", seed: 5 },
  { name: "Mohamed Ezz", rating: 1845, major: "PE", seed: 6 },
  { name: "Bosy Ayman", rating: 1830, major: "CSAI", seed: 7 },
  { name: "Omar Hafez", rating: 1815, major: "BME", seed: 8 },
  { name: "Ahmed Emad", rating: 1795, major: "CSAI", seed: 9 },
  { name: "Noureldin Newer", rating: 1780, major: "REE", seed: 10 },
  { name: "Amr Khaled", rating: 1765, major: "PE", seed: 11 },
  { name: "Youssef Yasser", rating: 1750, major: "CSAI", seed: 12 },
  { name: "Haneen Yasser", rating: 1740, major: "BME", seed: 13 },
  { name: "Karim Magdi", rating: 1725, major: "PE", seed: 14 },
  { name: "Mohamed Adel", rating: 1710, major: "CSAI", seed: 15 },
  { name: "Robair Raouf", rating: 1695, major: "REE", seed: 16 }
];

export const FALL_2025_MATCHES = [
  // ── UPPER BRACKET ROUND 1 (Round of 16) — Saturday, Oct 4 ──
  { _id: "f25-u1-1", round: 1, bracket: "upper", white: "Ahmed Elkodariy", black: "Robair Raouf", result: "1-0", matchTime: "Oct 4, 10:00 AM" },
  { _id: "f25-u1-2", round: 1, bracket: "upper", white: "Omar Hafez", black: "Ahmed Emad", result: "1-0", matchTime: "Oct 4, 10:00 AM" },
  { _id: "f25-u1-3", round: 1, bracket: "upper", white: "Kareem Mahmoud", black: "Youssef Yasser", result: "1-0", matchTime: "Oct 4, 10:30 AM" },
  { _id: "f25-u1-4", round: 1, bracket: "upper", white: "Mazen Allam", black: "Haneen Yasser", result: "1-0", matchTime: "Oct 4, 10:30 AM" },
  { _id: "f25-u1-5", round: 1, bracket: "upper", white: "Omar Ezz", black: "Karim Magdi", result: "1-0", matchTime: "Oct 4, 11:00 AM" },
  { _id: "f25-u1-6", round: 1, bracket: "upper", white: "Mohamed Ezz", black: "Amr Khaled", result: "1-0", matchTime: "Oct 4, 11:00 AM" },
  { _id: "f25-u1-7", round: 1, bracket: "upper", white: "Bosy Ayman", black: "Noureldin Newer", result: "1-0", matchTime: "Oct 4, 11:30 AM" },
  { _id: "f25-u1-8", round: 1, bracket: "upper", white: "Abdelrahman Mohamed", black: "Mohamed Adel", result: "1-0", matchTime: "Oct 4, 11:30 AM" },

  // ── LOWER BRACKET ROUND 1 — Sunday, Oct 5 ──
  { _id: "f25-l1-1", round: 1, bracket: "lower", white: "Robair Raouf", black: "Ahmed Emad", result: "0-1", matchTime: "Oct 5, 2:00 PM" },
  { _id: "f25-l1-2", round: 1, bracket: "lower", white: "Youssef Yasser", black: "Haneen Yasser", result: "1-0", matchTime: "Oct 5, 2:00 PM" },
  { _id: "f25-l1-3", round: 1, bracket: "lower", white: "Karim Magdi", black: "Amr Khaled", result: "0-1", matchTime: "Oct 5, 2:30 PM" },
  { _id: "f25-l1-4", round: 1, bracket: "lower", white: "Noureldin Newer", black: "Mohamed Adel", result: "1-0", matchTime: "Oct 5, 2:30 PM" },

  // ── UPPER BRACKET ROUND 2 (Quarterfinals) — Saturday, Oct 11 ──
  { _id: "f25-u2-1", round: 2, bracket: "upper", white: "Ahmed Elkodariy", black: "Omar Hafez", result: "1-0", matchTime: "Oct 11, 1:00 PM" },
  { _id: "f25-u2-2", round: 2, bracket: "upper", white: "Kareem Mahmoud", black: "Mazen Allam", result: "1-0", matchTime: "Oct 11, 1:00 PM" },
  { _id: "f25-u2-3", round: 2, bracket: "upper", white: "Omar Ezz", black: "Mohamed Ezz", result: "1-0", matchTime: "Oct 11, 1:30 PM" },
  { _id: "f25-u2-4", round: 2, bracket: "upper", white: "Abdelrahman Mohamed", black: "Bosy Ayman", result: "1-0", matchTime: "Oct 11, 1:30 PM" },

  // ── LOWER BRACKET ROUND 2 — Sunday, Oct 12 ──
  { _id: "f25-l2-1", round: 2, bracket: "lower", white: "Bosy Ayman", black: "Ahmed Emad", result: "1-0", matchTime: "Oct 12, 2:00 PM" },
  { _id: "f25-l2-2", round: 2, bracket: "lower", white: "Mohamed Ezz", black: "Youssef Yasser", result: "1-0", matchTime: "Oct 12, 2:00 PM" },
  { _id: "f25-l2-3", round: 2, bracket: "lower", white: "Mazen Allam", black: "Amr Khaled", result: "1-0", matchTime: "Oct 12, 2:30 PM" },
  { _id: "f25-l2-4", round: 2, bracket: "lower", white: "Omar Hafez", black: "Noureldin Newer", result: "1-0", matchTime: "Oct 12, 2:30 PM" },

  // ── UPPER BRACKET ROUND 3 (Upper Semifinals) — Friday, Oct 17 ──
  { _id: "f25-u3-1", round: 3, bracket: "upper", white: "Ahmed Elkodariy", black: "Kareem Mahmoud", result: "1-0", matchTime: "Oct 17, 3:00 PM" },
  { _id: "f25-u3-2", round: 3, bracket: "upper", white: "Abdelrahman Mohamed", black: "Omar Ezz", result: "1-0", matchTime: "Oct 17, 3:30 PM" },

  // ── LOWER BRACKET ROUND 3 — Friday, Oct 17 ──
  { _id: "f25-l3-1", round: 3, bracket: "lower", white: "Bosy Ayman", black: "Mohamed Ezz", result: "1-0", matchTime: "Oct 17, 4:30 PM" },
  { _id: "f25-l3-2", round: 3, bracket: "lower", white: "Mazen Allam", black: "Omar Hafez", result: "0-1", matchTime: "Oct 17, 5:00 PM" },

  // ── UPPER BRACKET ROUND 4 (Upper Finals) — Saturday, Oct 18 ──
  { _id: "f25-u4-1", round: 4, bracket: "upper", white: "Ahmed Elkodariy", black: "Abdelrahman Mohamed", result: "1-0", matchTime: "Oct 18, 2:00 PM" },

  // ── LOWER BRACKET ROUND 4 (Lower Semifinals) — Saturday, Oct 18 ──
  { _id: "f25-l4-1", round: 4, bracket: "lower", white: "Omar Ezz", black: "Bosy Ayman", result: "1-0", matchTime: "Oct 18, 3:30 PM" },
  { _id: "f25-l4-2", round: 4, bracket: "lower", white: "Kareem Mahmoud", black: "Omar Hafez", result: "0-1", matchTime: "Oct 18, 4:00 PM" },

  // ── LOWER BRACKET ROUND 5 (Lower Finals) — Sunday, Oct 19 ──
  { _id: "f25-l5-1", round: 5, bracket: "lower", white: "Abdelrahman Mohamed", black: "Omar Ezz", result: "1-0", matchTime: "Oct 19, 2:00 PM" },

  // ── GRAND FINALS — Sunday, Oct 19 ──
  { _id: "f25-gf-1", round: 5, bracket: "grand_finals", white: "Ahmed Elkodariy", black: "Abdelrahman Mohamed", result: "1-0", matchTime: "Oct 19, 5:00 PM" }
];

export const FALL_2025_TOURNAMENT = {
  _id: "fall-2025-knockout-showcase",
  title: "1st Knockout Championship — Fall 2025",
  type: "Double Elimination",
  status: "Completed",
  winner: "Ahmed Elkodariy",
  runnerUp: "Abdelrahman Mohamed",
  location: "Zewail City Academic Hall",
  startDate: "2025-10-04",
  playersList: FALL_2025_PLAYERS,
  matches: FALL_2025_MATCHES,
  playerAvatars: {
    "Ahmed Elkodariy": "/Winners/AhmedElkodariy.PNG",
    "Omar Ezz": "/Winners/OmarEzz.jpg",
    "Ahmed Emad": "/Winners/AhmedEmad.png"
  }
};
