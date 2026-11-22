// Panel deletion, right-click panning, wire visibility, and the mobile layout (phone user agent + pinch zoom).
// Run `npm run build && npx vite preview --port 4173` first. Needs selenium-webdriver and Firefox.
import { Builder, Button, By, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { SAMPLE_HOUSE } from './fixtures.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.E2E_OUT ?? `${tmpdir()}/electrocraft-e2e/out`;
mkdirSync(OUT, { recursive: true });
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  - ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const build = async (w, h, ua) => {
  const o = new firefox.Options().addArguments('-headless').windowSize({ width: w, height: h });
  if (ua) o.setPreference('general.useragent.override', ua);
  return new Builder().forBrowser('firefox').setFirefoxOptions(o).build();
};
const fresh = async (d, hash = '') => {
  await d.get(BASE);
  await d.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', SAMPLE_HOUSE);
  await d.get(BASE + hash);
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await sleep(600);
};
const state = async (d) => JSON.parse(await d.executeScript("return localStorage.getItem('electrocraft.autosave')"));
const gTransform = (d) => d.executeScript("return document.querySelector('.canvas > g').getAttribute('transform')");

let d = await build(1600, 950);
try {
  // ---- delete the example workshop panel
  await fresh(d);
  const row = await d.findElement(By.xpath("//div[contains(@class,'panel-row')][contains(., 'Workshop')]"));
  await d.actions({ async: true }).move({ origin: row }).perform();
  const trash = await d.findElement(By.xpath("//div[contains(@class,'panel-row')][contains(., 'Workshop')]//button[@title='Delete panel']"));
  const tr = await trash.getRect();
  const tb = await d.findElement(By.css('.tree-body')).then((e) => e.getRect());
  check('delete button of a long-named panel row is inside the visible tree area', tr.x + tr.width <= tb.x + tb.width + 1, `button right edge ${Math.round(tr.x + tr.width)} <= ${Math.round(tb.x + tb.width)}`);
  await trash.click();
  await d.wait(until.elementLocated(By.css('.modal.small')), 3000);
  await d.findElement(By.css('.modal.small .primary')).click();
  await sleep(900);
  const panels = (await state(d)).panels;
  check('the example workshop panel can be deleted', panels.length === 1 && panels[0].name === 'Flat board', panels.map((p) => p.name).join(', '));

  // ---- right-click drag pans the view
  await fresh(d);
  const before = await gTransform(d);
  const canvas = await d.findElement(By.css('.canvas'));
  await d.actions({ async: true }).move({ origin: canvas, x: -300, y: 0 }).press(Button.RIGHT).move({ origin: canvas, x: -200, y: 40 }).move({ origin: canvas, x: -120, y: 90 }).release(Button.RIGHT).perform();
  const after = await gTransform(d);
  check('dragging with the right mouse button pans the view', before !== after, `${before} -> ${after}`);
  // a plain right click must not change selection or open a native menu we can see
  check('right click does not select anything', /Panel/.test(await d.findElement(By.css('.props h3')).getText()));

  // ---- wire visibility
  const countWires = () => d.executeScript("return document.querySelectorAll('.canvas g[data-hit^=\"w:\"]').length");
  const fadedWires = () => d.executeScript("return document.querySelectorAll('.canvas g[data-hit^=\"w:\"][opacity=\"0.18\"]').length");
  const allWires = await countWires();
  await d.findElement(By.xpath("//button[contains(., 'View')]")).click();
  await sleep(300);
  await d.findElement(By.xpath("//div[contains(@class,'wirevis-presets')]//button[contains(., 'Phases only')]")).click();
  await sleep(300);
  const faded = await fadedWires();
  check('"Phases only" fades neutral and earth wires', faded > 0 && faded < allWires, `${faded} of ${allWires} faded`);
  await d.findElement(By.xpath("//div[contains(@class,'wirevis-row')][contains(., 'Earth')]//button[contains(., 'Hide')]")).click();
  await sleep(300);
  const afterHide = await countWires();
  check('hiding earth wires removes them from the drawing', afterHide < allWires, `${allWires} -> ${afterHide}`);
  await d.findElement(By.xpath("//div[contains(@class,'wirevis-presets')]//button[normalize-space()='All']")).click();
  await sleep(300);
  check('"All" restores every wire', (await countWires()) === allWires && (await fadedWires()) === 0);
  await d.findElement(By.xpath("//button[contains(., 'View')]")).click(); // close menu
} catch (e) { console.log('ERROR (desktop)', e); results.push(false); }
finally { await d.quit(); }

// ---- mobile layout chosen from the user agent
d = await build(390, 844, IPHONE);
try {
  await fresh(d);
  check('a phone user agent selects the mobile layout', (await d.findElements(By.css('.m-app'))).length === 1 && (await d.findElements(By.css('.toolbar'))).length === 0);
  writeFileSync(`${OUT}/mobile-1.png`, await d.takeScreenshot(), 'base64');

  // pinch zoom with two synthetic touch pointers
  const t0 = await gTransform(d);
  await d.executeScript(`
    const svg=document.querySelector('.canvas'); const r=svg.getBoundingClientRect();
    const ev=(type,id,x,y)=>svg.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',isPrimary:id===1,button:0,buttons:1,clientX:x,clientY:y}));
    const cx=r.left+r.width/2, cy=r.top+r.height/2;
    ev('pointerdown',1,cx-40,cy); ev('pointerdown',2,cx+40,cy);
    for(let i=1;i<=6;i++){ ev('pointermove',1,cx-40-i*15,cy); ev('pointermove',2,cx+40+i*15,cy); }
    ev('pointerup',1,cx-130,cy); ev('pointerup',2,cx+130,cy);`);
  await sleep(300);
  const t1 = await gTransform(d);
  const scale = (t) => Number(/scale\(([\d.]+)\)/.exec(t)[1]);
  check('two-finger pinch zooms the canvas in', scale(t1) > scale(t0) * 1.5, `scale ${scale(t0).toFixed(2)} -> ${scale(t1).toFixed(2)}`);

  // one-finger drag on empty canvas pans
  await d.executeScript(`
    const svg=document.querySelector('.canvas'); const r=svg.getBoundingClientRect();
    const ev=(type,x,y)=>svg.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:5,pointerType:'touch',isPrimary:true,button:0,buttons:1,clientX:x,clientY:y}));
    const x=r.left+r.width-30, y=r.top+r.height-100;
    ev('pointerdown',x,y); for(let i=1;i<=5;i++) ev('pointermove',x-i*12,y-i*6); ev('pointerup',x-60,y-30);`);
  await sleep(200);
  check('one-finger drag pans', (await gTransform(d)) !== t1);

  // add equipment from the sheet
  const n0 = 13; // items in the sample's first panel
  await d.findElement(By.xpath("//nav[contains(@class,'m-nav')]//button[contains(., 'Add')]")).click();
  await d.wait(until.elementLocated(By.css('.sheet .entry')), 3000);
  await d.findElement(By.xpath("//div[contains(@class,'sheet')]//div[contains(@class,'entry')][.//span[text()='Circuit breaker (MCB)']]")).click();
  await sleep(900);
  check('tapping an equipment entry adds it and closes the sheet', (await state(d)).panels[0].items.length === n0 + 1 && (await d.findElements(By.css('.sheet'))).length === 0);
  check('the new device is selected and a selection bar appears', (await d.findElements(By.css('.selbar'))).length === 1);
  await d.findElement(By.css('.selbar button')).click();
  await sleep(300);
  check('Edit opens the properties sheet', (await d.findElements(By.css('.sheet .props'))).length === 1);
  writeFileSync(`${OUT}/mobile-2.png`, await d.takeScreenshot(), 'base64');
  await d.findElement(By.css('.sheet-head button')).click();
  await d.findElement(By.css('button[aria-label="Menu"]')).click();
  await sleep(300);
  writeFileSync(`${OUT}/mobile-3.png`, await d.takeScreenshot(), 'base64');
  await d.findElement(By.xpath("//button[contains(., 'Use desktop layout')]")).click();
  await sleep(500);
  check('the menu can switch to the desktop layout', (await d.findElements(By.css('.toolbar'))).length === 1);
  await d.get(BASE + '?layout=mobile');
  await sleep(800);
  check('?layout=mobile forces the mobile layout', (await d.findElements(By.css('.m-app'))).length === 1);
} catch (e) { console.log('ERROR (mobile)', e); results.push(false); }
finally { await d.quit(); }

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
