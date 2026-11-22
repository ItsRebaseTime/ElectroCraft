// Module inputs in a real wired circuit: a control relay (follows its coil) and an impulse relay (toggles per pulse).
// Run `npm run build && npx vite preview --port 4173` first. Needs selenium-webdriver and Firefox.
import { Builder, By, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.URL ?? 'http://localhost:4173/';
const project = readFileSync(join(ROOT, 'src/assets/examples/relay-circuits.ec'), 'utf8');
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  - ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').windowSize({ width: 1600, height: 1000 })).build();
const lit = () => d.executeScript("return document.querySelectorAll('.canvas circle[fill=\"#ffe27a\"]').length"); // the glowing lamp
const flip = async (n) => { // click the n-th item of the panel (0 supply, 1 switch, 2 relay, 3 lamp) in simulation mode
  const el = (await d.findElements(By.css('.canvas g[data-hit^="i:"]')))[n];
  await d.actions({ async: true }).move({ origin: el }).click().perform();
  await sleep(500);
};
try {
  await d.get(BASE);
  await d.executeScript('localStorage.setItem("electrocraft.autosave", arguments[0])', project);
  await d.get(BASE);
  await d.wait(until.elementLocated(By.css('.canvas g[data-hit^="i:"]')), 15000);
  await d.findElement(By.xpath("//button[contains(., 'Simulate')]")).click();
  await sleep(600);

  // ---- panel 1: the contact follows the coil
  check('control relay: lamp is off while the coil switch is open', (await lit()) === 0);
  await flip(1); // close the switch -> coil energised
  check('closing the coil switch pulls the relay in and the lamp lights', (await lit()) === 1);
  const props = await d.findElement(By.css('.props')).getText();
  await flip(2); // select the relay to see its input in the properties
  check('the relay shows its coil as energised', /COIL[\s\S]*energised/.test(await d.findElement(By.css('.props')).getText()) && !/not energised/.test(await d.findElement(By.css('.props')).getText().then((t) => t.split('Inputs')[1] ?? '')));
  void props;
  await flip(1);
  check('opening the coil switch drops the relay and the lamp goes out', (await lit()) === 0);

  // ---- panel 2: impulse relay latches
  await d.findElement(By.xpath("//div[contains(@class,'panel-row')][contains(., 'Impulse relay')]")).click();
  await sleep(700);
  check('impulse relay: lamp starts off', (await lit()) === 0);
  await flip(1); // pulse (switch closes)
  check('the first pulse toggles the contact on', (await lit()) === 1);
  await flip(1); // switch opens again
  check('releasing the pulse switch leaves the contact latched on', (await lit()) === 1);
  await flip(1); // second pulse
  check('the second pulse toggles it off', (await lit()) === 0);
  await flip(1);
  check('and it stays off when the pulse ends', (await lit()) === 0);
  // reset button clears latched inputs
  await flip(1);
  check('a further pulse switches it on again', (await lit()) === 1);
  await d.findElement(By.css('button[title^="Re-arm all tripped devices and reset latched"]')).click();
  await sleep(500);
  check('the toolbar reset button clears latched module inputs', (await lit()) === 0);
} catch (e) { console.log('ERROR', e); results.push(false); }
finally { await d.quit(); }
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
