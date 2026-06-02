// Plain-language hints for the cryptic block-time timestamps. Keyed by the
// Flight field name so the form and the detail view share one source of truth.
export const FIELD_HINTS: Record<string, string> = {
  time_out: "Block out — brakes released / pushback at the gate. Starts taxi out; Out → In is block time.",
  time_off: "Wheels off — liftoff from the runway. Off → On is air time.",
  time_on: "Wheels on — touchdown at the destination.",
  time_in: "Block in — parked at the gate, brakes set. Ends the flight.",
};
