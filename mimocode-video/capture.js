const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

process.env.TMPDIR = '/tmp';
process.env.TEMP = '/tmp';
process.env.TMP = '/tmp';

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const scenes = [
        { html: "scene_intro.html", duration: 6.31 },
        { html: "scene_1.html",     duration: 6.78 },
        { html: "scene_2.html",     duration: 7.38 },
        { html: "scene_3.html",     duration: 7.72 },
        { html: "scene_4.html",     duration: 7.29 },
        { html: "scene_5.html",     duration: 9.86 },
        { html: "scene_outro.html", duration: 4.94 },
    ];
    const fps = 15;
    const baseUrl = "http://localhost:8767/scenes/";
    const outDir = "/tmp/mimocode_frames";

    fs.mkdirSync(outDir, { recursive: true });
    let globalFrame = 0;

    for (let si = 0; si < scenes.length; si++) {
        const scene = scenes[si];
        const totalFrames = Math.round(scene.duration * fps);
        const url = baseUrl + scene.html;

        console.log(`Scene ${si}: ${scene.html} (${scene.duration}s, ${totalFrames} frames)`);

        const browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/usr/bin/chromium-browser',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            protocolTimeout: 300000
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1920 });

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(3000);

            await page.waitForFunction('window.__mode2Ready === true', { timeout: 10000 }).catch(() => {});

            for (let f = 0; f < totalFrames; f++) {
                const t = f / fps;
                await page.evaluate((time) => {
                    if (typeof window.seekTo === 'function') window.seekTo(time);
                }, t);
                await sleep(50);

                const framePath = path.join(outDir, `frame_${String(globalFrame).padStart(5, '0')}.jpg`);
                await page.screenshot({ path: framePath, type: 'jpeg', quality: 75 });
                globalFrame++;

                if (globalFrame % 45 === 0) console.log(`  Frame ${globalFrame}`);
            }
            console.log(`  Done: ${totalFrames} frames`);
        } catch (e) {
            console.error(`  Error: ${e.message}`);
        }
        await browser.close();
    }
    console.log(`\nTotal frames: ${globalFrame}`);
})();
