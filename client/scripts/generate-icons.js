const sharp = require('sharp');
const toIco = require('to-ico');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOGO_URL =
  'https://casadoaconchego.org.br/wp-content/uploads/2021/10/Casa-da-Aconchego.png';
const BG = { r: 0, g: 136, b: 113, alpha: 1 }; // #008871
const OUT = path.join(__dirname, '..', 'public');

function download(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirects <= 0) return reject(new Error('Too many redirects'));
        return resolve(download(res.headers.location, redirects - 1));
      }
      if (res.statusCode !== 200)
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
  });
}

async function squareIcon(logoBuffer, size, padding = 0.15) {
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await sharp(logoBuffer)
    .resize(inner, inner, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const left = Math.round((size - meta.width) / 2);
  const top = Math.round((size - meta.height) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  console.log('Downloading logo from', LOGO_URL);
  const logo = await download(LOGO_URL);
  console.log(`Logo downloaded (${logo.length} bytes)`);

  const [px192, px512, px180, px48, px32, px16] = await Promise.all([
    squareIcon(logo, 192),
    squareIcon(logo, 512),
    squareIcon(logo, 180),
    squareIcon(logo, 48),
    squareIcon(logo, 32),
    squareIcon(logo, 16),
  ]);

  fs.writeFileSync(path.join(OUT, 'logo192.png'), px192);
  console.log('✓ logo192.png');

  fs.writeFileSync(path.join(OUT, 'logo512.png'), px512);
  console.log('✓ logo512.png');

  fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), px180);
  console.log('✓ apple-touch-icon.png');

  const ico = await toIco([px16, px32, px48]);
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), ico);
  console.log('✓ favicon.ico (16/32/48 px)');

  console.log('\nAll icons generated. Run `npm start` to preview.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
