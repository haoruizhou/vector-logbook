import { useState } from "react";
import type { Journey } from "../types";
import Strip from "./Strip";

type Mode = "airports" | "flights";

export default function StripBay({
  journey, selected, onSelect,
}: {
  journey: Journey;
  selected: string | null;
  onSelect: (ident: string | null) => void;
}) {
  const [mode, setMode] = useState<Mode>("airports");

  const airports = [...journey.airports].sort((a, b) => b.visits - a.visits);
  const legs = [...journey.legs].sort((a, b) => (b.last_date ?? "").localeCompare(a.last_date ?? ""));

  return (
    <section className="strip-bay">
      <div className="strip-bay-head">
        <h2>Flight strips</h2>
        <div className="seg-toggle" role="tablist">
          <button role="tab" aria-selected={mode === "airports"} className={mode === "airports" ? "on" : ""} onClick={() => setMode("airports")}>
            Airports <span className="seg-count">{airports.length}</span>
          </button>
          <button role="tab" aria-selected={mode === "flights"} className={mode === "flights" ? "on" : ""} onClick={() => setMode("flights")}>
            Flights <span className="seg-count">{legs.length}</span>
          </button>
        </div>
      </div>

      <div className="strip-bay-list">
        {mode === "airports"
          ? airports.map((a) => (
              <Strip
                key={a.ident}
                code={a.ident}
                active={selected === a.ident}
                onHover={() => onSelect(a.ident)}
                onLeave={() => onSelect(null)}
                onClick={() => onSelect(a.ident)}
                fields={[
                  { label: "NAME", value: a.name ?? "—" },
                  { label: "CTRY", value: a.country ?? "—" },
                  { label: "VISITS", value: String(a.visits) },
                  { label: "LAST", value: a.last_date ?? "—" },
                ]}
              />
            ))
          : legs.map((l) => (
              <Strip
                key={`${l.from_ident}-${l.to_ident}`}
                code={`${l.from_ident}→${l.to_ident}`}
                active={selected === l.from_ident || selected === l.to_ident}
                onHover={() => onSelect(l.from_ident)}
                onLeave={() => onSelect(null)}
                onClick={() => onSelect(l.from_ident)}
                fields={[
                  { label: "FLOWN", value: `${l.count}×` },
                  { label: "LAST", value: l.last_date ?? "—" },
                ]}
              />
            ))}
      </div>
    </section>
  );
}
