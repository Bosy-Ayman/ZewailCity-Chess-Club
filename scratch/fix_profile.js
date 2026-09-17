const fs = require('fs');
let content = fs.readFileSync('src/pages/Profile.jsx', 'utf8');
const startIdx = content.indexOf('                {/* Desktop Table View */}');
const endMarker = '                <div className="historical-records-mobile">';
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const newContent = content.substring(0, startIdx) + 
    '                {/* Unified Card View */}\n                <div className="tournament-grid-dashboard">' + 
    content.substring(endIdx + endMarker.length);
  fs.writeFileSync('src/pages/Profile.jsx', newContent);
  console.log('Replaced successfully!');
} else {
  console.log('Indices not found:', startIdx, endIdx);
}
