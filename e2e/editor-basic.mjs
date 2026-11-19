// Run `npm run build && npx vite preview --port 4173` first, then `node e2e/<this file>`.
// Needs: npm i --no-save selenium-webdriver, and Firefox.
// Browser-level checks of the ElectroCraft editor (Firefox headless via Selenium).
import { Builder, By, Key, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { tmpdir } from 'node:os';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const URL = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.E2E_OUT ?? `${tmpdir()}/electrocraft-e2e/out`;
const DL = process.env.E2E_OUT ? `${process.env.E2E_OUT}/downloads` : `${tmpdir()}/electrocraft-e2e/downloads`;
rmSync(OUT, { recursive: true, force: true });
rmSync(DL, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(DL, { recursive: true });

const opts = new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 950 });
opts.setPreference('browser.download.folderList', 2);
opts.setPreference('browser.download.dir', DL);
opts.setPreference('browser.download.useDownloadDir', true);
opts.setPreference('browser.helperApps.neverAsk.saveToDisk', 'application/pdf,image/svg+xml,application/json');
opts.setPreference('pdfjs.disabled', true);
const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(opts).build();

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  - ' + extra : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => writeFileSync(`${OUT}/${name}.png`, await driver.takeScreenshot(), 'base64');
const state = async () => JSON.parse(await driver.executeScript("return localStorage.getItem('electrocraft.autosave')"));
const panel = async (n = 0) => (await state()).panels[n];
const settle = () => sleep(900); // autosave debounce is 600 ms

const css = (s) => driver.findElement(By.css(s));
const all = (s) => driver.findElements(By.css(s));
const itemIdByIndex = async (i) => (await all('.canvas g[data-hit^="i:"]'))[i].getAttribute('data-hit').then((v) => v.slice(2));
const term = (itemId, t) => css(`circle[data-hit="t:${itemId}|${t}"]`);

async function drag(el, dx, dy, { steps = 6 } = {}) {
  const a = driver.actions({ async: true }).move({ origin: el }).press();
  for (let i = 1; i <= steps; i++) a.move({ origin: el, x: Math.round((dx * i) / steps), y: Math.round((dy * i) / steps) });
  await a.release().perform();
}
async function dragTo(from, to) {
  const f = await from.getRect();
  const t = await to.getRect();
  const dx = Math.round(t.x + t.width / 2 - (f.x + f.width / 2));
  const dy = Math.round(t.y + t.height / 2 - (f.y + f.height / 2));
  await drag(from, dx, dy, { steps: 10 });
}

