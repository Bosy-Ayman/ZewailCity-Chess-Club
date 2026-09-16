/**
 * Zewail City Chess Club — Official High-Resolution Certificate Generator
 * Generates an elegant, high-DPI (1920x1080) official certificate with club crest,
 * recipient name, championship / appreciation honors, official arbiter seal, and verification code.
 * Supports downloading as PDF document and PNG image, and generating PDF base64 for email attachments.
 */

/**
 * Pure JavaScript standard PDF 1.4 converter that wraps canvas into a real downloadable PDF
 */
export function canvasToPdfBlob(canvas) {
  const imgDataUrl = canvas.toDataURL("image/jpeg", 0.95);
  const base64Data = imgDataUrl.split(",")[1];
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const imageBytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    imageBytes[i] = binaryString.charCodeAt(i);
  }

  // A4 Landscape standard dimensions in points: 842 x 595
  const pageWidth = 842;
  const pageHeight = 595;
  const enc = new TextEncoder();

  const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`;
  const streamContent = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im1 Do\nQ\n`;
  const obj4 = `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  const obj5Header = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${len} >>\nstream\n`;
  const obj5Footer = `\nendstream\nendobj\n`;

  const part1 = enc.encode(header);
  const part2 = enc.encode(obj1);
  const part3 = enc.encode(obj2);
  const part4 = enc.encode(obj3);
  const part5 = enc.encode(obj4);
  const part6 = enc.encode(obj5Header);
  const part8 = enc.encode(obj5Footer);

  const offsets = [];
  offsets[1] = part1.length;
  offsets[2] = offsets[1] + part2.length;
  offsets[3] = offsets[2] + part3.length;
  offsets[4] = offsets[3] + part4.length;
  offsets[5] = offsets[4] + part5.length;

  const xrefOffset = offsets[5] + part6.length + len + part8.length;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const part9 = enc.encode(xref + trailer);

  const totalLength = part1.length + part2.length + part3.length + part4.length + part5.length + part6.length + len + part8.length + part9.length;
  const pdfBuffer = new Uint8Array(totalLength);
  let pos = 0;

  pdfBuffer.set(part1, pos); pos += part1.length;
  pdfBuffer.set(part2, pos); pos += part2.length;
  pdfBuffer.set(part3, pos); pos += part3.length;
  pdfBuffer.set(part4, pos); pos += part4.length;
  pdfBuffer.set(part5, pos); pos += part5.length;
  pdfBuffer.set(part6, pos); pos += part6.length;
  pdfBuffer.set(imageBytes, pos); pos += len;
  pdfBuffer.set(part8, pos); pos += part8.length;
  pdfBuffer.set(part9, pos); pos += part9.length;

  return new Blob([pdfBuffer], { type: "application/pdf" });
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateWinnerCertificate({
  playerName,
  rank = "Participant", // "Champion" | "Runner-Up" | "3rd Place" | "Participant" | string
  tournamentTitle = "ZC Chess Championship",
  tournamentType = "Swiss Championship",
  date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  location = "Zewail City of Science and Technology",
  pointsOrScore = null,
  format = "pdf", // 'pdf' | 'png'
  download = true // if true, initiates browser file download
}) {
  if (!playerName || playerName === "BYE" || playerName === "TBD") return null;

  const width = 1920;
  const height = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Dark Luxury Obsidian & Gold Gradient Background
  const bg = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, 950);
  bg.addColorStop(0, "#19150f");
  bg.addColorStop(0.6, "#0f0d0a");
  bg.addColorStop(1, "#070604");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle chess board watermark in background (ultra-low opacity)
  ctx.fillStyle = "rgba(243, 193, 68, 0.015)";
  const sqSize = 120;
  for (let r = 0; r < height / sqSize; r++) {
    for (let c = 0; c < width / sqSize; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillRect(c * sqSize, r * sqSize, sqSize, sqSize);
      }
    }
  }

  // 2. Ornate Double Gold Framing Borders
  ctx.strokeStyle = "rgba(243, 193, 68, 0.85)";
  ctx.lineWidth = 5;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  ctx.strokeStyle = "rgba(243, 193, 68, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(55, 55, width - 110, height - 110);

  ctx.strokeStyle = "rgba(243, 193, 68, 0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(65, 65, width - 130, height - 130);

  // Corner Ornaments
  const drawCornerFlourish = (x, y, dx, dy) => {
    ctx.save();
    ctx.strokeStyle = "#f3c144";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + dx * 50, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * 50);
    ctx.stroke();

    ctx.fillStyle = "#f3c144";
    ctx.beginPath();
    ctx.arc(x + dx * 16, y + dy * 16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawCornerFlourish(40, 40, 1, 1);
  drawCornerFlourish(width - 40, 40, -1, 1);
  drawCornerFlourish(40, height - 40, 1, -1);
  drawCornerFlourish(width - 40, height - 40, -1, -1);

  // 3. Top Club Crest & Header
  const logo = new Image();
  logo.crossOrigin = "anonymous";
  await new Promise((resolve) => {
    logo.onload = () => resolve(true);
    logo.onerror = () => resolve(false);
    logo.src = "/Icons/chess-clublogo.png";
    setTimeout(resolve, 350);
  });

  if (logo.complete && logo.naturalWidth > 0) {
    ctx.drawImage(logo, width / 2 - 50, 85, 100, 100);
  } else {
    ctx.font = "60px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("👑", width / 2, 150);
  }

  // Club Name
  ctx.textAlign = "center";
  ctx.font = "bold 26px 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#f3c144";
  ctx.letterSpacing = "4px";
  ctx.fillText("ZEWAIL CITY CHESS CLUB", width / 2, 225);

  // Certificate Rank & Type Classification
  const rankStr = (rank || "").toString().toLowerCase();
  const isChamp = rankStr.includes("champ") || rankStr === "1st place" || rankStr === "1" || rankStr === "#1";
  const isRunnerUp = rankStr.includes("runner") || rankStr === "2nd place" || rankStr === "2" || rankStr === "#2";
  const isThird = rankStr.includes("3rd") || rankStr === "3" || rankStr === "#3";
  const isPodium = isChamp || isRunnerUp || isThird;
  const isPuzzle = (tournamentType || "").toLowerCase().includes("puzzle") || (tournamentType || "").toLowerCase().includes("tactic");

  // Main Certificate Title
  let certMainTitle = "";
  if (isPodium) {
    certMainTitle = isPuzzle ? "CERTIFICATE OF TACTICAL EXCELLENCE" : "CERTIFICATE OF EXCELLENCE & MERIT";
  } else {
    certMainTitle = isPuzzle ? "CERTIFICATE OF TACTICAL APPRECIATION" : "CERTIFICATE OF PARTICIPATION & APPRECIATION";
  }

  ctx.font = "bold 42px 'Georgia', serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(certMainTitle, width / 2, 285);

  // Divider with diamond
  ctx.strokeStyle = "rgba(243, 193, 68, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 340, 315);
  ctx.lineTo(width / 2 + 340, 315);
  ctx.stroke();

  ctx.fillStyle = "#f3c144";
  ctx.beginPath();
  ctx.arc(width / 2, 315, 6, 0, Math.PI * 2);
  ctx.fill();

  // "PROUDLY CONFERRED UPON"
  ctx.font = "600 18px 'Inter', sans-serif";
  ctx.fillStyle = "#a8a296";
  ctx.fillText("THIS CERTIFICATE IS PROUDLY CONFERRED UPON", width / 2, 365);

  // Recipient Player Name
  ctx.font = "bold 64px 'Georgia', serif";
  const nameGrad = ctx.createLinearGradient(width / 2 - 300, 0, width / 2 + 300, 0);
  nameGrad.addColorStop(0, "#ffd700");
  nameGrad.addColorStop(0.5, "#ffffff");
  nameGrad.addColorStop(1, "#f3c144");
  ctx.fillStyle = nameGrad;
  ctx.fillText(playerName, width / 2, 450);

  // Underline for player name
  ctx.strokeStyle = "rgba(243, 193, 68, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 380, 475);
  ctx.lineTo(width / 2 + 380, 475);
  ctx.stroke();

  // Citation text & rank labels
  let rankLabel = "";
  let medalEmoji = "🏅";
  if (isChamp) {
    rankLabel = "CHAMPION (1ST PLACE)";
    medalEmoji = "🥇";
  } else if (isRunnerUp) {
    rankLabel = "RUNNER-UP FINALIST (2ND PLACE)";
    medalEmoji = "🥈";
  } else if (isThird) {
    rankLabel = "3RD PLACE PODIUM MASTER";
    medalEmoji = "🥉";
  } else if (rankStr.includes("#")) {
    rankLabel = `DISTINGUISHED TACTICIAN (${rank.toUpperCase()})`;
    medalEmoji = "🎖️";
  } else {
    rankLabel = isPuzzle ? "DISTINGUISHED ARENA SOLVER" : "HONORED TOURNAMENT PARTICIPANT";
    medalEmoji = "🏅";
  }

  ctx.font = "500 22px 'Inter', sans-serif";
  ctx.fillStyle = "#d1c7b7";
  
  if (isPodium) {
    const citationLine1 = isPuzzle
      ? "In recognition of extraordinary tactical foresight, rapid calculation, and puzzle mastery,"
      : "In recognition of exceptional strategic mastery, tactical rigor, and competitive excellence,";
    ctx.fillText(citationLine1, width / 2, 530);
    ctx.fillText("finishing as the honored", width / 2, 565);
  } else {
    const citationLine1 = isPuzzle
      ? "In grateful recognition and appreciation of tactical dedication, problem-solving passion,"
      : "In grateful appreciation of passionate participation, sportsmanship, and strategic dedication,";
    ctx.fillText(citationLine1, width / 2, 530);
    ctx.fillText("competing with honor and distinction as a", width / 2, 565);
  }

  // Rank Pill Box
  const rankPillText = `${medalEmoji} ${rankLabel}${pointsOrScore ? ` • ${pointsOrScore}` : ""}`;
  ctx.font = "bold 24px 'Inter', sans-serif";
  const pillW = ctx.measureText(rankPillText).width + 50;
  
  ctx.fillStyle = isChamp ? "rgba(243, 193, 68, 0.18)" : isPodium ? "rgba(255, 255, 255, 0.1)" : "rgba(243, 193, 68, 0.12)";
  ctx.beginPath();
  ctx.roundRect(width / 2 - pillW / 2, 595, pillW, 48, 24);
  ctx.fill();
  ctx.strokeStyle = isChamp ? "#f3c144" : isPodium ? "rgba(255, 255, 255, 0.3)" : "rgba(243, 193, 68, 0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = isChamp || !isPodium ? "#f3c144" : "#ffffff";
  ctx.fillText(rankPillText, width / 2, 628);

  // Tournament Title & Venue
  ctx.font = "bold 26px 'Georgia', serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`in the ${tournamentTitle}`, width / 2, 690);

  ctx.font = "500 18px 'Inter', sans-serif";
  ctx.fillStyle = "#a8a296";
  ctx.fillText(`Format: ${tournamentType} • Venue: ${location}`, width / 2, 725);
  ctx.fillText(`Date of Conferral: ${date}`, width / 2, 755);

  // 4. Official Real Club Rubber / Embossed Stamp (Bottom Left-Center)
  const drawRealRubberStamp = (ctx, stampX, stampY) => {
    ctx.save();
    ctx.translate(stampX, stampY);
    ctx.rotate(-0.09); // Realistic ~ -5.2 degree tilt as if pressed by hand

    const r = 80;

    // Semi-translucent ink bleed halo
    const halo = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.06);
    halo.addColorStop(0, "rgba(243, 193, 68, 0.08)");
    halo.addColorStop(0.85, "rgba(243, 193, 68, 0.03)");
    halo.addColorStop(1, "rgba(243, 193, 68, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.06, 0, Math.PI * 2);
    ctx.fill();

    // Outer Thick Ring
    ctx.strokeStyle = "rgba(243, 193, 68, 0.95)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Fine Ring
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(243, 193, 68, 0.75)";
    ctx.beginPath();
    ctx.arc(0, 0, r - 5, 0, Math.PI * 2);
    ctx.stroke();

    // Inner text boundary ring
    ctx.beginPath();
    ctx.arc(0, 0, r - 25, 0, Math.PI * 2);
    ctx.stroke();

    // Circular curved text along top & bottom arcs
    const drawCurvedStampText = (text, radius, startAngle, endAngle, inward = false) => {
      ctx.save();
      ctx.font = "bold 9.5px 'Inter', Arial, sans-serif";
      ctx.fillStyle = "#f3c144";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const chars = text.split("");
      const angleStep = (endAngle - startAngle) / Math.max(chars.length - 1, 1);

      chars.forEach((char, i) => {
        const charAngle = startAngle + i * angleStep;
        ctx.save();
        ctx.rotate(charAngle);
        ctx.translate(0, inward ? radius : -radius);
        if (inward) ctx.rotate(Math.PI);
        ctx.fillText(char, 0, 0);
        ctx.restore();
      });
      ctx.restore();
    };

    drawCurvedStampText("★ ZEWAIL CITY CHESS CLUB ★", r - 15, -Math.PI * 0.74, Math.PI * 0.74, false);
    drawCurvedStampText("★ OFFICIAL ARBITER SEAL ★", r - 15, -Math.PI * 0.70, Math.PI * 0.70, true);

    // Centerpiece Badge
    ctx.strokeStyle = "rgba(243, 193, 68, 0.85)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, r - 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "#f3c144";
    ctx.fillText(isPuzzle ? "🧩" : "♟️", 0, -10);

    ctx.font = "bold 8.5px 'Inter', sans-serif";
    ctx.letterSpacing = "1.5px";
    ctx.fillStyle = "#f3c144";
    ctx.fillText("OFFICIAL", 0, 8);

    ctx.font = "bold 7.5px 'Inter', sans-serif";
    ctx.fillStyle = "#e2d9cc";
    ctx.letterSpacing = "1px";
    ctx.fillText("EST. 2018", 0, 18);

    // Subtle authentic stamp ink distress speckles
    ctx.fillStyle = "rgba(243, 193, 68, 0.3)";
    const speckles = [
      [-32, -22], [36, -16], [-25, 28], [28, 26],
      [-12, -40], [18, -38], [-40, 8], [38, 4]
    ];
    speckles.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  drawRealRubberStamp(ctx, 360, 895);

  // 5. Authentic Handwritten Signatures (Bottom Right)
  const sig1X = width - 580;
  const sig2X = width - 250;
  const sigY = 920;

  // --- Handwritten Signature 1: Alaa Salama (Organizing / Arbiter) ---
  const drawAlaaSalamaSignature = (x, y) => {
    ctx.save();
    ctx.strokeStyle = "#ffd768";
    ctx.fillStyle = "#ffd768";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Cursive 'A' with stylish upper loop
    ctx.beginPath();
    ctx.moveTo(x - 75, y + 6);
    ctx.bezierCurveTo(x - 72, y - 26, x - 64, y - 34, x - 54, y - 30);
    ctx.bezierCurveTo(x - 45, y - 26, x - 52, y - 6, x - 68, y + 2);
    ctx.bezierCurveTo(x - 50, y - 10, x - 40, y - 8, x - 32, y - 4);
    // l-a-a loops
    ctx.bezierCurveTo(x - 28, y - 22, x - 24, y - 20, x - 22, y - 2);
    ctx.bezierCurveTo(x - 18, y - 12, x - 14, y - 12, x - 10, y - 3);
    ctx.bezierCurveTo(x - 6, y - 12, x - 2, y - 12, x + 2, y - 2);
    ctx.stroke();

    // 'Salama' - S loop + letters
    ctx.beginPath();
    ctx.lineWidth = 2.6;
    ctx.moveTo(x + 10, y - 14);
    ctx.bezierCurveTo(x + 16, y - 28, x + 26, y - 26, x + 22, y - 12);
    ctx.bezierCurveTo(x + 18, y - 2, x + 32, y - 16, x + 40, y - 3);
    ctx.bezierCurveTo(x + 46, y - 24, x + 50, y - 22, x + 54, y - 2);
    ctx.bezierCurveTo(x + 60, y - 12, x + 66, y - 12, x + 72, y - 2);
    ctx.stroke();

    // Cursive underline flourish
    ctx.beginPath();
    ctx.lineWidth = 1.8;
    ctx.moveTo(x - 78, y + 12);
    ctx.bezierCurveTo(x - 20, y + 6, x + 35, y + 16, x + 78, y + 8);
    ctx.stroke();
    ctx.restore();
  };

  // --- Handwritten Signature 2: Ahmed Elkhodiry (Club President) ---
  const drawAhmedElkhodirySignature = (x, y) => {
    ctx.save();
    ctx.strokeStyle = "#ffd768";
    ctx.fillStyle = "#ffd768";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Cursive 'A'
    ctx.beginPath();
    ctx.moveTo(x - 85, y + 6);
    ctx.bezierCurveTo(x - 80, y - 30, x - 68, y - 36, x - 56, y - 28);
    ctx.bezierCurveTo(x - 48, y - 18, x - 58, y - 2, x - 74, y + 4);
    ctx.bezierCurveTo(x - 56, y - 8, x - 42, y - 16, x - 30, y - 4);
    ctx.stroke();

    // 'Elkhodiry' - E with flowing loops & descending tail
    ctx.beginPath();
    ctx.lineWidth = 2.6;
    ctx.moveTo(x - 18, y - 22);
    ctx.bezierCurveTo(x - 10, y - 34, x - 2, y - 28, x - 6, y - 12);
    ctx.bezierCurveTo(x - 12, y - 4, x + 6, y - 24, x + 10, y - 2);
    // k-h-o-d-i-r-y
    ctx.bezierCurveTo(x + 16, y - 24, x + 22, y - 22, x + 24, y - 4);
    ctx.bezierCurveTo(x + 30, y - 20, x + 36, y - 16, x + 40, y - 3);
    ctx.bezierCurveTo(x + 46, y - 14, x + 52, y - 14, x + 56, y - 4);
    ctx.bezierCurveTo(x + 62, y - 24, x + 66, y - 20, x + 68, y - 3);
    // y tail loop
    ctx.bezierCurveTo(x + 72, y - 12, x + 78, y - 12, x + 82, y - 2);
    ctx.bezierCurveTo(x + 86, y + 10, x + 76, y + 20, x + 68, y + 16);
    ctx.stroke();

    // Dynamic underline flourish
    ctx.beginPath();
    ctx.lineWidth = 1.8;
    ctx.moveTo(x - 80, y + 14);
    ctx.bezierCurveTo(x - 10, y + 4, x + 45, y + 16, x + 88, y + 8);
    ctx.stroke();
    ctx.restore();
  };

  // Render handwritten signature strokes
  drawAlaaSalamaSignature(sig1X, sigY - 26);
  drawAhmedElkhodirySignature(sig2X, sigY - 26);

  // Line 1: Organizing / Chief Arbiter
  ctx.strokeStyle = "rgba(243, 193, 68, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sig1X - 110, sigY);
  ctx.lineTo(sig1X + 110, sigY);
  ctx.stroke();

  ctx.font = "bold 15px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("Alaa Salama", sig1X, sigY + 20);

  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.fillStyle = "#f3c144";
  ctx.fillText(isPuzzle ? "PUZZLE ARBITER & ORGANIZING HEAD" : "CHIEF ARBITER & ORGANIZING HEAD", sig1X, sigY + 36);

  ctx.font = "10px 'Inter', sans-serif";
  ctx.fillStyle = "#8e8677";
  ctx.fillText("Tournament Organizing Committee", sig1X, sigY + 50);

  // Line 2: Club President
  ctx.strokeStyle = "rgba(243, 193, 68, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sig2X - 110, sigY);
  ctx.lineTo(sig2X + 110, sigY);
  ctx.stroke();

  ctx.font = "bold 15px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Ahmed Elkhodiry", sig2X, sigY + 20);

  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.fillStyle = "#f3c144";
  ctx.fillText("CLUB PRESIDENT", sig2X, sigY + 36);

  ctx.font = "10px 'Inter', sans-serif";
  ctx.fillStyle = "#8e8677";
  ctx.fillText("Zewail City Chess Club", sig2X, sigY + 50);

  // 6. Unique Verification Certificate Code (Bottom Bar)
  const cleanId = Math.abs(playerName.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7)).toString(16).toUpperCase();
  const certCode = `ZC-CERT-${cleanId}-${new Date().getFullYear()}`;

  ctx.textAlign = "center";
  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(243, 193, 68, 0.6)";
  ctx.fillText(`Official Verification ID: ${certCode} • zc-chess-club.vercel.app`, width / 2, height - 55);

  const cleanPlayerName = playerName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  const cleanTourneyName = tournamentTitle.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  const filename = `Certificate_${cleanPlayerName}_${cleanTourneyName}.${format === "png" ? "png" : "pdf"}`;

  const pdfBlob = canvasToPdfBlob(canvas);
  let pdfBase64 = "";
  try {
    pdfBase64 = await blobToBase64(pdfBlob);
  } catch (err) {
    console.warn("Could not encode pdf blob to base64:", err);
  }

  // Trigger Download if requested
  if (download) {
    if (format === "png") {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  }

  return {
    pdfBlob,
    pdfBase64,
    certCode,
    filename,
    certMainTitle,
    rankLabel
  };
}
