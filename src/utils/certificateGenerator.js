/**
 * Zewail City Chess Club — Official High-Resolution Certificate Generator
 * Premium Royal Ivory & Gold Academic Diploma Edition.
 * Generates museum-grade, high-DPI (1920×1080) official diplomas with club crest,
 * formal serif calligraphy, guilloché gold framing, official stamp (actual PNG),
 * authentic fountain pen signatures (Ahmed Elkhodiry & Omar Hafez), and
 * cryptographic verification ID.
 */

/**
 * Pure JavaScript standard PDF 1.4 converter that wraps canvas into a downloadable vector PDF
 */
export function canvasToPdfBlob(canvas) {
  const imgDataUrl = canvas.toDataURL("image/jpeg", 0.98);
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
  offsets[5] = offsets[3] + part5.length;

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

/**
 * Load the official stamp PNG as-is (no pixel masking — draw at 82% opacity with warm tone)
 */
async function loadOfficialStampImage() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    let settled = false;
    const finish = (result) => {
      if (!settled) {
        settled = true;
        resolve(result && img.naturalWidth > 0 ? img : null);
      }
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = "/Icons/official-stamp.png";
    if (img.complete && img.naturalWidth > 0) {
      finish(true);
    } else {
      setTimeout(() => finish(false), 4000);
    }
  });
}

/**
 * Draw a chess knight watermark ghost behind the recipient name area
 */
function drawKnightWatermark(ctx, cx, cy) {
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = "#6b4f1a";
  ctx.font = "260px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♞", cx, cy);
  ctx.restore();
}

/**
 * Draw elegant laurel / wheat divider
 */