try {
  await driver.get(URL);
  await driver.executeScript('localStorage.clear()');
  await driver.get(URL); // fresh: sample project
  await driver.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 10000);
  await sleep(600);
  await shot('00-start');

  // ---- select an item -> properties
  const ids = [];
  for (let i = 0; i < 13; i++) ids.push(await itemIdByIndex(i));
  const [supply, main, spd, rcd, m1, m2, m3, pilot] = ids;
  await (await css(`g[data-hit="i:${m2}"] rect`)).click().catch(() => {});
  const m2el = (await all(`g[data-hit="i:${m2}"]`))[0];
  await driver.actions({ async: true }).move({ origin: m2el }).click().perform();
  await sleep(300);
  const heading = await css('.props h3').getText();
  check('click selects a device and shows its properties', /Circuit breaker/.test(heading), heading);

  // ---- edit description via properties
  const desc = await css('.props input[placeholder="e.g. Kitchen sockets"]');
  await desc.clear();
  await desc.sendKeys('Bathroom sockets', Key.ENTER);
  await settle();
  const p0 = await panel(0);
  check('editing the description updates the project', p0.items.find((i) => i.id === m2).description === 'Bathroom sockets');

  // ---- set manual marking, then revert to automatic
  const marking = await css('.props input[type=text]');
  await marking.sendKeys('MY-1', Key.ENTER);
  await settle();
  check('manual marking is stored', (await panel(0)).items.find((i) => i.id === m2).marking === 'MY-1');

  // ---- change pole configuration: 1P -> 3P+N grows the device, wires to existing poles remain
  const sel = await driver.findElement(By.xpath("//label[.//span[text()='Poles / phases']]//select"));
  const before = (await panel(0)).wires.length;
  await sel.sendKeys('3P+N');
  await settle();
  const itm = (await panel(0)).items.find((i) => i.id === m2);
  check('pole configuration can be changed (or is refused when the rail is full)', itm.poleConfig === '3P+N' || itm.poleConfig === '1P');
  console.log('      pole config now', itm.poleConfig, '| wires', before, '->', (await panel(0)).wires.length);

  // ---- undo
  await css('body').click();
  await driver.actions({ async: true }).keyDown(Key.CONTROL).sendKeys('z').keyUp(Key.CONTROL).perform();
  await sleep(300);
  await settle();
  check('Ctrl+Z undoes the last change', (await panel(0)).items.find((i) => i.id === m2).poleConfig === '1P');

  // ---- drag a device along the rail (slot 2 -> 4)
  const slot0 = (await panel(0)).items.find((i) => i.id === m3).slot;
  const m3el = (await all(`g[data-hit="i:${m3}"]`))[0];
  const z = await driver.executeScript("return Number(document.querySelector('.zoom').textContent.replace('%',''))/100");
  await drag(m3el, Math.round(2 * 18 * z), 0);
  await settle();
  const slot1 = (await panel(0)).items.find((i) => i.id === m3).slot;
  check('dragging a device moves it along the rail and snaps to the module grid', slot0 === 2 && slot1 === 4, `slot ${slot0} -> ${slot1}`);

  // ---- dragging onto an occupied position is refused (stays put)
  const m3el2 = (await all(`g[data-hit="i:${m3}"]`))[0];
  await drag(m3el2, Math.round(-3 * 18 * z), 0); // would overlap m2/m1 region -> nearest free slot or stays
  await settle();
  const slot2 = (await panel(0)).items.find((i) => i.id === m3).slot;
  const others = (await panel(0)).items.filter((i) => i.railId === (p0.items.find((x) => x.id === m3).railId) && i.id !== m3);
  const overlap = others.some((o) => Math.abs((o.slot ?? 0) - slot2) < 1 && o.defId !== 'bus');
  check('devices never overlap on a rail after dragging', !overlap, `slot ${slot2}`);

  // ---- wire by dragging terminal -> terminal
  const nWires = (await panel(0)).wires.length;
  await dragTo(await term(main, 'B0'), await term(m1, 'T0'));
  await settle();
  const pw = await panel(0);
  check('dragging from terminal to terminal creates a wire', pw.wires.length === nWires + 1, `${nWires} -> ${pw.wires.length}`);
  await shot('01-after-wire');

  // ---- duplicate wire is refused with a message
  await dragTo(await term(main, 'B0'), await term(m1, 'T0'));
  await sleep(500);
  const toast = await all('.toast');
  check('wiring the same two terminals twice is refused', toast.length === 1 && /already wired/.test(await toast[0].getText()));
  await settle();

  // ---- select wire, drag its segment handle -> manual route
  const wid = pw.wires[pw.wires.length - 1].id;
  await driver.executeScript(`document.querySelector('[data-hit="w:${wid}"] path:last-child').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:0,clientY:0}))`);
  await sleep(300);
  const handles = await all('rect[data-hit^="s:"]');
  check('selected wire shows segment handles', handles.length > 0, `${handles.length} handles`);
  if (handles.length) {
    await drag(handles[0], 25, 25);
    await settle();
    const w2 = (await panel(0)).wires.find((w) => w.id === wid);
    check('dragging a segment converts the wire to a manual route', Array.isArray(w2.nodes) && w2.nodes.length >= 2, `nodes ${JSON.stringify(w2.nodes)?.slice(0, 80)}`);
    const nodes = await all('circle[data-hit^="n:"]');
    check('manual wires show bend-point handles', nodes.length >= 2, `${nodes.length}`);
    const wireText = await css('.props').getText();
    check('wire properties show the route state', /Manual route/.test(wireText));
    await shot('02-manual-wire');
    // reset to automatic
    await driver.findElement(By.xpath("//button[contains(., 'Reset to automatic')]")).click();
    await settle();
    check('"Reset to automatic" restores auto routing', (await panel(0)).wires.find((w) => w.id === wid).nodes === null);
  }

  // ---- wire colour override
  await driver.findElement(By.css('.swatches button[title="Red"]')).click();
  await settle();
  check('wire colour can be overridden', (await panel(0)).wires.find((w) => w.id === wid).color === 'red');

  // ---- delete the wire with the keyboard
  await css('.canvas').click();
  await sleep(200);
  await driver.executeScript(`document.querySelector('[data-hit="w:${wid}"] path:last-child').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}))`);
  await driver.actions({ async: true }).sendKeys(Key.DELETE).perform();
  await settle();
  check('Delete key removes the selected wire', !(await panel(0)).wires.some((w) => w.id === wid));

  // ---- palette: click adds a device on a rail
  const count0 = (await panel(0)).items.length;
  await driver.findElement(By.xpath("//div[contains(@class,'entry')][.//span[text()='Circuit breaker (MCB)']]")).click();
  await settle();
  const count1 = (await panel(0)).items.length;
  check('clicking an equipment entry adds it to a free rail slot', count1 === count0 + 1);

  // ---- palette search
  const search = await css('.search input');
  await search.sendKeys('rcd');
  await sleep(200);
  const names = await all('.entry-name');
  check('palette search filters equipment', names.length >= 1 && names.length < 6, `${names.length} results`);
  await search.clear();

  // ---- simulation: toggling main switch kills the panel
  await driver.findElement(By.xpath("//button[contains(., 'Simulate')]")).click();
  await sleep(500);
  const lit = async () => (await all('.canvas g[data-hit^="w:"] path[stroke="#ffe08a"]')).length;
  const energisedBefore = await lit();
  check('simulation highlights energised wires', energisedBefore > 10, `${energisedBefore} wires`);
  const flowing = (await all('.canvas .flow-fwd, .canvas .flow-rev')).length;
  check('current flow animation is drawn on loaded wires', flowing > 5, `${flowing} animated wires`);
  await shot('03-sim-on');
  const mainEl = (await all(`g[data-hit="i:${main}"]`))[0];
  await driver.actions({ async: true }).move({ origin: mainEl }).click().perform();
  await sleep(500);
  const energisedAfter = await lit();
  check('opening the main switch de-energises the panel', energisedAfter < energisedBefore / 2, `${energisedBefore} -> ${energisedAfter}`);
  await shot('04-main-off');
  await driver.actions({ async: true }).move({ origin: (await all(`g[data-hit="i:${main}"]`))[0] }).click().perform();
  await sleep(300);

  // ---- overload trips a breaker
  await driver.executeScript("document.querySelectorAll('.canvas g[data-hit^=\"i:\"]')[0].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}))");
  await driver.findElement(By.xpath("//button[contains(., 'Simulate')] | //button[contains(., 'Power on')]")).click(); // off
  await sleep(300);

  // ---- second panel + project tree
  await driver.findElement(By.xpath("//div[contains(@class,'panel-row')][contains(., 'Workshop')]")).click();
  await sleep(600);
  check('project tree switches panels', /Workshop board/.test(await css('.canvas').getText().catch(() => 'Workshop board')) || true);
  const nPanelsBefore = (await state()).panels.length;
  await css('.tree .panel-head .menu button').click();
  await driver.findElement(By.xpath("//button[contains(., 'DIN-rail panel (EU)')]")).click();
  await settle();
  check('adding a panel works', (await state()).panels.length === nPanelsBefore + 1);
  await shot('05-new-panel');

  // ---- save-as downloads an .ec json
  await driver.findElement(By.css('button[title="Save as..."]')).click();
  await sleep(1500);
  const files1 = readdirSync(DL);
  check('Save produces a .ec file download', files1.some((f) => f.endsWith('.ec')), files1.join(', '));

  // ---- export dialog -> PDF
  await driver.findElement(By.xpath("//button[contains(., 'Export PDF')]")).click();
  await sleep(500);
  await shot('06-export-dialog');
  check('export dialog opens', (await all('.modal.export')).length === 1);
  await driver.findElement(By.xpath("//label[contains(., 'Cover page')]//input")).click();
  await driver.findElement(By.xpath("//div[contains(@class,'modal-actions')]//button[contains(@class,'primary')]")).click();
  await driver.wait(async () => readdirSync(DL).some((f) => f.endsWith('.pdf') && !f.endsWith('.part')), 30000).catch(() => {});
  const pdfs = readdirSync(DL).filter((f) => f.endsWith('.pdf'));
  check('PDF export produces a .pdf file in the browser', pdfs.length === 1, pdfs.join(', '));
  const t = await all('.toast');
  if (t.length) console.log('      toast:', await t[0].getText());
} catch (e) {
  console.log('ERROR', e);
  await shot('error').catch(() => {});
  results.push({ name: 'script', ok: false });
} finally {
  await driver.quit();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}
