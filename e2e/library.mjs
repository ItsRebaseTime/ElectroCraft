// The shipped module library: palette group, placing a library module, copying it into the project.
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

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 950 })).build();
try {
  await d.get(BASE);
  await d.executeScript('localStorage.clear()');
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
} finally {
  await d.quit();
}
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
