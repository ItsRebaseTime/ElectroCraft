# Simulation model

The simulation is **topological**: it follows connectivity, switch positions and load currents. It is meant to help you
understand and check a panel, not to verify a design. Code: [`src/model/sim.ts`](../src/model/sim.ts).

## Two passes over one netlist

Every terminal is a node. Edges are the wires you drew plus the conduction inside devices:

* a protection device, switch, meter or feed-through terminal block joins the top and bottom terminal of each pole
  (protection devices and switches only while the lever is on and the device has not tripped),
* bus bars join all their terminals, comb bridges join neighbouring terminals of a terminal block.

Nodes are merged with union-find, and the grid supply puts its potentials (`L1`, `L2`, `L3`, `N`, `PE`) on the nets
it touches.

1. **Identity pass.** All switches are treated as closed and the supply as on. This tells which conductor each wire
   belongs to, which drives the **automatic wire colours**. A net carrying more than one potential is a **short
   circuit** (reported as an error, wires drawn red). This pass always runs, even with the simulation off.
2. **Live pass** (when *Simulate* is on). Lever positions, tripped devices and the supply switch are honoured. Wires on
   a net with a potential are *energised*.

## Current flow

Each load that is energised draws current:

| load | current per line |
| --- | --- |
| 1 phase | `I = P / (230 V x cos φ)`; needs one live phase on `L1` and neutral on `N` |
| 3 phase | `I = P / (√3 x 400 V x cos φ)` on each of three *different* live phases; neutral optional |
| pilot light | a nominal 20 mA while lit |

For each load the simulator finds the shortest live path from its phase terminal back to a source terminal of the same
potential (and, for 1-phase loads, from its neutral terminal back to the neutral source) and adds the current to
every wire and every device pole on that path. Wires therefore carry the **sum** of all loads downstream, with a sign:
positive means from the wire's first terminal to its second, which sets the animation direction.

## Tripping

After the live pass, every breaker, RCD and fuse holder compares the current through its busiest pole with its rated
current `In`:

* above `In`: an **overload** warning,
* above **1.45 x In** (fuses **1.6 x In**) with *Auto-trip* on: the device **trips**; the pass is repeated with it open
  until the panel settles, so a trip can cascade.

Tripped devices stay tripped until re-armed (properties panel or the toolbar reset button).

## Pilot lights

A lamp lights when its top terminal is on exactly one live phase and its bottom terminal is on live neutral.

## What is not simulated

* RCD earth-fault tripping (an RCD only trips on overload), selectivity and time-current curves
* contactor coils and any control wiring (contactors are switched by hand)
* voltage drop, cable ratings and cross-sections, short-circuit currents, harmonics, motor starting current
* unbalanced 3-phase loads (loads are balanced) and neutral current from them

Treat the results as a teaching and checking aid, and always follow the applicable wiring regulations.
