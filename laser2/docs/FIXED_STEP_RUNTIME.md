# Fixed-step runtime

## Problem removed

A simulation step must not be executed once per display frame. That makes the physical time rate dependent on whether the display runs at 30, 60, 120, 144, or 240 Hz.

## V3 clock

`FixedStepClock` uses:

- fixed frequency: 60 Hz;
- fixed interval: 1/60 s;
- maximum catch-up steps: 4;
- maximum accepted frame delta: 0.25 s;
- explicit dropped-step and dropped-time counters;
- interpolation alpha for future native render-state interpolation.

The scheduler may render at any cadence. Physics receives only the number of fixed steps accumulated by the clock.

## CPU cadence verification

A deterministic ten-second test was run at 30, 60, 90, 120, 144, and 240 render Hz. Every cadence executed exactly 600 simulation steps with zero dropped steps.

A separate one-second stall probe was clamped to 0.25 seconds, executed the permitted four steps, and explicitly recorded eleven dropped steps instead of entering an unbounded catch-up spiral.

Receipt: `evidence/cpu/fixed-step-clock.json`

## Browser integration probe

Four synthetic 120 Hz RAF intervals executed exactly two 60 Hz compatibility-physics steps. The legacy RAF remained frozen.

The compatibility solver remains too expensive; fixed scheduling makes that cost measurable and prevents refresh-rate-dependent physical time, but does not itself accelerate the solver.
