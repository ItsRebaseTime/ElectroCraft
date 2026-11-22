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

const sample = readFileSync(join(ROOT, 'src/assets/examples/sample-house.ec'), 'utf8');
const catalogue = readFileSync(join(ROOT, 'src/assets/examples/equipment-catalogue.ec'), 'utf8');
const usSample = readFileSync(join(ROOT, 'src/assets/examples/us-sample-house.ec'), 'utf8');
const moduleExample = readFileSync(join(ROOT, 'src/assets/examples/custom-module.ec'), 'utf8');
const sectionsExample = readFileSync(join(ROOT, 'src/assets/examples/multi-section-board.ec'), 'utf8');
const indicatorExample = readFileSync(join(ROOT, 'src/assets/examples/relay-indicator.ec'), 'utf8');
const floorExample = readFileSync(join(ROOT, 'src/assets/examples/apartment.ec'), 'utf8');
// a board of module-library units side by side on one rail (19 mm units butt against each other); [defId, width in mm, pole configuration]
const railBoard = (name, devs, rail = 18) => {
  let slot = 0.5;
  const items = devs.map(([defId, mm, poleConfig = '1P'], i) => {
    const it = { id: `b${i}`, defId, railId: 'r1', slot: Math.round(slot * 1e4) / 1e4, x: 0, y: 0, params: {}, poleConfig, description: '', manufacturer: '', model: '', on: true };
    slot += mm / 18;
    return it;
  });
  return JSON.stringify({ format: 'electrocraft', version: 1, name, author: '', revision: 'A', created: '2026-01-01T00:00:00.000Z', modified: '2026-01-01T00:00:00.000Z',
    settings: { markingStandard: 'iec81346', phaseColors: { L1: 'brown', L2: 'black', L3: 'grey' }, usPhaseColors: { L1: 'black', L2: 'red', L3: 'blue' } },
    panels: [{ id: 'p1', name, floor: 'Ground floor', room: 'Utility room', code: 'DB1', notes: '', rails: [{ id: 'r1', modules: rail }], items, wires: [] }], modules: [], floorPlans: [] });
};
const shellyBoard = railBoard('Shelly Pro board', [['shelly-pro-1-v1', 19], ['shelly-pro-1pm-v1', 19], ['shelly-pro-2-v1', 19], ['mod-w4z1om1', 19], ['shelly-pro-dimmer-1pm', 19], ['shelly-pro-dimmer-0-1-10v-pm', 19], ['shelly-pro-3em-v2', 19], ['shelly-pro-3', 53], ['shelly-pro-4pm-v2', 53], ['shelly-pro-3cb', 72, '3P+N']]);
const schneiderBoard = railBoard('Schneider board', [
  ['schneider-easy9-switch', 36, '2P'], ['schneider-easy9-rccb', 36, '2P'], ['schneider-easy9-spd', 36, '1P+N'], ['schneider-easy9-mcb', 18, '1P'], ['schneider-easy9-mcb', 54, '3P'], ['schneider-easy9-rcbo', 18, '1P+N'],
  ['schneider-resi9-switch', 36, '2P'], ['schneider-resi9-rccb', 36, '2P'], ['schneider-resi9-mcb', 18, '1P'], ['schneider-resi9-rcbo', 18, '1P+N'],
  ['schneider-ict-a9c20732', 18], ['schneider-ict-a9c20863', 54], ['schneider-itl-a9c30811', 18], ['schneider-iem2100', 36], ['schneider-resi9-se1100l', 18]], 26);
