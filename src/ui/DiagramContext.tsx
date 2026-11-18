import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { layoutPanel, type Layout } from '../model/geometry';
import { autoMarkings } from '../model/marking';
import { computeRoutes, type Route } from '../model/routing';
import { simulate, type SimResult } from '../model/sim';
import { selectActivePanel, useStore } from '../store/store';

interface DiagramData {
  layout: Layout;
  routes: Map<string, Route>;
  sim: SimResult;
  markings: Record<string, string>;
}

const Ctx = createContext<DiagramData | null>(null);

/** Layout, routes, simulation and automatic markings of the active panel, computed once for everyone. */
export function DiagramProvider({ children }: { children: ReactNode }) {
  const project = useStore((s) => s.project);
  const panel = useStore(selectActivePanel);
  const simState = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);

  const layout = useMemo(() => layoutPanel(panel), [panel]);
  const routes = useMemo(() => computeRoutes(panel, layout), [panel, layout]);
  const sim = useMemo(() => simulate(panel, layout, { live: simState.enabled, autoTrip: simState.autoTrip, tripped: simState.tripped }), [panel, layout, simState]);
  const markings = useMemo(() => autoMarkings(panel, project.settings.markingStandard), [panel, project.settings.markingStandard]);

  // keep the stored trip list in step with what the simulator decided
  useEffect(() => {
    if (!simState.enabled) return;
    const a = new Set(simState.tripped);
    if (sim.tripped.length !== a.size || sim.tripped.some((t) => !a.has(t))) setSim({ tripped: sim.tripped });
  }, [sim, simState, setSim]);

  const value = useMemo(() => ({ layout, routes, sim, markings }), [layout, routes, sim, markings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDiagram(): DiagramData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDiagram outside DiagramProvider');
  return v;
}
