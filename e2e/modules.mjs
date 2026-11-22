// Custom module designer: design, draw, save into the project, place, export/import. Desktop and phone.
import { Builder, By, until, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { SAMPLE_HOUSE } from './fixtures.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.E2E_OUT ?? `${tmpdir()}/electrocraft-e2e/out`;
const DL = `${tmpdir()}/electrocraft-e2e/dl-modules`;
rmSync(DL, { recursive: true, force: true });
mkdirSync(DL, { recursive: true });
mkdirSync(OUT, { recursive: true });
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  - ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const build = (w, h, ua) => {
  const o = new firefox.Options().addArguments('-headless').windowSize({ width: w, height: h });
  if (ua) o.setPreference('general.useragent.override', ua);
  o.setPreference('browser.download.folderList', 2);
  o.setPreference('browser.download.dir', DL);
  o.setPreference('browser.helperApps.neverAsk.saveToDisk', 'application/json');
  return new Builder().forBrowser('firefox').setFirefoxOptions(o).build();
};
const state = async (d) => JSON.parse(await d.executeScript("return localStorage.getItem('electrocraft.autosave')"));
const field = (d, label) => d.findElement(By.xpath(`//div[contains(@class,'module-editor')]//label[contains(@class,'field')][.//span[normalize-space()='${label}']]//input[not(@type='color')]`));
const setNum = async (d, el, v) => { await el.sendKeys(Key.END, ...Array(6).fill(Key.BACK_SPACE), String(v), Key.ENTER); await sleep(150); };
const dragOn = async (d, el, x0, y0, x1, y1) => {
  const r = await el.getRect();
  await d.actions({ async: true }).move({ x: Math.round(r.x + x0), y: Math.round(r.y + y0) }).press().move({ x: Math.round(r.x + (x0 + x1) / 2), y: Math.round(r.y + (y0 + y1) / 2) }).move({ x: Math.round(r.x + x1), y: Math.round(r.y + y1) }).release().perform();
};

let d = await build(1600, 1000);
try {
  await d.get(BASE + '?e2e');
  await d.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', SAMPLE_HOUSE);
  await d.get(BASE + '?e2e');
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await sleep(500);

  // ---- open the designer from the Modules menu
  await d.findElement(By.xpath("//button[contains(., 'Modules')]")).click();
  await d.findElement(By.xpath("//button[contains(., 'Design a new module')]")).click();
  await d.wait(until.elementLocated(By.css('.module-editor')), 3000);
  check('Modules menu opens the module designer', true);

  // ---- settings
  const name = await d.findElement(By.xpath("//div[contains(@class,'module-editor')]//label[contains(@class,'field')][.//span[normalize-space()='Name']]//input"));
  await name.sendKeys(Key.END, ...Array(12).fill(Key.BACK_SPACE), 'Distribution block', Key.ENTER);
  await setNum(d, await field(d, 'Width'), 3);
  await setNum(d, await field(d, 'Current'), 63);
  await setNum(d, await field(d, 'Voltage'), 400);
  const sideInputs = await d.findElements(By.css('.sides fieldset input[type=number]')); // top rows, top cols, bottom rows, bottom cols
  await setNum(d, sideInputs[1], 4); // top: 4 columns
  await setNum(d, sideInputs[0], 2); // top: 2 rows
  await setNum(d, sideInputs[3], 2); // bottom: 2 columns (different from top)
  await sleep(300);
  const rows = await d.findElements(By.css('.term-row'));
  check('top and bottom connection counts can differ (2x4 top + 1x2 bottom = 10 terminals)', rows.length === 10, `${rows.length} terminals`);
  const firstLabel = await d.findElement(By.css('.term-row input'));
  await firstLabel.sendKeys(Key.END, Key.BACK_SPACE, Key.BACK_SPACE, 'L1', Key.ENTER);
  await sleep(200);
  check('connection markings are editable', (await firstLabel.getAttribute('value')) === 'L1');

  // ---- draw a rectangle, a circle and a text label
  const canvas = await d.findElement(By.css('.mod-canvas'));
  const cr = await canvas.getRect();
  await d.findElement(By.css('.me-tools button[title="Draw a rectangle"]')).click();
  await dragOn(d, canvas, cr.width * 0.25, cr.height * 0.4, cr.width * 0.6, cr.height * 0.55);
  await d.findElement(By.css('.me-tools button[title="Draw a circle"]')).click();
  await dragOn(d, canvas, cr.width * 0.5, cr.height * 0.7, cr.width * 0.58, cr.height * 0.7);
  await d.findElement(By.css('.me-tools button[title="Add text"]')).click();
  await d.actions({ async: true }).move({ x: Math.round(cr.x + cr.width * 0.5), y: Math.round(cr.y + cr.height * 0.3) }).click().perform();
  await sleep(300);
  const shapeRows = await d.findElements(By.css('.shape-row'));
  check('rectangle, circle and text can be drawn on the module', shapeRows.length === 4 /* default rating text + 3 */, `${shapeRows.length} shapes`);
  const types = await Promise.all(shapeRows.map((r) => r.getText()));
  check('shapes are listed by type', types.some((t) => /Rectangle/.test(t)) && types.some((t) => /Circle/.test(t)));
  // text can be rotated: the rating text, turned by the buttons and by typing the angle
  await shapeRows[0].click();
  await sleep(200);
  await (await d.findElement(By.css('button[aria-label="Rotate text 90 degrees clockwise"]'))).click();
  await sleep(300);
  const turned = await d.executeScript("return Array.from(document.querySelectorAll('.mod-canvas text')).some((t) => /rotate\\(90 /.test(t.getAttribute('transform') || ''))");
  check('a text of the module can be rotated by 90 degrees', turned === true);
  await setNum(d, await field(d, 'Rotation'), 30);
  await sleep(300);
  check('the rotation can be typed in degrees', (await d.executeScript("return Array.from(document.querySelectorAll('.mod-canvas text')).some((t) => /rotate\\(30 /.test(t.getAttribute('transform') || ''))")) === true);
  await setNum(d, await field(d, 'Rotation'), 0);
  await sleep(200);
  // screw sizes and the box of the terminals
  const radius = () => d.executeScript("const c = document.querySelector('.mod-canvas circle[fill=\"#9aa4af\"]'); return c ? Number(c.getAttribute('r')) : 0;");
  const firstX = () => d.executeScript("return Array.from(document.querySelectorAll('.mod-canvas circle[fill=\"#9aa4af\"]')).map((c) => Number(c.getAttribute('cx')));");
  const pickSize = (v) => d.executeScript('const s = document.querySelector(arguments[0]); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; set.call(s, arguments[1]); s.dispatchEvent(new Event("change", { bubbles: true }));', 'select[aria-label="top row 1 screw size"]', v);
  const r0 = await radius();
  await pickSize('10');
  await sleep(300);
  const r1 = await radius();
  check('the screws of a row can be made for a conductor size (10 mm² is bigger)', r1 > r0 && Math.abs(r1 - 2.58) < 0.05, `${r0} -> ${r1}`);
  const xs0 = await firstX();
  await (await d.findElement(By.css('input[aria-label="top terminals in a box of their own"]'))).click();
  await sleep(300);
  const widthField = await field(d, 'Box width');
  await setNum(d, widthField, 8);
  await sleep(300);
  const xs1 = await firstX();
  check('the terminals can be put in a box of their own, with its own width', xs1.length === xs0.length && Math.max(...xs1) < Math.max(...xs0) && Math.max(...xs1) <= 8.01, `${xs0.slice(0, 3)} -> ${xs1.slice(0, 3)}`);
  check('the box is drawn as a guide in the designer', (await d.executeScript('return document.querySelectorAll(\'.mod-canvas rect[stroke-dasharray="1.4 1"]\').length')) === 1);
  await d.findElement(By.css('input[aria-label="top terminals in a box of their own"]')).then((e) => e.click());
  await pickSize('0');
  await sleep(300);
  // visibility rule on the selected (last) shape
  await new (await import('selenium-webdriver')).Select(await d.findElement(By.xpath("//label[contains(@class,'field')][.//span[normalize-space()='Visible when']]//select"))).selectByVisibleText('Switch on');
  await sleep(200);
  check('a shape can be bound to the switch state (layers)', /Switch on/.test(await d.findElement(By.css('.shape-row.sel')).getText()));
  // ---- internal switches: one NO and one NC contact, each joining its own terminals
  await d.findElement(By.xpath("//div[contains(@class,'module-editor')]//button[contains(., 'Add switch')]")).click();
  await d.findElement(By.xpath("//div[contains(@class,'module-editor')]//button[contains(., 'Add switch')]")).click();
  await sleep(300);
  let cards = await d.findElements(By.css('.sw-card'));
  check('switches can be added to a module', cards.length === 2, `${cards.length} switches`);
  cards = await d.findElements(By.css('.sw-card'));
  const no0 = await cards[0].findElements(By.css('.sw-contact.no .sw-term input'));
  const nc1 = await cards[1].findElements(By.css('.sw-contact.nc .sw-term input'));
  await no0[0].click(); await no0[8].click();   // first switch: NO contact joins terminal 1 and the first bottom one
  await nc1[1].click(); await nc1[9].click();   // second switch: NC contact joins terminal 2 and the second bottom one
  await sleep(300);
  check('each switch has separate NO and NC terminal lists', no0.length === 10 && (await no0[0].isSelected()) && (await no0[8].isSelected()) && !(await no0[1].isSelected()) && (await nc1[1].isSelected()));
  check('a switch with only an NO contact is labelled NO, only NC is NC', /NO/.test(await cards[0].findElement(By.css('.badge')).getText()) && /NC/.test(await cards[1].findElement(By.css('.badge')).getText()));
  // give the first switch an NC contact too: it becomes a changeover (CO)
  const nc0 = await cards[0].findElements(By.css('.sw-contact.nc .sw-term input'));
  await nc0[0].click(); await nc0[9].click();
  await sleep(200);
  check('a switch with both contacts is a changeover (CO)', /CO/.test(await cards[0].findElement(By.css('.badge')).getText()));
  await nc0[0].click(); await nc0[9].click(); // back to NO only
  const swShape = await d.findElements(By.css('.mod-canvas g[data-switch]'));
  check('switch widgets are drawn on the module face', swShape.length === 2, `${swShape.length} widgets`);
  // hide the first switch: no widget, but it stays in the list and can still drive shapes
  await cards[0].findElement(By.css('.sw-vis input')).click();
  await sleep(300);
  check('a switch can be hidden from the module face', (await d.findElements(By.css('.mod-canvas g[data-switch]'))).length === 1);
  await cards[0].findElement(By.css('.sw-vis input')).click();
  await sleep(300);
  check('and shown again', (await d.findElements(By.css('.mod-canvas g[data-switch]'))).length === 2);
  // a shape can follow a switch
  const rows2 = await d.findElements(By.css('.shape-row'));
  await rows2[0].click();
  const showOpts = await d.findElements(By.xpath("//label[contains(@class,'field')][.//span[normalize-space()='Visible when']]//option"));
  check('shapes can be made visible by switch state', (await Promise.all(showOpts.map((o) => o.getText()))).some((t) => /S2: contact closed/.test(t)), `${showOpts.length} options`);
  // ---- an input (coil) that toggles the first switch
  await d.findElement(By.xpath("//div[contains(@class,'module-editor')]//button[contains(., 'Add input')]")).click();
  await sleep(300);
  const inputCard = (await d.findElements(By.css('.input-card')))[0];
  const SelectCls = (await import('selenium-webdriver')).Select;
  await new SelectCls(await inputCard.findElement(By.css('select[aria-label="Input mode"]'))).selectByValue('toggle');
  await new SelectCls(await inputCard.findElement(By.css('select[aria-label="Return terminal"]'))).selectByIndex(1);
  const targetBoxes = await inputCard.findElements(By.css('.sw-terms input'));
  check('an input lists the module switches it can operate (the first one is mapped by default)', targetBoxes.length === 2 && (await targetBoxes[0].isSelected()) && !(await targetBoxes[1].isSelected()));
  await targetBoxes[1].click();
  await sleep(200);
  const inShow = await d.findElements(By.xpath("//label[contains(@class,'field')][.//span[normalize-space()='Visible when']]//option"));
  check('shapes can follow an input being energised', (await Promise.all(inShow.map((o) => o.getText()))).some((t) => /Input IN1: energised/.test(t)));
  check('input terminals are ringed on the canvas', (await d.findElements(By.css('.mod-canvas circle[stroke="#2563eb"][fill="none"]'))).length >= 1);
  // switch + trip options
  await d.findElement(By.xpath("//label[contains(., 'Master on/off lever')]//input")).click();
  await d.findElement(By.xpath("//label[contains(., 'Trips on overload')]//input")).click();
  writeFileSync(`${OUT}/module-editor.png`, await d.takeScreenshot(), 'base64');

  // ---- save into the project and place it
  await d.findElement(By.xpath("//div[contains(@class,'module-editor')]//button[contains(., 'Save to project')]")).click();
  await sleep(900);
  let st = await state(d);
  check('the module is saved inside the project', st.modules.length === 1 && st.modules[0].name === 'Distribution block' && st.modules[0].shapes.length === 4, `modules=${st.modules.length}`);
  const entry = await d.findElement(By.xpath("//div[contains(@class,'entry')][.//span[text()='Distribution block']]"));
  check('it appears in the palette under Custom modules', !!entry);
  await entry.click();
  await sleep(900);
  st = await state(d);
  const placed = st.panels[0].items.filter((i) => i.defId === st.modules[0].id);
  check('the custom module can be placed on a rail', placed.length === 1 && placed[0].params.In === 63 && placed[0].params.Un === 400, JSON.stringify(placed[0]?.params));
  writeFileSync(`${OUT}/module-placed.png`, await d.takeScreenshot(), 'base64');

  // ---- the saved module keeps its switches, and a placed copy can flip them in simulation
  check('the module saved its switches with separate NO / NC terminals', st.modules[0].switches.length === 2 && st.modules[0].switches[0].no.length === 2 && st.modules[0].switches[0].nc.length === 0 && st.modules[0].switches[1].nc.length === 2 && st.modules[0].switches[1].no.length === 0 && st.modules[0].switches.every((x) => x.visible), JSON.stringify(st.modules[0].switches.map((x) => [x.no.length, x.nc.length, x.visible])));
  check('the item properties list both switches and the input', (await d.findElements(By.css('.sw-row'))).length === 3);
  check('the module saved its input with mode, return terminal and mapped switches', st.modules[0].inputs.length === 1 && st.modules[0].inputs[0].mode === 'toggle' && st.modules[0].inputs[0].ref !== '' && st.modules[0].inputs[0].targets.length === 2, JSON.stringify(st.modules[0].inputs[0]));
  await d.findElement(By.xpath("//button[contains(., 'Simulate')]")).click();
  await sleep(400);
  const widget = (await d.findElements(By.css('.canvas g[data-switch]')))[0];
  await d.actions({ async: true }).move({ origin: widget }).click().perform();
  await sleep(900);
  st = await state(d);
  const flipped = st.panels[0].items.find((i) => i.defId === st.modules[0].id);
  check('clicking a switch widget in simulation actuates just that switch', flipped.switchStates && Object.values(flipped.switchStates).filter(Boolean).length === 1, JSON.stringify(flipped.switchStates));
  await d.findElement(By.xpath("//button[contains(., 'Power on')]")).click();
  await sleep(300);

  // ---- export
  await d.findElement(By.xpath("//button[contains(., 'Modules')]")).click();
  await d.findElement(By.xpath("//button[contains(., 'Export modules')]")).click();
  await d.wait(until.elementLocated(By.css('.modal.small')), 3000);
  await d.findElement(By.css('.modal.small .primary')).click();
  await sleep(1500);
  const files = readdirSync(DL).filter((f) => f.endsWith('.ecm'));
  check('modules export to a .ecm file', files.length === 1, files.join(', '));
  const exported = files.length ? readFileSync(`${DL}/${files[0]}`, 'utf8') : '';
  check('the file is the documented module format', /"format": "electrocraft-modules"/.test(exported) && /Distribution block/.test(exported));

  // ---- import into a fresh project via the (test) hook, as the file picker would
  await d.findElement(By.css('button[title="New project"]')).click();
  await sleep(300);
  const confirm = await d.findElements(By.css('.modal.small .primary'));
  if (confirm.length) await confirm[0].click();
  await sleep(500);
  await d.executeScript('window.__ec.offerImport(arguments[0], "shared.ecm")', exported);
  await d.wait(until.elementLocated(By.css('.modal.small')), 3000);
  check('importing shows what is in the file', /Distribution block/.test(await d.findElement(By.css('.modal.small')).getText()));
  await d.findElement(By.css('.modal.small .primary')).click();
  await sleep(900);
  st = await state(d);
  check('imported modules join the project and show in the palette', st.modules.length === 1 && (await d.findElements(By.xpath("//div[contains(concat(' ',@class,' '),' entry ')][.//span[text()='Distribution block']]"))).length === 1);
  // edit again
  await d.findElement(By.css('button[aria-label="Edit Distribution block"]')).click();
  await d.wait(until.elementLocated(By.css('.module-editor')), 3000);
  check('an existing module can be reopened for editing with its design intact', (await d.findElements(By.css('.shape-row'))).length === 4);
  await d.findElement(By.xpath("//div[contains(@class,'module-editor')]//button[text()='Cancel']")).click();
} catch (e) { console.log('ERROR (desktop)', e); results.push(false); try { writeFileSync(`${OUT}/modules-error.png`, await d.takeScreenshot(), 'base64'); } catch {} }
finally { await d.quit(); }

// ---- the designer on a phone
d = await build(390, 844, IPHONE);
try {
  await d.get(BASE + '?e2e');
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await d.findElement(By.css('button[aria-label="Menu"]')).click();
  await d.findElement(By.xpath("//button[contains(., 'Design a new module')]")).click();
  await d.wait(until.elementLocated(By.css('.module-editor')), 3000);
  const body = await d.findElement(By.css('.me-body'));
  check('phone: designer opens on the Module tab, drawing area hidden', (await d.findElement(By.css('.me-left')).isDisplayed()) && !(await d.findElement(By.css('.me-center')).isDisplayed()));
  writeFileSync(`${OUT}/module-mobile-1.png`, await d.takeScreenshot(), 'base64');
  await d.findElement(By.xpath("//button[text()='Design']")).click();
  await sleep(300);
  check('phone: Design tab shows the canvas and shapes', await d.findElement(By.css('.mod-canvas')).isDisplayed());
  writeFileSync(`${OUT}/module-mobile-2.png`, await d.takeScreenshot(), 'base64');
  void body;
} catch (e) { console.log('ERROR (mobile)', e); results.push(false); }
finally { await d.quit(); }

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
