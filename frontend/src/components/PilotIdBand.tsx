import type { Journey } from "../types";

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="id-badge">
      <div className="id-badge-value">{value}</div>
      <div className="id-badge-label">{label}</div>
    </div>
  );
}

export default function PilotIdBand({ journey }: { journey: Journey }) {
  const id = journey.identity;
  return (
    <section className="pilot-id">
      <div className="pilot-id-head">
        <div>
          <div className="pilot-id-eyebrow">Aviator</div>
          <div className="pilot-id-call">{id.callsign ?? "—"}</div>
          <div className="pilot-id-sub">
            {id.first_flight_year ? `Flying since ${id.first_flight_year}` : "No flights yet"}
            {id.home_base ? ` · Home base ${id.home_base}` : ""}
          </div>
        </div>
      </div>

      <div className="id-badges">
        <Badge label="HOURS" value={id.total_hours.toFixed(1)} />
        <Badge label="AIRPORTS" value={String(id.airport_count)} />
        <Badge label="COUNTRIES" value={String(id.country_count)} />
        <Badge label="AIRCRAFT" value={String(id.aircraft_count)} />
        <Badge label="FLOWN WITH" value={String(id.people_count)} />
        <Badge label="NIGHT HRS" value={id.night_hours.toFixed(1)} />
        <Badge label="LONGEST NM" value={String(id.longest_leg_nm)} />
        <Badge label="FURTHEST NM" value={String(id.furthest_from_home_nm)} />
      </div>

      {journey.milestones.length > 0 && (
        <div className="id-milestones">
          {journey.milestones.map((m) => {
            const sub = [m.detail, m.date].filter(Boolean).join(" · ");
            return (
              <span key={m.key} className="id-milestone">
                <span className="id-milestone-label">{m.label}</span>
                {sub && <span className="id-milestone-detail">{sub}</span>}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
