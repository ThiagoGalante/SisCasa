const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let version;
try {
  version = execSync('git rev-parse --short HEAD', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
} catch {
  version = Date.now().toString(36);
}

const swPath = path.join(__dirname, '..', 'public', 'service-worker.js');
const content = fs.readFileSync(swPath, 'utf8');
const updated = content.replace(
  /const CACHE_NAME = ['"][^'"]*['"]/,
  `const CACHE_NAME = 'siscasa-${version}'`
);
fs.writeFileSync(swPath, updated);
console.log(`[prebuild] cache version → siscasa-${version}`);