const waveshareBoard = railBoard('Waveshare board', [['waveshare-esp32-s3-relay-1ch', 23.3], ['waveshare-esp32-s3-can-2ch', 23.3], ['waveshare-esp32-s3-rs485-can', 23.3], ['waveshare-esp32-s3-relay-6ch', 122]], 12);
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
  // the catalogue has one panel per manufacturer (and a generic one for the basic devices)
  await open(catalogue, '#panel=3&z=1.2&x=40&y=120');
  await shot('catalogue-shelly');
  await open(catalogue, '#select=item:23&z=3&x=-250&y=-1350');
  await shot('comb-bridges');
  // Shelly Pro units from the module library: 19 mm and 53 mm wide, listed under their manufacturer
  await open(shellyBoard, '#z=3.3&x=-90&y=170');
  await driver.executeScript("const h = Array.from(document.querySelectorAll('.palette-list .group-head')).find((b) => b.textContent.trim() === 'Shelly'); if (h) h.scrollIntoView({ block: 'start' });");
  await sleep(400);
  await shot('shelly-modules');
  // Waveshare industrial controllers
  await open(waveshareBoard, '#z=3&x=-40&y=150');
  await driver.executeScript("const h = Array.from(document.querySelectorAll('.palette-list .group-head')).find((b) => b.textContent.trim() === 'Waveshare'); if (h) h.scrollIntoView({ block: 'start' });");
  await sleep(400);
  await shot('waveshare-modules');
  // Schneider Electric Easy9, Resi9 and Acti9 control devices
  await open(schneiderBoard, '#z=2.6&x=-80&y=170');
  await driver.executeScript("const h = Array.from(document.querySelectorAll('.palette-list .group-head')).find((b) => b.textContent.trim() === 'Schneider'); if (h) h.scrollIntoView({ block: 'start' });");
  await sleep(400);
  await shot('schneider-modules');
  // a three phase comb bar across neighbouring breakers
  await open(sample, '#z=3&x=351&y=-737');
  const mcbIds = await driver.executeScript("const st = JSON.parse(localStorage.getItem('electrocraft.autosave')); const p = st.panels[0]; const r = p.items.find((i) => i.defId === 'mcb').railId; return p.items.filter((i) => i.defId === 'mcb' && i.railId === r).map((i) => i.id);");
  const press = (id, shift) => driver.executeScript(`const el = document.querySelector('.canvas g[data-hit="i:${id}"]'); const r = el.getBoundingClientRect(); const init = { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 7, button: 0, shiftKey: ${shift}, pointerType: 'mouse' }; el.dispatchEvent(new PointerEvent('pointerdown', init)); el.dispatchEvent(new PointerEvent('pointerup', init));`);
  await press(mcbIds[0], false);
  for (const id of mcbIds.slice(1)) await press(id, true);
  await sleep(400);
  const part = (name) => By.xpath(`//div[contains(@class,'palette-list')]//div[contains(concat(' ',normalize-space(@class),' '),' entry ')][.//span[contains(@class,'entry-name')][text()='${name}']]`);
  await driver.findElement(part('Comb bar 3P')).click();
  await sleep(600);
  await shot('comb-bar');
  // a row connector between the residual current device and the breakers below it
  await open(sample, '#z=2.6&x=339&y=-428');
  const rcdId = await driver.executeScript("const st = JSON.parse(localStorage.getItem('electrocraft.autosave')); return st.panels[0].items.find((i) => i.defId === 'rcd').id;");
  await press(rcdId, false);
  await sleep(400);
  await driver.findElement(part('Row connector 3P')).click();
  await sleep(400);
  // the RCD has a neutral pole in column 2 and the breaker below a line pole: leave the neutral out
  await driver.findElement(By.xpath("//label[contains(., 'Neutral poles are joined too')]//input")).click();
  await sleep(600);
  await shot('row-connector');
  // the Connectors group of the equipment list and the designer for a variation of a part
  await driver.executeScript("const l = document.querySelector('.palette-list'); l.scrollTop = l.scrollHeight;");
  await sleep(300);
  await shot('connectors');
  await driver.findElement(By.css('button[aria-label="Clone Comb bar 3P"]')).click();
  await driver.wait(until.elementLocated(By.css('.connector-editor')), 3000);
  await sleep(300);
  await shot('connector-designer');
  await driver.findElement(By.xpath("//div[contains(@class,'connector-editor')]//button[text()='Cancel']")).click();
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
  // a shape (the wet area of the bathroom): selected, with its handles and properties
  await driver.actions().sendKeys('\uE00C').perform();
  await sleep(300);
  await driver.executeScript(`
    const el = document.querySelector('svg.floor-canvas g[data-hit^="sh:"] rect');
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + 3;
    const fire = (type) => (document.elementFromPoint(x, y) || el).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 93, pointerType: 'mouse', clientX: x, clientY: y }));
    fire('pointerdown'); fire('pointerup');`);
  await sleep(500);
  await shot('floor-shapes');
  // the picture faded: the outlets and cables stand out
  await driver.actions().sendKeys('\uE00C').perform();
  await driver.findElement(By.xpath("//button[@aria-label='Floor plan picture: shown']")).click();
  await sleep(500);
  await shot('floor-picture');
  await driver.findElement(By.xpath("//button[@aria-label='Floor plan picture: faded']")).click();
  await driver.findElement(By.xpath("//button[@aria-label='Floor plan picture: hidden']")).click();
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
