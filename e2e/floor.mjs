// Floor plans: load a picture, mark outlets, wire them in a circuit to a panel and see the result in the panel planner.
// Run `npm run build && npx vite preview --port 4173` first. Needs selenium-webdriver and Firefox.
import { Builder, By, Key, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SAMPLE_HOUSE } from './fixtures.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.E2E_OUT ?? `${tmpdir()}/electrocraft-e2e/out`;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PICTURE = join(ROOT, 'docs/examples/floorplan-sample.png');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  - ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async (d) => (await sleep(900), JSON.parse(await d.executeScript("return localStorage.getItem('electrocraft.autosave')")));
const click = async (d, xp) => { await (await d.findElement(By.xpath(xp))).click(); await sleep(350); };

/** Click at a place of the plan (in drawing pixels), whatever the zoom and pan. */
async function clickPlan(d, x, y) {
  const pos = await d.executeScript(`
    const svg = document.querySelector('svg.floor-canvas'); const r = svg.getBoundingClientRect();
    const m = /translate\\(([-\\d.e]+) ([-\\d.e]+)\\) scale\\(([-\\d.e]+)\\)/.exec(svg.querySelector(':scope > g').getAttribute('transform'));
    return [r.left + Number(m[1]) + arguments[0] * Number(m[3]) - (r.left + r.width / 2), r.top + Number(m[2]) + arguments[1] * Number(m[3]) - (r.top + r.height / 2)];`, x, y);
  const svg = await d.findElement(By.css('svg.floor-canvas'));
  await d.actions({ async: true }).move({ origin: svg, x: Math.round(pos[0]), y: Math.round(pos[1]) }).click().perform();
  await sleep(300);
}

