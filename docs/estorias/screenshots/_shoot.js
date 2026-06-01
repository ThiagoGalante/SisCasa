/* Captura screenshots REAIS do app rodando (CRA :3000 + API :5000 + Supabase local).
   Usa puppeteer-core com o Chrome do sistema. */
const puppeteer = require('puppeteer-core');
const path = require('path');

const OUT = __dirname;
const BASE = 'http://localhost:3000';
const EMAIL = 'admin@siscasa.local';
const SENHA = 'admin123';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1280,1000'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [browser error]', m.text()); });

  try {
    // 1. Login
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('#email', { timeout: 20000 });
    await page.type('#email', EMAIL);
    await page.type('#password', SENHA);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
    ]);
    await sleep(2500);
    console.log('login OK, url =', page.url());
    await page.screenshot({ path: path.join(OUT, 'real-01-home.png'), fullPage: true });

    // 2. Serviços de Apoio (lista)
    await page.goto(`${BASE}/servicos-de-apoio`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT, 'real-02-servicos-lista.png'), fullPage: true });

    // 3. Serviços de Apoio (novo atendimento)
    await page.goto(`${BASE}/servicos-de-apoio/cadastro`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT, 'real-03-servicos-form.png'), fullPage: true });

    // 4. Beneficiários (cadastro com campos novos do PO)
    await page.goto(`${BASE}/beneficiarios/cadastro`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT, 'real-04-beneficiario-form.png'), fullPage: true });

    console.log('screenshots gerados com sucesso');
  } catch (err) {
    console.error('FALHA:', err.message);
    await page.screenshot({ path: path.join(OUT, 'real-erro.png'), fullPage: true }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
