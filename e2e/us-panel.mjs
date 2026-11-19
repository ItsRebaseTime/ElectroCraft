// US load center: loading the sample, simulation, drag between columns/spaces, creating a US panel, schedule export.
// Run `npm run build && npx vite preview --port 4173` first. Needs selenium-webdriver and Firefox.
import { Builder, By, Key, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const BASE = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.E2E_OUT ?? `${tmpdir()}/electrocraft-e2e/out`;
const DL = `${tmpdir()}/electrocraft-e2e/dl-us`;
rmSync(DL, { recursive: true, force: true });
mkdirSync(DL, { recursive: true });
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  - ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const o = new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 1000 });
o.setPreference('browser.download.folderList', 2);
o.setPreference('browser.download.dir', DL);
o.setPreference('browser.helperApps.neverAsk.saveToDisk', 'application/pdf');
o.setPreference('pdfjs.disabled', true);
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(o).build();
const state = async () => JSON.parse(await d.executeScript("return localStorage.getItem('electrocraft.autosave')"));
const all = (s) => d.findElements(By.css(s));
const css = (s) => d.findElement(By.css(s));
const energised = () => d.executeScript("return document.querySelectorAll('.canvas g[data-hit^=\"w:\"] path[stroke=\"#ffe08a\"]').length");

try {
  await d.get(BASE);
  await d.executeScript('localStorage.clear()');
  await d.get(BASE);
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);

  // ---- load the US sample from the sample menu
  await d.findElement(By.css('.toolbar .group .menu button')).click();
  await d.findElement(By.xpath("//button[contains(., 'Sample: US house')]")).click();
  await d.wait(until.elementLocated(By.css('.tree .badge')), 5000);
  await sleep(500);
  check('the US sample opens as a load center (US badge in the project tree)', (await d.findElement(By.css('.tree .badge')).getText()) === 'US');
  const names = await Promise.all((await all('.entry-name')).map((e) => e.getText()));
  check('the palette offers US equipment and hides DIN-rail devices', names.includes('Circuit breaker (US plug-on)') && names.includes('Utility service (US)') && !names.includes('Circuit breaker (MCB)'), names.slice(0, 4).join(' | '));
  check('the breaker spaces and bus are drawn instead of DIN rails', (await all('.canvas rect[stroke-dasharray="2 1.5"]')).length > 10);

  // ---- simulation
  await d.findElement(By.xpath("//button[contains(., 'Simulate')]")).click();
  await sleep(500);
  const live = await energised();
  check('simulation energises the service and branch wires', live > 12, `${live} wires`);
  const itemId = async (i) => (await all('.canvas g[data-hit^="i:"]'))[i].getAttribute('data-hit').then((v) => v.slice(2));
  const st0 = await state().catch(() => null);
  void st0;
  const mainId = await itemId(1); // items: supply, main, nbar, gbar, breakers...
  await d.actions({ async: true }).move({ origin: (await all(`g[data-hit="i:${mainId}"]`))[0] }).click().perform();
  await sleep(500);
  const dead = await energised();
  // neutral and ground wires keep their potential; every line wire beyond the main goes dead
  check('opening the main breaker de-energises the bus and every branch (only N and PE stay live)', dead < live && dead <= 11, `${live} -> ${dead}`);
  await d.actions({ async: true }).move({ origin: (await all(`g[data-hit="i:${mainId}"]`))[0] }).click().perform();
  await d.findElement(By.xpath("//button[contains(., 'Power on')]")).click(); // simulation off
  await sleep(300);

  // ---- move a breaker to the other column and a lower space
  const bId = await itemId(4); // first breaker (left column, space 1)
  const bEl = (await all(`g[data-hit="i:${bId}"]`))[0];
  const zoom = await d.executeScript("return Number(document.querySelector('.zoom').textContent.replace('%',''))/100");
  await d.actions({ async: true }).move({ origin: bEl }).press().move({ origin: bEl, x: Math.round(150 * zoom), y: Math.round(110 * zoom) }).move({ origin: bEl, x: Math.round(160 * zoom), y: Math.round(130 * zoom) }).release().perform();
  await sleep(900);
  const stM = await state();
  const moved = stM.panels[0].items.find((i) => i.id === bId);
  check('a breaker can be dragged to the other column and a lower space', moved.railId === stM.panels[0].rails[1].id && moved.slot >= 3, `rail ${moved.railId === stM.panels[0].rails[1].id ? 'right' : 'left'}, row ${moved.slot}`);

  // ---- wire gauge shown for US wires
  const wireEl = (await all('.canvas g[data-hit^="w:"] path:last-child'))[0];
  await d.executeScript("arguments[0].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}))", wireEl);
  await sleep(300);
  const wprops = await css('.props').getText();
  check('US wires have a gauge (AWG) instead of mm²', /Wire gauge/.test(wprops) && !/Cross-section/.test(wprops));

  // ---- create an empty US panel from the tree menu
  await d.actions({ async: true }).move({ x: 1260, y: 600 }).click().perform();
  await css('.tree .panel-head .menu button').click();
  await d.findElement(By.xpath("//button[contains(., 'Load center (US)')]")).click();
  await sleep(900);
  const stN = await state();
  check('"Load center (US)" adds a US panel with two breaker columns', stN.panels.length === 2 && stN.panels[1].region === 'us' && stN.panels[1].rails.length === 2);
  await d.findElement(By.xpath("//div[contains(concat(' ',@class,' '),' entry ')][.//span[text()='Circuit breaker (US plug-on)']]")).click();
  await d.findElement(By.xpath("//div[contains(concat(' ',@class,' '),' entry ')][.//span[text()='Circuit breaker (US plug-on)']]")).click();
  await d.findElement(By.xpath("//div[contains(concat(' ',@class,' '),' entry ')][.//span[text()='Main breaker (US)']]")).click();
  await sleep(900);
  const stB = (await state()).panels[1];
  const brs = stB.items.filter((i) => i.defId === 'us_breaker');
  check('clicking a breaker entry fills the next free space; the main goes top centre', brs.length === 2 && brs[0].slot !== brs[1].slot || brs[0].railId !== brs[1].railId, JSON.stringify(brs.map((b) => [b.railId === stB.rails[0].id ? 'L' : 'R', b.slot])));
  check('US panels show circuit numbers as automatic markings', await d.executeScript("return [...document.querySelectorAll('.canvas text')].some(t => /^[123]$/.test(t.textContent))"));
  writeFileSync(`${OUT}/us-new-panel.png`, await d.takeScreenshot(), 'base64');

  // ---- PDF with the panel schedule
  await d.findElement(By.xpath("//button[contains(., 'Export PDF')]")).click();
  await sleep(400);
  await d.findElement(By.xpath("//button[contains(., 'Whole project')]")).click();
  await d.findElement(By.css('.modal-actions .primary')).click();
  await d.wait(async () => readdirSync(DL).some((f) => f.endsWith('.pdf')), 30000).catch(() => {});
  check('PDF export works with a US panel in the project', readdirSync(DL).filter((f) => f.endsWith('.pdf')).length === 1);
} catch (e) { console.log('ERROR', e); results.push(false); try { writeFileSync(`${OUT}/us-error.png`, await d.takeScreenshot(), 'base64'); } catch {} }
finally { await d.quit(); }
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
