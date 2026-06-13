const puppeteer = require('puppeteer-core');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SCENES = [
  {name:'scene_intro.html', dur:4.0},
  {name:'scene_1.html', dur:5.59},
  {name:'scene_2.html', dur:7.02},
  {name:'scene_3.html', dur:5.06},
  {name:'scene_4.html', dur:5.15},
  {name:'scene_5.html', dur:3.62},
  {name:'scene_6.html', dur:5.39},
  {name:'scene_outro.html', dur:3.0}
];
const FPS = 15;
const OUT_DIR = '/tmp/cosmos_frames';
(async () => {
  const browser = await puppeteer.launch({executablePath:'/usr/bin/chromium-browser', headless:'new', args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
  let fi = 0;
  for (let si = 0; si < SCENES.length; si++) {
    const s = SCENES[si];
    const page = await browser.newPage();
    await page.setViewport({width:1080, height:1920});
    await page.goto(`http://localhost:8778/scenes/${s.name}`, {waitUntil:'domcontentloaded', timeout:15000});
    await sleep(2000);
    await page.waitForFunction('window.__mode2Ready === true', {timeout:10000});
    const frames = Math.round(s.dur * FPS);
    console.log(`Scene ${si}: ${s.name} (${s.dur}s, ${frames}f)`);
    for (let f = 0; f < frames; f++) {
      await page.evaluate(t => window.seekTo(t), f / FPS);
      await sleep(30);
      await page.screenshot({path: path.join(OUT_DIR, `frame_${String(fi).padStart(5,'0')}.jpg`), type:'jpeg', quality:90});
      fi++;
    }
    console.log(`  Done`);
    await page.close();
  }
  await browser.close();
  console.log(`Total: ${fi}`);
})();
