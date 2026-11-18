import { Builder, By, Key, until, Select } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
const URL = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.E2E_OUT ?? `${tmpdir()}/electrocraft-e2e/out`;
mkdirSync(OUT, { recursive: true });
const opts = new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 950 });
const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(opts).build();
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  - ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async () => JSON.parse(await driver.executeScript("return localStorage.getItem('electrocraft.autosave')"));
const panel = async () => (await state()).panels[0];
const settle = () => sleep(900);
const css = (s) => driver.findElement(By.css(s));
const all = (s) => driver.findElements(By.css(s));
const shot = async (n) => writeFileSync(`${OUT}/${n}.png`, await driver.takeScreenshot(), 'base64');
const ctrl = (k, shift = false) => { const a = driver.actions({ async: true }).keyDown(Key.CONTROL); if (shift) a.keyDown(Key.SHIFT); a.sendKeys(k); if (shift) a.keyUp(Key.SHIFT); return a.keyUp(Key.CONTROL).perform(); };
const itemIds = async () => Promise.all((await all('.canvas g[data-hit^="i:"]')).slice(0, 13).map((e) => e.getAttribute('data-hit').then((v) => v.slice(2))));
const term = (id, t) => css(`circle[data-hit="t:${id}|${t}"]`);
try {
  await driver.get(URL);
  await driver.executeScript('localStorage.clear()');
  await driver.get(URL);
  await driver.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 10000);
  await sleep(500);
  const [supply, main, spd, rcd, m1, m2, m3, pilot] = await itemIds();
  const click = async (el) => driver.actions({ async: true }).move({ origin: el }).click().perform();

  // undo / redo of a property change
  await click((await all(`g[data-hit="i:${m1}"]`))[0]);
  const desc = await css('.props input[placeholder="e.g. Kitchen sockets"]');
  await desc.sendKeys(Key.END, ...Array(12).fill(Key.BACK_SPACE), 'Hallway lights', Key.ENTER);
  await settle();
  check('description change stored', (await panel()).items.find((i) => i.id === m1).description === 'Hallway lights');
  await driver.actions({ async: true }).move({ x: 1260, y: 520 }).click().perform(); // empty canvas: blur + deselect
  await ctrl('z'); await settle();
  check('Ctrl+Z reverts the change', (await panel()).items.find((i) => i.id === m1).description === 'Lighting');
  await ctrl('z', true); await settle();
  check('Ctrl+Shift+Z redoes it', (await panel()).items.find((i) => i.id === m1).description === 'Hallway lights');

  // pole config growth where space exists: RCD on rail 2 (slot 0, room to the right) 2P -> 4P
  await click((await all(`g[data-hit="i:${rcd}"]`))[0]);
  const sel = await driver.findElement(By.xpath("//label[.//span[text()='Poles / phases']]//select"));
  await new Select(sel).selectByValue('4P'); await settle();
  const r = (await panel()).items.find((i) => i.id === rcd);
  check('RCD grows from 2P to 4P when the rail has room', r.poleConfig === '4P');
  const wires = (await panel()).wires;
  check('existing wires to the first two poles are kept', wires.filter((w) => w.from.item === rcd || w.to.item === rcd).length >= 4);
  await shot('10-rcd-4p');
  // shrinking removes wires that used removed poles (none here) and keeps others
  await new Select(await driver.findElement(By.xpath("//label[.//span[text()='Poles / phases']]//select"))).selectByValue('2P'); await settle();
  check('and shrinks back to 2P', (await panel()).items.find((i) => i.id === rcd).poleConfig === '2P');

  // arrow-key nudge of a device (move spd one module right)
  const slotBefore = (await panel()).items.find((i) => i.id === spd).slot;
  await click((await all(`g[data-hit="i:${spd}"]`))[0]);
  await driver.actions({ async: true }).sendKeys(Key.ARROW_RIGHT).sendKeys(Key.ARROW_RIGHT).perform(); await settle();
  const slotAfter = (await panel()).items.find((i) => i.id === spd).slot;
  check('arrow keys nudge a device by half modules', slotAfter === slotBefore + 1, `${slotBefore} -> ${slotAfter}`);

  // wire tool: click terminal, click empty space twice (bends), click target terminal
  await css('button[title^="Wire tool"]').click();
  const n0 = (await panel()).wires.length;
  const from = await term(m1, 'B0');
  await click(from); await sleep(200);
  const hint = await css('.hint').getText();
  check('wire tool enters click-click mode and shows a hint', /bend/.test(hint), hint);
  const fr = await from.getRect();
  // two bend points in empty space to the right of the panel enclosure, then the target terminal
  await driver.actions({ async: true }).move({ x: Math.round(fr.x + 90), y: Math.round(fr.y + 60) }).click().perform(); await sleep(150);
  await driver.actions({ async: true }).move({ x: Math.round(fr.x + 90), y: Math.round(fr.y + 150) }).click().perform(); await sleep(150);
  await click(await term(m2, 'B0')); await settle();
  const pw = await panel();
  const nw = pw.wires[pw.wires.length - 1];
  check('click-click wiring with bends creates an orthogonal manual wire', pw.wires.length === n0 + 1 && Array.isArray(nw.nodes) && nw.nodes.length >= 2 && nw.nodes.slice(1).every((p, i) => Math.min(Math.abs(p.x - nw.nodes[i].x), Math.abs(p.y - nw.nodes[i].y)) < 1e-6), `nodes ${JSON.stringify(nw.nodes)}`);
  await shot('11-bend-wire');

  // double-click node removes it; double-click wire adds one
  await css('button[title^="Select"]').click();
  const nodeEl = (await all('circle[data-hit^="n:"]'))[0];
  await driver.actions({ async: true }).move({ origin: nodeEl }).doubleClick().perform(); await settle();
  const after = (await panel()).wires.find((w) => w.id === nw.id);
  check('double-clicking a bend point removes it', (after.nodes?.length ?? 0) === nw.nodes.length - 1, `nodes ${nw.nodes.length} -> ${after.nodes?.length ?? 'auto'}`);

  // Esc cancels a wire in progress
  await click(await term(m3, 'B0')); await sleep(150);
  await driver.actions({ async: true }).sendKeys(Key.ESCAPE).perform(); await sleep(150);
  check('Esc cancels a wire being drawn', !/Click a terminal to finish/.test(await css('.hint').getText()));

  // keyboard delete device removes it and its wires
  const wBefore = (await panel()).wires.length;
  await click((await all(`g[data-hit="i:${pilot}"]`))[0]);
  await driver.actions({ async: true }).sendKeys(Key.DELETE).perform(); await settle();
  const pd = await panel();
  check('Delete removes the device and its wires', !pd.items.some((i) => i.id === pilot) && pd.wires.length < wBefore, `${wBefore} -> ${pd.wires.length} wires`);

  // rail length edit via properties (click empty canvas -> panel props)
  await driver.actions({ async: true }).move({ x: 1260, y: 520 }).click().perform();
  const rail1 = await css('.rail-row input');
  await rail1.sendKeys(Key.END, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, '16', Key.ENTER); await settle();
  check('rail length can be changed', (await panel()).rails[0].modules === 16);
  // shrinking below the devices is refused
  await rail1.sendKeys(Key.END, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, '3', Key.ENTER); await sleep(500);
  check('shrinking a rail below its devices is refused', (await panel()).rails[0].modules === 16 && (await all('.toast')).length === 1);

  // phases: change supply to 3 phases shows L2/L3 terminals
  await click((await all(`g[data-hit="i:${supply}"]`))[0]);
  const ph = await driver.findElement(By.xpath("//label[.//span[text()='Phases']]//select"));
  await new Select(ph).selectByVisibleText('3 phases'); await settle();
  const sup = (await panel()).items.find((i) => i.id === supply);
  check('supply phase count is adjustable', Number(sup.params.phases) === 3);
  check('3-phase supply exposes L2 and L3 terminals', (await all(`circle[data-hit="t:${supply}|L3"]`)).length === 1);
  await shot('12-supply-3ph');
} catch (e) { console.log('ERROR', e); await shot('error').catch(() => {}); results.push(false); }
finally { await driver.quit(); const f = results.filter((x) => !x).length; console.log(`\n${results.length - f}/${results.length} checks passed`); process.exit(f ? 1 : 0); }
