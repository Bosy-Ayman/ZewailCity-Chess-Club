/**
 * Zewail City Chess Club — Official High-Resolution Winner Certificate Generator
 * Generates an elegant, high-DPI (1920x1080) official certificate with club crest,
 * recipient name, championship honors, official arbiter stamp/seal, and verification code.
 * Supports downloading as PDF document and PNG image.
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

export async function generateWinnerCertificate({
  playerName,
  rank = "Champion", // "Champion" | "Runner-Up" | "3rd Place" | "Participant"
  tournamentTitle = "ZC Chess Championship",
  tournamentType = "Swiss Championship",
  date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  location = "Zewail City of Science and Technology",
  pointsOrScore = null,
  format = "pdf" // 'pdf' | 'png'
}) {
  if (!playerName || playerName === "BYE" || playerName === "TBD") return;

  const width = 1920;
  const height = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

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

  // Certificate Title
  const isPuzzle = (tournamentType || "").toLowerCase().includes("puzzle") || (tournamentType || "").toLowerCase().includes("tactic");
  const certMainTitle = isPuzzle ? "CERTIFICATE OF TACTICAL EXCELLENCE" : "CERTIFICATE OF EXCELLENCE & ACHIEVEMENT";

  ctx.font = "bold 44px 'Georgia', serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(certMainTitle, width / 2, 285);

  // Divider with diamond
  ctx.strokeStyle = "rgba(243, 193, 68, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 320, 315);
  ctx.lineTo(width / 2 + 320, 315);
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

  // Citation Honors text
  const isChamp = rank.toLowerCase().includes("champ") || rank === "1st Place" || rank === "1";
  const isRunnerUp = rank.toLowerCase().includes("runner") || rank === "2nd Place" || rank === "2";
  const rankLabel = isChamp ? "CHAMPION (1ST PLACE)" : isRunnerUp ? "RUNNER-UP FINALIST (2ND PLACE)" : "3RD PLACE PODIUM MASTER";
  const medalEmoji = isChamp ? "🥇" : isRunnerUp ? "🥈" : "🥉";

  ctx.font = "500 22px 'Inter', sans-serif";
  ctx.fillStyle = "#d1c7b7";
  const citationLine1 = isPuzzle
    ? "In recognition of extraordinary tactical foresight, rapid calculation, and puzzle mastery,"
    : "In recognition of exceptional strategic mastery, tactical rigor, and competitive excellence,";
  ctx.fillText(citationLine1, width / 2, 530);
  ctx.fillText("finishing as the honored", width / 2, 565);

  // Rank Pill Box
  const rankPillText = `${medalEmoji} ${rankLabel}${pointsOrScore ? ` • ${pointsOrScore}` : ""}`;
  ctx.font = "bold 24px 'Inter', sans-serif";
  const pillW = ctx.measureText(rankPillText).width + 50;
  
  ctx.fillStyle = isChamp ? "rgba(243, 193, 68, 0.18)" : "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.roundRect(width / 2 - pillW / 2, 595, pillW, 48, 24);
  ctx.fill();
  ctx.strokeStyle = isChamp ? "#f3c144" : "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = isChamp ? "#f3c144" : "#ffffff";
  ctx.fillText(rankPillText, width / 2, 628);

  // Tournament Title & Venue
  ctx.font = "bold 26px 'Georgia', serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`in the ${tournamentTitle}`, width / 2, 690);

  ctx.font = "500 18px 'Inter', sans-serif";
  ctx.fillStyle = "#a8a296";
  ctx.fillText(`Format: ${tournamentType} • Venue: ${location}`, width / 2, 725);
  ctx.fillText(`Date of Conferral: ${date}`, width / 2, 755);

  // 4. Official Club Stamp & Seal (Bottom Center-Left)
  const stampX = 350;
  const stampY = 900;
  const stampR = 75;

  ctx.save();
  // Stamp Outer Ring
  ctx.strokeStyle = "#f3c144";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(stampX, stampY, stampR, 0, Math.PI * 2);
  ctx.stroke();

  // Stamp Inner Ring
  ctx.strokeStyle = "rgba(243, 193, 68, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(stampX, stampY, stampR - 8, 0, Math.PI * 2);
  ctx.stroke();

  // Stamp Text Ring (top and bottom)
  ctx.font = "bold 10px 'Inter', sans-serif";
  ctx.fillStyle = "#f3c144";
  ctx.textAlign = "center";
  ctx.fillText("★ ZEWAIL CITY CHESS CLUB ★", stampX, stampY - stampR + 24);
  ctx.fillText("OFFICIAL ARBITER SEAL", stampX, stampY + stampR - 18);
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(isPuzzle ? "🧩 VERIFIED 🧩" : "♟️ VERIFIED ♟️", stampX, stampY + 5);
  ctx.font = "9px sans-serif";
  ctx.fillText("EST. 2018", stampX, stampY + 22);
  ctx.restore();

  // 5. Signature Lines (Bottom Right)
  const sig1X = width - 580;
  const sig2X = width - 250;
  const sigY = 920;

  // Arbiter Signature
  ctx.strokeStyle = "rgba(243, 193, 68, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sig1X - 100, sigY);
  ctx.lineTo(sig1X + 100, sigY);
  ctx.stroke();

  ctx.font = "italic 22px 'Brush Script MT', cursive, sans-serif";
  ctx.fillStyle = "#f3c144";
  ctx.textAlign = "center";
  ctx.fillText(isPuzzle ? "Arena Director" : "Tournament Arbiter", sig1X, sigY - 12);

  ctx.font = "bold 13px 'Inter', sans-serif";
  ctx.fillStyle = "#d1c7b7";
  ctx.fillText(isPuzzle ? "PUZZLE ARBITER" : "CHIEF ARBITER", sig1X, sigY + 20);
  ctx.font = "11px 'Inter', sans-serif";
  ctx.fillStyle = "#8e8677";
  ctx.fillText("Organizing Committee", sig1X, sigY + 36);

  // President Signature
  ctx.strokeStyle = "rgba(243, 193, 68, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sig2X - 100, sigY);
  ctx.lineTo(sig2X + 100, sigY);
  ctx.stroke();

  ctx.font = "italic 22px 'Brush Script MT', cursive, sans-serif";
  ctx.fillStyle = "#f3c144";
  ctx.fillText("Club Leadership", sig2X, sigY - 12);

  ctx.font = "bold 13px 'Inter', sans-serif";
  ctx.fillStyle = "#d1c7b7";
  ctx.fillText("CLUB PRESIDENT", sig2X, sigY + 20);
  ctx.font = "11px 'Inter', sans-serif";
  ctx.fillStyle = "#8e8677";
  ctx.fillText("ZC Chess Club", sig2X, sigY + 36);

  // 6. Unique Verification Certificate Code (Bottom Bar)
  const cleanId = Math.abs(playerName.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7)).toString(16).toUpperCase();
  const certCode = `ZC-CERT-${cleanId}-${new Date().getFullYear()}`;

  ctx.textAlign = "center";
  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(243, 193, 68, 0.6)";
  ctx.fillText(`Official Verification ID: ${certCode} • zc-chess-club.vercel.app`, width / 2, height - 55);

  // 7. Trigger Download (PDF or PNG)
  const cleanPlayerName = playerName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  const cleanTourneyName = tournamentTitle.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");

  if (format === "png") {
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `Certificate_${cleanPlayerName}_${cleanTourneyName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Generate valid standalone PDF document
    const pdfBlob = canvasToPdfBlob(canvas);
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Certificate_${cleanPlayerName}_${cleanTourneyName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
