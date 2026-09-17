const fs = require('fs');
let content = fs.readFileSync('src/pages/Profile.jsx', 'utf8');

// 1. Add activeTournaments definition
content = content.replace(
  'const tournamentAchievements = getUserTournamentAchievements(profile, tournaments);',
  'const tournamentAchievements = getUserTournamentAchievements(profile, tournaments);\n  const activeTournaments = tournaments.filter(t => !(t.status === "Completed" || t.status === "completed" || t.status === "closed" || t.status === "Finished"));'
);

// 2. Replace tournaments with activeTournaments in specific places
content = content.replace(
  '<div className="stat-value">{tournaments.length}</div>',
  '<div className="stat-value">{activeTournaments.length}</div>'
);
content = content.replace(
  '⚔️ {tournaments.length} Championships',
  '⚔️ {activeTournaments.length} Active'
);
content = content.replace(
  '⚔️ Enrolled in ${tournaments.length} Event${tournaments.length > 1 ? \'s\' : \'\'}',
  '⚔️ Enrolled in ${activeTournaments.length} Event${activeTournaments.length > 1 ? \'s\' : \'\'}'
);
content = content.replace(
  '⚔️ Active Competitor (${tournaments.length} Tournament${tournaments.length > 1 ? \'s\' : \'\'})',
  '⚔️ Active Competitor (${activeTournaments.length} Tournament${activeTournaments.length > 1 ? \'s\' : \'\'})'
);
content = content.replace(
  'if (tournaments.length > 0) {',
  'if (activeTournaments.length > 0) {'
);
content = content.replace(
  '<span className="rating-score">{tournaments.length}</span>',
  '<span className="rating-score">{activeTournaments.length}</span>'
);
content = content.replace(
  'badge: tournaments.length > 0 ? tournaments.length : null',
  'badge: activeTournaments.length > 0 ? activeTournaments.length : null'
);
content = content.replace(
  '<span className="tab-badge-count">{tournaments.length}</span>',
  '<span className="tab-badge-count">{activeTournaments.length}</span>'
);
content = content.replace(
  'className={`accolade-badge-card ${tournaments.length > 0 ? \'unlocked\' : \'locked\'}`}',
  'className={`accolade-badge-card ${activeTournaments.length > 0 ? \'unlocked\' : \'locked\'}`}'
);
content = content.replace(
  '{tournaments.length > 0',
  '{activeTournaments.length > 0'
);
content = content.replace(
  '{tournaments.length > 0 ? <CheckCircle2 size={16} className="accolade-status-icon" /> : <Lock size={16} className="accolade-status-icon" />}',
  '{activeTournaments.length > 0 ? <CheckCircle2 size={16} className="accolade-status-icon" /> : <Lock size={16} className="accolade-status-icon" />}'
);
content = content.replace(
  '{tournaments.length === 0 && (!tournamentAchievements.historicalList || tournamentAchievements.historicalList.length === 0) ? (',
  '{activeTournaments.length === 0 && (!tournamentAchievements.historicalList || tournamentAchievements.historicalList.length === 0) ? ('
);
content = content.replace(
  '{tournaments.map((t) => {',
  '{activeTournaments.map((t) => {'
);

fs.writeFileSync('src/pages/Profile.jsx', content);
console.log('Replaced activeTournaments successfully!');
