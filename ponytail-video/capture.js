const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
process.env.TMPDIR = '/tmp';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const scenes = [
        { html: "scene_intro.html", duration: 4.05 },
        { html: "scene_1.html",     duration: 4.04 },
        { html: "scene_2.html",     duration: 5.37 },
        { html: "scene_3.html",     duration: 4.37 },
        { html: "scene_4.html",     duration: 6.42 },
        { html: "scene_5.html",     duration: 5.22 },
        { html: "scene_outro.html", duration: 5.19 },
    ];
    const fps = 15;
    const baseUrl = "http://localhost:8769/scenes/";
    const outDir = "/tmp/ponytail_frames";
    fs.mkdirSync(outDir, { recursive: true });
    let gf = 0;

    for (let si = 0; si < scenes.length; si++) {
        const s = scenes[si];
        const n = Math.round(s.duration * fps);
        console.log(`Scene ${si}: ${s.html} (${s.duration}s, ${n} frames)`);
        const browser = await puppeteer.launch({
            headless: 'new', executablePath: '/usr/bin/chromium-browser',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            protocolTimeout: 300000
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1920 });
        try {
            await page.goto(baseUrl + s.html, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(3000);
            await page.waitForFunction('window.__mode2Ready === true', { timeout: 10000 }).catch(() => {});
            for (let f = 0; f < n; f++) {
                await page.evaluate((t) => { if (typeof window.seekTo === 'function') window.seekTo(t); }, f / fps);
                await sleep(50);
                await page.screenshot({ path: path.join(outDir, `frame_${String(gf).padStart(5,'0')}.jpg`), type: 'jpeg', quality: 75 });
                gf++;
                if (gf % 45 === 0) console.log(`  Frame ${gf}`);
            }
            console.log(`  Done: ${n} frames`);
        } catch (e) { console.error(`  Error: ${e.message}`); }
        await browser.close();
    }
    console.log(`\nTotal: ${gf}`);
})();
