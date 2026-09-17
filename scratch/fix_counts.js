const fs = require('fs');
let content = fs.readFileSync('src/pages/Profile.jsx', 'utf8');

// The tab badge should probably just be the count of active + historical
content = content.replace(
  'badge: activeTournaments.length > 0 ? activeTournaments.length : null',
  'badge: (activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)) > 0 ? (activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)) : null'
);
content = content.replace(
  '<span className="tab-badge-count">{activeTournaments.length}</span>',
  '<span className="tab-badge-count">{activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)}</span>'
);

// The hero strip "Championships" should be total
content = content.replace(
  '⚔️ {activeTournaments.length} Active',
  '⚔️ {activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)} Championships'
);

// The stat box "Tournaments Enrolled"
content = content.replace(
  '<div className="stat-value">{activeTournaments.length}</div>\n                <div className="stat-hint">Active Enrolled</div>',
  '<div className="stat-value">{activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)}</div>\n                <div className="stat-hint">Total Events</div>'
);

// The ZC Club rating card
content = content.replace(
  '<span className="rating-score">{activeTournaments.length}</span>\n              <span className="rating-delta blue">Enrolled</span>',
  '<span className="rating-score">{activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)}</span>\n              <span className="rating-delta blue">Total Played</span>'
);

// Accolade check
content = content.replace(
  'className={`accolade-badge-card ${activeTournaments.length > 0 ? \'unlocked\' : \'locked\'}`}',
  'className={`accolade-badge-card ${(activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)) > 0 ? \'unlocked\' : \'locked\'}`}'
);

// Second Accolade Check
content = content.replace(
  '{activeTournaments.length > 0 \n                          ? `Competed in ${tournaments.length} official championship(s)`',
  '{(activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)) > 0 \n                          ? `Competed in ${activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)} official championship(s)`'
);

// Wait, the replaced string in the previous step was:
// `{activeTournaments.length > 0 \n                          ? `Competed in ${tournaments.length} official championship(s)` ` -> Wait, the previous replace was `{tournaments.length > 0` to `{activeTournaments.length > 0`.
content = content.replace(
  '{activeTournaments.length > 0 \n                          ? `Competed in ${activeTournaments.length} official championship(s)`',
  '{(activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)) > 0 \n                          ? `Competed in ${activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)} official championship(s)`'
);

// Another fallback replace just in case formatting is slightly different
content = content.replace(
  '{activeTournaments.length > 0 \n                          ? `Competed in ${tournaments.length} official',
  '{(activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0)) > 0 \n                          ? `Competed in ${(activeTournaments.length + (tournamentAchievements?.historicalList?.length || 0))} official'
);


fs.writeFileSync('src/pages/Profile.jsx', content);
console.log('Reverted and fixed counts successfully!');