const o = new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 950 });
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(o).build();
try {
  await d.get(BASE);
  await d.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', SAMPLE_HOUSE);
  await d.get(BASE);
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await sleep(500);

  await click(d, "//span[contains(@class,'view-switch')]//button[contains(., 'Floor plan')]");
  check('the floor plan workspace opens, with an empty state', (await d.findElements(By.css('.floor-empty'))).length === 1);

  // load a picture
  await d.findElement(By.css('input[aria-label="Floor plan picture"]')).sendKeys(PICTURE);
  await d.wait(until.elementLocated(By.css('svg.floor-canvas image')), 10000);
  await sleep(600);
  let st = await state(d);
  check('the picture becomes a floor plan', st.floorPlans.length === 1 && st.floorPlans[0].image?.data.startsWith('data:image/jpeg') && st.floorPlans[0].image.w === 1400, `${st.floorPlans[0]?.image?.w}x${st.floorPlans[0]?.image?.h}`);

  // two sockets and a network outlet
  await click(d, "//button[contains(@class,'kind')][contains(., 'Socket')][not(contains(., 'Double'))]");
  await clickPlan(d, 300, 200);
  await clickPlan(d, 500, 200);
  await click(d, "//button[contains(@class,'kind')][contains(., 'Network outlet')]");
  await clickPlan(d, 300, 600);
  st = await state(d);
  check('outlets are placed with automatic labels', st.floorPlans[0].points.map((p) => p.label).join() === 'S1,S2,RJ1');

  // the panel
  await click(d, "//button[contains(@class,'kind')][contains(., 'Flat board')]");
  await clickPlan(d, 600, 500);
  st = await state(d);
  check('a panel is placed on the plan', st.floorPlans[0].panels.length === 1 && st.floorPlans[0].panels[0].panelId === st.panels[0].id);

  // a circuit: S1 -> S2 -> panel
  await click(d, "//button[contains(@title, 'Connect outlets with a cable')]");
  await clickPlan(d, 300, 200);
  await clickPlan(d, 500, 200);
  await clickPlan(d, 300, 600); // a network outlet cannot join a power circuit
  const toast = (await d.findElements(By.css('.toast'))).length ? await d.findElement(By.css('.toast')).getText() : '';
  check('outlets of another medium are refused', /network outlet/i.test(toast), toast);
  await clickPlan(d, 600, 500);
  st = await state(d);
  const c = st.floorPlans[0].circuits[0];
  check('the circuit connects both sockets and ends at the panel', st.floorPlans[0].circuits.length === 1 && c.medium === 'power' && c.nodes.length === 2 && c.panel === st.floorPlans[0].panels[0].id, JSON.stringify(c?.nodes));
  check('it appears as an item in the panel', st.panels[0].items.some((i) => i.defId === 'load' && i.link?.circuit === c.id && i.params.P === 300), st.panels[0].items.map((i) => i.defId + ':' + i.params.P).join());
  writeFileSync(`${OUT}/floor-plan.png`, await d.takeScreenshot(), 'base64');

  // the panel planner shows it and protects it
  await click(d, "//span[contains(@class,'view-switch')]//button[contains(., 'Panel')]");
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 5000);
  await d.actions().sendKeys('f').perform(); // fit the view: the floor plan items are below the enclosure
  await sleep(400);
  const item = st.panels[0].items.find((i) => i.link);
  const hit = await d.findElement(By.css(`.canvas g[data-hit="i:${item.id}"]`));
  await d.executeScript('arguments[0].scrollIntoView()', hit);
  const r = await hit.getRect();
  await d.actions({ async: true }).move({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }).click().perform();
  await sleep(500);
  const props = await d.findElement(By.css('.props')).getText();
  check('its properties say it comes from the floor plan', /from the floor plan/i.test(props) && /show on the floor plan/i.test(props), props.slice(0, 70).replace(/\n/g, ' '));
  check('its delete button is disabled', await d.findElement(By.xpath("//button[contains(@class,'danger')][contains(., 'Delete')]")).getAttribute('disabled') !== null);
  await d.findElement(By.css('body')).sendKeys('');
  await sleep(500);
  st = await state(d);
  check('deleting it with the keyboard is refused', st.panels[0].items.some((i) => i.link));
  writeFileSync(`${OUT}/floor-panel-item.png`, await d.takeScreenshot(), 'base64');

  // back on the plan, deleting the circuit removes the item
  await click(d, "//button[contains(., 'Show on the floor plan')]");
  await sleep(500);
  const del = await d.findElement(By.xpath("//button[contains(., 'Delete circuit')]"));
  await del.click();
  await sleep(400);
  st = await state(d);
  check('deleting the circuit removes the panel item', st.floorPlans[0].circuits.length === 0 && !st.panels[0].items.some((i) => i.link));

  // undo brings both back together
  await d.findElement(By.css('body')).sendKeys('');
  await click(d, "//button[@title='Undo (Ctrl+Z)']");
  st = await state(d);
  check('undo restores the circuit and its item together', st.floorPlans[0].circuits.length === 1 && st.panels[0].items.some((i) => i.link));

  // a socket with a count is drawn with several circles
  const setCount = async (n) => {
    await d.executeScript(`const el = document.querySelector('.place-count input[type=number]'); el.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, arguments[0]);
      el.dispatchEvent(new Event('input', { bubbles: true })); el.blur();`, String(n));
    await sleep(300);
  };
  await setCount(3);
  await click(d, "//button[contains(@class,'kind')][contains(., 'Socket')]");
  await clickPlan(d, 700, 200);
  st = await state(d);
  const triple = st.floorPlans[0].points.find((p) => p.x === 700 && p.y === 200);
  check('a socket placed with a count of 3 stores it', triple?.count === 3, JSON.stringify(triple));
  const circles = await d.executeScript(`return document.querySelectorAll('svg.floor-canvas g[data-hit="p:${triple.id}"] circle').length`);
  check('it is drawn as three circles', circles === 3, String(circles));

  // a second electrical panel on the same plan, fed by a circuit of its own
  await click(d, "//button[@aria-label='Add a new panel']");
  await clickPlan(d, 900, 500);
  st = await state(d);
  check('a new panel is added and placed next to the first', st.panels.length === 3 && st.floorPlans[0].panels.length === 2, `${st.panels.length} panels, ${st.floorPlans[0].panels.length} markers`);
  await click(d, "//button[contains(@title, 'Connect outlets with a cable')]");
  await clickPlan(d, 700, 200);
  await clickPlan(d, 900, 500);
  st = await state(d);
  const second = st.floorPlans[0].panels.find((m) => m.panelId !== st.floorPlans[0].panels[0].panelId) ;
  const toSecond = st.floorPlans[0].circuits.find((c) => c.panel === second.id);
  const secondPanel = st.panels.find((p) => p.id === second.panelId);
  check('the circuit goes to the second panel and only appears there', !!toSecond && secondPanel.items.some((i) => i.link?.circuit === toSecond.id && i.params.P === 450) && st.panels[0].items.filter((i) => i.link?.circuit === toSecond.id).length === 0);

  // layers: floor, walls and ceiling by default; add, rename, place on, hide, fade and delete
  const rows = async () => d.findElements(By.css('.floor-palette .floor-layers .layer-row'));
  check('a floor plan starts with floor, walls and ceiling layers', (await rows()).length === 3 && (await state(d)).floorPlans[0].layers.map((l) => l.name).join() === 'Floor,Walls,Ceiling');
  const wallsBefore = (await d.findElements(By.css('svg.floor-canvas g[data-hit^="p:"]'))).length;
  await click(d, "//div[contains(@class,'floor-layers')]//button[contains(., 'Add layer')]");
  check('a layer can be added', (await rows()).length === 4);
  await d.executeScript(`const el = document.querySelector('.floor-palette .layer-row input'); el.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'Heating'); el.dispatchEvent(new Event('input', { bubbles: true })); el.blur();`);
  await sleep(400);
  st = await state(d);
  const heating = st.floorPlans[0].layers.find((l) => l.name === 'Heating');
  check('and renamed (the newest layer is on top of the list)', !!heating && st.floorPlans[0].layers[3].id === heating.id);
  await d.executeScript(`const el = document.querySelector('select[aria-label="Layer for new outlets"]');
    el.value = arguments[0]; el.dispatchEvent(new Event('change', { bubbles: true }));`, heating.id);
  await sleep(300);
  await click(d, "//button[contains(@class,'kind')][contains(., 'Socket')]");
  await clickPlan(d, 1000, 300);
  st = await state(d);
  check('outlets are placed on the chosen layer', st.floorPlans[0].points.find((p) => p.x === 1000 && p.y === 300)?.layer === heating.id);
  await d.executeScript(`const el = document.querySelector('select[aria-label="Layer for new outlets"]'); el.value = ''; el.dispatchEvent(new Event('change', { bubbles: true }));`);
  await sleep(200);
  await click(d, "//button[@aria-label='Hide Walls']");
  const hidden = (await d.findElements(By.css('svg.floor-canvas g[data-hit^="p:"]'))).length;
  check('hiding a layer removes its outlets and cables from the plan', hidden < wallsBefore + 1 && hidden >= 1, `${wallsBefore + 1} -> ${hidden}`);
  await click(d, "//button[@aria-label='Fade Walls']");
  const faded = await d.executeScript(`return Array.from(document.querySelectorAll('svg.floor-canvas g[data-hit^="p:"]')).filter(g => g.getAttribute('opacity') === '0.28').length`);
  check('a faded layer is drawn light', faded > 0, String(faded));
  await click(d, "//button[@aria-label='Show Walls']");
  check('showing it brings everything back', (await d.findElements(By.css('svg.floor-canvas g[data-hit^="p:"]'))).length === wallsBefore + 1);
  await click(d, "//button[contains(., 'View')][contains(@aria-expanded,'false')]");
  const menu = await d.findElement(By.css('.menu-pop')).getText();
  check('the View menu offers the layers in the floor plan workspace', /layers/i.test(menu) && /walls/i.test(menu) && !/wire visibility/i.test(menu), menu.slice(0, 60).replace(/\n/g, ' '));
  await d.findElement(By.css('body')).click();
  await click(d, "//button[@aria-label='Delete Heating']");
  await click(d, "//div[contains(@class,'modal')]//button[contains(., 'Delete')]");
  st = await state(d);
  check('deleting a layer moves its outlets to the layer below', st.floorPlans[0].layers.length === 3 && st.floorPlans[0].points.find((p) => p.x === 1000 && p.y === 300)?.layer === 'ceiling');
  writeFileSync(`${OUT}/floor-layers.png`, await d.takeScreenshot(), 'base64');

  // a chain is connected to the panel at the outlet that was clicked last, not at the end of the chain
  await setCount(1);
  await click(d, "//button[contains(@class,'kind')][contains(., 'Socket')]");
  await clickPlan(d, 1100, 200);
  await clickPlan(d, 1250, 200);
  await click(d, "//button[contains(@title, 'Connect outlets with a cable')]");
  await clickPlan(d, 1100, 200);
  await clickPlan(d, 1250, 200); // a chain A -> B
  await clickPlan(d, 1100, 200); // already in the circuit: nothing to add
  await d.findElement(By.css('body')).sendKeys(Key.ESCAPE);
  await clickPlan(d, 1100, 200); // continue the circuit from A ...
  await clickPlan(d, 600, 500); // ... and finish at the first panel
  st = await state(d);
  const pA = st.floorPlans[0].points.find((p) => p.x === 1100 && p.y === 200);
  const chain = st.floorPlans[0].circuits.find((c) => c.nodes.some((n) => n.point === pA.id));
  check('the panel cable connects at the outlet that was clicked, not at the end of the chain', chain?.feed === pA.id && chain.panel === st.floorPlans[0].panels[0].id, JSON.stringify({ feed: chain?.feed, a: pA.id }));
  const first = await d.executeScript(`return document.querySelector('svg.floor-canvas g[data-hit="c:${chain.id}"] polyline').getAttribute('points')`);
  const panelAt = st.floorPlans[0].panels[0];
  check('the drawn cable starts at the panel and arrives at that outlet', first.startsWith(`${panelAt.x},${panelAt.y} `) && first.includes('1100,200'), first);

  // dragging bends: the selected cable has a + on every run and handles on its bends
  await click(d, "//button[@aria-label='Select / move']");
  await click(d, `//button[contains(@class,'sum-link')][contains(., '${chain.name}')]`).catch(async () => {
    await d.findElement(By.css('body')).sendKeys(Key.ESCAPE);
    await click(d, `//button[contains(@class,'sum-link')][contains(., '${chain.name}')]`);
  });
  const bendsOf = (c) => (c.run?.length ?? 0) + c.nodes.filter((n) => !n.point).length;
  const circuitNow = async () => (await state(d)).floorPlans[0].circuits.find((c) => c.id === chain.id);
  const nBefore = bendsOf(await circuitNow());
  const grab = await d.findElement(By.css('svg.floor-canvas [data-hit^="s:"]'));
  const g = await grab.getRect();
  await d.actions({ async: true }).move({ x: Math.round(g.x + g.width / 2), y: Math.round(g.y + g.height / 2) }).press().move({ x: Math.round(g.x + g.width / 2) + 8, y: Math.round(g.y + g.height / 2) + 40, duration: 100 }).move({ x: Math.round(g.x + g.width / 2) + 14, y: Math.round(g.y + g.height / 2) + 90, duration: 100 }).release().perform();
  await sleep(400);
  const afterAdd = await circuitNow();
  check('dragging the + of a cable pulls a new bend out of it', bendsOf(afterAdd) === nBefore + 1, `${nBefore} -> ${bendsOf(afterAdd)}`);
  const handle = await d.findElement(By.css('svg.floor-canvas [data-hit^="n:"]'));
  const h = await handle.getRect();
  const bendBefore = JSON.stringify([afterAdd.run, afterAdd.nodes]);
  await d.actions({ async: true }).move({ x: Math.round(h.x + h.width / 2), y: Math.round(h.y + h.height / 2) }).press().move({ x: Math.round(h.x + h.width / 2) + 50, y: Math.round(h.y + h.height / 2) - 30, duration: 100 }).release().perform();
  await sleep(400);
  const moved = await circuitNow();
  check('a bend can be dragged to another place', JSON.stringify([moved.run, moved.nodes]) !== bendBefore && bendsOf(moved) === nBefore + 1);
  await d.actions({ async: true }).doubleClick(await d.findElement(By.css('svg.floor-canvas [data-hit^="n:"]'))).perform();
  await sleep(400);
  check('double-clicking a bend removes it', bendsOf(await circuitNow()) === nBefore);

  // visibility of single objects: a kind of outlet, and one outlet
  const pointGroups = async () => (await d.findElements(By.css('svg.floor-canvas g[data-hit^="p:"]'))).length;
  const total = await pointGroups();
  const sockets = st.floorPlans[0].points.filter((p) => p.kind === 'socket').length;
  await click(d, "//button[@aria-label='Socket outlets: shown']");
  await click(d, "//button[@aria-label='Socket outlets: faded']");
  check('a kind of outlet can be hidden', (await pointGroups()) === total - sockets, `${total} -> ${await pointGroups()}`);
  await click(d, "//button[@aria-label='Socket outlets: hidden']");
  check('and shown again', (await pointGroups()) === total);
  await clickPlan(d, 300, 600); // the network outlet RJ1
  await click(d, "//button[@aria-label='Hide RJ1']");
  const propsText = await d.findElement(By.css('.props')).getText();
  check('a single outlet can be hidden, which deselects it', (await pointGroups()) === total - 1 && /hidden or faded objects/i.test(propsText), `${total} -> ${await pointGroups()}; ${propsText.slice(0, 60).replace(/\n/g, ' ')}`);
  await click(d, "//div[contains(@class,'sum-row')][contains(., 'RJ1')]//button[contains(., 'Show')]");
  check('and brought back from the plan properties', (await pointGroups()) === total);

  // several outlets: Ctrl+click, a Ctrl+drag box, copy and paste, delete
  const selectedText = async () => (await d.findElement(By.css('.props')).getText()).replace(/\n/g, ' ');
  const screenAt = async (x, y) => d.executeScript(`
    const svg = document.querySelector('svg.floor-canvas'); const r = svg.getBoundingClientRect();
    const m = /translate\\(([-\\d.e]+) ([-\\d.e]+)\\) scale\\(([-\\d.e]+)\\)/.exec(svg.querySelector(':scope > g').getAttribute('transform'));
    return [Math.round(r.left + Number(m[1]) + arguments[0] * Number(m[3])), Math.round(r.top + Number(m[2]) + arguments[1] * Number(m[3]))];`, x, y);
  // pointer events with the Ctrl key held (what a real Ctrl+click produces)
  const synth = async (steps) => d.executeScript(`
    const svg = document.querySelector('svg.floor-canvas');
    for (const [type, x, y] of arguments[0]) {
      const el = type === 'pointerdown' ? (document.elementFromPoint(x, y) || svg) : svg;
      el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, ctrlKey: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 77, pointerType: 'mouse', clientX: x, clientY: y }));
    }`, steps);
  const ctrlClick = async (x, y) => { const [sx, sy] = await screenAt(x, y); await synth([['pointerdown', sx, sy], ['pointerup', sx, sy]]); await sleep(250); };
  const pressCtrl = async (k) => { await d.actions({ async: true }).keyDown(Key.CONTROL).sendKeys(k).keyUp(Key.CONTROL).perform(); await sleep(450); };
  const pointCountNow = async () => (await state(d)).floorPlans[0].points.length;
  await click(d, "//button[@aria-label='Select / move']");
  await d.findElement(By.css('body')).sendKeys(Key.ESCAPE);
  const nBefore2 = await pointCountNow();
  await clickPlan(d, 300, 200); // S1
  await ctrlClick(500, 200); // + S2
  check('Ctrl+click adds outlets to the selection', /2 outlets selected/.test(await selectedText()), (await selectedText()).slice(0, 50));
  await ctrlClick(500, 200);
  check('and takes them out again', !/outlets selected/.test(await selectedText()));
  await ctrlClick(500, 200);
  await pressCtrl('c');
  await pressCtrl('v');
  check('Ctrl+C and Ctrl+V paste copies of the selected outlets, and select them', (await pointCountNow()) === nBefore2 + 2 && /2 outlets selected/.test(await selectedText()), `${nBefore2} -> ${await pointCountNow()}`);
  const pasted = (await state(d)).floorPlans[0].points.slice(-2);
  check('the copies are labelled afresh and keep their settings', pasted.every((p) => p.kind === 'socket' && p.watts === 150) && new Set((await state(d)).floorPlans[0].points.map((p) => p.label)).size === nBefore2 + 2);
  await d.findElement(By.css('body')).sendKeys(Key.DELETE);
  await sleep(400);
  check('Delete removes the whole selection', (await pointCountNow()) === nBefore2);
  // a box with Ctrl held selects what is inside
  const [bx1, by1] = await screenAt(250, 150);
  const [bx2, by2] = await screenAt(560, 260);
  await synth([['pointerdown', bx1, by1], ['pointermove', Math.round((bx1 + bx2) / 2), Math.round((by1 + by2) / 2)], ['pointermove', bx2, by2], ['pointerup', bx2, by2]]);
  await sleep(400);
  check('Ctrl+drag selects the outlets in a box', /outlets selected/.test(await selectedText()), (await selectedText()).slice(0, 40));
  await d.findElement(By.css('body')).sendKeys(Key.ESCAPE);
  await sleep(200);

  // speakers end at an audio receiver, not at a panel
  await click(d, "//button[contains(@class,'kind')][contains(., 'Audio receiver')]");
  await clickPlan(d, 1200, 700);
  await click(d, "//button[contains(@class,'kind')][normalize-space(.)='Speaker' or contains(., 'Speaker')]");
  await clickPlan(d, 1100, 600);
  await clickPlan(d, 1300, 600);
  await click(d, "//button[contains(@title, 'Connect outlets with a cable')]");
  await clickPlan(d, 1100, 600);
  await clickPlan(d, 1300, 600);
  await clickPlan(d, 1200, 700); // the receiver
  st = await state(d);
  const amp = st.floorPlans[0].points.find((p) => p.kind === 'amp');
  const audio = st.floorPlans[0].circuits.find((c) => c.medium === 'audio');
  check('a speaker circuit ends at the audio receiver', !!audio && audio.hub === amp.id && !audio.panel && audio.topology === 'star', JSON.stringify({ hub: audio?.hub, amp: amp?.id }));
  check('and puts nothing in the panels', !st.panels.some((p) => p.items.some((i) => i.link?.circuit === audio.id)));
  await click(d, "//button[@aria-label='Select / move']");
  await clickPlan(d, 1200, 700);
  check('the receiver shows how many speaker channels are used', /2 of 2 used/.test(await selectedText()), (await selectedText()).slice(0, 80));
  writeFileSync(`${OUT}/floor-audio.png`, await d.takeScreenshot(), 'base64');

  // an appliance can have one, two or three phases, and the load in the panel follows
  await click(d, "//button[contains(@class,'kind')][contains(., 'Appliance')]");
  await clickPlan(d, 1250, 380);
  await d.executeScript(`const sel = Array.from(document.querySelectorAll('.props select')).find((s) => Array.from(s.options).some((o) => /3 phases/.test(o.text)) && !/Automatic/.test(s.options[0].text));
    sel.value = '3'; sel.dispatchEvent(new Event('change', { bubbles: true }));`);
  await sleep(300);
  st = await state(d);
  const hob = st.floorPlans[0].points.find((p) => p.x === 1250 && p.y === 380);
  check('an appliance can be set to three phases', hob?.phases === 3, JSON.stringify(hob));
  await click(d, "//button[contains(@title, 'Connect outlets with a cable')]");
  await clickPlan(d, 1250, 380);
  await clickPlan(d, 600, 500);
  st = await state(d);
  const hobCircuit = st.floorPlans[0].circuits.find((c) => c.nodes.some((n) => n.point === hob.id));
  check('and so does the load that appears in the panel', st.panels[0].items.some((i) => i.link?.circuit === hobCircuit.id && i.params.phases === 3 && i.params.kind === 'heater'));

  // shapes: draw a rectangle, a line and a text; move, resize, copy and hide them; fade and hide the picture
  const shapesNow = async () => (await state(d)).floorPlans[0].shapes;
  const drag = async (from, to) => {
    const [ax, ay] = await screenAt(...from);
    const [bx, by] = await screenAt(...to);
    await d.actions({ async: true }).move({ x: ax, y: ay }).press().move({ x: Math.round((ax + bx) / 2), y: Math.round((ay + by) / 2), duration: 100 }).move({ x: bx, y: by, duration: 100 }).release().perform();
    await sleep(400);
  };
  await click(d, "//button[contains(@class,'kind')][contains(., 'Rectangle')]");
  await drag([1060, 250], [1260, 340]);
  let shp = await shapesNow();
  check('a rectangle is drawn by dragging on the plan', shp.length === 1 && shp[0].type === 'rect' && shp[0].w > 150 && shp[0].h > 60, JSON.stringify(shp[0]));
  const rectId = shp[0].id;
  await click(d, "//button[@aria-label='Select / move']");
  const cornerHandle = await d.findElement(By.css(`svg.floor-canvas [data-hit="shh:${rectId}:se"]`));
  const hr = await cornerHandle.getRect();
  await d.actions({ async: true }).move({ x: Math.round(hr.x + hr.width / 2), y: Math.round(hr.y + hr.height / 2) }).press().move({ x: Math.round(hr.x + hr.width / 2) + 30, y: Math.round(hr.y + hr.height / 2) + 30, duration: 100 }).release().perform();
  await sleep(400);
  const grown = (await shapesNow())[0];
  check('its corner handle resizes it', grown.w > shp[0].w && grown.h > shp[0].h, `${shp[0].w}x${shp[0].h} -> ${grown.w}x${grown.h}`);
  await d.executeScript(`const el = Array.from(document.querySelectorAll('.props input[type=color]')).find((e) => e.getAttribute('aria-label') === 'Outline colour');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '#dc2626'); el.dispatchEvent(new Event('input', { bubbles: true }));`);
  await sleep(300);
  check('its outline colour can be changed in the properties', (await shapesNow())[0].stroke === '#dc2626');
  await pressCtrl('c');
  await pressCtrl('v');
  check('Ctrl+C and Ctrl+V copy a shape', (await shapesNow()).length === 2 && /1? ?shape|Rectangle/i.test(await selectedText()));
  await d.findElement(By.css('body')).sendKeys(Key.DELETE);
  await sleep(300);
  check('and Delete removes the selected shape', (await shapesNow()).length === 1);
  await click(d, "//button[contains(@class,'kind')][contains(., 'Line')]");
  await clickPlan(d, 300, 700);
  shp = await shapesNow();
  const line = shp.find((q) => q.type === 'line');
  check('clicking with the line tool draws a level line of the usual length', !!line && line.w === 160 && line.h === 0, JSON.stringify(line));
  await click(d, "//button[contains(@class,'kind')][contains(., 'Text')]");
  await clickPlan(d, 700, 780);
  await d.executeScript(`const el = document.querySelector('.props textarea'); el.focus();
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, 'Bike storage'); el.dispatchEvent(new Event('input', { bubbles: true })); el.blur();`);
  await sleep(400);
  check('a text is placed and typed in the properties', (await shapesNow()).some((q) => q.type === 'text' && q.text === 'Bike storage'));
  const shapeGroups = async () => (await d.findElements(By.css('svg.floor-canvas g[data-hit^="sh:"]'))).length;
  const nShapes = await shapeGroups();
  await d.findElement(By.css('body')).sendKeys(Key.ESCAPE);
  await click(d, "//button[@aria-label='Shapes: shown']");
  await click(d, "//button[@aria-label='Shapes: faded']");
  check('all shapes can be hidden at once', nShapes === 3 && (await shapeGroups()) === 0, `${nShapes} -> ${await shapeGroups()}`);
  await click(d, "//button[@aria-label='Shapes: hidden']");
  check('and shown again', (await shapeGroups()) === 3);
  const picture = async () => (await d.findElements(By.css('svg.floor-canvas image'))).length;
  await click(d, "//button[@aria-label='Floor plan picture: shown']");
  const pictureOpacity = await d.executeScript(`return document.querySelector('svg.floor-canvas image')?.getAttribute('opacity')`);
  check('the picture of the plan can be faded', pictureOpacity === '0.28', String(pictureOpacity));
  await click(d, "//button[@aria-label='Floor plan picture: faded']");
  check('and hidden: the plan is a blank sheet with the outlets and shapes on it', (await picture()) === 0 && (await shapeGroups()) === 3);
  await click(d, "//button[@aria-label='Floor plan picture: hidden']");
  check('and shown again', (await picture()) === 1);
  writeFileSync(`${OUT}/floor-shapes.png`, await d.takeScreenshot(), 'base64');

  // data outlets: one cable per port, never chained
  await setCount(2);
  await click(d, "//button[contains(@class,'kind')][contains(., 'Network outlet')]");
  await clickPlan(d, 300, 700);
  await click(d, "//button[contains(@title, 'Connect outlets with a cable')]");
  await clickPlan(d, 300, 700);
  await clickPlan(d, 900, 500);
  st = await state(d);
  const net = st.floorPlans[0].circuits.find((c) => c.medium === 'network' && c.nodes.some((n) => n.point && st.floorPlans[0].points.find((p) => p.id === n.point)?.x === 300 && st.floorPlans[0].points.find((p) => p.id === n.point)?.y === 700));
  const ports = st.panels.find((p) => p.id === second.panelId).items.filter((i) => i.link?.circuit === net?.id);
  check('a double network outlet brings two cables to the panel', ports.length === 2 && ports.every((p) => p.defId === 'floor_port'), ports.map((p) => p.description).join(', '));
  const text = await d.findElement(By.css('.props')).getText();
  check('its circuit cannot be chained', /one cable per port/i.test(text) && (await d.findElements(By.xpath("//option[contains(., 'Chain')]"))).length === 0);
  writeFileSync(`${OUT}/floor-counts.png`, await d.takeScreenshot(), 'base64');
  // the network cables of that panel are wired into a keystone patch panel
  await click(d, "//span[contains(@class,'view-switch')]//button[contains(., 'Panel')]");
  await click(d, "//div[contains(@class,'panel-row')][contains(., 'Panel 3')]");
  await d.executeScript("document.querySelector('.canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await click(d, "//label[contains(., 'Keystone panel bottom')]//input");
  st = await state(d);
  const p3 = st.panels.find((p) => p.name === 'Panel 3');
  const patch = p3.items.find((i) => i.defId === 'keystone');
  check('a keystone panel is added along the bottom of the panel', !!patch && patch.bar?.edge === 'bottom' && patch.params.rows === 2 && patch.params.cols === 12, JSON.stringify(patch?.params));
  const jacks = await d.executeScript(`return document.querySelectorAll('.canvas [data-hit^="t:${patch.id}|"]').length`);
  check('it has two connection points (floor plan and device) for every row and column', jacks === 48, String(jacks));
  await click(d, "//label[contains(., 'Keystone panel bottom')]//button[contains(., 'edit')]");
  await click(d, "//button[contains(., 'Wire floor plan cables to free jacks')]");
  st = await state(d);
  const wiredToPatch = st.panels.find((p) => p.name === 'Panel 3').wires.filter((w) => w.to.item === patch.id);
  check('the network ports from the floor plan are wired into the patch panel', wiredToPatch.length === 2 && wiredToPatch.every((w) => w.color === 'blue'), wiredToPatch.map((w) => w.to.terminal).join());
  writeFileSync(`${OUT}/panel-patch.png`, await d.takeScreenshot(), 'base64');
} finally {
  await d.quit();
}

