import { copyFloorPoints, copyFloorShapes, pasteFloorPoints, pasteFloorShapes, shapeBounds } from '../../model/floor';
import type { FloorPlan, Vec } from '../../model/types';
import { useStore } from '../../store/store';
import { NONE, selectedIds, useFloorUI } from './floorState';

/** Copy the selected outlets of a plan to the clipboard (Ctrl+C). Returns how many were copied. */
export function copySelectedOutlets(plan: FloorPlan): number {
  const fl = useFloorUI.getState();
  const { notify } = useStore.getState();
  if (fl.selection.kind !== 'point' && fl.selection.kind !== 'shape') {
    notify('Select outlets or shapes first: click them with Ctrl held, or drag a box with Ctrl.');
    return 0;
  }
  const clip = fl.selection.kind === 'shape' ? copyFloorShapes(plan, selectedIds(fl.selection)) : copyFloorPoints(plan, selectedIds(fl.selection));
  fl.setClipboard(clip);
  const n = clip.points.length + (clip.shapes?.length ?? 0);
  const what = fl.selection.kind === 'shape' ? 'shape' : 'outlet';
  notify(`Copied ${n} ${what}${n === 1 ? '' : 's'}. Paste with Ctrl+V, here or on another floor plan.`);
  return n;
}

/**
 * Paste the copied outlets into a plan (Ctrl+V): centred on `at` when the pointer is over the plan, else shifted a little more
 * with every paste. The new outlets are selected. Cables are not copied.
 */
export function pasteOutlets(planId: string, at?: Vec | null): number {
  const fl = useFloorUI.getState();
  const { notify, mutate } = useStore.getState();
  const clip = fl.clipboard;
  if (!clip?.points.length && !clip?.shapes?.length) {
    notify('Nothing copied yet: select outlets or shapes and press Ctrl+C.');
    return 0;
  }
  const boxes = [...clip.points.map((q) => ({ x: q.x, y: q.y, w: 0, h: 0 })), ...(clip.shapes ?? []).map((q) => shapeBounds({ ...q, id: '' }))];
  const left = Math.min(...boxes.map((b) => b.x));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const top = Math.min(...boxes.map((b) => b.y));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  const centre = { x: (left + right) / 2, y: (top + bottom) / 2 };
  const shift = 40 * fl.bumpPaste();
  const dx = at ? at.x - centre.x : shift;
  const dy = at ? at.y - centre.y : shift;
  let made: string[] = [];
  let kind: 'point' | 'shape' = 'point';
  mutate((d) => {
    const p = d.floorPlans.find((x) => x.id === planId);
    if (!p) return;
    if (clip.shapes?.length) {
      kind = 'shape';
      made = pasteFloorShapes(p, clip, dx, dy).map((q) => q.id);
    } else made = pasteFloorPoints(p, clip, dx, dy).map((q) => q.id);
  });
  fl.select(made.length ? { kind, id: made[made.length - 1], ids: made } : NONE);
  return made.length;
}
