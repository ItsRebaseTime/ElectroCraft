// Mounting plates and network switches: a switch on a plate, its overlay, the port wire, rotation and stacking.
// Run `npm run build && npx vite preview --port 4173` first. Needs selenium-webdriver and Firefox.
import { Builder, By, Key, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

const BASE = process.env.URL ?? 'http://localhost:4173/';
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  - ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async (d) => (await sleep(900), JSON.parse(await d.executeScript("return localStorage.getItem('electrocraft.autosave')")));
const it = (id, defId, railId, slot, extra = {}) => ({ id, defId, railId, slot, x: 0, y: 0, params: {}, poleConfig: '1P', description: '', manufacturer: '', model: '', on: true, ...extra });
const proj = JSON.stringify({ format: 'electrocraft', version: 1, name: 'x', author: '', revision: 'A', created: '2026-01-01T00:00:00.000Z', modified: '2026-01-01T00:00:00.000Z',
  settings: { markingStandard: 'iec81346', phaseColors: { L1: 'brown', L2: 'black', L3: 'grey' }, usPhaseColors: { L1: 'black', L2: 'red', L3: 'blue' } },
  panels: [{ id: 'p1', name: 'x', floor: 'G', room: '', code: 'X', notes: '', rails: [{ id: 'r1', modules: 40, kind: 'plate' }, { id: 'r2', modules: 40, kind: 'plate' }],
    items: [it('a', 'ubiquiti-usw-lite-8-poe', 'r1', 1, { plateY: 5 }), it('b', 'ubiquiti-usw-flex-mini', 'r1', 14, { plateY: 10 }), it('c', 'ubiquiti-usw-flex', 'r1', 14, { plateY: 10, stackOn: 'b' })], wires: [] }], modules: [], floorPlans: [] });

const o = new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 950 });
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(o).build();
const click = async (sel) => {
  const r = await d.executeScript(`const e=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [e.x+e.width/2,e.y+e.height/2];`);
  await d.actions().move({ x: Math.round(r[0]), y: Math.round(r[1]) }).click().perform();
};
try {
  await d.get(BASE);
  await d.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', proj);
  await d.get(`${BASE}#z=2&x=0&y=0`);
  await d.navigate().refresh();
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await sleep(600);
  check('a plate with devices is drawn', (await d.findElements(By.css('.canvas pattern#plate-holes'))).length === 1);
  await click('.canvas g[data-hit="i:a"]');
  await sleep(500);
  check('selecting a switch shows its ports overlay', (await d.findElements(By.css('.switch-overlay'))).length === 1);
  check('the overlay has a clickable port per switch port', (await d.findElements(By.css('.switch-overlay .so-port'))).length === 8);
  await click('.switch-overlay .so-port[data-port="P2"] rect');
  await sleep(400);
  const hint = await d.findElement(By.css('.hint')).getText();
  check('a click on a port starts a wire', /finish/i.test(hint), hint);
  await d.actions().sendKeys('').perform(); // Escape
  await click('.canvas g[data-hit="i:b"]');
  await sleep(400);
  check('two stacked switches share one overlay, front and back', (await d.findElements(By.css('.switch-overlay .so-svg'))).length === 2 && (await d.findElements(By.css('.switch-overlay .so-port'))).length === 10);
  await d.actions().sendKeys(Key.ESCAPE).perform();
  // turn with R
  await click('.canvas g[data-hit="i:a"]');
  await d.actions().sendKeys('r').perform();
  let st = await state(d);
  check('R turns the selected device by 90 degrees', st.panels[0].items.find((i) => i.id === 'a').rot === 90, String(st.panels[0].items.find((i) => i.id === 'a').rot));
  await d.actions().keyDown(Key.SHIFT).sendKeys('r').keyUp(Key.SHIFT).perform();
  st = await state(d);
  // a switch turned by 90 degrees can be dragged to the left, over the edge of the plate up to the enclosure wall
  await click('.canvas g[data-hit="i:a"]');
  await d.actions().sendKeys('r').perform();
  await sleep(300);
  const box = await d.executeScript("const e=document.querySelector('.canvas g[data-hit=\"i:a\"]').getBoundingClientRect(); return [e.x+e.width/2,e.y+e.height/2];");
  await d.actions().move({ x: Math.round(box[0]), y: Math.round(box[1]) }).press().move({ x: 330, y: Math.round(box[1]) }).release().perform();
  st = await state(d);
  const moved = st.panels[0].items.find((i) => i.id === 'a');
  check('a turned switch can be dragged out to the wall of the enclosure (past the plate edge)', moved.rot === 90 && moved.slot <= 0 && moved.slot >= -2.2, `slot ${moved.slot}`);
  await d.actions().keyDown(Key.SHIFT).sendKeys('r').keyUp(Key.SHIFT).perform();
  st = await state(d);
  check('Shift+R turns it back', st.panels[0].items.find((i) => i.id === 'a').rot === undefined);
} finally {
  await d.quit();
}
const failed = results.filter((x) => !x).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
