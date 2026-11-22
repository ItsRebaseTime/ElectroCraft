import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_EXAMPLE, defaultExampleId, exampleTitle, listExamples, loadExampleText } from './examples';
import { parseProject } from '../model/project';

describe('example projects', () => {
  it('every .ec file of src/assets/examples is offered, the default first', async () => {
    const files = readdirSync('src/assets/examples').filter((f) => f.endsWith('.ec')).map((f) => f.replace(/\.ec$/, ''));
    const list = listExamples();
    expect(list.map((e) => e.id).sort()).toEqual(files.sort());
    expect(list[0].id).toBe(DEFAULT_EXAMPLE);
    expect(defaultExampleId()).toBe(DEFAULT_EXAMPLE);
    for (const e of list) {
      const text = await loadExampleText(e.id);
      expect(text, e.id).toBeTruthy();
      expect(parseProject(text!).warnings, e.id).toEqual([]);
    }
    expect(await loadExampleText('no-such-example')).toBeNull();
  });

  it('the default example is the apartment', async () => {
    const { project } = parseProject((await loadExampleText(DEFAULT_EXAMPLE))!);
    expect(project.name).toBe('Apartment');
    expect(project.floorPlans).toHaveLength(1);
  });

  it('titles are made from the file names', () => {
    expect(exampleTitle('apartment')).toBe('Apartment');
    expect(exampleTitle('us-sample-house')).toBe('US sample house');
    expect(exampleTitle('multi-section-board')).toBe('Multi section board');
    expect(exampleTitle('EU_house')).toBe('EU house');
  });
});
