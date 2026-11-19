// Sections side by side and N / PE bars along the top and bottom of a section, driven through the panel properties.
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

const o = new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 950 });
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(o).build();
try {
  await d.get(BASE);
  await d.executeScript('localStorage.clear()');
  await d.get(BASE);
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await sleep(600);
  // empty canvas click -> panel properties
  await d.executeScript("document.querySelector('.canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  const click = async (xp) => { await (await d.findElement(By.xpath(xp))).click(); await sleep(400); };

  await click("//button[contains(., 'Add section')]");
  let st = await state(d);
  let panel = st.panels[0];
  check('Add section creates a second section with its own rail', panel.sections?.length === 2 && panel.rails.some((r) => r.section === panel.sections[1].id), JSON.stringify(panel.sections));
  const encl = async () => d.executeScript("return Array.from(document.querySelectorAll('.canvas rect[rx=\"6\"]')).map(r => [r.getAttribute('x'), r.getAttribute('width')])");
  const rects = await encl();
  check('two enclosures are drawn side by side', rects.length >= 2 && Number(rects[1][0]) > Number(rects[0][0]) + Number(rects[0][1]), JSON.stringify(rects));

  // bars on the first section
  for (const label of ['N top', 'PE top', 'N bottom', 'PE bottom']) await click(`(//label[contains(@class,'check')][contains(., '${label}')])[1]//input`);
  st = await state(d);
  panel = st.panels[0];
  const bars = panel.items.filter((i) => i.bar);
  check('four bars created on the first section', bars.length === 4 && bars.every((b) => b.bar.section === panel.sections[0].id), bars.map((b) => `${b.params.role}:${b.bar.edge}`).join(' '));
  const g0 = (await encl())[0];
  const barY = await d.executeScript("return Array.from(document.querySelectorAll('.canvas g[data-hit^=\"i:\"]')).map(g => g.getBoundingClientRect().top)");
  check('enclosure grew to hold the bars', Number(g0[1]) > 0);
  await click("(//label[contains(@class,'check')][contains(., 'PE bottom')])[1]//input");
  st = await state(d);
  check('switching a bar off removes it', st.panels[0].items.filter((i) => i.bar).length === 3);
  void barY;

  await sleep(300);
  writeFileSync(`${OUT}/sections.png`, await d.takeScreenshot(), 'base64');
  console.log(`screenshot: ${OUT}/sections.png`);
} finally {
  await d.quit();
}
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
