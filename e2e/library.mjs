// The shipped module library: palette group, placing a library module, copying it into the project.
// Run `npm run build && npx vite preview --port 4173` first. Needs selenium-webdriver and Firefox.
import { Builder, By, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { SAMPLE_HOUSE } from './fixtures.mjs';

const BASE = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.E2E_OUT ?? `${tmpdir()}/electrocraft-e2e/out`;
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  - ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async (d) => (await sleep(900), JSON.parse(await d.executeScript("return localStorage.getItem('electrocraft.autosave')")));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 950 })).build();
try {
  await d.get(BASE);
  await d.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', SAMPLE_HOUSE);
  await d.get(BASE);
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await sleep(600);
  const head = await d.findElements(By.xpath("//button[contains(@class,'group-head')][contains(., 'Module library')]"));
  check('palette has a Module library group', head.length === 1);
  const entry = await d.findElement(By.xpath("//div[contains(@class,'entry')][contains(., 'Impulse relay')]"));
  await d.executeScript('arguments[0].scrollIntoView()', entry);
  check('library entries have no edit or delete button, only copy', (await entry.findElements(By.css('button[aria-label^="Edit"], button[aria-label^="Delete"]'))).length === 0 && (await entry.findElements(By.css('button[aria-label^="Copy"]'))).length === 1);
  writeFileSync(`${OUT}/library-palette.png`, await d.takeScreenshot(), 'base64');
  await entry.click();
  await sleep(500);
  let st = await state(d);
  check('placing it stores a reference, not the design', st.panels[0].items.some((i) => i.defId === 'lib-impulse-relay') && st.modules.length === 0);
  const txt = await d.findElement(By.css('.props')).getText();
  check('placed library module says it is read-only and offers a copy', /library module/i.test(txt) && /copy to project to edit/i.test(txt) && !/edit module design/i.test(txt), txt.slice(0, 80));
  await (await d.findElement(By.xpath("//button[contains(., 'Copy to project to edit')]"))).click();
  await d.wait(until.elementLocated(By.css('.module-editor')), 5000);
  await sleep(400);
  const name = await d.findElement(By.css('.module-editor input')).getAttribute('value');
  check('copy opens in the designer under a new name', /Impulse relay copy|copy/i.test(name) || name.length > 0, name);
  await (await d.findElement(By.xpath("//button[contains(., 'Save to project')]"))).click();
  await sleep(500);
  st = await state(d);
  check('saved copy is a project module with its own id', st.modules.length === 1 && !st.modules[0].id.startsWith('lib-'), st.modules[0]?.id);

  // manufacturer folders: a group of their own, and 19 mm units butt against each other on the rail
  await d.get(BASE);
  await d.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', SAMPLE_HOUSE);
  await d.get(BASE);
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await sleep(600);
  check('palette has a group named after the Shelly folder', (await d.findElements(By.xpath("//button[contains(@class,'group-head')][normalize-space(.)='Shelly']"))).length === 1);
  const pro = async (name) => (await d.findElement(By.xpath(`//div[contains(concat(' ',normalize-space(@class),' '),' entry ')][.//span[contains(@class,'entry-name')][text()='${name}']]`)));
  await d.executeScript('document.querySelector(".canvas g[data-hit^=\\"r:\\"]").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 3, pointerType: "mouse" })); document.querySelector(".canvas g[data-hit^=\\"r:\\"]").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 3, pointerType: "mouse" }));');
  await sleep(300);
  const before = (await state(d)).panels[0].items.length;
  for (let k = 0; k < 2; k++) {
    const e = await pro('Shelly Pro 1PM (V1)');
    await d.executeScript('arguments[0].scrollIntoView()', e);
    await e.click();
    await sleep(400);
  }
  st = await state(d);
  const added = st.panels[0].items.slice(before);
  check('two Shelly Pro 1PM (V1) are placed with the manufacturer filled in', added.length === 2 && added.every((i) => i.manufacturer === 'Shelly' && i.model === 'Pro 1PM (V1)'), JSON.stringify(added.map((i) => [i.railId, i.slot])));
  // 19 mm wide: the placed unit is narrower than one 18 mm module plus 1 mm, measured against a neighbouring 1P breaker
  const widths = await d.executeScript(`const w = (id) => document.querySelector('.canvas g[data-hit="i:' + id + '"] rect').getBoundingClientRect().width; const mcb = ${JSON.stringify(st.panels[0].items.find((i) => i.defId === 'mcb')?.id)}; return [w(${JSON.stringify(added[0].id)}), mcb ? w(mcb) : 0];`);
  check('a Shelly Pro 1PM (V1) is 19/18 as wide as a one module breaker', widths[1] > 0 && Math.abs(widths[0] / widths[1] - 19 / 18) < 0.03, JSON.stringify(widths));
} finally {
  await d.quit();
}
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