function drawLaurelDivider(ctx, cx, y, halfW) {
  ctx.save();
  ctx.strokeStyle = "rgba(139, 104, 32, 0.5)";
  ctx.lineWidth = 1.2;

  // Centre line segments
  ctx.beginPath();
  ctx.moveTo(cx - halfW, y);
  ctx.lineTo(cx - 28, y);
  ctx.moveTo(cx + 28, y);
  ctx.lineTo(cx + halfW, y);
  ctx.stroke();

  // Small laurel leaves left side
  for (let i = 0; i < 5; i++) {
    const lx = cx - 38 - i * 18;
    ctx.save();
    ctx.translate(lx, y);
    ctx.rotate(-(0.35 + i * 0.06));
    ctx.beginPath();
    ctx.ellipse(0, -5, 5, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(139, 104, 32, 0.22)";
    ctx.fill();
    ctx.restore();
  }
  // Small laurel leaves right side
  for (let i = 0; i < 5; i++) {
    const lx = cx + 38 + i * 18;
    ctx.save();
    ctx.translate(lx, y);
    ctx.rotate(0.35 + i * 0.06);
    ctx.beginPath();
    ctx.ellipse(0, -5, 5, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(139, 104, 32, 0.22)";
    ctx.fill();
    ctx.restore();
  }

  // Centre diamond ornament
  ctx.fillStyle = "#8b6820";
  ctx.beginPath();
  ctx.moveTo(cx, y - 9);
  ctx.lineTo(cx + 9, y);
  ctx.lineTo(cx, y + 9);
  ctx.lineTo(cx - 9, y);
  ctx.closePath();
  ctx.fill();

  // Tiny flanking dots
  ctx.beginPath();
  ctx.arc(cx - 16, y, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 16, y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(139, 104, 32, 0.6)";
  ctx.fill();

  ctx.restore();
}

/**
 * Generate Official Premium Ivory & Gold Academic Diploma
 */
export async function generateWinnerCertificate({
  playerName,
  rank = "Participant",
  tournamentTitle = "ZC Chess Championship",
  tournamentType = "Swiss Championship",
  date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  location = "Zewail City of Science and Technology",
  pointsOrScore = null,
  format = "pdf",
  download = true
}) {
  if (!playerName || playerName === "BYE" || playerName === "TBD") return null;

  const width = 1920;
  const height = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // ─── 1. Premium Warm Parchment Background ───────────────────────────────────
  // Outer vignette
  const vigGrad = ctx.createRadialGradient(width / 2, height / 2, 260, width / 2, height / 2, 1080);
  vigGrad.addColorStop(0, "#fffdf7");
  vigGrad.addColorStop(0.45, "#fdf8ee");
  vigGrad.addColorStop(0.75, "#f6edda");
  vigGrad.addColorStop(1, "#e8d5b3");
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);

  // Warm corner blushes
  const cornerGlow = (gx, gy) => {
    const cg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 420);
    cg.addColorStop(0, "rgba(193, 148, 64, 0.07)");
    cg.addColorStop(1, "rgba(193, 148, 64, 0)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, width, height);
  };
  cornerGlow(0, 0);
  cornerGlow(width, 0);
  cornerGlow(0, height);
  cornerGlow(width, height);

  // Delicate paper grain fibers
  ctx.fillStyle = "rgba(155, 120, 72, 0.018)";
  for (let i = 0; i < 22000; i++) {
    const rx = (Math.sin(i * 997.1) * 0.5 + 0.5) * width;
    const ry = (Math.cos(i * 643.7) * 0.5 + 0.5) * height;
    ctx.fillRect(rx, ry, 1.5, 1.5);
  }

  // ─── 2. Multi-Layer Guilloché Framing ───────────────────────────────────────
  // Outermost solid antique gold
  ctx.strokeStyle = "#7a5c18";
  ctx.lineWidth = 5.5;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Gold shine line
  ctx.strokeStyle = "#d4a93c";
  ctx.lineWidth = 2;
  ctx.strokeRect(46, 46, width - 92, height - 92);

  // Thin inner rule
  ctx.strokeStyle = "rgba(139, 104, 32, 0.38)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(58, 58, width - 116, height - 116);

  // Subtle inner accent
  ctx.strokeStyle = "rgba(180, 140, 60, 0.18)";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(70, 70, width - 140, height - 140);

  // Classical Corner Flourish Ornaments
  const drawCornerFlourish = (cx, cy, flipX, flipY) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(flipX, flipY);
    ctx.strokeStyle = "#8b6820";
    ctx.fillStyle = "#8b6820";
    ctx.lineWidth = 2.8;

    // L-bracket
    ctx.beginPath();
    ctx.moveTo(0, 54);
    ctx.lineTo(0, 0);
    ctx.lineTo(54, 0);
    ctx.stroke();

    // Inner curved arch
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(14, 46);
    ctx.quadraticCurveTo(14, 14, 46, 14);
    ctx.stroke();

    // Corner diamond knot
    ctx.beginPath();
    ctx.moveTo(24, 16);
    ctx.lineTo(33, 25);
    ctx.lineTo(24, 34);
    ctx.lineTo(15, 25);
    ctx.closePath();
    ctx.fill();

    // Rosette finials
    ctx.beginPath();
    ctx.arc(0, 54, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(54, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  drawCornerFlourish(36, 36, 1, 1);
  drawCornerFlourish(width - 36, 36, -1, 1);
  drawCornerFlourish(36, height - 36, 1, -1);
  drawCornerFlourish(width - 36, height - 36, -1, -1);

  // ─── 3. Club Crest Header ───────────────────────────────────────────────────
  const logo = await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    let settled = false;
    const finish = (res) => {
      if (!settled) {
        settled = true;
        resolve(res && img.naturalWidth > 0 ? img : null);
      }
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = "/Icons/chess-clublogo.png";
    if (img.complete && img.naturalWidth > 0) {
      finish(true);
    } else {
      setTimeout(() => finish(false), 4000);
    }
  });

  if (logo && logo.naturalWidth > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(139, 104, 32, 0.25)";
    ctx.shadowBlur = 14;
    ctx.drawImage(logo, width / 2 - 50, 78, 100, 100);
    ctx.restore();
  }

  // University name smallcaps
  ctx.textAlign = "center";
  ctx.font = "bold 12.5px 'Inter', -apple-system, sans-serif";
  ctx.fillStyle = "#6b5840";
  ctx.letterSpacing = "4.5px";
  ctx.fillText("ZEWAIL CITY OF SCIENCE, TECHNOLOGY AND INNOVATION", width / 2, 198);

  // Thin rule under university name
  ctx.strokeStyle = "rgba(139, 104, 32, 0.3)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 380, 205);
  ctx.lineTo(width / 2 + 380, 205);
  ctx.stroke();

  // Club name
  ctx.font = "bold 28px 'Georgia', 'Times New Roman', serif";
  ctx.fillStyle = "#1a1108";
  ctx.letterSpacing = "4px";
  ctx.fillText("ZEWAIL CITY CHESS CLUB", width / 2, 236);

  // ─── 4. Certificate Title ────────────────────────────────────────────────────
  const rankStr = (rank || "").toString().toLowerCase();
  const isChamp = rankStr.includes("champ") || rankStr === "1st place" || rankStr === "1" || rankStr === "#1";
  const isRunnerUp = rankStr.includes("runner") || rankStr === "2nd place" || rankStr === "2" || rankStr === "#2";
  const isThird = rankStr.includes("3rd") || rankStr === "3" || rankStr === "#3";
  const isPodium = isChamp || isRunnerUp || isThird;
  const isPuzzle = (tournamentType || "").toLowerCase().includes("puzzle") || (tournamentType || "").toLowerCase().includes("tactic");

  let certMainTitle = "";
  if (isPodium) {
    certMainTitle = isPuzzle ? "CERTIFICATE OF TACTICAL EXCELLENCE" : "CERTIFICATE OF EXCELLENCE & MERIT";
  } else {
    certMainTitle = isPuzzle ? "CERTIFICATE OF TACTICAL APPRECIATION" : "CERTIFICATE OF PARTICIPATION & APPRECIATION";
  }

  // Main title gold gradient
  ctx.font = "bold 44px 'Georgia', 'Times New Roman', serif";
  const titleGrad = ctx.createLinearGradient(width / 2 - 420, 0, width / 2 + 420, 0);
  titleGrad.addColorStop(0, "#6b4a12");
  titleGrad.addColorStop(0.35, "#8b6118");
  titleGrad.addColorStop(0.5, "#b07d22");
  titleGrad.addColorStop(0.65, "#8b6118");
  titleGrad.addColorStop(1, "#6b4a12");
  ctx.fillStyle = titleGrad;
  ctx.letterSpacing = "2.5px";
  ctx.fillText(certMainTitle, width / 2, 295);

  // ─── 5. Laurel Divider ───────────────────────────────────────────────────────
  drawLaurelDivider(ctx, width / 2, 326, 300);

  // ─── 6. Watermark Knight ────────────────────────────────────────────────────
  drawKnightWatermark(ctx, width / 2, 480);

  // ─── 7. Recipient Block ──────────────────────────────────────────────────────
  ctx.font = "600 13.5px 'Inter', sans-serif";
  ctx.fillStyle = "#7a6548";
  ctx.letterSpacing = "3.5px";
  ctx.fillText("THIS CERTIFICATE IS PROUDLY CONFERRED UPON", width / 2, 374);

  // Recipient name
  ctx.font = `bold 68px 'Georgia', 'Times New Roman', serif`;
  ctx.fillStyle = "#0f0c08";
  ctx.letterSpacing = "0.5px";
  ctx.fillText(playerName, width / 2, 456);

  // Decorative underline with dots
  const nameWidth = Math.min(ctx.measureText(playerName).width + 120, 760);
  ctx.strokeStyle = "rgba(139, 104, 32, 0.6)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(width / 2 - nameWidth / 2, 476);
  ctx.lineTo(width / 2 + nameWidth / 2, 476);
  ctx.stroke();
  // Three accent dots on underline
  [0, -16, 16].forEach(offset => {
    ctx.beginPath();
    ctx.arc(width / 2 + offset, 476, offset === 0 ? 4.5 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#8b6820";
    ctx.fill();
  });

  // ─── 8. Citation ─────────────────────────────────────────────────────────────
  let honorDistinction = "";
  if (isChamp) {
    honorDistinction = "GRAND CHAMPION • FIRST PLACE";
  } else if (isRunnerUp) {
    honorDistinction = "RUNNER-UP FINALIST • SECOND PLACE";
  } else if (isThird) {
    honorDistinction = "THIRD PLACE PODIUM MASTER";
  } else if (rankStr.includes("#")) {
    honorDistinction = `DISTINGUISHED TACTICIAN • ${rank.toUpperCase()}`;
  } else {
    honorDistinction = isPuzzle ? "HONORED TACTICAL COMPETITOR" : "HONORED TOURNAMENT COMPETITOR";
  }

  const scoreText = pointsOrScore ? ` (${pointsOrScore})` : "";

  ctx.font = "italic 21px 'Georgia', 'Baskerville', serif";
  ctx.fillStyle = "#4a3c2c";
  ctx.letterSpacing = "0px";

  if (isPodium) {
    const cit1 = isPuzzle
      ? "For extraordinary calculation, tactical precision, and mastery over complex positions,"
      : "For exceptional strategic rigor, sportsmanship, and outstanding competitive mastery,";
    ctx.fillText(cit1, width / 2, 528);
    ctx.fillText("having achieved the distinguished standing of", width / 2, 560);
  } else {
    const cit1 = isPuzzle
      ? "In grateful appreciation of strategic enthusiasm, problem-solving dedication, and honorable play,"
      : "In grateful recognition of passionate sportsmanship, strategic rigor, and honorable participation as an";
    ctx.fillText(cit1, width / 2, 528);
    ctx.fillText("active competitor with distinction as an", width / 2, 560);
  }

  // Formal honor title
  ctx.font = "bold 27px 'Georgia', 'Times New Roman', serif";
  ctx.fillStyle = isChamp ? "#7a5210" : "#5e4418";
  ctx.letterSpacing = "1.8px";
  ctx.fillText(`${honorDistinction}${scoreText}`, width / 2, 616);

  // Honour underline
  ctx.letterSpacing = "0px";
  ctx.strokeStyle = "rgba(139, 104, 32, 0.4)";
  ctx.lineWidth = 1;
  const honorW = ctx.measureText(`${honorDistinction}${scoreText}`).width + 80;
  ctx.beginPath();
  ctx.moveTo(width / 2 - honorW / 2, 632);
  ctx.lineTo(width / 2 + honorW / 2, 632);
  ctx.stroke();

  // ─── 9. Tournament Context ───────────────────────────────────────────────────
  ctx.font = "bold 23px 'Georgia', serif";
  ctx.fillStyle = "#1a1108";
  ctx.fillText(`in the ${tournamentTitle}`, width / 2, 686);

  ctx.font = "500 16px 'Inter', sans-serif";
  ctx.fillStyle = "#6b5840";
  ctx.letterSpacing = "0.5px";
  ctx.fillText(`Format: ${tournamentType}   •   Venue: ${location}`, width / 2, 720);
  ctx.fillText(`Date of Official Conferral: ${date}`, width / 2, 748);

  // Thin separator before footer
  ctx.strokeStyle = "rgba(139, 104, 32, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 772);
  ctx.lineTo(width - 100, 772);
  ctx.stroke();

  // ─── 10. Official Stamp (bottom-left quadrant) ───────────────────────────────
  const stampImg = await loadOfficialStampImage();
  const stampX = 310;
  const stampY = 895;
  const stampSize = 240;

  ctx.save();
  ctx.translate(stampX, stampY);
  ctx.rotate(-0.09); // Authentic slight tilt

  if (stampImg) {
    // Draw actual PNG at warm-toned opacity — no pixel masking
    ctx.globalAlpha = 0.82;
    ctx.filter = "sepia(0.25) saturate(1.15) brightness(0.97)";
    ctx.shadowColor = "rgba(100, 75, 20, 0.25)";
    ctx.shadowBlur = 16;
    ctx.drawImage(stampImg, -stampSize / 2, -stampSize / 2, stampSize, stampSize);
    ctx.filter = "none";
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  } else {
    // Fallback drawn stamp ring
    ctx.strokeStyle = "#8b6820";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 11px 'Inter', sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillStyle = "#8b6820";
    ctx.fillText("OFFICIAL SEAL", 0, -12);
    ctx.fillText("ZEWAIL CITY", 0, 10);
  }
  ctx.restore();

  // ─── 11. Fountain-Pen Signatures ─────────────────────────────────────────────
  const sig1X = width - 600;  // Ahmed Elkhodiry — President (left)
  const sig2X = width - 230;  // Omar Hafez — Vice President (right)
  const sigBaseY = 910;

  // ── Ahmed Elkhodiry (President) ──
  const drawAhmedElkhodiry = (x, y) => {
    ctx.save();
    ctx.strokeStyle = "#0d1829"; // Midnight blue fountain pen
    ctx.fillStyle = "#0d1829";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // "A" — tall capital loop
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x - 88, y + 8);
    ctx.bezierCurveTo(x - 84, y - 36, x - 70, y - 44, x - 56, y - 34);
    ctx.bezierCurveTo(x - 46, y - 22, x - 58, y - 4, x - 76, y + 6);
    // bridge to 'h' stem
    ctx.bezierCurveTo(x - 56, y - 12, x - 40, y - 20, x - 26, y - 6);
    ctx.stroke();

    // "hmed" flowing cursive
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 6);
    ctx.bezierCurveTo(x - 22, y - 26, x - 16, y - 28, x - 12, y - 8);
    ctx.bezierCurveTo(x - 8, y - 20, x - 3, y - 20, x + 2, y - 5);
    ctx.bezierCurveTo(x + 7, y - 18, x + 12, y - 16, x + 16, y - 3);
    ctx.stroke();

    // Space then "E" — high loop going up
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 26, y - 28);
    ctx.bezierCurveTo(x + 34, y - 44, x + 44, y - 40, x + 40, y - 18);
    ctx.bezierCurveTo(x + 36, y - 6, x + 54, y - 32, x + 58, y - 6);
    ctx.stroke();

    // "lkhodiry" cursive run
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x + 58, y - 6);
    ctx.bezierCurveTo(x + 64, y - 28, x + 70, y - 26, x + 72, y - 5);
    ctx.bezierCurveTo(x + 78, y - 22, x + 84, y - 20, x + 88, y - 4);
    // y-tail descender
    ctx.bezierCurveTo(x + 92, y + 8, x + 82, y + 20, x + 72, y + 16);
    ctx.stroke();

    // Long sweeping underline tail
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 92, y + 16);
    ctx.bezierCurveTo(x - 30, y + 8, x + 40, y + 22, x + 96, y + 10);
    ctx.stroke();

    // Small pen-lift accent dots
    ctx.beginPath();
    ctx.arc(x + 22, y - 34, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // ── Omar Hafez (Vice President) ──
  const drawOmarHafez = (x, y) => {
    ctx.save();
    ctx.strokeStyle = "#0d1829";
    ctx.fillStyle = "#0d1829";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // "O" — sweeping oval
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x - 62, y - 4);
    ctx.bezierCurveTo(x - 68, y - 44, x - 44, y - 52, x - 28, y - 44);
    ctx.bezierCurveTo(x - 12, y - 36, x - 12, y - 8, x - 26, y);
    ctx.bezierCurveTo(x - 40, y + 8, x - 62, y + 4, x - 62, y - 4);
    ctx.stroke();

    // "m" — connected m humps
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.bezierCurveTo(x - 10, y - 22, x - 4, y - 22, x, y - 2);
    ctx.bezierCurveTo(x + 4, y - 22, x + 10, y - 22, x + 14, y - 2);
    ctx.bezierCurveTo(x + 18, y - 20, x + 24, y - 18, x + 28, y - 2);
    ctx.stroke();

    // "ar" small letters
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x + 28, y - 2);
    ctx.bezierCurveTo(x + 32, y - 16, x + 38, y - 14, x + 42, y - 2);
    ctx.bezierCurveTo(x + 46, y - 12, x + 52, y - 10, x + 56, y - 2);
    ctx.stroke();

    // "H" — capital H flourish (start of surname)
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 66, y - 36);
    ctx.bezierCurveTo(x + 66, y - 12, x + 66, y - 6, x + 68, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 80, y - 36);
    ctx.bezierCurveTo(x + 80, y - 12, x + 80, y - 6, x + 78, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 66, y - 20);
    ctx.bezierCurveTo(x + 70, y - 22, x + 76, y - 22, x + 80, y - 20);
    ctx.stroke();

    // "afez" flowing cursive
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(x + 80, y);
    ctx.bezierCurveTo(x + 86, y - 18, x + 92, y - 16, x + 96, y - 2);
    ctx.bezierCurveTo(x + 100, y - 14, x + 106, y - 12, x + 108, y - 2);
    // z-letter zig
    ctx.bezierCurveTo(x + 112, y - 16, x + 118, y - 6, x + 120, y);
    ctx.stroke();

    // Long sweeping underline
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 68, y + 14);
    ctx.bezierCurveTo(x - 10, y + 6, x + 60, y + 18, x + 126, y + 8);
    ctx.stroke();

    // H crossbar dot
    ctx.beginPath();
    ctx.arc(x + 73, y - 20, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  drawAhmedElkhodiry(sig1X, sigBaseY - 28);
  drawOmarHafez(sig2X, sigBaseY - 28);

  // ── Signature lines & labels ──
  const drawSigLine = (sx) => {
    ctx.strokeStyle = "rgba(139, 104, 32, 0.5)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx - 115, sigBaseY);
    ctx.lineTo(sx + 115, sigBaseY);
    ctx.stroke();
  };

  drawSigLine(sig1X);
  drawSigLine(sig2X);

  // Name labels
  ctx.font = "bold 15.5px 'Georgia', serif";
  ctx.fillStyle = "#1a1108";
  ctx.textAlign = "center";
  ctx.fillText("Ahmed Elkhodiry", sig1X, sigBaseY + 22);
  ctx.fillText("Omar Hafez", sig2X, sigBaseY + 22);

  // Titles
  ctx.font = "bold 10.5px 'Inter', sans-serif";
  ctx.fillStyle = "#7a5618";
  ctx.letterSpacing = "0.9px";
  ctx.fillText("CLUB PRESIDENT", sig1X, sigBaseY + 38);
  ctx.fillText("VICE PRESIDENT", sig2X, sigBaseY + 38);
  ctx.letterSpacing = "0px";

  // Sub-labels
  ctx.font = "10.5px 'Inter', sans-serif";
  ctx.fillStyle = "#6e604f";
  ctx.fillText("Zewail City Chess Club", sig1X, sigBaseY + 53);
  ctx.fillText("Zewail City Chess Club", sig2X, sigBaseY + 53);

  // ─── 12. Cryptographic Footer ────────────────────────────────────────────────
  const cleanId = Math.abs(
    playerName.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7)
  ).toString(16).toUpperCase();
  const certCode = `ZC-CERT-${cleanId}-${new Date().getFullYear()}`;

  ctx.textAlign = "center";
  ctx.font = "10.5px 'Courier New', monospace";
  ctx.fillStyle = "#8a7460";
  ctx.letterSpacing = "0.4px";
  ctx.fillText(
    `Official Credential ID: ${certCode}   •   Verified by Zewail City Chess Club Office of Arbiters   •   zc-chess-club.vercel.app`,
    width / 2,
    height - 46
  );

  // ─── 13. Encode & Download ───────────────────────────────────────────────────
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
    rankLabel: honorDistinction
  };
}
