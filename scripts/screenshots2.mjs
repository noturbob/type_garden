import puppeteer from 'puppeteer';
import { setTimeout } from 'timers/promises';

const URL = 'http://127.0.0.1:5174/';
const OUT = 'docs/screenshots';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // ── Screenshot: Sakura palette ──
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await setTimeout(2000);

  // Click the "Color" button in the toolbar to open palette picker
  const colorBtns = await page.$$('button');
  for (const btn of colorBtns) {
    const text = await btn.evaluate(el => el.textContent?.trim());
    if (text === 'Color') {
      await btn.click();
      break;
    }
  }
  await setTimeout(500);

  // Find and click "Kyoto Sakura" palette swatch
  const allBtns = await page.$$('button');
  for (const btn of allBtns) {
    const text = await btn.evaluate(el => el.textContent?.trim());
    if (text && text.includes('Kyoto Sakura')) {
      await btn.click();
      break;
    }
  }
  await setTimeout(300);

  // Close the panel by clicking Color again
  for (const btn of await page.$$('button')) {
    const text = await btn.evaluate(el => el.textContent?.trim());
    if (text === 'Color') {
      await btn.click();
      break;
    }
  }
  await setTimeout(300);

  // Clear and type sakura
  await page.keyboard.press('Enter');
  await setTimeout(500);
  for (const ch of 'Sakura') {
    await page.keyboard.type(ch, { delay: 0 });
    await setTimeout(200);
  }
  await setTimeout(3500);
  await page.screenshot({ path: `${OUT}/sakura.png`, fullPage: false });
  console.log('✓ sakura.png');

  // ── Screenshot: Toolbar expanded (Flora panel open) ──
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await setTimeout(3000);

  // Click Flora to open the species panel
  for (const btn of await page.$$('button')) {
    const text = await btn.evaluate(el => el.textContent?.trim());
    if (text === 'Flora') {
      await btn.click();
      break;
    }
  }
  await setTimeout(500);
  await page.screenshot({ path: `${OUT}/toolbar_open.png`, fullPage: false });
  console.log('✓ toolbar_open.png');

  await browser.close();
  console.log('\nDone');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
