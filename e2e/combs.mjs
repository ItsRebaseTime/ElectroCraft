// Comb bars across neighbouring breakers and row connectors between rails.
// Run `npm run build && npx vite preview --port 4173` first. Needs selenium-webdriver and Firefox.
import { Builder, By, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { SAMPLE_HOUSE } from './fixtures.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173/';
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  - ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async (d) => (await sleep(900), JSON.parse(await d.executeScript("return localStorage.getItem('electrocraft.autosave')")));

const o = new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 950 });
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(o).build();
try {
  await d.get(BASE);
  await d.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', SAMPLE_HOUSE);
  await d.get(BASE);
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await sleep(600);
  let st = await state(d);
  const panel = st.panels[0];
  const mcbs = panel.items.filter((i) => i.defId === 'mcb' && i.railId === panel.items.find((x) => x.defId === 'mcb').railId);
  check('the sample board has breakers on one rail', mcbs.length >= 2, String(mcbs.length));
  // select the first two with Shift (synthetic events: the driver does not deliver modifiers)
  const press = (id, shift) => d.executeScript(`
    const el = document.querySelector('.canvas g[data-hit="i:${id}"]'); const r = el.getBoundingClientRect();
    const init = { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 7, button: 0, shiftKey: ${shift}, pointerType: 'mouse' };
    el.dispatchEvent(new PointerEvent('pointerdown', init)); el.dispatchEvent(new PointerEvent('pointerup', init));`);
  await press(mcbs[0].id, false);
  await press(mcbs[1].id, true);
  await sleep(400);
  const entry = (name) => By.xpath(`//div[contains(@class,'palette')]//div[contains(concat(' ',normalize-space(@class),' '),' entry ')][.//span[contains(@class,'entry-name')][text()='${name}']]`);
  const nGroup = (await d.findElements(By.xpath("//div[contains(@class,'palette')]//button[contains(., 'Connectors')]"))).length;
  const nComb = (await d.findElements(entry('Comb bar 3P'))).length;
  const nRow = (await d.findElements(entry('Row connector 2P'))).length;
  check('the equipment list has a Connectors group with the built-in parts', nGroup === 1 && nComb === 1 && nRow === 1, `${nGroup} ${nComb} ${nRow}`);
  await (await d.findElement(entry('Comb bar 3P'))).click();
  st = await state(d);
  const combs = st.panels[0].combs ?? [];
  check('a three phase comb bar is added across the selected devices', combs.length === 1 && combs[0].phases === 3 && combs[0].def === 'comb-3p' && combs[0].modules >= 2, JSON.stringify(combs));
  const drawn = await d.executeScript("return document.querySelectorAll('.canvas g[data-hit^=\"c:\"]').length");
  check('the comb bar is drawn', drawn === 1);
  check('the comb bar is selected with its properties', (await d.findElements(By.xpath("//h3[contains(., 'Comb bar')]"))).length >= 1);
  // drag the comb bar along the rail (synthetic pointer events: the driver does not hold the pointer over svg)
  const drag = (sel, dxModules, pxPerModule) => d.executeScript(`
    const el = document.querySelector(${JSON.stringify(sel)}); const r = el.getBoundingClientRect(); const svg = document.querySelector('.canvas');
    const x = r.x + Math.min(6, r.width / 2), y = r.y + r.height / 2;
    const ev = (t, cx) => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: cx, clientY: y, pointerId: 21, button: 0, pointerType: 'mouse' });
    el.dispatchEvent(ev('pointerdown', x));
    for (let i = 1; i <= 4; i++) svg.dispatchEvent(ev('pointermove', x + (${dxModules} * ${pxPerModule} * i) / 4));
    svg.dispatchEvent(ev('pointerup', x + ${dxModules} * ${pxPerModule}));`);
  const combRect = await d.executeScript('const r = document.querySelector(\'.canvas g[data-hit^="c:"] rect\').getBoundingClientRect(); return r.width;');
  const pxMod = combRect / st.panels[0].combs[0].modules;
  const slot0 = st.panels[0].combs[0].slot;
  await drag('.canvas g[data-hit^="c:"] rect', 2, pxMod);
  st = await state(d);
  check('a comb bar can be dragged along the rail', st.panels[0].combs[0].slot === slot0 + 2, `${slot0} -> ${st.panels[0].combs[0].slot}`);
  await d.executeScript("document.querySelector('.canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))");
  st = await state(d);
  check('the move is one undo step', st.panels[0].combs[0].slot === slot0, String(st.panels[0].combs[0].slot));
  await d.executeScript('const el = document.querySelector(\'.canvas g[data-hit^="c:"] rect\'); const r = el.getBoundingClientRect(); const init = { bubbles: true, cancelable: true, clientX: r.x + 5, clientY: r.y + r.height / 2, pointerId: 22, button: 0, pointerType: \'mouse\' }; el.dispatchEvent(new PointerEvent(\'pointerdown\', init)); el.dispatchEvent(new PointerEvent(\'pointerup\', init));');
  await sleep(300);
  // change to one phase, then delete
  const sel = await d.findElement(By.xpath("//label[.//span[contains(., 'Phases')]]//select | //select[option[contains(., 'one conductor')]]"));
  await sel.sendKeys('1');
  st = await state(d);
  check('the phases can be changed', st.panels[0].combs[0].phases === 1, JSON.stringify(st.panels[0].combs));
  await (await d.findElement(By.xpath("//button[contains(., 'Delete comb bar')]"))).click();
  st = await state(d);
  check('the comb bar can be deleted', !st.panels[0].combs);
  // a row connector from a device on a rail that has another rail below
  const rails = st.panels[0].rails.map((r) => r.id);
  const upper = st.panels[0].items.find((i) => ['mcb', 'rcbo', 'rcd', 'isolator'].includes(i.defId) && rails.indexOf(i.railId) >= 0 && rails.indexOf(i.railId) < rails.length - 1);
  check('the sample board has a breaker or RCD with a rail below', !!upper);
  await press(upper.id, false);
  await sleep(400);
  await (await d.findElement(entry('Row connector 2P'))).click();
  st = await state(d);
  const links = st.panels[0].rowLinks ?? [];
  check('a row connector with two contacts is added', links.length === 1 && links[0].count === 2 && links[0].def === 'row-2p' && links[0].railId === upper.railId, JSON.stringify(links));
  check('the row connector is drawn and selected', (await d.executeScript("return document.querySelectorAll('.canvas g[data-hit^=\"k:\"]').length")) === 1 && (await d.findElements(By.xpath("//h3[contains(., 'Row connector')]"))).length >= 1);
  // a second one over the first is refused
  await press(upper.id, false);
  await sleep(300);
  await (await d.findElement(entry('Row connector 3P'))).click();
  st = await state(d);
  check('a row connector cannot be placed over another one', (st.panels[0].rowLinks ?? []).length === 1 && (await d.findElements(By.css('.toast.error'))).length >= 1);
  // like a wire, a row connector lies below the devices until it is selected
  await d.executeScript("document.querySelector('.canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await sleep(300);
  const below = await d.executeScript("const k = document.querySelector('.canvas g[data-hit^=\"k:\"]'); const i = document.querySelector('.canvas g[data-hit^=\"i:\"]'); return !!(k.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING);");
  check('an unselected row connector is drawn below the devices', below === true);
  await d.executeScript("const k = document.querySelector('.canvas g[data-hit^=\"k:\"] path[stroke=\"transparent\"]'); const r = k.getBoundingClientRect(); const init = { bubbles: true, cancelable: true, clientX: r.x + 5, clientY: r.y + r.height / 2, pointerId: 9, button: 0, pointerType: 'mouse' }; k.dispatchEvent(new PointerEvent('pointerdown', init)); k.dispatchEvent(new PointerEvent('pointerup', init));");
  await sleep(400);
  const above = await d.executeScript("const k = document.querySelector('.canvas g[data-hit^=\"k:\"]'); const i = document.querySelector('.canvas g[data-hit^=\"i:\"]'); return !!(k.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_PRECEDING);");
  check('a selected row connector is drawn over the devices', above === true);
  // drag the row connector three columns to the right
  const linkSlot0 = st.panels[0].rowLinks[0].slot;
  await drag('.canvas g[data-hit^="k:"] path[stroke="transparent"]', 3, pxMod);
  st = await state(d);
  check('a row connector can be dragged to other columns', st.panels[0].rowLinks[0].slot === linkSlot0 + 3, `${linkSlot0} -> ${st.panels[0].rowLinks[0].slot}`);
  await (await d.findElement(By.xpath("//button[contains(., 'Delete row connector')]"))).click();
  st = await state(d);
  check('the row connector can be deleted', !st.panels[0].rowLinks);
  // with nothing selected a part waits for a click on a device
  await d.executeScript("document.querySelector('.canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await sleep(300);
  await (await d.findElement(entry('Comb bar 1P'))).click();
  check('picking a part with nothing selected asks for a click on a device', (await d.findElements(By.xpath("//div[contains(@class,'hint')][contains(., 'Click a device on a rail')]"))).length === 1);
  await press(mcbs[0].id, false);
  st = await state(d);
  check('the click places it on that device', (st.panels[0].combs ?? []).length === 1 && st.panels[0].combs[0].def === 'comb-1p' && st.panels[0].combs[0].slot === (mcbs[0].slot ?? 0), JSON.stringify(st.panels[0].combs));
  // a custom variation: clone, change, save
  await (await d.findElement(By.css('button[aria-label="Clone Comb bar 3P"]'))).click();
  await d.wait(until.elementLocated(By.css('.connector-editor')), 3000);
  const nameInput = await d.findElement(By.css('input[aria-label="Connector name"]'));
  await nameInput.clear();
  await nameInput.sendKeys('Long comb');
  const len = await d.findElement(By.css('input[aria-label="Comb length"]'));
  await d.executeScript("const e = arguments[0]; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(e, '12'); e.dispatchEvent(new Event('input', { bubbles: true }));", len);
  await (await d.findElement(By.xpath("//div[contains(@class,'connector-editor')]//button[text()='Save']"))).click();
  await sleep(400);
  st = await state(d);
  check('a cloned connector is saved in the project with its changes', st.connectors?.length === 1 && st.connectors[0].name === 'Long comb' && st.connectors[0].length === 12 && st.connectors[0].phases === 3, JSON.stringify(st.connectors));
  check('the new part is listed with edit and delete', (await d.findElements(entry('Long comb'))).length === 1 && (await d.findElements(By.css('button[aria-label="Edit Long comb"]'))).length === 1);
  await (await d.findElement(By.css('button[aria-label="Delete Long comb"]'))).click();
  await (await d.findElement(By.xpath("//div[contains(@class,'modal')]//button[contains(@class,'primary')]"))).click();
  await sleep(500);
  st = await state(d);
  check('a custom connector can be deleted', !(st.connectors ?? []).length);
  // drag a part out of the list and drop it near a breaker: it snaps to the device
  await d.executeScript("document.querySelector('.canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await sleep(300);
  const before = (await state(d)).panels[0].rowLinks?.length ?? 0;
  const dragOver = (partName, deviceId, dx) => d.executeScript(`
    const entry = Array.from(document.querySelectorAll('.palette-list .entry')).find((e) => e.querySelector('.entry-name')?.textContent === '${partName}');
    const dev = document.querySelector('.canvas g[data-hit="i:${deviceId}"]').getBoundingClientRect();
    const dt = new DataTransfer();
    const at = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: dev.x + dev.width / 2 + ${dx}, clientY: dev.y + dev.height / 2 };
    entry.dispatchEvent(new DragEvent('dragstart', at));
    document.querySelector('.editor').dispatchEvent(new DragEvent('dragover', at));
    window.__drag = { entry, at };`);
  const dropIt = () => d.executeScript(`
    const { entry, at } = window.__drag;
    document.querySelector('.editor').dispatchEvent(new DragEvent('drop', at));
    entry.dispatchEvent(new DragEvent('dragend', at));`);
  const dnd = async (partName, deviceId, dx) => { await dragOver(partName, deviceId, dx); await sleep(300); const hint = await d.executeScript("return document.querySelectorAll('.canvas rect[fill=\"#2563eb\"]').length"); await dropIt(); return hint; };
  const hint = await dnd('Row connector 3P', upper.id, 6);
  await sleep(500);
  st = await state(d);
  const dropped = st.panels[0].rowLinks ?? [];
  check('dropping a row connector on a device places it there', dropped.length === before + 1 && dropped[dropped.length - 1].railId === upper.railId && dropped[dropped.length - 1].count === 3, JSON.stringify(dropped));
  check('the device it would snap to was highlighted while dragging', hint === 1);
  const combsBefore = (st.panels[0].combs ?? []).length;
  await dnd('Comb bar 2P', mcbs[1].id, 4);
  await sleep(500);
  st = await state(d);
  const cs = st.panels[0].combs ?? [];
  check('dropping a comb bar snaps it to the device under the pointer', cs.length === combsBefore + 1 && cs[cs.length - 1].slot === (mcbs[1].slot ?? 0) && cs[cs.length - 1].phases === 2, JSON.stringify(cs[cs.length - 1]));
  // Ctrl+C and Ctrl+V: the copy goes to the free place on a rail closest to the pointer
  await d.executeScript("document.querySelector('.canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await sleep(300);
  await press(mcbs[0].id, false);
  await sleep(300);
  const key = (k) => d.executeScript(`document.querySelector('.canvas').dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', ctrlKey: true, bubbles: true }))`);
  await key('c');
  const nItems = (await state(d)).panels[0].items.length;
  // the pointer over the right end of the rail of the copied breaker
  const spot = await d.executeScript(`const el = document.querySelector('.canvas g[data-hit^="r:${mcbs[0].railId}"]'); const r = el.getBoundingClientRect(); const svg = document.querySelector('.canvas'); const init = { bubbles: true, clientX: r.x + r.width * 0.8, clientY: r.y + r.height / 2, pointerId: 11, pointerType: 'mouse' }; svg.dispatchEvent(new PointerEvent('pointermove', init)); return [r.x, r.width];`);
  await sleep(200);
  await key('v');
  st = await state(d);
  const added = st.panels[0].items.slice(nItems === st.panels[0].items.length ? 0 : nItems);
  const copy = st.panels[0].items[st.panels[0].items.length - 1];
  check('Ctrl+C then Ctrl+V adds a copy of the device', st.panels[0].items.length === nItems + 1 && copy.defId === mcbs[0].defId && JSON.stringify(copy.params) === JSON.stringify(mcbs[0].params) && copy.id !== mcbs[0].id, `${nItems} -> ${st.panels[0].items.length}`);
  const railLen = st.panels[0].rails.find((r) => r.id === mcbs[0].railId).modules;
  check('the copy is on the rail near the pointer, at the free place closest to it', copy.railId === mcbs[0].railId && copy.slot > (mcbs[0].slot ?? 0) + 3 && copy.slot <= railLen, `slot ${copy.slot} of ${railLen}`);
  void added;
} finally {
  await d.quit();
}
const ok = results.filter(Boolean).length;
console.log(`\n${ok}/${results.length} checks passed`);
process.exit(ok === results.length ? 0 : 1);
