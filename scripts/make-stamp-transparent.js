const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

async function main() {
  const inputPath = 'C:\\Users\\pouss\\.gemini\\antigravity-ide\\brain\\58dc41d7-904f-4c0a-afd6-6b702300581b\\.user_uploaded\\media_1789581722625.jpg';
  const outputPath = path.join(__dirname, '..', 'public', 'Icons', 'official-stamp.png');

  if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
  }

  const base64Data = fs.readFileSync(inputPath).toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64Data}`;

  // Find installed chrome or edge on Windows
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  let executablePath = chromePaths.find(p => fs.existsSync(p));
  console.log('Using browser executable:', executablePath);

  const browser = await chromium.launch({
    executablePath: executablePath || undefined,
    headless: true
  });

  const page = await browser.newPage();

  const resultPngBase64 = await page.evaluate(async (imgSrc) => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgSrc;
    });

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.456;
    const minR = Math.min(w, h) * 0.380;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Outside scalloped boundary -> 100% transparent
        if (dist > maxR) {
          data[idx + 3] = 0;
          continue;
        }

        // In the scalloped border region: remove grey/white checkerboard squares
        if (dist >= minR) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const diffRG = Math.abs(r - g);
          const diffGB = Math.abs(g - b);
          const diffRB = Math.abs(r - b);
          const isNeutralGray = diffRG < 24 && diffGB < 24 && diffRB < 24;
          const isLight = (r + g + b) / 3 > 140;

          if (isNeutralGray && isLight) {
            data[idx + 3] = 0;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  }, dataUrl);

  await browser.close();

  const buffer = Buffer.from(resultPngBase64, 'base64');
  fs.writeFileSync(outputPath, buffer);
  console.log('Transparent official stamp PNG saved successfully to:', outputPath, 'Size:', buffer.length);
}

main().catch(err => {
  console.error('Error processing stamp:', err);
  process.exit(1);
});
