// The device designer: start from the MCB, change poles / parameters / artwork, save, place and simulate it.
// Run `npm run build && npx vite preview --port 4173` first. Needs selenium-webdriver and Firefox.
import { Builder, By, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const BASE = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.E2E_OUT ?? `${tmpdir()}/electrocraft-e2e/out`;
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  - ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async (d) => (await sleep(900), JSON.parse(await d.executeScript("return localStorage.getItem('electrocraft.autosave')")));
const click = async (d, xp) => { await (await d.findElement(By.xpath(xp))).click(); await sleep(400); };

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 950 })).build();
try {
  await d.get(BASE);
  await d.executeScript('localStorage.clear()');
  await d.get(BASE);
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await sleep(600);

  await click(d, "//button[contains(., 'Modules')]");
  await click(d, "//button[contains(., 'Design a new device')]");
  await d.wait(until.elementLocated(By.css('.module-editor')), 5000);
  await sleep(500);
  check('device designer opens with the MCB definition', (await d.findElements(By.css('svg.dev-preview g'))).length > 3);
  writeFileSync(`${OUT}/device-designer.png`, await d.takeScreenshot(), 'base64');

  // name, a new pole configuration, a new parameter
  const name = await d.findElement(By.xpath("//aside[contains(@class,'me-left')]//input[@type='text'][1]"));
  await name.clear(); await name.sendKeys('Test breaker', ''); await sleep(300);
  const before = await d.executeScript("return document.querySelectorAll('svg.dev-preview rect').length");
  await click(d, "//label[contains(., '4P')]//input");
  const sel = await d.findElement(By.css('select[aria-label="Preview poles"]'));
  check('the new 4P configuration is offered in the preview', (await sel.getText()).includes('4P'));
  await sel.sendKeys('4P'); await sleep(400);
  const after = await d.executeScript("return document.querySelectorAll('svg.dev-preview rect').length");
  check('the preview draws one more pole tile', after > before, `${before} -> ${after}`);

  const cards = (await d.findElements(By.css('.param-card'))).length;
  await click(d, "//aside[contains(@class,'me-right')]//button[contains(., 'Add')]");
  check('a parameter can be added', (await d.findElements(By.css('.param-card'))).length === cards + 1, `${cards} -> ${cards + 1}`);

  // invalid artwork is refused, scripts are stripped
  const ta = await d.findElement(By.css('textarea.svg-source'));
  const good = await ta.getAttribute('value');
  await ta.clear(); await ta.sendKeys('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 90"><circle cx="4" cy="5"'); 
  await d.findElement(By.css('.module-editor h4')).click(); await sleep(400);
  check('broken SVG is refused with a message', /not a valid SVG/i.test(await d.findElement(By.css('.form-error')).getText()));
  await ta.clear();
  await d.executeScript("const t=document.querySelector('textarea.svg-source'); const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; set.call(t, arguments[0]); t.dispatchEvent(new Event('input',{bubbles:true})); t.focus();", good.replace('</svg>', '<script>alert(1)</script><rect width="1" height="1" onclick="alert(1)"/></svg>'));
  await d.findElement(By.css('.module-editor h4')).click(); await sleep(500);
  const cleaned = await ta.getAttribute('value');
  check('scripts and event handlers are removed from the artwork', !/script|onclick/.test(cleaned) && /removed/i.test(await d.findElement(By.css('.form-error')).getText()));

  await click(d, "//button[contains(., 'Save to project')]");
  let st = await state(d);
  const mod = st.modules.find((m) => m.name === 'Test breaker');
  check('saved as a project device module', !!mod && mod.device?.role === 'protection' && mod.device.poleConfigs.includes('4P'), mod?.id);

  // it is in the palette under Custom modules and can be placed
  const entry = await d.findElement(By.xpath("//div[contains(@class,'entry')][contains(., 'Test breaker')]"));
  await entry.click(); await sleep(500);
  st = await state(d);
  check('placing it creates an item that uses the device', st.panels[0].items.some((i) => i.defId === mod.id));
  const props = await d.findElement(By.css('.props')).getText();
  check('its properties show the poles and parameters', /poles/i.test(props), props.slice(0, 60).replace(/\n/g, ' '));
  writeFileSync(`${OUT}/device-placed.png`, await d.takeScreenshot(), 'base64');

  // a built-in device can be copied into an editable device
  await d.executeScript("document.querySelector('.canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  const rcd = await d.findElement(By.xpath("//div[contains(@class,'entry')][contains(., 'Residual current device')]"));
  await d.executeScript('arguments[0].scrollIntoView()', rcd);
  await rcd.click(); await sleep(500);
  await click(d, "//button[contains(., 'Copy to project to edit')]");
  await d.wait(until.elementLocated(By.css('.module-editor')), 5000);
  check('a built-in device opens as an editable device copy', (await d.findElements(By.css('svg.dev-preview g'))).length > 3 && /copy/i.test(await d.findElement(By.xpath("//aside[contains(@class,'me-left')]//input[@type='text'][1]")).getAttribute('value')));
} finally {
  await d.quit();
}
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
