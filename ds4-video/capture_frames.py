#!/usr/bin/env python3
"""Capture frames for ds4 mode2 video using Puppeteer (WSL compatible)."""
import subprocess, os, json, tempfile

process.env_check = "TMPDIR"
# WSL TMPDIR fix
os.environ['TMPDIR'] = '/tmp'
os.environ['TEMP'] = '/tmp'
os.environ['TMP'] = '/tmp'

FRAME_DIR = "/tmp/ds4_frames"
os.makedirs(FRAME_DIR, exist_ok=True)

SCENES = [
    {"html": "scene_intro.html", "duration": 4.0},
    {"html": "scene_1.html",     "duration": 8.0},
    {"html": "scene_2.html",     "duration": 8.0},
    {"html": "scene_3.html",     "duration": 6.0},
    {"html": "scene_outro.html", "duration": 4.0},
]

FPS = 15
BASE_URL = "http://localhost:8766/scenes/"

# Write JS capture script
js_code = '''
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

process.env.TMPDIR = '/tmp';
process.env.TEMP = '/tmp';
process.env.TMP = '/tmp';

(async () => {
    const scenes = SCENES_PLACEHOLDER;
    const fps = FPS_PLACEHOLDER;
    const baseUrl = "BASE_URL_PLACEHOLDER";
    const outDir = "OUT_DIR_PLACEHOLDER";
    
    let globalFrame = 0;
    
    for (let si = 0; si < scenes.length; si++) {
        const scene = scenes[si];
        const totalFrames = Math.round(scene.duration * fps);
        const url = baseUrl + scene.html;
        
        console.log(`Scene ${si}: ${scene.html} (${scene.duration}s, ${totalFrames} frames)`);
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            protocolTimeout: 300000
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1920 });
        
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(3000);  // Wait for fonts/resources
            
            // Wait for ready signal
            await page.waitForFunction('window.__mode2Ready === true', { timeout: 10000 }).catch(() => {
                console.log('  Warning: __mode2Ready not set, proceeding anyway');
            });
            
            for (let f = 0; f < totalFrames; f++) {
                const t = f / fps;
                await page.evaluate((time) => {
                    if (typeof window.seekTo === 'function') {
                        window.seekTo(time);
                    }
                }, t);
                
                await page.waitForTimeout(50);  // Let render settle
                
                const framePath = path.join(outDir, `frame_${String(globalFrame).padStart(5, '0')}.jpg`);
                await page.screenshot({ path: framePath, type: 'jpeg', quality: 75 });
                globalFrame++;
            }
            console.log(`  Done: ${totalFrames} frames captured`);
        } catch (e) {
            console.error(`  Error in scene ${si}: ${e.message}`);
        }
        
        await browser.close();
    }
    
    console.log(`Total frames: ${globalFrame}`);
})();
'''

js_code = js_code.replace('SCENES_PLACEHOLDER', json.dumps(SCENES))
js_code = js_code.replace('FPS_PLACEHOLDER', str(FPS))
js_code = js_code.replace('BASE_URL_PLACEHOLDER', BASE_URL)
js_code = js_code.replace('OUT_DIR_PLACEHOLDER', FRAME_DIR)

js_path = "/home/chris47634/tmp_premium/ds4-video/capture.js"
with open(js_path, 'w') as f:
    f.write(js_code)

print(f"JS capture script written to {js_path}")
print(f"Frames will go to {FRAME_DIR}")
print(f"Total expected frames: {sum(round(s['duration'] * FPS) for s in SCENES)}")
