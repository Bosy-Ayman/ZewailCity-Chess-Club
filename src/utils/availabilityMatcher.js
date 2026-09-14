/**
 * Utility functions for calculating mutual free time between students for chess tournaments.
 * Note: Egyptian academic calendar runs Sunday through Thursday. Friday and Saturday are excluded from tournament synchronization.
 */

export const TOURNAMENT_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

/**
 * Universal campus open free periods: 12:00 PM Activity Breaks & 4:00 PM After-Hours (Sun–Thu).
 */
export const UNIVERSAL_CAMPUS_SLOTS = [
  // 12:00 PM Mid-Day Activity Breaks (Sun – Thu)
  { day: "Sunday", time: "12:00", label: "Sun 12:00 PM" },
  { day: "Monday", time: "12:00", label: "Mon 12:00 PM" },
  { day: "Tuesday", time: "12:00", label: "Tue 12:00 PM" },
  { day: "Wednesday", time: "12:00", label: "Wed 12:00 PM" },
  { day: "Thursday", time: "12:00", label: "Thu 12:00 PM" },
  // 4:00 PM After-Hours (Sun – Thu)
  { day: "Sunday", time: "16:00", label: "Sun 4:00 PM" },
  { day: "Monday", time: "16:00", label: "Mon 4:00 PM" },
  { day: "Tuesday", time: "16:00", label: "Tue 4:00 PM" },
  { day: "Wednesday", time: "16:00", label: "Wed 4:00 PM" },
  { day: "Thursday", time: "16:00", label: "Thu 4:00 PM" }
];

/**
 * Calculates the next upcoming calendar date (YYYY-MM-DD) for a given academic day name.
 */
export function getNextDateForDay(dayName, baseDateStr) {
  const dayIndexMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4 };
  const targetDay = dayIndexMap[dayName];
  if (targetDay === undefined) return baseDateStr || new Date().toISOString().split('T')[0];
  
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  if (isNaN(base.getTime())) return new Date().toISOString().split('T')[0];
  
  const currentDay = base.getDay();
  let diff = targetDay - currentDay;
  if (diff < 0) diff += 7;
  const targetDate = new Date(base.getTime() + diff * 86400000);
  return targetDate.toISOString().split('T')[0];
}

/**
 * Converts a time string (e.g. "08:00", "8:00 AM", "14:30", "2:30 PM") into minutes from midnight.
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const clean = String(timeStr).trim().toUpperCase();

  // Check 12-hour format with AM/PM
  const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const isPM = ampmMatch[3] === 'PM';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Check 24-hour format "HH:MM"
  const h24Match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10);
    const minutes = parseInt(h24Match[2], 10);
    return hours * 60 + minutes;
  }

  return 0;
}

/**
 * Converts minutes from midnight into 12-hour format string (e.g. 510 -> "8:30 AM", 840 -> "2:00 PM").
 */
