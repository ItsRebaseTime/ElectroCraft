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

### Neutral currents and line-to-line loads

Currents are summed as **phasors**, so the neutral carries the *vector sum* of the phases it serves rather than their
arithmetic sum: a split-phase neutral carries the difference of the two legs (legs at 0 and 180 degrees), a three-phase one
the vector sum at 0, -120 and +120 degrees. A **line-to-line load** (US 240 V, EU 400 V between two phases) draws its current
on both lines and none on the neutral. Line conductors are always shown flowing toward the load and neutrals toward the
source.

| load | voltage (automatic) | current per line |
| --- | --- | --- |
| 1 phase | 230 V (US 120 V) | `P / (U cos φ)` |
| 2 phase (line-line) | 400 V (US 240 V) | `P / (U cos φ)` |
| 3 phase | 400 V (US 208 V) | `P / (√3 U cos φ)` |

A typed voltage on the load overrides the automatic one.

### US load centers

The panel bus is a set of nodes (`L1`, `L2`, `L3`). A **main breaker** joins its line terminals to the bus phases while it
is closed; each **plug-on breaker** joins the bus phase of its row (`row mod 2` for split-phase, `row mod 3` for
three-phase, plus the pole offset for 2- and 3-pole breakers) to its load terminals while it is closed and not tripped.
Breakers trip on the same overload rule as DIN breakers.

### Module inputs, latching and relays

An input is **energised** when its terminal carries exactly one live phase and, if it has a return terminal, that terminal is on
the neutral or on a different phase; an energised input with a neutral return draws a nominal 20 mA so its wires show current.
Inputs then operate their target switches:

| mode | effect |
| --- | --- |
| follow (momentary) | the switch is actuated while the input is energised |
| toggle | each rising edge (not energised to energised) flips the switch position, which is then kept |
| set / reset | a rising edge actuates / releases the switch, which is then kept |

The effective position of a switch is its latched position (or the manual one) and, additionally, actuated while a following
input is energised. Because a contact can feed its own coil (a **seal-in** circuit), the simulator iterates until the panel
settles and remembers which following inputs were energised, so such a circuit holds itself after the start button is released and
stays off after a power failure. The remembered state (`SimRuntime`: last input states, latched positions, held inputs) lives
in the app while the simulation is on and is cleared by the reset button or by switching the simulation off. The first
evaluation of a panel never counts as a rising edge, so inputs that are already live when you start do not toggle anything.
Changing a switch position by hand restarts its latch from that position.

### Custom modules

Every internal net of a module is a hub node; the terminals of a net are joined through it. A switchable module cuts the
hubs while it is off or tripped. Each **internal switch** has two hubs: one joining its **NO** terminals, present only while the switch is actuated, and one
joining its **NC** terminals, present only while it is released, so a changeover switch moves a common terminal from one
side to the other (a tripped module opens every contact). The identity pass (wire colours, short-circuit check) assumes all contacts conduct. The current through a module is the current through its busiest net, which is compared with
its rating when it can trip.

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
* contactor coils and any control wiring (contactors are switched by hand), and custom modules have no control logic either
* US specifics: bus rating and bus loading limits, the 80 % continuous-load rule, arc-fault and ground-fault detection (AFCI/GFCI
  breakers are drawn and rated, but only trip on overload)
* voltage drop, cable ratings and cross-sections, short-circuit currents, harmonics, motor starting current
* unbalanced 3-phase loads (loads are balanced) and neutral current from them

Treat the results as a teaching and checking aid, and always follow the applicable wiring regulations.
