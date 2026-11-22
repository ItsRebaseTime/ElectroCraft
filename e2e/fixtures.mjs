// Shared by the browser tests: the example the app used to open on a fresh start. The app now opens the apartment on a first
// start, so the tests seed this one into the autosave before loading the page.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const EXAMPLES = join(ROOT, 'src/assets/examples');
export const SAMPLE_HOUSE = readFileSync(join(EXAMPLES, 'sample-house.ec'), 'utf8');