export function minutesToTimeString(totalMinutes) {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours12}:${minutesStr} ${ampm}`;
}

/**
 * Compares two players' weekly availability schedules and returns all overlapping mutual free slots on campus (Sunday - Thursday).
 * @param {Array} availA - Array of { day, from, to } for Player A
 * @param {Array} availB - Array of { day, from, to } for Player B
 * @param {number} minDurationMinutes - Minimum overlap required (default: 30 mins)
 * @returns {Array} Array of mutual overlapping slots (Sunday through Thursday only)
 */
export function findCommonFreeSlots(availA = [], availB = [], minDurationMinutes = 30) {
  if (!Array.isArray(availA) || !Array.isArray(availB) || availA.length === 0 || availB.length === 0) {
    return [];
  }

  const commonSlots = [];

  // Exclude Friday and Saturday from tournament synchronization
  TOURNAMENT_DAYS.forEach((day) => {
    const slotsA = availA.filter(s => s && s.day === day);
    const slotsB = availB.filter(s => s && s.day === day);

    slotsA.forEach(slotA => {
      const startA = timeStringToMinutes(slotA.from);
      const endA = timeStringToMinutes(slotA.to);

      slotsB.forEach(slotB => {
        const startB = timeStringToMinutes(slotB.from);
        const endB = timeStringToMinutes(slotB.to);

        const overlapStart = Math.max(startA, startB);
        const overlapEnd = Math.min(endA, endB);

        if (overlapEnd - overlapStart >= minDurationMinutes) {
          const fromStr = minutesToTimeString(overlapStart);
          const toStr = minutesToTimeString(overlapEnd);
          const duration = overlapEnd - overlapStart;
          const durationLabel = duration >= 60 
            ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}m` : ''}` 
            : `${duration}m`;

          commonSlots.push({
            day,
            fromMinutes: overlapStart,
            toMinutes: overlapEnd,
            from: fromStr,
            to: toStr,
            durationMinutes: duration,
            durationLabel,
            label: `${day}: ${fromStr} – ${toStr} (${durationLabel} mutual free window)`
          });
        }
      });
    });
  });

  return commonSlots;
}

/**
 * Finds near-overlapping / adjacent free slots between two players on campus (Sunday - Thursday).
 * (e.g. Player A free 10:00-11:00 AM, Player B free 11:00-12:00 PM -> gap is 0 mins, boundary is 11:00 AM)
 * @param {Array} availA
 * @param {Array} availB
 * @param {number} maxGapMinutes - Maximum gap between windows to be considered near-overlap (default: 45)
 * @returns {Array} Array of near-overlap suggestions
 */
export function findNearOverlapSlots(availA = [], availB = [], maxGapMinutes = 45) {
  if (!Array.isArray(availA) || !Array.isArray(availB) || availA.length === 0 || availB.length === 0) {
    return [];
  }

  const nearSlots = [];

  TOURNAMENT_DAYS.forEach((day) => {
    const slotsA = availA.filter(s => s && s.day === day);
    const slotsB = availB.filter(s => s && s.day === day);

    slotsA.forEach(slotA => {
      const startA = timeStringToMinutes(slotA.from);
      const endA = timeStringToMinutes(slotA.to);

      slotsB.forEach(slotB => {
        const startB = timeStringToMinutes(slotB.from);
        const endB = timeStringToMinutes(slotB.to);

        // If there is already direct overlap, skip from near-overlap
        const overlapStart = Math.max(startA, startB);
        const overlapEnd = Math.min(endA, endB);
        if (overlapEnd > overlapStart) return;

        // Case 1: Slot A finishes before Slot B starts
        if (endA <= startB && (startB - endA) <= maxGapMinutes) {
          const gap = startB - endA;
          const targetTimeMinutes = endA; // boundary transition time
          const targetTimeStr = minutesToTimeString(targetTimeMinutes);
          nearSlots.push({
            day,
            targetMinutes: targetTimeMinutes,
            time: targetTimeStr,
            gapMinutes: gap,
            gapLabel: gap === 0 ? 'Adjacent / Back-to-Back' : `${gap}m gap`,
            label: `${day} at ${targetTimeStr} (${gap === 0 ? 'Back-to-Back transition' : `${gap}m gap`})`,
            detail: `(Player 1 free until ${minutesToTimeString(endA)}, Player 2 free from ${minutesToTimeString(startB)})`
          });
        }
        // Case 2: Slot B finishes before Slot A starts
        else if (endB <= startA && (startA - endB) <= maxGapMinutes) {
          const gap = startA - endB;
          const targetTimeMinutes = endB;
          const targetTimeStr = minutesToTimeString(targetTimeMinutes);
          nearSlots.push({
            day,
            targetMinutes: targetTimeMinutes,
            time: targetTimeStr,
            gapMinutes: gap,
            gapLabel: gap === 0 ? 'Adjacent / Back-to-Back' : `${gap}m gap`,
            label: `${day} at ${targetTimeStr} (${gap === 0 ? 'Back-to-Back transition' : `${gap}m gap`})`,
            detail: `(Player 2 free until ${minutesToTimeString(endB)}, Player 1 free from ${minutesToTimeString(startA)})`
          });
        }
      });
    });
  });

  return nearSlots;
}
