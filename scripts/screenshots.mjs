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

  // ── Screenshot 1: Default "Type Garden" hero ──
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await setTimeout(3500); // let animations bloom
  await page.screenshot({ path: `${OUT}/hero.png`, fullPage: false });
  console.log('✓ hero.png');

  // ── Screenshot 2: Type "bloom" with Rose Noir palette ──
  // Press Enter to clear, then type "bloom"
  await page.keyboard.press('Enter');
  await setTimeout(400);
  for (const ch of 'bloom') {
    await page.keyboard.press(ch === 'b' ? 'KeyB' : ch === 'l' ? 'KeyL' : ch === 'o' ? 'KeyO' : 'KeyM');
    await setTimeout(180);
  }
  await setTimeout(3000);
  await page.screenshot({ path: `${OUT}/bloom.png`, fullPage: false });
  console.log('✓ bloom.png');

  // ── Screenshot 3: Switch to Sakura palette (index 2) ──
  // Click palette button in toolbar, then select Kyoto Sakura
  await page.keyboard.press('Enter');
  await setTimeout(400);

  // Click the palette icon button (2nd toolbar section)
  const paletteBtn = await page.$('button[title="Palettes"]');
  if (paletteBtn) {
    await paletteBtn.click();
    await setTimeout(300);
    // Find and click "Kyoto Sakura" palette option
    const options = await page.$$('.palette-option, [data-palette]');
    for (const opt of options) {
      const text = await opt.evaluate(el => el.textContent);
      if (text && text.includes('Kyoto Sakura')) {
        await opt.click();
        break;
      }
    }
    await setTimeout(200);
    // Close panel by clicking palette button again
    await paletteBtn.click();
    await setTimeout(200);
  }

  for (const ch of 'Sakura') {
    await page.keyboard.type(ch, { delay: 0 });
    await setTimeout(180);
  }
  await setTimeout(3000);
  await page.screenshot({ path: `${OUT}/sakura.png`, fullPage: false });
  console.log('✓ sakura.png');

  // ── Screenshot 4: Multi-line wrapping ──
  await page.keyboard.press('Enter');
  await setTimeout(400);

  const sentence = 'every word blooms';
  for (const ch of sentence) {
    await page.keyboard.type(ch, { delay: 0 });
    await setTimeout(100);
  }
  await setTimeout(3500);
  await page.screenshot({ path: `${OUT}/multiline.png`, fullPage: false });
  console.log('✓ multiline.png');

  // ── Screenshot 5: Toolbar visible ──
  // Hover over toolbar area to make it fully visible
  await page.mouse.move(720, 870);
  await setTimeout(500);
  await page.screenshot({ path: `${OUT}/toolbar.png`, fullPage: false });
  console.log('✓ toolbar.png');

  await browser.close();
  console.log('\nAll screenshots saved to docs/screenshots/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
