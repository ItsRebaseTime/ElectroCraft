import { copyFloorPoints, pasteFloorPoints } from '../../model/floor';
import type { FloorPlan, Vec } from '../../model/types';
import { useStore } from '../../store/store';
import { NONE, selectedIds, useFloorUI } from './floorState';

/** Copy the selected outlets of a plan to the clipboard (Ctrl+C). Returns how many were copied. */
export function copySelectedOutlets(plan: FloorPlan): number {
  const fl = useFloorUI.getState();
  const { notify } = useStore.getState();
  if (fl.selection.kind !== 'point') {
    notify('Select outlets first: click them with Ctrl held, or drag a box with Ctrl.');
    return 0;
  }
  const clip = copyFloorPoints(plan, selectedIds(fl.selection));
  fl.setClipboard(clip);
  notify(`Copied ${clip.points.length} outlet${clip.points.length === 1 ? '' : 's'}. Paste with Ctrl+V, here or on another floor plan.`);
  return clip.points.length;
}

/**
 * Paste the copied outlets into a plan (Ctrl+V): centred on `at` when the pointer is over the plan, else shifted a little more
 * with every paste. The new outlets are selected. Cables are not copied.
 */
export function pasteOutlets(planId: string, at?: Vec | null): number {
  const fl = useFloorUI.getState();
  const { notify, mutate } = useStore.getState();
  const clip = fl.clipboard;
  if (!clip?.points.length) {
    notify('Nothing copied yet: select outlets and press Ctrl+C.');
    return 0;
  }
  const xs = clip.points.map((q) => q.x);
  const ys = clip.points.map((q) => q.y);
  const centre = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  const shift = 40 * fl.bumpPaste();
  const dx = at ? at.x - centre.x : shift;
  const dy = at ? at.y - centre.y : shift;
  let made: string[] = [];
  mutate((d) => {
    const p = d.floorPlans.find((x) => x.id === planId);
    if (p) made = pasteFloorPoints(p, clip, dx, dy).map((q) => q.id);
  });
  fl.select(made.length ? { kind: 'point', id: made[made.length - 1], ids: made } : NONE);
  return made.length;
}