// phone layout
const mo = new firefox.Options().addArguments('-headless').windowSize({ width: 390, height: 844 });
mo.setPreference('general.useragent.override', IPHONE);
const m = await new Builder().forBrowser('firefox').setFirefoxOptions(mo).build();
try {
  await m.get(BASE);
  await m.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', readFileSync(join(ROOT, 'src/assets/examples/house-floorplan.ec'), 'utf8'));
  await m.get(BASE);
  await m.navigate().refresh();
  await m.wait(until.elementLocated(By.css('.m-app')), 15000);
  await click(m, "//button[@aria-label='Menu']");
  await click(m, "//button[contains(@class,'m-menu-item')][contains(., 'Floor plan')]");
  await m.wait(until.elementLocated(By.css('svg.floor-canvas')), 5000);
  await sleep(800);
  check('the phone layout shows the floor plan with its tools', (await m.findElements(By.css('.m-tools .tool'))).length >= 6);
  writeFileSync(`${OUT}/floor-mobile.png`, await m.takeScreenshot(), 'base64');
  await click(m, "//nav[contains(@class,'m-nav')]//button[contains(., 'Add')]");
  check('the outlet palette opens in a sheet', (await m.findElements(By.css('.sheet .floor-palette, .sheet .kind'))).length > 0);
  const overflow = await m.executeScript('return document.documentElement.scrollWidth > window.innerWidth + 1');
  check('nothing overflows the phone screen', overflow === false);
} finally {
  await m.quit();
}
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
