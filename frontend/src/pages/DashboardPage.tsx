import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import PageHeader from "../components/PageHeader";

function Stat({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">
        {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  );
}

function BarList({ data, suffix }: { data: Record<string, number>; suffix: string }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="bars">
      {entries.map(([k, v]) => (
        <div className="bar-row" key={k}>
          <span>{k}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="num" style={{ textAlign: "right" }}>
            {v.toFixed(1)} {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: s, isLoading } = useQuery({ queryKey: ["stats"], queryFn: api.stats });

  return (
    <>
      <PageHeader title="Totals" />
      <div className="page fade-in">
        {isLoading || !s ? (
          <div className="empty">Loading…</div>
        ) : (
          <>
            <div className="stat-grid">
              <Stat label="Total Time" value={s.total_time} unit="hr" />
              <Stat label="PIC" value={s.total_pic} unit="hr" />
              <Stat label="Night" value={s.total_night} unit="hr" />
              <Stat label="Cross-Country" value={s.total_cross_country} unit="hr" />
              <Stat
                label="Instrument"
                value={s.total_actual_instrument + s.total_simulated_instrument}
                unit="hr"
              />
              <Stat label="Flights" value={s.total_flights} />
              <Stat label="Landings" value={s.total_landings} />
            </div>

            <div className="group">
              <h3>Hours by Year</h3>
              <BarList data={s.by_year} suffix="hr" />
            </div>

            <div className="group">
              <h3>Hours by Aircraft</h3>
              <BarList data={s.by_aircraft} suffix="hr" />
            </div>
          </>
        )}
      </div>
    </>
  );
}
