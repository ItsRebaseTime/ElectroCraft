// Regenerates the README screenshots in docs/images (light theme, Firefox headless).
// Run `npm run build && npx vite preview --port 4173` first, then `node e2e/screenshots.mjs`.
// Needs: npm i --no-save selenium-webdriver, Firefox, and (for the PDF image) poppler's pdftoppm.
import { Builder, By, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/images');
const BASE = process.env.APP_URL ?? 'http://localhost:4173/';
const DL = join(tmpdir(), 'electrocraft-shots');
rmSync(DL, { recursive: true, force: true });
mkdirSync(DL, { recursive: true });
mkdirSync(OUT, { recursive: true });

const sample = readFileSync(join(ROOT, 'docs/examples/sample-house.ec'), 'utf8');
const catalogue = readFileSync(join(ROOT, 'docs/examples/equipment-catalogue.ec'), 'utf8');
const usSample = readFileSync(join(ROOT, 'docs/examples/us-sample-house.ec'), 'utf8');
const moduleExample = readFileSync(join(ROOT, 'docs/examples/custom-module.ec'), 'utf8');
const sectionsExample = readFileSync(join(ROOT, 'docs/examples/multi-section-board.ec'), 'utf8');
const indicatorExample = readFileSync(join(ROOT, 'docs/examples/relay-indicator.ec'), 'utf8');
const floorExample = readFileSync(join(ROOT, 'docs/examples/apartment.ec'), 'utf8');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

const opts = new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 1000 });
opts.setPreference('layout.css.prefers-color-scheme.content-override', 1); // light
opts.setPreference('browser.download.folderList', 2);
opts.setPreference('browser.download.dir', DL);
opts.setPreference('browser.helperApps.neverAsk.saveToDisk', 'application/pdf');
opts.setPreference('pdfjs.disabled', true);
const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(opts).build();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(project, hash) {
  await driver.get(BASE);
  await driver.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', project);
  await driver.get(BASE + hash);
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await sleep(1500);
}
const shot = async (name) => {
  writeFileSync(join(OUT, `${name}.png`), await driver.takeScreenshot(), 'base64');
  console.log('wrote', name);
};

try {
  await open(sample, '#select=item:5&z=1.25&x=300&y=20');
  await shot('overview');
  await open(sample, '#sim&z=2.1&x=150&y=-560');
  await shot('simulation');
  await open(sample, '#sim&panel=2&z=1.0&x=360&y=300');
  await shot('three-phase');
  await open(sample, '#select=wire:6&z=2&x=195&y=228');
  await shot('wire-editing');
  await open(catalogue, '#z=2.3&x=-40&y=190');
  await shot('equipment');
  await open(catalogue, '#select=item:23&z=3&x=-250&y=-1350');
  await shot('comb-bridges');
  await open(usSample, '#sim&z=1.5&x=318&y=-47');
  await shot('us-panel');
  await open(moduleExample, '#z=2&x=170&y=40');
  await driver.findElement(By.css('button[aria-label^="Edit Fused"]')).click();
  await driver.wait(until.elementLocated(By.css('.module-editor')), 5000);
  await sleep(500);
  await shot('module-designer');
  // sections side by side, with N / PE bars along their top and bottom edges
  await open(sectionsExample, '#sim');
  await driver.executeScript("document.querySelectorAll('*').forEach((e) => { if (e.scrollHeight > e.clientHeight + 40 && /props|side|right/.test(String(e.className))) e.scrollTop = 0; })");
  await shot('sections');
  // a module with an indicator light, and the per-device input mode
  await open(indicatorExample, '#sim&select=item:3');
  await shot('module-instance');
  await driver.findElement(By.css('button[aria-label^="Edit Control relay"]')).click();
  await driver.wait(until.elementLocated(By.css('.module-editor')), 5000);
  await sleep(500);
  await driver.findElement(By.xpath("//div[contains(@class,'shape-row')][contains(., 'Coil lamp')]")).click();
  await sleep(500);
  await shot('indicator-light');
  // floor plan: the whole house, a selected circuit, and the panel planner it feeds
  await driver.get(BASE);
  await driver.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', floorExample);
  await driver.get(BASE + '#floor');
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('svg.floor-canvas image')), 15000);
  await sleep(1200);
  await shot('floor-plan');
  await driver.findElement(By.xpath("//button[contains(@class,'sum-link')][contains(., 'Sockets kitchen')]")).click();
  await sleep(600);
  await shot('floor-circuit');
  // several outlets selected with a Ctrl+drag box (copy them with Ctrl+C, paste them with Ctrl+V)
  await driver.actions().sendKeys('\uE00C').perform();
  await sleep(300);
  await driver.executeScript(`
    const svg = document.querySelector('svg.floor-canvas'); const r = svg.getBoundingClientRect();
    const m = /translate\\(([-\\d.e]+) ([-\\d.e]+)\\) scale\\(([-\\d.e]+)\\)/.exec(svg.querySelector(':scope > g').getAttribute('transform'));
    const at = (x, y) => [r.left + Number(m[1]) + x * Number(m[3]), r.top + Number(m[2]) + y * Number(m[3])];
    const [x1, y1] = at(60, 150); const [x2, y2] = at(425, 405);
    const fire = (type, x, y, el) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, ctrlKey: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 91, pointerType: 'mouse', clientX: x, clientY: y }));
    fire('pointerdown', x1, y1, document.elementFromPoint(x1, y1) || svg); fire('pointermove', (x1 + x2) / 2, (y1 + y2) / 2, svg); fire('pointermove', x2, y2, svg); fire('pointerup', x2, y2, svg);`);
  await sleep(500);
  await shot('floor-selection');
  // an appliance with two phases (the hob)
  await driver.actions().sendKeys('\uE00C').perform();
  await sleep(300);
  const hob = await driver.findElement(By.xpath("//*[local-name()='g'][starts-with(@data-hit,'p:')][.//*[local-name()='text' and contains(., 'HOB')]]"));
  await driver.actions({ async: true }).move({ origin: hob }).click().perform();
  await sleep(500);
  await shot('floor-phases');
  // speakers end at the audio receiver
  await driver.actions().sendKeys('\uE00C').perform(); // Escape: back to the properties of the plan
  await sleep(300);
  await driver.findElement(By.xpath("//button[contains(@class,'sum-link')][contains(., 'Living room speakers')]")).click();
  await sleep(500);
  await shot('floor-audio');
  // visibility of everything on the plan, from the View menu
  await driver.actions().sendKeys('\uE00C').perform();
  await driver.findElement(By.xpath("//button[contains(., 'View')]")).click();
  await sleep(500);
  await shot('floor-visibility');
  await driver.findElement(By.css('body')).click();
  // layers: the ceiling in focus, floor and walls faded
  await driver.findElement(By.xpath("//button[@aria-label='Fade Walls']")).click();
  await driver.findElement(By.xpath("//button[@aria-label='Fade Floor']")).click();
  await driver.actions().sendKeys('\uE00C').perform(); // Escape: nothing selected
  await sleep(500);
  await shot('floor-layers');
  await open(floorExample, '');
  await sleep(300);
  await shot('floor-panel-planner');
  await open(floorExample, '#panel=2&select=item:1');
  await sleep(300);
  await shot('patch-panel');

  // the device designer (starts as a copy of the MCB)
  await open(sample, '');
  await driver.findElement(By.xpath("//button[contains(., 'Modules')]")).click();
  await driver.findElement(By.xpath("//button[contains(., 'Design a new device')]")).click();
  await driver.wait(until.elementLocated(By.css('svg.dev-preview')), 5000);
  await sleep(600);
  await shot('device-designer');
  await open(sample, '#export');
  await sleep(500);
  await shot('export-dialog');

  // a page of the exported PDF
  await driver.findElement(By.xpath("//label[contains(., 'This panel')] | //button[contains(., 'This panel')]")).click();
  await driver.findElement(By.css('.modal-actions .primary')).click();
  await driver.wait(async () => readdirSync(DL).some((f) => f.endsWith('.pdf')), 30000);
  await sleep(500);
  const pdf = readdirSync(DL).find((f) => f.endsWith('.pdf'));
  execFileSync('pdftoppm', ['-r', '90', '-f', '1', '-l', '1', '-png', join(DL, pdf), join(DL, 'page')]);
  const png = readdirSync(DL).find((f) => f.startsWith('page') && f.endsWith('.png'));
  writeFileSync(join(OUT, 'pdf-export.png'), readFileSync(join(DL, png)));
  console.log('wrote pdf-export');
} finally {
  await driver.quit();
}

