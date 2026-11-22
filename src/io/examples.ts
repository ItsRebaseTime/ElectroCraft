// Example projects shipped with the app: every .ec file in src/assets/examples. They are loaded on demand (one chunk each).
const files = import.meta.glob('../assets/examples/*.ec', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

/** The example opened on first start (and by "New window"); the first one is used if this file is missing. */
export const DEFAULT_EXAMPLE = 'apartment';

export interface ExampleInfo {
  /** File name without the extension; also what `?example=<id>` takes. */
  id: string;
  /** Name shown in the menu, made from the file name: "us-sample-house" becomes "US sample house". */
  title: string;
}

const idOf = (path: string) => path.replace(/^.*\//, '').replace(/\.ec$/, '');
const ACRONYMS = new Set(['us', 'eu', 'ac', 'dc', 'rcd', 'mcb']);

export function exampleTitle(id: string): string {
  const words = id.split(/[-_ ]+/).filter(Boolean);
  return words.map((w, i) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : i === 0 ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

/** The examples, the default one first, then by name. */
export function listExamples(): ExampleInfo[] {
  const list = Object.keys(files).map((p) => ({ id: idOf(p), title: exampleTitle(idOf(p)) }));
  return list.sort((a, b) => (a.id === DEFAULT_EXAMPLE ? -1 : b.id === DEFAULT_EXAMPLE ? 1 : a.title.localeCompare(b.title)));
}

/** The example for a first start: the default one, or the first there is (none: undefined). */
export function defaultExampleId(): string | undefined {
  const list = listExamples();
  return list.find((e) => e.id === DEFAULT_EXAMPLE)?.id ?? list[0]?.id;
}

/** The text of an example file, or null when there is no such example. */
export async function loadExampleText(id: string): Promise<string | null> {
  const key = Object.keys(files).find((p) => idOf(p) === id);
  return key ? files[key]() : null;
}