// phone layout (user agent selects it)
{
  const o = new firefox.Options().addArguments('-headless').windowSize({ width: 390, height: 844 });
  o.setPreference('layout.css.prefers-color-scheme.content-override', 1);
  o.setPreference('general.useragent.override', IPHONE);
  const phone = await new Builder().forBrowser('firefox').setFirefoxOptions(o).build();
  try {
    await phone.get(BASE);
    await phone.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', sample);
    await phone.get(BASE + '#sim&select=item:5&z=1.1&x=120&y=-10');
    await phone.navigate().refresh();
    await phone.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
    await sleep(1500);
    writeFileSync(join(OUT, 'mobile.png'), await phone.takeScreenshot(), 'base64');
    await phone.findElement(By.css('.selbar button')).click();
    await sleep(600);
    writeFileSync(join(OUT, 'mobile-properties.png'), await phone.takeScreenshot(), 'base64');
    console.log('wrote mobile');
    await phone.get(BASE);
    await phone.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', sectionsExample);
    await phone.get(BASE + '#z=0.5&x=20&y=300');
    await phone.navigate().refresh();
    await phone.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"], .m-canvas g[data-hit^="i:"]')), 15000);
    await sleep(1200);
    await phone.findElement(By.xpath("//nav[contains(@class,'m-nav')]//button[contains(., 'Edit')]")).click();
    await sleep(600);
    await phone.executeScript("document.querySelectorAll('.sheet *').forEach((e) => { if (e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY != 'visible') e.scrollTop = 300; })");
    await sleep(300);
    writeFileSync(join(OUT, 'mobile-sections.png'), await phone.takeScreenshot(), 'base64');
    console.log('wrote mobile-sections');
    await phone.get(BASE);
    await phone.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', floorExample);
    await phone.get(BASE + '#floor');
    await phone.navigate().refresh();
    await phone.wait(until.elementLocated(By.css('svg.floor-canvas image')), 15000);
    await sleep(1200);
    writeFileSync(join(OUT, 'mobile-floor.png'), await phone.takeScreenshot(), 'base64');
    console.log('wrote mobile-floor');
  } finally {
    await phone.quit();
  }
}
